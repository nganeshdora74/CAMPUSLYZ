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
import {
  subscribeMessMenu,
  sendAdminSuggestion,
  takeAdminActionOnMess,
  subscribeFoodFeedback,
  takeActionOnFeedback,
  getMessAiResponse,
  UnifiedMeal,
  SpecialNote,
} from "../../services/messUnifiedService";
import { notifyStudent } from "../../services/notificationService";

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
  userName?: string;
  userRole?: string;
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
  adminActionNote?: string;
  createdAt?: any;
};

export default function AdminMessScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const { isDark, colors } = useAppTheme();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [breakfast, setBreakfast] = useState("Idli, Sambar, Chutney");
  const [lunch, setLunch] = useState("Rice, Dal, Veg Curry, Curd");
  const [dinner, setDinner] = useState("Roti, Paneer, Rice, Dal");

  // Real-time Mess Menu & Special Note from Mess Manager
  const [unifiedMeals, setUnifiedMeals] = useState<UnifiedMeal[]>([]);
  const [specialNote, setSpecialNote] = useState<SpecialNote | null>(null);

  // Admin Suggestion Modal (Admin cannot update menu, but gives suggestion)
  const [suggestionModal, setSuggestionModal] = useState(false);
  const [suggestionText, setSuggestionText] = useState("");
  const [suggestionMeal, setSuggestionMeal] = useState("General");
  const [sendingSuggestion, setSendingSuggestion] = useState(false);

  // Admin Action Modal (Admin takes operational action on mess)
  const [adminActionModal, setAdminActionModal] = useState(false);
  const [adminActionType, setAdminActionType] = useState<
    "Request Revision" | "Order Inspection" | "Issue Quality Warning" | "Approve Menu"
  >("Request Revision");
  const [adminActionNote, setAdminActionNote] = useState("");
  const [takingAction, setTakingAction] = useState(false);

  // Admin Action on Specific Feedback Item
  const [feedbackActionModal, setFeedbackActionModal] = useState(false);
  const [feedbackForAction, setFeedbackForAction] = useState<MessFeedback | null>(null);
  const [feedbackActionNoteInput, setFeedbackActionNoteInput] = useState("");
  const [savingFeedbackAction, setSavingFeedbackAction] = useState(false);

  // Mess AI Assistant Modal
  const [aiModal, setAiModal] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [aiChat, setAiChat] = useState<Array<{ sender: "user" | "ai"; text: string }>>([
    {
      sender: "ai",
      text: "Hello Administrator! I am your Mess AI Assistant. Ask me to summarize today's meal schedule, analyze student opt-in headcounts, review feedback ratings, or inspect dining safety compliance.",
    },
  ]);

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

  // Subscribe to Unified Mess Menu & Special Note (Managed by Mess Manager)
  useEffect(() => {
    const unsubscribe = subscribeMessMenu(({ meals, specialNote: note }) => {
      setUnifiedMeals(meals);
      setSpecialNote(note);
      const b = meals.find((m) => m.type === "Breakfast");
      if (b) setBreakfast(b.items);
      const l = meals.find((m) => m.type === "Lunch");
      if (l) setLunch(l.items);
      const d = meals.find((m) => m.type === "Dinner");
      if (d) setDinner(d.items);
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

  const handleSendAdminSuggestion = async () => {
    if (!suggestionText.trim()) {
      Alert.alert("Required", "Please enter your suggestion for the Mess Manager.");
      return;
    }
    try {
      setSendingSuggestion(true);
      await sendAdminSuggestion(suggestionText.trim(), suggestionMeal, "Campus Administration");
      setSuggestionModal(false);
      setSuggestionText("");
      Alert.alert(
        "Suggestion Sent 💡",
        "Your recommendation has been forwarded to the Mess Manager."
      );
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not send suggestion");
    } finally {
      setSendingSuggestion(false);
    }
  };

  const handleTakeAdminAction = async () => {
    if (!adminActionNote.trim()) {
      Alert.alert("Required", "Please provide the official administrative order note.");
      return;
    }
    try {
      setTakingAction(true);
      await takeAdminActionOnMess(adminActionType, adminActionNote.trim());
      setAdminActionModal(false);
      setAdminActionNote("");
      Alert.alert(
        "Admin Action Dispatched ⚡",
        `Action "${adminActionType}" has been officially dispatched to Mess Management.`
      );
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not dispatch action");
    } finally {
      setTakingAction(false);
    }
  };

  const handleOpenFeedbackActionModal = (fb: MessFeedback) => {
    setFeedbackForAction(fb);
    setFeedbackActionNoteInput(fb.adminActionNote || "");
    setFeedbackActionModal(true);
  };

  const handleSaveFeedbackAction = async () => {
    if (!feedbackForAction || !feedbackActionNoteInput.trim()) {
      Alert.alert("Required", "Please describe the action taken on this feedback.");
      return;
    }
    try {
      setSavingFeedbackAction(true);
      await takeActionOnFeedback(feedbackForAction.id, feedbackActionNoteInput.trim());
      setFeedbacks((prev) =>
        prev.map((f) =>
          f.id === feedbackForAction.id
            ? { ...f, status: "Action Taken", adminActionNote: feedbackActionNoteInput.trim() }
            : f
        )
      );
      setFeedbackActionModal(false);
      setFeedbackForAction(null);
      setFeedbackActionNoteInput("");
      Alert.alert("Action Recorded 🛡️", "Kitchen action has been recorded for this feedback.");
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not record action on feedback");
    } finally {
      setSavingFeedbackAction(false);
    }
  };

  const handleSendAiQuery = (customText?: string) => {
    const textToSend = customText || aiQuery;
    if (!textToSend.trim()) return;
    const userMessage = textToSend.trim();
    setAiChat((prev) => [...prev, { sender: "user", text: userMessage }]);
    setAiQuery("");
    setTimeout(() => {
      const response = getMessAiResponse(userMessage, unifiedMeals, specialNote, feedbacks.length);
      setAiChat((prev) => [...prev, { sender: "ai", text: response }]);
    }, 300);
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

      // Notify the student about admin response
      const fbAny = replyingFeedback as any;
      const studentRecipient =
        fbAny.studentEmail ||
        fbAny.userEmail ||
        fbAny.studentId ||
        fbAny.userId;
      if (studentRecipient) {
        try {
          await notifyStudent(
            studentRecipient,
            `🍽️ Mess Feedback Response`,
            `Administration replied to your dining feedback: "${cleanText}"`,
            "mess",
            { feedbackId: replyingFeedback.id }
          );
        } catch (_) {}
      }

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
                <Text style={[styles.heroSubtitle, { color: colors.adminTextSecondary }]}>
                  Central Dining Hall • Fresh, Nutritious & Hygienic
                </Text>
              </View>

              <View style={{ flexDirection: "row", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <View style={styles.managedByBadge}>
                  <Ionicons name="lock-closed" size={12} color="#2563EB" />
                  <Text style={styles.managedByText}>Managed by Mess Manager</Text>
                </View>

                <TouchableOpacity
                  style={styles.suggestionBtn}
                  onPress={() => setSuggestionModal(true)}
                >
                  <Ionicons name="bulb-outline" size={15} color="#FFFFFF" />
                  <Text style={styles.actionBtnWhiteText}>Give Suggestion</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.takeActionBtn}
                  onPress={() => setAdminActionModal(true)}
                >
                  <Ionicons name="flash-outline" size={15} color="#FFFFFF" />
                  <Text style={styles.actionBtnWhiteText}>Take Action</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.aiAssistBtn}
                  onPress={() => setAiModal(true)}
                >
                  <Ionicons name="sparkles" size={14} color="#FFFFFF" />
                  <Text style={styles.actionBtnWhiteText}>Mess AI</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* SPECIAL NOTE BANNER (POSTED BY MESS MANAGER) */}
            <View
              style={[
                styles.specialNoteCard,
                {
                  backgroundColor: isDark ? "rgba(245,158,11,0.12)" : "#FFFBEB",
                  borderColor: isDark ? "rgba(245,158,11,0.28)" : "#FDE68A",
                },
              ]}
            >
              <View style={styles.specialNoteIconCircle}>
                <Ionicons name="sparkles" size={18} color="#D97706" />
              </View>
              <View style={{ flex: 1 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                  <Text style={[styles.specialNoteLabel, { color: isDark ? "#FBBF24" : "#B45309" }]}>
                    ⭐ TODAY'S SPECIAL NOTE (BY MESS MANAGER)
                  </Text>
                  <Text style={{ fontSize: 11, color: isDark ? "#FDE68A" : "#92400E" }}>
                    {specialNote?.updatedAt ? `Updated: ${specialNote.updatedAt}` : "Active"}
                  </Text>
                </View>
                <Text style={[styles.specialNoteBody, { color: isDark ? "#FEF3C7" : "#78350F" }]}>
                  {specialNote?.text || "No special note set for today by Mess Manager."}
                </Text>
              </View>
            </View>

            {/* 4 MEAL CARDS ROW (LIVE FROM MESS MANAGER) */}
            <View style={styles.mealGrid}>
              {unifiedMeals.map((meal) => {
                const iconName =
                  meal.type === "Breakfast"
                    ? "sunny"
                    : meal.type === "Lunch"
                    ? "restaurant"
                    : meal.type === "Snacks"
                    ? "cafe"
                    : "moon";
                const iconColor =
                  meal.type === "Breakfast"
                    ? "#EA580C"
                    : meal.type === "Lunch"
                    ? "#10B981"
                    : meal.type === "Snacks"
                    ? "#D97706"
                    : "#2563EB";

                return (
                  <View
                    key={meal.id}
                    style={[
                      styles.mealCard,
                      { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder },
                    ]}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: 8 }}>
                      <View
                        style={[
                          styles.mealIconCircle,
                          {
                            backgroundColor: isDark
                              ? "rgba(255,255,255,0.06)"
                              : `${iconColor}15`,
                          },
                        ]}
                      >
                        <Ionicons name={iconName} size={18} color={iconColor} />
                      </View>

                      {/* Live Take Food Headcount */}
                      <View style={styles.adminTakesBadge}>
                        <Ionicons name="restaurant" size={11} color="#059669" />
                        <Text style={styles.adminTakesBadgeText}>
                          {meal.takesCount || 0} Taking
                        </Text>
                      </View>
                    </View>

                    <Text style={[styles.mealTitle, { color: colors.adminText }]}>{meal.type}</Text>
                    <Text style={[styles.mealItems, { color: colors.adminTextSecondary }]} numberOfLines={2}>
                      {meal.items}
                    </Text>

                    <View style={[styles.mealTimeBadge, { backgroundColor: colors.adminSurfaceAlt }]}>
                      <Ionicons name="time-outline" size={11} color={colors.adminTextSecondary} style={{ marginRight: 4 }} />
                      <Text style={[styles.mealTimeText, { color: colors.adminTextSecondary }]}>
                        {meal.timing}
                      </Text>
                    </View>
                  </View>
                );
              })}
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

                        {/* Admin Action Note Box if present */}
                        {fb.adminActionNote ? (
                          <View
                            style={[
                              styles.adminActionNoteBox,
                              {
                                backgroundColor: isDark ? "rgba(124,58,237,0.15)" : "#FAF5FF",
                                borderColor: isDark ? "rgba(124,58,237,0.3)" : "#E9D5FF",
                              },
                            ]}
                          >
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 2 }}>
                              <Ionicons name="flash" size={12} color="#7C3AED" />
                              <Text style={styles.adminActionNoteTitle}>Admin Action Dispatched</Text>
                            </View>
                            <Text style={[styles.adminActionNoteText, { color: colors.adminText }]}>
                              {fb.adminActionNote}
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

                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                            {/* Take Action on this Feedback Button */}
                            <TouchableOpacity
                              style={[
                                styles.takeFeedbackActionBtn,
                                {
                                  backgroundColor: isDark ? "rgba(124,58,237,0.2)" : "#F3E8FF",
                                  borderColor: isDark ? "#6D28D9" : "#DDD6FE",
                                },
                              ]}
                              onPress={() => handleOpenFeedbackActionModal(fb)}
                            >
                              <Ionicons name="flash-outline" size={12} color="#7C3AED" />
                              <Text style={[styles.takeFeedbackActionBtnText, { color: "#7C3AED" }]}>
                                {fb.adminActionNote ? "Edit Action" : "Take Action"}
                              </Text>
                            </TouchableOpacity>

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

      {/* GIVE SUGGESTION MODAL (ADMIN -> MESS MANAGER) */}
      <Modal visible={suggestionModal} transparent animationType="fade" onRequestClose={() => setSuggestionModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.adminText }]}>Give Suggestion to Mess Manager</Text>
                <Text style={[styles.modalSubtitleSmall, { color: colors.adminTextSecondary }]}>
                  Mess menu is managed by Mess Manager. Your suggestions will be routed to their live dashboard.
                </Text>
              </View>
              <TouchableOpacity onPress={() => setSuggestionModal(false)}>
                <Ionicons name="close" size={24} color={colors.adminTextSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Target Meal</Text>
            <View style={styles.filterPillsRow}>
              {["General", "Breakfast", "Lunch", "Snacks", "Dinner"].map((m) => (
                <TouchableOpacity
                  key={m}
                  style={[
                    styles.filterPill,
                    {
                      backgroundColor: suggestionMeal === m ? "#5D3EBC" : colors.adminSurfaceAlt,
                    },
                  ]}
                  onPress={() => setSuggestionMeal(m)}
                >
                  <Text
                    style={[
                      styles.filterPillText,
                      { color: suggestionMeal === m ? "#FFFFFF" : colors.adminTextSecondary },
                    ]}
                  >
                    {m}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Recommendation / Suggestion *</Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: colors.adminInputBg,
                    borderColor: colors.adminInputBorder,
                    color: colors.adminText,
                    height: 80,
                  },
                ]}
                placeholderTextColor={colors.adminTextSecondary}
                value={suggestionText}
                onChangeText={setSuggestionText}
                placeholder="e.g. Please add fresh fruit salad to breakfast and decrease oil in evening snacks..."
                multiline
              />
            </View>

            <View style={[styles.modalFooter, { borderTopColor: colors.adminCardBorder }]}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.adminSurfaceAlt }]}
                onPress={() => setSuggestionModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.adminTextSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: "#7C3AED" }]}
                onPress={handleSendAdminSuggestion}
                disabled={sendingSuggestion}
              >
                <Text style={styles.modalSubmitText}>
                  {sendingSuggestion ? "Sending..." : "Submit Suggestion"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* TAKE OPERATIONAL ACTION MODAL */}
      <Modal visible={adminActionModal} transparent animationType="fade" onRequestClose={() => setAdminActionModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.adminText }]}>Dispatch Administrative Action</Text>
                <Text style={[styles.modalSubtitleSmall, { color: colors.adminTextSecondary }]}>
                  Issue binding administrative directives to Mess Manager & Kitchen Staff
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAdminActionModal(false)}>
                <Ionicons name="close" size={24} color={colors.adminTextSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Action Type</Text>
            <View style={styles.filterPillsRow}>
              {(["Request Revision", "Order Inspection", "Issue Quality Warning", "Approve Menu"] as const).map(
                (act) => (
                  <TouchableOpacity
                    key={act}
                    style={[
                      styles.filterPill,
                      {
                        backgroundColor: adminActionType === act ? "#EA580C" : colors.adminSurfaceAlt,
                      },
                    ]}
                    onPress={() => setAdminActionType(act)}
                  >
                    <Text
                      style={[
                        styles.filterPillText,
                        { color: adminActionType === act ? "#FFFFFF" : colors.adminTextSecondary },
                      ]}
                    >
                      {act}
                    </Text>
                  </TouchableOpacity>
                )
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Administrative Directive Details *</Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: colors.adminInputBg,
                    borderColor: colors.adminInputBorder,
                    color: colors.adminText,
                    height: 80,
                  },
                ]}
                placeholderTextColor={colors.adminTextSecondary}
                value={adminActionNote}
                onChangeText={setAdminActionNote}
                placeholder="e.g. Health inspector appointed for tomorrow 10 AM. Revise oil quality immediately."
                multiline
              />
            </View>

            <View style={[styles.modalFooter, { borderTopColor: colors.adminCardBorder }]}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.adminSurfaceAlt }]}
                onPress={() => setAdminActionModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.adminTextSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: "#EA580C" }]}
                onPress={handleTakeAdminAction}
                disabled={takingAction}
              >
                <Text style={styles.modalSubmitText}>
                  {takingAction ? "Dispatching..." : "Dispatch Action"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ACTION ON FEEDBACK MODAL */}
      <Modal visible={feedbackActionModal} transparent animationType="fade" onRequestClose={() => setFeedbackActionModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.adminText }]}>Take Action on Feedback</Text>
                <Text style={[styles.modalSubtitleSmall, { color: colors.adminTextSecondary }]}>
                  Record administrative decision or remediation for this review
                </Text>
              </View>
              <TouchableOpacity onPress={() => setFeedbackActionModal(false)}>
                <Ionicons name="close" size={24} color={colors.adminTextSecondary} />
              </TouchableOpacity>
            </View>

            {feedbackForAction && (
              <View style={[styles.originalFeedbackBox, { backgroundColor: colors.adminSurfaceAlt, borderColor: colors.adminCardBorder }]}>
                <Text style={[styles.origStudentName, { color: colors.adminText }]}>
                  {feedbackForAction.userName || feedbackForAction.studentName} ({feedbackForAction.meal}):
                </Text>
                <Text style={[styles.origCommentText, { color: colors.adminTextSecondary }]}>
                  "{feedbackForAction.comment || feedbackForAction.feedback}"
                </Text>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Action Description *</Text>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: colors.adminInputBg,
                    borderColor: colors.adminInputBorder,
                    color: colors.adminText,
                    height: 75,
                  },
                ]}
                placeholderTextColor={colors.adminTextSecondary}
                value={feedbackActionNoteInput}
                onChangeText={setFeedbackActionNoteInput}
                placeholder="e.g. Kitchen supervisor notified; supplier changed for dairy products."
                multiline
              />
            </View>

            <View style={[styles.modalFooter, { borderTopColor: colors.adminCardBorder }]}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.adminSurfaceAlt }]}
                onPress={() => setFeedbackActionModal(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.adminTextSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, { backgroundColor: "#059669" }]}
                onPress={handleSaveFeedbackAction}
                disabled={savingFeedbackAction}
              >
                <Text style={styles.modalSubmitText}>
                  {savingFeedbackAction ? "Saving..." : "Record Action"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MESS AI ASSISTANT MODAL (ADMIN) */}
      <Modal visible={aiModal} transparent animationType="fade" onRequestClose={() => setAiModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder, maxWidth: 540 }]}>
            <View style={styles.modalHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "#7C3AED", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.adminText }]}>Mess AI Assistant</Text>
                  <Text style={[styles.modalSubtitleSmall, { color: colors.adminTextSecondary }]}>
                    Insights, nutrition, headcount forecasts & feedback metrics
                  </Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setAiModal(false)}>
                <Ionicons name="close" size={24} color={colors.adminTextSecondary} />
              </TouchableOpacity>
            </View>

            {/* Quick chips */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {["Today's schedule", "Take Food opt-ins", "Special note", "Feedback overview"].map((chip) => (
                <TouchableOpacity
                  key={chip}
                  style={[styles.quickChip, { backgroundColor: colors.adminSurfaceAlt, borderColor: colors.adminCardBorder }]}
                  onPress={() => handleSendAiQuery(chip)}
                >
                  <Text style={[styles.quickChipText, { color: "#7C3AED" }]}>{chip}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Chat Body */}
            <ScrollView style={{ maxHeight: 260, backgroundColor: colors.adminSurfaceAlt, borderRadius: 10, padding: 10, marginBottom: 12 }}>
              {aiChat.map((m, idx) => (
                <View
                  key={idx}
                  style={{
                    alignSelf: m.sender === "user" ? "flex-end" : "flex-start",
                    backgroundColor: m.sender === "user" ? "#5D3EBC" : colors.adminCard,
                    padding: 10,
                    borderRadius: 10,
                    marginBottom: 8,
                    maxWidth: "85%",
                    borderWidth: m.sender === "user" ? 0 : 1,
                    borderColor: colors.adminCardBorder,
                  }}
                >
                  <Text style={{ fontSize: 12, lineHeight: 18, color: m.sender === "user" ? "#FFFFFF" : colors.adminText }}>
                    {m.text}
                  </Text>
                </View>
              ))}
            </ScrollView>

            {/* Input Row */}
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <TextInput
                style={[
                  styles.modalInput,
                  {
                    flex: 1,
                    backgroundColor: colors.adminInputBg,
                    borderColor: colors.adminInputBorder,
                    color: colors.adminText,
                  },
                ]}
                placeholderTextColor={colors.adminTextSecondary}
                value={aiQuery}
                onChangeText={setAiQuery}
                placeholder="Ask Mess AI about dishes, headcounts, feedback..."
                onSubmitEditing={() => handleSendAiQuery()}
              />
              <TouchableOpacity
                style={{ backgroundColor: "#7C3AED", width: 42, height: 42, borderRadius: 8, alignItems: "center", justifyContent: "center" }}
                onPress={() => handleSendAiQuery()}
              >
                <Ionicons name="send" size={16} color="#FFFFFF" />
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
  // Managed by Mess Manager & Admin Action Styles
  managedByBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
  },
  managedByText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  suggestionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#7C3AED",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  takeActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#EA580C",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  aiAssistBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#4F46E5",
    paddingHorizontal: 11,
    paddingVertical: 7,
    borderRadius: 8,
  },
  actionBtnWhiteText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  // Special Note
  specialNoteCard: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 16,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  specialNoteIconCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  specialNoteLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  specialNoteBody: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  adminTakesBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  adminTakesBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#059669",
  },
  adminActionNoteBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginTop: 8,
    marginBottom: 4,
  },
  adminActionNoteTitle: {
    fontSize: 11,
    fontWeight: "800",
    color: "#7C3AED",
  },
  adminActionNoteText: {
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "500",
  },
  takeFeedbackActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  takeFeedbackActionBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
});