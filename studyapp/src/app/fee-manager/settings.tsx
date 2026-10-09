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

export default function FeeManagerSettingsScreen() {
  const { width } = useWindowDimensions();

  // Toggles
  const [paymentNotifs, setPaymentNotifs] = useState(true);
  const [autoReminderDues, setAutoReminderDues] = useState(true);
  const [outgoingDeliveryLog, setOutgoingDeliveryLog] = useState(true);
  const [escalateDefaulters, setEscalateDefaulters] = useState(true);
  const [emailDailySummary, setEmailDailySummary] = useState(false);

  // Policy rules
  const [lateFeePenalty, setLateFeePenalty] = useState("500");
  const [gracePeriodDays, setGracePeriodDays] = useState("5");
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSavePolicies = () => {
    setToastMessage("Late fee penalties and billing rules updated successfully.");
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleLogout = () => {
    router.replace("/login");
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
            <Text style={styles.pageTitle}>Finance Settings & Policies</Text>
            <Text style={styles.pageSubtitle}>Late fees, gateways, automated reminders & sync</Text>
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
            <Ionicons name="checkmark-circle" size={20} color="#059669" />
            <Text style={styles.toastText}>{toastMessage}</Text>
          </View>
        )}

        {/* Penalty & Policy Rules */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>Penalty & Late Fee Policies</Text>
          <Text style={styles.cardHeaderSub}>Rules applied automatically after payment deadlines</Text>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.formLabel}>Late Fee Fine per Term (₹)</Text>
              <TextInput
                style={styles.formInput}
                keyboardType="numeric"
                value={lateFeePenalty}
                onChangeText={setLateFeePenalty}
              />
            </View>

            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.formLabel}>Grace Period (Days)</Text>
              <TextInput
                style={styles.formInput}
                keyboardType="numeric"
                value={gracePeriodDays}
                onChangeText={setGracePeriodDays}
              />
            </View>
          </View>

          <TouchableOpacity style={styles.saveRuleBtn} onPress={handleSavePolicies}>
            <Ionicons name="checkmark-outline" size={16} color="#FFFFFF" />
            <Text style={styles.saveRuleBtnText}>Save Policy Changes</Text>
          </TouchableOpacity>
        </View>

        {/* Automated Notifications */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>Notification & Outgoing Dispatch</Text>
          <Text style={styles.cardHeaderSub}>Real-time delivery to students, guardians & finance logs</Text>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Instant Payment Receipts (Push & SMS)</Text>
              <Text style={styles.toggleDesc}>Dispatches notification whenever payment is settled</Text>
            </View>
            <Switch
              value={paymentNotifs}
              onValueChange={setPaymentNotifs}
              trackColor={{ false: "#CBD5E1", true: "#0A1E3F" }}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Auto-Reminder 3 Days Before Due Date</Text>
              <Text style={styles.toggleDesc}>System alerts all students with unpaid semester dues</Text>
            </View>
            <Switch
              value={autoReminderDues}
              onValueChange={setAutoReminderDues}
              trackColor={{ false: "#CBD5E1", true: "#0A1E3F" }}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Outgoing Delivery Receipts (Audit Trail)</Text>
              <Text style={styles.toggleDesc}>Track outgoing notifications with 'Notification Successful' status</Text>
            </View>
            <Switch
              value={outgoingDeliveryLog}
              onValueChange={setOutgoingDeliveryLog}
              trackColor={{ false: "#CBD5E1", true: "#0A1E3F" }}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Escalate Defaulters (&gt;30 Days) to Registrar</Text>
              <Text style={styles.toggleDesc}>Auto-generate defaulter list for hall ticket withholding</Text>
            </View>
            <Switch
              value={escalateDefaulters}
              onValueChange={setEscalateDefaulters}
              trackColor={{ false: "#CBD5E1", true: "#0A1E3F" }}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Daily EOD Settlement Summary to Email</Text>
              <Text style={styles.toggleDesc}>Daily collection totals sent at 06:00 PM</Text>
            </View>
            <Switch
              value={emailDailySummary}
              onValueChange={setEmailDailySummary}
              trackColor={{ false: "#CBD5E1", true: "#0A1E3F" }}
            />
          </View>
        </View>

        {/* Database & Gateway Status */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>Infrastructure & Dual-Database Sync</Text>

          <View style={styles.statusRow}>
            <View style={styles.statusLeft}>
              <View style={[styles.dot, { backgroundColor: "#10B981" }]} />
              <View>
                <Text style={styles.infraName}>MongoDB Persistent Database</Text>
                <Text style={styles.infraSub}>Holds FeeRecords, Users, Notifications & PassRequests</Text>
              </View>
            </View>
            <Text style={styles.infraStatusText}>CONNECTED</Text>
          </View>

          <View style={styles.statusRow}>
            <View style={styles.statusLeft}>
              <View style={[styles.dot, { backgroundColor: "#10B981" }]} />
              <View>
                <Text style={styles.infraName}>Firebase Firestore & Auth</Text>
                <Text style={styles.infraSub}>Real-time notification listeners and authentication token provider</Text>
              </View>
            </View>
            <Text style={styles.infraStatusText}>ACTIVE</Text>
          </View>

          <View style={styles.statusRow}>
            <View style={styles.statusLeft}>
              <View style={[styles.dot, { backgroundColor: "#2563EB" }]} />
              <View>
                <Text style={styles.infraName}>Payment Gateway (UPI / NetBanking)</Text>
                <Text style={styles.infraSub}>Institutional merchant settlement pipeline</Text>
              </View>
            </View>
            <Text style={[styles.infraStatusText, { color: "#2563EB" }]}>READY</Text>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color="#DC2626" />
          <Text style={styles.logoutBtnText}>Sign Out from Finance Officer Account</Text>
        </TouchableOpacity>
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
    maxWidth: 880,
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
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  toastText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#065F46",
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
  formRow: {
    flexDirection: "row",
    gap: 14,
  },
  formGroup: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 14,
    color: "#0F172A",
  },
  saveRuleBtn: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: "#0A1E3F",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 8,
    marginTop: 6,
  },
  saveRuleBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    gap: 16,
  },
  toggleTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#0F172A",
  },
  toggleDesc: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  statusLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  infraName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  infraSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },
  infraStatusText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#059669",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 4,
  },
  logoutBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#DC2626",
  },
});
