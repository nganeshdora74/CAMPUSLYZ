import React, { useEffect, useMemo, useState } from "react";
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
  updateDoc,
  where,
} from "firebase/firestore";

import { auth, db } from "../firebase/config";
import { useAppTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import LanguageToggle from "../components/LanguageToggle";
import OfflineBanner from "../components/OfflineBanner";
import { isAppOffline, queueOfflineAction } from "../services/offlineQueue";
import { getApiUrl } from "../api";

export type GatePassItem = {
  id: string;
  complaintId?: string;
  requesterId?: string;
  studentName?: string;
  rollNo?: string;
  hostelBlock?: string;
  roomNo?: string;
  reason: string;
  date: string;
  outTime: string;
  expectedReturn: string;
  destination: string;
  passType: "Gate Pass (Day Outing)" | "Leave (Multi-day)";
  status: "Pending" | "Under Warden Review" | "Approved" | "Rejected";
  adminComment?: string;
  approvedBy?: string;
  auditTrail?: {
    time: string;
    actor: string;
    action: string;
  }[];
  createdAt?: any;
};

export default function GatePassScreen() {
  const { colors, isDark } = useAppTheme();
  const { t } = useLanguage();

  const [activeTab, setActiveTab] = useState<"apply" | "history">("apply");

  // Form State
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(() => {
    const d = new Date();
    return d.toISOString().split("T")[0];
  });
  const [outTime, setOutTime] = useState("04:30 PM");
  const [expectedReturn, setExpectedReturn] = useState("08:30 PM");
  const [destination, setDestination] = useState("");
  const [passType, setPassType] = useState<"Gate Pass (Day Outing)" | "Leave (Multi-day)">("Gate Pass (Day Outing)");
  const [hostelBlock, setHostelBlock] = useState("Hostel Block B");
  const [roomNo, setRoomNo] = useState("302");
  const [submitting, setSubmitting] = useState(false);

  // History State
  const [passes, setPasses] = useState<GatePassItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  // Prefill student details
  const [studentName, setStudentName] = useState("Rahul Sharma");
  const [rollNo, setRollNo] = useState("22CSE042");

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
          if (d.hostelBlock) setHostelBlock(d.hostelBlock);
          if (d.roomNo) setRoomNo(d.roomNo);
        }
      });
      return () => unsub();
    }
  }, []);

  // Real-time listener for student gate passes & leaves
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
          const list: GatePassItem[] = [];
          snap.forEach((docSnap) => {
            const data = docSnap.data();
            if (
              data.category === "Gate Pass" ||
              data.category === "Leave" ||
              data.requestType === "gate_pass" ||
              data.requestType === "leave"
            ) {
              list.push({
                id: docSnap.id,
                complaintId: data.complaintId || `#GP-${docSnap.id.substring(0, 4).toUpperCase()}`,
                requesterId: data.requesterId,
                studentName: data.studentName || data.requesterName || "Student",
                rollNo: data.rollNo || "",
                hostelBlock: data.hostelBlock || "Block B",
                roomNo: data.roomNo || "",
                reason: data.reason || data.description || "Campus outing",
                date: data.date || "Today",
                outTime: data.outTime || "04:00 PM",
                expectedReturn: data.expectedReturn || data.returnTime || "08:30 PM",
                destination: data.destination || "City Market",
                passType: (data.passType as any) || "Gate Pass (Day Outing)",
                status: data.status || "Pending",
                adminComment: data.adminComment,
                approvedBy: data.assignedTo || data.approvedBy,
                auditTrail: data.auditTrail || [
                  {
                    time: "10:15 AM",
                    actor: "Student",
                    action: "Submitted pass request",
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

          setPasses(list);
          setLoadingHistory(false);
        },
        (err) => {
          console.warn("Gate pass listener:", err);
          setLoadingHistory(false);
        }
      );

      return () => unsub();
    } catch (e) {
      setLoadingHistory(false);
    }
  }, []);

  const handleSubmit = async () => {
    if (!reason.trim()) {
      Alert.alert("Missing Field", "Please enter the reason for outing/leave.");
      return;
    }
    if (!destination.trim()) {
      Alert.alert("Missing Field", "Please enter destination.");
      return;
    }

    setSubmitting(true);
    const user = auth.currentUser;
    const nowStr = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
    const passCode = `#GP-${Math.floor(1000 + Math.random() * 9000)}`;

    const passPayload = {
      complaintId: passCode,
      title: `${passType}: ${destination}`,
      requestType: "gate_pass",
      category: passType.includes("Leave") ? "Leave" : "Gate Pass",
      reason,
      description: `Destination: ${destination}. Out: ${outTime}, Return: ${expectedReturn}. Reason: ${reason}`,
      date,
      outTime,
      expectedReturn,
      destination,
      passType,
      hostelBlock,
      roomNo,
      status: "Pending",
      requesterId: user?.uid || "guest_student",
      requesterName: studentName,
      studentName,
      rollNo,
      priority: "Normal",
      auditTrail: [
        {
          time: nowStr,
          actor: "Student",
          action: "Pass submitted by student",
        },
        {
          time: "Pending",
          actor: "Warden Office",
          action: "Awaiting Warden review and digital stamp",
        },
      ],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    try {
      if (isAppOffline()) {
        await queueOfflineAction("gate_pass", "requests", passPayload);
        Alert.alert(
          "Queued Offline ⚠️",
          "You are currently offline. Your gate pass request has been queued locally and will automatically sync once hostel network reconnects."
        );
        setReason("");
        setDestination("");
        setActiveTab("history");
        setSubmitting(false);
        return;
      }

      await addDoc(collection(db, "requests"), passPayload);

      // Create outgoing and incoming notifications
      const passDate = new Date().toLocaleDateString("en-GB");
      const currentUid = user?.uid || null;
      const currentEmail = user?.email || null;

      // Outgoing notification for student
      await addDoc(collection(db, "notifications"), {
        title: `Gate Pass Submitted (${passCode})`,
        body: `Applied for ${passType}: ${reason.trim()}`,
        type: "gate_pass",
        category: "Hostel",
        target: "Specific",
        studentId: currentUid,
        studentEmail: currentEmail,
        senderId: currentUid,
        senderName: studentName,
        senderEmail: currentEmail,
        senderRole: "student",
        status: "sent",
        date: passDate,
        createdAt: serverTimestamp(),
      });

      // Incoming notification for hostel warden
      await addDoc(collection(db, "notifications"), {
        title: `New Gate Pass: ${studentName}`,
        body: `${studentName} requested ${passType} (${passCode}): "${reason.trim()}"`,
        type: "gate_pass",
        category: "Hostel",
        target: "Hostel Students",
        senderId: currentUid,
        senderName: studentName,
        senderEmail: currentEmail,
        senderRole: "student",
        status: "sent",
        date: passDate,
        createdAt: serverTimestamp(),
      });

      // Sync to MongoDB database
      try {
        const baseUrl = getApiUrl();
        await fetch(`${baseUrl}/api/passes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "gate_pass",
            studentId: currentUid,
            studentName,
            studentEmail: currentEmail,
            rollNo,
            reason: reason.trim(),
            destination: destination.trim(),
            outTime: outTime.trim(),
            returnTime: expectedReturn.trim(),
          }),
        });
      } catch (_) {}

      Alert.alert(
        "Notification Sent Successfully! 🚪",
        `Your ${passType} (#${passCode}) has been submitted. Saved to MongoDB & Firebase. Hostel Warden has been notified.`
      );
      setReason("");
      setDestination("");
      setActiveTab("history");
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to submit gate pass.");
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Approved":
        return "#059669";
      case "Rejected":
        return "#DC2626";
      case "Under Warden Review":
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
          accessibilityLabel="Back"
        >
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>
            {t("gatePass", "Gate Pass & Leave")}
          </Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Digital outing permissions with instant warden review
          </Text>
        </View>
        <LanguageToggle compact />
      </View>

      {/* Offline Status Banner */}
      <OfflineBanner />

      {/* Top Segmented Tabs */}
      <View style={[styles.tabBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[
            styles.tabItem,
            activeTab === "apply" && [
              styles.tabItemActive,
              { borderBottomColor: colors.primary },
            ],
          ]}
          onPress={() => setActiveTab("apply")}
        >
          <Ionicons
            name="create-outline"
            size={18}
            color={activeTab === "apply" ? colors.primary : colors.textSecondary}
          />
          <Text
            style={[
              styles.tabText,
              {
                color: activeTab === "apply" ? colors.primary : colors.textSecondary,
                fontWeight: activeTab === "apply" ? "700" : "500",
              },
            ]}
          >
            Apply Pass
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
            name="receipt-outline"
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
            My Passes ({passes.length})
          </Text>
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        {activeTab === "apply" ? (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Student ID badge summary */}
            <View
              style={[
                styles.studentBadgeCard,
                {
                  backgroundColor: isDark ? "#1E293B" : "#F0FDF4",
                  borderColor: isDark ? "#334155" : "#BBF7D0",
                },
              ]}
            >
              <View style={styles.avatarCircle}>
                <Ionicons name="person" size={20} color="#16A34A" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.badgeName, { color: colors.text }]}>
                  {studentName} ({rollNo})
                </Text>
                <Text style={[styles.badgeMeta, { color: colors.textSecondary }]}>
                  {hostelBlock} • Room {roomNo}
                </Text>
              </View>
              <View style={styles.verifiedTag}>
                <Ionicons name="checkmark-circle" size={14} color="#16A34A" />
                <Text style={styles.verifiedText}>Hostelite</Text>
              </View>
            </View>

            {/* Workflow Indicator */}
            <View style={styles.workflowBox}>
              <View style={styles.workflowStep}>
                <View style={[styles.stepCircle, { backgroundColor: "#2563EB" }]}>
                  <Text style={styles.stepNum}>1</Text>
                </View>
                <Text style={styles.stepLabel}>Submit</Text>
              </View>
              <Ionicons name="arrow-forward" size={14} color="#94A3B8" />
              <View style={styles.workflowStep}>
                <View style={[styles.stepCircle, { backgroundColor: "#D97706" }]}>
                  <Text style={styles.stepNum}>2</Text>
                </View>
                <Text style={styles.stepLabel}>Warden Review</Text>
              </View>
              <Ionicons name="arrow-forward" size={14} color="#94A3B8" />
              <View style={styles.workflowStep}>
                <View style={[styles.stepCircle, { backgroundColor: "#059669" }]}>
                  <Text style={styles.stepNum}>3</Text>
                </View>
                <Text style={styles.stepLabel}>Gate Exit QR</Text>
              </View>
            </View>

            {/* Form Fields */}
            <View
              style={[
                styles.formCard,
                { backgroundColor: colors.card, borderColor: colors.border },
              ]}
            >
              {/* Type Switcher */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                Pass Type
              </Text>
              <View style={styles.typeRow}>
                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    passType === "Gate Pass (Day Outing)" && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => setPassType("Gate Pass (Day Outing)")}
                >
                  <Ionicons
                    name="walk"
                    size={16}
                    color={
                      passType === "Gate Pass (Day Outing)"
                        ? "#FFFFFF"
                        : colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.typeBtnText,
                      {
                        color:
                          passType === "Gate Pass (Day Outing)"
                            ? "#FFFFFF"
                            : colors.text,
                      },
                    ]}
                  >
                    Day Outing
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.typeBtn,
                    passType === "Leave (Multi-day)" && {
                      backgroundColor: colors.primary,
                      borderColor: colors.primary,
                    },
                  ]}
                  onPress={() => setPassType("Leave (Multi-day)")}
                >
                  <Ionicons
                    name="calendar"
                    size={16}
                    color={
                      passType === "Leave (Multi-day)"
                        ? "#FFFFFF"
                        : colors.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.typeBtnText,
                      {
                        color:
                          passType === "Leave (Multi-day)"
                            ? "#FFFFFF"
                            : colors.text,
                      },
                    ]}
                  >
                    Hostel Leave
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Destination */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                Destination *
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
                placeholder="e.g. Master Canteen Market, Hometown, Hospital..."
                placeholderTextColor={colors.textSecondary}
                value={destination}
                onChangeText={setDestination}
              />

              {/* Date */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                Date *
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
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textSecondary}
                value={date}
                onChangeText={setDate}
              />

              {/* Out Time & Return Time */}
              <View style={styles.twoColRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>
                    Out Time *
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
                    placeholder="04:30 PM"
                    placeholderTextColor={colors.textSecondary}
                    value={outTime}
                    onChangeText={setOutTime}
                  />
                </View>

                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>
                    Expected Return *
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
                    placeholder="08:30 PM"
                    placeholderTextColor={colors.textSecondary}
                    value={expectedReturn}
                    onChangeText={setExpectedReturn}
                  />
                </View>
              </View>

              {/* Reason */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                Reason for Outing / Leave *
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
                placeholder="Provide a valid clear reason for warden verification..."
                placeholderTextColor={colors.textSecondary}
                value={reason}
                onChangeText={setReason}
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
                    <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
                    <Text style={styles.submitBtnText}>Submit for Warden Review</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          /* History & Status Tab */
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
            ) : passes.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={56}
                  color={colors.textSecondary}
                />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  No Gate Passes Yet
                </Text>
                <Text
                  style={[styles.emptySubtitle, { color: colors.textSecondary }]}
                >
                  Apply for a day outing or hostel leave above to track status in real-time.
                </Text>
                <TouchableOpacity
                  style={[styles.applyNowBtn, { backgroundColor: colors.primary }]}
                  onPress={() => setActiveTab("apply")}
                >
                  <Text style={styles.applyNowBtnText}>Apply Now</Text>
                </TouchableOpacity>
              </View>
            ) : (
              passes.map((p) => {
                const statusColor = getStatusColor(p.status);
                const isApproved = p.status === "Approved";

                return (
                  <View
                    key={p.id}
                    style={[
                      styles.passCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: isApproved ? "#10B981" : colors.border,
                        borderWidth: isApproved ? 1.5 : 1,
                      },
                    ]}
                  >
                    {/* Header */}
                    <View style={styles.passCardHeader}>
                      <View style={{ flex: 1 }}>
                        <View style={styles.idRow}>
                          <Text style={styles.passId}>{p.complaintId}</Text>
                          <Text style={[styles.passTypeTag, { color: colors.textSecondary }]}>
                            • {p.passType}
                          </Text>
                        </View>
                        <Text style={[styles.destinationTitle, { color: colors.text }]}>
                          📍 {p.destination}
                        </Text>
                      </View>

                      <View
                        style={[
                          styles.statusBadge,
                          { backgroundColor: `${statusColor}18`, borderColor: statusColor },
                        ]}
                      >
                        <View
                          style={[styles.statusDot, { backgroundColor: statusColor }]}
                        />
                        <Text style={[styles.statusText, { color: statusColor }]}>
                          {p.status}
                        </Text>
                      </View>
                    </View>

                    {/* Timings */}
                    <View
                      style={[
                        styles.timingBox,
                        {
                          backgroundColor: isDark ? "#1E293B" : "#F8FAFC",
                          borderColor: colors.border,
                        },
                      ]}
                    >
                      <View style={styles.timingCol}>
                        <Text style={styles.timingLabel}>Date</Text>
                        <Text style={[styles.timingVal, { color: colors.text }]}>
                          {p.date}
                        </Text>
                      </View>
                      <View style={styles.timingCol}>
                        <Text style={styles.timingLabel}>Out Time</Text>
                        <Text style={[styles.timingVal, { color: colors.text }]}>
                          {p.outTime}
                        </Text>
                      </View>
                      <View style={styles.timingCol}>
                        <Text style={styles.timingLabel}>Return By</Text>
                        <Text style={[styles.timingVal, { color: colors.text }]}>
                          {p.expectedReturn}
                        </Text>
                      </View>
                    </View>

                    {/* Reason */}
                    <Text style={[styles.reasonText, { color: colors.textSecondary }]}>
                      Reason: <Text style={{ color: colors.text }}>{p.reason}</Text>
                    </Text>

                    {/* If Approved, render Gate Exit Pass with QR */}
                    {isApproved && (
                      <View style={styles.qrPassBox}>
                        <View style={styles.qrLeft}>
                          <Ionicons name="qr-code" size={54} color="#059669" />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.qrTitle}>DIGITAL GATE PASS ISSUED</Text>
                          <Text style={styles.qrSub}>
                            Show this QR to Main Gate Security for verified departure.
                          </Text>
                          <Text style={styles.qrWarden}>
                            Approved by: {p.approvedBy || "Chief Warden Office"}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Priority 6 Audit Trail */}
                    <View style={styles.trailContainer}>
                      <Text style={[styles.trailTitle, { color: colors.textSecondary }]}>
                        AUDIT TRAIL
                      </Text>
                      <View style={styles.timeline}>
                        {p.auditTrail && p.auditTrail.length > 0 ? (
                          p.auditTrail.map((ev, idx) => (
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
                              Student submitted gate pass request
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
  studentBadgeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  avatarCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#DCFCE7",
    alignItems: "center",
    justifyContent: "center",
  },
  badgeName: {
    fontSize: 14,
    fontWeight: "700",
  },
  badgeMeta: {
    fontSize: 12,
    marginTop: 2,
  },
  verifiedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  verifiedText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#16A34A",
  },
  workflowBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginBottom: 16,
  },
  workflowStep: {
    alignItems: "center",
    gap: 4,
  },
  stepCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  stepNum: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },
  stepLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
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
  typeRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 6,
  },
  typeBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  typeBtnText: {
    fontSize: 13,
    fontWeight: "700",
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
  twoColRow: {
    flexDirection: "row",
    gap: 10,
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
    fontSize: 15,
    fontWeight: "700",
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
  passCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  passCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  idRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  passId: {
    fontSize: 13,
    fontWeight: "800",
    color: "#2563EB",
  },
  passTypeTag: {
    fontSize: 12,
  },
  destinationTitle: {
    fontSize: 16,
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
  timingBox: {
    flexDirection: "row",
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    marginVertical: 10,
  },
  timingCol: {
    flex: 1,
    alignItems: "center",
  },
  timingLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#64748B",
    textTransform: "uppercase",
  },
  timingVal: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 2,
  },
  reasonText: {
    fontSize: 13,
    marginBottom: 8,
  },
  qrPassBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderColor: "#10B981",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    gap: 12,
    marginVertical: 8,
  },
  qrLeft: {
    alignItems: "center",
    justifyContent: "center",
  },
  qrTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#065F46",
    letterSpacing: 0.5,
  },
  qrSub: {
    fontSize: 11,
    color: "#047857",
    marginTop: 2,
  },
  qrWarden: {
    fontSize: 11,
    fontWeight: "700",
    color: "#065F46",
    marginTop: 4,
  },
  trailContainer: {
    marginTop: 8,
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
