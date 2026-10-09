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
import MessLayout from "../../components/mess/MessLayout";

export default function MessSettingsScreen() {
  const { width } = useWindowDimensions();
  const [breakfastTime, setBreakfastTime] = useState("07:30 AM – 09:30 AM");
  const [lunchTime, setLunchTime] = useState("12:30 PM – 02:30 PM");
  const [snacksTime, setSnacksTime] = useState("05:00 PM – 06:00 PM");
  const [dinnerTime, setDinnerTime] = useState("08:00 PM – 10:00 PM");
  const [guestMealFee, setGuestMealFee] = useState("120");
  const [hygieneAuditNotifications, setHygieneAuditNotifications] = useState(true);
  const [lowStockAlerts, setLowStockAlerts] = useState(true);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const handleSave = () => {
    setActionNotice("Mess timings and operational policies updated successfully!");
    setTimeout(() => setActionNotice(null), 3500);
  };

  return (
    <MessLayout
      activeNav="settings"
      pageTitle="Mess Operational Policy"
      pageSubtitle="Configure service windows, guest meal tariffs, and kitchen alerts"
      actionNotice={actionNotice}
      rightAction={
        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Ionicons name="save-outline" size={16} color="#FFFFFF" />
          <Text style={styles.saveBtnText}>Save Policy</Text>
        </TouchableOpacity>
      }
    >
      <View style={styles.container}>
        {/* Meal Timings Configuration */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Dining Hall Serving Windows</Text>
          <Text style={styles.sectionSubtitle}>
            Published on student meal schedule and gate monitors
          </Text>

          <View style={styles.rowTwo}>
            <View style={styles.fieldBox}>
              <Text style={styles.label}>Breakfast Window</Text>
              <TextInput
                value={breakfastTime}
                onChangeText={setBreakfastTime}
                placeholder="07:30 AM – 09:30 AM"
                style={styles.input}
              />
            </View>

            <View style={styles.fieldBox}>
              <Text style={styles.label}>Lunch Window</Text>
              <TextInput
                value={lunchTime}
                onChangeText={setLunchTime}
                placeholder="12:30 PM – 02:30 PM"
                style={styles.input}
              />
            </View>

            <View style={styles.fieldBox}>
              <Text style={styles.label}>Evening Snacks Window</Text>
              <TextInput
                value={snacksTime}
                onChangeText={setSnacksTime}
                placeholder="05:00 PM – 06:00 PM"
                style={styles.input}
              />
            </View>

            <View style={styles.fieldBox}>
              <Text style={styles.label}>Dinner Window</Text>
              <TextInput
                value={dinnerTime}
                onChangeText={setDinnerTime}
                placeholder="08:00 PM – 10:00 PM"
                style={styles.input}
              />
            </View>
          </View>
        </View>

        {/* Pricing & Tariffs */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Guest Dining Tariff</Text>
          <Text style={styles.sectionSubtitle}>
            Price per meal coupon for visiting parents and external guests
          </Text>

          <View style={[styles.fieldBox, { maxWidth: 320 }]}>
            <Text style={styles.label}>Single Meal Coupon Charge (₹)</Text>
            <TextInput
              value={guestMealFee}
              onChangeText={setGuestMealFee}
              placeholder="120"
              keyboardType="numeric"
              style={styles.input}
            />
          </View>
        </View>

        {/* Notification Switches */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Kitchen Alerts & Automation</Text>
          <Text style={styles.sectionSubtitle}>
            Push and SMS notifications triggered by operations
          </Text>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Real-time Low Stock Push Notifications</Text>
              <Text style={styles.toggleDesc}>
                Alert mess manager immediately when pantry staples breach minimum buffer
              </Text>
            </View>
            <Switch
              value={lowStockAlerts}
              onValueChange={setLowStockAlerts}
              trackColor={{ false: "#CBD5E1", true: "#EA580C" }}
            />
          </View>

          <View style={styles.toggleRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.toggleTitle}>Weekly Hygiene & RO Water Quality Audit Reminders</Text>
              <Text style={styles.toggleDesc}>
                Receive Monday morning schedule checklist for kitchen sanitization
              </Text>
            </View>
            <Switch
              value={hygieneAuditNotifications}
              onValueChange={setHygieneAuditNotifications}
              trackColor={{ false: "#CBD5E1", true: "#EA580C" }}
            />
          </View>
        </View>
      </View>
    </MessLayout>
  );
}

const styles = StyleSheet.create({
  saveBtn: {
    backgroundColor: "#EA580C",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  container: {
    gap: 16,
    maxWidth: 800,
  },
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    marginBottom: 16,
  },
  rowTwo: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  fieldBox: {
    flex: 1,
    minWidth: 260,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 6,
  },
  input: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: "#0F172A",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E293B",
  },
  toggleDesc: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    paddingRight: 12,
  },
});
