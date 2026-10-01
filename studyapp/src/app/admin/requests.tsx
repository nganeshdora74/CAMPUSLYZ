import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
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
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { auth, db } from "../../firebase/config";
import { confirmAction, confirmLogout } from "../../firebase/auth";
import { useAppTheme } from "../../context/ThemeContext";
import AdminThemeToggle from "../../components/admin/AdminThemeToggle";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTopBar from "../../components/admin/AdminTopBar";
import {
  pickPdfDocument,
  shareOrDownloadPdf,
  uploadRequestFile,
} from "../../services/certificatePdfService";

// =====================================================
// SIDEBAR NAVIGATION ITEMS
// =====================================================
const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "home", route: "/admin" },
  { id: "students", label: "Students", icon: "person", route: "/admin/student" },
  { id: "faculty", label: "Faculty", icon: "people", route: "/admin/faculty" },
  { id: "academics", label: "Academics", icon: "book", route: "/admin/academics" },
  { id: "schedule", label: "Schedule", icon: "calendar", route: "/admin/schedule" },
  { id: "attendance", label: "Attendance", icon: "checkbox", route: "/admin/attendence" },
  { id: "certificates", label: "Certificates", icon: "ribbon", route: "/admin/certificate" },
  { id: "hostel", label: "Hostel", icon: "business", route: "/admin/hostel" },
  { id: "mess", label: "Mess", icon: "restaurant", route: "/admin/mess" },
  { id: "fees", label: "Fees", icon: "wallet", route: "/admin/fees" },
  { id: "notices", label: "Notices", icon: "megaphone", route: "/admin/notices" },
  { id: "requests", label: "Requests", icon: "document-text", route: "/admin/requests" },
  { id: "reports", label: "Reports", icon: "bar-chart", route: "/admin/reports" },
  { id: "ai-assistant", label: "AI Assistant", icon: "sparkles", route: "/admin/ai-assistant" },
  { id: "settings", label: "Settings", icon: "settings", route: "/admin/settings" },
  { id: "profile", label: "Profile", icon: "person-circle", route: "/admin/profile" },
];

const STATUS_FILTERS = ["All", "Pending", "Approved", "In Progress", "Resolved", "Rejected"];
const CATEGORIES = [
  "Leave",
  "Gate Pass",
  "Academic",
  "Attendance",
  "Fees",
  "Hostel",
  "Mess",
  "Examination",
  "Documents",
  "Technical",
  "Transport",
  "Library",
  "Other",
];
const PRIORITIES = ["Low", "Normal", "High", "Urgent"];

export type AuditEvent = {
  time: string;
  actor?: string;
  action?: string;
  description?: string;
};

export type RequestItem = {
  id: string;
  complaintId?: string;
  requesterId?: string;
  requesterName?: string;
  requesterEmail?: string;
  requesterRole?: string;
  rollNo?: string;
  department?: string;
  semester?: string;
  title?: string;
  description?: string;
  category?: string;
  subCategory?: string;
  location?: string;
  passType?: "leave" | "gate";
  priority?: string;
  status?: string;
  assignedTo?: string;
  resolvedDate?: string;
  auditTrail?: AuditEvent[];
  // Leave & Gate pass specifics
  fromDate?: string;
  toDate?: string;
  date?: string;
  outTime?: string;
  returnTime?: string;
  destination?: string;
  contactNumber?: string;
  // Student attached hardcopy
  photoUrl?: string;
  pdfUrl?: string;
  pdfName?: string;
  // Admin answer & attached hardcopy
  adminComment?: string;
  adminPhotoUrl?: string;
  adminPdfUrl?: string;
  adminPdfName?: string;
  createdAt?: any;
  updatedAt?: any;
};

