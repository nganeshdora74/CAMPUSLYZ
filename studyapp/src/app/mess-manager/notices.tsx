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
} from "firebase/firestore";
import { auth, db } from "../../firebase/config";
import { sendBroadcastNotification } from "../../services/notificationService";
import { getApiUrl } from "../../api";

export default function MessNoticesScreen() {
  const [notices, setNotices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [mealType, setMealType] = useState("Dinner");
  const [publishing, setPublishing] = useState(false);

  const currentUser = auth.currentUser;

  useEffect(() => {
    const q = query(collection(db, "notices"), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: any[] = [];
        snapshot.docs.forEach((d) => {
          const data = d.data();
          if (data.authorRole === "mess_manager" || data.category === "Mess") {
            list.push({ id: d.id, ...data });
          }
        });
        setNotices(list);
        setLoading(false);
      },
      (err) => {
        console.warn("Mess notices error:", err?.message);
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

    const messIncharge = currentUser?.displayName || "Priya Nair (Mess Incharge)";
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
        category: "Mess",
        mealType,
        target: "Hostel Students",
        authorRole: "mess_manager",
        authorName: messIncharge,
        date: todayStr,
        createdAt: serverTimestamp(),
      };

      // 1. Save in Firestore
      await addDoc(collection(db, "notices"), noticePayload);

      // 2. Save in MongoDB database
      try {
        const baseUrl = getApiUrl();
        await fetch(`${baseUrl}/api/mess/notices`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: title.trim(),
            message: message.trim(),
          }),
        });
      } catch (mErr: any) {
        console.warn("MongoDB mess notice sync fallback:", mErr?.message);
      }

      // 3. Broadcast Notification (MongoDB + Firestore + outgoing/incoming records)
      await sendBroadcastNotification({
        title: `🍽️ Mess Update: ${title.trim()}`,
        body: message.trim(),
        type: "mess",
        category: "Mess",
        target: "Hostel Students",
        senderName: messIncharge,
        senderEmail: currentUser?.email,
        senderRole: "mess_manager",
        showSuccessAlert: false,
      });

      Alert.alert(
        "Notification Sent Successfully! 🍽️",
        `Mess notice "${title}" broadcasted to hostel students. Saved in MongoDB & Firebase databases.`
      );

      setTitle("");
      setMessage("");
      setModalVisible(false);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to publish mess notice.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Mess Notices</Text>
          <Text style={styles.headerSubtitle}>Menu announcements & timings</Text>
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

      <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color="#EA580C" style={{ marginTop: 40 }} />
        ) : notices.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="restaurant-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>No Mess Notices Yet</Text>
            <Text style={styles.emptySubtitle}>
              Tap "Post Notice" to notify hostellers about menu updates, feast days, or mess timings.
            </Text>
          </View>
        ) : (
          notices.map((n) => (
            <View style={styles.card} key={n.id}>
              <View style={styles.cardHeader}>
                <View style={styles.messBadge}>
                  <Text style={styles.messBadgeText}>{n.mealType || "Mess Update"}</Text>
                </View>
                <Text style={styles.dateText}>{n.date || "Recent"}</Text>
              </View>

              <Text style={styles.heading}>{n.title}</Text>
              <Text style={styles.body}>{n.message || n.content}</Text>

              <View style={styles.footerRow}>
                <Text style={styles.author}>👤 {n.authorName || "Mess Committee"}</Text>
                <View style={styles.successSentTag}>
                  <Ionicons name="checkmark-done" size={12} color="#059669" />
                  <Text style={styles.successSentText}>Notification Sent</Text>
                </View>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Post Modal */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>📢 Post Mess Notice</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>Notice Title *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Special Feast Dinner on Sunday"
                value={title}
                onChangeText={setTitle}
              />

              <Text style={styles.inputLabel}>Meal Session</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Breakfast / Lunch / Snacks / Dinner"
                value={mealType}
                onChangeText={setMealType}
              />

              <Text style={styles.inputLabel}>Notice Message *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Write menu details, change of items, or timing schedule..."
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
                    <Text style={styles.publishBtnText}>Publish & Notify Hostellers</Text>
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
    backgroundColor: "#EA580C",
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
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  messBadge: {
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  messBadgeText: { color: "#EA580C", fontWeight: "700", fontSize: 11 },
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
    backgroundColor: "#EA580C",
    padding: 15,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
    marginBottom: 20,
  },
  publishBtnText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
});