import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import NotificationBellModal from "../../components/NotificationBellModal";

export default function FeeManagementScreen() {
  const { width } = useWindowDimensions();

  const modules = [
    {
      title: "Realtime Student Fee Ledger & PDF",
      desc: "Live student dues, update payment dates, remove data & export serialized PDF report",
      icon: "documents-outline",
      color: "#4F46E5",
      route: "/fee-manager",
    },
    {
      title: "Fee Structure",
      desc: "Course & semester-wise fee breakdown tables",
      icon: "file-tray-stacked-outline",
      color: "#2563EB",
      route: "/fee-manager/fee-structure",
    },
    {
      title: "Add New Fee Head",
      desc: "Configure tuition, examination or lab fee heads",
      icon: "add-circle-outline",
      color: "#10B981",
      route: "/fee-manager/add-fee",
    },
    {
      title: "Update Fee Amount",
      desc: "Modify dues, concessions and deadline rules",
      icon: "create-outline",
      color: "#F59E0B",
      route: "/fee-manager/update-fee",
    },
    {
      title: "Assign Fees to Batch",
      desc: "Bulk apply fee structures to student cohorts",
      icon: "people-outline",
      color: "#8B5CF6",
      route: "/fee-manager/assign-fees",
    },
    {
      title: "Fee Categories",
      desc: "Manage academic, residential & penalty types",
      icon: "pricetags-outline",
      color: "#EC4899",
      route: "/fee-manager/fee-categories",
    },
  ];

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
            <Text style={styles.pageTitle}>Fee Management Hub</Text>
            <Text style={styles.pageSubtitle}>Configure heads, structures, and batch billing</Text>
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
        {/* Stat strip */}
        <View style={styles.statStrip}>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>12</Text>
            <Text style={styles.statLabel}>Active Fee Heads</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>5</Text>
            <Text style={styles.statLabel}>Fee Categories</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={styles.statNum}>8</Text>
            <Text style={styles.statLabel}>Batches Assigned</Text>
          </View>
          <View style={styles.statItem}>
            <Text style={[styles.statNum, { color: "#10B981" }]}>100%</Text>
            <Text style={styles.statLabel}>Sync Status</Text>
          </View>
        </View>

        {/* 5 Action Cards */}
        <View style={styles.moduleGrid}>
          {modules.map((m) => (
            <TouchableOpacity
              key={m.title}
              style={styles.moduleCard}
              onPress={() => router.push(m.route as any)}
            >
              <View style={[styles.moduleIconWrap, { backgroundColor: m.color + "15" }]}>
                <Ionicons name={m.icon as any} size={26} color={m.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.moduleTitle}>{m.title}</Text>
                <Text style={styles.moduleDesc}>{m.desc}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
            </TouchableOpacity>
          ))}
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
    maxWidth: 900,
    width: "100%",
    alignSelf: "center",
    gap: 16,
  },
  statStrip: {
    flexDirection: "row",
    flexWrap: "wrap",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  statItem: {
    flex: 1,
    minWidth: 120,
    alignItems: "center",
  },
  statNum: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
  },
  statLabel: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  moduleGrid: {
    gap: 12,
  },
  moduleCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  moduleIconWrap: {
    width: 50,
    height: 50,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  moduleTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  moduleDesc: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 3,
  },
});
