import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import { useAppTheme } from "../../context/ThemeContext";
import { auth, db } from "../../firebase/config";
import {
  ScheduleEntry,
  subscribeSchedules,
  addScheduleEntry,
  updateScheduleEntry,
  deleteScheduleEntry,
  getDynamicClassStatus,
  ClassStatus,
} from "../../services/scheduleService";

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const STANDARD_SUBJECTS = [
  "Data Structures & Algorithms",
  "Database Management Systems",
  "Operating Systems",
  "Computer Networks",
  "Web Technologies",
  "Artificial Intelligence",
  "Software Engineering",
  "Algorithms Lab",
];

const PRESET_TIMES = [
  { start: "09:00 AM", end: "10:00 AM" },
  { start: "10:15 AM", end: "11:15 AM" },
  { start: "11:30 AM", end: "12:30 PM" },
  { start: "01:15 PM", end: "02:15 PM" },
  { start: "02:00 PM", end: "03:30 PM" },
  { start: "03:45 PM", end: "04:45 PM" },
];

const COLOR_PRESETS = [
  { color: "#2563EB", bg: "#EFF6FF", label: "Blue" },
  { color: "#7C3AED", bg: "#FAF5FF", label: "Purple" },
  { color: "#059669", bg: "#ECFDF5", label: "Green" },
  { color: "#EA580C", bg: "#FFF7ED", label: "Orange" },
  { color: "#0891B2", bg: "#CFFAFE", label: "Cyan" },
  { color: "#E11D48", bg: "#FFF1F2", label: "Rose" },
];

