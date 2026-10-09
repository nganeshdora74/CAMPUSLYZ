import React, { useState, useEffect } from "react";
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
  collection,
  doc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase/config";
import HostelLayout from "../../components/hostel/HostelLayout";
import hostelDataService, { HostelComplaintItem } from "../../services/hostelDataService";
import { notifyStudent } from "../../services/notificationService";

export interface ExtendedComplaintItem extends HostelComplaintItem {
  userEmail?: string;
}

export default function HostelComplaintsScreen() {
  const { width } = useWindowDimensions();
  const [complaints, setComplaints] = useState<ExtendedComplaintItem[]>(
    hostelDataService.getComplaints()
  );
  const [filterTab, setFilterTab] = useState<"All" | "New" | "In Progress" | "Resolved">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Live Firestore synchronization for real student complaints
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "complaints"), (snap) => {
      const fsComplaints: ExtendedComplaintItem[] = [];
      snap.docs.forEach((d) => {
        const dt = d.data();
        if (dt.type === "Hostel" || dt.category) {
          const dateStr = dt.createdAt?.toDate
            ? dt.createdAt.toDate().toLocaleDateString("en-GB", { day: "2-digit", month: "short" })
            : dt.date || "Today";
          const rawStatus = dt.status || "New";
          const status =
            rawStatus === "Submitted"
              ? "New"
              : rawStatus === "In Progress" || rawStatus === "Reviewing"
              ? "In Progress"
              : rawStatus === "Resolved"
              ? "Resolved"
              : "New";

          fsComplaints.push({
            id: d.id,
            category: dt.category || "Room Maintenance",
            description: dt.description || dt.message || "",
            date: dateStr,
            status: status as any,
            studentName: dt.studentName || "Resident Student",
            roomNo: dt.roomNo || "Room",
            userEmail: dt.userEmail,
          });
        }
      });

      // Merge with in-memory service complaints
      const inMem = hostelDataService.getComplaints();
      const map = new Map<string, ExtendedComplaintItem>();
      inMem.forEach((c) => map.set(c.id, c));
      fsComplaints.forEach((c) => map.set(c.id, c));
      setComplaints(Array.from(map.values()));
    });

    return () => unsub();
  }, []);

  // New Complaint Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [roomNo, setRoomNo] = useState("102");
  const [category, setCategory] = useState<"Room Maintenance" | "Food Quality" | "Cleanliness" | "Security" | "Wi-Fi">("Room Maintenance");
  const [description, setDescription] = useState("");

  const refreshComplaints = () => {
    setComplaints(hostelDataService.getComplaints());
  };

  const filtered = complaints.filter((c) => {
    const matchesTab = filterTab === "All" || c.status === filterTab;
    const matchesSearch =
      c.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.studentName && c.studentName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (c.roomNo && c.roomNo.includes(searchQuery));
    return matchesTab && matchesSearch;
  });

  const handleUpdateStatus = async (id: string, newStatus: "In Progress" | "Resolved") => {
    const item = complaints.find((c) => c.id === id);
    hostelDataService.updateComplaintStatus(id, newStatus);

    try {
      await updateDoc(doc(db, "complaints", id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (_) {}

    // Send notification directly to the student
    const studentEmail = item?.userEmail || "";
    if (studentEmail || item?.studentName) {
      await notifyStudent(
        studentEmail,
        `Hostel Complaint Marked as ${newStatus}`,
        `Your complaint for "${item?.category || "Hostel"}" (Room ${item?.roomNo || ""}) has been updated to "${newStatus}" by the Hostel Manager.`,
        "hostel",
        { complaintId: id, status: newStatus, studentName: item?.studentName }
      );
    }

    refreshComplaints();
    setActionNotice(`Complaint updated to "${newStatus}" & student notified!`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleCreateComplaint = () => {
    if (!description.trim()) {
      Alert.alert("Required", "Please provide complaint details");
      return;
    }

    hostelDataService.addComplaint({
      category: category,
      description: description.trim(),
      date: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      }),
      status: "New",
      studentName: studentName.trim() || "Resident Student",
      roomNo: roomNo.trim(),
    });

    setDescription("");
    setStudentName("");
    setModalVisible(false);
    refreshComplaints();
    setActionNotice("Complaint ticket logged successfully!");
    setTimeout(() => setActionNotice(null), 3000);
  };

  const newCount = complaints.filter((c) => c.status === "New").length;
  const inProgressCount = complaints.filter((c) => c.status === "In Progress").length;
  const resolvedCount = complaints.filter((c) => c.status === "Resolved").length;

  return (
    <HostelLayout
      activeNav="complaints"
      pageTitle="Complaints & Maintenance"
      pageSubtitle={`${complaints.length} Total tickets • ${newCount} New • ${inProgressCount} In Progress`}
      actionNotice={actionNotice}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search complaints by category, room, text..."
      rightAction={
        <TouchableOpacity
          style={styles.logBtn}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.logBtnText}>+ Log Complaint</Text>
        </TouchableOpacity>
      }
    >
      {/* 3 Stat Cards */}
      <View style={styles.statCardsRow}>
        <View style={[styles.statCard, { borderLeftColor: "#EF4444" }]}>
          <Text style={styles.statLabel}>New Complaints</Text>
          <Text style={[styles.statValue, { color: "#DC2626" }]}>{newCount}</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: "#F59E0B" }]}>
          <Text style={styles.statLabel}>In Progress</Text>
          <Text style={[styles.statValue, { color: "#D97706" }]}>{inProgressCount}</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: "#10B981" }]}>
          <Text style={styles.statLabel}>Resolved</Text>
          <Text style={[styles.statValue, { color: "#059669" }]}>{resolvedCount}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabsRow}>
        {(["All", "New", "In Progress", "Resolved"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabChip, filterTab === tab && styles.tabChipActive]}
            onPress={() => setFilterTab(tab)}
          >
            <Text
              style={[
                styles.tabChipText,
                filterTab === tab && styles.tabChipTextActive,
              ]}
            >
              {tab === "All"
                ? `All (${complaints.length})`
                : tab === "New"
                ? `New (${newCount})`
                : tab === "In Progress"
                ? `In Progress (${inProgressCount})`
                : `Resolved (${resolvedCount})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Complaints List */}
      <View style={styles.gridContainer}>
        {filtered.map((item) => {
          const isNew = item.status === "New";
          const isInProgress = item.status === "In Progress";
          const isResolved = item.status === "Resolved";
          return (
            <View key={item.id} style={styles.complaintCard}>
              <View style={styles.cardHeader}>
                <View style={styles.categoryBadge}>
                  <Ionicons name="construct-outline" size={14} color="#2563EB" />
                  <Text style={styles.categoryBadgeText}>{item.category}</Text>
                </View>

                <View
                  style={[
                    styles.statusTag,
                    isNew ? styles.tagNew : isInProgress ? styles.tagProgress : styles.tagResolved,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusTagText,
                      isNew ? styles.textNew : isInProgress ? styles.textProgress : styles.textResolved,
                    ]}
                  >
                    {item.status}
                  </Text>
                </View>
              </View>

              <Text style={styles.descText}>{item.description}</Text>

              <View style={styles.metaRow}>
                <Text style={styles.metaText}>
                  👤 {item.studentName || "Resident"} • 🛏️ Room {item.roomNo || "General"}
                </Text>
                <Text style={styles.metaDate}>📅 {item.date}</Text>
              </View>

              <View style={styles.actionsRow}>
                {isNew && (
                  <TouchableOpacity
                    style={styles.actionProgressBtn}
                    onPress={() => handleUpdateStatus(item.id, "In Progress")}
                  >
                    <Ionicons name="time-outline" size={14} color="#D97706" />
                    <Text style={styles.actionProgressBtnText}>Mark In Progress</Text>
                  </TouchableOpacity>
                )}

                {(isNew || isInProgress) && (
                  <TouchableOpacity
                    style={styles.actionResolveBtn}
                    onPress={() => handleUpdateStatus(item.id, "Resolved")}
                  >
                    <Ionicons name="checkmark-circle-outline" size={14} color="#059669" />
                    <Text style={styles.actionResolveBtnText}>Resolve</Text>
                  </TouchableOpacity>
                )}

                {isResolved && (
                  <View style={styles.resolvedConfirmed}>
                    <Ionicons name="checkmark-done" size={16} color="#059669" />
                    <Text style={styles.resolvedConfirmedText}>Ticket Closed</Text>
                  </View>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* Log Complaint Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Log Maintenance / Issue Ticket</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Category</Text>
            <View style={styles.categoryGrid}>
              {(["Room Maintenance", "Wi-Fi", "Cleanliness", "Security", "Food Quality"] as const).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catBtn,
                    category === cat && styles.catBtnActive,
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text
                    style={[
                      styles.catBtnText,
                      category === cat && styles.catBtnTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Room No</Text>
                <TextInput
                  value={roomNo}
                  onChangeText={setRoomNo}
                  placeholder="102"
                  style={styles.input}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Resident Name</Text>
                <TextInput
                  value={studentName}
                  onChangeText={setStudentName}
                  placeholder="Amit Kumar"
                  style={styles.input}
                />
              </View>
            </View>

            <Text style={styles.label}>Complaint Description *</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the issue in detail (e.g. Geyser leaking, Wi-Fi router down)..."
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
                style={styles.submitBtn}
                onPress={handleCreateComplaint}
              >
                <Text style={styles.submitBtnText}>Create Ticket</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </HostelLayout>
  );
}

const styles = StyleSheet.create({
  logBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  logBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  statCardsRow: {
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
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 4,
  },
  tabsRow: {
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
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  tabChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  tabChipTextActive: {
    color: "#FFFFFF",
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  complaintCard: {
    width: "31.5%",
    minWidth: 270,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  categoryBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryBadgeText: {
    color: "#2563EB",
    fontSize: 11,
    fontWeight: "700",
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagNew: {
    backgroundColor: "#FEF2F2",
  },
  tagProgress: {
    backgroundColor: "#FEF3C7",
  },
  tagResolved: {
    backgroundColor: "#ECFDF5",
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: "700",
  },
  textNew: {
    color: "#DC2626",
  },
  textProgress: {
    color: "#D97706",
  },
  textResolved: {
    color: "#059669",
  },
  descText: {
    fontSize: 13,
    color: "#1E293B",
    lineHeight: 18,
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    marginBottom: 12,
  },
  metaText: {
    fontSize: 11,
    color: "#64748B",
  },
  metaDate: {
    fontSize: 11,
    color: "#94A3B8",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
  },
  actionProgressBtn: {
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
  actionProgressBtnText: {
    color: "#D97706",
    fontSize: 11,
    fontWeight: "700",
  },
  actionResolveBtn: {
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
  actionResolveBtnText: {
    color: "#059669",
    fontSize: 11,
    fontWeight: "700",
  },
  resolvedConfirmed: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    justifyContent: "center",
    width: "100%",
  },
  resolvedConfirmedText: {
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
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 4,
  },
  catBtn: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  catBtnActive: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  catBtnText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  catBtnTextActive: {
    color: "#2563EB",
    fontWeight: "700",
  },
  twoCol: {
    flexDirection: "row",
    gap: 10,
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
  submitBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  submitBtnText: {
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "700",
  },
});