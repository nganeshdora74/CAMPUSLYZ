import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase/config";
import { useTheme } from "../../context/ThemeContext";

export default function StudentRequestsScreen() {
  const { isDark } = useTheme();
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "certificateRequests"),
      (snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setRequests(list);
        setLoading(false);
      },
      () => {
        setRequests([]);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  const pendingCount = requests.filter((r) => (r.status || "Pending").toLowerCase() === "pending").length;
  const approvedCount = requests.filter((r) => (r.status || "").toLowerCase() === "approved").length;

  const bg = isDark ? "#0F172A" : "#F4F7FB";
  const cardBg = isDark ? "#1E293B" : "#FFFFFF";
  const textColor = isDark ? "#F8FAFC" : "#0F172A";
  const subTextColor = isDark ? "#94A3B8" : "#64748B";
  const borderColor = isDark ? "#334155" : "#E2E8F0";

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.topBar, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
            <Ionicons name="arrow-back" size={22} color={textColor} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.screenTitle, { color: textColor }]}>📩 Student Requests</Text>
            <Text style={[styles.screenSubtitle, { color: subTextColor }]}>
              Incoming applications, certificate verifications & permissions
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        {/* Metric Pills Row matching Screenshot */}
        <View style={styles.statsRow}>
          <View style={[styles.statPill, { backgroundColor: cardBg, borderColor }]}>
            <Text style={[styles.statNum, { color: textColor }]}>{requests.length}</Text>
            <Text style={[styles.statLabel, { color: subTextColor }]}>Total Requests</Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: cardBg, borderColor }]}>
            <Text style={[styles.statNum, { color: "#F59E0B" }]}>{pendingCount}</Text>
            <Text style={[styles.statLabel, { color: subTextColor }]}>Pending</Text>
          </View>
          <View style={[styles.statPill, { backgroundColor: cardBg, borderColor }]}>
            <Text style={[styles.statNum, { color: "#10B981" }]}>{approvedCount}</Text>
            <Text style={[styles.statLabel, { color: subTextColor }]}>Completed</Text>
          </View>
        </View>

        <View style={[styles.mainCard, { backgroundColor: cardBg, borderColor }]}>
          {loading ? (
            <ActivityIndicator size="small" color="#2563EB" style={{ marginVertical: 30 }} />
          ) : requests.length === 0 ? (
            <View style={{ padding: 40, alignItems: "center" }}>
              <Ionicons name="mail-open-outline" size={40} color="#94A3B8" />
              <Text style={{ fontSize: 16, fontWeight: "700", color: textColor, marginTop: 10 }}>
                No Student Requests
              </Text>
              <Text style={{ fontSize: 13, color: subTextColor, marginTop: 4 }}>
                Any student requests submitted via the student portal will appear here in real-time.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {requests.map((r) => {
                const isPending = (r.status || "Pending").toLowerCase() === "pending";
                return (
                  <View
                    key={r.id}
                    style={[styles.reqRow, { backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor }]}
                  >
                    <View style={styles.iconBox}>
                      <Ionicons
                        name={isPending ? "time" : "checkmark-circle"}
                        size={18}
                        color={isPending ? "#F59E0B" : "#10B981"}
                      />
                    </View>

                    <View style={{ flex: 1, marginHorizontal: 12 }}>
                      <Text style={[styles.reqTitle, { color: textColor }]}>
                        {r.studentName || "Student"} • {r.certificateType || "Verification Request"}
                      </Text>
                      <Text style={{ fontSize: 11, color: subTextColor, marginTop: 2 }}>
                        Roll No: {r.studentRollNo || "N/A"} {r.purpose ? `• Purpose: ${r.purpose}` : ""}
                      </Text>
                    </View>

                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: isPending ? "#FEF3C7" : "#DCFCE7" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.badgeText,
                          { color: isPending ? "#B45309" : "#15803D" },
                        ]}
                      >
                        {r.status || "Pending"}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.processBtn}
                      onPress={() => router.push("../notice-manager/certificates")}
                    >
                      <Text style={styles.processBtnText}>Open</Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  screenTitle: { fontSize: 20, fontWeight: "800" },
  screenSubtitle: { fontSize: 12, marginTop: 2 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  statPill: {
    flex: 1,
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  statNum: { fontSize: 22, fontWeight: "800" },
  statLabel: { fontSize: 11, fontWeight: "600", marginTop: 2 },
  mainCard: { borderRadius: 16, borderWidth: 1, padding: 20 },
  reqRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 10,
    borderWidth: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 9,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  reqTitle: { fontSize: 14, fontWeight: "700" },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginRight: 8,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
  processBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  processBtnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
});