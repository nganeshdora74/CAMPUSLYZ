import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";

import { auth, db } from "../../firebase/config";
import { confirmLogout } from "../../firebase/auth";
import { useAppTheme } from "../../context/ThemeContext";
import AdminThemeToggle from "../../components/admin/AdminThemeToggle";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTopBar from "../../components/admin/AdminTopBar";
import {
  Branch,
  DEFAULT_BRANCHES,
  listenBranches,
  SubjectItem,
} from "../../services/curriculumService";

// =====================================================
// SIDEBAR NAVIGATION ITEMS
// =====================================================
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

const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const FILTER_DAYS = ["All", ...DAYS_OF_WEEK];

const TIME_PRESETS = [
  { start: "09:00 AM", end: "10:00 AM" },
  { start: "10:15 AM", end: "11:15 AM" },
  { start: "11:30 AM", end: "12:30 PM" },
  { start: "12:00 PM", end: "01:00 PM" },
  { start: "01:30 PM", end: "02:30 PM" },
  { start: "02:00 PM", end: "03:00 PM" },
  { start: "03:15 PM", end: "04:15 PM" },
  { start: "04:00 PM", end: "05:00 PM" },
];

export type ScheduleItem = {
  id: string;
  day: string;
  subject: string;
  subjectCode?: string;
  room: string;
  faculty: string;
  startTime: string;
  endTime: string;
  timeRange: string;
  type?: string;
  status: "Completed" | "Ongoing" | "Upcoming" | "Cancelled";
  createdAt?: any;
  updatedAt?: any;
};

type SubjectOption = {
  id: string;
  name: string;
  code?: string;
  teacherName?: string;
  department?: string;
};

type FacultyOption = {
  id: string;
  name: string;
  department?: string;
};

// Initial starter schedule seeded into shared collection if empty
const INITIAL_SCHEDULE_DATA = [
  {
    day: "Mon",
    startTime: "09:00 AM",
    endTime: "10:00 AM",
    timeRange: "09:00 AM\n– 10:00 AM",
    subject: "Data Structures",
    subjectCode: "CS201",
    room: "Room 204 • 2nd Floor",
    faculty: "Prof. Sharma",
    status: "Completed",
    type: "Core",
  },
  {
    day: "Mon",
    startTime: "10:15 AM",
    endTime: "11:15 AM",
    timeRange: "10:15 AM\n– 11:15 AM",
    subject: "DBMS",
    subjectCode: "CS204",
    room: "Room 302 • 3rd Floor",
    faculty: "Prof. Verma",
    status: "Completed",
    type: "Core",
  },
  {
    day: "Mon",
    startTime: "12:00 PM",
    endTime: "01:00 PM",
    timeRange: "12:00 PM\n– 01:00 PM",
    subject: "Operating Systems",
    subjectCode: "CS301",
    room: "Room 304 • 3rd Floor",
    faculty: "Prof. Patel",
    status: "Ongoing",
    type: "Core",
  },
  {
    day: "Tue",
    startTime: "09:00 AM",
    endTime: "10:00 AM",
    timeRange: "09:00 AM\n– 10:00 AM",
    subject: "Data Structures",
    subjectCode: "CS201",
    room: "Room 204 • 2nd Floor",
    faculty: "Prof. Sharma",
    status: "Completed",
    type: "Core",
  },
  {
    day: "Tue",
    startTime: "10:15 AM",
    endTime: "11:15 AM",
    timeRange: "10:15 AM\n– 11:15 AM",
    subject: "DBMS",
    subjectCode: "CS204",
    room: "Room 302 • 3rd Floor",
    faculty: "Prof. Verma",
    status: "Completed",
    type: "Core",
  },
  {
    day: "Tue",
    startTime: "12:00 PM",
    endTime: "01:00 PM",
    timeRange: "12:00 PM\n– 01:00 PM",
    subject: "Operating Systems",
    subjectCode: "CS301",
    room: "Room 304 • 3rd Floor",
    faculty: "Prof. Patel",
    status: "Ongoing",
    type: "Core",
  },
  {
    day: "Tue",
    startTime: "02:00 PM",
    endTime: "03:00 PM",
    timeRange: "02:00 PM\n– 03:00 PM",
    subject: "Computer Networks",
    subjectCode: "CS304",
    room: "Room 201 • 2nd Floor",
    faculty: "Prof. Kumar",
    status: "Upcoming",
    type: "Core",
  },
  {
    day: "Tue",
    startTime: "04:00 PM",
    endTime: "05:00 PM",
    timeRange: "04:00 PM\n– 05:00 PM",
    subject: "English Communication",
    subjectCode: "HS101",
    room: "Room 105 • 1st Floor",
    faculty: "Dr. Ananya",
    status: "Upcoming",
    type: "Elective",
  },
  {
    day: "Wed",
    startTime: "09:00 AM",
    endTime: "10:30 AM",
    timeRange: "09:00 AM\n– 10:30 AM",
    subject: "Algorithms Lab",
    subjectCode: "CS201L",
    room: "Computer Lab 3",
    faculty: "Prof. Sharma",
    status: "Upcoming",
    type: "Lab",
  },
  {
    day: "Wed",
    startTime: "11:00 AM",
    endTime: "12:30 PM",
    timeRange: "11:00 AM\n– 12:30 PM",
    subject: "Web Tech Lab",
    subjectCode: "CS308L",
    room: "Lab 2 • 1st Floor",
    faculty: "Prof. Kumar",
    status: "Upcoming",
    type: "Lab",
  },
  {
    day: "Thu",
    startTime: "09:00 AM",
    endTime: "10:00 AM",
    timeRange: "09:00 AM\n– 10:00 AM",
    subject: "Machine Learning",
    subjectCode: "CS308",
    room: "Room 302 • 3rd Floor",
    faculty: "Dr. K. Sushma",
    status: "Upcoming",
    type: "Elective",
  },
  {
    day: "Thu",
    startTime: "10:15 AM",
    endTime: "11:15 AM",
    timeRange: "10:15 AM\n– 11:15 AM",
    subject: "Computer Networks",
    subjectCode: "CS304",
    room: "Room 201 • 2nd Floor",
    faculty: "Prof. Kumar",
    status: "Upcoming",
    type: "Core",
  },
  {
    day: "Fri",
    startTime: "09:00 AM",
    endTime: "10:00 AM",
    timeRange: "09:00 AM\n– 10:00 AM",
    subject: "Data Structures",
    subjectCode: "CS201",
    room: "Room 204 • 2nd Floor",
    faculty: "Prof. Sharma",
    status: "Upcoming",
    type: "Core",
  },
  {
    day: "Fri",
    startTime: "10:15 AM",
    endTime: "11:15 AM",
    timeRange: "10:15 AM\n– 11:15 AM",
    subject: "DBMS",
    subjectCode: "CS204",
    room: "Room 302 • 3rd Floor",
    faculty: "Prof. Verma",
    status: "Upcoming",
    type: "Core",
  },
  {
    day: "Sat",
    startTime: "10:00 AM",
    endTime: "12:00 PM",
    timeRange: "10:00 AM\n– 12:00 PM",
    subject: "Project Mentorship & Seminar",
    subjectCode: "PRJ401",
    room: "Seminar Hall B",
    faculty: "Dr. S. Ramesh",
    status: "Upcoming",
    type: "Seminar",
  },
];

