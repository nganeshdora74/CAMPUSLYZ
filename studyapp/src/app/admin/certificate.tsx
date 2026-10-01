import React, { useEffect, useState } from "react";
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
import * as DocumentPicker from "expo-document-picker";
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
  CertificateData,
  generateCertificatePdf,
  pickPdfDocument,
  shareOrDownloadPdf,
  uploadCertificateFile,
} from "../../services/certificatePdfService";

const PRESET_PHOTOS = [
  {
    id: "seal",
    label: "Honor Seal",
    url: "https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=400&auto=format&fit=crop&q=80",
    icon: "ribbon",
  },
  {
    id: "shield",
    label: "Academic Crest",
    url: "https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=400&auto=format&fit=crop&q=80",
    icon: "shield-checkmark",
  },
  {
    id: "trophy",
    label: "Excellence Star",
    url: "https://images.unsplash.com/photo-1569683795645-b62e50fbf103?w=400&auto=format&fit=crop&q=80",
    icon: "trophy",
  },
];

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

export interface StudentItem {
  id: string;
  fullName: string;
  rollNo: string;
  department: string;
  semester?: string | number;
  email: string;
}

export interface CertificateItem {
  id: string;
  studentId?: string;
  studentName: string;
  studentRollNo: string;
  title: string;
  subject: string;
  grade: string;
  issueDate: string;
  issuedBy: string;
  issuerTitle?: string;
  credentialId?: string;
  description?: string;
  photoUrl?: string;
  pdfUrl?: string;
  verified?: boolean;
  createdAt?: any;
}

export interface CertRequestItem {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  certificateType: string;
  purpose: string;
  status: string;
  createdAt?: any;
}

