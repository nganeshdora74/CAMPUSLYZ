import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
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
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { auth, db } from "../../firebase/config";
import { useAppTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";
import { useSubjects } from "../../hooks/useSubjects";
import { ClockTimePicker } from "../../components/ClockTimePicker";

type TaskFilter = "All" | "To Do" | "In Progress" | "Completed";

const TASK_TIME_PRESETS = [
  { label: "09:00 - 10:00 AM", start: "09:00 AM", end: "10:00 AM" },
  { label: "10:15 - 11:15 AM", start: "10:15 AM", end: "11:15 AM" },
  { label: "11:30 - 01:00 PM", start: "11:30 AM", end: "01:00 PM" },
  { label: "02:00 - 03:30 PM", start: "02:00 PM", end: "03:30 PM" },
  { label: "04:00 - 05:30 PM", start: "04:00 PM", end: "05:30 PM" },
  { label: "07:00 - 08:30 PM", start: "07:00 PM", end: "08:30 PM" },
];

type TaskItem = {
  id: string;
  subject: string;
  description: string;
  dueTime: string;
  startTime?: string;
  endTime?: string;
  priority: "High" | "Medium" | "Low";
  completedCount: number;
  totalCount: number;
  completed: boolean;
  status: "To Do" | "In Progress" | "Completed";
  icon: keyof typeof Ionicons.glyphMap;
  iconBg: string;
  iconColor: string;
};

const DEFAULT_TASKS: TaskItem[] = [
  {
    id: "t1",
    subject: "Data Structures",
    description: "Complete array and linked list practice questions",
    dueTime: "Today, 11:00 AM",
    priority: "High",
    completedCount: 3,
    totalCount: 5,
    completed: false,
    status: "In Progress",
    icon: "code-slash",
    iconBg: "#EDE9FE",
    iconColor: "#7C3AED",
  },
  {
    id: "t2",
    subject: "Operating Systems",
    description: "Read Chapter 4 on Process Scheduling",
    dueTime: "Today, 02:00 PM",
    priority: "Medium",
    completedCount: 0,
    totalCount: 1,
    completed: false,
    status: "To Do",
    icon: "settings",
    iconBg: "#E0F2FE",
    iconColor: "#0284C7",
  },
  {
    id: "t3",
    subject: "DBMS",
    description: "Submit SQL queries assignment",
    dueTime: "Today, 05:00 PM",
    priority: "High",
    completedCount: 1,
    totalCount: 1,
    completed: false,
    status: "To Do",
    icon: "server",
    iconBg: "#E0F2FE",
    iconColor: "#0284C7",
  },
  {
    id: "t4",
    subject: "Computer Networks",
    description: "Revise network topologies",
    dueTime: "Tomorrow, 04:00 PM",
    priority: "Low",
    completedCount: 0,
    totalCount: 1,
    completed: false,
    status: "To Do",
    icon: "git-network",
    iconBg: "#CFFAFE",
    iconColor: "#0891B2",
  },
  {
    id: "t5",
    subject: "English Communication",
    description: "Write essay draft",
    dueTime: "Sep 25, 11:00 AM",
    priority: "Medium",
    completedCount: 1,
    totalCount: 1,
    completed: true,
    status: "Completed",
    icon: "book",
    iconBg: "#EDE9FE",
    iconColor: "#7C3AED",
  },
  {
    id: "t6",
    subject: "AI & ML",
    description: "Complete lab assignment",
    dueTime: "Sep 26, 03:00 PM",
    priority: "High",
    completedCount: 0,
    totalCount: 1,
    completed: false,
    status: "To Do",
    icon: "flask",
    iconBg: "#EDE9FE",
    iconColor: "#6366F1",
  },
];

export default function TasksScreen() {
  const { colors, isDark } = useAppTheme();
  const { t } = useLanguage();
  const { subjects } = useSubjects();

  const [userInitial, setUserInitial] = useState("S");
  const [activeFilter, setActiveFilter] = useState<TaskFilter>("All");
  const [taskList, setTaskList] = useState<TaskItem[]>(DEFAULT_TASKS);

  // Add Task Modal
  const [addModalVisible, setAddModalVisible] = useState(false);
  const [newTaskSubject, setNewTaskSubject] = useState("");
  const [newTaskDesc, setNewTaskDesc] = useState("");
  const [newTaskStartTime, setNewTaskStartTime] = useState("09:00 AM");
  const [newTaskEndTime, setNewTaskEndTime] = useState("10:30 AM");
  const [newTaskPriority, setNewTaskPriority] = useState<"High" | "Medium" | "Low">("Medium");
  const [newTaskSubtasks, setNewTaskSubtasks] = useState("1");
  const [saving, setSaving] = useState(false);

  // Time Picker Modal
  const [clockPickerVisible, setClockPickerVisible] = useState(false);
  const [clockPickerTarget, setClockPickerTarget] = useState<"start" | "end">("start");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("All");

  // Load user
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const userRef = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(
      userRef,
      (snap) => {
        if (!snap.exists()) return;
        const data = snap.data();
        const rawName = data.fullName || data.name || user.displayName || "Student";
        setUserInitial(rawName.trim().charAt(0).toUpperCase() || "S");
      },
      (err) => console.log("User task err:", err.message)
    );

    return unsubscribe;
  }, []);

  // Load tasks from Firestore
  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;

    const tasksRef = collection(db, "users", user.uid, "tasks");
    const q = query(tasksRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(
      q,
      (snap) => {
        if (snap.empty) {
          const seedStarterTasks = async () => {
            try {
              for (const item of DEFAULT_TASKS) {
                await addDoc(tasksRef, {
                  subject: item.subject,
                  title: item.description,
                  description: item.description,
                  dueTime: item.dueTime,
                  priority: item.priority,
                  totalCount: item.totalCount,
                  completedCount: item.completedCount,
                  completed: item.completed,
                  status: item.status,
                  createdAt: serverTimestamp(),
                });
              }
            } catch (seedErr) {
              console.warn("Seeding starter tasks failed:", seedErr);
            }
          };
          seedStarterTasks();
          return;
        }

        const loaded: TaskItem[] = snap.docs.map((d, index) => {
          const data = d.data();
          const defaultIcons = [
            { icon: "code-slash" as const, bg: "#EDE9FE", color: "#7C3AED" },
            { icon: "server" as const, bg: "#E0F2FE", color: "#0284C7" },
            { icon: "settings" as const, bg: "#E0F2FE", color: "#0284C7" },
            { icon: "git-network" as const, bg: "#CFFAFE", color: "#0891B2" },
            { icon: "book" as const, bg: "#EDE9FE", color: "#7C3AED" },
            { icon: "flask" as const, bg: "#EDE9FE", color: "#6366F1" },
          ];
          const iconPair = defaultIcons[index % defaultIcons.length];

          const isCompleted = data.completed === true || data.status === "Completed";
          let st: "To Do" | "In Progress" | "Completed" = "To Do";
          if (isCompleted) st = "Completed";
          else if (data.status === "In Progress") st = "In Progress";

          const sTime = data.startTime || (typeof data.dueTime === "string" && data.dueTime.includes("–") ? data.dueTime.split("–")[0].trim() : "");
          const eTime = data.endTime || (typeof data.dueTime === "string" && data.dueTime.includes("–") ? data.dueTime.split("–")[1].trim() : "");
          const formattedDue = (sTime && eTime) ? `${sTime} – ${eTime}` : (data.dueTime || data.timeRange || "Today, 11:00 AM");

          return {
            id: d.id,
            subject: data.subject || "Subject Task",
            description: data.title || data.description || "Task details",
            startTime: sTime,
            endTime: eTime,
            dueTime: formattedDue,
            priority: (data.priority as "High" | "Medium" | "Low") || "Medium",
            completedCount: isCompleted ? (data.totalCount || 1) : (data.completedCount || 0),
            totalCount: data.totalCount || 1,
            completed: isCompleted,
            status: st,
            icon: iconPair.icon,
            iconBg: iconPair.bg,
            iconColor: iconPair.color,
          };
        });

        setTaskList(loaded);
      },
      (err) => console.log("Tasks listener err:", err.message)
    );

    return unsubscribe;
  }, []);

  // Toggle complete
  const toggleTask = async (task: TaskItem) => {
    const user = auth.currentUser;
    const newCompleted = !task.completed;

    setTaskList((prev) =>
      prev.map((t) => {
        if (t.id === task.id) {
          return {
            ...t,
            completed: newCompleted,
            status: newCompleted ? "Completed" : "To Do",
            completedCount: newCompleted ? t.totalCount : 0,
          };
        }
        return t;
      })
    );

    if (user) {
      try {
        await updateDoc(doc(db, "users", user.uid, "tasks", task.id), {
          completed: newCompleted,
          status: newCompleted ? "Completed" : "To Do",
          completedCount: newCompleted ? task.totalCount : 0,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        console.warn("Update task error:", err);
      }
    }
  };

  // Cross-platform confirmation (handles both Web window.confirm and Native Alert.alert)
  const confirmAction = (title: string, message: string, onConfirm: () => void) => {
    if (Platform.OS === "web") {
      const confirmed =
        typeof window !== "undefined" && typeof window.confirm === "function"
          ? window.confirm(`${title}\n\n${message}`)
          : true;
      if (confirmed) {
        onConfirm();
      }
    } else {
      Alert.alert(title, message, [
        { text: t("cancel", "Cancel"), style: "cancel" },
        { text: t("delete", "Delete"), style: "destructive", onPress: onConfirm },
      ]);
    }
  };

  // Delete / Remove Task
  const handleDeleteTask = (task: TaskItem) => {
    const user = auth.currentUser;
    if (!user) return;

    confirmAction(
      t("delete", "Delete Task"),
      `${t("delete", "Delete")} "${task.description}" (${task.subject})?`,
      async () => {
        setTaskList((prev) => prev.filter((item) => item.id !== task.id));
        try {
          await deleteDoc(doc(db, "users", user.uid, "tasks", task.id));
          if (Platform.OS === "web") {
            window.alert("Task deleted successfully.");
          }
        } catch (err: any) {
          if (Platform.OS === "web") {
            window.alert(err?.message || "Could not delete task.");
          } else {
            Alert.alert(t("error", "Error"), err?.message || "Could not delete task.");
          }
        }
      }
    );
  };

  // Delete all tasks for a specific subject
  const handleDeleteSubjectTasks = (subjectName: string) => {
    const user = auth.currentUser;
    if (!user) return;

    confirmAction(
      "Delete Subject Tasks",
      `Are you sure you want to delete all tasks under "${subjectName}"?`,
      async () => {
        try {
          const toDelete = taskList.filter(
            (t) => t.subject.toLowerCase() === subjectName.toLowerCase()
          );
          setTaskList((prev) =>
            prev.filter((t) => t.subject.toLowerCase() !== subjectName.toLowerCase())
          );
          for (const item of toDelete) {
            await deleteDoc(doc(db, "users", user.uid, "tasks", item.id));
          }
          if (selectedSubjectFilter.toLowerCase() === subjectName.toLowerCase()) {
            setSelectedSubjectFilter("All");
          }
          if (Platform.OS === "web") {
            window.alert(`All tasks under "${subjectName}" have been deleted.`);
          } else {
            Alert.alert("Deleted", `All tasks under "${subjectName}" have been deleted.`);
          }
        } catch (err: any) {
          if (Platform.OS === "web") {
            window.alert(err?.message || "Failed to delete tasks.");
          } else {
            Alert.alert(t("error", "Error"), err?.message || "Failed to delete tasks.");
          }
        }
      }
    );
  };

  // Add Task handler
  const handleAddTask = async () => {
    const user = auth.currentUser;
    if (!user) {
      Alert.alert(t("error", "Error"), "Please log in to add a task.");
      return;
    }

    if (!newTaskSubject.trim() || !newTaskDesc.trim()) {
      Alert.alert(t("error", "Validation"), "Please enter both subject name and task description.");
      return;
    }

    try {
      setSaving(true);
      const subtasks = Number(newTaskSubtasks) || 1;
      const sTime = newTaskStartTime.trim() || "09:00 AM";
      const eTime = newTaskEndTime.trim() || "10:30 AM";
      const formattedTimeRange = `${sTime} – ${eTime}`;

      await addDoc(collection(db, "users", user.uid, "tasks"), {
        subject: newTaskSubject.trim(),
        title: newTaskDesc.trim(),
        description: newTaskDesc.trim(),
        startTime: sTime,
        endTime: eTime,
        timeRange: formattedTimeRange,
        dueTime: formattedTimeRange,
        priority: newTaskPriority,
        totalCount: subtasks,
        completedCount: 0,
        completed: false,
        status: "To Do",
        createdAt: serverTimestamp(),
      });

      setNewTaskSubject("");
      setNewTaskDesc("");
      setNewTaskStartTime("09:00 AM");
      setNewTaskEndTime("10:30 AM");
      setAddModalVisible(false);

      if (Platform.OS === "web") {
        window.alert("Task created successfully!");
      } else {
        Alert.alert(t("success", "Success"), "Task created successfully!");
      }
    } catch (err: any) {
      if (Platform.OS === "web") {
        window.alert(err?.message || "Failed to create task.");
      } else {
        Alert.alert(t("error", "Error"), err?.message || "Failed to create task.");
      }
    } finally {
      setSaving(false);
    }
  };

  // Unique subjects found in tasks
  const uniqueSubjectsInTasks = useMemo(() => {
    const set = new Set<string>();
    taskList.forEach((t) => {
      if (t.subject) set.add(t.subject.trim());
    });
    return Array.from(set);
  }, [taskList]);

  // Filter tasks by status and subject
  const filteredTasks = useMemo(() => {
    let list = taskList;
    if (activeFilter !== "All") {
      list = list.filter((t) => t.status === activeFilter);
    }
    if (selectedSubjectFilter !== "All") {
      list = list.filter(
        (t) => t.subject.toLowerCase() === selectedSubjectFilter.toLowerCase()
      );
    }
    return list;
  }, [activeFilter, selectedSubjectFilter, taskList]);

  const getPriorityStyle = (priority: "High" | "Medium" | "Low") => {
    switch (priority) {
      case "High":
        return { bg: "#FEE2E2", text: "#EF4444" };
      case "Medium":
        return { bg: "#FEF3C7", text: "#D97706" };
      case "Low":
      default:
        return { bg: "#DCFCE7", text: "#16A34A" };
    }
  };

  return (
    <SafeAreaView edges={["top"]} style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* ================================================== */}
      {/* TOP HEADER */}
      {/* ================================================== */}
      <View style={[styles.header, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        <View style={styles.headerBrandCol}>
          <View style={styles.logoRow}>
            <View style={styles.logoCircle}>
              <Ionicons name="school" size={22} color={colors.primary} />
            </View>
            <Text style={[styles.brandTitle, { color: colors.text }]}>Campusly</Text>
          </View>
          <Text style={[styles.brandTagline, { color: colors.textSecondary }]}>Learn. Connect. Grow.</Text>
        </View>

        <TouchableOpacity
          style={[styles.profileButton, { backgroundColor: colors.surface, borderColor: colors.border }]}
          activeOpacity={0.7}
          onPress={() => router.push("/(tab)/profile")}
        >
          <View style={[styles.avatarCircle, { backgroundColor: colors.primary }]}>
            <Text style={styles.avatarLetter}>{userInitial}</Text>
          </View>
          <Ionicons name="chevron-down" size={13} color={colors.textSecondary} style={{ marginLeft: 4 }} />
        </TouchableOpacity>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ================================================== */}
        {/* HERO BANNER: STAY PRODUCTIVE */}
        {/* ================================================== */}
        <View style={styles.heroBanner}>
          <View style={styles.heroLeftCol}>
            <Text style={styles.heroTag}>{t("stayProductive", "STAY PRODUCTIVE 🛡️")}</Text>
            <Text style={styles.heroTitle}>{t("tasks", "My Tasks")}</Text>
            <Text style={styles.heroSubtitle}>
              {t("neverMissDeadline", "Plan today, achieve tomorrow!")}
            </Text>
          </View>

          {/* Right Vector Illustration */}
          <View style={styles.heroIllustration}>
            <View style={styles.clipboardCard}>
              <View style={styles.clipTop} />
              <View style={styles.clipLineRow}>
                <Ionicons name="checkmark" size={12} color="#6366F1" />
                <View style={[styles.clipLine, { width: 34 }]} />
              </View>
              <View style={styles.clipLineRow}>
                <Ionicons name="checkmark" size={12} color="#6366F1" />
                <View style={[styles.clipLine, { width: 28 }]} />
              </View>
              <View style={styles.clipLineRow}>
                <Ionicons name="checkmark" size={12} color="#6366F1" />
                <View style={[styles.clipLine, { width: 32 }]} />
              </View>
            </View>
            <View style={styles.pencilGraphic}>
              <Ionicons name="pencil" size={16} color="#FBBF24" />
            </View>
          </View>
        </View>

        {/* ================================================== */}
        {/* FILTER PILLS ROW */}
        {/* ================================================== */}
        <View style={styles.filterRow}>
          {(["All", "To Do", "In Progress", "Completed"] as TaskFilter[]).map((f) => {
            const isActive = activeFilter === f;
            const filterLabel =
              f === "All"
                ? t("all", "All")
                : f === "To Do"
                ? t("toDo", "To Do")
                : f === "In Progress"
                ? t("inProgress", "In Progress")
                : t("completed", "Completed");

            return (
              <TouchableOpacity
                key={f}
                style={[
                  styles.filterPill,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  isActive && { backgroundColor: colors.primary, borderColor: colors.primary },
                ]}
                activeOpacity={0.8}
                onPress={() => setActiveFilter(f)}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: colors.textSecondary },
                    isActive && { color: "#FFFFFF", fontWeight: "700" },
                  ]}
                >
                  {filterLabel}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* ================================================== */}
        {/* SUBJECT FILTER ROW WITH DELETE SUBJECT ACTION */}
        {/* ================================================== */}
        <View style={{ marginBottom: 14, paddingHorizontal: 20 }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <Text style={{ fontSize: 12, fontWeight: "700", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 0.5 }}>
              Subject:
            </Text>
            {selectedSubjectFilter !== "All" && (
              <TouchableOpacity
                onPress={() => handleDeleteSubjectTasks(selectedSubjectFilter)}
                style={{ flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: isDark ? "rgba(239,68,68,0.2)" : "#FEE2E2", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}
              >
                <Ionicons name="trash-outline" size={12} color="#EF4444" />
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#EF4444" }}>
                  Delete "{selectedSubjectFilter}"
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
            <TouchableOpacity
              style={[
                styles.filterPill,
                { backgroundColor: colors.card, borderColor: colors.border },
                selectedSubjectFilter === "All" && { backgroundColor: colors.primary, borderColor: colors.primary },
              ]}
              onPress={() => setSelectedSubjectFilter("All")}
            >
              <Text
                style={[
                  styles.filterText,
                  { color: colors.textSecondary },
                  selectedSubjectFilter === "All" && { color: "#FFFFFF", fontWeight: "700" },
                ]}
              >
                All Subjects ({taskList.length})
              </Text>
            </TouchableOpacity>

            {uniqueSubjectsInTasks.map((subName) => {
              const count = taskList.filter((t) => t.subject.toLowerCase() === subName.toLowerCase()).length;
              const isSelected = selectedSubjectFilter.toLowerCase() === subName.toLowerCase();
              return (
                <TouchableOpacity
                  key={subName}
                  style={[
                    styles.filterPill,
                    { backgroundColor: colors.card, borderColor: colors.border },
                    isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                  ]}
                  onPress={() => setSelectedSubjectFilter(subName)}
                >
                  <Text
                    style={[
                      styles.filterText,
                      { color: colors.textSecondary },
                      isSelected && { color: "#FFFFFF", fontWeight: "700" },
                    ]}
                  >
                    {subName} ({count})
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ================================================== */}
        {/* TASK CARDS STREAM */}
        {/* ================================================== */}
        <View style={styles.tasksContainer}>
          {filteredTasks.length === 0 ? (
            <View style={[styles.emptyCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Ionicons name="checkbox-outline" size={38} color={colors.textMuted} />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                {t("tasksDone", "No tasks in this category")}
              </Text>
            </View>
          ) : (
            filteredTasks.map((task) => {
              const priorityBadge = getPriorityStyle(task.priority);
              const percentage =
                task.totalCount > 0 ? Math.round((task.completedCount / task.totalCount) * 100) : 0;

              return (
                <View
                  key={task.id}
                  style={[
                    styles.taskCard,
                    { backgroundColor: colors.card, borderColor: colors.border },
                  ]}
                >
                  {/* Top Row: Checkbox, Icon, Subject Name Badge, Delete */}
                  <View style={styles.taskTopRow}>
                    <TouchableOpacity
                      style={[
                        styles.checkbox,
                        { borderColor: colors.border },
                        task.completed && { backgroundColor: "#10B981", borderColor: "#10B981" },
                      ]}
                      activeOpacity={0.7}
                      onPress={() => toggleTask(task)}
                    >
                      {task.completed && <Ionicons name="checkmark" size={13} color="#FFFFFF" />}
                    </TouchableOpacity>

                    <View style={[styles.taskIconBox, { backgroundColor: task.iconBg }]}>
                      <Ionicons name={task.icon} size={15} color={task.iconColor} />
                    </View>

                    <View style={{ flex: 1, flexDirection: "row", alignItems: "center", marginRight: 8 }}>
                      <View style={{ backgroundColor: isDark ? "rgba(99,102,241,0.25)" : "#EEF2FF", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                        <Text style={{ fontSize: 11.5, fontWeight: "800", color: "#4F46E5" }} numberOfLines={1}>
                          {task.subject}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={{ padding: 6, borderRadius: 6, backgroundColor: isDark ? "rgba(239,68,68,0.2)" : "#FEE2E2" }}
                      onPress={() => handleDeleteTask(task)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Ionicons name="trash-outline" size={15} color="#EF4444" />
                    </TouchableOpacity>
                  </View>

                  {/* Middle: Description */}
                  <Text
                    style={[
                      styles.taskDescText,
                      { color: colors.text },
                      task.completed && styles.taskDescCompleted,
                    ]}
                  >
                    {task.description}
                  </Text>

                  {/* Timing Row: Starting Time – End Time */}
                  <View style={styles.taskMetaRow}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 5, backgroundColor: isDark ? "rgba(56,189,248,0.12)" : "#E0F2FE", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 }}>
                      <Ionicons name="time-outline" size={13} color="#0284C7" />
                      <Text style={{ fontSize: 11.5, fontWeight: "700", color: "#0284C7" }}>
                        {task.startTime && task.endTime
                          ? `${task.startTime} – ${task.endTime}`
                          : task.dueTime}
                      </Text>
                    </View>

                    <View style={[styles.priorityPill, { backgroundColor: priorityBadge.bg }]}>
                      <Text style={[styles.priorityPillText, { color: priorityBadge.text }]}>
                        ● {task.priority}
                      </Text>
                    </View>
                  </View>

                  {/* Progress Bar Row */}
                  <View style={styles.progressRow}>
                    <View style={[styles.progressBarTrack, { backgroundColor: colors.surface }]}>
                      <View
                        style={[
                          styles.progressBarFill,
                          {
                            width: `${percentage}%`,
                            backgroundColor: task.completed ? "#10B981" : colors.primary,
                          },
                        ]}
                      />
                    </View>

                    <Text style={[styles.ratioText, { color: colors.textSecondary }]}>
                      {task.completedCount}/{task.totalCount}
                    </Text>
                    <Text style={[styles.percentText, { color: colors.text }]}>{percentage}%</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* ================================================== */}
        {/* + ADD TASK BUTTON */}
        {/* ================================================== */}
        <View style={styles.actionBtnContainer}>
          <TouchableOpacity
            style={[styles.addTaskButton, { backgroundColor: colors.primary }]}
            activeOpacity={0.85}
            onPress={() => {
              if (subjects.length > 0 && !newTaskSubject) {
                setNewTaskSubject(subjects[0].name);
              }
              setAddModalVisible(true);
            }}
          >
            <Ionicons name="add" size={19} color="#FFFFFF" style={{ marginRight: 6 }} />
            <Text style={styles.addTaskButtonText}>{t("addTask", "Add Task")}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ================================================== */}
      {/* ADD TASK MODAL */}
      {/* ================================================== */}
      <Modal
        visible={addModalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setAddModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={[styles.modalOverlay, { backgroundColor: colors.modalOverlay }]}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                {t("addTask", "Create New Task")}
              </Text>
              <TouchableOpacity onPress={() => setAddModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              {/* SUBJECT-WIDE SELECTION */}
              <Text style={[styles.inputLabel, { color: colors.text }]}>
                {t("subject", "Select Subject")}
              </Text>

              {subjects.length > 0 && (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.subjectPillsRow}>
                  {subjects.map((sub) => {
                    const isSelected = newTaskSubject === sub.name;
                    return (
                      <TouchableOpacity
                        key={sub.id}
                        style={[
                          styles.subjectPill,
                          { backgroundColor: colors.surface, borderColor: colors.border },
                          isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                        ]}
                        onPress={() => setNewTaskSubject(sub.name)}
                      >
                        <Text
                          style={[
                            styles.subjectPillText,
                            { color: colors.text },
                            isSelected && { color: "#FFFFFF", fontWeight: "700" },
                          ]}
                        >
                          {sub.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              )}

              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    color: colors.text,
                  },
                ]}
                value={newTaskSubject}
                onChangeText={setNewTaskSubject}
                placeholder="Or type custom subject..."
                placeholderTextColor={colors.textMuted}
              />

              <Text style={[styles.inputLabel, { color: colors.text }]}>
                {t("tasks", "Task Description")}
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    color: colors.text,
                  },
                ]}
                value={newTaskDesc}
                onChangeText={setNewTaskDesc}
                placeholder="e.g. Practice array and tree problems"
                placeholderTextColor={colors.textMuted}
              />

              {/* STARTING TIME */}
              <View style={styles.labelWithClockRow}>
                <Text style={[styles.inputLabel, { color: colors.text, marginBottom: 0 }]}>
                  Starting Time *
                </Text>
                <TouchableOpacity
                  style={[styles.clockBtn, { backgroundColor: colors.primaryLight }]}
                  onPress={() => {
                    setClockPickerTarget("start");
                    setClockPickerVisible(true);
                  }}
                >
                  <Ionicons name="time" size={14} color={colors.primary} />
                  <Text style={[styles.clockBtnText, { color: colors.primary }]}>Pick Start Time</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    color: colors.text,
                  },
                ]}
                value={newTaskStartTime}
                onChangeText={setNewTaskStartTime}
                placeholder="e.g. 09:00 AM"
                placeholderTextColor={colors.textMuted}
              />

              {/* END TIME */}
              <View style={styles.labelWithClockRow}>
                <Text style={[styles.inputLabel, { color: colors.text, marginBottom: 0 }]}>
                  End Time *
                </Text>
                <TouchableOpacity
                  style={[styles.clockBtn, { backgroundColor: colors.primaryLight }]}
                  onPress={() => {
                    setClockPickerTarget("end");
                    setClockPickerVisible(true);
                  }}
                >
                  <Ionicons name="time" size={14} color={colors.primary} />
                  <Text style={[styles.clockBtnText, { color: colors.primary }]}>Pick End Time</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    color: colors.text,
                  },
                ]}
                value={newTaskEndTime}
                onChangeText={setNewTaskEndTime}
                placeholder="e.g. 10:30 AM"
                placeholderTextColor={colors.textMuted}
              />

              {/* QUICK TIME PRESETS */}
              <Text style={[styles.inputLabel, { color: colors.text, marginTop: 4 }]}>
                Quick Time Presets:
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
                {TASK_TIME_PRESETS.map((preset) => {
                  const isSelected =
                    newTaskStartTime === preset.start && newTaskEndTime === preset.end;
                  return (
                    <TouchableOpacity
                      key={preset.label}
                      style={[
                        styles.subjectPill,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                        isSelected && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                      onPress={() => {
                        setNewTaskStartTime(preset.start);
                        setNewTaskEndTime(preset.end);
                      }}
                    >
                      <Text
                        style={[
                          styles.subjectPillText,
                          { color: colors.text },
                          isSelected && { color: "#FFFFFF", fontWeight: "700" },
                        ]}
                      >
                        {preset.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={[styles.inputLabel, { color: colors.text }]}>
                {t("priority", "Priority")}
              </Text>
              <View style={styles.prioritySelectorRow}>
                {(["Low", "Medium", "High"] as const).map((p) => {
                  const isSel = newTaskPriority === p;
                  return (
                    <TouchableOpacity
                      key={p}
                      style={[
                        styles.priorityOpt,
                        { backgroundColor: colors.surface, borderColor: colors.border },
                        isSel && { backgroundColor: colors.primary, borderColor: colors.primary },
                      ]}
                      onPress={() => setNewTaskPriority(p)}
                    >
                      <Text
                        style={[
                          styles.priorityOptText,
                          { color: colors.textSecondary },
                          isSel && { color: "#FFFFFF", fontWeight: "700" },
                        ]}
                      >
                        {p}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={[styles.inputLabel, { color: colors.text }]}>
                {t("subtasks", "Subtasks Count")}
              </Text>
              <TextInput
                style={[
                  styles.textInput,
                  {
                    backgroundColor: colors.inputBg,
                    borderColor: colors.inputBorder,
                    color: colors.text,
                  },
                ]}
                value={newTaskSubtasks}
                onChangeText={setNewTaskSubtasks}
                placeholder="e.g. 5"
                placeholderTextColor={colors.textMuted}
                keyboardType="numeric"
              />

              <View style={{ height: 16 }} />
            </ScrollView>

            <View style={styles.modalButtonsRow}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.surface, borderColor: colors.border }]}
                onPress={() => setAddModalVisible(false)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>
                  {t("cancel", "Cancel")}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.saveBtn, { backgroundColor: colors.primary }]}
                onPress={handleAddTask}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.saveBtnText}>{t("save", "Save Task")}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* CLOCK TIME PICKER MODAL */}
      <ClockTimePicker
        visible={clockPickerVisible}
        title={clockPickerTarget === "start" ? "Set Starting Time" : "Set End Time"}
        initialTime={clockPickerTarget === "start" ? newTaskStartTime : newTaskEndTime}
        onConfirm={(formattedTime) => {
          setClockPickerVisible(false);
          if (clockPickerTarget === "start") {
            setNewTaskStartTime(formattedTime);
          } else {
            setNewTaskEndTime(formattedTime);
          }
        }}
        onCancel={() => setClockPickerVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 90,
  },

  /* HEADER */
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  headerBrandCol: {
    flexDirection: "column",
  },
  logoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  logoCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "#EEF2FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  brandTitle: {
    fontSize: 19,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  brandTagline: {
    fontSize: 11,
    marginTop: 2,
  },
  profileButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 20,
    borderWidth: 1,
  },
  avatarCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarLetter: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  /* HERO BANNER */
  heroBanner: {
    marginHorizontal: 12,
    marginTop: 8,
    borderRadius: 16,
    backgroundColor: "#3B1B82",
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    overflow: "hidden",
  },
  heroLeftCol: {
    flex: 1,
  },
  heroTag: {
    color: "#A78BFA",
    fontSize: 9.5,
    fontWeight: "800",
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    marginBottom: 4,
  },
  heroSubtitle: {
    color: "#DDD6FE",
    fontSize: 11,
    lineHeight: 15,
    fontWeight: "500",
  },
  heroIllustration: {
    width: 60,
    height: 60,
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
  },
  clipboardCard: {
    width: 44,
    height: 54,
    backgroundColor: "#FFFFFF",
    borderRadius: 6,
    padding: 6,
    paddingTop: 10,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  clipTop: {
    position: "absolute",
    top: 2,
    alignSelf: "center",
    width: 16,
    height: 5,
    backgroundColor: "#6366F1",
    borderRadius: 2,
  },
  clipLineRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  clipLine: {
    height: 3,
    backgroundColor: "#E2E8F0",
    borderRadius: 1.5,
    marginLeft: 3,
  },
  pencilGraphic: {
    position: "absolute",
    bottom: 2,
    right: 0,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 3,
    elevation: 2,
  },

  /* FILTER ROW */
  filterRow: {
    flexDirection: "row",
    paddingHorizontal: 12,
    marginTop: 10,
    marginBottom: 8,
    gap: 6,
  },
  filterPill: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    borderWidth: 1,
  },
  filterText: {
    fontSize: 11,
    fontWeight: "600",
  },

  /* TASK CARDS */
  tasksContainer: {
    paddingHorizontal: 12,
    gap: 8,
  },
  emptyCard: {
    padding: 20,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  emptyText: {
    fontSize: 12.5,
    marginTop: 6,
    fontWeight: "500",
  },
  taskCard: {
    borderRadius: 12,
    padding: 10,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  taskTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    marginRight: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  taskIconBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 8,
  },
  taskSubjectText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
  },
  taskDescText: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    marginBottom: 8,
    marginLeft: 26,
  },
  taskDescCompleted: {
    textDecorationLine: "line-through",
    opacity: 0.6,
  },
  taskMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
    marginLeft: 26,
  },
  dueRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  dueText: {
    fontSize: 10,
    marginLeft: 4,
    fontWeight: "500",
  },
  priorityPill: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  priorityPillText: {
    fontSize: 10,
    fontWeight: "700",
  },
  progressRow: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 26,
    gap: 6,
  },
  progressBarTrack: {
    flex: 1,
    height: 5,
    borderRadius: 2.5,
    overflow: "hidden",
  },
  progressBarFill: {
    height: 5,
    borderRadius: 2.5,
  },
  ratioText: {
    fontSize: 10,
    fontWeight: "500",
  },
  percentText: {
    fontSize: 10,
    fontWeight: "700",
  },

  /* ADD TASK BUTTON */
  actionBtnContainer: {
    paddingHorizontal: 12,
    marginTop: 14,
  },
  addTaskButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 40,
    borderRadius: 10,
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  addTaskButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },

  /* MODAL */
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    maxHeight: "85%",
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "700",
    marginBottom: 6,
    marginTop: 10,
  },
  subjectPillsRow: {
    marginBottom: 8,
  },
  subjectPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
    marginRight: 8,
  },
  subjectPillText: {
    fontSize: 12,
  },
  textInput: {
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  labelWithClockRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    marginBottom: 6,
  },
  clockBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 4,
  },
  clockBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },
  prioritySelectorRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  priorityOpt: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: "center",
    borderWidth: 1,
  },
  priorityOptText: {
    fontSize: 13,
    fontWeight: "600",
  },
  modalButtonsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  cancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  saveBtn: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  saveBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
});