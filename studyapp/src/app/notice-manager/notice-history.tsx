import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { NoticeItem, subscribeToNotices } from "../../services/noticeService";

export default function NoticeHistoryScreen() {
  const { isDark } = useTheme();
  const [notices, setNotices] = useState<NoticeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const unsub = subscribeToNotices((items) => {
      setNotices(items);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return notices;
    return notices.filter(
      (n) =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.category.toLowerCase().includes(q)
    );
  }, [notices, search]);

  const bg = isDark ? "#0F172A" : "#F4F7FB";
  const cardBg = isDark ? "#1E293B" : "#FFFFFF";
  const textColor = isDark ? "#F8FAFC" : "#0F172A";
  const subTextColor = isDark ? "#94A3B8" : "#64748B";
  const borderColor = isDark ? "#334155" : "#E2E8F0";

  return (
    <View style={[styles.container, { backgroundColor: bg }]}>
      <View style={[styles.topBar, { backgroundColor: cardBg, borderBottomColor: borderColor }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
            <Ionicons name="arrow-back" size={22} color={textColor} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.screenTitle, { color: textColor }]}>🕒 Notice History</Text>
            <Text style={[styles.screenSubtitle, { color: subTextColor }]}>
              Audit log of all issued, updated and drafted notices
            </Text>
          </View>
        </View>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 20 }} showsVerticalScrollIndicator={false}>
        <View style={[styles.mainCard, { backgroundColor: cardBg, borderColor }]}>
          {/* Search Box */}
          <View style={[styles.searchBox, { backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor }]}>
            <Ionicons name="search" size={18} color="#94A3B8" />
            <TextInput
              style={[styles.searchInput, { color: textColor }]}
              placeholder="Search history..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
            />
          </View>

          {/* Table Header matching Screenshot */}
          <View style={[styles.tableHeader, { backgroundColor: isDark ? "#0F172A" : "#F8FAFC", borderColor }]}>
            <Text style={[styles.colHeader, { flex: 2, color: subTextColor }]}>TITLE</Text>
            <Text style={[styles.colHeader, { flex: 1, color: subTextColor }]}>ACTION</Text>
            <Text style={[styles.colHeader, { flex: 1, color: subTextColor, textAlign: "right" }]}>DATE</Text>
          </View>

          {loading ? (
            <ActivityIndicator size="small" color="#2563EB" style={{ marginVertical: 40 }} />
          ) : filtered.length === 0 ? (
            <View style={{ padding: 30, alignItems: "center" }}>
              <Text style={{ color: subTextColor }}>No history records found.</Text>
            </View>
          ) : (
            filtered.map((n) => {
              const isPub = n.status === "published" || n.status === "active";
              return (
                <View key={n.id} style={[styles.tableRow, { borderColor }]}>
                  <Text style={[styles.titleCell, { flex: 2, color: textColor }]} numberOfLines={1}>
                    {n.title}
                  </Text>
                  <View style={{ flex: 1 }}>
                    <View
                      style={[
                        styles.actionBadge,
                        { backgroundColor: isPub ? "#DCFCE7" : "#F3F4F6" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.actionBadgeText,
                          { color: isPub ? "#15803D" : "#4B5563" },
                        ]}
                      >
                        {isPub ? "Published" : "Drafted"}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.dateCell, { flex: 1, color: subTextColor, textAlign: "right" }]}>
                    {n.date}
                  </Text>
                </View>
              );
            })
          )}

          {/* Pagination Matching Screenshot */}
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
              <Text style={{ color: subTextColor }}>›</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  screenTitle: { fontSize: 20, fontWeight: "800" },
  screenSubtitle: { fontSize: 12, marginTop: 2 },
  mainCard: { borderRadius: 16, borderWidth: 1, padding: 20 },
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
  searchInput: { flex: 1, fontSize: 13 },
  tableHeader: {
    flexDirection: "row",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 8,
  },
  colHeader: { fontSize: 11, fontWeight: "700", letterSpacing: 0.5 },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  titleCell: { fontSize: 13, fontWeight: "600" },
  actionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  actionBadgeText: { fontSize: 10, fontWeight: "700" },
  dateCell: { fontSize: 12 },
  paginationRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 20,
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