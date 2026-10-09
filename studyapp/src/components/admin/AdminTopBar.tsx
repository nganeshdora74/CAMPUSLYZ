import React from "react";
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { auth } from "../../firebase/config";
import { useAppTheme } from "../../context/ThemeContext";
import AdminThemeToggle from "./AdminThemeToggle";
import UniversalRoleControls from "../UniversalRoleControls";
import { parseNameAndRoleFromEmail } from "../../utils/userEmailParser";

export interface AdminTopBarProps {
  title?: string;
  subtitle?: string;
  searchQuery?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  onOpenMobileMenu?: () => void;
  rightActions?: React.ReactNode;
  showSearch?: boolean;
  adminName?: string;
}

export default function AdminTopBar({
  title,
  subtitle,
  searchQuery = "",
  onSearchChange,
  searchPlaceholder = "Search admin portal...",
  onOpenMobileMenu,
  rightActions,
  showSearch = false,
  adminName,
}: AdminTopBarProps) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const { colors, isDark } = useAppTheme();

  const currentUser = auth.currentUser;
  const parsed = parseNameAndRoleFromEmail(currentUser?.email);
  const resolvedAdminName = adminName || currentUser?.displayName || parsed.fullName || "Admin";

  return (
    <View
      style={[
        styles.topBar,
        {
          backgroundColor: colors.adminTopBar || (isDark ? "#1E293B" : "#FFFFFF"),
          borderBottomColor: colors.adminTopBarBorder || (isDark ? "#334155" : "#E2E8F0"),
        },
      ]}
    >
      {/* Mobile Hamburger Toggle */}
      {!isDesktop && onOpenMobileMenu && (
        <TouchableOpacity
          style={styles.menuHamburger}
          onPress={onOpenMobileMenu}
          activeOpacity={0.7}
        >
          <Ionicons name="menu" size={26} color={colors.adminText || colors.text} />
        </TouchableOpacity>
      )}

      {/* Left Area: Title/Subtitle OR Universal Search Bar */}
      {showSearch && onSearchChange ? (
        <View
          style={[
            styles.searchBar,
            {
              backgroundColor: colors.adminSearchBg || (isDark ? "#0F172A" : "#F8FAFC"),
              borderColor: colors.adminCardBorder || (isDark ? "#334155" : "#E2E8F0"),
            },
          ]}
        >
          <Ionicons
            name="search-outline"
            size={18}
            color={colors.adminTextSecondary || colors.textSecondary}
          />
          <TextInput
            style={[styles.searchInput, { color: colors.adminText || colors.text }]}
            placeholder={searchPlaceholder}
            placeholderTextColor={colors.adminTextSecondary || colors.textSecondary}
            value={searchQuery}
            onChangeText={onSearchChange}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => onSearchChange("")}>
              <Ionicons
                name="close-circle"
                size={18}
                color={colors.adminTextSecondary || colors.textSecondary}
              />
            </TouchableOpacity>
          )}
        </View>
      ) : title ? (
        <View style={styles.titleCol}>
          <Text
            style={[styles.pageTitle, { color: colors.adminText || colors.text }]}
            numberOfLines={1}
          >
            {title}
          </Text>
          {Boolean(subtitle) && (
            <Text
              style={[
                styles.pageSubtitle,
                { color: colors.adminTextSecondary || colors.textSecondary },
              ]}
              numberOfLines={1}
            >
              {subtitle}
            </Text>
          )}
        </View>
      ) : (
        <View style={{ flex: 1 }} />
      )}

      {/* Right Area: Actions + ThemeToggle + Bell + Admin Profile Pill */}
      <View style={styles.topRightRow}>
        {rightActions}

        <UniversalRoleControls compact />

        <TouchableOpacity
          style={[
            styles.bellBtn,
            {
              backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
              borderColor: isDark ? "#334155" : "#E2E8F0",
            },
          ]}
          onPress={() => router.push("/admin/notices")}
          activeOpacity={0.7}
        >
          <Ionicons
            name="notifications-outline"
            size={19}
            color={colors.adminTextSecondary || colors.textSecondary}
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.adminBadge,
            {
              backgroundColor: isDark ? "#2E1065" : "#F3EEFD",
              borderColor: isDark ? "#4C1D95" : "#DDD6FE",
            },
          ]}
          onPress={() => router.push("/admin/profile")}
          activeOpacity={0.75}
        >
          <View style={styles.adminAvatarSmall}>
            <Ionicons name="person" size={13} color="#FFFFFF" />
          </View>
          {isDesktop && (
            <Text
              style={[
                styles.adminBadgeText,
                { color: isDark ? "#E9D5FF" : "#6B21A8" },
              ]}
            >
              {resolvedAdminName}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: {
    height: 50,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    zIndex: 10,
  },
  menuHamburger: {
    padding: 4,
    marginRight: 6,
  },
  titleCol: {
    flex: 1,
    justifyContent: "center",
  },
  pageTitle: {
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  pageSubtitle: {
    fontSize: 10.5,
    fontWeight: "500",
    marginTop: 1,
  },
  searchBar: {
    flex: 1,
    maxWidth: 280,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    marginLeft: 6,
    fontSize: 12.5,
    height: "100%",
  },
  topRightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  bellBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 14,
    borderWidth: 1,
    gap: 5,
  },
  adminAvatarSmall: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
  },
  adminBadgeText: {
    fontSize: 11.5,
    fontWeight: "700",
  },
});