export default function AdminScheduleScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const { isDark, colors } = useAppTheme();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState("All");
  const [search, setSearch] = useState("");

  const [schedules, setSchedules] = useState<ScheduleItem[]>([]);
  const [subjectOptions, setSubjectOptions] = useState<SubjectOption[]>([]);
  const [facultyOptions, setFacultyOptions] = useState<FacultyOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Subject & Faculty Directory Toggle
  const [showSubjectDirectory, setShowSubjectDirectory] = useState(true);

  // Add / Edit Slot Modal State
  const [modalVisible, setModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingItem, setEditingItem] = useState<ScheduleItem | null>(null);

  // Form fields for Add/Edit Slot
  const [formDay, setFormDay] = useState("Mon");
  const [formSubject, setFormSubject] = useState("");
  const [formSubjectCode, setFormSubjectCode] = useState("");
  const [formFaculty, setFormFaculty] = useState("");
  const [formRoom, setFormRoom] = useState("");
  const [formStartTime, setFormStartTime] = useState("09:00 AM");
  const [formEndTime, setFormEndTime] = useState("10:00 AM");
  const [formType, setFormType] = useState("Core");
  const [formStatus, setFormStatus] = useState<"Completed" | "Ongoing" | "Upcoming" | "Cancelled">("Upcoming");

  // Change Teacher Modal State
  const [changeTeacherModalVisible, setChangeTeacherModalVisible] = useState(false);
  const [targetSubjectName, setTargetSubjectName] = useState("");
  const [currentTeacherName, setCurrentTeacherName] = useState("");
  const [newTeacherName, setNewTeacherName] = useState("");
  const [applyToAllSlots, setApplyToAllSlots] = useState(true);
  const [specificSlotId, setSpecificSlotId] = useState<string | null>(null);

  // Add Subject-Wise Teacher Modal State
  const [addSubjectModalVisible, setAddSubjectModalVisible] = useState(false);
  const [newSubName, setNewSubName] = useState("");
  const [newSubCode, setNewSubCode] = useState("");
  const [newSubTeacher, setNewSubTeacher] = useState("");
  const [newSubDept, setNewSubDept] = useState("CSE");

  // Curriculum Branches & Optional Electives State
  const [branches, setBranches] = useState<Branch[]>(DEFAULT_BRANCHES);
  const [activeSubjectTab, setActiveSubjectTab] = useState<"All" | "Electives" | "Core" | "Labs">("All");
  const [showSubjectSuggestions, setShowSubjectSuggestions] = useState(false);
  const [showFacultySuggestions, setShowFacultySuggestions] = useState(false);
  const [showNewSubSuggestions, setShowNewSubSuggestions] = useState(false);
  const [showNewSubFacultySuggestions, setShowNewSubFacultySuggestions] = useState(false);

  // Listen to Curriculum Branches (Real-time sync with Core & Optional Electives)
  useEffect(() => {
    const unsub = listenBranches((loaded) => {
      if (loaded && loaded.length > 0) setBranches(loaded);
    });
    return () => unsub();
  }, []);

  // Load Real-time Schedule, Subjects, and Faculty from Firestore
  useEffect(() => {
    let unsubSchedules: (() => void) | undefined;
    let unsubSubjects: (() => void) | undefined;
    let unsubFaculty: (() => void) | undefined;

    try {
      const schedCol = collection(db, "schedules");
      unsubSchedules = onSnapshot(
        schedCol,
        async (snapshot) => {
          if (snapshot.empty) {
            // Seed initial data so there is immediately rich data for both teacher and student
            try {
              for (const item of INITIAL_SCHEDULE_DATA) {
                await addDoc(schedCol, {
                  ...item,
                  createdAt: serverTimestamp(),
                  updatedAt: serverTimestamp(),
                });
              }
            } catch (seedErr) {
              console.warn("Seeding initial schedule failed:", seedErr);
            }
            setLoading(false);
            return;
          }

          const loaded: ScheduleItem[] = snapshot.docs.map((d) => {
            const data = d.data();
            const sTime = data.startTime || (data.time?.split("-")[0]?.trim()) || "09:00 AM";
            const eTime = data.endTime || (data.time?.split("-")[1]?.trim()) || "10:00 AM";
            const formattedRange = data.timeRange || `${sTime}\n– ${eTime}`;

            let st: "Completed" | "Ongoing" | "Upcoming" | "Cancelled" = "Upcoming";
            if (data.status === "Completed") st = "Completed";
            else if (data.status === "Ongoing") st = "Ongoing";
            else if (data.status === "Cancelled") st = "Cancelled";

            return {
              id: d.id,
              day: data.day || "Mon",
              subject: data.subject || "Subject",
              subjectCode: data.subjectCode || "",
              room: data.room || "Room 101",
              faculty: data.faculty || data.teacher || "Professor",
              startTime: sTime,
              endTime: eTime,
              timeRange: formattedRange,
              type: data.type || "Core",
              status: st,
              createdAt: data.createdAt,
              updatedAt: data.updatedAt,
            };
          });

          // Sort by Day sequence (Mon..Sun) then by start time
          const dayOrder: Record<string, number> = {
            Mon: 1,
            Tue: 2,
            Wed: 3,
            Thu: 4,
            Fri: 5,
            Sat: 6,
            Sun: 7,
          };

          loaded.sort((a, b) => {
            const dayA = dayOrder[a.day] || 99;
            const dayB = dayOrder[b.day] || 99;
            if (dayA !== dayB) return dayA - dayB;
            return a.startTime.localeCompare(b.startTime);
          });

          setSchedules(loaded);
          setLoading(false);
        },
        (err) => {
          console.warn("Schedules listener error:", err.message);
          setLoading(false);
        }
      );

      // Load subjects from 'subjects' collection to allow teacher to pick existing subjects
      const subCol = collection(db, "subjects");
      unsubSubjects = onSnapshot(
        subCol,
        (snapshot) => {
          const loadedSubs: SubjectOption[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: data.name || "",
              code: data.code || "",
              teacherName: data.teacherName || "",
              department: data.department || "",
            };
          });
          setSubjectOptions(loadedSubs);
        },
        (err) => console.log("Subjects listener error:", err.message)
      );

      // Load faculty from 'faculty' collection so Admin can easily pick registered teachers
      const facultyCol = collection(db, "faculty");
      unsubFaculty = onSnapshot(
        facultyCol,
        (snapshot) => {
          const loadedFac: FacultyOption[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: data.name || "Faculty",
              department: data.department || "",
            };
          });
          setFacultyOptions(loadedFac);
        },
        (err) => console.log("Faculty listener error:", err.message)
      );
    } catch (err) {
      console.warn("Schedule init error:", err);
      setLoading(false);
    }

    return () => {
      if (unsubSchedules) unsubSchedules();
      if (unsubSubjects) unsubSubjects();
      if (unsubFaculty) unsubFaculty();
    };
  }, []);

  // Filtered schedules by Day and Search query
  const filteredSchedules = useMemo(() => {
    const q = search.trim().toLowerCase();
    return schedules.filter((item) => {
      const matchDay = selectedDay === "All" || item.day === selectedDay;
      const matchSearch =
        !q ||
        item.subject.toLowerCase().includes(q) ||
        (item.subjectCode && item.subjectCode.toLowerCase().includes(q)) ||
        item.faculty.toLowerCase().includes(q) ||
        item.room.toLowerCase().includes(q) ||
        item.day.toLowerCase().includes(q);
      return matchDay && matchSearch;
    });
  }, [schedules, selectedDay, search]);

  // Statistics
  const stats = useMemo(() => {
    const total = schedules.length;
    const labCount = schedules.filter((s) => (s.type || "").toLowerCase().includes("lab")).length;
    const ongoingCount = schedules.filter((s) => s.status === "Ongoing").length;
    const uniqueFaculty = new Set(schedules.map((s) => s.faculty)).size;

    return { total, labCount, ongoingCount, uniqueFaculty };
  }, [schedules]);

  // Comprehensive Curriculum Subjects (Aggregated from Core, Optional Electives & Saved Subjects)
  type EnrichedSubject = {
    id: string;
    name: string;
    code: string;
    type: "Core" | "Elective" | "Lab" | "Seminar";
    defaultTeacher?: string;
    department?: string;
    isOptional?: boolean;
    credits?: number;
  };

  const allCurriculumSubjects = useMemo<EnrichedSubject[]>(() => {
    const map = new Map<string, EnrichedSubject>();

    // 1. Add all branch subjects (Core and Optional Electives from all branches)
    branches.forEach((branch) => {
      branch.coreSubjects?.forEach((sub) => {
        const key = sub.name.trim().toLowerCase();
        if (!map.has(key)) {
          const isLab = sub.name.toLowerCase().includes("lab") || sub.code.toLowerCase().includes("l");
          map.set(key, {
            id: sub.id || `core-${key}`,
            name: sub.name.trim(),
            code: sub.code || "",
            type: isLab ? "Lab" : "Core",
            defaultTeacher: sub.defaultTeacher || "Prof. Sharma",
            department: branch.code,
            isOptional: false,
            credits: sub.credits || 4,
          });
        }
      });

      branch.optionalSubjects?.forEach((sub) => {
        const key = sub.name.trim().toLowerCase();
        if (!map.has(key)) {
          map.set(key, {
            id: sub.id || `opt-${key}`,
            name: sub.name.trim(),
            code: sub.code || "",
            type: "Elective",
            defaultTeacher: sub.defaultTeacher || "Dr. K. Sushma",
            department: branch.code,
            isOptional: true,
            credits: sub.credits || 3,
          });
        }
      });
    });

    // 2. Add saved subjects from Firestore collection
    subjectOptions.forEach((sub) => {
      const key = sub.name.trim().toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          id: sub.id,
          name: sub.name.trim(),
          code: sub.code || "",
          type: "Core",
          defaultTeacher: sub.teacherName || "Prof. Sharma",
          department: sub.department || "CSE",
          isOptional: false,
          credits: 3,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => {
      if (a.isOptional && !b.isOptional) return -1;
      if (!a.isOptional && b.isOptional) return 1;
      return a.name.localeCompare(b.name);
    });
  }, [branches, subjectOptions]);

  // Quick Pick subjects filtered by category tab
  const quickPickSubjects = useMemo(() => {
    if (activeSubjectTab === "Electives") {
      return allCurriculumSubjects.filter((s) => s.isOptional || s.type === "Elective");
    }
    if (activeSubjectTab === "Core") {
      return allCurriculumSubjects.filter((s) => s.type === "Core" && !s.isOptional);
    }
    if (activeSubjectTab === "Labs") {
      return allCurriculumSubjects.filter((s) => s.type === "Lab");
    }
    return allCurriculumSubjects;
  }, [allCurriculumSubjects, activeSubjectTab]);

  // Real-time suggestions while typing Subject Name in Schedule Modal
  const subjectSuggestions = useMemo(() => {
    const q = formSubject.trim().toLowerCase();
    if (!q) {
      return allCurriculumSubjects.slice(0, 8);
    }
    return allCurriculumSubjects
      .filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          s.code.toLowerCase().includes(q) ||
          (s.department && s.department.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [allCurriculumSubjects, formSubject]);

  // Real-time suggestions while typing Faculty / Teacher Name in Schedule Modal
  const facultySuggestions = useMemo(() => {
    const q = formFaculty.trim().toLowerCase();
    if (!q) {
      return facultyOptions.slice(0, 8);
    }
    return facultyOptions
      .filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          (f.department && f.department.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [facultyOptions, formFaculty]);

  // Suggestions while typing in Add Subject & Teacher Modal
  const newSubSuggestions = useMemo(() => {
    const q = newSubName.trim().toLowerCase();
    if (!q) {
      return allCurriculumSubjects.slice(0, 8);
    }
    return allCurriculumSubjects
      .filter((s) => s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q))
      .slice(0, 8);
  }, [allCurriculumSubjects, newSubName]);

  // Teacher suggestions while typing in Add Subject & Teacher Modal
  const newSubFacultySuggestions = useMemo(() => {
    const q = newSubTeacher.trim().toLowerCase();
    if (!q) {
      return facultyOptions.slice(0, 8);
    }
    return facultyOptions
      .filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          (f.department && f.department.toLowerCase().includes(q))
      )
      .slice(0, 8);
  }, [facultyOptions, newSubTeacher]);

  const handleSelectNewSub = (sub: {
    name: string;
    code?: string;
    department?: string;
    defaultTeacher?: string;
    teacherName?: string;
  }) => {
    setNewSubName(sub.name);
    if (sub.code) setNewSubCode(sub.code);
    if (sub.department) setNewSubDept(sub.department);
    const t = sub.defaultTeacher || sub.teacherName;
    if (t && t !== "Not Assigned") {
      setNewSubTeacher(t);
    }
    setShowNewSubSuggestions(false);
  };

  const handleSelectNewSubFaculty = (name: string) => {
    setNewSubTeacher(name);
    setShowNewSubFacultySuggestions(false);
  };

  // Select subject helper
  const handleSelectSubject = (sub: {
    name: string;
    code?: string;
    type?: string;
    defaultTeacher?: string;
    teacherName?: string;
  }) => {
    setFormSubject(sub.name);
    if (sub.code) setFormSubjectCode(sub.code);
    if (sub.type) setFormType(sub.type);
    const t = sub.defaultTeacher || sub.teacherName;
    if (t && t !== "Not Assigned") {
      setFormFaculty(t);
    }
    setShowSubjectSuggestions(false);
  };

  const handleSelectFaculty = (name: string) => {
    setFormFaculty(name);
    setShowFacultySuggestions(false);
  };

  // Subject-wise Faculty Directory List (Aggregated from curriculum branches, subjects & schedules)
  const subjectFacultyList = useMemo(() => {
    const map = new Map<
      string,
      {
        subject: string;
        code: string;
        teacher: string;
        department: string;
        slotCount: number;
        subjectId?: string;
      }
    >();

    // 0. Add branch core and optional subjects so all are visible
    branches.forEach((b) => {
      [...(b.coreSubjects || []), ...(b.optionalSubjects || [])].forEach((s) => {
        const k = s.name.trim().toLowerCase();
        if (!map.has(k)) {
          map.set(k, {
            subject: s.name.trim(),
            code: s.code || "",
            teacher: s.defaultTeacher || "Not Assigned",
            department: b.code || "CSE",
            slotCount: 0,
          });
        }
      });
    });

    // 1. Add all registered curriculum subjects
    for (const sub of subjectOptions) {
      if (sub.name) {
        map.set(sub.name.trim().toLowerCase(), {
          subject: sub.name.trim(),
          code: sub.code || "",
          teacher: sub.teacherName || "Not Assigned",
          department: sub.department || "General",
          slotCount: 0,
          subjectId: sub.id,
        });
      }
    }

    // 2. Add or update with schedule slots
    for (const item of schedules) {
      const key = item.subject.trim().toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.slotCount += 1;
        if ((!existing.teacher || existing.teacher === "Not Assigned") && item.faculty) {
          existing.teacher = item.faculty;
        }
      } else {
        map.set(key, {
          subject: item.subject.trim(),
          code: item.subjectCode || "",
          teacher: item.faculty || "Not Assigned",
          department: "General",
          slotCount: 1,
        });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.subject.localeCompare(b.subject));
  }, [branches, subjectOptions, schedules]);

  // Open modal to add class slot pre-filled for a specific subject
  const openAddModalForSubject = (subjectName: string, subjectCode: string, teacher: string) => {
    setEditingItem(null);
    setFormDay(selectedDay === "All" ? "Mon" : selectedDay);
    setFormSubject(subjectName);
    setFormSubjectCode(subjectCode);
    setFormFaculty(teacher !== "Not Assigned" ? teacher : "");
    setFormRoom("Room 204 • 2nd Floor");
    setFormStartTime("09:00 AM");
    setFormEndTime("10:00 AM");
    setFormType("Core");
    setFormStatus("Upcoming");
    setModalVisible(true);
  };

  // Open Change Teacher Modal
  const openChangeTeacherModal = (subjectName: string, currentTeacher: string, slotId?: string) => {
    setTargetSubjectName(subjectName);
    setCurrentTeacherName(currentTeacher || "Not Assigned");
    setNewTeacherName(currentTeacher && currentTeacher !== "Not Assigned" ? currentTeacher : "");
    setSpecificSlotId(slotId || null);
    setApplyToAllSlots(true);
    setChangeTeacherModalVisible(true);
  };

  // Save Changed Teacher
  const handleSaveChangedTeacher = async () => {
    const trimmedNew = newTeacherName.trim();
    if (!trimmedNew) {
      Alert.alert("Required", "Please enter or pick a teacher name.");
      return;
    }

    try {
      setSaving(true);

      if (applyToAllSlots || !specificSlotId) {
        // 1. Update ALL schedule slots for this subject across all days
        const matching = schedules.filter(
          (s) => s.subject.trim().toLowerCase() === targetSubjectName.trim().toLowerCase()
        );
        for (const slot of matching) {
          await updateDoc(doc(db, "schedules", slot.id), {
            faculty: trimmedNew,
            updatedAt: serverTimestamp(),
          });
        }

        // 2. Update in subjects collection
        const existingSub = subjectOptions.find(
          (s) => s.name.trim().toLowerCase() === targetSubjectName.trim().toLowerCase()
        );
        if (existingSub) {
          await updateDoc(doc(db, "subjects", existingSub.id), {
            teacherName: trimmedNew,
            updatedAt: serverTimestamp(),
          });
        } else {
          // If not in subjects collection yet, add it
          await addDoc(collection(db, "subjects"), {
            name: targetSubjectName,
            teacherName: trimmedNew,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }

        Alert.alert(
          "Teacher Updated!",
          `Assigned ${trimmedNew} as the teacher for "${targetSubjectName}" across ${matching.length} timetable ${matching.length === 1 ? "slot" : "slots"}. Students will now see the new teacher!`
        );
      } else {
        // Update just this specific schedule slot
        await updateDoc(doc(db, "schedules", specificSlotId), {
          faculty: trimmedNew,
          updatedAt: serverTimestamp(),
        });
        Alert.alert("Teacher Updated!", `Faculty for this class slot updated to ${trimmedNew}.`);
      }

      setChangeTeacherModalVisible(false);
    } catch (err: any) {
      console.warn("Change teacher error:", err);
      Alert.alert("Error", err?.message || "Failed to update teacher.");
    } finally {
      setSaving(false);
    }
  };

  // Add Subject & Teacher handler
  const handleAddSubjectWiseTeacher = async () => {
    const sName = newSubName.trim();
    const sTeacher = newSubTeacher.trim();
    if (!sName || !sTeacher) {
      Alert.alert("Required", "Please enter both Subject Name and Teacher Name.");
      return;
    }

    try {
      setSaving(true);
      await addDoc(collection(db, "subjects"), {
        name: sName,
        code: newSubCode.trim().toUpperCase(),
        teacherName: sTeacher,
        department: newSubDept.trim() || "CSE",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      Alert.alert(
        "Subject & Teacher Added",
        `"${sName}" taught by ${sTeacher} is now registered. You can now add schedule slots for it!`
      );
      setNewSubName("");
      setNewSubCode("");
      setNewSubTeacher("");
      setAddSubjectModalVisible(false);
    } catch (err: any) {
      Alert.alert("Error", err?.message || "Failed to add subject and teacher.");
    } finally {
      setSaving(false);
    }
  };

  // Open modal to add new class
  const openAddModal = () => {
    setEditingItem(null);
    setFormDay(selectedDay === "All" ? "Mon" : selectedDay);
    setFormSubject("");
    setFormSubjectCode("");
    setFormFaculty("");
    setFormRoom("Room 204 • 2nd Floor");
    setFormStartTime("09:00 AM");
    setFormEndTime("10:00 AM");
    setFormType("Core");
    setFormStatus("Upcoming");
    setModalVisible(true);
  };

  // Open modal to edit/update existing class
  const openEditModal = (item: ScheduleItem) => {
    setEditingItem(item);
    setFormDay(item.day || "Mon");
    setFormSubject(item.subject || "");
    setFormSubjectCode(item.subjectCode || "");
    setFormFaculty(item.faculty || "");
    setFormRoom(item.room || "");
    setFormStartTime(item.startTime || "09:00 AM");
    setFormEndTime(item.endTime || "10:00 AM");
    setFormType(item.type || "Core");
    setFormStatus(item.status || "Upcoming");
    setModalVisible(true);
  };

  // Quick subject selector handler
  const handleSelectExistingSubject = (sub: SubjectOption) => {
    setFormSubject(sub.name);
    if (sub.code) setFormSubjectCode(sub.code);
    if (sub.teacherName) setFormFaculty(sub.teacherName);
  };

  // Apply time preset
  const handleApplyPreset = (preset: { start: string; end: string }) => {
    setFormStartTime(preset.start);
    setFormEndTime(preset.end);
  };

  // Save (Create or Update)
  const handleSave = async () => {
    const trimmedSubject = formSubject.trim();
    if (!trimmedSubject) {
      Alert.alert("Required", "Please enter or select a subject name.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        day: formDay,
        subject: trimmedSubject,
        subjectCode: formSubjectCode.trim().toUpperCase(),
        faculty: formFaculty.trim() || "Faculty Member",
        room: formRoom.trim() || "Lecture Hall",
        startTime: formStartTime.trim(),
        endTime: formEndTime.trim(),
        timeRange: `${formStartTime.trim()}\n– ${formEndTime.trim()}`,
        type: formType,
        status: formStatus,
        updatedAt: serverTimestamp(),
      };

      if (editingItem) {
        // Teacher updates existing schedule
        await updateDoc(doc(db, "schedules", editingItem.id), payload);
        Alert.alert("Schedule Updated", `${trimmedSubject} has been updated. Students can now follow the revised schedule!`);
      } else {
        // Teacher creates new schedule entry
        await addDoc(collection(db, "schedules"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        Alert.alert("Schedule Created", `${trimmedSubject} added to ${formDay} schedule. It is now live for all students!`);
      }

      setModalVisible(false);
    } catch (err: any) {
      console.warn("Save schedule error:", err);
      Alert.alert("Error", err?.message || "Failed to save schedule slot.");
    } finally {
      setSaving(false);
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
        { text: "Cancel", style: "cancel" },
        { text: "Delete", style: "destructive", onPress: onConfirm },
      ]);
    }
  };

  // Delete a subject and its timetable slots from directory
  const handleDeleteSubject = (item: {
    subject: string;
    code: string;
    teacher: string;
    department: string;
    slotCount: number;
    subjectId?: string;
  }) => {
    confirmAction(
      "Delete Subject",
      `Are you sure you want to delete "${item.subject}"?\n\nThis will remove this subject from the directory and clear all its ${item.slotCount} timetable ${item.slotCount === 1 ? "slot" : "slots"}.`,
      async () => {
        try {
          // 1. Delete matching slots from schedules collection
          const matchingSlots = schedules.filter(
            (s) => s.subject.trim().toLowerCase() === item.subject.trim().toLowerCase()
          );
          for (const slot of matchingSlots) {
            await deleteDoc(doc(db, "schedules", slot.id));
          }

          // 2. Delete from subjects collection if exists
          if (item.subjectId) {
            await deleteDoc(doc(db, "subjects", item.subjectId));
          } else {
            const matchingSub = subjectOptions.find(
              (s) => s.name.trim().toLowerCase() === item.subject.trim().toLowerCase()
            );
            if (matchingSub) {
              await deleteDoc(doc(db, "subjects", matchingSub.id));
            }
          }

          if (Platform.OS === "web") {
            window.alert(`"${item.subject}" and its schedule slots were deleted.`);
          } else {
            Alert.alert("Subject Deleted", `"${item.subject}" and its schedule slots were deleted.`);
          }
        } catch (err: any) {
          if (Platform.OS === "web") {
            window.alert(err?.message || "Failed to delete subject.");
          } else {
            Alert.alert("Error", err?.message || "Failed to delete subject.");
          }
        }
      }
    );
  };

  // Delete a specific schedule slot
  const handleDelete = (item: ScheduleItem) => {
    confirmAction(
      "Delete Schedule Slot",
      `Are you sure you want to delete ${item.subject} (${item.day} ${item.startTime})?\n\nStudents will no longer see this slot in their timetable.`,
      async () => {
        try {
          await deleteDoc(doc(db, "schedules", item.id));
          if (Platform.OS === "web") {
            window.alert("Class slot removed from schedule.");
          } else {
            Alert.alert("Deleted", "Class slot removed from schedule.");
          }
        } catch (err: any) {
          if (Platform.OS === "web") {
            window.alert(err?.message || "Could not delete class slot.");
          } else {
            Alert.alert("Error", err?.message || "Could not delete class slot.");
          }
        }
      }
    );
  };

  // Quick cycle status directly from card
  const handleToggleStatus = async (item: ScheduleItem) => {
    const nextStatus: "Completed" | "Ongoing" | "Upcoming" | "Cancelled" =
      item.status === "Upcoming"
        ? "Ongoing"
        : item.status === "Ongoing"
        ? "Completed"
        : item.status === "Completed"
        ? "Cancelled"
        : "Upcoming";

    try {
      await updateDoc(doc(db, "schedules", item.id), {
        status: nextStatus,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.warn("Toggle status error:", err);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.adminSidebar }]} edges={["top", "left", "right"]}>
      <View style={[styles.container, { backgroundColor: colors.adminBg }]}>
        <AdminSidebar
          activeNav="schedule"
          isDesktop={isDesktop}
          mobileMenuOpen={mobileMenuOpen}
          onCloseMobileMenu={() => setMobileMenuOpen(false)}
        />

        {/* Main Workspace */}
        <View style={[styles.mainWorkspace, { backgroundColor: colors.adminBg }]}>
          <AdminTopBar
            title="Academic Schedule Manager"
            subtitle="Update subject timings so all students see and follow official classes"
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
            rightActions={
              <>
                <TouchableOpacity
                  style={[
                    styles.subjectTeacherDirectoryBtn,
                    showSubjectDirectory && styles.subjectTeacherDirectoryBtnActive,
                  ]}
                  activeOpacity={0.8}
                  onPress={() => setShowSubjectDirectory(!showSubjectDirectory)}
                >
                  <Ionicons
                    name="people-outline"
                    size={18}
                    color={showSubjectDirectory ? "#FFFFFF" : "#C4B5FD"}
                    style={{ marginRight: 6 }}
                  />
                  <Text
                    style={[
                      styles.subjectTeacherDirectoryBtnText,
                      showSubjectDirectory && styles.subjectTeacherDirectoryBtnTextActive,
                    ]}
                  >
                    {showSubjectDirectory ? "Hide Faculty Mapping" : "Subject & Faculty Directory"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.addClassButton}
                  activeOpacity={0.8}
                  onPress={openAddModal}
                >
                  <Ionicons name="add-circle" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.addClassButtonText}>Add Class Slot</Text>
                </TouchableOpacity>
              </>
            }
          />

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollBody}
          >
            {/* Stats Cards */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                <View style={[styles.statIconCircle, { backgroundColor: "rgba(124, 58, 237, 0.15)" }]}>
                  <Ionicons name="calendar" size={22} color="#A78BFA" />
                </View>
                <View style={styles.statDetails}>
                  <Text style={[styles.statNumber, { color: colors.adminText }]}>{stats.total}</Text>
                  <Text style={[styles.statLabel, { color: colors.adminTextSecondary }]}>Total Slots</Text>
                </View>
              </View>

              <View style={[styles.statCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                <View style={[styles.statIconCircle, { backgroundColor: "rgba(16, 185, 129, 0.15)" }]}>
                  <Ionicons name="play-circle" size={22} color="#34D399" />
                </View>
                <View style={styles.statDetails}>
                  <Text style={[styles.statNumber, { color: colors.adminText }]}>{stats.ongoingCount}</Text>
                  <Text style={[styles.statLabel, { color: colors.adminTextSecondary }]}>Ongoing Now</Text>
                </View>
              </View>

              <View style={[styles.statCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                <View style={[styles.statIconCircle, { backgroundColor: "rgba(59, 130, 246, 0.15)" }]}>
                  <Ionicons name="flask" size={22} color="#60A5FA" />
                </View>
                <View style={styles.statDetails}>
                  <Text style={[styles.statNumber, { color: colors.adminText }]}>{stats.labCount}</Text>
                  <Text style={[styles.statLabel, { color: colors.adminTextSecondary }]}>Labs & Practicals</Text>
                </View>
              </View>

              <View style={[styles.statCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                <View style={[styles.statIconCircle, { backgroundColor: "rgba(245, 158, 11, 0.15)" }]}>
                  <Ionicons name="people" size={22} color="#FBBF24" />
                </View>
                <View style={styles.statDetails}>
                  <Text style={[styles.statNumber, { color: colors.adminText }]}>{stats.uniqueFaculty}</Text>
                  <Text style={[styles.statLabel, { color: colors.adminTextSecondary }]}>Faculty Assigned</Text>
                </View>
              </View>
            </View>

            {/* SUBJECT-WISE FACULTY DIRECTORY & MANAGEMENT PANEL */}
            {showSubjectDirectory && (
              <View style={[styles.directoryCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                <View style={styles.directoryHeader}>
                  <View style={{ flex: 1, marginRight: 12 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                      <View style={styles.dirIconCircle}>
                        <Ionicons name="school-outline" size={18} color="#A78BFA" />
                      </View>
                      <Text style={[styles.directoryTitle, { color: colors.adminText }]}>Subject-Wise Faculty Directory</Text>
                    </View>
                    <Text style={[styles.directorySubtitle, { color: colors.adminTextSecondary }]}>
                      Assign and manage which teacher conducts each subject. Students use this mapping to identify their professors.
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.addSubjectBtn}
                    onPress={() => setAddSubjectModalVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="add-circle" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.addSubjectBtnText}>Add Subject & Teacher</Text>
                  </TouchableOpacity>
                </View>

                {subjectFacultyList.length === 0 ? (
                  <View style={styles.dirEmpty}>
                    <Text style={[styles.dirEmptyText, { color: colors.adminTextSecondary }]}>No curriculum subjects mapped yet.</Text>
                  </View>
                ) : (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.directoryItemsRow}
                  >
                    {subjectFacultyList.map((item) => (
                      <View key={item.subject} style={[styles.directoryItemCard, { backgroundColor: colors.adminSurfaceAlt, borderColor: colors.adminCardBorder }]}>
                        <View style={styles.directoryItemTop}>
                          <Text style={[styles.dirSubjectName, { color: colors.adminText }]} numberOfLines={1}>
                            {item.subject}
                          </Text>
                          {item.code ? (
                            <View style={styles.dirCodeBadge}>
                              <Text style={styles.dirCodeBadgeText}>{item.code}</Text>
                            </View>
                          ) : null}
                        </View>

                        <View style={[styles.dirTeacherRow, { backgroundColor: isDark ? "rgba(15, 8, 26, 0.5)" : "rgba(0, 0, 0, 0.04)" }]}>
                          <View style={styles.dirAvatarCircle}>
                            <Ionicons name="person" size={14} color="#A78BFA" />
                          </View>
                          <View style={{ flex: 1 }}>
                            <Text style={[styles.dirTeacherLabel, { color: colors.adminTextSecondary }]}>Faculty Assigned</Text>
                            <Text style={[styles.dirTeacherName, { color: colors.adminText }]} numberOfLines={1}>
                              {item.teacher}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.dirFooterRow}>
                          <Text style={styles.dirSlotCountText}>
                            {item.slotCount} {item.slotCount === 1 ? "lecture" : "lectures"}
                          </Text>

                          <View style={{ flexDirection: "row", gap: 6 }}>
                            <TouchableOpacity
                              style={styles.dirChangeTeacherBtn}
                              onPress={() => openChangeTeacherModal(item.subject, item.teacher)}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="swap-horizontal" size={13} color="#38BDF8" style={{ marginRight: 4 }} />
                              <Text style={styles.dirChangeTeacherBtnText}>Change</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={styles.dirAddSlotBtn}
                              onPress={() => openAddModalForSubject(item.subject, item.code, item.teacher)}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="add" size={14} color="#C4B5FD" />
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[
                                styles.dirAddSlotBtn,
                                {
                                  backgroundColor: isDark ? "rgba(239, 68, 68, 0.2)" : "#FEE2E2",
                                  borderColor: isDark ? "rgba(239, 68, 68, 0.4)" : "#FECACA",
                                },
                              ]}
                              onPress={() => handleDeleteSubject(item)}
                              activeOpacity={0.8}
                            >
                              <Ionicons name="trash-outline" size={14} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        </View>
                      </View>
                    ))}
                  </ScrollView>
                )}
              </View>
            )}

            {/* Day Filter Pills */}
            <View style={styles.filterSection}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterPillsScroll}
              >
                {FILTER_DAYS.map((day) => {
                  const isActive = selectedDay === day;
                  const dayCount = day === "All" ? schedules.length : schedules.filter((s) => s.day === day).length;
                  return (
                    <TouchableOpacity
                      key={day}
                      style={[
                        styles.filterPill,
                        { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder },
                        isActive && styles.filterPillActive,
                      ]}
                      onPress={() => setSelectedDay(day)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.filterPillText,
                          { color: colors.adminTextSecondary },
                          isActive && styles.filterPillTextActive,
                        ]}
                      >
                        {day}
                      </Text>
                      <View style={[styles.filterPillBadge, isActive && styles.filterPillBadgeActive]}>
                        <Text style={[styles.filterPillBadgeText, isActive && styles.filterPillBadgeTextActive]}>
                          {dayCount}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Search & Notice Bar */}
            <View style={styles.searchBarRow}>
              <View style={[styles.searchBox, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                <Ionicons name="search" size={18} color={colors.adminTextSecondary} />
                <TextInput
                  style={[styles.searchInput, { color: colors.adminText }]}
                  placeholder="Search subject, faculty, room, or code..."
                  placeholderTextColor={colors.adminTextSecondary}
                  value={search}
                  onChangeText={setSearch}
                />
                {search.length > 0 && (
                  <TouchableOpacity onPress={() => setSearch("")}>
                    <Ionicons name="close-circle" size={18} color={colors.adminTextSecondary} />
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.liveNoticeTag}>
                <Ionicons name="sync-circle" size={18} color="#10B981" />
                <Text style={styles.liveNoticeText}>Live Student Sync Active</Text>
              </View>
            </View>

            {/* Classes List */}
            {loading ? (
              <View style={styles.centerLoading}>
                <ActivityIndicator size="large" color="#8B5CF6" />
                <Text style={[styles.loadingText, { color: colors.adminTextSecondary }]}>Syncing schedule with database...</Text>
              </View>
            ) : filteredSchedules.length === 0 ? (
              <View style={[styles.emptyCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                <Ionicons name="calendar-outline" size={48} color="#6D28D9" />
                <Text style={[styles.emptyTitle, { color: colors.adminText }]}>No classes found</Text>
                <Text style={[styles.emptySubtitle, { color: colors.adminTextSecondary }]}>
                  {selectedDay !== "All"
                    ? `No classes currently scheduled for ${selectedDay}.`
                    : "No classes match your search query."}
                </Text>
                <TouchableOpacity style={styles.emptyAddButton} onPress={openAddModal}>
                  <Ionicons name="add" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.emptyAddButtonText}>Add Class Slot</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.schedulesGrid}>
                {filteredSchedules.map((item) => {
                  const isCompleted = item.status === "Completed";
                  const isOngoing = item.status === "Ongoing";
                  const isCancelled = item.status === "Cancelled";

                  return (
                    <View key={item.id} style={[styles.scheduleCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                      {/* Top Row: Day Pill & Status Badge */}
                      <View style={styles.cardHeaderRow}>
                        <View style={styles.dayTag}>
                          <Ionicons name="calendar-outline" size={13} color="#C4B5FD" />
                          <Text style={styles.dayTagText}>{item.day}</Text>
                          {item.type && (
                            <Text style={styles.dayTagType}>• {item.type}</Text>
                          )}
                        </View>

                        {/* Interactive Status Badge */}
                        <TouchableOpacity
                          style={[
                            styles.statusBadge,
                            isCompleted && styles.statusBadgeCompleted,
                            isOngoing && styles.statusBadgeOngoing,
                            isCancelled && styles.statusBadgeCancelled,
                          ]}
                          activeOpacity={0.7}
                          onPress={() => handleToggleStatus(item)}
                        >
                          <View
                            style={[
                              styles.statusDot,
                              isCompleted && styles.statusDotCompleted,
                              isOngoing && styles.statusDotOngoing,
                              isCancelled && styles.statusDotCancelled,
                            ]}
                          />
                          <Text
                            style={[
                              styles.statusBadgeText,
                              isCompleted && styles.statusBadgeTextCompleted,
                              isOngoing && styles.statusBadgeTextOngoing,
                              isCancelled && styles.statusBadgeTextCancelled,
                            ]}
                          >
                            {item.status}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      {/* Middle: Subject & Faculty */}
                      <View style={styles.cardBody}>
                        <View style={styles.subjectRow}>
                          <Text style={[styles.subjectText, { color: colors.adminText }]}>{item.subject}</Text>
                          {item.subjectCode ? (
                            <View style={styles.codeBadge}>
                              <Text style={styles.codeBadgeText}>{item.subjectCode}</Text>
                            </View>
                          ) : null}
                        </View>

                        <View style={styles.metaRow}>
                          <Ionicons name="person-outline" size={14} color="#A78BFA" />
                          <Text style={[styles.metaFaculty, { color: colors.adminText }]}>{item.faculty}</Text>
                        </View>

                        <View style={styles.metaRow}>
                          <Ionicons name="location-outline" size={14} color={colors.adminTextSecondary} />
                          <Text style={[styles.metaRoom, { color: colors.adminTextSecondary }]}>{item.room}</Text>
                        </View>

                        <View style={styles.metaRow}>
                          <Ionicons name="time-outline" size={14} color="#38BDF8" />
                          <Text style={styles.metaTime}>
                            {item.startTime} – {item.endTime}
                          </Text>
                        </View>
                      </View>

                      {/* Card Action Buttons (Teacher Right to Change Teacher, Edit & Delete) */}
                      <View style={[styles.cardActionRow, { borderTopColor: colors.adminCardBorder }]}>
                        <TouchableOpacity
                          style={styles.actionBtnChangeTeacher}
                          activeOpacity={0.8}
                          onPress={() => openChangeTeacherModal(item.subject, item.faculty, item.id)}
                        >
                          <Ionicons name="swap-horizontal-outline" size={15} color="#38BDF8" />
                          <Text style={styles.actionBtnChangeTeacherText}>Change Teacher</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.actionBtnEdit}
                          activeOpacity={0.8}
                          onPress={() => openEditModal(item)}
                        >
                          <Ionicons name="create-outline" size={15} color="#A78BFA" />
                          <Text style={styles.actionBtnEditText}>Edit</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          style={styles.actionBtnDelete}
                          activeOpacity={0.8}
                          onPress={() => handleDelete(item)}
                        >
                          <Ionicons name="trash-outline" size={15} color="#F87171" />
                          <Text style={styles.actionBtnDeleteText}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
            <View style={{ height: 60 }} />
          </ScrollView>
        </View>
      </View>

      {/* ===================================================== */}
      {/* ADD / EDIT SCHEDULE MODAL (Teacher Control Panel) */}
      {/* ===================================================== */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setModalVisible(false)}
        >
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]} onPress={(e) => e.stopPropagation()}>
            <ScrollView showsVerticalScrollIndicator={false}>
              {/* Drag Bar */}
              <View style={styles.modalDragBar} />

              {/* Modal Header */}
              <View style={styles.modalHeaderRow}>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.adminText }]}>
                    {editingItem ? "Update Class Schedule" : "Add Class Slot"}
                  </Text>
                  <Text style={[styles.modalSubtitle, { color: colors.adminTextSecondary }]}>
                    {editingItem
                      ? "Modify subject timings and details for students"
                      : "Create a timetable slot that students will see and follow"}
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setModalVisible(false)}
                >
                  <Ionicons name="close" size={20} color={colors.adminTextSecondary} />
                </TouchableOpacity>
              </View>

              {/* Quick Pick from Curriculum Subjects & Optional Electives */}
              <View style={styles.quickSubSection}>
                <View style={styles.trayHeaderRow}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                    <Ionicons name="sparkles" size={15} color="#8B5CF6" />
                    <Text style={[styles.fieldLabel, { color: colors.adminText, marginBottom: 0 }]}>
                      Pick from Curriculum & Optional Electives:
                    </Text>
                  </View>

                  {/* Filter Tabs: All, Electives, Core, Labs */}
                  <View style={styles.subFilterTabs}>
                    {(["All", "Electives", "Core", "Labs"] as const).map((tab) => (
                      <TouchableOpacity
                        key={tab}
                        style={[
                          styles.subFilterTab,
                          activeSubjectTab === tab && styles.subFilterTabActive,
                        ]}
                        onPress={() => setActiveSubjectTab(tab)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.subFilterTabText,
                            activeSubjectTab === tab && styles.subFilterTabTextActive,
                          ]}
                        >
                          {tab === "Electives" ? "⭐ Electives" : tab === "Core" ? "📘 Core" : tab}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Horizontal chips of available subjects */}
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.quickSubChipsRow}
                >
                  {quickPickSubjects.map((sub) => {
                    const isSelected = formSubject.toLowerCase() === sub.name.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={sub.id}
                        style={[
                          styles.quickSubChip,
                          { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder },
                          sub.isOptional && { borderColor: "rgba(139, 92, 246, 0.5)", backgroundColor: isDark ? "rgba(124, 58, 237, 0.15)" : "#F5F3FF" },
                          isSelected && styles.quickSubChipActive,
                        ]}
                        onPress={() => handleSelectSubject(sub)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name={sub.isOptional ? "sparkles" : sub.type === "Lab" ? "flask" : "book-outline"}
                          size={13}
                          color={isSelected ? "#FFFFFF" : sub.isOptional ? "#A78BFA" : "#60A5FA"}
                        />
                        <View>
                          <Text
                            style={[
                              styles.quickSubChipText,
                              { color: colors.adminTextSecondary },
                              isSelected && styles.quickSubChipTextActive,
                            ]}
                          >
                            {sub.name} {sub.code ? `(${sub.code})` : ""}
                          </Text>
                          {sub.isOptional && (
                            <Text style={styles.electiveBadgeSub}>Optional Elective</Text>
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              {/* Day Selector */}
              <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Day of Week *</Text>
              <View style={styles.dayPickerRow}>
                {DAYS_OF_WEEK.map((d) => {
                  const isSelected = formDay === d;
                  return (
                    <TouchableOpacity
                      key={d}
                      style={[
                        styles.dayPickerPill,
                        { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder },
                        isSelected && styles.dayPickerPillActive,
                      ]}
                      onPress={() => setFormDay(d)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.dayPickerPillText,
                          { color: colors.adminTextSecondary },
                          isSelected && styles.dayPickerPillTextActive,
                        ]}
                      >
                        {d}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Subject Name & Code with Real-time Auto-Suggest */}
              <View style={[styles.inputGroup, { zIndex: 50 }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Subject Name *</Text>
                  {showSubjectSuggestions && (
                    <TouchableOpacity onPress={() => setShowSubjectSuggestions(false)}>
                      <Text style={{ fontSize: 11, color: "#8B5CF6", fontWeight: "700" }}>✕ Close suggestions</Text>
                    </TouchableOpacity>
                  )}
                </View>

                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                  placeholder="e.g. Artificial Intelligence & ML / Data Structures"
                  placeholderTextColor={colors.adminTextSecondary}
                  value={formSubject}
                  onChangeText={(val) => {
                    setFormSubject(val);
                    setShowSubjectSuggestions(true);
                  }}
                  onFocus={() => setShowSubjectSuggestions(true)}
                />

                {/* Auto-complete suggestions box */}
                {showSubjectSuggestions && (
                  <View style={[styles.suggestionsBox, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                    <View style={styles.suggestionsHeader}>
                      <Text style={[styles.suggestionsHeaderText, { color: colors.adminTextSecondary }]}>
                        Curriculum Subjects & Optional Electives ({subjectSuggestions.length})
                      </Text>
                    </View>

                    {subjectSuggestions.map((item) => (
                      <TouchableOpacity
                        key={item.id}
                        style={[styles.suggestionItem, { borderBottomColor: colors.adminCardBorder }]}
                        onPress={() => handleSelectSubject(item)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.suggestionLeft}>
                          <Ionicons
                            name={item.isOptional ? "sparkles" : item.type === "Lab" ? "flask" : "book-outline"}
                            size={16}
                            color={item.isOptional ? "#A78BFA" : "#38BDF8"}
                          />
                          <View style={{ marginLeft: 8, flex: 1 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                              <Text style={[styles.suggestionName, { color: colors.adminText }]}>{item.name}</Text>
                              {item.code ? (
                                <View style={styles.suggestionCodeBadge}>
                                  <Text style={styles.suggestionCodeText}>{item.code}</Text>
                                </View>
                              ) : null}
                              {item.isOptional && (
                                <View style={styles.electivePillSmall}>
                                  <Text style={styles.electivePillSmallText}>Optional Elective</Text>
                                </View>
                              )}
                            </View>
                            {item.defaultTeacher && (
                              <Text style={[styles.suggestionTeacher, { color: colors.adminTextSecondary }]}>
                                👨‍🏫 Designated Teacher: {item.defaultTeacher}
                              </Text>
                            )}
                          </View>
                        </View>

                        <Ionicons name="checkmark-circle-outline" size={16} color="#8B5CF6" />
                      </TouchableOpacity>
                    ))}

                    {formSubject.trim().length > 0 && !allCurriculumSubjects.some((s) => s.name.toLowerCase() === formSubject.trim().toLowerCase()) && (
                      <TouchableOpacity
                        style={styles.suggestionAddNewItem}
                        onPress={() => setShowSubjectSuggestions(false)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="add-circle" size={16} color="#10B981" />
                        <Text style={styles.suggestionAddNewText}>
                          Use custom subject: "<Text style={{ fontWeight: "700" }}>{formSubject.trim()}</Text>"
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>

              <View style={styles.formRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Subject Code</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                    placeholder="e.g. CS310"
                    placeholderTextColor={colors.adminTextSecondary}
                    value={formSubjectCode}
                    onChangeText={setFormSubjectCode}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Class Type</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                    placeholder="Core / Lab / Elective"
                    placeholderTextColor={colors.adminTextSecondary}
                    value={formType}
                    onChangeText={setFormType}
                  />
                </View>
              </View>

              {/* Faculty / Teacher Name with Quick Chips & Real-time Auto-Suggest */}
              <View style={[styles.inputGroup, { zIndex: 40 }]}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                  <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Faculty / Teacher Name *</Text>
                  {showFacultySuggestions && (
                    <TouchableOpacity onPress={() => setShowFacultySuggestions(false)}>
                      <Text style={{ fontSize: 11, color: "#8B5CF6", fontWeight: "700" }}>✕ Close suggestions</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Quick faculty chips */}
                {facultyOptions.length > 0 && (
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={[styles.quickSubChipsRow, { marginBottom: 8 }]}
                  >
                    {facultyOptions.slice(0, 8).map((fac) => {
                      const isSel = formFaculty.toLowerCase() === fac.name.toLowerCase();
                      return (
                        <TouchableOpacity
                          key={fac.id}
                          style={[
                            styles.facultyChipMini,
                            { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder },
                            isSel && styles.facultyChipMiniActive,
                          ]}
                          onPress={() => handleSelectFaculty(fac.name)}
                          activeOpacity={0.7}
                        >
                          <Ionicons name="person-circle-outline" size={13} color={isSel ? "#FFFFFF" : "#38BDF8"} />
                          <Text style={[styles.facultyChipMiniText, { color: isSel ? "#FFFFFF" : colors.adminTextSecondary }]}>
                            {fac.name}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                  placeholder="e.g. Dr. S. Ramesh / Prof. Sharma"
                  placeholderTextColor={colors.adminTextSecondary}
                  value={formFaculty}
                  onChangeText={(val) => {
                    setFormFaculty(val);
                    setShowFacultySuggestions(true);
                  }}
                  onFocus={() => setShowFacultySuggestions(true)}
                />

                {/* Faculty suggestions box */}
                {showFacultySuggestions && (
                  <View style={[styles.suggestionsBox, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                    <View style={styles.suggestionsHeader}>
                      <Text style={[styles.suggestionsHeaderText, { color: colors.adminTextSecondary }]}>
                        Registered Faculty Members ({facultySuggestions.length})
                      </Text>
                    </View>

                    {facultySuggestions.map((fac) => (
                      <TouchableOpacity
                        key={fac.id}
                        style={[styles.suggestionItem, { borderBottomColor: colors.adminCardBorder }]}
                        onPress={() => handleSelectFaculty(fac.name)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.suggestionLeft}>
                          <Ionicons name="school-outline" size={16} color="#A78BFA" />
                          <View style={{ marginLeft: 8, flex: 1 }}>
                            <Text style={[styles.suggestionName, { color: colors.adminText }]}>{fac.name}</Text>
                            {fac.department && (
                              <Text style={[styles.suggestionTeacher, { color: colors.adminTextSecondary }]}>
                                Department: {fac.department}
                              </Text>
                            )}
                          </View>
                        </View>
                        <Ionicons name="checkmark-circle-outline" size={16} color="#8B5CF6" />
                      </TouchableOpacity>
                    ))}

                    {formFaculty.trim().length > 0 && !facultyOptions.some((f) => f.name.toLowerCase() === formFaculty.trim().toLowerCase()) && (
                      <TouchableOpacity
                        style={styles.suggestionAddNewItem}
                        onPress={() => setShowFacultySuggestions(false)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="add-circle" size={16} color="#10B981" />
                        <Text style={styles.suggestionAddNewText}>
                          Use custom teacher: "<Text style={{ fontWeight: "700" }}>{formFaculty.trim()}</Text>"
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Room / Lab Location *</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                  placeholder="e.g. Room 204 • 2nd Floor or Lab 3"
                  placeholderTextColor={colors.adminTextSecondary}
                  value={formRoom}
                  onChangeText={setFormRoom}
                />
              </View>

              {/* Time Presets */}
              <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Quick Time Slot Presets:</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.quickSubChipsRow}
              >
                {TIME_PRESETS.map((preset, idx) => {
                  const isPresetActive =
                    formStartTime === preset.start && formEndTime === preset.end;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.presetChip,
                        isPresetActive && styles.presetChipActive,
                      ]}
                      onPress={() => handleApplyPreset(preset)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="time-outline"
                        size={12}
                        color={isPresetActive ? "#FFFFFF" : "#38BDF8"}
                      />
                      <Text
                        style={[
                          styles.presetChipText,
                          isPresetActive && styles.presetChipTextActive,
                        ]}
                      >
                        {preset.start} - {preset.end}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Start Time & End Time */}
              <View style={styles.formRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Start Time *</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                    placeholder="09:00 AM"
                    placeholderTextColor={colors.adminTextSecondary}
                    value={formStartTime}
                    onChangeText={setFormStartTime}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>End Time *</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                    placeholder="10:00 AM"
                    placeholderTextColor={colors.adminTextSecondary}
                    value={formEndTime}
                    onChangeText={setFormEndTime}
                  />
                </View>
              </View>

              {/* Status Picker */}
              <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Status</Text>
              <View style={styles.statusSelectRow}>
                {(["Upcoming", "Ongoing", "Completed", "Cancelled"] as const).map((st) => {
                  const isSel = formStatus === st;
                  return (
                    <TouchableOpacity
                      key={st}
                      style={[
                        styles.statusOptionPill,
                        { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder },
                        isSel && styles.statusOptionPillActive,
                      ]}
                      onPress={() => setFormStatus(st)}
                      activeOpacity={0.7}
                    >
                      <Text
                        style={[
                          styles.statusOptionPillText,
                          { color: colors.adminTextSecondary },
                          isSel && styles.statusOptionPillTextActive,
                        ]}
                      >
                        {st}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Action Buttons */}
              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, { backgroundColor: colors.adminInputBg }]}
                  onPress={() => setModalVisible(false)}
                  disabled={saving}
                >
                  <Text style={[styles.modalCancelBtnText, { color: colors.adminTextSecondary }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSaveBtn}
                  onPress={handleSave}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons
                        name={editingItem ? "checkmark-circle" : "add-circle"}
                        size={18}
                        color="#FFFFFF"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.modalSaveBtnText}>
                        {editingItem ? "Save Changes" : "Create Schedule"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ===================================================== */}
      {/* CHANGE TEACHER MODAL (Admin Reassignment System) */}
      {/* ===================================================== */}
      <Modal
        visible={changeTeacherModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setChangeTeacherModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setChangeTeacherModalVisible(false)}
        >
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]} onPress={(e) => e.stopPropagation()}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalDragBar} />

              <View style={styles.modalHeaderRow}>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.adminText }]}>Change Subject Teacher</Text>
                  <Text style={[styles.modalSubtitle, { color: colors.adminTextSecondary }]}>
                    Reassign faculty for "{targetSubjectName}"
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setChangeTeacherModalVisible(false)}
                >
                  <Ionicons name="close" size={20} color={colors.adminTextSecondary} />
                </TouchableOpacity>
              </View>

              {/* Current Teacher Info Box */}
              <View style={[styles.currentTeacherCard, { backgroundColor: isDark ? "rgba(124, 58, 237, 0.12)" : "rgba(124, 58, 237, 0.08)" }]}>
                <View style={styles.currentTeacherIconBox}>
                  <Ionicons name="person" size={20} color="#A78BFA" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.currentTeacherLabel}>Currently Assigned Faculty:</Text>
                  <Text style={[styles.currentTeacherValue, { color: colors.adminText }]}>{currentTeacherName}</Text>
                </View>
              </View>

              {/* Quick Pick from Registered Faculty */}
              {facultyOptions.length > 0 && (
                <View style={{ marginTop: 14 }}>
                  <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Pick from Registered Faculty:</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.quickSubChipsRow}
                  >
                    {facultyOptions.map((fac) => {
                      const isSelected = newTeacherName === fac.name;
                      return (
                        <TouchableOpacity
                          key={fac.id}
                          style={[
                            styles.quickSubChip,
                            { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder },
                            isSelected && styles.quickSubChipActive,
                          ]}
                          onPress={() => setNewTeacherName(fac.name)}
                          activeOpacity={0.7}
                        >
                          <Ionicons
                            name="person-circle-outline"
                            size={14}
                            color={isSelected ? "#FFFFFF" : "#38BDF8"}
                          />
                          <Text
                            style={[
                              styles.quickSubChipText,
                              { color: colors.adminTextSecondary },
                              isSelected && styles.quickSubChipTextActive,
                            ]}
                          >
                            {fac.name} {fac.department ? `(${fac.department})` : ""}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>
              )}

              {/* Custom Teacher Name Input */}
              <View style={[styles.inputGroup, { marginTop: 14 }]}>
                <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>New Teacher / Faculty Name *</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                  placeholder="e.g. Dr. K. Sushma / Prof. Sharma"
                  placeholderTextColor={colors.adminTextSecondary}
                  value={newTeacherName}
                  onChangeText={setNewTeacherName}
                />
              </View>

              {/* Scope Selection: Apply to all slots */}
              <TouchableOpacity
                style={[styles.scopeToggleRow, { backgroundColor: colors.adminSurfaceAlt }]}
                activeOpacity={0.8}
                onPress={() => setApplyToAllSlots(!applyToAllSlots)}
              >
                <View style={[styles.checkboxBox, applyToAllSlots && styles.checkboxBoxActive]}>
                  {applyToAllSlots && <Ionicons name="checkmark" size={14} color="#FFFFFF" />}
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={[styles.scopeToggleTitle, { color: colors.adminText }]}>
                    Apply to all timetable slots of {targetSubjectName}
                  </Text>
                  <Text style={[styles.scopeToggleSubtitle, { color: colors.adminTextSecondary }]}>
                    Updates this teacher across all days in the timetable so students have full consistency
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Actions */}
              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, { backgroundColor: colors.adminInputBg }]}
                  onPress={() => setChangeTeacherModalVisible(false)}
                  disabled={saving}
                >
                  <Text style={[styles.modalCancelBtnText, { color: colors.adminTextSecondary }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSaveBtn}
                  onPress={handleSaveChangedTeacher}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons
                        name="swap-horizontal"
                        size={18}
                        color="#FFFFFF"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.modalSaveBtnText}>Confirm Reassign</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ===================================================== */}
      {/* ADD SUBJECT-WISE TEACHER MODAL */}
      {/* ===================================================== */}
      <Modal
        visible={addSubjectModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAddSubjectModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setAddSubjectModalVisible(false)}
        >
          <Pressable style={[styles.modalSheet, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]} onPress={(e) => e.stopPropagation()}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <View style={styles.modalDragBar} />

              <View style={styles.modalHeaderRow}>
                <View>
                  <Text style={[styles.modalTitle, { color: colors.adminText }]}>Add Subject & Teacher</Text>
                  <Text style={[styles.modalSubtitle, { color: colors.adminTextSecondary }]}>
                    Register a new subject with its designated faculty member
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.modalCloseBtn}
                  onPress={() => setAddSubjectModalVisible(false)}
                >
                  <Ionicons name="close" size={20} color={colors.adminTextSecondary} />
                </TouchableOpacity>
              </View>

              {/* Quick Pick from Curriculum Subjects */}
              <View style={{ marginBottom: 10 }}>
                <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>
                  Quick Pick from Curriculum Subjects & Electives:
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.quickSubChipsRow}
                >
                  {allCurriculumSubjects.slice(0, 15).map((sub) => {
                    const isSelected = newSubName.toLowerCase() === sub.name.toLowerCase();
                    return (
                      <TouchableOpacity
                        key={`add-sub-${sub.id}`}
                        style={[
                          styles.quickSubChip,
                          { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder },
                          isSelected && styles.quickSubChipActive,
                        ]}
                        onPress={() => handleSelectNewSub(sub)}
                        activeOpacity={0.7}
                      >
                        {sub.isOptional ? (
                          <View style={styles.electiveBadgeSub}>
                            <Ionicons name="sparkles" size={10} color="#F59E0B" />
                          </View>
                        ) : (
                          <Ionicons
                            name="book-outline"
                            size={12}
                            color={isSelected ? "#FFFFFF" : "#A78BFA"}
                          />
                        )}
                        <Text
                          style={[
                            styles.quickSubChipText,
                            { color: colors.adminTextSecondary },
                            isSelected && styles.quickSubChipTextActive,
                          ]}
                        >
                          {sub.name}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Subject Name *</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                  placeholder="e.g. Artificial Intelligence & ML"
                  placeholderTextColor={colors.adminTextSecondary}
                  value={newSubName}
                  onChangeText={(val) => {
                    setNewSubName(val);
                    setShowNewSubSuggestions(true);
                  }}
                  onFocus={() => setShowNewSubSuggestions(true)}
                />

                {/* Subject Suggestions Dropdown */}
                {showNewSubSuggestions && (
                  <View style={[styles.suggestionsBox, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                    <View style={styles.suggestionsHeader}>
                      <Text style={[styles.suggestionsHeaderText, { color: colors.adminTextSecondary }]}>
                        Curriculum & Elective Suggestions ({newSubSuggestions.length})
                      </Text>
                    </View>
                    {newSubSuggestions.map((sub) => (
                      <TouchableOpacity
                        key={`new-sub-sug-${sub.id}`}
                        style={[styles.suggestionItem, { borderBottomColor: colors.adminCardBorder }]}
                        onPress={() => handleSelectNewSub(sub)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.suggestionLeft}>
                          <Ionicons
                            name={sub.isOptional ? "sparkles" : "book-outline"}
                            size={16}
                            color={sub.isOptional ? "#F59E0B" : "#A78BFA"}
                          />
                          <View style={{ marginLeft: 8, flex: 1 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                              <Text style={[styles.suggestionName, { color: colors.adminText }]}>{sub.name}</Text>
                              {sub.code ? (
                                <View style={styles.suggestionCodeBadge}>
                                  <Text style={styles.suggestionCodeText}>{sub.code}</Text>
                                </View>
                              ) : null}
                              {sub.isOptional && (
                                <View style={styles.electivePillSmall}>
                                  <Ionicons name="sparkles" size={9} color="#F59E0B" />
                                  <Text style={styles.electivePillSmallText}>Elective</Text>
                                </View>
                              )}
                            </View>
                            {sub.defaultTeacher && (
                              <Text style={[styles.suggestionTeacher, { color: colors.adminTextSecondary }]}>
                                Designated: {sub.defaultTeacher} {sub.department ? `(${sub.department})` : ""}
                              </Text>
                            )}
                          </View>
                        </View>
                        <Ionicons name="chevron-forward" size={16} color="#8B5CF6" />
                      </TouchableOpacity>
                    ))}

                    {newSubName.trim().length > 0 && !allCurriculumSubjects.some((s) => s.name.toLowerCase() === newSubName.trim().toLowerCase()) && (
                      <TouchableOpacity
                        style={styles.suggestionAddNewItem}
                        onPress={() => setShowNewSubSuggestions(false)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="add-circle" size={16} color="#10B981" />
                        <Text style={styles.suggestionAddNewText}>
                          Use custom subject: "<Text style={{ fontWeight: "700" }}>{newSubName.trim()}</Text>"
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>

              <View style={styles.formRow}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Subject Code</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                    placeholder="e.g. CS401"
                    placeholderTextColor={colors.adminTextSecondary}
                    value={newSubCode}
                    onChangeText={setNewSubCode}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Department</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                    placeholder="e.g. CSE / ECE"
                    placeholderTextColor={colors.adminTextSecondary}
                    value={newSubDept}
                    onChangeText={setNewSubDept}
                  />
                </View>
              </View>

              {/* Quick Pick Faculty */}
              {facultyOptions.length > 0 && (
                <View style={{ marginTop: 4, marginBottom: 8 }}>
                  <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Quick Pick Faculty:</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.quickSubChipsRow}
                  >
                    {facultyOptions.map((fac) => (
                      <TouchableOpacity
                        key={`newsub-fac-${fac.id}`}
                        style={[
                          styles.quickSubChip,
                          { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder },
                          newSubTeacher === fac.name && styles.quickSubChipActive,
                        ]}
                        onPress={() => handleSelectNewSubFaculty(fac.name)}
                        activeOpacity={0.7}
                      >
                        <Ionicons
                          name="person-circle-outline"
                          size={13}
                          color={newSubTeacher === fac.name ? "#FFFFFF" : "#38BDF8"}
                        />
                        <Text
                          style={[
                            styles.quickSubChipText,
                            { color: colors.adminTextSecondary },
                            newSubTeacher === fac.name && styles.quickSubChipTextActive,
                          ]}
                        >
                          {fac.name} {fac.department ? `(${fac.department})` : ""}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: colors.adminTextSecondary }]}>Designated Teacher Name *</Text>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                  placeholder="e.g. Prof. Sharma / Dr. K. Sushma"
                  placeholderTextColor={colors.adminTextSecondary}
                  value={newSubTeacher}
                  onChangeText={(val) => {
                    setNewSubTeacher(val);
                    setShowNewSubFacultySuggestions(true);
                  }}
                  onFocus={() => setShowNewSubFacultySuggestions(true)}
                />

                {/* Faculty suggestions box */}
                {showNewSubFacultySuggestions && (
                  <View style={[styles.suggestionsBox, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                    <View style={styles.suggestionsHeader}>
                      <Text style={[styles.suggestionsHeaderText, { color: colors.adminTextSecondary }]}>
                        Registered Faculty Members ({newSubFacultySuggestions.length})
                      </Text>
                    </View>

                    {newSubFacultySuggestions.map((fac) => (
                      <TouchableOpacity
                        key={`newsub-fac-sug-${fac.id}`}
                        style={[styles.suggestionItem, { borderBottomColor: colors.adminCardBorder }]}
                        onPress={() => handleSelectNewSubFaculty(fac.name)}
                        activeOpacity={0.7}
                      >
                        <View style={styles.suggestionLeft}>
                          <Ionicons name="school-outline" size={16} color="#A78BFA" />
                          <View style={{ marginLeft: 8, flex: 1 }}>
                            <Text style={[styles.suggestionName, { color: colors.adminText }]}>{fac.name}</Text>
                            {fac.department && (
                              <Text style={[styles.suggestionTeacher, { color: colors.adminTextSecondary }]}>
                                Department: {fac.department}
                              </Text>
                            )}
                          </View>
                        </View>
                        <Ionicons name="checkmark-circle-outline" size={16} color="#8B5CF6" />
                      </TouchableOpacity>
                    ))}

                    {newSubTeacher.trim().length > 0 && !facultyOptions.some((f) => f.name.toLowerCase() === newSubTeacher.trim().toLowerCase()) && (
                      <TouchableOpacity
                        style={styles.suggestionAddNewItem}
                        onPress={() => setShowNewSubFacultySuggestions(false)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="add-circle" size={16} color="#10B981" />
                        <Text style={styles.suggestionAddNewText}>
                          Use custom teacher: "<Text style={{ fontWeight: "700" }}>{newSubTeacher.trim()}</Text>"
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>

              <View style={styles.modalActionRow}>
                <TouchableOpacity
                  style={[styles.modalCancelBtn, { backgroundColor: colors.adminInputBg }]}
                  onPress={() => setAddSubjectModalVisible(false)}
                  disabled={saving}
                >
                  <Text style={[styles.modalCancelBtnText, { color: colors.adminTextSecondary }]}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalSaveBtn}
                  onPress={handleAddSubjectWiseTeacher}
                  disabled={saving}
                >
                  {saving ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color="#FFFFFF"
                        style={{ marginRight: 6 }}
                      />
                      <Text style={styles.modalSaveBtnText}>Register Subject</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// =====================================================
// STYLES
// =====================================================
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#160D27",
  },
  container: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#160D27",
  },

  /* Sidebar */
  sidebar: {
    width: 240,
    backgroundColor: "#1E1235",
    borderRightWidth: 1,
    borderRightColor: "#2F1E4F",
    display: "flex",
    flexDirection: "column",
  },
  mobileSidebar: {
    width: 280,
    height: "100%",
  },
  drawerBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
  },
  drawerSheet: {
    width: 280,
    height: "100%",
    backgroundColor: "#1E1235",
  },
  sidebarBrand: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#2F1E4F",
  },
  brandIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#7C3AED",
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  brandSubtitle: {
    color: "#A78BFA",
    fontSize: 12,
  },
  closeSidebarBtn: {
    marginLeft: "auto",
    padding: 4,
  },
  sidebarNavScroll: {
    paddingVertical: 12,
    paddingHorizontal: 12,
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
    backgroundColor: "#7C3AED",
  },
  navItemText: {
    color: "#CBD5E1",
    fontSize: 14,
    fontWeight: "500",
    marginLeft: 12,
    flex: 1,
  },
  navItemTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  navLiveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#10B981",
  },
  sidebarFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: "#2F1E4F",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "rgba(239, 68, 68, 0.12)",
  },
  logoutBtnText: {
    color: "#F87171",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 10,
  },

  /* Workspace */
  mainWorkspace: {
    flex: 1,
    backgroundColor: "#160D27",
  },
  topHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: "#2F1E4F",
    backgroundColor: "#1E1235",
    flexWrap: "wrap",
    gap: 12,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  menuToggleBtn: {
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#2B1A4B",
  },
  pageTitle: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  pageSubtitle: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 2,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
  },
  addClassButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#7C3AED",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    shadowColor: "#7C3AED",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  addClassButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  scrollBody: {
    padding: 20,
  },

  /* Stats */
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: "#1E1235",
    borderWidth: 1,
    borderColor: "#2F1E4F",
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  statIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statDetails: {},
  statNumber: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "700",
  },
  statLabel: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 2,
  },

  /* Filter Section */
  filterSection: {
    marginBottom: 16,
  },
  filterPillsScroll: {
    gap: 8,
  },
  filterPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#1E1235",
    borderWidth: 1,
    borderColor: "#2F1E4F",
    gap: 6,
  },
  filterPillActive: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED",
  },
  filterPillText: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "600",
  },
  filterPillTextActive: {
    color: "#FFFFFF",
  },
  filterPillBadge: {
    backgroundColor: "#2B1A4B",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  filterPillBadgeActive: {
    backgroundColor: "rgba(255, 255, 255, 0.25)",
  },
  filterPillBadgeText: {
    color: "#A78BFA",
    fontSize: 11,
    fontWeight: "700",
  },
  filterPillBadgeTextActive: {
    color: "#FFFFFF",
  },

  /* Search & Notice */
  searchBarRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 20,
    flexWrap: "wrap",
  },
  searchBox: {
    flex: 1,
    minWidth: 240,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1235",
    borderWidth: 1,
    borderColor: "#2F1E4F",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 13,
    padding: 0,
  },
  liveNoticeTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(16, 185, 129, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.25)",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 6,
  },
  liveNoticeText: {
    color: "#34D399",
    fontSize: 12,
    fontWeight: "600",
  },

  /* Center Loading */
  centerLoading: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
  },
  loadingText: {
    color: "#A78BFA",
    fontSize: 13,
    marginTop: 12,
  },

  /* Empty Card */
  emptyCard: {
    backgroundColor: "#1E1235",
    borderWidth: 1,
    borderColor: "#2F1E4F",
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
    marginTop: 12,
  },
  emptySubtitle: {
    color: "#94A3B8",
    fontSize: 13,
    marginTop: 6,
    textAlign: "center",
    maxWidth: 300,
  },
  emptyAddButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#7C3AED",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 18,
  },
  emptyAddButtonText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },

  /* Schedule Cards Grid */
  schedulesGrid: {
    gap: 14,
  },
  scheduleCard: {
    backgroundColor: "#1E1235",
    borderWidth: 1,
    borderColor: "#2F1E4F",
    borderRadius: 14,
    padding: 16,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  dayTag: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(124, 58, 237, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(124, 58, 237, 0.3)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    gap: 6,
  },
  dayTagText: {
    color: "#C4B5FD",
    fontSize: 12,
    fontWeight: "700",
  },
  dayTagType: {
    color: "#A78BFA",
    fontSize: 11,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(148, 163, 184, 0.15)",
    gap: 6,
  },
  statusBadgeCompleted: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
  },
  statusBadgeOngoing: {
    backgroundColor: "rgba(59, 130, 246, 0.15)",
  },
  statusBadgeCancelled: {
    backgroundColor: "rgba(239, 68, 68, 0.15)",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#94A3B8",
  },
  statusDotCompleted: {
    backgroundColor: "#10B981",
  },
  statusDotOngoing: {
    backgroundColor: "#3B82F6",
  },
  statusDotCancelled: {
    backgroundColor: "#EF4444",
  },
  statusBadgeText: {
    color: "#CBD5E1",
    fontSize: 11,
    fontWeight: "600",
  },
  statusBadgeTextCompleted: {
    color: "#34D399",
  },
  statusBadgeTextOngoing: {
    color: "#60A5FA",
  },
  statusBadgeTextCancelled: {
    color: "#F87171",
  },

  cardBody: {
    gap: 6,
  },
  subjectRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  subjectText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  codeBadge: {
    backgroundColor: "#2B1A4B",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  codeBadgeText: {
    color: "#A78BFA",
    fontSize: 11,
    fontWeight: "600",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  metaFaculty: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "500",
  },
  metaRoom: {
    color: "#94A3B8",
    fontSize: 12,
  },
  metaTime: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "600",
  },

  cardActionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#281744",
  },
  actionBtnEdit: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(124, 58, 237, 0.15)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  actionBtnEditText: {
    color: "#A78BFA",
    fontSize: 12,
    fontWeight: "600",
  },
  actionBtnDelete: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(239, 68, 68, 0.12)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 6,
  },
  actionBtnDeleteText: {
    color: "#F87171",
    fontSize: 12,
    fontWeight: "600",
  },

  /* Modal */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  modalSheet: {
    width: "100%",
    maxWidth: 540,
    maxHeight: "90%",
    backgroundColor: "#1E1235",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "#37235C",
    padding: 22,
  },
  modalDragBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#37235C",
    alignSelf: "center",
    marginBottom: 14,
  },
  modalHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  modalTitle: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "700",
  },
  modalSubtitle: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 2,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#2B1A4B",
    alignItems: "center",
    justifyContent: "center",
  },
  quickSubSection: {
    marginBottom: 14,
  },
  quickSubChipsRow: {
    gap: 8,
    paddingVertical: 6,
  },
  quickSubChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#281744",
    borderWidth: 1,
    borderColor: "#3D2666",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 6,
  },
  quickSubChipActive: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED",
  },
  quickSubChipText: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "500",
  },
  quickSubChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },

  fieldLabel: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  dayPickerRow: {
    flexDirection: "row",
    gap: 6,
    marginBottom: 14,
    flexWrap: "wrap",
  },
  dayPickerPill: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#281744",
    borderWidth: 1,
    borderColor: "#3D2666",
  },
  dayPickerPillActive: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED",
  },
  dayPickerPillText: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "600",
  },
  dayPickerPillTextActive: {
    color: "#FFFFFF",
  },

  inputGroup: {
    marginBottom: 12,
  },
  formRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  textInput: {
    backgroundColor: "#160D27",
    borderWidth: 1,
    borderColor: "#37235C",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    color: "#FFFFFF",
    fontSize: 13,
  },

  presetChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1B2A4A",
    borderWidth: 1,
    borderColor: "#224177",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    gap: 6,
  },
  presetChipActive: {
    backgroundColor: "#0284C7",
    borderColor: "#0284C7",
  },
  presetChipText: {
    color: "#93C5FD",
    fontSize: 11,
    fontWeight: "500",
  },
  presetChipTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },

  statusSelectRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 18,
    flexWrap: "wrap",
  },
  statusOptionPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "#281744",
    borderWidth: 1,
    borderColor: "#3D2666",
  },
  statusOptionPillActive: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED",
  },
  statusOptionPillText: {
    color: "#CBD5E1",
    fontSize: 12,
    fontWeight: "500",
  },
  statusOptionPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },

  modalActionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 12,
    marginTop: 10,
  },
  modalCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#281744",
  },
  modalCancelBtnText: {
    color: "#CBD5E1",
    fontSize: 13,
    fontWeight: "600",
  },
  modalSaveBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#7C3AED",
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 10,
  },
  modalSaveBtnText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },

  /* Directory Header Button */
  subjectTeacherDirectoryBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(124, 58, 237, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(167, 139, 250, 0.4)",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 10,
    marginRight: 8,
  },
  subjectTeacherDirectoryBtnActive: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED",
  },
  subjectTeacherDirectoryBtnText: {
    color: "#C4B5FD",
    fontSize: 13,
    fontWeight: "600",
  },
  subjectTeacherDirectoryBtnTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  /* Directory Card & Items */
  directoryCard: {
    backgroundColor: "#1E1235",
    borderWidth: 1,
    borderColor: "#3B2264",
    borderRadius: 16,
    padding: 18,
    marginBottom: 20,
  },
  directoryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
    flexWrap: "wrap",
    gap: 10,
  },
  dirIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: "rgba(124, 58, 237, 0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  directoryTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "800",
  },
  directorySubtitle: {
    color: "#94A3B8",
    fontSize: 12,
    marginTop: 3,
    maxWidth: 500,
  },
  addSubjectBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#7C3AED",
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  addSubjectBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  dirEmpty: {
    paddingVertical: 18,
    alignItems: "center",
  },
  dirEmptyText: {
    color: "#94A3B8",
    fontSize: 13,
  },
  directoryItemsRow: {
    gap: 12,
    paddingVertical: 4,
  },
  directoryItemCard: {
    width: 230,
    backgroundColor: "#261642",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#3D2469",
    padding: 14,
  },
  directoryItemTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  dirSubjectName: {
    flex: 1,
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginRight: 6,
  },
  dirCodeBadge: {
    backgroundColor: "#3A1E68",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  dirCodeBadgeText: {
    color: "#A78BFA",
    fontSize: 10,
    fontWeight: "700",
  },
  dirTeacherRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
    backgroundColor: "rgba(15, 8, 26, 0.5)",
    padding: 8,
    borderRadius: 10,
  },
  dirAvatarCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "rgba(124, 58, 237, 0.3)",
    alignItems: "center",
    justifyContent: "center",
  },
  dirTeacherLabel: {
    color: "#94A3B8",
    fontSize: 10,
    fontWeight: "500",
  },
  dirTeacherName: {
    color: "#E2E8F0",
    fontSize: 12,
    fontWeight: "700",
  },
  dirFooterRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  dirSlotCountText: {
    color: "#A78BFA",
    fontSize: 11,
    fontWeight: "500",
  },
  dirChangeTeacherBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(56, 189, 248, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(56, 189, 248, 0.3)",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  dirChangeTeacherBtnText: {
    color: "#38BDF8",
    fontSize: 11,
    fontWeight: "600",
  },
  dirAddSlotBtn: {
    backgroundColor: "rgba(124, 58, 237, 0.2)",
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Card Change Teacher Button */
  actionBtnChangeTeacher: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(56, 189, 248, 0.12)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
  },
  actionBtnChangeTeacherText: {
    color: "#38BDF8",
    fontSize: 12,
    fontWeight: "600",
  },

  /* Change Teacher Modal Specifics */
  currentTeacherCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(124, 58, 237, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(124, 58, 237, 0.25)",
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
    gap: 12,
  },
  currentTeacherIconBox: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(124, 58, 237, 0.25)",
    alignItems: "center",
    justifyContent: "center",
  },
  currentTeacherLabel: {
    color: "#A78BFA",
    fontSize: 11,
    fontWeight: "600",
  },
  currentTeacherValue: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
    marginTop: 2,
  },
  scopeToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#281744",
    padding: 12,
    borderRadius: 12,
    marginTop: 14,
    marginBottom: 6,
  },
  checkboxBox: {
    width: 20,
    height: 20,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#94A3B8",
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxBoxActive: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED",
  },
  scopeToggleTitle: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
  },
  scopeToggleSubtitle: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 2,
  },

  /* Auto-complete & Quick Pick styles */
  trayHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
    flexWrap: "wrap",
    gap: 6,
  },
  subFilterTabs: {
    flexDirection: "row",
    gap: 6,
  },
  subFilterTab: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: "#261642",
    borderWidth: 1,
    borderColor: "#3D2469",
  },
  subFilterTabActive: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED",
  },
  subFilterTabText: {
    color: "#94A3B8",
    fontSize: 11,
    fontWeight: "600",
  },
  subFilterTabTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  electiveBadgeSub: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    gap: 3,
  },
  suggestionsBox: {
    marginTop: 6,
    backgroundColor: "#1E1235",
    borderWidth: 1,
    borderColor: "#3D2469",
    borderRadius: 12,
    maxHeight: 220,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 999,
  },
  suggestionsHeader: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(124, 58, 237, 0.12)",
    borderBottomWidth: 1,
    borderBottomColor: "#3D2469",
  },
  suggestionsHeaderText: {
    color: "#A78BFA",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  suggestionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#2B194C",
  },
  suggestionLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  suggestionName: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
  },
  suggestionCodeBadge: {
    backgroundColor: "#3A1E68",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  suggestionCodeText: {
    color: "#C4B5FD",
    fontSize: 10,
    fontWeight: "700",
  },
  electivePillSmall: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(245, 158, 11, 0.2)",
    paddingHorizontal: 4,
    paddingVertical: 1,
    borderRadius: 4,
    gap: 2,
  },
  electivePillSmallText: {
    color: "#FBBF24",
    fontSize: 9,
    fontWeight: "700",
  },
  suggestionTeacher: {
    color: "#94A3B8",
    fontSize: 11,
    marginTop: 2,
  },
  suggestionAddNewItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "rgba(16, 185, 129, 0.1)",
    gap: 8,
  },
  suggestionAddNewText: {
    color: "#10B981",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  facultyChipMini: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "#261642",
    borderWidth: 1,
    borderColor: "#3D2469",
    gap: 5,
  },
  facultyChipMiniActive: {
    backgroundColor: "#7C3AED",
    borderColor: "#7C3AED",
  },
  facultyChipMiniText: {
    color: "#CBD5E1",
    fontSize: 11,
    fontWeight: "600",
  },
});
