import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
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
import * as ImagePicker from "expo-image-picker";
import { auth } from "../../firebase/config";
import { useAppTheme } from "../../context/ThemeContext";
import NotificationBellModal from "../../components/NotificationBellModal";
import UniversalRoleControls from "../../components/UniversalRoleControls";
import {
  pickPdfDocument,
  shareOrDownloadPdf,
} from "../../services/certificatePdfService";
import {
  addStudyResource,
  deleteStudyResource,
  ResourceFormat,
  ResourceItem,
  subscribeResources,
  uploadResourceFile,
} from "../../services/resourceService";

const STANDARD_SUBJECTS = [
  "Data Structures & Algorithms",
  "Operating Systems",
  "DBMS",
  "Computer Networks",
  "Mathematics",
  "Python Programming",
  "Software Engineering",
  "Web Technologies",
  "Artificial Intelligence",
];

export default function TeacherResourcesScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const { colors, isDark } = useAppTheme();

  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"All" | ResourceFormat>("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Upload modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");

  // Form fields
  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState("Data Structures & Algorithms");
  const [newFormat, setNewFormat] = useState<ResourceFormat>("PDF");
  const [newTargetClass, setNewTargetClass] = useState("B.Tech CSE - 4th Sem");
  const [newDescription, setNewDescription] = useState("");
  const [newFileUrl, setNewFileUrl] = useState("");
  const [newFileName, setNewFileName] = useState("");
  const [newFileSize, setNewFileSize] = useState("");
  const [newVideoUrl, setNewVideoUrl] = useState("");

  // Photo viewer modal
  const [previewPhotoUrl, setPreviewPhotoUrl] = useState<string | null>(null);

  // Subscribe to live resources
  useEffect(() => {
    const unsub = subscribeResources((list) => {
      setResources(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    return resources.filter((item) => {
      const matchFormat = activeTab === "All" || item.format === activeTab;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.subject.toLowerCase().includes(q) ||
        (item.description && item.description.toLowerCase().includes(q)) ||
        (item.targetClass && item.targetClass.toLowerCase().includes(q));
      return matchFormat && matchSearch;
    });
  }, [resources, activeTab, searchQuery]);

  const handleOpenUploadModal = () => {
    setNewTitle("");
    setNewSubject("Data Structures & Algorithms");
    setNewFormat("PDF");
    setNewTargetClass("B.Tech CSE - 4th Sem");
    setNewDescription("");
    setNewFileUrl("");
    setNewFileName("");
    setNewFileSize("");
    setNewVideoUrl("");
    setUploadStatus("");
    setModalOpen(true);
  };

  const handlePickFile = async () => {
    try {
      if (newFormat === "Photo") {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert("Permission Required", "Please allow photo library access.");
          return;
        }
        const res = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          quality: 0.85,
        });
        if (!res.canceled && res.assets && res.assets.length > 0) {
          const asset = res.assets[0];
          setUploading(true);
          setUploadStatus("Uploading image...");
          const url = await uploadResourceFile(asset.uri, "Photo", asset.fileName || "photo.jpg");
          setNewFileUrl(url);
          setNewFileName(asset.fileName || "diagram.jpg");
          setNewFileSize(asset.fileSize ? `${(asset.fileSize / (1024 * 1024)).toFixed(1)} MB` : "1.5 MB");
          setUploadStatus("Photo uploaded successfully!");
        }
      } else if (newFormat === "PDF" || newFormat === "Document" || newFormat === "Other") {
        setUploading(true);
        setUploadStatus("Selecting file...");
        const docRes = await pickPdfDocument();
        if (docRes) {
          setUploadStatus(`Uploading ${docRes.name}...`);
          const url = await uploadResourceFile(docRes.uri, newFormat, docRes.name);
          setNewFileUrl(url);
          setNewFileName(docRes.name);
          setNewFileSize(docRes.size ? `${(docRes.size / (1024 * 1024)).toFixed(1)} MB` : "2.0 MB");
          setUploadStatus(`File attached: ${docRes.name}`);
        }
      }
    } catch (e: any) {
      console.warn("File pick error:", e);
      Alert.alert("Notice", "File picked.");
    } finally {
      setUploading(false);
    }
  };

  const handleSaveResource = async () => {
    if (!newTitle.trim()) {
      Alert.alert("Missing Title", "Please provide a resource title.");
      return;
    }

    if (newFormat === "Video" && !newVideoUrl.trim() && !newFileUrl.trim()) {
      Alert.alert("Missing Video URL", "Please enter a video URL (e.g. YouTube, Google Drive or stream link).");
      return;
    }

    if (newFormat !== "Video" && !newFileUrl.trim()) {
      Alert.alert("Missing Attachment", `Please attach a ${newFormat} file before saving.`);
      return;
    }

    setUploading(true);
    try {
      const user = auth.currentUser;
      const finalUrl = newFormat === "Video" ? (newVideoUrl.trim() || newFileUrl) : newFileUrl;
      const finalName = newFileName.trim() || (newFormat === "Video" ? "Video Lecture" : "Resource Material");

      await addStudyResource({
        title: newTitle.trim(),
        subject: newSubject,
        format: newFormat,
        fileUrl: finalUrl,
        fileName: finalName,
        fileSize: newFileSize || (newFormat === "Video" ? "Stream" : "1.5 MB"),
        videoUrl: newFormat === "Video" ? (newVideoUrl.trim() || finalUrl) : undefined,
        description: newDescription.trim(),
        targetClass: newTargetClass.trim() || "All Students",
        teacherName: user?.displayName || "Faculty Member",
        teacherId: user?.uid || "TEACH-101",
      });

      Alert.alert("Published", "Resource published live for students!");
      setModalOpen(false);
    } catch (e: any) {
      console.warn("Save resource error:", e);
      Alert.alert("Error", "Could not save resource. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = (id: string, title: string) => {
    Alert.alert(
      "Delete Resource",
      `Are you sure you want to delete "${title}"? Students will no longer see this file.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteStudyResource(id);
              Alert.alert("Deleted", "Resource deleted successfully.");
            } catch (err: any) {
              console.warn("Delete error:", err);
            }
          },
        },
      ]
    );
  };

  const handleOpenResource = (item: ResourceItem) => {
    if (item.format === "Photo") {
      setPreviewPhotoUrl(item.fileUrl);
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
      shareOrDownloadPdf(item.fileUrl, item.fileName || "Resource.pdf");
    }
  };

  const getFormatBadgeColor = (format: ResourceFormat) => {
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
      {/* Top Bar */}
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
          <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.pageTitle, { color: colors.text }]}>Study Resources</Text>
            <Text style={[styles.pageSub, { color: colors.textSecondary }]}>
              Multi-Format Material: PDFs, Photos, Videos & Documents
            </Text>
          </View>
        </View>

        <View style={styles.topBarRight}>
          <TouchableOpacity style={styles.uploadBtn} onPress={handleOpenUploadModal} activeOpacity={0.85}>
            <Ionicons name="cloud-upload" size={14} color="#FFFFFF" />
            <Text style={styles.uploadBtnText}>{isDesktop ? "+ Upload Resource" : "Upload"}</Text>
          </TouchableOpacity>

          <UniversalRoleControls compact />
          <NotificationBellModal />
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
            placeholder="Search resources, topics, subjects..."
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

      {/* Content Scroll */}
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
            <Ionicons name="folder-open-outline" size={44} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Resources Found</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Upload PDF handouts, whiteboard diagram photos, video lectures, or notes for your students.
            </Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={handleOpenUploadModal}>
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.emptyAddBtnText}>+ Add Resource</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.resourceGrid}>
            {filtered.map((item) => {
              const badge = getFormatBadgeColor(item.format);
              return (
                <View
                  key={item.id}
                  style={[
                    styles.itemCard,
                    {
                      backgroundColor: colors.card,
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.itemTopRow}>
                    <View style={[styles.formatBadge, { backgroundColor: badge.bg }]}>
                      <Ionicons name={badge.icon} size={13} color={badge.text} />
                      <Text style={[styles.formatBadgeText, { color: badge.text }]}>
                        {item.format === "Photo" ? "Photo/Diagram" : item.format}
                      </Text>
                    </View>

                    <View style={styles.cardActions}>
                      <TouchableOpacity onPress={() => handleDelete(item.id, item.title)} style={styles.iconBtn}>
                        <Ionicons name="trash-outline" size={15} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={[styles.itemTitle, { color: colors.text }]}>{item.title}</Text>

                  <View style={styles.metaRow}>
                    <Ionicons name="book-outline" size={12} color="#059669" />
                    <Text style={styles.subjectText}>{item.subject}</Text>
                    {item.targetClass ? (
                      <>
                        <Text style={styles.dot}>•</Text>
                        <Text style={[styles.metaSub, { color: colors.textSecondary }]}>{item.targetClass}</Text>
                      </>
                    ) : null}
                  </View>

                  {item.description ? (
                    <Text style={[styles.itemDesc, { color: colors.textSecondary }]} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}

                  {/* Photo preview thumbnail */}
                  {item.format === "Photo" && item.fileUrl ? (
                    <TouchableOpacity
                      style={styles.photoThumbWrap}
                      onPress={() => setPreviewPhotoUrl(item.fileUrl)}
                      activeOpacity={0.85}
                    >
                      <Image source={{ uri: item.fileUrl }} style={styles.photoThumb} resizeMode="cover" />
                      <View style={styles.photoOverlay}>
                        <Ionicons name="eye-outline" size={12} color="#FFFFFF" />
                        <Text style={styles.photoOverlayText}>Click to Preview Photo</Text>
                      </View>
                    </TouchableOpacity>
                  ) : null}

                  {/* Footer details & Action */}
                  <View style={[styles.itemFooter, { borderTopColor: colors.border }]}>
                    <View>
                      <Text style={[styles.fileInfo, { color: colors.textSecondary }]}>
                        {item.fileName} • {item.fileSize || "1.2 MB"}
                      </Text>
                      <Text style={[styles.downloadsCount, { color: colors.textSecondary }]}>
                        📥 {item.downloads || 0} downloads
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.openActionBtn, { backgroundColor: colors.primaryLight }]}
                      onPress={() => handleOpenResource(item)}
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
                        color={colors.primary}
                      />
                      <Text style={[styles.openActionText, { color: colors.primary }]}>
                        {item.format === "Photo"
                          ? "View Photo"
                          : item.format === "Video"
                          ? "Watch Video"
                          : "Download File"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* UPLOAD MODAL */}
      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="cloud-upload" size={18} color={colors.primary} />
                <Text style={[styles.modalTitle, { color: colors.text }]}>Add Study Resource</Text>
              </View>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <Ionicons name="close" size={20} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 500 }} showsVerticalScrollIndicator={false}>
              {/* Title */}
              <Text style={[styles.label, { color: colors.text }]}>Resource Title *</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: isDark ? "#0F172A" : "#F8FAFC", color: colors.text, borderColor: colors.border },
                ]}
                placeholder="e.g. Unit 3: Graph Algorithms & Minimum Spanning Tree"
                placeholderTextColor={colors.textSecondary}
                value={newTitle}
                onChangeText={setNewTitle}
              />

              {/* Format selection */}
              <Text style={[styles.label, { color: colors.text }]}>Format *</Text>
              <View style={styles.formatSelectRow}>
                {(["PDF", "Photo", "Video", "Document", "Other"] as const).map((fmt) => (
                  <TouchableOpacity
                    key={fmt}
                    style={[
                      styles.formatPickBtn,
                      newFormat === fmt && styles.formatPickBtnActive,
                      { borderColor: colors.border },
                    ]}
                    onPress={() => {
                      setNewFormat(fmt);
                      setNewFileUrl("");
                      setNewFileName("");
                      setUploadStatus("");
                    }}
                  >
                    <Ionicons
                      name={
                        fmt === "PDF"
                          ? "document-text"
                          : fmt === "Photo"
                          ? "image"
                          : fmt === "Video"
                          ? "videocam"
                          : fmt === "Document"
                          ? "folder-open"
                          : "attach"
                      }
                      size={14}
                      color={newFormat === fmt ? "#FFFFFF" : colors.textSecondary}
                    />
                    <Text
                      style={[
                        styles.formatPickText,
                        newFormat === fmt && styles.formatPickTextActive,
                      ]}
                    >
                      {fmt === "Photo" ? "Photo/Image" : fmt}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Subject */}
              <Text style={[styles.label, { color: colors.text }]}>Subject</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
                {STANDARD_SUBJECTS.map((sub) => (
                  <TouchableOpacity
                    key={sub}
                    style={[
                      styles.subChip,
                      newSubject === sub && styles.subChipActive,
                      { borderColor: colors.border },
                    ]}
                    onPress={() => setNewSubject(sub)}
                  >
                    <Text style={[styles.subChipText, newSubject === sub && styles.subChipTextActive]}>
                      {sub}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Target Class */}
              <Text style={[styles.label, { color: colors.text }]}>Target Class / Semester</Text>
              <TextInput
                style={[
                  styles.input,
                  { backgroundColor: isDark ? "#0F172A" : "#F8FAFC", color: colors.text, borderColor: colors.border },
                ]}
                placeholder="e.g. B.Tech CSE - 4th Sem (Sec A & B)"
                placeholderTextColor={colors.textSecondary}
                value={newTargetClass}
                onChangeText={setNewTargetClass}
              />

              {/* Description */}
              <Text style={[styles.label, { color: colors.text }]}>Description / Summary</Text>
              <TextInput
                style={[
                  styles.textarea,
                  { backgroundColor: isDark ? "#0F172A" : "#F8FAFC", color: colors.text, borderColor: colors.border },
                ]}
                placeholder="Add brief details about this resource, unit coverage or practical guidelines..."
                placeholderTextColor={colors.textSecondary}
                value={newDescription}
                onChangeText={setNewDescription}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              {/* File / Video Input Section */}
              {newFormat === "Video" ? (
                <>
                  <Text style={[styles.label, { color: colors.text }]}>Video URL (YouTube or Stream Link) *</Text>
                  <TextInput
                    style={[
                      styles.input,
                      {
                        backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                        color: colors.text,
                        borderColor: colors.border,
                      },
                    ]}
                    placeholder="https://www.youtube.com/watch?v=... or direct video link"
                    placeholderTextColor={colors.textSecondary}
                    value={newVideoUrl}
                    onChangeText={setNewVideoUrl}
                  />
                </>
              ) : (
                <>
                  <Text style={[styles.label, { color: colors.text }]}>
                    Attach {newFormat === "Photo" ? "Photo/Diagram" : newFormat} File *
                  </Text>
                  <TouchableOpacity
                    style={[styles.filePickBtn, { borderColor: colors.border }]}
                    onPress={handlePickFile}
                    disabled={uploading}
                  >
                    <Ionicons
                      name={newFormat === "Photo" ? "image-outline" : "document-attach-outline"}
                      size={18}
                      color={colors.primary}
                    />
                    <Text style={styles.filePickBtnText}>
                      {newFileUrl
                        ? `Change ${newFormat} File`
                        : `Select & Upload ${newFormat === "Photo" ? "Photo from Gallery" : newFormat + " File"}`}
                    </Text>
                  </TouchableOpacity>

                  {uploadStatus ? (
                    <Text style={styles.uploadStatusNotice}>{uploadStatus}</Text>
                  ) : null}

                  {newFileUrl && newFormat === "Photo" ? (
                    <View style={styles.imgPreviewContainer}>
                      <Image source={{ uri: newFileUrl }} style={styles.imgPreview} />
                      <Text style={[styles.imgPreviewName, { color: colors.textSecondary }]}>
                        {newFileName} ({newFileSize})
                      </Text>
                    </View>
                  ) : newFileUrl ? (
                    <View style={styles.docAttachedBox}>
                      <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                      <Text style={styles.docAttachedName} numberOfLines={1}>
                        {newFileName} ({newFileSize})
                      </Text>
                    </View>
                  ) : null}
                </>
              )}
            </ScrollView>

            {/* Footer */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setModalOpen(false)}
                disabled={uploading}
              >
                <Text style={[styles.modalCancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveBtn, uploading && { opacity: 0.7 }]}
                onPress={handleSaveResource}
                disabled={uploading}
              >
                {uploading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={15} color="#FFFFFF" />
                    <Text style={styles.modalSaveText}>Publish Resource</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* PHOTO PREVIEW MODAL */}
      <Modal visible={!!previewPhotoUrl} transparent animationType="fade" onRequestClose={() => setPreviewPhotoUrl(null)}>
        <View style={styles.fullPhotoOverlay}>
          <TouchableOpacity style={styles.fullPhotoClose} onPress={() => setPreviewPhotoUrl(null)}>
            <Ionicons name="close-circle" size={32} color="#FFFFFF" />
          </TouchableOpacity>
          {previewPhotoUrl ? (
            <Image source={{ uri: previewPhotoUrl }} style={styles.fullPhotoImg} resizeMode="contain" />
          ) : null}
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
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  topBarLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  backBtn: { padding: 4 },
  pageTitle: { fontSize: 16, fontWeight: "800" },
  pageSub: { fontSize: 11, marginTop: 1 },
  topBarRight: { flexDirection: "row", alignItems: "center", gap: 10 },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2563EB",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  uploadBtnText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },

  filterBar: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    gap: 10,
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
  emptySub: { fontSize: 12, textAlign: "center", marginTop: 6, maxWidth: 360 },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    marginTop: 16,
  },
  emptyAddBtnText: { color: "#FFFFFF", fontWeight: "700", fontSize: 12 },

  resourceGrid: { gap: 12 },
  itemCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 8,
  },
  itemTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  formatBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  formatBadgeText: { fontSize: 11, fontWeight: "700" },
  cardActions: { flexDirection: "row", alignItems: "center", gap: 6 },
  iconBtn: { padding: 4 },
  itemTitle: { fontSize: 14, fontWeight: "800" },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  subjectText: { fontSize: 11, color: "#059669", fontWeight: "700" },
  dot: { color: "#94A3B8" },
  metaSub: { fontSize: 11 },
  itemDesc: { fontSize: 11.5, lineHeight: 16 },

  photoThumbWrap: {
    height: 140,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
    marginVertical: 4,
  },
  photoThumb: { width: "100%", height: "100%" },
  photoOverlay: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  photoOverlayText: { color: "#FFFFFF", fontSize: 10, fontWeight: "600" },

  itemFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 4,
  },
  fileInfo: { fontSize: 10.5 },
  downloadsCount: { fontSize: 10, marginTop: 2 },
  openActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  openActionText: { fontSize: 11, fontWeight: "700" },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 520,
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  modalTitle: { fontSize: 15, fontWeight: "800" },
  label: { fontSize: 11, fontWeight: "700", marginBottom: 4, marginTop: 8 },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
  },
  textarea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    minHeight: 60,
  },
  formatSelectRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginVertical: 4,
  },
  formatPickBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  formatPickBtnActive: { backgroundColor: "#2563EB", borderColor: "#2563EB" },
  formatPickText: { fontSize: 11, fontWeight: "600", color: "#64748B" },
  formatPickTextActive: { color: "#FFFFFF", fontWeight: "700" },
  subChip: {
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: 6,
  },
  subChipActive: { backgroundColor: "#059669", borderColor: "#059669" },
  subChipText: { fontSize: 10.5, fontWeight: "600", color: "#64748B" },
  subChipTextActive: { color: "#FFFFFF", fontWeight: "700" },

  filePickBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1,
    borderStyle: "dashed",
    borderRadius: 8,
    paddingVertical: 12,
    backgroundColor: "#F8FAFC",
  },
  filePickBtnText: { fontSize: 12, fontWeight: "700", color: "#2563EB" },
  uploadStatusNotice: { fontSize: 11, color: "#2563EB", marginTop: 4, fontWeight: "600" },
  imgPreviewContainer: { marginTop: 8, alignItems: "center" },
  imgPreview: { width: 120, height: 80, borderRadius: 6 },
  imgPreviewName: { fontSize: 10.5, marginTop: 4 },
  docAttachedBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#ECFDF5",
    padding: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  docAttachedName: { fontSize: 11, color: "#065F46", fontWeight: "600" },

  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 14,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  modalCancelBtn: {
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  modalCancelText: { fontSize: 12, fontWeight: "600" },
  modalSaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  modalSaveText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },

  fullPhotoOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
    padding: 10,
  },
  fullPhotoClose: { position: "absolute", top: 40, right: 20, zIndex: 10 },
  fullPhotoImg: { width: "100%", height: "80%" },
});
