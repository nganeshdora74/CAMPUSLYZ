import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  updateDoc,
} from "firebase/firestore";

import { auth, db } from "../firebase/config";
import { useAppTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";

type FeeItem = {
  id: string;
  title: string;
  amount: number;
  status: "Paid" | "Pending";
  dueDate: string;
  category: string;
};

const DEFAULT_FEE_ITEMS: Omit<FeeItem, "id">[] = [
  {
    title: "Tuition Fee",
    amount: 35000,
    status: "Paid",
    dueDate: "15 Oct 2026",
    category: "Academic",
  },
  {
    title: "Hostel Fee",
    amount: 15000,
    status: "Pending",
    dueDate: "30 Oct 2026",
    category: "Accommodation",
  },
  {
    title: "Mess Fee",
    amount: 7500,
    status: "Paid",
    dueDate: "15 Oct 2026",
    category: "Food",
  },
  {
    title: "Examination Fee",
    amount: 2500,
    status: "Paid",
    dueDate: "05 Oct 2026",
    category: "Examination",
  },
  {
    title: "Library & Lab Fee",
    amount: 4000,
    status: "Pending",
    dueDate: "10 Nov 2026",
    category: "Facilities",
  },
];

type FeeQueryItem = {
  id: string;
  message: string;
  status: string;
  createdAt?: string;
};

export default function FeesScreen() {
  const { colors, isDark } = useAppTheme();
  const { t } = useLanguage();

  const [loading, setLoading] = useState(true);
  const [feeItems, setFeeItems] = useState<FeeItem[]>([]);
  const [queries, setQueries] = useState<FeeQueryItem[]>([]);
  const [queryText, setQueryText] = useState("");
  const [submittingQuery, setSubmittingQuery] = useState(false);
  const [payingItemId, setPayingItemId] = useState<string | null>(null);

  // Real-time Firestore sync for user fees breakdown and global admin fees
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      const globalFeesCol = collection(db, "fees");
      const unsubscribe = onSnapshot(globalFeesCol, (snap) => {
        const loaded: FeeItem[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: data.title || "Fee Item",
            amount: Number(data.amount || 0),
            status: (data.status as "Paid" | "Pending") || (data.isPaid ? "Paid" : "Pending"),
            dueDate: data.dueDate || "Not available",
            category: data.category || "General",
          };
        });
        setFeeItems(loaded);
        setLoading(false);
      }, () => {
        setFeeItems([]);
        setLoading(false);
      });
      return unsubscribe;
    }

    const feesCol = collection(db, "users", user.uid, "fees_breakdown");
    const unsubscribe = onSnapshot(
      feesCol,
      (snap) => {
        if (!snap.empty) {
          const loaded: FeeItem[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: data.title || "Fee Item",
              amount: Number(data.amount || 0),
              status: (data.status as "Paid" | "Pending") || (data.isPaid ? "Paid" : "Pending"),
              dueDate: data.dueDate || "Not available",
              category: data.category || "General",
            };
          });
          setFeeItems(loaded);
          setLoading(false);
        } else {
          // If user breakdown is empty, sync from global 'fees' collection created by Admin
          const globalCol = collection(db, "fees");
          onSnapshot(
            globalCol,
            (gSnap) => {
              const loaded: FeeItem[] = gSnap.docs.map((d) => {
                const data = d.data();
                return {
                  id: d.id,
                  title: data.title || "Fee Item",
                  amount: Number(data.amount || 0),
                  status: (data.status as "Paid" | "Pending") || (data.isPaid ? "Paid" : "Pending"),
                  dueDate: data.dueDate || "Not available",
                  category: data.category || "General",
                };
              });
              setFeeItems(loaded);
              setLoading(false);
            },
            () => {
              setFeeItems([]);
              setLoading(false);
            }
          );
        }
      },
      (err) => {
        console.warn("Fees snapshot error:", err.message);
        setFeeItems([]);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const [userProfileFees, setUserProfileFees] = useState<{
    totalFees?: number;
    paidFees?: number;
    remainingFees?: number;
    feeStatus?: string;
  }>({});

  // Real-time Firestore sync for user document (Direct Admin Updates)
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const userDocRef = doc(db, "users", user.uid);
    const unsub = onSnapshot(
      userDocRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setUserProfileFees({
            totalFees: typeof data.totalFees === "number" ? data.totalFees : undefined,
            paidFees: typeof data.paidFees === "number" ? data.paidFees : undefined,
            remainingFees: typeof data.remainingFees === "number" ? data.remainingFees : undefined,
            feeStatus: data.feeStatus,
          });
        }
      },
      (err) => console.warn("User profile fee listener error:", err.message)
    );

    return unsub;
  }, []);

  // Real-time Firestore sync for fee queries
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const q = collection(db, "users", user.uid, "feeQueries");
    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const loaded: FeeQueryItem[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            message: data.message || "",
            status: data.status || "Pending",
            createdAt: data.createdAt || "Recently",
          };
        });
        setQueries(loaded);
      },
      (err) => console.log("Queries listener error:", err.message)
    );

    return unsubscribe;
  }, []);

  // Dynamic calculations from live Firestore data (instantly reflects admin updates)
  const breakdownTotal = feeItems.reduce((acc, item) => acc + item.amount, 0);
  const breakdownPaid = feeItems
    .filter((item) => item.status === "Paid")
    .reduce((acc, item) => acc + item.amount, 0);

  const totalAmount = userProfileFees.totalFees !== undefined
    ? userProfileFees.totalFees
    : (breakdownTotal > 0 ? breakdownTotal : 64000);

  const paidAmount = userProfileFees.paidFees !== undefined
    ? userProfileFees.paidFees
    : (breakdownPaid > 0 ? breakdownPaid : 42500);

  const pendingAmount = userProfileFees.remainingFees !== undefined
    ? userProfileFees.remainingFees
    : Math.max(0, totalAmount - paidAmount);

  const percentage = totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0;
  const nextDueDate =
    feeItems.find((i) => i.status === "Pending")?.dueDate || "30 Oct 2026";

  // Simulate Fee Payment / Toggle Status
  const handlePayFeeItem = async (item: FeeItem) => {
    const user = auth.currentUser;
    if (!user) return;

    if (item.status === "Paid") {
      Alert.alert(t("fees", "Fee"), `₹ ${item.amount.toLocaleString()} for ${item.title} is already paid.`);
      return;
    }

    Alert.alert(
      "Pay Fee",
      `Confirm payment of ₹ ${item.amount.toLocaleString()} for ${item.title}?`,
      [
        { text: t("cancel", "Cancel"), style: "cancel" },
        {
          text: "Pay Now",
          onPress: async () => {
            try {
              setPayingItemId(item.id);
              try {
                await updateDoc(doc(db, "users", user.uid, "fees_breakdown", item.id), {
                  status: "Paid",
                  paidAt: serverTimestamp(),
                });
              } catch (_) {
                await updateDoc(doc(db, "fees", item.id), {
                  status: "Paid",
                  isPaid: true,
                  updatedAt: serverTimestamp(),
                });
              }
              Alert.alert(t("success", "Payment Successful"), `₹ ${item.amount.toLocaleString()} paid for ${item.title}.`);
            } catch (err: any) {
              Alert.alert(t("error", "Error"), err?.message || "Payment update failed.");
            } finally {
              setPayingItemId(null);
            }
          },
        },
      ]
    );
  };

  // Submit query
  const submitQuery = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert(t("error", "Login Required"), "Please login first.");
      return;
    }

    if (!queryText.trim()) {
      Alert.alert(t("error", "Required"), "Please enter your fee query.");
      return;
    }

    try {
      setSubmittingQuery(true);
      await addDoc(collection(db, "users", user.uid, "feeQueries"), {
        studentId: user.uid,
        studentEmail: user.email || "",
        message: queryText.trim(),
        status: "Reviewing",
        createdAt: new Date().toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
      });

      setQueryText("");
      Alert.alert(t("success", "Success"), "Fee query submitted to Accounts Department.");
    } catch (error: any) {
      Alert.alert(t("error", "Error"), error?.message || "Unable to submit query.");
    } finally {
      setSubmittingQuery(false);
    }
  };

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {t("loading", "Loading fees...")}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="chevron-back" size={26} color={colors.text} />
        </TouchableOpacity>

        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t("fees", "Fee Management")}
        </Text>

        <TouchableOpacity onPress={() => router.push("/notices")}>
          <Ionicons name="notifications-outline" size={22} color={colors.text} />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        <View style={styles.body}>
          {/* SUMMARY 3 CARDS */}
          <View style={styles.summaryRow}>
            <View style={[styles.moneyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.moneyIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="wallet-outline" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.moneyTitle, { color: colors.textSecondary }]}>Total</Text>
              <Text style={[styles.moneyValue, { color: colors.primary }]}>
                ₹ {totalAmount.toLocaleString()}
              </Text>
            </View>

            <View style={[styles.moneyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.moneyIcon, { backgroundColor: "#DCFCE7" }]}>
                <Ionicons name="checkmark-circle" size={20} color="#16A34A" />
              </View>
              <Text style={[styles.moneyTitle, { color: colors.textSecondary }]}>Paid</Text>
              <Text style={[styles.moneyValue, { color: "#16A34A" }]}>
                ₹ {paidAmount.toLocaleString()}
              </Text>
            </View>

            <View style={[styles.moneyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={[styles.moneyIcon, { backgroundColor: "#FEE2E2" }]}>
                <Ionicons name="time-outline" size={20} color="#EF4444" />
              </View>
              <Text style={[styles.moneyTitle, { color: colors.textSecondary }]}>Pending</Text>
              <Text style={[styles.moneyValue, { color: "#EF4444" }]}>
                ₹ {pendingAmount.toLocaleString()}
              </Text>
            </View>
          </View>

          {/* PAYMENT STATUS CARD */}
          <Text style={[styles.sectionHeading, { color: colors.text }]}>
            Payment Status
          </Text>

          <View style={[styles.paymentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.progressCircle}>
              <View style={[styles.progressInner, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.percent, { color: colors.primary }]}>{percentage}%</Text>
              </View>
            </View>

            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[styles.paidTitle, { color: colors.textSecondary }]}>Paid vs Total</Text>
              <Text style={[styles.paidAmount, { color: colors.text }]}>
                ₹ {paidAmount.toLocaleString()} / ₹ {totalAmount.toLocaleString()}
              </Text>
              <Text style={[styles.dueSub, { color: colors.textMuted }]}>
                {pendingAmount === 0 ? "🎉 All dues cleared" : `${percentage}% of fees paid`}
              </Text>
            </View>

            <View style={[styles.dueCard, { backgroundColor: colors.surface }]}>
              <Ionicons name="calendar" size={18} color="#D9534F" />
              <Text style={[styles.dueTitle, { color: colors.textSecondary }]}>Next Due</Text>
              <Text style={[styles.dueDate, { color: colors.text }]}>{nextDueDate}</Text>
            </View>
          </View>

          {/* BREAKDOWN SECTION */}
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>Fee Breakdown</Text>
            <Text style={[styles.viewAll, { color: colors.primary }]}>
              {feeItems.length} items
            </Text>
          </View>

          <View style={[styles.breakdown, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {feeItems.map((item, idx) => {
              const isPaid = item.status === "Paid";
              const isPaying = payingItemId === item.id;

              return (
                <View
                  key={item.id}
                  style={[
                    styles.feeRow,
                    idx < feeItems.length - 1 && { borderBottomColor: colors.border, borderBottomWidth: 1 },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.feeTitle, { color: colors.text }]}>{item.title}</Text>
                    <Text style={[styles.feeCategory, { color: colors.textMuted }]}>
                      Due: {item.dueDate}
                    </Text>
                  </View>

                  <Text style={[styles.feeValue, { color: colors.text }]}>
                    ₹ {item.amount.toLocaleString()}
                  </Text>

                  <TouchableOpacity
                    style={[
                      styles.feeStatusBtn,
                      isPaid
                        ? { backgroundColor: "#DCFCE7" }
                        : { backgroundColor: colors.primary },
                    ]}
                    onPress={() => handlePayFeeItem(item)}
                    activeOpacity={0.7}
                    disabled={isPaid || isPaying}
                  >
                    {isPaying ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : isPaid ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                        <Ionicons name="checkmark-circle" size={13} color="#16A34A" />
                        <Text style={[styles.feeStatusText, { color: "#16A34A" }]}>Paid</Text>
                      </View>
                    ) : (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                        <Ionicons name="card-outline" size={13} color="#FFFFFF" />
                        <Text style={[styles.feeStatusText, { color: "#FFFFFF", fontWeight: "700" }]}>Pay</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          {/* QUERY SECTION */}
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Fee Query</Text>

          <View style={[styles.queryCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[styles.queryHint, { color: colors.textSecondary }]}>
              Ask accounts office about fees, payment reconciliation, scholarships, etc.
            </Text>

            <View style={styles.queryInputRow}>
              <TextInput
                style={[
                  styles.queryInput,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    color: colors.text,
                  },
                ]}
                placeholder="Type your fee question..."
                placeholderTextColor={colors.textMuted}
                value={queryText}
                onChangeText={setQueryText}
              />

              <TouchableOpacity
                style={[styles.sendBtn, { backgroundColor: colors.primary }]}
                onPress={submitQuery}
                disabled={submittingQuery}
              >
                {submittingQuery ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="send" size={16} color="#FFFFFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* MY QUERIES LIST */}
          <View style={styles.sectionRow}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>My Queries</Text>
            <Text style={[styles.viewAll, { color: colors.textMuted }]}>{queries.length}</Text>
          </View>

          {queries.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="chatbubble-outline" size={28} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No queries submitted yet</Text>
            </View>
          ) : (
            queries.map((item) => (
              <View
                key={item.id}
                style={[styles.queryItem, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={[styles.queryIconBox, { backgroundColor: colors.primaryLight }]}>
                  <Ionicons name="help-circle-outline" size={18} color={colors.primary} />
                </View>

                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.queryMessage, { color: colors.text }]}>{item.message}</Text>
                  <Text style={[styles.queryDate, { color: colors.textMuted }]}>{item.createdAt}</Text>
                </View>

                <View style={[styles.queryStatusBadge, { backgroundColor: colors.surface }]}>
                  <Text style={[styles.queryStatusText, { color: colors.primary }]}>{item.status}</Text>
                </View>
              </View>
            ))
          )}

          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
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
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  scrollContent: {
    paddingBottom: 40,
  },
  body: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 20,
  },
  moneyBox: {
    flex: 1,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  moneyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  moneyTitle: {
    fontSize: 11,
    fontWeight: "600",
  },
  moneyValue: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: 3,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 10,
    marginTop: 6,
  },
  sectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 12,
  },
  viewAll: {
    fontSize: 12,
    fontWeight: "600",
  },
  paymentCard: {
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  progressCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 3,
    borderColor: "#7048E8",
    justifyContent: "center",
    alignItems: "center",
  },
  progressInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  percent: {
    fontSize: 14,
    fontWeight: "800",
  },
  paidTitle: {
    fontSize: 11,
    fontWeight: "600",
  },
  paidAmount: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: 2,
  },
  dueSub: {
    fontSize: 10,
    marginTop: 2,
  },
  dueCard: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 12,
    alignItems: "center",
  },
  dueTitle: {
    fontSize: 9,
    fontWeight: "600",
    marginTop: 2,
  },
  dueDate: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  breakdown: {
    borderRadius: 18,
    paddingHorizontal: 14,
    borderWidth: 1,
    marginBottom: 18,
  },
  feeRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
  },
  feeTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  feeCategory: {
    fontSize: 11,
    marginTop: 2,
  },
  feeValue: {
    fontSize: 14,
    fontWeight: "700",
    marginRight: 12,
  },
  feeStatusBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  feeStatusText: {
    fontSize: 11,
    fontWeight: "600",
  },
  queryCard: {
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    marginBottom: 16,
  },
  queryHint: {
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 10,
  },
  queryInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  queryInput: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyCard: {
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    fontSize: 13,
    marginTop: 6,
  },
  queryItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
  },
  queryIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  queryMessage: {
    fontSize: 13,
    fontWeight: "600",
  },
  queryDate: {
    fontSize: 10,
    marginTop: 2,
  },
  queryStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  queryStatusText: {
    fontSize: 11,
    fontWeight: "700",
  },
});