export default function AdminRequestsScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const { isDark, colors } = useAppTheme();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [requests, setRequests] = useState<RequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All");

  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingRequest, setEditingRequest] = useState<RequestItem | null>(null);

  // Admin Response states
  const [adminReplyText, setAdminReplyText] = useState("");
  const [adminStatus, setAdminStatus] = useState("In Progress");
  const [adminAssignedTo, setAdminAssignedTo] = useState("");
  const [adminPhotoUrl, setAdminPhotoUrl] = useState("");
  const [adminPhotoName, setAdminPhotoName] = useState("");
  const [adminPdfUrl, setAdminPdfUrl] = useState("");
  const [adminPdfName, setAdminPdfName] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  useEffect(() => {
    try {
      const requestsQuery = query(
        collection(db, "requests"),
        orderBy("createdAt", "desc")
      );

      const unsubscribe = onSnapshot(
        requestsQuery,
        (snapshot) => {
          const data: RequestItem[] = snapshot.docs.map((item) => ({
            id: item.id,
            ...(item.data() as Omit<RequestItem, "id">),
          }));

          setRequests(data);
          setLoading(false);
        },
        (error) => {
          console.warn("Requests listener warning:", error);
          setRequests([]);
          setLoading(false);
        }
      );

      return unsubscribe;
    } catch (e) {
      console.warn("Requests subscription error:", e);
      setLoading(false);
    }
  }, []);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();

    return requests.filter((item) => {
      const matchesStatus =
        filterStatus === "All" || item.status === filterStatus;

      const matchesSearch =
        !q ||
        (item.title && item.title.toLowerCase().includes(q)) ||
        (item.requesterName && item.requesterName.toLowerCase().includes(q)) ||
        (item.rollNo && item.rollNo.toLowerCase().includes(q)) ||
        (item.category && item.category.toLowerCase().includes(q)) ||
        (item.department && item.department.toLowerCase().includes(q));

      return matchesStatus && matchesSearch;
    });
  }, [requests, search, filterStatus]);

  // Dynamic counts
  const pendingCount = requests.filter((r) => r.status === "Pending").length;
  const inProgressCount = requests.filter((r) => r.status === "In Progress").length;
  const resolvedCount = requests.filter((r) => r.status === "Resolved").length;

  const openResponseModal = (item: RequestItem) => {
    setEditingRequest(item);
    setAdminReplyText(item.adminComment || "");
    setAdminStatus(item.status || "In Progress");
    setAdminAssignedTo(item.assignedTo || "");
    setAdminPhotoUrl(item.adminPhotoUrl || "");
    setAdminPhotoName(item.adminPhotoUrl ? "Attached Response Photo" : "");
    setAdminPdfUrl(item.adminPdfUrl || "");
    setAdminPdfName(item.adminPdfName || (item.adminPdfUrl ? "Official_Response.pdf" : ""));
    setModalVisible(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalVisible(false);
    setEditingRequest(null);
  };

  const handlePickAdminPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission", "Please allow gallery access to attach photo.");
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        quality: 0.85,
      });
      if (!res.canceled && res.assets?.[0]?.uri) {
        setAdminPhotoUrl(res.assets[0].uri);
        setAdminPhotoName(res.assets[0].fileName || "response_photo.jpg");
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not select photo.");
    }
  };

  const handleTakeAdminPhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission", "Please allow camera access.");
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.85,
      });
      if (!res.canceled && res.assets?.[0]?.uri) {
        setAdminPhotoUrl(res.assets[0].uri);
        setAdminPhotoName("camera_response.jpg");
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not capture image.");
    }
  };

  const handlePickAdminPdf = async () => {
    try {
      const doc = await pickPdfDocument();
      if (doc) {
        setAdminPdfUrl(doc.uri);
        setAdminPdfName(doc.name);
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not select PDF.");
    }
  };

  const handleQuickApprove = async (item: RequestItem) => {
    try {
      const nowTime = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      const newTrail = [
        ...(item.auditTrail || [{ time: "10:15 AM", actor: "Student", action: "Submitted request" }]),
        { time: nowTime, actor: "Admin", action: "Admin approved request" },
      ];
      await updateDoc(doc(db, "requests", item.id), {
        status: "Approved",
        auditTrail: newTrail,
        updatedAt: serverTimestamp(),
      });
      Alert.alert("Approved ✅", `Request ${item.complaintId || item.id} approved.`);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to approve.");
    }
  };

  const handleQuickReject = async (item: RequestItem) => {
    try {
      const nowTime = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      const newTrail = [
        ...(item.auditTrail || [{ time: "10:15 AM", actor: "Student", action: "Submitted request" }]),
        { time: nowTime, actor: "Admin", action: "Admin rejected request" },
      ];
      await updateDoc(doc(db, "requests", item.id), {
        status: "Rejected",
        auditTrail: newTrail,
        updatedAt: serverTimestamp(),
      });
      Alert.alert("Rejected ❌", `Request ${item.complaintId || item.id} rejected.`);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to reject.");
    }
  };

  const handleQuickAssign = async (item: RequestItem, staff: string) => {
    try {
      const nowTime = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      const newTrail = [
        ...(item.auditTrail || [{ time: "10:15 AM", actor: "Student", action: "Submitted complaint" }]),
        { time: nowTime, actor: "Admin", action: `Admin assigned ${staff}` },
        { time: nowTime, actor: "Staff", action: `Staff accepted request` },
        { time: nowTime, actor: "Staff", action: `Status → In Progress` },
      ];
      await updateDoc(doc(db, "requests", item.id), {
        status: "In Progress",
        assignedTo: staff,
        assignedStaff: staff,
        auditTrail: newTrail,
        updatedAt: serverTimestamp(),
      });
      Alert.alert("Staff Assigned 🛠️", `Assigned ${staff} to ${item.complaintId || item.title}.`);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to assign staff.");
    }
  };

  const handleQuickResolve = async (item: RequestItem) => {
    try {
      const nowTime = new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      const nowDate = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      const newTrail = [
        ...(item.auditTrail || [{ time: "10:15 AM", actor: "Student", action: "Submitted complaint" }]),
        { time: nowTime, actor: "Staff", action: "Status → Resolved" },
      ];
      await updateDoc(doc(db, "requests", item.id), {
        status: "Resolved",
        resolvedDate: `${nowDate} ${nowTime}`,
        auditTrail: newTrail,
        updatedAt: serverTimestamp(),
      });
      Alert.alert("Resolved ✅", `Ticket marked Resolved. Student can now confirm resolution.`);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to resolve.");
    }
  };

  const handleSendResponse = async () => {
    if (!editingRequest) return;

    try {
      setSaving(true);
      let finalPhoto = adminPhotoUrl.trim();
      let finalPdf = adminPdfUrl.trim();

      if (finalPhoto && !finalPhoto.startsWith("http")) {
        setUploadStatus("Uploading official photo response...");
        try {
          finalPhoto = await uploadRequestFile(finalPhoto, "photo", editingRequest.id, "admin");
        } catch (photoErr: any) {
          console.warn("Photo upload fallback:", photoErr?.message);
        }
      }

      if (finalPdf && !finalPdf.startsWith("http")) {
        setUploadStatus("Uploading official PDF response...");
        try {
          finalPdf = await uploadRequestFile(finalPdf, "pdf", editingRequest.id, "admin");
        } catch (pdfErr: any) {
          console.warn("PDF upload fallback:", pdfErr?.message);
        }
      }

      setUploadStatus("Updating ticket in database...");

      const nowTime = new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      });
      const nowDate = new Date().toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      const updatedAuditTrail = [
        ...(editingRequest.auditTrail || [
          {
            time: "10:15 AM",
            actor: "Student",
            action: "Student submitted complaint",
          },
        ]),
      ];

      if (adminAssignedTo && adminAssignedTo !== editingRequest.assignedTo) {
        updatedAuditTrail.push({
          time: nowTime,
          actor: "Admin",
          action: `Admin assigned ${adminAssignedTo.trim()}`,
        });
        updatedAuditTrail.push({
          time: nowTime,
          actor: "Staff",
          action: `Staff accepted request`,
        });
      }

      if (adminStatus !== editingRequest.status) {
        updatedAuditTrail.push({
          time: nowTime,
          actor: adminStatus === "Approved" || adminStatus === "Rejected" ? "Admin" : "Staff",
          action: `Status → ${adminStatus}`,
        });
      }

      await updateDoc(doc(db, "requests", editingRequest.id), {
        status: adminStatus,
        assignedTo: adminAssignedTo.trim(),
        assignedStaff: adminAssignedTo.trim(),
        adminComment: adminReplyText.trim(),
        adminPhotoUrl: finalPhoto || undefined,
        adminPdfUrl: finalPdf || undefined,
        adminPdfName: adminPdfName || undefined,
        resolvedDate: adminStatus === "Resolved" ? `${nowDate} ${nowTime}` : editingRequest.resolvedDate,
        auditTrail: updatedAuditTrail,
        updatedAt: serverTimestamp(),
      });

      // Synchronize update to legacy leaveRequests / gatePassRequests if applicable
      if (editingRequest.category === "Leave" || editingRequest.passType === "leave") {
        try {
          const qLeaves = query(
            collection(db, "leaveRequests"),
            where("requestId", "==", editingRequest.id)
          );
          const snap = await getDocs(qLeaves);
          snap.forEach(async (d) => {
            await updateDoc(doc(db, "leaveRequests", d.id), {
              status: adminStatus,
              adminComment: adminReplyText.trim(),
              adminPhotoUrl: finalPhoto || undefined,
              adminPdfUrl: finalPdf || undefined,
              adminPdfName: adminPdfName || undefined,
            }).catch(() => {});
          });
        } catch (syncErr) {
          console.warn("Leave sync error:", syncErr);
        }
      } else if (editingRequest.category === "Gate Pass" || editingRequest.passType === "gate") {
        try {
          const qGates = query(
            collection(db, "gatePassRequests"),
            where("requestId", "==", editingRequest.id)
          );
          const snap = await getDocs(qGates);
          snap.forEach(async (d) => {
            await updateDoc(doc(db, "gatePassRequests", d.id), {
              status: adminStatus,
              adminComment: adminReplyText.trim(),
              adminPhotoUrl: finalPhoto || undefined,
              adminPdfUrl: finalPdf || undefined,
              adminPdfName: adminPdfName || undefined,
            }).catch(() => {});
          });
        } catch (syncErr) {
          console.warn("Gate pass sync error:", syncErr);
        }
      }

      // Add to activities log
      await addDoc(collection(db, "activities"), {
        title: `Request ${adminStatus}: ${editingRequest.title} (${editingRequest.requesterName})`,
        time: "Just now",
        user: "Admin",
        type: "request",
        createdAt: serverTimestamp(),
      });

      Alert.alert(
        "Response Sent! 📬",
        `Ticket #${editingRequest.id.slice(0, 6)} updated to "${adminStatus}". Student can now see your reply and attached hardcopy.`
      );
      setModalVisible(false);
      setEditingRequest(null);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Could not send response.");
    } finally {
      setSaving(false);
      setUploadStatus("");
    }
  };

  const handleDelete = (item: RequestItem) => {
    confirmAction(
      "Delete Ticket",
      "Are you sure you want to remove this request ticket from Firebase?",
      async () => {
        try {
          await deleteDoc(doc(db, "requests", item.id));

          // Also clean up any linked leave/gate pass records
          if (item.category === "Leave" || item.passType === "leave") {
            const qLeaves = query(
              collection(db, "leaveRequests"),
              where("requestId", "==", item.id)
            );
            const snap = await getDocs(qLeaves).catch(() => null);
            if (snap && !snap.empty) {
              snap.forEach(async (d) => {
                await deleteDoc(doc(db, "leaveRequests", d.id)).catch(() => {});
              });
            }
          } else if (item.category === "Gate Pass" || item.passType === "gate") {
            const qGates = query(
              collection(db, "gatePassRequests"),
              where("requestId", "==", item.id)
            );
            const snap = await getDocs(qGates).catch(() => null);
            if (snap && !snap.empty) {
              snap.forEach(async (d) => {
                await deleteDoc(doc(db, "gatePassRequests", d.id)).catch(() => {});
              });
            }
          }

          Alert.alert("Deleted", "Ticket has been permanently removed.");
        } catch (e: any) {
          console.warn("Delete request error:", e);
          Alert.alert("Error", e?.message || "Could not delete ticket.");
        }
      },
      "Delete"
    );
  };

  const handleQuickStatus = async (item: RequestItem, nextStatus: string) => {
    try {
      await updateDoc(doc(db, "requests", item.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });

      // Synchronize quick status to legacy pass collections
      if (item.category === "Leave" || item.passType === "leave") {
        const qLeaves = query(
          collection(db, "leaveRequests"),
          where("requestId", "==", item.id)
        );
        const snap = await getDocs(qLeaves).catch(() => null);
        if (snap && !snap.empty) {
          snap.forEach(async (d) => {
            await updateDoc(doc(db, "leaveRequests", d.id), {
              status: nextStatus,
            }).catch(() => {});
          });
        }
      } else if (item.category === "Gate Pass" || item.passType === "gate") {
        const qGates = query(
          collection(db, "gatePassRequests"),
          where("requestId", "==", item.id)
        );
        const snap = await getDocs(qGates).catch(() => null);
        if (snap && !snap.empty) {
          snap.forEach(async (d) => {
            await updateDoc(doc(db, "gatePassRequests", d.id), {
              status: nextStatus,
            }).catch(() => {});
          });
        }
      }
    } catch (e: any) {
      console.warn("Status update error:", e);
      Alert.alert("Error", e?.message || "Could not update ticket status.");
    }
  };

  const handleLogout = () => {
    confirmLogout("Are you sure you want to sign out?");
  };

  // Helper styles for badges
  const getStatusStyle = (st?: string) => {
    switch (st) {
      case "Approved":
      case "Resolved":
        return { bg: "#ECFDF5", text: "#059669", border: "#A7F3D0" };
      case "Pending":
        return { bg: "#FEF3C7", text: "#D97706", border: "#FDE68A" };
      case "In Progress":
        return { bg: "#EFF6FF", text: "#2563EB", border: "#BFDBFE" };
      case "Rejected":
        return { bg: "#FEE2E2", text: "#DC2626", border: "#FECACA" };
      default:
        return { bg: "#F1F5F9", text: "#475569", border: "#E2E8F0" };
    }
  };

  const getPriorityStyle = (pr?: string) => {
    switch (pr) {
      case "Urgent":
        return { bg: "#FEE2E2", text: "#DC2626" };
      case "High":
        return { bg: "#FFEDD5", text: "#EA580C" };
      case "Normal":
        return { bg: "#E0E7FF", text: "#4F46E5" };
      case "Low":
        return { bg: "#F1F5F9", text: "#64748B" };
      default:
        return { bg: "#F1F5F9", text: "#64748B" };
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.adminSidebar }]}
      edges={["top", "left", "right"]}
    >
      <View style={[styles.mainLayout, { backgroundColor: colors.adminBg }]}>
        {/* Standardized Admin Sidebar */}
        <AdminSidebar
          activeNav="requests"
          isDesktop={isDesktop}
          mobileMenuOpen={mobileMenuOpen}
          onCloseMobileMenu={() => setMobileMenuOpen(false)}
        />

        {/* MAIN CONTENT */}
        <View style={[styles.contentArea, { backgroundColor: colors.adminBg }]}>
          {/* Standardized Top Bar */}
          <AdminTopBar
            showSearch={true}
            searchQuery={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search requests by title, student, department..."
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
          />

          {/* MAIN SCROLLABLE BODY */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* ACTION HEADER */}
            <View style={styles.headerSection}>
              <View>
                <Text style={[styles.pageTitle, { color: colors.adminText }]}>Requests & Grievances</Text>
                <Text style={[styles.pageSubtitle, { color: colors.adminTextSecondary }]}>
                  Review student requests, answer queries, and attach official hardcopy responses
                </Text>
              </View>
            </View>

            {/* KPI STATS CARDS */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { borderLeftColor: "#6366F1", backgroundColor: colors.adminCard }]}>
                <View style={[styles.statIconBox, { backgroundColor: isDark ? "#2E1065" : "#EEF2FF" }]}>
                  <Ionicons name="document-text" size={22} color="#6366F1" />
                </View>
                <View style={styles.statCol}>
                  <Text style={[styles.statLabel, { color: colors.adminTextSecondary }]}>Total Requests</Text>
                  <Text style={[styles.statValue, { color: colors.adminText }]}>{requests.length}</Text>
                </View>
              </View>

              <View style={[styles.statCard, { borderLeftColor: "#F59E0B", backgroundColor: colors.adminCard }]}>
                <View style={[styles.statIconBox, { backgroundColor: isDark ? "#431407" : "#FFFBEB" }]}>
                  <Ionicons name="time" size={22} color="#F59E0B" />
                </View>
                <View style={styles.statCol}>
                  <Text style={[styles.statLabel, { color: colors.adminTextSecondary }]}>Pending</Text>
                  <Text style={[styles.statValue, { color: colors.adminText }]}>{pendingCount}</Text>
                </View>
              </View>

              <View style={[styles.statCard, { borderLeftColor: "#3B82F6", backgroundColor: colors.adminCard }]}>
                <View style={[styles.statIconBox, { backgroundColor: isDark ? "#1E3A8A" : "#EFF6FF" }]}>
                  <Ionicons name="sync" size={22} color="#3B82F6" />
                </View>
                <View style={styles.statCol}>
                  <Text style={[styles.statLabel, { color: colors.adminTextSecondary }]}>In Progress</Text>
                  <Text style={[styles.statValue, { color: colors.adminText }]}>{inProgressCount}</Text>
                </View>
              </View>

              <View style={[styles.statCard, { borderLeftColor: "#10B981", backgroundColor: colors.adminCard }]}>
                <View style={[styles.statIconBox, { backgroundColor: isDark ? "#064E3B" : "#ECFDF5" }]}>
                  <Ionicons name="checkmark-done" size={22} color="#10B981" />
                </View>
                <View style={styles.statCol}>
                  <Text style={[styles.statLabel, { color: colors.adminTextSecondary }]}>Resolved</Text>
                  <Text style={[styles.statValue, { color: colors.adminText }]}>{resolvedCount}</Text>
                </View>
              </View>
            </View>

            {/* STATUS FILTER PILLS */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterTitle, { color: colors.adminText }]}>Status Filter:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterScroll}
              >
                {STATUS_FILTERS.map((st) => {
                  const active = filterStatus === st;
                  return (
                    <TouchableOpacity
                      key={st}
                      style={[
                        styles.filterChip,
                        active && styles.filterChipActive,
                        { backgroundColor: active ? "#4F46E5" : isDark ? "#1E293B" : "#E2E8F0" },
                      ]}
                      onPress={() => setFilterStatus(st)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          active && styles.filterChipTextActive,
                          !active && { color: isDark ? "#94A3B8" : "#475569" },
                        ]}
                      >
                        {st}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* TICKETS LIST */}
            {loading ? (
              <View style={styles.loaderBox}>
                <ActivityIndicator size="large" color="#5D3EBC" />
                <Text style={[styles.loadingText, { color: colors.adminTextSecondary }]}>Loading tickets...</Text>
              </View>
            ) : filteredRequests.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="folder-open-outline" size={54} color={colors.adminTextSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.adminText }]}>No Requests Found</Text>
                <Text style={[styles.emptySubtitle, { color: colors.adminTextSecondary }]}>
                  No tickets match the selected criteria. Student requests will appear here once submitted.
                </Text>
              </View>
            ) : (
              <View style={styles.requestsGrid}>
                {filteredRequests.map((item) => {
                  const stStyle = getStatusStyle(item.status);
                  const prStyle = getPriorityStyle(item.priority);

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.ticketCard,
                        { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder },
                      ]}
                    >
                      <View style={styles.ticketTopRow}>
                        <View style={styles.badgeGroup}>
                          <View
                            style={[
                              styles.statusBadge,
                              { backgroundColor: stStyle.bg, borderColor: stStyle.border },
                            ]}
                          >
                            <Text style={[styles.statusBadgeText, { color: stStyle.text }]}>
                              {item.status || "Pending"}
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.priorityBadge,
                              { backgroundColor: prStyle.bg },
                            ]}
                          >
                            <Text style={[styles.priorityBadgeText, { color: prStyle.text }]}>
                              {item.priority || "Normal"}
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.categoryBadge,
                              { backgroundColor: isDark ? "#1E293B" : "#F1F5F9" },
                            ]}
                          >
                            <Text
                              style={[
                                styles.categoryBadgeText,
                                { color: isDark ? "#94A3B8" : "#475569" },
                              ]}
                            >
                              {item.category || "General"}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.actionBtnsRow}>
                          <TouchableOpacity
                            style={[styles.iconBtn, { backgroundColor: isDark ? "#312E81" : "#EEF2FF" }]}
                            onPress={() => openResponseModal(item)}
                          >
                            <Ionicons name="chatbubbles-outline" size={17} color="#4F46E5" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.iconBtn, styles.deleteBtn]}
                            onPress={() => handleDelete(item)}
                          >
                            <Ionicons name="trash-outline" size={17} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>

                      <Text style={[styles.ticketTitle, { color: colors.adminText }]}>{item.title}</Text>
                      <Text style={[styles.ticketDesc, { color: colors.adminTextSecondary }]} numberOfLines={3}>
                        {item.description}
                      </Text>

                      {/* Requester Details */}
                      <View style={[styles.requesterBox, { backgroundColor: isDark ? "#162032" : "#F8FAFC" }]}>
                        <Ionicons name="person-circle-outline" size={18} color="#6366F1" />
                        <Text style={[styles.requesterName, { color: colors.adminText }]}>
                          {item.requesterName || "Unknown"}
                        </Text>
                        {!!item.rollNo && (
                          <Text style={[styles.requesterMeta, { color: colors.adminTextSecondary }]}>
                            • Roll: {item.rollNo}
                          </Text>
                        )}
                        {!!item.department && (
                          <Text style={[styles.requesterMeta, { color: colors.adminTextSecondary }]}>
                            ({item.department})
                          </Text>
                        )}
                      </View>

                      {/* Leave & Gate Pass Schedule Details */}
                      {(!!item.fromDate || !!item.date || !!item.outTime || item.category === "Leave" || item.category === "Gate Pass" || !!item.passType) && (
                        <View
                          style={[
                            styles.leaveGateInfoBox,
                            {
                              backgroundColor: isDark ? "#1E1E2D" : "#EEF2FF",
                              borderColor: isDark ? "#312E81" : "#C7D2FE",
                            },
                          ]}
                        >
                          {item.category === "Leave" || item.passType === "leave" || !!item.fromDate ? (
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                              <Ionicons name="airplane" size={14} color="#4F46E5" />
                              <Text style={[styles.leaveGateInfoText, { color: isDark ? "#C7D2FE" : "#3730A3" }]}>
                                Leave Duration: <Text style={{ fontWeight: "700" }}>{item.fromDate || "N/A"} → {item.toDate || "N/A"}</Text>
                              </Text>
                            </View>
                          ) : (
                            <View style={{ gap: 4 }}>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                <Ionicons name="exit-outline" size={14} color="#7C3AED" />
                                <Text style={[styles.leaveGateInfoText, { color: isDark ? "#DDD6FE" : "#5B21B6" }]}>
                                  Pass Date: <Text style={{ fontWeight: "700" }}>{item.date || "Today"}</Text> | Time: <Text style={{ fontWeight: "700" }}>{item.outTime || "N/A"} → {item.returnTime || "N/A"}</Text>
                                </Text>
                              </View>
                              {!!item.destination && (
                                <Text style={[styles.leaveGateInfoSub, { color: isDark ? "#A5B4FC" : "#4338CA" }]}>
                                  📍 Destination: {item.destination}
                                </Text>
                              )}
                              {!!item.contactNumber && (
                                <Text style={[styles.leaveGateInfoSub, { color: isDark ? "#A5B4FC" : "#4338CA" }]}>
                                  📞 Contact: {item.contactNumber}
                                </Text>
                              )}
                            </View>
                          )}
                        </View>
                      )}

                      {/* Student Attached Hardcopy Badges */}
                      {(item.photoUrl || item.pdfUrl) && (
                        <View style={styles.studentAttachmentsRow}>
                          <Text style={styles.attachmentSectionLabel}>Student Hardcopy:</Text>
                          {item.photoUrl ? (
                            <TouchableOpacity
                              style={styles.hardcopyChip}
                              onPress={() => setPreviewPhoto(item.photoUrl || null)}
                            >
                              <Ionicons name="image" size={13} color="#7C3AED" />
                              <Text style={styles.hardcopyChipText}>Student Photo</Text>
                            </TouchableOpacity>
                          ) : null}
                          {item.pdfUrl ? (
                            <TouchableOpacity
                              style={[styles.hardcopyChip, { backgroundColor: "#FEE2E2", borderColor: "#FCA5A5" }]}
                              onPress={() => Linking.openURL(item.pdfUrl!)}
                            >
                              <Ionicons name="document-text" size={13} color="#DC2626" />
                              <Text style={[styles.hardcopyChipText, { color: "#DC2626" }]}>
                                Student PDF
                              </Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      )}

                      {/* Admin comment snippet & attached hardcopy */}
                      {!!(item.adminComment || item.adminPhotoUrl || item.adminPdfUrl) && (
                        <View style={styles.commentBox}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                            <Ionicons name="chatbubble-ellipses" size={14} color="#059669" />
                            <Text style={{ fontSize: 12, fontWeight: "700", color: "#059669" }}>
                              Official Admin Response:
                            </Text>
                          </View>
                          {!!item.adminComment && (
                            <Text style={styles.commentText} numberOfLines={2}>
                              {item.adminComment}
                            </Text>
                          )}
                          <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                            {item.adminPhotoUrl ? (
                              <TouchableOpacity
                                style={styles.adminSlipChip}
                                onPress={() => setPreviewPhoto(item.adminPhotoUrl || null)}
                              >
                                <Ionicons name="image" size={11} color="#059669" />
                                <Text style={styles.adminSlipText}>Official Slip</Text>
                              </TouchableOpacity>
                            ) : null}
                            {item.adminPdfUrl ? (
                              <TouchableOpacity
                                style={styles.adminSlipChip}
                                onPress={() => Linking.openURL(item.adminPdfUrl!)}
                              >
                                <Ionicons name="document-text" size={11} color="#059669" />
                                <Text style={styles.adminSlipText}>Official PDF</Text>
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        </View>
                      )}

                      {/* Card Footer with Quick Status & Reply Button */}
                      <View style={styles.cardFooter}>
                        <View style={styles.quickStatusRow}>
                          {(item.category === "Leave" || item.category === "Gate Pass" || !!item.passType
                            ? ["Pending", "Approved", "Rejected"]
                            : ["Pending", "Approved", "In Progress", "Resolved"]
                          ).map((s) => (
                            <TouchableOpacity
                              key={s}
                              style={[
                                styles.quickStatusBtn,
                                item.status === s && styles.quickStatusBtnActive,
                              ]}
                              onPress={() => handleQuickStatus(item, s)}
                            >
                              <Text
                                style={[
                                  styles.quickStatusBtnText,
                                  item.status === s && styles.quickStatusBtnTextActive,
                                ]}
                              >
                                {s}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>

                        <TouchableOpacity
                          style={styles.replyCardBtn}
                          onPress={() => openResponseModal(item)}
                        >
                          <Ionicons name="chatbubbles" size={14} color="#FFFFFF" />
                          <Text style={styles.replyCardBtnText}>
                            {item.adminComment ? "Update Reply" : "Answer & Reply"}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* ===================================================== */}
      {/* RESPOND / ANSWER STUDENT REQUEST MODAL */}
      {/* ===================================================== */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 560, backgroundColor: colors.adminCard }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.adminText }]}>
                  Respond to Student Request
                </Text>
                <Text style={{ fontSize: 12, color: colors.adminTextSecondary, marginTop: 2 }}>
                  Ticket ID: #{editingRequest?.id.slice(0, 8).toUpperCase()} • Student Helpdesk
                </Text>
              </View>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color={colors.adminTextSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
              {/* STUDENT QUERY DISPLAY BOX (READ-ONLY) */}
              <View
                style={[
                  styles.studentQueryCard,
                  { backgroundColor: isDark ? "#162032" : "#F8FAFC", borderColor: colors.adminCardBorder },
                ]}
              >
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.queryRequesterName, { color: colors.adminText }]}>
                      {editingRequest?.requesterName || "Student"}
                    </Text>
                    <Text style={[styles.queryRequesterRoll, { color: colors.adminTextSecondary }]}>
                      Roll: {editingRequest?.rollNo || "N/A"} • {editingRequest?.department || "Campus"} • Sem {editingRequest?.semester || "N/A"}
                    </Text>
                    {!!editingRequest?.requesterEmail && (
                      <Text style={{ fontSize: 11, color: colors.adminTextSecondary }}>
                        {editingRequest.requesterEmail}
                      </Text>
                    )}
                  </View>
                  <View style={{ alignItems: "flex-end", gap: 4 }}>
                    <View style={[styles.categoryBadge, { backgroundColor: isDark ? "#1E293B" : "#F1F5F9" }]}>
                      <Text style={[styles.categoryBadgeText, { color: isDark ? "#94A3B8" : "#475569" }]}>
                        {editingRequest?.category || "General"}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.priorityBadge,
                        { backgroundColor: getPriorityStyle(editingRequest?.priority).bg },
                      ]}
                    >
                      <Text
                        style={[
                          styles.priorityBadgeText,
                          { color: getPriorityStyle(editingRequest?.priority).text },
                        ]}
                      >
                        {editingRequest?.priority || "Normal"}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={[styles.queryDivider, { backgroundColor: colors.adminCardBorder }]} />

                <Text style={[styles.queryTitle, { color: colors.adminText }]}>{editingRequest?.title}</Text>
                <Text style={[styles.queryDesc, { color: colors.adminTextSecondary }]}>{editingRequest?.description}</Text>

                {/* Leave / Gate Pass details in modal */}
                {(!!editingRequest?.fromDate || !!editingRequest?.date || !!editingRequest?.outTime || editingRequest?.category === "Leave" || editingRequest?.category === "Gate Pass" || !!editingRequest?.passType) && (
                  <View
                    style={{
                      backgroundColor: isDark ? "#1E1E2D" : "#EEF2FF",
                      padding: 10,
                      borderRadius: 8,
                      marginBottom: 10,
                      borderWidth: 1,
                      borderColor: isDark ? "#312E81" : "#C7D2FE",
                    }}
                  >
                    {editingRequest?.category === "Leave" || editingRequest?.passType === "leave" || !!editingRequest?.fromDate ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Ionicons name="airplane" size={14} color="#4F46E5" />
                        <Text style={{ fontSize: 12, fontWeight: "700", color: isDark ? "#C7D2FE" : "#3730A3" }}>
                          Leave Duration: {editingRequest?.fromDate} to {editingRequest?.toDate}
                        </Text>
                      </View>
                    ) : (
                      <View style={{ gap: 3 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Ionicons name="exit-outline" size={14} color="#7C3AED" />
                          <Text style={{ fontSize: 12, fontWeight: "700", color: isDark ? "#DDD6FE" : "#5B21B6" }}>
                            Gate Pass: {editingRequest?.date || "Today"} (Out: {editingRequest?.outTime} → In: {editingRequest?.returnTime})
                          </Text>
                        </View>
                        {!!editingRequest?.destination && (
                          <Text style={{ fontSize: 11, color: isDark ? "#A5B4FC" : "#4338CA" }}>
                            📍 Destination: {editingRequest?.destination}
                          </Text>
                        )}
                        {!!editingRequest?.contactNumber && (
                          <Text style={{ fontSize: 11, color: isDark ? "#A5B4FC" : "#4338CA" }}>
                            📞 Emergency Contact: {editingRequest?.contactNumber}
                          </Text>
                        )}
                      </View>
                    )}
                  </View>
                )}

                {/* Student's Attached Hardcopy (Photo / PDF) */}
                <View
                  style={[
                    styles.studentHardcopyBox,
                    { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: colors.adminCardBorder },
                  ]}
                >
                  <Text style={[styles.hardcopyBoxLabel, { color: colors.adminTextSecondary }]}>
                    Attached Student Hardcopy / Proof:
                  </Text>
                  {editingRequest?.photoUrl ? (
                    <TouchableOpacity
                      style={styles.attachedHardcopyCard}
                      onPress={() => setPreviewPhoto(editingRequest.photoUrl || null)}
                    >
                      <Image source={{ uri: editingRequest.photoUrl }} style={styles.hardcopyImgThumb} />
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: "#1E1B4B" }}>Student Photo / Document</Text>
                        <Text style={{ fontSize: 10, color: "#7C3AED" }}>Tap to view full screen</Text>
                      </View>
                      <Ionicons name="expand-outline" size={16} color="#7C3AED" />
                    </TouchableOpacity>
                  ) : null}

                  {editingRequest?.pdfUrl ? (
                    <View style={{ flexDirection: "row", gap: 8, marginTop: editingRequest.photoUrl ? 6 : 0 }}>
                      <TouchableOpacity
                        style={styles.pdfOpenBtn}
                        onPress={() => Linking.openURL(editingRequest.pdfUrl!)}
                      >
                        <Ionicons name="document-text" size={16} color="#DC2626" />
                        <Text style={styles.pdfOpenBtnText}>Open Student PDF</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.pdfShareBtn}
                        onPress={() => shareOrDownloadPdf(editingRequest.pdfUrl!, editingRequest.title)}
                      >
                        <Ionicons name="share-outline" size={15} color="#4338CA" />
                        <Text style={styles.pdfShareBtnText}>Download</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  {!editingRequest?.photoUrl && !editingRequest?.pdfUrl && (
                    <Text style={{ fontSize: 11, fontStyle: "italic", color: "#94A3B8" }}>
                      No photo or PDF hardcopy attached by student.
                    </Text>
                  )}
                </View>
              </View>

              {/* ADMIN RESPONSE SECTION */}
              <View
                style={[
                  styles.adminActionCard,
                  { backgroundColor: isDark ? "#162032" : "#FFFFFF", borderColor: colors.adminCardBorder },
                ]}
              >
                <Text style={[styles.adminActionHeader, { color: colors.adminText, borderBottomColor: colors.adminCardBorder }]}>
                  Official Administrative Action
                </Text>

                {/* Status Selector */}
                <Text style={[styles.inputLabel, { color: colors.adminTextSecondary, marginTop: 10 }]}>Update Ticket Status</Text>
                <View style={styles.statusChipsRow}>
                  {["Pending", "Approved", "In Progress", "Resolved", "Rejected"].map((s) => (
                    <TouchableOpacity
                      key={s}
                      style={[
                        styles.statusChipBtn,
                        adminStatus === s && styles.statusChipBtnActive,
                        {
                          backgroundColor: adminStatus === s ? "#4F46E5" : isDark ? "#1E293B" : "#F1F5F9",
                          borderColor: adminStatus === s ? "#4F46E5" : colors.adminCardBorder,
                        },
                      ]}
                      onPress={() => setAdminStatus(s)}
                    >
                      <Text
                        style={[
                          styles.statusChipText,
                          adminStatus === s && styles.statusChipTextActive,
                          adminStatus !== s && { color: isDark ? "#94A3B8" : "#475569" },
                        ]}
                      >
                        {s}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Assigned Staff */}
                <View style={[styles.inputGroup, { marginTop: 12 }]}>
                  <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Assigned Department / Staff</Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText },
                    ]}
                    placeholder="e.g. IT Department / Hostel Warden / Accounts"
                    placeholderTextColor={colors.adminTextSecondary}
                    value={adminAssignedTo}
                    onChangeText={setAdminAssignedTo}
                  />
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 6, marginTop: 6 }}
                  >
                    {[
                      "Maintenance Team",
                      "Ramesh (Electrical)",
                      "Suresh (Plumbing)",
                      "IT Wi-Fi Admin",
                      "Housekeeping",
                      "Warden Office",
                    ].map((staff) => (
                      <TouchableOpacity
                        key={staff}
                        style={{
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                          borderRadius: 8,
                          backgroundColor: adminAssignedTo === staff ? "#4F46E5" : isDark ? "#1E293B" : "#F1F5F9",
                        }}
                        onPress={() => setAdminAssignedTo(staff)}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "600",
                            color: adminAssignedTo === staff ? "#FFFFFF" : isDark ? "#94A3B8" : "#475569",
                          }}
                        >
                          + {staff}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>

                {/* Priority 6: Audit Trail in Modal */}
                {editingRequest?.auditTrail && editingRequest.auditTrail.length > 0 && (
                  <View style={{ marginVertical: 12, padding: 12, borderRadius: 10, backgroundColor: isDark ? "#1E293B" : "#F8FAFC", borderWidth: 1, borderColor: colors.adminCardBorder }}>
                    <Text style={{ fontSize: 12, fontWeight: "800", color: colors.adminText, marginBottom: 8, textTransform: "uppercase" }}>
                      Audit Trail Timeline
                    </Text>
                    {editingRequest.auditTrail.map((ev: AuditEvent, idx: number) => (
                      <View key={idx} style={{ flexDirection: "row", alignItems: "center", gap: 8, marginVertical: 3 }}>
                        <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: "#4F46E5" }} />
                        <Text style={{ fontSize: 11, fontWeight: "700", color: "#64748B", minWidth: 60 }}>
                          {ev.time}
                        </Text>
                        <Text style={{ fontSize: 12, color: colors.adminText, flex: 1 }}>
                          <Text style={{ fontWeight: "700" }}>{ev.actor}: </Text>
                          {ev.action}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                {/* Admin Answer / Comment */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Admin Resolution Response / Answer *</Text>
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
                    placeholder="Write your official response or resolution details for the student..."
                    placeholderTextColor={colors.adminTextSecondary}
                    multiline
                    value={adminReplyText}
                    onChangeText={setAdminReplyText}
                  />
                </View>

                {/* Admin Hardcopy Attachments (Photo / PDF) */}
                <View style={[styles.hardcopyPickerContainer, { borderTopColor: colors.adminCardBorder }]}>
                  <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>
                    Attach Official Hardcopy / Slip (Optional)
                  </Text>
                  <Text style={{ fontSize: 11, color: "#64748B", marginBottom: 8 }}>
                    Send signed permission letter, approval slip, fee receipt, or official document.
                  </Text>

                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                    <TouchableOpacity style={styles.adminPickerBtn} onPress={handlePickAdminPhoto}>
                      <Ionicons name="image-outline" size={15} color="#5D3EBC" />
                      <Text style={styles.adminPickerBtnText}>Gallery Photo</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.adminPickerBtn} onPress={handleTakeAdminPhoto}>
                      <Ionicons name="camera-outline" size={15} color="#5D3EBC" />
                      <Text style={styles.adminPickerBtnText}>Camera</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.adminPickerBtn, { borderColor: "#FCA5A5", backgroundColor: "#FEF2F2" }]}
                      onPress={handlePickAdminPdf}
                    >
                      <Ionicons name="document-text-outline" size={15} color="#DC2626" />
                      <Text style={[styles.adminPickerBtnText, { color: "#DC2626" }]}>Browse PDF</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Attached Admin Photo Card */}
                  {adminPhotoUrl ? (
                    <View style={styles.attachedAdminFileRow}>
                      <Image source={{ uri: adminPhotoUrl }} style={styles.attachedAdminThumb} />
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: "#1E1B4B" }} numberOfLines={1}>
                          {adminPhotoName || "Response Photo Slip"}
                        </Text>
                        <Text style={{ fontSize: 10, color: "#10B981", fontWeight: "700" }}>✓ Hardcopy Attached</Text>
                      </View>
                      <TouchableOpacity onPress={() => { setAdminPhotoUrl(""); setAdminPhotoName(""); }}>
                        <Ionicons name="trash-outline" size={17} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ) : null}

                  {/* Attached Admin PDF Card */}
                  {adminPdfUrl ? (
                    <View style={styles.attachedAdminFileRow}>
                      <View style={styles.pdfIconCircleSmall}>
                        <Ionicons name="document-text" size={18} color="#DC2626" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={{ fontSize: 12, fontWeight: "700", color: "#1E1B4B" }} numberOfLines={1}>
                          {adminPdfName || "Official_Response.pdf"}
                        </Text>
                        <Text style={{ fontSize: 10, color: "#10B981", fontWeight: "700" }}>✓ Official PDF Ready</Text>
                      </View>
                      <TouchableOpacity onPress={() => { setAdminPdfUrl(""); setAdminPdfName(""); }}>
                        <Ionicons name="trash-outline" size={17} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.adminCardBorder }]}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: isDark ? "#1E293B" : "#F1F5F9" }]}
                onPress={closeModal}
                disabled={saving}
              >
                <Text style={[styles.modalCancelText, { color: colors.adminTextSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSendResponse}
                disabled={saving}
              >
                {saving ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "700" }}>
                      {uploadStatus || "Saving..."}
                    </Text>
                  </View>
                ) : (
                  <Text style={styles.modalSaveText}>Send Reply & Update Status</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* FULL PHOTO PREVIEW MODAL */}
      <Modal visible={Boolean(previewPhoto)} transparent animationType="fade" onRequestClose={() => setPreviewPhoto(null)}>
        <View style={styles.photoPreviewOverlay}>
          <TouchableOpacity style={styles.closePhotoBtn} onPress={() => setPreviewPhoto(null)}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {previewPhoto && (
            <Image source={{ uri: previewPhoto }} style={styles.fullPhotoImg} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// =====================================================
// STYLES
// =====================================================
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
  // SIDEBAR
  sidebar: {
    width: 250,
    backgroundColor: "#2A174E",
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRightWidth: 1,
    borderRightColor: "#3B2268",
    justifyContent: "space-between",
  },
  mobileSidebar: {
    width: 280,
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 999,
  },
  sidebarBrand: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 26,
    paddingHorizontal: 6,
  },
  brandIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#5D3EBC",
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 11,
    color: "#A78BFA",
    fontWeight: "500",
  },
  closeSidebarBtn: {
    marginLeft: "auto",
    padding: 6,
  },
  sidebarNavScroll: {
    paddingVertical: 6,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 4,
  },
  navItemActive: {
    backgroundColor: "#5D3EBC",
  },
  navItemLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    marginLeft: 12,
    fontWeight: "500",
  },
  navItemLabelActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  sidebarLogout: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    marginTop: 10,
  },
  sidebarLogoutText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    marginLeft: 12,
    fontWeight: "600",
  },
  mobileModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    flexDirection: "row",
  },
  // CONTENT AREA
  contentArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  menuHamburger: {
    marginRight: 14,
    padding: 4,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 500,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
    marginLeft: 8,
  },
  topRightRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 16,
  },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  adminAvatarSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center",
  },
  adminBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4338CA",
    marginLeft: 8,
  },
  scrollContent: {
    padding: 24,
  },
  // ACTION HEADER
  headerSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
  },
  pageSubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 2,
  },
  addTicketBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4F46E5",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    gap: 6,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  addTicketBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  // STATS ROW
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 4,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  statCol: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
  // FILTER SECTION
  filterSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    flexWrap: "wrap",
    gap: 10,
  },
  filterTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  filterScroll: {
    gap: 8,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#E2E8F0",
  },
  filterChipActive: {
    backgroundColor: "#4F46E5",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  // TICKETS GRID
  requestsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  ticketCard: {
    flex: 1,
    minWidth: 320,
    maxWidth: 450,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  ticketTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  badgeGroup: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    alignItems: "center",
  },
  statusBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  priorityBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  priorityBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  categoryBadge: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
  },
  categoryBadgeText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
  },
  actionBtnsRow: {
    flexDirection: "row",
    gap: 6,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtn: {
    backgroundColor: "#FEE2E2",
  },
  ticketTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },
  ticketDesc: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
    marginBottom: 12,
  },
  requesterBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    padding: 8,
    borderRadius: 8,
    gap: 6,
    marginBottom: 8,
  },
  requesterName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E293B",
  },
  requesterMeta: {
    fontSize: 11,
    color: "#64748B",
  },
  leaveGateInfoBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  leaveGateInfoText: {
    fontSize: 12,
    fontWeight: "600",
  },
  leaveGateInfoSub: {
    fontSize: 11,
    marginLeft: 20,
    fontWeight: "500",
  },
  commentBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    padding: 8,
    borderRadius: 8,
    gap: 6,
    marginBottom: 10,
  },
  commentText: {
    fontSize: 12,
    color: "#065F46",
    fontStyle: "italic",
    flex: 1,
  },
  cardFooter: {
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 10,
    marginTop: 4,
  },
  quickStatusLabel: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "600",
    marginBottom: 6,
  },
  quickStatusRow: {
    flexDirection: "row",
    gap: 6,
  },
  quickStatusBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
  },
  quickStatusBtnActive: {
    backgroundColor: "#4F46E5",
  },
  quickStatusBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  quickStatusBtnTextActive: {
    color: "#FFFFFF",
  },
  loaderBox: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
  },
  emptyBox: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#334155",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 4,
  },
  // MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 540,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  inputGroup: {
    marginBottom: 14,
  },
  rowInputs: {
    flexDirection: "row",
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  modalSaveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: "#4F46E5",
  },
  modalSaveText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  // Hardcopy & Student attachments
  studentAttachmentsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  attachmentSectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  hardcopyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F3E8FF",
    borderColor: "#D8B4FE",
    borderWidth: 1,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  hardcopyChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#7C3AED",
  },
  adminSlipChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#D1FAE5",
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  adminSlipText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
  },
  replyCardBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#4F46E5",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  replyCardBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  // Student Query Modal Card
  studentQueryCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  queryRequesterName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  queryRequesterRoll: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  queryDivider: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 10,
  },
  queryTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 4,
  },
  queryDesc: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 18,
    marginBottom: 10,
  },
  studentHardcopyBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    padding: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  hardcopyBoxLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
  },
  attachedHardcopyCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    borderRadius: 8,
    padding: 8,
  },
  hardcopyImgThumb: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: "#E2E8F0",
  },
  pdfOpenBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEE2E2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  pdfOpenBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DC2626",
  },
  pdfShareBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  pdfShareBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4338CA",
  },
  // Admin Action Box
  adminActionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 8,
  },
  adminActionHeader: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 6,
  },
  statusChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  statusChipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  statusChipBtnActive: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  statusChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  statusChipTextActive: {
    color: "#FFFFFF",
  },
  hardcopyPickerContainer: {
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  adminPickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  adminPickerBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#5D3EBC",
  },
  attachedAdminFileRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 8,
    marginTop: 8,
  },
  attachedAdminThumb: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: "#E2E8F0",
  },
  pdfIconCircleSmall: {
    width: 40,
    height: 40,
    borderRadius: 6,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  // Photo Preview Overlay
  photoPreviewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  closePhotoBtn: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  fullPhotoImg: {
    width: "90%",
    height: "80%",
  },
});