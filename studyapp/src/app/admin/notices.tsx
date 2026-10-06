import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Platform,
  Pressable,
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
import * as ImagePicker from "expo-image-picker";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { db } from "../../firebase/config";
import { confirmAction } from "../../firebase/auth";
import { useAppTheme } from "../../context/ThemeContext";
import AdminThemeToggle from "../../components/admin/AdminThemeToggle";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTopBar from "../../components/admin/AdminTopBar";
import { sendBroadcastNotification } from "../../services/notificationService";

const CATEGORIES = ["All", "Academic", "Examination", "Important", "General"];

export type AdminNotice = {
  id: string;
  title: string;
  message?: string;
  description?: string;
  category: "Academic" | "Examination" | "Important" | "General";
  date?: string;
  photoUrl?: string;
  videoUrl?: string;
  isTeacherNotice?: boolean;
  teacherName?: string;
  teacherId?: string;
  targetBranch?: string;
  targetYear?: string;
  targetSemester?: string;
  targetHostel?: string;
  targetBatch?: string;
  createdAt?: any;
};

const DEFAULT_NOTICES: Omit<AdminNotice, "id">[] = [
  {
    title: "Annual Tech Fest 'Innovate 2026' A",
    description:
      "Participate in coding marathons, robotics showcases, and project exhibitions next month. Exciting prizes!",
    category: "Academic",
    date: "16 Sep 2026",
    photoUrl: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=900&auto=format&fit=crop&q=80",
    videoUrl: "https://www.youtube.com/watch?v=9KM39G34RPU",
  },
  {
    title: "Campus Placement: Core Engineering Companies",
    description:
      "Registrations are open for campus recruitment drives. Eligible students must submit resumes before Friday.",
    category: "Academic",
    date: "17 Sep 2026",
  },
  {
    title: "Library Reading Hall Extended Hours",
    description:
      "The Central Library will stay open 24/7 during the examination prep week for all students.",
    category: "Academic",
    date: "15 Sep 2026",
  },
  {
    title: "Semester Examination Schedule Published",
    description:
      "The official schedule for mid-semester and end-semester examinations is now published. Please download your hall ticket.",
    category: "Examination",
    date: "18 Sep 2026",
  },
];

