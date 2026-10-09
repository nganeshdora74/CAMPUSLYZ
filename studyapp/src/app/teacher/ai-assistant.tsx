import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { auth, db } from "../../firebase/config";
import { useAppTheme } from "../../context/ThemeContext";
import UniversalRoleControls from "../../components/UniversalRoleControls";
import NotificationBellModal from "../../components/NotificationBellModal";
import MarkdownView from "../../components/MarkdownView";
import { askCampuslyAI } from "../../services/aiService";
import { parseNameAndRoleFromEmail } from "../../utils/userEmailParser";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
};

const TEACHER_PROMPTS = [
  {
    icon: "help-circle-outline",
    title: "Draft 5 Quiz Questions",
    prompt: "Draft 5 multiple choice questions with answers and explanations on Binary Search Trees and AVL Trees for 2nd year B.Tech students.",
  },
  {
    icon: "calendar-outline",
    title: "Generate Lesson Plan",
    prompt: "Create a structured 50-minute lesson plan for teaching Relational Database Normalization (1NF, 2NF, 3NF, BCNF) with real-world examples.",
  },
  {
    icon: "document-text-outline",
    title: "Exam Rubric & 10-Mark Question",
    prompt: "Generate an expected 10-mark university question on Dijkstra's Shortest Path algorithm with step-by-step grading rubric.",
  },
  {
    icon: "bulb-outline",
    title: "Lab Practical Viva Prep",
    prompt: "List top 5 viva-voce questions and answers for Computer Networks Socket Programming in Python/C.",
  },
];

export default function TeacherAIAssistantScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const { isDark, colors } = useAppTheme();

  const [teacherName, setTeacherName] = useState("Dr. Priya Sharma");
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      role: "assistant",
      text: "Hello Professor! I am your **Campusly Faculty AI Assistant**.\n\nI can help you generate exam questions, create lesson plans, design lab rubrics, explain complex topics, and draft student notices. How can I assist you today?",
      timestamp: "Just now",
    },
  ]);
  const [inputText, setInputText] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      const parsed = parseNameAndRoleFromEmail(user.email);
      setTeacherName(user.displayName || parsed.fullName || "Teacher");
    }
  }, []);

  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputText).trim();
    if (!textToSend || loading) return;

    const userMsg: ChatMessage = {
      id: `u-${Date.now()}`,
      role: "user",
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText("");
    setLoading(true);

    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      const aiReply = await askCampuslyAI(textToSend, {
        history: messages.slice(-6).map((m) => ({ role: m.role, content: m.text })),
        userContext: {
          name: teacherName,
          role: "faculty",
          department: "Computer Science & Engineering",
        },
      });

      const assistantMsg: ChatMessage = {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: aiReply || "Here is the response to your academic inquiry.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (e: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: "assistant",
        text: "I am ready to help! Please check your network or try asking again.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => {
        scrollRef.current?.scrollToEnd({ animated: true });
      }, 150);
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={[styles.root, { backgroundColor: colors.background }]}>
      {/* TOP BAR */}
      <View style={[styles.topBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.aiHeaderIconBadge}>
            <Ionicons name="sparkles" size={14} color="#6366F1" />
          </View>
          <View>
            <Text style={[styles.pageTitle, { color: colors.text }]}>Teacher AI Assistant</Text>
            <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
              Campusly Faculty Intelligence & Lesson Generator
            </Text>
          </View>
        </View>

        <View style={styles.topBarRight}>
          <UniversalRoleControls compact />
          <NotificationBellModal />
        </View>
      </View>

      {/* QUICK SUGGESTION PROMPTS */}
      <View style={[styles.promptBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.promptsScroll}>
          {TEACHER_PROMPTS.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              style={[styles.promptChip, { borderColor: colors.border, backgroundColor: isDark ? "#1E293B" : "#F8FAFC" }]}
              onPress={() => handleSend(item.prompt)}
              disabled={loading}
            >
              <Ionicons name={item.icon as any} size={13} color="#6366F1" />
              <Text style={[styles.promptChipText, { color: colors.text }]}>{item.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* CHAT MESSAGES SCROLL */}
      <ScrollView
        ref={scrollRef}
        style={styles.chatScroll}
        contentContainerStyle={styles.chatScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <View key={msg.id} style={[styles.messageRow, isUser ? styles.userRow : styles.assistantRow]}>
              {!isUser && (
                <View style={styles.aiAvatarCircle}>
                  <Ionicons name="sparkles" size={13} color="#FFFFFF" />
                </View>
              )}

              <View
                style={[
                  styles.messageBubble,
                  isUser
                    ? styles.userBubble
                    : [
                        styles.assistantBubble,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                        },
                      ],
                ]}
              >
                {isUser ? (
                  <Text style={styles.userMessageText}>{msg.text}</Text>
                ) : (
                  <MarkdownView content={msg.text} />
                )}

                <Text
                  style={[
                    styles.timeText,
                    isUser ? styles.userTimeText : { color: colors.textSecondary },
                  ]}
                >
                  {msg.timestamp}
                </Text>
              </View>
            </View>
          );
        })}

        {loading && (
          <View style={styles.loadingRow}>
            <View style={styles.aiAvatarCircle}>
              <Ionicons name="sparkles" size={13} color="#FFFFFF" />
            </View>
            <View style={[styles.loadingBubble, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <ActivityIndicator size="small" color="#6366F1" />
              <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                Campusly AI is thinking...
              </Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* INPUT BAR */}
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 12 : 0}
      >
        <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: isDark ? "#0F172A" : "#F1F5F9",
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder="Ask AI anything (quiz questions, lesson plans, rubric)..."
            placeholderTextColor={colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            onSubmitEditing={() => handleSend()}
          />

          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || loading) && styles.sendBtnDisabled]}
            onPress={() => handleSend()}
            disabled={!inputText.trim() || loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons name="arrow-up" size={17} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    height: 50,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backBtn: {
    padding: 3,
  },
  aiHeaderIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 7,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  pageSubtitle: {
    fontSize: 9.5,
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  promptBar: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderBottomWidth: 1,
  },
  promptsScroll: {
    flexDirection: "row",
  },
  promptChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 6,
  },
  promptChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  chatScroll: {
    flex: 1,
  },
  chatScrollContent: {
    padding: 12,
    paddingBottom: 20,
    gap: 10,
  },
  messageRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 6,
    marginVertical: 2,
  },
  userRow: {
    justifyContent: "flex-end",
  },
  assistantRow: {
    justifyContent: "flex-start",
  },
  aiAvatarCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#6366F1",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  messageBubble: {
    maxWidth: "85%",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  userBubble: {
    backgroundColor: "#2563EB",
    borderBottomRightRadius: 2,
  },
  assistantBubble: {
    borderBottomLeftRadius: 2,
    borderWidth: 1,
  },
  userMessageText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    lineHeight: 18,
  },
  timeText: {
    fontSize: 9,
    marginTop: 4,
    alignSelf: "flex-end",
  },
  userTimeText: {
    color: "rgba(255, 255, 255, 0.75)",
  },
  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  loadingBubble: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  loadingText: {
    fontSize: 11,
  },
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderTopWidth: 1,
    gap: 6,
  },
  textInput: {
    flex: 1,
    minHeight: 36,
    maxHeight: 90,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    fontSize: 12.5,
  },
  sendBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    backgroundColor: "#94A3B8",
    opacity: 0.7,
  },
});
