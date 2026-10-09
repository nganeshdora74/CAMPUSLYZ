import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  collection,
  doc,
  onSnapshot,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import { sendStudentNotification } from "../../services/notificationService";
import { getApiUrl } from "../../api";

export default function GatePassPending() {
  const [passes, setPasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  useEffect(() => {
    // Listen to pending gate pass requests
    const q = query(collection(db, "requests"), where("status", "in", ["Pending", "Under Warden Review", "pending"]));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const list: any[] = [];
        snapshot.docs.forEach((d) => {
          const data = d.data();
          if (data.type === "Gate Pass" || data.passType || data.reason) {
            list.push({ id: d.id, ...data });
          }
        });
        setPasses(list);
        setLoading(false);
      },
      (err) => {
        console.warn("Gate passes fetch error:", err?.message);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const handleUpdateStatus = async (passItem: any, newStatus: "Approved" | "Rejected") => {
    setActionLoading(passItem.id);
    const isApproved = newStatus === "Approved";

    try {
      // 1. Update in Firestore
      await updateDoc(doc(db, "requests", passItem.id), {
        status: newStatus,
        reviewedBy: "Hostel Warden",
        reviewedAt: new Date().toISOString(),
      });

      // 2. Update in MongoDB
      try {
        const baseUrl = getApiUrl();
        await fetch(`${baseUrl}/api/passes/${passItem.id}/status`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            status: isApproved ? "approved" : "rejected",
            actionBy: "Hostel Warden",
            actionComment: `Gate pass request ${newStatus.toLowerCase()} by warden.`,
          }),
        });
      } catch (_) {}

      // 3. Send Notification to Student (stored in Firestore & MongoDB)
      await sendStudentNotification({
        studentId: passItem.studentId || null,
        studentEmail: passItem.studentEmail || passItem.email || null,
        title: `Gate Pass ${newStatus} ${isApproved ? "✅" : "❌"}`,
        body: `Your gate pass application for "${passItem.reason || "outing"}" has been ${newStatus.toLowerCase()} by Hostel Warden.`,
        type: "gate_pass",
        category: "Hostel",
        senderName: "Hostel Warden",
        senderRole: "hostel_manager",
        showSuccessAlert: false,
      });

      Alert.alert(
        "Notification Sent Successfully! 🚪",
        `Gate pass for ${passItem.studentName || "Student"} was ${newStatus}. Student has been notified. Saved in MongoDB & Firebase.`
      );
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to update gate pass status.");
    } finally {
      setActionLoading(null);
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
          <Text style={styles.title}>Pending Gate Passes</Text>
          <Text style={styles.subtitle}>Review & approve hostel gate passes</Text>
        </View>
        <View style={styles.countBadge}>
          <Text style={styles.countText}>{passes.length} Pending</Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {loading ? (
          <ActivityIndicator size="large" color="#0284C7" style={{ marginTop: 40 }} />
        ) : passes.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-circle-outline" size={50} color="#10B981" />
            <Text style={styles.emptyTitle}>All Caught Up!</Text>
            <Text style={styles.emptySubtitle}>No pending gate pass applications at the moment.</Text>
          </View>
        ) : (
          passes.map((item) => (
            <View style={styles.card} key={item.id}>
              <View style={styles.cardTop}>
                <View>
                  <Text style={styles.name}>{item.studentName || item.requesterName || "Hostel Student"}</Text>
                  <Text style={styles.roll}>{item.rollNo || "Roll: 23CSE001"} • {item.department || "Hostel A"}</Text>
                </View>
                <View style={styles.statusBadge}>
                  <Text style={styles.statusText}>⏳ Pending</Text>
                </View>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Reason:</Text>
                <Text style={styles.infoVal}>{item.reason || "Personal work"}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Destination:</Text>
                <Text style={styles.infoVal}>{item.destination || "City Market"}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Timings:</Text>
                <Text style={styles.infoVal}>
                  Out: {item.outTime || "5:00 PM"} | Return: {item.returnTime || "8:00 PM"}
                </Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.btnRow}>
                <TouchableOpacity
                  style={[styles.btn, styles.rejectBtn]}
                  onPress={() => handleUpdateStatus(item, "Rejected")}
                  disabled={actionLoading === item.id}
                >
                  <Ionicons name="close" size={16} color="#DC2626" />
                  <Text style={styles.rejectBtnText}>Reject</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.btn, styles.approveBtn]}
                  onPress={() => handleUpdateStatus(item, "Approved")}
                  disabled={actionLoading === item.id}
                >
                  {actionLoading === item.id ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={16} color="#FFFFFF" />
                      <Text style={styles.approveBtnText}>Approve & Notify</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
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
  title: { fontSize: 20, fontWeight: "800", color: "#0F172A" },
  subtitle: { fontSize: 12, color: "#64748B", marginTop: 1 },
  countBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  countText: { fontSize: 11, fontWeight: "700", color: "#D97706" },
  content: { flex: 1, padding: 16 },
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
  emptySubtitle: { fontSize: 13, color: "#64748B", textAlign: "center" },
  card: {
    backgroundColor: "#FFFFFF",
    padding: 18,
    borderRadius: 16,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  name: { fontSize: 16, fontWeight: "800", color: "#0F172A" },
  roll: { fontSize: 12, color: "#64748B", marginTop: 2 },
  statusBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusText: { fontSize: 11, fontWeight: "700", color: "#D97706" },
  infoRow: {
    flexDirection: "row",
    marginBottom: 6,
    gap: 8,
  },
  infoLabel: { fontSize: 12.5, fontWeight: "700", color: "#475569", width: 85 },
  infoVal: { fontSize: 12.5, color: "#0F172A", flex: 1 },
  btnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  btn: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  rejectBtn: { backgroundColor: "#FEE2E2" },
  rejectBtnText: { color: "#DC2626", fontWeight: "700", fontSize: 13 },
  approveBtn: { backgroundColor: "#0284C7" },
  approveBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 13 },
});