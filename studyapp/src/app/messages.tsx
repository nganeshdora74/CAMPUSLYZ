import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

import { auth, db } from "../firebase/config";
import { useAppTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import {
  connectStudentToTeacher,
  seedDefaultTeacherCode,
  ConnectedTeacherInfo,
  ConnectedStudentItem,
  listenTeacherConnectedStudents,
  seedDefaultConnectedStudents,
  sendTeacherStudentMessage,
  seedCampusCommunityChat,
  CAMPUS_FACULTY_LIST,
  CAMPUS_STUDENTS_LIST,
  CampusFacultyMember,
  CampusStudentPeer,
  TeacherStudentMessage,
} from "../firebase/teacherStudent";
import {
  pickPdfDocument,
  shareOrDownloadPdf,
  uploadChatMessageFile,
} from "../services/certificatePdfService";

const { width } = Dimensions.get("window");

// Quick reaction emojis displayed right above the input bar
const QUICK_EMOJIS = ["😀", "😂", "❤️", "🔥", "👍", "👏", "🎉", "📚", "💡", "❓", "✍️", "💯", "🚀", "✅", "🙏", "🎓"];

// Categorized emoji palette
const EMOJI_CATEGORIES = [
  {
    name: "Smileys & Mood",
    icon: "happy-outline",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "😂", "🤣", "😊", "😇",
      "🙂", "🙃", "😉", "😌", "😍", "🥰", "😘", "😗", "😋", "😛",
      "😜", "🤪", "🤓", "😎", "🥳", "🤩", "🥺", "😴", "🧐", "🤔",
      "🤫", "🤭", "🤗", "🤐", "😐", "😑", "😶", "😏", "😒", "🙄",
    ],
  },
  {
    name: "Study & Campus",
    icon: "school-outline",
    emojis: [
      "📚", "📖", "📝", "✏️", "🖊️", "🖋️", "🎓", "🎒", "💡", "🔬",
      "🧪", "💻", "🖥️", "⌨️", "📊", "📈", "📉", "📜", "📋", "📌",
      "📍", "🎯", "🏆", "🥇", "🥈", "🥉", "⏰", "⏳", "🔔", "📢",
      "📐", "📏", "📂", "📁", "🗂️", "📑", "📓", "📕", "📗", "📘",
    ],
  },
  {
    name: "Reactions & Hands",
    icon: "thumbs-up-outline",
    emojis: [
      "👍", "👎", "👏", "🙌", "👐", "🤲", "🤝", "✌️", "🤞", "🤟",
      "🤘", "🤙", "✍️", "🙏", "🙋‍♂️", "🙋‍♀️", "🙆‍♂️", "🙆‍♀️", "🙇‍♂️", "🙇‍♀️",
      "💬", "💭", "🗯️", "❓", "❗", "‼️", "⁉️", "⚠️", "🚫", "✅",
    ],
  },
  {
    name: "Fun & Hearts",
    icon: "flame-outline",
    emojis: [
      "🔥", "💯", "🚀", "⭐", "🌟", "✨", "💥", "🎉", "🎊", "🎈",
      "🎁", "🎂", "🥂", "🍻", "❤️", "🧡", "💛", "💚", "💙", "💜",
      "🖤", "🤍", "🤎", "💔", "❣️", "💕", "💞", "💓", "💗", "💖",
    ],
  },
];

