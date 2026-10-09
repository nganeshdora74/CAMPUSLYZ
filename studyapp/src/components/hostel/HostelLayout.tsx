import React, { useState, useEffect } from "react";
import {
  Alert,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router, usePathname } from "expo-router";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "../../firebase/config";
import { confirmLogout } from "../../firebase/auth";
import NotificationBellModal from "../NotificationBellModal";
import UniversalRoleControls from "../UniversalRoleControls";
import { useAppTheme } from "../../context/ThemeContext";
import { parseNameAndRoleFromEmail } from "../../utils/userEmailParser";

export interface HostelLayoutProps {
  children: React.ReactNode;
  activeNav: string;
  pageTitle: string;
  pageSubtitle?: string;
  rightAction?: React.ReactNode;
  actionNotice?: string | null;
  searchQuery?: string;
  onSearchChange?: (text: string) => void;
  searchPlaceholder?: string;
}

export const HOSTEL_NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "grid-outline" as const, route: "/hostel-manager" },
  { id: "rooms", label: "Rooms", icon: "business-outline" as const, route: "/hostel-manager/rooms" },
  { id: "allocation", label: "Room Allocation", icon: "key-outline" as const, route: "/hostel-manager/room-allocation" },
  { id: "students", label: "Students & Residents", icon: "people-outline" as const, route: "/hostel-manager/students" },
  { id: "gate-pass", label: "Gate Pass", icon: "exit-outline" as const, route: "/hostel-manager/gate-pass" },
  { id: "leave", label: "Leave", icon: "calendar-outline" as const, route: "/hostel-manager/leave" },
  { id: "complaints", label: "Complaints", icon: "alert-circle-outline" as const, route: "/hostel-manager/complaints" },
  { id: "notices", label: "Notices", icon: "megaphone-outline" as const, route: "/hostel-manager/notices" },
  { id: "reports", label: "Reports", icon: "bar-chart-outline" as const, route: "/hostel-manager/reports" },
  { id: "profile", label: "Profile", icon: "person-outline" as const, route: "/hostel-manager/profile" },
  { id: "settings", label: "Settings", icon: "settings-outline" as const, route: "/hostel-manager/settings" },
];

