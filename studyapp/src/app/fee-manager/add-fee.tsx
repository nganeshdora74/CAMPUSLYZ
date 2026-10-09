import React, { useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
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

export default function AddFeeScreen() {
  const { width } = useWindowDimensions();

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("Academic");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("Per Semester");
  const [course, setCourse] = useState("B.Tech CSE (3rd Sem)");
  const [dueDate, setDueDate] = useState("25 Oct 2026");
  const [broadcastNotif, setBroadcastNotif] = useState(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!title.trim() || !amount.trim()) {
      Alert.alert("Missing Fields", "Please specify fee head title and amount.");
      return;
    }

    if (broadcastNotif) {
      await notificationService.sendNotification({
        title: `New Fee Head Added: ${title.trim()}`,
        body: `A new fee head '${title.trim()}' of ₹${parseInt(amount, 10).toLocaleString()} has been published for ${course}. Due date: ${dueDate}.`,
        role: "fee_manager",
        targetRoles: ["student"],
        category: "fee_reminder",
        metadata: {
          feeHead: title.trim(),
          amount,
          course,
          dueDate,
        },
      });

      setToastMessage(`Notification Sent Successfully! Fee head '${title}' published & broadcasted to ${course}.`);
    } else {
      setToastMessage(`Fee head '${title}' created successfully.`);
    }

    setTimeout(() => {
      setToastMessage(null);
      router.push("/fee-manager/fee-structure");
    }, 2500);
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/fee-manager/fee-management")}
          >
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>
          <View>
            <Text style={styles.pageTitle}>Add New Fee Head</Text>
            <Text style={styles.pageSubtitle}>Create and configure institutional fee item</Text>
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

        <View style={styles.card}>
          <Text style={styles.sectionHeader}>Fee Item Details</Text>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Fee Head Title *</Text>
            <TextInput
              style={styles.formInput}
              placeholder="e.g. Lab Safety & Computing Equipment Fee"
              placeholderTextColor="#94A3B8"
              value={title}
              onChangeText={setTitle}
            />
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.formLabel}>Amount (₹) *</Text>
              <TextInput
                style={styles.formInput}
                placeholder="e.g. 3500"
                placeholderTextColor="#94A3B8"
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />
            </View>

            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.formLabel}>Due Date</Text>
              <TextInput
                style={styles.formInput}
                value={dueDate}
                onChangeText={setDueDate}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Fee Category</Text>
            <View style={styles.pillRow}>
              {["Academic", "Residential", "Mess", "Examination", "Amenities"].map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.pillBtn,
                    category === cat && styles.pillBtnActive,
                  ]}
                  onPress={() => setCategory(cat)}
                >
                  <Text
                    style={[
                      styles.pillBtnText,
                      category === cat && styles.pillBtnTextActive,
                    ]}
                  >
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Frequency</Text>
            <View style={styles.pillRow}>
              {["Per Semester", "Annual", "One-Time", "Monthly"].map((freq) => (
                <TouchableOpacity
                  key={freq}
                  style={[
                    styles.pillBtn,
                    frequency === freq && styles.pillBtnActive,
                  ]}
                  onPress={() => setFrequency(freq)}
                >
                  <Text
                    style={[
                      styles.pillBtnText,
                      frequency === freq && styles.pillBtnTextActive,
                    ]}
                  >
                    {freq}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Applicable Program / Cohort</Text>
            <TextInput
              style={styles.formInput}
              value={course}
              onChangeText={setCourse}
            />
          </View>

          {/* Broadcast checkbox */}
          <TouchableOpacity
            style={styles.checkRow}
            onPress={() => setBroadcastNotif(!broadcastNotif)}
          >
            <Ionicons
              name={broadcastNotif ? "checkbox" : "square-outline"}
              size={22}
              color={broadcastNotif ? "#2563EB" : "#64748B"}
            />
            <Text style={styles.checkText}>
              Broadcast notification instantly to all enrolled students & record outgoing log
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.submitBtn} onPress={handleSubmit}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#FFFFFF" />
            <Text style={styles.submitBtnText}>Create & Publish Fee Head</Text>
          </TouchableOpacity>
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
    maxWidth: 800,
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
    flex: 1,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sectionHeader: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formRow: {
    flexDirection: "row",
    gap: 14,
  },
  formLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
  },
  pillRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pillBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  pillBtnActive: {
    backgroundColor: "#0A1E3F",
    borderColor: "#0A1E3F",
  },
  pillBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  pillBtnTextActive: {
    color: "#FFFFFF",
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 14,
  },
  checkText: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "500",
    flex: 1,
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0A1E3F",
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 10,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
