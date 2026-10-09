import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
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
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useAppTheme } from "../context/ThemeContext";
import {
  incrementResourceDownload,
  ResourceFormat,
  ResourceItem,
  subscribeResources,
} from "../services/resourceService";
import { shareOrDownloadPdf } from "../services/certificatePdfService";

export default function StudentResourcesScreen() {
  const { width } = useWindowDimensions();
  const { colors, isDark } = useAppTheme();

  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"All" | ResourceFormat>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("All");

  // Full-screen photo viewer
  const [fullPhotoUrl, setFullPhotoUrl] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeResources((list) => {
      setResources(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const subjects = useMemo(() => {
    const s = new Set<string>();
    resources.forEach((r) => {
      if (r.subject) s.add(r.subject);
    });
    return ["All", ...Array.from(s)];
  }, [resources]);

  const filtered = useMemo(() => {
    return resources.filter((item) => {
      const matchFormat = activeTab === "All" || item.format === activeTab;
      const matchSubject = selectedSubject === "All" || item.subject === selectedSubject;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.subject.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q));
      return matchFormat && matchSubject && matchSearch;
    });
  }, [resources, activeTab, selectedSubject, searchQuery]);

  const handleOpenResource = async (item: ResourceItem) => {
    await incrementResourceDownload(item.id);

    if (item.format === "Photo") {
      setFullPhotoUrl(item.fileUrl);
    } else if (item.format === "Video") {
      const url = item.videoUrl || item.fileUrl;
      if (url) {
        if (Platform.OS === "web") {
          window.open(url, "_blank");
        } else {
          Linking.openURL(url);
        }
      }
    } else {
      shareOrDownloadPdf(item.fileUrl, item.fileName || "StudyResource.pdf");
    }
  };

  const getFormatBadge = (format: ResourceFormat) => {
    switch (format) {
      case "PDF":
        return { bg: "#FEE2E2", text: "#DC2626", icon: "document-text" as const };
      case "Photo":
        return { bg: "#EFF6FF", text: "#2563EB", icon: "image" as const };
      case "Video":
        return { bg: "#F3E8FF", text: "#9333EA", icon: "videocam" as const };
      case "Document":
        return { bg: "#FEF3C7", text: "#D97706", icon: "folder-open" as const };
      default:
        return { bg: "#ECFDF5", text: "#059669", icon: "attach" as const };
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Top Header */}
      <View
        style={[
          styles.topBar,
          {
            backgroundColor: colors.card,
            borderBottomColor: colors.border,
          },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={[styles.pageTitle, { color: colors.text }]}>Study Resources</Text>
          <Text style={[styles.pageSub, { color: colors.textSecondary }]}>
            PDFs, Photos, Recorded Videos & Course Materials
          </Text>
        </View>
      </View>

      {/* Filter and Search Bar */}
      <View style={[styles.filterBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View
          style={[
            styles.searchWrap,
            {
              backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
              borderColor: colors.border,
            },
          ]}
        >
          <Ionicons name="search-outline" size={16} color={colors.textSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.text }]}
            placeholder="Search notes, videos, PDFs or subjects..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Format tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabScroll}>
          {(["All", "PDF", "Photo", "Video", "Document", "Other"] as const).map((t) => {
            const count = t === "All" ? resources.length : resources.filter((r) => r.format === t).length;
            const active = activeTab === t;
            return (
              <TouchableOpacity
                key={t}
                style={[styles.tabBtn, active && styles.tabBtnActive, { borderColor: colors.border }]}
                onPress={() => setActiveTab(t)}
              >
                <Text style={[styles.tabBtnText, active && styles.tabBtnTextActive]}>
                  {t === "Photo" ? "Photos/Images" : t} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.contentPadding}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading resources...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="folder-open-outline" size={40} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Resources Found</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              There are no resources matching your criteria. Check back soon for teacher uploads.
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filtered.map((item) => {
              const badge = getFormatBadge(item.format);
              return (
                <View
                  key={item.id}
                  style={[
                    styles.card,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.cardHeader}>
                    <View style={[styles.badge, { backgroundColor: badge.bg }]}>
                      <Ionicons name={badge.icon} size={12} color={badge.text} />
                      <Text style={[styles.badgeText, { color: badge.text }]}>
                        {item.format === "Photo" ? "Photo/Diagram" : item.format}
                      </Text>
                    </View>
                    <Text style={[styles.targetClass, { color: colors.textSecondary }]}>
                      {item.targetClass || "All Students"}
                    </Text>
                  </View>

                  <Text style={[styles.title, { color: colors.text }]}>{item.title}</Text>

                  <View style={styles.subRow}>
                    <Ionicons name="book-outline" size={12} color="#059669" />
                    <Text style={styles.subText}>{item.subject}</Text>
                  </View>

                  {item.description ? (
                    <Text style={[styles.desc, { color: colors.textSecondary }]} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}

                  {/* Photo Preview Thumbnail */}
                  {item.format === "Photo" && item.fileUrl ? (
                    <TouchableOpacity
                      style={styles.photoWrap}
                      onPress={() => setFullPhotoUrl(item.fileUrl)}
                      activeOpacity={0.85}
                    >
                      <Image source={{ uri: item.fileUrl }} style={styles.photoImg} resizeMode="cover" />
                      <View style={styles.photoOverlay}>
                        <Ionicons name="eye-outline" size={11} color="#FFFFFF" />
                        <Text style={styles.photoOverlayText}>Tap to View & Zoom</Text>
                      </View>
                    </TouchableOpacity>
                  ) : null}

                  {/* Footer & Action */}
                  <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.facultyName, { color: colors.textSecondary }]}>
                        👨‍🏫 {item.teacherName || "Faculty Member"}
                      </Text>
                      <Text style={[styles.fileMeta, { color: colors.textSecondary }]}>
                        {item.fileName} • {item.fileSize || "1 MB"}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.downloadBtn, { backgroundColor: colors.primary }]}
                      onPress={() => handleOpenResource(item)}
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name={
                          item.format === "Photo"
                            ? "eye"
                            : item.format === "Video"
                            ? "play"
                            : "download"
                        }
                        size={13}
                        color="#FFFFFF"
                      />
                      <Text style={styles.downloadBtnText}>
                        {item.format === "Photo"
                          ? "View Photo"
                          : item.format === "Video"
                          ? "Watch Video"
                          : "Download"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* FULL PHOTO VIEWER MODAL */}
      <Modal visible={!!fullPhotoUrl} transparent animationType="fade" onRequestClose={() => setFullPhotoUrl(null)}>
        <View style={styles.photoModalOverlay}>
          <TouchableOpacity style={styles.photoCloseBtn} onPress={() => setFullPhotoUrl(null)}>
            <Ionicons name="close-circle" size={34} color="#FFFFFF" />
          </TouchableOpacity>
          {fullPhotoUrl ? (
            <Image source={{ uri: fullPhotoUrl }} style={styles.modalPhotoImg} resizeMode="contain" />
          ) : null}
          <View style={styles.modalPhotoActionRow}>
            <TouchableOpacity
              style={styles.modalPhotoDownloadBtn}
              onPress={() => {
                if (fullPhotoUrl) {
                  shareOrDownloadPdf(fullPhotoUrl, "Diagram.jpg");
                }
              }}
            >
              <Ionicons name="download-outline" size={16} color="#FFFFFF" />
              <Text style={styles.modalPhotoDownloadText}>Download Photo</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  backBtn: { padding: 4 },
  pageTitle: { fontSize: 16, fontWeight: "800" },
  pageSub: { fontSize: 11, marginTop: 1 },

  filterBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 8,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  searchInput: { flex: 1, fontSize: 12, padding: 0 },
  tabScroll: { flexDirection: "row" },
  tabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    marginRight: 6,
  },
  tabBtnActive: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  tabBtnText: { fontSize: 11, fontWeight: "600", color: "#64748B" },
  tabBtnTextActive: { color: "#FFFFFF", fontWeight: "700" },

  contentScroll: { flex: 1 },
  contentPadding: { padding: 16, paddingBottom: 40 },
  loadingBox: { padding: 40, alignItems: "center" },
  loadingText: { marginTop: 10, fontSize: 13 },
  emptyBox: {
    alignItems: "center",
    padding: 36,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 20,
  },
  emptyTitle: { fontSize: 16, fontWeight: "800", marginTop: 12 },
  emptySub: { fontSize: 12, textAlign: "center", marginTop: 6 },

  grid: { gap: 12 },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeText: { fontSize: 11, fontWeight: "700" },
  targetClass: { fontSize: 10.5 },
  title: { fontSize: 14, fontWeight: "800" },
  subRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  subText: { fontSize: 11, color: "#059669", fontWeight: "700" },
  desc: { fontSize: 11.5, lineHeight: 16 },

  photoWrap: {
    height: 130,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
    marginVertical: 4,
  },
  photoImg: { width: "100%", height: "100%" },
  photoOverlay: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  photoOverlayText: { color: "#FFFFFF", fontSize: 10, fontWeight: "600" },

  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 4,
  },
  facultyName: { fontSize: 10.5, fontWeight: "600" },
  fileMeta: { fontSize: 10, marginTop: 2 },
  downloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  downloadBtnText: { color: "#FFFFFF", fontSize: 11.5, fontWeight: "700" },

  photoModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.94)",
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
  },
  photoCloseBtn: { position: "absolute", top: 40, right: 20, zIndex: 10 },
  modalPhotoImg: { width: "100%", height: "75%" },
  modalPhotoActionRow: { marginTop: 14 },
  modalPhotoDownloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalPhotoDownloadText: { color: "#FFFFFF", fontWeight: "700", fontSize: 12 },
});
