import React, { useState } from "react";
import {
  Alert,
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
import { router } from "expo-router";
import NotificationBellModal from "../../components/NotificationBellModal";
import notificationService from "../../services/notificationService";

interface MaterialItem {
  id: string;
  title: string;
  subject: string;
  className: string;
  type: "PDF" | "PPT" | "DOC" | "CODE";
  size: string;
  uploadedAt: string;
  downloads: number;
}

const INITIAL_MATERIALS: MaterialItem[] = [
  {
    id: "mat-1",
    title: "Unit 3: Binary Trees, AVL & Red-Black Trees",
    subject: "Data Structures",
    className: "B.Tech CSE - B",
    type: "PDF",
    size: "4.2 MB",
    uploadedAt: "06 Oct 2026",
    downloads: 48,
  },
  {
    id: "mat-2",
    title: "Python OOP: Classes, Inheritance & Polymorphism",
    subject: "Python Programming",
    className: "B.Tech CSE - A",
    type: "PPT",
    size: "8.6 MB",
    uploadedAt: "04 Oct 2026",
    downloads: 51,
  },
  {
    id: "mat-3",
    title: "SQL Joins, Subqueries & Normalization Cheat Sheet",
    subject: "DBMS",
    className: "B.Tech CSE - B",
    type: "PDF",
    size: "1.8 MB",
    uploadedAt: "02 Oct 2026",
    downloads: 42,
  },
  {
    id: "mat-4",
    title: "HTML5, CSS Grid & Responsive Design Handbook",
    subject: "Web Technologies",
    className: "B.Tech CSE - A",
    type: "DOC",
    size: "3.1 MB",
    uploadedAt: "28 Sep 2026",
    downloads: 39,
  },
  {
    id: "mat-5",
    title: "End-Sem Previous Years Solved Papers (2023-2025)",
    subject: "Python Programming",
    className: "B.Tech CSE - A",
    type: "PDF",
    size: "12.4 MB",
    uploadedAt: "24 Sep 2026",
    downloads: 65,
  },
  {
    id: "mat-6",
    title: "Socket Programming & Networking Scripts in Python",
    subject: "Python Programming",
    className: "B.Tech CSE - A",
    type: "CODE",
    size: "750 KB",
    uploadedAt: "20 Sep 2026",
    downloads: 34,
  },
];

export default function TeacherStudyMaterialsScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 800;

  const [materials, setMaterials] = useState<MaterialItem[]>(INITIAL_MATERIALS);
  const [selectedTypeFilter, setSelectedTypeFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Form states
  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState("Python Programming");
  const [newClassName, setNewClassName] = useState("B.Tech CSE - A");
  const [newType, setNewType] = useState<"PDF" | "PPT" | "DOC" | "CODE">("PDF");
  const [newDesc, setNewDesc] = useState("");
  const [fileName, setFileName] = useState("unit-4-lecture-notes.pdf");
  const [notifyStudents, setNotifyStudents] = useState(true);

  const handleUploadSubmit = async () => {
    if (!newTitle.trim()) {
      Alert.alert("Missing Title", "Please enter material title.");
      return;
    }

    const newMaterial: MaterialItem = {
      id: "mat-" + Date.now(),
      title: newTitle.trim(),
      subject: newSubject,
      className: newClassName,
      type: newType,
      size: "3.5 MB",
      uploadedAt: "Today, Oct 07",
      downloads: 0,
    };

    setMaterials([newMaterial, ...materials]);

    if (notifyStudents) {
      await notificationService.sendNotification({
        title: `New Study Material: ${newTitle.trim()}`,
        body: `Prof. Priya Sharma uploaded '${newTitle.trim()}' for ${newClassName} (${newSubject}).`,
        role: "teacher",
        targetRoles: ["student"],
        category: "study_material",
        metadata: {
          materialId: newMaterial.id,
          fileName,
          type: newType,
        },
      });
      setSuccessToast(`Notification Sent Successfully! '${newTitle}' shared with ${newClassName}.`);
    } else {
      setSuccessToast(`Study material '${newTitle}' uploaded successfully!`);
    }

    setUploadModalVisible(false);
    setNewTitle("");
    setNewDesc("");
    setTimeout(() => setSuccessToast(null), 5000);
  };

  const filteredMaterials = materials.filter((m) => {
    const matchesType =
      selectedTypeFilter === "ALL" || m.type === selectedTypeFilter;
    const matchesQuery =
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.className.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesQuery;
  });

  const getTypeColor = (type: string) => {
    switch (type) {
      case "PDF":
        return { bg: "#FEF2F2", text: "#DC2626", border: "#FCA5A5" };
      case "PPT":
        return { bg: "#FFFBEB", text: "#D97706", border: "#FDE68A" };
      case "DOC":
        return { bg: "#EFF6FF", text: "#2563EB", border: "#BFDBFE" };
      case "CODE":
        return { bg: "#F3E8FF", text: "#9333EA", border: "#D8B4FE" };
      default:
        return { bg: "#F1F5F9", text: "#475569", border: "#CBD5E1" };
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.push("/teacher")}
          >
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>
          <View>
            <Text style={styles.pageTitle}>Study Materials</Text>
            <Text style={styles.pageSubtitle}>Lecture notes, presentations and question banks</Text>
          </View>
        </View>

        <View style={styles.topBarRight}>
          <TouchableOpacity
            style={styles.uploadBtn}
            onPress={() => setUploadModalVisible(true)}
          >
            <Ionicons name="cloud-upload" size={18} color="#FFFFFF" />
            <Text style={styles.uploadBtnText}>+ Upload Material</Text>
          </TouchableOpacity>
          <NotificationBellModal />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {successToast && (
          <View style={styles.successToast}>
            <Ionicons name="checkmark-circle" size={22} color="#059669" />
            <Text style={styles.successToastText}>{successToast}</Text>
          </View>
        )}

        {/* Filter Chips & Search Bar */}
        <View style={styles.filterRow}>
          <View style={styles.searchWrap}>
            <Ionicons name="search-outline" size={18} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search materials by title or subject..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <View style={styles.chipsRow}>
            {["ALL", "PDF", "PPT", "DOC", "CODE"].map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.chip,
                  selectedTypeFilter === type && styles.chipActive,
                ]}
                onPress={() => setSelectedTypeFilter(type)}
              >
                <Text
                  style={[
                    styles.chipText,
                    selectedTypeFilter === type && styles.chipTextActive,
                  ]}
                >
                  {type === "ALL" ? "All Files" : type}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Material Cards Grid */}
        <View style={styles.cardsGrid}>
          {filteredMaterials.map((item) => {
            const badge = getTypeColor(item.type);
            return (
              <View key={item.id} style={styles.materialCard}>
                <View style={styles.cardHeader}>
                  <View
                    style={[
                      styles.typeBadge,
                      { backgroundColor: badge.bg, borderColor: badge.border },
                    ]}
                  >
                    <Text style={[styles.typeBadgeText, { color: badge.text }]}>
                      {item.type}
                    </Text>
                  </View>

                  <View style={styles.classTag}>
                    <Text style={styles.classTagText}>{item.className}</Text>
                  </View>
                </View>

                <Text style={styles.materialTitle} numberOfLines={2}>
                  {item.title}
                </Text>
                <Text style={styles.subjectText}>{item.subject}</Text>

                <View style={styles.metaRow}>
                  <View style={styles.metaItem}>
                    <Ionicons name="calendar-outline" size={14} color="#64748B" />
                    <Text style={styles.metaVal}>{item.uploadedAt}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="document-outline" size={14} color="#64748B" />
                    <Text style={styles.metaVal}>{item.size}</Text>
                  </View>
                  <View style={styles.metaItem}>
                    <Ionicons name="download-outline" size={14} color="#64748B" />
                    <Text style={styles.metaVal}>{item.downloads} downloads</Text>
                  </View>
                </View>

                <View style={styles.cardActions}>
                  <TouchableOpacity
                    style={styles.downloadCardBtn}
                    onPress={() => Alert.alert("Download", `Downloading ${item.title}...`)}
                  >
                    <Ionicons name="download-outline" size={16} color="#2563EB" />
                    <Text style={styles.downloadCardBtnText}>Download</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.shareCardBtn}
                    onPress={() => Alert.alert("Link Copied", "Resource link copied to clipboard.")}
                  >
                    <Ionicons name="share-social-outline" size={16} color="#475569" />
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Upload Modal */}
      <Modal
        visible={uploadModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setUploadModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Upload Study Material</Text>
                <Text style={styles.modalSubtitle}>Share resources with enrolled students</Text>
              </View>
              <TouchableOpacity onPress={() => setUploadModalVisible(false)}>
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Material Title *</Text>
                <TextInput
                  style={styles.formInput}
                  placeholder="e.g. Unit 4: Graph Algorithms & Dynamic Programming"
                  placeholderTextColor="#94A3B8"
                  value={newTitle}
                  onChangeText={setNewTitle}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Target Class</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newClassName}
                    onChangeText={setNewClassName}
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Subject</Text>
                  <TextInput
                    style={styles.formInput}
                    value={newSubject}
                    onChangeText={setNewSubject}
                  />
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>File Format</Text>
                <View style={styles.typeSelectorRow}>
                  {(["PDF", "PPT", "DOC", "CODE"] as const).map((t) => (
                    <TouchableOpacity
                      key={t}
                      style={[
                        styles.typeSelectBtn,
                        newType === t && styles.typeSelectBtnActive,
                      ]}
                      onPress={() => setNewType(t)}
                    >
                      <Text
                        style={[
                          styles.typeSelectBtnText,
                          newType === t && styles.typeSelectBtnTextActive,
                        ]}
                      >
                        {t}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Upload Dropzone */}
              <View style={styles.dropZone}>
                <Ionicons name="cloud-upload-outline" size={32} color="#2563EB" />
                <Text style={styles.dropZoneTitle}>Attached: {fileName}</Text>
                <Text style={styles.dropZoneSub}>Ready for distribution</Text>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description (Optional)</Text>
                <TextInput
                  style={[styles.formInput, { height: 70, textAlignVertical: "top" }]}
                  placeholder="Additional notes, recommended reading..."
                  placeholderTextColor="#94A3B8"
                  value={newDesc}
                  onChangeText={setNewDesc}
                  multiline
                />
              </View>

              {/* Notify Checkbox */}
              <TouchableOpacity
                style={styles.notifyCheckRow}
                onPress={() => setNotifyStudents(!notifyStudents)}
              >
                <Ionicons
                  name={notifyStudents ? "checkbox" : "square-outline"}
                  size={20}
                  color={notifyStudents ? "#2563EB" : "#64748B"}
                />
                <Text style={styles.notifyCheckText}>
                  Send instant notification to students in this class
                </Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.cancelModalBtn}
                onPress={() => setUploadModalVisible(false)}
              >
                <Text style={styles.cancelModalBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.submitModalBtn}
                onPress={handleUploadSubmit}
              >
                <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                <Text style={styles.submitModalBtnText}>Upload & Broadcast</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topBar: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0F172A",
  },
  pageSubtitle: {
    fontSize: 12,
    color: "#64748B",
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  uploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#0A1E3F",
  },
  uploadBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  scrollContent: {
    padding: 20,
    maxWidth: 1100,
    width: "100%",
    alignSelf: "center",
    gap: 16,
  },
  successToast: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    padding: 12,
    borderRadius: 8,
    gap: 10,
  },
  successToastText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#065F46",
    flex: 1,
  },
  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  searchWrap: {
    flex: 1,
    minWidth: 260,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
  },
  chipsRow: {
    flexDirection: "row",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  chipActive: {
    backgroundColor: "#0A1E3F",
    borderColor: "#0A1E3F",
  },
  chipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  chipTextActive: {
    color: "#FFFFFF",
  },
  cardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  materialCard: {
    flex: 1,
    minWidth: 300,
    maxWidth: 520,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  classTag: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  classTagText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
  },
  materialTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 4,
  },
  subjectText: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "600",
    marginBottom: 12,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
    marginBottom: 12,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaVal: {
    fontSize: 11,
    color: "#64748B",
  },
  cardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  downloadCardBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingVertical: 8,
    borderRadius: 8,
  },
  downloadCardBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563EB",
  },
  shareCardBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
    justifyContent: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    width: "100%",
    maxWidth: 520,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    paddingBottom: 12,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalSubtitle: {
    fontSize: 12,
    color: "#64748B",
  },
  formGroup: {
    marginBottom: 14,
  },
  formRow: {
    flexDirection: "row",
    gap: 12,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#334155",
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: "#0F172A",
  },
  typeSelectorRow: {
    flexDirection: "row",
    gap: 8,
  },
  typeSelectBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    alignItems: "center",
  },
  typeSelectBtnActive: {
    backgroundColor: "#0A1E3F",
    borderColor: "#0A1E3F",
  },
  typeSelectBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  typeSelectBtnTextActive: {
    color: "#FFFFFF",
  },
  dropZone: {
    borderWidth: 2,
    borderColor: "#BFDBFE",
    borderStyle: "dashed",
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  dropZoneTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1E40AF",
    marginTop: 6,
  },
  dropZoneSub: {
    fontSize: 11,
    color: "#64748B",
  },
  notifyCheckRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginVertical: 10,
  },
  notifyCheckText: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "500",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 12,
  },
  cancelModalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  cancelModalBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  submitModalBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#0A1E3F",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
  },
  submitModalBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF",
  },
});