import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import {
  CampusEventItem,
  NoticeItem,
  NoticeStats,
  subscribeToEvents,
  subscribeToNoticeStats,
  subscribeToNotices,
} from "../../services/noticeService";

export default function AIAssistantScreen() {
  const { isDark } = useTheme();
  const [messages, setMessages] = useState<Array<{ sender: "user" | "ai"; text: string }>>([
    {
      sender: "ai",
      text: "Hi! I'm your Notice Manager AI Assistant. How can I help you today with notices, circulars, or certificates?",
    },
  ]);
  const [input, setInput] = useState("");

  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [events, setEvents] = useState<CampusEventItem[]>([]);
  const [stats, setStats] = useState<NoticeStats | null>(null);

  useEffect(() => {
    const unsubN = subscribeToNotices((items) => setNotices(items));
    const unsubE = subscribeToEvents((items) => setEvents(items));
    const unsubS = subscribeToNoticeStats((data) => setStats(data));
    return () => {
      unsubN();
      unsubE();
      unsubS();
    };
  }, []);

  const handleSend = (text?: string) => {
    const query = text || input.trim();
    if (!query) return;

    setMessages((prev) => [...prev, { sender: "user", text: query }]);
    if (!text) setInput("");

    setTimeout(() => {
      let reply = "";
      const lower = query.toLowerCase();

      if (lower.includes("latest") || lower.includes("notice") || lower.includes("recent")) {
        const pub = notices.filter((n) => n.status === "published" || n.status === "active");
        if (pub.length > 0) {
          reply = `Here are the latest notices:\n• ${pub.slice(0, 3).map((n) => `"${n.title}" (${n.date})`).join("\n• ")}`;
        } else {
          reply = "There are currently no active notices in the database.";
        }
      } else if (lower.includes("certificate") || lower.includes("cert")) {
        reply = `Certification Center Status:\n• Issued Certificates: ${stats?.certificatesIssued || 0}\n• Pending Requests: ${stats?.pendingRequests || 0}`;
      } else if (lower.includes("event")) {
        reply = `Scheduled Events:\n• Total Events: ${events.length}\n• Upcoming: ${events[0]?.title || "Campus Workshop"} (${events[0]?.date || "Soon"})`;
      } else {
        reply = `I'm connected to the campus database. We have ${notices.length} notices and ${events.length} events synced in real-time with Firebase and MongoDB.`;
      }

      setMessages((prev) => [...prev, { sender: "ai", text: reply }]);
    }, 500);
  };

  const bg = isDark ? "#0F172A" : "#F4F7FB";
  const cardBg = isDark ? "#1E293B" : "#FFFFFF";
  const textColor = isDark ? "#F8FAFC" : "#0F172A";
  const subTextColor = isDark ? "#94A3B8" : "#64748B";
  const borderColor = isDark ? "#334155" : "#E2E8F0";

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.topBar, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
          <Ionicons name="arrow-back" size={22} color={textColor} />
        </TouchableOpacity>
        <Text style={[styles.screenTitle, { color: textColor }]}>🤖 AI Assistant</Text>
        <View style={{ width: 22 }} />
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.card, { backgroundColor: cardBg, borderColor }]}>
          {/* Header */}
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14 }}>
            <View style={styles.botIcon}>
              <Ionicons name="sparkles" size={20} color="#2563EB" />
            </View>
            <View>
              <Text style={{ fontSize: 16, fontWeight: "800", color: textColor }}>
                Campus Notice AI Assistant
              </Text>
              <Text style={{ fontSize: 12, color: subTextColor }}>
                Answers grounded in real-time Firebase & MongoDB records
              </Text>
            </View>
          </View>

          {/* Messages */}
          <ScrollView style={{ maxHeight: 360, minHeight: 220 }} showsVerticalScrollIndicator={false}>
            <View style={{ gap: 10, paddingVertical: 10 }}>
              {messages.map((m, idx) => (
                <View
                  key={idx}
                  style={{
                    alignSelf: m.sender === "user" ? "flex-end" : "flex-start",
                    maxWidth: "85%",
                    padding: 12,
                    borderRadius: 12,
                    backgroundColor:
                      m.sender === "user"
                        ? "#2563EB"
                        : isDark
                        ? "#0F172A"
                        : "#F1F5F9",
                  }}
                >
                  <Text style={{ fontSize: 13, lineHeight: 18, color: m.sender === "user" ? "#FFFFFF" : textColor }}>
                    {m.text}
                  </Text>
                </View>
              ))}
            </View>
          </ScrollView>

          {/* Chips */}
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginVertical: 10 }}>
            {["Find latest notices", "Certificate status", "Event details", "Any query!"].map((c) => (
              <TouchableOpacity
                key={c}
                style={[styles.chip, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]}
                onPress={() => handleSend(c)}
              >
                <Text style={[styles.chipText, { color: textColor }]}>{c}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Input */}
          <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
            <TextInput
              style={[styles.input, { flex: 1, color: textColor, backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor }]}
              placeholder="Type your question..."
              placeholderTextColor="#94A3B8"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => handleSend()}
            />
            <TouchableOpacity style={styles.sendBtn} onPress={() => handleSend()}>
              <Ionicons name="send" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  screenTitle: { fontSize: 20, fontWeight: "800" },
  card: {
    maxWidth: 620,
    width: "100%",
    alignSelf: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  botIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  chip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  chipText: { fontSize: 11, fontWeight: "600" },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 13 },
  sendBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});
