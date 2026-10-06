import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Modal,
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
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { auth, db } from "../../firebase/config";
import { confirmLogout } from "../../firebase/auth";
import { useAppTheme } from "../../context/ThemeContext";
import AdminThemeToggle from "../../components/admin/AdminThemeToggle";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTopBar from "../../components/admin/AdminTopBar";
import {
  pickPdfDocument,
  uploadCertificateFile,
  shareOrDownloadPdf,
} from "../../services/certificatePdfService";

// =====================================================
// SIDEBAR NAVIGATION ITEMS
// =====================================================
const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "home", route: "/admin" },
  { id: "students", label: "Students", icon: "person", route: "/admin/student" },
  { id: "faculty", label: "Faculty", icon: "people", route: "/admin/faculty" },
  { id: "academics", label: "Academics", icon: "book", route: "/admin/academics" },
  { id: "schedule", label: "Schedule", icon: "calendar", route: "/admin/schedule" },
  { id: "attendance", label: "Attendance", icon: "checkbox", route: "/admin/attendence" },
  { id: "certificates", label: "Certificates", icon: "ribbon", route: "/admin/certificate" },
  { id: "ai-assistant", label: "AI Assistant", icon: "sparkles", route: "/admin/ai-assistant" },
  { id: "hostel", label: "Hostel", icon: "business", route: "/admin/hostel" },
  { id: "mess", label: "Mess", icon: "restaurant", route: "/admin/mess" },
  { id: "fees", label: "Fees", icon: "wallet", route: "/admin/fees" },
  { id: "notices", label: "Notices", icon: "megaphone", route: "/admin/notices" },
  { id: "requests", label: "Requests", icon: "document-text", route: "/admin/requests" },
  { id: "reports", label: "Reports", icon: "bar-chart", route: "/admin/reports" },
  { id: "settings", label: "Settings", icon: "settings", route: "/admin/settings" },
  { id: "profile", label: "Profile", icon: "person-circle", route: "/admin/profile" },
];

const DEPARTMENTS = ["All", "CSE", "ECE", "ME", "Civil", "IT", "BSH"];

type Student = {
  id: string;
  fullName?: string;
  email?: string;
  rollNo?: string;
  department?: string;
  semester?: string | number;
  college?: string;
  role?: string;
  isBlocked?: boolean;
  status?: "active" | "blocked";
};