export default function AdminCertificateScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const { colors, isDark } = useAppTheme();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"students" | "issued" | "requests">("students");

  // Data states
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [requests, setRequests] = useState<CertRequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");

  // Issue / Edit Certificate Modal States (matching screenshot)
  const [issueModalVisible, setIssueModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentItem | null>(null);
  const [editingCert, setEditingCert] = useState<CertificateItem | null>(null);
  const [certTitle, setCertTitle] = useState("");
  const [certSubject, setCertSubject] = useState("");
  const [certStudentName, setCertStudentName] = useState("");
  const [certStudentRoll, setCertStudentRoll] = useState("");
  const [certGrade, setCertGrade] = useState("Grade A+ (94%)");
  const [certTeacher, setCertTeacher] = useState("Prof. Ganesh Sharma");
  const [certDescription, setCertDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoFileName, setPhotoFileName] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfFileName, setPdfFileName] = useState("");
  const [pdfFileSize, setPdfFileSize] = useState("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [fulfillingRequestId, setFulfillingRequestId] = useState<string | null>(null);
  const [savingCert, setSavingCert] = useState(false);

  // Preview Photo Modal
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // In-App Delete Confirmation Modal State
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [targetCertForDelete, setTargetCertForDelete] = useState<CertificateItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // 1. Realtime Listeners: Users / Students
  useEffect(() => {
    const usersCol = collection(db, "users");
    const unsubscribe = onSnapshot(
      usersCol,
      (snapshot) => {
        const loaded: StudentItem[] = [];
        snapshot.docs.forEach((docSnap) => {
          const d = docSnap.data();
          const role = (d.role || "").toLowerCase();
          if (role === "admin" || role === "teacher") return;

          loaded.push({
            id: docSnap.id,
            fullName: d.fullName || d.name || "Student",
            rollNo: d.rollNo || "23CSE001",
            department: d.department || "CSE",
            semester: d.semester || "4",
            email: d.email || "",
          });
        });
        setStudents(loaded);
        setLoading(false);
      },
      (err) => {
        console.warn("Students listener error:", err);
        setStudents([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // 2. Realtime Listeners: Issued Certificates
  useEffect(() => {
    const certsCol = collection(db, "certificates");
    const unsubscribe = onSnapshot(
      certsCol,
      (snapshot) => {
        const loaded: CertificateItem[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            studentId: data.studentId || "",
            studentName: data.studentName || "Student",
            studentRollNo: data.studentRollNo || "23CSE001",
            title: data.title || "Academic Certificate",
            subject: data.subject || "Course Mastery",
            grade: data.grade || "Grade A+",
            issueDate: data.issueDate || "2026",
            issuedBy: data.issuedBy || "Prof. Ganesh Sharma",
            issuerTitle: data.issuerTitle || "Faculty Mentor & Instructor",
            credentialId: data.credentialId || `CAMP-${d.id.slice(0, 6).toUpperCase()}`,
            description: data.description || "",
            photoUrl: data.photoUrl || undefined,
            pdfUrl: data.pdfUrl || undefined,
            verified: true,
            createdAt: data.createdAt,
          };
        });

        // Sort descending by ID or timestamp
        setCertificates(loaded);
      },
      (err) => {
        console.warn("Certs listener error:", err);
        setCertificates([]);
      }
    );

    return () => unsubscribe();
  }, []);

  // 3. Realtime Listeners: Certificate Requests
  useEffect(() => {
    const reqCol = collection(db, "certificateRequests");
    const unsubscribe = onSnapshot(
      reqCol,
      (snapshot) => {
        const loaded: CertRequestItem[] = snapshot.docs.map((d) => ({
          id: d.id,
          studentId: d.data().studentId || "",
          studentName: d.data().studentName || "Student",
          studentEmail: d.data().studentEmail || "",
          certificateType: d.data().certificateType || "Bonafide Certificate",
          purpose: d.data().purpose || "",
          status: d.data().status || "Pending",
          createdAt: d.data().createdAt,
        }));
        setRequests(loaded);
      },
      (err) => {
        console.warn("Requests listener error:", err);
        setRequests([]);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filtered Students
  const filteredStudents = students.filter((s) => {
    const matchesDept = deptFilter === "All" || s.department.toUpperCase().includes(deptFilter.toUpperCase());
    const matchesSearch =
      s.fullName.toLowerCase().includes(search.toLowerCase()) ||
      s.rollNo.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase());
    return matchesDept && matchesSearch;
  });

  // Filtered Certificates
  const filteredCerts = certificates.filter((c) => {
    return (
      c.title.toLowerCase().includes(search.toLowerCase()) ||
      c.studentName.toLowerCase().includes(search.toLowerCase()) ||
      c.studentRollNo.toLowerCase().includes(search.toLowerCase()) ||
      c.subject.toLowerCase().includes(search.toLowerCase())
    );
  });

  // Open Issue Modal for a specific student
  const handleOpenIssueForStudent = (student: StudentItem) => {
    setEditingCert(null);
    setSelectedStudent(student);
    setCertStudentName(student.fullName);
    setCertStudentRoll(student.rollNo);
    setCertTitle("Certificate of Academic Excellence");
    setCertSubject(student.department === "CSE" ? "Data Structures & Algorithms Mastery" : "Engineering Fundamentals");
    setCertGrade("Grade A+ (94%)");
    setCertTeacher("Prof. Ganesh Sharma");
    setCertDescription(`Awarded to ${student.fullName} for outstanding academic excellence and mastery.`);
    setPhotoUrl("");
    setPhotoFileName("");
    setPdfUrl("");
    setPdfFileName("");
    setPdfFileSize("");
    setFulfillingRequestId(null);
    setIssueModalVisible(true);
  };

  // Open Issue / Edit Modal to UPDATE an existing certificate
  const handleOpenEditCertificate = (cert: CertificateItem) => {
    setEditingCert(cert);
    setSelectedStudent(null);
    setCertStudentName(cert.studentName);
    setCertStudentRoll(cert.studentRollNo);
    setCertTitle(cert.title);
    setCertSubject(cert.subject);
    setCertGrade(cert.grade);
    setCertTeacher(cert.issuedBy);
    setCertDescription(cert.description || "");
    setPhotoUrl(cert.photoUrl || "");
    setPhotoFileName(cert.photoUrl ? "Attached Photo" : "");
    setPdfUrl(cert.pdfUrl || "");
    setPdfFileName(cert.pdfUrl ? "Official Certificate PDF" : "");
    setPdfFileSize(cert.pdfUrl ? "PDF Document" : "");
    setFulfillingRequestId(null);
    setIssueModalVisible(true);
  };

  // Open Issue Modal from Request
  const handleApproveRequest = (req: CertRequestItem) => {
    setEditingCert(null);
    setSelectedStudent(null);
    setCertStudentName(req.studentName);
    setCertStudentRoll("23CSE001");
    setCertTitle(req.certificateType);
    setCertSubject(req.purpose || "Official Academic Credential");
    setCertGrade("Verified & Approved");
    setCertTeacher("Prof. Ganesh Sharma");
    setCertDescription(`Conferred as per official student request for ${req.purpose}.`);
    setPhotoUrl("");
    setPhotoFileName("");
    setPdfUrl("");
    setPdfFileName("");
    setPdfFileSize("");
    setFulfillingRequestId(req.id);
    setIssueModalVisible(true);
  };

  // Pick Certificate Photo from Gallery
  const handlePickPhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Required", "Please allow gallery access to attach certificate image.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        allowsEditing: true,
        quality: 0.85,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setPhotoUrl(result.assets[0].uri);
        setPhotoFileName(result.assets[0].fileName || "attached_photo.jpg");
      }
    } catch (err: any) {
      Alert.alert("Photo Pick Error", err?.message || "Could not select photo.");
    }
  };

  // Take Certificate Photo from Camera
  const handleTakePhoto = async () => {
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission Required", "Please allow camera access to take certificate photo.");
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        quality: 0.85,
      });
      if (!result.canceled && result.assets?.[0]?.uri) {
        setPhotoUrl(result.assets[0].uri);
        setPhotoFileName("camera_photo.jpg");
      }
    } catch (err: any) {
      Alert.alert("Camera Error", err?.message || "Could not capture image.");
    }
  };

  // Select Preset Honor Photo
  const handleSelectPresetPhoto = (preset: typeof PRESET_PHOTOS[0]) => {
    setPhotoUrl(preset.url);
    setPhotoFileName(preset.label);
  };

  // Pick PDF File from Device
  const handlePickPdf = async () => {
    try {
      const doc = await pickPdfDocument();
      if (doc) {
        setPdfUrl(doc.uri);
        setPdfFileName(doc.name);
        if (doc.size) {
          const sizeKb = (doc.size / 1024).toFixed(1);
          setPdfFileSize(`${sizeKb} KB`);
        } else {
          setPdfFileSize("PDF Document");
        }
        Alert.alert("PDF Attached! 📄", `Document "${doc.name}" is attached and ready for issuance.`);
      }
    } catch (err: any) {
      Alert.alert("PDF Picker Error", err?.message || "Could not select PDF file.");
    }
  };

  // Auto-Generate Official Accredited PDF Certificate
  const handleGeneratePdf = async () => {
    if (!certTitle.trim() || !certSubject.trim()) {
      Alert.alert("Missing Details", "Please enter Certificate Title and Subject first to generate official PDF.");
      return;
    }

    try {
      setIsGeneratingPdf(true);
      const credId = `CAMP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const certData: CertificateData = {
        studentName: certStudentName.trim() || "Student",
        studentRollNo: certStudentRoll.trim() || "23CSE001",
        department: selectedStudent?.department || "Department of Academics",
        title: certTitle.trim(),
        subject: certSubject.trim(),
        grade: certGrade.trim() || "Grade A+",
        issuedBy: certTeacher.trim() || "Prof. Ganesh Sharma",
        issuerTitle: "Faculty Mentor & Instructor",
        issueDate: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        credentialId: credId,
        description: certDescription.trim() || `Conferred upon ${certStudentName.trim()} for academic excellence in ${certSubject.trim()}.`,
        photoUrl: photoUrl.trim() || undefined,
      };

      const result = await generateCertificatePdf(certData);
      setPdfUrl(result.uri);
      setPdfFileName(result.name);
      setPdfFileSize("Official Auto-Generated PDF");
      Alert.alert(
        "PDF Certificate Generated! ✨",
        "Official print-ready PDF certificate created with university seal, signatures, and honors badge."
      );
    } catch (err: any) {
      Alert.alert("PDF Generation Failed", err?.message || "Could not generate PDF certificate.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Preview or Share Attached PDF
  const handleTestSharePdf = async () => {
    if (!pdfUrl) {
      Alert.alert("No PDF Attached", "Please attach or generate a PDF certificate first.");
      return;
    }
    const shared = await shareOrDownloadPdf(pdfUrl, certTitle || "Official Certificate");
    if (!shared) {
      Linking.openURL(pdfUrl).catch(() => {
        Alert.alert("PDF Document", `Link: ${pdfUrl}`);
      });
    }
  };

  // Issue or Update Certificate & Sync to Student
  const handleSaveCertificate = async () => {
    if (!certTitle.trim() || !certSubject.trim()) {
      Alert.alert("Missing Details", "Please enter Certificate Title and Subject/Course domain.");
      return;
    }

    try {
      setSavingCert(true);
      const isUpdating = Boolean(editingCert);
      const credId = editingCert?.credentialId || `CAMP-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      let finalPhotoUrl = photoUrl.trim();
      let finalPdfUrl = pdfUrl.trim();

      // Upload local photo to Firebase Storage
      if (finalPhotoUrl && !finalPhotoUrl.startsWith("http://") && !finalPhotoUrl.startsWith("https://")) {
        setUploadStatus("Uploading certificate photo to Cloud Storage...");
        try {
          finalPhotoUrl = await uploadCertificateFile(finalPhotoUrl, "photo", credId);
        } catch (photoErr: any) {
          console.warn("Photo upload fallback:", photoErr?.message);
        }
      }

      // Upload local PDF to Firebase Storage
      if (finalPdfUrl && !finalPdfUrl.startsWith("http://") && !finalPdfUrl.startsWith("https://")) {
        setUploadStatus("Uploading official PDF document to Cloud Storage...");
        try {
          finalPdfUrl = await uploadCertificateFile(finalPdfUrl, "pdf", credId);
        } catch (pdfErr: any) {
          console.warn("PDF upload fallback:", pdfErr?.message);
        }
      }

      setUploadStatus(isUpdating ? "Updating official credential..." : "Finalizing official credential...");

      if (isUpdating && editingCert) {
        // UPDATE EXISTING CERTIFICATE IN FIRESTORE
        await updateDoc(doc(db, "certificates", editingCert.id), {
          studentName: certStudentName.trim() || editingCert.studentName,
          studentRollNo: certStudentRoll.trim() || editingCert.studentRollNo,
          title: certTitle.trim(),
          subject: certSubject.trim(),
          grade: certGrade.trim() || "Grade A+",
          issuedBy: certTeacher.trim() || "Prof. Ganesh Sharma",
          description: certDescription.trim(),
          photoUrl: finalPhotoUrl || null,
          pdfUrl: finalPdfUrl || null,
          updatedAt: serverTimestamp(),
        });

        // Log Activity
        await addDoc(collection(db, "activities"), {
          title: `Certificate Updated: ${certTitle.trim()} for ${certStudentName.trim()}`,
          time: "Just now",
          user: "Admin",
          type: "certificate",
          createdAt: serverTimestamp(),
        });

        setIssueModalVisible(false);
        setEditingCert(null);
        setPhotoUrl("");
        setPhotoFileName("");
        setPdfUrl("");
        setPdfFileName("");
        setPdfFileSize("");

        Alert.alert(
          "Certificate Updated! 🎓",
          `Official certificate "${certTitle.trim()}" for ${certStudentName.trim()} has been updated successfully.\n${finalPdfUrl ? "✓ Official PDF document attached.\n" : ""}${finalPhotoUrl ? "✓ Photo attached.\n" : ""}The student can now view and download the updated certificate in their app in real-time.`
        );
      } else {
        // ISSUE NEW CERTIFICATE
        await addDoc(collection(db, "certificates"), {
          studentId: selectedStudent ? selectedStudent.id : "student",
          studentName: certStudentName.trim() || "Student",
          studentRollNo: certStudentRoll.trim() || "23CSE001",
          title: certTitle.trim(),
          subject: certSubject.trim(),
          grade: certGrade.trim() || "Grade A+",
          issueDate: new Date().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          issuedBy: certTeacher.trim() || "Prof. Ganesh Sharma",
          issuerTitle: "Faculty Mentor & Instructor",
          credentialId: credId,
          description: certDescription.trim() || `Conferred upon ${certStudentName.trim()} for academic excellence in ${certSubject.trim()}.`,
          photoUrl: finalPhotoUrl || undefined,
          pdfUrl: finalPdfUrl || undefined,
          verified: true,
          createdAt: serverTimestamp(),
        });

        // If fulfilling student request, mark request as Approved
        if (fulfillingRequestId) {
          try {
            await updateDoc(doc(db, "certificateRequests", fulfillingRequestId), {
              status: "Approved",
              adminComment: `Certificate ${credId} issued on ${new Date().toLocaleDateString("en-US")}`,
              approvedAt: serverTimestamp(),
            });
          } catch (_) {}
        }

        // Log Activity
        await addDoc(collection(db, "activities"), {
          title: `Certificate Issued: ${certTitle.trim()} to ${certStudentName.trim()}`,
          time: "Just now",
          user: "Admin",
          type: "certificate",
          createdAt: serverTimestamp(),
        });

        setIssueModalVisible(false);
        setPhotoUrl("");
        setPhotoFileName("");
        setPdfUrl("");
        setPdfFileName("");
        setPdfFileSize("");

        Alert.alert(
          "Certificate Awarded! 🎓",
          `Official certificate "${certTitle.trim()}" has been issued to ${certStudentName.trim()}.\n${finalPdfUrl ? "✓ Official PDF document attached.\n" : ""}${finalPhotoUrl ? "✓ Verified photo attached.\n" : ""}It is directly updated in the student's app in real-time.`
        );
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to save certificate.");
    } finally {
      setSavingCert(false);
      setUploadStatus("");
    }
  };

  // Open In-App Delete Certificate Dialog
  const handleDeleteCertificate = (item: CertificateItem) => {
    setTargetCertForDelete(item);
    setDeleteModalVisible(true);
  };

  // Confirm In-App Delete Certificate
  const handleConfirmDeleteCert = async () => {
    if (!targetCertForDelete) return;
    try {
      setDeleteLoading(true);
      await deleteDoc(doc(db, "certificates", targetCertForDelete.id));
      await addDoc(collection(db, "activities"), {
        title: `Certificate Revoked: ${targetCertForDelete.title} (${targetCertForDelete.studentName})`,
        time: "Just now",
        user: "Admin",
        type: "certificate",
        createdAt: serverTimestamp(),
      });
      setCertificates((prev) => prev.filter((c) => c.id !== targetCertForDelete.id));
      setDeleteModalVisible(false);
      setTargetCertForDelete(null);
      Alert.alert("Revoked", "Certificate has been removed from Firebase.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not delete certificate.");
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleLogout = () => {
    confirmLogout("Are you sure you want to sign out?");
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.adminSidebar }]} edges={["top", "left", "right"]}>
      <View style={[styles.mainLayout, { backgroundColor: colors.adminBg }]}>
        <AdminSidebar
          activeNav="certificates"
          isDesktop={isDesktop}
          mobileMenuOpen={mobileMenuOpen}
          onCloseMobileMenu={() => setMobileMenuOpen(false)}
        />

        {/* Main Workspace */}
        <View style={[styles.contentArea, { backgroundColor: colors.adminBg }]}>
          <AdminTopBar
            title="Certificates & Honors"
            subtitle="Award official credentials with attached photo & PDF"
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
            rightActions={
              <TouchableOpacity
                style={styles.addCertHeaderBtn}
                onPress={() => {
                  if (students.length > 0) {
                    handleOpenIssueForStudent(students[0]);
                  } else {
                    setCertStudentName("Student");
                    setCertStudentRoll("23CSE001");
                    setCertTitle("Certificate of Academic Excellence");
                    setCertSubject("Computer Science & Engineering");
                    setCertGrade("Grade A+ (94%)");
                    setCertTeacher("Prof. Ganesh Sharma");
                    setPhotoUrl("");
                    setPdfUrl("");
                    setIssueModalVisible(true);
                  }
                }}
              >
                <Ionicons name="add" size={18} color="#FFFFFF" />
                <Text style={styles.addCertHeaderBtnText}>+ Award Certificate</Text>
              </TouchableOpacity>
            }
          />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* HERO BANNER */}
            <View style={styles.heroBanner}>
              <View style={styles.heroTopRow}>
                <View style={styles.heroIconCircle}>
                  <Ionicons name="ribbon" size={24} color="#FFFFFF" />
                </View>
                <View style={styles.verifiedTag}>
                  <Ionicons name="shield-checkmark" size={12} color="#10B981" />
                  <Text style={styles.verifiedTagText}>Official Credentials</Text>
                </View>
              </View>
              <Text style={styles.heroBannerTitle}>Academic Certification Center</Text>
              <Text style={styles.heroBannerSub}>
                Select connected students to award honors, attach verifiable PDF certificates & photos. Instantly updates in student profile.
              </Text>
            </View>

            {/* TAB SWITCHER */}
            <View style={[styles.tabSwitchRow, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <TouchableOpacity
                style={[styles.tabSwitchBtn, activeTab === "students" && { backgroundColor: colors.primary }]}
                onPress={() => setActiveTab("students")}
              >
                <Ionicons
                  name="people"
                  size={16}
                  color={activeTab === "students" ? "#FFFFFF" : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.tabSwitchText,
                    { color: activeTab === "students" ? "#FFFFFF" : colors.textSecondary },
                    activeTab === "students" && { fontWeight: "700" },
                  ]}
                >
                  Student List ({students.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabSwitchBtn, activeTab === "issued" && { backgroundColor: colors.primary }]}
                onPress={() => setActiveTab("issued")}
              >
                <Ionicons
                  name="ribbon"
                  size={16}
                  color={activeTab === "issued" ? "#FFFFFF" : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.tabSwitchText,
                    { color: activeTab === "issued" ? "#FFFFFF" : colors.textSecondary },
                    activeTab === "issued" && { fontWeight: "700" },
                  ]}
                >
                  Issued Certificates ({certificates.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabSwitchBtn, activeTab === "requests" && { backgroundColor: colors.primary }]}
                onPress={() => setActiveTab("requests")}
              >
                <Ionicons
                  name="mail-unread"
                  size={16}
                  color={activeTab === "requests" ? "#FFFFFF" : colors.textSecondary}
                />
                <Text
                  style={[
                    styles.tabSwitchText,
                    { color: activeTab === "requests" ? "#FFFFFF" : colors.textSecondary },
                    activeTab === "requests" && { fontWeight: "700" },
                  ]}
                >
                  Student Requests ({requests.filter((r) => r.status === "Pending").length})
                </Text>
              </TouchableOpacity>
            </View>

            {/* SEARCH BAR */}
            <View style={[styles.searchBar, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
              <TextInput
                style={[styles.searchInput, { color: colors.text }]}
                placeholder={
                  activeTab === "students"
                    ? "Search student by name, roll number, or department..."
                    : activeTab === "issued"
                    ? "Search certificates by title, student, or subject..."
                    : "Search requests by student or type..."
                }
                placeholderTextColor={colors.textMuted}
                value={search}
                onChangeText={setSearch}
              />
              {search.length > 0 && (
                <TouchableOpacity onPress={() => setSearch("")}>
                  <Ionicons name="close-circle" size={18} color={colors.textSecondary} />
                </TouchableOpacity>
              )}
            </View>

            {/* TAB 1: CONNECTED STUDENTS LIST */}
            {activeTab === "students" && (
              <View>
                {/* Department filter */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
                  {["All", "CSE", "ECE", "ME", "Civil", "IT", "BSH"].map((dept) => {
                    const isSelected = deptFilter === dept;
                    return (
                      <TouchableOpacity
                        key={dept}
                        style={[
                          styles.filterChip,
                          { borderColor: colors.border, backgroundColor: isSelected ? colors.primary : colors.card },
                        ]}
                        onPress={() => setDeptFilter(dept)}
                      >
                        <Text
                          style={[
                            styles.filterChipText,
                            { color: isSelected ? "#FFFFFF" : colors.textSecondary, fontWeight: isSelected ? "700" : "500" },
                          ]}
                        >
                          {dept}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>

                {loading ? (
                  <View style={{ paddingVertical: 40, alignItems: "center" }}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={{ marginTop: 10, color: colors.textSecondary }}>Loading students from Firebase...</Text>
                  </View>
                ) : filteredStudents.length === 0 ? (
                  <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Ionicons name="people-outline" size={48} color={colors.textMuted} />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>No Students Found</Text>
                    <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
                      {search ? "No students match your query." : "No student accounts connected in Firebase."}
                    </Text>
                  </View>
                ) : (
                  <View style={styles.studentGrid}>
                    {filteredStudents.map((student) => {
                      const studentCerts = certificates.filter(
                        (c) => c.studentId === student.id || c.studentRollNo === student.rollNo
                      );

                      return (
                        <View
                          key={student.id}
                          style={[styles.studentCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                        >
                          <View style={styles.studentCardTop}>
                            <View style={[styles.studentAvatarBox, { backgroundColor: colors.primaryLight }]}>
                              <Text style={[styles.studentAvatarText, { color: colors.primary }]}>
                                {student.fullName.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                              <Text style={[styles.studentName, { color: colors.text }]}>{student.fullName}</Text>
                              <Text style={[styles.studentRoll, { color: colors.textSecondary }]}>
                                Roll: {student.rollNo} • Sem {student.semester}
                              </Text>
                              <View style={[styles.deptPill, { backgroundColor: isDark ? "#334155" : "#EEF2FF" }]}>
                                <Text style={styles.deptPillText}>{student.department}</Text>
                              </View>
                            </View>
                          </View>

                          <View style={[styles.certCountRow, { borderTopColor: colors.border }]}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 5 }}>
                              <Ionicons name="ribbon-outline" size={15} color="#D97706" />
                              <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: "600" }}>
                                {studentCerts.length} {studentCerts.length === 1 ? "Certificate" : "Certificates"}
                              </Text>
                            </View>

                            <TouchableOpacity
                              style={[styles.awardBtn, { backgroundColor: colors.primary }]}
                              onPress={() => handleOpenIssueForStudent(student)}
                            >
                              <Ionicons name="add" size={15} color="#FFFFFF" />
                              <Text style={styles.awardBtnText}>Award Certificate</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            {/* TAB 2: ISSUED CERTIFICATES */}
            {activeTab === "issued" && (
              <View>
                {filteredCerts.length === 0 ? (
                  <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Ionicons name="ribbon-outline" size={48} color={colors.textMuted} />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>No Issued Certificates</Text>
                    <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
                      Award a certificate to a student from the "Student List" tab above.
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: 14 }}>
                    {filteredCerts.map((cert) => (
                      <View
                        key={cert.id}
                        style={[styles.issuedCertCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                      >
                        <View style={styles.issuedCertHeader}>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                              <Text style={[styles.issuedCertTitle, { color: colors.text }]}>{cert.title}</Text>
                              <View style={styles.verifiedBadge}>
                                <Ionicons name="shield-checkmark" size={12} color="#10B981" />
                                <Text style={styles.verifiedBadgeText}>Verified</Text>
                              </View>
                              {cert.photoUrl ? (
                                <View style={styles.photoAttachedPill}>
                                  <Ionicons name="image" size={11} color="#7C3AED" />
                                  <Text style={styles.photoAttachedPillText}>Photo</Text>
                                </View>
                              ) : null}
                              {cert.pdfUrl ? (
                                <View style={styles.pdfAttachedPill}>
                                  <Ionicons name="document-text" size={11} color="#DC2626" />
                                  <Text style={styles.pdfAttachedPillText}>Official PDF</Text>
                                </View>
                              ) : null}
                            </View>
                            <Text style={[styles.issuedCertSubject, { color: colors.primary }]}>{cert.subject}</Text>
                          </View>

                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <TouchableOpacity
                              style={[styles.editCertBtn, { backgroundColor: isDark ? "#312E81" : "#EEF2FF" }]}
                              onPress={() => handleOpenEditCertificate(cert)}
                            >
                              <Ionicons name="create-outline" size={14} color="#4F46E5" />
                              <Text style={[styles.editCertBtnText, { color: "#4F46E5" }]}>Edit / Update</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.revokeBtn}
                              onPress={() => handleDeleteCertificate(cert)}
                            >
                              <Ionicons name="trash-outline" size={15} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Recipient info */}
                        <View style={[styles.recipientRow, { backgroundColor: isDark ? "#1E293B" : "#F8FAFC" }]}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.recipientLabel, { color: colors.textSecondary }]}>Awarded To</Text>
                            <Text style={[styles.recipientName, { color: colors.text }]}>
                              {cert.studentName} ({cert.studentRollNo})
                            </Text>
                          </View>

                          <View style={{ alignItems: "flex-end" }}>
                            <Text style={[styles.recipientLabel, { color: colors.textSecondary }]}>Honors</Text>
                            <Text style={{ fontSize: 12, fontWeight: "700", color: "#D97706" }}>{cert.grade}</Text>
                          </View>
                        </View>

                        {/* Attachments Section */}
                        <View style={styles.attachmentsRow}>
                          {cert.photoUrl ? (
                            <TouchableOpacity
                              style={styles.photoThumbBtn}
                              onPress={() => setPreviewPhoto(cert.photoUrl || null)}
                            >
                              <Image source={{ uri: cert.photoUrl }} style={styles.photoThumbImg} />
                              <Text style={styles.attachmentLabel}>View Photo</Text>
                              <Ionicons name="expand-outline" size={12} color="#64748B" />
                            </TouchableOpacity>
                          ) : null}

                          {cert.pdfUrl ? (
                            <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                              <TouchableOpacity
                                style={styles.pdfBadgeBtn}
                                onPress={() => {
                                  if (cert.pdfUrl) {
                                    Linking.openURL(cert.pdfUrl).catch(() => {
                                      Alert.alert("PDF Document", `Link: ${cert.pdfUrl}`);
                                    });
                                  }
                                }}
                              >
                                <Ionicons name="document-text" size={15} color="#DC2626" />
                                <Text style={styles.pdfBadgeText}>Open PDF</Text>
                              </TouchableOpacity>

                              <TouchableOpacity
                                style={styles.pdfShareActionBtn}
                                onPress={() => shareOrDownloadPdf(cert.pdfUrl!, cert.title)}
                              >
                                <Ionicons name="share-outline" size={14} color="#4338CA" />
                                <Text style={styles.pdfShareActionText}>Share / Print</Text>
                              </TouchableOpacity>
                            </View>
                          ) : null}

                          {!cert.photoUrl && !cert.pdfUrl ? (
                            <TouchableOpacity
                              style={[styles.addAttachmentPromptBtn, { borderColor: isDark ? "#334155" : "#CBD5E1" }]}
                              onPress={() => handleOpenEditCertificate(cert)}
                            >
                              <Ionicons name="add-circle-outline" size={13} color="#4F46E5" />
                              <Text style={{ fontSize: 11, color: "#4F46E5", fontWeight: "600" }}>Attach Photo or PDF</Text>
                            </TouchableOpacity>
                          ) : null}

                          <View style={{ marginLeft: "auto", alignItems: "flex-end" }}>
                            <Text style={{ fontSize: 11, color: colors.textSecondary }}>ID: {cert.credentialId}</Text>
                            <Text style={{ fontSize: 11, color: colors.textMuted }}>By {cert.issuedBy}</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            {/* TAB 3: STUDENT REQUESTS */}
            {activeTab === "requests" && (
              <View>
                {requests.length === 0 ? (
                  <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Ionicons name="mail-outline" size={48} color={colors.textMuted} />
                    <Text style={[styles.emptyTitle, { color: colors.text }]}>No Certificate Requests</Text>
                    <Text style={{ fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
                      Student requests for Bonafide or Completion certificates will appear here.
                    </Text>
                  </View>
                ) : (
                  <View style={{ gap: 12 }}>
                    {requests.map((req) => (
                      <View
                        key={req.id}
                        style={[styles.requestCard, { backgroundColor: colors.card, borderColor: colors.border }]}
                      >
                        <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.requestType, { color: colors.text }]}>{req.certificateType}</Text>
                            <Text style={[styles.requestStudent, { color: colors.textSecondary }]}>
                              Requested by {req.studentName} ({req.studentEmail})
                            </Text>
                            <Text style={[styles.requestPurpose, { color: colors.text }]}>
                              Purpose: "{req.purpose}"
                            </Text>
                          </View>

                          <View
                            style={[
                              styles.reqStatusBadge,
                              req.status === "Approved"
                                ? { backgroundColor: "#DCFCE7" }
                                : { backgroundColor: "#FEF3C7" },
                            ]}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                fontWeight: "700",
                                color: req.status === "Approved" ? "#16A34A" : "#D97706",
                              }}
                            >
                              {req.status}
                            </Text>
                          </View>
                        </View>

                        {req.status === "Pending" && (
                          <View style={[styles.reqActionRow, { borderTopColor: colors.border }]}>
                            <TouchableOpacity
                              style={[styles.approveBtn, { backgroundColor: colors.primary }]}
                              onPress={() => handleApproveRequest(req)}
                            >
                              <Ionicons name="ribbon" size={15} color="#FFFFFF" />
                              <Text style={styles.approveBtnText}>Approve & Issue Certificate</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>

      {/* AWARD STUDENT CERTIFICATE MODAL (MATCHING SCREENSHOT) */}
      <Modal
        visible={issueModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIssueModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setIssueModalVisible(false)}>
          <Pressable
            style={[styles.issueModalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <View style={styles.issueModalHeader}>
              <View>
                <Text style={[styles.issueModalTitle, { color: colors.text }]}>
                  {editingCert ? "Update Issued Certificate" : "Award Student Certificate"}
                </Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary }}>
                  {editingCert
                    ? "Updated details, photos, and PDFs sync directly to student in real time"
                    : "Saved to student profile and Firebase in real time"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIssueModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
              {/* Certificate Title */}
              <Text style={[styles.formLabel, { color: colors.text }]}>Certificate Title *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={certTitle}
                onChangeText={setCertTitle}
                placeholder="e.g. Certificate of Academic Excellence"
                placeholderTextColor={colors.textMuted}
              />

              {/* Subject / Course Domain */}
              <Text style={[styles.formLabel, { color: colors.text, marginTop: 12 }]}>Subject / Course Domain *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={certSubject}
                onChangeText={setCertSubject}
                placeholder="e.g. Data Structures & Algorithms Mastery"
                placeholderTextColor={colors.textMuted}
              />

              {/* Student Name */}
              <Text style={[styles.formLabel, { color: colors.text, marginTop: 12 }]}>Student Name</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={certStudentName}
                onChangeText={setCertStudentName}
                placeholder="Student Full Name"
                placeholderTextColor={colors.textMuted}
              />

              {/* Student Roll Number */}
              <Text style={[styles.formLabel, { color: colors.text, marginTop: 12 }]}>Student Roll Number</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={certStudentRoll}
                onChangeText={setCertStudentRoll}
                placeholder="e.g. 23CSE001"
                placeholderTextColor={colors.textMuted}
              />

              {/* Grade / Honors */}
              <Text style={[styles.formLabel, { color: colors.text, marginTop: 12 }]}>Grade / Honors</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={certGrade}
                onChangeText={setCertGrade}
                placeholder="Grade A+ (94%)"
                placeholderTextColor={colors.textMuted}
              />

              {/* Issuing Teacher Name */}
              <Text style={[styles.formLabel, { color: colors.text, marginTop: 12 }]}>Issuing Teacher Name</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.surface, borderColor: colors.border, color: colors.text }]}
                value={certTeacher}
                onChangeText={setCertTeacher}
                placeholder="Prof. Ganesh Sharma"
                placeholderTextColor={colors.textMuted}
              />

              {/* PHOTO ATTACHMENT SYSTEM */}
              <View style={[styles.attachmentBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={[styles.attachmentTitle, { color: colors.text }]}>
                    Attach Certificate Photo / Badge (Optional)
                  </Text>
                  {photoUrl ? (
                    <View style={styles.attachedStatusBadge}>
                      <Ionicons name="checkmark-circle" size={13} color="#10B981" />
                      <Text style={styles.attachedStatusText}>Photo Attached</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2, marginBottom: 8 }}>
                  Include student portrait, academic crest, or certificate photo preview.
                </Text>

                {/* Photo action buttons & presets */}
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  <TouchableOpacity style={styles.pickerBtn} onPress={handlePickPhoto}>
                    <Ionicons name="image-outline" size={16} color="#5D3EBC" />
                    <Text style={styles.pickerBtnText}>Gallery</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.pickerBtn} onPress={handleTakePhoto}>
                    <Ionicons name="camera-outline" size={16} color="#5D3EBC" />
                    <Text style={styles.pickerBtnText}>Camera</Text>
                  </TouchableOpacity>
                  {PRESET_PHOTOS.map((preset) => (
                    <TouchableOpacity
                      key={preset.id}
                      style={[styles.presetChip, photoUrl === preset.url && styles.presetChipActive]}
                      onPress={() => handleSelectPresetPhoto(preset)}
                    >
                      <Ionicons
                        name={preset.icon as any}
                        size={13}
                        color={photoUrl === preset.url ? "#5D3EBC" : "#64748B"}
                      />
                      <Text style={[styles.presetChipText, photoUrl === preset.url && styles.presetChipTextActive]}>
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {photoUrl ? (
                  <View style={[styles.attachedPhotoCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Image source={{ uri: photoUrl }} style={styles.photoAttachedPreview} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.attachedFileName, { color: colors.text }]} numberOfLines={1}>
                        {photoFileName || "Attached Photo"}
                      </Text>
                      <Text style={{ fontSize: 11, color: "#10B981", fontWeight: "600" }}>✓ Ready for Credential</Text>
                      <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
                        <TouchableOpacity onPress={() => setPreviewPhoto(photoUrl)}>
                          <Text style={{ fontSize: 11, color: "#5D3EBC", fontWeight: "700" }}>View Fullscreen</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            setPhotoUrl("");
                            setPhotoFileName("");
                          }}
                        >
                          <Text style={{ fontSize: 11, color: "#EF4444", fontWeight: "600" }}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ) : (
                  <TextInput
                    style={[
                      styles.formInput,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        color: colors.text,
                        marginTop: 10,
                        fontSize: 11,
                      },
                    ]}
                    value={photoUrl}
                    onChangeText={(val) => {
                      setPhotoUrl(val);
                      setPhotoFileName("Custom Photo URL");
                    }}
                    placeholder="Or paste direct image URL (https://...)"
                    placeholderTextColor={colors.textMuted}
                  />
                )}
              </View>

              {/* PDF DOCUMENT ATTACHMENT SYSTEM */}
              <View style={[styles.attachmentBox, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={[styles.attachmentTitle, { color: colors.text }]}>
                    Attach Official PDF Document (Optional)
                  </Text>
                  {pdfUrl ? (
                    <View style={styles.attachedStatusBadge}>
                      <Ionicons name="checkmark-circle" size={13} color="#10B981" />
                      <Text style={styles.attachedStatusText}>PDF Ready</Text>
                    </View>
                  ) : null}
                </View>

                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2, marginBottom: 8 }}>
                  Pick a PDF from your device or auto-generate a print-ready university certificate PDF with one click.
                </Text>

                {/* PDF Action Buttons */}
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
                  <TouchableOpacity style={styles.pdfPickerBtn} onPress={handlePickPdf}>
                    <Ionicons name="folder-open-outline" size={16} color="#DC2626" />
                    <Text style={styles.pdfPickerBtnText}>Browse Device PDF</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.pdfGenerateBtn, isGeneratingPdf && { opacity: 0.7 }]}
                    onPress={handleGeneratePdf}
                    disabled={isGeneratingPdf}
                  >
                    {isGeneratingPdf ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="sparkles" size={15} color="#FFFFFF" />
                    )}
                    <Text style={styles.pdfGenerateBtnText}>
                      {isGeneratingPdf ? "Generating..." : "Auto-Generate PDF"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.samplePdfBtn}
                    onPress={() => {
                      setPdfUrl("https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf");
                      setPdfFileName("Verified_Academic_Template.pdf");
                      setPdfFileSize("Sample PDF Template");
                    }}
                  >
                    <Ionicons name="document-attach-outline" size={14} color="#D97706" />
                    <Text style={styles.samplePdfText}>Academic Template</Text>
                  </TouchableOpacity>
                </View>

                {/* Attached PDF Preview Card */}
                {pdfUrl ? (
                  <View style={[styles.attachedPdfCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <View style={styles.pdfIconCircle}>
                      <Ionicons name="document-text" size={22} color="#DC2626" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.attachedFileName, { color: colors.text }]} numberOfLines={1}>
                        {pdfFileName || "Official_Certificate.pdf"}
                      </Text>
                      <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 1 }}>
                        {pdfFileSize || "Print-Ready PDF"} • <Text style={{ color: "#10B981", fontWeight: "700" }}>✓ Ready</Text>
                      </Text>
                      <View style={{ flexDirection: "row", gap: 12, marginTop: 4 }}>
                        <TouchableOpacity onPress={handleTestSharePdf}>
                          <Text style={{ fontSize: 11, color: "#DC2626", fontWeight: "700" }}>Preview / Open</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={handleTestSharePdf}>
                          <Text style={{ fontSize: 11, color: "#4338CA", fontWeight: "700" }}>Share / Print</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => {
                            setPdfUrl("");
                            setPdfFileName("");
                            setPdfFileSize("");
                          }}
                        >
                          <Text style={{ fontSize: 11, color: "#EF4444", fontWeight: "600" }}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ) : (
                  <TextInput
                    style={[
                      styles.formInput,
                      {
                        backgroundColor: colors.card,
                        borderColor: colors.border,
                        color: colors.text,
                        marginTop: 10,
                        fontSize: 11,
                      },
                    ]}
                    value={pdfUrl}
                    onChangeText={(val) => {
                      setPdfUrl(val);
                      setPdfFileName("External PDF Document");
                      setPdfFileSize("Direct URL");
                    }}
                    placeholder="Or enter PDF document link (https://...)"
                    placeholderTextColor={colors.textMuted}
                  />
                )}
              </View>
            </ScrollView>

            {/* Modal Buttons (Matching Screenshot) */}
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.surface }]}
                onPress={() => setIssueModalVisible(false)}
                disabled={savingCert}
              >
                <Text style={{ color: colors.textSecondary, fontWeight: "600" }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveCertificate}
                disabled={savingCert || isGeneratingPdf}
              >
                {savingCert ? (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    <ActivityIndicator size="small" color="#FFFFFF" />
                    <Text style={{ color: "#FFFFFF", fontWeight: "700", fontSize: 12 }}>
                      {uploadStatus || (editingCert ? "Updating Certificate..." : "Issuing Certificate...")}
                    </Text>
                  </View>
                ) : (
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name={editingCert ? "checkmark-circle" : "ribbon"} size={16} color="#FFFFFF" />
                    <Text style={{ color: "#FFFFFF", fontWeight: "700" }}>
                      {editingCert ? "Update & Sync to Student" : "Issue Certificate"}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* FULL PHOTO PREVIEW MODAL */}
      <Modal visible={Boolean(previewPhoto)} transparent animationType="fade" onRequestClose={() => setPreviewPhoto(null)}>
        <View style={styles.photoPreviewOverlay}>
          <TouchableOpacity style={styles.closePhotoBtn} onPress={() => setPreviewPhoto(null)}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </TouchableOpacity>
          {previewPhoto && (
            <Image source={{ uri: previewPhoto }} style={styles.fullPhotoImg} resizeMode="contain" />
          )}
        </View>
      </Modal>

      {/* IN-APP DELETE CERTIFICATE CONFIRMATION MODAL */}
      <Modal visible={deleteModalVisible} transparent animationType="fade" onRequestClose={() => setDeleteModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.confirmModalCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
            <View style={[styles.confirmIconCircle, { backgroundColor: isDark ? "rgba(239,68,68,0.2)" : "#FEE2E2" }]}>
              <Ionicons name="trash" size={28} color="#EF4444" />
            </View>

            <Text style={[styles.confirmModalTitle, { color: colors.adminText }]}>
              Revoke & Delete Certificate
            </Text>

            <Text style={[styles.confirmModalMessage, { color: colors.adminTextSecondary }]}>
              Are you sure you want to revoke and delete "{targetCertForDelete?.title}" for {targetCertForDelete?.studentName}? This credential and any attached PDF/photo will be permanently removed from student view.
            </Text>

            <View style={styles.confirmModalActionsRow}>
              <TouchableOpacity
                style={[styles.confirmCancelBtn, { backgroundColor: colors.adminSurfaceAlt }]}
                onPress={() => {
                  setDeleteModalVisible(false);
                  setTargetCertForDelete(null);
                }}
                disabled={deleteLoading}
              >
                <Text style={[styles.confirmCancelBtnText, { color: colors.adminTextSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.confirmActionBtn, { backgroundColor: "#DC2626" }]}
                onPress={handleConfirmDeleteCert}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.confirmActionBtnText}>Revoke Certificate</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#2A174E",
  },
  mainLayout: {
    flex: 1,
    flexDirection: "row",
  },
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
    marginTop: 6,
  },
  sidebarLogoutText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.7)",
    marginLeft: 12,
    fontWeight: "600",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  contentArea: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  topBarLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuButton: {
    padding: 6,
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  topBarSub: {
    fontSize: 12,
    marginTop: 1,
  },
  topBarRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  addCertHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#5D3EBC",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addCertHeaderBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  adminAvatarCircle: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  adminBadgeText: {
    fontSize: 13,
    fontWeight: "600",
  },
  scrollContent: {
    padding: 20,
  },
  heroBanner: {
    backgroundColor: "#5D3EBC",
    borderRadius: 18,
    padding: 22,
    marginBottom: 16,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  heroIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  verifiedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  verifiedTagText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#10B981",
  },
  heroBannerTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  heroBannerSub: {
    fontSize: 13,
    color: "#E9D5FF",
    marginTop: 4,
    lineHeight: 18,
  },
  tabSwitchRow: {
    flexDirection: "row",
    padding: 6,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  tabSwitchBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 9,
    borderRadius: 10,
    gap: 6,
  },
  tabSwitchText: {
    fontSize: 12,
    fontWeight: "600",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
  },
  filterScroll: {
    gap: 8,
    paddingBottom: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  filterChipText: {
    fontSize: 12,
  },
  studentGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
  },
  studentCard: {
    flex: 1,
    minWidth: 290,
    maxWidth: 420,
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  studentCardTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  studentAvatarBox: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  studentAvatarText: {
    fontSize: 18,
    fontWeight: "800",
  },
  studentName: {
    fontSize: 15,
    fontWeight: "700",
  },
  studentRoll: {
    fontSize: 12,
    marginTop: 1,
  },
  deptPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  deptPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#5D3EBC",
  },
  certCountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 10,
  },
  awardBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  awardBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  issuedCertCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  issuedCertHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  issuedCertTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  issuedCertSubject: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 2,
  },
  verifiedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  verifiedBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#16A34A",
  },
  photoAttachedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  photoAttachedPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#7C3AED",
  },
  pdfAttachedPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  pdfAttachedPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#DC2626",
  },
  revokeBtn: {
    padding: 6,
    backgroundColor: "#FEE2E2",
    borderRadius: 8,
  },
  editCertBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  editCertBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },
  addAttachmentPromptBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1,
    borderStyle: "dashed",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  recipientRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    marginVertical: 10,
  },
  recipientLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  recipientName: {
    fontSize: 13,
    fontWeight: "700",
    marginTop: 1,
  },
  attachmentsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flexWrap: "wrap",
  },
  photoThumbBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F1F5F9",
    padding: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  photoThumbImg: {
    width: 28,
    height: 28,
    borderRadius: 4,
  },
  attachmentLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
    paddingRight: 6,
  },
  pdfBadgeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
  },
  pdfBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
  },
  pdfShareActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  pdfShareActionText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4338CA",
  },
  requestCard: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 16,
  },
  requestType: {
    fontSize: 15,
    fontWeight: "700",
  },
  requestStudent: {
    fontSize: 12,
    marginTop: 2,
  },
  requestPurpose: {
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 4,
  },
  reqStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  reqActionRow: {
    borderTopWidth: 1,
    marginTop: 12,
    paddingTop: 10,
    flexDirection: "row",
    justifyContent: "flex-end",
  },
  approveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  approveBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  emptyCard: {
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 16,
    borderWidth: 1,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    marginTop: 10,
  },

  /* MODAL STYLES (MATCHING SCREENSHOT) */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.55)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  issueModalCard: {
    width: "100%",
    maxWidth: 500,
    borderRadius: 20,
    borderWidth: 1,
    padding: 22,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  issueModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  issueModalTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  formLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  formInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  attachmentBox: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 14,
  },
  attachmentTitle: {
    fontSize: 12,
    fontWeight: "700",
  },
  pickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    backgroundColor: "#FFFFFF",
  },
  pickerBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#5D3EBC",
  },
  photoAttachedPreview: {
    width: 60,
    height: 45,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#10B981",
  },
  attachedStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  attachedStatusText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#16A34A",
  },
  presetChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
  },
  presetChipActive: {
    borderColor: "#5D3EBC",
    backgroundColor: "#EDE9FE",
  },
  presetChipText: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  presetChipTextActive: {
    color: "#5D3EBC",
    fontWeight: "700",
  },
  attachedPhotoCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
  },
  attachedFileName: {
    fontSize: 12,
    fontWeight: "700",
  },
  pdfPickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#FCA5A5",
    backgroundColor: "#FEF2F2",
  },
  pdfPickerBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#DC2626",
  },
  pdfGenerateBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#5D3EBC",
  },
  pdfGenerateBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  attachedPdfCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
  },
  pdfIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 8,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  samplePdfBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  samplePdfText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#B45309",
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 18,
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  modalSaveBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },

  /* Full Photo Preview */
  photoPreviewOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  closePhotoBtn: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  fullPhotoImg: {
    width: "90%",
    height: "80%",
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
});
