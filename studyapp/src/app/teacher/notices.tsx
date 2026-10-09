import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";
import { auth, db } from "../../firebase/config";
import { sendBroadcastNotification } from "../../services/notificationService";
import { getApiUrl } from "../../api";

export default function TeacherNoticesScreen() {
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [subject, setSubject] = useState("Computer Science");
  const [category, setCategory] = useState("Academic");
  const [targetBranch, setTargetBranch] = useState("All Branches");
  const [priority, setPriority] = useState<"medium" | "high" | "urgent">("medium");
  const [publishing, setPublishing] = useState(false);

  const currentUser = auth.currentUser;

  // Real-time listener for notices
  useEffect(() => {
    const q = query(collection(db, "notices"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: any[] = [];
        snapshot.docs.forEach((d) => {
          const data = d.data();
          if (data.isTeacherNotice || data.authorRole === "teacher") {
            list.push({ id: d.id, ...data });
          }
        });
        setNotices(list);
        setLoading(false);
      },
      (err) => {
        console.warn("Teacher notices error:", err?.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const handlePublishNotice = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert("Missing Fields", "Please enter both notice title and message.");
      return;
    }

    if (publishing) return;
    setPublishing(true);

    const teacherName = currentUser?.displayName || "Dr. S. Reddy (Faculty)";
    const todayStr = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    try {
      const noticePayload = {
        title: title.trim(),
        message: message.trim(),
        content: message.trim(),
        subject,
        category,
        priority,
        targetBranch,
        isTeacherNotice: true,
        authorRole: "teacher",
        teacherName,
        teacherId: currentUser?.uid || "TEACH-101",
        date: todayStr,
        createdAt: serverTimestamp(),
      };

      // 1. Save in Firestore
      await addDoc(collection(db, "notices"), noticePayload);

      // 2. Save in MongoDB database
      try {
        const baseUrl = getApiUrl();
        await fetch(`${baseUrl}/api/notices`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            content: message.trim(),
            message: message.trim(),
            category,
            priority,
            authorName: teacherName,
            authorRole: "teacher",
            authorEmail: currentUser?.email,
            target: targetBranch,
          }),
        });
      } catch (mErr: any) {
        console.warn("MongoDB notice sync fallback:", mErr?.message);
      }

      // 3. Send Broadcast Notification (creates outgoing & incoming records)
      await sendBroadcastNotification({
        title: `📚 ${subject}: ${title.trim()}`,
        body: message.trim(),
        type: "notice",
        category,
        target: "All Students",
        senderName: teacherName,
        senderEmail: currentUser?.email,
        senderRole: "teacher",
        showSuccessAlert: false, // We'll show customized alert below
      });

      Alert.alert(
        "Notification Sent Successfully! 📢",
        `Notice "${title}" has been published to all students. Stored in MongoDB & Firebase databases.`
      );

      // Reset and close
      setTitle("");
      setMessage("");
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to publish notice.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Teacher Notices</Text>
          <Text style={styles.headerSubtitle}>Broadcast announcements & updates</Text>
        </View>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => setModalVisible(true)}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.createBtnText}>Post Notice</Text>
        </TouchableOpacity>
      </View>

      {/* Notices List */}
      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 40 }} />
        ) : notices.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="megaphone-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Teacher Notices Yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap "Post Notice" to broadcast assignments, lecture updates, or exams to your students.
            </Text>
          </View>
        ) : (
          notices.map((n) => (
            <View style={styles.card} key={n.id}>
              <View style={styles.cardHeader}>
                <View style={styles.subjectBadge}>
                  <Text style={styles.subjectText}>{n.subject || "Academic"}</Text>
                </View>
                <Text style={styles.dateText}>{n.date || "Recent"}</Text>
              </View>

              <Text style={styles.heading}>{n.title}</Text>
              <Text style={styles.body}>{n.message || n.content}</Text>

              <View style={styles.footerRow}>
                <Text style={styles.author}>
                  👤 {n.teacherName || "Faculty"} • {n.targetBranch || "All"}
                </Text>
                <View style={styles.successSentTag}>
                  <Ionicons name="checkmark-done" size={12} color="#059669" />
                  <Text style={styles.successSentText}>Notification Sent</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Create Notice Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📢 Post Teacher Notice</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Notice Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Assignment 3 Deadline Extension"
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.inputLabel}>Subject *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Data Structures / DBMS"
                value={subject}
                onChangeText={setSubject}
              />

              <Text style={styles.inputLabel}>Target Branch</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. CSE 4th Sem / All Branches"
                value={targetBranch}
                onChangeText={setTargetBranch}
              />

              <Text style={styles.inputLabel}>Notice Details / Message *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Write full notice details here..."
                value={message}
                onChangeText={setMessage}
                multiline
              />

              <TouchableOpacity
                style={styles.publishBtn}
                onPress={handlePublishNotice}
                disabled={publishing}
              >
                {publishing ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="send" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
                    <Text style={styles.publishBtnText}>Publish & Send Notification</Text>
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#F8FAFC" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 50,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
  headerSubtitle: { fontSize: 12, color: "#64748B", marginTop: 1 },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  createBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
  list: { flex: 1, padding: 16 },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 36,
    alignItems: "center",
    marginTop: 40,
    gap: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: "#0F172A" },
  emptySubtitle: { fontSize: 13, color: "#64748B", textAlign: "center", lineHeight: 18 },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  subjectBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  subjectText: { color: "#2563EB", fontWeight: "700", fontSize: 11 },
  dateText: { fontSize: 11, color: "#94A3B8" },
  heading: { fontSize: 16, fontWeight: "800", color: "#0F172A", marginBottom: 6 },
  body: { fontSize: 13.5, color: "#475569", lineHeight: 19, marginBottom: 12 },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 10,
  },
  author: { fontSize: 11.5, color: "#64748B", fontWeight: "600" },
  successSentTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  successSentText: { fontSize: 10.5, fontWeight: "700", color: "#059669" },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: { fontSize: 18, fontWeight: "800", color: "#0F172A" },
  inputLabel: { fontSize: 12.5, fontWeight: "700", color: "#334155", marginBottom: 6, marginTop: 10 },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    color: "#0F172A",
  },
  textArea: { height: 110, textAlignVertical: "top" },
  publishBtn: {
    flexDirection: "row",
    backgroundColor: "#2563EB",
    padding: 15,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  publishBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
});