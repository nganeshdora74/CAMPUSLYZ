import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
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
import { auth, db } from "../../firebase/config";
import { confirmLogout } from "../../firebase/auth";
import { useAppTheme } from "../../context/ThemeContext";
import AdminThemeToggle from "../../components/admin/AdminThemeToggle";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTopBar from "../../components/admin/AdminTopBar";
import {
  collection,
  doc,
  addDoc,
  deleteDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";

const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "home", route: "/admin" },
  { id: "students", label: "Students", icon: "person", route: "/admin/student" },
  { id: "faculty", label: "Faculty", icon: "people", route: "/admin/faculty" },
  { id: "academics", label: "Academics", icon: "book", route: "/admin/academics" },
  { id: "schedule", label: "Schedule", icon: "calendar", route: "/admin/schedule" },
  { id: "attendance", label: "Attendance", icon: "checkbox", route: "/admin/attendence" },
  { id: "certificates", label: "Certificates", icon: "ribbon", route: "/admin/certificate" },
  { id: "hostel", label: "Hostel", icon: "business", route: "/admin/hostel" },
  { id: "mess", label: "Mess", icon: "restaurant", route: "/admin/mess" },
  { id: "fees", label: "Fees", icon: "wallet", route: "/admin/fees" },
  { id: "notices", label: "Notices", icon: "megaphone", route: "/admin/notices" },
  { id: "requests", label: "Requests", icon: "document-text", route: "/admin/requests" },
  { id: "reports", label: "Reports", icon: "bar-chart", route: "/admin/reports" },
  { id: "ai-assistant", label: "AI Assistant", icon: "sparkles", route: "/admin/ai-assistant" },
  { id: "settings", label: "Settings", icon: "settings", route: "/admin/settings" },
  { id: "profile", label: "Profile", icon: "person-circle", route: "/admin/profile" },
];

export type MessFeedback = {
  id: string;
  studentId?: string;
  studentName?: string;
  studentRollNo?: string;
  studentEmail?: string;
  meal?: string;
  rating?: number;
  tasteRating?: number;
  hygieneRating?: number;
  comment?: string;
  feedback?: string;
  status?: string;
  date?: string;
  adminReply?: string;
  adminRepliedAt?: any;
  createdAt?: any;
};