export default function HostelLayout({
  children,
  activeNav,
  pageTitle,
  pageSubtitle,
  rightAction,
  actionNotice,
  searchQuery,
  onSearchChange,
  searchPlaceholder = "Search rooms, students, passes...",
}: HostelLayoutProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 960;
  const { colors, isDark } = useAppTheme();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [managerName, setManagerName] = useState("Hostel Manager");
  const [managerEmail, setManagerEmail] = useState("");

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    setManagerEmail(user.email || "");
    const parsed = parseNameAndRoleFromEmail(user.email);
    setManagerName(user.displayName || parsed.fullName || "Hostel Manager");

    const unsub = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          if (d.fullName || d.name) setManagerName(d.fullName || d.name);
        }
      },
      (err) => console.warn("Hostel user listener:", err?.message)
    );

    return () => unsub();
  }, []);

  const renderNavList = () => (
    <ScrollView style={styles.navList} showsVerticalScrollIndicator={false}>
      {HOSTEL_NAV_ITEMS.map((item) => {
        const isActive = activeNav === item.id;
        return (
          <TouchableOpacity
            key={item.id}
            style={[styles.navItem, isActive && styles.navItemActive]}
            onPress={() => {
              setMobileMenuOpen(false);
              router.push(item.route as any);
            }}
          >
            <Ionicons
              name={item.icon}
              size={18}
              color={isActive ? "#FFFFFF" : "#94A3B8"}
              style={styles.navIcon}
            />
            <Text style={[styles.navText, isActive && styles.navTextActive]}>
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}

      <View style={styles.navDivider} />

      <TouchableOpacity
        style={[styles.navItem, styles.logoutItem]}
        onPress={() => {
          setMobileMenuOpen(false);
          confirmLogout();
        }}
      >
        <Ionicons name="log-out-outline" size={18} color="#F87171" style={styles.navIcon} />
        <Text style={[styles.navText, { color: "#F87171" }]}>Sign Out</Text>
      </TouchableOpacity>
    </ScrollView>
  );

  return (
    <View style={styles.root}>
      {/* Action Notice banner */}
      {actionNotice && (
        <View style={styles.actionNoticeToast}>
          <Ionicons name="checkmark-circle" size={18} color="#10B981" />
          <Text style={styles.actionNoticeText}>{actionNotice}</Text>
        </View>
      )}

      {/* Desktop Sidebar */}
      {isDesktop && (
        <View
          style={[
            styles.desktopSidebar,
            { backgroundColor: isDark ? "#0C081B" : "#0A1E3F" },
          ]}
        >
          <View style={styles.sidebarHeader}>
            <View style={styles.brandIcon}>
              <Ionicons name="business" size={20} color="#FFFFFF" />
            </View>
            <View>
              <Text style={styles.brandTitle}>CAMPUSLY</Text>
              <Text style={styles.brandSubtitle}>Hostel Management</Text>
            </View>
          </View>
          {renderNavList()}
        </View>
      )}

      {/* Mobile Drawer Modal */}
      {!isDesktop && (
        <Modal
          visible={mobileMenuOpen}
          animationType="fade"
          transparent
          onRequestClose={() => setMobileMenuOpen(false)}
        >
          <TouchableOpacity
            style={styles.drawerBackdrop}
            activeOpacity={1}
            onPress={() => setMobileMenuOpen(false)}
          >
            <View
              style={styles.drawerContent}
              onStartShouldSetResponder={() => true}
            >
              <View style={styles.sidebarHeader}>
                <View style={styles.brandIcon}>
                  <Ionicons name="business" size={20} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.brandTitle}>CAMPUSLY</Text>
                  <Text style={styles.brandSubtitle}>Hostel Management</Text>
                </View>
                <TouchableOpacity onPress={() => setMobileMenuOpen(false)}>
                  <Ionicons name="close" size={24} color="#94A3B8" />
                </TouchableOpacity>
              </View>
              {renderNavList()}
            </View>
          </TouchableOpacity>
        </Modal>
      )}

      {/* Main Content Area */}
      <View style={[styles.mainContent, { backgroundColor: colors.background }]}>
        {/* Top Header Bar */}
        <View
          style={[
            styles.topBar,
            {
              backgroundColor: colors.card,
              borderBottomColor: colors.border,
            },
          ]}
        >
          <View style={styles.topBarLeft}>
            {!isDesktop && (
              <TouchableOpacity
                style={styles.menuButton}
                onPress={() => setMobileMenuOpen(true)}
              >
                <Ionicons name="menu" size={24} color={colors.text} />
              </TouchableOpacity>
            )}
            <View>
              <Text style={[styles.pageTitle, { color: colors.text }]}>{pageTitle}</Text>
              {pageSubtitle ? (
                <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
                  {pageSubtitle}
                </Text>
              ) : null}
            </View>
          </View>

          <View style={styles.topBarRight}>
            {onSearchChange && isDesktop && (
              <View
                style={[
                  styles.searchBar,
                  {
                    backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
                    borderColor: colors.border,
                  },
                ]}
              >
                <Ionicons
                  name="search-outline"
                  size={16}
                  color={colors.textSecondary}
                  style={{ marginRight: 8 }}
                />
                <TextInput
                  value={searchQuery}
                  onChangeText={onSearchChange}
                  placeholder={searchPlaceholder}
                  placeholderTextColor={colors.textSecondary}
                  style={[styles.searchInput, { color: colors.text }]}
                />
              </View>
            )}

            <UniversalRoleControls compact />

            <NotificationBellModal />

            {/* User Profile Pill */}
            <TouchableOpacity
              style={[
                styles.userProfilePill,
                {
                  backgroundColor: isDark ? "#1E293B" : "#F8FAFC",
                  borderColor: colors.border,
                },
              ]}
              onPress={() => router.push("/hostel-manager/profile")}
            >
              <View style={styles.userAvatar}>
                <Text style={styles.userAvatarText}>
                  {managerName.charAt(0).toUpperCase()}
                </Text>
              </View>
              {isDesktop && (
                <View style={styles.userMeta}>
                  <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                    {managerName}
                  </Text>
                  <Text style={[styles.userRole, { color: colors.textSecondary }]}>
                    Hostel Manager
                  </Text>
                </View>
              )}
            </TouchableOpacity>

            {rightAction}
          </View>
        </View>

        {/* Scrollable Children */}
        <ScrollView
          style={styles.contentBody}
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Mobile Search Bar if provided */}
          {onSearchChange && !isDesktop && (
            <View style={[styles.searchBar, { marginBottom: 16 }]}>
              <Ionicons name="search-outline" size={16} color="#94A3B8" style={{ marginRight: 8 }} />
              <TextInput
                value={searchQuery}
                onChangeText={onSearchChange}
                placeholder={searchPlaceholder}
                placeholderTextColor="#94A3B8"
                style={styles.searchInput}
              />
            </View>
          )}

          {children}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#F4F6F9",
  },
  actionNoticeToast: {
    position: "absolute",
    top: 14,
    right: 20,
    zIndex: 9999,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  actionNoticeText: {
    color: "#065F46",
    fontSize: 13,
    fontWeight: "700",
  },
  desktopSidebar: {
    width: 205,
    backgroundColor: "#0A1E3F",
    paddingVertical: 14,
    paddingHorizontal: 10,
    borderRightWidth: 1,
    borderRightColor: "#1E293B",
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  drawerContent: {
    width: 225,
    height: "100%",
    backgroundColor: "#0A1E3F",
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  sidebarHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
    marginBottom: 12,
  },
  brandIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  brandSubtitle: {
    color: "#94A3B8",
    fontSize: 9.5,
    fontWeight: "500",
  },
  navList: {
    flex: 1,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6.5,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginBottom: 2,
  },
  navItemActive: {
    backgroundColor: "#2563EB",
  },
  navIcon: {
    marginRight: 8,
  },
  navText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  navTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  navDivider: {
    height: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginVertical: 8,
  },
  logoutItem: {
    marginTop: 2,
  },
  mainContent: {
    flex: 1,
    backgroundColor: "#F4F6F9",
  },
  topBar: {
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  menuButton: {
    padding: 3,
  },
  pageTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  pageSubtitle: {
    fontSize: 10.5,
    color: "#64748B",
    marginTop: 1,
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: 180,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    color: "#0F172A",
    padding: 0,
  },
  userProfilePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 3,
    paddingHorizontal: 6,
    backgroundColor: "#F8FAFC",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  userAvatar: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  userAvatarText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
  },
  userMeta: {
    maxWidth: 100,
  },
  userName: {
    fontSize: 11,
    fontWeight: "700",
    color: "#0F172A",
  },
  userRole: {
    fontSize: 9,
    color: "#64748B",
  },
  contentBody: {
    flex: 1,
  },
  contentContainer: {
    padding: 12,
    paddingBottom: 24,
  },
});
