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
  setDoc,
  updateDoc,
} from "firebase/firestore";

export type CertificateItem = {
  id: string;
  studentId?: string;
  studentName?: string;
  studentRollNo?: string;
  title: string;
  subject?: string;
  grade?: string;
  issueDate: string;
  issuedBy: string;
  issuerTitle?: string;
  credentialId?: string;
  description?: string;
  verified?: boolean;
};
import {
  getDownloadURL,
  getStorage,
  ref,
  uploadBytes,
} from "firebase/storage";
import { sendPasswordResetEmail } from "firebase/auth";
import * as ImagePicker from "expo-image-picker";

import { auth, db } from "../../firebase/config";
import { confirmLogout } from "../../firebase/auth";
import { useAppTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";
import {
  connectStudentToTeacher,
  seedDefaultTeacherCode,
} from "../../firebase/teacherStudent";

export default function ProfileScreen() {
  const { colors, isDark } = useAppTheme();
  const { t } = useLanguage();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 840;

  const handleCopyRoll = () => {
    try {
      if (typeof navigator !== "undefined" && navigator?.clipboard?.writeText) {
        navigator.clipboard.writeText(rollNo || "23CSE001");
      }
    } catch (e) {}
    Alert.alert("Copied! 📋", `Roll Number "${rollNo || "23CSE001"}" copied to clipboard.`);
  };

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  // Profile data states
  const [photoURL, setPhotoURL] = useState("");
  const [name, setName] = useState("Tuffan");
  const [degree, setDegree] = useState("B.Tech Student");
  const [rollNo, setRollNo] = useState("23CSE001");
  const [department, setDepartment] = useState("Computer Science & Engineering");
  const [semester, setSemester] = useState("6th Semester");
  const [section, setSection] = useState("A");
  const [phoneNumber, setPhoneNumber] = useState("+91 98765 43210");
  const [college, setCollege] = useState("");
  const [email, setEmail] = useState("");

  // Live Attendance from Firestore
  const [attendancePercentage, setAttendancePercentage] = useState("92%");
  const [classesAttended, setClassesAttended] = useState(42);
  const [totalClasses, setTotalClasses] = useState(48);
  const [lastAttendanceStatus, setLastAttendanceStatus] = useState<"Present" | "Absent" | "Late">("Present");
  const [lastAttendanceSubject, setLastAttendanceSubject] = useState("Data Structures");
  const [lastAttendanceDate, setLastAttendanceDate] = useState("Sep 22, 2026");
  const [lastAttendanceTeacher, setLastAttendanceTeacher] = useState("Prof. Ganesh Sharma");
  const [connectedTeachers, setConnectedTeachers] = useState<any[]>([]);

  // Modals
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [photoModalVisible, setPhotoModalVisible] = useState(false);
  const [passwordModalVisible, setPasswordModalVisible] = useState(false);
  const [resetEmailSending, setResetEmailSending] = useState(false);

  // Connect Teacher Modal State
  const [connectTeacherModal, setConnectTeacherModal] = useState(false);
  const [teacherCodeInput, setTeacherCodeInput] = useState("");
  const [teacherPasswordInput, setTeacherPasswordInput] = useState("");
  const [connectingTeacher, setConnectingTeacher] = useState(false);

  // Certificates State
  const [certificates, setCertificates] = useState<CertificateItem[]>([]);
  const [selectedCertificate, setSelectedCertificate] = useState<CertificateItem | null>(null);
  const [certificateViewModal, setCertificateViewModal] = useState(false);

  // Special Notes State (Read-only for Students)
  const [specialNotes, setSpecialNotes] = useState<any[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [selectedNote, setSelectedNote] = useState<any | null>(null);
  const [noteViewModalVisible, setNoteViewModalVisible] = useState(false);
  const [selectedNoteSubject, setSelectedNoteSubject] = useState("All");

  const uniqueNoteSubjects = useMemo(() => {
    const set = new Set<string>();
    specialNotes.forEach((n) => {
      if (n.subject && n.subject.trim()) set.add(n.subject.trim());
    });
    return ["All", ...Array.from(set).sort()];
  }, [specialNotes]);

  const displayedNotes = useMemo(() => {
    if (selectedNoteSubject === "All") return specialNotes;
    return specialNotes.filter(
      (n) => n.subject?.trim().toLowerCase() === selectedNoteSubject.trim().toLowerCase()
    );
  }, [specialNotes, selectedNoteSubject]);

  // Issue / Update Certificate Modal (For Teacher/Admin)
  const [issueCertificateModal, setIssueCertificateModal] = useState(false);
  const [certTitle, setCertTitle] = useState("");
  const [certSubject, setCertSubject] = useState("");
  const [certGrade, setCertGrade] = useState("Grade A+ (94%)");
  const [certTeacher, setCertTeacher] = useState("Prof. Ganesh Sharma");
  const [certStudentName, setCertStudentName] = useState("");
  const [certRollNo, setCertRollNo] = useState("");
  const [savingCert, setSavingCert] = useState(false);

  // Form states for Edit Modal
  const [formName, setFormName] = useState("");
  const [formDegree, setFormDegree] = useState("");
  const [formRollNo, setFormRollNo] = useState("");
  const [formDepartment, setFormDepartment] = useState("");
  const [formSemester, setFormSemester] = useState("");
  const [formSection, setFormSection] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formCollege, setFormCollege] = useState("");

  const storage = getStorage();

  // ======================================================
  // LOAD PROFILE FROM FIRESTORE
  // ======================================================
  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      setLoading(false);
      return;
    }

    setEmail(user.email || "tdebuggers0@gmail.com");

    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(
      userRef,
      (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setName(String(data.fullName ?? data.name ?? user.displayName ?? "Tuffan"));
          setEmail(String(data.email ?? user.email ?? "tdebuggers0@gmail.com"));
          setRollNo(String(data.rollNo ?? "23CSE001"));
          setDegree(String(data.degree ?? "B.Tech Student"));
          setDepartment(String(data.department ?? "Computer Science & Engineering"));
          setSemester(String(data.semester ?? "6th Semester"));
          setSection(String(data.section ?? "A"));
          setPhoneNumber(String(data.phone ?? data.phoneNumber ?? "+91 98765 43210"));
          setCollege(String(data.college ?? ""));
          setPhotoURL(String(data.photoURL ?? user.photoURL ?? ""));

          // Live Attendance Data
          if (data.attendancePercentage) setAttendancePercentage(String(data.attendancePercentage));
          if (typeof data.classesAttended === "number") setClassesAttended(data.classesAttended);
          if (typeof data.totalClasses === "number") setTotalClasses(data.totalClasses);
          if (data.lastAttendanceStatus) setLastAttendanceStatus(data.lastAttendanceStatus);
          if (data.lastAttendanceSubject) setLastAttendanceSubject(data.lastAttendanceSubject);
          if (data.lastAttendanceDate) setLastAttendanceDate(data.lastAttendanceDate);
          if (data.lastAttendanceTeacher) setLastAttendanceTeacher(data.lastAttendanceTeacher);
          if (data.connectedTeachers) setConnectedTeachers(data.connectedTeachers);
        } else {
          setName(user.displayName || "Tuffan");
          setEmail(user.email || "tdebuggers0@gmail.com");
          if (user.photoURL) setPhotoURL(user.photoURL);
        }
        setLoading(false);
      },
      (error) => {
        if (!auth.currentUser) return;
        console.warn("Profile snapshot error:", error?.message);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  // ======================================================
  // LOAD CERTIFICATES FROM FIRESTORE
  // ======================================================
  useEffect(() => {
    try {
      const certsCol = collection(db, "certificates");
      const unsub = onSnapshot(
        certsCol,
        (snap) => {
          const list: CertificateItem[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              studentId: data.studentId || "",
              studentName: data.studentName || name,
              studentRollNo: data.studentRollNo || rollNo,
              title: data.title || "Academic Certificate",
              subject: data.subject || "Academic Subject",
              grade: data.grade || "Grade A+",
              issueDate: data.issueDate || "2026",
              issuedBy: data.issuedBy || "Class Faculty",
              issuerTitle: data.issuerTitle || "Professor & Faculty Mentor",
              credentialId: data.credentialId || `CAMP-${d.id.slice(0, 6).toUpperCase()}`,
              description: data.description || "Awarded for outstanding performance and dedication.",
              verified: true,
            };
          });

          setCertificates(list);
        },
        (err) => {
          console.warn("Certs listener error:", err);
          setCertificates([]);
        }
      );

      return () => unsub();
    } catch (e) {
      console.warn("Certificates setup error:", e);
    }
  }, [name, rollNo]);

  // ======================================================
  // SAVE / ISSUE CERTIFICATE (TEACHER / ADMIN)
  // ======================================================
  const handleSaveCertificate = async () => {
    if (!certTitle.trim()) {
      Alert.alert("Missing Details", "Please enter certificate title.");
      return;
    }

    try {
      setSavingCert(true);
      const user = auth.currentUser;
      const credId = `CAMP-2026-${Math.floor(1000 + Math.random() * 9000)}`;
      const payload = {
        studentId: user ? user.uid : "student",
        studentName: certStudentName.trim() || name || "Student",
        studentRollNo: certRollNo.trim() || rollNo || "23CSE001",
        title: certTitle.trim(),
        subject: certSubject.trim() || "Academic Course",
        grade: certGrade.trim() || "Grade A+",
        issueDate: new Date().toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        issuedBy: certTeacher.trim() || "Prof. Ganesh Sharma",
        issuerTitle: "Faculty Mentor & Instructor",
        credentialId: credId,
        description: `Awarded to ${certStudentName.trim() || name} for exceptional performance in ${
          certSubject.trim() || certTitle.trim()
        }.`,
        verified: true,
        createdAt: serverTimestamp(),
      };

      await addDoc(collection(db, "certificates"), payload);
      setIssueCertificateModal(false);
      setCertTitle("");
      setCertSubject("");
      Alert.alert(
        "Certificate Awarded! 🎓",
        "The certificate has been saved to Firebase and updated on the student profile."
      );
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Could not save certificate.");
    } finally {
      setSavingCert(false);
    }
  };

  // ======================================================
  // REAL-TIME SPECIAL NOTES LISTENER (READ-ONLY FOR STUDENT)
  // ======================================================
  useEffect(() => {
    const notesRef = collection(db, "specialNotes");
    const q = query(notesRef, orderBy("createdAt", "desc"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        const list = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setSpecialNotes(list);
        setNotesLoading(false);
      },
      (err) => {
        console.warn("Student special notes error:", err);
        setNotesLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // ======================================================
  // CONNECT WITH TEACHER
  // ======================================================
  const handleConnectTeacher = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Login Required", "Please log in before connecting to a teacher.");
      return;
    }
    if (!teacherCodeInput.trim() || !teacherPasswordInput.trim()) {
      Alert.alert("Missing Information", "Please enter both Teacher ID and Password.");
      return;
    }

    try {
      setConnectingTeacher(true);
      const res = await connectStudentToTeacher(
        user.uid,
        name || user.displayName || "Student",
        email || user.email || "",
        teacherCodeInput,
        teacherPasswordInput
      );
      setConnectingTeacher(false);

      if (res.success && res.teacher) {
        Alert.alert(
          "Connected Successfully! 🎉",
          `You are now connected with ${res.teacher.teacherName} for ${res.teacher.subject}!`
        );
        setConnectTeacherModal(false);
        setTeacherCodeInput("");
        setTeacherPasswordInput("");
      } else {
        Alert.alert("Connection Failed", res.error || "Please check Teacher ID and Password.");
      }
    } catch (err: any) {
      setConnectingTeacher(false);
      Alert.alert("Error", err?.message || "Failed to connect to teacher.");
    }
  };

  // ======================================================
  // OPEN EDIT MODAL
  // ======================================================
  const openEditModal = () => {
    setFormName(name);
    setFormDegree(degree);
    setFormRollNo(rollNo);
    setFormDepartment(department);
    setFormSemester(semester);
    setFormSection(section);
    setFormPhone(phoneNumber);
    setFormCollege(college);
    setEditModalVisible(true);
  };

  // ======================================================
  // SAVE PROFILE
  // ======================================================
  const handleSaveProfile = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Error", "Please log in before updating your profile.");
      return;
    }

    const cleanName = formName.trim();
    if (!cleanName) {
      Alert.alert("Validation", "Full name is required.");
      return;
    }

    try {
      setSaving(true);
      await setDoc(
        doc(db, "users", user.uid),
        {
          uid: user.uid,
          fullName: cleanName,
          email: user.email || email,
          degree: formDegree.trim() || "B.Tech Student",
          rollNo: formRollNo.trim() || "23CSE001",
          department: formDepartment.trim() || "Computer Science & Engineering",
          semester: formSemester.trim() || "6th Semester",
          section: formSection.trim() || "A",
          phone: formPhone.trim() || phoneNumber,
          college: formCollege.trim(),
          photoURL: photoURL,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      setName(cleanName);
      setDegree(formDegree.trim() || "B.Tech Student");
      setRollNo(formRollNo.trim() || "23CSE001");
      setDepartment(formDepartment.trim() || "Computer Science & Engineering");
      setSemester(formSemester.trim() || "6th Semester");
      setSection(formSection.trim() || "A");
      setPhoneNumber(formPhone.trim() || phoneNumber);
      setCollege(formCollege.trim());

      setEditModalVisible(false);
      Alert.alert("Success", "Profile updated successfully!");
    } catch (error: any) {
      console.error("Save profile error:", error);
      Alert.alert("Error", error?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  // ======================================================
  // PHOTO UPLOAD (BLOB CONVERSION FOR ANDROID / EXPO)
  // ======================================================
  const readImageAsBlob = (uri: string): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.onload = () => {
        if (xhr.response && xhr.response.size > 0) {
          resolve(xhr.response);
        } else {
          reject(new Error("Empty image data received."));
        }
      };
      xhr.onerror = () => reject(new Error("Image read failed."));
      xhr.ontimeout = () => reject(new Error("Timed out reading image."));
      xhr.open("GET", uri, true);
      xhr.responseType = "blob";
      xhr.timeout = 30000;
      xhr.send();
    });
  };

  const uploadProfilePhoto = async (uri: string, mimeType?: string | null) => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert("Not Logged In", "Please log in before changing your photo.");
      return;
    }

    try {
      setUploadingPhoto(true);
      const blob = await readImageAsBlob(uri);
      const fileExt = mimeType?.includes("png") ? "png" : "jpg";
      const storagePath = `profile_photos/${user.uid}/profile_${Date.now()}.${fileExt}`;
      const photoRef = ref(storage, storagePath);

      await uploadBytes(photoRef, blob, {
        contentType: mimeType || "image/jpeg",
      });

      const downloadURL = await getDownloadURL(photoRef);
      await setDoc(doc(db, "users", user.uid), { photoURL: downloadURL }, { merge: true });

      setPhotoURL(downloadURL);
      Alert.alert("Success", "Profile photo updated!");
    } catch (error: any) {
      console.error("Upload error:", error);
      Alert.alert("Upload Failed", error?.message || "Failed to upload photo.");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const chooseFromGallery = async () => {
    try {
      setPhotoModalVisible(false);
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission required", "Please allow photo library access.");
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];
        if (asset.uri) {
          await uploadProfilePhoto(asset.uri, asset.mimeType);
        }
      }
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Unable to select photo.");
    }
  };

  const takePhoto = async () => {
    try {
      setPhotoModalVisible(false);
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        Alert.alert("Permission required", "Please allow camera access.");
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets?.length) {
        const asset = result.assets[0];
        if (asset.uri) {
          await uploadProfilePhoto(asset.uri, asset.mimeType);
        }
      }
    } catch (error: any) {
      Alert.alert("Error", error?.message || "Unable to capture photo.");
    }
  };

  // ======================================================
  // PASSWORD RESET
  // ======================================================
  const handlePasswordReset = async () => {
    const user = auth.currentUser;
    const targetEmail = user?.email || email;

    if (!targetEmail) {
      Alert.alert("Error", "No email address found for this account.");
      return;
    }

    try {
      setResetEmailSending(true);
      await sendPasswordResetEmail(auth, targetEmail);
      setPasswordModalVisible(false);
      Alert.alert(
        "Email Sent",
        `A password reset link has been sent to:\n${targetEmail}\n\nPlease check your inbox.`
      );
    } catch (error: any) {
      Alert.alert("Reset Failed", error?.message || "Could not send password reset email.");
    } finally {
      setResetEmailSending(false);
    }
  };

  // ======================================================
  // LOGOUT
  // ======================================================
  const handleLogout = () => {
    confirmLogout("Are you sure you want to logout?");
  };

  if (loading) {
    return (
      <View style={styles.centerLoading}>
        <ActivityIndicator size="large" color="#5B3BA2" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* SCROLLABLE PROFILE CONTENT */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* PURPLE TOP HEADER */}
        <View style={styles.headerBanner}>
          <SafeAreaView edges={["top"]} style={styles.safeHeader}>
            <View style={[styles.responsiveInner, { maxWidth: 880, alignSelf: "center", width: "100%" }]}>
              {/* Top Branding Row */}
              <View style={styles.headerTopRow}>
                <View style={styles.logoRow}>
                  <Ionicons name="school" size={26} color="#FFFFFF" />
                  <Text style={styles.logoTitle}>Campusly</Text>
                </View>

                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <TouchableOpacity
                    style={styles.headerAiBtn}
                    onPress={() => router.push("/(tab)/ai-assistant")}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="sparkles" size={15} color="#FFFFFF" />
                    <Text style={styles.headerAiBtnText}>AI</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.settingsBtn}
                    onPress={() => router.push("/settings")}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="settings-outline" size={22} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>

              {/* Title & Subtitle */}
              <View style={styles.headerTextContainer}>
                <Text style={styles.headerTitle}>{t("profile", "Student Profile")}</Text>
                <Text style={styles.headerSubtitle}>Official Academic Identity & Campus Records</Text>
              </View>
            </View>
          </SafeAreaView>
        </View>

        {/* RESPONSIVE CONTAINER (MAX-WIDTH 880PX ON DESKTOP & TABLET) */}
        <View style={[styles.mainContentWrapper, { maxWidth: 880, width: "100%", alignSelf: "center" }]}>
          {/* HERO STUDENT ID CARD */}
          <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {/* ID Card Top Header Stripe */}
            <View style={[styles.idCardHeaderStripe, { backgroundColor: isDark ? "rgba(124,58,237,0.25)" : "#F5F3FF", borderBottomColor: colors.border }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="school" size={15} color="#7C3AED" />
                <Text style={styles.idCardHeaderTitle}>CAMPUSLY DIGITAL STUDENT ID</Text>
              </View>
              <View style={styles.verifiedStudentBadge}>
                <View style={styles.verifiedDot} />
                <Text style={styles.verifiedBadgeText}>VERIFIED STUDENT</Text>
              </View>
            </View>

            {/* ID Card Body */}
            <View style={styles.idCardBody}>
              <View style={styles.avatarRow}>
                {/* Avatar Container */}
                <View style={styles.avatarContainer}>
                  <View style={[styles.avatarCircle, { borderColor: colors.primary }]}>
                    {photoURL ? (
                      <Image source={{ uri: photoURL }} style={styles.avatarImage} />
                    ) : (
                      <View style={styles.avatarPlaceholder}>
                        <Ionicons name="person" size={42} color={colors.primary} />
                      </View>
                    )}
                  </View>

                  {/* Camera Overlay Icon */}
                  <TouchableOpacity
                    style={[styles.cameraBadge, { backgroundColor: colors.primary }]}
                    onPress={() => setPhotoModalVisible(true)}
                    activeOpacity={0.8}
                  >
                    {uploadingPhoto ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Ionicons name="camera" size={13} color="#FFFFFF" />
                    )}
                  </TouchableOpacity>
                </View>

                {/* User Details */}
                <View style={styles.heroDetails}>
                  <View style={styles.heroNameRow}>
                    <Text style={[styles.userName, { color: colors.text }]} numberOfLines={1}>
                      {name || "Student"}
                    </Text>
                  </View>

                  <Text style={[styles.userDegree, { color: colors.textSecondary }]}>
                    {degree || "B.Tech Student"} • {department || "Computer Science"}
                  </Text>

                  {/* Chips Row: Roll No & Sem */}
                  <View style={styles.chipsRow}>
                    <TouchableOpacity
                      style={[styles.rollBadge, { backgroundColor: isDark ? "rgba(124,58,237,0.2)" : "#EDE9FE" }]}
                      onPress={handleCopyRoll}
                      activeOpacity={0.7}
                    >
                      <Ionicons name="card-outline" size={12} color="#7C3AED" />
                      <Text style={[styles.rollBadgeText, { color: "#7C3AED" }]}>
                        {rollNo || "23CSE001"}
                      </Text>
                      <Ionicons name="copy-outline" size={11} color="#7C3AED" />
                    </TouchableOpacity>

                    <View style={[styles.metaChip, { backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9" }]}>
                      <Ionicons name="time-outline" size={12} color={colors.textSecondary} />
                      <Text style={[styles.metaChipText, { color: colors.textSecondary }]}>
                        {semester || "6th Sem"} ({section || "Sec A"})
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Quick Hero Action Buttons */}
              <View style={[styles.heroActionsRow, { borderTopColor: colors.border }]}>
                <TouchableOpacity
                  style={[styles.heroActionBtn, { backgroundColor: colors.primary }]}
                  onPress={openEditModal}
                  activeOpacity={0.8}
                >
                  <Ionicons name="pencil" size={13} color="#FFFFFF" />
                  <Text style={styles.heroActionBtnText}>Edit Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.heroActionBtnAlt, { backgroundColor: isDark ? "rgba(37,99,235,0.15)" : "#EFF6FF", borderColor: isDark ? "#1E3A8A" : "#BFDBFE" }]}
                  onPress={() => router.push("/branch-selection")}
                  activeOpacity={0.8}
                >
                  <Ionicons name="git-branch" size={13} color="#2563EB" />
                  <Text style={[styles.heroActionBtnTextAlt, { color: "#2563EB" }]}>Branch & Electives</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.heroActionBtnAlt, { backgroundColor: isDark ? "rgba(16,185,129,0.15)" : "#ECFDF5", borderColor: isDark ? "#065F46" : "#A7F3D0" }]}
                  onPress={() => router.push("/messages")}
                  activeOpacity={0.8}
                >
                  <Ionicons name="chatbubbles" size={13} color="#059669" />
                  <Text style={[styles.heroActionBtnTextAlt, { color: "#059669" }]}>Chat Faculty</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

        {/* LIVE ATTENDANCE & ACADEMIC STANDING CARD */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border, marginTop: 14 }]}>
          <View style={[styles.sectionHeaderRow, { borderBottomColor: colors.border, justifyContent: "space-between" }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="calendar" size={20} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("attendanceStanding", "Attendance & Standing")}</Text>
            </View>

            <View
              style={[
                styles.liveStatusBadge,
                {
                  backgroundColor:
                    lastAttendanceStatus === "Present"
                      ? "#DCFCE7"
                      : lastAttendanceStatus === "Absent"
                      ? "#FEE2E2"
                      : "#FEF3C7",
                },
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  {
                    backgroundColor:
                      lastAttendanceStatus === "Present"
                        ? "#16A34A"
                        : lastAttendanceStatus === "Absent"
                        ? "#DC2626"
                        : "#D97706",
                  },
                ]}
              />
              <Text
                style={[
                  styles.liveStatusBadgeText,
                  {
                    color:
                      lastAttendanceStatus === "Present"
                        ? "#16A34A"
                        : lastAttendanceStatus === "Absent"
                        ? "#DC2626"
                        : "#D97706",
                  },
                ]}
              >
                {lastAttendanceStatus}
              </Text>
            </View>
          </View>

          {/* Large percentage display + progress bar */}
          <View style={styles.attendanceMainRow}>
            <View>
              <Text style={[styles.attendanceRateValue, { color: colors.text }]}>
                {attendancePercentage}
              </Text>
              <Text style={[styles.attendanceRateSubtitle, { color: colors.textSecondary }]}>
                Attended: {classesAttended} / {totalClasses} classes
              </Text>
            </View>

            <View style={styles.attendanceTeacherBox}>
              <View style={styles.teacherVerifiedRow}>
                <Ionicons name="checkmark-circle" size={16} color="#2563EB" />
                <Text style={styles.teacherVerifiedLabel}>Teacher Verified</Text>
              </View>
              <Text style={[styles.teacherNameSmall, { color: colors.text }]} numberOfLines={1}>
                {lastAttendanceTeacher}
              </Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.profileProgressBg}>
            <View
              style={[
                styles.profileProgressFill,
                {
                  width: (attendancePercentage.includes("%")
                    ? attendancePercentage
                    : `${attendancePercentage}%`) as any,
                  backgroundColor:
                    parseInt(attendancePercentage, 10) >= 75
                      ? "#16A34A"
                      : parseInt(attendancePercentage, 10) >= 60
                      ? "#D97706"
                      : "#DC2626",
                },
              ]}
            />
          </View>

          {/* Details row: Subject & Date */}
          <View style={styles.attDetailsRow}>
            <Text style={[styles.attDetailsText, { color: colors.textSecondary }]}>
              Last session: <Text style={{ fontWeight: "700", color: colors.text }}>{lastAttendanceSubject}</Text> ({lastAttendanceDate})
            </Text>

            <TouchableOpacity
              style={styles.attHistoryLink}
              onPress={() => router.push("/attendance")}
            >
              <Text style={styles.attHistoryLinkText}>History</Text>
              <Ionicons name="chevron-forward" size={14} color="#2563EB" />
            </TouchableOpacity>
          </View>
        </View>

        {/* SECTION 1: ACADEMIC INFORMATION */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.sectionHeaderRow, { borderBottomColor: colors.border }]}>
            <Ionicons name="school" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("academicDetails", "Academic Information")}</Text>
          </View>

          <TouchableOpacity
            style={styles.infoRow}
            activeOpacity={0.7}
            onPress={() => router.push("/branch-selection")}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="git-branch-outline" size={19} color="#2563EB" />
              <Text style={styles.rowLabel}>Branch & Electives</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={[styles.rowValue, { color: "#2563EB", fontWeight: "700" }]} numberOfLines={1}>
                {department || "Choose Branch"}
              </Text>
              <Ionicons name="chevron-forward" size={17} color="#2563EB" />
            </View>
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={styles.infoRow}
            activeOpacity={0.7}
            onPress={openEditModal}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="business-outline" size={19} color="#5B3BA2" />
              <Text style={styles.rowLabel}>{t("department", "Department")}</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue} numberOfLines={1}>
                {department || "Computer Science & Engineering"}
              </Text>
              <Ionicons name="chevron-forward" size={17} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={styles.infoRow}
            activeOpacity={0.7}
            onPress={openEditModal}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="calendar-outline" size={19} color="#5B3BA2" />
              <Text style={styles.rowLabel}>{t("semester", "Semester")}</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{semester || "6th Semester"}</Text>
              <Ionicons name="chevron-forward" size={17} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={styles.infoRow}
            activeOpacity={0.7}
            onPress={openEditModal}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="people-outline" size={19} color="#5B3BA2" />
              <Text style={styles.rowLabel}>{t("section", "Section")}</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{section || "A"}</Text>
              <Ionicons name="chevron-forward" size={17} color="#94A3B8" />
            </View>
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          <TouchableOpacity
            style={styles.infoRow}
            activeOpacity={0.7}
            onPress={openEditModal}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="card-outline" size={19} color="#5B3BA2" />
              <Text style={styles.rowLabel}>{t("rollNo", "Roll Number")}</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowValue}>{rollNo || "23CSE001"}</Text>
              <Ionicons name="chevron-forward" size={17} color="#94A3B8" />
            </View>
          </TouchableOpacity>
        </View>

        {/* SECTION: CERTIFICATES & ACADEMIC ACHIEVEMENTS */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.sectionHeaderRow, { borderBottomColor: colors.border, justifyContent: "space-between" }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="ribbon" size={22} color="#D97706" />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("certificatesHonors", "Certificates & Honors")}</Text>
              <View style={[styles.certCountBadge, { backgroundColor: "#FEF3C7" }]}>
                <Text style={styles.certCountBadgeText}>{certificates.length}</Text>
              </View>
            </View>

            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <TouchableOpacity
                style={styles.issueCertHeaderBtn}
                onPress={() => router.push("/certificate" as any)}
              >
                <Ionicons name="open-outline" size={14} color="#7C3AED" />
                <Text style={styles.issueCertHeaderBtnText}>View All →</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Certificates List */}
          {certificates.length === 0 ? (
            <View style={{ padding: 24, alignItems: "center" }}>
              <Ionicons name="ribbon-outline" size={38} color={colors.textSecondary} />
              <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text, marginTop: 8 }}>
                No Certificates Awarded Yet
              </Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: "center", marginTop: 4 }}>
                Academic certificates and honors issued by your faculty or teachers will appear here automatically.
              </Text>
            </View>
          ) : (
            <View style={{ paddingVertical: 4 }}>
              {certificates.map((cert, index) => (
                <View key={cert.id}>
                  {index > 0 && <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />}
                  <TouchableOpacity
                    style={styles.certRowItem}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedCertificate(cert);
                      setCertificateViewModal(true);
                    }}
                  >
                    <View style={styles.certIconCircle}>
                      <Ionicons name="school" size={18} color="#D97706" />
                    </View>

                    <View style={{ flex: 1, marginLeft: 12 }}>
                      <Text style={[styles.certTitleText, { color: colors.text }]}>{cert.title}</Text>
                      <Text style={[styles.certSubText, { color: colors.primary }]}>{cert.subject}</Text>
                      <View style={styles.certMetaRow}>
                        <Ionicons name="checkmark-circle" size={13} color="#16A34A" />
                        <Text style={[styles.certIssuerText, { color: colors.textSecondary }]}>
                          {cert.issuedBy} • {cert.issueDate}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.viewCertPill}>
                      <Text style={styles.viewCertPillText}>View</Text>
                      <Ionicons name="chevron-forward" size={13} color="#7C3AED" />
                    </View>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* SECTION: MESSAGES (TEACHER & STUDENT CHAT) */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.sectionHeaderRow, { borderBottomColor: colors.border, justifyContent: "space-between" }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="chatbubbles" size={22} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("messages", "Messages")}</Text>
              <View style={[styles.certCountBadge, { backgroundColor: isDark ? "rgba(99,102,241,0.2)" : "#EEF2FF" }]}>
                <Text style={[styles.certCountBadgeText, { color: colors.primary }]}>
                  {connectedTeachers.length} {connectedTeachers.length === 1 ? "Teacher" : "Teachers"}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.issueCertHeaderBtn}
              onPress={() => router.push("/messages")}
            >
              <Ionicons name="chatbubble-ellipses-outline" size={14} color={colors.primary} />
              <Text style={[styles.issueCertHeaderBtnText, { color: colors.primary }]}>Open Chat →</Text>
            </TouchableOpacity>
          </View>

          <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 12, paddingHorizontal: 2 }}>
            Chat 1-on-1 with your professors, ask academic questions, share study notes, and get instant feedback.
          </Text>

          {/* Teacher list / Connect prompt */}
          {connectedTeachers.length === 0 ? (
            <View style={styles.emptyMessagesCard}>
              <View style={[styles.emptyMsgIconCircle, { backgroundColor: isDark ? "rgba(99,102,241,0.15)" : "#EEF2FF" }]}>
                <Ionicons name="chatbubbles-outline" size={32} color={colors.primary} />
              </View>
              <Text style={[styles.emptyMsgTitle, { color: colors.text }]}>Connect with your Professor</Text>
              <Text style={[styles.emptyMsgSubtitle, { color: colors.textSecondary }]}>
                Enter your teacher's code (e.g. TEACH-CSE-101) to unlock direct 1-on-1 messaging and doubt clearing.
              </Text>
              <TouchableOpacity
                style={[styles.connectTeacherBtn, { backgroundColor: colors.primary }]}
                onPress={() => setConnectTeacherModal(true)}
              >
                <Ionicons name="key-outline" size={16} color="#FFFFFF" />
                <Text style={styles.connectTeacherBtnText}>{t("connectTeacher", "Connect with Teacher")}</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {connectedTeachers.map((teacher: any, idx: number) => (
                <View
                  key={teacher.teacherId || idx}
                  style={[
                    styles.teacherChatCard,
                    {
                      backgroundColor: isDark ? colors.background : "#F8FAFC",
                      borderColor: colors.border,
                    },
                  ]}
                >
                  <View style={styles.teacherChatAvatarCircle}>
                    <Ionicons name="school" size={18} color="#FFFFFF" />
                  </View>
                  <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={[styles.teacherChatName, { color: colors.text }]} numberOfLines={1}>
                      {teacher.teacherName || "Professor"}
                    </Text>
                    <Text style={[styles.teacherChatSub, { color: colors.primary }]} numberOfLines={1}>
                      {teacher.subject || "Faculty"} • {teacher.department || "Academic"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.chatNowBtn, { backgroundColor: colors.primary }]}
                    onPress={() => router.push(`/messages?teacherId=${teacher.teacherId}` as any)}
                  >
                    <Ionicons name="chatbubble-ellipses" size={14} color="#FFFFFF" />
                    <Text style={styles.chatNowBtnText}>Chat</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                <TouchableOpacity
                  style={{ flexDirection: "row", alignItems: "center", gap: 6, paddingVertical: 6 }}
                  onPress={() => setConnectTeacherModal(true)}
                >
                  <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                  <Text style={{ fontSize: 12, fontWeight: "600", color: colors.primary }}>+ Connect Another Teacher</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{ flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 6 }}
                  onPress={() => router.push("/messages")}
                >
                  <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary }}>All Messages</Text>
                  <Ionicons name="arrow-forward" size={14} color={colors.primary} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* SECTION: SPECIAL NOTES & IMPORTANT QUESTIONS (READ-ONLY FOR STUDENTS) */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.sectionHeaderRow, { borderBottomColor: colors.border, justifyContent: "space-between" }]}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Ionicons name="document-text" size={22} color={colors.primary} />
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                {t("specialNotes", "Special Notes & Important Questions")}
              </Text>
              <View style={[styles.certCountBadge, { backgroundColor: isDark ? "rgba(99,102,241,0.2)" : "#EEF2FF" }]}>
                <Text style={[styles.certCountBadgeText, { color: colors.primary }]}>{specialNotes.length}</Text>
              </View>
            </View>

            <View style={{ backgroundColor: isDark ? "rgba(124,58,237,0.2)" : "#F5F3FF", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 }}>
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#7C3AED" }}>Faculty Notes</Text>
            </View>
          </View>

          <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 12, paddingHorizontal: 2 }}>
            {t("specialNotesSub", "Important questions, exam notes and revision tips posted by your faculty mentors.")}
          </Text>

          {/* Subject-Wise Filter Pills */}
          {uniqueNoteSubjects.length > 1 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginBottom: 10 }}
              contentContainerStyle={{ gap: 8, paddingHorizontal: 2 }}
            >
              {uniqueNoteSubjects.map((sub) => {
                const isSel = selectedNoteSubject === sub;
                const count = sub === "All" ? specialNotes.length : specialNotes.filter((n) => n.subject?.trim().toLowerCase() === sub.toLowerCase()).length;
                return (
                  <TouchableOpacity
                    key={sub}
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 6,
                      paddingHorizontal: 10,
                      paddingVertical: 5,
                      borderRadius: 14,
                      borderWidth: 1,
                      borderColor: isSel ? colors.primary : colors.border,
                      backgroundColor: isSel ? colors.primary : (isDark ? colors.surface : "#F1F5F9"),
                    }}
                    onPress={() => setSelectedNoteSubject(sub)}
                    activeOpacity={0.8}
                  >
                    <Text
                      style={{
                        fontSize: 11.5,
                        fontWeight: isSel ? "700" : "500",
                        color: isSel ? "#FFFFFF" : colors.text,
                      }}
                    >
                      {sub}
                    </Text>
                    <View
                      style={{
                        backgroundColor: isSel ? "rgba(255,255,255,0.25)" : (isDark ? "rgba(255,255,255,0.1)" : "#E2E8F0"),
                        paddingHorizontal: 5,
                        paddingVertical: 1,
                        borderRadius: 8,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 10,
                          fontWeight: "700",
                          color: isSel ? "#FFFFFF" : colors.textSecondary,
                        }}
                      >
                        {count}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          )}

          {notesLoading ? (
            <View style={{ paddingVertical: 18, alignItems: "center" }}>
              <ActivityIndicator size="small" color={colors.primary} />
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 6 }}>Loading special notes...</Text>
            </View>
          ) : displayedNotes.length === 0 ? (
            <View style={{ padding: 22, alignItems: "center" }}>
              <Ionicons name="document-text-outline" size={36} color={colors.textSecondary} />
              <Text style={{ fontSize: 13.5, fontWeight: "700", color: colors.text, marginTop: 6 }}>
                No Special Notes {selectedNoteSubject !== "All" ? `for ${selectedNoteSubject}` : "Posted Yet"}
              </Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: "center", marginTop: 2 }}>
                Important exam questions and formula sheets posted by your professors will appear here automatically.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 10 }}>
              {displayedNotes.map((note) => {
                const isHigh = note.priority === "High";
                const isMedium = note.priority === "Medium";
                return (
                  <TouchableOpacity
                    key={note.id}
                    style={{
                      backgroundColor: isDark ? colors.surface : "#F8FAFC",
                      borderWidth: 1,
                      borderColor: colors.border,
                      borderRadius: 12,
                      padding: 12,
                    }}
                    activeOpacity={0.7}
                    onPress={() => {
                      setSelectedNote(note);
                      setNoteViewModalVisible(true);
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <View style={{ flex: 1, marginRight: 8 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
                          <View
                            style={{
                              backgroundColor: isHigh ? "#FEE2E2" : isMedium ? "#FEF3C7" : "#E0E7FF",
                              paddingHorizontal: 7,
                              paddingVertical: 2,
                              borderRadius: 6,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 10.5,
                                fontWeight: "700",
                                color: isHigh ? "#DC2626" : isMedium ? "#D97706" : "#4F46E5",
                              }}
                            >
                              {note.priority || "Normal"} Priority
                            </Text>
                          </View>

                          <View style={{ backgroundColor: isDark ? "rgba(124,58,237,0.2)" : "#EDE9FE", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 6 }}>
                            <Text style={{ fontSize: 10.5, fontWeight: "700", color: "#7C3AED" }}>
                              {note.category || "Important Question"}
                            </Text>
                          </View>
                        </View>

                        <Text style={{ fontSize: 13.5, fontWeight: "700", color: colors.text }}>{note.title}</Text>

                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                          <Ionicons name="book-outline" size={13} color={colors.primary} />
                          <Text style={{ fontSize: 12, fontWeight: "600", color: colors.primary }}>
                            {note.subject}
                          </Text>
                          {Boolean(note.targetClass) && (
                            <Text style={{ fontSize: 11, color: colors.textSecondary }}>• {note.targetClass}</Text>
                          )}
                        </View>

                        <Text
                          style={{
                            fontSize: 12,
                            color: colors.textSecondary,
                            marginTop: 5,
                            lineHeight: 18,
                          }}
                          numberOfLines={2}
                        >
                          {note.content}
                        </Text>

                        {/* PHOTO THUMBNAIL (IF ATTACHED) */}
                        {Boolean(note.photoUrl) && (
                          <View style={{ marginTop: 8, borderRadius: 8, overflow: "hidden" }}>
                            <Image source={{ uri: note.photoUrl }} style={{ width: "100%", height: 120, borderRadius: 8 }} resizeMode="cover" />
                          </View>
                        )}

                        {/* PDF DOCUMENT BADGE (IF ATTACHED) */}
                        {Boolean(note.pdfUrl) && (
                          <TouchableOpacity
                            style={{
                              flexDirection: "row",
                              alignItems: "center",
                              backgroundColor: isDark ? "rgba(239,68,68,0.15)" : "#FEF2F2",
                              borderWidth: 1,
                              borderColor: isDark ? "#7F1D1D" : "#FCA5A5",
                              borderRadius: 8,
                              paddingHorizontal: 10,
                              paddingVertical: 7,
                              marginTop: 8,
                            }}
                            onPress={(e) => {
                              e.stopPropagation();
                              Linking.openURL(note.pdfUrl!).catch(() =>
                                Alert.alert("Error", "Could not open document link.")
                              );
                            }}
                          >
                            <Ionicons name="document-text" size={16} color="#DC2626" />
                            <Text style={{ fontSize: 11.5, fontWeight: "700", color: "#DC2626", marginLeft: 6, flex: 1 }} numberOfLines={1}>
                              {note.pdfName || "Exam_Notes_Document.pdf"}
                            </Text>
                            <Text style={{ fontSize: 11, fontWeight: "700", color: "#DC2626" }}>Open PDF →</Text>
                          </TouchableOpacity>
                        )}

                        <Text style={{ fontSize: 10.5, color: colors.textSecondary, marginTop: 6 }}>
                          By: {note.teacherName || "Faculty Mentor"}
                        </Text>
                      </View>

                      <View style={[styles.viewCertPill, { marginTop: 4 }]}>
                        <Text style={styles.viewCertPillText}>View</Text>
                        <Ionicons name="chevron-forward" size={13} color="#7C3AED" />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          )}
        </View>

        {/* SECTION 2: PERSONAL INFORMATION */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.sectionHeaderRow, { borderBottomColor: colors.border }]}>
            <Ionicons name="person-circle" size={22} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("personalInfo", "Personal Information")}</Text>
          </View>

          <TouchableOpacity
            style={styles.infoRow}
            activeOpacity={0.7}
            onPress={openEditModal}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="person-outline" size={19} color={colors.primary} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>{t("fullName", "Full Name")}</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={[styles.rowValue, { color: colors.textSecondary }]}>{name || "Student"}</Text>
              <Ionicons name="pencil-outline" size={17} color={colors.primary} />
            </View>
          </TouchableOpacity>

          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

          <View style={styles.infoRow}>
            <View style={styles.rowLeft}>
              <Ionicons name="mail-outline" size={19} color={colors.primary} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>{t("email", "Email")}</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={[styles.rowValue, { color: colors.textSecondary }]} numberOfLines={1}>
                {email || "tdebuggers0@gmail.com"}
              </Text>
              <Ionicons name="chevron-forward" size={17} color={colors.textSecondary} />
            </View>
          </View>

          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.infoRow}
            activeOpacity={0.7}
            onPress={openEditModal}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="call-outline" size={19} color={colors.primary} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>{t("phoneNumber", "Phone Number")}</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={[styles.rowValue, { color: colors.textSecondary }]}>
                {phoneNumber || "+91 98765 43210"}
              </Text>
              <Ionicons name="pencil-outline" size={17} color={colors.primary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* SECTION 3: ACCOUNT */}
        <View style={[styles.sectionCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={[styles.sectionHeaderRow, { borderBottomColor: colors.border }]}>
            <Ionicons name="settings" size={20} color={colors.primary} />
            <Text style={[styles.sectionTitle, { color: colors.text }]}>{t("account", "Account")}</Text>
          </View>

          <TouchableOpacity
            style={styles.infoRow}
            activeOpacity={0.7}
            onPress={() => router.push("/messages")}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="chatbubbles-outline" size={19} color={colors.primary} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>{t("messages", "Messages")}</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={{ color: colors.primary, fontWeight: "600", fontSize: 13 }}>Chat with Teachers</Text>
              <Ionicons name="chevron-forward" size={17} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.infoRow}
            activeOpacity={0.7}
            onPress={() => router.push("/(tab)/ai-assistant")}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="sparkles" size={19} color="#7C3AED" />
              <Text style={[styles.rowLabel, { color: colors.text }]}>{t("aiAssistant", "Campusly AI Assistant")}</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={{ color: "#7C3AED", fontWeight: "600", fontSize: 13 }}>Chat Now</Text>
              <Ionicons name="chevron-forward" size={17} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.infoRow}
            activeOpacity={0.7}
            onPress={() => setPasswordModalVisible(true)}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="lock-closed-outline" size={19} color={colors.primary} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>{t("changePassword", "Change Password")}</Text>
            </View>
            <View style={styles.rowRight}>
              <Ionicons name="chevron-forward" size={17} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.infoRow}
            activeOpacity={0.7}
            onPress={() => router.push("/settings")}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="globe-outline" size={19} color={colors.primary} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>{t("language", "Language")}</Text>
            </View>
            <View style={styles.rowRight}>
              <Ionicons name="chevron-forward" size={17} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>

          <View style={[styles.rowDivider, { backgroundColor: colors.border }]} />

          <TouchableOpacity
            style={styles.infoRow}
            activeOpacity={0.7}
            onPress={() => router.push("/settings")}
          >
            <View style={styles.rowLeft}>
              <Ionicons name="color-palette-outline" size={19} color={colors.primary} />
              <Text style={[styles.rowLabel, { color: colors.text }]}>{t("theme", "Theme")}</Text>
            </View>
            <View style={styles.rowRight}>
              <Ionicons name="chevron-forward" size={17} color={colors.textSecondary} />
            </View>
          </TouchableOpacity>
        </View>

        {/* ACTION BUTTONS */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.editProfileBtn, { backgroundColor: colors.primary }]}
            onPress={openEditModal}
            activeOpacity={0.85}
          >
            <Ionicons name="pencil" size={17} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.editProfileBtnText}>{t("editProfile", "Edit Profile")}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.logoutBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={handleLogout}
            activeOpacity={0.8}
          >
            <Ionicons name="log-out-outline" size={18} color="#EF4444" style={{ marginRight: 8 }} />
            <Text style={styles.logoutBtnText}>{t("logout", "Logout")}</Text>
          </TouchableOpacity>
        </View>
      </View>
      </ScrollView>

      {/* ====================================================== */}
      {/* EDIT PROFILE MODAL */}
      {/* ====================================================== */}
      <Modal
        visible={editModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setEditModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Student Profile</Text>
              <TouchableOpacity
                onPress={() => setEditModalVisible(false)}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={styles.modalForm}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Full Name</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={formName}
                onChangeText={setFormName}
                placeholder="Enter full name"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>Designation / Degree</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={formDegree}
                onChangeText={setFormDegree}
                placeholder="e.g. B.Tech Student"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>Roll Number</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={formRollNo}
                onChangeText={setFormRollNo}
                placeholder="e.g. 23CSE001"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>Department</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={formDepartment}
                onChangeText={setFormDepartment}
                placeholder="e.g. Computer Science & Engineering"
                placeholderTextColor={colors.textMuted}
              />

              <View style={styles.inputRow}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Semester</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                    value={formSemester}
                    onChangeText={setFormSemester}
                    placeholder="e.g. 6th Semester"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>

                <View style={{ flex: 1, marginLeft: 8 }}>
                  <Text style={[styles.inputLabel, { color: colors.text }]}>Section</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                    value={formSection}
                    onChangeText={setFormSection}
                    placeholder="e.g. A"
                    placeholderTextColor={colors.textMuted}
                  />
                </View>
              </View>

              <Text style={[styles.inputLabel, { color: colors.text }]}>Phone Number</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={formPhone}
                onChangeText={setFormPhone}
                placeholder="+91 98765 43210"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>College / University</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={formCollege}
                onChangeText={setFormCollege}
                placeholder="College name"
                placeholderTextColor={colors.textMuted}
              />

              <View style={{ height: 16 }} />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.surface }]}
                onPress={() => setEditModalVisible(false)}
                disabled={saving}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>{t("cancel", "Cancel")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveProfile}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>{t("save", "Save Changes")}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ====================================================== */}
      {/* PHOTO CHOOSER MODAL */}
      {/* ====================================================== */}
      <Modal
        visible={photoModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setPhotoModalVisible(false)}
      >
        <Pressable
          style={styles.pickerOverlay}
          onPress={() => setPhotoModalVisible(false)}
        >
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>Update Profile Photo</Text>
            <Text style={styles.pickerSubtitle}>
              Select an option to update your photo
            </Text>

            <TouchableOpacity
              style={styles.pickerOption}
              onPress={chooseFromGallery}
            >
              <Ionicons name="images-outline" size={22} color="#5B3BA2" />
              <Text style={styles.pickerOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.pickerOption}
              onPress={takePhoto}
            >
              <Ionicons name="camera-outline" size={22} color="#5B3BA2" />
              <Text style={styles.pickerOptionText}>Take a Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.pickerOption, { borderBottomWidth: 0 }]}
              onPress={() => setPhotoModalVisible(false)}
            >
              <Ionicons name="close-circle-outline" size={22} color="#64748B" />
              <Text style={[styles.pickerOptionText, { color: "#64748B" }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* ====================================================== */}
      {/* CHANGE PASSWORD MODAL */}
      {/* ====================================================== */}
      <Modal
        visible={passwordModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setPasswordModalVisible(false)}
      >
        <Pressable
          style={styles.pickerOverlay}
          onPress={() => setPasswordModalVisible(false)}
        >
          <View style={styles.pickerCard}>
            <Text style={styles.pickerTitle}>Change Password</Text>
            <Text style={styles.pickerSubtitle}>
              We will send a secure password reset link to:
            </Text>

            <View style={styles.emailPill}>
              <Ionicons name="mail" size={16} color="#5B3BA2" />
              <Text style={styles.emailPillText}>{email || "your registered email"}</Text>
            </View>

            <TouchableOpacity
              style={styles.sendResetBtn}
              onPress={handlePasswordReset}
              disabled={resetEmailSending}
            >
              {resetEmailSending ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.sendResetBtnText}>Send Reset Email</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={{ marginTop: 12, padding: 8, alignItems: "center" }}
              onPress={() => setPasswordModalVisible(false)}
            >
              <Text style={{ color: "#64748B", fontWeight: "600" }}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

      {/* ====================================================== */}
      {/* FULL OFFICIAL CERTIFICATE VIEW MODAL */}
      {/* ====================================================== */}
      <Modal
        visible={certificateViewModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setCertificateViewModal(false)}
      >
        <Pressable
          style={styles.parchmentModalOverlay}
          onPress={() => setCertificateViewModal(false)}
        >
          <Pressable style={styles.parchmentCertificateCard} onPress={(e) => e.stopPropagation()}>
            <View style={styles.goldBorderFrame}>
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ padding: 16, alignItems: "center" }}>
                {/* Close Button top-right */}
                <TouchableOpacity
                  style={styles.certCloseBtn}
                  onPress={() => setCertificateViewModal(false)}
                >
                  <Ionicons name="close" size={20} color="#78350F" />
                </TouchableOpacity>

                {/* University Emblem & Header */}
                <View style={styles.certEmblemBox}>
                  <Ionicons name="ribbon" size={32} color="#D97706" />
                </View>
                <Text style={styles.certUnivTitle}>CAMPUSLY UNIVERSITY</Text>
                <Text style={styles.certUnivSub}>ACCREDITED ACADEMIC AUTHORITY • FACULTY OF ENGINEERING</Text>

                <View style={styles.certGoldDivider} />

                {/* Certificate Title */}
                <Text style={styles.certMainHeading}>OFFICIAL CERTIFICATE OF MERIT</Text>
                <Text style={styles.certAwardedText}>THIS DISTINCTION IS PROUDLY CONFERRED UPON</Text>

                {/* Student Name */}
                <Text style={styles.certStudentNameText}>
                  {selectedCertificate?.studentName || name || "Student"}
                </Text>

                <Text style={styles.certRollDeptText}>
                  Roll No: <Text style={{ fontWeight: "700" }}>{selectedCertificate?.studentRollNo || rollNo}</Text> • {department}
                </Text>

                <Text style={styles.certForText}>
                  In recognition of exemplary academic performance, dedication, and mastery demonstrated in
                </Text>

                {/* Course Title & Grade */}
                <Text style={styles.certHonorTitle}>{selectedCertificate?.title}</Text>
                <View style={styles.certSubjectBadge}>
                  <Text style={styles.certSubjectBadgeText}>{selectedCertificate?.subject}</Text>
                </View>

                <View style={styles.certGradeHighlight}>
                  <Ionicons name="star" size={14} color="#D97706" />
                  <Text style={styles.certGradeHighlightText}>{selectedCertificate?.grade}</Text>
                  <Ionicons name="star" size={14} color="#D97706" />
                </View>

                <Text style={styles.certDescBody}>{selectedCertificate?.description}</Text>

                {/* Signatures & Credentials Row */}
                <View style={styles.certSignaturesRow}>
                  {/* Left: Credential ID & Date */}
                  <View style={styles.certSignatureCol}>
                    <Text style={styles.certCredIdText}>
                      ID: {selectedCertificate?.credentialId}
                    </Text>
                    <Text style={styles.certDateText}>Issued: {selectedCertificate?.issueDate}</Text>
                    <View style={styles.verifiedStampBox}>
                      <Ionicons name="checkmark-circle" size={12} color="#16A34A" />
                      <Text style={styles.verifiedStampText}>FACULTY VERIFIED</Text>
                    </View>
                  </View>

                  {/* Right: Authorized Teacher Signature */}
                  <View style={[styles.certSignatureCol, { alignItems: "flex-end" }]}>
                    <Text style={styles.teacherCursiveSig}>
                      {selectedCertificate?.issuedBy || "Prof. Ganesh Sharma"}
                    </Text>
                    <View style={styles.certSigLine} />
                    <Text style={styles.certSigLabel}>{selectedCertificate?.issuedBy}</Text>
                    <Text style={styles.certSigSub}>{selectedCertificate?.issuerTitle || "Class Mentor"}</Text>
                  </View>
                </View>

                {/* Action Buttons */}
                <View style={styles.certActionBtnRow}>
                  <TouchableOpacity
                    style={[styles.certDownloadBtn, { backgroundColor: colors.primary }]}
                    onPress={() => {
                      Alert.alert(
                        "Certificate Downloaded! 📄",
                        `Official verified PDF for "${selectedCertificate?.title}" has been saved to your device.`
                      );
                    }}
                  >
                    <Ionicons name="download-outline" size={16} color="#FFFFFF" />
                    <Text style={styles.certDownloadBtnText}>Download PDF</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.certShareBtn}
                    onPress={() => {
                      Alert.alert(
                        "Credential Copied! 🔗",
                        `Verification link for Credential ${selectedCertificate?.credentialId} has been copied.`
                      );
                    }}
                  >
                    <Ionicons name="share-social-outline" size={16} color="#78350F" />
                    <Text style={styles.certShareBtnText}>Share</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ====================================================== */}
      {/* READ-ONLY SPECIAL NOTE PREVIEW MODAL FOR STUDENT */}
      {/* ====================================================== */}
      <Modal
        visible={noteViewModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setNoteViewModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setNoteViewModalVisible(false)}
        >
          <Pressable
            style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border, maxWidth: 560 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={[styles.certIconCircle, { backgroundColor: isDark ? "rgba(99,102,241,0.2)" : "#EEF2FF" }]}>
                  <Ionicons name="document-text" size={20} color={colors.primary} />
                </View>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.text, fontSize: 16 }]}>
                    Faculty Note & Questions
                  </Text>
                  <Text style={{ fontSize: 11.5, color: colors.textSecondary }}>
                    Read-Only Access • Published by Faculty
                  </Text>
                </View>
              </View>

              <TouchableOpacity onPress={() => setNoteViewModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {selectedNote && (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480, marginTop: 10 }}>
                {/* Priority & Category Badges */}
                <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                  <View
                    style={{
                      backgroundColor:
                        selectedNote.priority === "High"
                          ? "#FEE2E2"
                          : selectedNote.priority === "Medium"
                          ? "#FEF3C7"
                          : "#E0E7FF",
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "700",
                        color:
                          selectedNote.priority === "High"
                            ? "#DC2626"
                            : selectedNote.priority === "Medium"
                            ? "#D97706"
                            : "#4F46E5",
                      }}
                    >
                      {selectedNote.priority || "Normal"} Priority
                    </Text>
                  </View>

                  <View
                    style={{
                      backgroundColor: isDark ? "rgba(124,58,237,0.2)" : "#EDE9FE",
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 6,
                    }}
                  >
                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#7C3AED" }}>
                      {selectedNote.category || "Important Question"}
                    </Text>
                  </View>
                </View>

                {/* Note Title */}
                <Text style={{ fontSize: 18, fontWeight: "800", color: colors.text, marginBottom: 8 }}>
                  {selectedNote.title}
                </Text>

                {/* Subject & Target Class */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    backgroundColor: isDark ? colors.surface : "#F1F5F9",
                    padding: 10,
                    borderRadius: 10,
                    marginBottom: 14,
                  }}
                >
                  <Ionicons name="school" size={16} color={colors.primary} />
                  <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text }}>
                    {selectedNote.subject}
                  </Text>
                  {Boolean(selectedNote.targetClass) && (
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>• {selectedNote.targetClass}</Text>
                  )}
                </View>

                {/* Content Area */}
                <View
                  style={{
                    backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: 12,
                    padding: 14,
                    marginBottom: 14,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 13.5,
                      color: colors.text,
                      lineHeight: 22,
                    }}
                    selectable
                  >
                    {selectedNote.content}
                  </Text>
                </View>

                {/* Attached Photo / Diagram */}
                {Boolean(selectedNote.photoUrl) && (
                  <View style={{ marginBottom: 14, borderRadius: 10, overflow: "hidden", borderWidth: 1, borderColor: colors.border }}>
                    <Image source={{ uri: selectedNote.photoUrl }} style={{ width: "100%", height: 200 }} resizeMode="cover" />
                    {Boolean(selectedNote.photoName) && (
                      <View style={{ padding: 8, backgroundColor: isDark ? colors.surface : "#F1F5F9" }}>
                        <Text style={{ fontSize: 11, color: colors.textSecondary }}>📷 {selectedNote.photoName}</Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Attached PDF Document */}
                {Boolean(selectedNote.pdfUrl) && (
                  <TouchableOpacity
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      backgroundColor: isDark ? "rgba(239,68,68,0.15)" : "#FEF2F2",
                      borderWidth: 1,
                      borderColor: isDark ? "#7F1D1D" : "#FCA5A5",
                      borderRadius: 10,
                      padding: 12,
                      marginBottom: 14,
                    }}
                    onPress={() => {
                      Linking.openURL(selectedNote.pdfUrl!).catch(() =>
                        Alert.alert("Error", "Could not open document link.")
                      );
                    }}
                  >
                    <View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center" }}>
                      <Ionicons name="document-text" size={20} color="#DC2626" />
                    </View>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text }} numberOfLines={1}>
                        {selectedNote.pdfName || "Exam_Notes_Document.pdf"}
                      </Text>
                      <Text style={{ fontSize: 11, color: "#DC2626", marginTop: 2 }}>Tap to View / Download PDF Document</Text>
                    </View>
                    <View style={{ backgroundColor: "#FEE2E2", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6, flexDirection: "row", alignItems: "center", gap: 4 }}>
                      <Text style={{ fontSize: 11.5, fontWeight: "700", color: "#DC2626" }}>Open</Text>
                      <Ionicons name="open-outline" size={13} color="#DC2626" />
                    </View>
                  </TouchableOpacity>
                )}

                {/* Teacher Details */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                    paddingVertical: 8,
                    borderTopWidth: 1,
                    borderTopColor: colors.border,
                  }}
                >
                  <Ionicons name="person-circle" size={24} color={colors.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 12.5, fontWeight: "700", color: colors.text }}>
                      {selectedNote.teacherName || "Faculty Mentor"}
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>
                      Academic Faculty • Verified Teacher
                    </Text>
                  </View>
                </View>

                {/* Read-only Security Banner */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 6,
                    backgroundColor: isDark ? "rgba(99,102,241,0.15)" : "#EEF2FF",
                    padding: 10,
                    borderRadius: 8,
                    marginTop: 8,
                  }}
                >
                  <Ionicons name="shield-checkmark" size={15} color={colors.primary} />
                  <Text style={{ fontSize: 11, color: colors.primary, flex: 1 }}>
                    Read-only: Students cannot update or delete faculty notes.
                  </Text>
                </View>
              </ScrollView>
            )}

            <TouchableOpacity
              style={[styles.sendResetBtn, { backgroundColor: colors.primary, marginTop: 14 }]}
              onPress={() => setNoteViewModalVisible(false)}
            >
              <Text style={styles.sendResetBtnText}>Close</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ====================================================== */}
      {/* ISSUE / UPDATE CERTIFICATE MODAL (TEACHER / ADMIN) */}
      {/* ====================================================== */}
      <Modal
        visible={issueCertificateModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIssueCertificateModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setIssueCertificateModal(false)}
        >
          <Pressable
            style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Issue Student Certificate</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                  Award official credential saved to student's profile & Firebase
                </Text>
              </View>
              <TouchableOpacity onPress={() => setIssueCertificateModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Certificate Title *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={certTitle}
                onChangeText={setCertTitle}
                placeholder="e.g. Certificate of Academic Excellence"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 10 }]}>Subject / Course Domain *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={certSubject}
                onChangeText={setCertSubject}
                placeholder="e.g. Data Structures & Algorithms Mastery"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 10 }]}>Student Name</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={certStudentName}
                onChangeText={setCertStudentName}
                placeholder={name || "Student Full Name"}
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 10 }]}>Student Roll Number</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={certRollNo}
                onChangeText={setCertRollNo}
                placeholder={rollNo || "23CSE001"}
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 10 }]}>Grade / Honors</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={certGrade}
                onChangeText={setCertGrade}
                placeholder="e.g. Grade A+ (94%) • First Class with Distinction"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 10 }]}>Issuing Faculty / Teacher Name</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={certTeacher}
                onChangeText={setCertTeacher}
                placeholder="e.g. Prof. Ganesh Sharma"
                placeholderTextColor={colors.textMuted}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.surface }]}
                onPress={() => setIssueCertificateModal(false)}
                disabled={savingCert}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveCertificate}
                disabled={savingCert}
              >
                {savingCert ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Award Certificate</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ====================================================== */}
      {/* CONNECT WITH TEACHER MODAL */}
      {/* ====================================================== */}
      <Modal
        visible={connectTeacherModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setConnectTeacherModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setConnectTeacherModal(false)}
        >
          <Pressable
            style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Connect with Teacher</Text>
                <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                  Enter Teacher ID & password given by your professor
                </Text>
              </View>
              <TouchableOpacity onPress={() => setConnectTeacherModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Demo Chip */}
            <TouchableOpacity
              style={[styles.quickDemoChip, { backgroundColor: colors.primaryLight, borderColor: colors.border }]}
              onPress={() => {
                setTeacherCodeInput("TEACH-CSE-101");
                setTeacherPasswordInput("123");
              }}
            >
              <Text style={{ fontSize: 12, fontWeight: "700", color: colors.primary }}>
                💡 Tap to Auto-Fill Demo Teacher:
              </Text>
              <Text style={{ fontSize: 11.5, color: colors.text, marginTop: 2 }}>
                ID: <Text style={{ fontWeight: "700" }}>TEACH-CSE-101</Text> • Password: <Text style={{ fontWeight: "700" }}>123</Text>
              </Text>
            </TouchableOpacity>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Teacher ID *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
              value={teacherCodeInput}
              onChangeText={setTeacherCodeInput}
              placeholder="e.g. TEACH-CSE-101"
              placeholderTextColor={colors.textMuted}
              autoCapitalize="characters"
            />

            <Text style={[styles.inputLabel, { color: colors.text, marginTop: 10 }]}>Password *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
              value={teacherPasswordInput}
              onChangeText={setTeacherPasswordInput}
              placeholder="Enter password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
            />

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.surface }]}
                onPress={() => setConnectTeacherModal(false)}
                disabled={connectingTeacher}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                onPress={handleConnectTeacher}
                disabled={connectingTeacher}
              >
                {connectingTeacher ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>Connect Teacher</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  centerLoading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },

  /* HEADER BANNER */
  headerBanner: {
    backgroundColor: "#4C268F",
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    paddingBottom: 28,
  },
  responsiveInner: {
    width: "100%",
  },
  mainContentWrapper: {
    width: "100%",
  },
  safeHeader: {
    paddingHorizontal: 16,
    paddingTop: Platform.OS === "android" ? 10 : 4,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
    marginLeft: 6,
    letterSpacing: 0.2,
  },
  settingsBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255, 255, 255, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerAiBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    gap: 4,
  },
  headerAiBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  headerTextContainer: {
    marginTop: 10,
  },
  headerTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
  },
  headerSubtitle: {
    color: "#D8B4FE",
    fontSize: 11.5,
    marginTop: 2,
    fontWeight: "400",
  },

  /* SCROLL VIEW */
  scrollContent: {
    paddingBottom: 70,
  },

  /* HERO USER CARD (DIGITAL STUDENT ID) */
  heroCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 12,
    marginTop: -20,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#EEF2F6",
    shadowColor: "#2A174E",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 4,
    zIndex: 10,
  },
  idCardHeaderStripe: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderBottomWidth: 1,
  },
  idCardHeaderTitle: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    color: "#6D28D9",
  },
  verifiedStudentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  verifiedDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#16A34A",
  },
  verifiedBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#16A34A",
    letterSpacing: 0.3,
  },
  idCardBody: {
    padding: 12,
  },
  avatarRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    position: "relative",
  },
  avatarCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#EDE9FE",
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#F3E8FF",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarPlaceholder: {
    width: "100%",
    height: "100%",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F3E8FF",
  },
  cameraBadge: {
    position: "absolute",
    bottom: -1,
    right: -1,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#5B3BA2",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FFFFFF",
  },
  heroDetails: {
    flex: 1,
    marginLeft: 12,
  },
  heroNameRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userName: {
    fontSize: 16.5,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.2,
  },
  rollBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  rollBadgeText: {
    color: "#5B3BA2",
    fontSize: 10.5,
    fontWeight: "800",
  },
  userDegree: {
    fontSize: 11.5,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "500",
  },
  chipsRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 6,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  metaChipText: {
    fontSize: 10,
    fontWeight: "600",
  },
  heroActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: 1,
    flexWrap: "wrap",
  },
  heroActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  heroActionBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  heroActionBtnAlt: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
  },
  heroActionBtnTextAlt: {
    fontSize: 11,
    fontWeight: "700",
  },
  userEmailRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 5,
  },
  userEmailText: {
    fontSize: 11.5,
    color: "#475569",
    marginLeft: 5,
    fontWeight: "500",
    flex: 1,
  },

  /* SECTION CARDS */
  sectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    marginHorizontal: 12,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#EEF2F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
    marginLeft: 8,
  },
  /* ATTENDANCE CARD STYLES */
  liveStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
  },
  statusDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  liveStatusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  attendanceMainRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 8,
  },
  attendanceRateValue: {
    fontSize: 22,
    fontWeight: "900",
    color: "#0F172A",
    letterSpacing: -0.3,
  },
  attendanceRateSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  attendanceTeacherBox: {
    alignItems: "flex-end",
  },
  teacherVerifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  teacherVerifiedLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2563EB",
  },
  teacherNameSmall: {
    fontSize: 11,
    fontWeight: "600",
    color: "#334155",
    marginTop: 2,
    maxWidth: 150,
  },
  profileProgressBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#F1F5F9",
    overflow: "hidden",
    marginVertical: 4,
  },
  profileProgressFill: {
    height: "100%",
    borderRadius: 3,
  },
  attDetailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  attDetailsText: {
    fontSize: 11,
    color: "#64748B",
  },
  attHistoryLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  attHistoryLinkText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },
  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  rowLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  rowLabel: {
    fontSize: 12.5,
    color: "#334155",
    fontWeight: "500",
    marginLeft: 8,
  },
  rowRight: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    maxWidth: "58%",
  },
  rowValue: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "500",
    marginRight: 6,
    textAlign: "right",
  },
  rowDivider: {
    height: 1,
    backgroundColor: "#F8FAFC",
  },

  /* ACTION BUTTONS */
  actionsContainer: {
    marginTop: 14,
    marginHorizontal: 12,
    marginBottom: 20,
  },
  editProfileBtn: {
    backgroundColor: "#5832A8",
    height: 40,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#5832A8",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 2,
  },
  editProfileBtnText: {
    color: "#FFFFFF",
    fontSize: 13.5,
    fontWeight: "700",
  },
  logoutBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    height: 38,
    borderRadius: 10,
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  logoutBtnText: {
    color: "#EF4444",
    fontSize: 13,
    fontWeight: "700",
  },

  /* EDIT MODAL */
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "88%",
    paddingBottom: Platform.OS === "ios" ? 24 : 12,
  },
  modalCard: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "88%",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === "ios" ? 24 : 14,
    width: "100%",
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  modalTitle: {
    fontSize: 15.5,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalForm: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 4,
    marginTop: 8,
  },
  textInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#0F172A",
  },
  inputRow: {
    flexDirection: "row",
  },
  modalFooter: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
  },
  cancelBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  cancelBtnText: {
    color: "#475569",
    fontSize: 13,
    fontWeight: "600",
  },
  saveBtn: {
    flex: 1.5,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#5832A8",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  /* PICKER MODAL (PHOTO / PASSWORD) */
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  pickerCard: {
    backgroundColor: "#FFFFFF",
    width: "100%",
    maxWidth: 340,
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  pickerTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 3,
  },
  pickerSubtitle: {
    fontSize: 11.5,
    color: "#64748B",
    textAlign: "center",
    marginBottom: 12,
  },
  pickerOption: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  pickerOptionText: {
    fontSize: 13.5,
    fontWeight: "600",
    color: "#1E293B",
    marginLeft: 10,
  },
  emailPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 14,
  },
  emailPillText: {
    color: "#5B3BA2",
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
  },
  sendResetBtn: {
    backgroundColor: "#5832A8",
    width: "100%",
    height: 38,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  sendResetBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  /* CERTIFICATES & HONORS SECTION */
  certCountBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  certCountBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#D97706",
  },
  issueCertHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#F3EEFD",
  },
  issueCertHeaderBtnText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#7C3AED",
  },
  certRowItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  certIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  certTitleText: {
    fontSize: 12.5,
    fontWeight: "800",
  },
  certSubText: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 1,
  },
  certMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  certIssuerText: {
    fontSize: 10,
  },
  viewCertPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: "#F3EEFD",
    gap: 2,
  },
  viewCertPillText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#7C3AED",
  },

  /* OFFICIAL PARCHMENT CERTIFICATE MODAL */
  parchmentModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
  },
  parchmentCertificateCard: {
    width: "100%",
    maxWidth: 440,
    maxHeight: "92%",
    backgroundColor: "#FFFDF7",
    borderRadius: 14,
    overflow: "hidden",
    elevation: 8,
  },
  goldBorderFrame: {
    margin: 6,
    borderWidth: 1.5,
    borderColor: "#D97706",
    borderRadius: 10,
    backgroundColor: "#FFFDF7",
  },
  certCloseBtn: {
    alignSelf: "flex-end",
    padding: 5,
    borderRadius: 12,
    backgroundColor: "#FEF3C7",
  },
  certEmblemBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "#FBBF24",
    marginBottom: 4,
  },
  certUnivTitle: {
    fontSize: 14,
    fontWeight: "900",
    color: "#78350F",
    letterSpacing: 0.8,
  },
  certUnivSub: {
    fontSize: 8.5,
    fontWeight: "700",
    color: "#B45309",
    letterSpacing: 0.4,
    marginTop: 1,
    textAlign: "center",
  },
  certGoldDivider: {
    width: "60%",
    height: 1.5,
    backgroundColor: "#FBBF24",
    marginVertical: 8,
  },
  certMainHeading: {
    fontSize: 12.5,
    fontWeight: "800",
    color: "#78350F",
    letterSpacing: 0.6,
  },
  certAwardedText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#92400E",
    letterSpacing: 0.4,
    marginTop: 2,
    marginBottom: 6,
  },
  certStudentNameText: {
    fontSize: 18,
    fontWeight: "900",
    color: "#1E1B4B",
    textDecorationLine: "underline",
    textAlign: "center",
  },
  certRollDeptText: {
    fontSize: 10.5,
    color: "#475569",
    marginTop: 2,
  },
  certForText: {
    fontSize: 10,
    color: "#64748B",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 6,
    paddingHorizontal: 12,
  },
  certHonorTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 4,
    textAlign: "center",
  },
  certSubjectBadge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 5,
    marginTop: 4,
  },
  certSubjectBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#4F46E5",
  },
  certGradeHighlight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 6,
    marginTop: 6,
  },
  certGradeHighlightText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#92400E",
  },
  certDescBody: {
    fontSize: 10.5,
    color: "#475569",
    textAlign: "center",
    marginTop: 6,
    paddingHorizontal: 10,
    lineHeight: 15,
  },
  certSignaturesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#FDE68A",
    paddingTop: 10,
  },
  certSignatureCol: {
    flex: 1,
  },
  certCredIdText: {
    fontSize: 8.5,
    fontWeight: "700",
    color: "#64748B",
  },
  certDateText: {
    fontSize: 9,
    color: "#64748B",
    marginTop: 1,
  },
  verifiedStampBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: 4,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  verifiedStampText: {
    fontSize: 8,
    fontWeight: "800",
    color: "#16A34A",
    letterSpacing: 0.4,
  },
  teacherCursiveSig: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1E1B4B",
    fontStyle: "italic",
  },
  certSigLine: {
    width: 100,
    height: 1,
    backgroundColor: "#94A3B8",
    marginVertical: 2,
  },
  certSigLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: "#0F172A",
  },
  certSigSub: {
    fontSize: 8.5,
    color: "#64748B",
  },
  certActionBtnRow: {
    flexDirection: "row",
    gap: 8,
    width: "100%",
    marginTop: 12,
  },
  certDownloadBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    gap: 5,
  },
  certDownloadBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  certShareBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#FEF3C7",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  certShareBtnText: {
    color: "#78350F",
    fontSize: 12,
    fontWeight: "700",
  },

  /* MESSAGES CARD STYLES */
  emptyMessagesCard: {
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 10,
  },
  emptyMsgIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  emptyMsgTitle: {
    fontSize: 13.5,
    fontWeight: "800",
    marginBottom: 3,
    textAlign: "center",
  },
  emptyMsgSubtitle: {
    fontSize: 11.5,
    textAlign: "center",
    lineHeight: 16,
    marginBottom: 10,
    maxWidth: 280,
  },
  connectTeacherBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  connectTeacherBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  teacherChatCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  teacherChatAvatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#6366F1",
    alignItems: "center",
    justifyContent: "center",
  },
  teacherChatName: {
    fontSize: 13,
    fontWeight: "700",
  },
  teacherChatSub: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 1,
  },
  chatNowBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  chatNowBtnText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  quickDemoChip: {
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
  },
});