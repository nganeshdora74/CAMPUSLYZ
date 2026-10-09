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
import {
  CertificateData,
  generateCertificatePdf,
  pickPdfDocument,
  shareOrDownloadPdf,
  uploadCertificateFile,
} from "../../services/certificatePdfService";
import { sendStudentNotification } from "../../services/notificationService";
import NotificationBellModal from "../../components/NotificationBellModal";

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
  studentEmail?: string;
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
  // Notice Manager & Admin Supervision Fields
  issuedByRole?: "admin" | "notice_manager" | string;
  canNoticeManagerUpdate?: boolean;
  adminActionStatus?: string;
  adminRemarks?: string;
}

export interface CertRequestItem {
  id: string;
  studentId: string;
  studentName: string;
  studentRollNo?: string;
  department?: string;
  semester?: string | number;
  studentEmail: string;
  certificateType: string;
  purpose: string;
  status: "Pending" | "Approved" | "Rejected" | string;
  adminComment?: string;
  issuedCertificateId?: string;
  credentialId?: string;
  pdfUrl?: string;
  photoUrl?: string;
  approvedAt?: any;
  rejectedAt?: any;
  createdAt?: any;
}

export default function NoticeManagerCertificatesScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;

  const [activeTab, setActiveTab] = useState<"students" | "issued" | "requests">("students");

  // Data states from Firebase
  const [students, setStudents] = useState<StudentItem[]>([]);
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [requests, setRequests] = useState<CertRequestItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("All");
  const [requestStatusFilter, setRequestStatusFilter] = useState<"All" | "Pending" | "Approved" | "Rejected">("All");

  // Issue / Edit Certificate Modal States
  const [issueModalVisible, setIssueModalVisible] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<StudentItem | null>(null);
  const [editingCert, setEditingCert] = useState<CertificateItem | null>(null);
  const [certTitle, setCertTitle] = useState("");
  const [certSubject, setCertSubject] = useState("");
  const [certStudentName, setCertStudentName] = useState("");
  const [certStudentRoll, setCertStudentRoll] = useState("");
  const [certDepartment, setCertDepartment] = useState("");
  const [certGrade, setCertGrade] = useState("Grade A+ (94%)");
  const [certTeacher, setCertTeacher] = useState("Anita Verma (Notice Manager)");
  const [certDescription, setCertDescription] = useState("");
  const [photoUrl, setPhotoUrl] = useState("");
  const [photoFileName, setPhotoFileName] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [pdfFileName, setPdfFileName] = useState("");
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const [fulfillingRequestId, setFulfillingRequestId] = useState<string | null>(null);
  const [savingCert, setSavingCert] = useState(false);

  // Decline Modal
  const [declineModalVisible, setDeclineModalVisible] = useState(false);
  const [targetRequestForDecline, setTargetRequestForDecline] = useState<CertRequestItem | null>(null);
  const [declineReason, setDeclineReason] = useState("");
  const [declineSubmitting, setDeclineSubmitting] = useState(false);

  // Preview Photo Modal
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  // Delete Modal
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [targetCertForDelete, setTargetCertForDelete] = useState<CertificateItem | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // 1. Realtime Listeners: Firebase Users (Students)
  useEffect(() => {
    const usersCol = collection(db, "users");
    const unsubscribe = onSnapshot(
      usersCol,
      (snapshot) => {
        const loaded: StudentItem[] = [];
        snapshot.docs.forEach((docSnap) => {
          const d = docSnap.data();
          const role = (d.role || "").toLowerCase();
          if (role && role !== "student") return;

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
        console.warn("Notice Manager students listener error:", err);
        setStudents([]);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  // 2. Realtime Listeners: Firebase Certificates
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
            studentEmail: data.studentEmail || "",
            title: data.title || "Academic Certificate",
            subject: data.subject || "Course Mastery",
            grade: data.grade || "Grade A+",
            issueDate: data.issueDate || "2026",
            issuedBy: data.issuedBy || "Notice Manager",
            issuerTitle: data.issuerTitle || "Notice & Communications Head",
            credentialId: data.credentialId || `CMP-${d.id.slice(0, 8).toUpperCase()}`,
            description: data.description || "",
            photoUrl: data.photoUrl || "",
            pdfUrl: data.pdfUrl || "",
            verified: data.verified !== false,
            createdAt: data.createdAt,
            issuedByRole: data.issuedByRole || (data.issuedBy?.includes("Admin") ? "admin" : "notice_manager"),
            canNoticeManagerUpdate: data.canNoticeManagerUpdate !== false,
            adminActionStatus: data.adminActionStatus || "Normal",
            adminRemarks: data.adminRemarks || "",
          };
        });
        setCertificates(loaded);
      },
      (err) => {
        console.warn("Notice Manager certificates listener error:", err);
      }
    );

    return () => unsubscribe();
  }, []);

  // 3. Realtime Listeners: Firebase Certificate Requests
  useEffect(() => {
    const reqCol = collection(db, "certificateRequests");
    const unsubscribe = onSnapshot(
      reqCol,
      (snapshot) => {
        const loaded: CertRequestItem[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            studentId: data.studentId || "",
            studentName: data.studentName || "Student",
            studentRollNo: data.studentRollNo || "",
            department: data.department || "CSE",
            semester: data.semester || "4",
            studentEmail: data.studentEmail || "",
            certificateType: data.certificateType || "Merit Certificate",
            purpose: data.purpose || "Academic honor verification",
            status: data.status || "Pending",
            adminComment: data.adminComment || "",
            issuedCertificateId: data.issuedCertificateId,
            credentialId: data.credentialId,
            pdfUrl: data.pdfUrl,
            photoUrl: data.photoUrl,
            approvedAt: data.approvedAt,
            rejectedAt: data.rejectedAt,
            createdAt: data.createdAt,
          };
        });
        setRequests(loaded);
      },
      (err) => {
        console.warn("Certificate requests listener error:", err);
      }
    );

    return () => unsubscribe();
  }, []);

  // Filtered Students
  const filteredStudents = useMemo(() => {
    const q = search.trim().toLowerCase();
    return students.filter((s) => {
      const matchSearch =
        !q ||
        s.fullName.toLowerCase().includes(q) ||
        s.rollNo.toLowerCase().includes(q) ||
        s.department.toLowerCase().includes(q);
      const matchDept = deptFilter === "All" || s.department.toUpperCase() === deptFilter.toUpperCase();
      return matchSearch && matchDept;
    });
  }, [students, search, deptFilter]);

  // Filtered Issued Certificates
  const filteredCertificates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return certificates.filter((c) => {
      const matchSearch =
        !q ||
        c.title.toLowerCase().includes(q) ||
        c.studentName.toLowerCase().includes(q) ||
        c.studentRollNo.toLowerCase().includes(q) ||
        c.subject.toLowerCase().includes(q);
      return matchSearch;
    });
  }, [certificates, search]);

  // Filtered Requests
  const filteredRequests = useMemo(() => {
    const q = search.trim().toLowerCase();
    return requests.filter((r) => {
      const matchSearch =
        !q ||
        r.studentName.toLowerCase().includes(q) ||
        (r.studentRollNo && r.studentRollNo.toLowerCase().includes(q)) ||
        r.certificateType.toLowerCase().includes(q);
      const matchStatus = requestStatusFilter === "All" || r.status === requestStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [requests, search, requestStatusFilter]);

  const pendingRequestsCount = useMemo(() => {
    return requests.filter((r) => r.status === "Pending").length;
  }, [requests]);

  // Open Issue Modal for a Student
  const handleOpenAwardModal = (student: StudentItem) => {
    setSelectedStudent(student);
    setEditingCert(null);
    setFulfillingRequestId(null);
    setCertTitle("Academic Excellence Award");
    setCertSubject("Outstanding Performance");
    setCertStudentName(student.fullName);
    setCertStudentRoll(student.rollNo);
    setCertDepartment(student.department);
    setCertGrade("Grade A+ (95%)");
    setCertTeacher("Anita Verma (Notice Manager)");
    setCertDescription(
      `Awarded to ${student.fullName} for exemplary academic performance and meritorious dedication.`
    );
    setPhotoUrl(PRESET_PHOTOS[0].url);
    setPhotoFileName(PRESET_PHOTOS[0].label);
    setPdfUrl("");
    setPdfFileName("");
    setIssueModalVisible(true);
  };

  // Open Edit Modal for an Issued Certificate
  const handleOpenEditModal = (cert: CertificateItem) => {
    // Check if locked by Admin
    if (cert.canNoticeManagerUpdate === false) {
      Alert.alert(
        "Certificate Locked by Admin",
        "This certificate has been locked by the Administrator. Notice Manager cannot modify it. Please contact Admin if changes are required."
      );
      return;
    }

    setEditingCert(cert);
    setSelectedStudent(null);
    setFulfillingRequestId(null);
    setCertTitle(cert.title);
    setCertSubject(cert.subject);
    setCertStudentName(cert.studentName);
    setCertStudentRoll(cert.studentRollNo);
    setCertDepartment("CSE");
    setCertGrade(cert.grade);
    setCertTeacher(cert.issuedBy);
    setCertDescription(cert.description || "");
    setPhotoUrl(cert.photoUrl || "");
    setPhotoFileName(cert.photoUrl ? "Attached Badge" : "");
    setPdfUrl(cert.pdfUrl || "");
    setPdfFileName(cert.pdfUrl ? "Certificate.pdf" : "");
    setIssueModalVisible(true);
  };

  // Pick Custom Photo
  const handlePickPhoto = async () => {
    try {
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });

      if (!res.canceled && res.assets && res.assets[0]?.uri) {
        setUploadStatus("Uploading Badge...");
        const remoteUrl = await uploadCertificateFile(
          res.assets[0].uri,
          `badge-${Date.now()}.jpg`,
          "image/jpeg"
        );
        setPhotoUrl(remoteUrl);
        setPhotoFileName("Custom Badge Uploaded");
        setUploadStatus("");
      }
    } catch (e: any) {
      setUploadStatus("");
      Alert.alert("Error", e?.message || "Failed to pick badge image.");
    }
  };

  // Pick PDF Document
  const handlePickPdf = async () => {
    try {
      const file = await pickPdfDocument();
      if (file && file.uri) {
        setUploadStatus("Uploading PDF...");
        const remoteUrl = await uploadCertificateFile(
          file.uri,
          file.name || `cert-${Date.now()}.pdf`,
          "application/pdf"
        );
        setPdfUrl(remoteUrl);
        setPdfFileName(file.name || "certificate.pdf");
        setUploadStatus("");
      }
    } catch (e: any) {
      setUploadStatus("");
      Alert.alert("Error", e?.message || "Failed to upload PDF.");
    }
  };

  // Auto-Generate PDF Certificate
  const handleGeneratePdf = async () => {
    if (!certStudentName.trim() || !certTitle.trim()) {
      Alert.alert("Required", "Please provide certificate title and student name first.");
      return;
    }

    try {
      setIsGeneratingPdf(true);
      const credId = editingCert?.credentialId || `CMP-${Date.now().toString().slice(-8)}`;
      const certData: CertificateData = {
        studentName: certStudentName.trim(),
        studentRollNo: certStudentRoll.trim() || "23CSE001",
        department: `Department of ${certDepartment || "Academics"}`,
        title: certTitle.trim(),
        subject: certSubject.trim() || "Academic Honors",
        grade: certGrade.trim(),
        issuedBy: certTeacher.trim(),
        issuerTitle: "Notice & Communications Authority",
        issueDate: new Date().toLocaleDateString("en-IN", {
          day: "numeric",
          month: "long",
          year: "numeric",
        }),
        credentialId: credId,
        description: certDescription.trim(),
        photoUrl: photoUrl || PRESET_PHOTOS[0].url,
      };

      const generated = await generateCertificatePdf(certData);
      setPdfUrl(generated.uri);
      setPdfFileName((generated as any).fileName || generated.name || "certificate.pdf");
      Alert.alert("PDF Generated", "Official verifiable PDF certificate generated successfully!");
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Could not generate PDF certificate.");
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Save Certificate into Firebase Firestore
  const handleSaveCertificate = async () => {
    if (!certTitle.trim() || !certStudentName.trim()) {
      Alert.alert("Required", "Please provide certificate title and student name.");
      return;
    }

    try {
      setSavingCert(true);
      const credId = editingCert?.credentialId || `CMP-${Date.now().toString().slice(-8)}`;
      const currentDateStr = new Date().toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      if (editingCert) {
        // Update existing certificate
        const certRef = doc(db, "certificates", editingCert.id);
        await updateDoc(certRef, {
          title: certTitle.trim(),
          subject: certSubject.trim(),
          grade: certGrade.trim(),
          description: certDescription.trim(),
          issuedBy: certTeacher.trim(),
          photoUrl: photoUrl || "",
          pdfUrl: pdfUrl || "",
          updatedAt: serverTimestamp(),
          lastUpdatedBy: "Notice Manager",
        });

        Alert.alert("Certificate Updated", "Certificate details updated in Firebase successfully.");
      } else {
        // Create new certificate
        const newCertData = {
          studentId: selectedStudent?.id || "",
          studentName: certStudentName.trim(),
          studentRollNo: certStudentRoll.trim(),
          studentEmail: selectedStudent?.email || "",
          title: certTitle.trim(),
          subject: certSubject.trim(),
          grade: certGrade.trim(),
          issueDate: currentDateStr,
          issuedBy: certTeacher.trim(),
          issuerTitle: "Notice & Communications Authority",
          credentialId: credId,
          description: certDescription.trim(),
          photoUrl: photoUrl || PRESET_PHOTOS[0].url,
          pdfUrl: pdfUrl || "",
          verified: true,
          issuedByRole: "notice_manager",
          canNoticeManagerUpdate: true,
          adminActionStatus: "Normal",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        const certDocRef = await addDoc(collection(db, "certificates"), newCertData);

        // Update student honors in Firebase users collection
        if (selectedStudent?.id) {
          try {
            const studentRef = doc(db, "users", selectedStudent.id);
            await updateDoc(studentRef, {
              honorsCount: (certificates.filter((c) => c.studentId === selectedStudent.id).length || 0) + 1,
              latestCertificate: certTitle.trim(),
              updatedAt: serverTimestamp(),
            });
          } catch (_) {}
        }

        // Fulfill student request if issuing from a request
        if (fulfillingRequestId) {
          try {
            const reqRef = doc(db, "certificateRequests", fulfillingRequestId);
            await updateDoc(reqRef, {
              status: "Approved",
              issuedCertificateId: certDocRef.id,
              credentialId: credId,
              pdfUrl: pdfUrl || "",
              approvedAt: serverTimestamp(),
              approvedBy: "Notice Manager",
            });
          } catch (_) {}
        }

        // Notify student in Firebase
        if (selectedStudent?.id) {
          await sendStudentNotification(
            selectedStudent.id,
            "New Certificate Awarded! 📜",
            `You have been awarded "${certTitle}" by Notice Manager. View in your profile.`,
            "certificate"
          );
        }

        Alert.alert(
          "Certificate Issued",
          `"${certTitle}" has been issued to ${certStudentName} and synced across Campusly!`
        );
      }

      setIssueModalVisible(false);
      setEditingCert(null);
      setSelectedStudent(null);
      setFulfillingRequestId(null);
    } catch (err: any) {
      console.warn("Save certificate error:", err);
      Alert.alert("Error", err?.message || "Failed to save certificate in Firebase.");
    } finally {
      setSavingCert(false);
    }
  };

  // Delete Certificate
  const handleDeleteCertificate = async () => {
    if (!targetCertForDelete) return;

    if (targetCertForDelete.canNoticeManagerUpdate === false) {
      Alert.alert("Action Denied", "This certificate is locked by Admin. Notice Manager cannot delete it.");
      setDeleteModalVisible(false);
      return;
    }

    try {
      setDeleteLoading(true);
      await deleteDoc(doc(db, "certificates", targetCertForDelete.id));
      Alert.alert("Deleted", "Certificate removed from Firebase.");
      setDeleteModalVisible(false);
      setTargetCertForDelete(null);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to delete certificate.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Decline Request
  const handleConfirmDecline = async () => {
    if (!targetRequestForDecline) return;
    try {
      setDeclineSubmitting(true);
      const reqRef = doc(db, "certificateRequests", targetRequestForDecline.id);
      await updateDoc(reqRef, {
        status: "Rejected",
        adminComment: declineReason.trim() || "Declined by Notice Manager",
        rejectedAt: serverTimestamp(),
        rejectedBy: "Notice Manager",
      });

      if (targetRequestForDecline.studentId) {
        await sendStudentNotification(
          targetRequestForDecline.studentId,
          "Certificate Request Update",
          `Your request for "${targetRequestForDecline.certificateType}" was declined: ${
            declineReason.trim() || "Please contact Notice Manager."
          }`,
          "general"
        );
      }

      setDeclineModalVisible(false);
      setTargetRequestForDecline(null);
      setDeclineReason("");
      Alert.alert("Request Declined", "Student request has been updated.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to decline request.");
    } finally {
      setDeclineSubmitting(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* ================= TOP HEADER ================= */}
      <View style={styles.topHeader}>
        <View style={styles.topHeaderLeft}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => router.push("/notice-manager")}
          >
            <Ionicons name="arrow-back" size={20} color="#0F172A" />
          </TouchableOpacity>
          <View>
            <Text style={styles.pageTitle}>Certificates & Honors</Text>
            <Text style={styles.pageSubtitle}>
              Award official credentials with attached photo & PDF
            </Text>
          </View>
        </View>

        <View style={styles.topHeaderRight}>
          <TouchableOpacity
            style={styles.awardHeaderBtn}
            onPress={() => {
              if (students.length > 0) {
                handleOpenAwardModal(students[0]);
              } else {
                Alert.alert("Notice", "No students loaded yet.");
              }
            }}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.awardHeaderBtnText}>+ Award Certificate</Text>
          </TouchableOpacity>

          <View style={styles.headerIconBtn}>
            <NotificationBellModal />
          </View>

          <View style={styles.userBadge}>
            <Ionicons name="megaphone" size={14} color="#6D28D9" />
            <Text style={styles.userBadgeText}>Notice Manager</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {/* ================= PURPLE HERO BANNER (MATCHING SCREENSHOT) ================= */}
        <View style={styles.heroBanner}>
          <View style={styles.heroTopRow}>
            <View style={styles.heroIconBadge}>
              <Ionicons name="ribbon" size={24} color="#FFFFFF" />
            </View>
            <View style={styles.officialPill}>
              <Ionicons name="shield-checkmark" size={13} color="#059669" />
              <Text style={styles.officialPillText}>Official Credentials</Text>
            </View>
          </View>

          <Text style={styles.heroTitle}>Academic Certification Center</Text>
          <Text style={styles.heroSubtitle}>
            Select connected students to award honors, attach verifiable PDF certificates & photos. Instantly updates in student profile.
          </Text>
        </View>

        {/* ================= 3 TABS (MATCHING SCREENSHOT) ================= */}
        <View style={styles.tabsRow}>
          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "students" && styles.tabBtnActive]}
            onPress={() => setActiveTab("students")}
          >
            <Ionicons
              name="people"
              size={18}
              color={activeTab === "students" ? "#FFFFFF" : "#64748B"}
            />
            <Text style={[styles.tabBtnText, activeTab === "students" && styles.tabBtnTextActive]}>
              Student List ({students.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "issued" && styles.tabBtnActive]}
            onPress={() => setActiveTab("issued")}
          >
            <Ionicons
              name="ribbon-outline"
              size={18}
              color={activeTab === "issued" ? "#FFFFFF" : "#64748B"}
            />
            <Text style={[styles.tabBtnText, activeTab === "issued" && styles.tabBtnTextActive]}>
              Issued Certificates ({certificates.length})
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tabBtn, activeTab === "requests" && styles.tabBtnActive]}
            onPress={() => setActiveTab("requests")}
          >
            <Ionicons
              name="mail-outline"
              size={18}
              color={activeTab === "requests" ? "#FFFFFF" : "#64748B"}
            />
            <Text style={[styles.tabBtnText, activeTab === "requests" && styles.tabBtnTextActive]}>
              Student Requests ({requests.length})
            </Text>
            {pendingRequestsCount > 0 && (
              <View style={styles.newRequestBadge}>
                <Text style={styles.newRequestBadgeText}>{pendingRequestsCount} New</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* ================= SEARCH & DEPARTMENT FILTERS ================= */}
        <View style={styles.filterSection}>
          <View style={styles.searchBar}>
            <Ionicons name="search-outline" size={18} color="#94A3B8" />
            <TextInput
              style={styles.searchInput}
              placeholder="Search student by name, roll number, or department..."
              placeholderTextColor="#94A3B8"
              value={search}
              onChangeText={setSearch}
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch("")}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {activeTab === "students" && (
            <View style={styles.deptPillsRow}>
              {["All", "CSE", "ECE", "ME", "Civil", "IT", "BSH"].map((dept) => (
                <TouchableOpacity
                  key={dept}
                  style={[
                    styles.deptPill,
                    deptFilter === dept && styles.deptPillActive,
                  ]}
                  onPress={() => setDeptFilter(dept)}
                >
                  <Text
                    style={[
                      styles.deptPillText,
                      deptFilter === dept && styles.deptPillTextActive,
                    ]}
                  >
                    {dept}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {activeTab === "requests" && (
            <View style={styles.deptPillsRow}>
              {(["All", "Pending", "Approved", "Rejected"] as const).map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[
                    styles.deptPill,
                    requestStatusFilter === st && styles.deptPillActive,
                  ]}
                  onPress={() => setRequestStatusFilter(st)}
                >
                  <Text
                    style={[
                      styles.deptPillText,
                      requestStatusFilter === st && styles.deptPillTextActive,
                    ]}
                  >
                    {st}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* ================= TAB 1: STUDENT LIST (MATCHING SCREENSHOT GRID) ================= */}
        {activeTab === "students" && (
          <View style={styles.gridContainer}>
            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#6D28D9" />
                <Text style={styles.loadingText}>Loading students from Firebase...</Text>
              </View>
            ) : filteredStudents.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="school-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>No Students Found</Text>
              </View>
            ) : (
              <View style={styles.studentsGrid}>
                {filteredStudents.map((st) => {
                  const studentCerts = certificates.filter(
                    (c) => c.studentId === st.id || c.studentRollNo === st.rollNo
                  );
                  const pendingReq = requests.find(
                    (r) =>
                      r.status === "Pending" &&
                      (r.studentId === st.id || r.studentRollNo === st.rollNo)
                  );

                  return (
                    <View key={st.id} style={styles.studentCard}>
                      <View style={styles.studentCardHeader}>
                        <View style={styles.avatarCircle}>
                          <Text style={styles.avatarLetter}>
                            {(st.fullName || "S").charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.studentMetaCol}>
                          <Text style={styles.studentName} numberOfLines={1}>
                            {st.fullName}
                          </Text>
                          <Text style={styles.studentRollSem}>
                            Roll: {st.rollNo} • Sem {st.semester || "4"}
                          </Text>
                          <View style={styles.deptBadge}>
                            <Text style={styles.deptBadgeText}>{st.department || "CSE"}</Text>
                          </View>
                        </View>
                      </View>

                      {pendingReq && (
                        <TouchableOpacity
                          style={styles.pendingReqBanner}
                          onPress={() => {
                            setActiveTab("requests");
                            setSearch(st.fullName);
                          }}
                        >
                          <Ionicons name="mail" size={13} color="#B45309" />
                          <Text style={styles.pendingReqBannerText}>
                            1 Certificate Request Pending • Review
                          </Text>
                        </TouchableOpacity>
                      )}

                      <View style={styles.studentCardFooter}>
                        <View style={styles.certCountRow}>
                          <Ionicons name="ribbon-outline" size={15} color="#D97706" />
                          <Text style={styles.certCountText}>
                            {studentCerts.length} Certificate{studentCerts.length === 1 ? "" : "s"}
                          </Text>
                        </View>

                        <TouchableOpacity
                          style={styles.awardCardBtn}
                          onPress={() => handleOpenAwardModal(st)}
                        >
                          <Ionicons name="add" size={14} color="#FFFFFF" />
                          <Text style={styles.awardCardBtnText}>Award Certificate</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* ================= TAB 2: ISSUED CERTIFICATES ================= */}
        {activeTab === "issued" && (
          <View style={styles.issuedListContainer}>
            {filteredCertificates.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="ribbon-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>No Certificates Issued Yet</Text>
                <Text style={styles.emptySub}>
                  Select any student from the "Student List" to award a certificate.
                </Text>
              </View>
            ) : (
              <View style={styles.issuedGrid}>
                {filteredCertificates.map((cert) => {
                  const isLockedByAdmin = cert.canNoticeManagerUpdate === false;
                  const isNoticeManagerCert =
                    cert.issuedByRole === "notice_manager" || cert.issuedBy?.includes("Notice");

                  return (
                    <View key={cert.id} style={styles.issuedCard}>
                      <View style={styles.issuedCardTop}>
                        <View style={styles.issuedBadgeCircle}>
                          <Ionicons name="ribbon" size={22} color="#6D28D9" />
                        </View>
                        <View style={styles.issuedTitleCol}>
                          <Text style={styles.issuedCertTitle}>{cert.title}</Text>
                          <Text style={styles.issuedStudentName}>
                            Awarded to: <Text style={{ fontWeight: "700" }}>{cert.studentName}</Text> ({cert.studentRollNo})
                          </Text>
                          <Text style={styles.issuedDateIssuer}>
                            Issued on {cert.issueDate} • By {cert.issuedBy}
                          </Text>
                        </View>
                      </View>

                      {/* Supervision Indicators */}
                      <View style={styles.supervisionRow}>
                        <View
                          style={[
                            styles.issuerTag,
                            isNoticeManagerCert ? styles.issuerTagNotice : styles.issuerTagAdmin,
                          ]}
                        >
                          <Text
                            style={[
                              styles.issuerTagText,
                              isNoticeManagerCert ? styles.issuerTagNoticeText : styles.issuerTagAdminText,
                            ]}
                          >
                            {isNoticeManagerCert ? "📢 Notice Manager" : "🛡️ Admin Issued"}
                          </Text>
                        </View>

                        {isLockedByAdmin ? (
                          <View style={styles.lockedTag}>
                            <Ionicons name="lock-closed" size={12} color="#DC2626" />
                            <Text style={styles.lockedTagText}>Admin Locked (Read-Only)</Text>
                          </View>
                        ) : (
                          <View style={styles.editableTag}>
                            <Ionicons name="checkmark-circle" size={12} color="#059669" />
                            <Text style={styles.editableTagText}>Notice Manager Editable</Text>
                          </View>
                        )}
                      </View>

                      {cert.description ? (
                        <Text style={styles.issuedDescription} numberOfLines={2}>
                          "{cert.description}"
                        </Text>
                      ) : null}

                      {/* Card Actions */}
                      <View style={styles.issuedCardActions}>
                        {cert.pdfUrl ? (
                          <TouchableOpacity
                            style={styles.pdfDownloadBtn}
                            onPress={() => {
                              shareOrDownloadPdf(cert.pdfUrl!, `${cert.title}.pdf`);
                            }}
                          >
                            <Ionicons name="document-text" size={14} color="#2563EB" />
                            <Text style={styles.pdfDownloadBtnText}>View PDF</Text>
                          </TouchableOpacity>
                        ) : null}

                        <TouchableOpacity
                          style={[
                            styles.issuedEditBtn,
                            isLockedByAdmin && styles.issuedEditBtnDisabled,
                          ]}
                          onPress={() => handleOpenEditModal(cert)}
                          disabled={isLockedByAdmin}
                        >
                          <Ionicons
                            name="create-outline"
                            size={14}
                            color={isLockedByAdmin ? "#94A3B8" : "#475569"}
                          />
                          <Text
                            style={[
                              styles.issuedEditBtnText,
                              isLockedByAdmin && { color: "#94A3B8" },
                            ]}
                          >
                            {isLockedByAdmin ? "Locked" : "Edit"}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={[
                            styles.issuedDeleteBtn,
                            isLockedByAdmin && styles.issuedEditBtnDisabled,
                          ]}
                          onPress={() => {
                            if (isLockedByAdmin) {
                              Alert.alert(
                                "Locked by Admin",
                                "This certificate cannot be deleted because it is locked by Admin."
                              );
                              return;
                            }
                            setTargetCertForDelete(cert);
                            setDeleteModalVisible(true);
                          }}
                          disabled={isLockedByAdmin}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={14}
                            color={isLockedByAdmin ? "#94A3B8" : "#EF4444"}
                          />
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* ================= TAB 3: STUDENT REQUESTS ================= */}
        {activeTab === "requests" && (
          <View style={styles.requestsContainer}>
            {filteredRequests.length === 0 ? (
              <View style={styles.emptyBox}>
                <Ionicons name="mail-outline" size={48} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>No Student Requests</Text>
              </View>
            ) : (
              <View style={styles.requestsList}>
                {filteredRequests.map((req) => (
                  <View key={req.id} style={styles.requestCard}>
                    <View style={styles.requestCardHeader}>
                      <View style={styles.avatarCircleSmall}>
                        <Text style={styles.avatarLetterSmall}>
                          {(req.studentName || "S").charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.requestStudentName}>{req.studentName}</Text>
                        <Text style={styles.requestMeta}>
                          Roll: {req.studentRollNo || "N/A"} • {req.department}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.reqStatusBadge,
                          req.status === "Approved"
                            ? styles.reqStatusApproved
                            : req.status === "Rejected"
                            ? styles.reqStatusRejected
                            : styles.reqStatusPending,
                        ]}
                      >
                        <Text
                          style={[
                            styles.reqStatusText,
                            req.status === "Approved"
                              ? styles.reqStatusTextApproved
                              : req.status === "Rejected"
                              ? styles.reqStatusTextRejected
                              : styles.reqStatusTextPending,
                          ]}
                        >
                          {req.status}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.requestDetailsBox}>
                      <Text style={styles.requestTypeLabel}>
                        Requested: <Text style={{ fontWeight: "700" }}>{req.certificateType}</Text>
                      </Text>
                      <Text style={styles.requestPurpose}>Purpose: {req.purpose}</Text>
                    </View>

                    {req.status === "Pending" && (
                      <View style={styles.requestActionRow}>
                        <TouchableOpacity
                          style={styles.declineReqBtn}
                          onPress={() => {
                            setTargetRequestForDecline(req);
                            setDeclineModalVisible(true);
                          }}
                        >
                          <Ionicons name="close-circle-outline" size={15} color="#EF4444" />
                          <Text style={styles.declineReqBtnText}>Decline</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.approveReqBtn}
                          onPress={() => {
                            setFulfillingRequestId(req.id);
                            setSelectedStudent({
                              id: req.studentId,
                              fullName: req.studentName,
                              rollNo: req.studentRollNo || "23CSE001",
                              department: req.department || "CSE",
                              semester: req.semester || "4",
                              email: req.studentEmail || "",
                            });
                            setCertTitle(req.certificateType);
                            setCertSubject("Academic Verification");
                            setCertStudentName(req.studentName);
                            setCertStudentRoll(req.studentRollNo || "23CSE001");
                            setCertDepartment(req.department || "CSE");
                            setCertGrade("Grade A+ (94%)");
                            setCertTeacher("Anita Verma (Notice Manager)");
                            setCertDescription(`Official ${req.certificateType} granted for ${req.purpose}`);
                            setPhotoUrl(PRESET_PHOTOS[0].url);
                            setIssueModalVisible(true);
                          }}
                        >
                          <Ionicons name="checkmark-circle" size={15} color="#FFFFFF" />
                          <Text style={styles.approveReqBtnText}>Approve & Issue</Text>
                        </TouchableOpacity>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ================= AWARD / EDIT CERTIFICATE MODAL ================= */}
      <Modal
        visible={issueModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          if (!savingCert) setIssueModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentCard}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={styles.modalHeaderTitle}>
                  {editingCert ? "Edit Certificate" : "Award Official Certificate"}
                </Text>
                <Text style={styles.modalHeaderSubtitle}>
                  Powered by Firebase • Notice & Communications Center
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setIssueModalVisible(false)}
                disabled={savingCert}
              >
                <Ionicons name="close" size={24} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBodyScroll} showsVerticalScrollIndicator={false}>
              {/* Student Info Pill */}
              <View style={styles.modalStudentCard}>
                <Ionicons name="person-circle" size={28} color="#6D28D9" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.modalStudentName}>{certStudentName}</Text>
                  <Text style={styles.modalStudentRoll}>
                    Roll: {certStudentRoll} • Department: {certDepartment}
                  </Text>
                </View>
              </View>

              {/* Form Fields */}
              <Text style={styles.fieldLabel}>Certificate Title *</Text>
              <TextInput
                style={styles.modalInput}
                value={certTitle}
                onChangeText={setCertTitle}
                placeholder="e.g. Merit in Data Structures, Hackathon Winner..."
                placeholderTextColor="#94A3B8"
              />

              <Text style={styles.fieldLabel}>Subject / Domain *</Text>
              <TextInput
                style={styles.modalInput}
                value={certSubject}
                onChangeText={setCertSubject}
                placeholder="e.g. Computer Science & Engineering"
                placeholderTextColor="#94A3B8"
              />

              <View style={styles.fieldsTwoCols}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Grade / Score</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={certGrade}
                    onChangeText={setCertGrade}
                    placeholder="e.g. Grade A+ (95%)"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Issuer Authority</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={certTeacher}
                    onChangeText={setCertTeacher}
                    placeholder="e.g. Anita Verma (Notice Manager)"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              <Text style={styles.fieldLabel}>Description / Citation</Text>
              <TextInput
                style={[styles.modalInput, { height: 72, textAlignVertical: "top" }]}
                value={certDescription}
                onChangeText={setCertDescription}
                multiline
                placeholder="Commendation details for the student..."
                placeholderTextColor="#94A3B8"
              />

              {/* Badges / Preset Photo Selection */}
              <Text style={styles.fieldLabel}>Credential Badge Photo</Text>
              <View style={styles.presetBadgesRow}>
                {PRESET_PHOTOS.map((p) => (
                  <TouchableOpacity
                    key={p.id}
                    style={[
                      styles.presetBadgeBtn,
                      photoUrl === p.url && styles.presetBadgeBtnActive,
                    ]}
                    onPress={() => {
                      setPhotoUrl(p.url);
                      setPhotoFileName(p.label);
                    }}
                  >
                    <Ionicons
                      name={p.icon as any}
                      size={18}
                      color={photoUrl === p.url ? "#6D28D9" : "#64748B"}
                    />
                    <Text
                      style={[
                        styles.presetBadgeText,
                        photoUrl === p.url && styles.presetBadgeTextActive,
                      ]}
                    >
                      {p.label}
                    </Text>
                  </TouchableOpacity>
                ))}

                <TouchableOpacity style={styles.customBadgeUploadBtn} onPress={handlePickPhoto}>
                  <Ionicons name="image-outline" size={16} color="#2563EB" />
                  <Text style={styles.customBadgeUploadText}>Upload Custom</Text>
                </TouchableOpacity>
              </View>

              {/* PDF Document Options */}
              <Text style={styles.fieldLabel}>Verifiable PDF Document</Text>
              <View style={styles.pdfOptionsRow}>
                <TouchableOpacity
                  style={styles.generatePdfBtn}
                  onPress={handleGeneratePdf}
                  disabled={isGeneratingPdf}
                >
                  {isGeneratingPdf ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons name="sparkles" size={16} color="#FFFFFF" />
                      <Text style={styles.generatePdfBtnText}>Generate Official PDF</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.uploadPdfFileBtn}
                  onPress={handlePickPdf}
                >
                  <Ionicons name="document-attach" size={16} color="#475569" />
                  <Text style={styles.uploadPdfFileBtnText}>Upload PDF File</Text>
                </TouchableOpacity>
              </View>

              {pdfUrl ? (
                <View style={styles.pdfAttachedBox}>
                  <Ionicons name="checkmark-circle" size={18} color="#059669" />
                  <Text style={styles.pdfAttachedText} numberOfLines={1}>
                    Attached: {pdfFileName || "Official_Certificate.pdf"}
                  </Text>
                </View>
              ) : null}

              {uploadStatus ? (
                <Text style={styles.uploadStatusText}>{uploadStatus}</Text>
              ) : null}
            </ScrollView>

            {/* Modal Bottom Actions */}
            <View style={styles.modalBottomActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setIssueModalVisible(false)}
                disabled={savingCert}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveCertificate}
                disabled={savingCert}
              >
                {savingCert ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-done" size={18} color="#FFFFFF" />
                    <Text style={styles.modalSaveBtnText}>
                      {editingCert ? "Update in Firebase" : "Issue Certificate"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Decline Request Modal */}
      <Modal
        visible={declineModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeclineModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentCard, { maxWidth: 420 }]}>
            <Text style={styles.modalHeaderTitle}>Decline Request</Text>
            <Text style={styles.modalHeaderSubtitle}>
              Provide reason for declining {targetRequestForDecline?.studentName}'s request
            </Text>

            <TextInput
              style={[styles.modalInput, { height: 80, marginTop: 14 }]}
              placeholder="e.g. Incomplete attendance or documents required..."
              placeholderTextColor="#94A3B8"
              value={declineReason}
              onChangeText={setDeclineReason}
              multiline
            />

            <View style={styles.modalBottomActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setDeclineModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: "#EF4444" }]}
                onPress={handleConfirmDecline}
                disabled={declineSubmitting}
              >
                {declineSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Confirm Decline</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Certificate Modal */}
      <Modal
        visible={deleteModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContentCard, { maxWidth: 420 }]}>
            <Text style={styles.modalHeaderTitle}>Delete Certificate</Text>
            <Text style={styles.modalHeaderSubtitle}>
              Are you sure you want to remove "{targetCertForDelete?.title}" from Firebase?
            </Text>

            <View style={styles.modalBottomActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setDeleteModalVisible(false)}
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: "#EF4444" }]}
                onPress={handleDeleteCertificate}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Delete</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// =====================================================
// STYLES (MATCHING SCREENSHOT EXACTLY)
// =====================================================
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 44,
    paddingBottom: 16,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  topHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  pageTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
  },
  pageSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  topHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  awardHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#6D28D9",
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 10,
    shadowColor: "#6D28D9",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  awardHeaderBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },
  userBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: "#EDE9FE",
  },
  userBadgeText: {
    color: "#6D28D9",
    fontSize: 12.5,
    fontWeight: "700",
  },
  scrollBody: {
    flex: 1,
  },

  // HERO BANNER
  heroBanner: {
    marginHorizontal: 24,
    marginTop: 20,
    marginBottom: 16,
    borderRadius: 16,
    backgroundColor: "#6D28D9",
    padding: 24,
    shadowColor: "#6D28D9",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 4,
  },
  heroTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  heroIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  officialPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
  },
  officialPillText: {
    color: "#059669",
    fontSize: 11,
    fontWeight: "700",
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
    marginBottom: 6,
  },
  heroSubtitle: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 13,
    lineHeight: 18,
    maxWidth: 700,
  },

  // TABS ROW
  tabsRow: {
    flexDirection: "row",
    gap: 10,
    marginHorizontal: 24,
    marginBottom: 16,
  },
  tabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tabBtnActive: {
    backgroundColor: "#6D28D9",
    borderColor: "#6D28D9",
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  tabBtnTextActive: {
    color: "#FFFFFF",
  },
  newRequestBadge: {
    backgroundColor: "#F59E0B",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  newRequestBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },

  // FILTER SECTION
  filterSection: {
    marginHorizontal: 24,
    marginBottom: 16,
    gap: 12,
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 44,
    gap: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
  },
  deptPillsRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  deptPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  deptPillActive: {
    backgroundColor: "#6D28D9",
    borderColor: "#6D28D9",
  },
  deptPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  deptPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  // GRID CONTAINER
  gridContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  studentsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  studentCard: {
    flexGrow: 1,
    flexBasis: 280,
    maxWidth: 360,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  studentCardHeader: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#EDE9FE",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarLetter: {
    fontSize: 18,
    fontWeight: "800",
    color: "#6D28D9",
  },
  studentMetaCol: {
    flex: 1,
  },
  studentName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  studentRollSem: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
  },
  deptBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
  },
  deptBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#475569",
  },
  pendingReqBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF3C7",
    padding: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  pendingReqBannerText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#92400E",
  },
  studentCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 12,
  },
  certCountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  certCountText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
  },
  awardCardBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#6D28D9",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  awardCardBtnText: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "700",
  },

  // ISSUED TAB
  issuedListContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  issuedGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  issuedCard: {
    flexGrow: 1,
    flexBasis: 320,
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  issuedCardTop: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 10,
  },
  issuedBadgeCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#EDE9FE",
    justifyContent: "center",
    alignItems: "center",
  },
  issuedTitleCol: {
    flex: 1,
  },
  issuedCertTitle: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  issuedStudentName: {
    fontSize: 12,
    color: "#334155",
    marginTop: 2,
  },
  issuedDateIssuer: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  supervisionRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },
  issuerTag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  issuerTagText: {
    fontSize: 10.5,
    fontWeight: "700",
  },
  issuerTagNotice: {
    backgroundColor: "#EDE9FE",
  },
  issuerTagNoticeText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#6D28D9",
  },
  issuerTagAdmin: {
    backgroundColor: "#DBEAFE",
  },
  issuerTagAdminText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  lockedTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  lockedTagText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#DC2626",
  },
  editableTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  editableTagText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#166534",
  },
  issuedDescription: {
    fontSize: 11.5,
    color: "#64748B",
    fontStyle: "italic",
    marginBottom: 10,
  },
  issuedCardActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 10,
    justifyContent: "flex-end",
  },
  pdfDownloadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  pdfDownloadBtnText: {
    fontSize: 11.5,
    color: "#2563EB",
    fontWeight: "700",
  },
  issuedEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
  },
  issuedEditBtnDisabled: {
    opacity: 0.5,
  },
  issuedEditBtnText: {
    fontSize: 11.5,
    color: "#475569",
    fontWeight: "600",
  },
  issuedDeleteBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: "#FEE2E2",
  },

  // REQUESTS TAB
  requestsContainer: {
    paddingHorizontal: 24,
    paddingBottom: 40,
  },
  requestsList: {
    gap: 12,
  },
  requestCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  requestCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  avatarCircleSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EDE9FE",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarLetterSmall: {
    fontSize: 15,
    fontWeight: "700",
    color: "#6D28D9",
  },
  requestStudentName: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  requestMeta: {
    fontSize: 11.5,
    color: "#64748B",
  },
  reqStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  reqStatusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  reqStatusApproved: {
    backgroundColor: "#DCFCE7",
  },
  reqStatusTextApproved: {
    color: "#166534",
    fontSize: 11,
    fontWeight: "700",
  },
  reqStatusRejected: {
    backgroundColor: "#FEE2E2",
  },
  reqStatusTextRejected: {
    color: "#991B1B",
    fontSize: 11,
    fontWeight: "700",
  },
  reqStatusPending: {
    backgroundColor: "#FEF3C7",
  },
  reqStatusTextPending: {
    color: "#92400E",
    fontSize: 11,
    fontWeight: "700",
  },
  requestDetailsBox: {
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 8,
    marginVertical: 10,
  },
  requestTypeLabel: {
    fontSize: 12.5,
    color: "#0F172A",
  },
  requestPurpose: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  requestActionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
  },
  declineReqBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  declineReqBtnText: {
    color: "#EF4444",
    fontSize: 12,
    fontWeight: "700",
  },
  approveReqBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#6D28D9",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  approveReqBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },

  // MODAL
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalContentCard: {
    width: "100%",
    maxWidth: 580,
    maxHeight: "90%",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  modalHeaderTitle: {
    fontSize: 19,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalHeaderSubtitle: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  modalBodyScroll: {
    flexGrow: 0,
  },
  modalStudentCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F8FAFC",
    padding: 10,
    borderRadius: 10,
    marginBottom: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  modalStudentName: {
    fontSize: 14.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalStudentRoll: {
    fontSize: 11.5,
    color: "#64748B",
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
    marginBottom: 5,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#0F172A",
  },
  fieldsTwoCols: {
    flexDirection: "row",
    gap: 10,
  },
  presetBadgesRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginTop: 4,
  },
  presetBadgeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  presetBadgeBtnActive: {
    borderColor: "#6D28D9",
    backgroundColor: "#EDE9FE",
  },
  presetBadgeText: {
    fontSize: 11.5,
    color: "#475569",
    fontWeight: "600",
  },
  presetBadgeTextActive: {
    color: "#6D28D9",
    fontWeight: "700",
  },
  customBadgeUploadBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  customBadgeUploadText: {
    fontSize: 11.5,
    color: "#2563EB",
    fontWeight: "700",
  },
  pdfOptionsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 4,
  },
  generatePdfBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#6D28D9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  generatePdfBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  uploadPdfFileBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  uploadPdfFileBtnText: {
    color: "#475569",
    fontSize: 12,
    fontWeight: "600",
  },
  pdfAttachedBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#DCFCE7",
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
  },
  pdfAttachedText: {
    fontSize: 11.5,
    color: "#166534",
    fontWeight: "600",
  },
  uploadStatusText: {
    fontSize: 11,
    color: "#2563EB",
    marginTop: 6,
  },
  modalBottomActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 14,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  modalCancelBtnText: {
    fontSize: 13,
    color: "#475569",
    fontWeight: "600",
  },
  modalSaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: "#6D28D9",
  },
  modalSaveBtnText: {
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  loadingBox: {
    padding: 40,
    alignItems: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 13,
    color: "#64748B",
  },
  emptyBox: {
    padding: 50,
    alignItems: "center",
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  emptySub: {
    fontSize: 12,
    color: "#64748B",
    textAlign: "center",
  },
});