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
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";

import { auth, db } from "../firebase/config";
import { useAppTheme } from "../context/ThemeContext";
import { useLanguage } from "../context/LanguageContext";
import UniversalRoleControls from "../components/UniversalRoleControls";
import {
  subscribeMessMenu,
  toggleTakeFood,
  checkUserMealOptIn,
  submitFoodFeedback,
  getMessAiResponse,
  UnifiedMeal,
  SpecialNote,
} from "../services/messUnifiedService";
import { notifyAdmin, notifyMessManager } from "../services/notificationService";

type DayMenu = {
  day: string;
  breakfast: string;
  breakfastTime: string;
  lunch: string;
  lunchTime: string;
  snacks: string;
  snacksTime: string;
  dinner: string;
  dinnerTime: string;
  specialDish?: string;
};

const DEFAULT_WEEKLY_MENUS: Record<string, DayMenu> = {
  Mon: {
    day: "Mon",
    breakfast: "Idli, Medu Vada, Sambar & Coconut Chutney",
    breakfastTime: "7:30 AM - 9:00 AM",
    lunch: "Steamed Rice, Dal Tadka, Aloo Gobi, Curd & Papad",
    lunchTime: "12:30 PM - 2:00 PM",
    snacks: "Veg Puff & Masala Tea / Coffee",
    snacksTime: "4:30 PM - 5:30 PM",
    dinner: "Butter Roti, Paneer Butter Masala, Jeera Rice, Gulab Jamun",
    dinnerTime: "7:30 PM - 9:30 PM",
    specialDish: "Gulab Jamun",
  },
  Tue: {
    day: "Tue",
    breakfast: "Poori, Aloo Bhaji & Suji Halwa",
    breakfastTime: "7:30 AM - 9:00 AM",
    lunch: "Veg Pulao, Rajma Masala, Cucumber Raita, Pickle",
    lunchTime: "12:30 PM - 2:00 PM",
    snacks: "Biscuits & Lemon Tea / Coffee",
    snacksTime: "4:30 PM - 5:30 PM",
    dinner: "Chapati, Mix Veg Korma, Dal Fry, Steamed Rice",
    dinnerTime: "7:30 PM - 9:30 PM",
  },
  Wed: {
    day: "Wed",
    breakfast: "Masala Dosa, Sambar & Tomato Chutney",
    breakfastTime: "7:30 AM - 9:00 AM",
    lunch: "Jeera Rice, Chana Masala, Bhindi Fry, Curd",
    lunchTime: "12:30 PM - 2:00 PM",
    snacks: "Sweet Corn & Coffee",
    snacksTime: "4:30 PM - 5:30 PM",
    dinner: "Phulka, Kadai Paneer / Chicken Curry, Steamed Rice, Ice Cream",
    dinnerTime: "7:30 PM - 9:30 PM",
    specialDish: "Special Feast Night",
  },
  Thu: {
    day: "Thu",
    breakfast: "Poha, Boiled Sprouts & Mint Chutney",
    breakfastTime: "7:30 AM - 9:00 AM",
    lunch: "Rice, Gujarati Dal, Methi Aloo, Roasted Papad",
    lunchTime: "12:30 PM - 2:00 PM",
    snacks: "Samosa & Ginger Tea",
    snacksTime: "4:30 PM - 5:30 PM",
    dinner: "Tandoori Roti, Dal Makhani, Veg Biryani",
    dinnerTime: "7:30 PM - 9:30 PM",
  },
  Fri: {
    day: "Fri",
    breakfast: "Uttapam, Coconut Chutney & Filter Coffee",
    breakfastTime: "7:30 AM - 9:00 AM",
    lunch: "Rice, Sambar, Cabbage Poriyal, Rasam, Curd",
    lunchTime: "12:30 PM - 2:00 PM",
    snacks: "Banana Chips & Tea",
    snacksTime: "4:30 PM - 5:30 PM",
    dinner: "Paratha, Egg Curry / Malai Kofta, Pulao, Kheer",
    dinnerTime: "7:30 PM - 9:30 PM",
    specialDish: "Rice Kheer",
  },
  Sat: {
    day: "Sat",
    breakfast: "Aloo Paratha with Fresh Curd & Butter",
    breakfastTime: "8:00 AM - 9:30 AM",
    lunch: "Kadhi Pakora, Steamed Rice, Aloo Jeera, Salad",
    lunchTime: "12:30 PM - 2:30 PM",
    snacks: "Pakora & Masala Chai",
    snacksTime: "4:30 PM - 5:30 PM",
    dinner: "Naan, Shahi Paneer, Pulao, Fruit Custard",
    dinnerTime: "7:30 PM - 9:30 PM",
  },
  Sun: {
    day: "Sun",
    breakfast: "Chole Bhature & Sweet Lassi",
    breakfastTime: "8:00 AM - 10:00 AM",
    lunch: "Hyderabadi Veg/Chicken Dum Biryani, Mirchi Ka Salan, Raita",
    lunchTime: "12:30 PM - 2:30 PM",
    snacks: "Sandwich & Cold Coffee",
    snacksTime: "4:30 PM - 5:30 PM",
    dinner: "Light Khichdi, Tomato Soup, Papad, Fruit Salad",
    dinnerTime: "7:30 PM - 9:30 PM",
    specialDish: "Sunday Biryani Special",
  },
};

const WEEK_DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const RATING_LABELS = ["", "Terrible", "Poor", "Average", "Good", "Excellent"];

