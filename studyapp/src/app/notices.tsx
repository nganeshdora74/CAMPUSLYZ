import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
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

import { auth, db } from "../firebase/config";
import { useAppTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import LanguageToggle from "../components/LanguageToggle";
import UniversalRoleControls from "../components/UniversalRoleControls";
import OfflineBanner from "../components/OfflineBanner";
import {
  connectStudentToTeacher,
  seedDefaultTeacherCode,
} from "../firebase/teacherStudent";

const { width } = Dimensions.get("window");

export type Notice = {
  id: string;
  title: string;
  message?: string;
  description?: string;
  category: string;
  priority?: string;
  date?: string;
  photoUrl?: string;
  videoUrl?: string;
  isTeacherNotice?: boolean;
  teacherId?: string;
  teacherName?: string;
  subject?: string;
  targetBranch?: string;
  targetYear?: string;
  targetSemester?: string;
  targetHostel?: string;
  targetBatch?: string;
  createdAt?: any;
};

const SAMPLE_NOTICES: Omit<Notice, "id">[] = [
  {
    title: "Binary Tree Traversal - Lecture Board Notes & Video",
    message: "Dear students, please review the complete walkthrough for Inorder, Preorder, and Postorder tree traversals with recursion and iteration. Attached are the lecture board summary and recorded video solution for Module 4.",
    category: "Academic",
    priority: "high",
    date: "21 Sep 2026",
    isTeacherNotice: true,
    teacherId: "TEACH-CSE-101",
    teacherName: "Prof. Ganesh Sharma",
    subject: "Data Structures & Algorithms",
    photoUrl: "https://images.unsplash.com/photo-1517694712202-14dd9538aa97?w=900&auto=format&fit=crop&q=80",
    videoUrl: "https://www.youtube.com/watch?v=9KM39G34RPU",
  },
  {
    title: "Semester Examination Schedule & Hall Tickets",
    message: "The official schedule for end-semester examinations is now published. Please download your hall tickets from the student portal and verify your registered subject codes before Friday.",
    category: "Examination",
    priority: "high",
    date: "18 Sep 2026",
    isTeacherNotice: false,
    photoUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=900&auto=format&fit=crop&q=80",
  },
  {
    title: "Campus Placement: Core Engineering Companies",
    message: "Registrations are open for campus recruitment drives. Eligible students with CGPA > 7.0 must submit resumes before Friday to the training & placement cell.",
    category: "Academic",
    priority: "high",
    date: "17 Sep 2026",
    isTeacherNotice: false,
  },
  {
    title: "Central Library 24/7 Reading Hall Extended Hours",
    message: "The Central Library reading hall and digital computer lab will stay open 24/7 during the examination prep weeks for all registered students.",
    category: "General",
    priority: "low",
    date: "15 Sep 2026",
    isTeacherNotice: false,
  },
];

export default function NoticesScreen() {
  const { colors, isDark } = useAppTheme();
  const { t } = useLanguage();

  const [notices, setNotices] = useState<Notice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Connected Teacher IDs for access control
  const [connectedTeacherIds, setConnectedTeacherIds] = useState<string[]>([]);

  // Modals
  const [detailNotice, setDetailNotice] = useState<Notice | null>(null);
  const [photoModalUrl, setPhotoModalUrl] = useState<string | null>(null);
  const [unlockModalVisible, setUnlockModalVisible] = useState(false);
  const [targetTeacherId, setTargetTeacherId] = useState("");
  const [unlockPassword, setUnlockPassword] = useState("");
  const [unlocking, setUnlocking] = useState(false);

  const categories = ["All", "Academic", "Examination", "Important", "General"];

  // 1. Sync User's Connected Teachers
  useEffect(() => {
    seedDefaultTeacherCode();

    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const ids = (data.connectedTeacherIds as string[]) || [];
        setConnectedTeacherIds(ids.map((id) => id.toUpperCase()));
      }
    });

    return unsubscribe;
  }, []);

  // 2. Real-time Notices Sync
  useEffect(() => {
    const noticesRef = collection(db, "notices");
    const q = query(noticesRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      async (snapshot) => {
        if (snapshot.empty) {
          // Auto-seed sample notices if collection is empty
          try {
            for (const s of SAMPLE_NOTICES) {
              await addDoc(collection(db, "notices"), {
                ...s,
                createdAt: serverTimestamp(),
              });
            }
          } catch (seedErr) {
            console.warn("Could not seed notices:", seedErr);
          }
          setLoading(false);
          return;
        }

        const loaded: Notice[] = snapshot.docs.map((docItem) => {
          const data = docItem.data();
          return {
            id: docItem.id,
            title: data.title || "Notice",
            message: data.message || data.description || "",
            description: data.description || data.message || "",
            category: data.category || "General",
            priority: data.priority || "medium",
            date: data.date || "Today",
            photoUrl: data.photoUrl || data.image || "",
            videoUrl: data.videoUrl || "",
            isTeacherNotice: Boolean(data.isTeacherNotice),
            teacherId: data.teacherId || "",
            teacherName: data.teacherName || "",
            subject: data.subject || "",
            targetBranch: data.targetBranch || "All",
            targetYear: data.targetYear || "All",
            targetSemester: data.targetSemester || "All",
            targetHostel: data.targetHostel || "All",
            targetBatch: data.targetBatch || "All",
            createdAt: data.createdAt,
          };
        });

        setNotices(loaded);
        setLoading(false);
        setRefreshing(false);
      },
      (err) => {
        console.warn("Notices snapshot error:", err.message);
        // Fallback to sample notices if offline
        setNotices(
          SAMPLE_NOTICES.map((s, idx) => ({ id: `offline-${idx}`, ...s }))
        );
        setLoading(false);
        setRefreshing(false);
      }
    );

    return unsubscribe;
  }, []);

  // Check if student has access to a notice
  const isNoticeUnlocked = (notice: Notice): boolean => {
    if (!notice.isTeacherNotice) return true;
    if (!notice.teacherId) return true;
    return connectedTeacherIds.includes(notice.teacherId.trim().toUpperCase());
  };

  // Open / Unlock Notice Handler
  const handleOpenNotice = (notice: Notice) => {
    if (isNoticeUnlocked(notice)) {
      setDetailNotice(notice);
    } else {
      setTargetTeacherId(notice.teacherId || "TEACH-CSE-101");
      setUnlockPassword("");
      setUnlockModalVisible(true);
    }
  };

  // Unlock Notice by Entering Password
  const handleUnlockNotice = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Login Required", "Please log in before connecting to a teacher.");
      return;
    }
    if (!targetTeacherId.trim() || !unlockPassword.trim()) {
      Alert.alert("Missing Information", "Please enter the Teacher ID and Password.");
      return;
    }

    setUnlocking(true);
    const result = await connectStudentToTeacher(
      user.uid,
      user.displayName || "Student",
      user.email || "",
      targetTeacherId,
      unlockPassword
    );
    setUnlocking(false);

    if (result.success && result.teacher) {
      Alert.alert(
        "Notice Unlocked! 🔓",
        `You have connected with ${result.teacher.teacherName}. All study photos, videos, and class notices from this teacher are now unlocked!`
      );
      setUnlockModalVisible(false);
    } else {
      Alert.alert("Access Denied", result.error || "Incorrect Teacher ID or Password.");
    }
  };

  // Open Video URL
  const handleOpenVideo = (url?: string) => {
    if (!url) return;
    Linking.openURL(url).catch(() => {
      Alert.alert("Cannot Open Video", `Please verify the video link: ${url}`);
    });
  };

  const filteredNotices = useMemo(() => {
    return notices.filter((n) => {
      const matchCat =
        selectedCategory === "All" ||
        n.category.toLowerCase() === selectedCategory.toLowerCase();
      const matchSearch =
        !search.trim() ||
        `${n.title} ${n.message || ""} ${n.teacherName || ""}`
          .toLowerCase()
          .includes(search.toLowerCase());
      return matchCat && matchSearch;
    });
  }, [notices, selectedCategory, search]);

  return (
    <SafeAreaView edges={["top"]} style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* ==================================================== */}
      {/* HEADER */}
      {/* ==================================================== */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: isDark ? colors.border : "#F1F5F9" }]}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </TouchableOpacity>

        <View style={{ flex: 1, marginLeft: 10 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t("notices", "Notices & Announcements")}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
            Official college & teacher class updates
          </Text>
        </View>

        <UniversalRoleControls compact />
      </View>

      <OfflineBanner />

      {/* ==================================================== */}
      {/* SEARCH BAR */}
      {/* ==================================================== */}
      <View style={[styles.searchBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          value={search}
          onChangeText={setSearch}
          placeholder="Search notices, faculty, or topics..."
          placeholderTextColor={colors.textSecondary}
        />
        {Boolean(search) && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={16} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {/* ==================================================== */}
      {/* CATEGORY TABS */}
      {/* ==================================================== */}
      <View style={styles.categoryBar}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}>
          {categories.map((cat) => {
            const isSel = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.catPill,
                  {
                    backgroundColor: isSel ? colors.primary : colors.card,
                    borderColor: isSel ? colors.primary : colors.border,
                  },
                ]}
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.75}
              >
                <Text style={[styles.catPillText, { color: isSel ? "#FFFFFF" : colors.text }]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* ==================================================== */}
      {/* NOTICES LIST */}
      {/* ==================================================== */}
      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading notices...</Text>
        </View>
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                setTimeout(() => setRefreshing(false), 800);
              }}
              colors={[colors.primary]}
            />
          }
        >
          {filteredNotices.length === 0 ? (
            <View style={[styles.emptyNoticeBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="notifications-off-outline" size={42} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No Notices Found</Text>
              <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                No announcements matching your search or category filter.
              </Text>
            </View>
          ) : (
            filteredNotices.map((item) => {
              const unlocked = isNoticeUnlocked(item);

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.noticeCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: item.isTeacherNotice
                        ? unlocked
                          ? "#86EFAC"
                          : "#FCA5A5"
                        : colors.border,
                    },
                  ]}
                  activeOpacity={0.88}
                  onPress={() => handleOpenNotice(item)}
                >
                  {/* Top Badges Row */}
                  <View style={styles.cardHeaderRow}>
                    {item.isTeacherNotice ? (
                      <View
                        style={[
                          styles.teacherTagBadge,
                          { backgroundColor: unlocked ? "#DCFCE7" : "#FEE2E2" },
                        ]}
                      >
                        <Ionicons
                          name={unlocked ? "lock-open" : "lock-closed"}
                          size={13}
                          color={unlocked ? "#16A34A" : "#EF4444"}
                        />
                        <Text
                          style={[
                            styles.teacherTagText,
                            { color: unlocked ? "#16A34A" : "#EF4444" },
                          ]}
                        >
                          {unlocked
                            ? `Class Notice • ${item.teacherName || "Teacher"}`
                            : `Protected Notice • ${item.teacherName || "Teacher"}`}
                        </Text>
                      </View>
                    ) : (
                      <View style={[styles.categoryPill, { backgroundColor: colors.primaryLight }]}>
                        <Text style={[styles.categoryPillText, { color: colors.primary }]}>
                          {item.category}
                        </Text>
                      </View>
                    )}

                    <Text style={[styles.noticeDateText, { color: colors.textSecondary }]}>
                      {item.date}
                    </Text>
                  </View>

                  {/* Targeted Audience Pill if specified */}
                  {(Boolean(item.targetBranch) || Boolean(item.targetYear) || Boolean(item.targetSemester) || Boolean(item.targetHostel)) && (
                    <View style={styles.targetAudienceBadge}>
                      <Ionicons name="funnel" size={11} color="#4F46E5" />
                      <Text style={styles.targetAudienceText}>
                        Target: {[
                          item.targetBranch ? `${item.targetBranch}` : null,
                          item.targetYear ? `${item.targetYear}` : null,
                          item.targetSemester ? `Sem ${item.targetSemester}` : null,
                          item.targetHostel ? `Hostel: ${item.targetHostel}` : null,
                        ]
                          .filter(Boolean)
                          .join(" • ")}
                      </Text>
                    </View>
                  )}

                  {/* Title */}
                  <Text style={[styles.cardTitle, { color: colors.text }]} numberOfLines={2}>
                    {item.title}
                  </Text>

                  {/* Unlocked Content vs Locked Overlay */}
                  {unlocked ? (
                    <View>
                      <Text style={[styles.cardMessage, { color: colors.textSecondary }]} numberOfLines={3}>
                        {item.message || item.description}
                      </Text>

                      {/* Photo Thumbnail if attached */}
                      {Boolean(item.photoUrl) && (
                        <TouchableOpacity
                          style={styles.cardPhotoThumb}
                          activeOpacity={0.9}
                          onPress={() => setPhotoModalUrl(item.photoUrl || null)}
                        >
                          <Image source={{ uri: item.photoUrl }} style={styles.cardImg} resizeMode="cover" />
                          <View style={styles.photoPillOverlay}>
                            <Ionicons name="image" size={12} color="#FFFFFF" />
                            <Text style={styles.photoPillText}>Study Photo</Text>
                          </View>
                        </TouchableOpacity>
                      )}

                      {/* Video Button if attached */}
                      {Boolean(item.videoUrl) && (
                        <TouchableOpacity
                          style={styles.videoLinkBanner}
                          activeOpacity={0.85}
                          onPress={() => handleOpenVideo(item.videoUrl)}
                        >
                          <View style={styles.playIconBox}>
                            <Ionicons name="play" size={14} color="#FFFFFF" />
                          </View>
                          <Text style={styles.videoLinkText} numberOfLines={1}>
                            Watch Class Lecture / Video Solution
                          </Text>
                          <Ionicons name="open-outline" size={15} color="#DC2626" />
                        </TouchableOpacity>
                      )}
                    </View>
                  ) : (
                    /* LOCKED CARD STATE */
                    <View style={styles.lockedContainer}>
                      <View style={styles.lockedNoticeInfoRow}>
                        <Ionicons name="shield" size={18} color="#EF4444" />
                        <Text style={styles.lockedNoticeDesc}>
                          This class notice contains private lecture notes, study photos, and videos from {item.teacherName || "your professor"}.
                        </Text>
                      </View>

                      <TouchableOpacity
                        style={styles.unlockCardBtn}
                        onPress={() => handleOpenNotice(item)}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="key" size={14} color="#FFFFFF" />
                        <Text style={styles.unlockCardBtnText}>Unlock Notice (Enter ID & Password)</Text>
                      </TouchableOpacity>
                    </View>
                  )}

                  {/* Card Footer */}
                  <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                    <Text style={[styles.cardFooterHint, { color: colors.primary }]}>
                      {unlocked ? "View Full Notice →" : "Enter Password to Access →"}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* ==================================================== */}
      {/* NOTICE DETAIL MODAL */}
      {/* ==================================================== */}
      <Modal visible={Boolean(detailNotice)} transparent animationType="slide" onRequestClose={() => setDetailNotice(null)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.detailModalBox, { backgroundColor: colors.modalBg }]}>
            <View style={styles.detailHeader}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.detailTitle, { color: colors.text }]}>{detailNotice?.title}</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                  {detailNotice?.date} • {detailNotice?.category}
                </Text>
              </View>

              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <TouchableOpacity onPress={() => setDetailNotice(null)} style={{ padding: 4 }}>
                  <Ionicons name="close-circle" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: "75%" }}>
              {/* Teacher badge if teacher notice */}
              {detailNotice?.isTeacherNotice && (
                <View style={styles.detailTeacherBadge}>
                  <Ionicons name="school" size={16} color="#16A34A" />
                  <Text style={styles.detailTeacherBadgeText}>
                    Published by {detailNotice?.teacherName} ({detailNotice?.subject || "Class Faculty"})
                  </Text>
                </View>
              )}

              {/* Photo */}
              {Boolean(detailNotice?.photoUrl) && (
                <TouchableOpacity
                  activeOpacity={0.9}
                  onPress={() => setPhotoModalUrl(detailNotice?.photoUrl || null)}
                  style={styles.detailPhotoWrap}
                >
                  <Image source={{ uri: detailNotice?.photoUrl }} style={styles.detailImg} resizeMode="cover" />
                  <Text style={styles.tapToZoomText}>Tap to view full image</Text>
                </TouchableOpacity>
              )}

              {/* Video Banner */}
              {Boolean(detailNotice?.videoUrl) && (
                <TouchableOpacity
                  style={styles.videoDetailCard}
                  onPress={() => handleOpenVideo(detailNotice?.videoUrl)}
                  activeOpacity={0.85}
                >
                  <View style={styles.videoDetailPlayBox}>
                    <Ionicons name="play" size={20} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.videoDetailTitle}>Class Video / Lecture Included</Text>
                    <Text style={styles.videoDetailSub} numberOfLines={1}>
                      {detailNotice?.videoUrl}
                    </Text>
                  </View>
                  <Ionicons name="open-outline" size={18} color="#DC2626" />
                </TouchableOpacity>
              )}

              {/* Message text */}
              <Text style={[styles.detailBody, { color: colors.text }]}>
                {detailNotice?.message || detailNotice?.description}
              </Text>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ==================================================== */}
      {/* UNLOCK NOTICE MODAL */}
      {/* ==================================================== */}
      <Modal visible={unlockModalVisible} transparent animationType="slide" onRequestClose={() => setUnlockModalVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.unlockModalBox, { backgroundColor: colors.modalBg }]}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={[styles.modalHeaderTitle, { color: colors.text }]}>Unlock Class Notice</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  Enter Teacher ID & Password to access photos, videos & notes
                </Text>
              </View>
              <TouchableOpacity onPress={() => setUnlockModalVisible(false)}>
                <Text style={[styles.closeX, { color: colors.textSecondary }]}>×</Text>
              </TouchableOpacity>
            </View>

            {/* Demo Chip */}
            <TouchableOpacity
              style={[styles.demoChip, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}
              onPress={() => {
                setTargetTeacherId("TEACH-CSE-101");
                setUnlockPassword("123");
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary }}>
                💡 Tap to Auto-Fill Demo:
              </Text>
              <Text style={{ fontSize: 11.5, color: colors.text, marginTop: 2 }}>
                ID: <Text style={{ fontWeight: "700" }}>TEACH-CSE-101</Text> • Password: <Text style={{ fontWeight: "700" }}>123</Text>
              </Text>
            </TouchableOpacity>

            <Text style={{ fontSize: 12, fontWeight: "600", color: colors.text, marginBottom: 4 }}>Teacher ID *</Text>
            <TextInput
              value={targetTeacherId}
              onChangeText={setTargetTeacherId}
              placeholder="e.g. TEACH-CSE-101"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
              style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
            />

            <Text style={{ fontSize: 12, fontWeight: "600", color: colors.text, marginTop: 10, marginBottom: 4 }}>
              Access Password *
            </Text>
            <TextInput
              value={unlockPassword}
              onChangeText={setUnlockPassword}
              placeholder="Enter password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              style={[styles.modalInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
            />

            <TouchableOpacity
              style={[styles.unlockSubmitBtn, { backgroundColor: colors.primary }]}
              onPress={handleUnlockNotice}
              disabled={unlocking}
            >
              {unlocking ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.unlockSubmitBtnText}>Unlock & Connect</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ==================================================== */}
      {/* FULL PHOTO VIEWER MODAL */}
      {/* ==================================================== */}
      <Modal visible={Boolean(photoModalUrl)} transparent animationType="fade" onRequestClose={() => setPhotoModalUrl(null)}>
        <View style={styles.fullPhotoOverlay}>
          <TouchableOpacity style={styles.closeFullPhoto} onPress={() => setPhotoModalUrl(null)}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {photoModalUrl && (
            <Image source={{ uri: photoModalUrl }} style={styles.fullPhotoView} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  /* HEADER */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 16.5,
    fontWeight: "800",
  },
  headerSubtitle: {
    fontSize: 11.5,
    marginTop: 1,
  },
  postNoticeBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 14,
    gap: 4,
  },
  postNoticeBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  /* SEARCH BOX */
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 10,
    marginBottom: 8,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13.5,
  },

  /* CATEGORY BAR */
  categoryBar: {
    paddingVertical: 6,
  },
  catPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  catPillText: {
    fontSize: 12,
    fontWeight: "600",
  },

  /* LIST */
  scrollList: {
    padding: 16,
    paddingBottom: 40,
  },
  centerLoading: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    fontSize: 13,
    marginTop: 10,
  },
  emptyNoticeBox: {
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
    borderWidth: 1,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 10,
  },
  emptyDesc: {
    fontSize: 12.5,
    textAlign: "center",
    marginTop: 4,
  },

  /* NOTICE CARD */
  noticeCard: {
    borderRadius: 16,
    padding: 16,
    borderWidth: 1.2,
    marginBottom: 14,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  teacherTagBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
    gap: 5,
  },
  teacherTagText: {
    fontSize: 11,
    fontWeight: "700",
  },
  categoryPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  categoryPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  noticeDateText: {
    fontSize: 11,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "800",
    lineHeight: 21,
    marginBottom: 6,
  },
  cardMessage: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 8,
  },
  cardPhotoThumb: {
    width: "100%",
    height: 140,
    borderRadius: 12,
    overflow: "hidden",
    marginVertical: 8,
    position: "relative",
  },
  cardImg: {
    width: "100%",
    height: "100%",
  },
  photoPillOverlay: {
    position: "absolute",
    bottom: 8,
    left: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  photoPillText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  videoLinkBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    marginTop: 6,
    gap: 8,
  },
  playIconBox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },
  videoLinkText: {
    flex: 1,
    fontSize: 12.5,
    fontWeight: "700",
    color: "#991B1B",
  },

  /* LOCKED CONTAINER */
  lockedContainer: {
    backgroundColor: "#FFF1F2",
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: "#FECDD3",
    marginVertical: 6,
  },
  lockedNoticeInfoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  lockedNoticeDesc: {
    flex: 1,
    fontSize: 12,
    color: "#9F1239",
    lineHeight: 17,
  },
  unlockCardBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#E11D48",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginTop: 10,
    gap: 6,
  },
  unlockCardBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  cardFooter: {
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  cardFooterHint: {
    fontSize: 12,
    fontWeight: "600",
  },

  /* MODALS */
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
  },
  detailModalBox: {
    width: "100%",
    maxWidth: 440,
    borderRadius: 20,
    padding: 20,
  },
  detailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  detailTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  detailTeacherBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DCFCE7",
    padding: 8,
    borderRadius: 10,
    marginBottom: 10,
    gap: 6,
  },
  detailTeacherBadgeText: {
    fontSize: 12,
    color: "#16A34A",
    fontWeight: "600",
  },
  detailPhotoWrap: {
    borderRadius: 14,
    overflow: "hidden",
    marginVertical: 10,
  },
  detailImg: {
    width: "100%",
    height: 200,
  },
  tapToZoomText: {
    fontSize: 11,
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 4,
  },
  videoDetailCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#FECACA",
    marginVertical: 10,
  },
  videoDetailPlayBox: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
  },
  videoDetailTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#991B1B",
  },
  videoDetailSub: {
    fontSize: 11,
    color: "#EF4444",
    marginTop: 1,
  },
  detailBody: {
    fontSize: 14,
    lineHeight: 22,
    marginTop: 8,
  },
  unlockModalBox: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    padding: 20,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  modalHeaderTitle: {
    fontSize: 16.5,
    fontWeight: "800",
  },
  closeX: {
    fontSize: 24,
    paddingHorizontal: 6,
  },
  demoChip: {
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  modalInput: {
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    marginBottom: 10,
  },
  unlockSubmitBtn: {
    paddingVertical: 11,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 10,
  },
  unlockSubmitBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  catSelectRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginVertical: 8,
  },
  catSelectPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  catSelectPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  publishSubmitBtn: {
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 14,
  },
  publishSubmitBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  postModalBox: {
    width: "100%",
    maxWidth: 440,
    borderRadius: 20,
    padding: 20,
  },
  pickPhotoBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  toggleWrap: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 8,
  },
  fullPhotoOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeFullPhoto: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  fullPhotoView: {
    width: width * 0.95,
    height: "80%",
  },
  targetAudienceBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 6,
    gap: 4,
  },
  targetAudienceText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4F46E5",
  },
});