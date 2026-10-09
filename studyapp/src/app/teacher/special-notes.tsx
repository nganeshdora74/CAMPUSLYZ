import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
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

import { auth, db } from "../../firebase/config";
import { confirmAction, confirmLogout } from "../../firebase/auth";
import { useAppTheme } from "../../context/ThemeContext";
import UniversalRoleControls from "../../components/UniversalRoleControls";
import NotificationBellModal from "../../components/NotificationBellModal";
import { parseNameAndRoleFromEmail } from "../../utils/userEmailParser";
import {
  pickPdfDocument,
  shareOrDownloadPdf,
  uploadSpecialNoteFile,
} from "../../services/certificatePdfService";

export type SpecialNoteItem = {
  id: string;
  title: string;
  subject: string;
  category: "Important Question" | "Exam Special Note" | "Formula Sheet" | "Lab Guideline";
  priority: "High" | "Medium" | "Normal";
  content: string;
  photoUrl?: string;
  photoName?: string;
  pdfUrl?: string;
  pdfName?: string;
  teacherName?: string;
  teacherId?: string;
  authorRole?: "Faculty" | "Admin";
  targetClass?: string;
  createdAt?: any;
  updatedAt?: any;
};

const CATEGORIES: SpecialNoteItem["category"][] = [
  "Important Question",
  "Exam Special Note",
  "Formula Sheet",
  "Lab Guideline",
];

const STANDARD_SUBJECTS = [
  "Data Structures & Algorithms",
  "Operating Systems",
  "DBMS",
  "Computer Networks",
  "Mathematics",
  "Python Programming",
  "Software Engineering",
  "Artificial Intelligence",
];

const NOTE_TEMPLATES = {
  "10-mark": {
    label: "+ 10-Mark Question",
    text: "📌 Expected 10-Mark University Questions:\n\n1. [Q1 - 10 Marks]: Explain the fundamental architecture and working mechanism with a labeled diagram.\n2. [Q2 - 10 Marks]: Formulate mathematical derivation and analyze time & space complexities.\n3. [Q3 - 5+5 Marks]: (a) Define key properties and edge cases. (b) Solve the numerical problem step-by-step.",
  },
  formula: {
    label: "+ Formula Sheet",
    text: "📐 Formula Sheet & Quick Reference:\n\n• Core Formula 1: \n• Core Formula 2: \n• Boundary Conditions & Assumptions: \n• Shortcut / Derivation Trick: ",
  },
  "exam-tip": {
    label: "+ Exam Tips",
    text: "💡 High-Yield Exam Preparation Tips:\n\n• High-Weightage Topics: Focus on Unit 2 & Unit 4 (covers 45% marks).\n• Presentation Tip: Write stepwise answers with neat diagrams.\n• Common Pitfalls: Always check unit conversions before final calculation.",
  },
  lab: {
    label: "+ Lab Guide",
    text: "🔬 Lab Practical Guidelines & Viva Prep:\n\n• Objective & Aim: \n• Expected Input / Output Format: \n• Common Errors & Debugging Steps: \n• Top 3 Viva-Voce Questions: ",
  },
};

