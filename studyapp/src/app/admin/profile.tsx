import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import * as ImagePicker from "expo-image-picker";
import { router } from "expo-router";
import { onAuthStateChanged, sendPasswordResetEmail, User } from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

import { auth, db } from "../../firebase/config";
import { confirmAction, confirmLogout } from "../../firebase/auth";
import { useAppTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";
import AdminThemeToggle from "../../components/admin/AdminThemeToggle";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTopBar from "../../components/admin/AdminTopBar";
import {
  ConnectedStudentItem,
  listenTeacherConnectedStudents,
  seedDefaultConnectedStudents,
  sendTeacherStudentMessage,
} from "../../firebase/teacherStudent";
import { pickPdfDocument, uploadSpecialNoteFile } from "../../services/certificatePdfService";

// =====================================================
// SIDEBAR NAVIGATION ITEMS
// =====================================================
const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "home", route: "/admin" },
  { id: "students", label: "Students", icon: "person", route: "/admin/student" },
  { id: "faculty", label: "Faculty", icon: "people", route: "/admin/faculty" },
  { id: "academics", label: "Academics", icon: "book", route: "/admin/academics" },
  { id: "special-notes", label: "Special Notes", icon: "document-text", route: "/admin/special-notes" },
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

export default function AdminProfileScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const { isDark, colors } = useAppTheme();
  const { t } = useLanguage();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Profile fields
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [fullName, setFullName] = useState("Dr. Rahul Sharma");
  const [email, setEmail] = useState("admin@campusly.com");
  const [phone, setPhone] = useState("+91 98765 43210");
  const [designation, setDesignation] = useState("Dean & Campus Administrator");
  const [department, setDepartment] = useState("Computer Science & Engineering");
  const [employeeCode, setEmployeeCode] = useState("EMP-ADM-2024-001");
  const [officeRoom, setOfficeRoom] = useState("Admin Block • Room 301");
  const [avatar, setAvatar] = useState(
    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80"
  );
  const [joinedDate, setJoinedDate] = useState("01 Jan 2025");

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editDesignation, setEditDesignation] = useState("");
  const [editDepartment, setEditDepartment] = useState("");
  const [editEmployeeCode, setEditEmployeeCode] = useState("");
  const [editOfficeRoom, setEditOfficeRoom] = useState("");

  // Special Notes & Important Questions State (Created & Managed by Teacher/Admin)
  const [specialNotes, setSpecialNotes] = useState<any[]>([]);
  const [notesLoading, setNotesLoading] = useState(true);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);

  // Special Note Form Fields
  const [noteTitle, setNoteTitle] = useState("");
  const [noteSubject, setNoteSubject] = useState("");
  const [noteCategory, setNoteCategory] = useState<"Important Question" | "Exam Special Note" | "Formula Sheet" | "Lab Guideline">("Important Question");
  const [notePriority, setNotePriority] = useState<"High" | "Medium" | "Normal">("High");
  const [noteContent, setNoteContent] = useState("");
  const [noteTargetClass, setNoteTargetClass] = useState("CSE - 6th Semester (Sec A & B)");
  const [notePhotoUrl, setNotePhotoUrl] = useState("");
  const [notePhotoName, setNotePhotoName] = useState("");
  const [notePdfUrl, setNotePdfUrl] = useState("");
  const [notePdfName, setNotePdfName] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Teacher-Student Messages State
  const [connectedStudents, setConnectedStudents] = useState<ConnectedStudentItem[]>([]);
  const [selectedStudentForChat, setSelectedStudentForChat] = useState<ConnectedStudentItem | null>(null);
  const [teacherChatModalVisible, setTeacherChatModalVisible] = useState(false);
  const [teacherChatMessages, setTeacherChatMessages] = useState<any[]>([]);
  const [teacherChatInput, setTeacherChatInput] = useState("");
  const [teacherChatPhoto, setTeacherChatPhoto] = useState<string | null>(null);
  const [teacherChatSending, setTeacherChatSending] = useState(false);

  // Live Dynamic Statistics from Firestore
  const [studentCount, setStudentCount] = useState(0);
  const [facultyCount, setFacultyCount] = useState(0);
  const [hostelCount, setHostelCount] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  useEffect(() => {
    // 1. Live Students Count & Hostel residents count from users collection
    const unsubUsers = onSnapshot(
      collection(db, "users"),
      (snap) => {
        let count = 0;
        let hostelAssigned = 0;
        snap.forEach((d) => {
          const s = d.data();
          const role = (s.role || "").toLowerCase();
          if (
            role === "student" ||
            (!role && (s.rollNo || s.degree)) ||
            (role !== "admin" && role !== "teacher" && (s.rollNo || s.fullName || s.name))
          ) {
            count++;
          }
          if (s.hostelBlock || s.hostelRoom || s.isHosteler || s.roomNo) {
            hostelAssigned++;
          }
        });
        setStudentCount(count);
        if (hostelAssigned > 0) {
          setHostelCount(hostelAssigned);
        }
      },
      (err) => console.warn("Admin profile users listener warning:", err)
    );

    // 2. Live Faculty Members Count
    const unsubFaculty = onSnapshot(
      collection(db, "faculty"),
      (snap) => {
        setFacultyCount(snap.docs.length);
      },
      (err) => console.warn("Admin profile faculty listener warning:", err)
    );

    // 3. Live Hostel Occupancy from hostel collection
    const unsubHostel = onSnapshot(
      collection(db, "hostel"),
      (snap) => {
        if (!snap.empty) {
          let totalOccupancy = 0;
          snap.forEach((d) => {
            const data = d.data();
            if (typeof data.occupancy === "number") totalOccupancy += data.occupancy;
            else if (typeof data.occupied === "number") totalOccupancy += data.occupied;
            else totalOccupancy += 1;
          });
          setHostelCount(totalOccupancy);
        }
      },
      (err) => console.warn("Admin profile hostel listener warning:", err)
    );

    // 4. Live Pending Requests Count
    const unsubRequests = onSnapshot(
      collection(db, "requests"),
      (snap) => {
        const pending = snap.docs.filter((d) => {
          const data = d.data();
          const status = (data.status || "").toLowerCase();
          return status === "pending" || !status;
        });
        setPendingRequestsCount(pending.length);
      },
      (err) => console.warn("Admin profile requests listener warning:", err)
    );

    return () => {
      unsubUsers();
      unsubFaculty();
      unsubHostel();
      unsubRequests();
    };
  }, []);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        if (user.email) setEmail(user.email);
        if (user.displayName) setFullName(user.displayName);
        if (user.photoURL) setAvatar(user.photoURL);

        // Load profile from Firestore
        try {
          const userDoc = await getDoc(doc(db, "users", user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            if (data.fullName) setFullName(data.fullName);
            if (data.phone) setPhone(data.phone);
            if (data.photoURL) setAvatar(data.photoURL);
            if (data.designation) setDesignation(data.designation);
            if (data.department) setDepartment(data.department);
            if (data.employeeCode) setEmployeeCode(data.employeeCode);
            if (data.officeRoom) setOfficeRoom(data.officeRoom);
            if (data.createdAt) {
              try {
                const date = new Date(data.createdAt);
                setJoinedDate(
                  date.toLocaleDateString("en-GB", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                  })
                );
              } catch (e) {
                // Keep default
              }
            }
          }
        } catch (err) {
          console.warn("Could not fetch user document:", err);
        }
      }
      setLoading(false);
    });

    return unsub;
  }, []);

  const openEditModal = () => {
    setEditName(fullName);
    setEditPhone(phone);
    setEditDesignation(designation);
    setEditDepartment(department);
    setEditEmployeeCode(employeeCode);
    setEditOfficeRoom(officeRoom);
    setEditModalOpen(true);
  };

  const handleSaveProfile = async () => {
    if (!editName.trim()) {
      Alert.alert("Invalid Input", "Full Name cannot be empty.");
      return;
    }

    setSaving(true);
    try {
      if (currentUser) {
        await setDoc(
          doc(db, "users", currentUser.uid),
          {
            fullName: editName.trim(),
            phone: editPhone.trim(),
            designation: editDesignation.trim() || designation,
            department: editDepartment.trim() || department,
            employeeCode: editEmployeeCode.trim() || employeeCode,
            officeRoom: editOfficeRoom.trim() || officeRoom,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      setFullName(editName.trim());
      setPhone(editPhone.trim());
      if (editDesignation.trim()) setDesignation(editDesignation.trim());
      if (editDepartment.trim()) setDepartment(editDepartment.trim());
      if (editEmployeeCode.trim()) setEmployeeCode(editEmployeeCode.trim());
      if (editOfficeRoom.trim()) setOfficeRoom(editOfficeRoom.trim());

      setEditModalOpen(false);
      Alert.alert("Profile Updated! 👤", "Administrator profile has been updated in Firebase.");
    } catch (e: any) {
      console.warn("Save profile error:", e);
      setFullName(editName.trim());
      setPhone(editPhone.trim());
      setEditModalOpen(false);
      Alert.alert("Updated", "Profile information updated.");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!email) {
      Alert.alert("Error", "No email associated with this account.");
      return;
    }

    Alert.alert(
      "Reset Password",
      `Send a password reset email to ${email}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send Email",
          onPress: async () => {
            try {
              await sendPasswordResetEmail(auth, email);
              Alert.alert(
                "Email Sent",
                `A password reset link has been sent to ${email}.`
              );
            } catch (err: any) {
              Alert.alert(
                "Error",
                err.message || "Failed to send password reset email."
              );
            }
          },
        },
      ]
    );
  };

  const handlePickAvatar = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets[0]?.uri) {
        const localUri = result.assets[0].uri;
        setAvatar(localUri);

        if (currentUser) {
          try {
            await setDoc(
              doc(db, "users", currentUser.uid),
              {
                photoURL: localUri,
                updatedAt: new Date().toISOString(),
              },
              { merge: true }
            );
          } catch (e) {
            console.warn("Could not save avatar url to firestore:", e);
          }
        }

        Alert.alert("Success", "Profile photo updated.");
      }
    } catch (err) {
      console.warn("Image picker error:", err);
    }
  };

  // Listen for connected students
  useEffect(() => {
    seedDefaultConnectedStudents();
    const unsubStudents = listenTeacherConnectedStudents("TEACH-CSE-101", (list) => {
      setConnectedStudents(list);
    });
    return () => unsubStudents();
  }, []);

  // Listen for real-time messages for selected student
  useEffect(() => {
    if (!teacherChatModalVisible || !selectedStudentForChat) {
      setTeacherChatMessages([]);
      return;
    }

    const chatId = `TEACH-CSE-101_${selectedStudentForChat.studentUid}`;
    const messagesRef = collection(db, "teacherStudentChats", chatId, "messages");
    const q = query(messagesRef, orderBy("createdAt", "asc"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const msgs = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setTeacherChatMessages(msgs);
      },
      (err) => console.warn("Teacher chat listener error:", err)
    );

    return () => unsub();
  }, [teacherChatModalVisible, selectedStudentForChat]);

  // Send message from teacher to student
  const handleSendTeacherChatMessage = async () => {
    if (!selectedStudentForChat) return;
    const trimmed = teacherChatInput.trim();
    if (!trimmed && !teacherChatPhoto) return;

    const chatId = `TEACH-CSE-101_${selectedStudentForChat.studentUid}`;
    setTeacherChatSending(true);

    const res = await sendTeacherStudentMessage(
      chatId,
      currentUser ? currentUser.uid : "teacher-uid",
      fullName || "Prof. Ganesh Sharma",
      "teacher",
      trimmed,
      teacherChatPhoto || undefined
    );

    setTeacherChatSending(false);
    if (res.success) {
      setTeacherChatInput("");
      setTeacherChatPhoto(null);
    } else {
      Alert.alert("Error", res.error || "Failed to send message.");
    }
  };

  // Listen for Special Notes & Important Questions in Firebase
  useEffect(() => {
    const notesRef = collection(db, "specialNotes");
    const q = query(notesRef, orderBy("createdAt", "desc"));
    const unsubNotes = onSnapshot(
      q,
      async (snap) => {
        if (snap.empty) {
          // Seed default special notes so students and teachers have immediate content
          const defaultNotes = [
            {
              title: "Expected 10-Mark Questions: Dynamic Programming & Graphs",
              subject: "Data Structures & Algorithms",
              category: "Important Question",
              priority: "High",
              content: "1. Explain Dijkstra's Shortest Path Algorithm with time complexity analysis.\n2. Prove 0/1 Knapsack problem using Dynamic Programming memoization vs tabulation.\n3. Implement AVL tree rotations (LL, RR, LR, RL) with balance factors.",
              teacherName: fullName || "Prof. Ganesh Sharma",
              targetClass: "CSE - 6th Semester (Sec A & B)",
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            {
              title: "End-Sem Exam Special Note: Question Paper Format & Formulae",
              subject: "Operating Systems",
              category: "Exam Special Note",
              priority: "High",
              content: "Important Note: Section A covers 5 compulsory MCQs (10 marks). Section B contains numericals on Banker's Deadlock Algorithm and Page Replacement (FIFO, LRU, Optimal). Bring scientific calculators; mobile phones strictly prohibited.",
              teacherName: fullName || "Dr. Rahul Sharma",
              targetClass: "CSE - 6th Semester",
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
            {
              title: "Formula Sheet: Database Normalization (1NF, 2NF, 3NF, BCNF)",
              subject: "DBMS",
              category: "Formula Sheet",
              priority: "Medium",
              content: "• 1NF: Atomic attribute values.\n• 2NF: 1NF + No partial dependency on primary key.\n• 3NF: 2NF + No transitive dependency on non-prime attributes.\n• BCNF: For every FD X -> Y, X must be a super key.",
              teacherName: fullName || "Prof. Ganesh Sharma",
              targetClass: "CSE - 6th Semester",
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            },
          ];

          for (const item of defaultNotes) {
            await addDoc(notesRef, item);
          }
          return;
        }

        const loaded = snap.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }));
        setSpecialNotes(loaded);
        setNotesLoading(false);
      },
      (err) => {
        console.warn("Special notes snapshot error:", err);
        setSpecialNotes([]);
        setNotesLoading(false);
      }
    );

    return () => unsubNotes();
  }, [fullName]);

  const handleOpenAddNoteModal = () => {
    setEditingNoteId(null);
    setNoteTitle("");
    setNoteSubject(department || "Data Structures & Algorithms");
    setNoteCategory("Important Question");
    setNotePriority("High");
    setNoteContent("");
    setNoteTargetClass("CSE - 6th Semester (Sec A & B)");
    setNotePhotoUrl("");
    setNotePhotoName("");
    setNotePdfUrl("");
    setNotePdfName("");
    setNoteModalOpen(true);
  };

  const handleOpenEditNoteModal = (note: any) => {
    setEditingNoteId(note.id);
    setNoteTitle(note.title || "");
    setNoteSubject(note.subject || "Data Structures & Algorithms");
    setNoteCategory(note.category || "Important Question");
    setNotePriority(note.priority || "High");
    setNoteContent(note.content || "");
    setNoteTargetClass(note.targetClass || "CSE - 6th Semester");
    setNotePhotoUrl(note.photoUrl || "");
    setNotePhotoName(note.photoName || "");
    setNotePdfUrl(note.pdfUrl || "");
    setNotePdfName(note.pdfName || "");
    setNoteModalOpen(true);
  };

  const handlePickNotePhoto = async () => {
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission Required", "Please allow gallery access to attach diagram photos.");
        return;
      }
      const res = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (!res.canceled && res.assets && res.assets[0]?.uri) {
        setNotePhotoUrl(res.assets[0].uri);
        setNotePhotoName(res.assets[0].fileName || `Diagram_${Date.now()}.jpg`);
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not select photo.");
    }
  };

  const handleTakeNotePhoto = async () => {
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert("Permission Required", "Please allow camera access to snap whiteboard or diagram photos.");
        return;
      }
      const res = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.85,
      });
      if (!res.canceled && res.assets && res.assets[0]?.uri) {
        setNotePhotoUrl(res.assets[0].uri);
        setNotePhotoName(res.assets[0].fileName || `Whiteboard_${Date.now()}.jpg`);
      }
    } catch (e: any) {
      Alert.alert("Camera Error", e?.message || "Could not snap photo.");
    }
  };

  const handlePickNotePdf = async () => {
    try {
      const file = await pickPdfDocument();
      if (file && file.uri) {
        setNotePdfUrl(file.uri);
        setNotePdfName(file.name || "Exam_Notes.pdf");
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not select PDF file.");
    }
  };

  const handleSaveSpecialNote = async () => {
    if (!noteTitle.trim() || !noteContent.trim()) {
      Alert.alert("Missing Information", "Please enter Note Title and Content / Questions.");
      return;
    }

    setSavingNote(true);

    try {
      const noteDocId = editingNoteId || `note_${Date.now()}`;

      // Upload local photo to Firebase Storage
      let finalPhotoUrl = notePhotoUrl.trim();
      if (finalPhotoUrl && !finalPhotoUrl.startsWith("http")) {
        finalPhotoUrl = await uploadSpecialNoteFile(finalPhotoUrl, "photo", noteDocId);
      }

      // Upload local PDF to Firebase Storage
      let finalPdfUrl = notePdfUrl.trim();
      if (finalPdfUrl && !finalPdfUrl.startsWith("http")) {
        finalPdfUrl = await uploadSpecialNoteFile(finalPdfUrl, "pdf", noteDocId);
      }

      const payload = {
        title: noteTitle.trim(),
        subject: noteSubject.trim() || "Computer Science",
        category: noteCategory,
        priority: notePriority,
        content: noteContent.trim(),
        photoUrl: finalPhotoUrl || "",
        photoName: notePhotoName.trim() || "",
        pdfUrl: finalPdfUrl || "",
        pdfName: notePdfName.trim() || "",
        teacherName: fullName || "Faculty Mentor",
        teacherId: "TEACH-CSE-101",
        authorRole: "Faculty",
        updatedByName: fullName || "Faculty",
        targetClass: noteTargetClass.trim() || "All Classes",
        updatedAt: serverTimestamp(),
      };

      if (editingNoteId) {
        await updateDoc(doc(db, "specialNotes", editingNoteId), payload);
        await addDoc(collection(db, "activities"), {
          title: `Special Note Updated: ${noteTitle.trim()}`,
          time: "Just now",
          user: fullName || "Faculty",
          type: "notes",
          createdAt: serverTimestamp(),
        });
        Alert.alert("Updated! 📝", `Special Note "${noteTitle.trim()}" updated successfully in Firebase.`);
      } else {
        await addDoc(collection(db, "specialNotes"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        await addDoc(collection(db, "activities"), {
          title: `New Special Note Published: ${noteTitle.trim()}`,
          time: "Just now",
          user: fullName || "Faculty",
          type: "notes",
          createdAt: serverTimestamp(),
        });
        Alert.alert("Published! 📝", `Special Note "${noteTitle.trim()}" published! Students can view it in their profile.`);
      }
      setNoteModalOpen(false);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to save special note.");
    } finally {
      setSavingNote(false);
    }
  };

  const handleDeleteSpecialNote = (note: any) => {
    confirmAction(
      "Delete Note / Question",
      `Are you sure you want to delete "${note.title}"? Students will no longer be able to view it.`,
      async () => {
        try {
          await deleteDoc(doc(db, "specialNotes", note.id));
          if (Platform.OS === "web") {
            window.alert("Special note deleted from Firebase.");
          } else {
            Alert.alert("Deleted", "Special note deleted from Firebase.");
          }
        } catch (err: any) {
          if (Platform.OS === "web") {
            window.alert(err?.message || "Failed to delete note.");
          } else {
            Alert.alert("Error", err?.message || "Failed to delete note.");
          }
        }
      },
      "Delete"
    );
  };

  const handleLogout = () => {
    confirmLogout("Are you sure you want to sign out?");
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.loadingContainer, { backgroundColor: colors.adminBg }]}>
        <ActivityIndicator size="large" color="#5D3EBC" />
        <Text style={[styles.loadingText, { color: colors.adminText }]}>Loading Profile...</Text>
      </SafeAreaView>
    );
  }

  // Sidebar Component
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.adminSidebar }]} edges={["top", "left", "right"]}>
      <View style={styles.mainLayout}>
        <AdminSidebar
          activeNav="profile"
          isDesktop={isDesktop}
          mobileMenuOpen={mobileMenuOpen}
          onCloseMobileMenu={() => setMobileMenuOpen(false)}
        />

        {/* ============================================= */}
        {/* MAIN PROFILE CONTENT AREA */}
        {/* ============================================= */}
        <View style={[styles.contentArea, { backgroundColor: colors.adminBg }]}>
          <AdminTopBar
            showSearch={true}
            searchPlaceholder="Search anything..."
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
          />

          {/* SCROLLABLE BODY */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* ============================================= */}
            {/* PURPLE PAGE BANNER: ADMIN PROFILE */}
            {/* ============================================= */}
            <View style={styles.headerBanner}>
              <View style={styles.bannerLeft}>
                <Text style={styles.bannerTitle}>Admin Profile</Text>
                <Text style={styles.bannerSubtitle}>
                  Manage your personal information and account settings
                </Text>
              </View>
              {isDesktop && (
                <View style={styles.bannerIconContainer}>
                  <Ionicons name="business" size={54} color="rgba(255,255,255,0.85)" />
                </View>
              )}
            </View>

            {/* ============================================= */}
            {/* PROFILE HERO & STATS ROW */}
            {/* ============================================= */}
            <View style={[styles.heroStatRow, !isDesktop && styles.heroStatRowMobile]}>
              {/* Left Profile Summary Card */}
              <View style={[styles.profileSummaryCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                <View style={styles.avatarWrapper}>
                  <Image source={{ uri: avatar }} style={styles.summaryAvatar} />
                  <TouchableOpacity
                    style={styles.cameraBadge}
                    onPress={handlePickAvatar}
                  >
                    <Ionicons name="camera" size={14} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                <View style={styles.summaryDetails}>
                  <View style={styles.nameBadgeRow}>
                    <Text style={[styles.summaryName, { color: colors.adminText }]}>{fullName}</Text>
                    <View style={styles.adminBadge}>
                      <Text style={styles.adminBadgeText}>Administrator</Text>
                    </View>
                  </View>

                  <View style={styles.summaryMetaRow}>
                    <Ionicons name="mail-outline" size={14} color={colors.adminTextSecondary} />
                    <Text style={[styles.summaryMetaText, { color: colors.adminTextSecondary }]}>{email}</Text>
                  </View>

                  <View style={styles.summaryMetaRow}>
                    <Ionicons name="call-outline" size={14} color={colors.adminTextSecondary} />
                    <Text style={[styles.summaryMetaText, { color: colors.adminTextSecondary }]}>{phone}</Text>
                  </View>

                  <View style={styles.summaryMetaRow}>
                    <Ionicons name="calendar-outline" size={14} color={colors.adminTextSecondary} />
                    <Text style={[styles.summaryMetaText, { color: colors.adminTextSecondary }]}>
                      Joined on: {joinedDate}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Right 4 Stat Cards */}
              <View style={styles.statCardsGrid}>
                {/* Students */}
                <TouchableOpacity
                  style={[styles.statMiniCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}
                  onPress={() => router.push("/admin/student")}
                  activeOpacity={0.7}
                >
                  <View style={[styles.statIconBox, { backgroundColor: isDark ? "rgba(124,58,237,0.2)" : "#F3EEFD" }]}>
                    <Ionicons name="people" size={18} color="#7C3AED" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.statMiniVal, { color: colors.adminText }]}>
                      {studentCount.toLocaleString()}
                    </Text>
                    <Text style={[styles.statMiniLabel, { color: colors.adminTextSecondary }]}>Total Students</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={colors.adminTextSecondary} />
                </TouchableOpacity>

                {/* Faculty */}
                <TouchableOpacity
                  style={[styles.statMiniCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}
                  onPress={() => router.push("/admin/faculty")}
                  activeOpacity={0.7}
                >
                  <View style={[styles.statIconBox, { backgroundColor: isDark ? "rgba(37,99,235,0.2)" : "#EFF6FF" }]}>
                    <Ionicons name="school" size={18} color="#2563EB" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.statMiniVal, { color: colors.adminText }]}>
                      {facultyCount.toLocaleString()}
                    </Text>
                    <Text style={[styles.statMiniLabel, { color: colors.adminTextSecondary }]}>Faculty Members</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={colors.adminTextSecondary} />
                </TouchableOpacity>

                {/* Hostel */}
                <TouchableOpacity
                  style={[styles.statMiniCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}
                  onPress={() => router.push("/admin/hostel")}
                  activeOpacity={0.7}
                >
                  <View style={[styles.statIconBox, { backgroundColor: isDark ? "rgba(16,185,129,0.2)" : "#ECFDF5" }]}>
                    <Ionicons name="home" size={18} color="#10B981" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.statMiniVal, { color: colors.adminText }]}>
                      {hostelCount.toLocaleString()}
                    </Text>
                    <Text style={[styles.statMiniLabel, { color: colors.adminTextSecondary }]}>Hostel Occupancy</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={colors.adminTextSecondary} />
                </TouchableOpacity>

                {/* Requests */}
                <TouchableOpacity
                  style={[styles.statMiniCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}
                  onPress={() => router.push("/admin/requests")}
                  activeOpacity={0.7}
                >
                  <View style={[styles.statIconBox, { backgroundColor: isDark ? "rgba(234,88,12,0.2)" : "#FFF7ED" }]}>
                    <Ionicons name="document-text" size={18} color="#EA580C" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.statMiniVal, { color: colors.adminText }]}>
                      {pendingRequestsCount.toLocaleString()}
                    </Text>
                    <Text style={[styles.statMiniLabel, { color: colors.adminTextSecondary }]}>Pending Requests</Text>
                  </View>
                  <Ionicons name="chevron-forward" size={14} color={colors.adminTextSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* ============================================= */}
            {/* TWO-COLUMN DETAILS SECTION */}
            {/* ============================================= */}
            <View style={[styles.twoColSection, !isDesktop && styles.twoColMobile]}>
              {/* ------------------------------------------- */}
              {/* LEFT COLUMN */}
              {/* ------------------------------------------- */}
              <View style={styles.colLeft}>
                {/* Personal Information */}
                <View style={[styles.cardBox, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                  <View style={styles.cardBoxHeader}>
                    <View style={styles.headerLeftWithIcon}>
                      <Ionicons name="person" size={18} color="#4F46E5" />
                      <Text style={[styles.cardBoxTitle, { color: colors.adminText }]}>Personal Information</Text>
                    </View>

                    <TouchableOpacity
                      style={[styles.editBtn, { borderColor: colors.adminCardBorder, backgroundColor: colors.adminSurfaceAlt }]}
                      onPress={openEditModal}
                    >
                      <Ionicons name="create-outline" size={14} color="#5D3EBC" />
                      <Text style={styles.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.fieldRow}>
                    <View style={styles.fieldLabelGroup}>
                      <Ionicons name="person-outline" size={16} color={colors.adminTextSecondary} />
                      <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Full Name</Text>
                    </View>
                    <Text style={[styles.fieldValue, { color: colors.adminText }]}>{fullName}</Text>
                  </View>

                  <View style={[styles.fieldDivider, { backgroundColor: colors.adminCardBorder }]} />

                  <View style={styles.fieldRow}>
                    <View style={styles.fieldLabelGroup}>
                      <Ionicons name="mail-outline" size={16} color={colors.adminTextSecondary} />
                      <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Email</Text>
                    </View>
                    <Text style={[styles.fieldValue, { color: colors.adminText }]}>{email}</Text>
                  </View>

                  <View style={[styles.fieldDivider, { backgroundColor: colors.adminCardBorder }]} />

                  <View style={styles.fieldRow}>
                    <View style={styles.fieldLabelGroup}>
                      <Ionicons name="call-outline" size={16} color={colors.adminTextSecondary} />
                      <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Phone Number</Text>
                    </View>
                    <Text style={[styles.fieldValue, { color: colors.adminText }]}>{phone}</Text>
                  </View>
                </View>

                {/* Administrative Role & Office Information */}
                <View style={[styles.cardBox, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                  <View style={styles.cardBoxHeader}>
                    <View style={styles.headerLeftWithIcon}>
                      <Ionicons name="business" size={18} color="#4F46E5" />
                      <Text style={[styles.cardBoxTitle, { color: colors.adminText }]}>Administrative Office Details</Text>
                    </View>
                    <TouchableOpacity style={[styles.editBtn, { borderColor: colors.adminCardBorder, backgroundColor: colors.adminSurfaceAlt }]} onPress={openEditModal}>
                      <Ionicons name="create-outline" size={14} color="#5D3EBC" />
                      <Text style={styles.editBtnText}>Edit</Text>
                    </TouchableOpacity>
                  </View>

                  <View style={styles.fieldRow}>
                    <View style={styles.fieldLabelGroup}>
                      <Ionicons name="ribbon-outline" size={16} color={colors.adminTextSecondary} />
                      <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Designation</Text>
                    </View>
                    <Text style={[styles.fieldValue, { color: colors.adminText }]}>{designation}</Text>
                  </View>

                  <View style={[styles.fieldDivider, { backgroundColor: colors.adminCardBorder }]} />

                  <View style={styles.fieldRow}>
                    <View style={styles.fieldLabelGroup}>
                      <Ionicons name="school-outline" size={16} color={colors.adminTextSecondary} />
                      <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Department</Text>
                    </View>
                    <Text style={[styles.fieldValue, { color: colors.adminText }]}>{department}</Text>
                  </View>

                  <View style={[styles.fieldDivider, { backgroundColor: colors.adminCardBorder }]} />

                  <View style={styles.fieldRow}>
                    <View style={styles.fieldLabelGroup}>
                      <Ionicons name="card-outline" size={16} color={colors.adminTextSecondary} />
                      <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Staff / Employee ID</Text>
                    </View>
                    <Text style={[styles.fieldValue, { color: colors.adminText }]}>{employeeCode}</Text>
                  </View>

                  <View style={[styles.fieldDivider, { backgroundColor: colors.adminCardBorder }]} />

                  <View style={styles.fieldRow}>
                    <View style={styles.fieldLabelGroup}>
                      <Ionicons name="location-outline" size={16} color={colors.adminTextSecondary} />
                      <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Office Room</Text>
                    </View>
                    <Text style={[styles.fieldValue, { color: colors.adminText }]}>{officeRoom}</Text>
                  </View>
                </View>

                {/* Portal Settings Navigation Card */}
                <TouchableOpacity
                  style={[styles.cardBox, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}
                  activeOpacity={0.8}
                  onPress={() => router.push("/admin/settings")}
                >
                  <View style={[styles.cardBoxHeader, { borderBottomWidth: 0 }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                      <View style={[styles.settingIconBox, { backgroundColor: isDark ? "rgba(124,58,237,0.2)" : "#EDE9FE" }]}>
                        <Ionicons name="settings" size={20} color="#7C3AED" />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={[styles.cardBoxTitle, { fontSize: 15, color: colors.adminText }]}>Administrative Settings</Text>
                        <Text style={{ fontSize: 12, color: colors.adminTextSecondary, marginTop: 2 }}>
                          Configure Theme (Light/Dark), Language, Notifications & Teacher-Student Link
                        </Text>
                      </View>
                    </View>
                    <View style={{ backgroundColor: "#7C3AED", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 }}>
                      <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "700" }}>Open Settings →</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* ---------------------------------------------------- */}
                {/* SPECIAL NOTES & IMPORTANT QUESTIONS (TEACHER/ADMIN) */}
                {/* ---------------------------------------------------- */}
                <View style={[styles.cardBox, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <View style={styles.cardBoxHeader}>
                    <View style={styles.headerLeftWithIcon}>
                      <Ionicons name="document-text" size={20} color="#7C3AED" />
                      <Text style={[styles.cardBoxTitle, { color: colors.text }]}>Special Notes & Important Questions</Text>
                      <View style={{ backgroundColor: "#EDE9FE", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginLeft: 6 }}>
                        <Text style={{ fontSize: 11, fontWeight: "700", color: "#7C3AED" }}>{specialNotes.length}</Text>
                      </View>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <TouchableOpacity
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          backgroundColor: colors.adminSurfaceAlt,
                          borderWidth: 1,
                          borderColor: colors.adminCardBorder,
                          paddingHorizontal: 10,
                          paddingVertical: 6,
                          borderRadius: 8,
                          gap: 4,
                        }}
                        onPress={() => router.push("/admin/special-notes")}
                      >
                        <Ionicons name="open-outline" size={14} color="#7C3AED" />
                        <Text style={{ color: "#7C3AED", fontSize: 12, fontWeight: "700" }}>Manage Board →</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#7C3AED", paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, gap: 4 }}
                        onPress={handleOpenAddNoteModal}
                      >
                        <Ionicons name="add" size={16} color="#FFFFFF" />
                        <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "700" }}>+ Add Note</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 14 }}>
                    Publish important exam questions, formula cheat-sheets, and study notes. Only teachers can create, update, or delete. Students have read-only access.
                  </Text>

                  {notesLoading ? (
                    <View style={{ paddingVertical: 20, alignItems: "center" }}>
                      <ActivityIndicator size="small" color="#7C3AED" />
                      <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 6 }}>Loading special notes...</Text>
                    </View>
                  ) : specialNotes.length === 0 ? (
                    <View style={{ paddingVertical: 26, alignItems: "center" }}>
                      <Ionicons name="document-text-outline" size={38} color={colors.textSecondary} />
                      <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text, marginTop: 8 }}>No Special Notes Published</Text>
                      <Text style={{ fontSize: 12, color: colors.textSecondary, textAlign: "center", marginTop: 4, marginBottom: 12 }}>
                        Share high-yield exam questions, formulas, or guidelines for your students.
                      </Text>
                      <TouchableOpacity
                        style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#7C3AED", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, gap: 6 }}
                        onPress={handleOpenAddNoteModal}
                      >
                        <Ionicons name="add-circle" size={16} color="#FFFFFF" />
                        <Text style={{ color: "#FFFFFF", fontSize: 12, fontWeight: "700" }}>Publish First Special Note</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={{ gap: 10 }}>
                      {specialNotes.map((note) => {
                        const isHigh = note.priority === "High";
                        const isMedium = note.priority === "Medium";
                        return (
                          <View
                            key={note.id}
                            style={{
                              backgroundColor: isDark ? "#1E293B" : "#F8FAFC",
                              borderWidth: 1,
                              borderColor: colors.border,
                              borderRadius: 12,
                              padding: 12,
                            }}
                          >
                            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
                              <View style={{ flex: 1, marginRight: 8 }}>
                                <View style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6, marginBottom: 4 }}>
                                  <View
                                    style={{
                                      backgroundColor: isHigh ? "#FEE2E2" : isMedium ? "#FEF3C7" : "#E0E7FF",
                                      paddingHorizontal: 8,
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

                                  <View style={{ backgroundColor: "#EDE9FE", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                                    <Text style={{ fontSize: 10.5, fontWeight: "700", color: "#7C3AED" }}>
                                      {note.category || "Important Question"}
                                    </Text>
                                  </View>
                                </View>

                                <Text style={{ fontSize: 14, fontWeight: "700", color: colors.text }}>{note.title}</Text>

                                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                                  <Ionicons name="book-outline" size={13} color="#7C3AED" />
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
                                    marginTop: 6,
                                    lineHeight: 18,
                                  }}
                                  numberOfLines={3}
                                >
                                  {note.content}
                                </Text>

                                {/* Attached Photo preview */}
                                {Boolean(note.photoUrl) && (
                                  <View style={{ marginTop: 8, borderRadius: 8, overflow: "hidden" }}>
                                    <Image source={{ uri: note.photoUrl }} style={{ width: "100%", height: 130, borderRadius: 8 }} resizeMode="cover" />
                                  </View>
                                )}

                                {/* Attached PDF Document */}
                                {Boolean(note.pdfUrl) && (
                                  <TouchableOpacity
                                    style={{
                                      flexDirection: "row",
                                      alignItems: "center",
                                      backgroundColor: isDark ? "rgba(239,68,68,0.15)" : "#FEF2F2",
                                      borderWidth: 1,
                                      borderColor: isDark ? "#7F1D1D" : "#FCA5A5",
                                      borderRadius: 8,
                                      padding: 8,
                                      marginTop: 8,
                                    }}
                                    onPress={() => Linking.openURL(note.pdfUrl).catch(() => Alert.alert("Error", "Could not open PDF document."))}
                                  >
                                    <Ionicons name="document-text" size={16} color="#DC2626" />
                                    <Text style={{ fontSize: 11.5, fontWeight: "700", color: "#DC2626", marginLeft: 6, flex: 1 }} numberOfLines={1}>
                                      {note.pdfName || "Exam_Notes_Document.pdf"}
                                    </Text>
                                    <Text style={{ fontSize: 11, fontWeight: "700", color: "#DC2626" }}>Open PDF →</Text>
                                  </TouchableOpacity>
                                )}

                                <Text style={{ fontSize: 10.5, color: colors.textSecondary, marginTop: 6 }}>
                                  By: {note.teacherName || fullName}
                                </Text>
                              </View>

                              <View style={{ flexDirection: "row", gap: 6 }}>
                                <TouchableOpacity
                                  style={{ width: 30, height: 30, borderRadius: 6, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" }}
                                  onPress={() => handleOpenEditNoteModal(note)}
                                >
                                  <Ionicons name="pencil" size={14} color="#7C3AED" />
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={{ width: 30, height: 30, borderRadius: 6, backgroundColor: "#FEE2E2", alignItems: "center", justifyContent: "center" }}
                                  onPress={() => handleDeleteSpecialNote(note)}
                                >
                                  <Ionicons name="trash-outline" size={14} color="#EF4444" />
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>

                {/* Together for a Better Campus Card */}
                <View style={styles.promoBottomCard}>
                  <Ionicons name="sparkles" size={28} color="#FFFFFF" />
                  <View style={{ marginLeft: 16, flex: 1 }}>
                    <Text style={styles.promoBottomTitle}>
                      Together for a Better Campus
                    </Text>
                    <Text style={styles.promoBottomSub}>
                      Manage • Monitor • Improve
                    </Text>
                    <Text style={styles.promoBottomScript}>Campusly Admin</Text>
                  </View>
                </View>
              </View>

              {/* ------------------------------------------- */}
              {/* RIGHT COLUMN */}
              {/* ------------------------------------------- */}
              <View style={styles.colRight}>
                {/* ============================================= */}
                {/* TEACHER-STUDENT MESSAGES & DOUBT CLEARING */}
                {/* ============================================= */}
                <View style={[styles.cardBox, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                  <View style={styles.cardBoxHeader}>
                    <View style={styles.headerLeftWithIcon}>
                      <Ionicons name="chatbubbles" size={18} color="#4F46E5" />
                      <Text style={[styles.cardBoxTitle, { color: colors.adminText }]}>Messages</Text>
                      <View style={{ backgroundColor: isDark ? "rgba(99,102,241,0.2)" : "#EEF2FF", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, marginLeft: 6 }}>
                        <Text style={{ fontSize: 11, fontWeight: "700", color: "#4F46E5" }}>
                          {connectedStudents.length} Students
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[styles.editBtn, { borderColor: colors.adminCardBorder, backgroundColor: colors.adminSurfaceAlt }]}
                      onPress={() => router.push("/messages?role=teacher" as any)}
                    >
                      <Ionicons name="chatbubble-ellipses-outline" size={14} color="#5D3EBC" />
                      <Text style={styles.editBtnText}>Full Chat</Text>
                    </TouchableOpacity>
                  </View>

                  <Text style={{ fontSize: 12, color: colors.adminTextSecondary, marginBottom: 12 }}>
                    Direct 1-on-1 messaging with your linked students for questions, study material review, and homework guidance.
                  </Text>

                  {connectedStudents.length === 0 ? (
                    <View style={{ paddingVertical: 18, alignItems: "center" }}>
                      <Ionicons name="chatbubbles-outline" size={32} color={colors.adminTextSecondary} />
                      <Text style={{ fontSize: 13, color: colors.adminText, fontWeight: "700", marginTop: 6 }}>
                        No Students Connected Yet
                      </Text>
                      <Text style={{ fontSize: 11.5, color: colors.adminTextSecondary, textAlign: "center", marginTop: 2 }}>
                        Share your Teacher ID (TEACH-CSE-101) with students to start chatting.
                      </Text>
                    </View>
                  ) : (
                    <View style={{ gap: 8 }}>
                      {connectedStudents.slice(0, 5).map((st) => (
                        <View
                          key={st.studentUid || st.id}
                          style={[
                            styles.studentChatCard,
                            {
                              backgroundColor: isDark ? colors.adminBg : "#F8FAFC",
                              borderColor: colors.adminCardBorder,
                            },
                          ]}
                        >
                          <View style={styles.studentChatAvatar}>
                            <Ionicons name="person" size={16} color="#FFFFFF" />
                          </View>

                          <View style={{ flex: 1, marginLeft: 10 }}>
                            <Text style={[styles.studentChatName, { color: colors.adminText }]} numberOfLines={1}>
                              {st.studentName}
                            </Text>
                            <Text style={[styles.studentChatMeta, { color: colors.adminTextSecondary }]}>
                              Roll: {st.rollNo} • {st.department || "CSE"} (Sec {st.section || "A"})
                            </Text>
                          </View>

                          <TouchableOpacity
                            style={styles.studentChatBtn}
                            onPress={() => {
                              setSelectedStudentForChat(st);
                              setTeacherChatModalVisible(true);
                            }}
                          >
                            <Ionicons name="chatbubble-ellipses" size={13} color="#FFFFFF" />
                            <Text style={styles.studentChatBtnText}>Chat</Text>
                          </TouchableOpacity>
                        </View>
                      ))}

                      {connectedStudents.length > 5 && (
                        <TouchableOpacity
                          style={{ alignItems: "center", paddingVertical: 6 }}
                          onPress={() => router.push("/messages?role=teacher" as any)}
                        >
                          <Text style={{ fontSize: 12, fontWeight: "700", color: "#4F46E5" }}>
                            + {connectedStudents.length - 5} more students in Messages →
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>

                {/* Role & Permissions */}
                <View style={[styles.cardBox, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                  <View style={styles.cardBoxHeader}>
                    <View style={styles.headerLeftWithIcon}>
                      <Ionicons name="shield-checkmark" size={18} color="#4F46E5" />
                      <Text style={[styles.cardBoxTitle, { color: colors.adminText }]}>Role & Permissions</Text>
                    </View>
                    <View style={styles.fullAccessBadge}>
                      <Text style={styles.fullAccessText}>Full Access</Text>
                    </View>
                  </View>

                  <View style={styles.fieldRow}>
                    <View style={styles.fieldLabelGroup}>
                      <Ionicons name="people-outline" size={16} color={colors.adminTextSecondary} />
                      <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Role</Text>
                    </View>
                    <Text style={[styles.fieldValue, { color: colors.adminText }]}>Administrator</Text>
                  </View>

                  <View style={[styles.fieldDivider, { backgroundColor: colors.adminCardBorder }]} />

                  <View style={styles.fieldRow}>
                    <View style={styles.fieldLabelGroup}>
                      <Ionicons name="business-outline" size={16} color={colors.adminTextSecondary} />
                      <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Department</Text>
                    </View>
                    <Text style={[styles.fieldValue, { color: colors.adminText }]}>Administration</Text>
                  </View>

                  <View style={[styles.fieldDivider, { backgroundColor: colors.adminCardBorder }]} />

                  <View style={styles.fieldRow}>
                    <View style={styles.fieldLabelGroup}>
                      <Ionicons name="key-outline" size={16} color={colors.adminTextSecondary} />
                      <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Access Level</Text>
                    </View>
                    <Text style={[styles.fieldValue, { color: colors.adminText }]}>All Modules</Text>
                  </View>
                </View>

                {/* Quick Actions */}
                <View style={[styles.cardBox, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                  <View style={styles.cardBoxHeader}>
                    <View style={styles.headerLeftWithIcon}>
                      <Ionicons name="flash" size={18} color="#4F46E5" />
                      <Text style={[styles.cardBoxTitle, { color: colors.adminText }]}>Quick Actions</Text>
                    </View>
                  </View>

                  {/* Student Messages & Doubts */}
                  <TouchableOpacity
                    style={[styles.quickActionItem, { borderBottomColor: colors.adminCardBorder }]}
                    onPress={() => router.push("/messages?role=teacher" as any)}
                  >
                    <Ionicons name="chatbubbles-outline" size={18} color="#4F46E5" />
                    <Text style={[styles.quickActionText, { color: colors.adminText }]}>Student Messages & Doubts</Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.adminTextSecondary} />
                  </TouchableOpacity>

                  {/* System Logs */}
                  <TouchableOpacity
                    style={[styles.quickActionItem, { borderBottomColor: colors.adminCardBorder }]}
                    onPress={() => router.push("/admin/debug")}
                  >
                    <Ionicons name="document-text-outline" size={18} color={colors.adminTextSecondary} />
                    <Text style={[styles.quickActionText, { color: colors.adminText }]}>View System Logs</Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.adminTextSecondary} />
                  </TouchableOpacity>

                  {/* Manage Profile */}
                  <TouchableOpacity
                    style={[styles.quickActionItem, { borderBottomColor: colors.adminCardBorder }]}
                    onPress={openEditModal}
                  >
                    <Ionicons name="person-outline" size={18} color={colors.adminTextSecondary} />
                    <Text style={[styles.quickActionText, { color: colors.adminText }]}>Manage Profile</Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.adminTextSecondary} />
                  </TouchableOpacity>

                  {/* Update Settings */}
                  <TouchableOpacity
                    style={[styles.quickActionItem, { borderBottomColor: colors.adminCardBorder }]}
                    onPress={() => router.push("/admin/settings")}
                  >
                    <Ionicons name="settings-outline" size={18} color={colors.adminTextSecondary} />
                    <Text style={[styles.quickActionText, { color: colors.adminText }]}>System Settings</Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.adminTextSecondary} />
                  </TouchableOpacity>

                  {/* Help & Support */}
                  <TouchableOpacity
                    style={[styles.quickActionItem, { borderBottomWidth: 0 }]}
                    onPress={() => router.push("/admin/debug")}
                  >
                    <Ionicons name="headset-outline" size={18} color={colors.adminTextSecondary} />
                    <Text style={[styles.quickActionText, { color: colors.adminText }]}>Help & Support</Text>
                    <Ionicons name="chevron-forward" size={18} color={colors.adminTextSecondary} />
                  </TouchableOpacity>
                </View>

                {/* Recent Activity */}
                <View style={[styles.cardBox, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                  <View style={styles.cardBoxHeader}>
                    <View style={styles.headerLeftWithIcon}>
                      <Ionicons name="time" size={18} color="#4F46E5" />
                      <Text style={[styles.cardBoxTitle, { color: colors.adminText }]}>Recent Activity</Text>
                    </View>
                    <TouchableOpacity onPress={() => router.push("/admin/notices")}>
                      <Text style={styles.viewAllText}>View All →</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Item 1 */}
                  <View style={[styles.activityRow, { borderBottomColor: colors.adminCardBorder }]}>
                    <View style={[styles.activityDot, { backgroundColor: "#EF4444" }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.activityTitle, { color: colors.adminText }]}>New notice published</Text>
                      <Text style={[styles.activitySub, { color: colors.adminTextSecondary }]}>Exam schedule updated</Text>
                    </View>
                    <Text style={[styles.activityTime, { color: colors.adminTextSecondary }]}>10:25 AM</Text>
                  </View>

                  {/* Item 2 */}
                  <View style={[styles.activityRow, { borderBottomColor: colors.adminCardBorder }]}>
                    <View style={[styles.activityDot, { backgroundColor: "#10B981" }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.activityTitle, { color: colors.adminText }]}>Student registration</Text>
                      <Text style={[styles.activitySub, { color: colors.adminTextSecondary }]}>New student enrolled (23CSE045)</Text>
                    </View>
                    <Text style={[styles.activityTime, { color: colors.adminTextSecondary }]}>09:48 AM</Text>
                  </View>

                  {/* Item 3 */}
                  <View style={[styles.activityRow, { borderBottomColor: colors.adminCardBorder }]}>
                    <View style={[styles.activityDot, { backgroundColor: "#F59E0B" }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.activityTitle, { color: colors.adminText }]}>Fee record updated</Text>
                      <Text style={[styles.activitySub, { color: colors.adminTextSecondary }]}>Semester fees updated</Text>
                    </View>
                    <Text style={[styles.activityTime, { color: colors.adminTextSecondary }]}>09:31 AM</Text>
                  </View>

                  {/* Item 4 */}
                  <View style={[styles.activityRow, { borderBottomWidth: 0 }]}>
                    <View style={[styles.activityDot, { backgroundColor: "#8B5CF6" }]} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.activityTitle, { color: colors.adminText }]}>System backup completed</Text>
                      <Text style={[styles.activitySub, { color: colors.adminTextSecondary }]}>Database backup successful</Text>
                    </View>
                    <Text style={[styles.activityTime, { color: colors.adminTextSecondary }]}>08:12 AM</Text>
                  </View>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>

      {/* ============================================= */}
      {/* EDIT PROFILE MODAL */}
      {/* ============================================= */}
      <Modal visible={editModalOpen} transparent animationType="fade">
        <View style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder, borderWidth: 1 }]}>
            <Text style={[styles.modalHeader, { color: colors.adminText }]}>Edit Administrator Profile</Text>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Full Name *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                value={editName}
                onChangeText={setEditName}
                placeholder="Full Name"
                placeholderTextColor={colors.adminTextSecondary}
              />

              <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Phone Number</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                value={editPhone}
                onChangeText={setEditPhone}
                placeholder="+91 98765 00000"
                placeholderTextColor={colors.adminTextSecondary}
                keyboardType="phone-pad"
              />

              <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Administrative Designation</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                value={editDesignation}
                onChangeText={setEditDesignation}
                placeholder="e.g. Dean of Academics & Department Head"
                placeholderTextColor={colors.adminTextSecondary}
              />

              <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Assigned Department</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                value={editDepartment}
                onChangeText={setEditDepartment}
                placeholder="e.g. Computer Science & Engineering"
                placeholderTextColor={colors.adminTextSecondary}
              />

              <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Staff / Employee ID</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                value={editEmployeeCode}
                onChangeText={setEditEmployeeCode}
                placeholder="e.g. EMP-ADM-2024-001"
                placeholderTextColor={colors.adminTextSecondary}
              />

              <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Office Room / Cabin</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                value={editOfficeRoom}
                onChangeText={setEditOfficeRoom}
                placeholder="e.g. Admin Block • Room 301"
                placeholderTextColor={colors.adminTextSecondary}
              />
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.adminSurfaceAlt, borderColor: colors.adminCardBorder, borderWidth: 1 }]}
                onPress={() => setEditModalOpen(false)}
                disabled={saving}
              >
                <Text style={[styles.modalCancelBtnText, { color: colors.adminTextSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveProfile}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ADD / EDIT SPECIAL NOTE & IMPORTANT QUESTIONS MODAL */}
      <Modal
        visible={noteModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setNoteModalOpen(false)}
      >
        <Pressable
          style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}
          onPress={() => setNoteModalOpen(false)}
        >
          <Pressable
            style={[styles.modalCard, { backgroundColor: colors.card, maxWidth: 560 }]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <Ionicons name="document-text" size={22} color="#7C3AED" />
                <Text style={{ fontSize: 16, fontWeight: "800", color: colors.text }}>
                  {editingNoteId ? "Edit Special Note & Questions" : "Post Special Note & Questions"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setNoteModalOpen(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 460 }}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Note / Question Title *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                value={noteTitle}
                onChangeText={setNoteTitle}
                placeholder="e.g. Expected 10-Mark Questions: Dynamic Programming"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 10 }]}>Subject *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                value={noteSubject}
                onChangeText={setNoteSubject}
                placeholder="e.g. Data Structures & Algorithms"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 10 }]}>Category</Text>
              <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
                {(["Important Question", "Exam Special Note", "Formula Sheet", "Lab Guideline"] as const).map((cat) => {
                  const isSel = noteCategory === cat;
                  return (
                    <TouchableOpacity
                      key={cat}
                      style={{
                        paddingHorizontal: 10,
                        paddingVertical: 6,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: isSel ? "#7C3AED" : colors.border,
                        backgroundColor: isSel ? "#7C3AED" : colors.inputBg,
                      }}
                      onPress={() => setNoteCategory(cat)}
                    >
                      <Text style={{ fontSize: 11.5, fontWeight: "700", color: isSel ? "#FFFFFF" : colors.text }}>
                        {cat}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 10 }]}>Priority Level</Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                {(["High", "Medium", "Normal"] as const).map((prio) => {
                  const isSel = notePriority === prio;
                  const color = prio === "High" ? "#DC2626" : prio === "Medium" ? "#D97706" : "#4F46E5";
                  return (
                    <TouchableOpacity
                      key={prio}
                      style={{
                        flex: 1,
                        paddingVertical: 7,
                        alignItems: "center",
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: isSel ? color : colors.border,
                        backgroundColor: isSel ? (prio === "High" ? "#FEE2E2" : prio === "Medium" ? "#FEF3C7" : "#E0E7FF") : colors.inputBg,
                      }}
                      onPress={() => setNotePriority(prio)}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "700", color: isSel ? color : colors.textSecondary }}>
                        {prio}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 10 }]}>Target Class / Batch</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text }]}
                value={noteTargetClass}
                onChangeText={setNoteTargetClass}
                placeholder="e.g. CSE - 6th Semester (Sec A)"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 10 }]}>Questions / Notes Content *</Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text, minHeight: 110, textAlignVertical: "top" },
                ]}
                value={noteContent}
                onChangeText={setNoteContent}
                placeholder="Type or paste high-yield questions, revision notes, formula explanations, or exam instructions..."
                placeholderTextColor={colors.textMuted}
                multiline
              />

              {/* Photo / Diagram / Whiteboard Notes Attachment */}
              <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, marginTop: 12, backgroundColor: isDark ? colors.surface : "#F8FAFC" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="image" size={16} color="#7C3AED" />
                  <Text style={{ fontSize: 12, fontWeight: "700", color: colors.text }}>Diagram, Whiteboard & Visual Notes</Text>
                </View>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                  Upload diagrams or snap whiteboard/handwritten notes with camera
                </Text>

                {Boolean(notePhotoUrl) ? (
                  <View style={{ marginTop: 8 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", paddingTop: 4 }}>
                      <Image source={{ uri: notePhotoUrl }} style={{ width: 44, height: 44, borderRadius: 6 }} />
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={{ fontSize: 11.5, fontWeight: "600", color: colors.text }} numberOfLines={1}>
                          {notePhotoName || "Photo Attached"}
                        </Text>
                        <Text style={{ fontSize: 10.5, color: "#16A34A" }}>✓ Diagram ready to save</Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                      <TouchableOpacity
                        style={{ flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: "#7C3AED", backgroundColor: isDark ? "rgba(124,58,237,0.2)" : "#EDE9FE", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 6 }}
                        onPress={handlePickNotePhoto}
                      >
                        <Ionicons name="images-outline" size={13} color="#7C3AED" />
                        <Text style={{ fontSize: 11, fontWeight: "700", color: "#7C3AED" }}>🔄 Replace (Gallery)</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={{ flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: "#7C3AED", backgroundColor: isDark ? "rgba(124,58,237,0.2)" : "#EDE9FE", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 6 }}
                        onPress={handleTakeNotePhoto}
                      >
                        <Ionicons name="camera-outline" size={13} color="#7C3AED" />
                        <Text style={{ fontSize: 11, fontWeight: "700", color: "#7C3AED" }}>📷 Retake (Camera)</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={{ flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: "#FCA5A5", backgroundColor: isDark ? "rgba(239,68,68,0.15)" : "#FEE2E2", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 6 }}
                        onPress={() => { setNotePhotoUrl(""); setNotePhotoName(""); }}
                      >
                        <Ionicons name="trash-outline" size={13} color="#EF4444" />
                        <Text style={{ fontSize: 11, fontWeight: "700", color: "#EF4444" }}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={{ marginTop: 8 }}>
                    <View style={{ flexDirection: "row", gap: 8 }}>
                      <TouchableOpacity
                        style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: "#7C3AED", backgroundColor: isDark ? "rgba(124,58,237,0.2)" : "#EDE9FE", paddingVertical: 8, borderRadius: 8 }}
                        onPress={handlePickNotePhoto}
                      >
                        <Ionicons name="images-outline" size={15} color="#7C3AED" />
                        <Text style={{ fontSize: 11.5, fontWeight: "700", color: "#7C3AED" }}>🖼️ Gallery Pick</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={{ flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: "#7C3AED", backgroundColor: isDark ? "rgba(124,58,237,0.2)" : "#EDE9FE", paddingVertical: 8, borderRadius: 8 }}
                        onPress={handleTakeNotePhoto}
                      >
                        <Ionicons name="camera-outline" size={15} color="#7C3AED" />
                        <Text style={{ fontSize: 11.5, fontWeight: "700", color: "#7C3AED" }}>📷 Snap Whiteboard</Text>
                      </TouchableOpacity>
                    </View>

                    <TextInput
                      style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text, marginTop: 8 }]}
                      value={notePhotoUrl}
                      onChangeText={setNotePhotoUrl}
                      placeholder="Or paste photo/diagram URL..."
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                )}
              </View>

              {/* PDF Document Attachment */}
              <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, marginTop: 10, backgroundColor: isDark ? colors.surface : "#F8FAFC" }}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                  <Ionicons name="document-text" size={16} color="#DC2626" />
                  <Text style={{ fontSize: 12, fontWeight: "700", color: colors.text }}>Notes PDF & Document Attachment</Text>
                </View>
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2 }}>
                  Upload question bank, formula cheatsheet, or syllabus notes
                </Text>

                {Boolean(notePdfUrl) ? (
                  <View style={{ marginTop: 8 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", paddingTop: 4 }}>
                      <Ionicons name="document-text" size={24} color="#DC2626" />
                      <View style={{ flex: 1, marginLeft: 8 }}>
                        <Text style={{ fontSize: 11.5, fontWeight: "600", color: colors.text }} numberOfLines={1}>
                          {notePdfName || "Document.pdf"}
                        </Text>
                        <Text style={{ fontSize: 10.5, color: "#16A34A" }}>✓ PDF Document ready to save</Text>
                      </View>
                    </View>

                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                      <TouchableOpacity
                        style={{ flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: "#DC2626", backgroundColor: isDark ? "rgba(239,68,68,0.15)" : "#FEE2E2", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 6 }}
                        onPress={handlePickNotePdf}
                      >
                        <Ionicons name="cloud-upload-outline" size={13} color="#DC2626" />
                        <Text style={{ fontSize: 11, fontWeight: "700", color: "#DC2626" }}>🔄 Change / Replace PDF</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={{ flexDirection: "row", alignItems: "center", gap: 4, borderWidth: 1, borderColor: "#FCA5A5", backgroundColor: isDark ? "rgba(239,68,68,0.15)" : "#FEE2E2", paddingHorizontal: 9, paddingVertical: 5, borderRadius: 6 }}
                        onPress={() => { setNotePdfUrl(""); setNotePdfName(""); }}
                      >
                        <Ionicons name="trash-outline" size={13} color="#EF4444" />
                        <Text style={{ fontSize: 11, fontWeight: "700", color: "#EF4444" }}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={{ marginTop: 8 }}>
                    <TouchableOpacity
                      style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: "#DC2626", backgroundColor: isDark ? "rgba(239,68,68,0.15)" : "#FEE2E2", paddingVertical: 8, borderRadius: 8 }}
                      onPress={handlePickNotePdf}
                    >
                      <Ionicons name="cloud-upload-outline" size={15} color="#DC2626" />
                      <Text style={{ fontSize: 11.5, fontWeight: "700", color: "#DC2626" }}>📄 Upload Notes PDF Document</Text>
                    </TouchableOpacity>

                    <TextInput
                      style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.border, color: colors.text, marginTop: 8 }]}
                      value={notePdfUrl}
                      onChangeText={setNotePdfUrl}
                      placeholder="Or paste PDF document URL..."
                      placeholderTextColor={colors.textMuted}
                    />
                  </View>
                )}
              </View>
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: colors.border }]}
                onPress={() => setNoteModalOpen(false)}
                disabled={savingNote}
              >
                <Text style={[styles.modalCancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: "#7C3AED" }]}
                onPress={handleSaveSpecialNote}
                disabled={savingNote}
              >
                {savingNote ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveBtnText}>
                    {editingNoteId ? "Update Note in Firebase" : "Publish Note to Students"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ====================================================== */}
      {/* TEACHER-STUDENT CHAT MODAL */}
      {/* ====================================================== */}
      <Modal
        visible={teacherChatModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setTeacherChatModalVisible(false)}
      >
        <View style={styles.chatModalOverlay}>
          <View style={[styles.chatModalBox, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
            {/* Modal Header */}
            <View style={[styles.chatModalHeader, { borderBottomColor: colors.adminCardBorder }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
                <View style={styles.studentModalAvatar}>
                  <Ionicons name="person" size={18} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.chatModalTitle, { color: colors.adminText }]} numberOfLines={1}>
                    {selectedStudentForChat?.studentName || "Student"}
                  </Text>
                  <Text style={[styles.chatModalSub, { color: colors.adminTextSecondary }]}>
                    Roll: {selectedStudentForChat?.rollNo} • {selectedStudentForChat?.department} (Sec {selectedStudentForChat?.section})
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.chatModalCloseBtn}
                onPress={() => setTeacherChatModalVisible(false)}
              >
                <Ionicons name="close" size={22} color={colors.adminTextSecondary} />
              </TouchableOpacity>
            </View>

            {/* Chat Messages List */}
            <ScrollView
              style={styles.chatModalScroll}
              contentContainerStyle={styles.chatModalScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {teacherChatMessages.length === 0 ? (
                <View style={{ alignItems: "center", paddingVertical: 40 }}>
                  <Ionicons name="chatbubbles-outline" size={38} color={colors.adminTextSecondary} />
                  <Text style={{ fontSize: 13, color: colors.adminTextSecondary, marginTop: 8, textAlign: "center" }}>
                    No messages yet. Send a message or study guidance to help {selectedStudentForChat?.studentName}!
                  </Text>
                </View>
              ) : (
                teacherChatMessages.map((msg: any) => {
                  const isTeacher = msg.senderRole === "teacher";
                  return (
                    <View
                      key={msg.id}
                      style={[
                        styles.chatModalMsgRow,
                        isTeacher ? styles.chatModalMsgRowMe : styles.chatModalMsgRowOther,
                      ]}
                    >
                      <View
                        style={[
                          styles.chatModalBubble,
                          isTeacher
                            ? styles.chatModalBubbleMe
                            : [styles.chatModalBubbleOther, { backgroundColor: isDark ? colors.adminBg : "#F1F5F9", borderColor: colors.adminCardBorder }],
                        ]}
                      >
                        <Text
                          style={[
                            styles.chatModalSenderName,
                            { color: isTeacher ? "#E0E7FF" : colors.adminTextSecondary },
                          ]}
                        >
                          {msg.senderName || (isTeacher ? "Professor" : "Student")}
                        </Text>
                        {Boolean(msg.photoUrl) && (
                          <Image
                            source={{ uri: msg.photoUrl }}
                            style={styles.chatModalPhoto}
                            resizeMode="cover"
                          />
                        )}
                        {Boolean(msg.text) && (
                          <Text
                            style={[
                              styles.chatModalMsgText,
                              { color: isTeacher ? "#FFFFFF" : colors.adminText },
                            ]}
                          >
                            {msg.text}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })
              )}
            </ScrollView>

            {/* Input Bar */}
            <View style={[styles.chatModalInputBar, { borderTopColor: colors.adminCardBorder }]}>
              {teacherChatPhoto && (
                <View style={styles.photoThumbWrap}>
                  <Image source={{ uri: teacherChatPhoto }} style={styles.photoThumb} />
                  <TouchableOpacity onPress={() => setTeacherChatPhoto(null)} style={styles.photoRemove}>
                    <Ionicons name="close-circle" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              )}
              <View style={[styles.chatModalInputPill, { backgroundColor: isDark ? colors.adminBg : "#F1F5F9", borderColor: colors.adminCardBorder }]}>
                <TouchableOpacity
                  onPress={async () => {
                    const res = await ImagePicker.launchImageLibraryAsync({ allowsEditing: true, quality: 0.7 });
                    if (!res.canceled && res.assets?.[0]?.uri) {
                      setTeacherChatPhoto(res.assets[0].uri);
                    }
                  }}
                  style={{ padding: 4 }}
                >
                  <Ionicons name="camera-outline" size={20} color={teacherChatPhoto ? "#4F46E5" : colors.adminTextSecondary} />
                </TouchableOpacity>

                <TextInput
                  style={[styles.chatModalTextInput, { color: colors.adminText }]}
                  placeholder="Type advice, notes, or response..."
                  placeholderTextColor={colors.adminTextSecondary}
                  value={teacherChatInput}
                  onChangeText={setTeacherChatInput}
                  multiline
                />

                <TouchableOpacity
                  style={[styles.chatModalSendBtn, (!teacherChatInput.trim() && !teacherChatPhoto) && { opacity: 0.5 }]}
                  onPress={handleSendTeacherChatMessage}
                  disabled={(!teacherChatInput.trim() && !teacherChatPhoto) || teacherChatSending}
                >
                  {teacherChatSending ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="send" size={14} color="#FFFFFF" />
                  )}
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
    backgroundColor: "#F8FAFC",
  },

  loadingContainer: {
    flex: 1,
    backgroundColor: "#F8FAFC",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingText: {
    marginTop: 12,
    color: "#475569",
    fontSize: 15,
    fontWeight: "600",
  },

  mainLayout: {
    flex: 1,
    flexDirection: "row",
  },

  // Sidebar
  sidebar: {
    width: 230,
    backgroundColor: "#20123A",
    display: "flex",
    flexDirection: "column",
    justifyContent: "space-between",
  },

  mobileSidebar: {
    width: 260,
    height: "100%",
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 999,
  },

  mobileModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.6)",
    flexDirection: "row",
  },

  sidebarBrand: {
    paddingHorizontal: 20,
    paddingVertical: 22,
    flexDirection: "row",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255,255,255,0.08)",
  },

  brandIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#5D3EBC",
    justifyContent: "center",
    alignItems: "center",
  },

  brandTitle: {
    color: "#FFFFFF",
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.3,
  },

  brandSubtitle: {
    color: "#A78BFA",
    fontSize: 12,
    fontWeight: "500",
  },

  closeSidebarBtn: {
    marginLeft: "auto",
    padding: 6,
  },

  sidebarNavScroll: {
    paddingHorizontal: 12,
    paddingVertical: 14,
    gap: 4,
  },

  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    gap: 12,
  },

  navItemActive: {
    backgroundColor: "#5D3EBC",
  },

  navItemLabel: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontWeight: "600",
  },

  navItemLabelActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  sidebarLogout: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.08)",
  },

  sidebarLogoutText: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 14,
    fontWeight: "600",
  },

  // Content Area
  contentArea: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },

  // Top Bar
  topBar: {
    height: 64,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    gap: 16,
  },

  menuHamburger: {
    padding: 6,
    marginRight: 4,
  },

  searchBar: {
    flex: 1,
    maxWidth: 420,
    height: 42,
    backgroundColor: "#F8FAFC",
    borderRadius: 21,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
  },

  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 13.5,
    color: "#0F172A",
  },

  topRightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },

  bellBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    justifyContent: "center",
    alignItems: "center",
  },

  bellBadge: {
    position: "absolute",
    top: 2,
    right: 2,
    backgroundColor: "#EF4444",
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  bellBadgeText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "800",
  },

  adminProfileChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 4,
    paddingHorizontal: 6,
  },

  avatarImg: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },

  adminProfileTextCol: {
    display: "flex",
  },

  adminProfileName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },

  adminProfileRole: {
    fontSize: 11,
    color: "#64748B",
  },

  // Scroll Content
  scrollContent: {
    padding: 20,
    paddingBottom: 50,
  },

  // Purple Page Banner
  headerBanner: {
    backgroundColor: "#4C2E85",
    borderRadius: 18,
    paddingHorizontal: 22,
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },

  bannerLeft: {
    flex: 1,
  },

  bannerTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "800",
  },

  bannerSubtitle: {
    color: "#DDD6FE",
    fontSize: 13,
    marginTop: 4,
  },

  bannerIconContainer: {
    paddingRight: 10,
  },

  // Hero & Stats Row
  heroStatRow: {
    flexDirection: "row",
    gap: 16,
    marginBottom: 20,
  },

  heroStatRowMobile: {
    flexDirection: "column",
  },

  profileSummaryCard: {
    flex: 1.2,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },

  avatarWrapper: {
    position: "relative",
    marginRight: 18,
  },

  summaryAvatar: {
    width: 78,
    height: 78,
    borderRadius: 39,
  },

  cameraBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#5D3EBC",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },

  summaryDetails: {
    flex: 1,
  },

  nameBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 6,
  },

  summaryName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },

  adminBadge: {
    backgroundColor: "#EDE9FE",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },

  adminBadgeText: {
    color: "#7C3AED",
    fontSize: 11,
    fontWeight: "700",
  },

  summaryMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 3,
  },

  summaryMetaText: {
    fontSize: 12,
    color: "#64748B",
  },

  // Stat Mini Cards Grid
  statCardsGrid: {
    flex: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  statMiniCard: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },

  statIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },

  statMiniVal: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },

  statMiniLabel: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },

  // 2-Col Section
  twoColSection: {
    flexDirection: "row",
    gap: 16,
  },

  twoColMobile: {
    flexDirection: "column",
  },

  colLeft: {
    flex: 1.2,
    gap: 16,
  },

  colRight: {
    flex: 1,
    gap: 16,
  },

  // Card Box
  cardBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },

  cardBoxHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  headerLeftWithIcon: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  cardBoxTitle: {
    fontSize: 14.5,
    fontWeight: "800",
    color: "#0F172A",
  },

  editBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },

  editBtnText: {
    color: "#5D3EBC",
    fontSize: 12,
    fontWeight: "700",
  },

  fieldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },

  fieldLabelGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  fieldLabel: {
    fontSize: 13,
    color: "#64748B",
  },

  fieldValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },

  fieldDivider: {
    height: 1,
    backgroundColor: "#F8FAFC",
  },

  // Account Settings Items
  settingItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
    gap: 12,
  },

  settingIconBox: {
    width: 34,
    height: 34,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },

  settingTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },

  settingSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },

  // Promo Card
  promoBottomCard: {
    backgroundColor: "#5D3EBC",
    borderRadius: 16,
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
  },

  promoBottomTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
  },

  promoBottomSub: {
    color: "#C4B5FD",
    fontSize: 12,
    marginTop: 3,
  },

  promoBottomScript: {
    color: "#FFFFFF",
    fontSize: 11,
    fontStyle: "italic",
    marginTop: 6,
    opacity: 0.8,
  },

  // Role & Permissions
  fullAccessBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },

  fullAccessText: {
    color: "#15803D",
    fontSize: 11,
    fontWeight: "800",
  },

  // Quick Action Items
  quickActionItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
    gap: 10,
  },

  quickActionText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
  },

  viewAllText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#5D3EBC",
  },

  // Recent Activity
  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#F8FAFC",
    gap: 10,
  },

  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  activityTitle: {
    fontSize: 12.5,
    fontWeight: "700",
    color: "#0F172A",
  },

  activitySub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 1,
  },

  activityTime: {
    fontSize: 10.5,
    color: "#94A3B8",
    fontWeight: "600",
  },

  // Edit Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15,23,42,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },

  modalCard: {
    width: "100%",
    maxWidth: 440,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 22,
  },

  modalHeader: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
    marginBottom: 16,
  },

  inputLabel: {
    fontSize: 12.5,
    fontWeight: "600",
    color: "#64748B",
    marginBottom: 6,
  },

  textInput: {
    height: 44,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 12,
    paddingHorizontal: 14,
    fontSize: 13.5,
    color: "#0F172A",
    marginBottom: 14,
  },

  modalBtnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },

  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F1F5F9",
    justifyContent: "center",
    alignItems: "center",
  },

  modalCancelBtnText: {
    color: "#64748B",
    fontWeight: "700",
    fontSize: 13.5,
  },

  modalSaveBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#5D3EBC",
    justifyContent: "center",
    alignItems: "center",
  },

  modalSaveBtnText: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 13.5,
  },

  /* TEACHER-STUDENT CHAT STYLES */
  studentChatCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  studentChatAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center",
  },
  studentChatName: {
    fontSize: 13.5,
    fontWeight: "700",
  },
  studentChatMeta: {
    fontSize: 11.5,
    marginTop: 2,
  },
  studentChatBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#4F46E5",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  studentChatBtnText: {
    color: "#FFFFFF",
    fontSize: 11.5,
    fontWeight: "700",
  },
  chatModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  chatModalBox: {
    width: "100%",
    maxWidth: 520,
    height: "80%",
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
  },
  chatModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  studentModalAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center",
  },
  chatModalTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  chatModalSub: {
    fontSize: 11.5,
    marginTop: 1,
  },
  chatModalCloseBtn: {
    padding: 6,
  },
  chatModalScroll: {
    flex: 1,
  },
  chatModalScrollContent: {
    padding: 14,
  },
  chatModalMsgRow: {
    flexDirection: "row",
    marginBottom: 10,
  },
  chatModalMsgRowMe: {
    justifyContent: "flex-end",
  },
  chatModalMsgRowOther: {
    justifyContent: "flex-start",
  },
  chatModalBubble: {
    maxWidth: "80%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 14,
  },
  chatModalBubbleMe: {
    backgroundColor: "#4F46E5",
    borderBottomRightRadius: 2,
  },
  chatModalBubbleOther: {
    borderBottomLeftRadius: 2,
    borderWidth: 1,
  },
  chatModalSenderName: {
    fontSize: 10,
    fontWeight: "700",
    marginBottom: 3,
  },
  chatModalPhoto: {
    width: 180,
    height: 120,
    borderRadius: 8,
    marginVertical: 4,
  },
  chatModalMsgText: {
    fontSize: 13,
    lineHeight: 18,
  },
  chatModalInputBar: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  photoThumbWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  photoThumb: {
    width: 40,
    height: 40,
    borderRadius: 6,
  },
  photoRemove: {
    marginLeft: 6,
  },
  chatModalInputPill: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chatModalTextInput: {
    flex: 1,
    fontSize: 13,
    maxHeight: 80,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  chatModalSendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#4F46E5",
    alignItems: "center",
    justifyContent: "center",
  },
});