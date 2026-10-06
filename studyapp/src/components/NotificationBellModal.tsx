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
  listenUserNotifications,
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
  const [notifications, setNotifications] = useState<CampusNotification[]>([]);
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

  // Listen to notifications
  useEffect(() => {
    const unsub = listenUserNotifications(
      currentUser?.uid || null,
      currentUser?.email || null,
      isHostelResident,
      (list) => {
        setNotifications(list);
        const unread = list.filter(
          (n) => !n.readBy || !n.readBy.includes(userIdentifier)
        ).length;
        setUnreadCount(unread);
      }
    );

    return () => unsub();
  }, [currentUser, isHostelResident, userIdentifier]);

  const handleOpenModal = () => {
    setModalVisible(true);
    // Mark top notifications as read for this user
    notifications.forEach((n) => {
      if (!n.readBy || !n.readBy.includes(userIdentifier)) {
        markNotificationAsRead(n.id, userIdentifier);
      }
    });
    setUnreadCount(0);
  };

  const handleNotificationPress = (notif: CampusNotification) => {
    setModalVisible(false);
    if (notif.type === "certificate") {
      router.push("/certificate");
    } else if (notif.type === "fee") {
      router.push("/fees");
    } else if (notif.type === "hostel") {
      router.push("/hostel");
    } else if (notif.type === "mess") {
      router.push("/mess");
    } else {
      router.push("/notices");
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
      default:
        return { icon: "megaphone-outline" as const, color: "#2563EB", bg: "#EFF6FF" };
    }
  };

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
            <View style={styles.header}>
              <View style={styles.headerTitleRow}>
                <Ionicons name="notifications" size={18} color="#2563EB" />
                <Text style={styles.title}>Notifications</Text>
                <View style={styles.countPill}>
                  <Text style={styles.countPillText}>{notifications.length}</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={18} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
              {notifications.length === 0 ? (
                <View style={styles.emptyState}>
                  <Ionicons name="notifications-off-outline" size={40} color="#94A3B8" />
                  <Text style={styles.emptyTitle}>No Notifications Yet</Text>
                  <Text style={styles.emptySub}>
                    You're all caught up! New notices and certificates will show up here.
                  </Text>
                </View>
              ) : (
                notifications.map((n) => {
                  const styleInfo = getIconForType(n.type);
                  return (
                    <TouchableOpacity
                      key={n.id}
                      style={styles.notifCard}
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
                        <View style={styles.titleRow}>
                          <Text style={styles.notifTitle} numberOfLines={1}>
                            {n.title}
                          </Text>
                          <Text style={styles.notifDate}>{n.date}</Text>
                        </View>
                        <Text style={styles.notifBody} numberOfLines={2}>
                          {n.body}
                        </Text>
                        {n.target === "Hostel Students" && (
                          <View style={styles.hostelTag}>
                            <Text style={styles.hostelTagText}>🏨 Hostel Only</Text>
                          </View>
                        )}
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
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  sheet: {
    width: "100%",
    maxWidth: 460,
    maxHeight: "80%",
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
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  countPill: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countPillText: {
    color: "#2563EB",
    fontSize: 11,
    fontWeight: "700",
  },
  closeBtn: {
    padding: 4,
  },
  list: {
    marginTop: 10,
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
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 12,
    marginBottom: 6,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#EEF2F6",
    gap: 12,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  notifInfo: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 2,
  },
  notifTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
    flex: 1,
  },
  notifDate: {
    fontSize: 10,
    color: "#94A3B8",
    marginLeft: 6,
  },
  notifBody: {
    fontSize: 11.5,
    color: "#475569",
    lineHeight: 15,
  },
  hostelTag: {
    alignSelf: "flex-start",
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
    marginTop: 4,
  },
  hostelTagText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#15803D",
  },
});
