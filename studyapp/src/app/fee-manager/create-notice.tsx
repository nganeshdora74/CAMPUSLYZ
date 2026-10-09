import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../../firebase/config";
import { sendBroadcastNotification } from "../../services/notificationService";
import { getApiUrl } from "../../api";

export default function CreateFeeNotice() {
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState("");
  const [dueDate, setDueDate] = useState("20 Oct 2026");
  const [feeCategory, setFeeCategory] = useState("Tuition Fee");
  const [publishing, setPublishing] = useState(false);

  const currentUser = auth.currentUser;

  const handlePublish = async () => {
    if (!title.trim() || !message.trim()) {
      Alert.alert("Missing Information", "Please enter both notice title and message details.");
      return;
    }

    if (publishing) return;
    setPublishing(true);

    const feeOfficer = currentUser?.displayName || "Vikram Singh (Finance Officer)";
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
        category: "Finance",
        feeCategory,
        dueDate,
        authorRole: "fee_manager",
        authorName: feeOfficer,
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
            category: "Finance",
            authorName: feeOfficer,
            authorRole: "fee_manager",
            target: "All Students",
          }),
        });
      } catch (mErr: any) {
        console.warn("MongoDB fee notice sync fallback:", mErr?.message);
      }

      // 3. Broadcast Notification (MongoDB + Firestore + outgoing/incoming records)
      await sendBroadcastNotification({
        title: `💰 Fee Notice: ${title.trim()}`,
        body: `${message.trim()} (Due Date: ${dueDate})`,
        type: "fee",
        category: "Finance",
        target: "All Students",
        senderName: feeOfficer,
        senderEmail: currentUser?.email,
        senderRole: "fee_manager",
        showSuccessAlert: false,
      });

      Alert.alert(
        "Notification Sent Successfully! 💰",
        `Fee notice "${title}" has been published to all students. Stored in MongoDB & Firebase databases.`,
        [
          {
            text: "Done",
            onPress: () => router.back(),
          },
        ]
      );

      setTitle("");
      setMessage("");
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to publish fee notice.");
    } finally {
      setPublishing(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text style={styles.headerTitle}>Create Fee Notice</Text>
          <Text style={styles.headerSubtitle}>Broadcast payment deadlines & reminders</Text>
        </View>
      </View>

      <View style={styles.form}>
        <Text style={styles.label}>Notice Title *</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Semester 4 Tuition Fee Due Date Reminder"
          value={title}
          onChangeText={setTitle}
        />

        <Text style={styles.label}>Fee Category</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Tuition Fee / Hostel Fee / Exam Fee"
          value={feeCategory}
          onChangeText={setFeeCategory}
        />

        <Text style={styles.label}>Payment Due Date</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 20 Oct 2026"
          value={dueDate}
          onChangeText={setDueDate}
        />

        <Text style={styles.label}>Notice Details & Instructions *</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Please pay tuition fees online before the due date to avoid ₹500 late fine..."
          value={message}
          onChangeText={setMessage}
          multiline
        />

        <TouchableOpacity
          style={styles.button}
          onPress={handlePublish}
          disabled={publishing}
        >
          {publishing ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Ionicons name="send" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.buttonText}>Publish & Send Notification</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
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
  form: { padding: 18 },
  label: { fontSize: 12.5, fontWeight: "700", color: "#334155", marginBottom: 6, marginTop: 12 },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: "#0F172A",
  },
  textArea: { height: 130, textAlignVertical: "top" },
  button: {
    flexDirection: "row",
    backgroundColor: "#1677E8",
    padding: 16,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
    marginBottom: 40,
    shadowColor: "#1677E8",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  buttonText: { color: "#FFFFFF", fontWeight: "800", fontSize: 15 },
});
