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
import hostelDataService, { GatePassItem } from "../../services/hostelDataService";
import { notifyStudent } from "../../services/notificationService";

export interface ExtendedGatePassItem extends GatePassItem {
  studentEmail?: string;
  sourceDocId?: string;
}

export default function GatePassScreen() {
  const { width } = useWindowDimensions();
  const [passes, setPasses] = useState<ExtendedGatePassItem[]>(
    hostelDataService.getGatePasses()
  );
  const [filterTab, setFilterTab] = useState<"All" | "Pending" | "Approved" | "Rejected">("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Live Firestore synchronization for gate passes
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "requests"), (snap) => {
      const fsPasses: ExtendedGatePassItem[] = [];
      snap.docs.forEach((d) => {
        const dt = d.data();
        if (dt.category === "Gate Pass" || dt.passType === "gate") {
          fsPasses.push({
            id: d.id,
            sourceDocId: d.id,
            studentName: dt.requesterName || "Resident",
            studentEmail: dt.requesterEmail,
            purpose: dt.subCategory || dt.description || "Outing",
            outTime: dt.outTime || "05:00 PM",
            returnTime: dt.returnTime || "08:00 PM",
            requestedAt: dt.date || "Today",
            status: (dt.status || "Pending") as any,
          });
        }
      });

      const inMem = hostelDataService.getGatePasses();
      const map = new Map<string, ExtendedGatePassItem>();
      inMem.forEach((p) => map.set(p.id, p));
      fsPasses.forEach((p) => map.set(p.id, p));
      setPasses(Array.from(map.values()));
    });

    return () => unsub();
  }, []);

  // New Gate Pass Modal
  const [modalVisible, setModalVisible] = useState(false);
  const [studentName, setStudentName] = useState("");
  const [purpose, setPurpose] = useState("Medical");
  const [outTime, setOutTime] = useState("05:00 PM");
  const [returnTime, setReturnTime] = useState("08:00 PM");

  const refreshPasses = () => {
    setPasses(hostelDataService.getGatePasses());
  };

  const filtered = passes.filter((p) => {
    const matchesFilter = filterTab === "All" || p.status === filterTab;
    const matchesSearch =
      p.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.purpose.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleApprove = async (id: string, name: string) => {
    const item = passes.find((p) => p.id === id);
    hostelDataService.updateGatePassStatus(id, "Approved");

    try {
      await updateDoc(doc(db, "requests", id), {
        status: "Approved",
        updatedAt: serverTimestamp(),
      });
    } catch (_) {}

    // Send notification to the student
    const studentEmail = item?.studentEmail || "";
    if (studentEmail || name) {
      await notifyStudent(
        studentEmail,
        "Gate Pass Approved! 🚪",
        `Your gate pass request (${item?.outTime || "Upcoming"}) has been approved by the Hostel Manager.`,
        "gate_pass",
        { passId: id, status: "Approved", studentName: name }
      );
    }

    refreshPasses();
    setActionNotice(`Gate pass approved for ${name} & student notified.`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleReject = async (id: string, name: string) => {
    const item = passes.find((p) => p.id === id);
    hostelDataService.updateGatePassStatus(id, "Rejected");

    try {
      await updateDoc(doc(db, "requests", id), {
        status: "Rejected",
        updatedAt: serverTimestamp(),
      });
    } catch (_) {}

    // Send notification to the student
    const studentEmail = item?.studentEmail || "";
    if (studentEmail || name) {
      await notifyStudent(
        studentEmail,
        "Gate Pass Rejected",
        `Your gate pass request was rejected by the Hostel Manager.`,
        "gate_pass",
        { passId: id, status: "Rejected", studentName: name }
      );
    }

    refreshPasses();
    setActionNotice(`Gate pass rejected for ${name} & student notified.`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const handleCreatePass = () => {
    if (!studentName.trim()) {
      Alert.alert("Required", "Please provide the student name");
      return;
    }

    hostelDataService.addGatePass({
      studentName: studentName.trim(),
      purpose: purpose.trim(),
      outTime: outTime.trim(),
      returnTime: returnTime.trim(),
      requestedAt: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
      }) + " " + outTime,
      status: "Approved",
    });

    setStudentName("");
    setModalVisible(false);
    refreshPasses();
    setActionNotice(`Gate pass issued successfully for ${studentName}`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  const pendingCount = passes.filter((p) => p.status === "Pending").length;
  const approvedCount = passes.filter((p) => p.status === "Approved").length;
  const rejectedCount = passes.filter((p) => p.status === "Rejected").length;

  return (
    <HostelLayout
      activeNav="gate-pass"
      pageTitle="Gate Pass Management"
      pageSubtitle={`${passes.length} Total passes • ${pendingCount} Awaiting approval`}
      actionNotice={actionNotice}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search student name or purpose..."
      rightAction={
        <TouchableOpacity
          style={styles.newPassBtn}
          onPress={() => setModalVisible(true)}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.newPassBtnText}>+ Issue Gate Pass</Text>
        </TouchableOpacity>
      }
    >
      {/* 4 Stat Overview Cards */}
      <View style={styles.statCardsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Requests</Text>
          <Text style={styles.statValue}>{passes.length}</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: "#F59E0B" }]}>
          <Text style={styles.statLabel}>Pending Approvals</Text>
          <Text style={[styles.statValue, { color: "#D97706" }]}>{pendingCount}</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: "#10B981" }]}>
          <Text style={styles.statLabel}>Approved Passes</Text>
          <Text style={[styles.statValue, { color: "#059669" }]}>{approvedCount}</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: "#EF4444" }]}>
          <Text style={styles.statLabel}>Rejected Passes</Text>
          <Text style={[styles.statValue, { color: "#DC2626" }]}>{rejectedCount}</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterTabsRow}>
        {(["All", "Pending", "Approved", "Rejected"] as const).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.filterTab, filterTab === tab && styles.filterTabActive]}
            onPress={() => setFilterTab(tab)}
          >
            <Text
              style={[
                styles.filterTabText,
                filterTab === tab && styles.filterTabTextActive,
              ]}
            >
              {tab === "All"
                ? `All Passes (${passes.length})`
                : tab === "Pending"
                ? `Pending (${pendingCount})`
                : tab === "Approved"
                ? `Approved (${approvedCount})`
                : `Rejected (${rejectedCount})`}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Passes Table / List */}
      <View style={styles.tableCard}>
        <View style={styles.tableHead}>
          <Text style={[styles.th, { width: 160 }]}>Student Name</Text>
          <Text style={[styles.th, { width: 130 }]}>Purpose</Text>
          <Text style={[styles.th, { width: 100 }]}>Out Time</Text>
          <Text style={[styles.th, { width: 100 }]}>Return Time</Text>
          <Text style={[styles.th, { width: 110 }]}>Status</Text>
          <Text style={[styles.th, { flex: 1, textAlign: "right" }]}>Decision</Text>
        </View>

        {filtered.map((item) => {
          const isPending = item.status === "Pending";
          const isApproved = item.status === "Approved";
          return (
            <View key={item.id} style={styles.tableRow}>
              <View style={[styles.studentCell, { width: 160 }]}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.studentName.charAt(0)}</Text>
                </View>
                <View>
                  <Text style={styles.studentNameText} numberOfLines={1}>{item.studentName}</Text>
                  <Text style={styles.requestedAtText}>{item.requestedAt}</Text>
                </View>
              </View>

              <Text style={[styles.td, { width: 130 }]}>{item.purpose}</Text>
              <Text style={[styles.tdBold, { width: 100 }]}>{item.outTime}</Text>
              <Text style={[styles.td, { width: 100 }]}>{item.returnTime || "08:00 PM"}</Text>

              <View style={{ width: 110 }}>
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
                    {item.status}
                  </Text>
                </View>
              </View>

              <View style={[styles.actionRow, { flex: 1 }]}>
                {isPending ? (
                  <>
                    <TouchableOpacity
                      style={styles.approveBtn}
                      onPress={() => handleApprove(item.id, item.studentName)}
                    >
                      <Ionicons name="checkmark" size={14} color="#FFFFFF" />
                      <Text style={styles.btnTextWhite}>Approve</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.rejectBtn}
                      onPress={() => handleReject(item.id, item.studentName)}
                    >
                      <Ionicons name="close" size={14} color="#FFFFFF" />
                      <Text style={styles.btnTextWhite}>Reject</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <Text style={styles.processedText}>Processed</Text>
                )}
              </View>
            </View>
          );
        })}
      </View>

      {/* New Gate Pass Modal */}
      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Issue New Gate Pass</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Student Name *</Text>
            <TextInput
              value={studentName}
              onChangeText={setStudentName}
              placeholder="e.g. Rohan Sharma"
              style={styles.input}
            />

            <Text style={styles.label}>Purpose of Leaving</Text>
            <TextInput
              value={purpose}
              onChangeText={setPurpose}
              placeholder="Medical, Library, Home, Market..."
              style={styles.input}
            />

            <View style={styles.twoCol}>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Expected Out Time</Text>
                <TextInput
                  value={outTime}
                  onChangeText={setOutTime}
                  placeholder="05:00 PM"
                  style={styles.input}
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.label}>Expected Return Time</Text>
                <TextInput
                  value={returnTime}
                  onChangeText={setReturnTime}
                  placeholder="08:00 PM"
                  style={styles.input}
                />
              </View>
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmPassBtn}
                onPress={handleCreatePass}
              >
                <Text style={styles.confirmPassBtnText}>Issue Gate Pass</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </HostelLayout>
  );
}

const styles = StyleSheet.create({
  newPassBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  newPassBtnText: {
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
    minWidth: 150,
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
  filterTabsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  filterTab: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  filterTabActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  filterTabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  filterTabTextActive: {
    color: "#FFFFFF",
  },
  tableCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    overflow: "hidden",
  },
  tableHead: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  th: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  studentCell: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  studentNameText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  requestedAtText: {
    fontSize: 10,
    color: "#94A3B8",
  },
  td: {
    fontSize: 12,
    color: "#475569",
  },
  tdBold: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E293B",
  },
  statusTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
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
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 6,
  },
  approveBtn: {
    backgroundColor: "#10B981",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  rejectBtn: {
    backgroundColor: "#EF4444",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  btnTextWhite: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  processedText: {
    fontSize: 11,
    color: "#94A3B8",
    fontStyle: "italic",
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
    maxWidth: 420,
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
  confirmPassBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  confirmPassBtnText: {
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "700",
  },
});