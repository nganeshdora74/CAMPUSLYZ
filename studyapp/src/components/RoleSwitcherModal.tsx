import React from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";

export interface RoleItem {
  id: string;
  name: string;
  focus: string;
  route: string;
  badge: string;
  color: string;
  bgColor: string;
  icon: keyof typeof Ionicons.glyphMap;
}

export const CAMPUSLY_ROLES: RoleItem[] = [
  {
    id: "student",
    name: "Student Dashboard",
    focus: "Personal academics & campus life",
    route: "/(tab)/home",
    badge: "🎓 Student",
    color: "#7C3AED",
    bgColor: "#F5F3FF",
    icon: "school-outline",
  },
  {
    id: "teacher",
    name: "Teacher Dashboard",
    focus: "Attendance & academics",
    route: "/teacher",
    badge: "👨‍🏫 Teacher",
    color: "#2563EB",
    bgColor: "#EFF6FF",
    icon: "easel-outline",
  },
  {
    id: "hostel_manager",
    name: "Hostel Dashboard",
    focus: "Rooms & hostel operations",
    route: "/hostel-manager",
    badge: "🏨 Hostel Manager",
    color: "#059669",
    bgColor: "#ECFDF5",
    icon: "home-outline",
  },
  {
    id: "mess_manager",
    name: "Mess Dashboard",
    focus: "Menu & mess operations",
    route: "/mess-manager",
    badge: "🍽️ Mess Manager",
    color: "#EA580C",
    bgColor: "#FFF7ED",
    icon: "restaurant-outline",
  },
  {
    id: "fee_manager",
    name: "Fee Dashboard",
    focus: "Fees & payments",
    route: "/fee-manager",
    badge: "💰 Fee Manager",
    color: "#0284C7",
    bgColor: "#F0F9FF",
    icon: "cash-outline",
  },
  {
    id: "notice_manager",
    name: "Notice Dashboard",
    focus: "Notices & announcements",
    route: "/notice-manager",
    badge: "📢 Notice Manager",
    color: "#DB2777",
    bgColor: "#FDF2F8",
    icon: "megaphone-outline",
  },
  {
    id: "admin",
    name: "Admin Dashboard",
    focus: "Complete campus management",
    route: "/admin",
    badge: "🛡️ Admin",
    color: "#4F46E5",
    bgColor: "#EEF2FF",
    icon: "shield-checkmark-outline",
  },
];

interface Props {
  visible: boolean;
  currentRole: string;
  onClose: () => void;
}

export default function RoleSwitcherModal({ visible, currentRole, onClose }: Props) {
  const handleSelect = (item: RoleItem) => {
    onClose();
    router.replace(item.route as any);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <View>
              <Text style={styles.title}>Campusly Dashboard System</Text>
              <Text style={styles.subtitle}>
                Switch between role-specific dashboards
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
            {CAMPUSLY_ROLES.map((role) => {
              const isCurrent =
                role.id === currentRole ||
                (currentRole === "faculty" && role.id === "teacher");

              return (
                <TouchableOpacity
                  key={role.id}
                  style={[
                    styles.roleCard,
                    isCurrent && { borderColor: role.color, borderWidth: 2 },
                  ]}
                  onPress={() => handleSelect(role)}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: role.bgColor },
                    ]}
                  >
                    <Ionicons name={role.icon} size={24} color={role.color} />
                  </View>

                  <View style={styles.roleInfo}>
                    <View style={styles.row}>
                      <Text style={styles.roleName}>{role.name}</Text>
                      {isCurrent && (
                        <View
                          style={[
                            styles.currentBadge,
                            { backgroundColor: role.color },
                          ]}
                        >
                          <Text style={styles.currentBadgeText}>Active</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.roleFocus}>{role.focus}</Text>
                  </View>

                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={isCurrent ? role.color : "#94A3B8"}
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  sheet: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "85%",
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.25,
    shadowRadius: 24,
    elevation: 12,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  subtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  list: {
    marginTop: 12,
  },
  roleCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  roleInfo: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  roleName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  currentBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  currentBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "700",
  },
  roleFocus: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
});
