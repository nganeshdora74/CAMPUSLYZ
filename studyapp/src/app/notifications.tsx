import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { auth, db } from "../firebase/config";
import { doc, getDoc } from "firebase/firestore";
import {
  CampusNotification,
  listenUserNotificationsWithDirection,
  markNotificationAsRead,
} from "../services/notificationService";

export default function NotificationsScreen() {
  const [activeTab, setActiveTab] = useState<"all" | "incoming" | "outgoing">("all");
  const [incomingList, setIncomingList] = useState<CampusNotification[]>([]);
  const [outgoingList, setOutgoingList] = useState<CampusNotification[]>([]);
  const [allList, setAllList] = useState<CampusNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isHostelResident, setIsHostelResident] = useState(false);

  const currentUser = auth.currentUser;
  const userIdentifier = currentUser?.uid || currentUser?.email || "anonymous";

  useEffect(() => {
    if (!currentUser) return;
    const checkHostel = async () => {
      try {
        const uSnap = await getDoc(doc(db, "users", currentUser.uid));
        if (uSnap.exists()) {
          const data = uSnap.data();
          if (data.isHostelResident || data.hostelBlock || data.roomNo) {
            setIsHostelResident(true);
          }
        }
      } catch (_) {}
    };
    checkHostel();
  }, [currentUser]);

  useEffect(() => {
    const unsub = listenUserNotificationsWithDirection(
      currentUser?.uid || null,
      currentUser?.email || null,
      isHostelResident,
      ({ incoming, outgoing, all }) => {
        setIncomingList(incoming);
        setOutgoingList(outgoing);
        setAllList(all);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [currentUser, isHostelResident]);

  const displayedList =
    activeTab === "incoming"
      ? incomingList
      : activeTab === "outgoing"
      ? outgoingList
      : allList;

  const handleNotificationPress = (notif: CampusNotification) => {
    if (!notif.readBy?.includes(userIdentifier)) {
      markNotificationAsRead(notif.id, userIdentifier);
    }

    if (notif.type === "certificate") {
      router.push("/certificate" as any);
    } else if (notif.type === "fee") {
      router.push("/fees" as any);
    } else if (notif.type === "hostel") {
      router.push("/hostel" as any);
    } else if (notif.type === "mess") {
      router.push("/mess" as any);
    } else if (notif.type === "leave" || notif.type === "gate_pass") {
      router.push("/leave-gatepass" as any);
    } else {
      router.push("/notices" as any);
    }
  };

  const getIconForType = (type: string) => {
    switch (type) {
      case "certificate":
        return { icon: "ribbon-outline" as const, color: "#7C3AED", bg: "#EDE9FE" };
      case "fee":
        return { icon: "card-outline" as const, color: "#059669", bg: "#ECFDF5" };
      case "hostel":
        return { icon: "home-outline" as const, color: "#0284C7", bg: "#E0F2FE" };
      case "mess":
        return { icon: "restaurant-outline" as const, color: "#EA580C", bg: "#FFF7ED" };
      case "leave":
      case "gate_pass":
        return { icon: "document-text-outline" as const, color: "#D97706", bg: "#FEF3C7" };
      default:
        return { icon: "megaphone-outline" as const, color: "#2563EB", bg: "#EFF6FF" };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={24} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications Feed</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Tabs: All | Coming (Received) | Going (Sent) */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "all" && styles.tabBtnActive]}
          onPress={() => setActiveTab("all")}
        >
          <Text style={[styles.tabBtnText, activeTab === "all" && styles.tabBtnTextActive]}>
            All ({allList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "incoming" && styles.tabBtnActive]}
          onPress={() => setActiveTab("incoming")}
        >
          <Text style={[styles.tabBtnText, activeTab === "incoming" && styles.tabBtnTextActive]}>
            📥 Coming ({incomingList.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabBtn, activeTab === "outgoing" && styles.tabBtnActive]}
          onPress={() => setActiveTab("outgoing")}
        >
          <Text style={[styles.tabBtnText, activeTab === "outgoing" && styles.tabBtnTextActive]}>
            📤 Going ({outgoingList.length})
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              setTimeout(() => setRefreshing(false), 800);
            }}
          />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color="#2563EB" style={{ marginTop: 40 }} />
        ) : displayedList.length === 0 ? (
          <View style={styles.emptyCard}>
            <Ionicons name="notifications-off-outline" size={48} color="#94A3B8" />
            <Text style={styles.emptyTitle}>
              {activeTab === "outgoing"
                ? "No Outgoing Notifications Sent"
                : activeTab === "incoming"
                ? "No Incoming Notifications Received"
                : "No Notifications Found"}
            </Text>
            <Text style={styles.emptySubtitle}>
              {activeTab === "outgoing"
                ? "Whenever you send a notice, leave request, or gate pass, it will show up here as 'Notification Successful'."
                : "All announcements, notices, and approvals will appear here."}
            </Text>
          </View>
        ) : (
          displayedList.map((item) => {
            const styleInfo = getIconForType(item.type);
            const isSent = item.isOutgoing;

            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.card, isSent && styles.cardOutgoing]}
                onPress={() => handleNotificationPress(item)}
                activeOpacity={0.7}
              >
                <View style={[styles.iconWrap, { backgroundColor: styleInfo.bg }]}>
                  <Ionicons name={styleInfo.icon} size={20} color={styleInfo.color} />
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.cardHeaderRow}>
                    {isSent ? (
                      <View style={styles.goingBadge}>
                        <Ionicons name="checkmark-done" size={12} color="#059669" />
                        <Text style={styles.goingBadgeText}>Notification Successful (Sent)</Text>
                      </View>
                    ) : (
                      <View style={styles.comingBadge}>
                        <Ionicons name="arrow-down" size={12} color="#2563EB" />
                        <Text style={styles.comingBadgeText}>Received</Text>
                      </View>
                    )}
                    <Text style={styles.dateText}>{item.date || "Today"}</Text>
                  </View>

                  <Text style={styles.titleText}>{item.title}</Text>
                  <Text style={styles.bodyText}>{item.body}</Text>

                  <View style={styles.footerRow}>
                    {isSent ? (
                      <Text style={styles.metaText}>
                        🎯 Target: {item.targetHostel ? `Hostel ${item.targetHostel}` : item.target || item.studentEmail || "All"}
                      </Text>
                    ) : (
                      <Text style={styles.metaText}>
                        👤 Sender: {item.senderName || "College Administration"}
                      </Text>
                    )}
                    <Text style={styles.typeBadge}>#{item.type.toUpperCase()}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 12,
    padding: 4,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 8,
  },
  tabBtnActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  tabBtnText: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#64748B",
  },
  tabBtnTextActive: {
    color: "#2563EB",
    fontWeight: "800",
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 32,
    alignItems: "center",
    marginTop: 30,
    gap: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 18,
  },
  card: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 12,
  },
  cardOutgoing: {
    backgroundColor: "#F0FDF4",
    borderColor: "#BBF7D0",
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cardBody: {
    flex: 1,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  goingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  goingBadgeText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#059669",
  },
  comingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 4,
  },
  comingBadgeText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#2563EB",
  },
  dateText: {
    fontSize: 11,
    color: "#94A3B8",
  },
  titleText: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
  },
  bodyText: {
    fontSize: 12.5,
    color: "#475569",
    lineHeight: 17,
    marginBottom: 6,
  },
  footerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  typeBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: "#94A3B8",
  },
});
