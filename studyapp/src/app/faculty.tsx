import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  collection,
  onSnapshot,
  orderBy,
  query,
} from "firebase/firestore";

import { auth, db } from "../firebase/config";
import { useAppTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";

export interface FacultyMember {
  id: string;
  name: string;
  designation: string;
  department: string;
  email: string;
  phone: string;
  room: string;
  subjects: string[];
  avatar?: string;
  code?: string;
}

export default function FacultyScreen() {
  const { colors, isDark } = useAppTheme();
  const { t } = useLanguage();

  const [faculties, setFaculties] = useState<FacultyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Optional full photo view modal
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});

  useEffect(() => {
    const facultyCol = collection(db, "faculty");
    const q = query(facultyCol, orderBy("name", "asc"));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const loaded: FacultyMember[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name || "Faculty Member",
            designation: data.designation || "Assistant Professor",
            department: data.department || "Computer Science & Engineering",
            email: data.email || "",
            phone: data.phone || "",
            room: data.room || "Faculty Cabin",
            subjects: Array.isArray(data.subjects)
              ? data.subjects
              : typeof data.subjects === "string"
              ? data.subjects.split(",").map((s: string) => s.trim())
              : ["General Studies"],
            avatar: data.avatar || undefined,
            code: data.code || undefined,
          };
        });

        setFaculties(loaded);
        setLoading(false);
      },
      (err) => {
        console.warn("Faculty directory listener error:", err);
        setFaculties([]);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const filteredFaculties = faculties.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.department.toLowerCase().includes(search.toLowerCase()) ||
      f.subjects.some((s) => s.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={["top"]}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: colors.text }]}>
          {t("faculties", "Faculty Directory")}
        </Text>
        <View style={{ width: 32 }} />
      </View>

      {/* Search Bar */}
      <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search-outline" size={20} color={colors.textSecondary} />
        <TextInput
          style={[styles.searchInput, { color: colors.text }]}
          value={search}
          onChangeText={setSearch}
          placeholder={t("search", "Search by professor, subject or department...")}
          placeholderTextColor={colors.textMuted}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch("")}>
            <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <View style={styles.centerLoading}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
            {t("loading", "Loading faculty directory...")}
          </Text>
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          <View style={styles.countRow}>
            <Text style={[styles.resultsCount, { color: colors.textSecondary }]}>
              {filteredFaculties.length} {filteredFaculties.length === 1 ? "Professor" : "Professors"} found
            </Text>
            <View style={styles.officialBadge}>
              <Ionicons name="shield-checkmark" size={13} color="#10B981" />
              <Text style={styles.officialBadgeText}>Official Faculty</Text>
            </View>
          </View>

          {filteredFaculties.length === 0 ? (
            <View style={{ alignItems: "center", justifyContent: "center", paddingVertical: 60, paddingHorizontal: 20 }}>
              <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                <Ionicons name="people-outline" size={32} color={colors.primary} />
              </View>
              <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text, marginBottom: 8 }}>
                No Faculty Members Found
              </Text>
              <Text style={{ fontSize: 13, color: colors.textSecondary, textAlign: "center" }}>
                {search.trim().length > 0
                  ? "No results match your search query."
                  : "No faculty members in the directory yet. The administration will update this shortly."}
              </Text>
            </View>
          ) : (
            filteredFaculties.map((f) => (
              <View
                key={f.id}
                style={[
                  styles.facultyCard,
                  { backgroundColor: colors.card, borderColor: colors.border },
                ]}
              >
                {/* Top row with photo/avatar and details */}
                <View style={styles.facultyTopRow}>
                  {f.avatar && !imageErrors[f.id] ? (
                    <TouchableOpacity activeOpacity={0.85} onPress={() => setPreviewPhoto(f.avatar || null)}>
                      <Image
                        source={{ uri: f.avatar }}
                        style={styles.facultyAvatarImg}
                        resizeMode="cover"
                        onError={() => setImageErrors((prev) => ({ ...prev, [f.id]: true }))}
                      />
                    </TouchableOpacity>
                  ) : (
                    <View style={[styles.facultyAvatar, { backgroundColor: colors.primaryLight }]}>
                      <Text style={[styles.facultyAvatarText, { color: colors.primary }]}>
                        {f.name.replace("Dr. ", "").replace("Prof. ", "").trim().charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}

                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={[styles.facultyName, { color: colors.text }]}>{f.name}</Text>
                    <Text style={[styles.facultyDesignation, { color: colors.primary }]}>
                      {f.designation}
                    </Text>
                    <Text style={[styles.facultyDepartment, { color: colors.textSecondary }]}>
                      {f.department}
                    </Text>
                  </View>
                </View>

                {/* Room & Cabin */}
                <View style={[styles.infoRow, { backgroundColor: isDark ? "#1E293B" : "#F8FAFC" }]}>
                  <Ionicons name="location-outline" size={16} color={colors.textSecondary} />
                  <Text style={[styles.infoText, { color: colors.text }]}>{f.room}</Text>
                </View>

                {/* Subjects taught */}
                <View style={styles.subjectsRow}>
                  {f.subjects.map((s, idx) => (
                    <View
                      key={idx}
                      style={[
                        styles.subjectBadge,
                        { backgroundColor: colors.primaryLight, borderColor: colors.border },
                      ]}
                    >
                      <Text style={[styles.subjectBadgeText, { color: colors.primary }]}>{s}</Text>
                    </View>
                  ))}
                </View>

                {/* Quick Contact buttons */}
                <View style={[styles.contactRow, { borderTopColor: colors.border }]}>
                  {f.email ? (
                    <TouchableOpacity
                      style={[styles.contactBtn, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]}
                      onPress={() => Linking.openURL(`mailto:${f.email}`)}
                    >
                      <Ionicons name="mail-outline" size={16} color={colors.primary} />
                      <Text style={[styles.contactBtnText, { color: colors.text }]}>Email</Text>
                    </TouchableOpacity>
                  ) : null}

                  {f.phone ? (
                    <TouchableOpacity
                      style={[styles.contactBtn, { backgroundColor: isDark ? "#334155" : "#F1F5F9" }]}
                      onPress={() => Linking.openURL(`tel:${f.phone}`)}
                    >
                      <Ionicons name="call-outline" size={16} color="#16A34A" />
                      <Text style={[styles.contactBtnText, { color: colors.text }]}>Call</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </View>
            ))
          )}
          <View style={{ height: 30 }} />
        </ScrollView>
      )}

      {/* Full Photo Preview Modal */}
      <Modal visible={Boolean(previewPhoto)} transparent animationType="fade" onRequestClose={() => setPreviewPhoto(null)}>
        <View style={styles.photoPreviewOverlay}>
          <TouchableOpacity style={styles.closePhotoBtn} onPress={() => setPreviewPhoto(null)}>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#7C3AED",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  centerLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  countRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginVertical: 10,
  },
  resultsCount: {
    fontSize: 12,
    fontWeight: "600",
  },
  facultyCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 12,
  },
  facultyTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  facultyAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  facultyAvatarText: {
    fontSize: 20,
    fontWeight: "800",
  },
  facultyName: {
    fontSize: 15,
    fontWeight: "800",
  },
  facultyDesignation: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 1,
  },
  facultyDepartment: {
    fontSize: 11,
    marginTop: 1,
  },
  miniActionBtn: {
    padding: 6,
    borderRadius: 6,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    gap: 8,
    marginBottom: 10,
  },
  infoText: {
    fontSize: 12,
    fontWeight: "500",
  },
  subjectsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 12,
  },
  subjectBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  subjectBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },
  contactRow: {
    flexDirection: "row",
    gap: 10,
    borderTopWidth: 1,
    paddingTop: 10,
  },
  contactBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  contactBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  facultyAvatarImg: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.5,
    borderColor: "#A78BFA",
  },
  officialBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  officialBadgeText: {
    color: "#10B981",
    fontSize: 11,
    fontWeight: "700",
  },

  /* Photo Preview Modal */
  photoPreviewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  closePhotoBtn: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 20,
    padding: 6,
  },
  fullPhotoImg: {
    width: "100%",
    height: "75%",
    borderRadius: 16,
  },
});
