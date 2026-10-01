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
import { onAuthStateChanged, User } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";

import { auth, db } from "../firebase/config";
import { confirmAction } from "../firebase/auth";
import { useAppTheme } from "../context/ThemeContext";
import {
  pickPdfDocument,
  shareOrDownloadPdf,
  uploadRequestFile,
} from "../services/certificatePdfService";

type RequestType = "leave" | "gate";

export type PassItem = {
  id: string;
  requestId?: string;
  sourceCollection?: "requests" | "leaveRequests" | "gatePassRequests";
  type: "Leave" | "Gate Pass";
  reason: string;
  category?: string;
  priority?: string;
  fromDate?: string;
  toDate?: string;
  date?: string;
  outTime?: string;
  returnTime?: string;
  destination?: string;
  contactNumber?: string;
  status: "Pending" | "Approved" | "In Progress" | "Rejected";
  // Student attached hardcopy
  photoUrl?: string;
  pdfUrl?: string;
  pdfName?: string;
  // Admin response & attachments
  adminComment?: string;
  adminPhotoUrl?: string;
  adminPdfUrl?: string;
  adminPdfName?: string;
  createdAt?: any;
};

const LEAVE_CATEGORIES = [
  "Medical / Sick",
  "Family Event",
  "Academic / Seminar",
  "Emergency",
  "Weekend / Holiday",
];

const GATE_CATEGORIES = [
  "Market / Groceries",
  "Medical / Hospital",
  "Library / Study",
  "Personal Outing",
  "Other",
];

