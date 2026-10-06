import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";

import { auth, db } from "../firebase/config";
import { useAppTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import LanguageToggle from "../components/LanguageToggle";
import OfflineBanner from "../components/OfflineBanner";
import {
  compressImageForLowNetwork,
  isAppOffline,
  queueOfflineAction,
} from "../services/offlineQueue";
import {
  pickPdfDocument,
  shareOrDownloadPdf,
  uploadRequestFile,
} from "../services/certificatePdfService";

// Priority 1 Specific Categories
export const COMPLAINT_CATEGORIES = [
  "Hostel",
  "Electrical",
  "Water",
  "Classroom",
  "Internet/Wi-Fi",
  "Cleaning",
  "Furniture",
  "Other",
] as const;

export const PRIORITIES = ["Low", "Normal", "High", "Urgent"];

export type AuditEvent = {
  time: string;
  date?: string;
  actor: "Student" | "Admin" | "Staff" | "System";
  action: string;
};

export type StudentRequest = {
  id: string;
  complaintId: string;
  requesterId?: string;
  requesterName?: string;
  studentName?: string;
  rollNo?: string;
  department?: string;
  semester?: string;
  title: string;
  description: string;
  category: string;
  location?: string;
  priority: string;
  status: "Pending" | "In Progress" | "Resolved" | "Confirmed" | "Rejected";
  assignedStaff?: string;
  assignedTo?: string;
  resolvedDate?: string;
  createdDate?: string;
  studentConfirmed?: boolean;
  studentConfirmedDate?: string;
  requestType?: "complaint" | "bonafide" | "document" | "gate_pass" | "leave" | "fee_query" | "general";
  // Photos & Attachments
  photoUrl?: string;
  pdfUrl?: string;
  pdfName?: string;
  // Admin answer
  adminComment?: string;
  adminPhotoUrl?: string;
  // Priority 6 Audit Trail
  auditTrail?: AuditEvent[];
  createdAt?: any;
  updatedAt?: any;
};

export default function UnifiedRequestsScreen() {
  const { colors, isDark } = useAppTheme();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<"hub" | "complaintForm" | "track">("hub");

  // Priority 2 Request Center Hub categories
  const REQUEST_HUB_CARDS = [
    {
      id: "bonafide",
      title: t("bonafideCertificate", "Bonafide Certificate"),
      nativeTitle: "ବୋନାଫାଇଡ୍ ପ୍ରମାଣପତ୍ର",
      icon: "school",
      color: "#4F46E5",
      bg: isDark ? "rgba(79,70,229,0.2)" : "#EEF2FF",
      desc: "Instant bonafide for scholarship, visa & internship",
      action: () => router.push("/document-request" as any),
    },
    {
      id: "documents",
      title: t("documents", "Documents"),
      nativeTitle: "ଦଲିଲପତ୍ର / ପ୍ରମାଣପତ୍ର",
      icon: "document-text",
      color: "#059669",
      bg: isDark ? "rgba(5,150,105,0.2)" : "#ECFDF5",
      desc: "Transcripts, Migration, Character & NOC issuance",
      action: () => router.push("/document-request" as any),
    },
    {
      id: "gatepass",
      title: t("gatePass", "Gate Pass"),
      nativeTitle: "ଗେଟ୍ ପାସ୍",
      icon: "exit",
      color: "#D97706",
      bg: isDark ? "rgba(217,119,6,0.2)" : "#FEF3C7",
      desc: "Day outings & campus departures with QR permit",
      action: () => router.push("/gate-pass" as any),
    },
    {
      id: "leave",
      title: t("leaveRequest", "Leave Request"),
      nativeTitle: "ଛୁଟି ଅନୁରୋଧ",
      icon: "calendar",
      color: "#2563EB",
      bg: isDark ? "rgba(37,99,235,0.2)" : "#EFF6FF",
      desc: "Multi-day hostel leave, medical or family leave",
      action: () => router.push("/gate-pass" as any),
    },
    {
      id: "feeQuery",
      title: t("feeDuesQuery", "Fee/Dues Query"),
      nativeTitle: "ଫିସ୍ / ବକେୟା ପ୍ରଶ୍ନ",
      icon: "cash",
      color: "#7C3AED",
      bg: isDark ? "rgba(124,58,237,0.2)" : "#F5F3FF",
      desc: "Fee clearance, scholarship adjustment & receipt query",
      action: () => {
        setCategory("Other");
        setTitle("Fee/Dues Query");
        setDescription("Requesting clarification regarding semester fee balance / clearance status.");
        setActiveTab("complaintForm");
      },
    },
    {
      id: "complaint",
      title: t("complaint", "Complaint & Maintenance"),
      nativeTitle: "ଅଭିଯୋଗ ଏବଂ ରକ୍ଷଣାବେକ୍ଷଣ",
      icon: "hammer",
      color: "#E11D48",
      bg: isDark ? "rgba(225,29,72,0.2)" : "#FFE4E6",
      desc: "Hostel, electrical, water, Wi-Fi & classroom issues",
      action: () => {
        setTitle("");
        setDescription("");
        setCategory("Hostel");
        setActiveTab("complaintForm");
      },
    },
  ];

  // Complaint Form Fields (Priority 1)
  const [category, setCategory] = useState<string>("Hostel");
  const [location, setLocation] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("Normal");
  const [studentName, setStudentName] = useState("Rahul");
  const [rollNo, setRollNo] = useState("22CSE042");
  const [department, setDepartment] = useState("CSE");
  const [roomNumber, setRoomNumber] = useState("Block B - 302");

  // Photo Attachment states (Priority 1 + Priority 11 compression)
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [compressionStatus, setCompressionStatus] = useState("");

  // Submissions
  const [submitting, setSubmitting] = useState(false);

  // History & Tracking
  const [requests, setRequests] = useState<StudentRequest[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [filterStatus, setFilterStatus] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [trackViewMode, setTrackViewMode] = useState<"grouped" | "list">("grouped");
  const [collapsedStudentSections, setCollapsedStudentSections] = useState<Record<string, boolean>>({});

  const toggleStudentSectionCollapse = (key: string) => {
    setCollapsedStudentSections((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Audit trail modal
  const [selectedAuditRequest, setSelectedAuditRequest] = useState<StudentRequest | null>(null);

  // Autofill current user
  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      if (user.displayName) setStudentName(user.displayName);
      const userRef = doc(db, "users", user.uid);
      const unsub = onSnapshot(userRef, (s) => {
        if (s.exists()) {
          const d = s.data();
          if (d.fullName || d.name) setStudentName(d.fullName || d.name);
          if (d.rollNo) setRollNo(d.rollNo);
          if (d.department || d.branch) setDepartment(d.department || d.branch);
          if (d.hostelBlock && d.roomNo) setRoomNumber(`${d.hostelBlock} - ${d.roomNo}`);
        }
      });
      return () => unsub();
    }
  }, []);

  // Listen to student complaints & requests in Firestore
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoadingHistory(false);
      return;
    }

    try {
      const q = query(
        collection(db, "requests"),
        where("requesterId", "==", user.uid)
      );

      const unsub = onSnapshot(
        q,
        (snapshot) => {
          const items: StudentRequest[] = snapshot.docs.map((docSnap) => {
            const data = docSnap.data();
            return {
              id: docSnap.id,
              complaintId: data.complaintId || `#${docSnap.id.substring(0, 4).toUpperCase()}`,
              requesterId: data.requesterId,
              requesterName: data.requesterName || data.studentName,
              studentName: data.studentName || data.requesterName || "Student",
              rollNo: data.rollNo || "",
              department: data.department || "",
              semester: data.semester || "",
              title: data.title || "Complaint / Request",
              description: data.description || "",
              category: data.category || "Hostel",
              location: data.location || "",
              priority: data.priority || "Normal",
              status: (data.status as any) || "Pending",
              assignedStaff: data.assignedStaff || data.assignedTo || "Maintenance Team",
              assignedTo: data.assignedTo || data.assignedStaff,
              resolvedDate: data.resolvedDate,
              createdDate: data.createdDate || "Today",
              studentConfirmed: Boolean(data.studentConfirmed),
              studentConfirmedDate: data.studentConfirmedDate,
              requestType: data.requestType || "complaint",
              photoUrl: data.photoUrl,
              pdfUrl: data.pdfUrl,
              pdfName: data.pdfName,
              adminComment: data.adminComment,
              auditTrail: data.auditTrail || [
                {
                  time: "10:15 AM",
                  actor: "Student",
                  action: "Student submitted complaint",
                },
              ],
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
            };
          });

          // Sort by creation time desc
          items.sort((a, b) => {
            const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0;
            const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0;
            return timeB - timeA;
          });

          setRequests(items);
          setLoadingHistory(false);
        },
        (error) => {
          console.warn("Requests listener warning:", error);
          setLoadingHistory(false);
        }
      );

      return () => unsub();
    } catch (e) {
      setLoadingHistory(false);
    }
  }, []);

  // Filtered requests
  const filteredRequests = useMemo(() => {
    return requests.filter((r) => {
      const matchStatus = filterStatus === "All" || r.status === filterStatus;
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        r.complaintId.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.description.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        (r.location && r.location.toLowerCase().includes(q));
      return matchStatus && matchSearch;
    });
  }, [requests, filterStatus, searchQuery]);

  // Dynamic status counts for student
  const myPendingCount = requests.filter((r) => r.status === "Pending" || !r.status).length;
  const myInProgressCount = requests.filter((r) => r.status === "In Progress").length;
  const myResolvedCount = requests.filter((r) => r.status === "Resolved" || r.status === "Confirmed").length;
  const myRejectedCount = requests.filter((r) => r.status === "Rejected").length;

  const getStudentStatusCount = (st: string) => {
    if (st === "All") return requests.length;
    if (st === "Pending") return myPendingCount;
    if (st === "Resolved") return requests.filter((r) => r.status === "Resolved").length;
    if (st === "Confirmed") return requests.filter((r) => r.status === "Confirmed").length;
    return requests.filter((r) => r.status === st).length;
  };

  const STUDENT_STATUS_GROUPS = useMemo(() => [
    {
      key: "Pending",
      title: "Pending Review",
      description: "Submitted to administration, awaiting review or assignment",
      icon: "time" as const,
      color: "#F59E0B",
      bgLight: "#FFFBEB",
      badgeBg: "#FEF3C7",
      badgeText: "#B45309",
    },
    {
      key: "In Progress",
      title: "In Progress",
      description: "Staff assigned and actively working on resolution",
      icon: "sync" as const,
      color: "#2563EB",
      bgLight: "#EFF6FF",
      badgeBg: "#DBEAFE",
      badgeText: "#1D4ED8",
    },
    {
      key: "Resolved",
      title: "Resolved / Confirmed",
      description: "Resolved by department; please confirm satisfaction",
      icon: "checkmark-done-circle" as const,
      color: "#059669",
      bgLight: "#ECFDF5",
      badgeBg: "#D1FAE5",
      badgeText: "#047857",
    },
    {
      key: "Rejected",
      title: "Declined / Closed",
      description: "Requests that could not be processed",
      icon: "close-circle" as const,
      color: "#DC2626",
      bgLight: "#FEF2F2",
      badgeBg: "#FEE2E2",
      badgeText: "#B91C1C",
    },
  ], []);

  // Gallery Picker with Low-network compression simulator
  const handlePickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission", "Please allow gallery access to attach photo evidence.");
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        quality: 0.8,
      });

      if (!res.canceled && res.assets && res.assets.length > 0) {
        const asset = res.assets[0];
        const compressed = await compressImageForLowNetwork(
          asset.uri,
          (msg) => setCompressionStatus(msg)
        );
        setPhotoUrl(compressed.uri);
        setPhotoName(`photo_${Date.now()}.jpg`);
        setCompressionStatus(`✓ Compressed: ${compressed.originalSize} ➔ ${compressed.compressedSize} (${compressed.savedPercent}% saved)`);
      }
    } catch (e: any) {
      Alert.alert("Attachment Error", e?.message || "Failed to attach photo.");
    }
  };

  // Submit Complaint (Priority 1 Flow)
  const handleSubmitComplaint = async () => {
    if (!title.trim() && !category) {
      Alert.alert("Missing Information", "Please enter a subject or summary.");
      return;
    }
    if (!description.trim()) {
      Alert.alert("Missing Information", "Please provide a detailed description of the issue.");
      return;
    }
    if (!location.trim()) {
      Alert.alert("Missing Location", "Please specify the exact location (e.g. Block B Room 302, Library 2nd floor).");
      return;
    }

    setSubmitting(true);
    const user = auth.currentUser;
    const complaintNum = `#${Math.floor(1000 + Math.random() * 9000)}`;
    const nowTime = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const nowDate = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    // Default assigned staff mapping based on category
    let initialStaff = "Maintenance Team";
    if (category === "Electrical") initialStaff = "Ramesh (Electrical Team)";
    else if (category === "Water") initialStaff = "Suresh (Plumbing Team)";
    else if (category === "Internet/Wi-Fi") initialStaff = "IT Network Admin";
    else if (category === "Cleaning") initialStaff = "Housekeeping Staff";
    else if (category === "Classroom") initialStaff = "Estate Maintenance";

    const payload = {
      complaintId: complaintNum,
      requestId: complaintNum,
      title: title.trim() || `${category} Issue - ${location}`,
      category,
      location,
      description,
      priority,
      photoUrl,
      photoName,
      status: "Pending",
      assignedStaff: initialStaff,
      assignedTo: initialStaff,
      createdDate: nowDate,
      studentName,
      requesterName: studentName,
      requesterId: user?.uid || "guest_student",
      rollNo,
      department,
      requestType: "complaint",
      // Priority 6 Audit Trail Initial Node
      auditTrail: [
        {
          time: nowTime,
          date: nowDate,
          actor: "Student",
          action: "Student submitted complaint",
        },
      ],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      if (isAppOffline()) {
        await queueOfflineAction("complaint", "requests", payload);
        Alert.alert(
          "Saved Offline ⚠️",
          `Hostel connection is currently offline. Complaint ${complaintNum} has been saved locally and will sync to admin automatically when internet reconnects.`
        );
        resetForm();
        setActiveTab("track");
        setSubmitting(false);
        return;
      }

      await addDoc(collection(db, "requests"), payload);
      Alert.alert(
        "Complaint Submitted! 🛠️",
        `Complaint ${complaintNum} has been registered and routed to ${initialStaff}.`
      );
      resetForm();
      setActiveTab("track");
    } catch (err: any) {
      Alert.alert("Submission Error", err?.message || "Failed to submit complaint.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setLocation("");
    setPhotoUrl("");
    setPhotoName("");
    setCompressionStatus("");
  };

  // Student Confirm Resolution (Priority 1 requirement: Student confirms)
  const handleStudentConfirmResolution = async (request: StudentRequest) => {
    const nowTime = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const nowDate = new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

    const newTrail: AuditEvent[] = [
      ...(request.auditTrail || []),
      {
        time: nowTime,
        date: nowDate,
        actor: "Student",
        action: "Student confirmed resolution & closed ticket",
      },
    ];

    try {
      const docRef = doc(db, "requests", request.id);
      await updateDoc(docRef, {
        status: "Confirmed",
        studentConfirmed: true,
        studentConfirmedDate: `${nowDate} ${nowTime}`,
        auditTrail: newTrail,
        updatedAt: serverTimestamp(),
      });

      Alert.alert(
        "Resolution Confirmed! ✅",
        `Thank you for confirming resolution for ${request.complaintId}. Maintenance record closed.`
      );
      if (selectedAuditRequest?.id === request.id) {
        setSelectedAuditRequest({
          ...request,
          status: "Confirmed",
          studentConfirmed: true,
          auditTrail: newTrail,
        });
      }
    } catch (err: any) {
      Alert.alert("Update Error", err?.message || "Failed to confirm resolution.");
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Confirmed":
      case "Approved":
        return "#059669";
      case "Resolved":
        return "#10B981";
      case "In Progress":
        return "#D97706";
      case "Rejected":
        return "#DC2626";
      default:
        return "#2563EB";
    }
  };

  const getPriorityBadgeColor = (p: string) => {
    switch (p) {
      case "Urgent":
        return "#EF4444";
      case "High":
        return "#F97316";
      case "Low":
        return "#64748B";
      default:
        return "#3B82F6";
    }
  };

  const renderStudentTicketCard = (item: StudentRequest) => {
    const statusColor = getStatusColor(item.status);
    const isResolved = item.status === "Resolved";
    const isConfirmed = item.status === "Confirmed";

    return (
      <View
        key={item.id}
        style={[
          styles.ticketCard,
          {
            backgroundColor: colors.card,
            borderColor: isConfirmed
              ? "#10B981"
              : isResolved
              ? "#F59E0B"
              : colors.border,
            borderWidth: isResolved || isConfirmed ? 1.5 : 1,
            borderLeftColor: statusColor,
            borderLeftWidth: 4,
          },
        ]}
      >
        {/* Header */}
        <View style={styles.ticketCardHeader}>
          <View style={{ flex: 1 }}>
            <View style={styles.idCategoryRow}>
              <Text style={styles.complaintIdText}>
                {item.complaintId}
              </Text>
              <View
                style={[
                  styles.catTag,
                  {
                    backgroundColor: isDark ? "#334155" : "#F1F5F9",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.catTagText,
                    { color: colors.textSecondary },
                  ]}
                >
                  {item.category}
                </Text>
              </View>
              <View
                style={[
                  styles.priorityBadge,
                  {
                    backgroundColor: `${getPriorityBadgeColor(
                      item.priority
                    )}18`,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.priorityBadgeText,
                    { color: getPriorityBadgeColor(item.priority) },
                  ]}
                >
                  {item.priority}
                </Text>
              </View>
            </View>

            <Text style={[styles.ticketTitle, { color: colors.text }]}>
              {item.title}
            </Text>
          </View>

          {/* Status */}
          <View
            style={[
              styles.statusBadge,
              {
                backgroundColor: `${statusColor}18`,
                borderColor: statusColor,
              },
            ]}
          >
            <View
              style={[styles.statusDot, { backgroundColor: statusColor }]}
            />
            <Text style={[styles.statusText, { color: statusColor }]}>
              {item.status}
            </Text>
          </View>
        </View>

        {/* Location & Details (Priority 1 fields) */}
        {item.location ? (
          <View style={styles.locationRow}>
            <Ionicons
              name="location-outline"
              size={15}
              color="#EF4444"
            />
            <Text
              style={[styles.locationText, { color: colors.text }]}
            >
              {item.location}
            </Text>
          </View>
        ) : null}

        <Text
          style={[styles.descText, { color: colors.textSecondary }]}
          numberOfLines={3}
        >
          {item.description}
        </Text>

        {/* Metadata Grid (Staff, Created, Resolved) */}
        <View
          style={[
            styles.metaGrid,
            {
              backgroundColor: isDark ? "#1E293B" : "#F8FAFC",
              borderColor: colors.border,
            },
          ]}
        >
          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Assigned Staff</Text>
            <Text
              style={[styles.metaVal, { color: colors.text }]}
              numberOfLines={1}
            >
              👤 {item.assignedStaff || "Maintenance Team"}
            </Text>
          </View>

          <View style={styles.metaCol}>
            <Text style={styles.metaLabel}>Created Date</Text>
            <Text style={[styles.metaVal, { color: colors.text }]}>
              📅 {item.createdDate || "Today"}
            </Text>
          </View>

          {item.resolvedDate && (
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Resolved Date</Text>
              <Text
                style={[
                  styles.metaVal,
                  { color: "#059669", fontWeight: "800" },
                ]}
              >
                ✓ {item.resolvedDate}
              </Text>
            </View>
          )}
        </View>

        {/* Admin Comment / Response if available */}
        {!!item.adminComment && (
          <View style={{ marginTop: 10, padding: 10, backgroundColor: isDark ? "#1E293B" : "#ECFDF5", borderRadius: 8, borderWidth: 1, borderColor: isDark ? "#334155" : "#A7F3D0" }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
              <Ionicons name="chatbubble-ellipses" size={13} color="#059669" />
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#059669" }}>Admin Response:</Text>
            </View>
            <Text style={{ fontSize: 12, color: isDark ? "#E2E8F0" : "#065F46", marginTop: 2 }}>{item.adminComment}</Text>
          </View>
        )}

        {/* Student Confirms Action (Priority 1 Requirement) */}
        {isResolved && (
          <View style={styles.confirmBox}>
            <View style={{ flex: 1 }}>
              <Text style={styles.confirmTitle}>
                Maintenance Marked Resolved!
              </Text>
              <Text style={styles.confirmSub}>
                Has the repair work in {item.location || "your location"} been completed to your satisfaction?
              </Text>
            </View>
            <TouchableOpacity
              style={styles.confirmBtn}
              onPress={() => handleStudentConfirmResolution(item)}
            >
              <Ionicons
                name="checkmark-circle"
                size={18}
                color="#FFFFFF"
              />
              <Text style={styles.confirmBtnText}>
                {t("confirmResolution", "Confirm Resolution")}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {isConfirmed && (
          <View style={styles.verifiedBanner}>
            <Ionicons
              name="shield-checkmark"
              size={16}
              color="#059669"
            />
            <Text style={styles.verifiedBannerText}>
              {t(
                "studentConfirmed",
                "Student Confirmed & Verified Resolution"
              )}
            </Text>
          </View>
        )}

        {/* View Audit Trail button (Priority 6) */}
        <TouchableOpacity
          style={[
            styles.auditTrailBtn,
            { borderColor: colors.border },
          ]}
          onPress={() => setSelectedAuditRequest(item)}
        >
          <Ionicons
            name="git-commit-outline"
            size={16}
            color={colors.primary}
          />
          <Text
            style={[
              styles.auditTrailBtnText,
              { color: colors.primary },
            ]}
          >
            {t("auditTrail", "View Full Audit Trail")} (
            {item.auditTrail?.length || 1} steps)
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      {/* Header */}
      <View
        style={[
          styles.header,
          {
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.backBtn}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t("requests", "Request Center")}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Paperless digital desk for complaints, passes & documents
          </Text>
        </View>
        <LanguageToggle compact />
      </View>

      {/* Low-network & Offline handling (Priority 11) */}
      <OfflineBanner />

      {/* Tabs */}
      <View
        style={[
          styles.tabBar,
          { backgroundColor: colors.card, borderBottomColor: colors.border },
        ]}
      >
        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === "hub" && [
              styles.tabItemActive,
              { borderBottomColor: colors.primary },
            ],
          ]}
          onPress={() => setActiveTab("hub")}
        >
          <Ionicons
            name="apps-outline"
            size={18}
            color={activeTab === "hub" ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === "hub" ? colors.primary : colors.textSecondary,
                fontWeight: activeTab === "hub" ? "700" : "500",
              },
            ]}
          >
            Request Hub
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === "complaintForm" && [
              styles.tabItemActive,
              { borderBottomColor: colors.primary },
            ],
          ]}
          onPress={() => setActiveTab("complaintForm")}
        >
          <Ionicons
            name="hammer-outline"
            size={18}
            color={
              activeTab === "complaintForm" ? colors.primary : colors.textSecondary
            }
          />
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === "complaintForm"
                    ? colors.primary
                    : colors.textSecondary,
                fontWeight: activeTab === "complaintForm" ? "700" : "500",
              },
            ]}
          >
            {t("submitComplaint", "Submit Complaint")}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === "track" && [
              styles.tabItemActive,
              { borderBottomColor: colors.primary },
            ],
          ]}
          onPress={() => setActiveTab("track")}
        >
          <Ionicons
            name="time-outline"
            size={18}
            color={activeTab === "track" ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              {
                color:
                  activeTab === "track" ? colors.primary : colors.textSecondary,
                fontWeight: activeTab === "track" ? "700" : "500",
              },
            ]}
          >
            My Tickets ({requests.length})
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {/* =======================================================
            TAB 1: PRIORITY 2 REQUEST CENTER (Unified Hub)
        ======================================================= */}
        {activeTab === "hub" && (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Visual Box requested in Priority 2 */}
            <View
              style={[
                styles.hubHeaderCard,
                {
                  backgroundColor: isDark ? "#1E293B" : "#F8FAFC",
                  borderColor: isDark ? "#334155" : "#E2E8F0",
                },
              ]}
            >
              <View style={styles.hubTitleRow}>
                <Ionicons name="sparkles" size={20} color={colors.primary} />
                <Text style={[styles.hubMainTitle, { color: colors.text }]}>
                  {t("requests", "REQUESTS")}
                </Text>
              </View>
              <Text style={[styles.hubSubPrompt, { color: colors.textSecondary }]}>
                Replacing administrative office queues and paper forms with 1-tap instant services.
              </Text>
            </View>

            {/* Hub Services Grid */}
            <View style={styles.cardsGrid}>
              {REQUEST_HUB_CARDS.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.hubCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={item.action}
                  activeOpacity={0.8}
                >
                  <View style={[styles.hubCardIconCircle, { backgroundColor: item.bg }]}>
                    <Ionicons name={item.icon as any} size={24} color={item.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={styles.titleRowFlex}>
                      <Text style={[styles.hubCardTitle, { color: colors.text }]}>
                        {item.title}
                      </Text>
                      <Ionicons
                        name="chevron-forward"
                        size={18}
                        color={colors.textSecondary}
                      />
                    </View>
                    <Text
                      style={[
                        styles.hubCardNative,
                        { color: colors.primary },
                      ]}
                    >
                      {item.nativeTitle}
                    </Text>
                    <Text
                      style={[
                        styles.hubCardDesc,
                        { color: colors.textSecondary },
                      ]}
                      numberOfLines={2}
                    >
                      {item.desc}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>

            {/* Quick Stats overview of user's active requests */}
            <View
              style={[
                styles.recentSummaryBox,
                {
                  backgroundColor: isDark ? "#1E293B" : "#EFF6FF",
                  borderColor: isDark ? "#334155" : "#BFDBFE",
                },
              ]}
            >
              <View style={styles.recentSummaryHeader}>
                <Ionicons name="time" size={18} color="#2563EB" />
                <Text style={[styles.recentSummaryTitle, { color: colors.text }]}>
                  Your Recent Tickets
                </Text>
              </View>
              {requests.length === 0 ? (
                <Text style={[styles.noRecentText, { color: colors.textSecondary }]}>
                  No active requests. Select a service above to submit.
                </Text>
              ) : (
                requests.slice(0, 3).map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={styles.recentRowItem}
                    onPress={() => {
                      setSelectedAuditRequest(r);
                    }}
                  >
                    <Text style={styles.recentIdBadge}>{r.complaintId}</Text>
                    <Text
                      style={[styles.recentRowTitle, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {r.title}
                    </Text>
                    <View
                      style={[
                        styles.miniStatusBadge,
                        { backgroundColor: `${getStatusColor(r.status)}20` },
                      ]}
                    >
                      <Text
                        style={[
                          styles.miniStatusText,
                          { color: getStatusColor(r.status) },
                        ]}
                      >
                        {r.status}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          </ScrollView>
        )}

        {/* =======================================================
            TAB 2: PRIORITY 1 COMPLAINT & MAINTENANCE SYSTEM
            Student -> Submit Complaint -> Category + Location + Description + Photo
        ======================================================= */}
        {activeTab === "complaintForm" && (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Student profile info */}
            <View
              style={[
                styles.studentInfoBar,
                {
                  backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
                  borderColor: colors.border,
                },
              ]}
            >
              <Ionicons name="person-circle" size={24} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.studentInfoName, { color: colors.text }]}>
                  {studentName} • Roll {rollNo}
                </Text>
                <Text
                  style={[styles.studentInfoSub, { color: colors.textSecondary }]}
                >
                  {department} • Default Room: {roomNumber}
                </Text>
              </View>
            </View>

            {/* Complaint Form */}
            <View
              style={[
                styles.formCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              <Text style={[styles.formHeading, { color: colors.text }]}>
                {t("submitComplaint", "New Complaint & Maintenance Ticket")}
              </Text>
              <Text
                style={[styles.formHeadingSub, { color: colors.textSecondary }]}
              >
                Tracked automatically with live staff assignment & audit trail.
              </Text>

              {/* Priority 1: Category selection */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                {t("category", "Complaint Category *")}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryChipsScroll}
              >
                {COMPLAINT_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.catChip,
                      category === cat && [
                        styles.catChipActive,
                        { backgroundColor: colors.primary },
                      ],
                    ]}
                    onPress={() => setCategory(cat)}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        {
                          color: category === cat ? "#FFFFFF" : colors.text,
                        },
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Priority 1: Location */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                {t("location", "Location *")}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? "#1E293B" : "#F8FAFC",
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="e.g. Hostel Block B - Room 302 / Academic Block 304"
                placeholderTextColor={colors.textSecondary}
                value={location}
                onChangeText={setLocation}
              />

              {/* Priority */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                {t("priority", "Urgency / Priority")}
              </Text>
              <View style={styles.priorityRow}>
                {PRIORITIES.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.priorityPill,
                      priority === p && {
                        backgroundColor: getPriorityBadgeColor(p),
                        borderColor: getPriorityBadgeColor(p),
                      },
                    ]}
                    onPress={() => setPriority(p)}
                  >
                    <Text
                      style={[
                        styles.priorityPillText,
                        {
                          color: priority === p ? "#FFFFFF" : colors.text,
                        },
                      ]}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Title / Summary */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Issue Summary (Optional)
              </Text>
              <TextInput
                style={[
                  styles.input,
                  {
                    backgroundColor: isDark ? "#1E293B" : "#F8FAFC",
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder={`e.g. ${category} breakdown or repair needed`}
                placeholderTextColor={colors.textSecondary}
                value={title}
                onChangeText={setTitle}
              />

              {/* Priority 1: Description */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Detailed Description *
              </Text>
              <TextInput
                style={[
                  styles.textArea,
                  {
                    backgroundColor: isDark ? "#1E293B" : "#F8FAFC",
                    borderColor: colors.border,
                    color: colors.text,
                  },
                ]}
                placeholder="Explain the issue clearly (when it started, what is affected, any temporary hazards)..."
                placeholderTextColor={colors.textSecondary}
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />

              {/* Priority 1: Photo Attachment + Low-network compression (Priority 11) */}
              <Text style={[styles.fieldLabel, { color: colors.text }]}>
                Photo Evidence (Camera / Gallery)
              </Text>
              {photoUrl ? (
                <View style={styles.photoPreviewCard}>
                  <Image source={{ uri: photoUrl }} style={styles.photoPreview} />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.photoNameText, { color: colors.text }]}
                      numberOfLines={1}
                    >
                      {photoName || "Evidence attached"}
                    </Text>
                    {compressionStatus ? (
                      <Text style={styles.compressionText}>
                        {compressionStatus}
                      </Text>
                    ) : null}
                    <TouchableOpacity
                      onPress={() => setPhotoUrl("")}
                      style={styles.removePhotoBtn}
                    >
                      <Ionicons name="trash-outline" size={14} color="#EF4444" />
                      <Text style={styles.removePhotoText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.attachPhotoBtn,
                    {
                      backgroundColor: isDark ? "#1E293B" : "#F8FAFC",
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={handlePickPhoto}
                  activeOpacity={0.8}
                >
                  <Ionicons name="camera-outline" size={24} color={colors.primary} />
                  <Text style={[styles.attachPhotoLabel, { color: colors.text }]}>
                    Attach Photo of Issue
                  </Text>
                  <Text
                    style={[
                      styles.attachPhotoSub,
                      { color: colors.textSecondary },
                    ]}
                  >
                    Auto-compressed for low-bandwidth hostel Wi-Fi
                  </Text>
                </TouchableOpacity>
              )}

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  { backgroundColor: colors.primary },
                  submitting && { opacity: 0.7 },
                ]}
                onPress={handleSubmitComplaint}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="shield-checkmark" size={18} color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>
                      SUBMIT COMPLAINT
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        )}

        {/* =======================================================
            TAB 3: TRACKING & AUDIT TRAIL (Priorities 1 & 6)
            Shows Complaint ID, Student, Category, Location, Description,
            Priority, Assigned Staff, Created Date, Status, Resolved Date
            Plus "Student Confirms" Action!
        ======================================================= */}
        {activeTab === "track" && (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Status Summary KPI Cards */}
            <View style={styles.studentStatsRow}>
              <TouchableOpacity
                style={[
                  styles.studentStatCard,
                  { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: "#6366F1" },
                  filterStatus === "All" && styles.studentStatCardActive,
                ]}
                onPress={() => setFilterStatus("All")}
                activeOpacity={0.8}
              >
                <Text style={[styles.studentStatVal, { color: colors.text }]}>{requests.length}</Text>
                <Text style={[styles.studentStatLabel, { color: colors.textSecondary }]}>Total</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.studentStatCard,
                  { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: "#F59E0B" },
                  filterStatus === "Pending" && styles.studentStatCardActive,
                ]}
                onPress={() => setFilterStatus(filterStatus === "Pending" ? "All" : "Pending")}
                activeOpacity={0.8}
              >
                <Text style={[styles.studentStatVal, { color: "#F59E0B" }]}>{myPendingCount}</Text>
                <Text style={[styles.studentStatLabel, { color: colors.textSecondary }]}>Pending</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.studentStatCard,
                  { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: "#2563EB" },
                  filterStatus === "In Progress" && styles.studentStatCardActive,
                ]}
                onPress={() => setFilterStatus(filterStatus === "In Progress" ? "All" : "In Progress")}
                activeOpacity={0.8}
              >
                <Text style={[styles.studentStatVal, { color: "#2563EB" }]}>{myInProgressCount}</Text>
                <Text style={[styles.studentStatLabel, { color: colors.textSecondary }]}>In Progress</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.studentStatCard,
                  { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: "#059669" },
                  filterStatus === "Resolved" && styles.studentStatCardActive,
                ]}
                onPress={() => setFilterStatus(filterStatus === "Resolved" ? "All" : "Resolved")}
                activeOpacity={0.8}
              >
                <Text style={[styles.studentStatVal, { color: "#059669" }]}>{myResolvedCount}</Text>
                <Text style={[styles.studentStatLabel, { color: colors.textSecondary }]}>Resolved</Text>
              </TouchableOpacity>

              {myRejectedCount > 0 && (
                <TouchableOpacity
                  style={[
                    styles.studentStatCard,
                    { backgroundColor: colors.card, borderColor: colors.border, borderLeftColor: "#DC2626" },
                    filterStatus === "Rejected" && styles.studentStatCardActive,
                  ]}
                  onPress={() => setFilterStatus(filterStatus === "Rejected" ? "All" : "Rejected")}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.studentStatVal, { color: "#DC2626" }]}>{myRejectedCount}</Text>
                  <Text style={[styles.studentStatLabel, { color: colors.textSecondary }]}>Declined</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Search and status filter row */}
            <View style={styles.searchFilterRow}>
              <View
                style={[
                  styles.searchBox,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="search-outline"
                  size={18}
                  color={colors.textSecondary}
                />
                <TextInput
                  style={[styles.searchInput, { color: colors.text }]}
                  placeholder="Search by ID, category, location..."
                  placeholderTextColor={colors.textSecondary}
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                />
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterPillsRow}
              >
                {["All", "Pending", "In Progress", "Resolved", "Confirmed", "Rejected"].map(
                  (st) => {
                    const count = getStudentStatusCount(st);
                    if (st === "Rejected" && count === 0) return null;
                    return (
                      <TouchableOpacity
                        key={st}
                        style={[
                          styles.filterPill,
                          filterStatus === st && [
                            styles.filterPillActive,
                            { backgroundColor: colors.primary },
                          ],
                        ]}
                        onPress={() => setFilterStatus(st)}
                      >
                        <Text
                          style={[
                            styles.filterPillText,
                            {
                              color: filterStatus === st ? "#FFFFFF" : colors.text,
                            },
                          ]}
                        >
                          {st} ({count})
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                )}
              </ScrollView>
            </View>

            {/* View Mode Toggle: Grouped by Status vs All Tickets */}
            <View style={styles.studentViewModeBar}>
              <Text style={[styles.studentViewModeTitle, { color: colors.textSecondary }]}>View By:</Text>
              <View style={[styles.studentToggleBox, { backgroundColor: isDark ? "#334155" : "#E2E8F0" }]}>
                <TouchableOpacity
                  style={[
                    styles.studentToggleBtn,
                    trackViewMode === "grouped" && [styles.studentToggleBtnActive, { backgroundColor: colors.card }],
                  ]}
                  onPress={() => setTrackViewMode("grouped")}
                >
                  <Ionicons
                    name="layers-outline"
                    size={14}
                    color={trackViewMode === "grouped" ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.studentToggleText,
                      trackViewMode === "grouped" && { color: colors.primary, fontWeight: "700" },
                      trackViewMode !== "grouped" && { color: colors.textSecondary },
                    ]}
                  >
                    Grouped by Status
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.studentToggleBtn,
                    trackViewMode === "list" && [styles.studentToggleBtnActive, { backgroundColor: colors.card }],
                  ]}
                  onPress={() => setTrackViewMode("list")}
                >
                  <Ionicons
                    name="list-outline"
                    size={14}
                    color={trackViewMode === "list" ? colors.primary : colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.studentToggleText,
                      trackViewMode === "list" && { color: colors.primary, fontWeight: "700" },
                      trackViewMode !== "list" && { color: colors.textSecondary },
                    ]}
                  >
                    All Tickets
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {loadingHistory ? (
              <ActivityIndicator
                size="large"
                color={colors.primary}
                style={{ marginTop: 40 }}
              />
            ) : filteredRequests.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="receipt-outline"
                  size={56}
                  color={colors.textSecondary}
                />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  No Tickets Found
                </Text>
                <Text
                  style={[styles.emptySubtitle, { color: colors.textSecondary }]}
                >
                  {filterStatus === "All"
                    ? "You haven't submitted any complaints or requests matching your filter."
                    : `No tickets found under status "${filterStatus}".`}
                </Text>
                {filterStatus !== "All" ? (
                  <TouchableOpacity
                    style={[styles.applyNowBtn, { backgroundColor: colors.primary }]}
                    onPress={() => setFilterStatus("All")}
                  >
                    <Text style={styles.applyNowBtnText}>Show All Tickets</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.applyNowBtn, { backgroundColor: colors.primary }]}
                    onPress={() => setActiveTab("complaintForm")}
                  >
                    <Text style={styles.applyNowBtnText}>Submit Complaint</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : trackViewMode === "grouped" && filterStatus === "All" ? (
              <View style={{ gap: 16 }}>
                {STUDENT_STATUS_GROUPS.map((group) => {
                  const groupItems = filteredRequests.filter((r) => {
                    if (group.key === "Pending") return r.status === "Pending" || !r.status;
                    if (group.key === "Resolved") return r.status === "Resolved" || r.status === "Confirmed";
                    return r.status === group.key;
                  });
                  const isCollapsed = Boolean(collapsedStudentSections[group.key]);

                  return (
                    <View
                      key={group.key}
                      style={[
                        styles.studentStatusGroupCard,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                          borderLeftColor: group.color,
                        },
                      ]}
                    >
                      <TouchableOpacity
                        style={styles.studentStatusGroupHeader}
                        onPress={() => toggleStudentSectionCollapse(group.key)}
                        activeOpacity={0.7}
                      >
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                          <View
                            style={[
                              styles.studentStatusGroupIcon,
                              { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : group.bgLight },
                            ]}
                          >
                            <Ionicons name={group.icon} size={18} color={group.color} />
                          </View>
                          <View>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                              <Text style={[styles.studentStatusGroupTitle, { color: colors.text }]}>
                                {group.title}
                              </Text>
                              <View
                                style={[
                                  styles.studentStatusCountPill,
                                  { backgroundColor: isDark ? "rgba(255,255,255,0.1)" : group.badgeBg },
                                ]}
                              >
                                <Text style={[styles.studentStatusCountText, { color: group.color }]}>
                                  {groupItems.length}
                                </Text>
                              </View>
                            </View>
                            <Text style={[styles.studentStatusGroupDesc, { color: colors.textSecondary }]}>
                              {group.description}
                            </Text>
                          </View>
                        </View>

                        <Ionicons
                          name={isCollapsed ? "chevron-down" : "chevron-up"}
                          size={18}
                          color={colors.textSecondary}
                        />
                      </TouchableOpacity>

                      {!isCollapsed && (
                        <View style={{ paddingTop: 10, gap: 12 }}>
                          {groupItems.length === 0 ? (
                            <View style={styles.studentGroupEmptyBox}>
                              <Text style={[styles.studentGroupEmptyText, { color: colors.textSecondary }]}>
                                No requests in {group.title}
                              </Text>
                            </View>
                          ) : (
                            groupItems.map((item) => renderStudentTicketCard(item))
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            ) : (
              <View>
                {filterStatus !== "All" && (
                  <View style={[styles.filterNoticeBox, { backgroundColor: isDark ? "#1E293B" : "#EEF2FF", borderColor: "#C7D2FE" }]}>
                    <Ionicons name="funnel" size={15} color={colors.primary} />
                    <Text style={{ fontSize: 13, fontWeight: "600", color: colors.primary }}>
                      Showing {filteredRequests.length} tickets with status "{filterStatus}"
                    </Text>
                    <TouchableOpacity onPress={() => setFilterStatus("All")} style={{ marginLeft: "auto" }}>
                      <Text style={{ fontSize: 12, fontWeight: "700", color: "#EF4444" }}>Clear ✕</Text>
                    </TouchableOpacity>
                  </View>
                )}
                {filteredRequests.map((item) => renderStudentTicketCard(item))}
              </View>
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>

      {/* =======================================================
          PRIORITY 6 AUDIT TRAIL MODAL
          For every request, show:
          REQUEST #1026
          10:15 AM - Student submitted complaint
          10:20 AM - Admin assigned Maintenance Team
          11:05 AM - Staff accepted request
          01:30 PM - Status → In Progress
          04:15 PM - Status → Resolved
          04:45 PM - Student confirmed resolution
      ======================================================= */}
      <Modal
        visible={!!selectedAuditRequest}
        transparent
        animationType="slide"
        onRequestClose={() => setSelectedAuditRequest(null)}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.auditModalCard,
              { backgroundColor: colors.card, borderColor: colors.border },
            ]}
          >
            {/* Modal Header */}
            <View style={styles.auditModalHeader}>
              <View style={{ flex: 1 }}>
                <Text style={styles.auditModalId}>
                  AUDIT TRAIL • {selectedAuditRequest?.complaintId}
                </Text>
                <Text
                  style={[styles.auditModalTitle, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {selectedAuditRequest?.title}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setSelectedAuditRequest(null)}
                style={styles.closeModalBtn}
              >
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Ticket Summary Pills */}
            <View
              style={[
                styles.auditSummaryRow,
                { backgroundColor: isDark ? "#1E293B" : "#F8FAFC" },
              ]}
            >
              <Text style={[styles.auditSummaryText, { color: colors.textSecondary }]}>
                Category: <Text style={{ fontWeight: "700", color: colors.text }}>{selectedAuditRequest?.category}</Text>
              </Text>
              <Text style={[styles.auditSummaryText, { color: colors.textSecondary }]}>
                Location: <Text style={{ fontWeight: "700", color: colors.text }}>{selectedAuditRequest?.location || "Campus"}</Text>
              </Text>
            </View>

            {/* Timeline Stepper */}
            <ScrollView
              style={{ maxHeight: 380 }}
              contentContainerStyle={styles.timelineScroll}
              showsVerticalScrollIndicator={false}
            >
              {selectedAuditRequest?.auditTrail &&
              selectedAuditRequest.auditTrail.length > 0 ? (
                selectedAuditRequest.auditTrail.map((ev, index) => {
                  const isLast =
                    index === selectedAuditRequest.auditTrail!.length - 1;
                  return (
                    <View key={index} style={styles.timelineStepRow}>
                      {/* Left: Time and Line */}
                      <View style={styles.stepIndicatorCol}>
                        <View
                          style={[
                            styles.stepNode,
                            {
                              backgroundColor: isLast
                                ? colors.primary
                                : "#64748B",
                            },
                          ]}
                        >
                          <Ionicons
                            name="checkmark"
                            size={10}
                            color="#FFFFFF"
                          />
                        </View>
                        {!isLast && <View style={styles.stepLine} />}
                      </View>

                      {/* Right: Content */}
                      <View style={styles.stepContentCol}>
                        <View style={styles.stepTimeRow}>
                          <Text style={styles.stepTimeText}>
                            {ev.time} {ev.date ? `• ${ev.date}` : ""}
                          </Text>
                          <View
                            style={[
                              styles.actorBadge,
                              {
                                backgroundColor:
                                  ev.actor === "Student"
                                    ? "#DBEAFE"
                                    : ev.actor === "Admin"
                                    ? "#FEF3C7"
                                    : "#DCFCE7",
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.actorBadgeText,
                                {
                                  color:
                                    ev.actor === "Student"
                                      ? "#1D4ED8"
                                      : ev.actor === "Admin"
                                      ? "#B45309"
                                      : "#15803D",
                                },
                              ]}
                            >
                              {ev.actor}
                            </Text>
                          </View>
                        </View>
                        <Text
                          style={[styles.stepActionText, { color: colors.text }]}
                        >
                          {ev.action}
                        </Text>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View style={styles.timelineStepRow}>
                  <View style={styles.stepIndicatorCol}>
                    <View
                      style={[
                        styles.stepNode,
                        { backgroundColor: colors.primary },
                      ]}
                    />
                  </View>
                  <View style={styles.stepContentCol}>
                    <Text style={styles.stepTimeText}>10:15 AM</Text>
                    <Text
                      style={[styles.stepActionText, { color: colors.text }]}
                    >
                      Student submitted complaint
                    </Text>
                  </View>
                </View>
              )}
            </ScrollView>

            {/* Bottom Actions */}
            {selectedAuditRequest?.status === "Resolved" && (
              <TouchableOpacity
                style={styles.modalConfirmBtn}
                onPress={() =>
                  handleStudentConfirmResolution(selectedAuditRequest)
                }
              >
                <Ionicons
                  name="checkmark-done"
                  size={18}
                  color="#FFFFFF"
                />
                <Text style={styles.modalConfirmBtnText}>
                  Confirm Resolution & Close Ticket
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: {
    padding: 6,
    borderRadius: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabItemActive: {},
  tabText: {
    fontSize: 13,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  hubHeaderCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  hubTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  hubMainTitle: {
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1,
  },
  hubSubPrompt: {
    fontSize: 13,
    marginTop: 6,
    lineHeight: 18,
  },
  cardsGrid: {
    gap: 12,
    marginBottom: 16,
  },
  hubCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  hubCardIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  titleRowFlex: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  hubCardTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  hubCardNative: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 1,
    marginBottom: 3,
  },
  hubCardDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  recentSummaryBox: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 8,
  },
  recentSummaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  recentSummaryTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  noRecentText: {
    fontSize: 12,
    fontStyle: "italic",
    marginVertical: 4,
  },
  recentRowItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  recentIdBadge: {
    fontSize: 11,
    fontWeight: "800",
    color: "#2563EB",
  },
  recentRowTitle: {
    fontSize: 13,
    fontWeight: "600",
    flex: 1,
  },
  miniStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  miniStatusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  studentInfoBar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  studentInfoName: {
    fontSize: 14,
    fontWeight: "700",
  },
  studentInfoSub: {
    fontSize: 12,
    marginTop: 2,
  },
  formCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  formHeading: {
    fontSize: 16,
    fontWeight: "800",
  },
  formHeadingSub: {
    fontSize: 12,
    marginTop: 3,
    marginBottom: 10,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
    marginTop: 12,
  },
  categoryChipsScroll: {
    gap: 8,
    paddingVertical: 4,
  },
  catChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  catChipActive: {
    borderColor: "transparent",
  },
  catChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    minHeight: 80,
  },
  priorityRow: {
    flexDirection: "row",
    gap: 8,
  },
  priorityPill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  priorityPillText: {
    fontSize: 12,
    fontWeight: "700",
  },
  attachPhotoBtn: {
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 10,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  attachPhotoLabel: {
    fontSize: 13,
    fontWeight: "700",
  },
  attachPhotoSub: {
    fontSize: 11,
  },
  photoPreviewCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
  },
  photoPreview: {
    width: 60,
    height: 60,
    borderRadius: 6,
  },
  photoNameText: {
    fontSize: 12,
    fontWeight: "700",
  },
  compressionText: {
    fontSize: 11,
    color: "#059669",
    fontWeight: "600",
    marginTop: 2,
  },
  removePhotoBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  removePhotoText: {
    fontSize: 11,
    color: "#EF4444",
    fontWeight: "700",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 22,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  searchFilterRow: {
    marginBottom: 12,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  filterPillsRow: {
    gap: 8,
    paddingVertical: 4,
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  filterPillActive: {
    borderColor: "transparent",
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingTop: 60,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    maxWidth: 280,
    marginTop: 6,
  },
  applyNowBtn: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  applyNowBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  ticketCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
  },
  ticketCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  idCategoryRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  complaintIdText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#2563EB",
  },
  catTag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  catTagText: {
    fontSize: 11,
    fontWeight: "600",
  },
  priorityBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  ticketTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 6,
  },
  locationText: {
    fontSize: 12,
    fontWeight: "700",
  },
  descText: {
    fontSize: 13,
    lineHeight: 18,
    marginTop: 6,
  },
  metaGrid: {
    flexDirection: "row",
    borderRadius: 8,
    borderWidth: 1,
    padding: 8,
    marginVertical: 10,
    gap: 8,
  },
  metaCol: {
    flex: 1,
  },
  metaLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#64748B",
    textTransform: "uppercase",
  },
  metaVal: {
    fontSize: 12,
    fontWeight: "700",
    marginTop: 2,
  },
  confirmBox: {
    backgroundColor: "#FEF3C7",
    borderColor: "#F59E0B",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginVertical: 8,
  },
  confirmTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#92400E",
  },
  confirmSub: {
    fontSize: 11,
    color: "#B45309",
    marginTop: 2,
    marginBottom: 8,
  },
  confirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#059669",
    paddingVertical: 8,
    borderRadius: 8,
  },
  confirmBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  verifiedBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginVertical: 6,
  },
  verifiedBannerText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#16A34A",
  },
  auditTrailBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    marginTop: 4,
  },
  auditTrailBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    padding: 20,
  },
  auditModalCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    maxHeight: "85%",
  },
  auditModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  auditModalId: {
    fontSize: 12,
    fontWeight: "800",
    color: "#2563EB",
  },
  auditModalTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginTop: 2,
  },
  closeModalBtn: {
    padding: 4,
  },
  auditSummaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  auditSummaryText: {
    fontSize: 12,
  },
  timelineScroll: {
    paddingVertical: 6,
  },
  timelineStepRow: {
    flexDirection: "row",
    minHeight: 56,
  },
  stepIndicatorCol: {
    width: 24,
    alignItems: "center",
  },
  stepNode: {
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  stepLine: {
    width: 2,
    flex: 1,
    backgroundColor: "#CBD5E1",
    marginVertical: 2,
  },
  stepContentCol: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 16,
  },
  stepTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  stepTimeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
  },
  actorBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  actorBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  stepActionText: {
    fontSize: 13,
    fontWeight: "600",
    marginTop: 2,
  },
  modalConfirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#059669",
    paddingVertical: 12,
    borderRadius: 10,
    marginTop: 14,
  },
  modalConfirmBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  // Student Status Cards & Groups
  studentStatsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  studentStatCard: {
    flex: 1,
    minWidth: 70,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderLeftWidth: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  studentStatCardActive: {
    backgroundColor: "rgba(79, 70, 229, 0.08)",
  },
  studentStatVal: {
    fontSize: 16,
    fontWeight: "800",
  },
  studentStatLabel: {
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  studentViewModeBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
    marginTop: 6,
  },
  studentViewModeTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  studentToggleBox: {
    flexDirection: "row",
    padding: 3,
    borderRadius: 8,
    gap: 4,
  },
  studentToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  studentToggleBtnActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  studentToggleText: {
    fontSize: 11,
    fontWeight: "600",
  },
  studentStatusGroupCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 12,
  },
  studentStatusGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  studentStatusGroupIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  studentStatusGroupTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  studentStatusCountPill: {
    paddingVertical: 1,
    paddingHorizontal: 6,
    borderRadius: 10,
  },
  studentStatusCountText: {
    fontSize: 11,
    fontWeight: "800",
  },
  studentStatusGroupDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  studentGroupEmptyBox: {
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  studentGroupEmptyText: {
    fontSize: 12,
    fontStyle: "italic",
  },
  filterNoticeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 12,
  },
});