export default function MessagesScreen() {
  const { colors, isDark } = useAppTheme();
  const { t } = useLanguage();
  const params = useLocalSearchParams<{ role?: string; teacherId?: string; studentId?: string; channel?: string }>();

  // =========================================================================
  // NAVIGATION & CHAT CHANNELS
  // "hub" = All Campus Community (All students and teachers chat together)
  // "faculty" = Direct 1-on-1 chats with professors
  // "students" = Direct 1-on-1 chats with student peers
  // =========================================================================
  const [activeTab, setActiveTab] = useState<"hub" | "faculty" | "students">(
    params.teacherId ? "faculty" : params.studentId ? "students" : "hub"
  );

  // Persona toggle: test chatting as Student vs Faculty
  const [personaRole, setPersonaRole] = useState<"student" | "teacher">(
    params.role === "teacher" ? "teacher" : "student"
  );
  const [personaName, setPersonaName] = useState<string>("Student");

  // Selection state
  const [selectedFaculty, setSelectedFaculty] = useState<CampusFacultyMember>(CAMPUS_FACULTY_LIST[0]);
  const [selectedStudentPeer, setSelectedStudentPeer] = useState<CampusStudentPeer>(CAMPUS_STUDENTS_LIST[0]);
  const [connectedTeachers, setConnectedTeachers] = useState<ConnectedTeacherInfo[]>([]);

  // Search filter
  const [searchQuery, setSearchQuery] = useState("");

  // Chat Feed State
  const [messages, setMessages] = useState<TeacherStudentMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  // Input states
  const [inputText, setInputText] = useState("");
  const [attachedPhoto, setAttachedPhoto] = useState<string | null>(null);
  const [attachedPdf, setAttachedPdf] = useState<{ uri: string; name: string } | null>(null);

  // Modals
  const [emojiModalVisible, setEmojiModalVisible] = useState(false);
  const [activeEmojiTab, setActiveEmojiTab] = useState(0);
  const [photoPickerModalVisible, setPhotoPickerModalVisible] = useState(false);
  const [photoUrlModal, setPhotoUrlModal] = useState(false);
  const [photoUrlInput, setPhotoUrlInput] = useState("");
  const [pdfPickerModalVisible, setPdfPickerModalVisible] = useState(false);
  const [pdfUrlModal, setPdfUrlModal] = useState(false);
  const [pdfUrlInput, setPdfUrlInput] = useState("");
  const [pdfNameInput, setPdfNameInput] = useState("");
  const [photoViewModal, setPhotoViewModal] = useState<string | null>(null);
  const [connectModalVisible, setConnectModalVisible] = useState(false);

  // Connect form states
  const [teacherIdInput, setTeacherIdInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [connecting, setConnecting] = useState(false);

  const scrollViewRef = useRef<ScrollView>(null);

  // 1. Initial Seeds and Auth listener
  useEffect(() => {
    seedDefaultTeacherCode();
    seedDefaultConnectedStudents();
    seedCampusCommunityChat();

    const user = auth.currentUser;
    if (user) {
      if (user.displayName) {
        setPersonaName(user.displayName);
      }
      const userRef = doc(db, "users", user.uid);
      const unsubUser = onSnapshot(userRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (Array.isArray(data.connectedTeachers)) {
            setConnectedTeachers(data.connectedTeachers);
          }
          if (data.isTeacher) {
            setPersonaRole("teacher");
            if (data.fullName) setPersonaName(data.fullName);
          } else if (data.fullName) {
            setPersonaName(data.fullName);
          }
        }
      });

      return () => unsubUser();
    }
  }, []);

  // Handle URL params
  useEffect(() => {
    if (params.teacherId) {
      setActiveTab("faculty");
      const found = CAMPUS_FACULTY_LIST.find(
        (f) => f.id.toUpperCase() === params.teacherId?.toUpperCase()
      );
      if (found) setSelectedFaculty(found);
    } else if (params.studentId) {
      setActiveTab("students");
      const found = CAMPUS_STUDENTS_LIST.find(
        (s) => s.id === params.studentId || s.rollNo.toUpperCase() === params.studentId?.toUpperCase()
      );
      if (found) setSelectedStudentPeer(found);
    }
    if (params.role === "teacher") {
      setPersonaRole("teacher");
      setPersonaName("Prof. Ganesh Sharma");
    }
  }, [params.teacherId, params.studentId, params.role]);

  // Compute Current Chat ID
  const currentChatId = useMemo(() => {
    const user = auth.currentUser;
    const uid = user ? user.uid : "guest_user";

    if (activeTab === "hub") {
      return "campus_community_hub";
    }

    if (activeTab === "faculty") {
      const facId = selectedFaculty?.id || "TEACH-CSE-101";
      return `${facId.toUpperCase()}_${uid}`;
    }

    // Classmate / Peer
    const peerId = selectedStudentPeer?.id || "STUDENT-CSE-001";
    // Sort pair so both sides share same conversation id
    const ids = [uid, peerId].sort();
    return `peer_${ids.join("_")}`;
  }, [activeTab, selectedFaculty, selectedStudentPeer]);

  // Real-time listener for current chat messages
  useEffect(() => {
    setLoading(true);
    const messagesRef = collection(db, "teacherStudentChats", currentChatId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const loaded: TeacherStudentMessage[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            senderId: data.senderId || "",
            senderName: data.senderName || "Campus Member",
            senderRole: data.senderRole || "student",
            text: data.text || "",
            photoUrl: data.photoUrl || "",
            pdfUrl: data.pdfUrl || "",
            pdfName: data.pdfName || "",
            createdAt: data.createdAt,
          };
        });
        setMessages(loaded);
        setLoading(false);

        setTimeout(() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 120);
      },
      (err) => {
        console.warn("Messages listener error:", err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [currentChatId]);

  // Filtered lists based on search query
  const filteredFaculty = useMemo(() => {
    if (!searchQuery.trim()) return CAMPUS_FACULTY_LIST;
    const q = searchQuery.toLowerCase();
    return CAMPUS_FACULTY_LIST.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        f.subject.toLowerCase().includes(q) ||
        f.department.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  const filteredStudents = useMemo(() => {
    if (!searchQuery.trim()) return CAMPUS_STUDENTS_LIST;
    const q = searchQuery.toLowerCase();
    return CAMPUS_STUDENTS_LIST.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.rollNo.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // =========================================================================
  // ATTACHMENT HANDLERS
  // =========================================================================

  // Pick Photo from Camera
  const handlePickFromCamera = async () => {
    setPhotoPickerModalVisible(false);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission needed", "Camera permission is required to capture photos.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.75,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setAttachedPhoto(result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert("Camera error", err?.message || "Could not capture image.");
    }
  };

  // Pick Photo from Gallery
  const handlePickFromGallery = async () => {
    setPhotoPickerModalVisible(false);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission needed", "Gallery permission is required to select photos.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        quality: 0.75,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setAttachedPhoto(result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert("Gallery error", err?.message || "Could not select image.");
    }
  };

  // Pick PDF Document
  const handlePickPdfFromDevice = async () => {
    setPdfPickerModalVisible(false);
    try {
      const docRes = await pickPdfDocument();
      if (docRes) {
        setAttachedPdf({
          uri: docRes.uri,
          name: docRes.name,
        });
      }
    } catch (err: any) {
      Alert.alert("PDF Selection Error", err?.message || "Could not select PDF document.");
    }
  };

  // Send Message
  const handleSendMessage = async (customText?: string) => {
    const user = auth.currentUser;
    const currentUid = user ? user.uid : "demo-user-id";
    const rawText = customText !== undefined ? customText : inputText;
    const trimmed = rawText.trim();

    if (!trimmed && !attachedPhoto && !attachedPdf) return;

    setSending(true);

    try {
      // 1. Upload Photo if local URI
      let finalPhotoUrl = attachedPhoto || "";
      if (attachedPhoto && (attachedPhoto.startsWith("file://") || attachedPhoto.startsWith("blob:"))) {
        finalPhotoUrl = await uploadChatMessageFile(attachedPhoto, "photo", currentChatId);
      }

      // 2. Upload PDF if local URI
      let finalPdfUrl = attachedPdf?.uri || "";
      let finalPdfName = attachedPdf?.name || "";
      if (attachedPdf && (attachedPdf.uri.startsWith("file://") || attachedPdf.uri.startsWith("blob:"))) {
        finalPdfUrl = await uploadChatMessageFile(attachedPdf.uri, "pdf", currentChatId);
      }

      // Determine sender name
      const nameToUse =
        personaRole === "teacher"
          ? personaName.includes("Prof") || personaName.includes("Dr")
            ? personaName
            : `Prof. ${personaName}`
          : personaName || "Student";

      const res = await sendTeacherStudentMessage(
        currentChatId,
        currentUid,
        nameToUse,
        personaRole,
        trimmed,
        finalPhotoUrl || undefined,
        finalPdfUrl || undefined,
        finalPdfName || undefined
      );

      if (res.success) {
        setInputText("");
        setAttachedPhoto(null);
        setAttachedPdf(null);
      } else {
        Alert.alert("Send Failed", res.error || "Could not deliver message.");
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to send message.");
    } finally {
      setSending(false);
    }
  };

  // Connect Student with Teacher Code
  const handleConnectWithCode = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Login Required", "Please log in before connecting to a teacher.");
      return;
    }
    if (!teacherIdInput.trim() || !passwordInput.trim()) {
      Alert.alert("Missing Information", "Please enter both Teacher ID and Password.");
      return;
    }

    setConnecting(true);
    const res = await connectStudentToTeacher(
      user.uid,
      user.displayName || "Student",
      user.email || "",
      teacherIdInput,
      passwordInput
    );
    setConnecting(false);

    if (res.success && res.teacher) {
      Alert.alert(
        "Connected Successfully! 🎉",
        `You are now connected with ${res.teacher.teacherName} for ${res.teacher.subject}!`
      );
      setConnectModalVisible(false);
      setTeacherIdInput("");
      setPasswordInput("");
      setActiveTab("faculty");
    } else {
      Alert.alert("Connection Failed", res.error || "Please check Teacher ID and Password.");
    }
  };

  // Format timestamp nicely
  const formatMessageTime = (ts: any) => {
    if (!ts) return "";
    try {
      const d = ts.toDate ? ts.toDate() : new Date(ts);
      return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={[styles.screen, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 10 : 0}
      >
        {/* ================================================== */}
        {/* TOP APP BAR */}
        {/* ================================================== */}
        <View style={[styles.topBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.backBtn, { backgroundColor: isDark ? colors.border : "#F1F5F9" }]}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>

          <View style={{ flex: 1, marginLeft: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Text style={[styles.topBarTitle, { color: colors.text }]}>Messages</Text>
              <View
                style={[
                  styles.channelBadge,
                  { backgroundColor: activeTab === "hub" ? "#7C3AED" : activeTab === "faculty" ? "#2563EB" : "#059669" },
                ]}
              >
                <Ionicons
                  name={activeTab === "hub" ? "globe" : activeTab === "faculty" ? "school" : "people"}
                  size={11}
                  color="#FFFFFF"
                />
                <Text style={styles.channelBadgeText}>
                  {activeTab === "hub"
                    ? "Campus Hub (All)"
                    : activeTab === "faculty"
                    ? "Faculty"
                    : "Classmates"}
                </Text>
              </View>
            </View>

            <Text style={[styles.topBarSubtitle, { color: colors.textSecondary }]} numberOfLines={1}>
              {activeTab === "hub"
                ? "Unified discussion room • All students & faculty"
                : activeTab === "faculty"
                ? `${selectedFaculty?.name} • ${selectedFaculty?.subject}`
                : `${selectedStudentPeer?.name} (${selectedStudentPeer?.rollNo})`}
            </Text>
          </View>

          {/* Persona Switcher Badge (Allows switching between Student & Faculty easily) */}
          <TouchableOpacity
            style={[
              styles.personaSwitchBtn,
              {
                backgroundColor: personaRole === "teacher" ? "#EEF2FF" : "#ECFDF5",
                borderColor: personaRole === "teacher" ? "#6366F1" : "#10B981",
              },
            ]}
            onPress={() => {
              const nextRole = personaRole === "student" ? "teacher" : "student";
              setPersonaRole(nextRole);
              if (nextRole === "teacher") {
                setPersonaName("Prof. Ganesh Sharma");
              } else {
                setPersonaName("Priya Sharma");
              }
            }}
            activeOpacity={0.75}
          >
            <Ionicons
              name={personaRole === "teacher" ? "school" : "person"}
              size={13}
              color={personaRole === "teacher" ? "#4F46E5" : "#059669"}
            />
            <Text
              style={[
                styles.personaSwitchBtnText,
                { color: personaRole === "teacher" ? "#4F46E5" : "#059669" },
              ]}
            >
              {personaRole === "teacher" ? "Faculty" : "Student"}
            </Text>
            <Ionicons
              name="swap-horizontal"
              size={12}
              color={personaRole === "teacher" ? "#4F46E5" : "#059669"}
            />
          </TouchableOpacity>

          {/* Connect Code Shortcut */}
          <TouchableOpacity
            style={[styles.keyBtn, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}
            onPress={() => setConnectModalVisible(true)}
            activeOpacity={0.7}
          >
            <Ionicons name="key-outline" size={15} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* ================================================== */}
        {/* ONE PLACE: UNIFIED THREE CHAT CHANNELS BAR */}
        {/* ================================================== */}
        <View style={[styles.channelsTabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          {/* 1. All Campus Hub */}
          <TouchableOpacity
            style={[
              styles.channelTabItem,
              activeTab === "hub" && [styles.channelTabItemActive, { backgroundColor: colors.primary }],
            ]}
            onPress={() => setActiveTab("hub")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="globe"
              size={14}
              color={activeTab === "hub" ? "#FFFFFF" : colors.textSecondary}
            />
            <Text
              style={[
                styles.channelTabItemText,
                { color: activeTab === "hub" ? "#FFFFFF" : colors.textSecondary },
              ]}
            >
              🌐 Campus Hub (All-Hands)
            </Text>
          </TouchableOpacity>

          {/* 2. Faculty 1-on-1 */}
          <TouchableOpacity
            style={[
              styles.channelTabItem,
              activeTab === "faculty" && [styles.channelTabItemActive, { backgroundColor: "#2563EB" }],
            ]}
            onPress={() => setActiveTab("faculty")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="school"
              size={14}
              color={activeTab === "faculty" ? "#FFFFFF" : colors.textSecondary}
            />
            <Text
              style={[
                styles.channelTabItemText,
                { color: activeTab === "faculty" ? "#FFFFFF" : colors.textSecondary },
              ]}
            >
              🎓 Faculty
            </Text>
          </TouchableOpacity>

          {/* 3. Classmates 1-on-1 */}
          <TouchableOpacity
            style={[
              styles.channelTabItem,
              activeTab === "students" && [styles.channelTabItemActive, { backgroundColor: "#059669" }],
            ]}
            onPress={() => setActiveTab("students")}
            activeOpacity={0.8}
          >
            <Ionicons
              name="people"
              size={14}
              color={activeTab === "students" ? "#FFFFFF" : colors.textSecondary}
            />
            <Text
              style={[
                styles.channelTabItemText,
                { color: activeTab === "students" ? "#FFFFFF" : colors.textSecondary },
              ]}
            >
              🎒 Classmates
            </Text>
          </TouchableOpacity>
        </View>

        {/* ================================================== */}
        {/* FACULTY / STUDENT MEMBERS SELECTOR RIBBON */}
        {/* ================================================== */}
        {activeTab === "faculty" && (
          <View style={[styles.membersRibbon, { backgroundColor: isDark ? colors.card : "#F8FAFC", borderBottomColor: colors.border }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
              {filteredFaculty.map((fac) => {
                const isSelected = selectedFaculty?.id === fac.id;
                return (
                  <TouchableOpacity
                    key={fac.id}
                    style={[
                      styles.memberPill,
                      {
                        backgroundColor: isSelected ? "#2563EB" : colors.card,
                        borderColor: isSelected ? "#2563EB" : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedFaculty(fac)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.avatarDot, { backgroundColor: isSelected ? "#FFFFFF" : fac.avatarColor }]}>
                      <Ionicons
                        name="school"
                        size={11}
                        color={isSelected ? "#2563EB" : "#FFFFFF"}
                      />
                    </View>
                    <View>
                      <Text
                        style={[
                          styles.memberPillName,
                          { color: isSelected ? "#FFFFFF" : colors.text },
                        ]}
                        numberOfLines={1}
                      >
                        {fac.name}
                      </Text>
                      <Text
                        style={[
                          styles.memberPillSub,
                          { color: isSelected ? "#DBEAFE" : colors.textSecondary },
                        ]}
                        numberOfLines={1}
                      >
                        {fac.subject}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {activeTab === "students" && (
          <View style={[styles.membersRibbon, { backgroundColor: isDark ? colors.card : "#F8FAFC", borderBottomColor: colors.border }]}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 12, gap: 8 }}>
              {filteredStudents.map((st) => {
                const isSelected = selectedStudentPeer?.id === st.id;
                return (
                  <TouchableOpacity
                    key={st.id}
                    style={[
                      styles.memberPill,
                      {
                        backgroundColor: isSelected ? "#059669" : colors.card,
                        borderColor: isSelected ? "#059669" : colors.border,
                      },
                    ]}
                    onPress={() => setSelectedStudentPeer(st)}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.avatarDot, { backgroundColor: isSelected ? "#FFFFFF" : st.avatarColor }]}>
                      <Ionicons
                        name="person"
                        size={11}
                        color={isSelected ? "#059669" : "#FFFFFF"}
                      />
                    </View>
                    <View>
                      <Text
                        style={[
                          styles.memberPillName,
                          { color: isSelected ? "#FFFFFF" : colors.text },
                        ]}
                        numberOfLines={1}
                      >
                        {st.name}
                      </Text>
                      <Text
                        style={[
                          styles.memberPillSub,
                          { color: isSelected ? "#D1FAE5" : colors.textSecondary },
                        ]}
                        numberOfLines={1}
                      >
                        {st.rollNo}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* ================================================== */}
        {/* MESSAGES FEED SCROLLVIEW */}
        {/* ================================================== */}
        {loading ? (
          <View style={styles.centerBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.centerBoxText, { color: colors.textSecondary }]}>Loading conversation...</Text>
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            style={styles.chatScroll}
            contentContainerStyle={styles.chatScrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Top Channel Information Banner */}
            <View
              style={[
                styles.channelBanner,
                {
                  backgroundColor: isDark ? colors.card : activeTab === "hub" ? "#F5F3FF" : activeTab === "faculty" ? "#EFF6FF" : "#ECFDF5",
                  borderColor: colors.border,
                },
              ]}
            >
              <View style={styles.bannerIconBox}>
                <Ionicons
                  name={activeTab === "hub" ? "sparkles" : activeTab === "faculty" ? "school" : "people"}
                  size={20}
                  color={activeTab === "hub" ? "#7C3AED" : activeTab === "faculty" ? "#2563EB" : "#059669"}
                />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[styles.bannerTitle, { color: colors.text }]}>
                  {activeTab === "hub"
                    ? "Campus All-Hands Chat Room"
                    : activeTab === "faculty"
                    ? `1-on-1 with ${selectedFaculty.name}`
                    : `Direct Chat with ${selectedStudentPeer.name}`}
                </Text>
                <Text style={[styles.bannerSubtitle, { color: colors.textSecondary }]}>
                  {activeTab === "hub"
                    ? "Ask questions, discuss lectures, and share photos & PDFs with all professors & students."
                    : activeTab === "faculty"
                    ? `Faculty: ${selectedFaculty.designation} • ${selectedFaculty.department}`
                    : `Classmate: ${selectedStudentPeer.department} • ${selectedStudentPeer.year}`}
                </Text>
              </View>
            </View>

            {/* Empty State */}
            {messages.length === 0 ? (
              <View style={[styles.emptyChatBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="chatbubbles-outline" size={40} color={colors.textMuted} />
                <Text style={[styles.emptyChatTitle, { color: colors.text }]}>No messages yet</Text>
                <Text style={[styles.emptyChatSubtitle, { color: colors.textSecondary }]}>
                  Be the first to say hello, ask a study question, or share photos and notes!
                </Text>
                <TouchableOpacity
                  style={[styles.waveBtn, { backgroundColor: colors.primary }]}
                  onPress={() => handleSendMessage("Hello everyone! 👋 Glad to connect here!")}
                >
                  <Text style={styles.waveBtnText}>👋 Send Quick Greeting</Text>
                </TouchableOpacity>
              </View>
            ) : (
              messages.map((msg) => {
                const isMe =
                  msg.senderName.toLowerCase().includes(personaName.toLowerCase()) ||
                  (personaRole === "teacher" && msg.senderRole === "teacher" && msg.senderName.includes("Ganesh"));
                const isTeacher = msg.senderRole === "teacher";

                return (
                  <View
                    key={msg.id}
                    style={[
                      styles.messageRow,
                      isMe ? styles.messageRowRight : styles.messageRowLeft,
                    ]}
                  >
                    {!isMe && (
                      <View
                        style={[
                          styles.avatarCircle,
                          { backgroundColor: isTeacher ? "#6366F1" : "#10B981" },
                        ]}
                      >
                        <Ionicons
                          name={isTeacher ? "school" : "person"}
                          size={14}
                          color="#FFFFFF"
                        />
                      </View>
                    )}

                    <View
                      style={[
                        styles.messageBubble,
                        isMe
                          ? [styles.myBubble, { backgroundColor: colors.primary }]
                          : [styles.otherBubble, { backgroundColor: colors.card, borderColor: colors.border }],
                      ]}
                    >
                      {/* Sender Header */}
                      <View style={styles.senderHeader}>
                        <Text
                          style={[
                            styles.senderNameText,
                            { color: isMe ? "#FFFFFF" : colors.text },
                          ]}
                          numberOfLines={1}
                        >
                          {isMe ? "You" : msg.senderName}
                        </Text>
                        <View
                          style={[
                            styles.roleTag,
                            {
                              backgroundColor: isMe
                                ? "rgba(255,255,255,0.25)"
                                : isTeacher
                                ? "#EEF2FF"
                                : "#ECFDF5",
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.roleTagText,
                              {
                                color: isMe
                                  ? "#FFFFFF"
                                  : isTeacher
                                  ? "#4F46E5"
                                  : "#059669",
                              },
                            ]}
                          >
                            {isTeacher ? "Faculty 🎓" : "Student 🎒"}
                          </Text>
                        </View>
                      </View>

                      {/* Photo Attachment (if any) */}
                      {Boolean(msg.photoUrl) && (
                        <TouchableOpacity
                          style={styles.photoContainer}
                          onPress={() => setPhotoViewModal(msg.photoUrl || null)}
                          activeOpacity={0.9}
                        >
                          <Image
                            source={{ uri: msg.photoUrl }}
                            style={styles.messagePhoto}
                            resizeMode="cover"
                          />
                          <View style={styles.photoOverlayBadge}>
                            <Ionicons name="scan-outline" size={13} color="#FFFFFF" />
                            <Text style={styles.photoOverlayBadgeText}>Tap to Zoom</Text>
                          </View>
                        </TouchableOpacity>
                      )}

                      {/* PDF Attachment (if any) */}
                      {Boolean(msg.pdfUrl) && (
                        <TouchableOpacity
                          style={[
                            styles.pdfCard,
                            {
                              backgroundColor: isMe ? "rgba(255,255,255,0.18)" : isDark ? colors.background : "#FEF2F2",
                              borderColor: isMe ? "rgba(255,255,255,0.3)" : "#FCA5A5",
                            },
                          ]}
                          onPress={() => shareOrDownloadPdf(msg.pdfUrl!, msg.pdfName || "Document.pdf")}
                          activeOpacity={0.85}
                        >
                          <View style={styles.pdfIconCircle}>
                            <Ionicons name="document-text" size={20} color="#DC2626" />
                          </View>
                          <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text
                              style={[
                                styles.pdfNameText,
                                { color: isMe ? "#FFFFFF" : colors.text },
                              ]}
                              numberOfLines={1}
                            >
                              {msg.pdfName || "PDF Document"}
                            </Text>
                            <Text
                              style={[
                                styles.pdfActionText,
                                { color: isMe ? "#F1F5F9" : "#DC2626" },
                              ]}
                            >
                              Open / Download PDF →
                            </Text>
                          </View>
                          <Ionicons
                            name="arrow-down-circle"
                            size={20}
                            color={isMe ? "#FFFFFF" : "#DC2626"}
                          />
                        </TouchableOpacity>
                      )}

                      {/* Text Content */}
                      {Boolean(msg.text) && (
                        <Text
                          style={[
                            styles.messageText,
                            { color: isMe ? "#FFFFFF" : colors.text },
                          ]}
                        >
                          {msg.text}
                        </Text>
                      )}

                      {/* Time footer */}
                      <Text
                        style={[
                          styles.messageTime,
                          { color: isMe ? "rgba(255,255,255,0.75)" : colors.textMuted },
                        ]}
                      >
                        {formatMessageTime(msg.createdAt)}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}

        {/* ================================================== */}
        {/* ATTACHMENT PREVIEW TRAY (PHOTO OR PDF) */}
        {/* ================================================== */}
        {(attachedPhoto || attachedPdf) && (
          <View style={[styles.attachmentPreviewBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
            {attachedPhoto && (
              <View style={styles.previewItem}>
                <Image source={{ uri: attachedPhoto }} style={styles.previewImageThumb} />
                <View style={{ marginLeft: 8, flex: 1 }}>
                  <Text style={[styles.previewItemTitle, { color: colors.text }]} numberOfLines={1}>
                    Photo attached
                  </Text>
                  <Text style={[styles.previewItemSub, { color: colors.textSecondary }]}>Ready to upload & send</Text>
                </View>
                <TouchableOpacity
                  style={styles.previewRemoveBtn}
                  onPress={() => setAttachedPhoto(null)}
                >
                  <Ionicons name="close-circle" size={22} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}

            {attachedPdf && (
              <View style={styles.previewItem}>
                <View style={[styles.previewIconBox, { backgroundColor: "#FEE2E2" }]}>
                  <Ionicons name="document-text" size={22} color="#DC2626" />
                </View>
                <View style={{ marginLeft: 8, flex: 1 }}>
                  <Text style={[styles.previewItemTitle, { color: colors.text }]} numberOfLines={1}>
                    {attachedPdf.name}
                  </Text>
                  <Text style={[styles.previewItemSub, { color: colors.textSecondary }]}>PDF Document attached</Text>
                </View>
                <TouchableOpacity
                  style={styles.previewRemoveBtn}
                  onPress={() => setAttachedPdf(null)}
                >
                  <Ionicons name="close-circle" size={22} color="#EF4444" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* ================================================== */}
        {/* QUICK EMOJI BAR */}
        {/* ================================================== */}
        <View style={[styles.quickEmojiBar, { backgroundColor: isDark ? colors.card : "#F8FAFC", borderTopColor: colors.border }]}>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 10, gap: 6 }}>
            {QUICK_EMOJIS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={[styles.quickEmojiPill, { backgroundColor: isDark ? colors.background : "#FFFFFF", borderColor: colors.border }]}
                onPress={() => setInputText((prev) => prev + emoji)}
                activeOpacity={0.7}
              >
                <Text style={styles.quickEmojiText}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ================================================== */}
        {/* INPUT BAR */}
        {/* ================================================== */}
        <View style={[styles.inputBar, { backgroundColor: colors.card, borderTopColor: colors.border }]}>
          {/* Emoji palette toggle */}
          <TouchableOpacity
            style={[styles.mediaActionBtn, { backgroundColor: colors.inputBg }]}
            onPress={() => setEmojiModalVisible(true)}
            activeOpacity={0.75}
          >
            <Text style={{ fontSize: 18 }}>😊</Text>
          </TouchableOpacity>

          {/* Photo attachment button */}
          <TouchableOpacity
            style={[
              styles.mediaActionBtn,
              { backgroundColor: attachedPhoto ? "#EEF2FF" : colors.inputBg },
            ]}
            onPress={() => setPhotoPickerModalVisible(true)}
            activeOpacity={0.75}
          >
            <Ionicons
              name={attachedPhoto ? "image" : "camera-outline"}
              size={20}
              color={attachedPhoto ? "#4F46E5" : colors.primary}
            />
          </TouchableOpacity>

          {/* PDF attachment button */}
          <TouchableOpacity
            style={[
              styles.mediaActionBtn,
              { backgroundColor: attachedPdf ? "#FEF2F2" : colors.inputBg },
            ]}
            onPress={() => setPdfPickerModalVisible(true)}
            activeOpacity={0.75}
          >
            <Ionicons
              name={attachedPdf ? "document-text" : "document-attach-outline"}
              size={20}
              color={attachedPdf ? "#DC2626" : "#EA580C"}
            />
          </TouchableOpacity>

          {/* Text Input */}
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: colors.inputBg,
                color: colors.text,
                borderColor: colors.border,
              },
            ]}
            placeholder="Type a message, question, or doubt..."
            placeholderTextColor={colors.textMuted}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1200}
          />

          {/* Send Button */}
          <TouchableOpacity
            style={[
              styles.sendBtn,
              {
                backgroundColor:
                  inputText.trim() || attachedPhoto || attachedPdf ? colors.primary : colors.inputBg,
              },
            ]}
            onPress={() => handleSendMessage()}
            disabled={(!inputText.trim() && !attachedPhoto && !attachedPdf) || sending}
            activeOpacity={0.8}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Ionicons
                name="send"
                size={18}
                color={inputText.trim() || attachedPhoto || attachedPdf ? "#FFFFFF" : colors.textMuted}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* ==================================================== */}
      {/* FULL EMOJI PICKER MODAL */}
      {/* ==================================================== */}
      <Modal
        visible={emojiModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEmojiModalVisible(false)}
      >
        <View style={[styles.modalOverlay, { backgroundColor: "rgba(0,0,0,0.5)" }]}>
          <View style={[styles.modalContent, { backgroundColor: colors.card, height: 380 }]}>
            <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Text style={{ fontSize: 20 }}>😊</Text>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Select Emoji</Text>
              </View>
              <TouchableOpacity onPress={() => setEmojiModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Category tabs */}
            <View style={{ flexDirection: "row", borderBottomWidth: 1, borderBottomColor: colors.border }}>
              {EMOJI_CATEGORIES.map((cat, idx) => {
                const isSelected = activeEmojiTab === idx;
                return (
                  <TouchableOpacity
                    key={cat.name}
                    style={[
                      styles.emojiCategoryTab,
                      isSelected && { borderBottomColor: colors.primary, borderBottomWidth: 2 },
                    ]}
                    onPress={() => setActiveEmojiTab(idx)}
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={16}
                      color={isSelected ? colors.primary : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.emojiCategoryTabText,
                        { color: isSelected ? colors.primary : colors.textSecondary },
                      ]}
                    >
                      {cat.name.split(" ")[0]}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Emoji Grid */}
            <ScrollView contentContainerStyle={styles.emojiGrid}>
              {EMOJI_CATEGORIES[activeEmojiTab].emojis.map((emoji) => (
                <TouchableOpacity
                  key={emoji}
                  style={styles.emojiGridItem}
                  onPress={() => {
                    setInputText((prev) => prev + emoji);
                  }}
                  activeOpacity={0.6}
                >
                  <Text style={{ fontSize: 28 }}>{emoji}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ==================================================== */}
      {/* PHOTO SOURCE PICKER MODAL */}
      {/* ==================================================== */}
      <Modal
        visible={photoPickerModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoPickerModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPhotoPickerModalVisible(false)}
        >
          <View style={[styles.actionSheet, { backgroundColor: colors.card }]}>
            <Text style={[styles.actionSheetTitle, { color: colors.text }]}>Attach Photo or Diagram</Text>

            <TouchableOpacity style={styles.actionSheetRow} onPress={handlePickFromCamera}>
              <View style={[styles.actionSheetIcon, { backgroundColor: "#DBEAFE" }]}>
                <Ionicons name="camera" size={20} color="#2563EB" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.actionSheetRowTitle, { color: colors.text }]}>Take Photo with Camera</Text>
                <Text style={[styles.actionSheetRowSub, { color: colors.textSecondary }]}>Capture whiteboard or notebook notes</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionSheetRow} onPress={handlePickFromGallery}>
              <View style={[styles.actionSheetIcon, { backgroundColor: "#F3EEFD" }]}>
                <Ionicons name="images" size={20} color="#7C3AED" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.actionSheetRowTitle, { color: colors.text }]}>Choose from Gallery</Text>
                <Text style={[styles.actionSheetRowSub, { color: colors.textSecondary }]}>Select an image from device library</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionSheetRow}
              onPress={() => {
                setPhotoPickerModalVisible(false);
                setPhotoUrlModal(true);
              }}
            >
              <View style={[styles.actionSheetIcon, { backgroundColor: "#DCFCE7" }]}>
                <Ionicons name="link" size={20} color="#16A34A" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.actionSheetRowTitle, { color: colors.text }]}>Enter Photo Web Link (URL)</Text>
                <Text style={[styles.actionSheetRowSub, { color: colors.textSecondary }]}>Paste any image address directly</Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ==================================================== */}
      {/* PHOTO URL INPUT MODAL */}
      {/* ==================================================== */}
      <Modal
        visible={photoUrlModal}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoUrlModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.dialogCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.dialogTitle, { color: colors.text }]}>Paste Image Link</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              placeholder="https://example.com/diagram.jpg"
              placeholderTextColor={colors.textMuted}
              value={photoUrlInput}
              onChangeText={setPhotoUrlInput}
              autoCapitalize="none"
            />
            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.inputBg }]}
                onPress={() => setPhotoUrlModal(false)}
              >
                <Text style={{ color: colors.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.primary }]}
                onPress={() => {
                  if (photoUrlInput.trim()) {
                    setAttachedPhoto(photoUrlInput.trim());
                    setPhotoUrlInput("");
                    setPhotoUrlModal(false);
                  }
                }}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Attach</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================================================== */}
      {/* PDF SOURCE PICKER MODAL */}
      {/* ==================================================== */}
      <Modal
        visible={pdfPickerModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setPdfPickerModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setPdfPickerModalVisible(false)}
        >
          <View style={[styles.actionSheet, { backgroundColor: colors.card }]}>
            <Text style={[styles.actionSheetTitle, { color: colors.text }]}>Attach PDF Document</Text>

            <TouchableOpacity style={styles.actionSheetRow} onPress={handlePickPdfFromDevice}>
              <View style={[styles.actionSheetIcon, { backgroundColor: "#FEE2E2" }]}>
                <Ionicons name="document-text" size={20} color="#DC2626" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.actionSheetRowTitle, { color: colors.text }]}>Pick PDF from Device</Text>
                <Text style={[styles.actionSheetRowSub, { color: colors.textSecondary }]}>Browse files, lecture notes, and assignments</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionSheetRow}
              onPress={() => {
                setPdfPickerModalVisible(false);
                setPdfUrlModal(true);
              }}
            >
              <View style={[styles.actionSheetIcon, { backgroundColor: "#FFEDD5" }]}>
                <Ionicons name="link" size={20} color="#EA580C" />
              </View>
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={[styles.actionSheetRowTitle, { color: colors.text }]}>Enter PDF Web Link (URL)</Text>
                <Text style={[styles.actionSheetRowSub, { color: colors.textSecondary }]}>Paste URL for online study notes or textbook</Text>
              </View>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ==================================================== */}
      {/* PDF URL INPUT MODAL */}
      {/* ==================================================== */}
      <Modal
        visible={pdfUrlModal}
        transparent
        animationType="fade"
        onRequestClose={() => setPdfUrlModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.dialogCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.dialogTitle, { color: colors.text }]}>Attach PDF from URL</Text>

            <Text style={{ fontSize: 11.5, color: colors.textSecondary, marginBottom: 4 }}>Document Title / Name *</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              placeholder="e.g. Unit_3_Lecture_Slides.pdf"
              placeholderTextColor={colors.textMuted}
              value={pdfNameInput}
              onChangeText={setPdfNameInput}
            />

            <Text style={{ fontSize: 11.5, color: colors.textSecondary, marginTop: 10, marginBottom: 4 }}>PDF Direct Web Link *</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              placeholder="https://example.com/syllabus.pdf"
              placeholderTextColor={colors.textMuted}
              value={pdfUrlInput}
              onChangeText={setPdfUrlInput}
              autoCapitalize="none"
            />

            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.inputBg }]}
                onPress={() => setPdfUrlModal(false)}
              >
                <Text style={{ color: colors.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: "#DC2626" }]}
                onPress={() => {
                  if (pdfUrlInput.trim()) {
                    setAttachedPdf({
                      uri: pdfUrlInput.trim(),
                      name: pdfNameInput.trim() || "Document.pdf",
                    });
                    setPdfUrlInput("");
                    setPdfNameInput("");
                    setPdfUrlModal(false);
                  }
                }}
              >
                <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Attach PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================================================== */}
      {/* FULL-SCREEN TAP-TO-ZOOM PHOTO VIEWER */}
      {/* ==================================================== */}
      <Modal
        visible={Boolean(photoViewModal)}
        transparent
        animationType="fade"
        onRequestClose={() => setPhotoViewModal(null)}
      >
        <View style={styles.photoViewOverlay}>
          <TouchableOpacity
            style={styles.photoViewCloseBtn}
            onPress={() => setPhotoViewModal(null)}
          >
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {Boolean(photoViewModal) && (
            <Image
              source={{ uri: photoViewModal! }}
              style={styles.fullScreenPhoto}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>

      {/* ==================================================== */}
      {/* CONNECT WITH PRIVATE TEACHER CODE MODAL (OPTIONAL) */}
      {/* ==================================================== */}
      <Modal
        visible={connectModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setConnectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.dialogCard, { backgroundColor: colors.card }]}>
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="key" size={20} color={colors.primary} />
                <Text style={[styles.dialogTitle, { color: colors.text, marginBottom: 0 }]}>Connect Private Class</Text>
              </View>
              <TouchableOpacity onPress={() => setConnectModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 12 }}>
              If your professor provided a private code, enter it below to link your student profile.
            </Text>

            <TouchableOpacity
              style={[styles.demoFillChip, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}
              onPress={() => {
                setTeacherIdInput("TEACH-CSE-101");
                setPasswordInput("123");
              }}
            >
              <Text style={{ fontSize: 11.5, color: colors.primary, fontWeight: "700" }}>
                💡 Tap to Auto-Fill: TEACH-CSE-101 • Password: 123
              </Text>
            </TouchableOpacity>

            <Text style={{ fontSize: 11.5, color: colors.textSecondary, marginBottom: 4 }}>Teacher ID *</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              placeholder="e.g. TEACH-CSE-101"
              placeholderTextColor={colors.textMuted}
              value={teacherIdInput}
              onChangeText={setTeacherIdInput}
              autoCapitalize="characters"
            />

            <Text style={{ fontSize: 11.5, color: colors.textSecondary, marginTop: 10, marginBottom: 4 }}>Password *</Text>
            <TextInput
              style={[styles.modalInput, { backgroundColor: colors.inputBg, color: colors.text, borderColor: colors.border }]}
              placeholder="Enter password"
              placeholderTextColor={colors.textMuted}
              value={passwordInput}
              onChangeText={setPasswordInput}
              secureTextEntry
            />

            <View style={styles.dialogActions}>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.inputBg }]}
                onPress={() => setConnectModalVisible(false)}
              >
                <Text style={{ color: colors.textSecondary }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.dialogBtn, { backgroundColor: colors.primary }]}
                onPress={handleConnectWithCode}
                disabled={connecting}
              >
                {connecting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>Connect & Join</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  channelBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  channelBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  topBarSubtitle: {
    fontSize: 11.5,
    marginTop: 1,
  },
  personaSwitchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 6,
  },
  personaSwitchBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },
  keyBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },

  // Channels Tab Bar
  channelsTabBar: {
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    borderBottomWidth: 1,
  },
  channelTabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 7,
    borderRadius: 8,
  },
  channelTabItemActive: {
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  channelTabItemText: {
    fontSize: 11.5,
    fontWeight: "700",
  },

  // Members ribbon
  membersRibbon: {
    paddingVertical: 7,
    borderBottomWidth: 1,
  },
  memberPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    maxWidth: 200,
  },
  avatarDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
  },
  memberPillName: {
    fontSize: 12,
    fontWeight: "700",
  },
  memberPillSub: {
    fontSize: 10,
  },

  // Chat Feed
  chatScroll: {
    flex: 1,
  },
  chatScrollContent: {
    padding: 12,
    paddingBottom: 20,
  },
  centerBox: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  centerBoxText: {
    fontSize: 13,
    marginTop: 10,
  },
  channelBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  bannerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  bannerSubtitle: {
    fontSize: 11,
    marginTop: 2,
    lineHeight: 15,
  },

  // Empty Chat
  emptyChatBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 40,
    marginHorizontal: 16,
  },
  emptyChatTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 10,
  },
  emptyChatSubtitle: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
    lineHeight: 17,
  },
  waveBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    marginTop: 14,
  },
  waveBtnText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "700",
  },

  // Message Bubble
  messageRow: {
    flexDirection: "row",
    marginBottom: 12,
    alignItems: "flex-end",
    gap: 8,
  },
  messageRowLeft: {
    justifyContent: "flex-start",
  },
  messageRowRight: {
    justifyContent: "flex-end",
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  messageBubble: {
    maxWidth: width > 600 ? "65%" : "82%",
    padding: 10,
    borderRadius: 14,
  },
  myBubble: {
    borderBottomRightRadius: 2,
  },
  otherBubble: {
    borderBottomLeftRadius: 2,
    borderWidth: 1,
  },
  senderHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  senderNameText: {
    fontSize: 11.5,
    fontWeight: "700",
  },
  roleTag: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  roleTagText: {
    fontSize: 9.5,
    fontWeight: "700",
  },
  messageText: {
    fontSize: 13.5,
    lineHeight: 19,
  },
  messageTime: {
    fontSize: 9.5,
    marginTop: 4,
    alignSelf: "flex-end",
  },

  // Photos in Chat
  photoContainer: {
    marginVertical: 4,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  messagePhoto: {
    width: width > 600 ? 320 : width * 0.65,
    height: 190,
    borderRadius: 10,
  },
  photoOverlayBadge: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.65)",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  photoOverlayBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "600",
  },

  // PDF in Chat
  pdfCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginVertical: 4,
  },
  pdfIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  pdfNameText: {
    fontSize: 12,
    fontWeight: "700",
  },
  pdfActionText: {
    fontSize: 10.5,
    fontWeight: "600",
    marginTop: 2,
  },

  // Attachment Preview Bar
  attachmentPreviewBar: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderTopWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  previewItem: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  previewImageThumb: {
    width: 36,
    height: 36,
    borderRadius: 6,
  },
  previewIconBox: {
    width: 36,
    height: 36,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  previewItemTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  previewItemSub: {
    fontSize: 10,
  },
  previewRemoveBtn: {
    padding: 4,
  },

  // Quick Emoji Bar
  quickEmojiBar: {
    paddingVertical: 5,
    borderTopWidth: 1,
  },
  quickEmojiPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
  },
  quickEmojiText: {
    fontSize: 16,
  },

  // Input Bar
  inputBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 6,
  },
  mediaActionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  textInput: {
    flex: 1,
    minHeight: 38,
    maxHeight: 100,
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    fontSize: 13.5,
    borderWidth: 1,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },

  // Modals & Dialogs
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalContent: {
    width: "100%",
    maxWidth: 480,
    borderRadius: 16,
    overflow: "hidden",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  emojiCategoryTab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    paddingVertical: 10,
  },
  emojiCategoryTabText: {
    fontSize: 11,
    fontWeight: "600",
  },
  emojiGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 8,
  },
  emojiGridItem: {
    width: "12.5%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
  },

  // Action Sheet
  actionSheet: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 16,
  },
  actionSheetTitle: {
    fontSize: 14,
    fontWeight: "700",
    marginBottom: 12,
  },
  actionSheetRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
  },
  actionSheetIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  actionSheetRowTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  actionSheetRowSub: {
    fontSize: 11,
    marginTop: 2,
  },

  // Dialog Card
  dialogCard: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 16,
  },
  dialogTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 12,
  },
  modalInput: {
    height: 42,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 13,
    borderWidth: 1,
  },
  demoFillChip: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
  dialogActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
  },
  dialogBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
  },

  // Photo Viewer
  photoViewOverlay: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "center",
    alignItems: "center",
  },
  photoViewCloseBtn: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  fullScreenPhoto: {
    width: "100%",
    height: "85%",
  },
});