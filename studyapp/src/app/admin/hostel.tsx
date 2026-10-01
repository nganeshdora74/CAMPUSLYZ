import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

import { useAppTheme } from "../../context/ThemeContext";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTopBar from "../../components/admin/AdminTopBar";
import {
  DEFAULT_HOSTEL_BLOCKS,
  HostelBlock,
  HostelComplaint,
  HostelStudent,
  RoomStrengthInfo,
  allocateHostelStudent,
  createHostelComplaint,
  deleteHostelStudent,
  getIsoDate,
  getRecentDates,
  listenHostelBlocks,
  listenHostelComplaints,
  listenHostelStudents,
  markBatchHostelAttendance,
  updateHostelBlock,
  updateHostelComplaintStatus,
  updateHostelStudent,
  updateHostelStudentAttendance,
} from "../../services/hostelService";

const COMPLAINT_CATEGORIES = [
  "Water",
  "Wi-Fi",
  "Electricity",
  "Cleaning",
  "Furniture",
  "Maintenance",
  "Safety",
  "Other",
];

const STAFF_OPTIONS = [
  "Maintenance Team",
  "IT Department",
  "Electrician Team",
  "Plumber",
  "Housekeeping",
  "Warden Office",
  "Security Desk",
];

type MainTab = "overview" | "students" | "rooms";