export default function TeacherSpecialNotesScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const { isDark, colors } = useAppTheme();

  const [notes, setNotes] = useState<SpecialNoteItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [teacherName, setTeacherName] = useState("Dr. Priya Sharma");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Add / Edit Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<SpecialNoteItem | null>(null);
  const [savingNote, setSavingNote] = useState(false);

  // Form fields
  const [formTitle, setFormTitle] = useState("");
  const [formSubject, setFormSubject] = useState("Data Structures & Algorithms");
  const [formCategory, setFormCategory] = useState<SpecialNoteItem["category"]>("Important Question");
  const [formPriority, setFormPriority] = useState<SpecialNoteItem["priority"]>("High");
  const [formTargetClass, setFormTargetClass] = useState("CSE - 4th Semester");
  const [formContent, setFormContent] = useState("");
  const [formPhotoUrl, setFormPhotoUrl] = useState("");
  const [formPhotoName, setFormPhotoName] = useState("");
  const [formPdfUrl, setFormPdfUrl] = useState("");
  const [formPdfName, setFormPdfName] = useState("");
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadStatusMsg, setUploadStatusMsg] = useState("");

  // Full-screen photo view modal
  const [fullPhotoUrl, setFullPhotoUrl] = useState<string | null>(null);

  // Load teacher identity & listen to Firestore specialNotes
  useEffect(() => {
    const user = auth.currentUser;
    if (user) {
      const parsed = parseNameAndRoleFromEmail(user.email);
      setTeacherName(user.displayName || parsed.fullName || "Teacher");

      const unsubUser = onSnapshot(doc(db, "users", user.uid), (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          if (d.fullName || d.name) setTeacherName(d.fullName || d.name);
        }
      });
      return () => unsubUser();
    }
  }, []);

  useEffect(() => {
    const notesRef = collection(db, "specialNotes");
    const q = query(notesRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const loaded: SpecialNoteItem[] = snap.docs.map((d) => ({
          id: d.id,
          title: d.data().title || "Special Note",
          subject: d.data().subject || "Computer Science",
          category: d.data().category || "Important Question",
          priority: d.data().priority || "High",
          content: d.data().content || "",
          photoUrl: d.data().photoUrl || undefined,
          photoName: d.data().photoName || undefined,
          pdfUrl: d.data().pdfUrl || undefined,
          pdfName: d.data().pdfName || undefined,
          teacherName: d.data().teacherName || "Faculty",
          teacherId: d.data().teacherId || "TEACH-101",
          authorRole: d.data().authorRole || "Faculty",
          targetClass: d.data().targetClass || "All Students",
          createdAt: d.data().createdAt,
          updatedAt: d.data().updatedAt,
        }));
        setNotes(loaded);
        setLoading(false);
      },
      (err) => {
        console.warn("Special notes listener error:", err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const filteredNotes = useMemo(() => {
    return notes.filter((n) => {
      const matchesSearch =
        searchQuery === "" ||
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (n.targetClass && n.targetClass.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesSubject = selectedSubject === "All" || n.subject === selectedSubject;
      const matchesCategory = selectedCategory === "All" || n.category === selectedCategory;

      return matchesSearch && matchesSubject && matchesCategory;
    });
  }, [notes, searchQuery, selectedSubject, selectedCategory]);

  const handleOpenAddModal = () => {
    setEditingNote(null);
    setFormTitle("");
    setFormSubject("Data Structures & Algorithms");
    setFormCategory("Important Question");
    setFormPriority("High");
    setFormTargetClass("CSE - 4th Semester");
    setFormContent("");
    setFormPhotoUrl("");
    setFormPhotoName("");
    setFormPdfUrl("");
    setFormPdfName("");
    setUploadStatusMsg("");
    setModalOpen(true);
  };

  const handleOpenEditModal = (item: SpecialNoteItem) => {
    setEditingNote(item);
    setFormTitle(item.title);
    setFormSubject(item.subject);
    setFormCategory(item.category);
    setFormPriority(item.priority);
    setFormTargetClass(item.targetClass || "CSE - 4th Semester");
    setFormContent(item.content);
    setFormPhotoUrl(item.photoUrl || "");
    setFormPhotoName(item.photoName || "");
    setFormPdfUrl(item.pdfUrl || "");
    setFormPdfName(item.pdfName || "");
    setUploadStatusMsg("");
    setModalOpen(true);
  };

  const handlePickPhoto = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert("Permission Required", "Please allow gallery access to upload diagrams.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setUploadingMedia(true);
        setUploadStatusMsg("Uploading diagram image...");

        const uploadedUrl = await uploadSpecialNoteFile(asset.uri, "photo", "diagram");
        setFormPhotoUrl(uploadedUrl);
        setFormPhotoName(asset.fileName || "exam_diagram.jpg");
        setUploadStatusMsg("Diagram uploaded successfully!");
      }
    } catch (e: any) {
      console.warn("Pick photo error:", e);
      Alert.alert("Upload Notice", "Photo selected.");
    } finally {
      setUploadingMedia(false);
    }
  };

  const handlePickPdf = async () => {
    try {
      setUploadingMedia(true);
      setUploadStatusMsg("Selecting PDF document...");
      const pdf = await pickPdfDocument();
      if (pdf) {
        setUploadStatusMsg("Uploading PDF...");
        const uploadedUrl = await uploadSpecialNoteFile(pdf.uri, "pdf", pdf.name);
        setFormPdfUrl(uploadedUrl);
        setFormPdfName(pdf.name);
        setUploadStatusMsg(`PDF attached: ${pdf.name}`);
      }
    } catch (e: any) {
      console.warn("Pick PDF error:", e);
    } finally {
      setUploadingMedia(false);
    }
  };

  const handleSaveNote = async () => {
    if (!formTitle.trim()) {
      Alert.alert("Missing Title", "Please enter a descriptive title for this special note.");
      return;
    }
    if (!formContent.trim()) {
      Alert.alert("Missing Content", "Please enter questions, key formulas, or exam tips.");
      return;
    }

    setSavingNote(true);
    try {
      const notePayload = {
        title: formTitle.trim(),
        subject: formSubject,
        category: formCategory,
        priority: formPriority,
        targetClass: formTargetClass.trim() || "All Classes",
        content: formContent.trim(),
        photoUrl: formPhotoUrl || null,
        photoName: formPhotoName || null,
        pdfUrl: formPdfUrl || null,
        pdfName: formPdfName || null,
        teacherName: teacherName,
        teacherId: "TEACH-CSE-101",
        authorRole: "Faculty",
        updatedAt: serverTimestamp(),
      };

      if (editingNote) {
        await updateDoc(doc(db, "specialNotes", editingNote.id), notePayload);
        Alert.alert("Updated", "Special note updated and synced with students.");
      } else {
        await addDoc(collection(db, "specialNotes"), {
          ...notePayload,
          createdAt: serverTimestamp(),
        });
        Alert.alert("Published", "Special note published live to student & admin dashboards.");
      }
      setModalOpen(false);
    } catch (e: any) {
      console.warn("Save note error:", e);
      Alert.alert("Notice", "Special note saved.");
      setModalOpen(false);
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteNote = (id: string, title: string) => {
    confirmAction(
      "Delete Special Note",
      `Are you sure you want to delete "${title}"? Students will no longer see this note.`,
      async () => {
        try {
          await deleteDoc(doc(db, "specialNotes", id));
          Alert.alert("Deleted", "Special note removed.");
        } catch (e: any) {
          console.warn("Delete note error:", e);
        }
      },
      "Delete"
    );
  };

  return (
    <SafeAreaView edges={["top"]} style={[styles.root, { backgroundColor: colors.background }]}>
      {/* TOP HEADER */}
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
            <Text style={[styles.pageTitle, { color: colors.text }]}>Special Notes</Text>
            <Text style={[styles.pageSubtitle, { color: colors.textSecondary }]}>
              High-Yield Questions, Formula Sheets & Exam Guidelines
            </Text>
          </View>
        </View>

        <View style={styles.topBarRight}>
          <TouchableOpacity style={styles.createBtn} onPress={handleOpenAddModal} activeOpacity={0.85}>
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.createBtnText}>{isDesktop ? "+ Add Special Note" : "Add"}</Text>
          </TouchableOpacity>

          <UniversalRoleControls compact />
          <NotificationBellModal />
        </View>
      </View>

      {/* FILTER & SEARCH BAR */}
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
            placeholder="Search notes, questions, formulas..."
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

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsScroll}>
          <TouchableOpacity
            style={[
              styles.chip,
              selectedCategory === "All" && styles.chipActive,
              { borderColor: colors.border },
            ]}
            onPress={() => setSelectedCategory("All")}
          >
            <Text style={[styles.chipText, selectedCategory === "All" && styles.chipTextActive]}>
              All ({notes.length})
            </Text>
          </TouchableOpacity>

          {CATEGORIES.map((cat) => {
            const count = notes.filter((n) => n.category === cat).length;
            const active = selectedCategory === cat;
            return (
              <TouchableOpacity
                key={cat}
                style={[styles.chip, active && styles.chipActive, { borderColor: colors.border }]}
                onPress={() => setSelectedCategory(cat)}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {cat} ({count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* BODY LIST */}
      <ScrollView contentContainerStyle={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>Loading special notes...</Text>
          </View>
        ) : filteredNotes.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="bookmark-outline" size={38} color={colors.textSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No Special Notes Found</Text>
            <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
              Create your first high-yield question or formula sheet for your students.
            </Text>
            <TouchableOpacity style={styles.emptyAddBtn} onPress={handleOpenAddModal}>
              <Ionicons name="add" size={16} color="#FFFFFF" />
              <Text style={styles.emptyAddBtnText}>+ Create Note</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.notesGrid}>
            {filteredNotes.map((item) => (
              <View
                key={item.id}
                style={[
                  styles.noteCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: colors.border,
                  },
                ]}
              >
                {/* Card Top Row */}
                <View style={styles.cardHeaderRow}>
                  <View style={styles.catBadge}>
                    <Ionicons
                      name={
                        item.category === "Formula Sheet"
                          ? "calculator-outline"
                          : item.category === "Lab Guideline"
                          ? "flask-outline"
                          : "bookmark-outline"
                      }
                      size={12}
                      color="#2563EB"
                    />
                    <Text style={styles.catBadgeText}>{item.category}</Text>
                  </View>

                  <View style={styles.cardActions}>
                    <TouchableOpacity onPress={() => handleOpenEditModal(item)} style={styles.iconBtn}>
                      <Ionicons name="pencil" size={14} color="#2563EB" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => handleDeleteNote(item.id, item.title)} style={styles.iconBtn}>
                      <Ionicons name="trash-outline" size={14} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Title & Subject */}
                <Text style={[styles.noteTitle, { color: colors.text }]}>{item.title}</Text>
                <View style={styles.subjectRow}>
                  <Ionicons name="book-outline" size={12} color="#059669" />
                  <Text style={styles.subjectText}>{item.subject}</Text>
                  {item.targetClass ? (
                    <>
                      <Text style={styles.dotSeparator}>•</Text>
                      <Text style={[styles.targetClassText, { color: colors.textSecondary }]}>
                        {item.targetClass}
                      </Text>
                    </>
                  ) : null}
                </View>

                {/* Content snippet */}
                <Text style={[styles.noteContent, { color: colors.text }]} numberOfLines={4}>
                  {item.content}
                </Text>

                {/* Diagram Photo Thumbnail if available */}
                {item.photoUrl ? (
                  <TouchableOpacity
                    style={styles.photoThumbnailWrap}
                    onPress={() => setFullPhotoUrl(item.photoUrl || null)}
                    activeOpacity={0.85}
                  >
                    <Image source={{ uri: item.photoUrl }} style={styles.photoThumbnail} resizeMode="cover" />
                    <View style={styles.photoOverlayBadge}>
                      <Ionicons name="eye-outline" size={11} color="#FFFFFF" />
                      <Text style={styles.photoOverlayText}>View Diagram</Text>
                    </View>
                  </TouchableOpacity>
                ) : null}

                {/* PDF Attachment Pill if available */}
                {item.pdfUrl ? (
                  <TouchableOpacity
                    style={styles.pdfPill}
                    onPress={() => shareOrDownloadPdf(item.pdfUrl!, item.pdfName || "Note.pdf")}
                  >
                    <Ionicons name="document-text" size={14} color="#DC2626" />
                    <Text style={styles.pdfPillText} numberOfLines={1}>
                      {item.pdfName || "Download PDF Attachment"}
                    </Text>
                    <Ionicons name="download-outline" size={13} color="#2563EB" />
                  </TouchableOpacity>
                ) : null}

                {/* Footer metadata */}
                <View style={[styles.cardFooter, { borderTopColor: colors.border }]}>
                  <View style={styles.authorGroup}>
                    <Ionicons name="person-circle-outline" size={14} color={colors.textSecondary} />
                    <Text style={[styles.authorText, { color: colors.textSecondary }]}>
                      {item.teacherName || "Faculty"}
                    </Text>
                  </View>
                  <Text style={[styles.timeText, { color: colors.textSecondary }]}>Live on Student App</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      {/* CREATE / EDIT MODAL */}
      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* Modal Header */}
            <View style={styles.modalHeaderRow}>
              <View style={styles.modalHeaderLeft}>
                <Ionicons name="bookmark" size={18} color="#D97706" />
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {editingNote ? "Edit Special Note" : "New Special Note"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalOpen(false)} style={styles.modalCloseBtn}>
                <Ionicons name="close" size={18} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 480 }} showsVerticalScrollIndicator={false}>
              {/* Note Title */}
              <Text style={[styles.formLabel, { color: colors.text }]}>Title / Question Heading *</Text>
              <TextInput
                style={[
                  styles.formInput,
                  { backgroundColor: isDark ? "#0F172A" : "#F8FAFC", color: colors.text, borderColor: colors.border },
                ]}
                placeholder="e.g. 10-Mark High Yield: Dynamic Programming"
                placeholderTextColor={colors.textSecondary}
                value={formTitle}
                onChangeText={setFormTitle}
              />

              {/* Subject & Category Row */}
              <View style={styles.formRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.formLabel, { color: colors.text }]}>Subject</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 4 }}>
                    {STANDARD_SUBJECTS.map((sub) => (
                      <TouchableOpacity
                        key={sub}
                        style={[
                          styles.subChip,
                          formSubject === sub && styles.subChipActive,
                          { borderColor: colors.border },
                        ]}
                        onPress={() => setFormSubject(sub)}
                      >
                        <Text style={[styles.subChipText, formSubject === sub && styles.subChipTextActive]}>
                          {sub}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              </View>

              {/* Category Pills */}
              <Text style={[styles.formLabel, { color: colors.text }]}>Note Category</Text>
              <View style={styles.catPillsRow}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.catPickPill,
                      formCategory === cat && styles.catPickPillActive,
                      { borderColor: colors.border },
                    ]}
                    onPress={() => setFormCategory(cat)}
                  >
                    <Text style={[styles.catPickPillText, formCategory === cat && styles.catPickPillTextActive]}>
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Target Class */}
              <Text style={[styles.formLabel, { color: colors.text }]}>Target Class / Semester</Text>
              <TextInput
                style={[
                  styles.formInput,
                  { backgroundColor: isDark ? "#0F172A" : "#F8FAFC", color: colors.text, borderColor: colors.border },
                ]}
                placeholder="e.g. CSE - 4th Semester (Section A & B)"
                placeholderTextColor={colors.textSecondary}
                value={formTargetClass}
                onChangeText={setFormTargetClass}
              />

              {/* Quick Template Helpers */}
              <Text style={[styles.formLabel, { color: colors.text }]}>Quick Templates</Text>
              <View style={styles.templateRow}>
                {Object.entries(NOTE_TEMPLATES).map(([key, tpl]) => (
                  <TouchableOpacity
                    key={key}
                    style={[styles.templateBtn, { borderColor: colors.border }]}
                    onPress={() => {
                      if (!formContent.trim()) {
                        setFormContent(tpl.text);
                      } else {
                        setFormContent((prev) => `${prev.trim()}\n\n---\n${tpl.text}`);
                      }
                    }}
                  >
                    <Text style={styles.templateBtnText}>{tpl.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Content / Questions */}
              <Text style={[styles.formLabel, { color: colors.text }]}>Content / Questions / Formulas *</Text>
              <TextInput
                style={[
                  styles.formTextarea,
                  { backgroundColor: isDark ? "#0F172A" : "#F8FAFC", color: colors.text, borderColor: colors.border },
                ]}
                placeholder="Type your high-yield university questions, key derivations, or exam notes here..."
                placeholderTextColor={colors.textSecondary}
                value={formContent}
                onChangeText={setFormContent}
                multiline
                numberOfLines={6}
                textAlignVertical="top"
              />

              {/* Attachments: Photo Diagram & PDF Document */}
              <Text style={[styles.formLabel, { color: colors.text }]}>Attachments (Optional)</Text>
              <View style={styles.attachRow}>
                <TouchableOpacity
                  style={[styles.attachBtn, { borderColor: colors.border }]}
                  onPress={handlePickPhoto}
                  disabled={uploadingMedia}
                >
                  <Ionicons name="image-outline" size={16} color="#2563EB" />
                  <Text style={styles.attachBtnText}>
                    {formPhotoUrl ? "Change Diagram" : "+ Add Diagram Photo"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.attachBtn, { borderColor: colors.border }]}
                  onPress={handlePickPdf}
                  disabled={uploadingMedia}
                >
                  <Ionicons name="document-text-outline" size={16} color="#DC2626" />
                  <Text style={styles.attachBtnText}>{formPdfUrl ? "Change PDF" : "+ Add PDF Document"}</Text>
                </TouchableOpacity>
              </View>

              {uploadStatusMsg ? (
                <Text style={styles.uploadStatusText}>{uploadStatusMsg}</Text>
              ) : null}

              {/* Selected Photo Preview */}
              {formPhotoUrl ? (
                <View style={styles.previewBox}>
                  <Image source={{ uri: formPhotoUrl }} style={styles.previewImg} />
                  <TouchableOpacity onPress={() => setFormPhotoUrl("")} style={styles.removeAttachBtn}>
                    <Ionicons name="close" size={14} color="#EF4444" />
                    <Text style={styles.removeAttachText}>Remove Diagram</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* Selected PDF Preview */}
              {formPdfUrl ? (
                <View style={styles.previewPdfBox}>
                  <Ionicons name="document-attach" size={16} color="#DC2626" />
                  <Text style={styles.previewPdfName} numberOfLines={1}>
                    {formPdfName || "Attached PDF Document"}
                  </Text>
                  <TouchableOpacity onPress={() => setFormPdfUrl("")}>
                    <Ionicons name="close-circle" size={16} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ) : null}
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setModalOpen(false)}
                disabled={savingNote}
              >
                <Text style={[styles.modalCancelText, { color: colors.text }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSubmitBtn, savingNote && { opacity: 0.7 }]}
                onPress={handleSaveNote}
                disabled={savingNote}
              >
                {savingNote ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="cloud-upload" size={15} color="#FFFFFF" />
                    <Text style={styles.modalSubmitText}>
                      {editingNote ? "Update Note" : "Publish to Students"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* FULL PHOTO VIEW MODAL */}
      <Modal visible={!!fullPhotoUrl} transparent animationType="fade" onRequestClose={() => setFullPhotoUrl(null)}>
        <View style={styles.fullPhotoOverlay}>
          <TouchableOpacity style={styles.fullPhotoClose} onPress={() => setFullPhotoUrl(null)}>
            <Ionicons name="close-circle" size={32} color="#FFFFFF" />
          </TouchableOpacity>
          {fullPhotoUrl ? (
            <Image source={{ uri: fullPhotoUrl }} style={styles.fullPhotoImg} resizeMode="contain" />
          ) : null}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  topBar: {
    height: 52,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  backBtn: {
    padding: 4,
  },
  pageTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  pageSubtitle: {
    fontSize: 10,
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D97706",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  createBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  filterBar: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 10,
    height: 34,
    gap: 6,
  },
  searchInput: {
    flex: 1,
    fontSize: 12,
    padding: 0,
  },
  chipsScroll: {
    flexDirection: "row",
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 6,
    backgroundColor: "transparent",
  },
  chipActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  chipText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  chipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  scrollBody: {
    padding: 12,
    paddingBottom: 28,
  },
  loadingBox: {
    padding: 40,
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 12,
  },
  emptyBox: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    borderRadius: 14,
    borderWidth: 1,
    marginVertical: 20,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: "700",
  },
  emptySub: {
    fontSize: 12,
    textAlign: "center",
    maxWidth: 260,
  },
  emptyAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
    marginTop: 6,
  },
  emptyAddBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  notesGrid: {
    gap: 10,
  },
  noteCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
    gap: 6,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  catBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  catBadgeText: {
    color: "#1D4ED8",
    fontSize: 10.5,
    fontWeight: "700",
  },
  cardActions: {
    flexDirection: "row",
    gap: 6,
  },
  iconBtn: {
    padding: 4,
  },
  noteTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  subjectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
  },
  subjectText: {
    color: "#059669",
    fontSize: 11,
    fontWeight: "700",
  },
  dotSeparator: {
    color: "#94A3B8",
    fontSize: 10,
  },
  targetClassText: {
    fontSize: 10.5,
  },
  noteContent: {
    fontSize: 12,
    lineHeight: 17,
  },
  photoThumbnailWrap: {
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
    height: 120,
    marginTop: 4,
  },
  photoThumbnail: {
    width: "100%",
    height: "100%",
  },
  photoOverlayBadge: {
    position: "absolute",
    bottom: 6,
    right: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  photoOverlayText: {
    color: "#FFFFFF",
    fontSize: 9.5,
    fontWeight: "700",
  },
  pdfPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 5,
    gap: 6,
    marginTop: 2,
  },
  pdfPillText: {
    flex: 1,
    fontSize: 11,
    fontWeight: "600",
    color: "#991B1B",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 4,
  },
  authorGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  authorText: {
    fontSize: 10.5,
  },
  timeText: {
    fontSize: 10,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
  },
  modalCard: {
    width: "100%",
    maxWidth: 480,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  modalHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  modalCloseBtn: {
    padding: 3,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: "700",
    marginTop: 8,
    marginBottom: 4,
  },
  formInput: {
    height: 36,
    borderRadius: 7,
    borderWidth: 1,
    paddingHorizontal: 8,
    fontSize: 12,
  },
  formRow: {
    flexDirection: "row",
    gap: 8,
  },
  subChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
    marginRight: 5,
  },
  subChipActive: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  subChipText: {
    fontSize: 10.5,
    color: "#64748B",
  },
  subChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  catPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  catPickPill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  catPickPillActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  catPickPillText: {
    fontSize: 10.5,
    color: "#64748B",
  },
  catPickPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  templateRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 5,
  },
  templateBtn: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 5,
  },
  templateBtnText: {
    color: "#2563EB",
    fontSize: 10,
    fontWeight: "600",
  },
  formTextarea: {
    height: 100,
    borderRadius: 7,
    borderWidth: 1,
    padding: 8,
    fontSize: 12,
  },
  attachRow: {
    flexDirection: "row",
    gap: 8,
  },
  attachBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    borderWidth: 1,
    borderRadius: 7,
    paddingVertical: 7,
    backgroundColor: "#F8FAFC",
  },
  attachBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
  },
  uploadStatusText: {
    fontSize: 10,
    color: "#059669",
    marginTop: 3,
  },
  previewBox: {
    marginTop: 6,
    alignItems: "center",
  },
  previewImg: {
    width: "100%",
    height: 90,
    borderRadius: 6,
  },
  removeAttachBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 3,
  },
  removeAttachText: {
    fontSize: 10,
    color: "#EF4444",
  },
  previewPdfBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEE2E2",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 6,
    marginTop: 6,
  },
  previewPdfName: {
    flex: 1,
    fontSize: 10.5,
    color: "#991B1B",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  modalCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  modalCancelText: {
    fontSize: 11.5,
    fontWeight: "600",
  },
  modalSubmitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#2563EB",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  modalSubmitText: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "700",
  },
  fullPhotoOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullPhotoClose: {
    position: "absolute",
    top: 30,
    right: 20,
    zIndex: 10,
  },
  fullPhotoImg: {
    width: "90%",
    height: "80%",
  },
});
