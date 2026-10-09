import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import HostelLayout from "../../components/hostel/HostelLayout";
import hostelDataService, { GatePassItem } from "../../services/hostelDataService";

export default function GatePassApprovedScreen() {
  const [passes, setPasses] = useState<GatePassItem[]>(
    hostelDataService.getGatePasses().filter((p) => p.status === "Approved")
  );
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = passes.filter((p) =>
    p.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.purpose.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <HostelLayout
      activeNav="gate-pass"
      pageTitle="Approved Gate Passes"
      pageSubtitle={`${passes.length} authorized gate passes`}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
      searchPlaceholder="Search approved student passes..."
      rightAction={
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => router.push("/hostel-manager/gate-pass")}
        >
          <Ionicons name="arrow-back" size={16} color="#FFFFFF" />
          <Text style={styles.backBtnText}>Gate Pass Hub</Text>
        </TouchableOpacity>
      }
    >
      <View style={styles.gridContainer}>
        {filtered.map((item) => (
          <View key={item.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.studentInfo}>
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{item.studentName.charAt(0)}</Text>
                </View>
                <View>
                  <Text style={styles.name}>{item.studentName}</Text>
                  <Text style={styles.timeSub}>Approved: {item.approvedAt || item.requestedAt}</Text>
                </View>
              </View>

              <View style={styles.statusBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#059669" />
                <Text style={styles.statusBadgeText}>Approved</Text>
              </View>
            </View>

            <View style={styles.body}>
              <View style={styles.row}>
                <Text style={styles.label}>Purpose:</Text>
                <Text style={styles.value}>{item.purpose}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Out Time:</Text>
                <Text style={styles.valueBold}>{item.outTime}</Text>
              </View>
              <View style={styles.row}>
                <Text style={styles.label}>Return By:</Text>
                <Text style={styles.valueBold}>{item.returnTime || "08:00 PM"}</Text>
              </View>
            </View>
          </View>
        ))}
      </View>
    </HostelLayout>
  );
}

const styles = StyleSheet.create({
  backBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  backBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  card: {
    width: "31.5%",
    minWidth: 260,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  studentInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#059669",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  name: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
  },
  timeSub: {
    fontSize: 10,
    color: "#64748B",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    color: "#059669",
    fontSize: 11,
    fontWeight: "700",
  },
  body: {
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 10,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  label: {
    fontSize: 12,
    color: "#64748B",
  },
  value: {
    fontSize: 12,
    color: "#1E293B",
  },
  valueBold: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
  },
});