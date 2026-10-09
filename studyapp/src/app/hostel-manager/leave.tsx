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
import hostelDataService, { HostelLeaveItem } from "../../services/hostelDataService";
import { notifyStudent } from "../../services/notificationService";

export interface ExtendedLeaveItem extends HostelLeaveItem {
  studentEmail?: string;
  sourceDocId?: string;
}

export default function HostelLeaveScreen() {
  const { width } = useWindowDimensions();
  const [leaves, setLeaves] = useState<ExtendedLeaveItem[]>(
    hostelDataService.getLeaves()
  );
  const [tabFilter, setTabFilter] = useState<"All" | "Pending" | "Approved" | "Rejected">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Live Firestore synchronization for real student leaves
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "requests"), (snap) => {
      const fsLeaves: ExtendedLeaveItem[] = [];
      snap.docs.forEach((d) => {
        const dt = d.data();
        if (dt.category === "Leave" || dt.passType === "leave") {
          fsLeaves.push({
            id: d.id,
            sourceDocId: d.id,
            studentName: dt.requesterName || "Student",
            studentEmail: dt.requesterEmail,
            leaveType: (dt.subCategory || "Personal") as any,
            fromDate: dt.fromDate || dt.date || "Today",
            toDate: dt.toDate || "Upcoming",
            status: (dt.status || "Pending") as any,
            reason: dt.description || dt.title || "",
          });
        }
      });

      const inMem = hostelDataService.getLeaves();
      const map = new Map<string, ExtendedLeaveItem>();
      inMem.forEach((l) => map.set(l.id, l));
      fsLeaves.forEach((l) => map.set(l.id, l));
      setLeaves(Array.from(map.values()));
    });

    return () => unsub();
  }, []);

  // New Leave Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [leaveType, setLeaveType] = useState<"Medical" | "Personal" | "Family" | "Academic">("Personal");
  const [fromDate, setFromDate] = useState("20 Oct 2025");
  const [toDate, setToDate] = useState("24 Oct 2025");
  const [reason, setReason] = useState("");

  const refreshLeaves = () => {
    setLeaves(hostelDataService.getLeaves());
  };

  const filtered = leaves.filter((l) => {
    const matchesTab = tabFilter === "All" || l.status === tabFilter;
    const matchesSearch =
      l.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.leaveType.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (l.reason && l.reason.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesTab && matchesSearch;
  });

  const handleUpdateStatus = async (id: string, name: string, newStatus: "Approved" | "Rejected") => {
    const item = leaves.find((l) => l.id === id);
    hostelDataService.updateLeaveStatus(id, newStatus);

    try {
      await updateDoc(doc(db, "requests", id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (_) {}

    // Send notification to the student
    const studentEmail = item?.studentEmail || "";
    if (studentEmail || name) {
      await notifyStudent(
        studentEmail,
        `Leave Request ${newStatus}! 📝`,
        `Your leave application (${item?.fromDate || ""} to ${item?.toDate || ""}) has been ${newStatus.toLowerCase()} by the Hostel Manager.`,
        "leave",
        { leaveId: id, status: newStatus, studentName: name }
      );
    }

    refreshLeaves();
    setActionNotice(`Leave marked as ${newStatus} for ${name} & student notified.`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleApplyLeave = () => {
    if (!studentName.trim()) {
      Alert.alert("Required", "Please provide student name");
      return;
    }

    hostelDataService.addLeave({
      studentName: studentName.trim(),
      leaveType: leaveType,
      fromDate: fromDate.trim(),
      toDate: toDate.trim(),
      reason: reason.trim() || `${leaveType} leave application`,
      status: "Approved",
    });

    setStudentName("");
    setReason("");
    setModalVisible(false);
    refreshLeaves();
    setActionNotice(`Leave granted successfully for ${studentName}`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const pendingCount = leaves.filter((l) => l.status === "Pending").length;
  const approvedCount = leaves.filter((l) => l.status === "Approved").length;

  return (
    <HostelLayout
      activeNav="leave"
      pageTitle="Hostel Leave Management"
      pageSubtitle={`${leaves.length} Total leaves • ${pendingCount} Awaiting sanction`}
      actionNotice={actionNotice}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search student name, leave type, or reason..."
      rightAction={
        <TouchableOpacity
          style={styles.applyBtn}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.applyBtnText}>+ Apply Leave</Text>
        </TouchableOpacity>
      }
    >
      {/* Stat Bar */}
      <View style={styles.statsBar}>
        <View style={styles.statBox}>
          <Text style={styles.statLabel}>Total Leave Requests</Text>
          <Text style={styles.statValue}>{leaves.length}</Text>
        </View>
        <View style={[styles.statBox, { borderLeftColor: "#F59E0B" }]}>
          <Text style={styles.statLabel}>Pending Review</Text>
          <Text style={[styles.statValue, { color: "#D97706" }]}>{pendingCount}</Text>
        </View>
        <View style={[styles.statBox, { borderLeftColor: "#10B981" }]}>
          <Text style={styles.statLabel}>Approved Sanctions</Text>
          <Text style={[styles.statValue, { color: "#059669" }]}>{approvedCount}</Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={styles.tabRow}>
        {(["All", "Pending", "Approved", "Rejected"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tabChip, tabFilter === tab && styles.tabChipActive]}
            onPress={() => setTabFilter(tab)}
          >
            <Text
              style={[
                styles.tabChipText,
                tabFilter === tab && styles.tabChipTextActive,
              ]}
            >
              {tab === "All"
                ? `All (${leaves.length})`
                : tab === "Pending"
                ? `Pending (${pendingCount})`
                : tab === "Approved"
                ? `Approved (${approvedCount})`
                : "Rejected"}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Cards Grid */}
      <View style={styles.grid}>
        {filtered.map((leave) => {
          const isPending = leave.status === "Pending";
          const isApproved = leave.status === "Approved";
          return (
            <View key={leave.id} style={styles.card}>
              <View style={styles.cardTop}>
                <View style={styles.studentInfo}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{leave.studentName.charAt(0)}</Text>
                  </View>
                  <View>
                    <Text style={styles.name}>{leave.studentName}</Text>
                    <View style={styles.typeBadge}>
                      <Text style={styles.typeBadgeText}>{leave.leaveType}</Text>
                    </View>
                  </View>
                </View>

                <View
                  style={[
                    styles.statusTag,
                    isApproved
                      ? styles.tagApproved
                      : isPending
                      ? styles.tagPending
                      : styles.tagRejected,
                  ]}
                >
                  <Text
                    style={[
                      styles.statusTagText,
                      isApproved
                        ? styles.textApproved
                        : isPending
                        ? styles.textPending
                        : styles.textRejected,
                    ]}
                  >
                    {leave.status}
                  </Text>
                </View>
              </View>

              <View style={styles.dateDurationBox}>
                <Ionicons name="calendar-outline" size={15} color="#2563EB" />
                <Text style={styles.dateDurationText}>
                  {leave.fromDate}  ➔  {leave.toDate}
                </Text>
              </View>

              <Text style={styles.reasonText}>
                <Text style={{ fontWeight: "700" }}>Reason: </Text>
                {leave.reason || "Personal grounds"}
              </Text>

              {isPending && (
                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.btnApprove}
                    onPress={() => handleUpdateStatus(leave.id, leave.studentName, "Approved")}
                  >
                    <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                    <Text style={styles.btnTextWhite}>Approve</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.btnReject}
                    onPress={() => handleUpdateStatus(leave.id, leave.studentName, "Rejected")}
                  >
                    <Ionicons name="close" size={14} color="#FFFFFF" />
                    <Text style={styles.btnTextWhite}>Reject</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          );
        })}
      </View>

      {/* Apply Leave Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Apply Student Leave</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Student Name *</Text>
            <TextInput
              value={studentName}
              onChangeText={setStudentName}
              placeholder="e.g. Akash Yadav"
              style={styles.input}
            />

            <Text style={styles.label}>Leave Type</Text>
            <View style={styles.typeSelector}>
              {(["Medical", "Personal", "Family", "Academic"] as const).map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.typeBtn,
                    leaveType === t && styles.typeBtnActive,
                  ]}
                  onPress={() => setLeaveType(t)}
                >
                  <Text
                    style={[
                      styles.typeBtnText,
                      leaveType === t && styles.typeBtnTextActive,
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>From Date</Text>
                <TextInput
                  value={fromDate}
                  onChangeText={setFromDate}
                  placeholder="20 Oct 2025"
                  style={styles.input}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>To Date</Text>
                <TextInput
                  value={toDate}
                  onChangeText={setToDate}
                  placeholder="24 Oct 2025"
                  style={styles.input}
                />
              </View>
            </View>

            <Text style={styles.label}>Reason Details</Text>
            <TextInput
              value={reason}
              onChangeText={setReason}
              placeholder="Attending family function / Doctor checkup..."
              style={[styles.input, { height: 60 }]}
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
                style={styles.confirmBtn}
                onPress={handleApplyLeave}
              >
                <Text style={styles.confirmBtnText}>Save & Grant Leave</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </HostelLayout>
  );
}

const styles = StyleSheet.create({
  applyBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  applyBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  statsBar: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  statBox: {
    flex: 1,
    minWidth: 160,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderLeftWidth: 4,
    borderLeftColor: "#2563EB",
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
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
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
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  name: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  typeBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: "flex-start",
    marginTop: 2,
  },
  typeBadgeText: {
    fontSize: 10,
    color: "#475569",
    fontWeight: "600",
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  tagApproved: {
    backgroundColor: "#ECFDF5",
  },
  tagPending: {
    backgroundColor: "#FEF3C7",
  },
  tagRejected: {
    backgroundColor: "#FEF2F2",
  },
  statusTagText: {
    fontSize: 11,
    fontWeight: "700",
  },
  textApproved: {
    color: "#059669",
  },
  textPending: {
    color: "#D97706",
  },
  textRejected: {
    color: "#DC2626",
  },
  dateDurationBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F8FAFC",
    padding: 8,
    borderRadius: 6,
    marginBottom: 10,
  },
  dateDurationText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1E293B",
  },
  reasonText: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 12,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 10,
  },
  btnApprove: {
    flex: 1,
    backgroundColor: "#10B981",
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  btnReject: {
    flex: 1,
    backgroundColor: "#EF4444",
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  btnTextWhite: {
    color: "#FFFFFF",
    fontSize: 11,
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
  typeSelector: {
    flexDirection: "row",
    gap: 6,
  },
  typeBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingVertical: 6,
    borderRadius: 6,
    alignItems: "center",
  },
  typeBtnActive: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  typeBtnText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  typeBtnTextActive: {
    color: "#2563EB",
    fontWeight: "700",
  },
  twoCol: {
    flexDirection: "row",
    gap: 10,
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
  confirmBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  confirmBtnText: {
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "700",
  },
});