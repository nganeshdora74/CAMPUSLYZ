import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
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
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  where,
} from "firebase/firestore";

import { auth, db } from "../firebase/config";
import { useAppTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import LanguageToggle from "../components/LanguageToggle";
import OfflineBanner from "../components/OfflineBanner";
import { isAppOffline, queueOfflineAction } from "../services/offlineQueue";

const DOCUMENT_TYPES = [
  "Bonafide Certificate",
  "Migration Certificate",
  "Official Transcript",
  "Character Certificate",
  "Fee Clearance Certificate",
  "ID Card Reissue",
  "Course Completion Letter",
];

const PURPOSES = [
  "Scholarship",
  "Internship / Placement",
  "Passport / Visa Application",
  "Bank Education Loan",
  "Higher Studies Admission",
  "Government Portal Verification",
  "Other",
];

export type DocumentRequestItem = {
  id: string;
  requestId: string;
  requesterId?: string;
  studentName?: string;
  rollNo?: string;
  department?: string;
  documentType: string;
  purpose: string;
  requiredDate: string;
  notes?: string;
  status: "Pending" | "In Review" | "Approved" | "Ready for Pickup" | "Rejected";
  adminComment?: string;
  approvedDate?: string;
  certificateDownloadUrl?: string;
  auditTrail?: {
    time: string;
    actor: string;
    action: string;
  }[];
  createdAt?: any;
};

export default function DocumentRequestScreen() {
  const { colors, isDark } = useAppTheme();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<"submit" | "history">("submit");

  // Form Fields
  const [documentType, setDocumentType] = useState(DOCUMENT_TYPES[0]);
  const [purpose, setPurpose] = useState(PURPOSES[0]);
  const [requiredDate, setRequiredDate] = useState("30 Sept 2026");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Student Profile
  const [studentName, setStudentName] = useState("Rahul");
  const [rollNo, setRollNo] = useState("22CSE042");
  const [department, setDepartment] = useState("Computer Science & Engineering");

  // Request history
  const [docRequests, setDocRequests] = useState<DocumentRequestItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Autofill user details
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
        }
      });
      return () => unsub();
    }
  }, []);

  // Listen to document requests in Firestore
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
        (snap) => {
          const list: DocumentRequestItem[] = [];
          snap.forEach((docSnap) => {
            const data = docSnap.data();
            if (
              data.requestType === "document" ||
              data.category === "Documents" ||
              data.category === "Certificate" ||
              data.documentType
            ) {
              list.push({
                id: docSnap.id,
                requestId: data.complaintId || `#REQ-${docSnap.id.substring(0, 4).toUpperCase()}`,
                requesterId: data.requesterId,
                studentName: data.studentName || data.requesterName || "Student",
                rollNo: data.rollNo || "",
                department: data.department || "",
                documentType: data.documentType || data.title || "Bonafide Certificate",
                purpose: data.purpose || "Academic",
                requiredDate: data.requiredDate || "ASAP",
                notes: data.notes || data.description || "",
                status: data.status || "Pending",
                adminComment: data.adminComment,
                certificateDownloadUrl: data.pdfUrl || data.certificateDownloadUrl,
                auditTrail: data.auditTrail || [
                  {
                    time: "10:15 AM",
                    actor: "Student",
                    action: "Submitted certificate request",
                  },
                ],
                createdAt: data.createdAt,
              });
            }
          });

          // Sort by creation time desc
          list.sort((a, b) => {
            const timeA = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0;
            const timeB = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0;
            return timeB - timeA;
          });

          setDocRequests(list);
          setLoadingHistory(false);
        },
        (err) => {
          console.warn("Doc requests listener:", err);
          setLoadingHistory(false);
        }
      );

      return () => unsub();
    } catch {
      setLoadingHistory(false);
    }
  }, []);

  const handleSubmit = async () => {
    if (!documentType.trim()) {
      Alert.alert("Missing Field", "Please select a document type.");
      return;
    }
    if (!purpose.trim()) {
      Alert.alert("Missing Field", "Please specify purpose.");
      return;
    }

    setSubmitting(true);
    const user = auth.currentUser;
    const reqNum = `#${Math.floor(1000 + Math.random() * 9000)}`;
    const nowTime = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });

    const payload = {
      complaintId: reqNum,
      requestId: reqNum,
      title: `${documentType} - ${purpose}`,
      requestType: "document",
      category: "Documents",
      documentType,
      purpose,
      requiredDate,
      notes,
      description: `Request for ${documentType}. Purpose: ${purpose}. Required by: ${requiredDate}. Notes: ${notes}`,
      status: "Pending",
      requesterId: user?.uid || "guest_student",
      requesterName: studentName,
      studentName,
      rollNo,
      department,
      priority: "Normal",
      auditTrail: [
        {
          time: nowTime,
          actor: "Student",
          action: `Submitted request for ${documentType}`,
        },
        {
          time: "Pending",
          actor: "Academic Cell",
          action: "Awaiting administrative verification and digital seal",
        },
      ],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      if (isAppOffline()) {
        await queueOfflineAction("document", "requests", payload);
        Alert.alert(
          "Queued Offline ⚠️",
          `Your request for ${documentType} has been cached locally and will sync when hostel network returns.`
        );
        setActiveTab("history");
        setSubmitting(false);
        return;
      }

      await addDoc(collection(db, "requests"), payload);
      Alert.alert(
        "Request Submitted! 🎓",
        `Request ${reqNum} for ${documentType} has been submitted to Academic Administration.`
      );
      setNotes("");
      setActiveTab("history");
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to submit request.");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved":
      case "Ready for Pickup":
        return "#059669";
      case "Rejected":
        return "#DC2626";
      case "In Review":
      case "In Progress":
        return "#D97706";
      default:
        return "#2563EB";
    }
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
            {t("bonafideCertificate", "Certificate & Documents")}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Zero-queue paperless certificates & verification letters
          </Text>
        </View>
        <LanguageToggle compact />
      </View>

      <OfflineBanner />

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === "submit" && [
              styles.tabItemActive,
              { borderBottomColor: colors.primary },
            ],
          ]}
          onPress={() => setActiveTab("submit")}
        >
          <Ionicons
            name="document-attach-outline"
            size={18}
            color={activeTab === "submit" ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === "submit" ? colors.primary : colors.textSecondary,
                fontWeight: activeTab === "submit" ? "700" : "500",
              },
            ]}
          >
            New Request
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === "history" && [
              styles.tabItemActive,
              { borderBottomColor: colors.primary },
            ],
          ]}
          onPress={() => setActiveTab("history")}
        >
          <Ionicons
            name="time-outline"
            size={18}
            color={activeTab === "history" ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === "history" ? colors.primary : colors.textSecondary,
                fontWeight: activeTab === "history" ? "700" : "500",
              },
            ]}
          >
            Track Status ({docRequests.length})
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {activeTab === "submit" ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Student Preview Card */}
            <View
              style={[
                styles.studentCard,
                {
                  backgroundColor: isDark ? "#1E293B" : "#EFF6FF",
                  borderColor: isDark ? "#334155" : "#BFDBFE",
                },
              ]}
            >
              <Ionicons name="school" size={22} color="#2563EB" />
              <View style={{ flex: 1 }}>
                <Text style={[styles.studentCardName, { color: colors.text }]}>
                  {studentName} • Roll {rollNo}
                </Text>
                <Text style={[styles.studentCardDept, { color: colors.textSecondary }]}>
                  {department}
                </Text>
              </View>
            </View>

            {/* Document Request Form */}
            <View
              style={[
                styles.formCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              {/* Document Type Selector */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                Document Type *
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsRow}
              >
                {DOCUMENT_TYPES.map((dt) => (
                  <TouchableOpacity
                    key={dt}
                    style={[
                      styles.chip,
                      documentType === dt && [
                        styles.chipActive,
                        { backgroundColor: colors.primary },
                      ],
                    ]}
                    onPress={() => setDocumentType(dt)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        {
                          color:
                            documentType === dt ? "#FFFFFF" : colors.text,
                        },
                      ]}
                    >
                      {dt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Purpose Selector */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                Purpose *
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.chipsRow}
              >
                {PURPOSES.map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[
                      styles.chip,
                      purpose === p && [
                        styles.chipActive,
                        { backgroundColor: colors.primary },
                      ],
                    ]}
                    onPress={() => setPurpose(p)}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        { color: purpose === p ? "#FFFFFF" : colors.text },
                      ]}
                    >
                      {p}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Required Date */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                Required Date *
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
                placeholder="e.g. 30 Sept 2026"
                placeholderTextColor={colors.textSecondary}
                value={requiredDate}
                onChangeText={setRequiredDate}
              />

              {/* Additional Notes */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                Specific Details / Notes (Optional)
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
                placeholder="Mention scholarship name, portal ID, or specific format requirements..."
                placeholderTextColor={colors.textSecondary}
                value={notes}
                onChangeText={setNotes}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              {/* Submit Button */}
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  { backgroundColor: colors.primary },
                  submitting && { opacity: 0.7 },
                ]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="send" size={18} color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>SUBMIT REQUEST</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          /* Track requests tab */
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {loadingHistory ? (
              <ActivityIndicator
                size="large"
                color={colors.primary}
                style={{ marginTop: 40 }}
              />
            ) : docRequests.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="folder-open-outline"
                  size={56}
                  color={colors.textSecondary}
                />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  No Certificate Requests Yet
                </Text>
                <Text
                  style={[styles.emptySubtitle, { color: colors.textSecondary }]}
                >
                  Submit a request for Bonafide certificate or documents above.
                </Text>
                <TouchableOpacity
                  style={[styles.applyNowBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setActiveTab("submit")}
                >
                  <Text style={styles.applyNowBtnText}>Submit New Request</Text>
                </TouchableOpacity>
              </View>
            ) : (
              docRequests.map((req) => {
                const statusColor = getStatusColor(req.status);
                const isApproved =
                  req.status === "Approved" || req.status === "Ready for Pickup";

                return (
                  <View
                    key={req.id}
                    style={[
                      styles.card,
                      {
                        backgroundColor: colors.card,
                        borderColor: isApproved ? "#10B981" : colors.border,
                        borderWidth: isApproved ? 1.5 : 1,
                      },
                    ]}
                  >
                    {/* Header */}
                    <View style={styles.cardHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.reqId}>{req.requestId}</Text>
                        <Text style={[styles.docName, { color: colors.text }]}>
                          🎓 {req.documentType}
                        </Text>
                        <Text
                          style={[styles.purposeText, { color: colors.textSecondary }]}
                        >
                          Purpose:{" "}
                          <Text style={{ fontWeight: "700", color: colors.text }}>
                            {req.purpose}
                          </Text>
                        </Text>
                      </View>

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
                          {req.status}
                        </Text>
                      </View>
                    </View>

                    {/* Due Date pill */}
                    <View
                      style={[
                        styles.infoBar,
                        {
                          backgroundColor: isDark ? "#1E293B" : "#F8FAFC",
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>Required By</Text>
                        <Text style={[styles.infoVal, { color: colors.text }]}>
                          {req.requiredDate}
                        </Text>
                      </View>
                      <View style={styles.infoCol}>
                        <Text style={styles.infoLabel}>Student</Text>
                        <Text style={[styles.infoVal, { color: colors.text }]}>
                          {req.studentName}
                        </Text>
                      </View>
                    </View>

                    {/* Priority 6 Audit Trail */}
                    <View style={styles.trailContainer}>
                      <Text style={[styles.trailTitle, { color: colors.textSecondary }]}>
                        AUDIT TRAIL
                      </Text>
                      <View style={styles.timeline}>
                        {req.auditTrail && req.auditTrail.length > 0 ? (
                          req.auditTrail.map((ev, idx) => (
                            <View key={idx} style={styles.timelineRow}>
                              <View style={styles.timelineDot} />
                              <Text style={styles.timelineTime}>{ev.time}</Text>
                              <Text style={[styles.timelineAction, { color: colors.text }]}>
                                <Text style={{ fontWeight: "700" }}>{ev.actor}: </Text>
                                {ev.action}
                              </Text>
                            </View>
                          ))
                        ) : (
                          <View style={styles.timelineRow}>
                            <View style={styles.timelineDot} />
                            <Text style={styles.timelineTime}>10:15 AM</Text>
                            <Text style={[styles.timelineAction, { color: colors.text }]}>
                              Student submitted request
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
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
    gap: 8,
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabItemActive: {},
  tabText: {
    fontSize: 14,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  studentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  studentCardName: {
    fontSize: 14,
    fontWeight: "700",
  },
  studentCardDept: {
    fontSize: 12,
    marginTop: 2,
  },
  formCard: {
    padding: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 6,
    marginTop: 10,
  },
  chipsRow: {
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  chipActive: {
    borderColor: "transparent",
  },
  chipText: {
    fontSize: 12,
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
    minHeight: 70,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 10,
    marginTop: 20,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
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
  card: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  reqId: {
    fontSize: 12,
    fontWeight: "800",
    color: "#2563EB",
  },
  docName: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 4,
  },
  purposeText: {
    fontSize: 13,
    marginTop: 2,
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
  infoBar: {
    flexDirection: "row",
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    marginVertical: 10,
  },
  infoCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
    textTransform: "uppercase",
  },
  infoVal: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  trailContainer: {
    marginTop: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  trailTitle: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  timeline: {
    gap: 6,
  },
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  timelineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#64748B",
  },
  timelineTime: {
    fontSize: 11,
    fontWeight: "700",
    color: "#64748B",
    minWidth: 55,
  },
  timelineAction: {
    fontSize: 12,
    flex: 1,
  },
});