export default function MessScreen() {
  const { colors, isDark } = useAppTheme();
  const { t } = useLanguage();

  const [selectedDay, setSelectedDay] = useState("Mon");
  const [loading, setLoading] = useState(true);
  const [weeklyMenu, setWeeklyMenu] = useState<Record<string, DayMenu>>(DEFAULT_WEEKLY_MENUS);

  // Live Unified Mess Menu & Special Note (from Mess Manager)
  const [unifiedMeals, setUnifiedMeals] = useState<UnifiedMeal[]>([]);
  const [specialNote, setSpecialNote] = useState<SpecialNote | null>(null);

  // Take Food Opt-in status for each meal
  const [optedMeals, setOptedMeals] = useState<Record<string, boolean>>({});
  const [togglingMeal, setTogglingMeal] = useState<Record<string, boolean>>({});

  // Mess AI Assistant Modal
  const [aiModal, setAiModal] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [aiChat, setAiChat] = useState<Array<{ sender: "user" | "ai"; text: string }>>([
    {
      sender: "ai",
      text: "Hello! I am your Mess AI Assistant. Ask me what's for breakfast/lunch/dinner, meal service timings, special dish details, or nutritional combos!",
    },
  ]);

  // User details
  const [currentStudentName, setCurrentStudentName] = useState("Student");
  const [currentStudentRollNo, setCurrentStudentRollNo] = useState("23CSE001");
  const [isTeacherOrAdmin, setIsTeacherOrAdmin] = useState(false);

  // Supervisor details (Synchronized with Firestore)
  const [supervisorName, setSupervisorName] = useState("Mr. Suresh Rao");
  const [supervisorPhone, setSupervisorPhone] = useState("+91 98765 67890");
  const [supervisorRole, setSupervisorRole] = useState("Chief Mess Supervisor");
  const [supervisorTiming, setSupervisorTiming] = useState("6:00 AM - 10:00 PM");
  const [supervisorOffice, setSupervisorOffice] = useState("Central Dining Hall, Room 102");
  const [editSupervisorModal, setEditSupervisorModal] = useState(false);
  const [savingSupervisor, setSavingSupervisor] = useState(false);

  // Daily Food Feedback Modal
  const [feedbackModal, setFeedbackModal] = useState(false);
  const [feedbackMeal, setFeedbackMeal] = useState("Lunch");
  const [overallRating, setOverallRating] = useState(5);
  const [tasteRating, setTasteRating] = useState(5);
  const [hygieneRating, setHygieneRating] = useState(5);
  const [feedbackComment, setFeedbackComment] = useState("");
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  // Student Complaint Modal
  const [complaintModal, setComplaintModal] = useState(false);
  const [complaintText, setComplaintText] = useState("");
  const [submittingComplaint, setSubmittingComplaint] = useState(false);

  // Recent Feedback Feed
  const [recentFeedbacks, setRecentFeedbacks] = useState<any[]>([]);

  // 1. Detect default meal based on time of day
  useEffect(() => {
    const hour = new Date().getHours();
    if (hour < 11) setFeedbackMeal("Breakfast");
    else if (hour < 16) setFeedbackMeal("Lunch");
    else if (hour < 19) setFeedbackMeal("Snacks");
    else setFeedbackMeal("Dinner");

    // Set today's day of week
    const dayIndex = new Date().getDay(); // 0 is Sun, 1 is Mon...
    const dayMap = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    setSelectedDay(dayMap[dayIndex] || "Mon");
  }, []);

  // 2. Load User profile details
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const unsub = onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          setCurrentStudentName(d.fullName || d.name || user.displayName || "Student");
          setCurrentStudentRollNo(d.rollNo || "23CSE001");
          if (d.role === "teacher" || d.role === "admin" || d.teacherId) {
            setIsTeacherOrAdmin(true);
          }
        }
      },
      () => {}
    );
    return () => unsub();
  }, []);

  // 3. Load Mess Supervisor details in real time from Firestore
  useEffect(() => {
    const unsub = onSnapshot(
      doc(db, "system", "messSupervisor"),
      (snap) => {
        if (snap.exists()) {
          const d = snap.data();
          if (d.name) setSupervisorName(d.name);
          if (d.phone) setSupervisorPhone(d.phone);
          if (d.role) setSupervisorRole(d.role);
          if (d.timing) setSupervisorTiming(d.timing);
          if (d.office) setSupervisorOffice(d.office);
        }
      },
      (err) => console.warn("Supervisor listener warning:", err)
    );
    return () => unsub();
  }, []);

  // 4. Firestore sync for Unified Mess Menu & Special Note (Managed by Mess Manager)
  useEffect(() => {
    const unsub = subscribeMessMenu(({ meals, specialNote: note }) => {
      setUnifiedMeals(meals);
      setSpecialNote(note);
    });
    return () => unsub();
  }, []);

  // 5. Check if user already marked "Take Food" for today's meals
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    const meals = ["Breakfast", "Lunch", "Snacks", "Dinner"] as const;
    meals.forEach(async (m) => {
      try {
        const isOpted = await checkUserMealOptIn(user.uid, m);
        setOptedMeals((prev) => ({ ...prev, [m]: isOpted }));
      } catch (_) {}
    });
  }, []);

  // 6. Firestore sync for mess_menu
  useEffect(() => {
    const messCol = collection(db, "mess_menu");
    const unsubscribe = onSnapshot(
      messCol,
      async (snap) => {
        if (snap.empty) {
          try {
            for (const day of WEEK_DAYS) {
              await setDoc(doc(db, "mess_menu", day), DEFAULT_WEEKLY_MENUS[day]);
            }
          } catch (err) {
            console.warn("Seeding mess_menu error:", err);
          }
          setWeeklyMenu(DEFAULT_WEEKLY_MENUS);
          setLoading(false);
          return;
        }

        const loaded: Record<string, DayMenu> = { ...DEFAULT_WEEKLY_MENUS };
        snap.docs.forEach((d) => {
          loaded[d.id] = d.data() as DayMenu;
        });

        setWeeklyMenu(loaded);
        setLoading(false);
      },
      (err) => {
        console.warn("Mess menu snap error:", err);
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  // 7. Real-time listener for recent feedbacks
  useEffect(() => {
    try {
      const q = query(collection(db, "mess_feedback"), orderBy("createdAt", "desc"));
      const unsub = onSnapshot(
        q,
        (snap) => {
          const list = snap.docs.slice(0, 5).map((d) => ({ id: d.id, ...d.data() }));
          setRecentFeedbacks(list);
        },
        () => {}
      );
      return () => unsub();
    } catch (e) {
      console.warn("Mess feedback sub error:", e);
    }
  }, []);

  const currentMenu = weeklyMenu[selectedDay] || DEFAULT_WEEKLY_MENUS[selectedDay] || DEFAULT_WEEKLY_MENUS.Mon;

  // Toggle "Take Food" opt-in
  const handleToggleTakeFood = async (mealType: "Breakfast" | "Lunch" | "Snacks" | "Dinner") => {
    const user = auth.currentUser;
    const uid = user ? user.uid : "guest_user";
    const role = isTeacherOrAdmin ? "teacher" : "student";
    try {
      setTogglingMeal((prev) => ({ ...prev, [mealType]: true }));
      const newState = await toggleTakeFood(mealType, uid, currentStudentName, role);
      setOptedMeals((prev) => ({ ...prev, [mealType]: newState }));
      Alert.alert(
        newState ? "Opted In! 🍽️" : "Opted Out",
        newState
          ? `You have marked attendance for ${mealType}. Central kitchen headcount updated in real time!`
          : `You have cancelled attendance for ${mealType}.`
      );
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Could not update Take Food status");
    } finally {
      setTogglingMeal((prev) => ({ ...prev, [mealType]: false }));
    }
  };

  // Submit Daily Food Feedback
  const handleSubmitFeedback = async () => {
    try {
      setSubmittingFeedback(true);
      const user = auth.currentUser;

      await submitFoodFeedback({
        userId: user ? user.uid : "guest",
        userEmail: user?.email || "",
        userName: currentStudentName,
        userRole: isTeacherOrAdmin ? "teacher" : "student",
        meal: feedbackMeal,
        rating: overallRating,
        tasteRating,
        hygieneRating,
        comment: feedbackComment.trim() || "Food was well prepared.",
      });

      setFeedbackModal(false);
      setFeedbackComment("");
      Alert.alert(
        "Feedback Submitted! 🍽️",
        `Thank you ${currentStudentName}! Your ${overallRating}-star review for ${feedbackMeal} has been sent to Mess Management & Admin.`
      );
    } catch (err: any) {
      Alert.alert("Submission Failed", err?.message || "Could not save your rating.");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  // Mess AI Assistant query
  const handleSendAiQuery = (customText?: string) => {
    const textToSend = customText || aiQuery;
    if (!textToSend.trim()) return;
    const userMessage = textToSend.trim();
    setAiChat((prev) => [...prev, { sender: "user", text: userMessage }]);
    setAiQuery("");
    setTimeout(() => {
      const response = getMessAiResponse(userMessage, unifiedMeals, specialNote, recentFeedbacks.length);
      setAiChat((prev) => [...prev, { sender: "ai", text: response }]);
    }, 300);
  };

  // Submit General Complaint
  const handleRaiseComplaint = async () => {
    if (!complaintText.trim()) {
      Alert.alert("Missing Details", "Please describe your mess complaint.");
      return;
    }

    try {
      setSubmittingComplaint(true);
      const user = auth.currentUser;
      const compDocRef = await addDoc(collection(db, "complaints"), {
        userId: user ? user.uid : "anonymous",
        userEmail: user ? user.email : "guest",
        studentName: currentStudentName,
        type: "Mess",
        day: selectedDay,
        message: complaintText.trim(),
        status: "Submitted",
        createdAt: serverTimestamp(),
      });

      // Dual-notify Mess Manager and Admin
      try {
        await notifyMessManager(
          `⚠️ New Mess Grievance: ${selectedDay}`,
          `Student ${currentStudentName} submitted a mess complaint: "${complaintText.trim()}"`,
          "mess",
          { complaintId: compDocRef.id }
        );
      } catch (_) {}

      try {
        await notifyAdmin(
          `⚠️ New Mess Grievance: ${selectedDay}`,
          `Student ${currentStudentName} submitted a mess complaint: "${complaintText.trim()}"`,
          "mess",
          { complaintId: compDocRef.id }
        );
      } catch (_) {}

      setComplaintText("");
      setComplaintModal(false);
      Alert.alert("Complaint Submitted", "Your mess feedback has been forwarded directly to the Mess Manager and Admin.");
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Failed to submit complaint.");
    } finally {
      setSubmittingComplaint(false);
    }
  };

  // Save Supervisor Details (Teacher/Admin edit)
  const handleSaveSupervisorDetails = async () => {
    if (!supervisorName.trim() || !supervisorPhone.trim()) {
      Alert.alert("Missing Information", "Please enter supervisor name and phone.");
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
        updatedAt: serverTimestamp(),
      };

      await setDoc(doc(db, "system", "messSupervisor"), payload, { merge: true });
      await setDoc(doc(db, "mess_info", "supervisor"), payload, { merge: true });

      setEditSupervisorModal(false);
      Alert.alert("Updated!", "Mess Supervisor name and contact number have been updated in Firebase.");
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Could not update supervisor details.");
    } finally {
      setSavingSupervisor(false);
    }
  };

  const handleCallSupervisor = () => {
    const cleanPhone = supervisorPhone.replace(/[^0-9+]/g, "");
    Linking.openURL(`tel:${cleanPhone}`).catch(() => {
      Alert.alert("Call Failed", `Unable to place call to ${supervisorPhone}`);
    });
  };

  const handleMessageSupervisor = () => {
    const cleanPhone = supervisorPhone.replace(/[^0-9+]/g, "");
    Linking.openURL(`sms:${cleanPhone}`).catch(() => {
      Alert.alert("SMS Failed", `Unable to open messaging for ${supervisorPhone}`);
    });
  };

  if (loading) {
    return (
      <View style={[styles.loading, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
          {t("loading", "Loading mess menu...")}
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView edges={["top"]} style={[styles.container, { backgroundColor: colors.background }]}>
      {/* HEADER */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerIconBtn}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>

        <View style={{ alignItems: "center" }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>{t("mess", "Campus Mess")}</Text>
          <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>Central Dining Hall</Text>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <UniversalRoleControls compact />

          <TouchableOpacity onPress={() => setAiModal(true)} style={styles.aiHeaderBtn}>
            <Ionicons name="sparkles" size={14} color="#FFFFFF" />
            <Text style={styles.aiHeaderBtnText}>Mess AI</Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={() => setFeedbackModal(true)} style={styles.rateHeaderBtn}>
            <Ionicons name="star" size={16} color="#FBBF24" />
            <Text style={styles.rateHeaderBtnText}>Rate Food</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* DAY SELECTOR ROW */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.daySelectorScroll}>
          {WEEK_DAYS.map((d) => {
            const isSel = selectedDay === d;
            return (
              <TouchableOpacity
                key={d}
                style={[
                  styles.dayPill,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  isSel && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                onPress={() => setSelectedDay(d)}
                activeOpacity={0.8}
              >
                <Text
                  style={[
                    styles.dayPillText,
                    { color: colors.textSecondary },
                    isSel && { color: "#FFFFFF", fontWeight: "800" },
                  ]}
                >
                  {d}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* HERO BANNER */}
        <View style={[styles.heroCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.heroLeft}>
            <View style={styles.heroBadgeRow}>
              <View style={[styles.forkCircle, { backgroundColor: colors.primary }]}>
                <Ionicons name="restaurant" size={15} color="#FFFFFF" />
              </View>
              <View style={[styles.dateBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.dateBadgeText, { color: colors.primary }]}>{selectedDay}'s Menu</Text>
              </View>
            </View>

            <Text style={[styles.heroTitle, { color: colors.text }]}>Fresh & Hygienic Meals</Text>
            <Text style={[styles.heroSubtitle, { color: colors.textSecondary }]}>
              Nutritious campus dining inspected daily
            </Text>
          </View>

          <Image
            source={{
              uri: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300&auto=format&fit=crop&q=80",
            }}
            style={styles.heroImage}
          />
        </View>

        {/* SPECIAL NOTE BANNER FROM MESS MANAGER (LIVE) */}
        {specialNote && (
          <View
            style={[
              styles.specialNoteBanner,
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
                <Text style={[styles.specialNoteTag, { color: isDark ? "#FBBF24" : "#B45309" }]}>
                  ⭐ SPECIAL NOTE FROM MESS MANAGER
                </Text>
                <Text style={{ fontSize: 11, color: isDark ? "#FDE68A" : "#92400E" }}>
                  {specialNote.updatedAt}
                </Text>
              </View>
              <Text style={[styles.specialNoteText, { color: isDark ? "#FEF3C7" : "#78350F" }]}>
                {specialNote.text}
              </Text>
            </View>
          </View>
        )}

        {/* SPECIAL DISH TAG IF AVAILABLE */}
        {currentMenu.specialDish && (
          <View style={[styles.specialBanner, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
            <Ionicons name="sparkles" size={18} color={colors.primary} />
            <Text style={[styles.specialBannerText, { color: colors.primary }]}>
              Special for {selectedDay}: {currentMenu.specialDish}
            </Text>
          </View>
        )}

        {/* DAILY FOOD FEEDBACK PROMPT BANNER FOR STUDENTS */}
        <TouchableOpacity
          style={[styles.feedbackBannerCard, { backgroundColor: isDark ? "#1E293B" : "#F5F3FF", borderColor: "#C4B5FD" }]}
          onPress={() => setFeedbackModal(true)}
          activeOpacity={0.85}
        >
          <View style={styles.feedbackBannerLeft}>
            <View style={[styles.starBadgeCircle, { backgroundColor: "#FBBF24" }]}>
              <Ionicons name="star" size={20} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.feedbackBannerTitle, { color: colors.text }]}>
                Daily Food Feedback
              </Text>
              <Text style={[styles.feedbackBannerSubtitle, { color: colors.textSecondary }]}>
                How was today's {feedbackMeal}? Rate quality & taste to update faculty
              </Text>
            </View>
          </View>
          <View style={styles.giveRatingPill}>
            <Text style={styles.giveRatingPillText}>Rate Now</Text>
            <Ionicons name="chevron-forward" size={14} color="#FFFFFF" />
          </View>
        </TouchableOpacity>

        {/* MEAL SCHEDULE CARDS WITH REAL-TIME TIMINGS & TAKE FOOD */}
        <View style={styles.mealGrid}>
          {(["Breakfast", "Lunch", "Snacks", "Dinner"] as const).map((mealType) => {
            const liveMeal = unifiedMeals.find((m) => m.type === mealType);
            const mealItems = liveMeal ? liveMeal.items : (
              mealType === "Breakfast" ? currentMenu.breakfast :
              mealType === "Lunch" ? currentMenu.lunch :
              mealType === "Snacks" ? currentMenu.snacks : currentMenu.dinner
            );
            const mealTime = liveMeal ? liveMeal.timing : (
              mealType === "Breakfast" ? currentMenu.breakfastTime :
              mealType === "Lunch" ? currentMenu.lunchTime :
              mealType === "Snacks" ? currentMenu.snacksTime : currentMenu.dinnerTime
            );
            const takesCount = liveMeal ? liveMeal.takesCount : 0;
            const isOpted = !!optedMeals[mealType];

            const iconName =
              mealType === "Breakfast" ? "sunny" :
              mealType === "Lunch" ? "restaurant-outline" :
              mealType === "Snacks" ? "cafe-outline" : "moon-outline";
            const iconBg =
              mealType === "Breakfast" ? "#FFF7ED" :
              mealType === "Lunch" ? "#ECFDF5" :
              mealType === "Snacks" ? "#FEF3C7" : "#EEF2FF";
            const iconColor =
              mealType === "Breakfast" ? "#EA580C" :
              mealType === "Lunch" ? "#10B981" :
              mealType === "Snacks" ? "#D97706" : "#4F46E5";

            return (
              <View key={mealType} style={[styles.mealCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <View style={styles.mealCardHeader}>
                  <View style={[styles.mealIconCircle, { backgroundColor: iconBg }]}>
                    <Ionicons name={iconName as any} size={20} color={iconColor} />
                  </View>
                  <View style={styles.mealTimeBadge}>
                    <Ionicons name="time-outline" size={11} color={colors.textSecondary} style={{ marginRight: 3 }} />
                    <Text style={styles.mealTimeText}>{mealTime}</Text>
                  </View>
                </View>

                <Text style={[styles.mealTitle, { color: colors.text }]}>
                  {mealType === "Snacks" ? "Evening Snacks" : mealType}
                </Text>
                <Text style={[styles.mealItems, { color: colors.textSecondary }]}>{mealItems}</Text>

                {/* TAKE FOOD ACTION & HEADCOUNT ROW */}
                <View style={styles.mealCardFooter}>
                  <View style={styles.headcountBadge}>
                    <Ionicons name="restaurant" size={12} color="#059669" />
                    <Text style={styles.headcountBadgeText}>{takesCount} attending</Text>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.takeFoodBtn,
                      isOpted ? styles.takeFoodBtnActive : styles.takeFoodBtnInactive,
                    ]}
                    onPress={() => handleToggleTakeFood(mealType)}
                    disabled={togglingMeal[mealType]}
                  >
                    <Ionicons
                      name={isOpted ? "checkmark-circle" : "restaurant-outline"}
                      size={13}
                      color={isOpted ? "#FFFFFF" : colors.primary}
                    />
                    <Text
                      style={[
                        styles.takeFoodBtnText,
                        isOpted ? styles.takeFoodBtnTextActive : { color: colors.primary },
                      ]}
                    >
                      {togglingMeal[mealType] ? "..." : isOpted ? "Taking Food ✓" : "Take Food"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })}
        </View>

        {/* LIVE MESS SUPERVISOR DETAILS CARD (EDITABLE & REALTIME) */}
        <View style={[styles.supervisorCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.supervisorTopRow}>
            <View style={[styles.supervisorAvatar, { backgroundColor: colors.primaryLight }]}>
              <Ionicons name="person" size={22} color={colors.primary} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={[styles.supervisorRoleText, { color: colors.primary }]}>{supervisorRole}</Text>
                <View style={styles.dutyBadge}>
                  <Text style={styles.dutyBadgeText}>On Duty</Text>
                </View>
              </View>
              <Text style={[styles.supervisorNameText, { color: colors.text }]}>{supervisorName}</Text>
              <Text style={[styles.supervisorPhoneText, { color: colors.textSecondary }]}>{supervisorPhone}</Text>
            </View>

            {/* Teacher / Admin edit button */}
            <TouchableOpacity
              style={styles.editSuperBtn}
              onPress={() => setEditSupervisorModal(true)}
            >
              <Ionicons name="pencil" size={16} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <View style={[styles.superMetaBox, { backgroundColor: isDark ? "#1E293B" : "#F8FAFC" }]}>
            <View style={styles.superMetaItem}>
              <Ionicons name="time-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.superMetaText, { color: colors.textSecondary }]}>{supervisorTiming}</Text>
            </View>
            <View style={styles.superMetaItem}>
              <Ionicons name="location-outline" size={14} color={colors.textSecondary} />
              <Text style={[styles.superMetaText, { color: colors.textSecondary }]} numberOfLines={1}>
                {supervisorOffice}
              </Text>
            </View>
          </View>

          {/* Direct call & message actions */}
          <View style={styles.superActionRow}>
            <TouchableOpacity
              style={[styles.superContactBtn, { backgroundColor: "#10B981" }]}
              onPress={handleCallSupervisor}
            >
              <Ionicons name="call" size={16} color="#FFFFFF" />
              <Text style={styles.superContactBtnText}>Call Supervisor</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.superContactBtn, { backgroundColor: colors.primary }]}
              onPress={handleMessageSupervisor}
            >
              <Ionicons name="chatbubble-ellipses" size={16} color="#FFFFFF" />
              <Text style={styles.superContactBtnText}>Message</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* FEEDBACK & COMPLAINTS ACTIONS */}
        <View style={styles.actionsRow}>
          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setFeedbackModal(true)}
          >
            <Ionicons name="star-outline" size={18} color="#FBBF24" />
            <Text style={[styles.actionBtnText, { color: colors.text }]}>Rate Daily Food</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={() => setComplaintModal(true)}
          >
            <Ionicons name="chatbox-ellipses-outline" size={18} color={colors.primary} />
            <Text style={[styles.actionBtnText, { color: colors.text }]}>Report Issue</Text>
          </TouchableOpacity>
        </View>

        {/* RECENT FEEDBACK REVIEWS SNIPPET */}
        {recentFeedbacks.length > 0 && (
          <View style={[styles.recentFeedCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.recentFeedHeader}>
              <Ionicons name="chatbubbles-outline" size={18} color={colors.primary} />
              <Text style={[styles.recentFeedTitle, { color: colors.text }]}>Recent Campus Food Reviews</Text>
            </View>

            {recentFeedbacks.slice(0, 3).map((item) => (
              <View key={item.id} style={[styles.reviewSnippet, { borderTopColor: colors.border }]}>
                <View style={styles.reviewSnippetTop}>
                  <Text style={[styles.reviewStudentName, { color: colors.text }]}>
                    {item.studentName || "Student"}
                  </Text>
                  <View style={styles.reviewRatingBadge}>
                    <Text style={styles.reviewRatingBadgeText}>{item.rating || 5} ★</Text>
                  </View>
                </View>
                <Text style={[styles.reviewMealTag, { color: colors.primary }]}>{item.meal || "Lunch"}</Text>
                <Text style={[styles.reviewComment, { color: colors.textSecondary }]} numberOfLines={2}>
                  "{item.comment || item.feedback || "Good food"}"
                </Text>
                {item.adminReply ? (
                  <View
                    style={[
                      styles.studentAdminReplyBox,
                      {
                        backgroundColor: isDark ? "#1E293B" : "#EEF2FF",
                        borderColor: isDark ? "#334155" : "#C7D2FE",
                      },
                    ]}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, marginBottom: 2 }}>
                      <Ionicons name="shield-checkmark" size={12} color="#4F46E5" />
                      <Text style={{ fontSize: 11, fontWeight: "700", color: "#4F46E5" }}>Supervisor / Admin Reply</Text>
                    </View>
                    <Text style={{ fontSize: 12, color: colors.text, lineHeight: 16 }}>"{item.adminReply}"</Text>
                  </View>
                ) : null}
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* DAILY FOOD FEEDBACK MODAL */}
      <Modal visible={feedbackModal} transparent animationType="slide" onRequestClose={() => setFeedbackModal(false)}>
        <Pressable style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]} onPress={() => setFeedbackModal(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Daily Food Feedback</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  Directly reviewed by Mess Supervisor & Teachers
                </Text>
              </View>
              <TouchableOpacity onPress={() => setFeedbackModal(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {/* Select Meal */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>Select Meal</Text>
              <View style={styles.mealSelectRow}>
                {(["Breakfast", "Lunch", "Snacks", "Dinner"] as const).map((m) => (
                  <TouchableOpacity
                    key={m}
                    style={[
                      styles.mealSelectPill,
                      { backgroundColor: colors.surface, borderColor: colors.border },
                      feedbackMeal === m && { backgroundColor: colors.primary, borderColor: colors.primary },
                    ]}
                    onPress={() => setFeedbackMeal(m)}
                  >
                    <Text style={[styles.mealSelectPillText, { color: colors.textSecondary }, feedbackMeal === m && { color: "#FFFFFF", fontWeight: "700" }]}>
                      {m}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Overall Food Rating */}
              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 14 }]}>
                Overall Food Quality: <Text style={{ color: "#FBBF24", fontWeight: "800" }}>{RATING_LABELS[overallRating]}</Text>
              </Text>
              <View style={styles.starsRow}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <TouchableOpacity key={star} onPress={() => setOverallRating(star)}>
                    <Ionicons
                      name={star <= overallRating ? "star" : "star-outline"}
                      size={32}
                      color="#FBBF24"
                    />
                  </TouchableOpacity>
                ))}
              </View>

              {/* Taste Rating */}
              <View style={styles.subRatingRow}>
                <Text style={[styles.subRatingLabel, { color: colors.text }]}>Taste & Spices</Text>
                <View style={{ flexDirection: "row", gap: 4 }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <TouchableOpacity key={s} onPress={() => setTasteRating(s)}>
                      <Ionicons name={s <= tasteRating ? "star" : "star-outline"} size={20} color="#FBBF24" />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Hygiene Rating */}
              <View style={styles.subRatingRow}>
                <Text style={[styles.subRatingLabel, { color: colors.text }]}>Hygiene & Freshness</Text>
                <View style={{ flexDirection: "row", gap: 4 }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <TouchableOpacity key={s} onPress={() => setHygieneRating(s)}>
                      <Ionicons name={s <= hygieneRating ? "star" : "star-outline"} size={20} color="#10B981" />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Student Comment */}
              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 14 }]}>Comments & Suggestions</Text>
              <TextInput
                style={[
                  styles.textInput,
                  { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text, minHeight: 75, textAlignVertical: "top" },
                ]}
                placeholder="e.g. Sambar was delicious, rotis were soft and fresh..."
                placeholderTextColor={colors.textMuted}
                multiline
                numberOfLines={3}
                value={feedbackComment}
                onChangeText={setFeedbackComment}
              />
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.surface }]} onPress={() => setFeedbackModal(false)}>
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>{t("cancel", "Cancel")}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                onPress={handleSubmitFeedback}
                disabled={submittingFeedback}
              >
                {submittingFeedback ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Submit Feedback</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* EDIT SUPERVISOR DETAILS MODAL (TEACHER / ADMIN) */}
      <Modal visible={editSupervisorModal} transparent animationType="fade" onRequestClose={() => setEditSupervisorModal(false)}>
        <Pressable style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]} onPress={() => setEditSupervisorModal(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>Edit Mess Supervisor</Text>
                <Text style={[styles.modalSubtitle, { color: colors.textSecondary }]}>
                  Updates supervisor contact details in Firebase
                </Text>
              </View>
              <TouchableOpacity onPress={() => setEditSupervisorModal(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 380 }}>
              <Text style={[styles.inputLabel, { color: colors.text }]}>Supervisor Full Name</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={supervisorName}
                onChangeText={setSupervisorName}
                placeholder="e.g. Mr. Suresh Rao"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 12 }]}>Phone Number</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={supervisorPhone}
                onChangeText={setSupervisorPhone}
                placeholder="e.g. +91 98765 67890"
                placeholderTextColor={colors.textMuted}
                keyboardType="phone-pad"
              />

              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 12 }]}>Role / Designation</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={supervisorRole}
                onChangeText={setSupervisorRole}
                placeholder="e.g. Chief Mess Supervisor"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 12 }]}>Timings</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={supervisorTiming}
                onChangeText={setSupervisorTiming}
                placeholder="e.g. 6:00 AM - 10:00 PM"
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 12 }]}>Office Location</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                value={supervisorOffice}
                onChangeText={setSupervisorOffice}
                placeholder="e.g. Central Dining Hall, Room 102"
                placeholderTextColor={colors.textMuted}
              />
            </ScrollView>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.surface }]} onPress={() => setEditSupervisorModal(false)}>
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.submitBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveSupervisorDetails}
                disabled={savingSupervisor}
              >
                {savingSupervisor ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>Save Changes</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* COMPLAINT MODAL */}
      <Modal visible={complaintModal} transparent animationType="slide" onRequestClose={() => setComplaintModal(false)}>
        <Pressable style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]} onPress={() => setComplaintModal(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={(e) => e.stopPropagation()}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Report Mess Hygiene / Food Issue</Text>

            <Text style={[styles.inputLabel, { color: colors.text }]}>Describe Issue</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text, minHeight: 90, textAlignVertical: "top" }]}
              placeholder="Describe quality, hygiene, or timing issue..."
              placeholderTextColor={colors.textMuted}
              multiline
              numberOfLines={4}
              value={complaintText}
              onChangeText={setComplaintText}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity style={[styles.cancelBtn, { backgroundColor: colors.surface }]} onPress={() => setComplaintModal(false)}>
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>{t("cancel", "Cancel")}</Text>
              </TouchableOpacity>

              <TouchableOpacity style={[styles.submitBtn, { backgroundColor: colors.primary }]} onPress={handleRaiseComplaint} disabled={submittingComplaint}>
                {submittingComplaint ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitBtnText}>{t("save", "Submit")}</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* MESS AI ASSISTANT MODAL (STUDENT / USER) */}
      <Modal visible={aiModal} transparent animationType="fade" onRequestClose={() => setAiModal(false)}>
        <Pressable style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]} onPress={() => setAiModal(false)}>
          <Pressable style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border, maxWidth: 520 }]} onPress={(e) => e.stopPropagation()}>
            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                <View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: "#7C3AED", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name="sparkles" size={18} color="#FFFFFF" />
                </View>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.text, marginBottom: 0 }]}>Mess AI Assistant</Text>
                  <Text style={{ fontSize: 11, color: colors.textSecondary }}>Ask anything about meals, timings & nutrition</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setAiModal(false)}>
                <Ionicons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Quick chips */}
            <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 }}>
              {["What's for lunch?", "What's for dinner?", "Meal service timings", "Special note"].map((chip) => (
                <TouchableOpacity
                  key={chip}
                  style={{ backgroundColor: colors.surface, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 14, borderWidth: 1, borderColor: colors.border }}
                  onPress={() => handleSendAiQuery(chip)}
                >
                  <Text style={{ fontSize: 11, color: "#7C3AED", fontWeight: "600" }}>{chip}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Chat Body */}
            <ScrollView style={{ maxHeight: 260, backgroundColor: colors.surface, borderRadius: 10, padding: 10, marginBottom: 12 }}>
              {aiChat.map((m, idx) => (
                <View
                  key={idx}
                  style={{
                    alignSelf: m.sender === "user" ? "flex-end" : "flex-start",
                    backgroundColor: m.sender === "user" ? colors.primary : colors.card,
                    padding: 10,
                    borderRadius: 10,
                    marginBottom: 8,
                    maxWidth: "85%",
                    borderWidth: m.sender === "user" ? 0 : 1,
                    borderColor: colors.border,
                  }}
                >
                  <Text style={{ fontSize: 12, lineHeight: 18, color: m.sender === "user" ? "#FFFFFF" : colors.text }}>
                    {m.text}
                  </Text>
                </View>
              ))}
            </ScrollView>

            {/* Input Row */}
            <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
              <TextInput
                style={[styles.textInput, { flex: 1, backgroundColor: colors.inputBg, borderColor: colors.inputBorder, color: colors.text }]}
                placeholderTextColor={colors.textMuted}
                value={aiQuery}
                onChangeText={setAiQuery}
                placeholder="Ask Mess AI about meals, timings..."
                onSubmitEditing={() => handleSendAiQuery()}
              />
              <TouchableOpacity
                style={{ backgroundColor: "#7C3AED", width: 42, height: 42, borderRadius: 10, alignItems: "center", justifyContent: "center" }}
                onPress={() => handleSendAiQuery()}
              >
                <Ionicons name="send" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loading: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    fontWeight: "600",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  headerIconBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  headerSubtitle: {
    fontSize: 11,
    fontWeight: "500",
  },
  rateHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  rateHeaderBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#D97706",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  daySelectorScroll: {
    marginBottom: 14,
  },
  dayPill: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 8,
  },
  dayPillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  heroCard: {
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 12,
  },
  heroLeft: {
    flex: 1,
    paddingRight: 10,
  },
  heroBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  forkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },
  dateBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  dateBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  heroTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  heroSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  heroImage: {
    width: 80,
    height: 80,
    borderRadius: 14,
  },
  specialBanner: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    gap: 8,
  },
  specialBannerText: {
    fontSize: 13,
    fontWeight: "700",
    flex: 1,
  },
  feedbackBannerCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 14,
  },
  feedbackBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  starBadgeCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  feedbackBannerTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  feedbackBannerSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  giveRatingPill: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#7C3AED",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    gap: 4,
  },
  giveRatingPillText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  mealGrid: {
    gap: 12,
    marginBottom: 16,
  },
  mealCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
  },
  mealCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  mealIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  mealTimeBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  mealTimeText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
  },
  mealTitle: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 4,
  },
  mealItems: {
    fontSize: 13,
    lineHeight: 19,
  },
  supervisorCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  supervisorTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  supervisorAvatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: "center",
    justifyContent: "center",
  },
  supervisorRoleText: {
    fontSize: 11,
    fontWeight: "700",
  },
  dutyBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  dutyBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#15803D",
  },
  supervisorNameText: {
    fontSize: 15,
    fontWeight: "800",
    marginTop: 2,
  },
  supervisorPhoneText: {
    fontSize: 12,
    marginTop: 1,
  },
  editSuperBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  superMetaBox: {
    marginTop: 12,
    padding: 10,
    borderRadius: 10,
    gap: 6,
  },
  superMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  superMetaText: {
    fontSize: 12,
  },
  superActionRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
  },
  superContactBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 6,
  },
  superContactBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  actionBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  recentFeedCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  recentFeedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  recentFeedTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  reviewSnippet: {
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: 1,
  },
  reviewSnippetTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  reviewStudentName: {
    fontSize: 13,
    fontWeight: "700",
  },
  reviewRatingBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  reviewRatingBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#D97706",
  },
  reviewMealTag: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  reviewComment: {
    fontSize: 12,
    fontStyle: "italic",
    marginTop: 4,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 460,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "800",
  },
  modalSubtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
  },
  mealSelectRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
  },
  mealSelectPill: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
  },
  mealSelectPillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  starsRow: {
    flexDirection: "row",
    gap: 10,
    marginVertical: 6,
  },
  subRatingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  subRatingLabel: {
    fontSize: 13,
    fontWeight: "600",
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
  submitBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  studentAdminReplyBox: {
    marginTop: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
  },
  aiHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#7C3AED",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 4,
  },
  aiHeaderBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  specialNoteBanner: {
    borderRadius: 14,
    borderWidth: 1.5,
    padding: 14,
    marginBottom: 12,
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
  specialNoteTag: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  specialNoteText: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
  },
  mealCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: "rgba(148,163,184,0.15)",
  },
  headcountBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  headcountBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
  },
  takeFoodBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  takeFoodBtnActive: {
    backgroundColor: "#059669",
    borderColor: "#059669",
  },
  takeFoodBtnInactive: {
    backgroundColor: "transparent",
    borderColor: "#CBD5E1",
  },
  takeFoodBtnText: {
    fontSize: 12,
    fontWeight: "700",
  },
  takeFoodBtnTextActive: {
    color: "#FFFFFF",
  },
});