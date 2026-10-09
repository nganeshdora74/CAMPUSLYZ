import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import MessLayout from "../../components/mess/MessLayout";
import messDataService, {
  MessFeedbackItem,
} from "../../services/messDataService";
import { notifyAdmin, notifyStudent } from "../../services/notificationService";

export default function MessFeedbackScreen() {
  const { width } = useWindowDimensions();
  const [feedbackList, setFeedbackList] = useState<any[]>(
    messDataService.getFeedback()
  );
  const [statusFilter, setStatusFilter] = useState<"All" | "Pending" | "In Progress" | "Resolved">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Real-time Firestore sync
  useEffect(() => {
    try {
      const q = query(collection(db, "mess_feedback"), orderBy("createdAt", "desc"));
      const unsub = onSnapshot(
        q,
        (snap) => {
          if (!snap.empty) {
            const list = snap.docs.map((d) => {
              const data = d.data();
              return {
                id: d.id,
                studentName: data.userName || data.studentName || "Diner Student",
                date: data.date || "Today",
                messHall: data.messHall || "Central Mess Hall A",
                category: data.meal || data.category || "Food Quality",
                description: data.comment || data.description || "Review submitted",
                rating: data.rating || 5,
                status: data.status === "Action Taken" ? "Resolved" : (data.status || "Pending"),
                assignedTo: data.assignedTo,
                userId: data.userId,
                userEmail: data.userEmail,
              };
            });
            setFeedbackList(list);
          }
        },
        (err) => console.warn("Mess feedback listener warning:", err)
      );
      return unsub;
    } catch (e) {}
  }, []);

  // New Feedback Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [category, setCategory] = useState("Food Quality");
  const [rating, setRating] = useState(4);
  const [description, setDescription] = useState("");

  const refreshList = () => {
    setFeedbackList(messDataService.getFeedback());
  };

  const filtered = feedbackList.filter((fb) => {
    const matchesStatus = statusFilter === "All" || fb.status === statusFilter;
    const matchesSearch =
      (fb.studentName || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (fb.category || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      (fb.description || "").toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const handleUpdateStatus = async (item: any, newStatus: "In Progress" | "Resolved") => {
    // 1. Update in-memory service
    messDataService.updateFeedbackStatus(item.id, newStatus);

    // 2. Update Firestore document
    try {
      await updateDoc(doc(db, "mess_feedback", item.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (_) {}

    // 3. Notify student directly
    const recipient = item.userEmail || item.userId || item.studentName;
    if (recipient) {
      try {
        await notifyStudent(
          recipient,
          `🍽️ Mess Feedback Marked ${newStatus}`,
          `Your feedback regarding "${item.category}" has been updated to "${newStatus}" by the Mess Manager.`,
          "mess",
          { feedbackId: item.id, status: newStatus }
        );
      } catch (_) {}
    }

    setActionNotice(`Feedback from ${item.studentName} updated to ${newStatus}!`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleAddFeedback = async () => {
    if (!description.trim()) {
      Alert.alert("Required", "Please provide feedback description");
      return;
    }

    const cleanName = studentName.trim() || "Diner Student";
    const dateStr = new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });

    messDataService.addFeedback({
      studentName: cleanName,
      date: dateStr,
      messHall: "Central Mess Hall A",
      category: category,
      description: description.trim(),
      rating: rating,
      status: "Pending",
    });

    // Dual-write to Firestore
    try {
      const docRef = await addDoc(collection(db, "mess_feedback"), {
        userName: cleanName,
        studentName: cleanName,
        meal: category,
        category,
        comment: description.trim(),
        description: description.trim(),
        rating,
        status: "Pending",
        date: dateStr,
        createdAt: serverTimestamp(),
      });

      // Notify Admin
      await notifyAdmin(
        `🍽️ New Mess Feedback: ${category}`,
        `Feedback from ${cleanName}: "${description.trim()}"`,
        "mess",
        { feedbackId: docRef.id }
      );
    } catch (_) {}

    setDescription("");
    setStudentName("");
    setModalVisible(false);
    refreshList();
    setActionNotice("Student feedback recorded successfully!");
    setTimeout(() => setActionNotice(null), 3000);
  };

  const pendingCount = feedbackList.filter((f) => f.status === "Pending").length;
  const inProgressCount = feedbackList.filter((f) => f.status === "In Progress").length;
  const resolvedCount = feedbackList.filter((f) => f.status === "Resolved").length;

  return (
    <MessLayout
      activeNav="feedback"
      pageTitle="Feedback & Quality Desk"
      pageSubtitle={`${feedbackList.length} reviews received • ${pendingCount} pending kitchen action`}
      actionNotice={actionNotice}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search feedback by student, category, text..."
      rightAction={
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.addBtnText}>+ Log Feedback</Text>
        </TouchableOpacity>
      }
    >
      {/* 3 Metric Cards */}
      <View style={styles.statGrid}>
        <View style={[styles.statCard, { borderLeftColor: "#EF4444" }]}>
          <Text style={styles.statLabel}>Pending Issues</Text>
          <Text style={[styles.statNum, { color: "#DC2626" }]}>{pendingCount}</Text>
          <Text style={styles.statSub}>Awaiting kitchen review</Text>
        </View>

        <View style={[styles.statCard, { borderLeftColor: "#F59E0B" }]}>
          <Text style={styles.statLabel}>Under Investigation</Text>
          <Text style={[styles.statNum, { color: "#D97706" }]}>{inProgressCount}</Text>
          <Text style={styles.statSub}>Assigned to head chef</Text>
        </View>

        <View style={[styles.statCard, { borderLeftColor: "#10B981" }]}>
          <Text style={styles.statLabel}>Resolved Feedback</Text>
          <Text style={[styles.statNum, { color: "#059669" }]}>{resolvedCount}</Text>
          <Text style={styles.statSub}>Addressed & quality confirmed</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabRow}>
        {(["All", "Pending", "In Progress", "Resolved"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabChip, statusFilter === tab && styles.tabChipActive]}
            onPress={() => setStatusFilter(tab)}
          >
            <Text
              style={[
                styles.tabChipText,
                statusFilter === tab && styles.tabChipTextActive,
              ]}
            >
              {tab === "All"
                ? `All Feedback (${feedbackList.length})`
                : tab === "Pending"
                ? `Pending (${pendingCount})`
                : tab === "In Progress"
                ? `In Progress (${inProgressCount})`
                : `Resolved (${resolvedCount})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Feedback Cards */}
      <View style={styles.grid}>
        {filtered.map((item) => {
          const isPending = item.status === "Pending";
          const isInProgress = item.status === "In Progress";
          const isResolved = item.status === "Resolved";
          return (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.studentInfo}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.studentName.charAt(0)}</Text>
                  </View>
                  <View>
                    <Text style={styles.studentNameText}>{item.studentName}</Text>
                    <Text style={styles.subInfo}>{item.messHall} • {item.date}</Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.statusTag,
                    isPending
                      ? styles.tagPending
                      : isInProgress
                      ? styles.tagProgress
                      : styles.tagResolved,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusTagText,
                      isPending
                        ? styles.textPending
                        : isInProgress
                        ? styles.textProgress
                        : styles.textResolved,
                    ]}
                  >
                    {item.status}
                  </Text>
                </View>
              </View>

              <View style={styles.categoryRow}>
                <View style={styles.categoryBadge}>
                  <Text style={styles.categoryBadgeText}>{item.category}</Text>
                </View>
                {item.rating && (
                  <View style={styles.starRow}>
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Ionicons
                        key={star}
                        name={star <= (item.rating || 4) ? "star" : "star-outline"}
                        size={13}
                        color="#F59E0B"
                      />
                    ))}
                  </View>
                )}
              </View>

              <Text style={styles.descText}>{item.description}</Text>

              <View style={styles.actionRow}>
                {isPending && (
                  <TouchableOpacity
                    style={styles.progressBtn}
                    onPress={() => handleUpdateStatus(item, "In Progress")}
                  >
                    <Ionicons name="time-outline" size={14} color="#D97706" />
                    <Text style={styles.progressBtnText}>Mark In Progress</Text>
                  </TouchableOpacity>
                )}

                {(isPending || isInProgress) && (
                  <TouchableOpacity
                    style={styles.resolveBtn}
                    onPress={() => handleUpdateStatus(item, "Resolved")}
                  >
                    <Ionicons name="checkmark-circle-outline" size={14} color="#059669" />
                    <Text style={styles.resolveBtnText}>Mark Resolved</Text>
                  </TouchableOpacity>
                )}

                {isResolved && (
                  <View style={styles.closedRow}>
                    <Ionicons name="checkmark-done" size={16} color="#059669" />
                    <Text style={styles.closedText}>Feedback Addressed</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Log Feedback Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Student Feedback / Grievance</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Student Name</Text>
            <TextInput
              value={studentName}
              onChangeText={setStudentName}
              placeholder="e.g. Rahul Sharma"
              style={styles.input}
            />

            <Text style={styles.label}>Category</Text>
            <View style={styles.catGrid}>
              {(["Food Quality", "Hygiene", "Meal Timings", "Portion Size", "Taste"] as const).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.catChip, category === cat && styles.catChipActive]}
                  onPress={() => setCategory(cat)}
                >
                  <Text style={[styles.catChipText, category === cat && styles.catChipTextActive]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Rating (1 to 5 Stars)</Text>
            <View style={styles.ratingPickerRow}>
              {[1, 2, 3, 4, 5].map((s) => (
                <TouchableOpacity
                  key={s}
                  style={styles.starTouch}
                  onPress={() => setRating(s)}
                >
                  <Ionicons
                    name={s <= rating ? "star" : "star-outline"}
                    size={26}
                    color="#F59E0B"
                  />
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.label}>Feedback Description *</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Enter student review or complaint in detail..."
              style={[styles.input, { height: 75 }]}
              multiline
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleAddFeedback}
              >
                <Text style={styles.saveBtnText}>Save Feedback</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </MessLayout>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    backgroundColor: "#EA580C",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  addBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  statGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  statCard: {
    flex: 1,
    minWidth: 160,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderLeftWidth: 4,
  },
  statLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  statNum: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginVertical: 4,
  },
  statSub: {
    fontSize: 11,
    color: "#94A3B8",
  },
  tabRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  tabChip: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  tabChipActive: {
    backgroundColor: "#EA580C",
    borderColor: "#EA580C",
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  tabChipTextActive: {
    color: "#FFFFFF",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  card: {
    width: "31.5%",
    minWidth: 260,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  studentInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EA580C",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  studentNameText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  subInfo: {
    fontSize: 10,
    color: "#64748B",
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagPending: {
    backgroundColor: "#FEF2F2",
  },
  tagProgress: {
    backgroundColor: "#FFFBEB",
  },
  tagResolved: {
    backgroundColor: "#ECFDF5",
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: "700",
  },
  textPending: {
    color: "#DC2626",
  },
  textProgress: {
    color: "#D97706",
  },
  textResolved: {
    color: "#059669",
  },
  categoryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryBadge: {
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  categoryBadgeText: {
    color: "#EA580C",
    fontSize: 11,
    fontWeight: "700",
  },
  starRow: {
    flexDirection: "row",
    gap: 2,
  },
  descText: {
    fontSize: 13,
    color: "#334155",
    lineHeight: 18,
    marginBottom: 12,
  },
  actionRow: {
    flexDirection: "row",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 10,
  },
  progressBtn: {
    flex: 1,
    backgroundColor: "#FFFBEB",
    borderWidth: 1,
    borderColor: "#FDE68A",
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  progressBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D97706",
  },
  resolveBtn: {
    flex: 1,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  resolveBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
  },
  closedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
    width: "100%",
  },
  closedText: {
    color: "#059669",
    fontSize: 12,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 5,
    marginTop: 8,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#0F172A",
  },
  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  catChip: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  catChipActive: {
    borderColor: "#EA580C",
    backgroundColor: "#FFF7ED",
  },
  catChipText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  catChipTextActive: {
    color: "#EA580C",
    fontWeight: "700",
  },
  ratingPickerRow: {
    flexDirection: "row",
    gap: 6,
    paddingVertical: 4,
  },
  starTouch: {
    padding: 4,
  },
  modalBtnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 18,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  cancelBtnText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  saveBtn: {
    backgroundColor: "#EA580C",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveBtnText: {
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "700",
  },
});