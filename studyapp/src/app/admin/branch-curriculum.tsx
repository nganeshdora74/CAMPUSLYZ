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
import { router } from "expo-router";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "../../firebase/config";
import { confirmAction, confirmLogout } from "../../firebase/auth";
import { useAppTheme } from "../../context/ThemeContext";
import AdminThemeToggle from "../../components/admin/AdminThemeToggle";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTopBar from "../../components/admin/AdminTopBar";
import {
  Branch,
  DEFAULT_BRANCHES,
  listenBranches,
  seedBranchesToFirestore,
  SubjectItem,
  updateBranchInFirestore,
} from "../../services/curriculumService";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "home", route: "/admin" },
  { id: "students", label: "Students", icon: "person", route: "/admin/student" },
  { id: "faculty", label: "Faculty", icon: "people", route: "/admin/faculty" },
  { id: "academics", label: "Academics", icon: "book", route: "/admin/academics" },
  { id: "curriculum", label: "Branch & Electives", icon: "git-branch", route: "/admin/branch-curriculum" },
  { id: "schedule", label: "Schedule", icon: "calendar", route: "/admin/schedule" },
  { id: "attendance", label: "Attendance", icon: "checkbox", route: "/admin/attendence" },
  { id: "certificates", label: "Certificates", icon: "ribbon", route: "/admin/certificate" },
  { id: "hostel", label: "Hostel", icon: "business", route: "/admin/hostel" },
  { id: "mess", label: "Mess", icon: "restaurant", route: "/admin/mess" },
  { id: "fees", label: "Fees", icon: "wallet", route: "/admin/fees" },
  { id: "notices", label: "Notices", icon: "megaphone", route: "/admin/notices" },
  { id: "requests", label: "Requests", icon: "document-text", route: "/admin/requests" },
  { id: "reports", label: "Reports", icon: "bar-chart", route: "/admin/reports" },
  { id: "settings", label: "Settings", icon: "settings", route: "/admin/settings" },
  { id: "profile", label: "Profile", icon: "person-circle", route: "/admin/profile" },
];

type StudentAllocation = {
  uid: string;
  name: string;
  email: string;
  branch: string;
  branchCode?: string;
  selectedSubjects: {
    name: string;
    code: string;
    type: "core" | "optional";
    teacherName: string;
  }[];
};

