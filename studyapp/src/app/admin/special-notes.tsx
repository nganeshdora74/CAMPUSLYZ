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
import AdminThemeToggle from "../../components/admin/AdminThemeToggle";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTopBar from "../../components/admin/AdminTopBar";
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
  updatedByName?: string;
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

const SEED_NOTES: Omit<SpecialNoteItem, "id">[] = [
  {
    title: "10-Mark High Yield Questions: Dynamic Programming & Graphs",
    subject: "Data Structures & Algorithms",
    category: "Important Question",
    priority: "High",
    targetClass: "CSE - 6th Semester (Sec A & B)",
    teacherName: "Prof. Ganesh Sharma",
    teacherId: "TEACH-CSE-101",
    photoUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=900&auto=format&fit=crop&q=80",
    photoName: "dijkstra_graph_diagram.jpg",
    pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    pdfName: "DSA_Unit4_High_Yield_Questions.pdf",
    content:
      "1. Explain Dijkstra's Shortest Path Algorithm with step-by-step example and time complexity analysis.\n2. Formulate 0/1 Knapsack problem using Dynamic Programming memoization vs tabulation.\n3. Implement AVL tree balance factor rotations (LL, RR, LR, RL).\n4. Differentiate between Bellman-Ford and Floyd-Warshall algorithms.",
  },
  {
    title: "End-Sem Exam Special Note: Paper Format & Deadlock Prevention",
    subject: "Operating Systems",
    category: "Exam Special Note",
    priority: "High",
    targetClass: "CSE - 6th Semester",
    teacherName: "Dr. Rahul Sharma",
    teacherId: "TEACH-CSE-101",
    photoUrl: "https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?w=900&auto=format&fit=crop&q=80",
    photoName: "bankers_algorithm_flowchart.jpg",
    pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    pdfName: "OS_EndSem_Exam_Guidelines.pdf",
    content:
      "Important Exam Note: Section A has 5 compulsory conceptual MCQs (10 marks). Section B contains numericals on Banker's Deadlock Algorithm and Page Replacement (FIFO, LRU, Optimal). Bring non-programmable scientific calculators; smart watches and phones are strictly prohibited.",
  },
  {
    title: "Formula Sheet & Rules: Database Normalization (1NF, 2NF, 3NF, BCNF)",
    subject: "DBMS",
    category: "Formula Sheet",
    priority: "Medium",
    targetClass: "CSE - 6th Semester",
    teacherName: "Prof. Ganesh Sharma",
    teacherId: "TEACH-CSE-101",
    photoUrl: "https://images.unsplash.com/photo-1544383835-bda2bc66a55d?w=900&auto=format&fit=crop&q=80",
    photoName: "normalization_rules_cheatsheet.png",
    pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    pdfName: "DBMS_Normalization_Formula_Sheet.pdf",
    content:
      "• 1NF: Every cell must contain atomic (indivisible) attribute values.\n• 2NF: 1NF + No partial dependency on candidate keys.\n• 3NF: 2NF + No transitive dependency on non-prime attributes.\n• BCNF: For every FD X -> Y, X must be a super key.\n• Lossless Join: R1 ∩ R2 -> R1 or R1 ∩ R2 -> R2.",
  },
  {
    title: "Subnetting Cheatsheet & OSI Layer Protocol Numerical Guidelines",
    subject: "Computer Networks",
    category: "Formula Sheet",
    priority: "High",
    targetClass: "CSE - 6th Semester",
    teacherName: "Prof. Kumar",
    teacherId: "TEACH-CSE-101",
    photoUrl: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=900&auto=format&fit=crop&q=80",
    photoName: "subnet_mask_table.jpg",
    pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    pdfName: "Networking_Subnetting_Quick_Reference.pdf",
    content:
      "CIDR Slash Notation Rules:\n/24 = 255.255.255.0 (256 IPs, 254 Hosts)\n/25 = 255.255.255.128 (128 IPs, 126 Hosts)\n/26 = 255.255.255.192 (64 IPs, 62 Hosts)\n/27 = 255.255.255.224 (32 IPs, 30 Hosts)\nFormula for usable hosts: 2^(32 - prefix) - 2.",
  },
];

