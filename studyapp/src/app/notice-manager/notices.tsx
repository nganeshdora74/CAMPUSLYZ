import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useTheme } from "../../context/ThemeContext";
import {
  NoticeItem,
  deleteNotice,
  subscribeToNotices,
} from "../../services/noticeService";

export default function NoticesScreen() {
  const { isDark } = useTheme();
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"All" | "Published" | "Draft" | "History">("All");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const unsub = subscribeToNotices((data) => {
      setNotices(data);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    return notices.filter((n) => {
      const q = search.trim().toLowerCase();
      const matchSearch =
        !q ||
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.category.toLowerCase().includes(q);

      if (!matchSearch) return false;

      if (filter === "Published") return n.status === "published" || n.status === "active";
      if (filter === "Draft") return n.status === "draft";
      return true;
    });
  }, [notices, search, filter]);

  const bg = isDark ? "#0F172A" : "#F4F7FB";
  const cardBg = isDark ? "#1E293B" : "#FFFFFF";
  const textColor = isDark ? "#F8FAFC" : "#0F172A";
  const subTextColor = isDark ? "#94A3B8" : "#64748B";
  const borderColor = isDark ? "#334155" : "#E2E8F0";

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      {/* Top Header Bar matching Screenshot */}
      <View style={[styles.topBar, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity onPress={() => router.push("/notice-manager")} style={{ padding: 4 }}>
            <Ionicons name="arrow-back" size={22} color={textColor} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.screenTitle, { color: textColor }]}>📢 Notices</Text>
            <Text style={[styles.screenSubtitle, { color: subTextColor }]}>
              Manage and broadcast institutional notices
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => router.push("/notice-manager/create-notice")}
        >
          <Ionicons name="add" size={18} color="#FFFFFF" />
          <Text style={styles.createBtnText}>+ Create Notice</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.mainCard, { backgroundColor: cardBg, borderColor }]}>
          {/* Search Row */}
          <View style={[styles.searchBox, { backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor }]}>
            <Ionicons name="search" size={18} color="#94A3B8" />
            <TextInput
              style={[styles.searchInput, { color: textColor }]}
              placeholder="Search notices..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* Sub Tabs: All, Published, Draft, History */}
          <View style={styles.tabsRow}>
            {(["All", "Published", "Draft", "History"] as const).map((t) => (
              <TouchableOpacity
                key={t}
                style={[styles.tabChip, filter === t && styles.tabChipActive]}
                onPress={() => setFilter(t)}
              >
                <Text style={[styles.tabChipText, filter === t && styles.tabChipTextActive]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Notice List */}
          {loading ? (
            <ActivityIndicator size="small" color="#2563EB" style={{ marginVertical: 40 }} />
          ) : filtered.length === 0 ? (
            <View style={{ padding: 40, alignItems: "center" }}>
              <Ionicons name="document-text-outline" size={44} color="#94A3B8" />
              <Text style={{ fontSize: 16, fontWeight: "700", color: textColor, marginTop: 10 }}>
                No Notices Found
              </Text>
              <Text style={{ fontSize: 13, color: subTextColor, marginTop: 4 }}>
                {search ? "No notices matching your search query." : "No notices in this category."}
              </Text>
            </View>
          ) : (
            <View style={{ gap: 12 }}>
              {filtered.map((n) => {
                const isPublished = n.status === "published" || n.status === "active";
                const isDraft = n.status === "draft";
                return (
                  <View
                    key={n.id}
                    style={[
                      styles.noticeRow,
                      { backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor },
                    ]}
                  >
                    <View
                      style={[
                        styles.iconBox,
                        {
                          backgroundColor: isPublished
                            ? "#ECFDF5"
                            : isDraft
                            ? "#F3F4F6"
                            : "#FEF3C7",
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          n.category === "Academic"
                            ? "school"
                            : n.category === "Examination"
                            ? "clipboard"
                            : "megaphone"
                        }
                        size={18}
                        color={isPublished ? "#10B981" : isDraft ? "#6B7280" : "#D97706"}
                      />
                    </View>

                    <View style={{ flex: 1, marginHorizontal: 12 }}>
                      <Text style={[styles.noticeTitleText, { color: textColor }]}>{n.title}</Text>
                      <Text style={[styles.noticeSubText, { color: subTextColor }]}>
                        {n.date} • {n.category} • {n.target}
                      </Text>
                    </View>

                    {/* Status badge pill */}
                    <View
                      style={[
                        styles.statusBadge,
                        {
                          backgroundColor: isPublished
                            ? "#DCFCE7"
                            : isDraft
                            ? "#F3F4F6"
                            : "#FEF3C7",
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusBadgeText,
                          {
                            color: isPublished ? "#15803D" : isDraft ? "#4B5563" : "#B45309",
                          },
                        ]}
                      >
                        {isPublished ? "Published" : isDraft ? "Draft" : "Scheduled"}
                      </Text>
                    </View>

                    {/* Actions */}
                    <TouchableOpacity
                      style={{ padding: 6, marginLeft: 6 }}
                      onPress={() => {
                        Alert.alert("Notice Options", `Title: ${n.title}`, [
                          { text: "Cancel", style: "cancel" },
                          {
                            text: "Delete",
                            style: "destructive",
                            onPress: async () => {
                              await deleteNotice(n.id, n.mongoId);
                              Alert.alert("Deleted", "Notice removed.");
                            },
                          },
                        ]);
                      }}
                    >
                      <Ionicons name="ellipsis-vertical" size={16} color="#94A3B8" />
                    </TouchableOpacity>
                  </View>
                );
              })}
            </View>
          )}

          {/* Pagination Pill */}
          <View style={styles.paginationRow}>
            <TouchableOpacity style={styles.pageBtn}>
              <Text style={{ color: subTextColor }}>‹</Text>
            </TouchableOpacity>
            <View style={[styles.pageBtn, styles.pageBtnActive]}>
              <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>1</Text>
            </View>
            <TouchableOpacity style={styles.pageBtn}>
              <Text style={{ color: subTextColor }}>2</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pageBtn}>
              <Text style={{ color: subTextColor }}>3</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pageBtn}>
              <Text style={{ color: subTextColor }}>›</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  screenSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
  },
  createBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13,
  },
  mainCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 42,
    gap: 8,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  tabsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  tabChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "transparent",
  },
  tabChipActive: {
    backgroundColor: "#2563EB",
  },
  tabChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  tabChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  noticeRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  noticeTitleText: {
    fontSize: 14,
    fontWeight: "700",
  },
  noticeSubText: {
    fontSize: 11,
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  paginationRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 24,
  },
  pageBtn: {
    width: 32,
    height: 32,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
  },
  pageBtnActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
});