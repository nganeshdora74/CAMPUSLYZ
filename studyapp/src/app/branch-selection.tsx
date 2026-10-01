import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { router, useLocalSearchParams } from "expo-router";
import { auth, db } from "../firebase/config";
import { collection, doc, onSnapshot } from "firebase/firestore";
import {
  Branch,
  DEFAULT_BRANCHES,
  listenBranches,
  saveUserCurriculum,
  SubjectItem,
} from "../services/curriculumService";
import { useAppTheme } from "../context/ThemeContext";

type Step = "branch" | "subjects" | "teachers" | "review";

export default function BranchSelectionScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 800;
  const { colors, isDark } = useAppTheme();
  const params = useLocalSearchParams<{ initialStep?: string; targetUid?: string }>();

  const [currentStep, setCurrentStep] = useState<Step>("branch");
  const [branches, setBranches] = useState<Branch[]>(DEFAULT_BRANCHES);
  const [selectedBranch, setSelectedBranch] = useState<Branch>(DEFAULT_BRANCHES[0]);
  const [selectedCoreSubjects, setSelectedCoreSubjects] = useState<SubjectItem[]>([]);
  const [selectedOptionalSubjects, setSelectedOptionalSubjects] = useState<SubjectItem[]>([]);
  const [facultyList, setFacultyList] = useState<{ id: string; name: string; department?: string; subjects?: string[] }[]>([]);

  // Subject -> Teacher mapping
  const [subjectTeacherMap, setSubjectTeacherMap] = useState<Record<string, string>>({});

  // Custom subject modal
  const [customSubjectModal, setCustomSubjectModal] = useState(false);
  const [customSubjectName, setCustomSubjectName] = useState("");
  const [customSubjectCode, setCustomSubjectCode] = useState("");
  const [customTeacherName, setCustomTeacherName] = useState("");
  const [customSubjectType, setCustomSubjectType] = useState<"core" | "optional">("optional");

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  // 1. Listen to live branches from Firestore
  useEffect(() => {
    const unsub = listenBranches((loadedBranches) => {
      if (loadedBranches.length > 0) {
        setBranches(loadedBranches);
        // If current selection is not in list, default to first
        setSelectedBranch((prev) => {
          const found = loadedBranches.find((b) => b.id === prev.id);
          return found || loadedBranches[0];
        });
      }
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 2. Listen to faculty list to recommend teachers
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "faculty"),
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          name: d.data().name || "Faculty Member",
          department: d.data().department || "",
          subjects: Array.isArray(d.data().subjects) ? d.data().subjects : [],
        }));
        setFacultyList(list);
      },
      (err) => console.warn("Faculty error in branch selection:", err)
    );
    return () => unsub();
  }, []);

  // 3. Load user's already selected branch if available
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const targetUserId = params.targetUid || user.uid;

    const userRef = doc(db, "users", targetUserId);
    const unsub = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.selectedBranchId) {
          const matching = branches.find((b) => b.id === data.selectedBranchId);
          if (matching) setSelectedBranch(matching);
        } else if (data.branch || data.department) {
          const nameMatch = branches.find(
            (b) =>
              b.name.toLowerCase() === (data.branch || data.department).toLowerCase() ||
              b.code.toLowerCase() === (data.branchCode || "").toLowerCase()
          );
          if (nameMatch) setSelectedBranch(nameMatch);
        }
      }
    });
    return () => unsub();
  }, [branches, params.targetUid]);

  // When selected branch changes, populate default core subjects & teachers
  useEffect(() => {
    if (selectedBranch) {
      setSelectedCoreSubjects([...selectedBranch.coreSubjects]);
      // Default 2 optional subjects pre-selected as suggestions
      setSelectedOptionalSubjects(selectedBranch.optionalSubjects.slice(0, 2));

      // Build initial teacher mapping
      const initialMap: Record<string, string> = {};
      selectedBranch.coreSubjects.forEach((s) => {
        initialMap[s.name] = s.defaultTeacher || "Prof. Incharge";
      });
      selectedBranch.optionalSubjects.forEach((s) => {
        initialMap[s.name] = s.defaultTeacher || "Elective Faculty";
      });
      setSubjectTeacherMap((prev) => ({ ...initialMap, ...prev }));
    }
  }, [selectedBranch]);

  // Toggle an optional subject selection
  const toggleOptionalSubject = (item: SubjectItem) => {
    const exists = selectedOptionalSubjects.some((s) => s.id === item.id || s.name === item.name);
    if (exists) {
      setSelectedOptionalSubjects((prev) => prev.filter((s) => s.id !== item.id && s.name !== item.name));
    } else {
      setSelectedOptionalSubjects((prev) => [...prev, item]);
      if (!subjectTeacherMap[item.name]) {
        setSubjectTeacherMap((prev) => ({
          ...prev,
          [item.name]: item.defaultTeacher || "Elective Faculty",
        }));
      }
    }
  };

  // Toggle a core subject selection
  const toggleCoreSubject = (item: SubjectItem) => {
    const exists = selectedCoreSubjects.some((s) => s.id === item.id || s.name === item.name);
    if (exists) {
      if (selectedCoreSubjects.length <= 1) {
        Alert.alert("Notice", "At least one core subject is recommended for your curriculum.");
        return;
      }
      setSelectedCoreSubjects((prev) => prev.filter((s) => s.id !== item.id && s.name !== item.name));
    } else {
      setSelectedCoreSubjects((prev) => [...prev, item]);
    }
  };

  // Add custom subject
  const handleAddCustomSubject = () => {
    if (!customSubjectName.trim()) {
      Alert.alert("Required", "Please enter a subject name.");
      return;
    }

    const newSub: SubjectItem = {
      id: `custom-${Date.now()}`,
      name: customSubjectName.trim(),
      code: customSubjectCode.trim().toUpperCase() || "SUB-ELEC",
      credits: 3,
      type: customSubjectType,
      defaultTeacher: customTeacherName.trim() || "Course Faculty",
    };

    if (customSubjectType === "core") {
      setSelectedCoreSubjects((prev) => [...prev, newSub]);
    } else {
      setSelectedOptionalSubjects((prev) => [...prev, newSub]);
    }

    setSubjectTeacherMap((prev) => ({
      ...prev,
      [newSub.name]: customTeacherName.trim() || "Course Faculty",
    }));

    setCustomSubjectName("");
    setCustomSubjectCode("");
    setCustomTeacherName("");
    setCustomSubjectModal(false);
  };

  // Save all selections to Firebase
  const handleSaveAndFinish = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Login Required", "Please log in to save your subjects.");
      return;
    }

    const allSelected = [
      ...selectedCoreSubjects.map((s) => ({
        name: s.name,
        code: s.code,
        type: "core" as const,
        teacherName: subjectTeacherMap[s.name] || s.defaultTeacher || "Subject Teacher",
        credits: s.credits || 4,
      })),
      ...selectedOptionalSubjects.map((s) => ({
        name: s.name,
        code: s.code,
        type: "optional" as const,
        teacherName: subjectTeacherMap[s.name] || s.defaultTeacher || "Elective Teacher",
        credits: s.credits || 3,
      })),
    ];

    if (allSelected.length === 0) {
      Alert.alert("No Subjects Selected", "Please select at least one subject.");
      return;
    }

    try {
      setSaving(true);
      const targetUserId = params.targetUid || user.uid;
      await saveUserCurriculum(targetUserId, selectedBranch, allSelected);

      Alert.alert(
        "Setup Completed! 🎓",
        `Your branch "${selectedBranch.name}" and ${allSelected.length} subjects (with assigned teachers) have been saved successfully to Campusly.`,
        [
          {
            text: "View My Subjects",
            onPress: () => router.replace("/subjects"),
          },
          {
            text: "Go to Dashboard",
            onPress: () => router.replace("/(tab)/home"),
          },
        ]
      );
    } catch (e: any) {
      console.error("Error saving curriculum:", e);
      Alert.alert("Error", e?.message || "Failed to save curriculum setup.");
    } finally {
      setSaving(false);
    }
  };

  const allSelectedSubjects = useMemo(() => {
    return [
      ...selectedCoreSubjects.map((s) => ({ ...s, isCore: true })),
      ...selectedOptionalSubjects.map((s) => ({ ...s, isCore: false })),
    ];
  }, [selectedCoreSubjects, selectedOptionalSubjects]);

  if (loading) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#2563EB" />
        <Text style={styles.loadingText}>Loading curriculum options...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* ==================================================== */}
      {/* HEADER (Matching WhatsApp Screenshot Style) */}
      {/* ==================================================== */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (currentStep === "review") setCurrentStep("teachers");
            else if (currentStep === "teachers") setCurrentStep("subjects");
            else if (currentStep === "subjects") setCurrentStep("branch");
            else router.back();
          }}
          activeOpacity={0.7}
        >
          <Ionicons name="chevron-back" size={24} color="#1E293B" />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>
            {currentStep === "branch" && "Select Your Branch"}
            {currentStep === "subjects" && "Choose Subjects"}
            {currentStep === "teachers" && "Assign Teachers"}
            {currentStep === "review" && "Review & Confirm"}
          </Text>
          <Text style={styles.headerSubtitle}>
            {currentStep === "branch" && "Choose your branch from the options below"}
            {currentStep === "subjects" && "Core subjects & optional electives on the side"}
            {currentStep === "teachers" && "Verify teachers & instructors for each subject"}
            {currentStep === "review" && "Review your finalized curriculum & schedule"}
          </Text>
        </View>

        <View style={{ width: 40 }} />
      </View>

      {/* STEP PROGRESS INDICATOR */}
      <View style={styles.stepProgressRow}>
        {(["branch", "subjects", "teachers", "review"] as Step[]).map((stepKey, idx) => {
          const stepLabels = ["1. Branch", "2. Subjects & Electives", "3. Teachers", "4. Review"];
          const isActive = currentStep === stepKey;
          const isPassed =
            (stepKey === "branch" && currentStep !== "branch") ||
            (stepKey === "subjects" && (currentStep === "teachers" || currentStep === "review")) ||
            (stepKey === "teachers" && currentStep === "review");

          return (
            <TouchableOpacity
              key={stepKey}
              style={[
                styles.stepPill,
                isActive && styles.stepPillActive,
                isPassed && styles.stepPillPassed,
              ]}
              onPress={() => {
                if (isPassed || isActive) setCurrentStep(stepKey);
              }}
            >
              <Text
                style={[
                  styles.stepPillText,
                  isActive && styles.stepPillTextActive,
                  isPassed && styles.stepPillTextPassed,
                ]}
              >
                {stepLabels[idx]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* ==================================================== */}
      {/* STEP 1: SELECT YOUR BRANCH (Exact WhatsApp Screenshot) */}
      {/* ==================================================== */}
      {currentStep === "branch" && (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.branchList}>
            {branches.map((b) => {
              const isSelected = selectedBranch.id === b.id;
              return (
                <TouchableOpacity
                  key={b.id}
                  style={[
                    styles.branchCard,
                    isSelected && styles.branchCardSelected,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setSelectedBranch(b)}
                >
                  {/* Left Circular Colored Icon */}
                  <View style={[styles.branchIconCircle, { backgroundColor: b.iconBg }]}>
                    <Ionicons name={b.icon} size={22} color="#FFFFFF" />
                  </View>

                  {/* Branch Details */}
                  <View style={styles.branchTextCol}>
                    <Text style={styles.branchTitle}>{b.name}</Text>
                    <Text style={styles.branchSubtitle}>{b.description}</Text>
                  </View>

                  {/* Radio Selection Circle on Right */}
                  <View style={styles.radioContainer}>
                    {isSelected ? (
                      <View style={styles.radioSelected}>
                        <Ionicons name="checkmark" size={15} color="#FFFFFF" />
                      </View>
                    ) : (
                      <View style={styles.radioUnselected} />
                    )}
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      {/* ==================================================== */}
      {/* STEP 2: SELECT SUBJECTS & OPTIONAL ELECTIVES ON SIDE */}
      {/* ==================================================== */}
      {currentStep === "subjects" && (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Active Branch Info Banner */}
          <View style={styles.branchBanner}>
            <View style={[styles.miniBranchIcon, { backgroundColor: selectedBranch.iconBg }]}>
              <Ionicons name={selectedBranch.icon} size={18} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.branchBannerTitle}>{selectedBranch.name}</Text>
              <Text style={styles.branchBannerSub}>{selectedBranch.code} Curriculum</Text>
            </View>
            <TouchableOpacity
              style={styles.changeBranchLink}
              onPress={() => setCurrentStep("branch")}
            >
              <Text style={styles.changeBranchLinkText}>Change</Text>
            </TouchableOpacity>
          </View>

          {/* TWO COLUMN / SPLIT LAYOUT: Core Subjects & Optional Electives Side-by-Side */}
          <View style={[styles.subjectLayoutRow, !isDesktop && styles.subjectLayoutCol]}>
            {/* ------------------------------------------------ */}
            {/* COLUMN 1: CORE REQUIRED SUBJECTS */}
            {/* ------------------------------------------------ */}
            <View style={[styles.subjectSectionCard, { flex: 1.1 }]}>
              <View style={styles.sectionHeadingRow}>
                <View style={styles.sectionHeadingLeft}>
                  <Ionicons name="book" size={18} color="#2563EB" />
                  <Text style={styles.sectionHeadingText}>Core Subjects</Text>
                </View>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{selectedCoreSubjects.length} selected</Text>
                </View>
              </View>
              <Text style={styles.sectionSubtext}>
                Standard mandatory subjects for {selectedBranch.code}. Tap to include or exclude.
              </Text>

              <View style={styles.subjectItemsList}>
                {selectedBranch.coreSubjects.map((item) => {
                  const isChecked = selectedCoreSubjects.some((s) => s.id === item.id || s.name === item.name);
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.subjectSelectCard,
                        isChecked && styles.subjectSelectCardActive,
                      ]}
                      onPress={() => toggleCoreSubject(item)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.checkboxCircle, isChecked && styles.checkboxCircleChecked]}>
                        {isChecked && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                      </View>

                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.subjectItemTitle}>{item.name}</Text>
                        <Text style={styles.subjectItemCode}>
                          {item.code} • {item.credits || 4} Credits
                        </Text>
                        {item.description ? (
                          <Text style={styles.subjectItemDesc} numberOfLines={1}>
                            {item.description}
                          </Text>
                        ) : null}
                      </View>

                      <View style={styles.corePill}>
                        <Text style={styles.corePillText}>Core</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* ------------------------------------------------ */}
            {/* COLUMN 2: OPTIONAL ELECTIVE SUBJECTS (AT THE SIDE) */}
            {/* ------------------------------------------------ */}
            <View style={[styles.subjectSectionCard, { flex: 1.2, backgroundColor: "#F8FAFC" }]}>
              <View style={styles.sectionHeadingRow}>
                <View style={styles.sectionHeadingLeft}>
                  <Ionicons name="sparkles" size={18} color="#7C3AED" />
                  <Text style={[styles.sectionHeadingText, { color: "#7C3AED" }]}>
                    Optional Electives
                  </Text>
                </View>
                <View style={[styles.countBadge, { backgroundColor: "#EDE9FE" }]}>
                  <Text style={[styles.countBadgeText, { color: "#7C3AED" }]}>
                    {selectedOptionalSubjects.length} chosen
                  </Text>
                </View>
              </View>
              <Text style={styles.sectionSubtext}>
                Available elective subjects for {selectedBranch.code}. Choose the topics you want to study.
              </Text>

              <View style={styles.subjectItemsList}>
                {selectedBranch.optionalSubjects.map((item) => {
                  const isChecked = selectedOptionalSubjects.some(
                    (s) => s.id === item.id || s.name === item.name
                  );
                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={[
                        styles.subjectSelectCard,
                        styles.optionalSelectCard,
                        isChecked && styles.optionalSelectCardActive,
                      ]}
                      onPress={() => toggleOptionalSubject(item)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.checkboxCircle,
                          styles.optionalCheckbox,
                          isChecked && styles.optionalCheckboxChecked,
                        ]}
                      >
                        {isChecked && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                      </View>

                      <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.subjectItemTitle}>{item.name}</Text>
                        <Text style={[styles.subjectItemCode, { color: "#7C3AED" }]}>
                          {item.code} • {item.credits || 3} Credits
                        </Text>
                        {item.description ? (
                          <Text style={styles.subjectItemDesc} numberOfLines={1}>
                            {item.description}
                          </Text>
                        ) : null}
                      </View>

                      <View style={[styles.corePill, { backgroundColor: "#EDE9FE" }]}>
                        <Text style={[styles.corePillText, { color: "#7C3AED" }]}>
                          {isChecked ? "Selected" : "+ Add"}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}

                {/* Button to add custom subject if not listed */}
                <TouchableOpacity
                  style={styles.addCustomBtn}
                  onPress={() => setCustomSubjectModal(true)}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#2563EB" />
                  <Text style={styles.addCustomBtnText}>Add Other Subject & Teacher</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      {/* ==================================================== */}
      {/* STEP 3: ASSIGN TEACHERS & SUBJECTS */}
      {/* ==================================================== */}
      {currentStep === "teachers" && (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.infoBannerBox}>
            <Ionicons name="people" size={22} color="#2563EB" />
            <View style={{ flex: 1, marginLeft: 10 }}>
              <Text style={styles.infoBannerTitle}>Assigned Faculty Members</Text>
              <Text style={styles.infoBannerSubtitle}>
                Review or assign the teacher in charge for each selected subject.
              </Text>
            </View>
          </View>

          <View style={styles.teacherCardsList}>
            {allSelectedSubjects.map((sub, idx) => {
              const currentTeacher = subjectTeacherMap[sub.name] || sub.defaultTeacher || "Prof. Incharge";

              return (
                <View key={idx} style={styles.teacherAssignmentCard}>
                  <View style={styles.teacherSubjectRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.teacherSubjectTitle}>{sub.name}</Text>
                      <Text style={styles.teacherSubjectCode}>
                        {sub.code} • {sub.isCore ? "Core Subject" : "Optional Elective"}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.tagBadge,
                        { backgroundColor: sub.isCore ? "#EFF6FF" : "#EDE9FE" },
                      ]}
                    >
                      <Text
                        style={[
                          styles.tagBadgeText,
                          { color: sub.isCore ? "#2563EB" : "#7C3AED" },
                        ]}
                      >
                        {sub.isCore ? "Core" : "Elective"}
                      </Text>
                    </View>
                  </View>

                  {/* Teacher Input / Recommended Faculty Selector */}
                  <View style={styles.teacherInputGroup}>
                    <Text style={styles.teacherInputLabel}>Teacher / Professor In Charge:</Text>
                    <View style={styles.teacherInputContainer}>
                      <Ionicons name="person-outline" size={18} color="#64748B" />
                      <TextInput
                        style={styles.teacherTextInput}
                        value={currentTeacher}
                        onChangeText={(txt) =>
                          setSubjectTeacherMap((prev) => ({
                            ...prev,
                            [sub.name]: txt,
                          }))
                        }
                        placeholder="e.g. Dr. S. Ramesh"
                        placeholderTextColor="#94A3B8"
                      />
                    </View>
                  </View>

                  {/* Quick faculty recommendation pills */}
                  {facultyList.length > 0 && (
                    <View style={styles.quickFacultyRow}>
                      <Text style={styles.quickFacultyLabel}>Suggested from Faculty:</Text>
                      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                        {facultyList.slice(0, 5).map((fac) => (
                          <TouchableOpacity
                            key={fac.id}
                            style={[
                              styles.facultyChip,
                              currentTeacher === fac.name && styles.facultyChipActive,
                            ]}
                            onPress={() =>
                              setSubjectTeacherMap((prev) => ({
                                ...prev,
                                [sub.name]: fac.name,
                              }))
                            }
                          >
                            <Text
                              style={[
                                styles.facultyChipText,
                                currentTeacher === fac.name && styles.facultyChipTextActive,
                              ]}
                            >
                              {fac.name}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      {/* ==================================================== */}
      {/* STEP 4: REVIEW & CONFIRM */}
      {/* ==================================================== */}
      {currentStep === "review" && (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Summary Box */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryTopRow}>
              <View style={[styles.branchIconCircle, { backgroundColor: selectedBranch.iconBg }]}>
                <Ionicons name={selectedBranch.icon} size={24} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, marginLeft: 14 }}>
                <Text style={styles.summaryBranchName}>{selectedBranch.name}</Text>
                <Text style={styles.summaryBranchCode}>
                  Department Code: {selectedBranch.code}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.editSummaryBtn}
                onPress={() => setCurrentStep("branch")}
              >
                <Text style={styles.editSummaryBtnText}>Edit</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.summaryStatsRow}>
              <View style={styles.summaryStatItem}>
                <Text style={styles.summaryStatValue}>{selectedCoreSubjects.length}</Text>
                <Text style={styles.summaryStatLabel}>Core Subjects</Text>
              </View>
              <View style={styles.summaryStatDivider} />
              <View style={styles.summaryStatItem}>
                <Text style={[styles.summaryStatValue, { color: "#7C3AED" }]}>
                  {selectedOptionalSubjects.length}
                </Text>
                <Text style={styles.summaryStatLabel}>Optional Electives</Text>
              </View>
              <View style={styles.summaryStatDivider} />
              <View style={styles.summaryStatItem}>
                <Text style={[styles.summaryStatValue, { color: "#10B981" }]}>
                  {allSelectedSubjects.length}
                </Text>
                <Text style={styles.summaryStatLabel}>Total Courses</Text>
              </View>
            </View>
          </View>

          {/* Roster of chosen Subjects & Teachers */}
          <Text style={styles.rosterHeading}>Finalized Course & Teacher Roster</Text>
          <View style={styles.rosterCard}>
            {allSelectedSubjects.map((sub, idx) => {
              const teacherName = subjectTeacherMap[sub.name] || sub.defaultTeacher || "Assigned Teacher";
              return (
                <View
                  key={idx}
                  style={[
                    styles.rosterItem,
                    idx < allSelectedSubjects.length - 1 && styles.rosterItemBorder,
                  ]}
                >
                  <View style={[styles.rosterBullet, { backgroundColor: sub.isCore ? "#2563EB" : "#7C3AED" }]} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.rosterSubjectName}>{sub.name}</Text>
                    <View style={styles.rosterTeacherRow}>
                      <Ionicons name="person" size={13} color="#64748B" />
                      <Text style={styles.rosterTeacherText}>{teacherName}</Text>
                      <Text style={styles.rosterCodeText}>• {sub.code}</Text>
                    </View>
                  </View>
                  <View
                    style={[
                      styles.rosterBadge,
                      { backgroundColor: sub.isCore ? "#EFF6FF" : "#EDE9FE" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.rosterBadgeText,
                        { color: sub.isCore ? "#2563EB" : "#7C3AED" },
                      ]}
                    >
                      {sub.isCore ? "Core" : "Optional"}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>
      )}

      {/* ==================================================== */}
      {/* BOTTOM ACTION BAR (Sticky Continue / Confirm Button) */}
      {/* ==================================================== */}
      <View style={styles.bottomBar}>
        {currentStep === "branch" && (
          <TouchableOpacity
            style={styles.continueButton}
            onPress={() => setCurrentStep("subjects")}
            activeOpacity={0.85}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {currentStep === "subjects" && (
          <View style={styles.twoButtonRow}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setCurrentStep("branch")}
            >
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.continueButton, { flex: 2 }]}
              onPress={() => setCurrentStep("teachers")}
              activeOpacity={0.85}
            >
              <Text style={styles.continueButtonText}>Assign Teachers</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {currentStep === "teachers" && (
          <View style={styles.twoButtonRow}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setCurrentStep("subjects")}
            >
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.continueButton, { flex: 2 }]}
              onPress={() => setCurrentStep("review")}
              activeOpacity={0.85}
            >
              <Text style={styles.continueButtonText}>Review Selection</Text>
              <Ionicons name="arrow-forward" size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        )}

        {currentStep === "review" && (
          <View style={styles.twoButtonRow}>
            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={() => setCurrentStep("teachers")}
              disabled={saving}
            >
              <Text style={styles.secondaryButtonText}>Back</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.continueButton, styles.confirmButton, { flex: 2 }]}
              onPress={handleSaveAndFinish}
              disabled={saving}
              activeOpacity={0.85}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={20} color="#FFFFFF" />
                  <Text style={styles.continueButtonText}>Confirm & Apply</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ==================================================== */}
      {/* CUSTOM SUBJECT MODAL */}
      {/* ==================================================== */}
      <Modal
        visible={customSubjectModal}
        transparent
        animationType="slide"
        onRequestClose={() => setCustomSubjectModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Custom Subject</Text>
              <TouchableOpacity onPress={() => setCustomSubjectModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalFormGroup}>
              <Text style={styles.modalLabel}>Subject Name *</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Distributed Cloud Architectures"
                placeholderTextColor="#94A3B8"
                value={customSubjectName}
                onChangeText={setCustomSubjectName}
              />
            </View>

            <View style={styles.modalFormGroup}>
              <Text style={styles.modalLabel}>Course Code (Optional)</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. CS415"
                placeholderTextColor="#94A3B8"
                value={customSubjectCode}
                onChangeText={setCustomSubjectCode}
              />
            </View>

            <View style={styles.modalFormGroup}>
              <Text style={styles.modalLabel}>Teacher / Professor Name</Text>
              <TextInput
                style={styles.modalInput}
                placeholder="e.g. Dr. K. Sushma"
                placeholderTextColor="#94A3B8"
                value={customTeacherName}
                onChangeText={setCustomTeacherName}
              />
            </View>

            <View style={styles.modalFormGroup}>
              <Text style={styles.modalLabel}>Subject Category</Text>
              <View style={styles.typeSelectorRow}>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    customSubjectType === "optional" && styles.typeOptionActive,
                  ]}
                  onPress={() => setCustomSubjectType("optional")}
                >
                  <Text
                    style={[
                      styles.typeOptionText,
                      customSubjectType === "optional" && styles.typeOptionTextActive,
                    ]}
                  >
                    Optional / Elective
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeOption,
                    customSubjectType === "core" && styles.typeOptionActive,
                  ]}
                  onPress={() => setCustomSubjectType("core")}
                >
                  <Text
                    style={[
                      styles.typeOptionText,
                      customSubjectType === "core" && styles.typeOptionTextActive,
                    ]}
                  >
                    Core Mandatory
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setCustomSubjectModal(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleAddCustomSubject}
              >
                <Text style={styles.modalSubmitBtnText}>Add Subject</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
    fontWeight: "600",
  },

  /* HEADER (Matching WhatsApp Screenshot) */
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },
  headerSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 3,
  },

  /* STEP PROGRESS PILLS */
  stepProgressRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    gap: 6,
  },
  stepPill: {
    flex: 1,
    paddingVertical: 7,
    paddingHorizontal: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
  },
  stepPillActive: {
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#3B82F6",
  },
  stepPillPassed: {
    backgroundColor: "#F0FDF4",
  },
  stepPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  stepPillTextActive: {
    color: "#2563EB",
    fontWeight: "800",
  },
  stepPillTextPassed: {
    color: "#16A34A",
  },

  /* SCROLL CONTENT */
  scrollArea: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 30,
  },

  /* BRANCH CARDS (EXACT WHATSAPP SCREENSHOT STYLE) */
  branchList: {
    gap: 14,
  },
  branchCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  branchCardSelected: {
    borderColor: "#2563EB",
    backgroundColor: "#F0F7FF",
    shadowColor: "#2563EB",
    shadowOpacity: 0.12,
  },
  branchIconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  branchTextCol: {
    flex: 1,
    marginLeft: 14,
    marginRight: 10,
  },
  branchTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 3,
  },
  branchSubtitle: {
    fontSize: 12,
    color: "#64748B",
    lineHeight: 17,
  },
  radioContainer: {
    width: 26,
    height: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  radioUnselected: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  radioSelected: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },

  /* BRANCH BANNER */
  branchBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  miniBranchIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  branchBannerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  branchBannerSub: {
    fontSize: 12,
    color: "#64748B",
  },
  changeBranchLink: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
  },
  changeBranchLinkText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },

  /* TWO-COLUMN SUBJECT LAYOUT */
  subjectLayoutRow: {
    flexDirection: "row",
    gap: 16,
  },
  subjectLayoutCol: {
    flexDirection: "column",
  },
  subjectSectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  sectionHeadingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  sectionHeadingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionHeadingText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  sectionSubtext: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 14,
    lineHeight: 17,
  },
  countBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },
  subjectItemsList: {
    gap: 10,
  },
  subjectSelectCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    backgroundColor: "#F8FAFC",
    borderWidth: 1.5,
    borderColor: "#E2E8F0",
  },
  subjectSelectCardActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
  },
  optionalSelectCard: {
    backgroundColor: "#FFFFFF",
  },
  optionalSelectCardActive: {
    backgroundColor: "#FAF5FF",
    borderColor: "#8B5CF6",
  },
  checkboxCircle: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: "#94A3B8",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  checkboxCircleChecked: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  optionalCheckbox: {
    borderColor: "#CBD5E1",
  },
  optionalCheckboxChecked: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED",
  },
  subjectItemTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  subjectItemCode: {
    fontSize: 11,
    fontWeight: "600",
    color: "#2563EB",
    marginTop: 2,
  },
  subjectItemDesc: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  corePill: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#EFF6FF",
  },
  corePillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },
  addCustomBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: "#93C5FD",
    borderRadius: 12,
    gap: 8,
    backgroundColor: "#EFF6FF",
    marginTop: 6,
  },
  addCustomBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
  },

  /* STEP 3: TEACHERS */
  infoBannerBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  infoBannerTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1E40AF",
  },
  infoBannerSubtitle: {
    fontSize: 12,
    color: "#3B82F6",
    marginTop: 2,
  },
  teacherCardsList: {
    gap: 14,
  },
  teacherAssignmentCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    elevation: 1,
  },
  teacherSubjectRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  teacherSubjectTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  teacherSubjectCode: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  tagBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  tagBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  teacherInputGroup: {
    marginBottom: 8,
  },
  teacherInputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
  },
  teacherInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    backgroundColor: "#F8FAFC",
  },
  teacherTextInput: {
    flex: 1,
    height: 42,
    marginLeft: 8,
    fontSize: 13,
    color: "#0F172A",
    fontWeight: "600",
  },
  quickFacultyRow: {
    marginTop: 6,
  },
  quickFacultyLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  facultyChip: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginRight: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  facultyChipActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
  },
  facultyChipText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
  },
  facultyChipTextActive: {
    color: "#2563EB",
    fontWeight: "700",
  },

  /* STEP 4: REVIEW */
  summaryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 20,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    elevation: 2,
  },
  summaryTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  summaryBranchName: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  summaryBranchCode: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  editSummaryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  editSummaryBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  summaryStatsRow: {
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  summaryStatItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryStatValue: {
    fontSize: 20,
    fontWeight: "900",
    color: "#2563EB",
  },
  summaryStatLabel: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "600",
  },
  summaryStatDivider: {
    width: 1,
    height: 28,
    backgroundColor: "#E2E8F0",
  },
  rosterHeading: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 10,
  },
  rosterCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  rosterItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
  },
  rosterItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  rosterBullet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 12,
  },
  rosterSubjectName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  rosterTeacherRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  rosterTeacherText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  rosterCodeText: {
    fontSize: 11,
    color: "#94A3B8",
  },
  rosterBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  rosterBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },

  /* BOTTOM BAR (Matches WhatsApp screenshot solid blue Continue button) */
  bottomBar: {
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  continueButton: {
    height: 52,
    backgroundColor: "#2563EB",
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  confirmButton: {
    backgroundColor: "#16A34A",
  },
  twoButtonRow: {
    flexDirection: "row",
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  secondaryButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#475569",
  },

  /* MODAL STYLES */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContent: {
    width: "100%",
    maxWidth: 480,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalFormGroup: {
    marginBottom: 14,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 6,
  },
  modalInput: {
    height: 44,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 13,
    color: "#0F172A",
    backgroundColor: "#F8FAFC",
  },
  typeSelectorRow: {
    flexDirection: "row",
    gap: 10,
  },
  typeOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  typeOptionActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#3B82F6",
  },
  typeOptionText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  typeOptionTextActive: {
    color: "#2563EB",
    fontWeight: "800",
  },
  modalButtonsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 10,
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#64748B",
  },
  modalSubmitBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  modalSubmitBtnText: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FFFFFF",
  },
});