export default function AdminBranchCurriculumScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const { isDark, colors } = useAppTheme();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"branches" | "subjects" | "students">("branches");
  const [branches, setBranches] = useState<Branch[]>(DEFAULT_BRANCHES);
  const [selectedBranch, setSelectedBranch] = useState<Branch>(DEFAULT_BRANCHES[0]);
  const [loading, setLoading] = useState(true);
  const [savingAction, setSavingAction] = useState(false);

  // Faculty list for teacher suggestions
  const [facultyList, setFacultyList] = useState<{ id: string; name: string; department?: string }[]>([]);

  // Students allocations list
  const [students, setStudents] = useState<StudentAllocation[]>([]);
  const [searchStudent, setSearchStudent] = useState("");

  // Branch Modal
  const [branchModalVisible, setBranchModalVisible] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [branchName, setBranchName] = useState("");
  const [branchCode, setBranchCode] = useState("");
  const [branchDesc, setBranchDesc] = useState("");
  const [branchColor, setBranchColor] = useState("#2563EB");

  // Subject Modal (Add Core or Optional Subject to branch)
  const [subjectModalVisible, setSubjectModalVisible] = useState(false);
  const [editingSubject, setEditingSubject] = useState<SubjectItem | null>(null);
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [subjectCredits, setSubjectCredits] = useState("3");
  const [subjectTeacher, setSubjectTeacher] = useState("");
  const [subjectDesc, setSubjectDesc] = useState("");
  const [subjectCategory, setSubjectCategory] = useState<"core" | "optional">("optional");

  // Student Edit Allocation Modal
  const [editStudentModal, setEditStudentModal] = useState(false);
  const [selectedStudentForEdit, setSelectedStudentForEdit] = useState<StudentAllocation | null>(null);
  const [studentEditBranchId, setStudentEditBranchId] = useState("");

  // 1. Live Branches listener
  useEffect(() => {
    const unsub = listenBranches((loaded) => {
      setBranches(loaded);
      setSelectedBranch((prev) => {
        const matching = loaded.find((b) => b.id === prev?.id);
        return matching || loaded[0];
      });
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // 2. Live Faculty listener
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
      (err) => console.warn("Faculty error in admin curriculum:", err)
    );
    return () => unsub();
  }, []);

  // 3. Live Students listener
  useEffect(() => {
    const unsub = onSnapshot(
      collection(db, "users"),
      (snap) => {
        const list: StudentAllocation[] = snap.docs
          .filter((d) => (d.data().role || "").toLowerCase() !== "admin")
          .map((d) => {
            const data = d.data();
            return {
              uid: d.id,
              name: data.fullName || data.name || "Student",
              email: data.email || "",
              branch: data.branch || data.department || "Not Selected",
              branchCode: data.branchCode || "",
              selectedSubjects: Array.isArray(data.selectedSubjects) ? data.selectedSubjects : [],
            };
          });
        setStudents(list);
      },
      (err) => console.warn("Users error in admin curriculum:", err)
    );
    return () => unsub();
  }, []);

  // Open Add/Edit Branch Modal
  const handleOpenBranchModal = (b?: Branch) => {
    if (b) {
      setEditingBranch(b);
      setBranchName(b.name);
      setBranchCode(b.code);
      setBranchDesc(b.description);
      setBranchColor(b.iconBg);
    } else {
      setEditingBranch(null);
      setBranchName("");
      setBranchCode("");
      setBranchDesc("");
      setBranchColor("#2563EB");
    }
    setBranchModalVisible(true);
  };

  // Save Branch
  const handleSaveBranch = async () => {
    if (!branchName.trim() || !branchCode.trim()) {
      Alert.alert("Required", "Please provide branch name and department code.");
      return;
    }

    try {
      setSavingAction(true);
      const branchId = editingBranch?.id || branchCode.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
      const payload: Partial<Branch> = {
        name: branchName.trim(),
        code: branchCode.trim().toUpperCase(),
        description: branchDesc.trim() || "Academic Engineering Branch",
        icon: "desktop-outline",
        iconBg: branchColor,
      };

      if (!editingBranch) {
        payload.coreSubjects = [];
        payload.optionalSubjects = [];
      }

      await updateBranchInFirestore(branchId, payload);
      setBranchModalVisible(false);
      Alert.alert("Success", `Branch ${branchName.trim()} saved.`);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to save branch.");
    } finally {
      setSavingAction(false);
    }
  };

  // Delete Branch
  const handleDeleteBranch = (b: Branch) => {
    confirmAction(
      "Delete Branch",
      `Are you sure you want to remove "${b.name}" (${b.code})?`,
      async () => {
        try {
          if (!b.id.startsWith("br-init-")) {
            await deleteDoc(doc(db, "branches", b.id));
          }
          setBranches((prev) => prev.filter((item) => item.id !== b.id));
          if (selectedBranch.id === b.id) {
            const remaining = branches.filter((item) => item.id !== b.id);
            if (remaining.length > 0) {
              setSelectedBranch(remaining[0]);
            }
          }
          if (Platform.OS === "web") {
            window.alert("Branch removed.");
          } else {
            Alert.alert("Deleted", "Branch removed.");
          }
        } catch (e: any) {
          if (Platform.OS === "web") {
            window.alert(e?.message || "Could not delete branch.");
          } else {
            Alert.alert("Error", e?.message || "Could not delete branch.");
          }
        }
      },
      "Delete"
    );
  };

  // Seed default branches
  const handleSeedDefaults = async () => {
    confirmAction(
      "Reset Default Branches",
      "This will sync the default branches, core subjects, and optional electives to Firebase.",
      async () => {
        try {
          setSavingAction(true);
          await seedBranchesToFirestore();
          if (Platform.OS === "web") {
            window.alert("Default curriculum catalog synced to Firebase.");
          } else {
            Alert.alert("Success", "Default curriculum catalog synced to Firebase.");
          }
        } catch (e: any) {
          if (Platform.OS === "web") {
            window.alert(e?.message || "Failed to sync branches.");
          } else {
            Alert.alert("Error", e?.message || "Failed to sync branches.");
          }
        } finally {
          setSavingAction(false);
        }
      },
      "Sync Now"
    );
  };

  // Open Subject Modal
  const handleOpenSubjectModal = (cat: "core" | "optional", s?: SubjectItem) => {
    setSubjectCategory(cat);
    if (s) {
      setEditingSubject(s);
      setSubjectName(s.name);
      setSubjectCode(s.code);
      setSubjectCredits(String(s.credits || 3));
      setSubjectTeacher(s.defaultTeacher || "");
      setSubjectDesc(s.description || "");
    } else {
      setEditingSubject(null);
      setSubjectName("");
      setSubjectCode("");
      setSubjectCredits(cat === "core" ? "4" : "3");
      setSubjectTeacher("");
      setSubjectDesc("");
    }
    setSubjectModalVisible(true);
  };

  // Save Subject to Branch
  const handleSaveSubjectToBranch = async () => {
    if (!subjectName.trim() || !subjectCode.trim()) {
      Alert.alert("Required", "Please provide subject name and code.");
      return;
    }

    try {
      setSavingAction(true);
      const subjectObj: SubjectItem = {
        id: editingSubject?.id || `sub-${Date.now()}`,
        name: subjectName.trim(),
        code: subjectCode.trim().toUpperCase(),
        credits: parseInt(subjectCredits, 10) || 3,
        type: subjectCategory,
        defaultTeacher: subjectTeacher.trim() || "Assigned Faculty",
        description: subjectDesc.trim(),
      };

      let updatedCore = [...selectedBranch.coreSubjects];
      let updatedOptional = [...selectedBranch.optionalSubjects];

      if (subjectCategory === "core") {
        if (editingSubject) {
          updatedCore = updatedCore.map((s) => (s.id === editingSubject.id ? subjectObj : s));
        } else {
          updatedCore.push(subjectObj);
        }
      } else {
        if (editingSubject) {
          updatedOptional = updatedOptional.map((s) => (s.id === editingSubject.id ? subjectObj : s));
        } else {
          updatedOptional.push(subjectObj);
        }
      }

      await updateBranchInFirestore(selectedBranch.id, {
        coreSubjects: updatedCore,
        optionalSubjects: updatedOptional,
      });

      setSubjectModalVisible(false);
      Alert.alert("Saved", `${subjectName.trim()} updated in ${selectedBranch.code} curriculum.`);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to update subjects.");
    } finally {
      setSavingAction(false);
    }
  };

  // Delete Subject from Branch
  const handleDeleteSubjectFromBranch = (subId: string, cat: "core" | "optional") => {
    confirmAction(
      "Remove Subject",
      "Are you sure you want to remove this subject from the curriculum?",
      async () => {
        try {
          let updatedCore = [...selectedBranch.coreSubjects];
          let updatedOptional = [...selectedBranch.optionalSubjects];
          if (cat === "core") {
            updatedCore = updatedCore.filter((s) => s.id !== subId);
          } else {
            updatedOptional = updatedOptional.filter((s) => s.id !== subId);
          }
          // Update local state immediately
          setSelectedBranch((prev) => ({
            ...prev,
            coreSubjects: updatedCore,
            optionalSubjects: updatedOptional,
          }));
          setBranches((prev) =>
            prev.map((b) =>
              b.id === selectedBranch.id
                ? { ...b, coreSubjects: updatedCore, optionalSubjects: updatedOptional }
                : b
            )
          );
          await updateBranchInFirestore(selectedBranch.id, {
            coreSubjects: updatedCore,
            optionalSubjects: updatedOptional,
          });
          if (Platform.OS === "web") {
            window.alert("Subject removed from curriculum.");
          } else {
            Alert.alert("Removed", "Subject removed from curriculum.");
          }
        } catch (e: any) {
          if (Platform.OS === "web") {
            window.alert(e?.message || "Could not remove subject.");
          } else {
            Alert.alert("Error", e?.message || "Could not remove subject.");
          }
        }
      },
      "Remove"
    );
  };

  // Open Edit Student Allocation
  const handleOpenEditStudent = (st: StudentAllocation) => {
    setSelectedStudentForEdit(st);
    const matchedBranch = branches.find(
      (b) => b.name.toLowerCase() === st.branch.toLowerCase() || b.code === st.branchCode
    );
    setStudentEditBranchId(matchedBranch ? matchedBranch.id : branches[0].id);
    setEditStudentModal(true);
  };

  // Save Student Allocation Override
  const handleSaveStudentAllocation = async () => {
    if (!selectedStudentForEdit) return;
    const targetBranch = branches.find((b) => b.id === studentEditBranchId) || branches[0];

    try {
      setSavingAction(true);
      await updateDoc(doc(db, "users", selectedStudentForEdit.uid), {
        branch: targetBranch.name,
        department: targetBranch.name,
        branchCode: targetBranch.code,
        selectedBranchId: targetBranch.id,
        updatedAt: serverTimestamp(),
      });

      setEditStudentModal(false);
      Alert.alert(
        "Student Updated",
        `${selectedStudentForEdit.name}'s branch updated to ${targetBranch.name}.`
      );
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to update student allocation.");
    } finally {
      setSavingAction(false);
    }
  };

  // Filtered Students
  const filteredStudents = useMemo(() => {
    const q = searchStudent.trim().toLowerCase();
    return students.filter((s) => {
      return (
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.email.toLowerCase().includes(q) ||
        s.branch.toLowerCase().includes(q)
      );
    });
  }, [students, searchStudent]);

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.adminSidebar }]}
      edges={["top", "left", "right"]}
    >
      <View style={[styles.mainLayout, { backgroundColor: colors.adminBg }]}>
        {/* Standardized Admin Sidebar */}
        <AdminSidebar
          activeNav="curriculum"
          isDesktop={isDesktop}
          mobileMenuOpen={mobileMenuOpen}
          onCloseMobileMenu={() => setMobileMenuOpen(false)}
        />

        <View style={[styles.contentArea, { backgroundColor: colors.adminBg }]}>
          {/* Standardized Top Bar */}
          <AdminTopBar
            title="Branch, Subject & Teacher Curriculum Manager"
            subtitle="Configure branches, core subjects, optional electives, and teacher mappings"
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
            rightActions={
              <TouchableOpacity
                style={styles.testSelectionBtn}
                onPress={() => router.push("/branch-selection")}
              >
                <Ionicons name="eye-outline" size={16} color="#FFFFFF" />
                <Text style={styles.testSelectionBtnText}>Preview Student Wizard</Text>
              </TouchableOpacity>
            }
          />

          {/* TAB BAR NAVIGATION */}
          <View style={[styles.tabBar, { backgroundColor: colors.adminCard, borderBottomColor: colors.adminCardBorder }]}>
            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "branches" && styles.tabBtnActive]}
              onPress={() => setActiveTab("branches")}
            >
              <Ionicons
                name="git-branch"
                size={18}
                color={activeTab === "branches" ? "#2563EB" : colors.adminTextSecondary}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  { color: activeTab === "branches" ? "#2563EB" : colors.adminTextSecondary },
                ]}
              >
                Branches ({branches.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "subjects" && styles.tabBtnActive]}
              onPress={() => setActiveTab("subjects")}
            >
              <Ionicons
                name="book"
                size={18}
                color={activeTab === "subjects" ? "#2563EB" : colors.adminTextSecondary}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  { color: activeTab === "subjects" ? "#2563EB" : colors.adminTextSecondary },
                ]}
              >
                Branch Subjects & Optional Electives
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabBtn, activeTab === "students" && styles.tabBtnActive]}
              onPress={() => setActiveTab("students")}
            >
              <Ionicons
                name="people"
                size={18}
                color={activeTab === "students" ? "#2563EB" : colors.adminTextSecondary}
              />
              <Text
                style={[
                  styles.tabBtnText,
                  { color: activeTab === "students" ? "#2563EB" : colors.adminTextSecondary },
                ]}
              >
                Student Allocations ({students.length})
              </Text>
            </TouchableOpacity>
          </View>

          {/* BODY */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* -------------------------------------------------- */}
            {/* TAB 1: BRANCHES MANAGEMENT */}
            {/* -------------------------------------------------- */}
            {activeTab === "branches" && (
              <View>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={[styles.sectionTitle, { color: colors.adminText }]}>
                      Configured Engineering Branches
                    </Text>
                    <Text style={[styles.sectionSubtitle, { color: colors.adminTextSecondary }]}>
                      Students choose from these branches during enrollment and onboarding.
                    </Text>
                  </View>

                  <View style={{ flexDirection: "row", gap: 10 }}>
                    <TouchableOpacity
                      style={styles.syncDefaultsBtn}
                      onPress={handleSeedDefaults}
                    >
                      <Ionicons name="refresh" size={16} color="#475569" />
                      <Text style={styles.syncDefaultsBtnText}>Sync Defaults</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.primaryActionBtn}
                      onPress={() => handleOpenBranchModal()}
                    >
                      <Ionicons name="add" size={18} color="#FFFFFF" />
                      <Text style={styles.primaryActionBtnText}>Add Branch</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Grid of Branches */}
                <View style={styles.branchGrid}>
                  {branches.map((b) => (
                    <View
                      key={b.id}
                      style={[
                        styles.adminBranchCard,
                        { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder },
                      ]}
                    >
                      <View style={styles.adminBranchCardTop}>
                        <View style={[styles.branchIconCircle, { backgroundColor: b.iconBg }]}>
                          <Ionicons name={b.icon} size={24} color="#FFFFFF" />
                        </View>

                        <View style={{ flex: 1, marginLeft: 14 }}>
                          <Text style={[styles.adminBranchTitle, { color: colors.adminText }]}>
                            {b.name}
                          </Text>
                          <Text style={styles.adminBranchCode}>Department Code: {b.code}</Text>
                        </View>

                        <View style={styles.cardActionsRow}>
                          <TouchableOpacity
                            style={styles.iconBtn}
                            onPress={() => handleOpenBranchModal(b)}
                          >
                            <Ionicons name="pencil" size={16} color="#2563EB" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.iconBtn, { backgroundColor: "#FEE2E2" }]}
                            onPress={() => handleDeleteBranch(b)}
                          >
                            <Ionicons name="trash-outline" size={16} color="#DC2626" />
                          </TouchableOpacity>
                        </View>
                      </View>

                      <Text style={[styles.adminBranchDesc, { color: colors.adminTextSecondary }]}>
                        {b.description}
                      </Text>

                      <View style={styles.branchCardFooter}>
                        <View style={styles.footerStat}>
                          <Text style={styles.footerStatNum}>{b.coreSubjects?.length || 0}</Text>
                          <Text style={styles.footerStatLabel}>Core Subjects</Text>
                        </View>
                        <View style={styles.footerDivider} />
                        <View style={styles.footerStat}>
                          <Text style={[styles.footerStatNum, { color: "#7C3AED" }]}>
                            {b.optionalSubjects?.length || 0}
                          </Text>
                          <Text style={styles.footerStatLabel}>Electives</Text>
                        </View>

                        <TouchableOpacity
                          style={styles.manageSubjectsBtn}
                          onPress={() => {
                            setSelectedBranch(b);
                            setActiveTab("subjects");
                          }}
                        >
                          <Text style={styles.manageSubjectsBtnText}>Manage Subjects →</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* -------------------------------------------------- */}
            {/* TAB 2: BRANCH SUBJECTS & OPTIONAL ELECTIVES */}
            {/* -------------------------------------------------- */}
            {activeTab === "subjects" && (
              <View>
                {/* Branch Selector Chips */}
                <View style={styles.branchSelectorBar}>
                  <Text style={[styles.selectorLabel, { color: colors.adminText }]}>
                    Selected Branch:
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ flex: 1, marginLeft: 12 }}>
                    {branches.map((b) => {
                      const isSelected = selectedBranch.id === b.id;
                      return (
                        <TouchableOpacity
                          key={b.id}
                          style={[
                            styles.branchSelectChip,
                            isSelected && { backgroundColor: b.iconBg, borderColor: b.iconBg },
                          ]}
                          onPress={() => setSelectedBranch(b)}
                        >
                          <Text
                            style={[
                              styles.branchSelectChipText,
                              isSelected && { color: "#FFFFFF", fontWeight: "800" },
                            ]}
                          >
                            {b.code} - {b.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Split layout: Core Subjects on Left, Optional Subjects on Right */}
                <View style={[styles.subjectsSplitRow, !isDesktop && styles.subjectsSplitCol]}>
                  {/* CORE MANDATORY SUBJECTS */}
                  <View
                    style={[
                      styles.subjectsColumnCard,
                      { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder },
                    ]}
                  >
                    <View style={styles.columnHeaderRow}>
                      <View>
                        <Text style={[styles.columnTitle, { color: colors.adminText }]}>
                          Core Mandatory Subjects
                        </Text>
                        <Text style={[styles.columnSubtitle, { color: colors.adminTextSecondary }]}>
                          Required curriculum for {selectedBranch.code} students
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={styles.addSubjectSmallBtn}
                        onPress={() => handleOpenSubjectModal("core")}
                      >
                        <Ionicons name="add" size={16} color="#FFFFFF" />
                        <Text style={styles.addSubjectSmallBtnText}>+ Add Core</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.subjectsListArea}>
                      {selectedBranch.coreSubjects.length === 0 ? (
                        <Text style={styles.emptySubText}>No core subjects configured.</Text>
                      ) : (
                        selectedBranch.coreSubjects.map((s) => (
                          <View
                            key={s.id}
                            style={[styles.subjectItemRow, { borderColor: colors.adminCardBorder }]}
                          >
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                <Text style={[styles.subjectItemTitle, { color: colors.adminText }]}>
                                  {s.name}
                                </Text>
                                <View style={styles.codeBadge}>
                                  <Text style={styles.codeBadgeText}>{s.code}</Text>
                                </View>
                              </View>
                              <View style={styles.teacherInfoRow}>
                                <Ionicons name="person-outline" size={13} color="#2563EB" />
                                <Text style={styles.teacherInfoText}>
                                  {s.defaultTeacher || "Unassigned"}
                                </Text>
                                <Text style={styles.creditsInfoText}>• {s.credits || 4} Credits</Text>
                              </View>
                              {s.description ? (
                                <Text style={[styles.subjectDescText, { color: colors.adminTextSecondary }]}>
                                  {s.description}
                                </Text>
                              ) : null}
                            </View>

                            <View style={styles.rowActions}>
                              <TouchableOpacity
                                style={styles.miniActionBtn}
                                onPress={() => handleOpenSubjectModal("core", s)}
                              >
                                <Ionicons name="pencil" size={15} color="#2563EB" />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.miniActionBtn, { backgroundColor: "#FEE2E2" }]}
                                onPress={() => handleDeleteSubjectFromBranch(s.id, "core")}
                              >
                                <Ionicons name="trash-outline" size={15} color="#DC2626" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))
                      )}
                    </View>
                  </View>

                  {/* OPTIONAL ELECTIVE SUBJECTS (SHOWN ON THE SIDE FOR STUDENTS) */}
                  <View
                    style={[
                      styles.subjectsColumnCard,
                      { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder },
                    ]}
                  >
                    <View style={styles.columnHeaderRow}>
                      <View>
                        <Text style={[styles.columnTitle, { color: "#7C3AED" }]}>
                          Optional Electives (Side Panel)
                        </Text>
                        <Text style={[styles.columnSubtitle, { color: colors.adminTextSecondary }]}>
                          Shown at the side so students can choose their desired subjects
                        </Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.addSubjectSmallBtn, { backgroundColor: "#7C3AED" }]}
                        onPress={() => handleOpenSubjectModal("optional")}
                      >
                        <Ionicons name="add" size={16} color="#FFFFFF" />
                        <Text style={styles.addSubjectSmallBtnText}>+ Add Elective</Text>
                      </TouchableOpacity>
                    </View>

                    <View style={styles.subjectsListArea}>
                      {selectedBranch.optionalSubjects.length === 0 ? (
                        <Text style={styles.emptySubText}>No optional electives configured.</Text>
                      ) : (
                        selectedBranch.optionalSubjects.map((s) => (
                          <View
                            key={s.id}
                            style={[
                              styles.subjectItemRow,
                              { borderColor: "#EDE9FE", backgroundColor: isDark ? "#1E1B4B" : "#FAF5FF" },
                            ]}
                          >
                            <View style={{ flex: 1 }}>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                                <Text style={[styles.subjectItemTitle, { color: colors.adminText }]}>
                                  {s.name}
                                </Text>
                                <View style={[styles.codeBadge, { backgroundColor: "#EDE9FE" }]}>
                                  <Text style={[styles.codeBadgeText, { color: "#7C3AED" }]}>
                                    {s.code}
                                  </Text>
                                </View>
                              </View>
                              <View style={styles.teacherInfoRow}>
                                <Ionicons name="person-outline" size={13} color="#7C3AED" />
                                <Text style={[styles.teacherInfoText, { color: "#7C3AED" }]}>
                                  {s.defaultTeacher || "Unassigned"}
                                </Text>
                                <Text style={styles.creditsInfoText}>• {s.credits || 3} Credits</Text>
                              </View>
                              {s.description ? (
                                <Text style={[styles.subjectDescText, { color: colors.adminTextSecondary }]}>
                                  {s.description}
                                </Text>
                              ) : null}
                            </View>

                            <View style={styles.rowActions}>
                              <TouchableOpacity
                                style={styles.miniActionBtn}
                                onPress={() => handleOpenSubjectModal("optional", s)}
                              >
                                <Ionicons name="pencil" size={15} color="#7C3AED" />
                              </TouchableOpacity>
                              <TouchableOpacity
                                style={[styles.miniActionBtn, { backgroundColor: "#FEE2E2" }]}
                                onPress={() => handleDeleteSubjectFromBranch(s.id, "optional")}
                              >
                                <Ionicons name="trash-outline" size={15} color="#DC2626" />
                              </TouchableOpacity>
                            </View>
                          </View>
                        ))
                      )}
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* -------------------------------------------------- */}
            {/* TAB 3: STUDENT ALLOCATIONS & OVERRIDES */}
            {/* -------------------------------------------------- */}
            {activeTab === "students" && (
              <View>
                <View style={styles.sectionHeaderRow}>
                  <View>
                    <Text style={[styles.sectionTitle, { color: colors.adminText }]}>
                      Student Branch & Elective Allocations
                    </Text>
                    <Text style={[styles.sectionSubtitle, { color: colors.adminTextSecondary }]}>
                      Admin can view and change chosen branch, elective subjects, and teacher mappings
                    </Text>
                  </View>

                  <View style={[styles.studentSearchBar, { backgroundColor: colors.adminSearchBg }]}>
                    <Ionicons name="search" size={16} color={colors.adminTextSecondary} />
                    <TextInput
                      style={[styles.studentSearchInput, { color: colors.adminText }]}
                      placeholder="Search student or branch..."
                      placeholderTextColor={colors.adminTextSecondary}
                      value={searchStudent}
                      onChangeText={setSearchStudent}
                    />
                  </View>
                </View>

                {/* Table of Students */}
                <View
                  style={[
                    styles.studentTableCard,
                    { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder },
                  ]}
                >
                  <View style={[styles.tableHeaderRow, { borderBottomColor: colors.adminCardBorder }]}>
                    <Text style={[styles.thText, { flex: 1.2, color: colors.adminText }]}>Student Name</Text>
                    <Text style={[styles.thText, { flex: 1.2, color: colors.adminText }]}>Branch</Text>
                    <Text style={[styles.thText, { flex: 2, color: colors.adminText }]}>Chosen Subjects & Teachers</Text>
                    <Text style={[styles.thText, { width: 100, textAlign: "right", color: colors.adminText }]}>
                      Action
                    </Text>
                  </View>

                  {filteredStudents.length === 0 ? (
                    <View style={{ padding: 30, alignItems: "center" }}>
                      <Text style={{ color: colors.adminTextSecondary }}>No students found.</Text>
                    </View>
                  ) : (
                    filteredStudents.map((st) => (
                      <View
                        key={st.uid}
                        style={[styles.tableRow, { borderBottomColor: colors.adminCardBorder }]}
                      >
                        <View style={{ flex: 1.2 }}>
                          <Text style={[styles.studentRowName, { color: colors.adminText }]}>
                            {st.name}
                          </Text>
                          <Text style={[styles.studentRowEmail, { color: colors.adminTextSecondary }]}>
                            {st.email}
                          </Text>
                        </View>

                        <View style={{ flex: 1.2 }}>
                          <View style={styles.branchBadge}>
                            <Text style={styles.branchBadgeText}>{st.branch}</Text>
                          </View>
                        </View>

                        <View style={{ flex: 2 }}>
                          {st.selectedSubjects.length === 0 ? (
                            <Text style={{ fontSize: 12, color: colors.adminTextSecondary, fontStyle: "italic" }}>
                              Not yet selected
                            </Text>
                          ) : (
                            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 4 }}>
                              {st.selectedSubjects.slice(0, 4).map((sub, idx) => (
                                <View
                                  key={idx}
                                  style={[
                                    styles.subjectMiniPill,
                                    {
                                      backgroundColor: sub.type === "core" ? "#EFF6FF" : "#EDE9FE",
                                    },
                                  ]}
                                >
                                  <Text
                                    style={[
                                      styles.subjectMiniPillText,
                                      {
                                        color: sub.type === "core" ? "#2563EB" : "#7C3AED",
                                      },
                                    ]}
                                  >
                                    {sub.name} ({sub.teacherName})
                                  </Text>
                                </View>
                              ))}
                              {st.selectedSubjects.length > 4 && (
                                <Text style={{ fontSize: 11, color: colors.adminTextSecondary }}>
                                  +{st.selectedSubjects.length - 4} more
                                </Text>
                              )}
                            </View>
                          )}
                        </View>

                        <View style={{ width: 100, alignItems: "flex-end" }}>
                          <TouchableOpacity
                            style={styles.overrideBtn}
                            onPress={() => handleOpenEditStudent(st)}
                          >
                            <Ionicons name="swap-horizontal" size={14} color="#2563EB" />
                            <Text style={styles.overrideBtnText}>Change</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))
                  )}
                </View>
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>

      {/* ==================================================== */}
      {/* BRANCH ADD/EDIT MODAL */}
      {/* ==================================================== */}
      <Modal
        visible={branchModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setBranchModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.adminText }]}>
                {editingBranch ? "Edit Branch" : "Add New Branch"}
              </Text>
              <TouchableOpacity onPress={() => setBranchModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.adminTextSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.adminTextSecondary }]}>Branch Name *</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                  placeholder="e.g. Computer Science & Engineering"
                  placeholderTextColor={colors.adminTextSecondary}
                  value={branchName}
                  onChangeText={setBranchName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.adminTextSecondary }]}>Department Code *</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                  placeholder="e.g. CSE"
                  placeholderTextColor={colors.adminTextSecondary}
                  value={branchCode}
                  onChangeText={setBranchCode}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.adminTextSecondary }]}>Description / Tags</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                  placeholder="e.g. Software, AI, Data Science, Web Development"
                  placeholderTextColor={colors.adminTextSecondary}
                  value={branchDesc}
                  onChangeText={setBranchDesc}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.adminTextSecondary }]}>Theme Color</Text>
                <View style={styles.colorPaletteRow}>
                  {["#2563EB", "#8B5CF6", "#10B981", "#F59E0B", "#EF4444", "#06B6D4", "#E11D48"].map((c) => (
                    <TouchableOpacity
                      key={c}
                      style={[
                        styles.colorSwatch,
                        { backgroundColor: c },
                        branchColor === c && styles.colorSwatchActive,
                      ]}
                      onPress={() => setBranchColor(c)}
                    />
                  ))}
                </View>
              </View>

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setBranchModalVisible(false)}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSubmitBtn}
                  onPress={handleSaveBranch}
                  disabled={savingAction}
                >
                  {savingAction ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>Save Branch</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================================================== */}
      {/* SUBJECT ADD/EDIT MODAL */}
      {/* ==================================================== */}
      <Modal
        visible={subjectModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setSubjectModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.adminText }]}>
                {editingSubject
                  ? `Edit ${subjectCategory === "core" ? "Core" : "Optional"} Subject`
                  : `Add ${subjectCategory === "core" ? "Core" : "Optional"} Subject`}
              </Text>
              <TouchableOpacity onPress={() => setSubjectModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.adminTextSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.adminTextSecondary }]}>Subject Name *</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                  placeholder="e.g. Artificial Intelligence & ML"
                  placeholderTextColor={colors.adminTextSecondary}
                  value={subjectName}
                  onChangeText={setSubjectName}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.adminTextSecondary }]}>Course Code *</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                  placeholder="e.g. CS310"
                  placeholderTextColor={colors.adminTextSecondary}
                  value={subjectCode}
                  onChangeText={setSubjectCode}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.adminTextSecondary }]}>
                  Assigned Teacher / Instructor
                </Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                  placeholder="e.g. Dr. K. Sushma"
                  placeholderTextColor={colors.adminTextSecondary}
                  value={subjectTeacher}
                  onChangeText={setSubjectTeacher}
                />

                {facultyList.length > 0 && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 6 }}>
                    {facultyList.map((f) => (
                      <TouchableOpacity
                        key={f.id}
                        style={styles.facultySuggestionChip}
                        onPress={() => setSubjectTeacher(f.name)}
                      >
                        <Text style={styles.facultySuggestionText}>{f.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.adminTextSecondary }]}>Course Description</Text>
                <TextInput
                  style={[styles.formInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                  placeholder="Topics, syllabus overview or specializations"
                  placeholderTextColor={colors.adminTextSecondary}
                  value={subjectDesc}
                  onChangeText={setSubjectDesc}
                />
              </View>

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setSubjectModalVisible(false)}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.modalSubmitBtn,
                    subjectCategory === "optional" && { backgroundColor: "#7C3AED" },
                  ]}
                  onPress={handleSaveSubjectToBranch}
                  disabled={savingAction}
                >
                  {savingAction ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSubmitBtnText}>Save Subject</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* ==================================================== */}
      {/* STUDENT ALLOCATION OVERRIDE MODAL */}
      {/* ==================================================== */}
      <Modal
        visible={editStudentModal}
        transparent
        animationType="fade"
        onRequestClose={() => setEditStudentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.adminText }]}>
                Change Student Branch
              </Text>
              <TouchableOpacity onPress={() => setEditStudentModal(false)}>
                <Ionicons name="close" size={24} color={colors.adminTextSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalBody}>
              <Text style={[styles.studentModalDesc, { color: colors.adminTextSecondary }]}>
                Assign or change branch for{" "}
                <Text style={{ fontWeight: "800", color: colors.adminText }}>
                  {selectedStudentForEdit?.name}
                </Text>
              </Text>

              <View style={styles.formGroup}>
                <Text style={[styles.formLabel, { color: colors.adminTextSecondary }]}>Select New Branch</Text>
                <View style={{ gap: 8 }}>
                  {branches.map((b) => {
                    const isSelected = studentEditBranchId === b.id;
                    return (
                      <TouchableOpacity
                        key={b.id}
                        style={[
                          styles.studentBranchOption,
                          isSelected && styles.studentBranchOptionActive,
                        ]}
                        onPress={() => setStudentEditBranchId(b.id)}
                      >
                        <View style={[styles.branchIconMini, { backgroundColor: b.iconBg }]}>
                          <Ionicons name={b.icon} size={16} color="#FFFFFF" />
                        </View>
                        <Text
                          style={[
                            styles.studentBranchOptionText,
                            isSelected && { color: "#2563EB", fontWeight: "800" },
                          ]}
                        >
                          {b.name} ({b.code})
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              <View style={styles.modalBtnRow}>
                <TouchableOpacity
                  style={styles.modalCancelBtn}
                  onPress={() => setEditStudentModal(false)}
                >
                  <Text style={styles.modalCancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSubmitBtn}
                  onPress={handleSaveStudentAllocation}
                  disabled={savingAction}
                >
                  <Text style={styles.modalSubmitBtnText}>Apply Change</Text>
                </TouchableOpacity>
              </View>
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
  },
  mainLayout: {
    flex: 1,
    flexDirection: "row",
  },
  sidebar: {
    width: 250,
    borderRightWidth: 1,
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  mobileSidebar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 999,
  },
  mobileModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    flexDirection: "row",
  },
  sidebarBrand: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  brandIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: "900",
    color: "#FFFFFF",
  },
  brandSubtitle: {
    fontSize: 11,
    color: "rgba(255,255,255,0.6)",
  },
  closeSidebarBtn: {
    marginLeft: "auto",
    padding: 4,
  },
  sidebarNavScroll: {
    paddingBottom: 20,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 12,
    borderRadius: 10,
    marginBottom: 4,
    gap: 12,
  },
  navItemActive: {
    backgroundColor: "#7C3AED",
  },
  navItemLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.7)",
    fontWeight: "600",
  },
  navItemLabelActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  sidebarLogout: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    gap: 12,
    marginTop: "auto",
  },
  sidebarLogoutText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "600",
  },

  contentArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  menuHamburger: {
    marginRight: 14,
  },
  topBarTitleCol: {
    flex: 1,
  },
  topBarTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  topBarSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  topRightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  testSelectionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  testSelectionBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  /* TAB BAR */
  tabBar: {
    flexDirection: "row",
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    gap: 16,
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    gap: 8,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabBtnActive: {
    borderBottomColor: "#2563EB",
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },

  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  /* SECTION HEADER */
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    flexWrap: "wrap",
    gap: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  sectionSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  syncDefaultsBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  syncDefaultsBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
  },
  primaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  primaryActionBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  /* BRANCH GRID */
  branchGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  adminBranchCard: {
    width: "48%",
    minWidth: 320,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    elevation: 1,
  },
  adminBranchCardTop: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  branchIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  adminBranchTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  adminBranchCode: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  cardActionsRow: {
    flexDirection: "row",
    gap: 6,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },
  adminBranchDesc: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 14,
  },
  branchCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 12,
  },
  footerStat: {
    alignItems: "center",
    paddingHorizontal: 8,
  },
  footerStatNum: {
    fontSize: 16,
    fontWeight: "800",
    color: "#2563EB",
  },
  footerStatLabel: {
    fontSize: 10,
    color: "#64748B",
  },
  footerDivider: {
    width: 1,
    height: 24,
    backgroundColor: "#E2E8F0",
  },
  manageSubjectsBtn: {
    marginLeft: "auto",
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "#EFF6FF",
    borderRadius: 8,
  },
  manageSubjectsBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },

  /* TAB 2: SUBJECTS */
  branchSelectorBar: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  selectorLabel: {
    fontSize: 13,
    fontWeight: "800",
  },
  branchSelectChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginRight: 8,
  },
  branchSelectChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  subjectsSplitRow: {
    flexDirection: "row",
    gap: 16,
  },
  subjectsSplitCol: {
    flexDirection: "column",
  },
  subjectsColumnCard: {
    flex: 1,
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
  },
  columnHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  columnTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  columnSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  addSubjectSmallBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2563EB",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  addSubjectSmallBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  subjectsListArea: {
    gap: 10,
  },
  emptySubText: {
    fontSize: 12,
    color: "#94A3B8",
    fontStyle: "italic",
    paddingVertical: 14,
    textAlign: "center",
  },
  subjectItemRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  subjectItemTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  codeBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  codeBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2563EB",
  },
  teacherInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
  },
  teacherInfoText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#2563EB",
  },
  creditsInfoText: {
    fontSize: 11,
    color: "#64748B",
  },
  subjectDescText: {
    fontSize: 11,
    marginTop: 3,
  },
  rowActions: {
    flexDirection: "row",
    gap: 6,
    marginLeft: 10,
  },
  miniActionBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    backgroundColor: "#EFF6FF",
    alignItems: "center",
    justifyContent: "center",
  },

  /* TAB 3: STUDENTS */
  studentSearchBar: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    width: 260,
    gap: 8,
  },
  studentSearchInput: {
    flex: 1,
    fontSize: 12,
  },
  studentTableCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  tableHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    backgroundColor: "rgba(0,0,0,0.02)",
  },
  thText: {
    fontSize: 12,
    fontWeight: "800",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  studentRowName: {
    fontSize: 13,
    fontWeight: "700",
  },
  studentRowEmail: {
    fontSize: 11,
  },
  branchBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  branchBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },
  subjectMiniPill: {
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },
  subjectMiniPillText: {
    fontSize: 10,
    fontWeight: "600",
  },
  overrideBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
    gap: 4,
  },
  overrideBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },

  /* MODALS */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 480,
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  modalBody: {
    gap: 12,
  },
  formGroup: {
    marginBottom: 4,
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  formInput: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  colorPaletteRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  colorSwatch: {
    width: 28,
    height: 28,
    borderRadius: 14,
  },
  colorSwatchActive: {
    borderWidth: 3,
    borderColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    elevation: 3,
  },
  facultySuggestionChip: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 6,
  },
  facultySuggestionText: {
    fontSize: 11,
    color: "#2563EB",
    fontWeight: "600",
  },
  studentModalDesc: {
    fontSize: 13,
    marginBottom: 10,
  },
  studentBranchOption: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
  },
  studentBranchOptionActive: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  branchIconMini: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  studentBranchOptionText: {
    fontSize: 13,
    color: "#334155",
    fontWeight: "600",
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 10,
  },
  modalCancelBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  modalCancelBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  modalSubmitBtn: {
    flex: 1,
    height: 42,
    borderRadius: 10,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  modalSubmitBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
