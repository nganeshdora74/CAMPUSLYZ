import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Modal,
  Alert,
  ScrollView,
  useWindowDimensions,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import unifiedStudentService, {
  UnifiedStudent,
} from "../../services/unifiedStudentService";
import hostelDataService from "../../services/hostelDataService";

const AVAILABLE_ROOMS = [
  "101",
  "102",
  "103",
  "104",
  "105",
  "106",
  "107",
  "108",
  "109",
  "110",
  "111",
  "112",
  "201",
  "202",
  "203",
  "204",
  "205",
];

const BLOCKS = ["Block A", "Block B", "Block C", "Girls Hostel Block"];

export default function NoticeManagerStudentsScreen() {
  const { width } = useWindowDimensions();
  const [students, setStudents] = useState<UnifiedStudent[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ENROLLED" | "UNASSIGNED">("ALL");

  // Allocation Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<UnifiedStudent | null>(null);
  const [selectedRoom, setSelectedRoom] = useState("103");
  const [selectedBlock, setSelectedBlock] = useState("Block A");
  const [allocating, setAllocating] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = unifiedStudentService.subscribeStudents((list) => {
      setStudents(list);
      setLoading(false);
    });
    return () => {
      if (typeof unsubscribe === "function") unsubscribe();
    };
  }, []);

  const filtered = students.filter((s) => {
    const q = search.trim().toLowerCase();
    const matchesSearch =
      !q ||
      s.fullName.toLowerCase().includes(q) ||
      s.rollNo.toLowerCase().includes(q) ||
      s.department.toLowerCase().includes(q);

    const matchesStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ENROLLED" && s.hostelStatus === "Enrolled") ||
      (statusFilter === "UNASSIGNED" && s.hostelStatus !== "Enrolled");

    return matchesSearch && matchesStatus;
  });

  const enrolledCount = students.filter((s) => s.hostelStatus === "Enrolled").length;
  const unassignedCount = students.filter((s) => s.hostelStatus !== "Enrolled").length;

  const openAllocationModal = (student: UnifiedStudent) => {
    setSelectedStudent(student);
    setSelectedRoom(student.roomNo || "103");
    setSelectedBlock(student.hostelBlock || "Block A");
    setModalVisible(true);
  };

  const handleAllocateToHostel = async () => {
    if (!selectedStudent) return;
    setAllocating(true);

    try {
      await unifiedStudentService.addStudentToHostel(
        selectedStudent.id,
        selectedStudent.fullName,
        selectedRoom,
        selectedBlock
      );

      setModalVisible(false);
      const msg = `✅ ${selectedStudent.fullName} successfully added to Hostel Manager (Room ${selectedRoom}, ${selectedBlock})!`;
      setSuccessToast(msg);
      setTimeout(() => setSuccessToast(null), 4000);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to add student to hostel manager.");
    } finally {
      setAllocating(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.push("/notice-manager")}
          >
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>
          <View>
            <Text style={styles.title}>Students & Hostel Allocation</Text>
            <Text style={styles.subtitle}>
              Notice Manager • Add enrolled students to Hostel Manager
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.hostelViewBtn}
          onPress={() => router.push("/hostel-manager")}
        >
          <Ionicons name="business-outline" size={16} color="#FFFFFF" />
          <Text style={styles.hostelViewBtnText}>Hostel Portal</Text>
        </TouchableOpacity>
      </View>

      {/* Success Banner */}
      {successToast && (
        <View style={styles.toastBanner}>
          <Ionicons name="checkmark-circle" size={18} color="#059669" />
          <Text style={styles.toastText}>{successToast}</Text>
        </View>
      )}

      {/* Statistics Cards */}
      <View style={styles.statsRow}>
        <View style={[styles.statCard, { borderLeftColor: "#2563EB" }]}>
          <Text style={styles.statLabel}>Total Students</Text>
          <Text style={[styles.statValue, { color: "#2563EB" }]}>
            {students.length}
          </Text>
        </View>

        <View style={[styles.statCard, { borderLeftColor: "#059669" }]}>
          <Text style={styles.statLabel}>In Hostel</Text>
          <Text style={[styles.statValue, { color: "#059669" }]}>
            {enrolledCount}
          </Text>
        </View>

        <View style={[styles.statCard, { borderLeftColor: "#D97706" }]}>
          <Text style={styles.statLabel}>Can Add to Hostel</Text>
          <Text style={[styles.statValue, { color: "#D97706" }]}>
            {unassignedCount}
          </Text>
        </View>
      </View>

      {/* Search & Tabs */}
      <View style={styles.filterBar}>
        <View style={styles.searchBox}>
          <Ionicons name="search-outline" size={18} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search student by name, roll no, or branch..."
            placeholderTextColor="#94A3B8"
            value={search}
            onChangeText={setSearch}
          />
          {search.length > 0 && (
            <TouchableOpacity onPress={() => setSearch("")}>
              <Ionicons name="close-circle" size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.tabsRow}>
          {(["ALL", "UNASSIGNED", "ENROLLED"] as const).map((tab) => (
            <TouchableOpacity
              key={tab}
              style={[
                styles.tabBtn,
                statusFilter === tab && styles.tabBtnActive,
              ]}
              onPress={() => setStatusFilter(tab)}
            >
              <Text
                style={[
                  styles.tabBtnText,
                  statusFilter === tab && styles.tabBtnTextActive,
                ]}
              >
                {tab === "ALL"
                  ? "All Students"
                  : tab === "UNASSIGNED"
                  ? `Need Hostel (${unassignedCount})`
                  : `In Hostel (${enrolledCount})`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Students List */}
      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={styles.loadingText}>Loading student directory...</Text>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.emptyBox}>
          <Ionicons name="person-circle-outline" size={48} color="#CBD5E1" />
          <Text style={styles.emptyTitle}>No Students Found</Text>
          <Text style={styles.emptySub}>
            Try adjusting your search query or status filter.
          </Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id || item.rollNo}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const isInHostel = item.hostelStatus === "Enrolled";

            return (
              <View style={styles.studentCard}>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarInitial}>
                    {(item.fullName || "S").charAt(0).toUpperCase()}
                  </Text>
                </View>

                <View style={styles.studentInfo}>
                  <View style={styles.studentNameRow}>
                    <Text style={styles.studentName}>{item.fullName}</Text>
                    <View style={styles.rollPill}>
                      <Text style={styles.rollPillText}>{item.rollNo}</Text>
                    </View>
                  </View>

                  <Text style={styles.studentMeta}>
                    {item.department} • Semester {item.semester} • {item.email}
                  </Text>

                  <View style={styles.hostelStatusRow}>
                    {isInHostel ? (
                      <View style={styles.enrolledBadge}>
                        <Ionicons name="business" size={13} color="#059669" />
                        <Text style={styles.enrolledBadgeText}>
                          Room {item.roomNo || "Assigned"} ({item.hostelBlock || "Block A"})
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.unassignedBadge}>
                        <Ionicons name="home-outline" size={13} color="#64748B" />
                        <Text style={styles.unassignedBadgeText}>
                          Day Scholar / Not in Hostel
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                <View style={styles.actionCol}>
                  <TouchableOpacity
                    style={[
                      styles.allocateBtn,
                      isInHostel ? styles.reallocateBtn : styles.addHostelBtn,
                    ]}
                    onPress={() => openAllocationModal(item)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name={isInHostel ? "create-outline" : "add-circle"}
                      size={16}
                      color="#FFFFFF"
                    />
                    <Text style={styles.allocateBtnText}>
                      {isInHostel ? "Change Room" : "Add to Hostel"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* ALLOCATION MODAL */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          if (!allocating) setModalVisible(false);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderIcon}>
                <Ionicons name="business" size={24} color="#2563EB" />
              </View>
              <Text style={styles.modalTitle}>Hostel Room Allocation</Text>
              <Text style={styles.modalSub}>
                Assign room for{" "}
                <Text style={{ fontWeight: "700", color: "#0F172A" }}>
                  {selectedStudent?.fullName}
                </Text>{" "}
                ({selectedStudent?.rollNo})
              </Text>
            </View>

            {/* Block Selection */}
            <Text style={styles.inputLabel}>Select Hostel Block:</Text>
            <View style={styles.blockRow}>
              {BLOCKS.map((blk) => (
                <TouchableOpacity
                  key={blk}
                  style={[
                    styles.blockChip,
                    selectedBlock === blk && styles.blockChipActive,
                  ]}
                  onPress={() => setSelectedBlock(blk)}
                >
                  <Text
                    style={[
                      styles.blockChipText,
                      selectedBlock === blk && styles.blockChipTextActive,
                    ]}
                  >
                    {blk}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Room Selection */}
            <Text style={styles.inputLabel}>Select Room Number:</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.roomsRow}
            >
              {AVAILABLE_ROOMS.map((rm) => (
                <TouchableOpacity
                  key={rm}
                  style={[
                    styles.roomChip,
                    selectedRoom === rm && styles.roomChipActive,
                  ]}
                  onPress={() => setSelectedRoom(rm)}
                >
                  <Text
                    style={[
                      styles.roomChipText,
                      selectedRoom === rm && styles.roomChipTextActive,
                    ]}
                  >
                    {rm}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.infoCallout}>
              <Ionicons name="information-circle" size={17} color="#0284C7" />
              <Text style={styles.infoCalloutText}>
                Adding this student will automatically enroll them into Hostel Manager residents and sync across all dashboards.
              </Text>
            </View>

            {/* Modal Actions */}
            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setModalVisible(false)}
                disabled={allocating}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleAllocateToHostel}
                disabled={allocating}
              >
                {allocating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
                    <Text style={styles.modalSubmitBtnText}>
                      Enroll in Hostel Manager
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 44,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0F172A",
  },
  subtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  hostelViewBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#059669",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  hostelViewBtnText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "700",
  },
  toastBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#A7F3D0",
  },
  toastText: {
    color: "#065F46",
    fontSize: 12.5,
    fontWeight: "600",
    flex: 1,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  statCard: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    padding: 10,
    borderLeftWidth: 4,
  },
  statLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 2,
  },
  filterBar: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    gap: 10,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
  },
  tabsRow: {
    flexDirection: "row",
    gap: 8,
  },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  tabBtnActive: {
    backgroundColor: "#2563EB",
  },
  tabBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  tabBtnTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  listContent: {
    padding: 20,
    gap: 12,
  },
  studentCard: {
    backgroundColor: "#FFFFFF",
    padding: 14,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    gap: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EDE9FE",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitial: {
    fontSize: 18,
    fontWeight: "800",
    color: "#6D28D9",
  },
  studentInfo: {
    flex: 1,
  },
  studentNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  studentName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  rollPill: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  rollPillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
  },
  studentMeta: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  hostelStatusRow: {
    marginTop: 6,
  },
  enrolledBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  enrolledBadgeText: {
    color: "#166534",
    fontSize: 11,
    fontWeight: "700",
  },
  unassignedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  unassignedBadgeText: {
    color: "#64748B",
    fontSize: 11,
    fontWeight: "600",
  },
  actionCol: {
    alignItems: "flex-end",
  },
  allocateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addHostelBtn: {
    backgroundColor: "#059669",
  },
  reallocateBtn: {
    backgroundColor: "#2563EB",
  },
  allocateBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    alignItems: "center",
    marginBottom: 16,
  },
  modalHeaderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#EFF6FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalSub: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
    textAlign: "center",
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
    marginTop: 8,
  },
  blockRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  blockChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  blockChipActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  blockChipText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#475569",
  },
  blockChipTextActive: {
    color: "#FFFFFF",
  },
  roomsRow: {
    gap: 8,
    paddingVertical: 4,
  },
  roomChip: {
    width: 52,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },
  roomChipActive: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  roomChipText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#334155",
  },
  roomChipTextActive: {
    color: "#FFFFFF",
  },
  infoCallout: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#F0F9FF",
    padding: 10,
    borderRadius: 10,
    marginTop: 14,
    marginBottom: 16,
  },
  infoCalloutText: {
    flex: 1,
    fontSize: 11,
    color: "#0369A1",
    lineHeight: 15,
  },
  modalActionsRow: {
    flexDirection: "row",
    gap: 10,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCancelBtnText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "600",
  },
  modalSubmitBtn: {
    flex: 2,
    flexDirection: "row",
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#059669",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
  },
  modalSubmitBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  loadingBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 30,
    gap: 12,
  },
  loadingText: {
    fontSize: 13,
    color: "#64748B",
  },
  emptyBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  emptySub: {
    fontSize: 12,
    color: "#64748B",
  },
});
