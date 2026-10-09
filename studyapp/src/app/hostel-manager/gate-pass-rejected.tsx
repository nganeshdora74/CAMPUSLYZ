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

export default function GatePassRejectedScreen() {
  const [passes, setPasses] = useState<GatePassItem[]>(
    hostelDataService.getGatePasses().filter((p) => p.status === "Rejected")
  );
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const refreshPasses = () => {
    setPasses(hostelDataService.getGatePasses().filter((p) => p.status === "Rejected"));
  };

  const handleReconsider = (item: GatePassItem) => {
    hostelDataService.updateGatePassStatus(item.id, "Approved");
    refreshPasses();
    setActionNotice(`Pass reconsidered & approved for ${item.studentName}`);
    setTimeout(() => setActionNotice(null), 3000);
  };

  return (
    <HostelLayout
      activeNav="gate-pass"
      pageTitle="Rejected Gate Passes"
      pageSubtitle={`${passes.length} declined or restricted requests`}
      actionNotice={actionNotice}
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
        {passes.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="checkmark-circle-outline" size={42} color="#10B981" />
            <Text style={styles.emptyText}>No rejected gate passes at this time.</Text>
          </View>
        ) : (
          passes.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.studentInfo}>
                  <View style={styles.avatar}>
                    <Text style={styles.avatarText}>{item.studentName.charAt(0)}</Text>
                  </View>
                  <View>
                    <Text style={styles.name}>{item.studentName}</Text>
                    <Text style={styles.timeSub}>{item.requestedAt}</Text>
                  </View>
                </View>

                <View style={styles.statusBadge}>
                  <Ionicons name="close-circle" size={14} color="#DC2626" />
                  <Text style={styles.statusBadgeText}>Rejected</Text>
                </View>
              </View>

              <View style={styles.body}>
                <View style={styles.row}>
                  <Text style={styles.label}>Purpose:</Text>
                  <Text style={styles.value}>{item.purpose}</Text>
                </View>
                <View style={styles.row}>
                  <Text style={styles.label}>Requested Out:</Text>
                  <Text style={styles.valueBold}>{item.outTime}</Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.reconsiderBtn}
                onPress={() => handleReconsider(item)}
              >
                <Ionicons name="refresh-outline" size={14} color="#2563EB" />
                <Text style={styles.reconsiderBtnText}>Reconsider & Approve</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
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
    backgroundColor: "#DC2626",
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
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusBadgeText: {
    color: "#DC2626",
    fontSize: 11,
    fontWeight: "700",
  },
  body: {
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 10,
    marginBottom: 12,
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
  reconsiderBtn: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingVertical: 6,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  reconsiderBtnText: {
    color: "#2563EB",
    fontSize: 11,
    fontWeight: "700",
  },
  emptyCard: {
    width: "100%",
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyText: {
    color: "#64748B",
    fontSize: 14,
    marginTop: 8,
  },
});