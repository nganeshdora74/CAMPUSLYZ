import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
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
import { useAppTheme } from "../../context/ThemeContext";
import { auth } from "../../firebase/config";
import {
  AssignmentItem,
  subscribeAssignments,
  createAssignment,
  updateAssignment,
  deleteAssignment,
} from "../../services/assignmentService";
import {
  pickPdfDocument,
  shareOrDownloadPdf,
  uploadCertificateFile,
} from "../../services/certificatePdfService";

const STANDARD_SUBJECTS = [
  "Data Structures & Algorithms",
  "Database Management Systems",
  "Operating Systems",
  "Computer Networks",
  "Web Technologies",
  "Software Engineering",
  "Artificial Intelligence",
  "Python Programming",
];

const STATUS_OPTIONS: AssignmentItem["status"][] = [
  "Published",
  "Active",
  "Under Review",
  "Evaluated",
  "Closed",
  "Pending",
];

export default function TeacherAssignmentsScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const { colors, isDark } = useAppTheme();

  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<
    "All" | "Published" | "Pending" | "Under Review" | "Evaluated"
  >("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Create Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newSubject, setNewSubject] = useState("Data Structures & Algorithms");
  const [newDept, setNewDept] = useState("CSE");
  const [newSection, setNewSection] = useState("A");
  const [newDueDate, setNewDueDate] = useState("25 Oct 2026");
  const [newDueTime, setNewDueTime] = useState("11:59 PM");
  const [newTotalMarks, setNewTotalMarks] = useState("20");
  const [newDescription, setNewDescription] = useState("");
  const [newInstructions, setNewInstructions] = useState("");
  const [newStatus, setNewStatus] = useState<AssignmentItem["status"]>("Published");

  // PDF Attachment State for Create
  const [attachedPdfUri, setAttachedPdfUri] = useState<string | null>(null);
  const [attachedPdfName, setAttachedPdfName] = useState<string | null>(null);
  const [attachedPdfSize, setAttachedPdfSize] = useState<string | null>(null);
  const [uploadingPdf, setUploadingPdf] = useState(false);

  // View / Edit Details Modal State
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedAsg, setSelectedAsg] = useState<AssignmentItem | null>(null);
  const [editingStatus, setEditingStatus] = useState<AssignmentItem["status"]>("Published");
  const [editingInstructions, setEditingInstructions] = useState("");
  const [updatingDetails, setUpdatingDetails] = useState(false);

  // Subscribe to Firestore assignments
  useEffect(() => {
    const unsub = subscribeAssignments((list) => {
      setAssignments(list);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Pick PDF handler
  const handlePickPdf = async () => {
    try {
      setUploadingPdf(true);
      const file = await pickPdfDocument();
      if (file && file.uri) {
        setAttachedPdfUri(file.uri);
        setAttachedPdfName(file.name || "assignment_problem_statement.pdf");
        setAttachedPdfSize("1.5 MB");
      }
    } catch (e: any) {
      Alert.alert("PDF Error", e?.message || "Failed to select PDF file.");
    } finally {
      setUploadingPdf(false);
    }
  };

  // Create Assignment Submit
  const handleCreateSubmit = async () => {
    if (!newTitle.trim() || !newDueDate.trim()) {
      Alert.alert("Required Fields", "Please provide assignment title and due date.");
      return;
    }

    setCreating(true);
    try {
      let finalPdfUrl = attachedPdfUri || undefined;

      // If user selected a local PDF, upload it to storage
      if (attachedPdfUri && !attachedPdfUri.startsWith("http")) {
        try {
          finalPdfUrl = await uploadCertificateFile(
            attachedPdfUri,
            "pdf",
            `asg_${Date.now()}`
          );
        } catch (uploadErr) {
          console.warn("PDF upload fallback:", uploadErr);
        }
      }

      const teacherUser = auth.currentUser;
      await createAssignment({
        title: newTitle.trim(),
        subject: newSubject,
        department: newDept.trim(),
        section: newSection.trim(),
        classTag: `${newDept.trim()} - ${newSection.trim()}`,
        description: newDescription.trim(),
        instructions: newInstructions.trim(),
        dueDate: newDueDate.trim(),
        dueTime: newDueTime.trim(),
        pdfUrl: finalPdfUrl,
        pdfName: attachedPdfName || undefined,
        pdfSize: attachedPdfSize || undefined,
        totalMarks: parseInt(newTotalMarks, 10) || 20,
        status: newStatus,
        teacherName: teacherUser?.displayName || "Prof. Priya Sharma",
        teacherUid: teacherUser?.uid || undefined,
        completedStudents: [],
      });

      Alert.alert(
        "Assignment Published! 🚀",
        `"${newTitle.trim()}" has been added and is now visible to students.`
      );
      setCreateModalOpen(false);
      resetForm();
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to create assignment.");
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setNewTitle("");
    setNewDescription("");
    setNewInstructions("");
    setAttachedPdfUri(null);
    setAttachedPdfName(null);
    setAttachedPdfSize(null);
  };

  // Open Details Modal
  const handleOpenDetails = (asg: AssignmentItem) => {
    setSelectedAsg(asg);
    setEditingStatus(asg.status);
    setEditingInstructions(asg.instructions || "");
    setDetailsModalOpen(true);
  };

  // Update Status and Instructions
  const handleUpdateStatus = async () => {
    if (!selectedAsg) return;
    setUpdatingDetails(true);
    try {
      await updateAssignment(selectedAsg.id, {
        status: editingStatus,
        instructions: editingInstructions.trim(),
      });
      Alert.alert(
        "Status Updated",
        `Assignment status changed to "${editingStatus}". Updates are live for all students.`
      );
      setDetailsModalOpen(false);
      setSelectedAsg(null);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to update status.");
    } finally {
      setUpdatingDetails(false);
    }
  };

  // Delete Assignment
  const handleDelete = (id: string, title: string) => {
    Alert.alert(
      "Delete Assignment",
      `Are you sure you want to delete "${title}"? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAssignment(id);
              if (selectedAsg?.id === id) {
                setDetailsModalOpen(false);
                setSelectedAsg(null);
              }
              Alert.alert("Deleted", "Assignment deleted successfully.");
            } catch (e: any) {
              Alert.alert("Error", e?.message || "Could not delete assignment.");
            }
          },
        },
      ]
    );
  };

  // Download / View PDF helper
  const handleViewPdf = async (url?: string, name?: string) => {
    if (!url) {
      Alert.alert("No File", "No PDF attachment is available for this assignment.");
      return;
    }
    await shareOrDownloadPdf(url, name || "Assignment_Question_Paper");
  };

  // Filter assignments
  const filtered = assignments.filter((a) => {
    const matchesTab =
      activeTab === "All" ? true : a.status.toLowerCase() === activeTab.toLowerCase();
    const matchesSearch =
      searchQuery === "" ||
      a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
      a.classTag.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesTab && matchesSearch;
  });

  return (
    <View style={[styles.root, { backgroundColor: isDark ? "#0B132B" : "#F4F7FC" }]}>
      {/* Top Header */}
      <View style={[styles.topBar, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: colors.border }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity onPress={() => router.push("/teacher")} style={{ padding: 4 }}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.pageTitle, { color: colors.text }]}>Assignments Management</Text>
            <Text style={styles.pageSub}>
              Create PDF assignments, track status and monitor completions
            </Text>
          </View>
        </View>

        <TouchableOpacity style={styles.createBtn} onPress={() => setCreateModalOpen(true)}>
          <Ionicons name="add" size={16} color="#FFFFFF" />
          <Text style={styles.createBtnText}>+ Create Assignment</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.contentPadding}
        showsVerticalScrollIndicator={false}
      >
        {/* Search & Tabs Controls */}
        <View style={styles.controlsRow}>
          {/* Search Box */}
          <View style={[styles.searchBox, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: colors.border }]}>
            <Ionicons name="search-outline" size={16} color="#64748B" />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search by title, subject or class..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery ? (
              <TouchableOpacity onPress={() => setSearchQuery("")}>
                <Ionicons name="close-circle" size={16} color="#94A3B8" />
              </TouchableOpacity>
            ) : null}
          </View>

          {/* Status Tabs */}
          <View style={styles.tabRow}>
            {(["All", "Published", "Pending", "Under Review", "Evaluated"] as const).map((t) => {
              const count = assignments.filter(
                (a) => t === "All" || a.status.toLowerCase() === t.toLowerCase()
              ).length;

              return (
                <TouchableOpacity
                  key={t}
                  style={[styles.tabBtn, activeTab === t && styles.tabBtnActive]}
                  onPress={() => setActiveTab(t)}
                >
                  <Text style={[styles.tabBtnText, activeTab === t && styles.tabBtnTextActive]}>
                    {t} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Loading State */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={{ marginTop: 10, color: "#64748B" }}>Loading assignments...</Text>
          </View>
        ) : filtered.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: colors.border }]}>
            <Ionicons name="document-text-outline" size={44} color="#94A3B8" />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No assignments found</Text>
            <Text style={styles.emptySub}>
              {searchQuery
                ? "No assignments matching your search query."
                : "Create your first assignment with an attached PDF problem statement."}
            </Text>
            <TouchableOpacity style={styles.createBtn} onPress={() => setCreateModalOpen(true)}>
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.createBtnText}>+ Create Assignment</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Assignments Grid / List */
          <View style={{ gap: 12 }}>
            {filtered.map((item) => {
              const completedCount = item.completedStudents?.length || 0;
              const hasPdf = Boolean(item.pdfUrl);

              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.asgCard,
                    {
                      backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                      borderColor: colors.border,
                    },
                  ]}
                  onPress={() => handleOpenDetails(item)}
                  activeOpacity={0.88}
                >
                  {/* Card Header */}
                  <View style={styles.asgCardTop}>
                    <View style={{ flex: 1, paddingRight: 8 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <Text style={[styles.asgTitle, { color: colors.text }]}>{item.title}</Text>
                        <View style={styles.classBadge}>
                          <Text style={styles.classBadgeText}>{item.classTag}</Text>
                        </View>
                      </View>
                      <Text style={styles.asgSubject}>{item.subject}</Text>
                    </View>

                    {/* Status Pill */}
                    <View
                      style={[
                        styles.statusPill,
                        item.status === "Published" || item.status === "Active"
                          ? styles.statusPillGreen
                          : item.status === "Under Review"
                          ? styles.statusPillOrange
                          : item.status === "Evaluated"
                          ? styles.statusPillPurple
                          : styles.statusPillGray,
                      ]}
                    >
                      <Text
                        style={[
                          item.status === "Published" || item.status === "Active"
                            ? styles.statusTextGreen
                            : item.status === "Under Review"
                            ? styles.statusTextOrange
                            : item.status === "Evaluated"
                            ? styles.statusTextPurple
                            : styles.statusTextGray,
                        ]}
                      >
                        {item.status}
                      </Text>
                    </View>
                  </View>

                  {/* Description preview */}
                  {item.description ? (
                    <Text style={styles.asgDescPreview} numberOfLines={2}>
                      {item.description}
                    </Text>
                  ) : null}

                  {/* Metadata Row */}
                  <View style={styles.asgMetaRow}>
                    <View style={styles.metaItem}>
                      <Ionicons name="calendar-outline" size={13} color="#64748B" />
                      <Text style={styles.metaItemText}>Due: {item.dueDate}</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="ribbon-outline" size={13} color="#64748B" />
                      <Text style={styles.metaItemText}>{item.totalMarks || 20} Marks</Text>
                    </View>
                    <View style={styles.metaItem}>
                      <Ionicons name="checkmark-done-circle-outline" size={13} color="#059669" />
                      <Text style={[styles.metaItemText, { color: "#059669", fontWeight: "700" }]}>
                        {completedCount} Completed
                      </Text>
                    </View>
                  </View>

                  {/* PDF Attachment Badge & Actions */}
                  <View style={styles.asgCardBottom}>
                    {hasPdf ? (
                      <TouchableOpacity
                        style={styles.pdfBadgeBtn}
                        onPress={() => handleViewPdf(item.pdfUrl, item.pdfName)}
                      >
                        <Ionicons name="document-text" size={15} color="#DC2626" />
                        <Text style={styles.pdfBadgeText} numberOfLines={1}>
                          {item.pdfName || "Attached_Problem_Statement.pdf"}
                        </Text>
                        <Ionicons name="download-outline" size={13} color="#2563EB" />
                      </TouchableOpacity>
                    ) : (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                        <Ionicons name="alert-circle-outline" size={14} color="#94A3B8" />
                        <Text style={{ fontSize: 11, color: "#94A3B8" }}>No PDF attached</Text>
                      </View>
                    )}

                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <TouchableOpacity
                        style={styles.cardDetailsBtn}
                        onPress={() => handleOpenDetails(item)}
                      >
                        <Text style={styles.cardDetailsBtnText}>Manage & Details &gt;</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* ======================================================= */}
      {/* MODAL 1: CREATE ASSIGNMENT (WITH PDF ATTACHMENT) */}
      {/* ======================================================= */}
      <Modal visible={createModalOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  Create New Assignment
                </Text>
                <Text style={styles.modalSub}>
                  Publish assignment details with attached PDF for students
                </Text>
              </View>
              <TouchableOpacity onPress={() => setCreateModalOpen(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 440 }} showsVerticalScrollIndicator={false}>
              {/* Assignment Title */}
              <Text style={styles.fieldLabel}>Assignment Title *</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
                value={newTitle}
                onChangeText={setNewTitle}
                placeholder="e.g. Unit 3: Binary Search Trees Implementation"
                placeholderTextColor="#94A3B8"
              />

              {/* Subject */}
              <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Subject</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
                value={newSubject}
                onChangeText={setNewSubject}
                placeholder="Subject name"
                placeholderTextColor="#94A3B8"
              />
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                {STANDARD_SUBJECTS.map((sub) => (
                  <TouchableOpacity
                    key={sub}
                    style={styles.suggestionChip}
                    onPress={() => setNewSubject(sub)}
                  >
                    <Text style={styles.suggestionChipText}>{sub}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Department & Section */}
              <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Department</Text>
                  <TextInput
                    style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
                    value={newDept}
                    onChangeText={setNewDept}
                    placeholder="CSE"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Section</Text>
                  <TextInput
                    style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
                    value={newSection}
                    onChangeText={setNewSection}
                    placeholder="A"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              {/* Due Date & Marks */}
              <View style={{ flexDirection: "row", gap: 10, marginTop: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Due Date *</Text>
                  <TextInput
                    style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
                    value={newDueDate}
                    onChangeText={setNewDueDate}
                    placeholder="e.g. 25 Oct 2026"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Total Marks</Text>
                  <TextInput
                    style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
                    value={newTotalMarks}
                    onChangeText={setNewTotalMarks}
                    keyboardType="numeric"
                    placeholder="20"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              {/* Description */}
              <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Problem Statement / Description</Text>
              <TextInput
                style={[
                  styles.modalInput,
                  { height: 60, textAlignVertical: "top", color: colors.text, borderColor: colors.border },
                ]}
                value={newDescription}
                onChangeText={setNewDescription}
                multiline
                placeholder="Brief summary of assignment tasks..."
                placeholderTextColor="#94A3B8"
              />

              {/* Instructions */}
              <Text style={[styles.fieldLabel, { marginTop: 10 }]}>Student Guidelines & Submission Instructions</Text>
              <TextInput
                style={[
                  styles.modalInput,
                  { height: 50, textAlignVertical: "top", color: colors.text, borderColor: colors.border },
                ]}
                value={newInstructions}
                onChangeText={setNewInstructions}
                multiline
                placeholder="e.g. Upload PDF with code screenshots and output..."
                placeholderTextColor="#94A3B8"
              />

              {/* PDF ATTACHMENT SECTION */}
              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>PDF Attachment</Text>
              {attachedPdfUri ? (
                <View style={styles.attachedFileBox}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                    <Ionicons name="document-text" size={24} color="#DC2626" />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.attachedFileName, { color: colors.text }]} numberOfLines={1}>
                        {attachedPdfName}
                      </Text>
                      <Text style={styles.attachedFileSize}>{attachedPdfSize || "Ready for upload"}</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.removePdfBtn}
                    onPress={() => {
                      setAttachedPdfUri(null);
                      setAttachedPdfName(null);
                    }}
                  >
                    <Ionicons name="close-circle" size={20} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.uploadPdfBtn}
                  onPress={handlePickPdf}
                  disabled={uploadingPdf}
                >
                  {uploadingPdf ? (
                    <ActivityIndicator size="small" color="#2563EB" />
                  ) : (
                    <>
                      <Ionicons name="cloud-upload-outline" size={20} color="#2563EB" />
                      <Text style={styles.uploadPdfBtnText}>+ Attach Question Paper (PDF)</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {/* Status Selector */}
              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Initial Status</Text>
              <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap" }}>
                {STATUS_OPTIONS.map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[styles.statusSelectChip, newStatus === st && styles.statusSelectChipActive]}
                    onPress={() => setNewStatus(st)}
                  >
                    <Text
                      style={[
                        styles.statusSelectChipText,
                        newStatus === st && styles.statusSelectChipTextActive,
                      ]}
                    >
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setCreateModalOpen(false)}
                disabled={creating}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleCreateSubmit}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveText}>Publish Assignment</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ======================================================= */}
      {/* MODAL 2: ASSIGNMENT DETAILS & STATUS UPDATE */}
      {/* ======================================================= */}
      <Modal visible={detailsModalOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" }]}>
            {selectedAsg ? (
              <>
                <View style={styles.modalHeader}>
                  <View style={{ flex: 1, paddingRight: 8 }}>
                    <Text style={[styles.modalTitle, { color: colors.text }]}>
                      {selectedAsg.title}
                    </Text>
                    <Text style={styles.modalSub}>
                      {selectedAsg.subject} • {selectedAsg.classTag}
                    </Text>
                  </View>
                  <TouchableOpacity onPress={() => setDetailsModalOpen(false)}>
                    <Ionicons name="close" size={20} color="#64748B" />
                  </TouchableOpacity>
                </View>

                <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
                  {/* Status Banner */}
                  <View style={styles.detailSectionBox}>
                    <Text style={styles.detailSectionLabel}>Current Assignment Status:</Text>
                    <View style={{ flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 6 }}>
                      {STATUS_OPTIONS.map((st) => (
                        <TouchableOpacity
                          key={st}
                          style={[
                            styles.statusSelectChip,
                            editingStatus === st && styles.statusSelectChipActive,
                          ]}
                          onPress={() => setEditingStatus(st)}
                        >
                          <Text
                            style={[
                              styles.statusSelectChipText,
                              editingStatus === st && styles.statusSelectChipTextActive,
                            ]}
                          >
                            {st}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* Completion Count */}
                  <View style={styles.completionBanner}>
                    <Ionicons name="people" size={18} color="#059669" />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.completionTitle}>
                        {selectedAsg.completedStudents?.length || 0} Students Marked Completed
                      </Text>
                      <Text style={styles.completionSub}>
                        Students can review problem statements and submit responses online.
                      </Text>
                    </View>
                  </View>

                  {/* Attached PDF Box */}
                  {selectedAsg.pdfUrl ? (
                    <View style={styles.attachedFileBox}>
                      <Ionicons name="document-text" size={24} color="#DC2626" />
                      <View style={{ flex: 1, paddingHorizontal: 8 }}>
                        <Text style={[styles.attachedFileName, { color: colors.text }]}>
                          {selectedAsg.pdfName || "Question_Paper.pdf"}
                        </Text>
                        <Text style={styles.attachedFileSize}>Official Question Statement</Text>
                      </View>
                      <TouchableOpacity
                        style={styles.openPdfBtn}
                        onPress={() => handleViewPdf(selectedAsg.pdfUrl, selectedAsg.pdfName)}
                      >
                        <Ionicons name="eye-outline" size={15} color="#FFFFFF" />
                        <Text style={styles.openPdfBtnText}>View PDF</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <Text style={{ fontSize: 11, color: "#94A3B8", marginVertical: 6 }}>
                      No PDF attached to this assignment.
                    </Text>
                  )}

                  {/* Description */}
                  {selectedAsg.description ? (
                    <View style={{ marginTop: 10 }}>
                      <Text style={styles.fieldLabel}>Problem Statement:</Text>
                      <Text style={[styles.descText, { color: colors.text }]}>
                        {selectedAsg.description}
                      </Text>
                    </View>
                  ) : null}

                  {/* Provide Instructions / Updates to Students */}
                  <Text style={[styles.fieldLabel, { marginTop: 12 }]}>
                    Update Student Guidelines / Feedback:
                  </Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      { height: 60, textAlignVertical: "top", color: colors.text, borderColor: colors.border },
                    ]}
                    value={editingInstructions}
                    onChangeText={setEditingInstructions}
                    multiline
                    placeholder="Provide latest guidelines, deadline extension, or evaluation notes..."
                    placeholderTextColor="#94A3B8"
                  />
                </ScrollView>

                {/* Actions Footer */}
                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={[styles.modalCancelBtn, { backgroundColor: "#FEE2E2" }]}
                    onPress={() => handleDelete(selectedAsg.id, selectedAsg.title)}
                    disabled={updatingDetails}
                  >
                    <Ionicons name="trash-outline" size={15} color="#EF4444" />
                    <Text style={[styles.modalCancelText, { color: "#EF4444" }]}>Delete</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.modalSaveBtn}
                    onPress={handleUpdateStatus}
                    disabled={updatingDetails}
                  >
                    {updatingDetails ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.modalSaveText}>Save Status & Updates</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
    </View>
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
  pageTitle: { fontSize: 16, fontWeight: "800" },
  pageSub: { fontSize: 11, color: "#64748B", marginTop: 1 },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#2563EB",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 7,
  },
  createBtnText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },
  contentScroll: { flex: 1 },
  contentPadding: { padding: 14, paddingBottom: 40 },

  controlsRow: {
    marginBottom: 14,
    gap: 10,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 38,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    height: "100%",
  },
  tabRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
  },
  tabBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
  },
  tabBtnActive: {
    backgroundColor: "#2563EB",
  },
  tabBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  tabBtnTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
  },
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    borderRadius: 12,
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginTop: 10,
  },
  emptySub: {
    fontSize: 11.5,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
    maxWidth: 320,
  },

  // Card styles
  asgCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  asgCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  asgTitle: {
    fontSize: 14.5,
    fontWeight: "800",
  },
  classBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 5,
  },
  classBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2563EB",
  },
  asgSubject: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
  },
  statusPill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  statusPillGreen: { backgroundColor: "#ECFDF5", borderWidth: 1, borderColor: "#A7F3D0" },
  statusTextGreen: { color: "#059669", fontSize: 10.5, fontWeight: "800" },
  statusPillOrange: { backgroundColor: "#FFF7ED", borderWidth: 1, borderColor: "#FED7AA" },
  statusTextOrange: { color: "#EA580C", fontSize: 10.5, fontWeight: "800" },
  statusPillPurple: { backgroundColor: "#FAF5FF", borderWidth: 1, borderColor: "#E9D5FF" },
  statusTextPurple: { color: "#7C3AED", fontSize: 10.5, fontWeight: "800" },
  statusPillGray: { backgroundColor: "#F1F5F9", borderWidth: 1, borderColor: "#E2E8F0" },
  statusTextGray: { color: "#64748B", fontSize: 10.5, fontWeight: "800" },

  asgDescPreview: {
    fontSize: 12,
    color: "#475569",
    marginTop: 8,
    lineHeight: 16,
  },
  asgMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginTop: 10,
    paddingVertical: 6,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#F1F5F9",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaItemText: {
    fontSize: 11,
    color: "#64748B",
  },
  asgCardBottom: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    flexWrap: "wrap",
    gap: 8,
  },
  pdfBadgeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FCA5A5",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    maxWidth: 240,
  },
  pdfBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
    flex: 1,
  },
  cardDetailsBtn: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  cardDetailsBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#2563EB",
  },

  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 14,
  },
  modalCard: {
    width: "100%",
    maxWidth: 500,
    borderRadius: 14,
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingBottom: 8,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  modalSub: {
    fontSize: 10.5,
    color: "#64748B",
    marginTop: 1,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 10,
    height: 36,
    fontSize: 12,
  },
  suggestionChip: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    marginRight: 6,
  },
  suggestionChipText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#2563EB",
  },
  uploadPdfBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#2563EB",
    borderRadius: 8,
    paddingVertical: 12,
    backgroundColor: "#F8FAFC",
  },
  uploadPdfBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  attachedFileBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 10,
    marginVertical: 4,
  },
  attachedFileName: {
    fontSize: 12,
    fontWeight: "700",
  },
  attachedFileSize: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 1,
  },
  removePdfBtn: {
    padding: 4,
  },
  openPdfBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#2563EB",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
  },
  openPdfBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  statusSelectChip: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
  },
  statusSelectChipActive: {
    backgroundColor: "#2563EB",
  },
  statusSelectChipText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#475569",
  },
  statusSelectChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  detailSectionBox: {
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 8,
  },
  detailSectionLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#334155",
  },
  completionBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  completionTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#065F46",
  },
  completionSub: {
    fontSize: 10.5,
    color: "#047857",
  },
  descText: {
    fontSize: 12,
    lineHeight: 16,
    marginTop: 2,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 10,
  },
  modalCancelBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  modalCancelText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  modalSaveBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 6,
  },
  modalSaveText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});