export default function AdminHostelScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const { isDark, colors } = useAppTheme();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Main Tab: "overview" (Screenshot design) | "students" (Day-wise Attendance & Rooms) | "rooms" (Room Strength)
  const [activeMainTab, setActiveMainTab] = useState<MainTab>("overview");

  // Realtime Backend & Firestore Data
  const [blocks, setBlocks] = useState<HostelBlock[]>(DEFAULT_HOSTEL_BLOCKS);
  const [selectedBlockId, setSelectedBlockId] = useState<string>("block-a");
  const [complaints, setComplaints] = useState<HostelComplaint[]>([]);
  const [students, setStudents] = useState<HostelStudent[]>([]);
  const [loading, setLoading] = useState(true);

  // Day-wise Attendance Date Selection
  const recentDays = useMemo(() => getRecentDates(7), []);
  const [selectedDate, setSelectedDate] = useState<string>(getIsoDate(new Date()));

  // Modals
  const [complaintModal, setComplaintModal] = useState(false);
  const [submittingComplaint, setSubmittingComplaint] = useState(false);

  // New Complaint Form
  const [formTitle, setFormTitle] = useState("");
  const [formLocation, setFormLocation] = useState("Room 204");
  const [formCategory, setFormCategory] = useState("Water");
  const [formPriority, setFormPriority] = useState<"High" | "Normal" | "Low" | "Urgent">("High");
  const [formStaff, setFormStaff] = useState("Maintenance Team");
  const [formDescription, setFormDescription] = useState("");

  // Edit Block Modal
  const [editBlockModal, setEditBlockModal] = useState(false);
  const [savingBlock, setSavingBlock] = useState(false);
  const [editBlockName, setEditBlockName] = useState("");
  const [editFloors, setEditFloors] = useState("");
  const [editCapacity, setEditCapacity] = useState("");
  const [editOccupied, setEditOccupied] = useState("");
  const [editWardenName, setEditWardenName] = useState("");
  const [editWardenPhone, setEditWardenPhone] = useState("");
  const [editSecurityName, setEditSecurityName] = useState("");
  const [editSecurityPhone, setEditSecurityPhone] = useState("");

  // Status Change Modal for Complaint
  const [selectedComplaint, setSelectedComplaint] = useState<HostelComplaint | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Allocate Student to Room Modal
  const [allocateModal, setAllocateModal] = useState(false);
  const [allocatingStudent, setAllocatingStudent] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newRollNo, setNewRollNo] = useState("");
  const [newDept, setNewDept] = useState("Computer Science");
  const [newYear, setNewYear] = useState("3rd Year");
  const [newFloor, setNewFloor] = useState("1st Floor");
  const [newRoomNo, setNewRoomNo] = useState("A-101");
  const [newBedNo, setNewBedNo] = useState("Bed 01");
  const [newRoomType, setNewRoomType] = useState("Double Sharing (AC)");
  const [newRoomStrength, setNewRoomStrength] = useState("2");
  const [newGuardianName, setNewGuardianName] = useState("");
  const [newGuardianPhone, setNewGuardianPhone] = useState("");

  // Edit Student Modal
  const [editingStudent, setEditingStudent] = useState<HostelStudent | null>(null);
  const [savingStudentEdit, setSavingStudentEdit] = useState(false);

  // Listen to Firestore & Backend in Realtime
  useEffect(() => {
    const unsubBlocks = listenHostelBlocks((loadedBlocks) => {
      setBlocks(loadedBlocks);
      setLoading(false);
    });

    const unsubComplaints = listenHostelComplaints((loadedComplaints) => {
      setComplaints(loadedComplaints);
      setLoading(false);
    });

    const unsubStudents = listenHostelStudents((loadedStudents) => {
      setStudents(loadedStudents);
      setLoading(false);
    });

    return () => {
      unsubBlocks();
      unsubComplaints();
      unsubStudents();
    };
  }, []);

  // Currently active block
  const activeBlock: HostelBlock = useMemo(() => {
    const found = blocks.find((b) => b.id === selectedBlockId);
    return found || blocks[0] || DEFAULT_HOSTEL_BLOCKS[0];
  }, [blocks, selectedBlockId]);

  // Students in currently selected block
  const blockStudents = useMemo(() => {
    return students.filter((s) => s.blockId === selectedBlockId);
  }, [students, selectedBlockId]);

  // Filtered students by search query
  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return blockStudents;
    return blockStudents.filter(
      (s) =>
        s.studentName.toLowerCase().includes(q) ||
        s.rollNo.toLowerCase().includes(q) ||
        s.roomNo.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q) ||
        s.floor.toLowerCase().includes(q)
    );
  }, [blockStudents, searchQuery]);

  // Rooms and room strength summary for the selected block
  const roomSummaries: RoomStrengthInfo[] = useMemo(() => {
    const map = new Map<string, RoomStrengthInfo>();

    for (const s of blockStudents) {
      const key = s.roomNo;
      if (!map.has(key)) {
        map.set(key, {
          roomNo: s.roomNo,
          floor: s.floor,
          blockId: s.blockId,
          roomStrength: s.roomStrength || 2,
          occupiedBeds: 0,
          vacantBeds: s.roomStrength || 2,
          isFull: false,
          students: [],
        });
      }
      const entry = map.get(key)!;
      entry.students.push(s);
      entry.occupiedBeds = entry.students.length;
      entry.vacantBeds = Math.max(0, entry.roomStrength - entry.occupiedBeds);
      entry.isFull = entry.occupiedBeds >= entry.roomStrength;
    }

    return Array.from(map.values()).sort((a, b) => a.roomNo.localeCompare(b.roomNo));
  }, [blockStudents]);

  // Day-wise Attendance stats for selected date
  const attendanceStats = useMemo(() => {
    let present = 0;
    let absent = 0;
    let leave = 0;
    let late = 0;
    let unmarked = 0;

    for (const s of blockStudents) {
      const status = s.attendance?.[selectedDate];
      if (status === "Present") present++;
      else if (status === "Absent") absent++;
      else if (status === "Leave") leave++;
      else if (status === "Late") late++;
      else unmarked++;
    }

    return {
      total: blockStudents.length,
      present,
      absent,
      leave,
      late,
      unmarked,
      presentPercent: blockStudents.length > 0 ? Math.round((present / blockStudents.length) * 100) : 0,
    };
  }, [blockStudents, selectedDate]);

  // Filter complaints by search query and block
  const filteredComplaints = useMemo(() => {
    let list = complaints;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.title.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q) ||
          c.location.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q) ||
          c.studentName.toLowerCase().includes(q) ||
          c.status.toLowerCase().includes(q)
      );
    }
    return list;
  }, [complaints, searchQuery]);

  // Open Edit Block Modal prefilled
  const openEditBlockModal = () => {
    setEditBlockName(activeBlock.name);
    setEditFloors(activeBlock.floors);
    setEditCapacity(String(activeBlock.totalCapacity));
    setEditOccupied(String(activeBlock.occupied));
    setEditWardenName(activeBlock.chiefWarden);
    setEditWardenPhone(activeBlock.wardenPhone);
    setEditSecurityName(activeBlock.securityName);
    setEditSecurityPhone(activeBlock.securityPhone);
    setEditBlockModal(true);
  };

  // Save Block Changes
  const handleSaveBlock = async () => {
    try {
      setSavingBlock(true);
      const cap = parseInt(editCapacity) || activeBlock.totalCapacity;
      const occ = parseInt(editOccupied) || activeBlock.occupied;

      await updateHostelBlock({
        id: activeBlock.id,
        name: editBlockName.trim() || activeBlock.name,
        floors: editFloors.trim() || activeBlock.floors,
        totalCapacity: cap,
        occupied: occ,
        chiefWarden: editWardenName.trim() || activeBlock.chiefWarden,
        wardenPhone: editWardenPhone.trim() || activeBlock.wardenPhone,
        securityName: editSecurityName.trim() || activeBlock.securityName,
        securityPhone: editSecurityPhone.trim() || activeBlock.securityPhone,
      });

      setEditBlockModal(false);
      Alert.alert("Block Updated! 🏢", `${editBlockName || activeBlock.name} details saved to Firebase & Backend.`);
    } catch (e: any) {
      Alert.alert("Update Error", e?.message || "Failed to update block.");
    } finally {
      setSavingBlock(false);
    }
  };

  // Open Log Inspection Modal
  const openLogInspectionModal = () => {
    setFormTitle("");
    setFormLocation(`${activeBlock.name.includes("Block B") ? "Block B - Room 204" : "Room 204"}`);
    setFormCategory("Water");
    setFormPriority("High");
    setFormStaff("Maintenance Team");
    setFormDescription("");
    setComplaintModal(true);
  };

  // Handle register complaint
  const handleRegisterComplaint = async () => {
    const title = formTitle.trim() || `${formCategory} Issue - ${formLocation.trim()}`;
    if (!title) {
      Alert.alert("Missing Details", "Please enter a complaint title or description.");
      return;
    }

    try {
      setSubmittingComplaint(true);
      await createHostelComplaint({
        title,
        description: formDescription.trim() || title,
        category: formCategory,
        location: formLocation.trim() || "Hostel Premises",
        blockId: activeBlock.id,
        priority: formPriority,
        assignedStaff: formStaff,
        status: "In Progress",
      });

      setComplaintModal(false);
      Alert.alert("Inspection Logged! 📋", "Hostel complaint registered in Firebase & Backend. Staff notified.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to log complaint.");
    } finally {
      setSubmittingComplaint(false);
    }
  };

  // Quick cycle complaint status
  const handleQuickCycleStatus = async (item: HostelComplaint) => {
    const nextStatus: "Pending" | "In Progress" | "Resolved" =
      item.status === "In Progress"
        ? "Resolved"
        : item.status === "Resolved"
        ? "Pending"
        : "In Progress";

    try {
      await updateHostelComplaintStatus(item.id, nextStatus);
    } catch (e: any) {
      console.warn("Status toggle error:", e);
    }
  };

  // Update Status from Detail Modal
  const handleSetModalStatus = async (status: "Pending" | "In Progress" | "Resolved") => {
    if (!selectedComplaint) return;
    try {
      setUpdatingStatus(true);
      await updateHostelComplaintStatus(selectedComplaint.id, status);
      setSelectedComplaint((prev) => (prev ? { ...prev, status } : null));
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to update status.");
    } finally {
      setUpdatingStatus(false);
    }
  };

  // Quick toggle student day-wise attendance
  const handleToggleStudentAttendance = async (student: HostelStudent) => {
    const current = student.attendance?.[selectedDate] || "Present";
    const next: "Present" | "Absent" | "Leave" | "Late" =
      current === "Present"
        ? "Absent"
        : current === "Absent"
        ? "Leave"
        : current === "Leave"
        ? "Late"
        : "Present";

    // Optimistic local update
    setStudents((prev) =>
      prev.map((s) =>
        s.id === student.id
          ? {
              ...s,
              attendance: {
                ...s.attendance,
                [selectedDate]: next,
              },
            }
          : s
      )
    );

    try {
      await updateHostelStudentAttendance(student.id, selectedDate, next);
    } catch (e) {
      console.warn("Error updating student attendance:", e);
    }
  };

  // Mark all students present for selected day
  const handleMarkAllPresent = async () => {
    const ids = blockStudents.map((s) => s.id);
    if (ids.length === 0) return;

    // Optimistic update
    setStudents((prev) =>
      prev.map((s) =>
        s.blockId === selectedBlockId
          ? {
              ...s,
              attendance: {
                ...s.attendance,
                [selectedDate]: "Present",
              },
            }
          : s
      )
    );

    try {
      await markBatchHostelAttendance(ids, selectedDate, "Present");
      Alert.alert(
        "Roll Call Recorded! ✓",
        `Marked all ${ids.length} resident students as Present in ${activeBlock.name} for ${selectedDate}.`
      );
    } catch (e) {
      Alert.alert("Error", "Could not mark all present.");
    }
  };

  // Allocate new student to room
  const handleAllocateStudent = async () => {
    if (!newStudentName.trim() || !newRollNo.trim() || !newRoomNo.trim()) {
      Alert.alert("Missing Details", "Please fill in student name, roll number, and room number.");
      return;
    }

    try {
      setAllocatingStudent(true);
      const str = parseInt(newRoomStrength) || 2;
      const roomOccupants = blockStudents.filter((s) => s.roomNo.toLowerCase() === newRoomNo.trim().toLowerCase()).length;

      await allocateHostelStudent({
        studentId: `st-${newRollNo.trim().toLowerCase()}`,
        studentName: newStudentName.trim(),
        rollNo: newRollNo.trim().toUpperCase(),
        department: newDept,
        year: newYear,
        blockId: activeBlock.id,
        blockName: activeBlock.name,
        floor: newFloor,
        roomNo: newRoomNo.trim().toUpperCase(),
        bedNo: newBedNo,
        roomType: newRoomType,
        roomStrength: str,
        currentOccupants: roomOccupants + 1,
        guardianName: newGuardianName.trim(),
        guardianPhone: newGuardianPhone.trim(),
        status: "Active",
        attendance: {
          [selectedDate]: "Present",
        },
      });

      setAllocateModal(false);
      setNewStudentName("");
      setNewRollNo("");
      Alert.alert("Student Allocated! 🛏️", `${newStudentName} assigned to ${activeBlock.name} Room ${newRoomNo.toUpperCase()}.`);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to allocate student.");
    } finally {
      setAllocatingStudent(false);
    }
  };

  // Open Edit Student Modal
  const openEditStudentModal = (student: HostelStudent) => {
    setEditingStudent(student);
  };

  // Save Student Room Edits
  const handleSaveStudentEdit = async () => {
    if (!editingStudent) return;
    try {
      setSavingStudentEdit(true);
      await updateHostelStudent(editingStudent.id, {
        roomNo: editingStudent.roomNo,
        floor: editingStudent.floor,
        bedNo: editingStudent.bedNo,
        roomStrength: editingStudent.roomStrength,
        roomType: editingStudent.roomType,
        status: editingStudent.status,
      });

      setEditingStudent(null);
      Alert.alert("Updated! ✓", "Student hostel room allocation updated.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to save edits.");
    } finally {
      setSavingStudentEdit(false);
    }
  };

  // Remove / Vacate student
  const handleVacateStudent = (student: HostelStudent) => {
    Alert.alert(
      "Vacate Room",
      `Are you sure you want to remove ${student.studentName} (${student.rollNo}) from Room ${student.roomNo}? This bed will become vacant.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Vacate Bed",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteHostelStudent(student.id);
              Alert.alert("Room Vacated", `${student.studentName} removed from ${student.roomNo}.`);
            } catch (e: any) {
              Alert.alert("Error", e?.message || "Failed to vacate student.");
            }
          },
        },
      ]
    );
  };

  // Helper for category icon & color
  const getCategoryTheme = (cat: string) => {
    const c = cat.toLowerCase();
    if (c.includes("water") || c.includes("plumb") || c.includes("geyser")) {
      return { icon: "water", color: "#3B82F6", bg: "#EFF6FF" };
    }
    if (c.includes("wifi") || c.includes("wi-fi") || c.includes("internet") || c.includes("network")) {
      return { icon: "wifi", color: "#8B5CF6", bg: "#F5F3FF" };
    }
    if (c.includes("electric") || c.includes("light") || c.includes("power")) {
      return { icon: "flash", color: "#F59E0B", bg: "#FEF3C7" };
    }
    if (c.includes("clean") || c.includes("trash") || c.includes("waste")) {
      return { icon: "sparkles", color: "#10B981", bg: "#ECFDF5" };
    }
    if (c.includes("furniture") || c.includes("bed") || c.includes("chair")) {
      return { icon: "construct", color: "#EA580C", bg: "#FFF7ED" };
    }
    return { icon: "hammer", color: "#4F46E5", bg: "#EEF2FF" };
  };

  // Helper for status badge style
  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case "Resolved":
        return { bg: "#DCFCE7", text: "#16A34A" };
      case "In Progress":
        return { bg: "#EFF6FF", text: "#2563EB" };
      case "Pending":
      default:
        return { bg: "#FEF3C7", text: "#D97706" };
    }
  };

  // Helper for attendance badge style
  const getAttendanceBadge = (status?: string) => {
    switch (status) {
      case "Present":
        return { bg: "#DCFCE7", text: "#16A34A", icon: "checkmark-circle" };
      case "Absent":
        return { bg: "#FEE2E2", text: "#DC2626", icon: "close-circle" };
      case "Leave":
        return { bg: "#FEF3C7", text: "#D97706", icon: "airplane" };
      case "Late":
        return { bg: "#E0E7FF", text: "#4F46E5", icon: "time" };
      default:
        return { bg: "#F1F5F9", text: "#64748B", icon: "help-circle" };
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.adminSidebar }]} edges={["top", "left", "right"]}>
      <View style={[styles.mainLayout, { backgroundColor: colors.adminBg }]}>
        <AdminSidebar
          activeNav="hostel"
          isDesktop={isDesktop}
          mobileMenuOpen={mobileMenuOpen}
          onCloseMobileMenu={() => setMobileMenuOpen(false)}
        />

        <View style={[styles.contentArea, { backgroundColor: colors.adminBg }]}>
          <AdminTopBar
            showSearch={true}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search hostel rooms, students, blocks, wardens..."
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
          />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
            {/* ===================================================== */}
            {/* MAIN NAVIGATION SWITCHER TABS: OVERVIEW VS STUDENTS VS ROOMS */}
            {/* ===================================================== */}
            <View style={[styles.mainTabSwitchRow, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
              <TouchableOpacity
                style={[styles.mainTabSwitchBtn, activeMainTab === "overview" && styles.mainTabSwitchBtnActive]}
                onPress={() => setActiveMainTab("overview")}
              >
                <Ionicons
                  name="business"
                  size={16}
                  color={activeMainTab === "overview" ? "#FFFFFF" : colors.adminTextSecondary}
                />
                <Text
                  style={[
                    styles.mainTabSwitchText,
                    { color: activeMainTab === "overview" ? "#FFFFFF" : colors.adminTextSecondary },
                    activeMainTab === "overview" && { fontWeight: "700" },
                  ]}
                >
                  Block Overview & Complaints
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.mainTabSwitchBtn, activeMainTab === "students" && styles.mainTabSwitchBtnActive]}
                onPress={() => setActiveMainTab("students")}
              >
                <Ionicons
                  name="people"
                  size={16}
                  color={activeMainTab === "students" ? "#FFFFFF" : colors.adminTextSecondary}
                />
                <Text
                  style={[
                    styles.mainTabSwitchText,
                    { color: activeMainTab === "students" ? "#FFFFFF" : colors.adminTextSecondary },
                    activeMainTab === "students" && { fontWeight: "700" },
                  ]}
                >
                  Students & Night Attendance ({blockStudents.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.mainTabSwitchBtn, activeMainTab === "rooms" && styles.mainTabSwitchBtnActive]}
                onPress={() => setActiveMainTab("rooms")}
              >
                <Ionicons
                  name="bed"
                  size={16}
                  color={activeMainTab === "rooms" ? "#FFFFFF" : colors.adminTextSecondary}
                />
                <Text
                  style={[
                    styles.mainTabSwitchText,
                    { color: activeMainTab === "rooms" ? "#FFFFFF" : colors.adminTextSecondary },
                    activeMainTab === "rooms" && { fontWeight: "700" },
                  ]}
                >
                  Room Strength ({roomSummaries.length} Rooms)
                </Text>
              </TouchableOpacity>
            </View>

            {/* ===================================================== */}
            {/* BLOCK SELECTOR TABS (BLOCK A, BLOCK B, BLOCK C) */}
            {/* ===================================================== */}
            <View style={styles.blockTabsRow}>
              {blocks.map((b) => {
                const isSelected = b.id === selectedBlockId;
                return (
                  <TouchableOpacity
                    key={b.id}
                    style={[
                      styles.blockTabBtn,
                      {
                        backgroundColor: isSelected ? "#4F46E5" : colors.adminCard,
                        borderColor: isSelected ? "#4F46E5" : colors.adminCardBorder,
                      },
                    ]}
                    onPress={() => setSelectedBlockId(b.id)}
                    activeOpacity={0.8}
                  >
                    <Ionicons
                      name="business"
                      size={15}
                      color={isSelected ? "#FFFFFF" : colors.adminTextSecondary}
                      style={{ marginRight: 6 }}
                    />
                    <Text
                      style={[
                        styles.blockTabText,
                        {
                          color: isSelected ? "#FFFFFF" : colors.adminText,
                          fontWeight: isSelected ? "700" : "600",
                        },
                      ]}
                    >
                      {b.name}
                    </Text>
                  </TouchableOpacity>
                );
              })}

              <TouchableOpacity
                style={[styles.editBlockHeaderBtn, { backgroundColor: colors.adminSurfaceAlt, borderColor: colors.adminCardBorder }]}
                onPress={openEditBlockModal}
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={15} color="#4F46E5" style={{ marginRight: 4 }} />
                <Text style={styles.editBlockHeaderBtnText}>Edit Block Info</Text>
              </TouchableOpacity>
            </View>

            {/* ===================================================== */}
            {/* TAB 1: OVERVIEW & COMPLAINTS (EXACT MATCH FOR SCREENSHOT) */}
            {/* ===================================================== */}
            {activeMainTab === "overview" && (
              <View>
                {/* HERO CARD */}
                <View style={[styles.heroCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                  <Image source={{ uri: activeBlock.imageUrl }} style={styles.heroImage} />

                  <View style={styles.heroDetails}>
                    <View style={styles.heroTopRow}>
                      <Text style={[styles.heroTitle, { color: colors.adminText }]}>{activeBlock.name}</Text>
                      <View style={styles.activeBadge}>
                        <Text style={styles.activeBadgeText}>{activeBlock.occupied} Occupancy</Text>
                      </View>
                    </View>

                    <Text style={[styles.heroRoom, { color: colors.adminTextSecondary }]}>{activeBlock.floors}</Text>
                    <Text style={[styles.heroBlock, { color: "#4F46E5" }]}>
                      Chief Warden: {activeBlock.chiefWarden}
                    </Text>
                  </View>
                </View>

                {/* 3 INFO CARDS ROW */}
                <View style={styles.infoCardsRow}>
                  <View style={[styles.infoCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                    <Text style={[styles.infoLabel, { color: colors.adminTextSecondary }]}>Total Capacity</Text>
                    <Text style={[styles.infoValue, { color: colors.adminText }]}>{activeBlock.totalCapacity} Beds</Text>
                  </View>

                  <View style={[styles.infoCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                    <Text style={[styles.infoLabel, { color: colors.adminTextSecondary }]}>Occupied</Text>
                    <Text style={[styles.infoValue, { color: colors.adminText }]}>{activeBlock.occupied} Beds</Text>
                  </View>

                  <View style={[styles.infoCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                    <Text style={[styles.infoLabel, { color: colors.adminTextSecondary }]}>Vacant</Text>
                    <Text style={[styles.infoValue, { color: colors.adminText }]}>{activeBlock.vacant} Beds</Text>
                  </View>
                </View>

                {/* WARDEN & SECURITY ROW */}
                <View style={styles.contactsGrid}>
                  <View style={[styles.contactCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                    <View style={[styles.contactIconCircle, { backgroundColor: isDark ? "rgba(79,70,229,0.2)" : "#EEF2FF" }]}>
                      <Ionicons name="person" size={18} color="#4F46E5" />
                    </View>
                    <View>
                      <Text style={[styles.contactRole, { color: colors.adminTextSecondary }]}>Hostel Warden</Text>
                      <Text style={[styles.contactName, { color: colors.adminText }]}>{activeBlock.chiefWarden}</Text>
                      <Text style={[styles.contactPhone, { color: "#4F46E5" }]}>{activeBlock.wardenPhone}</Text>
                    </View>
                  </View>

                  <View style={[styles.contactCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                    <View style={[styles.contactIconCircle, { backgroundColor: isDark ? "rgba(16,185,129,0.2)" : "#ECFDF5" }]}>
                      <Ionicons name="shield-checkmark" size={18} color="#10B981" />
                    </View>
                    <View>
                      <Text style={[styles.contactRole, { color: colors.adminTextSecondary }]}>Security Desk</Text>
                      <Text style={[styles.contactName, { color: colors.adminText }]}>{activeBlock.securityName}</Text>
                      <Text style={[styles.contactPhone, { color: colors.adminTextSecondary }]}>{activeBlock.securityPhone}</Text>
                    </View>
                  </View>
                </View>

                {/* RECENT COMPLAINTS */}
                <View style={[styles.complaintsContainer, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                  <View style={styles.sectionHeaderRow}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Text style={[styles.sectionTitle, { color: colors.adminText }]}>Recent Hostel Complaints</Text>
                      <View style={[styles.countBadge, { backgroundColor: isDark ? "rgba(79,70,229,0.25)" : "#EEF2FF" }]}>
                        <Text style={[styles.countBadgeText, { color: "#4F46E5" }]}>{filteredComplaints.length}</Text>
                      </View>
                    </View>

                    <TouchableOpacity style={styles.addComplaintBtn} onPress={openLogInspectionModal} activeOpacity={0.85}>
                      <Ionicons name="add" size={16} color="#4F46E5" />
                      <Text style={styles.addComplaintText}>+ Log Inspection</Text>
                    </TouchableOpacity>
                  </View>

                  {loading ? (
                    <View style={{ paddingVertical: 30, alignItems: "center" }}>
                      <ActivityIndicator size="small" color="#4F46E5" />
                      <Text style={{ fontSize: 13, color: colors.adminTextSecondary, marginTop: 8 }}>
                        Syncing live hostel complaints...
                      </Text>
                    </View>
                  ) : filteredComplaints.length === 0 ? (
                    <View style={styles.emptyContainer}>
                      <Ionicons name="checkmark-done-circle-outline" size={44} color="#10B981" />
                      <Text style={[styles.emptyTitle, { color: colors.adminText }]}>No Open Complaints</Text>
                      <Text style={[styles.emptySub, { color: colors.adminTextSecondary }]}>
                        All hostel rooms and amenities are functioning smoothly.
                      </Text>
                    </View>
                  ) : (
                    filteredComplaints.map((item) => {
                      const theme = getCategoryTheme(item.category);
                      const badge = getStatusBadgeStyle(item.status);

                      return (
                        <TouchableOpacity
                          key={item.id}
                          style={[styles.complaintItem, { borderBottomColor: colors.adminCardBorder }]}
                          activeOpacity={0.75}
                          onPress={() => setSelectedComplaint(item)}
                        >
                          <View style={[styles.complaintIconCircle, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : theme.bg }]}>
                            <Ionicons name={theme.icon as any} size={16} color={theme.color} />
                          </View>

                          <View style={{ flex: 1 }}>
                            <Text style={[styles.complaintTitle, { color: colors.adminText }]} numberOfLines={1}>
                              {item.title}
                            </Text>
                            <Text style={[styles.complaintSub, { color: colors.adminTextSecondary }]} numberOfLines={1}>
                              {item.location} • {item.timeAgo}
                            </Text>
                          </View>

                          <TouchableOpacity
                            style={[styles.statusChip, { backgroundColor: badge.bg }]}
                            activeOpacity={0.8}
                            onPress={() => handleQuickCycleStatus(item)}
                          >
                            <Text style={[styles.statusChipText, { color: badge.text }]}>{item.status}</Text>
                          </TouchableOpacity>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </View>
              </View>
            )}

            {/* ===================================================== */}
            {/* TAB 2: STUDENT RESIDENTS & DAY-WISE ATTENDANCE */}
            {/* ===================================================== */}
            {activeMainTab === "students" && (
              <View>
                {/* 1. DATE SELECTOR BAR */}
                <View style={[styles.dateSelectorCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                  <View style={styles.dateSelectorHeader}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <Ionicons name="calendar" size={18} color="#4F46E5" />
                      <Text style={[styles.dateCardTitle, { color: colors.adminText }]}>
                        Night Attendance Roll Call
                      </Text>
                    </View>
                    <Text style={[styles.activeDateLabel, { color: "#4F46E5" }]}>
                      {selectedDate === getIsoDate() ? "Today • " : ""}
                      {new Date(selectedDate).toLocaleDateString("en-IN", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </Text>
                  </View>

                  {/* 7-Day Quick Pill Strip */}
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dayPillStrip}>
                    {recentDays.map((d) => {
                      const isSel = d.dateStr === selectedDate;
                      return (
                        <TouchableOpacity
                          key={d.dateStr}
                          style={[
                            styles.dayPillBtn,
                            {
                              backgroundColor: isSel ? "#4F46E5" : colors.adminSurfaceAlt,
                              borderColor: isSel ? "#4F46E5" : colors.adminCardBorder,
                            },
                          ]}
                          onPress={() => setSelectedDate(d.dateStr)}
                          activeOpacity={0.8}
                        >
                          <Text
                            style={[
                              styles.dayPillDay,
                              { color: isSel ? "rgba(255,255,255,0.85)" : colors.adminTextSecondary },
                            ]}
                          >
                            {d.dayLabel}
                          </Text>
                          <Text
                            style={[
                              styles.dayPillDate,
                              { color: isSel ? "#FFFFFF" : colors.adminText, fontWeight: isSel ? "800" : "600" },
                            ]}
                          >
                            {d.shortDate.split(" ")[0]}
                          </Text>
                          {d.isToday && (
                            <View style={[styles.todayDot, { backgroundColor: isSel ? "#10B981" : "#4F46E5" }]} />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* 2. STATS & ROLL CALL SUMMARY */}
                <View style={styles.attStatsGrid}>
                  <View style={[styles.attStatBox, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                    <Text style={[styles.attStatLabel, { color: colors.adminTextSecondary }]}>Total Residents</Text>
                    <Text style={[styles.attStatVal, { color: colors.adminText }]}>{attendanceStats.total}</Text>
                    <Text style={[styles.attStatSub, { color: colors.adminTextSecondary }]}>{activeBlock.name}</Text>
                  </View>

                  <View style={[styles.attStatBox, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                    <Text style={[styles.attStatLabel, { color: "#16A34A" }]}>Present</Text>
                    <Text style={[styles.attStatVal, { color: "#16A34A" }]}>{attendanceStats.present}</Text>
                    <Text style={[styles.attStatSub, { color: "#16A34A" }]}>{attendanceStats.presentPercent}% Present</Text>
                  </View>

                  <View style={[styles.attStatBox, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                    <Text style={[styles.attStatLabel, { color: "#DC2626" }]}>Absent</Text>
                    <Text style={[styles.attStatVal, { color: "#DC2626" }]}>{attendanceStats.absent}</Text>
                    <Text style={[styles.attStatSub, { color: "#DC2626" }]}>Night Roll Call</Text>
                  </View>

                  <View style={[styles.attStatBox, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                    <Text style={[styles.attStatLabel, { color: "#D97706" }]}>On Leave</Text>
                    <Text style={[styles.attStatVal, { color: "#D97706" }]}>{attendanceStats.leave}</Text>
                    <Text style={[styles.attStatSub, { color: "#D97706" }]}>Gate Pass Active</Text>
                  </View>
                </View>

                {/* 3. ACTIONS ROW */}
                <View style={styles.attActionsRow}>
                  <TouchableOpacity
                    style={[styles.markAllPresentBtn, { backgroundColor: "#10B981" }]}
                    onPress={handleMarkAllPresent}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="checkmark-done" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.markAllPresentText}>Mark All Present Today</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.allocateBtn, { backgroundColor: "#4F46E5" }]}
                    onPress={() => setAllocateModal(true)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="person-add" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.allocateBtnText}>+ Allocate Student to Room</Text>
                  </TouchableOpacity>
                </View>

                {/* 4. STUDENT LIST TABLE */}
                <View style={[styles.studentTableCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                  <View style={styles.tableHeaderRow}>
                    <Text style={[styles.sectionTitle, { color: colors.adminText }]}>
                      Resident Students ({filteredStudents.length})
                    </Text>
                    <Text style={[styles.tableHeaderHint, { color: colors.adminTextSecondary }]}>
                      Tap status badge to cycle: Present ➔ Absent ➔ Leave ➔ Late
                    </Text>
                  </View>

                  {filteredStudents.length === 0 ? (
                    <View style={{ paddingVertical: 40, alignItems: "center" }}>
                      <Ionicons name="people-outline" size={44} color={colors.adminTextSecondary} />
                      <Text style={[styles.emptyTitle, { color: colors.adminText, marginTop: 8 }]}>No Students in this Block</Text>
                      <Text style={[styles.emptySub, { color: colors.adminTextSecondary }]}>
                        Tap "+ Allocate Student to Room" to assign a resident to this block.
                      </Text>
                    </View>
                  ) : (
                    filteredStudents.map((st) => {
                      const todayStatus = st.attendance?.[selectedDate] || "Present";
                      const badge = getAttendanceBadge(todayStatus);
                      const isFull = st.currentOccupants >= st.roomStrength;

                      return (
                        <View
                          key={st.id}
                          style={[styles.studentRowItem, { borderBottomColor: colors.adminCardBorder }]}
                        >
                          {/* Left Avatar & Name */}
                          <View style={styles.studentInfoCol}>
                            <View style={[styles.studentAvatarCircle, { backgroundColor: "#5D3EBC" }]}>
                              <Text style={styles.studentAvatarInitials}>
                                {st.studentName.slice(0, 2).toUpperCase()}
                              </Text>
                            </View>
                            <View>
                              <Text style={[styles.studentNameText, { color: colors.adminText }]}>
                                {st.studentName}
                              </Text>
                              <Text style={[styles.studentRollText, { color: colors.adminTextSecondary }]}>
                                {st.rollNo} • {st.department}
                              </Text>
                            </View>
                          </View>

                          {/* Room & Room Strength Information */}
                          <View style={styles.roomCol}>
                            <View style={styles.roomBadgeRow}>
                              <View style={[styles.roomNumberTag, { backgroundColor: isDark ? "rgba(79,70,229,0.2)" : "#EEF2FF" }]}>
                                <Ionicons name="bed" size={13} color="#4F46E5" style={{ marginRight: 4 }} />
                                <Text style={styles.roomNumberTagText}>Room {st.roomNo}</Text>
                              </View>
                              <Text style={[styles.bedText, { color: colors.adminTextSecondary }]}>
                                {st.bedNo}
                              </Text>
                            </View>

                            {/* Room Strength Pill */}
                            <View style={styles.roomStrengthPillRow}>
                              <View
                                style={[
                                  styles.strengthIndicator,
                                  { backgroundColor: isFull ? "#DCFCE7" : "#EFF6FF" },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.strengthIndicatorText,
                                    { color: isFull ? "#16A34A" : "#2563EB" },
                                  ]}
                                >
                                  Strength: {st.roomStrength} Beds ({isFull ? "Full" : "Available"})
                                </Text>
                              </View>
                              <Text style={[styles.floorText, { color: colors.adminTextSecondary }]}>
                                {st.floor}
                              </Text>
                            </View>
                          </View>

                          {/* Past 5 Days Mini History Streak */}
                          <View style={styles.streakCol}>
                            <Text style={[styles.streakLabel, { color: colors.adminTextSecondary }]}>Recent Streak</Text>
                            <View style={styles.streakDotsRow}>
                              {recentDays.slice(-5).map((d) => {
                                const stt = st.attendance?.[d.dateStr] || "Present";
                                const bg =
                                  stt === "Present"
                                    ? "#10B981"
                                    : stt === "Absent"
                                    ? "#EF4444"
                                    : stt === "Leave"
                                    ? "#F59E0B"
                                    : "#6366F1";
                                return (
                                  <View key={d.dateStr} style={[styles.streakDot, { backgroundColor: bg }]} />
                                );
                              })}
                            </View>
                          </View>

                          {/* Day Attendance Status Toggle Button */}
                          <TouchableOpacity
                            style={[
                              styles.attStatusToggleBtn,
                              { backgroundColor: badge.bg, borderColor: badge.text },
                            ]}
                            activeOpacity={0.75}
                            onPress={() => handleToggleStudentAttendance(st)}
                          >
                            <Ionicons name={badge.icon as any} size={15} color={badge.text} style={{ marginRight: 5 }} />
                            <Text style={[styles.attStatusToggleBtnText, { color: badge.text }]}>
                              {todayStatus}
                            </Text>
                          </TouchableOpacity>

                          {/* Quick Edit / Vacate Menu */}
                          <View style={styles.rowActions}>
                            <TouchableOpacity
                              style={styles.iconActionBtn}
                              onPress={() => openEditStudentModal(st)}
                            >
                              <Ionicons name="create-outline" size={17} color={colors.adminTextSecondary} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={styles.iconActionBtn}
                              onPress={() => handleVacateStudent(st)}
                            >
                              <Ionicons name="trash-outline" size={17} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </View>
            )}

            {/* ===================================================== */}
            {/* TAB 3: ROOMS & STRENGTH DIRECTORY */}
            {/* ===================================================== */}
            {activeMainTab === "rooms" && (
              <View>
                <View style={[styles.roomsHeaderCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                  <View>
                    <Text style={[styles.sectionTitle, { color: colors.adminText }]}>
                      {activeBlock.name} — Room Strength & Occupancy
                    </Text>
                    <Text style={[styles.emptySub, { color: colors.adminTextSecondary }]}>
                      Live room capacities, occupied beds, and assigned resident students
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.allocateBtn, { backgroundColor: "#4F46E5" }]}
                    onPress={() => setAllocateModal(true)}
                  >
                    <Ionicons name="add" size={16} color="#FFFFFF" style={{ marginRight: 4 }} />
                    <Text style={styles.allocateBtnText}>+ Allocate Room</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.roomCardsGrid}>
                  {roomSummaries.map((room) => {
                    const occPercent = Math.round((room.occupiedBeds / room.roomStrength) * 100);

                    return (
                      <View
                        key={room.roomNo}
                        style={[styles.roomCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}
                      >
                        <View style={styles.roomCardTop}>
                          <View>
                            <Text style={[styles.roomCardTitle, { color: colors.adminText }]}>Room {room.roomNo}</Text>
                            <Text style={[styles.roomCardFloor, { color: colors.adminTextSecondary }]}>{room.floor}</Text>
                          </View>
                          <View
                            style={[
                              styles.roomStrengthBadge,
                              { backgroundColor: room.isFull ? "#DCFCE7" : "#EFF6FF" },
                            ]}
                          >
                            <Text
                              style={[
                                styles.roomStrengthBadgeText,
                                { color: room.isFull ? "#16A34A" : "#2563EB" },
                              ]}
                            >
                              {room.isFull ? "Full" : `${room.vacantBeds} Bed Vacant`}
                            </Text>
                          </View>
                        </View>

                        {/* Room Strength Info */}
                        <View style={styles.roomMetricRow}>
                          <Text style={[styles.metricLabel, { color: colors.adminTextSecondary }]}>Room Strength:</Text>
                          <Text style={[styles.metricVal, { color: colors.adminText }]}>{room.roomStrength} Beds</Text>
                        </View>
                        <View style={styles.roomMetricRow}>
                          <Text style={[styles.metricLabel, { color: colors.adminTextSecondary }]}>Occupied:</Text>
                          <Text style={[styles.metricVal, { color: "#4F46E5" }]}>
                            {room.occupiedBeds} / {room.roomStrength} ({occPercent}%)
                          </Text>
                        </View>

                        {/* Progress Bar */}
                        <View style={[styles.roomProgressBarBg, { backgroundColor: colors.adminSurfaceAlt }]}>
                          <View
                            style={[
                              styles.roomProgressBarFill,
                              {
                                width: `${Math.min(100, occPercent)}%`,
                                backgroundColor: room.isFull ? "#10B981" : "#4F46E5",
                              },
                            ]}
                          />
                        </View>

                        {/* Residents in this room */}
                        <Text style={[styles.residentsHeading, { color: colors.adminTextSecondary }]}>Assigned Residents:</Text>
                        <View style={styles.residentsList}>
                          {room.students.map((st) => {
                            const att = st.attendance?.[selectedDate] || "Present";
                            const attB = getAttendanceBadge(att);

                            return (
                              <View key={st.id} style={styles.roomResidentItem}>
                                <View style={{ flex: 1 }}>
                                  <Text style={[styles.residentName, { color: colors.adminText }]}>
                                    {st.studentName} ({st.bedNo})
                                  </Text>
                                  <Text style={[styles.residentRoll, { color: colors.adminTextSecondary }]}>
                                    {st.rollNo} • {st.department}
                                  </Text>
                                </View>
                                <View style={[styles.miniAttBadge, { backgroundColor: attB.bg }]}>
                                  <Text style={[styles.miniAttBadgeText, { color: attB.text }]}>{att}</Text>
                                </View>
                              </View>
                            );
                          })}
                        </View>
                      </View>
                    );
                  })}
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* ===================================================== */}
      {/* ALLOCATE STUDENT TO ROOM MODAL */}
      {/* ===================================================== */}
      <Modal visible={allocateModal} transparent animationType="fade" onRequestClose={() => setAllocateModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setAllocateModal(false)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.adminText }]}>Allocate Student to Room</Text>
                <Text style={[styles.modalSub, { color: colors.adminTextSecondary }]}>
                  Assign room and bed in {activeBlock.name}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAllocateModal(false)}>
                <Ionicons name="close" size={22} color={colors.adminTextSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
              <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Student Full Name *</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                placeholder="e.g. Rahul Sharma"
                placeholderTextColor={colors.adminTextSecondary}
                value={newStudentName}
                onChangeText={setNewStudentName}
              />

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Roll No *</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                    placeholder="23CSE045"
                    placeholderTextColor={colors.adminTextSecondary}
                    value={newRollNo}
                    onChangeText={setNewRollNo}
                    autoCapitalize="characters"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Department</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                    value={newDept}
                    onChangeText={setNewDept}
                  />
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Room No *</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                    placeholder="A-101"
                    placeholderTextColor={colors.adminTextSecondary}
                    value={newRoomNo}
                    onChangeText={setNewRoomNo}
                    autoCapitalize="characters"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Floor</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                    value={newFloor}
                    onChangeText={setNewFloor}
                  />
                </View>
              </View>

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Bed No</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                    value={newBedNo}
                    onChangeText={setNewBedNo}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Room Strength (Total Beds)</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                    keyboardType="numeric"
                    value={newRoomStrength}
                    onChangeText={setNewRoomStrength}
                  />
                </View>
              </View>

              <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Room Sharing Type</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                value={newRoomType}
                onChangeText={setNewRoomType}
              />
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.adminCardBorder }]}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.adminSurfaceAlt }]}
                onPress={() => setAllocateModal(false)}
                disabled={allocatingStudent}
              >
                <Text style={[styles.modalCancelText, { color: colors.adminTextSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleAllocateStudent}
                disabled={allocatingStudent}
              >
                {allocatingStudent ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>Allocate Bed</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ===================================================== */}
      {/* EDIT STUDENT ROOM MODAL */}
      {/* ===================================================== */}
      <Modal visible={Boolean(editingStudent)} transparent animationType="fade" onRequestClose={() => setEditingStudent(null)}>
        <Pressable style={styles.modalOverlay} onPress={() => setEditingStudent(null)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}
            onPress={(e) => e.stopPropagation()}
          >
            {editingStudent && (
              <>
                <View style={styles.modalHeader}>
                  <View>
                    <Text style={[styles.modalTitle, { color: colors.adminText }]}>
                      Edit Allocation: {editingStudent.studentName}
                    </Text>
                    <Text style={[styles.modalSub, { color: colors.adminTextSecondary }]}>
                      {editingStudent.rollNo} • {editingStudent.department}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setEditingStudent(null)}>
                    <Ionicons name="close" size={22} color={colors.adminTextSecondary} />
                  </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Room No</Text>
                      <TextInput
                        style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                        value={editingStudent.roomNo}
                        onChangeText={(t) => setEditingStudent((p) => p && { ...p, roomNo: t })}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Bed No</Text>
                      <TextInput
                        style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                        value={editingStudent.bedNo}
                        onChangeText={(t) => setEditingStudent((p) => p && { ...p, bedNo: t })}
                      />
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Room Strength (Beds)</Text>
                      <TextInput
                        style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                        keyboardType="numeric"
                        value={String(editingStudent.roomStrength)}
                        onChangeText={(t) =>
                          setEditingStudent((p) => p && { ...p, roomStrength: parseInt(t) || 2 })
                        }
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Floor</Text>
                      <TextInput
                        style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                        value={editingStudent.floor}
                        onChangeText={(t) => setEditingStudent((p) => p && { ...p, floor: t })}
                      />
                    </View>
                  </View>
                </ScrollView>

                <View style={[styles.modalFooter, { borderTopColor: colors.adminCardBorder }]}>
                  <TouchableOpacity
                    style={[styles.modalCancelBtn, { backgroundColor: colors.adminSurfaceAlt }]}
                    onPress={() => setEditingStudent(null)}
                    disabled={savingStudentEdit}
                  >
                    <Text style={[styles.modalCancelText, { color: colors.adminTextSecondary }]}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.modalSubmitBtn}
                    onPress={handleSaveStudentEdit}
                    disabled={savingStudentEdit}
                  >
                    {savingStudentEdit ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalSubmitText}>Save Changes</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>

      {/* ===================================================== */}
      {/* LOG INSPECTION / COMPLAINT MODAL */}
      {/* ===================================================== */}
      <Modal visible={complaintModal} transparent animationType="fade" onRequestClose={() => setComplaintModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setComplaintModal(false)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.adminText }]}>Register Hostel Inspection Note</Text>
                <Text style={[styles.modalSub, { color: colors.adminTextSecondary }]}>
                  Log maintenance or student issue into Firebase & Backend
                </Text>
              </View>
              <TouchableOpacity onPress={() => setComplaintModal(false)}>
                <Ionicons name="close" size={22} color={colors.adminTextSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
              <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Issue Category</Text>
              <View style={styles.categoryPillsRow}>
                {COMPLAINT_CATEGORIES.map((cat) => {
                  const isSel = formCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.catPill,
                        {
                          backgroundColor: isSel ? "#4F46E5" : colors.adminSurfaceAlt,
                          borderColor: isSel ? "#4F46E5" : colors.adminCardBorder,
                        },
                      ]}
                      onPress={() => setFormCategory(cat)}
                    >
                      <Text style={[styles.catPillText, { color: isSel ? "#FFFFFF" : colors.adminTextSecondary }]}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Title / Summary *</Text>
              <TextInput
                style={[
                  styles.modalInput,
                  { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText },
                ]}
                placeholder="e.g. Block B - Geyser Heating Issue"
                placeholderTextColor={colors.adminTextSecondary}
                value={formTitle}
                onChangeText={setFormTitle}
              />

              <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Location / Room No *</Text>
              <TextInput
                style={[
                  styles.modalInput,
                  { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText },
                ]}
                placeholder="e.g. Room 204 or 3rd Floor Corridor"
                placeholderTextColor={colors.adminTextSecondary}
                value={formLocation}
                onChangeText={setFormLocation}
              />

              <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Assign Staff</Text>
              <View style={styles.categoryPillsRow}>
                {STAFF_OPTIONS.map((st) => {
                  const isSel = formStaff === st;
                  return (
                    <TouchableOpacity
                      key={st}
                      style={[
                        styles.catPill,
                        {
                          backgroundColor: isSel ? "#10B981" : colors.adminSurfaceAlt,
                          borderColor: isSel ? "#10B981" : colors.adminCardBorder,
                        },
                      ]}
                      onPress={() => setFormStaff(st)}
                    >
                      <Text style={[styles.catPillText, { color: isSel ? "#FFFFFF" : colors.adminTextSecondary }]}>
                        {st}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Description & Notes</Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    height: 80,
                    textAlignVertical: "top",
                    backgroundColor: colors.adminInputBg,
                    borderColor: colors.adminInputBorder,
                    color: colors.adminText,
                  },
                ]}
                placeholder="Describe maintenance or complaint details..."
                placeholderTextColor={colors.adminTextSecondary}
                multiline
                value={formDescription}
                onChangeText={setFormDescription}
              />
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.adminCardBorder }]}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.adminSurfaceAlt }]}
                onPress={() => setComplaintModal(false)}
                disabled={submittingComplaint}
              >
                <Text style={[styles.modalCancelText, { color: colors.adminTextSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleRegisterComplaint}
                disabled={submittingComplaint}
              >
                {submittingComplaint ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>Submit Inspection</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ===================================================== */}
      {/* EDIT BLOCK DETAILS MODAL */}
      {/* ===================================================== */}
      <Modal visible={editBlockModal} transparent animationType="fade" onRequestClose={() => setEditBlockModal(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setEditBlockModal(false)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.adminText }]}>Edit {activeBlock.name}</Text>
                <Text style={[styles.modalSub, { color: colors.adminTextSecondary }]}>
                  Updates capacity, wardens, and contacts in live database
                </Text>
              </View>
              <TouchableOpacity onPress={() => setEditBlockModal(false)}>
                <Ionicons name="close" size={22} color={colors.adminTextSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 450 }}>
              <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Block Name</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                value={editBlockName}
                onChangeText={setEditBlockName}
              />

              <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Floors & Rooms Summary</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                value={editFloors}
                onChangeText={setEditFloors}
              />

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Total Capacity (Beds)</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                    keyboardType="numeric"
                    value={editCapacity}
                    onChangeText={setEditCapacity}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Occupied (Beds)</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                    keyboardType="numeric"
                    value={editOccupied}
                    onChangeText={setEditOccupied}
                  />
                </View>
              </View>

              <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Chief Warden Name</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                value={editWardenName}
                onChangeText={setEditWardenName}
              />

              <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Warden Contact Phone</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                value={editWardenPhone}
                onChangeText={setEditWardenPhone}
              />

              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Security Desk</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                    value={editSecurityName}
                    onChangeText={setEditSecurityName}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Extension</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                    value={editSecurityPhone}
                    onChangeText={setEditSecurityPhone}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.adminCardBorder }]}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.adminSurfaceAlt }]}
                onPress={() => setEditBlockModal(false)}
                disabled={savingBlock}
              >
                <Text style={[styles.modalCancelText, { color: colors.adminTextSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalSubmitBtn} onPress={handleSaveBlock} disabled={savingBlock}>
                {savingBlock ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ===================================================== */}
      {/* COMPLAINT DETAILS & RESOLUTION MODAL */}
      {/* ===================================================== */}
      <Modal
        visible={Boolean(selectedComplaint)}
        transparent
        animationType="fade"
        onRequestClose={() => setSelectedComplaint(null)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setSelectedComplaint(null)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}
            onPress={(e) => e.stopPropagation()}
          >
            {selectedComplaint && (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1, marginRight: 10 }}>
                    <Text style={[styles.modalTitle, { color: colors.adminText }]}>{selectedComplaint.title}</Text>
                    <Text style={[styles.modalSub, { color: colors.adminTextSecondary }]}>
                      {selectedComplaint.location} • {selectedComplaint.category}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelectedComplaint(null)}>
                    <Ionicons name="close" size={22} color={colors.adminTextSecondary} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.detailBox, { backgroundColor: colors.adminSurfaceAlt, borderColor: colors.adminCardBorder }]}>
                  <Text style={[styles.detailText, { color: colors.adminText }]}>
                    {selectedComplaint.description || "No extra description provided."}
                  </Text>
                  <View style={styles.detailMetaRow}>
                    <Text style={[styles.detailMetaText, { color: colors.adminTextSecondary }]}>
                      Reported by: <Text style={{ fontWeight: "700", color: colors.adminText }}>{selectedComplaint.studentName}</Text>
                    </Text>
                    <Text style={[styles.detailMetaText, { color: colors.adminTextSecondary }]}>
                      Staff: <Text style={{ fontWeight: "700", color: "#4F46E5" }}>{selectedComplaint.assignedStaff || "Unassigned"}</Text>
                    </Text>
                  </View>
                </View>

                <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary, marginTop: 16 }]}>Update Status</Text>
                <View style={styles.statusOptionsRow}>
                  {(["Pending", "In Progress", "Resolved"] as const).map((st) => {
                    const isSel = selectedComplaint.status === st;
                    const badge = getStatusBadgeStyle(st);
                    return (
                      <TouchableOpacity
                        key={st}
                        style={[
                          styles.statusSelectBtn,
                          {
                            backgroundColor: isSel ? badge.bg : colors.adminSurfaceAlt,
                            borderColor: isSel ? badge.text : colors.adminCardBorder,
                          },
                        ]}
                        onPress={() => handleSetModalStatus(st)}
                        disabled={updatingStatus}
                      >
                        <Text style={[styles.statusSelectBtnText, { color: isSel ? badge.text : colors.adminTextSecondary }]}>
                          {st}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={[styles.modalFooter, { borderTopColor: colors.adminCardBorder, marginTop: 20 }]}>
                  <TouchableOpacity
                    style={[styles.modalSubmitBtn, { backgroundColor: "#4F46E5" }]}
                    onPress={() => setSelectedComplaint(null)}
                  >
                    <Text style={styles.modalSubmitText}>Done</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2A174E",
  },
  mainLayout: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
  },
  contentArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  scrollContent: {
    padding: 24,
  },
  mainTabSwitchRow: {
    flexDirection: "row",
    borderRadius: 12,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
    gap: 6,
    flexWrap: "wrap",
  },
  mainTabSwitchBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
    gap: 8,
  },
  mainTabSwitchBtnActive: {
    backgroundColor: "#4F46E5",
  },
  mainTabSwitchText: {
    fontSize: 13,
    fontWeight: "600",
  },
  blockTabsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  blockTabBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
  },
  blockTabText: {
    fontSize: 13,
  },
  editBlockHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginLeft: "auto",
  },
  editBlockHeaderBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4F46E5",
  },
  heroCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 20,
    alignItems: "center",
    gap: 16,
  },
  heroImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
    backgroundColor: "#E2E8F0",
  },
  heroDetails: {
    flex: 1,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  activeBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  activeBadgeText: {
    fontSize: 11,
    color: "#059669",
    fontWeight: "700",
  },
  heroRoom: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  heroBlock: {
    fontSize: 12,
    color: "#4F46E5",
    fontWeight: "600",
    marginTop: 4,
  },
  infoCardsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  infoCard: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  infoLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 4,
  },
  contactsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  contactCard: {
    flex: 1,
    minWidth: 240,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 14,
  },
  contactIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  contactRole: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  contactName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 1,
  },
  contactPhone: {
    fontSize: 12,
    color: "#4F46E5",
    marginTop: 2,
  },
  complaintsContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  addComplaintBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  addComplaintText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4F46E5",
  },
  complaintItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 12,
  },
  complaintIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  complaintTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  complaintSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  statusChip: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  statusChipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  emptyContainer: {
    paddingVertical: 30,
    alignItems: "center",
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginTop: 8,
  },
  emptySub: {
    fontSize: 12,
    marginTop: 2,
  },
  // Day-wise Attendance Specific Styles
  dateSelectorCard: {
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    marginBottom: 16,
  },
  dateSelectorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  dateCardTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  activeDateLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  dayPillStrip: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  dayPillBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    minWidth: 64,
  },
  dayPillDay: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  dayPillDate: {
    fontSize: 16,
    marginTop: 2,
  },
  todayDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    marginTop: 4,
  },
  attStatsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  attStatBox: {
    flex: 1,
    minWidth: 120,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  attStatLabel: {
    fontSize: 12,
    fontWeight: "700",
  },
  attStatVal: {
    fontSize: 22,
    fontWeight: "900",
    marginVertical: 4,
  },
  attStatSub: {
    fontSize: 11,
  },
  attActionsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  markAllPresentBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  markAllPresentText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  allocateBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
  },
  allocateBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  studentTableCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  tableHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    flexWrap: "wrap",
    gap: 8,
  },
  tableHeaderHint: {
    fontSize: 11,
    fontStyle: "italic",
  },
  studentRowItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    gap: 16,
    flexWrap: "wrap",
  },
  studentInfoCol: {
    flexDirection: "row",
    alignItems: "center",
    minWidth: 180,
    flex: 2,
    gap: 12,
  },
  studentAvatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  studentAvatarInitials: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  studentNameText: {
    fontSize: 14,
    fontWeight: "700",
  },
  studentRollText: {
    fontSize: 12,
    marginTop: 2,
  },
  roomCol: {
    flex: 2,
    minWidth: 180,
  },
  roomBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  roomNumberTag: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  roomNumberTagText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#4F46E5",
  },
  bedText: {
    fontSize: 12,
    fontWeight: "600",
  },
  roomStrengthPillRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 4,
  },
  strengthIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  strengthIndicatorText: {
    fontSize: 11,
    fontWeight: "700",
  },
  floorText: {
    fontSize: 11,
  },
  streakCol: {
    minWidth: 90,
    alignItems: "center",
  },
  streakLabel: {
    fontSize: 10,
    marginBottom: 4,
  },
  streakDotsRow: {
    flexDirection: "row",
    gap: 4,
  },
  streakDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  attStatusToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 95,
    justifyContent: "center",
  },
  attStatusToggleBtnText: {
    fontSize: 12,
    fontWeight: "800",
  },
  rowActions: {
    flexDirection: "row",
    gap: 6,
  },
  iconActionBtn: {
    padding: 6,
  },
  // Rooms Directory Grid
  roomsHeaderCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  roomCardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  roomCard: {
    flex: 1,
    minWidth: 280,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  roomCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  roomCardTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  roomCardFloor: {
    fontSize: 12,
    marginTop: 2,
  },
  roomStrengthBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roomStrengthBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  roomMetricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginVertical: 2,
  },
  metricLabel: {
    fontSize: 12,
  },
  metricVal: {
    fontSize: 12,
    fontWeight: "700",
  },
  roomProgressBarBg: {
    height: 6,
    borderRadius: 3,
    marginVertical: 8,
    overflow: "hidden",
  },
  roomProgressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  residentsHeading: {
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    marginTop: 8,
    marginBottom: 6,
  },
  residentsList: {
    gap: 6,
  },
  roomResidentItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  residentName: {
    fontSize: 12,
    fontWeight: "700",
  },
  residentRoll: {
    fontSize: 10,
    marginTop: 1,
  },
  miniAttBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  miniAttBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  // Modal Common Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    elevation: 8,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalSub: {
    fontSize: 12,
    marginTop: 2,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
    marginTop: 8,
  },
  categoryPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  catPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  catPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    padding: 10,
    fontSize: 13,
    color: "#0F172A",
    marginBottom: 10,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    paddingTop: 16,
    borderTopWidth: 1,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  modalSubmitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center",
  },
  modalSubmitText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  detailBox: {
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 8,
  },
  detailText: {
    fontSize: 13,
    lineHeight: 18,
  },
  detailMetaRow: {
    marginTop: 10,
    flexDirection: "row",
    justifyContent: "space-between",
  },
  detailMetaText: {
    fontSize: 11,
  },
  statusOptionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6,
  },
  statusSelectBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  statusSelectBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
});