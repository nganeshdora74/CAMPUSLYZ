import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
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

import {
  onAuthStateChanged,
  User,
} from "firebase/auth";

import { auth, db } from "../firebase/config";
import {
  Branch,
  DEFAULT_BRANCHES,
  listenBranches,
  SubjectItem,
} from "../services/curriculumService";

const BLUE = "#1677E8";
const DARK = "#092B78";
const LIGHT_BLUE = "#EAF3FF";
const TEXT = "#172033";
const GRAY = "#6B7280";
const BORDER = "#E5E7EB";

type Subject = {
  id: string;
  name: string;
  teacherName: string;
  createdAt?: any;
  updatedAt?: any;
};

export default function SubjectsScreen() {
  const [user, setUser] = useState<User | null>(null);

  const [subjects, setSubjects] = useState<Subject[]>([]);

  const [loading, setLoading] = useState(true);

  const [modalVisible, setModalVisible] = useState(false);

  const [subjectName, setSubjectName] = useState("");

  const [teacherName, setTeacherName] = useState("");

  const [editingSubject, setEditingSubject] =
    useState<Subject | null>(null);

  const [saving, setSaving] = useState(false);

  // Curriculum & Branch Electives state
  const [userBranch, setUserBranch] = useState("Computer Science & Engineering");
  const [branches, setBranches] = useState<Branch[]>(DEFAULT_BRANCHES);
  const [facultyList, setFacultyList] = useState<{ id: string; name: string; department?: string }[]>([]);
  const [activeSubTab, setActiveSubTab] = useState<"All" | "Electives" | "Core">("Electives");
  const [showSubjectSuggestions, setShowSubjectSuggestions] = useState(false);
  const [showTeacherSuggestions, setShowTeacherSuggestions] = useState(false);

  // Listen to branches
  useEffect(() => {
    const unsub = listenBranches((loaded) => {
      if (loaded.length > 0) setBranches(loaded);
    });
    return () => unsub();
  }, []);

  // Listen to faculty
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "faculty"),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name || "Faculty",
          department: d.data().department || "",
        }));
        setFacultyList(list);
      },
      (err) => console.warn("Faculty error in subjects:", err)
    );
    return () => unsub();
  }, []);

  // Load user branch
  useEffect(() => {
    if (!user) return;
    const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.branch || data.department) {
          setUserBranch(data.branch || data.department);
        }
      }
    });
    return () => unsub();
  }, [user]);

  // Curriculum Subject Item definition
  type CurriculumSubItem = {
    id: string;
    name: string;
    code: string;
    defaultTeacher?: string;
    department?: string;
    isOptional: boolean;
    credits?: number;
  };

  // Compute all curriculum subjects for current student's branch + other electives
  const allCurriculumSubjects = useMemo<CurriculumSubItem[]>(() => {
    const list: CurriculumSubItem[] = [];
    const seen = new Set<string>();

    const matchedBranch = branches.find(
      (b) =>
        b.name.toLowerCase() === userBranch.toLowerCase() ||
        b.code.toLowerCase() === userBranch.toLowerCase()
    );

    // 1. Matched branch electives first
    if (matchedBranch?.optionalSubjects) {
      matchedBranch.optionalSubjects.forEach((s) => {
        const k = s.name.trim().toLowerCase();
        if (!seen.has(k)) {
          seen.add(k);
          list.push({
            id: s.id || `opt-${k}`,
            name: s.name.trim(),
            code: s.code || "",
            defaultTeacher: s.defaultTeacher || "Dr. K. Sushma",
            department: matchedBranch.code,
            isOptional: true,
            credits: s.credits || 3,
          });
        }
      });
    }

    // 2. Matched branch core subjects
    if (matchedBranch?.coreSubjects) {
      matchedBranch.coreSubjects.forEach((s) => {
        const k = s.name.trim().toLowerCase();
        if (!seen.has(k)) {
          seen.add(k);
          list.push({
            id: s.id || `core-${k}`,
            name: s.name.trim(),
            code: s.code || "",
            defaultTeacher: s.defaultTeacher || "Prof. Sharma",
            department: matchedBranch.code,
            isOptional: false,
            credits: s.credits || 4,
          });
        }
      });
    }

    // 3. Other branches' electives
    branches.forEach((b) => {
      b.optionalSubjects?.forEach((s) => {
        const k = s.name.trim().toLowerCase();
        if (!seen.has(k)) {
          seen.add(k);
          list.push({
            id: s.id || `opt-other-${k}`,
            name: s.name.trim(),
            code: s.code || "",
            defaultTeacher: s.defaultTeacher || "Dr. K. Sushma",
            department: b.code,
            isOptional: true,
            credits: s.credits || 3,
          });
        }
      });
    });

    return list;
  }, [branches, userBranch]);

  // Backward compatibility alias for any existing reference
  const availableOptionalSubjects = useMemo(() => {
    return allCurriculumSubjects.filter((s) => s.isOptional);
  }, [allCurriculumSubjects]);

  // Quick Pick subjects filtered by tab
  const quickPickSubjects = useMemo(() => {
    if (activeSubTab === "Electives") {
      return allCurriculumSubjects.filter((s) => s.isOptional);
    }
    if (activeSubTab === "Core") {
      return allCurriculumSubjects.filter((s) => !s.isOptional);
    }
    return allCurriculumSubjects;
  }, [allCurriculumSubjects, activeSubTab]);

  // Real-time suggestions while typing Subject Name
  const subjectSuggestions = useMemo(() => {
    const q = subjectName.trim().toLowerCase();
    if (!q) {
      return allCurriculumSubjects.slice(0, 8);
    }
    return allCurriculumSubjects
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          (s.department && s.department.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [allCurriculumSubjects, subjectName]);

  // Combined faculty suggestions (from facultyList collection + subject defaultTeachers)
  const teacherSuggestions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; department?: string }>();

    // Registered faculty
    facultyList.forEach((f) => {
      map.set(f.name.toLowerCase(), f);
    });

    // Default teachers from curriculum subjects
    allCurriculumSubjects.forEach((s) => {
      if (s.defaultTeacher && !map.has(s.defaultTeacher.toLowerCase())) {
        map.set(s.defaultTeacher.toLowerCase(), {
          id: `cur-${s.id}`,
          name: s.defaultTeacher,
          department: s.department,
        });
      }
    });

    const allFac = Array.from(map.values());
    const q = teacherName.trim().toLowerCase();
    if (!q) {
      return allFac.slice(0, 8);
    }
    return allFac
      .filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          (f.department && f.department.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [facultyList, allCurriculumSubjects, teacherName]);

  const handleSelectSubjectSuggestion = (sub: CurriculumSubItem) => {
    setSubjectName(sub.name);
    if (sub.defaultTeacher && sub.defaultTeacher !== "Not Assigned") {
      setTeacherName(sub.defaultTeacher);
    }
    setShowSubjectSuggestions(false);
  };

  const handleSelectTeacherSuggestion = (name: string) => {
    setTeacherName(name);
    setShowTeacherSuggestions(false);
  };

  // =====================================================
  // AUTHENTICATION
  // =====================================================

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);

        if (!currentUser) {
          setSubjects([]);
          setLoading(false);
        }
      }
    );

    return unsubscribe;
  }, []);

  // =====================================================
  // LOAD SUBJECTS FROM FIREBASE
  // =====================================================

  useEffect(() => {
    if (!user) {
      return;
    }

    setLoading(true);

    const subjectsRef = collection(
      db,
      "users",
      user.uid,
      "subjects"
    );

    const subjectsQuery = query(
      subjectsRef,
      orderBy("name", "asc")
    );

    const unsubscribe = onSnapshot(
      subjectsQuery,
      (snapshot) => {
        const subjectList: Subject[] =
          snapshot.docs.map((document) => {
            const data = document.data();

            return {
              id: document.id,
              name:
                typeof data.name === "string"
                  ? data.name
                  : "",
              teacherName:
                typeof data.teacherName === "string"
                  ? data.teacherName
                  : "",
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
            };
          });

        setSubjects(subjectList);
        setLoading(false);
      },
      (error) => {
        console.log(
          "Firebase subjects error:",
          error
        );

        setLoading(false);

        Alert.alert(
          "Error",
          "Could not load subjects."
        );
      }
    );

    return unsubscribe;
  }, [user]);

  // =====================================================
  // ADD SUBJECT
  // =====================================================

  const openAddModal = () => {
    setEditingSubject(null);
    setSubjectName("");
    setTeacherName("");
    setShowSubjectSuggestions(false);
    setShowTeacherSuggestions(false);
    setModalVisible(true);
  };

  // =====================================================
  // EDIT SUBJECT
  // =====================================================

  const openEditModal = (subject: Subject) => {
    setEditingSubject(subject);

    setSubjectName(subject.name);

    setTeacherName(subject.teacherName);
    setShowSubjectSuggestions(false);
    setShowTeacherSuggestions(false);

    setModalVisible(true);
  };

  // =====================================================
  // CLOSE MODAL
  // =====================================================

  const closeModal = () => {
    if (saving) {
      return;
    }

    setModalVisible(false);

    setEditingSubject(null);

    setSubjectName("");

    setTeacherName("");
    setShowSubjectSuggestions(false);
    setShowTeacherSuggestions(false);
  };

  // =====================================================
  // SAVE / UPDATE SUBJECT
  // =====================================================

  const saveSubject = async () => {
    if (!user) {
      Alert.alert(
        "Login required",
        "Please login first."
      );

      return;
    }

    const cleanSubjectName =
      subjectName.trim();

    const cleanTeacherName =
      teacherName.trim();

    // Validate subject
    if (!cleanSubjectName) {
      Alert.alert(
        "Subject required",
        "Please enter a subject name."
      );

      return;
    }

    // Validate teacher
    if (!cleanTeacherName) {
      Alert.alert(
        "Teacher required",
        "Please enter the teacher name."
      );

      return;
    }

    // =================================================
    // CHECK DUPLICATE SUBJECT
    // =================================================

    const duplicateSubject = subjects.find(
      (subject) =>
        subject.name.toLowerCase() ===
          cleanSubjectName.toLowerCase() &&
        subject.id !== editingSubject?.id
    );

    if (duplicateSubject) {
      Alert.alert(
        "Already exists",
        "This subject already exists."
      );

      return;
    }

    try {
      setSaving(true);

      // =================================================
      // UPDATE
      // =================================================

      if (editingSubject) {
        const subjectRef = doc(
          db,
          "users",
          user.uid,
          "subjects",
          editingSubject.id
        );

        await updateDoc(subjectRef, {
          name: cleanSubjectName,
          teacherName: cleanTeacherName,
          updatedAt: serverTimestamp(),
        });

        setModalVisible(false);

        Alert.alert(
          "Success",
          "Subject updated successfully."
        );
      }

      // =================================================
      // CREATE
      // =================================================

      else {
        const subjectsRef = collection(
          db,
          "users",
          user.uid,
          "subjects"
        );

        await addDoc(subjectsRef, {
          name: cleanSubjectName,
          teacherName: cleanTeacherName,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });

        setModalVisible(false);

        Alert.alert(
          "Success",
          "Subject added successfully."
        );
      }

      setEditingSubject(null);
      setSubjectName("");
      setTeacherName("");
    } catch (error) {
      console.log(
        "Save subject error:",
        error
      );

      Alert.alert(
        "Error",
        "Could not save the subject."
      );
    } finally {
      setSaving(false);
    }
  };

  // =====================================================
  // DELETE SUBJECT
  // =====================================================

  const deleteSubject = (subject: Subject) => {
    if (!user) {
      return;
    }

    Alert.alert(
      "Delete Subject",
      `Delete "${subject.name}"?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",

          onPress: async () => {
            try {
              const subjectRef = doc(
                db,
                "users",
                user.uid,
                "subjects",
                subject.id
              );

              await deleteDoc(subjectRef);

              Alert.alert(
                "Deleted",
                "Subject deleted successfully."
              );
            } catch (error) {
              console.log(
                "Delete subject error:",
                error
              );

              Alert.alert(
                "Error",
                "Could not delete the subject."
              );
            }
          },
        },
      ]
    );
  };

  // =====================================================
  // SUBJECT CARD
  // =====================================================

  const renderSubject = ({
    item,
  }: {
    item: Subject;
  }) => {
    return (
      <View style={styles.subjectCard}>
        {/* Icon */}

        <View style={styles.subjectIcon}>
          <Ionicons
            name="book-outline"
            size={25}
            color={BLUE}
          />
        </View>

        {/* Information */}

        <View style={styles.subjectInfo}>
          <Text style={styles.subjectName}>
            {item.name}
          </Text>

          <View style={styles.teacherRow}>
            <Ionicons
              name="person-outline"
              size={15}
              color={GRAY}
            />

            <Text style={styles.teacherName}>
              {item.teacherName}
            </Text>
          </View>
        </View>

        {/* Actions */}

        <View style={styles.actionContainer}>
          <Pressable
            style={styles.actionButton}
            onPress={() =>
              openEditModal(item)
            }
          >
            <Ionicons
              name="create-outline"
              size={21}
              color={BLUE}
            />
          </Pressable>

          <Pressable
            style={styles.actionButton}
            onPress={() =>
              deleteSubject(item)
            }
          >
            <Ionicons
              name="trash-outline"
              size={21}
              color="#DC2626"
            />
          </Pressable>
        </View>
      </View>
    );
  };

  // =====================================================
  // NOT LOGGED IN
  // =====================================================

  if (!user && !loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.center}>
          <Ionicons
            name="person-circle-outline"
            size={70}
            color={GRAY}
          />

          <Text style={styles.emptyTitle}>
            Login Required
          </Text>

          <Text style={styles.emptyText}>
            Please login to manage your
            subjects.
          </Text>

          <Pressable
            style={styles.primaryButton}
            onPress={() => router.back()}
          >
            <Text
              style={styles.primaryButtonText}
            >
              Go Back
            </Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  // =====================================================
  // MAIN SCREEN
  // =====================================================

  return (
    <SafeAreaView style={styles.container}>
      {/* =================================================
          HEADER
      ================================================= */}

      <View style={styles.header}>
        <Pressable
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={DARK}
          />
        </Pressable>

        <View
          style={styles.headerTextContainer}
        >
          <Text style={styles.headerTitle}>
            My Subjects
          </Text>

          <Text style={styles.headerSubtitle}>
            Manage subjects and teachers
          </Text>
        </View>

        <Pressable
          style={styles.headerAddButton}
          onPress={openAddModal}
        >
          <Ionicons
            name="add"
            size={27}
            color="#FFFFFF"
          />
        </Pressable>
      </View>

      {/* =================================================
          LOADING
      ================================================= */}

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator
            size="large"
            color={BLUE}
          />

          <Text style={styles.loadingText}>
            Loading subjects...
          </Text>
        </View>
      ) : subjects.length === 0 ? (
        /* =================================================
           EMPTY
        ================================================= */

        <View style={styles.center}>
          <View style={styles.emptyIcon}>
            <Ionicons
              name="book-outline"
              size={42}
              color={BLUE}
            />
          </View>

          <Text style={styles.emptyTitle}>
            No Subjects Yet
          </Text>

          <Text style={styles.emptyText}>
            Add your subjects and teacher names
            to use them throughout Campusly.
          </Text>

          <Pressable
            style={styles.primaryButton}
            onPress={openAddModal}
          >
            <Ionicons
              name="add"
              size={21}
              color="#FFFFFF"
            />

            <Text
              style={styles.primaryButtonText}
            >
              Add Subject
            </Text>
          </Pressable>
        </View>
      ) : (
        /* =================================================
           SUBJECT LIST
        ================================================= */

        <FlatList
          data={subjects}
          keyExtractor={(item) => item.id}
          renderItem={renderSubject}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={
            styles.listContent
          }
          ListHeaderComponent={
            <View>
              {/* BRANCH & ELECTIVES SELECTION BANNER */}
              <TouchableOpacity
                style={styles.branchPromoBanner}
                onPress={() => router.push("/branch-selection")}
                activeOpacity={0.85}
              >
                <View style={styles.branchPromoLeft}>
                  <View style={styles.branchPromoIcon}>
                    <Ionicons name="git-branch" size={20} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.branchPromoTitle}>Branch & Elective Setup</Text>
                    <Text style={styles.branchPromoSub}>
                      Select your engineering branch with core & optional elective subjects
                    </Text>
                    <View style={styles.branchBadgeMini}>
                      <Ionicons name="school-outline" size={12} color="#2563EB" />
                      <Text style={styles.branchBadgeMiniText}>{userBranch}</Text>
                    </View>
                  </View>
                </View>
                <View style={styles.branchPromoAction}>
                  <Text style={styles.branchPromoActionText}>Choose →</Text>
                </View>
              </TouchableOpacity>

              <View style={styles.listHeader}>
                <Text style={styles.countText}>
                  {subjects.length}{" "}
                  {subjects.length === 1
                    ? "Subject"
                    : "Subjects"}
                </Text>

                <Pressable
                  onPress={openAddModal}
                  style={
                    styles.addSubjectButton
                  }
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={20}
                    color={BLUE}
                  />

                  <Text
                    style={
                      styles.addSubjectButtonText
                    }
                  >
                    Add Subject
                  </Text>
                </Pressable>
              </View>
            </View>
          }
        />
      )}

      {/* =================================================
          ADD / EDIT MODAL
      ================================================= */}

      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={closeModal}
      >
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={
            Platform.OS === "ios"
              ? "padding"
              : undefined
          }
        >
          {/* Dark background */}

          <Pressable
            style={styles.modalBackground}
            onPress={closeModal}
          />

          {/* Modal */}

          <View style={styles.modalContainer}>
            {/* Header */}

            <View style={styles.modalHeader}>
              <View>
                <Text
                  style={styles.modalTitle}
                >
                  {editingSubject
                    ? "Edit Subject"
                    : "Add Subject"}
                </Text>

                <Text
                  style={styles.modalSubtitle}
                >
                  Enter subject and teacher or pick from optional electives
                </Text>
              </View>

              <Pressable
                style={styles.closeButton}
                onPress={closeModal}
              >
                <Ionicons
                  name="close"
                  size={23}
                  color={GRAY}
                />
              </Pressable>
            </View>

            {/* =================================================
                CURRICULUM & OPTIONAL ELECTIVE SUBJECTS TRAY
            ================================================= */}
            <View style={styles.optionalTraySection}>
              <View style={styles.optionalTrayHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="sparkles" size={15} color="#7C3AED" />
                  <Text style={styles.optionalTrayTitle}>
                    Curriculum Subjects & Electives:
                  </Text>
                </View>
                <TouchableOpacity onPress={() => { closeModal(); router.push("/branch-selection"); }}>
                  <Text style={styles.optionalTrayAllText}>All Branches →</Text>
                </TouchableOpacity>
              </View>

              {/* Filter Tabs */}
              <View style={styles.subTabPillRow}>
                {(["Electives", "Core", "All"] as const).map((tab) => {
                  const isActive = activeSubTab === tab;
                  return (
                    <TouchableOpacity
                      key={tab}
                      style={[styles.subTabPill, isActive && styles.subTabPillActive]}
                      onPress={() => setActiveSubTab(tab)}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.subTabPillText, isActive && styles.subTabPillTextActive]}>
                        {tab === "Electives" ? "⭐ Electives" : tab === "Core" ? "📘 Core" : "All"}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.optionalScrollContainer}
              >
                {quickPickSubjects.map((opt) => (
                  <TouchableOpacity
                    key={opt.id}
                    style={[
                      styles.optionalSubjectChipCard,
                      subjectName.toLowerCase() === opt.name.toLowerCase() &&
                        styles.optionalSubjectChipCardActive,
                    ]}
                    onPress={() => handleSelectSubjectSuggestion(opt)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.optChipTopRow}>
                      <View style={[styles.optCodePill, !opt.isOptional && { backgroundColor: "#DBEAFE" }]}>
                        <Text style={[styles.optCodeText, !opt.isOptional && { color: "#1D4ED8" }]}>
                          {opt.code || (opt.isOptional ? "ELECTIVE" : "CORE")}
                        </Text>
                      </View>
                      <Text style={styles.optCreditsText}>{opt.credits || 3} cr</Text>
                    </View>
                    <Text style={styles.optChipTitle} numberOfLines={1}>
                      {opt.name}
                    </Text>
                    <Text style={styles.optChipTeacher} numberOfLines={1}>
                      👨‍🏫 {opt.defaultTeacher || "Subject Faculty"}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {/* =================================================
                SUBJECT INPUT WITH REAL-TIME SUGGESTIONS
            ================================================= */}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Subject Name *
              </Text>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="book-outline"
                  size={21}
                  color={GRAY}
                />

                <TextInput
                  value={subjectName}
                  onChangeText={(val) => {
                    setSubjectName(val);
                    setShowSubjectSuggestions(true);
                  }}
                  onFocus={() => setShowSubjectSuggestions(true)}
                  placeholder="e.g. Artificial Intelligence & ML"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                  autoCapitalize="words"
                  returnKeyType="next"
                />
              </View>

              {/* Subject Suggestions Dropdown */}
              {showSubjectSuggestions && (
                <View style={styles.suggestionsBox}>
                  <View style={styles.suggestionsHeader}>
                    <Text style={styles.suggestionsHeaderText}>
                      Curriculum Suggestions ({subjectSuggestions.length})
                    </Text>
                  </View>
                  {subjectSuggestions.map((sub) => (
                    <TouchableOpacity
                      key={`student-sug-${sub.id}`}
                      style={styles.suggestionItem}
                      onPress={() => handleSelectSubjectSuggestion(sub)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.suggestionLeft}>
                        <Ionicons
                          name={sub.isOptional ? "sparkles" : "book-outline"}
                          size={16}
                          color={sub.isOptional ? "#D97706" : "#2563EB"}
                        />
                        <View style={{ marginLeft: 8, flex: 1 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Text style={styles.suggestionName}>{sub.name}</Text>
                            {sub.code ? (
                              <View style={styles.suggestionCodeBadge}>
                                <Text style={styles.suggestionCodeText}>{sub.code}</Text>
                              </View>
                            ) : null}
                            {sub.isOptional && (
                              <View style={styles.electivePillSmall}>
                                <Ionicons name="sparkles" size={9} color="#D97706" />
                                <Text style={styles.electivePillSmallText}>Elective</Text>
                              </View>
                            )}
                          </View>
                          {sub.defaultTeacher && (
                            <Text style={styles.suggestionTeacher}>
                              Faculty: {sub.defaultTeacher} {sub.department ? `(${sub.department})` : ""}
                            </Text>
                          )}
                        </View>
                      </View>
                      <Ionicons name="chevron-forward" size={16} color="#7C3AED" />
                    </TouchableOpacity>
                  ))}

                  {subjectName.trim().length > 0 &&
                    !allCurriculumSubjects.some((s) => s.name.toLowerCase() === subjectName.trim().toLowerCase()) && (
                      <TouchableOpacity
                        style={styles.suggestionAddNewItem}
                        onPress={() => setShowSubjectSuggestions(false)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="add-circle" size={16} color="#059669" />
                        <Text style={styles.suggestionAddNewText}>
                          Use custom subject: "<Text style={{ fontWeight: "700" }}>{subjectName.trim()}</Text>"
                        </Text>
                      </TouchableOpacity>
                    )}
                </View>
              )}
            </View>

            {/* =================================================
                TEACHER INPUT WITH REAL-TIME SUGGESTIONS
            ================================================= */}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                Teacher / Faculty Name *
              </Text>

              <View style={styles.inputContainer}>
                <Ionicons
                  name="person-outline"
                  size={21}
                  color={GRAY}
                />

                <TextInput
                  value={teacherName}
                  onChangeText={(val) => {
                    setTeacherName(val);
                    setShowTeacherSuggestions(true);
                  }}
                  onFocus={() => setShowTeacherSuggestions(true)}
                  placeholder="e.g. Dr. K. Sushma / Prof. Sharma"
                  placeholderTextColor="#9CA3AF"
                  style={styles.input}
                  autoCapitalize="words"
                  returnKeyType="done"
                />
              </View>

              {/* Teacher suggestions box */}
              {showTeacherSuggestions && (
                <View style={styles.suggestionsBox}>
                  <View style={styles.suggestionsHeader}>
                    <Text style={styles.suggestionsHeaderText}>
                      Faculty & Teacher Suggestions ({teacherSuggestions.length})
                    </Text>
                  </View>

                  {teacherSuggestions.map((fac) => (
                    <TouchableOpacity
                      key={`student-fac-${fac.id}`}
                      style={styles.suggestionItem}
                      onPress={() => handleSelectTeacherSuggestion(fac.name)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.suggestionLeft}>
                        <Ionicons name="school-outline" size={16} color="#2563EB" />
                        <View style={{ marginLeft: 8, flex: 1 }}>
                          <Text style={styles.suggestionName}>{fac.name}</Text>
                          {fac.department && (
                            <Text style={styles.suggestionTeacher}>Department: {fac.department}</Text>
                          )}
                        </View>
                      </View>
                      <Ionicons name="checkmark-circle-outline" size={16} color="#059669" />
                    </TouchableOpacity>
                  ))}

                  {teacherName.trim().length > 0 &&
                    !teacherSuggestions.some((f) => f.name.toLowerCase() === teacherName.trim().toLowerCase()) && (
                      <TouchableOpacity
                        style={styles.suggestionAddNewItem}
                        onPress={() => setShowTeacherSuggestions(false)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="add-circle" size={16} color="#059669" />
                        <Text style={styles.suggestionAddNewText}>
                          Use custom teacher: "<Text style={{ fontWeight: "700" }}>{teacherName.trim()}</Text>"
                        </Text>
                      </TouchableOpacity>
                    )}
                </View>
              )}

              {/* RECOMMENDED FACULTY / TEACHERS QUICK CHIPS */}
              {facultyList.length > 0 && (
                <View style={styles.facultyChipsContainer}>
                  <Text style={styles.facultyChipsLabel}>Quick Pick Faculty:</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                    {facultyList.slice(0, 8).map((fac) => (
                      <TouchableOpacity
                        key={fac.id}
                        style={[
                          styles.facultyMiniChip,
                          teacherName.toLowerCase() === fac.name.toLowerCase() &&
                            styles.facultyMiniChipActive,
                        ]}
                        onPress={() => handleSelectTeacherSuggestion(fac.name)}
                      >
                        <Text
                          style={[
                            styles.facultyMiniChipText,
                            teacherName.toLowerCase() === fac.name.toLowerCase() &&
                              styles.facultyMiniChipTextActive,
                          ]}
                        >
                          {fac.name} {fac.department ? `(${fac.department})` : ""}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>

            {/* =================================================
                SAVE BUTTON
            ================================================= */}

            <Pressable
              style={[
                styles.saveButton,
                saving &&
                  styles.disabledButton,
              ]}
              onPress={saveSubject}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator
                  size="small"
                  color="#FFFFFF"
                />
              ) : (
                <>
                  <Ionicons
                    name={
                      editingSubject
                        ? "checkmark"
                        : "add"
                    }
                    size={21}
                    color="#FFFFFF"
                  />

                  <Text
                    style={
                      styles.saveButtonText
                    }
                  >
                    {editingSubject
                      ? "Update Subject"
                      : "Save Subject"}
                  </Text>
                </>
              )}
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

// =======================================================
// STYLES
// =======================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  // =====================================================
  // HEADER
  // =====================================================

  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 18,
    paddingVertical: 15,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },

  backButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },

  headerTextContainer: {
    flex: 1,
    marginLeft: 12,
  },

  headerTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: DARK,
  },

  headerSubtitle: {
    marginTop: 3,
    fontSize: 12,
    color: GRAY,
  },

  headerAddButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: BLUE,
    alignItems: "center",
    justifyContent: "center",
  },

  // =====================================================
  // LIST
  // =====================================================

  listContent: {
    padding: 18,
    paddingBottom: 40,
  },

  listHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },

  countText: {
    fontSize: 15,
    fontWeight: "700",
    color: TEXT,
  },

  addSubjectButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },

  addSubjectButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: BLUE,
  },

  // =====================================================
  // SUBJECT CARD
  // =====================================================

  subjectCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 15,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: BORDER,
  },

  subjectIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: LIGHT_BLUE,
    alignItems: "center",
    justifyContent: "center",
  },

  subjectInfo: {
    flex: 1,
    marginLeft: 13,
  },

  subjectName: {
    fontSize: 16,
    fontWeight: "800",
    color: TEXT,
  },

  teacherRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 6,
  },

  teacherName: {
    fontSize: 13,
    color: GRAY,
  },

  actionContainer: {
    flexDirection: "row",
    gap: 5,
  },

  actionButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },

  // =====================================================
  // CENTER / EMPTY
  // =====================================================

  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 35,
  },

  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: GRAY,
  },

  emptyIcon: {
    width: 82,
    height: 82,
    borderRadius: 41,
    backgroundColor: LIGHT_BLUE,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },

  emptyTitle: {
    fontSize: 21,
    fontWeight: "800",
    color: DARK,
    textAlign: "center",
  },

  emptyText: {
    marginTop: 8,
    fontSize: 14,
    lineHeight: 21,
    color: GRAY,
    textAlign: "center",
    maxWidth: 330,
  },

  primaryButton: {
    height: 48,
    paddingHorizontal: 22,
    marginTop: 22,
    borderRadius: 13,
    backgroundColor: BLUE,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
  },

  primaryButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  /* Modal Tabs & Suggestions */
  subTabPillRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 10,
  },
  subTabPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  subTabPillActive: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED",
  },
  subTabPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  subTabPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  suggestionsBox: {
    marginTop: 6,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    maxHeight: 200,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 4,
    zIndex: 999,
  },
  suggestionsHeader: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#F8FAFC",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  suggestionsHeaderText: {
    color: "#7C3AED",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  suggestionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  suggestionName: {
    color: "#1E293B",
    fontSize: 13,
    fontWeight: "600",
  },
  suggestionCodeBadge: {
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  suggestionCodeText: {
    color: "#7C3AED",
    fontSize: 10,
    fontWeight: "700",
  },
  electivePillSmall: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    gap: 2,
  },
  electivePillSmallText: {
    color: "#D97706",
    fontSize: 9,
    fontWeight: "700",
  },
  suggestionTeacher: {
    color: "#64748B",
    fontSize: 11,
    marginTop: 2,
  },
  suggestionAddNewItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#ECFDF5",
    gap: 8,
  },
  suggestionAddNewText: {
    color: "#059669",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },

  /* BRANCH PROMO BANNER */
  branchPromoBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 16,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: "#BFDBFE",
  },
  branchPromoLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  branchPromoIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  branchPromoTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#1E3A8A",
  },
  branchPromoSub: {
    fontSize: 11,
    color: "#3B82F6",
    marginTop: 2,
    lineHeight: 15,
  },
  branchBadgeMini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 5,
  },
  branchBadgeMiniText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },
  branchPromoAction: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "#2563EB",
    borderRadius: 10,
    marginLeft: 10,
  },
  branchPromoActionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "800",
  },

  /* OPTIONAL TRAY SECTION IN MODAL */
  optionalTraySection: {
    marginBottom: 16,
    backgroundColor: "#F8FAFC",
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  optionalTrayHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  optionalTrayTitle: {
    fontSize: 12,
    fontWeight: "800",
    color: "#7C3AED",
  },
  optionalTrayAllText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },
  optionalScrollContainer: {
    gap: 8,
  },
  optionalSubjectChipCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 10,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    minWidth: 160,
    maxWidth: 200,
  },
  optionalSubjectChipCardActive: {
    borderColor: "#7C3AED",
    backgroundColor: "#FAF5FF",
  },
  optChipTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  optCodePill: {
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  optCodeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#7C3AED",
  },
  optCreditsText: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
  },
  optChipTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 3,
  },
  optChipTeacher: {
    fontSize: 10,
    color: "#64748B",
  },

  /* FACULTY CHIPS */
  facultyChipsContainer: {
    marginTop: 8,
  },
  facultyChipsLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  facultyMiniChip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginRight: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  facultyMiniChipActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  facultyMiniChipText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
  },
  facultyMiniChipTextActive: {
    color: "#2563EB",
    fontWeight: "700",
  },

  // =====================================================
  // MODAL
  // =====================================================

  modalOverlay: {
  flex: 1,
  justifyContent: "flex-end",
},

modalBackground: {
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  bottom: 0,
  backgroundColor: "rgba(0,0,0,0.45)",
},

modalContainer: {
  backgroundColor: "#FFFFFF",
  borderTopLeftRadius: 26,
  borderTopRightRadius: 26,
  paddingHorizontal: 20,
  paddingTop: 22,
  paddingBottom: Platform.OS === "ios" ? 35 : 24,
},

modalHeader: {
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
  marginBottom: 25,
},

modalTitle: {
  fontSize: 21,
  fontWeight: "800",
  color: DARK,
},

modalSubtitle: {
  marginTop: 4,
  fontSize: 13,
  color: GRAY,
},

closeButton: {
  width: 38,
  height: 38,
  borderRadius: 19,
  backgroundColor: "#F1F5F9",
  alignItems: "center",
  justifyContent: "center",
},

inputGroup: {
  marginBottom: 18,
},

inputLabel: {
  fontSize: 14,
  fontWeight: "700",
  color: TEXT,
  marginBottom: 8,
},

inputContainer: {
  height: 52,
  borderWidth: 1,
  borderColor: BORDER,
  borderRadius: 13,
  paddingHorizontal: 14,
  backgroundColor: "#FFFFFF",
  flexDirection: "row",
  alignItems: "center",
},

input: {
  flex: 1,
  marginLeft: 10,
  fontSize: 15,
  color: TEXT,
},

saveButton: {
  height: 52,
  borderRadius: 13,
  backgroundColor: BLUE,
  alignItems: "center",
  justifyContent: "center",
  flexDirection: "row",
  gap: 7,
  marginTop: 5,
},

disabledButton: {
  opacity: 0.6,
},

saveButtonText: {
  color: "#FFFFFF",
  fontSize: 15,
  fontWeight: "800",
},
});