export default function AdminMessScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const { isDark, colors } = useAppTheme();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [updateMenuModal, setUpdateMenuModal] = useState(false);
  const [breakfast, setBreakfast] = useState("Idli, Sambar, Chutney");
  const [lunch, setLunch] = useState("Rice, Dal, Veg Curry, Curd");
  const [dinner, setDinner] = useState("Roti, Paneer, Rice, Dal");

  // Supervisor details
  const [supervisorModal, setSupervisorModal] = useState(false);
  const [supervisorName, setSupervisorName] = useState("Mr. Suresh Rao");
  const [supervisorPhone, setSupervisorPhone] = useState("+91 98765 67890");
  const [supervisorRole, setSupervisorRole] = useState("Chief Mess Supervisor");
  const [supervisorTiming, setSupervisorTiming] = useState("6:00 AM - 10:00 PM");
  const [supervisorOffice, setSupervisorOffice] = useState("Central Dining Hall, Office #102");
  const [safetyOfficerName, setSafetyOfficerName] = useState("Dr. S. Nair");
  const [safetyOfficerPhone, setSafetyOfficerPhone] = useState("+91 98765 44321");
  const [savingSupervisor, setSavingSupervisor] = useState(false);

  // Student Daily Feedback
  const [feedbacks, setFeedbacks] = useState<MessFeedback[]>([]);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [feedbackFilter, setFeedbackFilter] = useState("All");

  // Admin Reply & Delete States
  const [replyModalVisible, setReplyModalVisible] = useState(false);
  const [replyingFeedback, setReplyingFeedback] = useState<MessFeedback | null>(null);
  const [adminReplyText, setAdminReplyText] = useState("");
  const [savingReply, setSavingReply] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [feedbackToDelete, setFeedbackToDelete] = useState<MessFeedback | null>(null);
  const [deletingFeedback, setDeletingFeedback] = useState(false);

  // Load Mess Menu from Firestore
  useEffect(() => {
    const menuDoc = doc(db, "system", "messMenu");
    const unsubscribe = onSnapshot(menuDoc, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.breakfast) setBreakfast(data.breakfast);
        if (data.lunch) setLunch(data.lunch);
        if (data.dinner) setDinner(data.dinner);
      }
    });
    return () => unsubscribe();
  }, []);

  // Load Mess Supervisor from Firestore
  useEffect(() => {
    const supDoc = doc(db, "system", "messSupervisor");
    const unsubscribe = onSnapshot(supDoc, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.name) setSupervisorName(data.name);
        if (data.phone) setSupervisorPhone(data.phone);
        if (data.role) setSupervisorRole(data.role);
        if (data.timing) setSupervisorTiming(data.timing);
        if (data.office) setSupervisorOffice(data.office);
        if (data.safetyOfficerName) setSafetyOfficerName(data.safetyOfficerName);
        if (data.safetyOfficerPhone) setSafetyOfficerPhone(data.safetyOfficerPhone);
      }
    });
    return () => unsubscribe();
  }, []);

  // Load Live Student Daily Food Feedback from Firestore
  useEffect(() => {
    try {
      const q = query(collection(db, "mess_feedback"), orderBy("createdAt", "desc"));
      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          if (snapshot.empty) {
            // Provide default fallback reviews if empty
            setFeedbacks([
              {
                id: "seed-1",
                studentName: "Tuffan Sharma",
                studentRollNo: "23CSE001",
                studentEmail: "tuffan@campusly.edu",
                meal: "Lunch",
                rating: 5,
                tasteRating: 5,
                hygieneRating: 5,
                comment: "Paneer butter masala and hot rotis were exceptionally good today!",
                status: "Acknowledged",
                date: "Today",
              },
              {
                id: "seed-2",
                studentName: "Priya Patel",
                studentRollNo: "23CSE045",
                studentEmail: "priya@campusly.edu",
                meal: "Breakfast",
                rating: 4,
                tasteRating: 4,
                hygieneRating: 5,
                comment: "Crispy dosas and coconut chutney were fresh. Good hygiene in dining hall.",
                status: "Pending",
                date: "Today",
              },
              {
                id: "seed-3",
                studentName: "Rahul Verma",
                studentRollNo: "23ECE012",
                studentEmail: "rahul@campusly.edu",
                meal: "Dinner",
                rating: 4,
                tasteRating: 4,
                hygieneRating: 4,
                comment: "Dal makhani was nice. Please provide boiled eggs/curd options regularly.",
                status: "Acknowledged",
                date: "Yesterday",
              },
            ]);
            setFeedbackLoading(false);
            return;
          }

          const items: MessFeedback[] = snapshot.docs.map((docItem) => {
            const data = docItem.data();
            return {
              id: docItem.id,
              studentId: data.studentId || data.userId || "",
              studentName: data.studentName || data.userName || "Student",
              studentRollNo: data.studentRollNo || data.rollNo || "Student",
              studentEmail: data.studentEmail || data.userEmail || "",
              meal: data.meal || "Lunch",
              rating: data.rating || 5,
              tasteRating: data.tasteRating || data.rating || 5,
              hygieneRating: data.hygieneRating || 5,
              comment: data.comment || data.feedback || data.message || "Good food quality.",
              status: data.status || "Pending",
              date: data.date || "Today",
              adminReply: data.adminReply || "",
              adminRepliedAt: data.adminRepliedAt,
              createdAt: data.createdAt,
            };
          });

          setFeedbacks(items);
          setFeedbackLoading(false);
        },
        (err) => {
          console.warn("Feedback snapshot warning:", err);
          setFeedbackLoading(false);
        }
      );

      return () => unsubscribe();
    } catch (e) {
      console.warn("Mess feedback listener error:", e);
      setFeedbackLoading(false);
    }
  }, []);

  // Compute Daily Food Feedback KPI Metrics
  const feedbackMetrics = useMemo(() => {
    const total = feedbacks.length;
    if (total === 0) {
      return { avgRating: "4.8", hygieneScore: "96%", totalCount: 0 };
    }
    const sumRating = feedbacks.reduce((acc, f) => acc + (f.rating || 5), 0);
    const sumHygiene = feedbacks.reduce((acc, f) => acc + (f.hygieneRating || 5), 0);
    const avgRating = (sumRating / total).toFixed(1);
    const hygieneScore = `${Math.round((sumHygiene / (total * 5)) * 100)}%`;
    return { avgRating, hygieneScore, totalCount: total };
  }, [feedbacks]);

  const filteredFeedbacks = useMemo(() => {
    if (feedbackFilter === "All") return feedbacks;
    return feedbacks.filter(
      (f) => f.meal?.toLowerCase() === feedbackFilter.toLowerCase()
    );
  }, [feedbacks, feedbackFilter]);

  const handleSaveMenu = async () => {
    try {
      await setDoc(
        doc(db, "system", "messMenu"),
        {
          breakfast,
          lunch,
          dinner,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      await addDoc(collection(db, "activities"), {
        title: "Mess Menu Updated",
        time: "Just now",
        user: "Admin",
        type: "mess",
        createdAt: serverTimestamp(),
      });
      setUpdateMenuModal(false);
      Alert.alert("Menu Updated", "Today's mess menu updated successfully in Firebase.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to update menu");
    }
  };

  const handleSaveSupervisor = async () => {
    if (!supervisorName.trim() || !supervisorPhone.trim()) {
      Alert.alert("Missing Details", "Please enter supervisor name and phone number.");
      return;
    }

    try {
      setSavingSupervisor(true);
      const payload = {
        name: supervisorName.trim(),
        phone: supervisorPhone.trim(),
        role: supervisorRole.trim(),
        timing: supervisorTiming.trim(),
        office: supervisorOffice.trim(),
        safetyOfficerName: safetyOfficerName.trim(),
        safetyOfficerPhone: safetyOfficerPhone.trim(),
        updatedAt: serverTimestamp(),
      };

      // Save to primary and mirror doc so both admin and student app always get live data
      await setDoc(doc(db, "system", "messSupervisor"), payload, { merge: true });
      await setDoc(doc(db, "mess_info", "supervisor"), payload, { merge: true });

      await addDoc(collection(db, "activities"), {
        title: `Mess Supervisor Updated: ${supervisorName.trim()}`,
        time: "Just now",
        user: "Admin",
        type: "mess",
        createdAt: serverTimestamp(),
      });

      setSupervisorModal(false);
      Alert.alert(
        "Supervisor Details Updated",
        "Mess Supervisor name and phone number have been updated in Firebase."
      );
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to update supervisor details.");
    } finally {
      setSavingSupervisor(false);
    }
  };

  const handleToggleFeedbackStatus = async (item: MessFeedback) => {
    const newStatus = item.status === "Acknowledged" ? "Pending" : "Acknowledged";
    if (item.id.startsWith("seed-")) {
      setFeedbacks((prev) =>
        prev.map((f) => (f.id === item.id ? { ...f, status: newStatus } : f))
      );
      return;
    }

    try {
      await updateDoc(doc(db, "mess_feedback", item.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not update status.");
    }
  };

  const handleOpenReplyModal = (item: MessFeedback) => {
    setReplyingFeedback(item);
    setAdminReplyText(item.adminReply || "");
    setReplyModalVisible(true);
  };

  const handleSaveReply = async () => {
    if (!replyingFeedback) return;
    const cleanText = adminReplyText.trim();
    if (!cleanText) {
      Alert.alert("Required", "Please enter your reply before sending.");
      return;
    }

    try {
      setSavingReply(true);
      if (replyingFeedback.id.startsWith("seed-")) {
        setFeedbacks((prev) =>
          prev.map((f) =>
            f.id === replyingFeedback.id
              ? { ...f, adminReply: cleanText, status: "Acknowledged" }
              : f
          )
        );
      } else {
        await updateDoc(doc(db, "mess_feedback", replyingFeedback.id), {
          adminReply: cleanText,
          status: "Acknowledged",
          adminRepliedAt: serverTimestamp(),
        });
      }

      await addDoc(collection(db, "activities"), {
        title: `Mess Feedback Replied: "${cleanText.slice(0, 30)}..." to ${replyingFeedback.studentName}`,
        time: "Just now",
        user: "Admin",
        type: "Mess",
        createdAt: serverTimestamp(),
      });

      setReplyModalVisible(false);
      setReplyingFeedback(null);
      setAdminReplyText("");
      Alert.alert("Reply Sent! 📬", "Student can now view your official reply in the app.");
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Could not save reply.");
    } finally {
      setSavingReply(false);
    }
  };

  const handleDeleteFeedback = (item: MessFeedback) => {
    setFeedbackToDelete(item);
    setDeleteModalVisible(true);
  };

  const handleConfirmDeleteFeedback = async () => {
    if (!feedbackToDelete) return;
    try {
      setDeletingFeedback(true);
      if (feedbackToDelete.id.startsWith("seed-")) {
        setFeedbacks((prev) => prev.filter((f) => f.id !== feedbackToDelete.id));
      } else {
        await deleteDoc(doc(db, "mess_feedback", feedbackToDelete.id));
        setFeedbacks((prev) => prev.filter((f) => f.id !== feedbackToDelete.id));
      }

      await addDoc(collection(db, "activities"), {
        title: `Mess Feedback Deleted: from ${feedbackToDelete.studentName} (${feedbackToDelete.meal})`,
        time: "Just now",
        user: "Admin",
        type: "Mess",
        createdAt: serverTimestamp(),
      });

      setDeleteModalVisible(false);
      setFeedbackToDelete(null);
      Alert.alert("Feedback Deleted", "The student feedback has been permanently removed.");
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Could not delete feedback.");
    } finally {
      setDeletingFeedback(false);
    }
  };

  const handleLogout = () => {
    confirmLogout("Are you sure you want to sign out?");
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.adminSidebar }]} edges={["top", "left", "right"]}>
      <View style={[styles.mainLayout, { backgroundColor: colors.adminBg }]}>
        <AdminSidebar
          activeNav="mess"
          isDesktop={isDesktop}
          mobileMenuOpen={mobileMenuOpen}
          onCloseMobileMenu={() => setMobileMenuOpen(false)}
        />

        <View style={[styles.contentArea, { backgroundColor: colors.adminBg }]}>
          <AdminTopBar
            showSearch={true}
            searchPlaceholder="Search meals, ingredients, catering..."
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
          />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* HERO CARD: TODAY'S MENU */}
            <View style={[styles.heroCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
              <Image
                source={{
                  uri: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300&auto=format&fit=crop&q=80",
                }}
                style={styles.heroImage}
              />

              <View style={styles.heroDetails}>
                <View style={[styles.dateBadge, { backgroundColor: isDark ? "rgba(93,62,188,0.25)" : "#EEF2FF" }]}>
                  <Ionicons name="calendar-outline" size={12} color="#5D3EBC" />
                  <Text style={styles.dateBadgeText}>Today's Schedule</Text>
                </View>

                <Text style={[styles.heroTitle, { color: colors.adminText }]}>Campus Mess & Catering</Text>
                <Text style={[styles.heroSubtitle, { color: colors.adminTextSecondary }]}>Central Dining Hall • Fresh, Nutritious & Hygienic</Text>
              </View>

              <TouchableOpacity
                style={styles.editMenuBtn}
                onPress={() => setUpdateMenuModal(true)}
              >
                <Ionicons name="create-outline" size={18} color="#FFFFFF" />
                <Text style={styles.editMenuBtnText}>Edit Menu</Text>
              </TouchableOpacity>
            </View>

            {/* 3 MEAL CARDS ROW */}
            <View style={styles.mealGrid}>
              {/* Breakfast */}
              <View style={[styles.mealCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                <View style={[styles.mealIconCircle, { backgroundColor: isDark ? "rgba(234,88,12,0.2)" : "#FFF7ED" }]}>
                  <Ionicons name="sunny" size={18} color="#EA580C" />
                </View>
                <Text style={[styles.mealTitle, { color: colors.adminText }]}>Breakfast</Text>
                <Text style={[styles.mealItems, { color: colors.adminTextSecondary }]}>{breakfast}</Text>
                <View style={[styles.mealTimeBadge, { backgroundColor: colors.adminSurfaceAlt }]}>
                  <Text style={[styles.mealTimeText, { color: colors.adminTextSecondary }]}>8:00 AM - 9:30 AM</Text>
                </View>
              </View>

              {/* Lunch */}
              <View style={[styles.mealCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                <View style={[styles.mealIconCircle, { backgroundColor: isDark ? "rgba(16,185,129,0.2)" : "#ECFDF5" }]}>
                  <Ionicons name="restaurant" size={18} color="#10B981" />
                </View>
                <Text style={[styles.mealTitle, { color: colors.adminText }]}>Lunch</Text>
                <Text style={[styles.mealItems, { color: colors.adminTextSecondary }]}>{lunch}</Text>
                <View style={[styles.mealTimeBadge, { backgroundColor: colors.adminSurfaceAlt }]}>
                  <Text style={[styles.mealTimeText, { color: colors.adminTextSecondary }]}>12:30 PM - 2:00 PM</Text>
                </View>
              </View>

              {/* Dinner */}
              <View style={[styles.mealCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                <View style={[styles.mealIconCircle, { backgroundColor: isDark ? "rgba(37,99,235,0.2)" : "#EFF6FF" }]}>
                  <Ionicons name="moon" size={18} color="#2563EB" />
                </View>
                <Text style={[styles.mealTitle, { color: colors.adminText }]}>Dinner</Text>
                <Text style={[styles.mealItems, { color: colors.adminTextSecondary }]}>{dinner}</Text>
                <View style={[styles.mealTimeBadge, { backgroundColor: colors.adminSurfaceAlt }]}>
                  <Text style={[styles.mealTimeText, { color: colors.adminTextSecondary }]}>7:30 PM - 9:00 PM</Text>
                </View>
              </View>
            </View>

            {/* MESS SUPERVISOR & CATERING STAFF (EDITABLE) */}
            <View style={styles.sectionHeaderRow}>
              <View>
                <Text style={[styles.sectionTitle, { color: colors.adminText }]}>Mess Administration & Staff</Text>
                <Text style={[styles.sectionSub, { color: colors.adminTextSecondary }]}>Update supervisor phone number, timings and contacts</Text>
              </View>

              <TouchableOpacity
                style={styles.editSupervisorBtn}
                onPress={() => setSupervisorModal(true)}
              >
                <Ionicons name="create-outline" size={16} color="#4F46E5" />
                <Text style={styles.editSupervisorBtnText}>Edit Supervisor Info</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.contactsGrid}>
              <View style={[styles.contactCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                <View style={[styles.contactIconCircle, { backgroundColor: isDark ? "rgba(79,70,229,0.2)" : "#EEF2FF" }]}>
                  <Ionicons name="person" size={20} color="#4F46E5" />
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.roleBadgeRow}>
                    <Text style={[styles.contactRole, { color: colors.adminTextSecondary }]}>{supervisorRole}</Text>
                    <View style={styles.activePill}>
                      <Text style={styles.activePillText}>On Duty</Text>
                    </View>
                  </View>
                  <Text style={[styles.contactName, { color: colors.adminText }]}>{supervisorName}</Text>
                  <Text style={[styles.contactPhone, { color: colors.adminTextSecondary }]}>{supervisorPhone}</Text>
                  <Text style={[styles.contactMeta, { color: colors.adminTextSecondary }]}>
                    🕒 {supervisorTiming} • 📍 {supervisorOffice}
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.iconEditBtn, { backgroundColor: colors.adminSurfaceAlt }]}
                  onPress={() => setSupervisorModal(true)}
                >
                  <Ionicons name="pencil" size={16} color="#4F46E5" />
                </TouchableOpacity>
              </View>

              <View style={[styles.contactCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                <View style={[styles.contactIconCircle, { backgroundColor: isDark ? "rgba(16,185,129,0.2)" : "#ECFDF5" }]}>
                  <Ionicons name="nutrition" size={20} color="#10B981" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.contactRole, { color: colors.adminTextSecondary }]}>Food Safety Officer</Text>
                  <Text style={[styles.contactName, { color: colors.adminText }]}>{safetyOfficerName}</Text>
                  <Text style={[styles.contactPhone, { color: colors.adminTextSecondary }]}>{safetyOfficerPhone}</Text>
                  <Text style={[styles.contactMeta, { color: colors.adminTextSecondary }]}>Quality & Hygiene Inspections</Text>
                </View>

                <TouchableOpacity
                  style={[styles.iconEditBtn, { backgroundColor: colors.adminSurfaceAlt }]}
                  onPress={() => setSupervisorModal(true)}
                >
                  <Ionicons name="pencil" size={16} color="#10B981" />
                </TouchableOpacity>
              </View>
            </View>

            {/* STUDENT DAILY FOOD FEEDBACK SECTION */}
            <View style={[styles.feedbackSectionCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
              <View style={styles.feedbackSectionHeader}>
                <View>
                  <View style={styles.liveFeedbackTagRow}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveDotText}>LIVE UPDATES</Text>
                  </View>
                  <Text style={[styles.sectionTitle, { color: colors.adminText }]}>Daily Student Food Feedback</Text>
                  <Text style={[styles.sectionSub, { color: colors.adminTextSecondary }]}>
                    Real-time reviews and ratings submitted directly by campus students
                  </Text>
                </View>

                <View style={styles.kpiContainer}>
                  <View style={[styles.kpiBox, { backgroundColor: colors.adminSurfaceAlt }]}>
                    <Text style={[styles.kpiVal, { color: colors.adminText }]}>{feedbackMetrics.avgRating} ★</Text>
                    <Text style={[styles.kpiLabel, { color: colors.adminTextSecondary }]}>Avg Rating</Text>
                  </View>
                  <View style={[styles.kpiBox, { backgroundColor: colors.adminSurfaceAlt }]}>
                    <Text style={[styles.kpiVal, { color: colors.adminText }]}>{feedbackMetrics.totalCount}</Text>
                    <Text style={[styles.kpiLabel, { color: colors.adminTextSecondary }]}>Total Reviews</Text>
                  </View>
                  <View style={[styles.kpiBox, { backgroundColor: colors.adminSurfaceAlt }]}>
                    <Text style={[styles.kpiVal, { color: colors.adminText }]}>{feedbackMetrics.hygieneScore}</Text>
                    <Text style={[styles.kpiLabel, { color: colors.adminTextSecondary }]}>Hygiene Score</Text>
                  </View>
                </View>
              </View>

              {/* Meal Filter Pills */}
              <View style={styles.filterPillsRow}>
                {["All", "Breakfast", "Lunch", "Snacks", "Dinner"].map((meal) => {
                  const isSel = feedbackFilter === meal;
                  return (
                    <TouchableOpacity
                      key={meal}
                      style={[
                        styles.filterPill,
                        {
                          backgroundColor: isSel ? "#5D3EBC" : colors.adminSurfaceAlt,
                        },
                      ]}
                      onPress={() => setFeedbackFilter(meal)}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          {
                            color: isSel ? "#FFFFFF" : colors.adminTextSecondary,
                            fontWeight: isSel ? "700" : "500",
                          },
                        ]}
                      >
                        {meal}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Feedback List */}
              {feedbackLoading ? (
                <View style={{ paddingVertical: 30, alignItems: "center" }}>
                  <ActivityIndicator size="small" color="#4F46E5" />
                  <Text style={{ fontSize: 13, color: colors.adminTextSecondary, marginTop: 8 }}>
                    Loading student reviews...
                  </Text>
                </View>
              ) : filteredFeedbacks.length === 0 ? (
                <View style={styles.emptyFeedbackBox}>
                  <Ionicons name="chatbox-outline" size={36} color={colors.adminTextSecondary} />
                  <Text style={[styles.emptyFeedbackTitle, { color: colors.adminText }]}>No Feedback Yet for {feedbackFilter}</Text>
                  <Text style={[styles.emptyFeedbackSub, { color: colors.adminTextSecondary }]}>
                    Student feedback submitted in the app will instantly show up here.
                  </Text>
                </View>
              ) : (
                <View style={styles.feedbackList}>
                  {filteredFeedbacks.map((fb) => {
                    const isAck = fb.status === "Acknowledged";
                    return (
                      <View
                        key={fb.id}
                        style={[
                          styles.feedbackCard,
                          {
                            backgroundColor: colors.adminSurfaceAlt,
                            borderColor: colors.adminCardBorder,
                          },
                        ]}
                      >
                        <View style={styles.fbHeaderRow}>
                          <View style={styles.fbUserCol}>
                            <View style={styles.fbAvatar}>
                              <Text style={styles.fbAvatarText}>
                                {(fb.studentName || "S").charAt(0).toUpperCase()}
                              </Text>
                            </View>
                            <View>
                              <Text style={[styles.fbStudentName, { color: colors.adminText }]}>{fb.studentName}</Text>
                              <Text style={[styles.fbStudentMeta, { color: colors.adminTextSecondary }]}>
                                {fb.studentRollNo || "Student"} • {fb.date || "Today"}
                              </Text>
                            </View>
                          </View>

                          <View style={styles.fbRightHeader}>
                            <View style={styles.fbMealBadge}>
                              <Text style={styles.fbMealBadgeText}>{fb.meal}</Text>
                            </View>
                            <View style={styles.fbRatingBadge}>
                              <Text style={styles.fbRatingBadgeText}>{fb.rating} ★</Text>
                            </View>
                          </View>
                        </View>

                        {/* Ratings Bar Row */}
                        <View style={styles.ratingScoresRow}>
                          <Text style={[styles.scoreText, { color: colors.adminTextSecondary }]}>
                            Taste: <Text style={{ fontWeight: "700", color: colors.adminText }}>{fb.tasteRating || fb.rating}/5</Text>
                          </Text>
                          <Text style={styles.scoreDot}>•</Text>
                          <Text style={[styles.scoreText, { color: colors.adminTextSecondary }]}>
                            Hygiene: <Text style={{ fontWeight: "700", color: colors.adminText }}>{fb.hygieneRating || 5}/5</Text>
                          </Text>
                        </View>

                        {/* Comment */}
                        <Text style={[styles.fbCommentText, { color: colors.adminText }]}>"{fb.comment}"</Text>

                        {/* Admin Reply Box if present */}
                        {fb.adminReply ? (
                          <View
                            style={[
                              styles.adminReplyContainer,
                              {
                                backgroundColor: isDark ? "#1E293B" : "#EEF2FF",
                                borderColor: isDark ? "#334155" : "#C7D2FE",
                              },
                            ]}
                          >
                            <View style={styles.adminReplyHeaderRow}>
                              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                <Ionicons name="chatbubble-ellipses" size={13} color="#4F46E5" />
                                <Text style={styles.adminReplyBadgeText}>Official Admin Reply</Text>
                              </View>
                              <TouchableOpacity onPress={() => handleOpenReplyModal(fb)} style={{ padding: 2 }}>
                                <Ionicons name="create-outline" size={14} color="#4F46E5" />
                              </TouchableOpacity>
                            </View>
                            <Text style={[styles.adminReplyContent, { color: colors.adminText }]}>
                              {fb.adminReply}
                            </Text>
                          </View>
                        ) : null}

                        {/* Footer / Actions Row */}
                        <View style={styles.fbFooterRow}>
                          <TouchableOpacity
                            style={[styles.statusToggleBtn, isAck ? styles.statusAck : styles.statusPending]}
                            onPress={() => handleToggleFeedbackStatus(fb)}
                          >
                            <Ionicons
                              name={isAck ? "checkmark-circle" : "time-outline"}
                              size={14}
                              color={isAck ? "#059669" : "#D97706"}
                            />
                            <Text
                              style={[
                                styles.statusToggleText,
                                { color: isAck ? "#059669" : "#D97706" },
                              ]}
                            >
                              {isAck ? "Acknowledged" : "Pending Review"}
                            </Text>
                          </TouchableOpacity>

                          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                            <TouchableOpacity
                              style={[
                                styles.replyActionBtn,
                                {
                                  backgroundColor: isDark ? "#312E81" : "#EEF2FF",
                                  borderColor: isDark ? "#4338CA" : "#C7D2FE",
                                },
                              ]}
                              onPress={() => handleOpenReplyModal(fb)}
                            >
                              <Ionicons name="chatbubble-ellipses-outline" size={13} color="#4F46E5" />
                              <Text style={[styles.replyActionBtnText, { color: "#4F46E5" }]}>
                                {fb.adminReply ? "Edit Reply" : "Reply"}
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[
                                styles.deleteFeedbackBtn,
                                {
                                  backgroundColor: isDark ? "#450A0A" : "#FEE2E2",
                                  borderColor: isDark ? "#7F1D1D" : "#FECACA",
                                },
                              ]}
                              onPress={() => handleDeleteFeedback(fb)}
                            >
                              <Ionicons name="trash-outline" size={13} color="#EF4444" />
                              <Text style={[styles.deleteFeedbackBtnText, { color: "#EF4444" }]}>Delete</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            <View style={{ height: 40 }} />
          </ScrollView>
        </View>
      </View>

      {/* EDIT MENU MODAL */}
      <Modal visible={updateMenuModal} transparent animationType="fade" onRequestClose={() => setUpdateMenuModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.adminText }]}>Update Today's Mess Menu</Text>
              <TouchableOpacity onPress={() => setUpdateMenuModal(false)}>
                <Ionicons name="close" size={24} color={colors.adminTextSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Breakfast Items</Text>
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
                value={breakfast}
                onChangeText={setBreakfast}
                placeholder="e.g. Idli, Vada, Chutney, Coffee"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Lunch Items</Text>
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
                value={lunch}
                onChangeText={setLunch}
                placeholder="e.g. Steamed Rice, Dal Tadka, Paneer, Curd"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Dinner Items</Text>
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
                value={dinner}
                onChangeText={setDinner}
                placeholder="e.g. Butter Roti, Dal Fry, Jeera Rice, Gulab Jamun"
              />
            </View>

            <View style={[styles.modalFooter, { borderTopColor: colors.adminCardBorder }]}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.adminSurfaceAlt }]}
                onPress={() => setUpdateMenuModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.adminTextSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSaveMenu}
              >
                <Text style={styles.modalSubmitText}>Save Menu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* EDIT SUPERVISOR DETAILS MODAL */}
      <Modal visible={supervisorModal} transparent animationType="fade" onRequestClose={() => setSupervisorModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.adminText }]}>Update Mess Supervisor Details</Text>
                <Text style={[styles.modalSubtitleSmall, { color: colors.adminTextSecondary }]}>
                  Changes will update in real time across the entire campus app
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSupervisorModal(false)}>
                <Ionicons name="close" size={24} color={colors.adminTextSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Mess Supervisor Name</Text>
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
                  value={supervisorName}
                  onChangeText={setSupervisorName}
                  placeholder="e.g. Mr. Suresh Rao"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Supervisor Contact Phone Number</Text>
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
                  value={supervisorPhone}
                  onChangeText={setSupervisorPhone}
                  placeholder="e.g. +91 98765 67890"
                  keyboardType="phone-pad"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Supervisor Role / Designation</Text>
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
                  value={supervisorRole}
                  onChangeText={setSupervisorRole}
                  placeholder="e.g. Chief Mess Supervisor"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Office / Dining Hall Location</Text>
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
                  value={supervisorOffice}
                  onChangeText={setSupervisorOffice}
                  placeholder="e.g. Central Dining Hall, Room 102"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Operating Timings</Text>
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
                  value={supervisorTiming}
                  onChangeText={setSupervisorTiming}
                  placeholder="e.g. 6:00 AM - 10:00 PM"
                />
              </View>

              <View style={[styles.dividerThin, { backgroundColor: colors.adminCardBorder }]} />

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Food Safety Officer Name</Text>
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
                  value={safetyOfficerName}
                  onChangeText={setSafetyOfficerName}
                  placeholder="e.g. Dr. S. Nair"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Food Safety Officer Phone</Text>
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
                  value={safetyOfficerPhone}
                  onChangeText={setSafetyOfficerPhone}
                  placeholder="e.g. +91 98765 44321"
                  keyboardType="phone-pad"
                />
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.adminCardBorder }]}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.adminSurfaceAlt }]}
                onPress={() => setSupervisorModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.adminTextSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSaveSupervisor}
                disabled={savingSupervisor}
              >
                {savingSupervisor ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>Save Supervisor</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ADMIN REPLY MODAL */}
      <Modal
        visible={replyModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setReplyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder, maxWidth: 540 }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.adminText }]}>Reply to Student Feedback</Text>
                <Text style={[styles.modalSubtitleSmall, { color: colors.adminTextSecondary }]}>
                  Student will receive and view your response directly in their app
                </Text>
              </View>
              <TouchableOpacity onPress={() => setReplyModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.adminTextSecondary} />
              </TouchableOpacity>
            </View>

            {replyingFeedback && (
              <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
                {/* Original student feedback summary */}
                <View style={[styles.originalFeedbackBox, { backgroundColor: colors.adminSurfaceAlt, borderColor: colors.adminCardBorder }]}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                    <Text style={[styles.origStudentName, { color: colors.adminText }]}>
                      {replyingFeedback.studentName} ({replyingFeedback.studentRollNo || "Student"})
                    </Text>
                    <View style={styles.fbMealBadge}>
                      <Text style={styles.fbMealBadgeText}>{replyingFeedback.meal} • {replyingFeedback.rating}★</Text>
                    </View>
                  </View>
                  <Text style={[styles.origCommentText, { color: colors.adminTextSecondary }]}>
                    "{replyingFeedback.comment}"
                  </Text>
                </View>

                {/* Quick reply templates */}
                <Text style={[styles.inputLabel, { color: colors.adminTextSecondary, marginTop: 12 }]}>
                  Quick Templates
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", gap: 8, paddingVertical: 4 }}>
                    {[
                      "Thank you for your feedback! We will resolve this promptly.",
                      "Kitchen staff notified to improve taste & preparation.",
                      "Hygiene standards re-inspected and strictly enforced.",
                      "Menu adjusted based on student recommendations.",
                    ].map((template, idx) => (
                      <TouchableOpacity
                        key={idx}
                        style={[styles.quickChip, { backgroundColor: isDark ? "#334155" : "#EEF2FF", borderColor: isDark ? "#475569" : "#C7D2FE" }]}
                        onPress={() => setAdminReplyText(template)}
                      >
                        <Text style={[styles.quickChipText, { color: isDark ? "#E2E8F0" : "#4338CA" }]} numberOfLines={1}>
                          {template}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>

                {/* Admin Reply text field */}
                <View style={styles.inputGroup}>
                  <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>
                    Official Response
                  </Text>
                  <TextInput
                    style={[
                      styles.modalInput,
                      {
                        backgroundColor: colors.adminInputBg,
                        borderColor: colors.adminInputBorder,
                        color: colors.adminText,
                        minHeight: 100,
                        textAlignVertical: "top",
                        paddingTop: 10,
                      },
                    ]}
                    placeholderTextColor={colors.adminTextSecondary}
                    value={adminReplyText}
                    onChangeText={setAdminReplyText}
                    placeholder="Type official response from mess administration..."
                    multiline
                    numberOfLines={4}
                  />
                </View>
              </ScrollView>
            )}

            <View style={[styles.modalFooter, { borderTopColor: colors.adminCardBorder }]}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.adminSurfaceAlt }]}
                onPress={() => setReplyModalVisible(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.adminTextSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleSaveReply}
                disabled={savingReply}
              >
                {savingReply ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>Send Reply</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* DELETE CONFIRMATION MODAL */}
      <Modal
        visible={deleteModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDeleteModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder, maxWidth: 440 }]}>
            <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 16 }}>
              <View style={[styles.deleteModalIconCircle, { backgroundColor: isDark ? "#450A0A" : "#FEE2E2" }]}>
                <Ionicons name="trash" size={28} color="#EF4444" />
              </View>
              <Text style={[styles.deleteModalTitle, { color: colors.adminText }]}>Delete Feedback?</Text>
              <Text style={[styles.deleteModalMessage, { color: colors.adminTextSecondary }]}>
                Are you sure you want to permanently remove this feedback from{" "}
                <Text style={{ fontWeight: "700", color: colors.adminText }}>
                  {feedbackToDelete?.studentName || "Student"}
                </Text>{" "}
                for <Text style={{ fontWeight: "700", color: colors.adminText }}>{feedbackToDelete?.meal}</Text>? This action cannot be undone.
              </Text>
            </View>

            <View style={[styles.modalFooter, { borderTopColor: colors.adminCardBorder }]}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.adminSurfaceAlt }]}
                onPress={() => setDeleteModalVisible(false)}
                disabled={deletingFeedback}
              >
                <Text style={[styles.modalCancelText, { color: colors.adminTextSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: "#EF4444" }]}
                onPress={handleConfirmDeleteFeedback}
                disabled={deletingFeedback}
              >
                {deletingFeedback ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSubmitText}>Delete Feedback</Text>
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
    backgroundColor: "#F8FAFC",
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
    gap: 4,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    gap: 12,
  },
  navItemActive: {
    backgroundColor: "#5D3EBC",
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
    marginTop: 6,
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
  heroCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginBottom: 20,
    alignItems: "center",
    gap: 16,
    flexWrap: "wrap",
  },
  heroImage: {
    width: 90,
    height: 90,
    borderRadius: 12,
  },
  heroDetails: {
    flex: 1,
    minWidth: 200,
  },
  dateBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3EEFD",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: "flex-start",
    marginBottom: 4,
    gap: 4,
  },
  dateBadgeText: {
    fontSize: 11,
    color: "#5D3EBC",
    fontWeight: "700",
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  heroSubtitle: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 2,
  },
  editMenuBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4F46E5",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  editMenuBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  mealGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
    flexWrap: "wrap",
  },
  mealCard: {
    flex: 1,
    minWidth: 200,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  mealIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  mealTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  mealItems: {
    fontSize: 12,
    color: "#475569",
    marginTop: 4,
    lineHeight: 18,
  },
  mealTimeBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 10,
    alignSelf: "flex-start",
  },
  mealTimeText: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    flexWrap: "wrap",
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  sectionSub: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  editSupervisorBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: "#C7D2FE",
  },
  editSupervisorBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#4F46E5",
  },
  contactsGrid: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 24,
    flexWrap: "wrap",
  },
  contactCard: {
    flex: 1,
    minWidth: 260,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 14,
  },
  contactIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  roleBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  contactRole: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "600",
  },
  activePill: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  activePillText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#15803D",
  },
  contactName: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  contactPhone: {
    fontSize: 13,
    color: "#4F46E5",
    fontWeight: "700",
    marginTop: 2,
  },
  contactMeta: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 4,
  },
  iconEditBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
  },
  feedbackSectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  feedbackSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 14,
    marginBottom: 16,
  },
  liveFeedbackTagRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  liveDotText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#10B981",
    letterSpacing: 0.5,
  },
  kpiContainer: {
    flexDirection: "row",
    gap: 10,
  },
  kpiBox: {
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
  },
  kpiVal: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  kpiLabel: {
    fontSize: 10,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 2,
  },
  filterPillsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  filterPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  filterPillActive: {
    backgroundColor: "#4F46E5",
  },
  filterPillText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  filterPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  emptyFeedbackBox: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyFeedbackTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#475569",
    marginTop: 8,
  },
  emptyFeedbackSub: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 2,
    textAlign: "center",
  },
  feedbackList: {
    gap: 12,
  },
  feedbackCard: {
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  fbHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  fbUserCol: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  fbAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E0E7FF",
    alignItems: "center",
    justifyContent: "center",
  },
  fbAvatarText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#4F46E5",
  },
  fbStudentName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  fbStudentMeta: {
    fontSize: 11,
    color: "#64748B",
  },
  fbRightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  fbMealBadge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  fbMealBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4F46E5",
  },
  fbRatingBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  fbRatingBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#D97706",
  },
  ratingScoresRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    gap: 8,
  },
  scoreText: {
    fontSize: 11,
    color: "#64748B",
  },
  scoreDot: {
    color: "#94A3B8",
    fontSize: 10,
  },
  fbCommentText: {
    fontSize: 13,
    color: "#334155",
    fontStyle: "italic",
    marginTop: 6,
    lineHeight: 18,
  },
  fbFooterRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 8,
  },
  statusToggleBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusAck: {
    backgroundColor: "#ECFDF5",
  },
  statusPending: {
    backgroundColor: "#FFFBEB",
  },
  statusToggleText: {
    fontSize: 11,
    fontWeight: "700",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 500,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  modalSubtitleSmall: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 5,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },
  dividerThin: {
    height: 1,
    backgroundColor: "#E2E8F0",
    marginVertical: 12,
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 14,
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  modalSubmitBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: "#4F46E5",
  },
  modalSubmitText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  adminReplyContainer: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
    marginTop: 10,
  },
  adminReplyHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  adminReplyBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#4F46E5",
  },
  adminReplyContent: {
    fontSize: 12,
    lineHeight: 18,
  },
  replyActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  replyActionBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  deleteFeedbackBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  deleteFeedbackBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  originalFeedbackBox: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  origStudentName: {
    fontSize: 13,
    fontWeight: "700",
  },
  origCommentText: {
    fontSize: 12,
    fontStyle: "italic",
    lineHeight: 18,
  },
  quickChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  quickChipText: {
    fontSize: 11,
    fontWeight: "600",
  },
  deleteModalIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 8,
  },
  deleteModalMessage: {
    fontSize: 13,
    lineHeight: 20,
    textAlign: "center",
    paddingHorizontal: 10,
  },
});