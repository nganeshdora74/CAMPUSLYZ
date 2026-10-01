import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { auth, db } from "../firebase/config";

const BLUE = "#1976E8";
const DARK_BLUE = "#082D78";
const TEXT = "#10245A";
const MUTED = "#68758B";
const WHITE = "#FFFFFF";
const BACKGROUND = "#F7F9FC";
const BORDER = "#E1E6EF";
const RED = "#E84B58";
const GREEN = "#11A875";

type Note = {
  id: string;
  title: string;
  content: string;
  subject: string;
  createdAt?: any;
  updatedAt?: any;
};

const SUBJECTS = [
  "All",
  "Data Structures",
  "Database Management Systems",
  "Operating Systems",
  "Computer Networks",
  "Object Oriented Programming",
  "Software Engineering",
  "Engineering Mathematics",
  "Artificial Intelligence",
  "Other",
];

export default function NotesScreen() {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [searchText, setSearchText] = useState("");
  const [selectedSubject, setSelectedSubject] =
    useState("All");

  const [modalVisible, setModalVisible] =
    useState(false);

  const [editingNote, setEditingNote] =
    useState<Note | null>(null);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [subject, setSubject] = useState("");

  /*
   * ==========================================
   * LOAD NOTES
   * ==========================================
   *
   * Firestore:
   *
   * users/{uid}/notes/{noteId}
   */
  useEffect(() => {
    const unsubscribeAuth =
      auth.onAuthStateChanged((user) => {
        if (!user) {
          setNotes([]);
          setLoading(false);
          return;
        }

        const notesRef = collection(
          db,
          "users",
          user.uid,
          "notes"
        );

        const unsubscribeSnapshot =
          onSnapshot(
            notesRef,
            (snapshot) => {
              const loadedNotes: Note[] = [];

              snapshot.forEach((item) => {
                const data = item.data();

                loadedNotes.push({
                  id: item.id,
                  title: String(
                    data.title || "Untitled Note"
                  ),
                  content: String(
                    data.content || ""
                  ),
                  subject: String(
                    data.subject || "Other"
                  ),
                  createdAt: data.createdAt,
                  updatedAt: data.updatedAt,
                });
              });

              loadedNotes.sort((a, b) => {
                const aTime =
                  a.updatedAt?.toMillis?.() ||
                  a.createdAt?.toMillis?.() ||
                  0;

                const bTime =
                  b.updatedAt?.toMillis?.() ||
                  b.createdAt?.toMillis?.() ||
                  0;

                return bTime - aTime;
              });

              setNotes(loadedNotes);
              setLoading(false);
            },
            (error) => {
              console.error(
                "Notes loading error:",
                error
              );

              setLoading(false);

              Alert.alert(
                "Unable to load notes",
                "Please check your internet connection and try again."
              );
            }
          );

        return unsubscribeSnapshot;
      });

    return unsubscribeAuth;
  }, []);

  /*
   * ==========================================
   * FILTER NOTES
   * ==========================================
   */

  const filteredNotes = useMemo(() => {
    const search = searchText
      .trim()
      .toLowerCase();

    return notes.filter((note) => {
      const matchesSubject =
        selectedSubject === "All" ||
        note.subject === selectedSubject;

      const matchesSearch =
        !search ||
        note.title
          .toLowerCase()
          .includes(search) ||
        note.content
          .toLowerCase()
          .includes(search) ||
        note.subject
          .toLowerCase()
          .includes(search);

      return (
        matchesSubject && matchesSearch
      );
    });
  }, [
    notes,
    searchText,
    selectedSubject,
  ]);

  /*
   * ==========================================
   * MODAL
   * ==========================================
   */

  const openAddModal = () => {
    setEditingNote(null);
    setTitle("");
    setContent("");
    setSubject("");
    setModalVisible(true);
  };

  const openEditModal = (note: Note) => {
    setEditingNote(note);
    setTitle(note.title);
    setContent(note.content);
    setSubject(note.subject);
    setModalVisible(true);
  };

  const closeModal = () => {
    if (saving) {
      return;
    }

    setModalVisible(false);
    setEditingNote(null);
    setTitle("");
    setContent("");
    setSubject("");
  };

  /*
   * ==========================================
   * SAVE NOTE
   * ==========================================
   */

  const saveNote = async () => {
    const user = auth.currentUser;

    if (!user) {
      Alert.alert(
        "Login required",
        "Please log in to save notes."
      );

      router.replace("/login");
      return;
    }

    const cleanTitle = title.trim();
    const cleanContent = content.trim();
    const cleanSubject =
      subject.trim() || "Other";

    if (!cleanTitle) {
      Alert.alert(
        "Title required",
        "Please enter a title for your note."
      );
      return;
    }

    if (!cleanContent) {
      Alert.alert(
        "Note required",
        "Please enter some note content."
      );
      return;
    }

    setSaving(true);

    try {
      if (editingNote) {
        await updateDoc(
          doc(
            db,
            "users",
            user.uid,
            "notes",
            editingNote.id
          ),
          {
            title: cleanTitle,
            content: cleanContent,
            subject: cleanSubject,
            updatedAt: serverTimestamp(),
          }
        );
      } else {
        await addDoc(
          collection(
            db,
            "users",
            user.uid,
            "notes"
          ),
          {
            title: cleanTitle,
            content: cleanContent,
            subject: cleanSubject,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }
        );
      }

      closeModal();
    } catch (error) {
      console.error(
        "Save note error:",
        error
      );

      Alert.alert(
        "Error",
        "Unable to save the note. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  /*
   * ==========================================
   * DELETE NOTE
   * ==========================================
   */

  const deleteNote = (note: Note) => {
    Alert.alert(
      "Delete note",
      `Delete "${note.title}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const user = auth.currentUser;

            if (!user) {
              return;
            }

            try {
              await deleteDoc(
                doc(
                  db,
                  "users",
                  user.uid,
                  "notes",
                  note.id
                )
              );
            } catch (error) {
              console.error(
                "Delete note error:",
                error
              );

              Alert.alert(
                "Error",
                "Unable to delete the note."
              );
            }
          },
        },
      ]
    );
  };

  /*
   * ==========================================
   * DATE FORMATTER
   * ==========================================
   */

  const formatDate = (value: any) => {
    try {
      if (!value) {
        return "Recently added";
      }

      let date: Date | null = null;

      if (
        typeof value?.toDate === "function"
      ) {
        date = value.toDate();
      } else if (
        value instanceof Date
      ) {
        date = value;
      } else if (
        typeof value === "string"
      ) {
        date = new Date(value);
      }

      if (
        !date ||
        Number.isNaN(date.getTime())
      ) {
        return "Recently added";
      }

      return date.toLocaleDateString(
        "en-IN",
        {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }
      );
    } catch {
      return "Recently added";
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            styles.content
          }
        >
          {/* ==================================
              HEADER
          ================================== */}

          <View style={styles.header}>
            <View style={styles.headerText}>
              <Text style={styles.title}>
                Notes
              </Text>

              <Text style={styles.subtitle}>
                Keep your study notes organized
              </Text>
            </View>

            <Pressable
              style={styles.addButton}
              onPress={openAddModal}
            >
              <Ionicons
                name="add"
                size={25}
                color={WHITE}
              />
            </Pressable>
          </View>

          {/* ==================================
              SEARCH
          ================================== */}

          <View style={styles.searchContainer}>
            <Ionicons
              name="search-outline"
              size={20}
              color={MUTED}
            />

            <TextInput
              style={styles.searchInput}
              placeholder="Search your notes..."
              placeholderTextColor="#9AA3B2"
              value={searchText}
              onChangeText={setSearchText}
              autoCapitalize="none"
              returnKeyType="search"
            />

            {searchText.length > 0 && (
              <Pressable
                onPress={() =>
                  setSearchText("")
                }
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color="#AAB2BF"
                />
              </Pressable>
            )}
          </View>

          {/* ==================================
              SUBJECT FILTERS
          ================================== */}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={
              styles.subjectFilters
            }
          >
            {SUBJECTS.map((item) => {
              const active =
                selectedSubject === item;

              return (
                <Pressable
                  key={item}
                  style={[
                    styles.subjectChip,
                    active &&
                      styles.subjectChipActive,
                  ]}
                  onPress={() =>
                    setSelectedSubject(item)
                  }
                >
                  <Text
                    style={[
                      styles.subjectChipText,
                      active &&
                        styles.subjectChipTextActive,
                    ]}
                  >
                    {item}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* ==================================
              SUMMARY
          ================================== */}

          <View style={styles.summaryRow}>
            <View style={styles.summaryCard}>
              <View
                style={[
                  styles.summaryIcon,
                  {
                    backgroundColor:
                      "#EEF5FF",
                  },
                ]}
              >
                <Ionicons
                  name="document-text-outline"
                  size={21}
                  color={BLUE}
                />
              </View>

              <View>
                <Text
                  style={styles.summaryValue}
                >
                  {notes.length}
                </Text>

                <Text
                  style={styles.summaryLabel}
                >
                  Total Notes
                </Text>
              </View>
            </View>

            <View style={styles.summaryCard}>
              <View
                style={[
                  styles.summaryIcon,
                  {
                    backgroundColor:
                      "#ECFBF5",
                  },
                ]}
              >
                <Ionicons
                  name="filter-outline"
                  size={21}
                  color={GREEN}
                />
              </View>

              <View>
                <Text
                  style={styles.summaryValue}
                >
                  {filteredNotes.length}
                </Text>

                <Text
                  style={styles.summaryLabel}
                >
                  Showing
                </Text>
              </View>
            </View>
          </View>

          {/* ==================================
              NOTES HEADER
          ================================== */}

          <View style={styles.notesHeader}>
            <View>
              <Text style={styles.sectionTitle}>
                Your Notes
              </Text>

              <Text style={styles.sectionSubtitle}>
                {filteredNotes.length} note
                {filteredNotes.length !== 1
                  ? "s"
                  : ""}
              </Text>
            </View>

            <Pressable
              onPress={openAddModal}
            >
              <Text style={styles.addText}>
                + New Note
              </Text>
            </Pressable>
          </View>

          {/* ==================================
              LOADING
          ================================== */}

          {loading && (
            <View
              style={styles.loadingContainer}
            >
              <ActivityIndicator
                size="large"
                color={BLUE}
              />

              <Text
                style={styles.loadingText}
              >
                Loading notes...
              </Text>
            </View>
          )}

          {/* ==================================
              EMPTY STATE
          ================================== */}

          {!loading &&
            filteredNotes.length === 0 && (
              <View style={styles.emptyCard}>
                <View
                  style={styles.emptyIcon}
                >
                  <Ionicons
                    name={
                      searchText
                        ? "search-outline"
                        : "document-text-outline"
                    }
                    size={34}
                    color={BLUE}
                  />
                </View>

                <Text
                  style={styles.emptyTitle}
                >
                  {searchText ||
                  selectedSubject !== "All"
                    ? "No notes found"
                    : "No notes yet"}
                </Text>

                <Text
                  style={styles.emptyText}
                >
                  {searchText ||
                  selectedSubject !== "All"
                    ? "Try a different search or subject filter."
                    : "Create your first study note and keep everything in one place."}
                </Text>

                {!searchText &&
                  selectedSubject ===
                    "All" && (
                    <Pressable
                      style={styles.emptyButton}
                      onPress={
                        openAddModal
                      }
                    >
                      <Ionicons
                        name="add"
                        size={19}
                        color={WHITE}
                      />

                      <Text
                        style={
                          styles.emptyButtonText
                        }
                      >
                        Create Note
                      </Text>
                    </Pressable>
                  )}
              </View>
            )}

          {/* ==================================
              NOTE CARDS
          ================================== */}

          {!loading &&
            filteredNotes.map((note) => (
              <View
                key={note.id}
                style={styles.noteCard}
              >
                <View
                  style={styles.noteTop}
                >
                  <View
                    style={styles.noteIcon}
                  >
                    <Ionicons
                      name="document-text"
                      size={21}
                      color={BLUE}
                    />
                  </View>

                  <View
                    style={styles.noteMain}
                  >
                    <Text
                      style={styles.noteTitle}
                      numberOfLines={2}
                    >
                      {note.title}
                    </Text>

                    <View
                      style={
                        styles.noteMeta
                      }
                    >
                      <View
                        style={
                          styles.subjectBadge
                        }
                      >
                        <Text
                          style={
                            styles.subjectBadgeText
                          }
                        >
                          {note.subject}
                        </Text>
                      </View>

                      <Text
                        style={
                          styles.noteDate
                        }
                      >
                        {formatDate(
                          note.updatedAt ||
                            note.createdAt
                        )}
                      </Text>
                    </View>
                  </View>
                </View>

                <Text
                  style={styles.noteContent}
                  numberOfLines={4}
                >
                  {note.content}
                </Text>

                <View
                  style={styles.noteActions}
                >
                  <Pressable
                    style={styles.editButton}
                    onPress={() =>
                      openEditModal(note)
                    }
                  >
                    <Ionicons
                      name="create-outline"
                      size={17}
                      color={BLUE}
                    />

                    <Text
                      style={
                        styles.editButtonText
                      }
                    >
                      Edit
                    </Text>
                  </Pressable>

                  <Pressable
                    style={
                      styles.deleteButton
                    }
                    onPress={() =>
                      deleteNote(note)
                    }
                  >
                    <Ionicons
                      name="trash-outline"
                      size={17}
                      color={RED}
                    />

                    <Text
                      style={
                        styles.deleteButtonText
                      }
                    >
                      Delete
                    </Text>
                  </Pressable>
                </View>
              </View>
            ))}

          {/* ==================================
              STUDY TIP
          ================================== */}

          <View style={styles.tipCard}>
            <View style={styles.tipIcon}>
              <Text style={styles.tipEmoji}>
                📚
              </Text>
            </View>

            <View
              style={styles.tipContent}
            >
              <Text style={styles.tipTitle}>
                Study smarter
              </Text>

              <Text style={styles.tipText}>
                Keep notes short and organized by
                subject. Use headings and bullet
                points to make revision easier.
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* ====================================
            ADD / EDIT NOTE MODAL
        ==================================== */}

        <Modal
          visible={modalVisible}
          transparent
          animationType="slide"
          onRequestClose={closeModal}
        >
          <View style={styles.modalOverlay}>
            <KeyboardAvoidingView
              behavior={
                Platform.OS === "ios"
                  ? "padding"
                  : undefined
              }
              style={styles.modalKeyboard}
            >
              <View
                style={styles.modalCard}
              >
                <View
                  style={
                    styles.modalHeader
                  }
                >
                  <View>
                    <Text
                      style={
                        styles.modalTitle
                      }
                    >
                      {editingNote
                        ? "Edit Note"
                        : "Create Note"}
                    </Text>

                    <Text
                      style={
                        styles.modalSubtitle
                      }
                    >
                      {editingNote
                        ? "Update your study note"
                        : "Write something you want to remember"}
                    </Text>
                  </View>

                  <Pressable
                    style={
                      styles.closeButton
                    }
                    onPress={closeModal}
                    disabled={saving}
                  >
                    <Ionicons
                      name="close"
                      size={22}
                      color={MUTED}
                    />
                  </Pressable>
                </View>

                {/* Title */}

                <Text
                  style={styles.inputLabel}
                >
                  Note Title
                </Text>

                <TextInput
                  style={styles.input}
                  placeholder="e.g. Stack and Queue"
                  placeholderTextColor="#9AA3B2"
                  value={title}
                  onChangeText={setTitle}
                  editable={!saving}
                  autoCapitalize="sentences"
                />

                {/* Subject */}

                <Text
                  style={styles.inputLabel}
                >
                  Subject
                </Text>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={
                    false
                  }
                  contentContainerStyle={
                    styles.modalSubjects
                  }
                >
                  {SUBJECTS.filter(
                    (item) => item !== "All"
                  ).map((item) => {
                    const active =
                      subject === item;

                    return (
                      <Pressable
                        key={item}
                        style={[
                          styles.modalSubjectChip,
                          active &&
                            styles.modalSubjectChipActive,
                        ]}
                        onPress={() =>
                          setSubject(item)
                        }
                        disabled={saving}
                      >
                        <Text
                          style={[
                            styles.modalSubjectText,
                            active &&
                              styles.modalSubjectTextActive,
                          ]}
                        >
                          {item}
                        </Text>
                      </Pressable>
                    );
                  })}
                </ScrollView>

                {/* Content */}

                <Text
                  style={styles.inputLabel}
                >
                  Note Content
                </Text>

                <TextInput
                  style={[
                    styles.input,
                    styles.contentInput,
                  ]}
                  placeholder="Write your notes here..."
                  placeholderTextColor="#9AA3B2"
                  value={content}
                  onChangeText={setContent}
                  editable={!saving}
                  multiline
                  textAlignVertical="top"
                  autoCapitalize="sentences"
                  maxLength={10000}
                />

                <Text
                  style={styles.characterCount}
                >
                  {content.length}/10000
                </Text>

                {/* Buttons */}

                <View
                  style={
                    styles.modalButtons
                  }
                >
                  <Pressable
                    style={
                      styles.cancelButton
                    }
                    onPress={closeModal}
                    disabled={saving}
                  >
                    <Text
                      style={
                        styles.cancelButtonText
                      }
                    >
                      Cancel
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[
                      styles.saveButton,
                      saving &&
                        styles.saveButtonDisabled,
                    ]}
                    onPress={saveNote}
                    disabled={saving}
                  >
                    {saving ? (
                      <ActivityIndicator
                        size="small"
                        color={WHITE}
                      />
                    ) : (
                      <>
                        <Ionicons
                          name="checkmark"
                          size={18}
                          color={WHITE}
                        />

                        <Text
                          style={
                            styles.saveButtonText
                          }
                        >
                          {editingNote
                            ? "Save Changes"
                            : "Save Note"}
                        </Text>
                      </>
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
  safeArea: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  container: {
    flex: 1,
    backgroundColor: BACKGROUND,
  },

  content: {
    padding: 20,
    paddingBottom: 45,
  },

  /* ================================
     HEADER
  ================================= */

  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 19,
  },

  headerText: {
    flex: 1,
  },

  title: {
    fontSize: 28,
    fontWeight: "900",
    color: TEXT,
  },

  subtitle: {
    fontSize: 13,
    color: MUTED,
    marginTop: 4,
  },

  addButton: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: BLUE,
    justifyContent: "center",
    alignItems: "center",
  },

  /* ================================
     SEARCH
  ================================= */

  searchContainer: {
    height: 49,
    backgroundColor: WHITE,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: BORDER,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    marginBottom: 13,
  },

  searchInput: {
    flex: 1,
    height: "100%",
    color: TEXT,
    fontSize: 14,
    marginLeft: 9,
  },

  /* ================================
     FILTERS
  ================================= */

  subjectFilters: {
    gap: 8,
    paddingBottom: 4,
  },

  subjectChip: {
    paddingHorizontal: 13,
    height: 35,
    borderRadius: 18,
    backgroundColor: WHITE,
    borderWidth: 1,
    borderColor: BORDER,
    justifyContent: "center",
    alignItems: "center",
  },

  subjectChipActive: {
    backgroundColor: BLUE,
    borderColor: BLUE,
  },

  subjectChipText: {
    color: MUTED,
    fontSize: 11,
    fontWeight: "700",
  },

  subjectChipTextActive: {
    color: WHITE,
  },

  /* ================================
     SUMMARY
  ================================= */

  summaryRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
    marginBottom: 24,
  },

  summaryCard: {
    flex: 1,
    backgroundColor: WHITE,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
  },

  summaryIcon: {
    width: 39,
    height: 39,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 9,
  },

  summaryValue: {
    fontSize: 18,
    fontWeight: "900",
    color: TEXT,
  },

  summaryLabel: {
    fontSize: 10,
    color: MUTED,
    marginTop: 2,
  },

  /* ================================
     NOTES HEADER
  ================================= */

  notesHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 13,
  },

  sectionTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: TEXT,
  },

  sectionSubtitle: {
    fontSize: 11,
    color: MUTED,
    marginTop: 3,
  },

  addText: {
    color: BLUE,
    fontSize: 13,
    fontWeight: "800",
  },

  /* ================================
     LOADING
  ================================= */

  loadingContainer: {
    alignItems: "center",
    paddingVertical: 45,
  },

  loadingText: {
    color: MUTED,
    fontSize: 13,
    marginTop: 10,
  },

  /* ================================
     EMPTY
  ================================= */

  emptyCard: {
    backgroundColor: WHITE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 27,
    alignItems: "center",
  },

  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#EEF5FF",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 13,
  },

  emptyTitle: {
    color: TEXT,
    fontSize: 18,
    fontWeight: "800",
  },

  emptyText: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 18,
    textAlign: "center",
    marginTop: 6,
    marginBottom: 17,
  },

  emptyButton: {
    height: 43,
    borderRadius: 12,
    paddingHorizontal: 17,
    backgroundColor: BLUE,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },

  emptyButtonText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: "800",
  },

  /* ================================
     NOTE CARD
  ================================= */

  noteCard: {
    backgroundColor: WHITE,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 16,
    marginBottom: 13,
  },

  noteTop: {
    flexDirection: "row",
    alignItems: "flex-start",
  },

  noteIcon: {
    width: 43,
    height: 43,
    borderRadius: 12,
    backgroundColor: "#EEF5FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },

  noteMain: {
    flex: 1,
  },

  noteTitle: {
    color: TEXT,
    fontSize: 16,
    lineHeight: 21,
    fontWeight: "800",
  },

  noteMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 8,
  },

  subjectBadge: {
    backgroundColor: "#EEF5FF",
    borderRadius: 7,
    paddingHorizontal: 7,
    paddingVertical: 4,
    maxWidth: "65%",
  },

  subjectBadgeText: {
    color: BLUE,
    fontSize: 9,
    fontWeight: "800",
  },

  noteDate: {
    color: MUTED,
    fontSize: 9,
  },

  noteContent: {
    color: "#4F5E76",
    fontSize: 12,
    lineHeight: 19,
    marginTop: 14,
  },

  noteActions: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#EEF0F4",
    marginTop: 14,
    paddingTop: 10,
    gap: 10,
  },

  editButton: {
    flex: 1,
    height: 37,
    borderRadius: 10,
    backgroundColor: "#EEF5FF",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },

  editButtonText: {
    color: BLUE,
    fontSize: 11,
    fontWeight: "800",
  },

  deleteButton: {
    flex: 1,
    height: 37,
    borderRadius: 10,
    backgroundColor: "#FFF0F1",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },

  deleteButtonText: {
    color: RED,
    fontSize: 11,
    fontWeight: "800",
  },

  /* ================================
     TIP
  ================================= */

  tipCard: {
    backgroundColor: WHITE,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: BORDER,
    padding: 15,
    flexDirection: "row",
    marginTop: 5,
  },

  tipIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: "#FFF6D9",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 11,
  },

  tipEmoji: {
    fontSize: 18,
  },

  tipContent: {
    flex: 1,
  },

  tipTitle: {
    color: TEXT,
    fontSize: 14,
    fontWeight: "800",
    marginBottom: 4,
  },

  tipText: {
    color: MUTED,
    fontSize: 12,
    lineHeight: 18,
  },

  /* ================================
     MODAL
  ================================= */

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },

  modalKeyboard: {
    width: "100%",
  },

  modalCard: {
    backgroundColor: WHITE,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    padding: 21,
    paddingBottom: 30,
    maxHeight: "92%",
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 19,
  },

  modalTitle: {
    color: TEXT,
    fontSize: 22,
    fontWeight: "900",
  },

  modalSubtitle: {
    color: MUTED,
    fontSize: 11,
    marginTop: 4,
  },

  closeButton: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#F3F5F8",
    justifyContent: "center",
    alignItems: "center",
  },

  inputLabel: {
    color: TEXT,
    fontSize: 12,
    fontWeight: "800",
    marginBottom: 7,
  },

  input: {
    height: 47,
    backgroundColor: "#FAFBFD",
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 12,
    paddingHorizontal: 13,
    color: TEXT,
    fontSize: 13,
    marginBottom: 14,
  },

  modalSubjects: {
    gap: 7,
    paddingBottom: 13,
  },

  modalSubjectChip: {
    paddingHorizontal: 11,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#F4F6F9",
    borderWidth: 1,
    borderColor: BORDER,
    justifyContent: "center",
  },

  modalSubjectChipActive: {
    backgroundColor: BLUE,
    borderColor: BLUE,
  },

  modalSubjectText: {
    color: MUTED,
    fontSize: 10,
    fontWeight: "700",
  },

  modalSubjectTextActive: {
    color: WHITE,
  },

  contentInput: {
    height: 145,
    paddingTop: 12,
    paddingBottom: 12,
  },

  characterCount: {
    color: "#9AA3B2",
    fontSize: 9,
    textAlign: "right",
    marginTop: -10,
    marginBottom: 14,
  },

  modalButtons: {
    flexDirection: "row",
    gap: 10,
    marginTop: 3,
  },

  cancelButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: BORDER,
    justifyContent: "center",
    alignItems: "center",
  },

  cancelButtonText: {
    color: MUTED,
    fontSize: 13,
    fontWeight: "800",
  },

  saveButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: BLUE,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },

  saveButtonDisabled: {
    opacity: 0.65,
  },

  saveButtonText: {
    color: WHITE,
    fontSize: 13,
    fontWeight: "800",
  },
});