export default function AdminNoticesScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const { isDark, colors } = useAppTheme();

  const [selectedFilter, setSelectedFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notices, setNotices] = useState<AdminNotice[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State for Add / Edit Notice
  const [modalVisible, setModalVisible] = useState(false);
  const [editingNotice, setEditingNotice] = useState<AdminNotice | null>(null);
  const [saving, setSaving] = useState(false);

  // Form Fields (Exact match for Screenshot 2026-09-21 215258.png)
  const [formTitle, setFormTitle] = useState("");
  const [formMessage, setFormMessage] = useState("");
  const [formPhotoUrl, setFormPhotoUrl] = useState("");
  const [formVideoUrl, setFormVideoUrl] = useState("");
  const [formCategory, setFormCategory] = useState<
    "Academic" | "Examination" | "Important" | "General"
  >("Academic");
  const [formTeacherName, setFormTeacherName] = useState("");

  // Priority 7: Targeted Notifications
  const [formTargetBranch, setFormTargetBranch] = useState("All");
  const [formTargetYear, setFormTargetYear] = useState("All");
  const [formTargetSemester, setFormTargetSemester] = useState("All");
  const [formTargetHostel, setFormTargetHostel] = useState("All");
  const [formTargetBatch, setFormTargetBatch] = useState("All");

  // Full photo preview modal
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Real-time Firestore sync with 'notices' collection
  useEffect(() => {
    let unsub: (() => void) | undefined;
    try {
      const q = query(collection(db, "notices"), orderBy("createdAt", "desc"));
      unsub = onSnapshot(
        q,
        async (snap) => {
          if (snap.empty) {
            // Seed default notices if collection is empty
            try {
              for (const n of DEFAULT_NOTICES) {
                await addDoc(collection(db, "notices"), {
                  ...n,
                  message: n.description,
                  createdAt: serverTimestamp(),
                });
              }
            } catch (seedErr) {
              console.warn("Seeding notices warning:", seedErr);
            }
            setLoading(false);
            return;
          }

          const live: AdminNotice[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: data.title || "Untitled Notice",
              message: data.message || data.description || "",
              description: data.description || data.message || "",
              category: (data.category as any) || "Academic",
              date: data.date || "Today",
              photoUrl: data.photoUrl || "",
              videoUrl: data.videoUrl || "",
              isTeacherNotice: Boolean(data.isTeacherNotice),
              teacherName: data.teacherName || "",
              teacherId: data.teacherId || "",
              targetBranch: data.targetBranch || "All",
              targetYear: data.targetYear || "All",
              targetSemester: data.targetSemester || "All",
              targetHostel: data.targetHostel || "All",
              targetBatch: data.targetBatch || "All",
              createdAt: data.createdAt,
            };
          });

          setNotices(live);
          setLoading(false);
        },
        (err) => {
          console.warn("Notices listener error:", err.message);
          setLoading(false);
        }
      );
    } catch (e) {
      console.warn("Notices setup error:", e);
      setLoading(false);
    }

    return () => {
      if (unsub) unsub();
    };
  }, []);

  // Filter & Search
  const filteredNotices = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return notices.filter((n) => {
      const matchesFilter = selectedFilter === "All" || n.category === selectedFilter;
      const matchesSearch =
        !q ||
        n.title.toLowerCase().includes(q) ||
        (n.message && n.message.toLowerCase().includes(q)) ||
        (n.teacherName && n.teacherName.toLowerCase().includes(q));
      return matchesFilter && matchesSearch;
    });
  }, [notices, selectedFilter, searchQuery]);

  // Open Post Notice Modal
  const openPostModal = () => {
    setEditingNotice(null);
    setFormTitle("");
    setFormMessage("");
    setFormPhotoUrl("");
    setFormVideoUrl("");
    setFormCategory("Academic");
    setFormTeacherName("Faculty Admin");
    setFormTargetBranch("All");
    setFormTargetYear("All");
    setFormTargetSemester("All");
    setFormTargetHostel("All");
    setFormTargetBatch("All");
    setModalVisible(true);
  };

  // Open Edit Notice Modal (as in screenshot)
  const openEditModal = (notice: AdminNotice) => {
    setEditingNotice(notice);
    setFormTitle(notice.title || "");
    setFormMessage(notice.message || notice.description || "");
    setFormPhotoUrl(notice.photoUrl || "");
    setFormVideoUrl(notice.videoUrl || "");
    setFormCategory(notice.category || "Academic");
    setFormTeacherName(notice.teacherName || "");
    setFormTargetBranch(notice.targetBranch || "All");
    setFormTargetYear(notice.targetYear || "All");
    setFormTargetSemester(notice.targetSemester || "All");
    setFormTargetHostel(notice.targetHostel || "All");
    setFormTargetBatch(notice.targetBatch || "All");
    setModalVisible(true);
  };

  // Pick photo from device gallery
  const handlePickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission Required", "Please allow media access to attach photos.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        quality: 0.75,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setFormPhotoUrl(result.assets[0].uri);
      }
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Could not select photo.");
    }
  };

  // Save (Create or Update) Notice
  const handleSaveNotice = async () => {
    if (!formTitle.trim()) {
      Alert.alert("Notice Title Required", "Please enter a notice title.");
      return;
    }
    if (!formMessage.trim()) {
      Alert.alert("Message Required", "Please enter description or message.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        title: formTitle.trim(),
        message: formMessage.trim(),
        description: formMessage.trim(),
        category: formCategory,
        photoUrl: formPhotoUrl.trim(),
        videoUrl: formVideoUrl.trim(),
        teacherName: formTeacherName.trim(),
        targetBranch: formTargetBranch,
        targetYear: formTargetYear,
        targetSemester: formTargetSemester,
        targetHostel: formTargetHostel,
        targetBatch: formTargetBatch,
        date: new Date().toLocaleDateString("en-GB", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        updatedAt: serverTimestamp(),
      };

      if (editingNotice) {
        await updateDoc(doc(db, "notices", editingNotice.id), payload);
        await sendBroadcastNotification({
          title: `Updated: ${formTitle.trim()}`,
          body: formMessage.trim(),
          type: "notice",
          category: formCategory,
          target: formTargetHostel ? "Hostel Students" : "All Students",
          targetHostel: formTargetHostel || null,
          senderName: formTeacherName.trim() || "Administration",
        });
        Alert.alert("Notice Updated", "Notice changes have been broadcast to all students.");
      } else {
        await addDoc(collection(db, "notices"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        await sendBroadcastNotification({
          title: formTitle.trim(),
          body: formMessage.trim(),
          type: "notice",
          category: formCategory,
          target: formTargetHostel ? "Hostel Students" : "All Students",
          targetHostel: formTargetHostel || null,
          senderName: formTeacherName.trim() || "Administration",
        });
        Alert.alert("Notice Published", "New notice has been published for students.");
      }

      setModalVisible(false);
    } catch (err: any) {
      console.warn("Save notice error:", err);
      Alert.alert("Error", err?.message || "Failed to save notice.");
    } finally {
      setSaving(false);
    }
  };

  // Delete Notice
  const handleDeleteNotice = (notice: AdminNotice) => {
    confirmAction(
      "Delete Notice",
      `Are you sure you want to remove "${notice.title}"?\n\nStudents will no longer see this announcement.`,
      async () => {
        try {
          if (!notice.id.startsWith("not-init-")) {
            await deleteDoc(doc(db, "notices", notice.id));
          }
          setNotices((prev) => prev.filter((n) => n.id !== notice.id));
          if (editingNotice?.id === notice.id) {
            setModalVisible(false);
          }
          if (Platform.OS === "web") {
            window.alert("Notice removed from board.");
          } else {
            Alert.alert("Deleted", "Notice removed from board.");
          }
        } catch (err: any) {
          if (Platform.OS === "web") {
            window.alert(err?.message || "Failed to delete notice.");
          } else {
            Alert.alert("Error", err?.message || "Failed to delete notice.");
          }
        }
      },
      "Delete"
    );
  };

  // Category Badge Colors
  const getCategoryStyles = (cat: string) => {
    switch (cat) {
      case "Important":
        return { bg: "#FEE2E2", text: "#DC2626", border: "#FCA5A5" };
      case "Examination":
        return { bg: "#EDE9FE", text: "#7C3AED", border: "#DDD6FE" };
      case "General":
        return { bg: "#DCFCE7", text: "#16A34A", border: "#86EFAC" };
      case "Academic":
      default:
        return { bg: "#E0F2FE", text: "#0284C7", border: "#BAE6FD" };
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.adminSidebar }]} edges={["top", "left", "right"]}>
      <View style={{ flex: 1, flexDirection: "row", backgroundColor: colors.adminBg }}>
        <AdminSidebar
          activeNav="notices"
          isDesktop={isDesktop}
          mobileMenuOpen={mobileMenuOpen}
          onCloseMobileMenu={() => setMobileMenuOpen(false)}
        />

        <View style={{ flex: 1, backgroundColor: colors.adminBg }}>
          <AdminTopBar
            title="Notices"
            subtitle="Official college & teacher class updates"
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
            rightActions={
              <TouchableOpacity
                style={styles.postNoticeBtn}
                onPress={openPostModal}
                activeOpacity={0.85}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.postNoticeBtnText}>Post Notice</Text>
              </TouchableOpacity>
            }
          />

          {/* Main Content Area */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContainer}
          >
        {/* Search Bar matching screenshot */}
        <View style={[styles.searchBar, { backgroundColor: colors.adminSearchBg }]}>
          <Ionicons name="search-outline" size={18} color={colors.adminTextSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.adminText }]}
            placeholder="Search notices, faculty, or topics..."
            placeholderTextColor={colors.adminTextSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color={colors.adminTextSecondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* Category Pills matching screenshot (All, Academic, Examination, Important, General) */}
        <View style={styles.categoryPillsRow}>
          {CATEGORIES.map((cat) => {
            const isSel = selectedFilter === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.categoryPill,
                  {
                    backgroundColor: isSel ? "#4F46E5" : colors.adminSurfaceAlt,
                    borderColor: isSel ? "#4F46E5" : colors.adminCardBorder,
                  },
                ]}
                onPress={() => setSelectedFilter(cat)}
                activeOpacity={0.75}
              >
                <Text
                  style={[
                    styles.categoryPillText,
                    {
                      color: isSel ? "#FFFFFF" : colors.adminTextSecondary,
                      fontWeight: isSel ? "700" : "500",
                    },
                  ]}
                >
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Notices List matching screenshot layout */}
        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={[styles.loadingText, { color: colors.adminTextSecondary }]}>Syncing notices...</Text>
          </View>
        ) : filteredNotices.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
            <Ionicons name="notifications-off-outline" size={48} color={colors.adminTextSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.adminText }]}>No notices found</Text>
            <Text style={[styles.emptySubtitle, { color: colors.adminTextSecondary }]}>
              Tap "+ Post Notice" to publish a new announcement for students.
            </Text>
            <TouchableOpacity style={styles.emptyPostBtn} onPress={openPostModal}>
              <Ionicons name="add-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.emptyPostBtnText}>Post Notice</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.noticesList}>
            {filteredNotices.map((item) => {
              const catTheme = getCategoryStyles(item.category);

              return (
                <View
                  key={item.id}
                  style={[
                    styles.noticeCard,
                    {
                      backgroundColor: colors.adminCard,
                      borderColor: colors.adminCardBorder,
                    },
                  ]}
                >
                  {/* Top: Category Tag & Date */}
                  <View style={styles.cardHeaderRow}>
                    <View
                      style={[
                        styles.categoryTag,
                        {
                          backgroundColor: isDark ? "rgba(79,70,229,0.2)" : catTheme.bg,
                          borderColor: isDark ? "rgba(79,70,229,0.4)" : catTheme.border,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.categoryTagText,
                          { color: isDark ? "#A5B4FC" : catTheme.text },
                        ]}
                      >
                        {item.category}
                      </Text>
                    </View>

                    <Text style={[styles.cardDateText, { color: colors.adminTextSecondary }]}>{item.date}</Text>
                  </View>

                  {/* Notice Title */}
                  <Text style={[styles.cardTitle, { color: colors.adminText }]}>{item.title}</Text>

                  {/* Priority 7: Targeted audience badge */}
                  {(item.targetBranch !== "All" || item.targetYear !== "All" || item.targetSemester !== "All" || item.targetHostel !== "All") && (
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4, marginBottom: 8, backgroundColor: isDark ? "rgba(99,102,241,0.15)" : "#EEF2FF", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6, alignSelf: "flex-start" }}>
                      <Ionicons name="navigate-circle" size={13} color="#4F46E5" />
                      <Text style={{ fontSize: 11, fontWeight: "700", color: "#4F46E5" }}>
                        🎯 Target: {[
                          item.targetBranch && item.targetBranch !== "All" ? item.targetBranch : null,
                          item.targetYear && item.targetYear !== "All" ? item.targetYear : null,
                          item.targetSemester && item.targetSemester !== "All" ? `Sem ${item.targetSemester}` : null,
                          item.targetHostel && item.targetHostel !== "All" ? item.targetHostel : null,
                        ].filter(Boolean).join(" • ") || "All Students"}
                      </Text>
                    </View>
                  )}

                  {/* Message / Description */}
                  <Text
                    style={[styles.cardMessage, { color: colors.adminTextSecondary }]}
                    numberOfLines={3}
                  >
                    {item.message || item.description}
                  </Text>

                  {/* Optional Photo Thumbnail */}
                  {Boolean(item.photoUrl) && (
                    <TouchableOpacity
                      style={styles.photoThumbWrap}
                      activeOpacity={0.9}
                      onPress={() => setPreviewPhoto(item.photoUrl || null)}
                    >
                      <Image
                        source={{ uri: item.photoUrl }}
                        style={styles.photoThumb}
                        resizeMode="cover"
                      />
                      <View style={styles.photoBadge}>
                        <Ionicons name="image" size={12} color="#FFFFFF" />
                        <Text style={styles.photoBadgeText}>Attached Photo</Text>
                      </View>
                    </TouchableOpacity>
                  )}

                  {/* Optional Video Link */}
                  {Boolean(item.videoUrl) && (
                    <TouchableOpacity
                      style={[
                        styles.videoLinkRow,
                        isDark && { backgroundColor: "rgba(220,38,38,0.15)" },
                      ]}
                      activeOpacity={0.8}
                      onPress={() => item.videoUrl && Linking.openURL(item.videoUrl)}
                    >
                      <Ionicons name="logo-youtube" size={16} color="#DC2626" />
                      <Text style={styles.videoLinkText} numberOfLines={1}>
                        {item.videoUrl}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {/* Card Actions: Edit & Delete (Admin Controls) */}
                  <View
                    style={[
                      styles.cardFooterRow,
                      { borderTopColor: colors.adminCardBorder },
                    ]}
                  >
                    <TouchableOpacity
                      style={[
                        styles.actionBtnEdit,
                        isDark && { backgroundColor: "rgba(79,70,229,0.2)" },
                      ]}
                      activeOpacity={0.8}
                      onPress={() => openEditModal(item)}
                    >
                      <Ionicons name="create-outline" size={16} color="#4F46E5" />
                      <Text style={styles.actionBtnEditText}>Edit Notice</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.actionBtnDelete,
                        isDark && { backgroundColor: "rgba(239,68,68,0.2)" },
                      ]}
                      activeOpacity={0.8}
                      onPress={() => handleDeleteNotice(item)}
                    >
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      <Text style={styles.actionBtnDeleteText}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}

        <View style={{ height: 60 }} />
      </ScrollView>
        </View>
      </View>

      {/* ===================================================== */}
      {/* EDIT / POST NOTICE MODAL (Matches Screenshot 2026-09-21 215258.png) */}
      {/* ===================================================== */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setModalVisible(false)}
        >
          <Pressable
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.adminCard,
                borderColor: colors.adminCardBorder,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={[styles.modalHeading, { color: colors.adminText }]}>
                  {editingNotice ? "Edit Notice" : "Post Notice"}
                </Text>
                <Text style={[styles.modalSubheading, { color: colors.adminTextSecondary }]}>
                  Update notice title, description, photos or lecture videos
                </Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.modalCloseBtn,
                  { backgroundColor: colors.adminSurfaceAlt },
                ]}
                onPress={() => setModalVisible(false)}
              >
                <Ionicons name="close" size={20} color={colors.adminTextSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalFormScroll}>
              {/* Notice Title * */}
              <Text style={[styles.formLabel, { color: colors.adminTextSecondary }]}>Notice Title *</Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: colors.adminInputBg,
                    borderColor: colors.adminInputBorder,
                    color: colors.adminText,
                  },
                ]}
                placeholder="e.g. Annual Tech Fest 'Innovate 2026' A"
                placeholderTextColor={colors.adminTextSecondary}
                value={formTitle}
                onChangeText={setFormTitle}
              />

              {/* Message / Description * */}
              <Text style={[styles.formLabel, { color: colors.adminTextSecondary }]}>Message / Description *</Text>
              <TextInput
                style={[
                  styles.modalInput,
                  styles.modalTextArea,
                  {
                    backgroundColor: colors.adminInputBg,
                    borderColor: colors.adminInputBorder,
                    color: colors.adminText,
                  },
                ]}
                placeholder="Participate in coding marathons, robotics showcases, and project exhibitions..."
                placeholderTextColor={colors.adminTextSecondary}
                multiline
                numberOfLines={4}
                value={formMessage}
                onChangeText={setFormMessage}
              />

              {/* Attach Photo (Image URL or Pick) */}
              <Text style={[styles.formLabel, { color: colors.adminTextSecondary }]}>Attach Photo (Image URL or Pick)</Text>
              <View style={styles.photoInputRow}>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      flex: 1,
                      marginRight: 8,
                      backgroundColor: colors.adminInputBg,
                      borderColor: colors.adminInputBorder,
                      color: colors.adminText,
                    },
                  ]}
                  placeholder="Paste image link or choose photo"
                  placeholderTextColor={colors.adminTextSecondary}
                  value={formPhotoUrl}
                  onChangeText={setFormPhotoUrl}
                />
                <TouchableOpacity
                  style={[
                    styles.pickPhotoBtn,
                    {
                      backgroundColor: colors.adminSurfaceAlt,
                      borderColor: colors.adminInputBorder,
                    },
                  ]}
                  onPress={handlePickPhoto}
                  activeOpacity={0.8}
                >
                  <Ionicons name="image-outline" size={22} color="#4F46E5" />
                </TouchableOpacity>
              </View>

              {/* Attach Video Link (YouTube / Drive / MP4) */}
              <Text style={[styles.formLabel, { color: colors.adminTextSecondary }]}>Attach Video Link (YouTube / Drive / MP4)</Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: colors.adminInputBg,
                    borderColor: colors.adminInputBorder,
                    color: colors.adminText,
                  },
                ]}
                placeholder="https://youtube.com/watch?v=..."
                placeholderTextColor={colors.adminTextSecondary}
                value={formVideoUrl}
                onChangeText={setFormVideoUrl}
                autoCapitalize="none"
              />

              {/* Category Selection Pills */}
              <Text style={[styles.formLabel, { color: colors.adminTextSecondary }]}>Category</Text>
              <View style={styles.modalCategoryRow}>
                {(["Academic", "Examination", "Important", "General"] as const).map((cat) => {
                  const isSel = formCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.modalCatPill,
                        {
                          backgroundColor: isSel ? "#4F46E5" : colors.adminSurfaceAlt,
                          borderColor: isSel ? "#4F46E5" : colors.adminInputBorder,
                        },
                      ]}
                      onPress={() => setFormCategory(cat)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.modalCatPillText,
                          {
                            color: isSel ? "#FFFFFF" : colors.adminTextSecondary,
                          },
                        ]}
                      >
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Priority 7: Targeted Notifications */}
              <View style={{ marginTop: 16, padding: 12, borderRadius: 12, backgroundColor: isDark ? "#1E293B" : "#F8FAFC", borderWidth: 1, borderColor: colors.adminCardBorder }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 8 }}>
                  <Ionicons name="funnel" size={16} color="#4F46E5" />
                  <Text style={{ fontSize: 13, fontWeight: "800", color: colors.adminText }}>
                    Target Audience / Filtering (Priority 7)
                  </Text>
                </View>

                {/* Target Branch / Dept */}
                <Text style={[styles.formLabel, { color: colors.adminTextSecondary, marginTop: 4 }]}>Target Department / Branch</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
                  {["All", "CSE", "ECE", "MECH", "CIVIL", "IT", "EE"].map((br) => (
                    <TouchableOpacity
                      key={br}
                      style={[
                        styles.modalCatPill,
                        {
                          backgroundColor: formTargetBranch === br ? "#4F46E5" : colors.adminSurfaceAlt,
                          borderColor: formTargetBranch === br ? "#4F46E5" : colors.adminInputBorder,
                        },
                      ]}
                      onPress={() => setFormTargetBranch(br)}
                    >
                      <Text style={[styles.modalCatPillText, { color: formTargetBranch === br ? "#FFFFFF" : colors.adminTextSecondary }]}>
                        {br}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Target Year */}
                <Text style={[styles.formLabel, { color: colors.adminTextSecondary, marginTop: 8 }]}>Target Academic Year</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
                  {["All", "1st Year", "2nd Year", "3rd Year", "4th Year"].map((yr) => (
                    <TouchableOpacity
                      key={yr}
                      style={[
                        styles.modalCatPill,
                        {
                          backgroundColor: formTargetYear === yr ? "#4F46E5" : colors.adminSurfaceAlt,
                          borderColor: formTargetYear === yr ? "#4F46E5" : colors.adminInputBorder,
                        },
                      ]}
                      onPress={() => setFormTargetYear(yr)}
                    >
                      <Text style={[styles.modalCatPillText, { color: formTargetYear === yr ? "#FFFFFF" : colors.adminTextSecondary }]}>
                        {yr}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Target Semester */}
                <Text style={[styles.formLabel, { color: colors.adminTextSecondary, marginTop: 8 }]}>Target Semester</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
                  {["All", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th"].map((sem) => (
                    <TouchableOpacity
                      key={sem}
                      style={[
                        styles.modalCatPill,
                        {
                          backgroundColor: formTargetSemester === sem ? "#4F46E5" : colors.adminSurfaceAlt,
                          borderColor: formTargetSemester === sem ? "#4F46E5" : colors.adminInputBorder,
                        },
                      ]}
                      onPress={() => setFormTargetSemester(sem)}
                    >
                      <Text style={[styles.modalCatPillText, { color: formTargetSemester === sem ? "#FFFFFF" : colors.adminTextSecondary }]}>
                        {sem}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                {/* Target Hostel */}
                <Text style={[styles.formLabel, { color: colors.adminTextSecondary, marginTop: 8 }]}>Hostel Target</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingVertical: 4 }}>
                  {["All", "Block A", "Block B", "Block C", "LH-1", "LH-2", "Day Scholar"].map((hst) => (
                    <TouchableOpacity
                      key={hst}
                      style={[
                        styles.modalCatPill,
                        {
                          backgroundColor: formTargetHostel === hst ? "#4F46E5" : colors.adminSurfaceAlt,
                          borderColor: formTargetHostel === hst ? "#4F46E5" : colors.adminInputBorder,
                        },
                      ]}
                      onPress={() => setFormTargetHostel(hst)}
                    >
                      <Text style={[styles.modalCatPillText, { color: formTargetHostel === hst ? "#FFFFFF" : colors.adminTextSecondary }]}>
                        {hst}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>

              {/* Action Buttons: Delete (if editing), Cancel, Save */}
              <View
                style={[
                  styles.modalFooterRow,
                  { borderTopColor: colors.adminCardBorder },
                ]}
              >
                {editingNotice && (
                  <TouchableOpacity
                    style={[
                      styles.modalDeleteBtn,
                      isDark && { backgroundColor: "rgba(239,68,68,0.2)" },
                    ]}
                    onPress={() => handleDeleteNotice(editingNotice)}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    <Text style={styles.modalDeleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                )}

                <View style={{ flexDirection: "row", gap: 10, marginLeft: "auto" }}>
                  <TouchableOpacity
                    style={[
                      styles.modalCancelBtn,
                      { backgroundColor: colors.adminSurfaceAlt },
                    ]}
                    onPress={() => setModalVisible(false)}
                    disabled={saving}
                  >
                    <Text style={[styles.modalCancelBtnText, { color: colors.adminTextSecondary }]}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalSaveBtn}
                    onPress={handleSaveNotice}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalSaveBtnText}>
                        {editingNotice ? "Save Changes" : "Publish Notice"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Full Photo Modal */}
      <Modal visible={Boolean(previewPhoto)} transparent animationType="fade" onRequestClose={() => setPreviewPhoto(null)}>
        <View style={styles.fullPhotoBackdrop}>
          <TouchableOpacity style={styles.closeFullPhotoBtn} onPress={() => setPreviewPhoto(null)}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {previewPhoto && (
            <Image source={{ uri: previewPhoto }} style={styles.fullPhotoImg} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// =====================================================
// STYLES (Matching Screenshot 2026-09-21 215258.png)
// =====================================================
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  headerLeftRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  backButton: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },
  pageSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  postNoticeBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4F46E5",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  postNoticeBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  scrollContainer: {
    padding: 20,
  },

  /* Search Bar */
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: "#0F172A",
    padding: 0,
  },

  /* Category Filter Pills */
  categoryPillsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  categoryPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  categoryPillActive: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  categoryPillText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  categoryPillTextActive: {
    color: "#FFFFFF",
  },

  /* Notices List */
  centerLoading: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 50,
  },
  loadingText: {
    color: "#64748B",
    fontSize: 13,
    marginTop: 10,
  },
  emptyCard: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 16,
    padding: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 6,
    textAlign: "center",
  },
  emptyPostBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4F46E5",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 16,
  },
  emptyPostBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  noticesList: {
    gap: 14,
  },
  noticeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  categoryTag: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
  },
  categoryTagText: {
    fontSize: 11,
    fontWeight: "700",
  },
  cardDateText: {
    fontSize: 12,
    color: "#94A3B8",
    fontWeight: "500",
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 6,
  },
  cardMessage: {
    fontSize: 13,
    color: "#475569",
    lineHeight: 20,
  },

  photoThumbWrap: {
    marginTop: 12,
    borderRadius: 10,
    overflow: "hidden",
    position: "relative",
  },
  photoThumb: {
    width: "100%",
    height: 160,
    backgroundColor: "#E2E8F0",
  },
  photoBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  photoBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },

  videoLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 10,
  },
  videoLinkText: {
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "600",
    flex: 1,
  },

  cardFooterRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 12,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  actionBtnEdit: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#EEF2FF",
  },
  actionBtnEditText: {
    color: "#4F46E5",
    fontSize: 12,
    fontWeight: "700",
  },
  actionBtnDelete: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
  },
  actionBtnDeleteText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "700",
  },

  /* Modal (Exact match for Screenshot 2026-09-21 215258.png) */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  modalCard: {
    width: "100%",
    maxWidth: 520,
    maxHeight: "90%",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 22,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  modalHeading: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalSubheading: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 4,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
  },
  modalFormScroll: {},
  formLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#0F172A",
  },
  modalTextArea: {
    height: 96,
    textAlignVertical: "top",
  },
  photoInputRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  pickPhotoBtn: {
    width: 44,
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCategoryRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  modalCatPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  modalCatPillActive: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  modalCatPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  modalCatPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  modalFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 22,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  modalDeleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
  },
  modalDeleteBtnText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "700",
  },
  modalCancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  modalCancelBtnText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "600",
  },
  modalSaveBtn: {
    backgroundColor: "#4F46E5",
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 8,
  },
  modalSaveBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  fullPhotoBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeFullPhotoBtn: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  fullPhotoImg: {
    width: "100%",
    height: "85%",
  },
});