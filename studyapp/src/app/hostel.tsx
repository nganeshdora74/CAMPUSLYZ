import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
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
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  where,
} from "firebase/firestore";

import { auth, db } from "../firebase/config";
import { useAppTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";

type HostelInfo = {
  blockName: string;
  type: string;
  status: string;
  roomNo: string;
  roomType: string;
  floor: string;
  wardenName: string;
  wardenPhone: string;
  securityStatus: string;
  bedNo: string;
};

const DEFAULT_HOSTEL: HostelInfo = {
  blockName: "Hostel Block A",
  type: "Student Residence",
  status: "Active",
  roomNo: "A-204",
  roomType: "Double Sharing (AC)",
  floor: "2nd Floor",
  wardenName: "Dr. R. Prakash",
  wardenPhone: "+91 98765 11111",
  securityStatus: "24/7 Security",
  bedNo: "Bed 01",
};

type ComplaintItem = {
  id: string;
  message: string;
  status: "Submitted" | "Reviewing" | "In Progress" | "Resolved";
  date: string;
  type: string;
};

export default function HostelScreen() {
  const { colors, isDark } = useAppTheme();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [hostel, setHostel] = useState<HostelInfo>(DEFAULT_HOSTEL);
  const [complaints, setComplaints] = useState<ComplaintItem[]>([]);

  // Modals
  const [complaintModal, setComplaintModal] = useState(false);
  const [complaintText, setComplaintText] = useState("");
  const [complaintCategory, setComplaintCategory] = useState("Maintenance");
  const [submittingComplaint, setSubmittingComplaint] = useState(false);
  const [detailsModal, setDetailsModal] = useState(false);

  // Firestore sync for user hostel details
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setLoading(false);
      return;
    }

    const hostelRef = doc(db, "users", user.uid, "hostel", "allocation");
    const unsubscribe = onSnapshot(
      hostelRef,
      async (snap) => {
        if (!snap.exists()) {
          try {
            await setDoc(hostelRef, {
              ...DEFAULT_HOSTEL,
              updatedAt: serverTimestamp(),
            });
          } catch (err) {
            console.warn("Seeding hostel error:", err);
          }
          return;
        }

        const data = snap.data();
        setHostel({
          blockName: data.blockName || DEFAULT_HOSTEL.blockName,
          type: data.type || DEFAULT_HOSTEL.type,
          status: data.status || "Active",
          roomNo: data.roomNo || DEFAULT_HOSTEL.roomNo,
          roomType: data.roomType || DEFAULT_HOSTEL.roomType,
          floor: data.floor || DEFAULT_HOSTEL.floor,
          wardenName: data.wardenName || DEFAULT_HOSTEL.wardenName,
          wardenPhone: data.wardenPhone || DEFAULT_HOSTEL.wardenPhone,
          securityStatus: data.securityStatus || DEFAULT_HOSTEL.securityStatus,
          bedNo: data.bedNo || DEFAULT_HOSTEL.bedNo,
        });
        setLoading(false);
      },
      (err) => {
        console.warn("Hostel snap error:", err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  // Firestore sync for hostel complaints
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const complaintsCol = collection(db, "complaints");
    const q = query(
      complaintsCol,
      where("userId", "==", user.uid),
      where("type", "==", "Hostel")
    );

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const loaded: ComplaintItem[] = snap.docs.map((d) => {
          const data = d.data();
          const createdAt = data.createdAt?.toDate
            ? data.createdAt.toDate().toLocaleDateString("en-GB", {
                day: "numeric",
                month: "short",
              })
            : "Recent";

          return {
            id: d.id,
            message: data.message || "",
            status: data.status || "Submitted",
            date: createdAt,
            type: data.category || "General",
          };
        });

        setComplaints(loaded);
      },
      (err) => console.log("Complaints error:", err.message)
    );

    return unsubscribe;
  }, []);

  // Compute latest complaint status for Stepper
  const latestComplaint = complaints.length > 0 ? complaints[0] : null;
  const currentStep =
    latestComplaint?.status === "Resolved"
      ? 4
      : latestComplaint?.status === "In Progress"
      ? 3
      : latestComplaint?.status === "Reviewing"
      ? 2
      : latestComplaint?.status === "Submitted"
      ? 1
      : 1;

  // Submit Complaint
  const handleRaiseComplaint = async () => {
    if (!complaintText.trim()) {
      Alert.alert(t("error", "Missing Details"), "Please describe the hostel issue.");
      return;
    }

    try {
      setSubmittingComplaint(true);
      const user = auth.currentUser;
      await addDoc(collection(db, "complaints"), {
        userId: user ? user.uid : "anonymous",
        userEmail: user ? user.email : "guest",
        type: "Hostel",
        category: complaintCategory,
        message: complaintText.trim(),
        roomNo: hostel.roomNo,
        status: "Submitted",
        createdAt: serverTimestamp(),
      });

      setComplaintText("");
      setComplaintModal(false);
      Alert.alert(t("success", "Complaint Registered"), "Your complaint has been submitted to the hostel warden.");
    } catch (e: any) {
      Alert.alert(t("error", "Error"), e?.message || "Failed to submit complaint.");
    } finally {
      setSubmittingComplaint(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {t("loading", "Loading hostel details...")}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerIconBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text }]}>{t("hostel", "Hostel Management")}</Text>

        <TouchableOpacity onPress={() => router.push("/notices")} style={styles.headerIconBtn}>
          <Ionicons name="notifications-outline" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* HERO CARD: HOSTEL BLOCK */}
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=300&auto=format&fit=crop&q=80",
            }}
            style={styles.heroImage}
          />

          <View style={styles.heroDetails}>
            <View style={styles.heroTitleRow}>
              <View style={styles.heroTitleLeft}>
                <Ionicons name="business" size={16} color={colors.primary} />
                <Text style={[styles.heroTitle, { color: colors.text }]}>{hostel.blockName}</Text>
              </View>
              <View style={styles.activeBadge}>
                <Text style={styles.activeBadgeText}>{hostel.status}</Text>
              </View>
            </View>

            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>{hostel.type}</Text>

            <View style={styles.heroMetaRow}>
              <View>
                <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Room No.</Text>
                <Text style={[styles.metaValue, { color: colors.text }]}>{hostel.roomNo}</Text>
              </View>
              <View style={{ marginLeft: 20 }}>
                <Text style={[styles.metaLabel, { color: colors.textMuted }]}>Room Type</Text>
                <Text style={[styles.metaValue, { color: colors.text }]}>{hostel.roomType}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* ROOM ALLOCATION CARD */}
        <View style={[styles.allocationCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.allocationIconContainer, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="bed" size={22} color={colors.primary} />
          </View>

          <View style={styles.allocationDetails}>
            <Text style={[styles.allocationTitle, { color: colors.text }]}>Room Allocation</Text>
            <View style={styles.allocationMetaRow}>
              <Text style={[styles.allocationSub, { color: colors.textSecondary }]}>
                Room: <Text style={{ color: colors.text, fontWeight: "700" }}>{hostel.roomNo}</Text>
              </Text>
              <Text style={[styles.allocationSub, { color: colors.textSecondary, marginLeft: 14 }]}>
                Floor: <Text style={{ color: colors.text, fontWeight: "700" }}>{hostel.floor}</Text>
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.viewDetailsBtn, { backgroundColor: colors.surface }]}
            onPress={() => setDetailsModal(true)}
          >
            <Text style={[styles.viewDetailsText, { color: colors.primary }]}>Details</Text>
          </TouchableOpacity>
        </View>

        {/* WARDEN & SECURITY 2-COL */}
        <View style={styles.twoColRow}>
          {/* Warden Card */}
          <View style={[styles.colCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.cardHeaderRow}>
              <Ionicons name="person-circle-outline" size={20} color={colors.primary} />
              <Text style={[styles.colTitle, { color: colors.textSecondary }]}>Warden</Text>
            </View>
            <Text style={[styles.colName, { color: colors.text }]}>{hostel.wardenName}</Text>
            <View style={styles.phoneRow}>
              <Ionicons name="call-outline" size={13} color={colors.textMuted} />
              <Text style={[styles.colPhone, { color: colors.textSecondary }]}>{hostel.wardenPhone}</Text>
            </View>
          </View>

          {/* Security Card */}
          <TouchableOpacity
            style={[styles.colCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => Alert.alert("Security Logs", "All hostel entry/exit gates are actively monitored.")}
          >
            <View style={styles.cardHeaderRow}>
              <Ionicons name="shield-checkmark" size={18} color="#10B981" />
              <Text style={[styles.colTitle, { color: colors.textSecondary }]}>Security</Text>
            </View>
            <Text style={[styles.colName, { color: colors.text }]}>{hostel.securityStatus}</Text>
            <View style={styles.phoneRow}>
              <Text style={[styles.entryLogText, { color: colors.primary }]}>Entry Logs</Text>
              <Ionicons name="chevron-forward" size={13} color={colors.primary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* FACILITIES */}
        <View style={[styles.facilitiesCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.facilitiesSectionTitle, { color: colors.text }]}>Hostel Facilities</Text>

          <View style={styles.facilitiesRow}>
            <View style={styles.facilityItem}>
              <View style={[styles.facilityIconCircle, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="wifi" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.facilityLabel, { color: colors.textSecondary }]}>Wi-Fi</Text>
            </View>

            <TouchableOpacity style={styles.facilityItem} onPress={() => router.push("/mess")}>
              <View style={[styles.facilityIconCircle, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="restaurant" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.facilityLabel, { color: colors.textSecondary }]}>Mess</Text>
            </TouchableOpacity>

            <View style={styles.facilityItem}>
              <View style={[styles.facilityIconCircle, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="shirt-outline" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.facilityLabel, { color: colors.textSecondary }]}>Laundry</Text>
            </View>

            <View style={styles.facilityItem}>
              <View style={[styles.facilityIconCircle, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="book-outline" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.facilityLabel, { color: colors.textSecondary }]}>Study Room</Text>
            </View>
          </View>
        </View>

        {/* COMPLAINTS CARD */}
        <View style={[styles.complaintsCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.complaintIconContainer, { backgroundColor: colors.primaryLight }]}>
            <Ionicons name="chatbox-ellipses" size={20} color={colors.primary} />
          </View>

          <View style={styles.complaintInfo}>
            <Text style={[styles.complaintCardTitle, { color: colors.text }]}>Maintenance & Issues</Text>
            <Text style={[styles.complaintCardSubtitle, { color: colors.textSecondary }]}>
              Submit electrical, plumbing, or room complaints
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.raiseComplaintBtn, { backgroundColor: colors.primary }]}
          onPress={() => setComplaintModal(true)}
        >
          <Ionicons name="add-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.raiseComplaintBtnText}>Raise Hostel Complaint</Text>
        </TouchableOpacity>

        {/* COMPLAINT TRACKING STEPPER */}
        <View style={[styles.trackingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.trackingTitle, { color: colors.text }]}>Live Complaint Tracking</Text>
          <Text style={[styles.trackingSubtitle, { color: colors.textSecondary }]}>
            {latestComplaint ? `Latest: "${latestComplaint.message}"` : "No active complaints"}
          </Text>

          <View style={styles.stepperContainer}>
            <View style={[styles.stepperLine, { backgroundColor: colors.border }]} />

            {/* Step 1 */}
            <View style={styles.stepItem}>
              <View
                style={[
                  styles.stepCircle,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  currentStep >= 1 && { backgroundColor: "#10B981", borderColor: "#10B981" },
                ]}
              >
                <Ionicons name="checkmark" size={12} color="#FFFFFF" />
              </View>
              <Text style={[styles.stepLabel, { color: colors.textSecondary }, currentStep >= 1 && { color: colors.text, fontWeight: "700" }]}>
                Submitted
              </Text>
              <Text style={[styles.stepDate, { color: colors.textMuted }]}>{latestComplaint ? latestComplaint.date : "-"}</Text>
            </View>

            {/* Step 2 */}
            <View style={styles.stepItem}>
              <View
                style={[
                  styles.stepCircle,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  currentStep >= 2 && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
              >
                {currentStep >= 2 && <Ionicons name="checkmark" size={12} color="#FFFFFF" />}
              </View>
              <Text style={[styles.stepLabel, { color: colors.textSecondary }, currentStep >= 2 && { color: colors.text, fontWeight: "700" }]}>
                Reviewing
              </Text>
              <Text style={[styles.stepDate, { color: colors.textMuted }]}>-</Text>
            </View>

            {/* Step 3 */}
            <View style={styles.stepItem}>
              <View
                style={[
                  styles.stepCircle,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  currentStep >= 3 && { backgroundColor: "#F59E0B", borderColor: "#F59E0B" },
                ]}
              >
                {currentStep >= 3 && <Ionicons name="construct" size={11} color="#FFFFFF" />}
              </View>
              <Text style={[styles.stepLabel, { color: colors.textSecondary }, currentStep >= 3 && { color: colors.text, fontWeight: "700" }]}>
                In Progress
              </Text>
              <Text style={[styles.stepDate, { color: colors.textMuted }]}>-</Text>
            </View>

            {/* Step 4 */}
            <View style={styles.stepItem}>
              <View
                style={[
                  styles.stepCircle,
                  { backgroundColor: colors.surface, borderColor: colors.border },
                  currentStep >= 4 && { backgroundColor: "#10B981", borderColor: "#10B981" },
                ]}
              >
                {currentStep >= 4 && <Ionicons name="checkmark-done" size={12} color="#FFFFFF" />}
              </View>
              <Text style={[styles.stepLabel, { color: colors.textSecondary }, currentStep >= 4 && { color: colors.text, fontWeight: "700" }]}>
                Resolved
              </Text>
              <Text style={[styles.stepDate, { color: colors.textMuted }]}>-</Text>
            </View>
          </View>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* COMPLAINT MODAL */}
      <Modal visible={complaintModal} transparent animationType="slide" onRequestClose={() => setComplaintModal(false)}>
        <Pressable style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]} onPress={() => setComplaintModal(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Raise Hostel Complaint</Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>Your complaint will be sent directly to the warden.</Text>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Category</Text>
            <View style={styles.categoryRow}>
              {(["Maintenance", "Plumbing", "Electrical", "Cleaning"] as const).map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.categoryPill,
                    { backgroundColor: colors.surface, borderColor: colors.border },
                    complaintCategory === cat && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => setComplaintCategory(cat)}
                >
                  <Text style={[styles.categoryPillText, { color: colors.textSecondary }, complaintCategory === cat && { color: "#FFFFFF", fontWeight: "700" }]}>
                    {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Issue Description</Text>
            <TextInput
              style={[styles.modalTextInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
              placeholder="e.g. Water heater in 2nd floor bathroom not functioning..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              value={complaintText}
              onChangeText={setComplaintText}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={[styles.modalCancelBtn, { backgroundColor: colors.surface }]} onPress={() => setComplaintModal(false)}>
                <Text style={[styles.modalCancelBtnText, { color: colors.textSecondary }]}>{t("cancel", "Cancel")}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.modalSubmitBtn, { backgroundColor: colors.primary }]} onPress={handleRaiseComplaint} disabled={submittingComplaint}>
                {submittingComplaint ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitBtnText}>{t("save", "Submit")}</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ALLOCATION DETAILS MODAL */}
      <Modal visible={detailsModal} transparent animationType="fade" onRequestClose={() => setDetailsModal(false)}>
        <Pressable style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]} onPress={() => setDetailsModal(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Hostel Allocation Details</Text>

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Block Name:</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{hostel.blockName}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Room Number:</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{hostel.roomNo}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Floor:</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{hostel.floor}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Bed Allotment:</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{hostel.bedNo}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={[styles.detailLabel, { color: colors.textSecondary }]}>Warden Contact:</Text>
              <Text style={[styles.detailValue, { color: colors.text }]}>{hostel.wardenPhone}</Text>
            </View>

            <TouchableOpacity style={[styles.closeModalBtn, { backgroundColor: colors.primary }]} onPress={() => setDetailsModal(false)}>
              <Text style={styles.closeModalBtnText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  headerIconBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  heroCard: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    marginBottom: 16,
  },
  heroImage: {
    width: "100%",
    height: 140,
  },
  heroDetails: {
    padding: 16,
  },
  heroTitleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  heroTitleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  heroTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  activeBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  activeBadgeText: {
    color: "#16A34A",
    fontSize: 11,
    fontWeight: "700",
  },
  heroSubtitle: {
    fontSize: 13,
    marginBottom: 12,
  },
  heroMetaRow: {
    flexDirection: "row",
  },
  metaLabel: {
    fontSize: 11,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  allocationCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  allocationIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  allocationDetails: {
    flex: 1,
  },
  allocationTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  allocationMetaRow: {
    flexDirection: "row",
    marginTop: 3,
  },
  allocationSub: {
    fontSize: 12,
  },
  viewDetailsBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  viewDetailsText: {
    fontSize: 12,
    fontWeight: "700",
  },
  twoColRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  colCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  colTitle: {
    fontSize: 12,
    fontWeight: "600",
  },
  colName: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },
  phoneRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  colPhone: {
    fontSize: 11,
  },
  entryLogText: {
    fontSize: 11,
    fontWeight: "600",
  },
  facilitiesCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    marginBottom: 14,
  },
  facilitiesSectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 14,
  },
  facilitiesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  facilityItem: {
    alignItems: "center",
  },
  facilityIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  facilityLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  complaintsCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
  },
  complaintIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  complaintInfo: {
    flex: 1,
  },
  complaintCardTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  complaintCardSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  raiseComplaintBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 14,
    marginBottom: 16,
  },
  raiseComplaintBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  trackingCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
  },
  trackingTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  trackingSubtitle: {
    fontSize: 11,
    marginTop: 2,
    marginBottom: 16,
  },
  stepperContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    position: "relative",
  },
  stepperLine: {
    position: "absolute",
    top: 14,
    left: 20,
    right: 20,
    height: 2,
  },
  stepItem: {
    alignItems: "center",
    width: 64,
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 6,
  },
  stepLabel: {
    fontSize: 11,
  },
  stepDate: {
    fontSize: 9,
    marginTop: 2,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalCard: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    marginBottom: 4,
  },
  modalSub: {
    fontSize: 12,
    marginBottom: 14,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
    marginTop: 10,
  },
  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 11,
  },
  modalTextInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 13,
    textAlignVertical: "top",
    minHeight: 90,
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 18,
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  modalSubmitBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  modalSubmitBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E2E8F0",
  },
  detailLabel: {
    fontSize: 13,
  },
  detailValue: {
    fontSize: 13,
    fontWeight: "700",
  },
  closeModalBtn: {
    marginTop: 20,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  closeModalBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});