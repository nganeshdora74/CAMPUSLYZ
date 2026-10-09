import React, { useEffect, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { auth, db } from "../firebase/config";
import { doc, getDoc } from "firebase/firestore";
import {
  CampusNotification,
  listenUserNotificationsWithDirection,
  markNotificationAsRead,
} from "../services/notificationService";

interface Props {
  iconColor?: string;
  badgeBgColor?: string;
}

export default function NotificationBellModal({
  iconColor = "#475569",
  badgeBgColor = "#EF4444",
}: Props) {
  const [modalVisible, setModalVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "incoming" | "outgoing">("all");
  const [incomingList, setIncomingList] = useState<CampusNotification[]>([]);
  const [outgoingList, setOutgoingList] = useState<CampusNotification[]>([]);
  const [allList, setAllList] = useState<CampusNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isHostelResident, setIsHostelResident] = useState(false);

  const currentUser = auth.currentUser;
  const userIdentifier = currentUser?.uid || currentUser?.email || "anonymous";

  // Check if student resides in hostel
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

  // Real-time listener partitioned by Coming (Incoming) and Going (Outgoing)
  useEffect(() => {
    const unsub = listenUserNotificationsWithDirection(
      currentUser?.uid || null,
      currentUser?.email || null,
      isHostelResident,
      ({ incoming, outgoing, all }) => {
        setIncomingList(incoming);
        setOutgoingList(outgoing);
        setAllList(all);

        const unread = incoming.filter(
          (n) => !n.readBy || !n.readBy.includes(userIdentifier)
        ).length;
        setUnreadCount(unread);
      }
    );

    return () => unsub();
  }, [currentUser, isHostelResident, userIdentifier]);

  const handleOpenModal = () => {
    setModalVisible(true);
    // Mark top incoming notifications as read
    incomingList.forEach((n) => {
      if (!n.readBy || !n.readBy.includes(userIdentifier)) {
        markNotificationAsRead(n.id, userIdentifier);
      }
    });
    setUnreadCount(0);
  };

  const handleNotificationPress = (notif: CampusNotification) => {
    setModalVisible(false);
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

  const displayedList =
    activeTab === "incoming"
      ? incomingList
      : activeTab === "outgoing"
      ? outgoingList
      : allList;

  return (
    <>
      <TouchableOpacity
        style={styles.bellBtn}
        onPress={handleOpenModal}
        activeOpacity={0.7}
      >
        <Ionicons name="notifications-outline" size={20} color={iconColor} />
        {unreadCount > 0 && (
          <View style={[styles.badge, { backgroundColor: badgeBgColor }]}>
            <Text style={styles.badgeText}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </Text>
          </View>
        )}
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.overlay} onPress={() => setModalVisible(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <Ionicons name="notifications" size={20} color="#2563EB" />
                <Text style={styles.title}>Notifications</Text>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Segmented Control / Tabs: All | Coming | Going */}
            <View style={styles.tabBar}>
              <TouchableOpacity
                style={[styles.tabItem, activeTab === "all" && styles.tabItemActive]}
                onPress={() => setActiveTab("all")}
              >
                <Text style={[styles.tabText, activeTab === "all" && styles.tabTextActive]}>
                  All ({allList.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabItem, activeTab === "incoming" && styles.tabItemActive]}
                onPress={() => setActiveTab("incoming")}
              >
                <Text style={[styles.tabText, activeTab === "incoming" && styles.tabTextActive]}>
                  📥 Coming ({incomingList.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabItem, activeTab === "outgoing" && styles.tabItemActive]}
                onPress={() => setActiveTab("outgoing")}
              >
                <Text style={[styles.tabText, activeTab === "outgoing" && styles.tabTextActive]}>
                  📤 Going ({outgoingList.length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* List */}
            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {displayedList.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="notifications-off-outline" size={42} color="#94A3B8" />
                  <Text style={styles.emptyTitle}>
                    {activeTab === "outgoing"
                      ? "No Outgoing Notifications"
                      : activeTab === "incoming"
                      ? "No Incoming Notifications"
                      : "No Notifications Yet"}
                  </Text>
                  <Text style={styles.emptySub}>
                    {activeTab === "outgoing"
                      ? "Notices, leave applications, or gate pass requests you send will appear here."
                      : "Notices, pass approvals, fee reminders & announcements will appear here."}
                  </Text>
                </View>
              ) : (
                displayedList.map((n) => {
                  const styleInfo = getIconForType(n.type);
                  const isSent = n.isOutgoing;

                  return (
                    <TouchableOpacity
                      key={n.id}
                      style={[
                        styles.notifCard,
                        isSent && styles.notifCardOutgoing,
                      ]}
                      onPress={() => handleNotificationPress(n)}
                      activeOpacity={0.75}
                    >
                      <View
                        style={[
                          styles.iconBox,
                          { backgroundColor: styleInfo.bg },
                        ]}
                      >
                        <Ionicons
                          name={styleInfo.icon}
                          size={18}
                          color={styleInfo.color}
                        />
                      </View>

                      <View style={styles.notifInfo}>
                        {/* Status / Delivery Badge */}
                        <View style={styles.badgeRow}>
                          {isSent ? (
                            <View style={styles.goingBadge}>
                              <Ionicons name="checkmark-done" size={11} color="#059669" />
                              <Text style={styles.goingBadgeText}>
                                Notification Successful (Sent)
                              </Text>
                            </View>
                          ) : (
                            <View style={styles.comingBadge}>
                              <Ionicons name="arrow-down" size={11} color="#2563EB" />
                              <Text style={styles.comingBadgeText}>Received</Text>
                            </View>
                          )}
                          <Text style={styles.notifDate}>{n.date || "Today"}</Text>
                        </View>

                        <Text style={styles.notifTitle} numberOfLines={1}>
                          {n.title}
                        </Text>
                        <Text style={styles.notifBody} numberOfLines={2}>
                          {n.body}
                        </Text>

                        {/* Metadata row */}
                        <View style={styles.metaRow}>
                          {isSent ? (
                            <Text style={styles.metaSender}>
                              🎯 Target: {n.targetHostel ? `Hostel ${n.targetHostel}` : n.target || n.studentEmail || "All"}
                            </Text>
                          ) : (
                            <Text style={styles.metaSender}>
                              👤 From: {n.senderName || "Administration"}
                            </Text>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  bellBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    color: "#FFFFFF",
    fontSize: 9,
    fontWeight: "800",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  sheet: {
    width: "100%",
    maxWidth: 480,
    maxHeight: "82%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 18,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  closeBtn: {
    padding: 4,
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 12,
    padding: 3,
    marginVertical: 12,
    gap: 4,
  },
  tabItem: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: 9,
  },
  tabItemActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  tabText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  tabTextActive: {
    color: "#2563EB",
    fontWeight: "700",
  },
  list: {
    marginTop: 2,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 36,
    paddingHorizontal: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  emptySub: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 16,
  },
  notifCard: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#EEF2F6",
    gap: 12,
  },
  notifCardOutgoing: {
    backgroundColor: "#F0FDF4",
    borderColor: "#DCFCE7",
  },
  iconBox: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  notifInfo: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  goingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  goingBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
  },
  comingBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 3,
  },
  comingBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2563EB",
  },
  notifTitle: {
    fontSize: 13.5,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 2,
  },
  notifDate: {
    fontSize: 10,
    color: "#94A3B8",
  },
  notifBody: {
    fontSize: 12,
    color: "#475569",
    lineHeight: 16,
    marginBottom: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 2,
  },
  metaSender: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#64748B",
  },
});
