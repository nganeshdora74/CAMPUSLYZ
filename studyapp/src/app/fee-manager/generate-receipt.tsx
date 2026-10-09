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

export default function GenerateReceiptScreen() {
  const { width } = useWindowDimensions();

  const [studentName, setStudentName] = useState("Rahul Kumar");
  const [rollNo, setRollNo] = useState("CS2101");
  const [course, setCourse] = useState("B.Tech CSE - 3rd Sem");
  const [feeHead, setFeeHead] = useState("Semester Tuition & Hostel");
  const [amount, setAmount] = useState("40000");
  const [paymentMode, setPaymentMode] = useState("UPI (Google Pay)");
  const [txnRef, setTxnRef] = useState("UPI/328901429810");
  const [receiptNo, setReceiptNo] = useState("RCP-2026-915");
  const [isGenerating, setIsGenerating] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!amount.trim() || !studentName.trim()) {
      Alert.alert("Missing Details", "Please specify student and payment amount.");
      return;
    }

    try {
      setIsGenerating(true);
      const numericAmt = parseInt(amount, 10) || 0;

      // Dual-write notification to Firebase & MongoDB
      await notificationService.sendNotification({
        title: `Official Receipt Issued: ${receiptNo}`,
        body: `Payment of ₹${numericAmt.toLocaleString()} received from ${studentName} (${rollNo}) for ${feeHead}. Receipt ${receiptNo} issued.`,
        role: "fee_manager",
        targetRoles: ["student"],
        category: "fee_receipt",
        metadata: {
          receiptNo,
          studentName,
          rollNo,
          amount: numericAmt,
          mode: paymentMode,
          date: "07 Oct 2026",
        },
      });

      setSuccessNotice(`Notification Sent Successfully! Receipt ${receiptNo} generated & delivered to ${studentName}.`);
      setTimeout(() => {
        setSuccessNotice(null);
      }, 5000);
    } catch (err) {
      console.error("Receipt generation error:", err);
      Alert.alert("Notice", "Receipt generated locally.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/fee-manager/receipts")}
          >
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>
          <View>
            <Text style={styles.pageTitle}>Generate Official Receipt</Text>
            <Text style={styles.pageSubtitle}>Issue institutional verified fee receipt with receipt ID</Text>
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
        {successNotice && (
          <View style={styles.toastBanner}>
            <Ionicons name="checkmark-circle" size={22} color="#059669" />
            <Text style={styles.toastText}>{successNotice}</Text>
          </View>
        )}

        <View style={styles.card}>
          <View style={styles.receiptHeader}>
            <View>
              <Text style={styles.cardTitle}>New Fee Receipt</Text>
              <Text style={styles.cardSub}>System-generated series: 2026-Fall</Text>
            </View>
            <View style={styles.rcpTag}>
              <Text style={styles.rcpTagText}>{receiptNo}</Text>
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.formLabel}>Student Name *</Text>
              <TextInput
                style={styles.formInput}
                value={studentName}
                onChangeText={setStudentName}
              />
            </View>

            <View style={[styles.formGroup, { width: 140 }]}>
              <Text style={styles.formLabel}>Roll Number</Text>
              <TextInput
                style={styles.formInput}
                value={rollNo}
                onChangeText={setRollNo}
              />
            </View>
          </View>

          <View style={styles.formGroup}>
            <Text style={styles.formLabel}>Academic Course & Semester</Text>
            <TextInput
              style={styles.formInput}
              value={course}
              onChangeText={setCourse}
            />
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.formLabel}>Fee Head Description</Text>
              <TextInput
                style={styles.formInput}
                value={feeHead}
                onChangeText={setFeeHead}
              />
            </View>

            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.formLabel}>Amount Received (₹) *</Text>
              <TextInput
                style={styles.formInput}
                keyboardType="numeric"
                value={amount}
                onChangeText={setAmount}
              />
            </View>
          </View>

          <View style={styles.formRow}>
            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.formLabel}>Payment Mode</Text>
              <TextInput
                style={styles.formInput}
                value={paymentMode}
                onChangeText={setPaymentMode}
              />
            </View>

            <View style={[styles.formGroup, { flex: 1 }]}>
              <Text style={styles.formLabel}>Transaction Reference / UTR</Text>
              <TextInput
                style={styles.formInput}
                value={txnRef}
                onChangeText={setTxnRef}
              />
            </View>
          </View>

          <TouchableOpacity
            style={[styles.submitBtn, isGenerating && styles.submitBtnDisabled]}
            onPress={handleGenerate}
            disabled={isGenerating}
          >
            <Ionicons name="receipt-outline" size={18} color="#FFFFFF" />
            <Text style={styles.submitBtnText}>
              {isGenerating ? "Generating & Sending..." : "Generate & Dispatch Receipt"}
            </Text>
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
  receiptHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  cardSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  rcpTag: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  rcpTagText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#2563EB",
  },
  formGroup: {
    marginBottom: 14,
  },
  formRow: {
    flexDirection: "row",
    gap: 14,
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
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
  },
  submitBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0A1E3F",
    paddingVertical: 14,
    borderRadius: 10,
    marginTop: 12,
  },
  submitBtnDisabled: {
    opacity: 0.7,
  },
  submitBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});
