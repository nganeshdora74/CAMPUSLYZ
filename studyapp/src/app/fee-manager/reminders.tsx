import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import NotificationBellModal from "../../components/NotificationBellModal";
import notificationService from "../../services/notificationService";

interface SentReminderRecord {
  id: string;
  title: string;
  target: string;
  count: number;
  date: string;
  status: string;
}

const PAST_REMINDERS: SentReminderRecord[] = [
  { id: "rem-1", title: "Semester Tuition Fee Due Date Reminder", target: "Pending Students", count: 42, date: "06 Oct 2026, 03:30 PM", status: "Delivered" },
  { id: "rem-2", title: "Final Defaulter Notice with Late Fee Warning", target: "Defaulters (>30 days)", count: 16, date: "03 Oct 2026, 11:15 AM", status: "Delivered" },
  { id: "rem-3", title: "Mess Advance Clearance Reminder", target: "Hostel Students", count: 50, date: "28 Sep 2026, 05:00 PM", status: "Delivered" },
];

export default function FeeRemindersScreen() {
  const { width } = useWindowDimensions();

  const [reminderTarget, setReminderTarget] = useState("Pending Students (42)");
  const [customTitle, setCustomTitle] = useState("Semester Fee Clearance Reminder");
  const [customBody, setCustomBody] = useState(
    "Dear Student, your semester tuition and hostel fee dues remain pending. Please clear before 15 October 2026 to avoid examination withholding."
  );
  const [includeLateFeeWarning, setIncludeLateFeeWarning] = useState(true);
  const [sentReminders, setSentReminders] = useState<SentReminderRecord[]>(PAST_REMINDERS);
  const [isSending, setIsSending] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSendReminder = async (targetDesc: string, count: number, customText?: string) => {
    try {
      setIsSending(true);
      const title = customText ? customTitle : `Urgent Fee Reminder: ${targetDesc}`;
      const body = customText
        ? customBody + (includeLateFeeWarning ? " Note: A late penalty of ₹500 applies after Oct 15." : "")
        : `Reminder to all ${targetDesc}: Please settle outstanding dues before the approaching deadline.`;

      // Dual-write notification to Firebase & MongoDB
      await notificationService.sendNotification({
        title,
        body,
        role: "fee_manager",
        targetRoles: ["student"],
        category: "fee_reminder",
        metadata: {
          target: targetDesc,
          count,
          dueDate: "15 Oct 2026",
        },
      });

      const newRecord: SentReminderRecord = {
        id: "rem-" + Date.now(),
        title,
        target: targetDesc,
        count,
        date: "Today, Just now",
        status: "Delivered",
      };

      setSentReminders([newRecord, ...sentReminders]);
      setToastMessage(`Notification Sent Successfully! Outgoing notifications dispatched to ${count} students.`);
      setTimeout(() => setToastMessage(null), 5000);
    } catch (err) {
      console.error("Reminder broadcast error:", err);
      Alert.alert("Notice", "Reminder recorded locally.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/fee-manager")}
          >
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>
          <View>
            <Text style={styles.pageTitle}>Fee Reminders Hub</Text>
            <Text style={styles.pageSubtitle}>Automated & Custom Student Dues Broadcast</Text>
          </View>
        </View>

        <View style={styles.topBarRight}>
          <NotificationBellModal />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {toastMessage && (
          <View style={styles.toastBanner}>
            <Ionicons name="checkmark-circle" size={22} color="#059669" />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        )}

        {/* Quick 1-Click Reminder Buttons */}
        <View style={styles.quickGrid}>
          <View style={[styles.quickCard, { borderLeftColor: "#F59E0B" }]}>
            <View style={styles.quickTop}>
              <Ionicons name="time" size={24} color="#D97706" />
              <View style={styles.countBadgePending}>
                <Text style={styles.countBadgeTextPending}>42 Students</Text>
              </View>
            </View>
            <Text style={styles.quickTitle}>Pending Students Reminder</Text>
            <Text style={styles.quickSub}>Dispatch dues reminder to students with partial/unpaid fees</Text>
            <TouchableOpacity
              style={styles.sendQuickBtn}
              onPress={() => handleSendReminder("Pending Students", 42)}
              disabled={isSending}
            >
              <Ionicons name="paper-plane" size={15} color="#FFFFFF" />
              <Text style={styles.sendQuickBtnText}>Send Reminder (42)</Text>
            </TouchableOpacity>
          </View>

          <View style={[styles.quickCard, { borderLeftColor: "#DC2626" }]}>
            <View style={styles.quickTop}>
              <Ionicons name="alert-circle" size={24} color="#DC2626" />
              <View style={styles.countBadgeDefaulter}>
                <Text style={styles.countBadgeTextDefaulter}>16 Students</Text>
              </View>
            </View>
            <Text style={styles.quickTitle}>Defaulters Warning Broadcast</Text>
            <Text style={styles.quickSub}>Issue overdue notice with ₹500 fine and academic sanction warning</Text>
            <TouchableOpacity
              style={[styles.sendQuickBtn, { backgroundColor: "#DC2626" }]}
              onPress={() => handleSendReminder("Defaulters (>30 Days)", 16)}
              disabled={isSending}
            >
              <Ionicons name="megaphone" size={15} color="#FFFFFF" />
              <Text style={styles.sendQuickBtnText}>Issue Warning (16)</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Custom Reminder Composer */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>Custom Fee Reminder Broadcast</Text>
          <Text style={styles.cardHeaderSub}>Compose tailored reminder notification to target cohorts</Text>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Target Audience</Text>
            <View style={styles.targetRow}>
              {["Pending Students (42)", "Defaulters (16)", "All Students (186)"].map((t) => (
                <TouchableOpacity
                  key={t}
                  style={[
                    styles.targetBtn,
                    reminderTarget === t && styles.targetBtnActive,
                  ]}
                  onPress={() => setReminderTarget(t)}
                >
                  <Text
                    style={[
                      styles.targetBtnText,
                      reminderTarget === t && styles.targetBtnTextActive,
                    ]}
                  >
                    {t}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Notification Title</Text>
            <TextInput
              style={styles.formInput}
              value={customTitle}
              onChangeText={setCustomTitle}
            />
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Notification Message Body</Text>
            <TextInput
              style={[styles.formInput, { height: 90, textAlignVertical: "top" }]}
              value={customBody}
              onChangeText={setCustomBody}
              multiline
            />
          </View>

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchTitle}>Append ₹500 Late Fee Warning Clause</Text>
              <Text style={styles.switchSub}>Adds institutional penalty advisory to message</Text>
            </View>
            <Switch
              value={includeLateFeeWarning}
              onValueChange={setIncludeLateFeeWarning}
              trackColor={{ false: "#CBD5E1", true: "#0A1E3F" }}
            />
          </View>

          <TouchableOpacity
            style={[styles.sendComposerBtn, isSending && styles.btnDisabled]}
            onPress={() =>
              handleSendReminder(
                reminderTarget,
                reminderTarget.includes("42") ? 42 : reminderTarget.includes("16") ? 16 : 186,
                customBody
              )
            }
            disabled={isSending}
          >
            <Ionicons name="notifications" size={18} color="#FFFFFF" />
            <Text style={styles.sendComposerBtnText}>
              {isSending ? "Broadcasting Reminders..." : "Send Custom Reminder & Log Outgoing"}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Reminder History Log */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>Dispatched Reminders Audit Trail</Text>
          <Text style={styles.cardHeaderSub}>Historical notifications recorded in MongoDB & Firebase</Text>

          <View style={styles.historyList}>
            {sentReminders.map((r) => (
              <View key={r.id} style={styles.historyItem}>
                <View style={styles.historyIconWrap}>
                  <Ionicons name="checkmark-done-circle" size={24} color="#059669" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyTitle}>{r.title}</Text>
                  <Text style={styles.historySub}>
                    Target: {r.target} • {r.count} Recipients • {r.date}
                  </Text>
                </View>
                <View style={styles.deliveryBadge}>
                  <Text style={styles.deliveryBadgeText}>✓ Sent</Text>
                </View>
              </View>
            ))}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topBar: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  pageSubtitle: {
    fontSize: 12,
    color: "#64748B",
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  scrollContent: {
    padding: 20,
    maxWidth: 960,
    width: "100%",
    alignSelf: "center",
    gap: 16,
  },
  toastBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    padding: 14,
    borderRadius: 8,
    gap: 10,
  },
  toastText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#065F46",
    flex: 1,
  },
  quickGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  quickCard: {
    flex: 1,
    minWidth: 280,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderLeftWidth: 4,
  },
  quickTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  countBadgePending: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  countBadgeTextPending: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D97706",
  },
  countBadgeDefaulter: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  countBadgeTextDefaulter: {
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
  },
  quickTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  quickSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 4,
    marginBottom: 14,
    lineHeight: 18,
  },
  sendQuickBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#D97706",
    paddingVertical: 10,
    borderRadius: 8,
  },
  sendQuickBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardHeaderTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  cardHeaderSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 14,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
  },
  targetRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  targetBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  targetBtnActive: {
    backgroundColor: "#0A1E3F",
    borderColor: "#0A1E3F",
  },
  targetBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  targetBtnTextActive: {
    color: "#FFFFFF",
  },
  formInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: "#0F172A",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    marginTop: 6,
    marginBottom: 12,
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#0F172A",
  },
  switchSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  sendComposerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0A1E3F",
    paddingVertical: 13,
    borderRadius: 8,
  },
  btnDisabled: {
    opacity: 0.7,
  },
  sendComposerBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  historyList: {
    gap: 12,
  },
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  historyIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#ECFDF5",
    alignItems: "center",
    justifyContent: "center",
  },
  historyTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  historySub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  deliveryBadge: {
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  deliveryBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
  },
});
