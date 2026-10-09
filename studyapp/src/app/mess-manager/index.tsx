import React, { useState, useEffect } from "react";
import {
  Alert,
  Modal,
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
import { auth, db } from "../../firebase/config";
import MessLayout from "../../components/mess/MessLayout";
import messDataService, {
  MealItem,
  MessFeedbackItem,
} from "../../services/messDataService";
import {
  subscribeMessMenu,
  updateMealByMessManager,
  updateSpecialNoteByMessManager,
  subscribeAdminSuggestions,
  subscribeFoodFeedback,
  getMessAiResponse,
  UnifiedMeal,
  SpecialNote,
  AdminSuggestion,
  FoodFeedback,
} from "../../services/messUnifiedService";

export default function MessManagerDashboard() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;

  // Real-time Mess Menu & Special Note
  const [unifiedMeals, setUnifiedMeals] = useState<UnifiedMeal[]>([]);
  const [specialNote, setSpecialNote] = useState<SpecialNote | null>(null);
  const [adminSuggestions, setAdminSuggestions] = useState<AdminSuggestion[]>([]);
  const [foodFeedbacks, setFoodFeedbacks] = useState<FoodFeedback[]>([]);
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  // Edit Meal Modal
  const [editMealModal, setEditMealModal] = useState(false);
  const [editingMeal, setEditingMeal] = useState<UnifiedMeal | null>(null);
  const [mealItemsInput, setMealItemsInput] = useState("");
  const [mealTimingInput, setMealTimingInput] = useState("");
  const [mealStatusInput, setMealStatusInput] = useState<"Served" | "Ongoing" | "Upcoming">("Upcoming");
  const [mealCaloriesInput, setMealCaloriesInput] = useState("");
  const [savingMeal, setSavingMeal] = useState(false);

  // Special Note Modal
  const [specialNoteModal, setSpecialNoteModal] = useState(false);
  const [specialNoteInput, setSpecialNoteInput] = useState("");
  const [savingNote, setSavingNote] = useState(false);

  // Broadcast Notice Modal
  const [noticeModal, setNoticeModal] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState("");
  const [noticeMsg, setNoticeMsg] = useState("");

  // Mess AI Assistant Modal
  const [aiModal, setAiModal] = useState(false);
  const [aiQuery, setAiQuery] = useState("");
  const [aiChat, setAiChat] = useState<Array<{ sender: "user" | "ai"; text: string }>>([
    {
      sender: "ai",
      text: "Hello Chef & Kitchen Manager! I am your Mess AI Assistant. Ask me to plan menus, review student opt-ins, check meal schedules, or draft announcements.",
    },
  ]);

  // Subscribe to real-time Unified Mess Menu, Suggestions, and Feedbacks
  useEffect(() => {
    const unsubMenu = subscribeMessMenu(({ meals, specialNote: note }) => {
      setUnifiedMeals(meals);
      setSpecialNote(note);
    });

    const unsubSuggestions = subscribeAdminSuggestions((list) => {
      setAdminSuggestions(list);
    });

    const unsubFeedback = subscribeFoodFeedback((list) => {
      setFoodFeedbacks(list);
    });

    return () => {
      unsubMenu();
      unsubSuggestions();
      unsubFeedback();
    };
  }, []);

  // Quick stats calculations
  const totalOptIns = unifiedMeals.reduce((acc, m) => acc + (m.takesCount || 0), 0);
  const avgOptIn = unifiedMeals.length > 0 ? Math.round(totalOptIns / unifiedMeals.length) : 0;
  const pendingFeedbacks = foodFeedbacks.filter((f) => f.status === "Pending").length;

  const handleOpenEditMeal = (meal: UnifiedMeal) => {
    setEditingMeal(meal);
    setMealItemsInput(meal.items);
    setMealTimingInput(meal.timing);
    setMealStatusInput(meal.status);
    setMealCaloriesInput(meal.calories || "");
    setEditMealModal(true);
  };

  const handleSaveMeal = async () => {
    if (!editingMeal || !mealItemsInput.trim() || !mealTimingInput.trim()) {
      Alert.alert("Required", "Please provide both meal items and serving timings");
      return;
    }

    try {
      setSavingMeal(true);
      await updateMealByMessManager(editingMeal.type, {
        items: mealItemsInput.trim(),
        timing: mealTimingInput.trim(),
        status: mealStatusInput,
        calories: mealCaloriesInput.trim(),
      });

      // Keep local service synchronized as well
      const localMap: Record<string, string> = {
        Breakfast: "m-1",
        Lunch: "m-2",
        Snacks: "m-3",
        Dinner: "m-4",
      };
      if (localMap[editingMeal.type]) {
        messDataService.updateMeal(localMap[editingMeal.type], {
          items: mealItemsInput.trim(),
          timing: mealTimingInput.trim(),
          status: mealStatusInput,
        });
      }

      setEditMealModal(false);
      setActionNotice(`${editingMeal.type} menu & timings updated for all roles!`);
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err: any) {
      Alert.alert("Update Error", err.message || "Could not save meal update");
    } finally {
      setSavingMeal(false);
    }
  };

  const handleSaveSpecialNote = async () => {
    if (!specialNoteInput.trim()) {
      Alert.alert("Required", "Please enter the special note text");
      return;
    }

    try {
      setSavingNote(true);
      await updateSpecialNoteByMessManager(specialNoteInput.trim());
      setSpecialNoteModal(false);
      setActionNotice("Special Note updated & broadcasted to all dashboards!");
      setTimeout(() => setActionNotice(null), 3500);
    } catch (err: any) {
      Alert.alert("Error", err.message || "Could not save special note");
    } finally {
      setSavingNote(false);
    }
  };

  const handleSendAiQuery = (customText?: string) => {
    const textToSend = customText || aiQuery;
    if (!textToSend.trim()) return;

    const userMessage = textToSend.trim();
    const updatedChat = [...aiChat, { sender: "user" as const, text: userMessage }];
    setAiChat(updatedChat);
    setAiQuery("");

    setTimeout(() => {
      const response = getMessAiResponse(
        userMessage,
        unifiedMeals,
        specialNote,
        foodFeedbacks.length
      );
      setAiChat((prev) => [...prev, { sender: "ai" as const, text: response }]);
    }, 300);
  };

  const handlePostNotice = () => {
    if (!noticeTitle.trim()) {
      Alert.alert("Required", "Please provide a notice title");
      return;
    }

    messDataService.addNotice({
      title: noticeTitle.trim(),
      message: noticeMsg.trim() || noticeTitle.trim(),
      date: "Today",
      audience: "All Hostels",
      status: "Active",
    });

    setNoticeTitle("");
    setNoticeMsg("");
    setNoticeModal(false);
    setActionNotice("Notice broadcasted to all students & staff!");
    setTimeout(() => setActionNotice(null), 3000);
  };

  return (
    <MessLayout
      activeNav="dashboard"
      pageTitle="Mess Manager Dashboard"
      pageSubtitle="Campus central kitchen operations & meal management"
      actionNotice={actionNotice}
      rightAction={
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <TouchableOpacity
            style={styles.aiQuickBtn}
            onPress={() => setAiModal(true)}
          >
            <Ionicons name="sparkles" size={15} color="#FFFFFF" />
            <Text style={styles.aiQuickBtnText}>Mess AI</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.postNoticeBtn}
            onPress={() => setNoticeModal(true)}
          >
            <Ionicons name="megaphone-outline" size={15} color="#FFFFFF" />
            <Text style={styles.postNoticeBtnText}>+ Broadcast Notice</Text>
          </TouchableOpacity>
        </View>
      }
    >
      {/* 4 Stat Overview Cards */}
      <View style={styles.statGrid}>
        <View style={styles.statCard}>
          <View style={styles.statTop}>
            <Text style={styles.statTitle}>Total Subscribers</Text>
            <View style={[styles.statIconBadge, { backgroundColor: "#EFF6FF" }]}>
              <Ionicons name="people" size={18} color="#2563EB" />
            </View>
          </View>
          <Text style={styles.statNumber}>480</Text>
          <Text style={styles.statSubtitle}>Active dining hostelers</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statTop}>
            <Text style={styles.statTitle}>Take Food Opt-ins</Text>
            <View style={[styles.statIconBadge, { backgroundColor: "#ECFDF5" }]}>
              <Ionicons name="restaurant" size={18} color="#059669" />
            </View>
          </View>
          <Text style={[styles.statNumber, { color: "#059669" }]}>{totalOptIns}</Text>
          <Text style={styles.statSubtitle}>Headcount across 4 meals</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statTop}>
            <Text style={styles.statTitle}>Avg Meal Headcount</Text>
            <View style={[styles.statIconBadge, { backgroundColor: "#FFF7ED" }]}>
              <Ionicons name="pie-chart" size={18} color="#EA580C" />
            </View>
          </View>
          <Text style={[styles.statNumber, { color: "#EA580C" }]}>{avgOptIn}</Text>
          <Text style={styles.statSubtitle}>Students opting in per meal</Text>
        </View>

        <View style={styles.statCard}>
          <View style={styles.statTop}>
            <Text style={styles.statTitle}>Student Feedback</Text>
            <View style={[styles.statIconBadge, { backgroundColor: pendingFeedbacks > 0 ? "#FEF2F2" : "#F0FDF4" }]}>
              <Ionicons
                name="chatbubble-ellipses"
                size={18}
                color={pendingFeedbacks > 0 ? "#DC2626" : "#16A34A"}
              />
            </View>
          </View>
          <Text style={[styles.statNumber, { color: pendingFeedbacks > 0 ? "#DC2626" : "#16A34A" }]}>
            {foodFeedbacks.length}
          </Text>
          <Text style={styles.statSubtitle}>{pendingFeedbacks} pending review</Text>
        </View>
      </View>

      {/* SPECIAL NOTE BANNER (NEW FEATURE) */}
      <View style={styles.specialNoteBanner}>
        <View style={styles.specialNoteLeft}>
          <View style={styles.specialNoteIconCircle}>
            <Ionicons name="sparkles" size={20} color="#D97706" />
          </View>
          <View style={{ flex: 1 }}>
            <View style={styles.specialNoteHeaderRow}>
              <Text style={styles.specialNoteTag}>⭐ TODAY'S SPECIAL NOTE</Text>
              <Text style={styles.specialNoteTime}>
                {specialNote?.updatedAt ? `Updated ${specialNote.updatedAt}` : "Active"}
              </Text>
            </View>
            <Text style={styles.specialNoteText}>
              {specialNote?.text ||
                "No special note set for today. Click 'Edit Special Note' to announce festival delicacies, timings, or diet advisories."}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.specialNoteEditBtn}
          onPress={() => {
            setSpecialNoteInput(specialNote?.text || "");
            setSpecialNoteModal(true);
          }}
        >
          <Ionicons name="create-outline" size={16} color="#FFFFFF" />
          <Text style={styles.specialNoteEditBtnText}>Edit Special Note</Text>
        </TouchableOpacity>
      </View>

      {/* ADMIN SUGGESTIONS REVIEW (WHEN ADMIN GIVES RECOMMENDATIONS) */}
      {adminSuggestions.length > 0 && (
        <View style={styles.adminSuggBox}>
          <View style={styles.adminSuggHeader}>
            <View style={styles.adminSuggIconCircle}>
              <Ionicons name="bulb" size={18} color="#7C3AED" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.adminSuggTitle}>💡 Administration Recommendations & Actions</Text>
              <Text style={styles.adminSuggSub}>
                Admin suggestions received for menu adjustments and kitchen quality
              </Text>
            </View>
            <View style={styles.adminSuggCountBadge}>
              <Text style={styles.adminSuggCountText}>{adminSuggestions.length} Suggestions</Text>
            </View>
          </View>

          <View style={styles.adminSuggList}>
            {adminSuggestions.slice(0, 2).map((sugg) => (
              <View key={sugg.id} style={styles.adminSuggItem}>
                <View style={styles.adminSuggItemTop}>
                  <Text style={styles.adminSuggMealType}>Target: {sugg.mealType} Meal</Text>
                  <Text style={styles.adminSuggDate}>{sugg.date}</Text>
                </View>
                <Text style={styles.adminSuggText}>"{sugg.suggestion}"</Text>
                <Text style={styles.adminSuggAuthor}>From: {sugg.adminName}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Quick Action Ribbon */}
      <View style={styles.quickActionRibbon}>
        <TouchableOpacity
          style={styles.ribbonBtn}
          onPress={() => router.push("/mess-manager/menu")}
        >
          <Ionicons name="calendar-outline" size={16} color="#2563EB" />
          <Text style={styles.ribbonBtnText}>Weekly Menu</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ribbonBtn}
          onPress={() => router.push("/mess-manager/meal-attendance")}
        >
          <Ionicons name="checkbox-outline" size={16} color="#059669" />
          <Text style={styles.ribbonBtnText}>Meal Attendance</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ribbonBtn}
          onPress={() => router.push("/mess-manager/students")}
        >
          <Ionicons name="people-outline" size={16} color="#D97706" />
          <Text style={styles.ribbonBtnText}>Subscribed Diners</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ribbonBtn}
          onPress={() => router.push("/mess-manager/expenses")}
        >
          <Ionicons name="wallet-outline" size={16} color="#7C3AED" />
          <Text style={styles.ribbonBtnText}>Mess Expenses</Text>
        </TouchableOpacity>
      </View>

      {/* Two Column Layout: Today's Menu & Tomorrow Prediction */}
      <View style={styles.contentRow}>
        {/* Left Column: Today's Menu */}
        <View style={styles.leftCol}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionTitle}>Today's Meal Schedule & Timings</Text>
              <Text style={styles.sectionSubtitle}>
                Live dishes, serving times, and Take Food headcount (Instant sync with all roles)
              </Text>
            </View>
            <TouchableOpacity
              style={styles.editMenuBtn}
              onPress={() => router.push("/mess-manager/menu")}
            >
              <Text style={styles.editMenuBtnText}>Full Weekly Schedule</Text>
              <Ionicons name="chevron-forward" size={14} color="#2563EB" />
            </TouchableOpacity>
          </View>

          <View style={styles.mealGrid}>
            {unifiedMeals.map((meal) => {
              const isServed = meal.status === "Served";
              const isOngoing = meal.status === "Ongoing";
              return (
                <View key={meal.id} style={styles.mealCard}>
                  <View style={styles.mealCardTop}>
                    <View style={styles.mealTypeBadge}>
                      <Ionicons
                        name={
                          meal.type === "Breakfast"
                            ? "sunny-outline"
                            : meal.type === "Lunch"
                            ? "restaurant-outline"
                            : meal.type === "Snacks"
                            ? "cafe-outline"
                            : "moon-outline"
                        }
                        size={16}
                        color="#2563EB"
                      />
                      <Text style={styles.mealTypeText}>{meal.type}</Text>
                    </View>

                    <View style={{ flexDirection: "row", gap: 6, alignItems: "center" }}>
                      {/* Take Food Headcount Badge */}
                      <View style={styles.takesBadge}>
                        <Ionicons name="restaurant" size={12} color="#059669" />
                        <Text style={styles.takesBadgeText}>{meal.takesCount || 0} Taking</Text>
                      </View>

                      <View
                        style={[
                          styles.statusBadge,
                          isServed
                            ? styles.badgeServed
                            : isOngoing
                            ? styles.badgeOngoing
                            : styles.badgeUpcoming,
                        ]}
                      >
                        <Text
                          style={[
                            styles.statusBadgeText,
                            isServed
                              ? styles.textServed
                              : isOngoing
                              ? styles.textOngoing
                              : styles.textUpcoming,
                          ]}
                        >
                          {meal.status}
                        </Text>
                      </View>
                    </View>
                  </View>

                  <Text style={styles.mealItemsText}>{meal.items}</Text>

                  <View style={styles.mealTimingRow}>
                    <Ionicons name="time-outline" size={14} color="#64748B" />
                    <Text style={styles.timingText}>{meal.timing}</Text>
                    {meal.calories && (
                      <Text style={styles.calorieText}>🔥 {meal.calories}</Text>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.cardEditBtn}
                    onPress={() => handleOpenEditMeal(meal)}
                  >
                    <Ionicons name="create-outline" size={15} color="#2563EB" />
                    <Text style={styles.cardEditBtnText}>Edit Items & Timings</Text>
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </View>

        {/* Right Column: Tomorrow Attendance & Recent Feedback */}
        <View style={styles.rightCol}>
          {/* Banner */}
          <View style={styles.kitchenBanner}>
            <View style={styles.bannerIcon}>
              <Ionicons name="shield-checkmark" size={24} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.bannerTitle}>100% Hygienic Kitchen</Text>
              <Text style={styles.bannerSubtitle}>
                ISO 22000 Food Safety Standards • Daily Lab Inspection
              </Text>
            </View>
          </View>

          {/* Tomorrow Meal Attendance Prediction Card */}
          <View style={styles.predictionCard}>
            <Text style={styles.cardHeading}>Tomorrow's Meal Attendance Forecast</Text>
            <Text style={styles.cardSub}>AI prediction based on leave records & weekday trends</Text>

            <View style={styles.predictionBars}>
              {[
                { meal: "Breakfast", count: 410, pct: "85%" },
                { meal: "Lunch", count: 445, pct: "93%" },
                { meal: "Snacks", count: 390, pct: "81%" },
                { meal: "Dinner", count: 435, pct: "91%" },
              ].map((item) => (
                <View key={item.meal} style={styles.barItem}>
                  <View style={styles.barLabelRow}>
                    <Text style={styles.barMealName}>{item.meal}</Text>
                    <Text style={styles.barCountText}>{item.count} students ({item.pct})</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: item.pct as any }]} />
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Real-time Student & Staff Food Feedback */}
          <View style={styles.feedbackCard}>
            <View style={styles.cardHeaderBetween}>
              <View>
                <Text style={styles.cardHeading}>Live Campus Food Feedback</Text>
                <Text style={styles.cardSubMini}>Reviews synced from students, faculty & staff</Text>
              </View>
              <TouchableOpacity onPress={() => router.push("/mess-manager/feedback")}>
                <Text style={styles.seeAllText}>View All</Text>
              </TouchableOpacity>
            </View>

            {foodFeedbacks.length === 0 ? (
              <Text style={{ fontSize: 12, color: "#94A3B8", textAlign: "center", paddingVertical: 12 }}>
                No feedback received today yet.
              </Text>
            ) : (
              foodFeedbacks.slice(0, 3).map((fb) => (
                <View key={fb.id} style={styles.fbItem}>
                  <View style={styles.fbTopRow}>
                    <View>
                      <Text style={styles.fbStudent}>{fb.userName}</Text>
                      <Text style={styles.fbRoleBadge}>Role: {fb.userRole} • {fb.meal}</Text>
                    </View>
                    <View style={styles.starRow}>
                      <Ionicons name="star" size={12} color="#F59E0B" />
                      <Text style={styles.starScore}>{fb.rating}.0</Text>
                    </View>
                  </View>

                  <Text style={styles.fbDesc}>"{fb.comment}"</Text>

                  {fb.adminActionNote && (
                    <View style={styles.adminActionNotePill}>
                      <Ionicons name="shield-checkmark" size={11} color="#7C3AED" />
                      <Text style={styles.adminActionNoteText}>
                        Admin Action: {fb.adminActionNote}
                      </Text>
                    </View>
                  )}

                  <View style={styles.fbActionRow}>
                    <Text style={styles.fbDate}>Taste: {fb.tasteRating || 5}★ • Hygiene: {fb.hygieneRating || 5}★ • {fb.date}</Text>
                    <View
                      style={[
                        styles.statusPill,
                        fb.status === "Action Taken"
                          ? styles.pillResolved
                          : styles.pillPending,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          fb.status === "Action Taken"
                            ? styles.textResolved
                            : styles.textPending,
                        ]}
                      >
                        {fb.status || "Pending"}
                      </Text>
                    </View>
                  </View>
                </View>
              ))
            )}
          </View>
        </View>
      </View>

      {/* EDIT MEAL ITEMS & TIMINGS MODAL (MESS MANAGER EXCLUSIVE) */}
      <Modal visible={editMealModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Edit {editingMeal?.type} Menu & Timings</Text>
                <Text style={styles.modalSubtitle}>Changes instantly update student & admin screens</Text>
              </View>
              <TouchableOpacity onPress={() => setEditMealModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Dishes & Menu Items *</Text>
            <TextInput
              value={mealItemsInput}
              onChangeText={setMealItemsInput}
              placeholder="e.g. Paneer Butter Masala + Phulka + Jeera Rice + Gulab Jamun"
              style={[styles.modalInput, { height: 70 }]}
              multiline
            />

            <Text style={styles.modalLabel}>Serving Timings *</Text>
            <TextInput
              value={mealTimingInput}
              onChangeText={setMealTimingInput}
              placeholder="e.g. 7:30 AM - 9:30 AM or 12:30 PM - 2:30 PM"
              style={styles.modalInput}
            />

            <Text style={styles.modalLabel}>Estimated Calories (Optional)</Text>
            <TextInput
              value={mealCaloriesInput}
              onChangeText={setMealCaloriesInput}
              placeholder="e.g. 520 kcal"
              style={styles.modalInput}
            />

            <Text style={styles.modalLabel}>Service Status</Text>
            <View style={styles.statusOptionRow}>
              {(["Upcoming", "Ongoing", "Served"] as const).map((st) => (
                <TouchableOpacity
                  key={st}
                  style={[
                    styles.statusOption,
                    mealStatusInput === st && styles.statusOptionActive,
                  ]}
                  onPress={() => setMealStatusInput(st)}
                >
                  <Text
                    style={[
                      styles.statusOptionText,
                      mealStatusInput === st && styles.statusOptionTextActive,
                    ]}
                  >
                    {st}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditMealModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveMealBtn}
                onPress={handleSaveMeal}
                disabled={savingMeal}
              >
                <Text style={styles.saveMealBtnText}>
                  {savingMeal ? "Saving..." : "Update Meal & Timings"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* EDIT SPECIAL NOTE MODAL */}
      <Modal visible={specialNoteModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Daily Special Note</Text>
                <Text style={styles.modalSubtitle}>Displayed prominently on all student and staff dashboards</Text>
              </View>
              <TouchableOpacity onPress={() => setSpecialNoteModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Special Note Content *</Text>
            <TextInput
              value={specialNoteInput}
              onChangeText={setSpecialNoteInput}
              placeholder="e.g. Special festive dinner tonight! Extra sweets & fruit salad will be served."
              style={[styles.modalInput, { height: 90 }]}
              multiline
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setSpecialNoteModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveMealBtn, { backgroundColor: "#D97706" }]}
                onPress={handleSaveSpecialNote}
                disabled={savingNote}
              >
                <Text style={styles.saveMealBtnText}>
                  {savingNote ? "Broadcasting..." : "Save Special Note"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MESS AI ASSISTANT MODAL */}
      <Modal visible={aiModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { maxWidth: 540, maxHeight: "85%" }]}>
            <View style={styles.aiModalHeader}>
              <View style={styles.aiIconBubble}>
                <Ionicons name="sparkles" size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.aiModalTitle}>Mess AI Assistant</Text>
                <Text style={styles.aiModalSubtitle}>Kitchen planning, nutrition advisory & headcount insights</Text>
              </View>
              <TouchableOpacity onPress={() => setAiModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            {/* Quick Prompt Chips */}
            <View style={styles.aiChipRow}>
              {[
                "Today's schedule",
                "Take Food opt-ins",
                "Special note",
                "Feedback summary",
              ].map((chip) => (
                <TouchableOpacity
                  key={chip}
                  style={styles.aiChip}
                  onPress={() => handleSendAiQuery(chip)}
                >
                  <Text style={styles.aiChipText}>{chip}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Chat Body */}
            <ScrollView style={styles.aiChatBody} contentContainerStyle={{ gap: 10, paddingVertical: 8 }}>
              {aiChat.map((msg, idx) => (
                <View
                  key={idx}
                  style={[
                    styles.aiMsgBubble,
                    msg.sender === "user" ? styles.aiMsgUser : styles.aiMsgAi,
                  ]}
                >
                  <Text
                    style={[
                      styles.aiMsgText,
                      msg.sender === "user" ? styles.aiMsgTextUser : styles.aiMsgTextAi,
                    ]}
                  >
                    {msg.text}
                  </Text>
                </View>
              ))}
            </ScrollView>

            {/* Input Bar */}
            <View style={styles.aiInputRow}>
              <TextInput
                value={aiQuery}
                onChangeText={setAiQuery}
                placeholder="Ask Mess AI anything about meals, timings..."
                style={styles.aiInput}
                onSubmitEditing={() => handleSendAiQuery()}
              />
              <TouchableOpacity
                style={styles.aiSendBtn}
                onPress={() => handleSendAiQuery()}
              >
                <Ionicons name="send" size={16} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Broadcast Notice Modal */}
      <Modal visible={noticeModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Broadcast Mess Notice</Text>
              <TouchableOpacity onPress={() => setNoticeModal(false)}>
                <Ionicons name="close" size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <Text style={styles.modalLabel}>Notice Title *</Text>
            <TextInput
              value={noticeTitle}
              onChangeText={setNoticeTitle}
              placeholder="e.g. Special Sunday Feast Menu Announced"
              style={styles.modalInput}
            />

            <Text style={styles.modalLabel}>Notice Message</Text>
            <TextInput
              value={noticeMsg}
              onChangeText={setNoticeMsg}
              placeholder="Details about feast timings, special items, guest passes..."
              style={[styles.modalInput, { height: 75 }]}
              multiline
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setNoticeModal(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveMealBtn}
                onPress={handlePostNotice}
              >
                <Text style={styles.saveMealBtnText}>Broadcast Notice</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </MessLayout>
  );
}

const styles = StyleSheet.create({
  aiQuickBtn: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 13,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  aiQuickBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  postNoticeBtn: {
    backgroundColor: "#EA580C",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  postNoticeBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  statGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
  },
  statTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  statIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  statNumber: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 8,
  },
  statSubtitle: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },
  // Special Note Banner
  specialNoteBanner: {
    backgroundColor: "#FFFBEB",
    borderColor: "#FDE68A",
    borderWidth: 1.5,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
  specialNoteLeft: {
    flex: 1,
    minWidth: 260,
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  specialNoteIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FEF3C7",
    alignItems: "center",
    justifyContent: "center",
  },
  specialNoteHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 3,
  },
  specialNoteTag: {
    fontSize: 11,
    fontWeight: "800",
    color: "#B45309",
    letterSpacing: 0.5,
  },
  specialNoteTime: {
    fontSize: 11,
    color: "#92400E",
  },
  specialNoteText: {
    fontSize: 13,
    color: "#78350F",
    lineHeight: 19,
    fontWeight: "500",
  },
  specialNoteEditBtn: {
    backgroundColor: "#D97706",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  specialNoteEditBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  // Admin Suggestions Box
  adminSuggBox: {
    backgroundColor: "#FAF5FF",
    borderWidth: 1,
    borderColor: "#E9D5FF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  adminSuggHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  adminSuggIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3E8FF",
    alignItems: "center",
    justifyContent: "center",
  },
  adminSuggTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#581C87",
  },
  adminSuggSub: {
    fontSize: 11,
    color: "#7E22CE",
  },
  adminSuggCountBadge: {
    backgroundColor: "#7C3AED",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  adminSuggCountText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
  },
  adminSuggList: {
    gap: 8,
  },
  adminSuggItem: {
    backgroundColor: "#FFFFFF",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#F3E8FF",
  },
  adminSuggItemTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  adminSuggMealType: {
    fontSize: 11,
    fontWeight: "700",
    color: "#7C3AED",
  },
  adminSuggDate: {
    fontSize: 10,
    color: "#94A3B8",
  },
  adminSuggText: {
    fontSize: 12,
    color: "#1E293B",
    fontStyle: "italic",
    lineHeight: 17,
  },
  adminSuggAuthor: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 4,
  },
  quickActionRibbon: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 20,
  },
  ribbonBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ribbonBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E293B",
  },
  contentRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 20,
  },
  leftCol: {
    flex: 3,
    minWidth: 320,
  },
  rightCol: {
    flex: 2,
    minWidth: 300,
    gap: 16,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172A",
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#64748B",
  },
  editMenuBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  editMenuBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  mealGrid: {
    gap: 12,
  },
  mealCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOpacity: 0.02,
    shadowRadius: 6,
    elevation: 2,
  },
  mealCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  mealTypeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  mealTypeText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#0F172A",
  },
  takesBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  takesBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#059669",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  badgeServed: {
    backgroundColor: "#ECFDF5",
  },
  badgeOngoing: {
    backgroundColor: "#EFF6FF",
  },
  badgeUpcoming: {
    backgroundColor: "#FFFBEB",
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  textServed: {
    color: "#059669",
  },
  textOngoing: {
    color: "#2563EB",
  },
  textUpcoming: {
    color: "#D97706",
  },
  mealItemsText: {
    fontSize: 14,
    color: "#334155",
    fontWeight: "600",
    lineHeight: 20,
    marginBottom: 10,
  },
  mealTimingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    marginBottom: 10,
  },
  timingText: {
    fontSize: 12,
    color: "#64748B",
  },
  calorieText: {
    fontSize: 12,
    color: "#EA580C",
    fontWeight: "600",
    marginLeft: "auto",
  },
  cardEditBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F8FAFC",
    paddingVertical: 7,
    borderRadius: 6,
  },
  cardEditBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  kitchenBanner: {
    backgroundColor: "#0A1E3F",
    borderRadius: 12,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  bannerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#10B981",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerTitle: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "800",
  },
  bannerSubtitle: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 2,
  },
  predictionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardHeading: {
    fontSize: 14,
    fontWeight: "800",
    color: "#0F172A",
  },
  cardSub: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
    marginBottom: 14,
  },
  cardSubMini: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 1,
  },
  predictionBars: {
    gap: 10,
  },
  barItem: {
    gap: 4,
  },
  barLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  barMealName: {
    fontSize: 12,
    fontWeight: "700",
    color: "#334155",
  },
  barCountText: {
    fontSize: 11,
    color: "#64748B",
  },
  barTrack: {
    height: 8,
    backgroundColor: "#F1F5F9",
    borderRadius: 4,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    backgroundColor: "#2563EB",
    borderRadius: 4,
  },
  feedbackCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  cardHeaderBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  seeAllText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },
  fbItem: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  fbTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  fbStudent: {
    fontSize: 12,
    fontWeight: "700",
    color: "#1E293B",
  },
  fbRoleBadge: {
    fontSize: 10,
    color: "#64748B",
  },
  starRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  starScore: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D97706",
  },
  statusPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  pillResolved: {
    backgroundColor: "#ECFDF5",
  },
  pillPending: {
    backgroundColor: "#FEF3C7",
  },
  statusPillText: {
    fontSize: 10,
    fontWeight: "700",
  },
  textResolved: {
    color: "#059669",
  },
  textPending: {
    color: "#D97706",
  },
  fbDesc: {
    fontSize: 12,
    color: "#475569",
    marginTop: 4,
    marginBottom: 4,
  },
  adminActionNotePill: {
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  adminActionNoteText: {
    fontSize: 10,
    color: "#6D28D9",
    fontWeight: "600",
  },
  fbActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  fbDate: {
    fontSize: 10,
    color: "#94A3B8",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 460,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
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
    color: "#0F172A",
  },
  modalSubtitle: {
    fontSize: 11,
    color: "#64748B",
    marginTop: 2,
  },
  modalLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 5,
    marginTop: 10,
  },
  modalInput: {
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 13,
    color: "#0F172A",
  },
  statusOptionRow: {
    flexDirection: "row",
    gap: 8,
  },
  statusOption: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#CBD5E1",
    paddingVertical: 7,
    borderRadius: 6,
    alignItems: "center",
  },
  statusOptionActive: {
    borderColor: "#2563EB",
    backgroundColor: "#EFF6FF",
  },
  statusOptionText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
  },
  statusOptionTextActive: {
    color: "#2563EB",
    fontWeight: "700",
  },
  modalBtnRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
    marginTop: 18,
  },
  cancelBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#CBD5E1",
  },
  cancelBtnText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  saveMealBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveMealBtnText: {
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  // Mess AI Styles
  aiModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  aiIconBubble: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
  },
  aiModalTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#0F172A",
  },
  aiModalSubtitle: {
    fontSize: 11,
    color: "#64748B",
  },
  aiChipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 10,
  },
  aiChip: {
    backgroundColor: "#F3E8FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  aiChipText: {
    fontSize: 11,
    color: "#7C3AED",
    fontWeight: "600",
  },
  aiChatBody: {
    maxHeight: 280,
    backgroundColor: "#F8FAFC",
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  aiMsgBubble: {
    maxWidth: "85%",
    padding: 10,
    borderRadius: 10,
  },
  aiMsgUser: {
    alignSelf: "flex-end",
    backgroundColor: "#2563EB",
  },
  aiMsgAi: {
    alignSelf: "flex-start",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  aiMsgText: {
    fontSize: 12,
    lineHeight: 18,
  },
  aiMsgTextUser: {
    color: "#FFFFFF",
  },
  aiMsgTextAi: {
    color: "#1E293B",
  },
  aiInputRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  aiInput: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    color: "#0F172A",
  },
  aiSendBtn: {
    backgroundColor: "#7C3AED",
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
});