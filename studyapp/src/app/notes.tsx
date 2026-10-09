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
import { shareOrDownloadPdf } from "../services/certificatePdfService";

const BLUE = "#1976E8";
const DARK_BLUE = "#082D78";
const TEXT = "#10245A";
const MUTED = "#68758B";
const WHITE = "#FFFFFF";
const BACKGROUND = "#F7F9FC";
const BORDER = "#E1E6EF";
const RED = "#E84B58";
const GREEN = "#11A875";

type PersonalNote = {
  id: string;
  title: string;
  content: string;
  subject: string;
  createdAt?: any;
  updatedAt?: any;
};

export type FacultySpecialNote = {
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
  targetClass?: string;
  createdAt?: any;
};

const CATEGORIES = [
  "All",
  "Important Question",
  "Exam Special Note",
  "Formula Sheet",
  "Lab Guideline",
];

const SUBJECTS = [
  "All",
  "Data Structures & Algorithms",
  "Operating Systems",
  "DBMS",
  "Computer Networks",
  "Mathematics",
  "Python Programming",
  "Software Engineering",
  "Web Technologies",
  "Other",
];

export default function NotesScreen() {
  const { width } = useWindowDimensions();
  const { colors, isDark } = useAppTheme();

  // Top Tab Switcher: Faculty Special Notes vs Personal Notes
  const [activeTab, setActiveTab] = useState<"faculty" | "personal">("faculty");

  // Faculty Special Notes
  const [facultyNotes, setFacultyNotes] = useState<FacultySpecialNote[]>([]);
  const [loadingFaculty, setLoadingFaculty] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Full-screen photo modal
  const [fullPhotoUrl, setFullPhotoUrl] = useState<string | null>(null);

  // Personal Notes
  const [notes, setNotes] = useState<PersonalNote[]>([]);
  const [loadingPersonal, setLoadingPersonal] = useState(true);
  const [saving, setSaving] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("All");

  const [modalVisible, setModalVisible] = useState(false);
  const [editingNote, setEditingNote] = useState<PersonalNote | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [subject, setSubject] = useState("");

  /*
   * ==========================================
   * 1. LOAD FACULTY SPECIAL NOTES FROM FIRESTORE
   * ==========================================
   */
  useEffect(() => {
    const notesRef = collection(db, "specialNotes");
    const q = query(notesRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        const loaded: FacultySpecialNote[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            title: data.title || "Special Note",
            subject: data.subject || "Computer Science",
            category: data.category || "Important Question",
            priority: data.priority || "High",
            content: data.content || "",
            photoUrl: data.photoUrl || undefined,
            photoName: data.photoName || undefined,
            pdfUrl: data.pdfUrl || undefined,
            pdfName: data.pdfName || undefined,
            teacherName: data.teacherName || "Faculty Member",
            targetClass: data.targetClass || "All Students",
            createdAt: data.createdAt,
          };
        });
        setFacultyNotes(loaded);
        setLoadingFaculty(false);
      },
      (err) => {
        console.warn("Faculty special notes error:", err.message);
        setLoadingFaculty(false);
      }
    );

    return () => unsubscribe();
  }, []);

  /*
   * ==========================================
   * 2. LOAD PERSONAL NOTES
   * ==========================================
   */
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user) {
        setNotes([]);
        setLoadingPersonal(false);
        return;
      }

      const notesRef = collection(db, "users", user.uid, "notes");
      const unsubscribeSnapshot = onSnapshot(
        notesRef,
        (snapshot) => {
          const loadedNotes: PersonalNote[] = [];
          snapshot.forEach((item) => {
            const data = item.data();
            loadedNotes.push({
              id: item.id,
              title: String(data.title || "Untitled Note"),
              content: String(data.content || ""),
              subject: String(data.subject || "Other"),
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
            });
          });

          loadedNotes.sort((a, b) => {
            const aTime = a.updatedAt?.toMillis?.() || a.createdAt?.toMillis?.() || 0;
            const bTime = b.updatedAt?.toMillis?.() || b.createdAt?.toMillis?.() || 0;
            return bTime - aTime;
          });

          setNotes(loadedNotes);
          setLoadingPersonal(false);
        },
        (error) => {
          console.error("Personal notes loading error:", error);
          setLoadingPersonal(false);
        }
      );

      return unsubscribeSnapshot;
    });

    return unsubscribeAuth;
  }, []);

  /*
   * Filtered Faculty Notes
   */
  const filteredFacultyNotes = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    return facultyNotes.filter((note) => {
      const matchCategory = selectedCategory === "All" || note.category === selectedCategory;
      const matchSubject = selectedSubject === "All" || note.subject === selectedSubject;
      const matchSearch =
        !search ||
        note.title.toLowerCase().includes(search) ||
        note.content.toLowerCase().includes(search) ||
        note.subject.toLowerCase().includes(search) ||
        (note.targetClass && note.targetClass.toLowerCase().includes(search));
      return matchCategory && matchSubject && matchSearch;
    });
  }, [facultyNotes, selectedCategory, selectedSubject, searchText]);

  /*
   * Filtered Personal Notes
   */
  const filteredPersonalNotes = useMemo(() => {
    const search = searchText.trim().toLowerCase();
    return notes.filter((note) => {
      const matchesSubject = selectedSubject === "All" || note.subject === selectedSubject;
      const matchesSearch =
        !search ||
        note.title.toLowerCase().includes(search) ||
        note.content.toLowerCase().includes(search) ||
        note.subject.toLowerCase().includes(search);
      return matchesSubject && matchesSearch;
    });
  }, [notes, searchText, selectedSubject]);

  const openAddModal = () => {
    setEditingNote(null);
    setTitle("");
    setContent("");
    setSubject("");
    setModalVisible(true);
  };

  const openEditModal = (note: PersonalNote) => {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setSubject(note.subject);
    setModalVisible(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalVisible(false);
    setEditingNote(null);
    setTitle("");
    setContent("");
    setSubject("");
  };

  const saveNote = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Login required", "Please log in to save notes.");
      router.replace("/login");
      return;
    }

    const cleanTitle = title.trim();
    const cleanContent = content.trim();
    const cleanSubject = subject.trim() || "Other";

    if (!cleanTitle) {
      Alert.alert("Title required", "Please enter a title for your note.");
      return;
    }
    if (!cleanContent) {
      Alert.alert("Note required", "Please enter some note content.");
      return;
    }

    setSaving(true);
    try {
      if (editingNote) {
        await updateDoc(doc(db, "users", user.uid, "notes", editingNote.id), {
          title: cleanTitle,
          content: cleanContent,
          subject: cleanSubject,
          updatedAt: serverTimestamp(),
        });
      } else {
        await addDoc(collection(db, "users", user.uid, "notes"), {
          title: cleanTitle,
          content: cleanContent,
          subject: cleanSubject,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      closeModal();
    } catch (error) {
      console.error("Save note error:", error);
      Alert.alert("Error", "Unable to save note. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const deleteNote = (note: PersonalNote) => {
    Alert.alert("Delete note", `Delete "${note.title}"?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          const user = auth.currentUser;
          if (!user) return;
          try {
            await deleteDoc(doc(db, "users", user.uid, "notes", note.id));
          } catch (error) {
            console.error("Delete note error:", error);
          }
        },
      },
    ]);
  };

  const formatDate = (value: any) => {
    try {
      if (!value) return "Recently added";
      let date: Date | null = null;
      if (typeof value?.toDate === "function") date = value.toDate();
      else if (value instanceof Date) date = value;
      else if (typeof value === "string") date = new Date(value);

      if (!date || Number.isNaN(date.getTime())) return "Recently added";
      return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return "Recently added";
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.background }]} edges={["top"]}>
      <View style={styles.container}>
        {/* HEADER */}
        <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
            <TouchableOpacity onPress={() => router.back()} style={{ padding: 4 }}>
              <Ionicons name="arrow-back" size={22} color={colors.text} />
            </TouchableOpacity>
            <View>
              <Text style={[styles.title, { color: colors.text }]}>Study & Exam Notes</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {activeTab === "faculty"
                  ? "High-Yield Questions, Formula Sheets & Diagrams from Teachers"
                  : "Keep your personal revision notes organized"}
              </Text>
            </View>
          </View>

          {activeTab === "personal" && (
            <Pressable style={styles.addButton} onPress={openAddModal}>
              <Ionicons name="add" size={22} color={WHITE} />
            </Pressable>
          )}
        </View>

        {/* TAB SEGMENT: Faculty Special Notes vs My Personal Notes */}
        <View style={[styles.tabSegmentBar, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === "faculty" && styles.segmentBtnActive]}
            onPress={() => setActiveTab("faculty")}
          >
            <Ionicons
              name="bookmark"
              size={15}
              color={activeTab === "faculty" ? "#FFFFFF" : colors.textSecondary}
            />
            <Text style={[styles.segmentBtnText, activeTab === "faculty" && styles.segmentBtnTextActive]}>
              Faculty Special Notes ({facultyNotes.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.segmentBtn, activeTab === "personal" && styles.segmentBtnActive]}
            onPress={() => setActiveTab("personal")}
          >
            <Ionicons
              name="create-outline"
              size={15}
              color={activeTab === "personal" ? "#FFFFFF" : colors.textSecondary}
            />
            <Text style={[styles.segmentBtnText, activeTab === "personal" && styles.segmentBtnTextActive]}>
              My Private Notes ({notes.length})
            </Text>
          </TouchableOpacity>
        </View>

        {/* SEARCH & FILTERS */}
        <View style={[styles.searchFilterBox, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
          <View
            style={[
              styles.searchContainer,
              {
                backgroundColor: isDark ? "#1E293B" : "#F1F5F9",
                borderColor: colors.border,
              },
            ]}
          >
            <Ionicons name="search-outline" size={17} color={colors.textSecondary} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder={
                activeTab === "faculty"
                  ? "Search special notes, questions, formulas..."
                  : "Search your private notes..."
              }
              placeholderTextColor={colors.textSecondary}
              value={searchText}
              onChangeText={setSearchText}
              autoCapitalize="none"
            />
            {searchText.length > 0 && (
              <Pressable onPress={() => setSearchText("")}>
                <Ionicons name="close-circle" size={18} color="#AAB2BF" />
              </Pressable>
            )}
          </View>

          {/* Category Chips for Faculty Notes */}
          {activeTab === "faculty" ? (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {CATEGORIES.map((cat) => {
                const count = cat === "All" ? facultyNotes.length : facultyNotes.filter((n) => n.category === cat).length;
                const active = selectedCategory === cat;
                return (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.catChip, active && styles.catChipActive, { borderColor: colors.border }]}
                    onPress={() => setSelectedCategory(cat)}
                  >
                    <Text style={[styles.catChipText, active && styles.catChipTextActive]}>
                      {cat} ({count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipScroll}>
              {SUBJECTS.map((item) => {
                const active = selectedSubject === item;
                return (
                  <Pressable
                    key={item}
                    style={[styles.catChip, active && styles.catChipActive, { borderColor: colors.border }]}
                    onPress={() => setSelectedSubject(item)}
                  >
                    <Text style={[styles.catChipText, active && styles.catChipTextActive]}>
                      {item}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          )}
        </View>

        {/* MAIN BODY SCROLL */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
        >
          {activeTab === "faculty" ? (
            /* =======================================================
               FACULTY SPECIAL NOTES LIST
               ======================================================= */
            loadingFaculty ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={BLUE} />
                <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                  Loading faculty special notes...
                </Text>
              </View>
            ) : filteredFacultyNotes.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Ionicons name="bookmark-outline" size={40} color={colors.textSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No Faculty Notes Found</Text>
                <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                  Teachers haven't published notes for this filter yet. Check other subjects or categories.
                </Text>
              </View>
            ) : (
              <View style={styles.notesGrid}>
                {filteredFacultyNotes.map((item) => (
                  <View
                    key={item.id}
                    style={[
                      styles.facultyNoteCard,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                      },
                    ]}
                  >
                    {/* Top Row: Category badge & Priority */}
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

                      {item.priority === "High" && (
                        <View style={styles.priorityBadge}>
                          <Text style={styles.priorityBadgeText}>🔥 High Yield</Text>
                        </View>
                      )}
                    </View>

                    {/* Title */}
                    <Text style={[styles.facultyNoteTitle, { color: colors.text }]}>{item.title}</Text>

                    {/* Subject & Target Class */}
                    <View style={styles.subInfoRow}>
                      <Ionicons name="book-outline" size={12} color="#059669" />
                      <Text style={styles.subInfoText}>{item.subject}</Text>
                      {item.targetClass ? (
                        <>
                          <Text style={styles.dotSeparator}>•</Text>
                          <Text style={[styles.targetClassText, { color: colors.textSecondary }]}>
                            {item.targetClass}
                          </Text>
                        </>
                      ) : null}
                    </View>

                    {/* Content Text */}
                    <Text style={[styles.facultyNoteContent, { color: colors.text }]} numberOfLines={6}>
                      {item.content}
                    </Text>

                    {/* Diagram Photo Thumbnail if available */}
                    {item.photoUrl ? (
                      <TouchableOpacity
                        style={styles.photoBox}
                        onPress={() => setFullPhotoUrl(item.photoUrl || null)}
                        activeOpacity={0.85}
                      >
                        <Image source={{ uri: item.photoUrl }} style={styles.photoImg} resizeMode="cover" />
                        <View style={styles.photoOverlayBadge}>
                          <Ionicons name="eye-outline" size={12} color="#FFFFFF" />
                          <Text style={styles.photoOverlayText}>Tap to View & Zoom Diagram Photo</Text>
                        </View>
                      </TouchableOpacity>
                    ) : null}

                    {/* PDF Attachment Pill if available */}
                    {item.pdfUrl ? (
                      <TouchableOpacity
                        style={styles.pdfDownloadPill}
                        onPress={() => shareOrDownloadPdf(item.pdfUrl!, item.pdfName || "FacultyNote.pdf")}
                        activeOpacity={0.85}
                      >
                        <Ionicons name="document-text" size={16} color="#DC2626" />
                        <View style={{ flex: 1 }}>
                          <Text style={styles.pdfPillTitle} numberOfLines={1}>
                            {item.pdfName || "Attached PDF Notes"}
                          </Text>
                          <Text style={styles.pdfPillSub}>Official faculty study material</Text>
                        </View>
                        <View style={styles.pdfDownloadBtn}>
                          <Ionicons name="download-outline" size={13} color="#2563EB" />
                          <Text style={styles.pdfDownloadBtnText}>Download</Text>
                        </View>
                      </TouchableOpacity>
                    ) : null}

                    {/* Footer Info */}
                    <View style={[styles.cardFooterRow, { borderTopColor: colors.border }]}>
                      <View style={styles.teacherInfoRow}>
                        <Ionicons name="person-circle-outline" size={15} color={colors.textSecondary} />
                        <Text style={[styles.teacherNameText, { color: colors.textSecondary }]}>
                          {item.teacherName || "Faculty"}
                        </Text>
                      </View>
                      <Text style={[styles.dateText, { color: colors.textSecondary }]}>
                        {formatDate(item.createdAt)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )
          ) : (
            /* =======================================================
               PERSONAL NOTES LIST
               ======================================================= */
            <>
              {loadingPersonal && (
                <View style={styles.loadingContainer}>
                  <ActivityIndicator size="large" color={BLUE} />
                  <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
                    Loading personal notes...
                  </Text>
                </View>
              )}

              {!loadingPersonal && filteredPersonalNotes.length === 0 && (
                <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Ionicons name="document-text-outline" size={38} color={BLUE} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>No private notes yet</Text>
                  <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                    Create your first study note to organize revision points.
                  </Text>
                  <Pressable style={styles.emptyButton} onPress={openAddModal}>
                    <Ionicons name="add" size={18} color={WHITE} />
                    <Text style={styles.emptyButtonText}>Create Note</Text>
                  </Pressable>
                </View>
              )}

              {!loadingPersonal &&
                filteredPersonalNotes.map((note) => (
                  <View key={note.id} style={[styles.personalNoteCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.noteTop}>
                      <View style={styles.noteIcon}>
                        <Ionicons name="document-text" size={20} color={BLUE} />
                      </View>

                      <View style={styles.noteMain}>
                        <Text style={[styles.personalNoteTitle, { color: colors.text }]} numberOfLines={2}>
                          {note.title}
                        </Text>
                        <View style={styles.noteMeta}>
                          <View style={styles.subjectBadge}>
                            <Text style={styles.subjectBadgeText}>{note.subject}</Text>
                          </View>
                          <Text style={[styles.noteDate, { color: colors.textSecondary }]}>
                            {formatDate(note.updatedAt || note.createdAt)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <Text style={[styles.personalNoteContent, { color: colors.text }]} numberOfLines={4}>
                      {note.content}
                    </Text>

                    <View style={[styles.noteActions, { borderTopColor: colors.border }]}>
                      <Pressable style={styles.editButton} onPress={() => openEditModal(note)}>
                        <Ionicons name="create-outline" size={15} color={BLUE} />
                        <Text style={styles.editButtonText}>Edit</Text>
                      </Pressable>

                      <Pressable style={styles.deleteButton} onPress={() => deleteNote(note)}>
                        <Ionicons name="trash-outline" size={15} color={RED} />
                        <Text style={styles.deleteButtonText}>Delete</Text>
                      </Pressable>
                    </View>
                  </View>
                ))}
            </>
          )}
        </ScrollView>

        {/* FULL PHOTO VIEWER MODAL */}
        <Modal visible={!!fullPhotoUrl} transparent animationType="fade" onRequestClose={() => setFullPhotoUrl(null)}>
          <View style={styles.photoOverlay}>
            <TouchableOpacity style={styles.photoCloseBtn} onPress={() => setFullPhotoUrl(null)}>
              <Ionicons name="close-circle" size={34} color="#FFFFFF" />
            </TouchableOpacity>
            {fullPhotoUrl ? (
              <Image source={{ uri: fullPhotoUrl }} style={styles.fullPhotoImg} resizeMode="contain" />
            ) : null}
            <View style={styles.photoActionRow}>
              <TouchableOpacity
                style={styles.photoDownloadBtn}
                onPress={() => {
                  if (fullPhotoUrl) {
                    shareOrDownloadPdf(fullPhotoUrl, "Exam_Diagram.jpg");
                  }
                }}
              >
                <Ionicons name="download-outline" size={16} color="#FFFFFF" />
                <Text style={styles.photoDownloadText}>Download Diagram</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ADD / EDIT PERSONAL NOTE MODAL */}
        <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={closeModal}>
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={styles.modalKeyboard}
            >
              <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    {editingNote ? "Edit Note" : "Create Note"}
                  </Text>
                  <Pressable onPress={closeModal}>
                    <Ionicons name="close" size={22} color={colors.textSecondary} />
                  </Pressable>
                </View>

                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  placeholder="Note Title *"
                  placeholderTextColor={colors.textSecondary}
                  value={title}
                  onChangeText={setTitle}
                />

                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  placeholder="Subject (e.g. Data Structures)"
                  placeholderTextColor={colors.textSecondary}
                  value={subject}
                  onChangeText={setSubject}
                />

                <TextInput
                  style={[
                    styles.modalTextarea,
                    {
                      backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                      borderColor: colors.border,
                      color: colors.text,
                    },
                  ]}
                  placeholder="Note content..."
                  placeholderTextColor={colors.textSecondary}
                  value={content}
                  onChangeText={setContent}
                  multiline
                  numberOfLines={6}
                  textAlignVertical="top"
                />

                <View style={styles.modalActions}>
                  <Pressable style={styles.cancelButton} onPress={closeModal}>
                    <Text style={[styles.cancelText, { color: colors.textSecondary }]}>Cancel</Text>
                  </Pressable>
                  <Pressable style={styles.saveButton} onPress={saveNote} disabled={saving}>
                    {saving ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.saveText}>{editingNote ? "Update" : "Save Note"}</Text>
                    )}
                  </Pressable>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: { fontSize: 16, fontWeight: "800" },
  subtitle: { fontSize: 11, marginTop: 1 },
  addButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
  },

  tabSegmentBar: {
    flexDirection: "row",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  segmentBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  segmentBtnActive: { backgroundColor: BLUE },
  segmentBtnText: { fontSize: 11.5, fontWeight: "600", color: "#64748B" },
  segmentBtnTextActive: { color: "#FFFFFF", fontWeight: "700" },

  searchFilterBox: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderBottomWidth: 1,
    gap: 8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  searchInput: { flex: 1, fontSize: 12, padding: 0 },
  chipScroll: { flexDirection: "row" },
  catChip: {
    borderWidth: 1,
    paddingHorizontal: 11,
    paddingVertical: 4,
    borderRadius: 16,
    marginRight: 6,
  },
  catChipActive: { backgroundColor: BLUE, borderColor: BLUE },
  catChipText: { fontSize: 11, fontWeight: "600", color: "#64748B" },
  catChipTextActive: { color: "#FFFFFF", fontWeight: "700" },

  content: { padding: 14, paddingBottom: 40 },
  loadingContainer: { padding: 40, alignItems: "center" },
  loadingText: { marginTop: 10, fontSize: 12 },
  emptyCard: {
    alignItems: "center",
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 16,
  },
  emptyTitle: { fontSize: 15, fontWeight: "800", marginTop: 10 },
  emptyText: { fontSize: 12, textAlign: "center", marginTop: 4, maxWidth: 300 },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: BLUE,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    marginTop: 14,
  },
  emptyButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },

  notesGrid: { gap: 12 },
  facultyNoteCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    gap: 8,
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  catBadgeText: { fontSize: 11, fontWeight: "700", color: "#2563EB" },
  priorityBadge: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priorityBadgeText: { fontSize: 10, fontWeight: "800", color: "#DC2626" },
  facultyNoteTitle: { fontSize: 14, fontWeight: "800" },
  subInfoRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  subInfoText: { fontSize: 11, color: "#059669", fontWeight: "700" },
  dotSeparator: { color: "#94A3B8" },
  targetClassText: { fontSize: 11 },
  facultyNoteContent: { fontSize: 12, lineHeight: 18 },

  photoBox: {
    height: 140,
    borderRadius: 8,
    overflow: "hidden",
    position: "relative",
    marginVertical: 4,
  },
  photoImg: { width: "100%", height: "100%" },
  photoOverlayBadge: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.72)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  photoOverlayText: { color: "#FFFFFF", fontSize: 10.5, fontWeight: "600" },

  pdfDownloadPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#FFF1F2",
    borderWidth: 1,
    borderColor: "#FECDD3",
    padding: 10,
    borderRadius: 8,
    marginVertical: 4,
  },
  pdfPillTitle: { fontSize: 11.5, fontWeight: "700", color: "#991B1B" },
  pdfPillSub: { fontSize: 9.5, color: "#64748B", marginTop: 1 },
  pdfDownloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  pdfDownloadBtnText: { fontSize: 10, fontWeight: "700", color: "#2563EB" },

  cardFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 2,
  },
  teacherInfoRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  teacherNameText: { fontSize: 11, fontWeight: "600" },
  dateText: { fontSize: 10.5 },

  // Personal Notes
  personalNoteCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 10,
    gap: 8,
  },
  noteTop: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  noteIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  noteMain: { flex: 1 },
  personalNoteTitle: { fontSize: 13.5, fontWeight: "700" },
  noteMeta: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  subjectBadge: {
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  subjectBadgeText: { fontSize: 10, color: "#065F46", fontWeight: "700" },
  noteDate: { fontSize: 10 },
  personalNoteContent: { fontSize: 11.5, lineHeight: 16 },
  noteActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    borderTopWidth: 1,
    paddingTop: 8,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  editButtonText: { fontSize: 11, color: BLUE, fontWeight: "600" },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  deleteButtonText: { fontSize: 11, color: RED, fontWeight: "600" },

  // Photo viewer modal
  photoOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.94)",
    justifyContent: "center",
    alignItems: "center",
    padding: 14,
  },
  photoCloseBtn: { position: "absolute", top: 40, right: 20, zIndex: 10 },
  fullPhotoImg: { width: "100%", height: "76%" },
  photoActionRow: { marginTop: 14 },
  photoDownloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: BLUE,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  photoDownloadText: { color: "#FFFFFF", fontWeight: "700", fontSize: 12 },

  // Add/Edit Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalKeyboard: { width: "100%", maxWidth: 440 },
  modalCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
    gap: 10,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: { fontSize: 15, fontWeight: "800" },
  modalInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
  },
  modalTextarea: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    fontSize: 12,
    minHeight: 80,
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 6,
  },
  cancelButton: { paddingHorizontal: 12, paddingVertical: 6 },
  cancelText: { fontSize: 12, fontWeight: "600" },
  saveButton: {
    backgroundColor: BLUE,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 6,
  },
  saveText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
});