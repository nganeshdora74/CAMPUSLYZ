import React from "react";
import {
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
  Image,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { useAppTheme } from "../../context/ThemeContext";
import { confirmLogout } from "../../firebase/auth";

export type AdminNavItem = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  route: string;
};

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  { id: "dashboard", label: "Dashboard", icon: "home", route: "/admin" },
  { id: "students", label: "Students", icon: "person", route: "/admin/student" },
  { id: "faculty", label: "Faculty", icon: "people", route: "/admin/faculty" },
  { id: "academics", label: "Academics", icon: "book", route: "/admin/academics" },
  { id: "curriculum", label: "Branch & Electives", icon: "git-branch", route: "/admin/branch-curriculum" },
  { id: "special-notes", label: "Special Notes", icon: "document-text", route: "/admin/special-notes" },
  { id: "messages", label: "Messages", icon: "chatbubbles", route: "/messages?role=teacher" },
  { id: "schedule", label: "Schedule", icon: "calendar", route: "/admin/schedule" },
  { id: "attendance", label: "Attendance", icon: "checkbox", route: "/admin/attendence" },
  { id: "certificates", label: "Certificates", icon: "ribbon", route: "/admin/certificate" },
  { id: "ai-assistant", label: "AI Assistant", icon: "sparkles", route: "/admin/ai-assistant" },
  { id: "hostel", label: "Hostel", icon: "business", route: "/admin/hostel" },
  { id: "mess", label: "Mess", icon: "restaurant", route: "/admin/mess" },
  { id: "fees", label: "Fees", icon: "wallet", route: "/admin/fees" },
  { id: "notices", label: "Notices", icon: "megaphone", route: "/admin/notices" },
  { id: "requests", label: "Requests", icon: "document-text", route: "/admin/requests" },
  { id: "reports", label: "Reports", icon: "bar-chart", route: "/admin/reports" },
  { id: "settings", label: "Settings", icon: "settings", route: "/admin/settings" },
  { id: "profile", label: "Profile", icon: "person-circle", route: "/admin/profile" },
];

export interface AdminSidebarProps {
  activeNav?: string;
  mobileMenuOpen?: boolean;
  onCloseMobileMenu?: () => void;
  isDesktop?: boolean;
}

export default function AdminSidebar({
  activeNav,
  mobileMenuOpen = false,
  onCloseMobileMenu,
  isDesktop: propIsDesktop,
}: AdminSidebarProps) {
  const { width } = useWindowDimensions();
  const isDesktop = propIsDesktop !== undefined ? propIsDesktop : width >= 1024;
  const { colors, isDark } = useAppTheme();
  const pathname = usePathname();

  // Match current active nav item
  const currentNav =
    activeNav ||
    ADMIN_NAV_ITEMS.find((item) => {
      if (item.route === "/admin") {
        return pathname === "/admin" || pathname === "/admin/";
      }
      return pathname === item.route || pathname.startsWith(item.route + "/");
    })?.id ||
    "dashboard";

  const handleNavPress = (item: AdminNavItem) => {
    if (!isDesktop && onCloseMobileMenu) {
      onCloseMobileMenu();
    }
    if (item.route) {
      router.push(item.route as any);
    }
  };

  const handleSignOut = () => {
    confirmLogout("Are you sure you want to sign out of the Admin Portal?");
  };

  const renderContent = () => (
    <View
      style={[
        styles.sidebarWrapper,
        {
          backgroundColor: colors.adminSidebar || "#1E1338",
          borderRightColor: colors.adminSidebarBorder || "rgba(255,255,255,0.08)",
        },
      ]}
    >
      {/* Brand Header */}
      <View style={styles.brandRow}>
        <Image
          source={require("../../../assets/images/icon.png")}
          style={styles.brandLogo}
          resizeMode="contain"
        />
        <View style={{ marginLeft: 12, flex: 1 }}>
          <Text style={styles.brandTitle}>Campusly</Text>
          <Text style={styles.brandSubtitle}>Admin Portal</Text>
        </View>
        {!isDesktop && onCloseMobileMenu && (
          <TouchableOpacity
            style={styles.closeBtn}
            onPress={onCloseMobileMenu}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={22} color="#FFFFFF" />
          </TouchableOpacity>
        )}
      </View>

      {/* Navigation ScrollView */}
      <ScrollView
        style={styles.navScrollView}
        contentContainerStyle={styles.navScrollContent}
        showsVerticalScrollIndicator={false}
      >
        {ADMIN_NAV_ITEMS.map((item) => {
          const isActive = item.id === currentNav;
          return (
            <TouchableOpacity
              key={item.id}
              style={[styles.navItem, isActive && styles.navItemActive]}
              onPress={() => handleNavPress(item)}
              activeOpacity={0.75}
            >
              <Ionicons
                name={item.icon as any}
                size={18}
                color={isActive ? "#FFFFFF" : "rgba(255, 255, 255, 0.72)"}
                style={styles.navItemIcon}
              />
              <Text
                style={[
                  styles.navItemLabel,
                  isActive && styles.navItemLabelActive,
                ]}
                numberOfLines={1}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Sign Out / Logout */}
      <TouchableOpacity
        style={[
          styles.logoutBtn,
          {
            borderTopColor: colors.adminSidebarBorder || "rgba(255,255,255,0.08)",
          },
        ]}
        onPress={handleSignOut}
        activeOpacity={0.7}
      >
        <Ionicons name="log-out-outline" size={19} color="#F87171" />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );

  if (isDesktop) {
    return <View style={styles.desktopContainer}>{renderContent()}</View>;
  }

  if (!mobileMenuOpen) {
    return null;
  }

  return (
    <Modal
      visible={mobileMenuOpen}
      transparent
      animationType="fade"
      onRequestClose={onCloseMobileMenu}
    >
      <View style={styles.mobileOverlay}>
        <View style={styles.mobileDrawerContainer}>{renderContent()}</View>
        <Pressable style={{ flex: 1 }} onPress={onCloseMobileMenu} />
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  desktopContainer: {
    width: 215,
    height: "100%",
  },
  sidebarWrapper: {
    width: 215,
    height: "100%",
    borderRightWidth: 1,
    paddingTop: Platform.OS === "web" ? 14 : 16,
    paddingBottom: 12,
    paddingHorizontal: 10,
    display: "flex",
    flexDirection: "column",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  brandLogo: {
    width: 28,
    height: 28,
    borderRadius: 7,
  },
  brandIconBox: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 4,
    elevation: 3,
  },
  brandTitle: {
    fontSize: 15,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: -0.2,
  },
  brandSubtitle: {
    fontSize: 9.5,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.6)",
    letterSpacing: 0.3,
    marginTop: 1,
  },
  closeBtn: {
    padding: 4,
    marginLeft: 4,
  },
  navScrollView: {
    flex: 1,
  },
  navScrollContent: {
    paddingBottom: 16,
    gap: 2,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6.5,
    paddingHorizontal: 9,
    borderRadius: 8,
  },
  navItemActive: {
    backgroundColor: "#7C3AED",
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 3,
  },
  navItemIcon: {
    width: 18,
    marginRight: 8,
  },
  navItemLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.8)",
  },
  navItemLabelActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 10,
    paddingHorizontal: 9,
    borderTopWidth: 1,
    marginTop: 4,
    gap: 8,
  },
  logoutText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#F87171",
  },
  mobileOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    flexDirection: "row",
  },
  mobileDrawerContainer: {
    width: 230,
    height: "100%",
  },
});