export default function LeaveGatePassScreen() {
  const { colors, isDark } = useAppTheme();

  // Current authenticated user & profile
  const [currentUser, setCurrentUser] = useState<User | null>(auth.currentUser);
  const [studentProfile, setStudentProfile] = useState<{
    name?: string;
    rollNo?: string;
    department?: string;
    phone?: string;
  } | null>(null);

  const [activeSegment, setActiveSegment] = useState<"apply" | "history">("apply");
  const [passType, setPassType] = useState<RequestType>("leave");

  // Form states
  const [reason, setReason] = useState("");
  const [category, setCategory] = useState("Medical / Sick");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [outTime, setOutTime] = useState("");
  const [returnTime, setReturnTime] = useState("");
  const [destination, setDestination] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");

  // Attachments (Student Hardcopy)
  const [photoUri, setPhotoUri] = useState("");
  const [photoName, setPhotoName] = useState("");
  const [pdfUri, setPdfUri] = useState("");
  const [pdfName, setPdfName] = useState("");
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // History states
  const [passes, setPasses] = useState<PassItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyFilter, setHistoryFilter] = useState<"All" | "Pending" | "Approved" | "Rejected">("All");

  // Auth observer and real-time pass listener
  useEffect(() => {
    let unsubRequests = () => {};
    let unsubLeaves = () => {};
    let unsubGates = () => {};

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (!user) {
        setLoading(false);
        setPasses([]);
        return;
      }

      // Fetch student profile details for auto-filling and ticket meta
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const ud = userDoc.data();
          const profileData = {
            name: ud.name || ud.fullName || user.displayName || "Student",
            rollNo: ud.rollNo || ud.rollNumber || "",
            department: ud.department || ud.branch || "",
            phone: ud.phone || ud.phoneNumber || ud.contactNumber || "",
          };
          setStudentProfile(profileData);
          if (profileData.phone && !contactNumber) {
            setContactNumber(profileData.phone);
          }
        }
      } catch (err) {
        console.warn("Could not load student profile:", err);
      }

      setLoading(true);

      let reqList: PassItem[] = [];
      let legacyLeaveList: PassItem[] = [];
      let legacyGateList: PassItem[] = [];

      const updateCombined = () => {
        const map = new Map<string, PassItem>();

        // Priority 1: Main requests collection
        reqList.forEach((item) => {
          map.set(item.id, item);
        });

        // Priority 2: Legacy leaveRequests (if not already mapped by requestId)
        legacyLeaveList.forEach((item) => {
          const key = item.requestId || item.id;
          if (!map.has(key)) {
            map.set(key, item);
          }
        });

        // Priority 3: Legacy gatePassRequests (if not already mapped by requestId)
        legacyGateList.forEach((item) => {
          const key = item.requestId || item.id;
          if (!map.has(key)) {
            map.set(key, item);
          }
        });

        const all = Array.from(map.values());
        all.sort((a, b) => {
          const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0;
          const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0;
          return timeB - timeA;
        });

        setPasses(all);
        setLoading(false);
      };

      try {
        // 1. Primary: requests collection
        const requestsQ = query(
          collection(db, "requests"),
          where("requesterId", "==", user.uid)
        );

        unsubRequests = onSnapshot(
          requestsQ,
          (snapshot) => {
            reqList = snapshot.docs
              .map((d) => {
                const dt = d.data();
                const isLeave =
                  dt.category === "Leave" || dt.passType === "leave";
                const isGate =
                  dt.category === "Gate Pass" || dt.passType === "gate";

                if (!isLeave && !isGate) return null;

                return {
                  id: d.id,
                  requestId: d.id,
                  sourceCollection: "requests" as const,
                  type: (isLeave ? "Leave" : "Gate Pass") as "Leave" | "Gate Pass",
                  reason: dt.description || dt.reason || dt.title || "",
                  category: dt.subCategory || dt.category || "General",
                  priority: dt.priority || "Normal",
                  fromDate: dt.fromDate,
                  toDate: dt.toDate,
                  date: dt.date,
                  outTime: dt.outTime,
                  returnTime: dt.returnTime,
                  destination: dt.destination,
                  contactNumber: dt.contactNumber,
                  status: (dt.status || "Pending") as any,
                  photoUrl: dt.photoUrl,
                  pdfUrl: dt.pdfUrl,
                  pdfName: dt.pdfName,
                  adminComment: dt.adminComment || "",
                  adminPhotoUrl: dt.adminPhotoUrl || "",
                  adminPdfUrl: dt.adminPdfUrl || "",
                  adminPdfName: dt.adminPdfName || "",
                  createdAt: dt.createdAt,
                };
              })
              .filter(Boolean) as PassItem[];

            updateCombined();
          },
          (err) => {
            console.warn("Requests snapshot warning:", err);
            updateCombined();
          }
        );

        // 2. Legacy leaveRequests
        const leavesQ = query(
          collection(db, "leaveRequests"),
          where("studentId", "==", user.uid)
        );
        unsubLeaves = onSnapshot(
          leavesQ,
          (snap) => {
            legacyLeaveList = snap.docs.map((d) => {
              const dt = d.data();
              return {
                id: d.id,
                requestId: dt.requestId,
                sourceCollection: "leaveRequests" as const,
                type: "Leave",
                reason: dt.reason || "",
                category: dt.category || "General",
                fromDate: dt.fromDate,
                toDate: dt.toDate,
                status: (dt.status || "Pending") as any,
                photoUrl: dt.photoUrl,
                pdfUrl: dt.pdfUrl,
                pdfName: dt.pdfName,
                adminComment: dt.adminComment || "",
                adminPhotoUrl: dt.adminPhotoUrl || "",
                adminPdfUrl: dt.adminPdfUrl || "",
                adminPdfName: dt.adminPdfName || "",
                createdAt: dt.createdAt,
              };
            });
            updateCombined();
          },
          () => updateCombined()
        );

        // 3. Legacy gatePassRequests
        const gatesQ = query(
          collection(db, "gatePassRequests"),
          where("studentId", "==", user.uid)
        );
        unsubGates = onSnapshot(
          gatesQ,
          (snap) => {
            legacyGateList = snap.docs.map((d) => {
              const dt = d.data();
              return {
                id: d.id,
                requestId: dt.requestId,
                sourceCollection: "gatePassRequests" as const,
                type: "Gate Pass",
                reason: dt.reason || "",
                category: dt.category || "General",
                date: dt.date,
                outTime: dt.outTime,
                returnTime: dt.returnTime,
                destination: dt.destination,
                contactNumber: dt.contactNumber,
                status: (dt.status || "Pending") as any,
                photoUrl: dt.photoUrl,
                pdfUrl: dt.pdfUrl,
                pdfName: dt.pdfName,
                adminComment: dt.adminComment || "",
                adminPhotoUrl: dt.adminPhotoUrl || "",
                adminPdfUrl: dt.adminPdfUrl || "",
                adminPdfName: dt.adminPdfName || "",
                createdAt: dt.createdAt,
              };
            });
            updateCombined();
          },
          () => updateCombined()
        );
      } catch (e) {
        console.warn("Passes listener error:", e);
        setLoading(false);
      }
    });

    return () => {
      unsubAuth();
      unsubRequests();
      unsubLeaves();
      unsubGates();
    };
  }, []);

  // Filtered passes
  const filteredPasses = useMemo(() => {
    if (historyFilter === "All") return passes;
    return passes.filter((p) => p.status === historyFilter);
  }, [passes, historyFilter]);

  // Hardcopy photo selection from gallery
  const handlePickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission", "Please allow gallery access to attach photo slip.");
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        quality: 0.85,
      });
      if (!res.canceled && res.assets?.[0]?.uri) {
        setPhotoUri(res.assets[0].uri);
        setPhotoName(res.assets[0].fileName || "student_slip.jpg");
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not select photo.");
    }
  };

  // Hardcopy photo capture via camera
  const handleTakePhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission", "Please allow camera access to snap a photo.");
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.85,
      });
      if (!res.canceled && res.assets?.[0]?.uri) {
        setPhotoUri(res.assets[0].uri);
        setPhotoName("camera_slip.jpg");
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not take photo.");
    }
  };

  // Hardcopy PDF selection
  const handlePickPdf = async () => {
    try {
      const docRes = await pickPdfDocument();
      if (docRes) {
        setPdfUri(docRes.uri);
        setPdfName(docRes.name);
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not select PDF.");
    }
  };

  // Open PDF file
  const handleOpenPdf = async (url: string, name?: string) => {
    if (!url) return;
    try {
      const ok = await shareOrDownloadPdf(url, name || "Official Document");
      if (!ok) {
        Linking.openURL(url).catch((err) => {
          Alert.alert("Error", "Could not open PDF link: " + err.message);
        });
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Could not open PDF.");
    }
  };

  // Form submission handler
  const handleSubmit = async () => {
    const user = currentUser || auth.currentUser;
    if (!user) {
      Alert.alert("Login Required", "Please log in to apply for a pass.");
      return;
    }

    if (!reason.trim()) {
      Alert.alert("Reason Required", "Please state the reason for your application.");
      return;
    }

    if (passType === "leave") {
      if (!fromDate.trim() || !toDate.trim()) {
        Alert.alert(
          "Dates Required",
          "Please specify both From Date and To Date (e.g. 2026-09-25)."
        );
        return;
      }
    } else {
      if (!date.trim() || !outTime.trim() || !returnTime.trim()) {
        Alert.alert(
          "Timing Required",
          "Please specify Pass Date, Out-Time, and Return-Time."
        );
        return;
      }
    }

    try {
      setSubmitting(true);
      const studentName =
        studentProfile?.name || user.displayName || "Campusly Student";
      const studentEmail = user.email || "";
      const studentRollNo = studentProfile?.rollNo || "";
      const studentDept = studentProfile?.department || "";

      const tempRefId = `pass_${Date.now()}`;
      let uploadedPhoto = photoUri.trim();
      let uploadedPdf = pdfUri.trim();

      if (uploadedPhoto && !uploadedPhoto.startsWith("http")) {
        setUploadStatus("Uploading hardcopy photo...");
        try {
          uploadedPhoto = await uploadRequestFile(
            uploadedPhoto,
            "photo",
            tempRefId,
            "student"
          );
        } catch (photoErr: any) {
          console.warn("Photo upload fallback:", photoErr?.message);
        }
      }

      if (uploadedPdf && !uploadedPdf.startsWith("http")) {
        setUploadStatus("Uploading hardcopy PDF...");
        try {
          uploadedPdf = await uploadRequestFile(
            uploadedPdf,
            "pdf",
            tempRefId,
            "student"
          );
        } catch (pdfErr: any) {
          console.warn("PDF upload fallback:", pdfErr?.message);
        }
      }

      setUploadStatus("Submitting pass to admin portal...");

      const passCategory = passType === "leave" ? "Leave" : "Gate Pass";
      const title =
        passType === "leave"
          ? `Absence Leave: ${category} (${fromDate.trim()} to ${toDate.trim()})`
          : `Campus Gate Pass: ${category} (${outTime.trim()} - ${returnTime.trim()})`;

      const isUrgent =
        category.includes("Sick") ||
        category.includes("Medical") ||
        category.includes("Emergency");

      // 1. Primary write to `requests` collection (so Admin in admin/requests sees it)
      const requestPayload = {
        requesterId: user.uid,
        requesterName: studentName,
        requesterEmail: studentEmail,
        requesterRole: "Student",
        rollNo: studentRollNo,
        department: studentDept,
        title,
        description: reason.trim(),
        category: passCategory,
        subCategory: category,
        passType,
        priority: isUrgent ? "Urgent" : "Normal",
        status: "Pending",
        fromDate: passType === "leave" ? fromDate.trim() : "",
        toDate: passType === "leave" ? toDate.trim() : "",
        date: passType === "gate" ? date.trim() : fromDate.trim() || "",
        outTime: passType === "gate" ? outTime.trim() : "",
        returnTime: passType === "gate" ? returnTime.trim() : "",
        destination: passType === "gate" ? destination.trim() : "",
        contactNumber: contactNumber.trim() || studentProfile?.phone || "",
        photoUrl: uploadedPhoto || "",
        pdfUrl: uploadedPdf || "",
        pdfName: pdfName.trim() || "",
        adminComment: "",
        adminPhotoUrl: "",
        adminPdfUrl: "",
        adminPdfName: "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };

      const requestDocRef = await addDoc(
        collection(db, "requests"),
        requestPayload
      );

      // 2. Dual write to legacy leaveRequests/gatePassRequests for compatibility
      if (passType === "leave") {
        await addDoc(collection(db, "leaveRequests"), {
          requestId: requestDocRef.id,
          studentId: user.uid,
          studentName,
          studentEmail,
          category,
          reason: reason.trim(),
          fromDate: fromDate.trim(),
          toDate: toDate.trim(),
          status: "Pending",
          photoUrl: uploadedPhoto || "",
          pdfUrl: uploadedPdf || "",
          pdfName: pdfName.trim() || "",
          adminComment: "",
          createdAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "gatePassRequests"), {
          requestId: requestDocRef.id,
          studentId: user.uid,
          studentName,
          studentEmail,
          category,
          reason: reason.trim(),
          date: date.trim(),
          outTime: outTime.trim(),
          returnTime: returnTime.trim(),
          destination: destination.trim(),
          contactNumber: contactNumber.trim() || studentProfile?.phone || "",
          status: "Pending",
          photoUrl: uploadedPhoto || "",
          pdfUrl: uploadedPdf || "",
          pdfName: pdfName.trim() || "",
          adminComment: "",
          createdAt: serverTimestamp(),
        });
      }

      // 3. Activity feed for administration
      await addDoc(collection(db, "activities"), {
        title: `New ${passCategory} Request: ${studentName}`,
        time: "Just now",
        user: studentName,
        type: "request",
        createdAt: serverTimestamp(),
      });

      Alert.alert(
        "Application Submitted! 📋",
        `Your ${passType === "leave" ? "leave application" : "campus gate pass"} has been submitted to administration. You can track approval status and admin responses under 'My Passes'.`
      );

      // Reset form
      setReason("");
      setFromDate("");
      setToDate("");
      setOutTime("");
      setReturnTime("");
      setDestination("");
      setPhotoUri("");
      setPhotoName("");
      setPdfUri("");
      setPdfName("");
      setActiveSegment("history");
    } catch (err: any) {
      console.warn("Submit pass error:", err);
      Alert.alert("Error", err?.message || "Failed to submit application.");
    } finally {
      setSubmitting(false);
      setUploadStatus("");
    }
  };

  // Cancel pending pass handler
  const handleCancelPass = (item: PassItem) => {
    confirmAction(
      "Cancel Application",
      "Are you sure you want to cancel this pending pass application?",
      async () => {
        try {
          if (item.sourceCollection === "requests" || item.requestId) {
            const reqId = item.requestId || item.id;
            await deleteDoc(doc(db, "requests", reqId)).catch(() => {});
          }
          if (item.sourceCollection === "leaveRequests" || item.type === "Leave") {
            await deleteDoc(doc(db, "leaveRequests", item.id)).catch(() => {});
          }
          if (item.sourceCollection === "gatePassRequests" || item.type === "Gate Pass") {
            await deleteDoc(doc(db, "gatePassRequests", item.id)).catch(() => {});
          }
          Alert.alert("Canceled", "Application successfully removed.");
        } catch (err: any) {
          Alert.alert("Error", err?.message || "Could not delete application.");
        }
      },
      "Cancel Pass"
    );
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "Approved":
        return {
          bg: "#ECFDF5",
          text: "#059669",
          border: "#A7F3D0",
          icon: "checkmark-circle" as const,
        };
      case "In Progress":
        return {
          bg: "#EFF6FF",
          text: "#2563EB",
          border: "#BFDBFE",
          icon: "sync" as const,
        };
      case "Rejected":
        return {
          bg: "#FEF2F2",
          text: "#DC2626",
          border: "#FECACA",
          icon: "close-circle" as const,
        };
      default:
        return {
          bg: "#FFFBEB",
          text: "#D97706",
          border: "#FDE68A",
          icon: "time" as const,
        };
    }
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.background }]}
      edges={["top", "left", "right"]}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {/* TOP HEADER WITH BACK BUTTON */}
        <View
          style={[
            styles.topHeader,
            { backgroundColor: colors.card, borderBottomColor: colors.border },
          ]}
        >
          <View style={styles.headerTitleRow}>
            {/* Back Button */}
            <TouchableOpacity
              style={[
                styles.backBtn,
                { backgroundColor: isDark ? "#1E293B" : "#F1F5F9" },
              ]}
              onPress={() => router.back()}
              accessibilityLabel="Back"
            >
              <Ionicons name="arrow-back" size={20} color={colors.text} />
            </TouchableOpacity>

            <View
              style={[
                styles.headerIconCircle,
                { backgroundColor: isDark ? "rgba(99,102,241,0.2)" : "#EEF2FF" },
              ]}
            >
              <Ionicons name="exit" size={22} color="#4F46E5" />
            </View>

            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={[styles.screenTitle, { color: colors.text }]}>
                Leave & Gate Pass
              </Text>
              <Text style={[styles.screenSubtitle, { color: colors.textSecondary }]}>
                Campus Out-Passes & Absence Authorizations
              </Text>
            </View>

            <TouchableOpacity
              style={styles.helpdeskLinkBtn}
              onPress={() => router.push("/requests")}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={15} color="#5D3EBC" />
              <Text style={styles.helpdeskLinkText}>Helpdesk</Text>
            </TouchableOpacity>
          </View>

          {/* SEGMENT SELECTOR */}
          <View
            style={[
              styles.segmentContainer,
              { backgroundColor: isDark ? "#1E1E2D" : "#F1F5F9" },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.segmentBtn,
                activeSegment === "apply" && {
                  backgroundColor: colors.card,
                  shadowColor: "#000",
                  shadowOpacity: 0.08,
                  shadowRadius: 4,
                  elevation: 2,
                },
              ]}
              onPress={() => setActiveSegment("apply")}
            >
              <Ionicons
                name="add-circle-outline"
                size={16}
                color={activeSegment === "apply" ? "#4F46E5" : colors.textSecondary}
              />
              <Text
                style={[
                  styles.segmentText,
                  activeSegment === "apply"
                    ? { color: "#4F46E5", fontWeight: "700" }
                    : { color: colors.textSecondary },
                ]}
              >
                Apply New Pass
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.segmentBtn,
                activeSegment === "history" && {
                  backgroundColor: colors.card,
                  shadowColor: "#000",
                  shadowOpacity: 0.08,
                  shadowRadius: 4,
                  elevation: 2,
                },
              ]}
              onPress={() => setActiveSegment("history")}
            >
              <Ionicons
                name="list-outline"
                size={16}
                color={activeSegment === "history" ? "#4F46E5" : colors.textSecondary}
              />
              <Text
                style={[
                  styles.segmentText,
                  activeSegment === "history"
                    ? { color: "#4F46E5", fontWeight: "700" }
                    : { color: colors.textSecondary },
                ]}
              >
                My Passes ({passes.length})
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {activeSegment === "apply" ? (
            /* ================================================= */
            /* APPLY NEW PASS FORM                               */
            /* ================================================= */
            <View>
              {/* PASS TYPE TOGGLE */}
              <View style={styles.typeToggleRow}>
                <TouchableOpacity
                  style={[
                    styles.typeToggleCard,
                    passType === "leave" && styles.typeToggleCardActive,
                    {
                      backgroundColor:
                        passType === "leave"
                          ? isDark
                            ? "#1E1B4B"
                            : "#EEF2FF"
                          : colors.card,
                      borderColor:
                        passType === "leave" ? "#6366F1" : colors.border,
                    },
                  ]}
                  onPress={() => {
                    setPassType("leave");
                    setCategory("Medical / Sick");
                  }}
                >
                  <View
                    style={[
                      styles.typeIconBox,
                      {
                        backgroundColor:
                          passType === "leave" ? "#6366F1" : isDark ? "#334155" : "#F1F5F9",
                      },
                    ]}
                  >
                    <Ionicons
                      name="airplane"
                      size={20}
                      color={passType === "leave" ? "#FFFFFF" : "#64748B"}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text
                      style={[
                        styles.typeCardTitle,
                        { color: passType === "leave" ? "#6366F1" : colors.text },
                      ]}
                    >
                      Absence Leave
                    </Text>
                    <Text style={styles.typeCardDesc}>
                      For 1 or multiple days away from campus
                    </Text>
                  </View>
                  {passType === "leave" && (
                    <Ionicons name="checkmark-circle" size={20} color="#6366F1" />
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeToggleCard,
                    passType === "gate" && styles.typeToggleCardActive,
                    {
                      backgroundColor:
                        passType === "gate"
                          ? isDark
                            ? "#2E1065"
                            : "#F5F3FF"
                          : colors.card,
                      borderColor:
                        passType === "gate" ? "#8B5CF6" : colors.border,
                    },
                  ]}
                  onPress={() => {
                    setPassType("gate");
                    setCategory("Market / Groceries");
                  }}
                >
                  <View
                    style={[
                      styles.typeIconBox,
                      {
                        backgroundColor:
                          passType === "gate" ? "#8B5CF6" : isDark ? "#334155" : "#F1F5F9",
                      },
                    ]}
                  >
                    <Ionicons
                      name="exit-outline"
                      size={20}
                      color={passType === "gate" ? "#FFFFFF" : "#64748B"}
                    />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text
                      style={[
                        styles.typeCardTitle,
                        { color: passType === "gate" ? "#8B5CF6" : colors.text },
                      ]}
                    >
                      Campus Gate Pass
                    </Text>
                    <Text style={styles.typeCardDesc}>
                      Same-day campus out pass & timed entry
                    </Text>
                  </View>
                  {passType === "gate" && (
                    <Ionicons name="checkmark-circle" size={20} color="#8B5CF6" />
                  )}
                </TouchableOpacity>
              </View>

              {/* FORM CARD */}
              <View
                style={[
                  styles.formCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                {/* Category selector */}
                <Text style={[styles.fieldLabel, { color: colors.text }]}>
                  Category / Purpose *
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.chipsRow}
                >
                  {(passType === "leave" ? LEAVE_CATEGORIES : GATE_CATEGORIES).map(
                    (cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.chipBtn,
                          category === cat && styles.chipBtnActive,
                          {
                            borderColor:
                              category === cat ? "#4F46E5" : colors.border,
                            backgroundColor:
                              category === cat
                                ? "#4F46E5"
                                : isDark
                                ? "#1E293B"
                                : "#F8FAFC",
                          },
                        ]}
                        onPress={() => setCategory(cat)}
                      >
                        <Text
                          style={[
                            styles.chipText,
                            category === cat
                              ? styles.chipTextActive
                              : { color: colors.textSecondary },
                          ]}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    )
                  )}
                </ScrollView>

                {/* Detailed Reason Input */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.fieldLabel, { color: colors.text }]}>
                    Detailed Reason *
                  </Text>
                  <TextInput
                    style={[
                      styles.inputBox,
                      {
                        height: 75,
                        textAlignVertical: "top",
                        color: colors.text,
                        borderColor: colors.border,
                        backgroundColor: isDark ? "#1E1E2D" : "#F8FAFC",
                      },
                    ]}
                    placeholder={
                      passType === "leave"
                        ? "State reason for leave (e.g. Attending sister's wedding in home town, doctor appointment)"
                        : "State purpose of stepping out (e.g. Buying project stationery from city market)"
                    }
                    placeholderTextColor={colors.textSecondary}
                    multiline
                    value={reason}
                    onChangeText={setReason}
                  />
                </View>

                {/* LEAVE: FROM & TO DATES */}
                {passType === "leave" ? (
                  <View style={styles.twoColRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.fieldLabel, { color: colors.text }]}>
                        From Date *
                      </Text>
                      <TextInput
                        style={[
                          styles.inputBox,
                          {
                            color: colors.text,
                            borderColor: colors.border,
                            backgroundColor: isDark ? "#1E1E2D" : "#F8FAFC",
                          },
                        ]}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={colors.textSecondary}
                        value={fromDate}
                        onChangeText={setFromDate}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.fieldLabel, { color: colors.text }]}>
                        To Date *
                      </Text>
                      <TextInput
                        style={[
                          styles.inputBox,
                          {
                            color: colors.text,
                            borderColor: colors.border,
                            backgroundColor: isDark ? "#1E1E2D" : "#F8FAFC",
                          },
                        ]}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={colors.textSecondary}
                        value={toDate}
                        onChangeText={setToDate}
                      />
                    </View>
                  </View>
                ) : (
                  /* GATE PASS: DATE, OUT TIME & RETURN TIME */
                  <>
                    <View style={styles.inputGroup}>
                      <Text style={[styles.fieldLabel, { color: colors.text }]}>
                        Pass Date *
                      </Text>
                      <TextInput
                        style={[
                          styles.inputBox,
                          {
                            color: colors.text,
                            borderColor: colors.border,
                            backgroundColor: isDark ? "#1E1E2D" : "#F8FAFC",
                          },
                        ]}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={colors.textSecondary}
                        value={date}
                        onChangeText={setDate}
                      />
                    </View>

                    <View style={styles.twoColRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.fieldLabel, { color: colors.text }]}>
                          Out Time *
                        </Text>
                        <TextInput
                          style={[
                            styles.inputBox,
                            {
                              color: colors.text,
                              borderColor: colors.border,
                              backgroundColor: isDark ? "#1E1E2D" : "#F8FAFC",
                            },
                          ]}
                          placeholder="e.g. 05:30 PM"
                          placeholderTextColor={colors.textSecondary}
                          value={outTime}
                          onChangeText={setOutTime}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.fieldLabel, { color: colors.text }]}>
                          Return Time *
                        </Text>
                        <TextInput
                          style={[
                            styles.inputBox,
                            {
                              color: colors.text,
                              borderColor: colors.border,
                              backgroundColor: isDark ? "#1E1E2D" : "#F8FAFC",
                            },
                          ]}
                          placeholder="e.g. 08:30 PM"
                          placeholderTextColor={colors.textSecondary}
                          value={returnTime}
                          onChangeText={setReturnTime}
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={[styles.fieldLabel, { color: colors.text }]}>
                        Destination / Location
                      </Text>
                      <TextInput
                        style={[
                          styles.inputBox,
                          {
                            color: colors.text,
                            borderColor: colors.border,
                            backgroundColor: isDark ? "#1E1E2D" : "#F8FAFC",
                          },
                        ]}
                        placeholder="e.g. City Mall, Central Hospital, Library"
                        placeholderTextColor={colors.textSecondary}
                        value={destination}
                        onChangeText={setDestination}
                      />
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={[styles.fieldLabel, { color: colors.text }]}>
                        Emergency Contact Number
                      </Text>
                      <TextInput
                        style={[
                          styles.inputBox,
                          {
                            color: colors.text,
                            borderColor: colors.border,
                            backgroundColor: isDark ? "#1E1E2D" : "#F8FAFC",
                          },
                        ]}
                        placeholder="e.g. +91 98765 43210"
                        placeholderTextColor={colors.textSecondary}
                        keyboardType="phone-pad"
                        value={contactNumber}
                        onChangeText={setContactNumber}
                      />
                    </View>
                  </>
                )}

                {/* ================================================= */}
                {/* HARDCOPY ATTACHMENT SECTION (PHOTO & PDF)         */}
                {/* ================================================= */}
                <View
                  style={[
                    styles.attachmentSection,
                    {
                      borderColor: colors.border,
                      backgroundColor: isDark ? "#162032" : "#F8FAFC",
                    },
                  ]}
                >
                  <View style={styles.attachmentHeaderRow}>
                    <Ionicons name="attach" size={17} color="#4F46E5" />
                    <View style={{ flex: 1, marginLeft: 6 }}>
                      <Text
                        style={[
                          styles.attachmentTitle,
                          { color: colors.text },
                        ]}
                      >
                        Attach Hardcopy / Supporting Document (Optional)
                      </Text>
                      <Text
                        style={[
                          styles.attachmentDesc,
                          { color: colors.textSecondary },
                        ]}
                      >
                        Attach medical prescription, parent letter, or physical slip
                      </Text>
                    </View>
                  </View>

                  <View style={styles.attachmentActionButtons}>
                    <TouchableOpacity
                      style={[
                        styles.attachBtn,
                        { borderColor: colors.border, backgroundColor: colors.card },
                      ]}
                      onPress={handlePickPhoto}
                    >
                      <Ionicons name="images-outline" size={16} color="#4F46E5" />
                      <Text
                        style={[
                          styles.attachBtnText,
                          { color: colors.text },
                        ]}
                      >
                        Photo Slip
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.attachBtn,
                        { borderColor: colors.border, backgroundColor: colors.card },
                      ]}
                      onPress={handleTakePhoto}
                    >
                      <Ionicons name="camera-outline" size={16} color="#059669" />
                      <Text
                        style={[
                          styles.attachBtnText,
                          { color: colors.text },
                        ]}
                      >
                        Camera
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.attachBtn,
                        { borderColor: colors.border, backgroundColor: colors.card },
                      ]}
                      onPress={handlePickPdf}
                    >
                      <Ionicons name="document-text-outline" size={16} color="#DC2626" />
                      <Text
                        style={[
                          styles.attachBtnText,
                          { color: colors.text },
                        ]}
                      >
                        PDF Doc
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Attached photo chip */}
                  {!!photoUri && (
                    <View style={styles.attachedFileRow}>
                      <TouchableOpacity
                        style={styles.attachedFileThumb}
                        onPress={() => setPreviewPhoto(photoUri)}
                      >
                        <Image
                          source={{ uri: photoUri }}
                          style={styles.fileThumbImg}
                        />
                      </TouchableOpacity>
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text
                          style={[styles.attachedFileName, { color: colors.text }]}
                          numberOfLines={1}
                        >
                          📷 {photoName || "hardcopy_photo.jpg"}
                        </Text>
                        <Text style={{ fontSize: 11, color: "#059669" }}>
                          Photo hardcopy attached
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.removeAttachBtn}
                        onPress={() => {
                          setPhotoUri("");
                          setPhotoName("");
                        }}
                      >
                        <Ionicons name="close-circle" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Attached PDF chip */}
                  {!!pdfUri && (
                    <View style={styles.attachedFileRow}>
                      <View style={styles.attachedPdfIconBox}>
                        <Ionicons name="document-text" size={20} color="#DC2626" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text
                          style={[styles.attachedFileName, { color: colors.text }]}
                          numberOfLines={1}
                        >
                          📄 {pdfName || "document.pdf"}
                        </Text>
                        <Text style={{ fontSize: 11, color: "#DC2626" }}>
                          PDF hardcopy attached
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.removeAttachBtn}
                        onPress={() => {
                          setPdfUri("");
                          setPdfName("");
                        }}
                      >
                        <Ionicons name="close-circle" size={18} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Upload Status Label */}
                {!!uploadStatus && (
                  <View style={styles.uploadStatusBox}>
                    <ActivityIndicator size="small" color="#4F46E5" />
                    <Text style={styles.uploadStatusText}>{uploadStatus}</Text>
                  </View>
                )}

                {/* SUBMIT BUTTON */}
                <TouchableOpacity
                  style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="send" size={16} color="#FFFFFF" />
                      <Text style={styles.submitBtnText}>
                        Submit{" "}
                        {passType === "leave"
                          ? "Leave Application"
                          : "Gate Pass Request"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          ) : (
            /* ================================================= */
            /* HISTORY / MY PASSES LIST                          */
            /* ================================================= */
            <View>
              {/* FILTER PILLS */}
              <View style={styles.historyFilterRow}>
                {(["All", "Pending", "Approved", "Rejected"] as const).map(
                  (filter) => (
                    <TouchableOpacity
                      key={filter}
                      style={[
                        styles.historyFilterChip,
                        historyFilter === filter && styles.historyFilterChipActive,
                        {
                          borderColor:
                            historyFilter === filter ? "#4F46E5" : colors.border,
                          backgroundColor:
                            historyFilter === filter
                              ? "#4F46E5"
                              : isDark
                              ? "#1E293B"
                              : "#F8FAFC",
                        },
                      ]}
                      onPress={() => setHistoryFilter(filter)}
                    >
                      <Text
                        style={[
                          styles.historyFilterText,
                          historyFilter === filter
                            ? styles.historyFilterTextActive
                            : { color: colors.textSecondary },
                        ]}
                      >
                        {filter}
                      </Text>
                    </TouchableOpacity>
                  )
                )}
              </View>

              {loading ? (
                <View
                  style={[
                    styles.emptyCenterBox,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <ActivityIndicator size="large" color="#4F46E5" />
                  <Text
                    style={[
                      styles.emptyLabel,
                      { color: colors.textSecondary, marginTop: 12 },
                    ]}
                  >
                    Loading your passes...
                  </Text>
                </View>
              ) : filteredPasses.length === 0 ? (
                <View
                  style={[
                    styles.emptyCenterBox,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  <Ionicons
                    name="trail-sign-outline"
                    size={48}
                    color={colors.textSecondary}
                  />
                  <Text
                    style={[
                      styles.emptyLabel,
                      { color: colors.text, marginTop: 10 },
                    ]}
                  >
                    No Passes Found
                  </Text>
                  <Text
                    style={[
                      styles.emptySub,
                      { color: colors.textSecondary },
                    ]}
                  >
                    {historyFilter === "All"
                      ? "You haven't submitted any leave or gate pass applications yet."
                      : `No applications with status '${historyFilter}'.`}
                  </Text>
                  <TouchableOpacity
                    style={styles.createFirstBtn}
                    onPress={() => setActiveSegment("apply")}
                  >
                    <Ionicons name="add-circle" size={16} color="#FFFFFF" />
                    <Text style={styles.createFirstBtnText}>Apply Now</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                filteredPasses.map((item) => {
                  const stBadge = getStatusBadge(item.status);
                  const isLeave = item.type === "Leave";

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.passCard,
                        {
                          backgroundColor: colors.card,
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      {/* CARD HEADER */}
                      <View style={styles.passCardTop}>
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <View
                            style={[
                              styles.passTypeBadge,
                              {
                                backgroundColor: isLeave
                                  ? isDark
                                    ? "#1E1B4B"
                                    : "#EEF2FF"
                                  : isDark
                                  ? "#2E1065"
                                  : "#F5F3FF",
                              },
                            ]}
                          >
                            <Ionicons
                              name={isLeave ? "airplane" : "exit-outline"}
                              size={13}
                              color={isLeave ? "#6366F1" : "#8B5CF6"}
                            />
                            <Text
                              style={[
                                styles.passTypeBadgeText,
                                { color: isLeave ? "#6366F1" : "#8B5CF6" },
                              ]}
                            >
                              {item.type}
                            </Text>
                          </View>

                          <Text
                            style={[
                              styles.passCategoryText,
                              { color: colors.textSecondary },
                            ]}
                          >
                            {item.category}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.statusPill,
                            {
                              backgroundColor: stBadge.bg,
                              borderColor: stBadge.border,
                            },
                          ]}
                        >
                          <Ionicons
                            name={stBadge.icon}
                            size={12}
                            color={stBadge.text}
                          />
                          <Text
                            style={[
                              styles.statusPillText,
                              { color: stBadge.text },
                            ]}
                          >
                            {item.status}
                          </Text>
                        </View>
                      </View>

                      {/* REASON */}
                      <Text
                        style={[styles.passReason, { color: colors.text }]}
                      >
                        {item.reason}
                      </Text>

                      {/* TIMING INFO ROW */}
                      <View
                        style={[
                          styles.timingBox,
                          {
                            backgroundColor: isDark ? "#1E1E2D" : "#F8FAFC",
                            borderColor: colors.border,
                            borderWidth: 1,
                          },
                        ]}
                      >
                        {isLeave ? (
                          <View style={styles.timingItem}>
                            <Ionicons
                              name="calendar-outline"
                              size={14}
                              color="#6366F1"
                            />
                            <Text
                              style={[
                                styles.timingText,
                                { color: colors.textSecondary },
                              ]}
                            >
                              Leave Duration:{" "}
                              <Text
                                style={{
                                  fontWeight: "700",
                                  color: colors.text,
                                }}
                              >
                                {item.fromDate} → {item.toDate}
                              </Text>
                            </Text>
                          </View>
                        ) : (
                          <>
                            <View style={styles.timingItem}>
                              <Ionicons
                                name="calendar-outline"
                                size={14}
                                color="#8B5CF6"
                              />
                              <Text
                                style={[
                                  styles.timingText,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                Pass Date:{" "}
                                <Text
                                  style={{
                                    fontWeight: "700",
                                    color: colors.text,
                                  }}
                                >
                                  {item.date}
                                </Text>
                              </Text>
                            </View>
                            <View style={styles.timingItem}>
                              <Ionicons
                                name="time-outline"
                                size={14}
                                color="#8B5CF6"
                              />
                              <Text
                                style={[
                                  styles.timingText,
                                  { color: colors.textSecondary },
                                ]}
                              >
                                Time:{" "}
                                <Text
                                  style={{
                                    fontWeight: "700",
                                    color: colors.text,
                                  }}
                                >
                                  {item.outTime} → {item.returnTime}
                                </Text>
                              </Text>
                            </View>
                            {!!item.destination && (
                              <View style={styles.timingItem}>
                                <Ionicons
                                  name="location-outline"
                                  size={14}
                                  color="#8B5CF6"
                                />
                                <Text
                                  style={[
                                    styles.timingText,
                                    { color: colors.textSecondary },
                                  ]}
                                >
                                  Destination:{" "}
                                  <Text
                                    style={{
                                      fontWeight: "700",
                                      color: colors.text,
                                    }}
                                  >
                                    {item.destination}
                                  </Text>
                                </Text>
                              </View>
                            )}
                            {!!item.contactNumber && (
                              <View style={styles.timingItem}>
                                <Ionicons
                                  name="call-outline"
                                  size={14}
                                  color="#8B5CF6"
                                />
                                <Text
                                  style={[
                                    styles.timingText,
                                    { color: colors.textSecondary },
                                  ]}
                                >
                                  Contact:{" "}
                                  <Text
                                    style={{
                                      fontWeight: "700",
                                      color: colors.text,
                                    }}
                                  >
                                    {item.contactNumber}
                                  </Text>
                                </Text>
                              </View>
                            )}
                          </>
                        )}
                      </View>

                      {/* STUDENT ATTACHED HARDCOPY BUTTONS */}
                      {(!!item.photoUrl || !!item.pdfUrl) && (
                        <View style={styles.attachmentsRow}>
                          <Text
                            style={[
                              styles.attachmentsLabel,
                              { color: colors.textSecondary },
                            ]}
                          >
                            My Attached Hardcopy:
                          </Text>
                          {item.photoUrl ? (
                            <TouchableOpacity
                              style={[
                                styles.slipChip,
                                { backgroundColor: isDark ? "#312E81" : "#EEF2FF" },
                              ]}
                              onPress={() => setPreviewPhoto(item.photoUrl || null)}
                            >
                              <Ionicons name="image" size={13} color="#4F46E5" />
                              <Text
                                style={[
                                  styles.slipChipText,
                                  { color: "#4F46E5" },
                                ]}
                              >
                                View Photo Slip
                              </Text>
                            </TouchableOpacity>
                          ) : null}

                          {item.pdfUrl ? (
                            <TouchableOpacity
                              style={[
                                styles.slipChip,
                                { backgroundColor: isDark ? "#450A0A" : "#FEE2E2" },
                              ]}
                              onPress={() =>
                                handleOpenPdf(item.pdfUrl!, item.pdfName)
                              }
                            >
                              <Ionicons
                                name="document-text"
                                size={13}
                                color="#DC2626"
                              />
                              <Text
                                style={[
                                  styles.slipChipText,
                                  { color: "#DC2626" },
                                ]}
                              >
                                View PDF Slip
                              </Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      )}

                      {/* OFFICIAL ADMIN REMARK & HARDCOPY RESPONSE */}
                      {(!!item.adminComment ||
                        !!item.adminPhotoUrl ||
                        !!item.adminPdfUrl) && (
                        <View
                          style={[
                            styles.adminRemarkBox,
                            {
                              backgroundColor:
                                item.status === "Approved"
                                  ? isDark
                                    ? "#064E3B"
                                    : "#ECFDF5"
                                  : item.status === "Rejected"
                                  ? isDark
                                    ? "#450A0A"
                                    : "#FEF2F2"
                                  : isDark
                                  ? "#1E293B"
                                  : "#EFF6FF",
                              borderColor:
                                item.status === "Approved"
                                  ? "#10B981"
                                  : item.status === "Rejected"
                                  ? "#EF4444"
                                  : "#3B82F6",
                            },
                          ]}
                        >
                          <View
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              gap: 6,
                              marginBottom: 4,
                            }}
                          >
                            <Ionicons
                              name="shield-checkmark"
                              size={15}
                              color={
                                item.status === "Approved"
                                  ? "#059669"
                                  : item.status === "Rejected"
                                  ? "#DC2626"
                                  : "#2563EB"
                              }
                            />
                            <Text
                              style={{
                                fontSize: 12,
                                fontWeight: "700",
                                color:
                                  item.status === "Approved"
                                    ? "#059669"
                                    : item.status === "Rejected"
                                    ? "#DC2626"
                                    : "#2563EB",
                              }}
                            >
                              Administration Response:
                            </Text>
                          </View>

                          {!!item.adminComment && (
                            <Text
                              style={[
                                styles.adminRemarkText,
                                {
                                  color:
                                    item.status === "Approved"
                                      ? isDark
                                        ? "#D1FAE5"
                                        : "#065F46"
                                      : item.status === "Rejected"
                                      ? isDark
                                        ? "#FEE2E2"
                                        : "#991B1B"
                                      : isDark
                                      ? "#DBEAFE"
                                      : "#1E40AF",
                                },
                              ]}
                            >
                              {item.adminComment}
                            </Text>
                          )}

                          {/* Admin Attached Official Slips */}
                          <View
                            style={{
                              flexDirection: "row",
                              gap: 8,
                              marginTop: 6,
                            }}
                          >
                            {item.adminPhotoUrl ? (
                              <TouchableOpacity
                                style={styles.adminSlipChip}
                                onPress={() =>
                                  setPreviewPhoto(item.adminPhotoUrl || null)
                                }
                              >
                                <Ionicons
                                  name="image"
                                  size={12}
                                  color="#059669"
                                />
                                <Text style={styles.adminSlipText}>
                                  Official Stamped Slip (Photo)
                                </Text>
                              </TouchableOpacity>
                            ) : null}

                            {item.adminPdfUrl ? (
                              <TouchableOpacity
                                style={styles.adminSlipChip}
                                onPress={() =>
                                  handleOpenPdf(
                                    item.adminPdfUrl!,
                                    item.adminPdfName || "Official_Pass.pdf"
                                  )
                                }
                              >
                                <Ionicons
                                  name="document-text"
                                  size={12}
                                  color="#059669"
                                />
                                <Text style={styles.adminSlipText}>
                                  Official Clearance Pass (PDF)
                                </Text>
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        </View>
                      )}

                      {/* APPROVED DIGITAL PASS BANNER */}
                      {item.status === "Approved" && (
                        <View style={styles.approvedPassBanner}>
                          <Ionicons
                            name="shield-checkmark"
                            size={16}
                            color="#059669"
                          />
                          <Text style={styles.approvedPassBannerText}>
                            Official Campus Clearance Granted
                          </Text>
                        </View>
                      )}

                      {/* PENDING ACTIONS */}
                      {item.status === "Pending" && (
                        <View
                          style={[
                            styles.passCardFooter,
                            { borderTopColor: colors.border },
                          ]}
                        >
                          <Text
                            style={{
                              fontSize: 11,
                              color: "#D97706",
                              fontWeight: "600",
                            }}
                          >
                            ⏳ Awaiting Warden / Administration Approval
                          </Text>
                          <TouchableOpacity
                            style={styles.cancelPassBtn}
                            onPress={() => handleCancelPass(item)}
                          >
                            <Ionicons
                              name="trash-outline"
                              size={14}
                              color="#EF4444"
                            />
                            <Text style={styles.cancelPassBtnText}>
                              Cancel
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}
                    </View>
                  );
                })
              )}
            </View>
          )}
        </ScrollView>

        {/* PHOTO PREVIEW FULLSCREEN MODAL */}
        {previewPhoto && (
          <Modal
            visible={!!previewPhoto}
            transparent
            animationType="fade"
            onRequestClose={() => setPreviewPhoto(null)}
          >
            <View style={styles.previewModalOverlay}>
              <View style={styles.previewModalCard}>
                <View style={styles.previewModalTop}>
                  <Text style={styles.previewModalTitle}>
                    Hardcopy Document Preview
                  </Text>
                  <TouchableOpacity
                    style={styles.previewCloseBtn}
                    onPress={() => setPreviewPhoto(null)}
                  >
                    <Ionicons name="close" size={22} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
                <Image
                  source={{ uri: previewPhoto }}
                  style={styles.previewFullImg}
                  resizeMode="contain"
                />
              </View>
            </View>
          </Modal>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    paddingHorizontal: 16,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  headerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  screenTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  screenSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  helpdeskLinkBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  helpdeskLinkText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#5D3EBC",
  },
  segmentContainer: {
    flexDirection: "row",
    borderRadius: 10,
    padding: 4,
    marginTop: 12,
    gap: 4,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  segmentText: {
    fontSize: 12,
    fontWeight: "600",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  // PASS TYPE TOGGLES
  typeToggleRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  typeToggleCard: {
    flex: 1,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },
  typeToggleCardActive: {
    shadowColor: "#6366F1",
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 3,
  },
  typeIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  typeCardTitle: {
    fontSize: 13,
    fontWeight: "800",
  },
  typeCardDesc: {
    fontSize: 10,
    color: "#94A3B8",
    marginTop: 2,
  },
  // FORM
  formCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  chipsRow: {
    gap: 8,
    marginBottom: 14,
  },
  chipBtn: {
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  chipBtnActive: {
    backgroundColor: "#4F46E5",
  },
  chipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  inputGroup: {
    marginBottom: 14,
  },
  twoColRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  inputBox: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
  },
  // ATTACHMENT SECTION
  attachmentSection: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 14,
  },
  attachmentHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  attachmentTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  attachmentDesc: {
    fontSize: 10.5,
    marginTop: 1,
  },
  attachmentActionButtons: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  attachBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 8,
    gap: 4,
  },
  attachBtnText: {
    fontSize: 11,
    fontWeight: "600",
  },
  attachedFileRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(99,102,241,0.06)",
    padding: 8,
    borderRadius: 8,
    marginTop: 6,
  },
  attachedFileThumb: {
    width: 36,
    height: 36,
    borderRadius: 6,
    overflow: "hidden",
  },
  fileThumbImg: {
    width: 36,
    height: 36,
  },
  attachedPdfIconBox: {
    width: 36,
    height: 36,
    borderRadius: 6,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  attachedFileName: {
    fontSize: 12,
    fontWeight: "600",
  },
  removeAttachBtn: {
    padding: 4,
  },
  uploadStatusBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    backgroundColor: "#EEF2FF",
    marginBottom: 10,
  },
  uploadStatusText: {
    fontSize: 12,
    color: "#4F46E5",
    fontWeight: "600",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4F46E5",
    paddingVertical: 13,
    borderRadius: 12,
    gap: 8,
    marginTop: 4,
    shadowColor: "#4F46E5",
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  // HISTORY LIST
  historyFilterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
  },
  historyFilterChip: {
    borderWidth: 1,
    borderRadius: 20,
    paddingVertical: 6,
    paddingHorizontal: 14,
  },
  historyFilterChipActive: {
    backgroundColor: "#4F46E5",
  },
  historyFilterText: {
    fontSize: 12,
    fontWeight: "600",
  },
  historyFilterTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  emptyCenterBox: {
    padding: 30,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  emptyLabel: {
    fontSize: 16,
    fontWeight: "700",
  },
  emptySub: {
    fontSize: 12,
    textAlign: "center",
    marginTop: 4,
    maxWidth: 260,
  },
  createFirstBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4F46E5",
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 10,
    gap: 6,
    marginTop: 14,
  },
  createFirstBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  passCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  passCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  passTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  passTypeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  passCategoryText: {
    fontSize: 11,
    fontWeight: "600",
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  passReason: {
    fontSize: 14,
    fontWeight: "600",
    lineHeight: 19,
    marginBottom: 10,
  },
  timingBox: {
    borderRadius: 8,
    padding: 10,
    gap: 4,
    marginBottom: 10,
  },
  timingItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timingText: {
    fontSize: 12,
  },
  attachmentsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  attachmentsLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  slipChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 9,
    borderRadius: 6,
  },
  slipChipText: {
    fontSize: 11,
    fontWeight: "700",
  },
  adminRemarkBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  adminRemarkText: {
    fontSize: 12,
    fontWeight: "600",
    lineHeight: 17,
  },
  adminSlipChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  adminSlipText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
  },
  approvedPassBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    padding: 8,
    borderRadius: 8,
    marginTop: 4,
  },
  approvedPassBannerText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#065F46",
  },
  passCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 6,
  },
  cancelPassBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "#FEF2F2",
  },
  cancelPassBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#EF4444",
  },
  // PREVIEW MODAL
  previewModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.85)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  previewModalCard: {
    width: "100%",
    maxWidth: 480,
    height: 480,
    backgroundColor: "#0F172A",
    borderRadius: 16,
    overflow: "hidden",
  },
  previewModalTop: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#334155",
  },
  previewModalTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  previewCloseBtn: {
    padding: 4,
  },
  previewFullImg: {
    flex: 1,
    width: "100%",
  },
});