export default function AdminSpecialNotesScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const { isDark, colors } = useAppTheme();

  // Notes state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notes, setNotes] = useState<SpecialNoteItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("All");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedPriority, setSelectedPriority] = useState("All");

  // Add / Edit Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<SpecialNoteItem | null>(null);
  const [savingNote, setSavingNote] = useState(false);

  // Modal Form fields
  const [formTitle, setFormTitle] = useState("");
  const [formSubject, setFormSubject] = useState("Data Structures & Algorithms");
  const [formCategory, setFormCategory] = useState<SpecialNoteItem["category"]>("Important Question");
  const [formPriority, setFormPriority] = useState<SpecialNoteItem["priority"]>("High");
  const [formTargetClass, setFormTargetClass] = useState("CSE - 6th Semester (Sec A & B)");
  const [formContent, setFormContent] = useState("");
  const [formPhotoUrl, setFormPhotoUrl] = useState("");
  const [formPhotoName, setFormPhotoName] = useState("");
  const [formPdfUrl, setFormPdfUrl] = useState("");
  const [formPdfName, setFormPdfName] = useState("");
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Full-screen photo view modal
  const [fullPhotoUrl, setFullPhotoUrl] = useState<string | null>(null);

  // Current user info
  const [teacherName, setTeacherName] = useState("Prof. Ganesh Sharma");

  // Faculty Directory List from Firestore
  type FacultyOption = {
    id: string;
    name: string;
    department?: string;
    designation?: string;
  };
  const [facultyList, setFacultyList] = useState<FacultyOption[]>([]);

  // Author & Faculty selector in Modal
  const [formAuthorRole, setFormAuthorRole] = useState<"Faculty" | "Admin">("Faculty");
  const [formTeacherName, setFormTeacherName] = useState("Prof. Ganesh Sharma");
  const [formTeacherId, setFormTeacherId] = useState("TEACH-CSE-101");
  const [uploadStatusMsg, setUploadStatusMsg] = useState("");

  // Quick Template Helpers for Admin & Faculty
  const NOTE_TEMPLATES = {
    "10-mark": {
      label: "+ 10-Mark Question",
      text: "📌 Expected 10-Mark University Questions:\n\n1. [Q1 - 10 Marks]: Explain the fundamental architecture and working mechanism with a labeled diagram and real-world example.\n2. [Q2 - 10 Marks]: Formulate the mathematical proof/derivation and compare time & space complexities.\n3. [Q3 - 5+5 Marks]: (a) Define key properties and edge cases. (b) Solve the numerical problem step-by-step.",
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

  const handleApplyTemplate = (key: keyof typeof NOTE_TEMPLATES) => {
    const template = NOTE_TEMPLATES[key];
    if (!template) return;
    if (!formContent.trim()) {
      setFormContent(template.text);
    } else {
      setFormContent((prev) => `${prev.trim()}\n\n---\n${template.text}`);
    }
  };

  // Load profile, faculty directory & real-time specialNotes from Firestore
  useEffect(() => {
    const user = auth.currentUser;
    if (user?.displayName) setTeacherName(user.displayName);

    // 1. Fetch Faculty list from Firestore for quick author picking
    const facultyCol = collection(db, "faculty");
    const qFaculty = query(facultyCol, orderBy("name", "asc"));
    const unsubFaculty = onSnapshot(
      qFaculty,
      (snap) => {
        const loaded: FacultyOption[] = snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name || "Faculty Member",
          department: d.data().department || "",
          designation: d.data().designation || "",
        }));
        setFacultyList(loaded);
      },
      (err) => {
        console.warn("Faculty list listener error:", err.message);
      }
    );

    // 2. Fetch Special Notes
    const notesRef = collection(db, "specialNotes");
    const q = query(notesRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      async (snap) => {
        if (snap.empty) {
          // Auto-seed default notes with photos and PDFs so the screen is immediately rich
          try {
            for (const item of SEED_NOTES) {
              await addDoc(notesRef, {
                ...item,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
            }
          } catch (e) {
            console.warn("Error seeding default notes:", e);
          }
          return;
        }

        const loaded: SpecialNoteItem[] = snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as any),
        }));

        setNotes(loaded);
        setLoading(false);
      },
      (err) => {
        console.warn("Special notes listener error:", err.message);
        setLoading(false);
      }
    );

    return () => {
      unsubFaculty();
      unsubscribe();
    };
  }, []);

  // Compute unique subject list dynamically from notes and standard subjects
  const subjectList = useMemo(() => {
    const set = new Set<string>();
    STANDARD_SUBJECTS.forEach((s) => set.add(s));
    notes.forEach((n) => {
      if (n.subject && n.subject.trim()) set.add(n.subject.trim());
    });
    return ["All", ...Array.from(set).sort()];
  }, [notes]);

  // Filtered notes list
  const filteredNotes = useMemo(() => {
    return notes.filter((item) => {
      // 1. Subject filter
      if (selectedSubject !== "All" && item.subject?.trim().toLowerCase() !== selectedSubject.toLowerCase()) {
        return false;
      }
      // 2. Category filter
      if (selectedCategory !== "All" && item.category !== selectedCategory) {
        return false;
      }
      // 3. Priority filter
      if (selectedPriority !== "All" && item.priority !== selectedPriority) {
        return false;
      }
      // 4. Search query
      if (searchQuery.trim().length > 0) {
        const q = searchQuery.toLowerCase();
        const matchTitle = item.title?.toLowerCase().includes(q);
        const matchContent = item.content?.toLowerCase().includes(q);
        const matchSubject = item.subject?.toLowerCase().includes(q);
        const matchTeacher = item.teacherName?.toLowerCase().includes(q);
        if (!matchTitle && !matchContent && !matchSubject && !matchTeacher) {
          return false;
        }
      }
      return true;
    });
  }, [notes, selectedSubject, selectedCategory, selectedPriority, searchQuery]);

  // Open modal for Adding New Note
  const handleOpenAddModal = () => {
    setEditingNote(null);
    setFormTitle("");
    setFormSubject(selectedSubject !== "All" ? selectedSubject : "Data Structures & Algorithms");
    setFormCategory("Important Question");
    setFormPriority("High");
    setFormTargetClass("CSE - 6th Semester (Sec A & B)");
    setFormContent("");
    setFormPhotoUrl("");
    setFormPhotoName("");
    setFormPdfUrl("");
    setFormPdfName("");
    setFormAuthorRole("Faculty");
    setFormTeacherName(teacherName || "Prof. Ganesh Sharma");
    setFormTeacherId("TEACH-CSE-101");
    setUploadStatusMsg("");
    setModalOpen(true);
  };

  // Open modal for Editing Existing Note
  const handleOpenEditModal = (note: SpecialNoteItem) => {
    setEditingNote(note);
    setFormTitle(note.title || "");
    setFormSubject(note.subject || "Data Structures & Algorithms");
    setFormCategory(note.category || "Important Question");
    setFormPriority(note.priority || "High");
    setFormTargetClass(note.targetClass || "CSE - 6th Semester");
    setFormContent(note.content || "");
    setFormPhotoUrl(note.photoUrl || "");
    setFormPhotoName(note.photoName || "");
    setFormPdfUrl(note.pdfUrl || "");
    setFormPdfName(note.pdfName || "");
    setFormAuthorRole(note.authorRole || (note.teacherName?.toLowerCase().includes("admin") ? "Admin" : "Faculty"));
    setFormTeacherName(note.teacherName || teacherName || "Prof. Ganesh Sharma");
    setFormTeacherId(note.teacherId || "TEACH-CSE-101");
    setUploadStatusMsg("");
    setModalOpen(true);
  };

  // Pick Photo using ImagePicker (Gallery)
  const handlePickPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission Required", "Please allow gallery access to attach diagram photos.");
        return;
      }

      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85,
      });

      if (!res.canceled && res.assets && res.assets[0]?.uri) {
        const asset = res.assets[0];
        setFormPhotoUrl(asset.uri);
        setFormPhotoName(asset.fileName || `Diagram_${Date.now()}.jpg`);
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not select photo.");
    }
  };

  // Capture Photo using Camera (Whiteboard / Handwritten Note)
  const handleTakePhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Camera Permission", "Please allow camera access to snap whiteboard or diagram photos.");
        return;
      }

      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85,
      });

      if (!res.canceled && res.assets && res.assets[0]?.uri) {
        const asset = res.assets[0];
        setFormPhotoUrl(asset.uri);
        setFormPhotoName(asset.fileName || `Whiteboard_${Date.now()}.jpg`);
      }
    } catch (e: any) {
      Alert.alert("Camera Error", e?.message || "Could not snap photo.");
    }
  };

  // Pick / Change PDF using DocumentPicker
  const handlePickPdf = async () => {
    try {
      setUploadingMedia(true);
      const file = await pickPdfDocument();
      if (file && file.uri) {
        setFormPdfUrl(file.uri);
        setFormPdfName(file.name || "Exam_Notes.pdf");
        Alert.alert("PDF Document Attached", `Attached: ${file.name}\nReady to upload.`);
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not pick PDF file.");
    } finally {
      setUploadingMedia(false);
    }
  };

  // Preview / Download Document
  const handlePreviewDocument = async (url: string, name?: string) => {
    if (!url) return;
    try {
      if (Platform.OS === "web") {
        window.open(url, "_blank");
      } else if (url.startsWith("http")) {
        await Linking.openURL(url);
      } else {
        await shareOrDownloadPdf(url, name || "Special_Notes.pdf");
      }
    } catch (e: any) {
      Alert.alert("Preview Error", e?.message || "Could not open document preview.");
    }
  };

  // Save (Add or Update) Special Note with Cloud Storage Upload
  const handleSaveNote = async () => {
    if (!formTitle.trim()) {
      Alert.alert("Title Required", "Please enter a note or question title.");
      return;
    }
    if (!formSubject.trim()) {
      Alert.alert("Subject Required", "Please select or type a subject.");
      return;
    }
    if (!formContent.trim()) {
      Alert.alert("Content Required", "Please enter questions, notes, or formula details.");
      return;
    }

    try {
      setSavingNote(true);

      const noteDocId = editingNote ? editingNote.id : `note_${Date.now()}`;

      // Upload local photo to Firebase Storage if not a web URL
      let finalPhotoUrl = formPhotoUrl.trim();
      if (finalPhotoUrl && !finalPhotoUrl.startsWith("http")) {
        setUploadStatusMsg("Uploading whiteboard / diagram photo to cloud...");
        finalPhotoUrl = await uploadSpecialNoteFile(finalPhotoUrl, "photo", noteDocId);
      }

      // Upload local PDF to Firebase Storage if not a web URL
      let finalPdfUrl = formPdfUrl.trim();
      if (finalPdfUrl && !finalPdfUrl.startsWith("http")) {
        setUploadStatusMsg("Uploading notes PDF document to cloud...");
        finalPdfUrl = await uploadSpecialNoteFile(finalPdfUrl, "pdf", noteDocId);
      }

      setUploadStatusMsg("Saving note in database...");

      const finalAuthorName = formTeacherName.trim() || (formAuthorRole === "Admin" ? "Admin Academic Office" : (teacherName || "Faculty Instructor"));

      const payload = {
        title: formTitle.trim(),
        subject: formSubject.trim(),
        category: formCategory,
        priority: formPriority,
        targetClass: formTargetClass.trim() || "All Classes",
        content: formContent.trim(),
        photoUrl: finalPhotoUrl || "",
        photoName: formPhotoName.trim() || "",
        pdfUrl: finalPdfUrl || "",
        pdfName: formPdfName.trim() || "",
        authorRole: formAuthorRole,
        teacherName: finalAuthorName,
        teacherId: formTeacherId.trim() || "TEACH-CSE-101",
        updatedByName: teacherName || auth.currentUser?.displayName || "Admin",
        updatedAt: serverTimestamp(),
      };

      if (editingNote) {
        await updateDoc(doc(db, "specialNotes", editingNote.id), payload);
        await addDoc(collection(db, "activities"), {
          title: `Special Note Updated: ${formTitle.trim()}`,
          time: "Just now",
          user: finalAuthorName,
          type: "notes",
          createdAt: serverTimestamp(),
        });
        Alert.alert("Note Updated! 📝", `"${formTitle.trim()}" has been updated and published to students.`);
      } else {
        await addDoc(collection(db, "specialNotes"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        await addDoc(collection(db, "activities"), {
          title: `New Special Note Published: ${formTitle.trim()}`,
          time: "Just now",
          user: finalAuthorName,
          type: "notes",
          createdAt: serverTimestamp(),
        });
        Alert.alert("Note Published! 🚀", `"${formTitle.trim()}" is now live for all students.`);
      }

      setModalOpen(false);
    } catch (e: any) {
      console.warn("Save note error:", e);
      Alert.alert("Save Error", e?.message || "Could not save special note.");
    } finally {
      setSavingNote(false);
      setUploadStatusMsg("");
    }
  };

  // Delete Note with Cross-Platform Confirmation
  const handleDeleteNote = (note: SpecialNoteItem) => {
    confirmAction(
      "Delete Special Note",
      `Are you sure you want to delete "${note.title}"?\n\nThis note, including attached diagrams and PDFs, will be removed from all student dashboards.`,
      async () => {
        try {
          if (!note.id.startsWith("note-init-")) {
            await deleteDoc(doc(db, "specialNotes", note.id));
          }
          setNotes((prev) => prev.filter((n) => n.id !== note.id));
          if (editingNote?.id === note.id) {
            setModalOpen(false);
          }
          await addDoc(collection(db, "activities"), {
            title: `Deleted Special Note: ${note.title}`,
            time: "Just now",
            user: teacherName,
            type: "notes",
            createdAt: serverTimestamp(),
          }).catch(() => {});
          if (Platform.OS === "web") {
            window.alert("Special note removed.");
          } else {
            Alert.alert("Deleted", "Special note removed.");
          }
        } catch (e: any) {
          if (Platform.OS === "web") {
            window.alert(e?.message || "Could not delete note.");
          } else {
            Alert.alert("Delete Error", e?.message || "Could not delete note.");
          }
        }
      },
      "Delete Note"
    );
  };

  // Open PDF Document
  const handleOpenPdf = (pdfUrl?: string, pdfName?: string) => {
    if (!pdfUrl) return;
    shareOrDownloadPdf(pdfUrl, pdfName || "Special_Note.pdf").catch(() => {
      Linking.openURL(pdfUrl).catch(() => {
        Alert.alert("Cannot Open PDF", "Could not open document viewer for this link.");
      });
    });
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.adminSidebar }]} edges={["top", "left", "right"]}>
      <View style={{ flex: 1, flexDirection: "row", backgroundColor: colors.adminBg }}>
        <AdminSidebar
          activeNav="special-notes"
          isDesktop={isDesktop}
          mobileMenuOpen={mobileMenuOpen}
          onCloseMobileMenu={() => setMobileMenuOpen(false)}
        />

        <View style={{ flex: 1, backgroundColor: colors.adminBg }}>
          <AdminTopBar
            title="Special Notes & Questions"
            subtitle="Subject-wise high-yield exam questions, revision notes, photo diagrams & PDF documents"
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
            rightActions={
              <TouchableOpacity style={styles.addNoteBtn} onPress={handleOpenAddModal} activeOpacity={0.85}>
                <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 4 }} />
                <Text style={styles.addNoteBtnText}>+ Add Special Note</Text>
              </TouchableOpacity>
            }
          />

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
        {/* Search Bar */}
        <View style={[styles.searchBox, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
          <Ionicons name="search-outline" size={18} color={colors.adminTextSecondary} />
          <TextInput
            style={[styles.searchInput, { color: colors.adminText }]}
            placeholder="Search questions, subjects, formulas, topics or faculty..."
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

        {/* 1. SUBJECT-WISE FILTER PILLS */}
        <View style={styles.sectionHeaderRow}>
          <Ionicons name="book" size={16} color="#7C3AED" />
          <Text style={[styles.sectionHeading, { color: colors.adminText }]}>Filter Subject-Wise</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subjectPillsRow}>
          {subjectList.map((sub) => {
            const isSel = selectedSubject === sub;
            const subCount = sub === "All" ? notes.length : notes.filter((n) => n.subject?.toLowerCase() === sub.toLowerCase()).length;
            return (
              <TouchableOpacity
                key={sub}
                style={[
                  styles.subjectPill,
                  {
                    backgroundColor: isSel ? "#7C3AED" : colors.adminSurfaceAlt,
                    borderColor: isSel ? "#7C3AED" : colors.adminCardBorder,
                  },
                ]}
                onPress={() => setSelectedSubject(sub)}
                activeOpacity={0.8}
              >
                <Text style={[styles.subjectPillText, { color: isSel ? "#FFFFFF" : colors.adminTextSecondary, fontWeight: isSel ? "700" : "500" }]}>
                  {sub}
                </Text>
                <View style={[styles.subjectPillBadge, { backgroundColor: isSel ? "rgba(255,255,255,0.25)" : colors.adminCardBorder }]}>
                  <Text style={[styles.subjectPillBadgeText, { color: isSel ? "#FFFFFF" : colors.adminTextSecondary }]}>{subCount}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* 2. CATEGORY PILLS */}
        <View style={[styles.sectionHeaderRow, { marginTop: 14 }]}>
          <Ionicons name="pricetag" size={15} color="#4F46E5" />
          <Text style={[styles.sectionHeading, { color: colors.adminText }]}>Category Filter</Text>
        </View>

        <View style={styles.categoryPillsRow}>
          {["All", ...CATEGORIES].map((cat) => {
            const isSel = selectedCategory === cat;
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
                onPress={() => setSelectedCategory(cat)}
                activeOpacity={0.8}
              >
                <Text style={[styles.categoryPillText, { color: isSel ? "#FFFFFF" : colors.adminTextSecondary, fontWeight: isSel ? "700" : "500" }]}>
                  {cat}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* 3. NOTES LIST */}
        {loading ? (
          <View style={styles.centerLoading}>
            <ActivityIndicator size="large" color="#7C3AED" />
            <Text style={[styles.loadingText, { color: colors.adminTextSecondary }]}>Syncing special notes & documents...</Text>
          </View>
        ) : filteredNotes.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
            <Ionicons name="document-text-outline" size={48} color={colors.adminTextSecondary} />
            <Text style={[styles.emptyTitle, { color: colors.adminText }]}>No special notes match your filter</Text>
            <Text style={[styles.emptySubtitle, { color: colors.adminTextSecondary }]}>
              {searchQuery || selectedSubject !== "All"
                ? "Try clearing your search query or subject filter."
                : "Tap '+ Add Special Note' above to publish important questions, formulas, or PDFs."}
            </Text>
            <TouchableOpacity style={styles.addNoteBtn} onPress={handleOpenAddModal}>
              <Ionicons name="add-circle" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.addNoteBtnText}>Post First Note</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.notesGrid}>
            {filteredNotes.map((item) => {
              const isHigh = item.priority === "High";
              const isMed = item.priority === "Medium";
              return (
                <View key={item.id} style={[styles.noteCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                  {/* Card Header: Priority, Category, Target Class */}
                  <View style={styles.cardHeaderRow}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap", flex: 1 }}>
                      <View
                        style={[
                          styles.priorityBadge,
                          {
                            backgroundColor: isHigh ? "#FEE2E2" : isMed ? "#FEF3C7" : "#E0E7FF",
                          },
                        ]}
                      >
                        <Text style={[styles.priorityBadgeText, { color: isHigh ? "#DC2626" : isMed ? "#D97706" : "#4F46E5" }]}>
                          {item.priority || "Normal"} Priority
                        </Text>
                      </View>

                      <View style={[styles.categoryBadge, { backgroundColor: isDark ? "rgba(124,58,237,0.25)" : "#EDE9FE" }]}>
                        <Text style={styles.categoryBadgeText}>{item.category || "Important Question"}</Text>
                      </View>
                    </View>

                    {Boolean(item.targetClass) && (
                      <View style={[styles.classBadge, { backgroundColor: colors.adminSurfaceAlt }]}>
                        <Text style={[styles.classBadgeText, { color: colors.adminTextSecondary }]}>{item.targetClass}</Text>
                      </View>
                    )}
                  </View>

                  {/* Subject Line */}
                  <View style={styles.subjectRow}>
                    <Ionicons name="book-outline" size={14} color="#7C3AED" />
                    <Text style={styles.subjectRowText}>{item.subject}</Text>
                  </View>

                  {/* Note Title */}
                  <Text style={[styles.noteTitle, { color: colors.adminText }]}>{item.title}</Text>

                  {/* Note Content / Questions */}
                  <Text style={[styles.noteContent, { color: colors.adminTextSecondary }]} numberOfLines={5}>
                    {item.content}
                  </Text>

                  {/* PHOTO ATTACHMENT SYSTEM */}
                  {Boolean(item.photoUrl) && (
                    <View style={styles.photoContainer}>
                      <TouchableOpacity activeOpacity={0.9} onPress={() => setFullPhotoUrl(item.photoUrl || null)}>
                        <Image source={{ uri: item.photoUrl }} style={styles.photoPreview} resizeMode="cover" />
                        <View style={styles.photoZoomBadge}>
                          <Ionicons name="expand" size={13} color="#FFFFFF" />
                          <Text style={styles.photoZoomBadgeText}>Tap to zoom</Text>
                        </View>
                      </TouchableOpacity>
                      {Boolean(item.photoName) && (
                        <Text style={[styles.mediaFilenameText, { color: colors.adminTextSecondary }]} numberOfLines={1}>
                          📷 {item.photoName}
                        </Text>
                      )}
                    </View>
                  )}

                  {/* PDF DOCUMENT SYSTEM */}
                  {Boolean(item.pdfUrl) && (
                    <TouchableOpacity
                      style={[styles.pdfCard, { backgroundColor: isDark ? "rgba(239,68,68,0.15)" : "#FEF2F2", borderColor: isDark ? "#7F1D1D" : "#FCA5A5" }]}
                      activeOpacity={0.8}
                      onPress={() => handleOpenPdf(item.pdfUrl, item.pdfName)}
                    >
                      <View style={styles.pdfIconCircle}>
                        <Ionicons name="document-text" size={18} color="#DC2626" />
                      </View>
                      <View style={{ flex: 1, marginLeft: 10 }}>
                        <Text style={[styles.pdfNameText, { color: colors.adminText }]} numberOfLines={1}>
                          {item.pdfName || "Exam_Notes_Document.pdf"}
                        </Text>
                        <Text style={styles.pdfSubText}>PDF Document • Tap to View / Download</Text>
                      </View>
                      <View style={styles.pdfOpenBtn}>
                        <Text style={styles.pdfOpenBtnText}>Open</Text>
                        <Ionicons name="open-outline" size={13} color="#DC2626" />
                      </View>
                    </TouchableOpacity>
                  )}

                  {/* Author / Date Footer */}
                  <View style={[styles.authorRow, { borderTopColor: colors.adminCardBorder }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1, marginRight: 8 }}>
                      <Ionicons
                        name={item.authorRole === "Admin" ? "shield-checkmark" : "school"}
                        size={16}
                        color={item.authorRole === "Admin" ? "#2563EB" : "#7C3AED"}
                      />
                      <Text style={[styles.authorText, { color: colors.adminTextSecondary }]} numberOfLines={1}>
                        {item.authorRole === "Admin" ? "🛡️ Admin Office: " : "👨‍🏫 Faculty: "}
                        <Text style={{ fontWeight: "700", color: colors.adminText }}>{item.teacherName || teacherName}</Text>
                        {Boolean(item.updatedByName) && (
                          <Text style={{ fontSize: 10, color: colors.adminTextSecondary }}> (Updated by {item.updatedByName})</Text>
                        )}
                      </Text>
                    </View>

                    {/* Card Actions: Edit & Delete (Admin / Teacher Controls) */}
                    <View style={styles.cardActionsRow}>
                      <TouchableOpacity
                        style={[styles.editBtn, isDark && { backgroundColor: "rgba(124,58,237,0.2)" }]}
                        activeOpacity={0.8}
                        onPress={() => handleOpenEditModal(item)}
                      >
                        <Ionicons name="create-outline" size={15} color="#7C3AED" />
                        <Text style={styles.editBtnText}>Edit</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.deleteBtn, isDark && { backgroundColor: "rgba(239,68,68,0.2)" }]}
                        activeOpacity={0.8}
                        onPress={() => handleDeleteNote(item)}
                      >
                        <Ionicons name="trash-outline" size={15} color="#EF4444" />
                        <Text style={styles.deleteBtnText}>Delete</Text>
                      </TouchableOpacity>
                    </View>
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
      {/* ADD / EDIT SPECIAL NOTE & QUESTIONS MODAL */}
      {/* ===================================================== */}
      <Modal visible={modalOpen} transparent animationType="fade" onRequestClose={() => setModalOpen(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setModalOpen(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]} onPress={(e) => e.stopPropagation()}>
            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
              {/* Modal Header */}
              <View style={styles.modalHeaderRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.modalHeading, { color: colors.adminText }]}>
                    {editingNote ? "Edit Special Note & Questions" : "Post Special Note & Questions"}
                  </Text>
                  <Text style={[styles.modalSubheading, { color: colors.adminTextSecondary }]}>
                    Admin & Faculty can change notes, attach formulas, whiteboard photos & PDF documents
                  </Text>
                </View>

                <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setModalOpen(false)}>
                  <Ionicons name="close" size={20} color={colors.adminTextSecondary} />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 520 }}>
                {/* 1. AUTHOR & AUTHORITY ROLE SELECTION */}
                <Text style={[styles.formLabel, { color: colors.adminText }]}>Author & Issuer Role *</Text>
                <View style={styles.roleToggleRow}>
                  <TouchableOpacity
                    style={[
                      styles.roleToggleBtn,
                      {
                        backgroundColor: formAuthorRole === "Faculty" ? (isDark ? "rgba(124,58,237,0.25)" : "#EDE9FE") : colors.adminSurfaceAlt,
                        borderColor: formAuthorRole === "Faculty" ? "#7C3AED" : colors.adminCardBorder,
                      },
                    ]}
                    onPress={() => {
                      setFormAuthorRole("Faculty");
                      if (formTeacherName.toLowerCase().includes("admin") || formTeacherName.toLowerCase().includes("office")) {
                        setFormTeacherName(teacherName || "Prof. Ganesh Sharma");
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="school" size={16} color={formAuthorRole === "Faculty" ? "#7C3AED" : colors.adminTextSecondary} />
                    <Text style={[styles.roleToggleBtnText, { color: formAuthorRole === "Faculty" ? "#7C3AED" : colors.adminTextSecondary }]}>
                      👨‍🏫 Faculty Member
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.roleToggleBtn,
                      {
                        backgroundColor: formAuthorRole === "Admin" ? (isDark ? "rgba(37,99,235,0.25)" : "#DBEAFE") : colors.adminSurfaceAlt,
                        borderColor: formAuthorRole === "Admin" ? "#2563EB" : colors.adminCardBorder,
                      },
                    ]}
                    onPress={() => {
                      setFormAuthorRole("Admin");
                      if (!formTeacherName.toLowerCase().includes("admin") && !formTeacherName.toLowerCase().includes("cell") && !formTeacherName.toLowerCase().includes("office")) {
                        setFormTeacherName("Admin Academic Office");
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="shield-checkmark" size={16} color={formAuthorRole === "Admin" ? "#2563EB" : colors.adminTextSecondary} />
                    <Text style={[styles.roleToggleBtnText, { color: formAuthorRole === "Admin" ? "#2563EB" : colors.adminTextSecondary }]}>
                      🛡️ Admin Office
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Quick Author Chips */}
                {formAuthorRole === "Faculty" ? (
                  <View style={{ marginBottom: 10 }}>
                    <Text style={{ fontSize: 11, color: colors.adminTextSecondary, marginBottom: 4 }}>
                      Quick Select Faculty Member:
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {(facultyList.length > 0
                        ? facultyList.map((f) => f.name)
                        : ["Prof. Ganesh Sharma", "Dr. Rahul Sharma", "Prof. Kumar", "Dr. Anita Rao", "Prof. Vikram Malhotra"]
                      ).map((facName) => {
                        const isSel = formTeacherName.toLowerCase() === facName.toLowerCase();
                        return (
                          <TouchableOpacity
                            key={facName}
                            style={[
                              styles.subChip,
                              {
                                backgroundColor: isSel ? "#7C3AED" : colors.adminSurfaceAlt,
                                borderColor: isSel ? "#7C3AED" : colors.adminCardBorder,
                              },
                            ]}
                            onPress={() => setFormTeacherName(facName)}
                          >
                            <Text style={{ fontSize: 11, fontWeight: "600", color: isSel ? "#FFFFFF" : colors.adminTextSecondary }}>
                              {facName}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                ) : (
                  <View style={{ marginBottom: 10 }}>
                    <Text style={{ fontSize: 11, color: colors.adminTextSecondary, marginBottom: 4 }}>
                      Quick Select Admin Authority:
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6 }}>
                      {["Admin Academic Office", "Examination Cell", "Dean of Academics", "HOD Office"].map((adminTitle) => {
                        const isSel = formTeacherName.toLowerCase() === adminTitle.toLowerCase();
                        return (
                          <TouchableOpacity
                            key={adminTitle}
                            style={[
                              styles.subChip,
                              {
                                backgroundColor: isSel ? "#2563EB" : colors.adminSurfaceAlt,
                                borderColor: isSel ? "#2563EB" : colors.adminCardBorder,
                              },
                            ]}
                            onPress={() => setFormTeacherName(adminTitle)}
                          >
                            <Text style={{ fontSize: 11, fontWeight: "600", color: isSel ? "#FFFFFF" : colors.adminTextSecondary }}>
                              {adminTitle}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText, marginBottom: 10 }]}
                  value={formTeacherName}
                  onChangeText={setFormTeacherName}
                  placeholder={formAuthorRole === "Faculty" ? "Faculty Author Name & Designation" : "Admin Office / Authority Name"}
                  placeholderTextColor={colors.adminTextSecondary}
                />

                {/* Title */}
                <Text style={[styles.formLabel, { color: colors.adminText }]}>Note / Question Title *</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                  value={formTitle}
                  onChangeText={setFormTitle}
                  placeholder="e.g. Expected 10-Mark Questions: Dynamic Programming"
                  placeholderTextColor={colors.adminTextSecondary}
                />

                {/* Subject Selector & Input */}
                <Text style={[styles.formLabel, { color: colors.adminText, marginTop: 12 }]}>Subject *</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                  value={formSubject}
                  onChangeText={setFormSubject}
                  placeholder="e.g. Data Structures & Algorithms"
                  placeholderTextColor={colors.adminTextSecondary}
                />

                {/* Quick Subject Chips */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }} contentContainerStyle={{ gap: 6 }}>
                  {STANDARD_SUBJECTS.map((sub) => {
                    const isSel = formSubject.toLowerCase() === sub.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={sub}
                        style={[
                          styles.subChip,
                          {
                            backgroundColor: isSel ? "#7C3AED" : colors.adminSurfaceAlt,
                            borderColor: isSel ? "#7C3AED" : colors.adminCardBorder,
                          },
                        ]}
                        onPress={() => setFormSubject(sub)}
                      >
                        <Text style={{ fontSize: 11, fontWeight: "600", color: isSel ? "#FFFFFF" : colors.adminTextSecondary }}>
                          {sub}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {/* Category Selection */}
                <Text style={[styles.formLabel, { color: colors.adminText, marginTop: 12 }]}>Category</Text>
                <View style={styles.catGrid}>
                  {CATEGORIES.map((cat) => {
                    const isSel = formCategory === cat;
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.catPill,
                          {
                            backgroundColor: isSel ? "#7C3AED" : colors.adminSurfaceAlt,
                            borderColor: isSel ? "#7C3AED" : colors.adminCardBorder,
                          },
                        ]}
                        onPress={() => setFormCategory(cat)}
                      >
                        <Text style={{ fontSize: 11.5, fontWeight: "700", color: isSel ? "#FFFFFF" : colors.adminTextSecondary }}>
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Priority Selection */}
                <Text style={[styles.formLabel, { color: colors.adminText, marginTop: 12 }]}>Priority Level</Text>
                <View style={{ flexDirection: "row", gap: 8 }}>
                  {(["High", "Medium", "Normal"] as const).map((prio) => {
                    const isSel = formPriority === prio;
                    const color = prio === "High" ? "#DC2626" : prio === "Medium" ? "#D97706" : "#4F46E5";
                    return (
                      <TouchableOpacity
                        key={prio}
                        style={[
                          styles.prioPill,
                          {
                            borderColor: isSel ? color : colors.adminCardBorder,
                            backgroundColor: isSel
                              ? prio === "High"
                                ? "#FEE2E2"
                                : prio === "Medium"
                                ? "#FEF3C7"
                                : "#E0E7FF"
                              : colors.adminSurfaceAlt,
                          },
                        ]}
                        onPress={() => setFormPriority(prio)}
                      >
                        <Text style={{ fontSize: 12, fontWeight: "700", color: isSel ? color : colors.adminTextSecondary }}>
                          {prio}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                {/* Target Class */}
                <Text style={[styles.formLabel, { color: colors.adminText, marginTop: 12 }]}>Target Class / Batch</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                  value={formTargetClass}
                  onChangeText={setFormTargetClass}
                  placeholder="e.g. CSE - 6th Semester (Sec A & B)"
                  placeholderTextColor={colors.adminTextSecondary}
                />

                {/* Content with Quick Template Chips */}
                <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12, marginBottom: 4 }}>
                  <Text style={[styles.formLabel, { color: colors.adminText, marginBottom: 0 }]}>Questions / Notes Content *</Text>
                  <Text style={{ fontSize: 11, color: "#7C3AED", fontWeight: "700" }}>⚡ Quick Templates</Text>
                </View>

                <View style={styles.templateBar}>
                  {(["10-mark", "formula", "exam-tip", "lab"] as const).map((tKey) => {
                    const tInfo = NOTE_TEMPLATES[tKey];
                    return (
                      <TouchableOpacity
                        key={tKey}
                        style={[
                          styles.templateChip,
                          {
                            backgroundColor: isDark ? "rgba(124,58,237,0.2)" : "#EDE9FE",
                            borderColor: isDark ? "#6D28D9" : "#C4B5FD",
                          },
                        ]}
                        onPress={() => handleApplyTemplate(tKey)}
                      >
                        <Ionicons name="flash-outline" size={11} color="#7C3AED" />
                        <Text style={[styles.templateChipText, { color: "#7C3AED" }]}>{tInfo.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <TextInput
                  style={[
                    styles.modalInput,
                    styles.modalTextArea,
                    { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText },
                  ]}
                  value={formContent}
                  onChangeText={setFormContent}
                  placeholder="Type high-yield questions, formulas, numerical tips, or exam notes..."
                  placeholderTextColor={colors.adminTextSecondary}
                  multiline
                />

                {/* PHOTO / DIAGRAM / WHITEBOARD NOTES SYSTEM */}
                <View style={[styles.attachmentBox, { backgroundColor: colors.adminSurfaceAlt, borderColor: colors.adminCardBorder }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Ionicons name="image" size={17} color="#7C3AED" />
                      <Text style={[styles.attachTitle, { color: colors.adminText }]}>Visual Notes & Whiteboard Diagrams</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 11, color: colors.adminTextSecondary, marginTop: 2 }}>
                    Upload diagrams or snap whiteboard/handwritten notes with camera
                  </Text>

                  {Boolean(formPhotoUrl) ? (
                    <View style={{ marginTop: 8 }}>
                      <View style={styles.previewAttachmentRow}>
                        <Image source={{ uri: formPhotoUrl }} style={styles.miniPhotoThumb} />
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={[styles.mediaFilenameText, { color: colors.adminText }]} numberOfLines={1}>
                            {formPhotoName || "Diagram_Attached.jpg"}
                          </Text>
                          <Text style={{ fontSize: 11, color: "#16A34A" }}>✓ Photo Attached & Ready to Save</Text>
                        </View>
                      </View>

                      {/* Replace / View / Remove Action Row */}
                      <View style={styles.replaceActionRow}>
                        <TouchableOpacity
                          style={[styles.actionSmallBtn, { borderColor: "#7C3AED", backgroundColor: isDark ? "rgba(124,58,237,0.2)" : "#EDE9FE" }]}
                          onPress={handlePickPhoto}
                        >
                          <Ionicons name="images-outline" size={13} color="#7C3AED" />
                          <Text style={[styles.actionSmallBtnText, { color: "#7C3AED" }]}>🔄 Replace (Gallery)</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionSmallBtn, { borderColor: "#7C3AED", backgroundColor: isDark ? "rgba(124,58,237,0.2)" : "#EDE9FE" }]}
                          onPress={handleTakePhoto}
                        >
                          <Ionicons name="camera-outline" size={13} color="#7C3AED" />
                          <Text style={[styles.actionSmallBtnText, { color: "#7C3AED" }]}>📷 Retake (Camera)</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionSmallBtn, { borderColor: colors.adminCardBorder, backgroundColor: colors.adminCard }]}
                          onPress={() => setFullPhotoUrl(formPhotoUrl)}
                        >
                          <Ionicons name="eye-outline" size={13} color={colors.adminText} />
                          <Text style={[styles.actionSmallBtnText, { color: colors.adminText }]}>👁️ View</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionSmallBtn, { borderColor: "#FCA5A5", backgroundColor: isDark ? "rgba(239,68,68,0.15)" : "#FEE2E2" }]}
                          onPress={() => {
                            setFormPhotoUrl("");
                            setFormPhotoName("");
                          }}
                        >
                          <Ionicons name="trash-outline" size={13} color="#EF4444" />
                          <Text style={[styles.actionSmallBtnText, { color: "#EF4444" }]}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View>
                      <View style={styles.uploadBigBtnRow}>
                        <TouchableOpacity
                          style={[styles.uploadBigBtn, { borderColor: "#7C3AED", backgroundColor: isDark ? "rgba(124,58,237,0.2)" : "#EDE9FE" }]}
                          onPress={handlePickPhoto}
                        >
                          <Ionicons name="images-outline" size={16} color="#7C3AED" />
                          <Text style={[styles.uploadBigBtnText, { color: "#7C3AED" }]}>🖼️ Gallery Pick</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.uploadBigBtn, { borderColor: "#7C3AED", backgroundColor: isDark ? "rgba(124,58,237,0.2)" : "#EDE9FE" }]}
                          onPress={handleTakePhoto}
                        >
                          <Ionicons name="camera-outline" size={16} color="#7C3AED" />
                          <Text style={[styles.uploadBigBtnText, { color: "#7C3AED" }]}>📷 Snap Whiteboard</Text>
                        </TouchableOpacity>
                      </View>

                      <TextInput
                        style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText, marginTop: 8 }]}
                        value={formPhotoUrl}
                        onChangeText={(val) => {
                          setFormPhotoUrl(val);
                          if (!formPhotoName && val) setFormPhotoName("Diagram_Image.jpg");
                        }}
                        placeholder="Or paste direct diagram image URL..."
                        placeholderTextColor={colors.adminTextSecondary}
                      />
                    </View>
                  )}
                </View>

                {/* PDF DOCUMENT SYSTEM IN MODAL */}
                <View style={[styles.attachmentBox, { backgroundColor: colors.adminSurfaceAlt, borderColor: colors.adminCardBorder, marginTop: 10 }]}>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Ionicons name="document-text" size={17} color="#DC2626" />
                      <Text style={[styles.attachTitle, { color: colors.adminText }]}>Notes PDF & Document Attachment</Text>
                    </View>
                  </View>
                  <Text style={{ fontSize: 11, color: colors.adminTextSecondary, marginTop: 2 }}>
                    Upload questions PDF, handwritten notes scan, or formula cheatsheet
                  </Text>

                  {Boolean(formPdfUrl) ? (
                    <View style={{ marginTop: 8 }}>
                      <View style={styles.previewAttachmentRow}>
                        <View style={[styles.pdfIconCircle, { width: 34, height: 34 }]}>
                          <Ionicons name="document-text" size={18} color="#DC2626" />
                        </View>
                        <View style={{ flex: 1, marginLeft: 10 }}>
                          <Text style={[styles.mediaFilenameText, { color: colors.adminText }]} numberOfLines={1}>
                            {formPdfName || "Document.pdf"}
                          </Text>
                          <Text style={{ fontSize: 11, color: "#16A34A" }}>✓ PDF Document Attached & Ready</Text>
                        </View>
                      </View>

                      {/* Replace / Preview / Remove Action Row */}
                      <View style={styles.replaceActionRow}>
                        <TouchableOpacity
                          style={[styles.actionSmallBtn, { borderColor: "#DC2626", backgroundColor: isDark ? "rgba(239,68,68,0.15)" : "#FEE2E2" }]}
                          onPress={handlePickPdf}
                        >
                          <Ionicons name="cloud-upload-outline" size={13} color="#DC2626" />
                          <Text style={[styles.actionSmallBtnText, { color: "#DC2626" }]}>🔄 Change / Replace PDF</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionSmallBtn, { borderColor: colors.adminCardBorder, backgroundColor: colors.adminCard }]}
                          onPress={() => handlePreviewDocument(formPdfUrl, formPdfName)}
                        >
                          <Ionicons name="open-outline" size={13} color={colors.adminText} />
                          <Text style={[styles.actionSmallBtnText, { color: colors.adminText }]}>👁️ Preview</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[styles.actionSmallBtn, { borderColor: "#FCA5A5", backgroundColor: isDark ? "rgba(239,68,68,0.15)" : "#FEE2E2" }]}
                          onPress={() => {
                            setFormPdfUrl("");
                            setFormPdfName("");
                          }}
                        >
                          <Ionicons name="trash-outline" size={13} color="#EF4444" />
                          <Text style={[styles.actionSmallBtnText, { color: "#EF4444" }]}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ) : (
                    <View>
                      <TouchableOpacity
                        style={[
                          styles.uploadBigBtn,
                          {
                            borderColor: "#DC2626",
                            backgroundColor: isDark ? "rgba(239,68,68,0.15)" : "#FEF2F2",
                            marginTop: 8,
                          },
                        ]}
                        onPress={handlePickPdf}
                        disabled={uploadingMedia}
                      >
                        {uploadingMedia ? (
                          <ActivityIndicator size="small" color="#DC2626" />
                        ) : (
                          <>
                            <Ionicons name="cloud-upload-outline" size={16} color="#DC2626" />
                            <Text style={[styles.uploadBigBtnText, { color: "#DC2626" }]}>📄 Upload Notes PDF Document</Text>
                          </>
                        )}
                      </TouchableOpacity>

                      <TextInput
                        style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText, marginTop: 8 }]}
                        value={formPdfUrl}
                        onChangeText={(val) => {
                          setFormPdfUrl(val);
                          if (!formPdfName && val) setFormPdfName("Special_Notes.pdf");
                        }}
                        placeholder="Or paste PDF document URL..."
                        placeholderTextColor={colors.adminTextSecondary}
                      />
                    </View>
                  )}
                </View>
              </ScrollView>

              {/* Modal Action Buttons */}
              <View style={[styles.modalFooterRow, { borderTopColor: colors.adminCardBorder }]}>
                {editingNote && (
                  <TouchableOpacity
                    style={[styles.modalDeleteBtn, isDark && { backgroundColor: "rgba(239,68,68,0.2)" }]}
                    onPress={() => handleDeleteNote(editingNote)}
                    disabled={savingNote}
                  >
                    <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    <Text style={styles.modalDeleteBtnText}>Delete</Text>
                  </TouchableOpacity>
                )}

                <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginLeft: "auto" }}>
                  <TouchableOpacity
                    style={[styles.modalCancelBtn, { backgroundColor: colors.adminSurfaceAlt }]}
                    onPress={() => setModalOpen(false)}
                    disabled={savingNote}
                  >
                    <Text style={[styles.modalCancelBtnText, { color: colors.adminTextSecondary }]}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity style={styles.modalSaveBtn} onPress={handleSaveNote} disabled={savingNote}>
                    {savingNote ? (
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                        <Text style={styles.modalSaveBtnText}>{uploadStatusMsg || "Saving..."}</Text>
                      </View>
                    ) : (
                      <Text style={styles.modalSaveBtnText}>
                        {editingNote ? "Update & Save Note" : "Upload & Publish Special Note"}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* FULL PHOTO VIEWER MODAL */}
      <Modal visible={Boolean(fullPhotoUrl)} transparent animationType="fade" onRequestClose={() => setFullPhotoUrl(null)}>
        <View style={styles.fullPhotoBackdrop}>
          <TouchableOpacity style={styles.closeFullPhotoBtn} onPress={() => setFullPhotoUrl(null)}>
            <Ionicons name="close-circle" size={32} color="#FFFFFF" />
          </TouchableOpacity>
          {Boolean(fullPhotoUrl) && (
            <Image source={{ uri: fullPhotoUrl! }} style={styles.fullPhotoImg} resizeMode="contain" />
          )}
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerLeftRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  pageTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  pageSubtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  countPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countPillText: {
    fontSize: 11.5,
    fontWeight: "800",
    color: "#7C3AED",
  },
  addNoteBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#7C3AED",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addNoteBtnText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "700",
  },

  scrollContainer: {
    padding: 16,
    paddingBottom: 40,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 44,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13,
  },

  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  subjectPillsRow: {
    gap: 8,
    paddingBottom: 4,
  },
  subjectPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  subjectPillText: {
    fontSize: 12,
  },
  subjectPillBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  subjectPillBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },

  categoryPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  categoryPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  categoryPillText: {
    fontSize: 11.5,
  },

  centerLoading: {
    paddingVertical: 40,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 13,
    marginTop: 8,
  },

  emptyCard: {
    alignItems: "center",
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 20,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 12.5,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 16,
    maxWidth: 320,
  },

  notesGrid: {
    gap: 14,
  },
  noteCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  priorityBadgeText: {
    fontSize: 11,
    fontWeight: "800",
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  categoryBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#7C3AED",
  },
  classBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  classBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },

  subjectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  subjectRowText: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#7C3AED",
  },

  noteTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginBottom: 6,
    lineHeight: 20,
  },
  noteContent: {
    fontSize: 12.5,
    lineHeight: 19,
    marginBottom: 12,
  },

  photoContainer: {
    marginBottom: 12,
    borderRadius: 10,
    overflow: "hidden",
  },
  photoPreview: {
    width: "100%",
    height: 180,
    borderRadius: 10,
  },
  photoZoomBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.65)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  photoZoomBadgeText: {
    color: "#FFFFFF",
    fontSize: 10.5,
    fontWeight: "700",
  },
  mediaFilenameText: {
    fontSize: 11,
    marginTop: 4,
  },

  pdfCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginBottom: 12,
  },
  pdfIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  pdfNameText: {
    fontSize: 13,
    fontWeight: "700",
  },
  pdfSubText: {
    fontSize: 11,
    color: "#DC2626",
    marginTop: 2,
  },
  pdfOpenBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  pdfOpenBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#DC2626",
  },

  authorRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    paddingTop: 10,
  },
  authorText: {
    fontSize: 11.5,
  },

  cardActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: "#EDE9FE",
  },
  editBtnText: {
    color: "#7C3AED",
    fontSize: 11.5,
    fontWeight: "700",
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    backgroundColor: "#FEE2E2",
  },
  deleteBtnText: {
    color: "#EF4444",
    fontSize: 11.5,
    fontWeight: "700",
  },

  /* Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 580,
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    maxHeight: "92%",
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  modalHeading: {
    fontSize: 17,
    fontWeight: "800",
  },
  modalSubheading: {
    fontSize: 11.5,
    marginTop: 2,
  },
  modalCloseBtn: {
    padding: 6,
  },

  formLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  modalTextArea: {
    minHeight: 88,
    textAlignVertical: "top",
  },

  subChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },

  catGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  catPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },

  prioPill: {
    flex: 1,
    paddingVertical: 7,
    alignItems: "center",
    borderRadius: 8,
    borderWidth: 1,
  },

  attachmentBox: {
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  attachTitle: {
    fontSize: 12.5,
    fontWeight: "700",
  },
  pickAttachBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderColor: "#7C3AED",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pickAttachBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#7C3AED",
  },
  previewAttachmentRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
  },
  miniPhotoThumb: {
    width: 44,
    height: 44,
    borderRadius: 6,
  },
  removeMediaBtn: {
    padding: 6,
  },

  roleToggleRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 6,
    marginBottom: 8,
  },
  roleToggleBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 9,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  roleToggleBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  templateBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 8,
  },
  templateChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
  },
  templateChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  replaceActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 8,
  },
  actionSmallBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  actionSmallBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },
  uploadBigBtnRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  uploadBigBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  uploadBigBtnText: {
    fontSize: 11.5,
    fontWeight: "700",
  },

  modalFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    paddingTop: 14,
    marginTop: 14,
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
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalCancelBtnText: {
    fontSize: 12.5,
    fontWeight: "600",
  },
  modalSaveBtn: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  modalSaveBtnText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "700",
  },

  /* Full Photo Modal */
  fullPhotoBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  closeFullPhotoBtn: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
  },
  fullPhotoImg: {
    width: "92%",
    height: "80%",
  },
});