export default function TeacherScheduleScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const { colors, isDark } = useAppTheme();

  const [schedules, setSchedules] = useState<ScheduleEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDayTab, setSelectedDayTab] = useState<string>("Mon");
  const [currentTime, setCurrentTime] = useState(new Date());

  // Modal State for Add / Edit
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleEntry | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form Fields
  const [formSubject, setFormSubject] = useState("Data Structures & Algorithms");
  const [formDay, setFormDay] = useState("Mon");
  const [formStartTime, setFormStartTime] = useState("09:00 AM");
  const [formEndTime, setFormEndTime] = useState("10:00 AM");
  const [formRoom, setFormRoom] = useState("Room 204 • 2nd Floor");
  const [formFaculty, setFormFaculty] = useState("Prof. Priya Sharma");
  const [formDept, setFormDept] = useState("CSE");
  const [formSection, setFormSection] = useState("A");
  const [formColor, setFormColor] = useState("#2563EB");
  const [formBg, setFormBg] = useState("#EFF6FF");

  // Keep live time ticking every 30s to update ongoing badges
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000);
    return () => clearInterval(timer);
  }, []);

  // Compute current week's dates dynamically based on real system date
  const weekDaysInfo = useMemo(() => {
    const now = currentTime;
    const dayOfWeek = now.getDay(); // 0 is Sun, 1 is Mon
    // Distance to Monday of current week
    const diffToMon = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMon);

    const list = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dayName = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][d.getDay()];
      const isToday =
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear();

      list.push({
        dayName,
        dateNum: String(d.getDate()).padStart(2, "0"),
        monthName: d.toLocaleDateString("en-US", { month: "short" }),
        fullDateStr: d.toLocaleDateString("en-US", {
          day: "numeric",
          month: "short",
          year: "numeric",
        }),
        isToday,
      });
    }
    return list;
  }, [currentTime]);

  // Set default selected day tab to today on mount
  useEffect(() => {
    const todayShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date().getDay()];
    setSelectedDayTab(todayShort);
  }, []);

  // Subscribe to shared Firestore schedules collection
  useEffect(() => {
    const unsubscribe = subscribeSchedules((list) => {
      setSchedules(list);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Open modal in Add mode
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormSubject("Data Structures & Algorithms");
    setFormDay(selectedDayTab);
    setFormStartTime("09:00 AM");
    setFormEndTime("10:00 AM");
    setFormRoom("Room 204 • 2nd Floor");
    setFormFaculty(auth.currentUser?.displayName || "Prof. Priya Sharma");
    setFormDept("CSE");
    setFormSection("A");
    setFormColor("#2563EB");
    setFormBg("#EFF6FF");
    setModalOpen(true);
  };

  // Open modal in Edit mode
  const handleOpenEditModal = (item: ScheduleEntry) => {
    setEditingItem(item);
    setFormSubject(item.subject);
    setFormDay(item.day);
    setFormStartTime(item.startTime);
    setFormEndTime(item.endTime);
    setFormRoom(item.room);
    setFormFaculty(item.faculty || "Faculty");
    setFormDept(item.department || "CSE");
    setFormSection(item.section || "A");
    setFormColor(item.color || "#2563EB");
    setFormBg(item.bg || "#EFF6FF");
    setModalOpen(true);
  };

  // Save Schedule Entry
  const handleSaveSchedule = async () => {
    if (!formSubject.trim() || !formStartTime.trim() || !formEndTime.trim()) {
      Alert.alert("Required", "Please provide subject name and valid start/end times.");
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        subject: formSubject.trim(),
        day: formDay,
        startTime: formStartTime.trim(),
        endTime: formEndTime.trim(),
        timeRange: `${formStartTime.trim()} – ${formEndTime.trim()}`,
        room: formRoom.trim() || "Room 101",
        faculty: formFaculty.trim() || "Faculty Instructor",
        department: formDept.trim(),
        section: formSection.trim(),
        color: formColor,
        bg: formBg,
        icon: "book",
      };

      if (editingItem) {
        await updateScheduleEntry(editingItem.id, payload);
        Alert.alert("Schedule Updated", `Class for ${payload.subject} has been updated.`);
      } else {
        await addScheduleEntry(payload);
        Alert.alert("Schedule Created", `New class added for ${payload.subject} on ${formDay}.`);
      }
      setModalOpen(false);
      setEditingItem(null);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to save schedule.");
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Schedule Entry
  const handleDeleteSchedule = (id: string, subject: string) => {
    Alert.alert("Delete Class Schedule", `Are you sure you want to remove "${subject}" from the timetable?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await deleteScheduleEntry(id);
            Alert.alert("Deleted", "Class removed from schedule.");
          } catch (e: any) {
            Alert.alert("Error", e?.message || "Failed to delete class.");
          }
        },
      },
    ]);
  };

  // Filter schedules for the active day
  const activeDayClasses = useMemo(() => {
    return schedules.filter((s) => s.day === selectedDayTab);
  }, [schedules, selectedDayTab]);

  // Overall status count for today
  const todayLiveCounts = useMemo(() => {
    const todayShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][currentTime.getDay()];
    const todayClasses = schedules.filter((s) => s.day === todayShort);
    let ongoing = 0;
    let upcoming = 0;
    let completed = 0;

    todayClasses.forEach((c) => {
      const status = getDynamicClassStatus(c, currentTime);
      if (status === "Ongoing") ongoing++;
      else if (status === "Upcoming") upcoming++;
      else completed++;
    });

    return { total: todayClasses.length, ongoing, upcoming, completed };
  }, [schedules, currentTime]);

  return (
    <View style={[styles.root, { backgroundColor: isDark ? "#0B132B" : "#F4F7FC" }]}>
      {/* Top Header */}
      <View style={[styles.topBar, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: colors.border }]}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
          <TouchableOpacity onPress={() => router.push("/teacher")} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <View>
            <Text style={[styles.pageTitle, { color: colors.text }]}>Timetable & Schedule</Text>
            <Text style={styles.pageSub}>
              Live curriculum schedule • Auto-synced across Campusly
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <TouchableOpacity style={styles.addBtn} onPress={handleOpenAddModal}>
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.addBtnText}>+ Add Schedule</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.contentScroll}
        contentContainerStyle={styles.contentPadding}
        showsVerticalScrollIndicator={false}
      >
        {/* Dynamic Week Date Indicator Bar */}
        <View style={[styles.weekBarCard, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: colors.border }]}>
          <View style={styles.weekHeader}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <Ionicons name="calendar" size={16} color="#2563EB" />
              <Text style={[styles.weekTitle, { color: colors.text }]}>
                {weekDaysInfo[0].fullDateStr} – {weekDaysInfo[6].fullDateStr}
              </Text>
            </View>
            <View style={styles.liveIndicatorPill}>
              <View style={styles.livePulseDot} />
              <Text style={styles.liveIndicatorText}>
                {todayLiveCounts.ongoing > 0
                  ? `${todayLiveCounts.ongoing} Class Live Now`
                  : "Live Time Sync"}
              </Text>
            </View>
          </View>

          {/* Days of week interactive selector */}
          <View style={styles.daysStrip}>
            {weekDaysInfo.map((item) => {
              const isSelected = selectedDayTab === item.dayName;
              const dayClasses = schedules.filter((s) => s.day === item.dayName);

              return (
                <TouchableOpacity
                  key={item.dayName}
                  style={[
                    styles.dayTabItem,
                    isSelected && styles.dayTabItemSelected,
                    item.isToday && !isSelected && styles.dayTabItemToday,
                  ]}
                  onPress={() => setSelectedDayTab(item.dayName)}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.dayTabText, isSelected && styles.dayTabTextSelected]}>
                    {item.dayName}
                  </Text>
                  <Text style={[styles.dayDateNumber, isSelected && styles.dayDateNumberSelected]}>
                    {item.dateNum}
                  </Text>
                  {dayClasses.length > 0 ? (
                    <View style={[styles.dayClassDot, isSelected && { backgroundColor: "#FFFFFF" }]} />
                  ) : (
                    <View style={{ height: 4 }} />
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Schedule Grid & Sidebar */}
        <View style={[styles.scheduleLayout, !isDesktop && styles.scheduleLayoutStacked]}>
          {/* Main Classes Column */}
          <View style={{ flex: 2.6 }}>
            <View style={[styles.dayHeaderRow, { borderBottomColor: isDark ? "#334155" : "#E2E8F0" }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={[styles.selectedDayTitle, { color: colors.text }]}>
                  {selectedDayTab} Schedule
                </Text>
                <View style={styles.countBadge}>
                  <Text style={styles.countBadgeText}>{activeDayClasses.length} Classes</Text>
                </View>
              </View>

              <TouchableOpacity style={styles.addNewSlotBtn} onPress={handleOpenAddModal}>
                <Ionicons name="add-circle" size={14} color="#2563EB" />
                <Text style={styles.addNewSlotText}>Add Slot for {selectedDayTab}</Text>
              </TouchableOpacity>
            </View>

            {loading ? (
              <View style={styles.emptyContainer}>
                <ActivityIndicator size="large" color="#2563EB" />
                <Text style={{ marginTop: 10, color: "#64748B" }}>Loading timetable...</Text>
              </View>
            ) : activeDayClasses.length === 0 ? (
              <View style={[styles.emptyContainer, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: colors.border }]}>
                <Ionicons name="calendar-outline" size={42} color="#94A3B8" />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>No classes on {selectedDayTab}</Text>
                <Text style={styles.emptySubtitle}>
                  You don't have any scheduled sessions for {selectedDayTab}. Tap below to add one.
                </Text>
                <TouchableOpacity style={styles.addBtn} onPress={handleOpenAddModal}>
                  <Ionicons name="add" size={16} color="#FFFFFF" />
                  <Text style={styles.addBtnText}>+ Add Class for {selectedDayTab}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={{ gap: 10, marginTop: 10 }}>
                {activeDayClasses.map((item) => {
                  const status: ClassStatus = getDynamicClassStatus(item, currentTime);

                  return (
                    <View
                      key={item.id}
                      style={[
                        styles.classCard,
                        {
                          backgroundColor: isDark ? "#1E293B" : "#FFFFFF",
                          borderColor: status === "Ongoing" ? "#10B981" : colors.border,
                          borderLeftColor: item.color || "#2563EB",
                        },
                        status === "Ongoing" && styles.ongoingClassGlow,
                      ]}
                    >
                      {/* Left: Time Column */}
                      <View style={styles.classTimeCol}>
                        <Text style={[styles.classTimeStart, { color: colors.text }]}>
                          {item.startTime}
                        </Text>
                        <Text style={styles.classTimeDivider}>↓</Text>
                        <Text style={styles.classTimeEnd}>{item.endTime}</Text>
                      </View>

                      {/* Middle: Details */}
                      <View style={{ flex: 1, paddingHorizontal: 12 }}>
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                          <Text style={[styles.classSubjectTitle, { color: colors.text }]}>
                            {item.subject}
                          </Text>
                          {item.subjectCode ? (
                            <View style={styles.codeTag}>
                              <Text style={styles.codeTagText}>{item.subjectCode}</Text>
                            </View>
                          ) : null}
                        </View>

                        <View style={styles.classMetaRow}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                            <Ionicons name="location-outline" size={12} color="#64748B" />
                            <Text style={styles.classMetaText}>{item.room}</Text>
                          </View>
                          <Text style={styles.metaDot}>•</Text>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                            <Ionicons name="people-outline" size={12} color="#64748B" />
                            <Text style={styles.classMetaText}>
                              {item.department} - {item.section}
                            </Text>
                          </View>
                          <Text style={styles.metaDot}>•</Text>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 3 }}>
                            <Ionicons name="person-outline" size={12} color="#64748B" />
                            <Text style={styles.classMetaText}>{item.faculty}</Text>
                          </View>
                        </View>
                      </View>

                      {/* Right: Live Status Badge & Actions */}
                      <View style={styles.classRightActions}>
                        {status === "Ongoing" ? (
                          <View style={styles.statusOngoingBadge}>
                            <View style={styles.ongoingDot} />
                            <Text style={styles.statusOngoingText}>● Ongoing Now</Text>
                          </View>
                        ) : status === "Upcoming" ? (
                          <View style={styles.statusUpcomingBadge}>
                            <Ionicons name="time-outline" size={11} color="#2563EB" />
                            <Text style={styles.statusUpcomingText}>Upcoming</Text>
                          </View>
                        ) : (
                          <View style={styles.statusCompletedBadge}>
                            <Ionicons name="checkmark-circle-outline" size={11} color="#64748B" />
                            <Text style={styles.statusCompletedText}>Completed</Text>
                          </View>
                        )}

                        <View style={{ flexDirection: "row", gap: 4, marginTop: 8 }}>
                          <TouchableOpacity
                            style={styles.actionIconBtn}
                            onPress={() => handleOpenEditModal(item)}
                          >
                            <Ionicons name="create-outline" size={15} color="#2563EB" />
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.actionIconBtn, { backgroundColor: "#FEE2E2" }]}
                            onPress={() => handleDeleteSchedule(item.id, item.subject)}
                          >
                            <Ionicons name="trash-outline" size={15} color="#EF4444" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Right Sidebar Widgets */}
          <View style={styles.scheduleSideWidgets}>
            {/* Quick Stats Card */}
            <View style={[styles.sideCard, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: colors.border }]}>
              <Text style={[styles.sideCardTitle, { color: colors.text }]}>Today's Snapshot</Text>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Total Today:</Text>
                <Text style={[styles.statValue, { color: colors.text }]}>{todayLiveCounts.total}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Ongoing Right Now:</Text>
                <Text style={[styles.statValue, { color: "#10B981" }]}>{todayLiveCounts.ongoing}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Upcoming Today:</Text>
                <Text style={[styles.statValue, { color: "#2563EB" }]}>{todayLiveCounts.upcoming}</Text>
              </View>
              <View style={styles.statRow}>
                <Text style={styles.statLabel}>Completed Today:</Text>
                <Text style={[styles.statValue, { color: "#64748B" }]}>{todayLiveCounts.completed}</Text>
              </View>
            </View>

            {/* Quick Navigation Card */}
            <View style={[styles.sideCard, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: colors.border, marginTop: 10 }]}>
              <Text style={[styles.sideCardTitle, { color: colors.text }]}>Quick Operations</Text>
              <TouchableOpacity style={styles.sideBtn} onPress={handleOpenAddModal}>
                <Ionicons name="add-circle-outline" size={16} color="#2563EB" />
                <Text style={styles.sideBtnText}>+ Create New Schedule Slot</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sideBtn} onPress={() => router.push("/teacher/attendance")}>
                <Ionicons name="checkbox-outline" size={16} color="#059669" />
                <Text style={styles.sideBtnText}>Mark Attendance</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sideBtn} onPress={() => router.push("/teacher/assignments")}>
                <Ionicons name="document-text-outline" size={16} color="#7C3AED" />
                <Text style={styles.sideBtnText}>Manage Assignments</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.sideBtn} onPress={() => router.push("/teacher/classes")}>
                <Ionicons name="grid-outline" size={16} color="#EA580C" />
                <Text style={styles.sideBtnText}>Classes & Sections</Text>
              </TouchableOpacity>
            </View>

            {/* Motivational Banner */}
            <View style={[styles.sideCard, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF", borderColor: colors.border, marginTop: 10 }]}>
              <Ionicons name="sparkles" size={18} color="#D97706" />
              <Text style={[styles.sideQuote, { color: colors.text }]}>“Preparation meets opportunity.”</Text>
              <Text style={styles.sideQuoteSub}>
                Schedules updated here are immediately reflected for connected students and the Campusly AI assistant.
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ======================================================= */}
      {/* ADD / EDIT SCHEDULE MODAL */}
      {/* ======================================================= */}
      <Modal visible={modalOpen} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: isDark ? "#1E293B" : "#FFFFFF" }]}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.text }]}>
                  {editingItem ? "Edit Schedule Slot" : "Add New Schedule Slot"}
                </Text>
                <Text style={styles.modalSub}>
                  Configure class timetable details, timing and room
                </Text>
              </View>
              <TouchableOpacity onPress={() => setModalOpen(false)}>
                <Ionicons name="close" size={20} color="#64748B" />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 420 }} showsVerticalScrollIndicator={false}>
              {/* Day of Week Selector */}
              <Text style={styles.fieldLabel}>Day of Week</Text>
              <View style={styles.daySelectorRow}>
                {DAYS_OF_WEEK.map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={[styles.daySelectChip, formDay === d && styles.daySelectChipActive]}
                    onPress={() => setFormDay(d)}
                  >
                    <Text style={[styles.daySelectChipText, formDay === d && styles.daySelectChipTextActive]}>
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Subject Title */}
              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Subject Name</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
                value={formSubject}
                onChangeText={setFormSubject}
                placeholder="e.g. Data Structures & Algorithms"
                placeholderTextColor="#94A3B8"
              />
              {/* Quick Subject Suggestions */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                {STANDARD_SUBJECTS.map((sub) => (
                  <TouchableOpacity
                    key={sub}
                    style={styles.suggestionChip}
                    onPress={() => setFormSubject(sub)}
                  >
                    <Text style={styles.suggestionChipText}>{sub}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Timing Row */}
              <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Start Time</Text>
                  <TextInput
                    style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
                    value={formStartTime}
                    onChangeText={setFormStartTime}
                    placeholder="09:00 AM"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>End Time</Text>
                  <TextInput
                    style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
                    value={formEndTime}
                    onChangeText={setFormEndTime}
                    placeholder="10:00 AM"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              {/* Quick Timing Presets */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginTop: 4 }}>
                {PRESET_TIMES.map((slot) => (
                  <TouchableOpacity
                    key={slot.start}
                    style={styles.suggestionChip}
                    onPress={() => {
                      setFormStartTime(slot.start);
                      setFormEndTime(slot.end);
                    }}
                  >
                    <Text style={styles.suggestionChipText}>
                      {slot.start} - {slot.end}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Room & Faculty Row */}
              <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Classroom / Lab</Text>
                  <TextInput
                    style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
                    value={formRoom}
                    onChangeText={setFormRoom}
                    placeholder="Room 204 • 2nd Floor"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Faculty Name</Text>
                  <TextInput
                    style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
                    value={formFaculty}
                    onChangeText={setFormFaculty}
                    placeholder="Prof. Priya Sharma"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              {/* Department & Section */}
              <View style={{ flexDirection: "row", gap: 10, marginTop: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Department</Text>
                  <TextInput
                    style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
                    value={formDept}
                    onChangeText={setFormDept}
                    placeholder="CSE"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Section</Text>
                  <TextInput
                    style={[styles.modalInput, { color: colors.text, borderColor: colors.border }]}
                    value={formSection}
                    onChangeText={setFormSection}
                    placeholder="A"
                    placeholderTextColor="#94A3B8"
                  />
                </View>
              </View>

              {/* Theme Color Presets */}
              <Text style={[styles.fieldLabel, { marginTop: 12 }]}>Color Accent</Text>
              <View style={{ flexDirection: "row", gap: 8, marginTop: 4 }}>
                {COLOR_PRESETS.map((c) => (
                  <TouchableOpacity
                    key={c.color}
                    style={[
                      styles.colorDot,
                      { backgroundColor: c.color },
                      formColor === c.color && styles.colorDotSelected,
                    ]}
                    onPress={() => {
                      setFormColor(c.color);
                      setFormBg(c.bg);
                    }}
                  />
                ))}
              </View>
            </ScrollView>

            {/* Modal Actions */}
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setModalOpen(false)}
                disabled={submitting}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={handleSaveSchedule}
                disabled={submitting}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveText}>
                    {editingItem ? "Update Schedule" : "Create Schedule"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { padding: 4 },
  pageTitle: { fontSize: 16, fontWeight: "800" },
  pageSub: { fontSize: 11, color: "#64748B", marginTop: 1 },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#2563EB",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 7,
  },
  addBtnText: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },
  contentScroll: { flex: 1 },
  contentPadding: { padding: 14, paddingBottom: 35 },

  // Week card
  weekBarCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
  },
  weekHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    flexWrap: "wrap",
    gap: 8,
  },
  weekTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  liveIndicatorPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#ECFDF5",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },
  livePulseDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  liveIndicatorText: {
    fontSize: 10.5,
    fontWeight: "700",
    color: "#059669",
  },
  daysStrip: {
    flexDirection: "row",
    gap: 6,
  },
  dayTabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#F8FAFC",
  },
  dayTabItemSelected: {
    backgroundColor: "#2563EB",
  },
  dayTabItemToday: {
    borderWidth: 1.5,
    borderColor: "#2563EB",
  },
  dayTabText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#64748B",
  },
  dayTabTextSelected: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  dayDateNumber: {
    fontSize: 13,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
  dayDateNumberSelected: {
    color: "#FFFFFF",
  },
  dayClassDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#2563EB",
    marginTop: 4,
  },

  // Main schedule layout
  scheduleLayout: {
    flexDirection: "row",
    gap: 14,
  },
  scheduleLayoutStacked: {
    flexDirection: "column",
  },
  dayHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderBottomWidth: 1,
    paddingBottom: 8,
  },
  selectedDayTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  countBadge: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },
  addNewSlotBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 2,
  },
  addNewSlotText: {
    fontSize: 11.5,
    fontWeight: "700",
    color: "#2563EB",
  },

  // Class card
  classCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    borderLeftWidth: 4,
    padding: 12,
  },
  ongoingClassGlow: {
    borderWidth: 1.5,
    borderColor: "#10B981",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 3,
  },
  classTimeCol: {
    alignItems: "center",
    minWidth: 70,
  },
  classTimeStart: {
    fontSize: 11.5,
    fontWeight: "800",
  },
  classTimeDivider: {
    fontSize: 10,
    color: "#94A3B8",
    marginVertical: 1,
  },
  classTimeEnd: {
    fontSize: 11,
    color: "#64748B",
  },
  classSubjectTitle: {
    fontSize: 13.5,
    fontWeight: "800",
  },
  codeTag: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  codeTagText: {
    fontSize: 9.5,
    fontWeight: "700",
    color: "#475569",
  },
  classMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 4,
    gap: 4,
  },
  classMetaText: {
    fontSize: 10.5,
    color: "#64748B",
  },
  metaDot: {
    color: "#CBD5E1",
    fontSize: 10,
  },
  classRightActions: {
    alignItems: "flex-end",
  },
  statusOngoingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#ECFDF5",
    borderWidth: 1,
    borderColor: "#A7F3D0",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  ongoingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#10B981",
  },
  statusOngoingText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#059669",
  },
  statusUpcomingBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusUpcomingText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2563EB",
  },
  statusCompletedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  statusCompletedText: {
    fontSize: 10,
    color: "#64748B",
  },
  actionIconBtn: {
    padding: 5,
    borderRadius: 5,
    backgroundColor: "#EFF6FF",
  },

  // Sidebar widgets
  scheduleSideWidgets: {
    flex: 1,
    minWidth: 220,
  },
  sideCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
  },
  sideCardTitle: {
    fontSize: 12.5,
    fontWeight: "800",
    marginBottom: 8,
  },
  statRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  statLabel: {
    fontSize: 11,
    color: "#64748B",
  },
  statValue: {
    fontSize: 12,
    fontWeight: "800",
  },
  sideBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  sideBtnText: {
    fontSize: 11.5,
    fontWeight: "600",
    color: "#334155",
  },
  sideQuote: {
    fontSize: 11.5,
    fontWeight: "800",
    marginTop: 4,
  },
  sideQuoteSub: {
    fontSize: 10,
    color: "#64748B",
    marginTop: 2,
    lineHeight: 14,
  },

  // Empty state
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 30,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
  },
  emptyTitle: {
    fontSize: 14,
    fontWeight: "800",
    marginTop: 10,
  },
  emptySubtitle: {
    fontSize: 11,
    color: "#64748B",
    textAlign: "center",
    marginTop: 4,
    marginBottom: 14,
    maxWidth: 280,
  },

  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalCard: {
    width: "100%",
    maxWidth: 480,
    borderRadius: 14,
    padding: 16,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingBottom: 8,
  },
  modalTitle: {
    fontSize: 15,
    fontWeight: "800",
  },
  modalSub: {
    fontSize: 10.5,
    color: "#64748B",
    marginTop: 1,
  },
  fieldLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: "#475569",
    marginBottom: 4,
  },
  modalInput: {
    borderWidth: 1,
    borderRadius: 7,
    paddingHorizontal: 10,
    height: 36,
    fontSize: 12,
  },
  daySelectorRow: {
    flexDirection: "row",
    gap: 5,
  },
  daySelectChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
  },
  daySelectChipActive: {
    backgroundColor: "#2563EB",
  },
  daySelectChipText: {
    fontSize: 10.5,
    fontWeight: "600",
    color: "#475569",
  },
  daySelectChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  suggestionChip: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 5,
    marginRight: 6,
  },
  suggestionChipText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#2563EB",
  },
  colorDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  colorDotSelected: {
    borderWidth: 2,
    borderColor: "#0F172A",
  },
  modalActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
    paddingTop: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 6,
  },
  modalCancelText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  modalSaveBtn: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 6,
  },
  modalSaveText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