export default function AdminStudentsScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const { isDark, colors } = useAppTheme();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedDept, setSelectedDept] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Blocked">("All");

  const [modalVisible, setModalVisible] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Delete Confirmation Modal State
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [targetStudentForDelete, setTargetStudentForDelete] = useState<Student | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Block / Unblock Modal State
  const [blockModalVisible, setBlockModalVisible] = useState(false);
  const [targetStudentForBlock, setTargetStudentForBlock] = useState<Student | null>(null);
  const [blockLoading, setBlockLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [rollNo, setRollNo] = useState("");
  const [department, setDepartment] = useState("CSE");
  const [semester, setSemester] = useState("1");
  const [college, setCollege] = useState("Campusly Institute of Tech");

  const [saving, setSaving] = useState(false);

  // Certificate & Honor Modal State
  const [certModalVisible, setCertModalVisible] = useState(false);
  const [targetStudentForCert, setTargetStudentForCert] = useState<Student | null>(null);
  const [editingCertItem, setEditingCertItem] = useState<any | null>(null);
  const [certTitle, setCertTitle] = useState("Certificate of Academic Excellence");
  const [certSubject, setCertSubject] = useState("Computer Science & Engineering");
  const [certGrade, setCertGrade] = useState("Grade A+ (Distinction)");
  const [certIssueDate, setCertIssueDate] = useState("Sep 21, 2026");
  const [certRemarks, setCertRemarks] = useState("Awarded for exceptional academic performance.");
  const [certPdfUrl, setCertPdfUrl] = useState("");
  const [certPdfName, setCertPdfName] = useState("");
  const [certPhotoUrl, setCertPhotoUrl] = useState("");
  const [certPhotoName, setCertPhotoName] = useState("");
  const [certSaving, setCertSaving] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");

  // Student Honors Management List Modal
  const [honorsListModalVisible, setHonorsListModalVisible] = useState(false);
  const [studentHonorsList, setStudentHonorsList] = useState<any[]>([]);
  const [loadingHonors, setLoadingHonors] = useState(false);

  // Delete Honor Confirmation Modal
  const [deleteHonorModalVisible, setDeleteHonorModalVisible] = useState(false);
  const [targetHonorForDelete, setTargetHonorForDelete] = useState<any | null>(null);
  const [deletingHonor, setDeletingHonor] = useState(false);

  // Photo Zoom Preview
  const [previewHonorPhoto, setPreviewHonorPhoto] = useState<string | null>(null);

  // Firestore Realtime Listener
  useEffect(() => {
    const studentsQuery = query(collection(db, "users"));

    const unsubscribe = onSnapshot(
      studentsQuery,
      (snapshot) => {
        const data: Student[] = [];

        snapshot.forEach((item) => {
          const student = item.data();
          const role = (student.role || "").toLowerCase();
          // Strictly real registered student accounts only
          if (role === "student") {
            const isBlocked = !!student.isBlocked || student.status === "blocked";
            data.push({
              id: item.id,
              fullName: student.fullName || student.name || "Student",
              email: student.email || "",
              rollNo: student.rollNo || "",
              department: student.department || "CSE",
              semester: student.semester || "1",
              college: student.college || "Campusly Institute of Tech",
              role: "student",
              isBlocked,
              status: isBlocked ? "blocked" : "active",
            });
          }
        });

        // Sort alphabetically by full name
        data.sort((a, b) => (a.fullName || "").localeCompare(b.fullName || ""));
        setStudents(data);
        setLoading(false);
      },
      (error) => {
        console.warn("Students listener warning:", error);
        setStudents([]);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  // Filtered Students list based on search, department, and status
  const filteredStudents = useMemo(() => {
    const value = search.trim().toLowerCase();

    return students.filter((student) => {
      const matchesSearch =
        !value ||
        (student.fullName && student.fullName.toLowerCase().includes(value)) ||
        (student.email && student.email.toLowerCase().includes(value)) ||
        (student.rollNo && student.rollNo.toLowerCase().includes(value)) ||
        (student.department && student.department.toLowerCase().includes(value));

      const matchesDept =
        selectedDept === "All" ||
        (student.department &&
          student.department.toUpperCase().includes(selectedDept.toUpperCase()));

      const matchesStatus =
        statusFilter === "All" ||
        (statusFilter === "Blocked" ? student.isBlocked : !student.isBlocked);

      return matchesSearch && matchesDept && matchesStatus;
    });
  }, [students, search, selectedDept, statusFilter]);

  // Dynamic statistics
  const uniqueDeptsCount = useMemo(() => {
    const set = new Set(students.map((s) => s.department).filter(Boolean));
    return set.size || 4;
  }, [students]);

  const activeCount = useMemo(() => students.filter((s) => !s.isBlocked).length, [students]);
  const blockedCount = useMemo(() => students.filter((s) => s.isBlocked).length, [students]);
  const activePct = useMemo(() => {
    if (students.length === 0) return 100;
    return Math.round((activeCount / students.length) * 100);
  }, [students.length, activeCount]);

  const openAddModal = () => {
    setEditingStudent(null);
    setFullName("");
    setEmail("");
    setRollNo("");
    setDepartment("CSE");
    setSemester("1");
    setCollege("Campusly Institute of Tech");
    setModalVisible(true);
  };

  const openEditModal = (student: Student) => {
    setEditingStudent(student);
    setFullName(student.fullName || "");
    setEmail(student.email || "");
    setRollNo(student.rollNo || "");
    setDepartment(student.department || "CSE");
    setSemester(String(student.semester || "1"));
    setCollege(student.college || "Campusly Institute of Tech");
    setModalVisible(true);
  };

  const closeModal = () => {
    if (saving) return;
    setModalVisible(false);
    setEditingStudent(null);
  };

  const validateForm = () => {
    if (!fullName.trim()) {
      Alert.alert("Required", "Please enter student's full name.");
      return false;
    }
    if (!email.trim()) {
      Alert.alert("Required", "Please enter student's email.");
      return false;
    }
    if (!rollNo.trim()) {
      Alert.alert("Required", "Please enter student's roll number.");
      return false;
    }
    return true;
  };

  const saveStudent = async () => {
    if (!validateForm()) return;

    try {
      setSaving(true);

      if (editingStudent) {
        const studentRef = doc(db, "users", editingStudent.id);
        await updateDoc(studentRef, {
          fullName: fullName.trim(),
          name: fullName.trim(),
          email: email.trim().toLowerCase(),
          rollNo: rollNo.trim().toUpperCase(),
          department: department.trim(),
          semester: semester.trim(),
          college: college.trim(),
          role: "student",
          updatedAt: serverTimestamp(),
        });
        Alert.alert("Success", "Student details updated in Firebase! Live in student app.");
      } else {
        const newStudentRef = doc(collection(db, "users"));
        await setDoc(newStudentRef, {
          fullName: fullName.trim(),
          name: fullName.trim(),
          email: email.trim().toLowerCase(),
          rollNo: rollNo.trim().toUpperCase(),
          department: department.trim(),
          semester: semester.trim(),
          college: college.trim(),
          role: "student",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        Alert.alert("Student Added", "Student profile created successfully in Firebase.");
      }

      setModalVisible(false);
      setEditingStudent(null);
    } catch (error: any) {
      console.warn("Save student warning:", error);
      Alert.alert("Error", error?.message || "Failed to save student.");
      setModalVisible(false);
    } finally {
      setSaving(false);
    }
  };

  const openDeleteModal = (student: Student) => {
    setTargetStudentForDelete(student);
    setDeleteModalVisible(true);
  };

  const deleteStudent = (student: Student) => {
    openDeleteModal(student);
  };

  const handleConfirmDelete = async () => {
    if (!targetStudentForDelete) return;
    try {
      setDeleteLoading(true);
      const sId = targetStudentForDelete.id;
      const sName = targetStudentForDelete.fullName || "Student";
      const sRoll = targetStudentForDelete.rollNo || "";

      // 1. Delete from Firestore users collection
      await deleteDoc(doc(db, "users", sId));

      // 2. Also cleanup teacher student subcollections if applicable
      try {
        await deleteDoc(doc(db, "teacherCodes", "TEACH-CSE-101", "students", sId));
        await deleteDoc(doc(db, "teacherConnections", `TEACH-CSE-101_${sId}`));
      } catch (cleanErr) {
        console.warn("Cleanup subcollections warning:", cleanErr);
      }

      // 3. Log activity
      try {
        await addDoc(collection(db, "activities"), {
          title: `Deleted Student Account: ${sName} (${sRoll})`,
          time: "Just now",
          user: "Admin",
          type: "students",
          createdAt: serverTimestamp(),
        });
      } catch {}

      // 4. Update local state immediately for zero-lag UI response
      setStudents((prev) => prev.filter((s) => s.id !== sId));

      setDeleteModalVisible(false);
      setTargetStudentForDelete(null);
      Alert.alert("Student Deleted", `${sName} has been permanently deleted from Firebase.`);
    } catch (error: any) {
      console.warn("Delete student error:", error);
      Alert.alert("Error", error?.message || "Could not delete student.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const openBlockModal = (student: Student) => {
    setTargetStudentForBlock(student);
    setBlockModalVisible(true);
  };

  const handleConfirmToggleBlock = async () => {
    if (!targetStudentForBlock) return;
    try {
      setBlockLoading(true);
      const sId = targetStudentForBlock.id;
      const sName = targetStudentForBlock.fullName || "Student";
      const nextBlocked = !targetStudentForBlock.isBlocked;

      // 1. Update user profile in Firestore
      await updateDoc(doc(db, "users", sId), {
        isBlocked: nextBlocked,
        status: nextBlocked ? "blocked" : "active",
        updatedAt: serverTimestamp(),
      });

      // 2. Also update in teacherCodes subcollection if exists
      try {
        await updateDoc(doc(db, "teacherCodes", "TEACH-CSE-101", "students", sId), {
          isBlocked: nextBlocked,
          status: nextBlocked ? "blocked" : "active",
        });
      } catch {}

      // 3. Log activity
      try {
        await addDoc(collection(db, "activities"), {
          title: `${nextBlocked ? "Blocked" : "Unblocked"} Student Account: ${sName}`,
          time: "Just now",
          user: "Admin",
          type: "students",
          createdAt: serverTimestamp(),
        });
      } catch {}

      // 4. Update local state immediately
      setStudents((prev) =>
        prev.map((s) =>
          s.id === sId
            ? { ...s, isBlocked: nextBlocked, status: nextBlocked ? "blocked" : "active" }
            : s
        )
      );

      setBlockModalVisible(false);
      setTargetStudentForBlock(null);
      Alert.alert(
        nextBlocked ? "Student Blocked" : "Student Unblocked",
        `${sName} has been ${nextBlocked ? "blocked and cannot log in or access campus classes" : "unblocked and full access has been restored"}.`
      );
    } catch (error: any) {
      console.warn("Block student error:", error);
      Alert.alert("Error", error?.message || "Could not update student block status.");
    } finally {
      setBlockLoading(false);
    }
  };

  // Pick PDF for Student Honor
  const handlePickCertPdf = async () => {
    try {
      const picked = await pickPdfDocument();
      if (picked) {
        setCertPdfUrl(picked.uri);
        setCertPdfName(picked.name);
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not pick PDF document.");
    }
  };

  // Pick Photo for Student Honor
  const handlePickCertPhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission", "Please allow gallery access to attach photo.");
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85,
      });
      if (!res.canceled && res.assets?.[0]?.uri) {
        setCertPhotoUrl(res.assets[0].uri);
        setCertPhotoName("Honor_Photo.jpg");
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not select photo.");
    }
  };

  // Take Camera Photo for Student Honor
  const handleTakeCertPhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission", "Please allow camera access.");
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.85,
      });
      if (!res.canceled && res.assets?.[0]?.uri) {
        setCertPhotoUrl(res.assets[0].uri);
        setCertPhotoName("Honor_Camera.jpg");
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not capture camera image.");
    }
  };

  // Open Award or Edit Honor Modal
  const handleOpenCertModalForStudent = (student: Student, honorToEdit?: any) => {
    setTargetStudentForCert(student);
    if (honorToEdit) {
      setEditingCertItem(honorToEdit);
      setCertTitle(honorToEdit.title || "");
      setCertSubject(honorToEdit.subject || "");
      setCertGrade(honorToEdit.grade || "Grade A+ (Distinction)");
      setCertIssueDate(honorToEdit.issueDate || "Sep 21, 2026");
      setCertRemarks(honorToEdit.description || "");
      setCertPdfUrl(honorToEdit.pdfUrl || "");
      setCertPdfName(honorToEdit.pdfUrl ? "Certificate.pdf" : "");
      setCertPhotoUrl(honorToEdit.photoUrl || "");
      setCertPhotoName(honorToEdit.photoUrl ? "Certificate_Photo.jpg" : "");
    } else {
      setEditingCertItem(null);
      setCertTitle("Certificate of Academic Excellence");
      setCertSubject(student.department ? `${student.department} Specialization` : "Academic Excellence");
      setCertGrade("Grade A+ (Distinction)");
      const today = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      setCertIssueDate(today);
      setCertRemarks(`Awarded to ${student.fullName || "Student"} for exemplary academic dedication and project achievements.`);
      setCertPdfUrl("");
      setCertPdfName("");
      setCertPhotoUrl("");
      setCertPhotoName("");
    }
    setCertModalVisible(true);
  };

  // Open Manage Student Honors List Modal
  const handleOpenStudentHonors = async (student: Student) => {
    setTargetStudentForCert(student);
    setLoadingHonors(true);
    setHonorsListModalVisible(true);
    try {
      const q = query(collection(db, "certificates"), where("studentId", "==", student.id));
      const snap = await getDocs(q);
      const list: any[] = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setStudentHonorsList(list);
    } catch (err: any) {
      console.warn("Could not fetch student honors:", err);
      setStudentHonorsList([]);
    } finally {
      setLoadingHonors(false);
    }
  };

  // Save Student Honor / Certificate (Add or Update with PDF & Photo System)
  const handleSaveStudentCertificate = async () => {
    if (!targetStudentForCert) return;
    if (!certTitle.trim()) {
      Alert.alert("Required", "Please enter certificate title.");
      return;
    }

    try {
      setCertSaving(true);
      let finalPdf = certPdfUrl.trim();
      let finalPhoto = certPhotoUrl.trim();
      const credId = editingCertItem?.credentialId || `CAMP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

      if (finalPdf && !finalPdf.startsWith("http")) {
        setUploadStatus("Uploading PDF document to storage...");
        try {
          finalPdf = await uploadCertificateFile(finalPdf, "pdf", credId);
        } catch (uploadErr) {
          console.warn("PDF upload fallback:", uploadErr);
        }
      }

      if (finalPhoto && !finalPhoto.startsWith("http")) {
        setUploadStatus("Uploading photo to storage...");
        try {
          finalPhoto = await uploadCertificateFile(finalPhoto, "photo", credId);
        } catch (uploadErr) {
          console.warn("Photo upload fallback:", uploadErr);
        }
      }

      const payload = {
        studentId: targetStudentForCert.id,
        studentName: targetStudentForCert.fullName || "Student",
        studentRollNo: targetStudentForCert.rollNo || "23CSE001",
        title: certTitle.trim(),
        subject: certSubject.trim() || "Academic Honors",
        grade: certGrade.trim() || "Grade A+",
        issueDate: certIssueDate.trim() || "Sep 21, 2026",
        issuedBy: "Faculty / Administration",
        issuerTitle: "Academic Professor & Mentor",
        description: certRemarks.trim() || "Awarded for exceptional academic performance.",
        credentialId: credId,
        pdfUrl: finalPdf || undefined,
        photoUrl: finalPhoto || undefined,
        verified: true,
        updatedAt: serverTimestamp(),
      };

      if (editingCertItem) {
        await updateDoc(doc(db, "certificates", editingCertItem.id), payload);
        setStudentHonorsList((prev) =>
          prev.map((h) => (h.id === editingCertItem.id ? { ...h, ...payload } : h))
        );
        Alert.alert("Honor Updated! 🎓", `Certificate "${certTitle}" updated with attachments.`);
      } else {
        const docRef = await addDoc(collection(db, "certificates"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        setStudentHonorsList((prev) => [{ id: docRef.id, ...payload }, ...prev]);
        Alert.alert("Certificate Awarded! 🎓", `Certificate issued to ${targetStudentForCert.fullName} with PDF & Photo! Visible in student profile.`);
      }

      setCertModalVisible(false);
      setEditingCertItem(null);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to award certificate.");
    } finally {
      setCertSaving(false);
      setUploadStatus("");
    }
  };

  // Open In-App Delete Honor Confirmation
  const handleOpenDeleteHonor = (honorItem: any) => {
    setTargetHonorForDelete(honorItem);
    setDeleteHonorModalVisible(true);
  };

  // Confirm Delete Honor
  const handleConfirmDeleteHonor = async () => {
    if (!targetHonorForDelete) return;
    try {
      setDeletingHonor(true);
      await deleteDoc(doc(db, "certificates", targetHonorForDelete.id));
      setStudentHonorsList((prev) => prev.filter((h) => h.id !== targetHonorForDelete.id));
      setDeleteHonorModalVisible(false);
      setTargetHonorForDelete(null);
      Alert.alert("Deleted", "Honor certificate removed from student record.");
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Could not delete honor.");
    } finally {
      setDeletingHonor(false);
    }
  };

  const handleLogout = () => {
    confirmLogout("Are you sure you want to sign out?");
  };

  // Sidebar component matching dashboard & profile
  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: colors.adminSidebar }]}
      edges={["top", "left", "right"]}
    >
      <View style={[styles.mainLayout, { backgroundColor: colors.adminBg }]}>
        {/* Standardized Admin Sidebar */}
        <AdminSidebar
          activeNav="students"
          isDesktop={isDesktop}
          mobileMenuOpen={mobileMenuOpen}
          onCloseMobileMenu={() => setMobileMenuOpen(false)}
        />

        {/* MAIN CONTENT AREA */}
        <View style={[styles.contentArea, { backgroundColor: colors.adminBg }]}>
          {/* Standardized Top Bar */}
          <AdminTopBar
            showSearch={true}
            searchQuery={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search students by name, roll no, department..."
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
          />

          {/* MAIN SCROLLABLE CONTENT */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* HERO / ACTION HEADER */}
            <View style={styles.headerSection}>
              <View>
                <Text style={[styles.pageTitle, { color: colors.adminText }]}>Student Directory</Text>
                <Text style={[styles.pageSubtitle, { color: colors.adminTextSecondary }]}>
                  View, manage, and enroll students across campus departments
                </Text>
              </View>
              <TouchableOpacity
                style={styles.addStudentBtn}
                onPress={openAddModal}
              >
                <Ionicons name="add" size={20} color="#FFFFFF" />
                <Text style={styles.addStudentBtnText}>Add Student</Text>
              </TouchableOpacity>
            </View>

            {/* KPI STATS ROW */}
            <View style={styles.statsRow}>
              <View
                style={[
                  styles.statCard,
                  {
                    backgroundColor: colors.adminCard,
                    borderColor: colors.adminCardBorder,
                    borderLeftColor: "#4F46E5",
                  },
                ]}
              >
                <View
                  style={[
                    styles.statIconBox,
                    { backgroundColor: isDark ? "rgba(79,70,229,0.2)" : "#EEF2FF" },
                  ]}
                >
                  <Ionicons name="people" size={22} color="#4F46E5" />
                </View>
                <View style={styles.statCol}>
                  <Text style={[styles.statLabel, { color: colors.adminTextSecondary }]}>Total Students</Text>
                  <Text style={[styles.statValue, { color: colors.adminText }]}>{students.length}</Text>
                </View>
              </View>

              <View
                style={[
                  styles.statCard,
                  {
                    backgroundColor: colors.adminCard,
                    borderColor: colors.adminCardBorder,
                    borderLeftColor: "#10B981",
                  },
                ]}
              >
                <View
                  style={[
                    styles.statIconBox,
                    { backgroundColor: isDark ? "rgba(16,185,129,0.2)" : "#ECFDF5" },
                  ]}
                >
                  <Ionicons name="checkmark-circle" size={22} color="#10B981" />
                </View>
                <View style={styles.statCol}>
                  <Text style={[styles.statLabel, { color: colors.adminTextSecondary }]}>Active Status</Text>
                  <Text style={[styles.statValue, { color: colors.adminText }]}>{activePct}% ({activeCount} Active)</Text>
                </View>
              </View>

              <View
                style={[
                  styles.statCard,
                  {
                    backgroundColor: colors.adminCard,
                    borderColor: colors.adminCardBorder,
                    borderLeftColor: "#8B5CF6",
                  },
                ]}
              >
                <View
                  style={[
                    styles.statIconBox,
                    { backgroundColor: isDark ? "rgba(139,92,246,0.2)" : "#F5F3FF" },
                  ]}
                >
                  <Ionicons name="business" size={22} color="#8B5CF6" />
                </View>
                <View style={styles.statCol}>
                  <Text style={[styles.statLabel, { color: colors.adminTextSecondary }]}>Departments</Text>
                  <Text style={[styles.statValue, { color: colors.adminText }]}>{uniqueDeptsCount}</Text>
                </View>
              </View>

              <View
                style={[
                  styles.statCard,
                  {
                    backgroundColor: colors.adminCard,
                    borderColor: colors.adminCardBorder,
                    borderLeftColor: "#F59E0B",
                  },
                ]}
              >
                <View
                  style={[
                    styles.statIconBox,
                    { backgroundColor: isDark ? "rgba(245,158,11,0.2)" : "#FFFBEB" },
                  ]}
                >
                  <Ionicons name="sparkles" size={22} color="#F59E0B" />
                </View>
                <View style={styles.statCol}>
                  <Text style={[styles.statLabel, { color: colors.adminTextSecondary }]}>New Enrollments</Text>
                  <Text style={[styles.statValue, { color: colors.adminText }]}>+12 this term</Text>
                </View>
              </View>
            </View>

            {/* STATUS & DEPARTMENT FILTER PILLS */}
            <View style={styles.filterSection}>
              <Text style={[styles.filterTitle, { color: colors.adminTextSecondary }]}>Filter by Account Status:</Text>
              <View style={styles.statusFilterRow}>
                {(["All", "Active", "Blocked"] as const).map((st) => {
                  const active = statusFilter === st;
                  const count =
                    st === "All" ? students.length : st === "Active" ? activeCount : blockedCount;
                  return (
                    <TouchableOpacity
                      key={st}
                      style={[
                        styles.statusFilterChip,
                        {
                          backgroundColor: active
                            ? st === "Blocked"
                              ? "#DC2626"
                              : "#4F46E5"
                            : colors.adminSurfaceAlt,
                        },
                      ]}
                      onPress={() => setStatusFilter(st)}
                    >
                      <Text
                        style={[
                          styles.statusFilterChipText,
                          { color: active ? "#FFFFFF" : colors.adminTextSecondary },
                        ]}
                      >
                        {st} ({count})
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.filterTitle, { color: colors.adminTextSecondary, marginTop: 12 }]}>Filter by Department:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterScroll}
              >
                {DEPARTMENTS.map((dept) => {
                  const active = selectedDept === dept;
                  return (
                    <TouchableOpacity
                      key={dept}
                      style={[
                        styles.filterChip,
                        {
                          backgroundColor: active ? "#4F46E5" : colors.adminSurfaceAlt,
                        },
                      ]}
                      onPress={() => setSelectedDept(dept)}
                    >
                      <Text
                        style={[
                          styles.filterChipText,
                          {
                            color: active ? "#FFFFFF" : colors.adminTextSecondary,
                          },
                        ]}
                      >
                        {dept}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* STUDENTS LISTING */}
            {loading ? (
              <View style={styles.loaderBox}>
                <ActivityIndicator size="large" color="#5D3EBC" />
                <Text style={[styles.loadingText, { color: colors.adminTextSecondary }]}>Loading students...</Text>
              </View>
            ) : filteredStudents.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="person-outline" size={54} color={colors.adminTextSecondary} />
                <Text style={[styles.emptyTitle, { color: colors.adminText }]}>No Students Found</Text>
                <Text style={[styles.emptySubtitle, { color: colors.adminTextSecondary }]}>
                  Try adjusting your search query or department filter.
                </Text>
              </View>
            ) : (
              <View style={styles.studentsGrid}>
                {filteredStudents.map((item) => {
                  const initials =
                    item.fullName
                      ?.split(" ")
                      .map((p) => p.charAt(0))
                      .join("")
                      .slice(0, 2)
                      .toUpperCase() || "ST";

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.studentCard,
                        {
                          backgroundColor: colors.adminCard,
                          borderColor: colors.adminCardBorder,
                        },
                      ]}
                    >
                      <View style={styles.cardHeader}>
                        <View
                          style={[
                            styles.avatarCircle,
                            {
                              backgroundColor: isDark ? "rgba(79,70,229,0.25)" : "#EEF2FF",
                              borderColor: isDark ? "#4F46E5" : "#C7D2FE",
                            },
                          ]}
                        >
                          <Text style={styles.avatarText}>{initials}</Text>
                        </View>
                        <View style={styles.cardInfo}>
                          <Text style={[styles.studentName, { color: colors.adminText }]} numberOfLines={1}>
                            {item.fullName || "Unnamed Student"}
                          </Text>
                          <Text style={[styles.studentEmail, { color: colors.adminTextSecondary }]} numberOfLines={1}>
                            {item.email || "No email"}
                          </Text>
                        </View>
                        <View style={styles.actionBtnsRow}>
                          <TouchableOpacity
                            style={[
                              styles.iconActionBtn,
                              { backgroundColor: isDark ? "rgba(245,158,11,0.2)" : "#FEF3C7" },
                            ]}
                            onPress={() => handleOpenStudentHonors(item)}
                          >
                            <Ionicons name="ribbon-outline" size={17} color="#D97706" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.iconActionBtn,
                              { backgroundColor: isDark ? "rgba(79,70,229,0.2)" : "#EEF2FF" },
                            ]}
                            onPress={() => openEditModal(item)}
                          >
                            <Ionicons name="create-outline" size={18} color="#4F46E5" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.iconActionBtn,
                              item.isBlocked
                                ? { backgroundColor: isDark ? "rgba(16,185,129,0.2)" : "#DCFCE7" }
                                : { backgroundColor: isDark ? "rgba(245,158,11,0.2)" : "#FEF3C7" },
                            ]}
                            onPress={() => openBlockModal(item)}
                          >
                            <Ionicons
                              name={item.isBlocked ? "lock-open-outline" : "ban-outline"}
                              size={17}
                              color={item.isBlocked ? "#10B981" : "#D97706"}
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.iconActionBtn,
                              styles.deleteBtn,
                              isDark && { backgroundColor: "rgba(239,68,68,0.2)" },
                            ]}
                            onPress={() => openDeleteModal(item)}
                          >
                            <Ionicons name="trash-outline" size={18} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>

                      <View style={styles.badgeRow}>
                        <View style={[styles.rollBadge, isDark && { backgroundColor: "rgba(79,70,229,0.2)" }]}>
                          <Ionicons name="id-card-outline" size={13} color={isDark ? "#818CF8" : "#4338CA"} />
                          <Text style={[styles.rollBadgeText, isDark && { color: "#A5B4FC" }]}>
                            {item.rollNo || "NO ROLL"}
                          </Text>
                        </View>

                        <View style={[styles.deptBadge, isDark && { backgroundColor: "rgba(16,185,129,0.2)" }]}>
                          <Ionicons name="school-outline" size={13} color={isDark ? "#34D399" : "#065F46"} />
                          <Text style={[styles.deptBadgeText, isDark && { color: "#6EE7B7" }]}>
                            {item.department || "General"}
                          </Text>
                        </View>

                        <View style={[styles.semBadge, { backgroundColor: colors.adminSurfaceAlt }]}>
                          <Text style={[styles.semBadgeText, { color: colors.adminTextSecondary }]}>
                            Sem {item.semester || "1"}
                          </Text>
                        </View>

                        {/* Status Badge */}
                        {item.isBlocked ? (
                          <View style={[styles.statusBadgePill, { backgroundColor: isDark ? "rgba(239,68,68,0.2)" : "#FEE2E2" }]}>
                            <Ionicons name="ban" size={11} color="#EF4444" />
                            <Text style={[styles.statusBadgePillText, { color: "#EF4444" }]}>Blocked</Text>
                          </View>
                        ) : (
                          <View style={[styles.statusBadgePill, { backgroundColor: isDark ? "rgba(16,185,129,0.2)" : "#DCFCE7" }]}>
                            <Ionicons name="checkmark-circle" size={11} color="#10B981" />
                            <Text style={[styles.statusBadgePillText, { color: "#10B981" }]}>Active</Text>
                          </View>
                        )}
                      </View>

                      <View style={[styles.cardFooter, { borderTopColor: colors.adminCardBorder }]}>
                        <Ionicons name="business-outline" size={14} color={colors.adminTextSecondary} />
                        <Text style={[styles.collegeText, { color: colors.adminTextSecondary }]} numberOfLines={1}>
                          {item.college || "Campusly Tech"}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* ===================================================== */}
      {/* ADD / EDIT STUDENT MODAL */}
      {/* ===================================================== */}
      <Modal visible={modalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.adminCard,
                borderColor: colors.adminCardBorder,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.adminText }]}>
                {editingStudent ? "Edit Student Details" : "Enroll New Student"}
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Ionicons name="close" size={24} color={colors.adminTextSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 450 }}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Full Name *</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: colors.adminInputBg,
                      borderColor: colors.adminInputBorder,
                      color: colors.adminText,
                    },
                  ]}
                  placeholderTextColor={colors.adminTextSecondary}
                  placeholder="e.g. Rahul Sharma"
                  value={fullName}
                  onChangeText={setFullName}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Email Address *</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: colors.adminInputBg,
                      borderColor: colors.adminInputBorder,
                      color: colors.adminText,
                    },
                  ]}
                  placeholderTextColor={colors.adminTextSecondary}
                  placeholder="e.g. rahul.sharma@student.edu"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Roll Number *</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: colors.adminInputBg,
                      borderColor: colors.adminInputBorder,
                      color: colors.adminText,
                    },
                  ]}
                  placeholderTextColor={colors.adminTextSecondary}
                  placeholder="e.g. 21CSE089"
                  autoCapitalize="characters"
                  value={rollNo}
                  onChangeText={setRollNo}
                />
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Department</Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        backgroundColor: colors.adminInputBg,
                        borderColor: colors.adminInputBorder,
                        color: colors.adminText,
                      },
                    ]}
                    placeholderTextColor={colors.adminTextSecondary}
                    placeholder="CSE, ECE, ME..."
                    value={department}
                    onChangeText={setDepartment}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Semester</Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        backgroundColor: colors.adminInputBg,
                        borderColor: colors.adminInputBorder,
                        color: colors.adminText,
                      },
                    ]}
                    placeholderTextColor={colors.adminTextSecondary}
                    placeholder="1 to 8"
                    keyboardType="numeric"
                    value={semester}
                    onChangeText={setSemester}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Institution / College</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: colors.adminInputBg,
                      borderColor: colors.adminInputBorder,
                      color: colors.adminText,
                    },
                  ]}
                  placeholderTextColor={colors.adminTextSecondary}
                  placeholder="e.g. Campusly Institute of Tech"
                  value={college}
                  onChangeText={setCollege}
                />
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.adminCardBorder }]}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.adminSurfaceAlt }]}
                onPress={closeModal}
                disabled={saving}
              >
                <Text style={[styles.modalCancelText, { color: colors.adminTextSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={saveStudent}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveText}>
                    {editingStudent ? "Save Changes" : "Create Profile"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================== */}
      {/* AWARD STUDENT CERTIFICATE MODAL */}
      {/* ===================================================== */}
      <Modal visible={certModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.adminCard,
                borderColor: colors.adminCardBorder,
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="ribbon" size={22} color="#D97706" />
                <Text style={[styles.modalTitle, { color: colors.adminText }]}>
                  Award Student Certificate
                </Text>
              </View>
              <TouchableOpacity onPress={() => setCertModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.adminTextSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 450 }}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Recipient Student</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: colors.adminSurfaceAlt,
                      borderColor: colors.adminInputBorder,
                      color: colors.adminText,
                    },
                  ]}
                  value={`${targetStudentForCert?.fullName || "Student"} (${targetStudentForCert?.rollNo || "No Roll"})`}
                  editable={false}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Certificate Title *</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: colors.adminInputBg,
                      borderColor: colors.adminInputBorder,
                      color: colors.adminText,
                    },
                  ]}
                  placeholderTextColor={colors.adminTextSecondary}
                  placeholder="e.g. Certificate of Academic Excellence"
                  value={certTitle}
                  onChangeText={setCertTitle}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Subject / Domain *</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: colors.adminInputBg,
                      borderColor: colors.adminInputBorder,
                      color: colors.adminText,
                    },
                  ]}
                  placeholderTextColor={colors.adminTextSecondary}
                  placeholder="e.g. Data Structures & Algorithms Mastery"
                  value={certSubject}
                  onChangeText={setCertSubject}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Grade / Honor / Distinction</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: colors.adminInputBg,
                      borderColor: colors.adminInputBorder,
                      color: colors.adminText,
                    },
                  ]}
                  placeholderTextColor={colors.adminTextSecondary}
                  placeholder="e.g. Grade A+ (94%) • First Class with Distinction"
                  value={certGrade}
                  onChangeText={setCertGrade}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Issue Date</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: colors.adminInputBg,
                      borderColor: colors.adminInputBorder,
                      color: colors.adminText,
                    },
                  ]}
                  placeholderTextColor={colors.adminTextSecondary}
                  placeholder="e.g. Sep 21, 2026"
                  value={certIssueDate}
                  onChangeText={setCertIssueDate}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Commendation / Description</Text>
                <TextInput
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: colors.adminInputBg,
                      borderColor: colors.adminInputBorder,
                      color: colors.adminText,
                      height: 75,
                      textAlignVertical: "top",
                    },
                  ]}
                  placeholderTextColor={colors.adminTextSecondary}
                  placeholder="Awarded for outstanding academic dedication and project achievements."
                  value={certRemarks}
                  onChangeText={setCertRemarks}
                  multiline
                />
              </View>

              {/* PDF & PHOTO SYSTEM FOR STUDENT HONORS */}
              <Text style={[styles.inputLabel, { color: colors.adminTextSecondary, marginTop: 10 }]}>
                Certificate Documents & Photos (PDF & Photo System):
              </Text>
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                <TouchableOpacity
                  style={[styles.attachBtn, { backgroundColor: isDark ? "#312E81" : "#EEF2FF", borderColor: "#C7D2FE" }]}
                  onPress={handlePickCertPdf}
                >
                  <Ionicons name="document-text" size={16} color="#DC2626" />
                  <Text style={[styles.attachBtnText, { color: "#DC2626" }]}>
                    {certPdfUrl ? "Change PDF" : "Attach PDF"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.attachBtn, { backgroundColor: isDark ? "#312E81" : "#EEF2FF", borderColor: "#C7D2FE" }]}
                  onPress={handlePickCertPhoto}
                >
                  <Ionicons name="image" size={16} color="#7C3AED" />
                  <Text style={[styles.attachBtnText, { color: "#7C3AED" }]}>
                    {certPhotoUrl ? "Change Photo" : "Attach Photo"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.attachBtn, { backgroundColor: isDark ? "#312E81" : "#EEF2FF", borderColor: "#C7D2FE" }]}
                  onPress={handleTakeCertPhoto}
                >
                  <Ionicons name="camera" size={16} color="#4F46E5" />
                  <Text style={[styles.attachBtnText, { color: "#4F46E5" }]}>Camera</Text>
                </TouchableOpacity>
              </View>

              {/* Upload Status */}
              {uploadStatus ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
                  <ActivityIndicator size="small" color="#D97706" />
                  <Text style={{ fontSize: 12, color: "#D97706", fontWeight: "600" }}>{uploadStatus}</Text>
                </View>
              ) : null}

              {/* PDF Preview Pill */}
              {certPdfUrl ? (
                <View style={[styles.attachedPillRow, { backgroundColor: isDark ? "#1E293B" : "#FEF2F2", borderColor: "#FCA5A5" }]}>
                  <Ionicons name="document-text" size={16} color="#DC2626" />
                  <Text style={[styles.attachedPillName, { color: colors.adminText }]} numberOfLines={1}>
                    {certPdfName || "Official_Certificate.pdf"}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      if (certPdfUrl) {
                        shareOrDownloadPdf(certPdfUrl, certTitle).catch(() => Linking.openURL(certPdfUrl));
                      }
                    }}
                    style={{ marginRight: 6 }}
                  >
                    <Ionicons name="download-outline" size={16} color="#DC2626" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setCertPdfUrl(""); setCertPdfName(""); }}>
                    <Ionicons name="close-circle" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ) : null}

              {/* Photo Preview Pill */}
              {certPhotoUrl ? (
                <View style={[styles.attachedPillRow, { backgroundColor: isDark ? "#1E293B" : "#F5F3FF", borderColor: "#DDD6FE" }]}>
                  <Ionicons name="image" size={16} color="#7C3AED" />
                  <Text style={[styles.attachedPillName, { color: colors.adminText }]} numberOfLines={1}>
                    {certPhotoName || "Honor_Photo.jpg"}
                  </Text>
                  <TouchableOpacity onPress={() => setPreviewHonorPhoto(certPhotoUrl)} style={{ marginRight: 6 }}>
                    <Ionicons name="eye-outline" size={16} color="#7C3AED" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => { setCertPhotoUrl(""); setCertPhotoName(""); }}>
                    <Ionicons name="close-circle" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ) : null}
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.adminCardBorder }]}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.adminSurfaceAlt }]}
                onPress={() => {
                  setCertModalVisible(false);
                  setEditingCertItem(null);
                }}
                disabled={certSaving}
              >
                <Text style={[styles.modalCancelText, { color: colors.adminTextSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: "#D97706" }]}
                onPress={handleSaveStudentCertificate}
                disabled={certSaving}
              >
                {certSaving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveText}>
                    {editingCertItem ? "Update Certificate 🎓" : "Issue Certificate 🎓"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================== */}
      {/* STUDENT HONORS & CERTIFICATES DIRECTORY MODAL */}
      {/* ===================================================== */}
      <Modal visible={honorsListModalVisible} transparent animationType="fade" onRequestClose={() => setHonorsListModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder, maxWidth: 640 }]}>
            <View style={styles.modalHeader}>
              <View>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="ribbon" size={22} color="#D97706" />
                  <Text style={[styles.modalTitle, { color: colors.adminText }]}>
                    Student Honors & Certificates
                  </Text>
                </View>
                <Text style={[styles.modalSubtitleSmall, { color: colors.adminTextSecondary }]}>
                  {targetStudentForCert?.fullName} ({targetStudentForCert?.rollNo}) • {targetStudentForCert?.department}
                </Text>
              </View>

              <TouchableOpacity onPress={() => setHonorsListModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.adminTextSecondary} />
              </TouchableOpacity>
            </View>

            {/* Quick Action to Issue New Honor */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <Text style={{ fontSize: 13, fontWeight: "700", color: colors.adminText }}>
                Awarded Honors ({studentHonorsList.length})
              </Text>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: "#D97706", paddingVertical: 6, paddingHorizontal: 14 }]}
                onPress={() => {
                  if (targetStudentForCert) {
                    handleOpenCertModalForStudent(targetStudentForCert);
                  }
                }}
              >
                <Ionicons name="add" size={16} color="#FFFFFF" />
                <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "700" }}>Award New Honor</Text>
              </TouchableOpacity>
            </View>

            {/* List of Student's Honors */}
            {loadingHonors ? (
              <View style={{ paddingVertical: 40, alignItems: "center" }}>
                <ActivityIndicator size="small" color="#D97706" />
                <Text style={{ fontSize: 12, color: colors.adminTextSecondary, marginTop: 8 }}>Loading honors...</Text>
              </View>
            ) : studentHonorsList.length === 0 ? (
              <View style={{ paddingVertical: 40, alignItems: "center" }}>
                <Ionicons name="ribbon-outline" size={44} color={colors.adminTextSecondary} />
                <Text style={{ fontSize: 15, fontWeight: "700", color: colors.adminText, marginTop: 10 }}>No Honors Awarded Yet</Text>
                <Text style={{ fontSize: 12, color: colors.adminTextSecondary, marginTop: 4, textAlign: "center", maxWidth: 300 }}>
                  This student has not received any certificates yet. Click "Award New Honor" to issue an official certificate with PDF or photo.
                </Text>
              </View>
            ) : (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                {studentHonorsList.map((honor) => (
                  <View
                    key={honor.id}
                    style={[
                      styles.honorItemCard,
                      { backgroundColor: colors.adminSurfaceAlt, borderColor: colors.adminCardBorder },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                        <View style={styles.honorBadge}>
                          <Text style={styles.honorBadgeText}>{honor.grade || "HONOR"}</Text>
                        </View>
                        <Text style={[styles.honorDateText, { color: colors.adminTextSecondary }]}>
                          Issued: {honor.issueDate || "Recent"}
                        </Text>
                      </View>

                      <Text style={[styles.honorTitleText, { color: colors.adminText }]}>
                        {honor.title}
                      </Text>
                      <Text style={[styles.honorSubjectText, { color: colors.adminTextSecondary }]}>
                        {honor.subject} • Credential ID: {honor.credentialId || "CAMP-HONOR"}
                      </Text>

                      {/* Attachments (PDF / Photo) */}
                      {(honor.pdfUrl || honor.photoUrl) && (
                        <View style={{ flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                          {honor.pdfUrl ? (
                            <TouchableOpacity
                              style={styles.pdfAttachmentPill}
                              onPress={() => {
                                if (honor.pdfUrl) {
                                  shareOrDownloadPdf(honor.pdfUrl, honor.title).catch(() => Linking.openURL(honor.pdfUrl));
                                }
                              }}
                            >
                              <Ionicons name="document-text" size={13} color="#DC2626" />
                              <Text style={styles.pdfAttachmentText} numberOfLines={1}>Official PDF</Text>
                              <Ionicons name="download-outline" size={12} color="#DC2626" />
                            </TouchableOpacity>
                          ) : null}

                          {honor.photoUrl ? (
                            <TouchableOpacity
                              style={styles.photoAttachmentPill}
                              onPress={() => setPreviewHonorPhoto(honor.photoUrl)}
                            >
                              <Ionicons name="image" size={13} color="#7C3AED" />
                              <Text style={styles.photoAttachmentText} numberOfLines={1}>Photo</Text>
                              <Ionicons name="eye-outline" size={12} color="#7C3AED" />
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      )}
                    </View>

                    {/* Actions: Edit & Delete */}
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginLeft: 12 }}>
                      <TouchableOpacity
                        style={[styles.iconActionBtn, { backgroundColor: isDark ? "rgba(79,70,229,0.2)" : "#EEF2FF" }]}
                        onPress={() => {
                          if (targetStudentForCert) {
                            handleOpenCertModalForStudent(targetStudentForCert, honor);
                          }
                        }}
                      >
                        <Ionicons name="create-outline" size={16} color="#4F46E5" />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.iconActionBtn, { backgroundColor: isDark ? "rgba(239,68,68,0.2)" : "#FEE2E2" }]}
                        onPress={() => handleOpenDeleteHonor(honor)}
                      >
                        <Ionicons name="trash-outline" size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            )}

            <View style={[styles.modalFooter, { borderTopColor: colors.adminCardBorder }]}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.adminSurfaceAlt }]}
                onPress={() => setHonorsListModalVisible(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.adminTextSecondary }]}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================== */}
      {/* DELETE HONOR CONFIRMATION MODAL */}
      {/* ===================================================== */}
      <Modal visible={deleteHonorModalVisible} transparent animationType="fade" onRequestClose={() => setDeleteHonorModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.confirmModalCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
            <View style={[styles.confirmIconCircle, { backgroundColor: isDark ? "rgba(239,68,68,0.2)" : "#FEE2E2" }]}>
              <Ionicons name="trash" size={28} color="#EF4444" />
            </View>

            <Text style={[styles.confirmModalTitle, { color: colors.adminText }]}>
              Delete Honor Certificate
            </Text>

            <Text style={[styles.confirmModalMessage, { color: colors.adminTextSecondary }]}>
              Are you sure you want to permanently delete "{targetHonorForDelete?.title}"? This credential and any attached PDF/photo will be removed from Firebase.
            </Text>

            <View style={styles.confirmModalActionsRow}>
              <TouchableOpacity
                style={[styles.confirmCancelBtn, { backgroundColor: colors.adminSurfaceAlt }]}
                onPress={() => {
                  setDeleteHonorModalVisible(false);
                  setTargetHonorForDelete(null);
                }}
                disabled={deletingHonor}
              >
                <Text style={[styles.confirmCancelBtnText, { color: colors.adminTextSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmActionBtn, { backgroundColor: "#DC2626" }]}
                onPress={handleConfirmDeleteHonor}
                disabled={deletingHonor}
              >
                {deletingHonor ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.confirmActionBtnText}>Delete Honor</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================== */}
      {/* PHOTO PREVIEW MODAL */}
      {/* ===================================================== */}
      <Modal visible={Boolean(previewHonorPhoto)} transparent animationType="fade" onRequestClose={() => setPreviewHonorPhoto(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder, maxWidth: 600, alignItems: "center" }]}>
            <View style={{ width: "100%", flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={[styles.modalTitle, { color: colors.adminText }]}>Honor Photo Preview</Text>
              <TouchableOpacity onPress={() => setPreviewHonorPhoto(null)}>
                <Ionicons name="close" size={24} color={colors.adminTextSecondary} />
              </TouchableOpacity>
            </View>
            {previewHonorPhoto && (
              <Image source={{ uri: previewHonorPhoto }} style={{ width: "100%", height: 360, borderRadius: 10, resizeMode: "contain" }} />
            )}
            <TouchableOpacity
              style={[styles.modalCancelBtn, { marginTop: 16, width: "100%", alignItems: "center", backgroundColor: colors.adminSurfaceAlt }]}
              onPress={() => setPreviewHonorPhoto(null)}
            >
              <Text style={[styles.modalCancelText, { color: colors.adminTextSecondary }]}>Close Preview</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      {/* ===================================================== */}
      {/* DELETE CONFIRMATION MODAL */}
      {/* ===================================================== */}
      <Modal visible={deleteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.confirmModalCard,
              {
                backgroundColor: colors.adminCard,
                borderColor: colors.adminCardBorder,
              },
            ]}
          >
            <View style={[styles.confirmIconCircle, { backgroundColor: isDark ? "rgba(239,68,68,0.2)" : "#FEE2E2" }]}>
              <Ionicons name="trash" size={28} color="#EF4444" />
            </View>

            <Text style={[styles.confirmModalTitle, { color: colors.adminText }]}>
              Delete Student Account
            </Text>

            <Text style={[styles.confirmModalMessage, { color: colors.adminTextSecondary }]}>
              Are you sure you want to permanently delete{" "}
              <Text style={{ fontWeight: "700", color: colors.adminText }}>
                {targetStudentForDelete?.fullName || "this student"}
              </Text>{" "}
              ({targetStudentForDelete?.rollNo || "No Roll"})? This action cannot be undone and will permanently remove this student profile from Firebase.
            </Text>

            <View style={styles.confirmModalActionsRow}>
              <TouchableOpacity
                style={[styles.confirmCancelBtn, { backgroundColor: colors.adminSurfaceAlt }]}
                onPress={() => {
                  if (deleteLoading) return;
                  setDeleteModalVisible(false);
                  setTargetStudentForDelete(null);
                }}
                disabled={deleteLoading}
              >
                <Text style={[styles.confirmCancelBtnText, { color: colors.adminTextSecondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmActionBtn, { backgroundColor: "#DC2626" }]}
                onPress={handleConfirmDelete}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.confirmActionBtnText}>Delete Student</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================== */}
      {/* BLOCK / UNBLOCK CONFIRMATION MODAL */}
      {/* ===================================================== */}
      <Modal visible={blockModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.confirmModalCard,
              {
                backgroundColor: colors.adminCard,
                borderColor: colors.adminCardBorder,
              },
            ]}
          >
            <View
              style={[
                styles.confirmIconCircle,
                targetStudentForBlock?.isBlocked
                  ? { backgroundColor: isDark ? "rgba(16,185,129,0.2)" : "#DCFCE7" }
                  : { backgroundColor: isDark ? "rgba(245,158,11,0.2)" : "#FEF3C7" },
              ]}
            >
              <Ionicons
                name={targetStudentForBlock?.isBlocked ? "shield-checkmark" : "ban"}
                size={28}
                color={targetStudentForBlock?.isBlocked ? "#10B981" : "#D97706"}
              />
            </View>

            <Text style={[styles.confirmModalTitle, { color: colors.adminText }]}>
              {targetStudentForBlock?.isBlocked ? "Unblock Student Account" : "Block Student Account"}
            </Text>

            <Text style={[styles.confirmModalMessage, { color: colors.adminTextSecondary }]}>
              {targetStudentForBlock?.isBlocked
                ? `Are you sure you want to unblock ${targetStudentForBlock?.fullName}? Full access to login, lectures, and campus features will be restored.`
                : `Are you sure you want to block ${targetStudentForBlock?.fullName}? This student will be prohibited from logging in and marked as suspended.`}
            </Text>

            <View style={styles.confirmModalActionsRow}>
              <TouchableOpacity
                style={[styles.confirmCancelBtn, { backgroundColor: colors.adminSurfaceAlt }]}
                onPress={() => {
                  if (blockLoading) return;
                  setBlockModalVisible(false);
                  setTargetStudentForBlock(null);
                }}
                disabled={blockLoading}
              >
                <Text style={[styles.confirmCancelBtnText, { color: colors.adminTextSecondary }]}>
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmActionBtn,
                  { backgroundColor: targetStudentForBlock?.isBlocked ? "#10B981" : "#D97706" },
                ]}
                onPress={handleConfirmToggleBlock}
                disabled={blockLoading}
              >
                {blockLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name={targetStudentForBlock?.isBlocked ? "lock-open-outline" : "ban-outline"}
                      size={16}
                      color="#FFFFFF"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.confirmActionBtnText}>
                      {targetStudentForBlock?.isBlocked ? "Unblock Student" : "Block Student"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// =====================================================
// STYLES
// =====================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2A174E",
  },
  mainLayout: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#F8FAFC",
  },
  // SIDEBAR
  sidebar: {
    width: 250,
    backgroundColor: "#2A174E",
    paddingVertical: 20,
    paddingHorizontal: 16,
    borderRightWidth: 1,
    borderRightColor: "#3B2268",
    justifyContent: "space-between",
  },
  mobileSidebar: {
    width: 280,
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 999,
  },
  sidebarBrand: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 26,
    paddingHorizontal: 6,
  },
  brandIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: "#5D3EBC",
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  brandSubtitle: {
    fontSize: 11,
    color: "#A78BFA",
    fontWeight: "500",
  },
  closeSidebarBtn: {
    marginLeft: "auto",
    padding: 6,
  },
  sidebarNavScroll: {
    paddingVertical: 6,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
    marginBottom: 4,
  },
  navItemActive: {
    backgroundColor: "#5D3EBC",
  },
  navItemLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    marginLeft: 12,
    fontWeight: "500",
  },
  navItemLabelActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  sidebarLogout: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    marginTop: 10,
  },
  sidebarLogoutText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    marginLeft: 12,
    fontWeight: "600",
  },
  mobileModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    flexDirection: "row",
  },
  // CONTENT AREA
  contentArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  menuHamburger: {
    marginRight: 14,
    padding: 4,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: 500,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
    marginLeft: 8,
  },
  topRightRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 16,
  },
  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 10,
  },
  adminBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
  },
  adminAvatarSmall: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center",
  },
  adminBadgeText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#4338CA",
    marginLeft: 8,
  },
  scrollContent: {
    padding: 24,
  },
  // HEADER SECTION
  headerSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
  },
  pageSubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 2,
  },
  addStudentBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4F46E5",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    gap: 6,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  addStudentBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  // STATS ROW
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 4,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  statCol: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
  // FILTER SECTION
  filterSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    flexWrap: "wrap",
    gap: 10,
  },
  filterTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  filterScroll: {
    gap: 8,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#E2E8F0",
  },
  filterChipActive: {
    backgroundColor: "#4F46E5",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  // STUDENTS GRID
  studentsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  studentCard: {
    flex: 1,
    minWidth: 300,
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  avatarCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#EEF2FF",
    borderWidth: 1,
    borderColor: "#C7D2FE",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#4F46E5",
  },
  cardInfo: {
    flex: 1,
  },
  studentName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  studentEmail: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  actionBtnsRow: {
    flexDirection: "row",
    gap: 6,
  },
  iconActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtn: {
    backgroundColor: "#FEE2E2",
  },
  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginVertical: 10,
  },
  rollBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  rollBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4338CA",
  },
  deptBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  deptBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#065F46",
  },
  semBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  semBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  collegeText: {
    fontSize: 12,
    color: "#64748B",
  },
  loaderBox: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
  },
  emptyBox: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#334155",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 4,
  },
  // MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 520,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  inputGroup: {
    marginBottom: 16,
  },
  rowInputs: {
    flexDirection: "row",
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 20,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
  },
  modalSaveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: "#4F46E5",
  },
  modalSaveText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  statusFilterRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  statusFilterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  statusFilterChipText: {
    fontSize: 12,
    fontWeight: "700",
  },
  statusBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  statusBadgePillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  confirmModalCard: {
    width: "90%",
    maxWidth: 420,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    alignItems: "center",
  },
  confirmIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10,
  },
  confirmModalMessage: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 24,
  },
  confirmModalActionsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmCancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  confirmActionBtn: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmActionBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  modalSubtitleSmall: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: "500",
  },
  attachBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  attachBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  attachedPillRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginBottom: 8,
  },
  attachedPillName: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  honorItemCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 10,
  },
  honorBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  honorBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#D97706",
  },
  honorDateText: {
    fontSize: 11,
    fontWeight: "500",
  },
  honorTitleText: {
    fontSize: 14,
    fontWeight: "800",
  },
  honorSubjectText: {
    fontSize: 11,
    marginTop: 2,
  },
  pdfAttachmentPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  pdfAttachmentText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#DC2626",
  },
  photoAttachmentPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  photoAttachmentText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#7C3AED",
  },
});