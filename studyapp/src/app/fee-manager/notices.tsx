import React, { useState } from "react";
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

export default function FeeNoticesScreen() {
  const { width } = useWindowDimensions();

  const noticesList = [
    {
      id: "fn-1",
      title: "Semester 3 Tuition & Hostel Fee Payment Circular",
      date: "06 Oct 2026",
      category: "Tuition Fee",
      target: "All 3rd Sem Students",
      dueDate: "15 Oct 2026",
      status: "ACTIVE",
    },
    {
      id: "fn-2",
      title: "Notice regarding Mess Advance & Catering Deposit",
      date: "02 Oct 2026",
      category: "Mess Fee",
      target: "Hostel Residents",
      dueDate: "10 Oct 2026",
      status: "ACTIVE",
    },
    {
      id: "fn-3",
      title: "Annual Merit-cum-Means Fee Concession Application",
      date: "25 Sep 2026",
      category: "Scholarship",
      target: "Eligible Students",
      dueDate: "12 Oct 2026",
      status: "EXPIRING SOON",
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
            <Text style={styles.pageTitle}>Fee Notices & Circulars</Text>
            <Text style={styles.pageSubtitle}>Official administrative circulars & student broadcasts</Text>
          </View>
        </View>

        <View style={styles.topBarRight}>
          <TouchableOpacity
            style={styles.createBtn}
            onPress={() => router.push("/fee-manager/create-notice")}
          >
            <Ionicons name="add-circle" size={16} color="#FFFFFF" />
            <Text style={styles.createBtnText}>+ Create Notice</Text>
          </TouchableOpacity>
          <NotificationBellModal />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Action Navigation Cards */}
        <View style={styles.navGrid}>
          <TouchableOpacity
            style={styles.navCard}
            onPress={() => router.push("/fee-manager/create-notice")}
          >
            <View style={[styles.navIconWrap, { backgroundColor: "#EFF6FF" }]}>
              <Ionicons name="megaphone" size={24} color="#2563EB" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.navCardTitle}>Create Fee Circular</Text>
              <Text style={styles.navCardSub}>Publish notice with dual-write push notification</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navCard}
            onPress={() => router.push("/fee-manager/published-notices")}
          >
            <View style={[styles.navIconWrap, { backgroundColor: "#ECFDF5" }]}>
              <Ionicons name="newspaper" size={24} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.navCardTitle}>Published Notices</Text>
              <Text style={styles.navCardSub}>Inspect live circulars displayed in student feeds</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#94A3B8" />
          </TouchableOpacity>
        </View>

        {/* Active Notices Table / Feed */}
        <View style={styles.card}>
          <Text style={styles.cardHeaderTitle}>Active Institutional Circulars</Text>
          <Text style={styles.cardHeaderSub}>Direct notification records synced to MongoDB & Firebase</Text>

          <View style={styles.noticeList}>
            {noticesList.map((n) => (
              <View key={n.id} style={styles.noticeItem}>
                <View style={styles.noticeHeader}>
                  <View style={styles.catBadge}>
                    <Text style={styles.catBadgeText}>{n.category}</Text>
                  </View>
                  <View
                    style={[
                      styles.statusPill,
                      n.status === "ACTIVE"
                        ? styles.statusPillActive
                        : styles.statusPillWarn,
                    ]}
                  >
                    <Text
                      style={[
                        styles.statusPillText,
                        n.status === "ACTIVE"
                          ? styles.statusPillTextActive
                          : styles.statusPillTextWarn,
                      ]}
                    >
                      {n.status}
                    </Text>
                  </View>
                </View>

                <Text style={styles.noticeTitle}>{n.title}</Text>

                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={13} color="#64748B" />
                    <Text style={styles.metaText}>Published: {n.date}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="time-outline" size={13} color="#D97706" />
                    <Text style={[styles.metaText, { color: "#D97706", fontWeight: "600" }]}>
                      Due: {n.dueDate}
                    </Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="people-outline" size={13} color="#64748B" />
                    <Text style={styles.metaText}>{n.target}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>
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
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#0A1E3F",
  },
  createBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  scrollContent: {
    padding: 20,
    maxWidth: 960,
    width: "100%",
    alignSelf: "center",
    gap: 16,
  },
  navGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  navCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  navIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  navCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  navCardSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
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
  noticeList: {
    gap: 12,
  },
  noticeItem: {
    padding: 14,
    borderRadius: 10,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  noticeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  catBadge: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  catBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusPillActive: {
    backgroundColor: "#ECFDF5",
  },
  statusPillWarn: {
    backgroundColor: "#FEF3C7",
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "800",
  },
  statusPillTextActive: {
    color: "#059669",
  },
  statusPillTextWarn: {
    color: "#D97706",
  },
  noticeTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 8,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 14,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: "#64748B",
  },
});
