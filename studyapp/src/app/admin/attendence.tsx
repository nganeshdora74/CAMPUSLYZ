import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { auth, db } from "../../firebase/config";
import { confirmLogout } from "../../firebase/auth";
import { useAppTheme } from "../../context/ThemeContext";
import { useLanguage } from "../../context/LanguageContext";
import AdminThemeToggle from "../../components/admin/AdminThemeToggle";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTopBar from "../../components/admin/AdminTopBar";
import {
  ConnectedStudentItem,
  listenTeacherConnectedStudents,
  seedDefaultConnectedStudents,
  syncAttendanceToStudentProfile,
} from "../../firebase/teacherStudent";

// =====================================================
// SIDEBAR NAVIGATION ITEMS (MATCHING REFERENCE IMAGE)
// =====================================================
const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "home-outline", route: "/admin" },
  { id: "students", label: "Students", icon: "people-outline", route: "/admin/student" },
  { id: "faculty", label: "Faculty", icon: "person-outline", route: "/admin/faculty" },
  {
    id: "academics",
    label: "Academics",
    icon: "school-outline",
    route: "/admin/academics",
    hasSubmenu: true,
    children: [
      { id: "schedule", label: "Schedule", icon: "calendar-outline", route: "/admin/schedule" },
      { id: "attendance", label: "Attendance", icon: "checkbox-outline", route: "/admin/attendence" },
    ],
  },
  { id: "certificates", label: "Certificates", icon: "ribbon-outline", route: "/admin/certificate" },
  { id: "hostel", label: "Hostel", icon: "business-outline", route: "/admin/hostel" },
  { id: "mess", label: "Mess", icon: "restaurant-outline", route: "/admin/mess" },
  { id: "fees", label: "Fees", icon: "mail-outline", route: "/admin/fees" },
  { id: "notices", label: "Notices", icon: "megaphone-outline", route: "/admin/notices" },
  { id: "requests", label: "Requests", icon: "document-text-outline", route: "/admin/requests" },
  { id: "reports", label: "Reports", icon: "bar-chart-outline", route: "/admin/reports" },
  { id: "ai-assistant", label: "AI Assistant", icon: "hardware-chip-outline", route: "/admin/ai-assistant" },
  { id: "profile", label: "Profile", icon: "person-circle-outline", route: "/admin/profile" },
];

export type StudentAttendanceRow = {
  id: string;
  num: number;
  rollNo: string;
  studentName: string;
  status: "Present" | "Absent" | "Late";
  remarks: string;
  studentUid?: string;
  isConnected?: boolean;
  department?: string;
  section?: string;
  isBlocked?: boolean;
  monthPresentCount?: number;
  monthAbsentCount?: number;
  monthLateCount?: number;
};

export interface MonthConfig {
  name: string;
  short: string;
  monthIdx: number;
  year: number;
  days: number;
  workingDays: number;
}

export const ACADEMIC_MONTHS: MonthConfig[] = [
  { name: "January 2026", short: "Jan", monthIdx: 0, year: 2026, days: 31, workingDays: 25 },
  { name: "February 2026", short: "Feb", monthIdx: 1, year: 2026, days: 28, workingDays: 22 },
  { name: "March 2026", short: "Mar", monthIdx: 2, year: 2026, days: 31, workingDays: 25 },
  { name: "April 2026", short: "Apr", monthIdx: 3, year: 2026, days: 30, workingDays: 24 },
  { name: "May 2026", short: "May", monthIdx: 4, year: 2026, days: 31, workingDays: 24 },
  { name: "June 2026", short: "Jun", monthIdx: 5, year: 2026, days: 30, workingDays: 24 },
  { name: "July 2026", short: "Jul", monthIdx: 6, year: 2026, days: 31, workingDays: 25 },
  { name: "August 2026", short: "Aug", monthIdx: 7, year: 2026, days: 31, workingDays: 24 },
  { name: "September 2026", short: "Sep", monthIdx: 8, year: 2026, days: 30, workingDays: 24 },
  { name: "October 2026", short: "Oct", monthIdx: 9, year: 2026, days: 31, workingDays: 25 },
  { name: "November 2026", short: "Nov", monthIdx: 10, year: 2026, days: 30, workingDays: 23 },
  { name: "December 2026", short: "Dec", monthIdx: 11, year: 2026, days: 31, workingDays: 24 },
];

export const getDayOfWeekName = (year: number, monthIdx: number, day: number): string => {
  const dt = new Date(year, monthIdx, day);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][dt.getDay()];
};

export const computeStudentMonthStats = (
  num: number,
  status: "Present" | "Absent" | "Late",
  remarks: string,
  totalWorkingDays = 24
) => {
  if (status === "Absent") {
    const isSick = remarks.toLowerCase().includes("sick") || remarks.toLowerCase().includes("fever");
    const absent = isSick ? 5 : 4;
    const late = 1;
    const present = Math.max(0, totalWorkingDays - absent - late);
    return { monthPresentCount: present, monthAbsentCount: absent, monthLateCount: late };
  } else if (status === "Late") {
    const late = 2;
    const absent = 1;
    const present = Math.max(0, totalWorkingDays - absent - late);
    return { monthPresentCount: present, monthAbsentCount: absent, monthLateCount: late };
  } else {
    const absent = num % 7 === 0 ? 2 : num % 5 === 0 ? 1 : 0;
    const late = num % 11 === 0 ? 1 : 0;
    const present = Math.max(0, totalWorkingDays - absent - late);
    return { monthPresentCount: present, monthAbsentCount: absent, monthLateCount: late };
  }
};

// Initial 48 students seeded from reference image
const RAW_SEED_STUDENTS: Omit<StudentAttendanceRow, "monthPresentCount" | "monthAbsentCount" | "monthLateCount">[] = [
  { id: "st-1", num: 1, rollNo: "CSE001", studentName: "Aarav Sharma", status: "Present", remarks: "-", studentUid: "demo-st-1", isConnected: true },
  { id: "st-2", num: 2, rollNo: "CSE002", studentName: "Sneha Reddy", status: "Present", remarks: "-", studentUid: "demo-st-2", isConnected: true },
  { id: "st-3", num: 3, rollNo: "CSE003", studentName: "Rohit Kumar", status: "Absent", remarks: "Sick", studentUid: "demo-st-3", isConnected: true },
  { id: "st-4", num: 4, rollNo: "CSE004", studentName: "Priya Singh", status: "Present", remarks: "-", studentUid: "demo-st-4", isConnected: true },
  { id: "st-5", num: 5, rollNo: "CSE005", studentName: "Karan Mehta", status: "Late", remarks: "10 mins late", studentUid: "demo-st-5", isConnected: true },
  { id: "st-6", num: 6, rollNo: "CSE006", studentName: "Ananya Verma", status: "Present", remarks: "-" },
  { id: "st-7", num: 7, rollNo: "CSE007", studentName: "Vikram Patel", status: "Present", remarks: "-" },
  { id: "st-8", num: 8, rollNo: "CSE008", studentName: "Neha Gupta", status: "Present", remarks: "-" },
  { id: "st-9", num: 9, rollNo: "CSE009", studentName: "Siddharth Rao", status: "Absent", remarks: "Family emergency" },
  { id: "st-10", num: 10, rollNo: "CSE010", studentName: "Isha Kapoor", status: "Present", remarks: "-" },
  // Additional students to complete 48 total
  { id: "st-11", num: 11, rollNo: "CSE011", studentName: "Aditya Roy", status: "Present", remarks: "-" },
  { id: "st-12", num: 12, rollNo: "CSE012", studentName: "Tanvi Deshmukh", status: "Present", remarks: "-" },
  { id: "st-13", num: 13, rollNo: "CSE013", studentName: "Kabir Joshi", status: "Present", remarks: "-" },
  { id: "st-14", num: 14, rollNo: "CSE014", studentName: "Riya Sen", status: "Present", remarks: "-" },
  { id: "st-15", num: 15, rollNo: "CSE015", studentName: "Manish Tiwari", status: "Present", remarks: "-" },
  { id: "st-16", num: 16, rollNo: "CSE016", studentName: "Pooja Hegde", status: "Present", remarks: "-" },
  { id: "st-17", num: 17, rollNo: "CSE017", studentName: "Rahul Dravid", status: "Present", remarks: "-" },
  { id: "st-18", num: 18, rollNo: "CSE018", studentName: "Simran Kaur", status: "Present", remarks: "-" },
  { id: "st-19", num: 19, rollNo: "CSE019", studentName: "Varun Dhawan", status: "Present", remarks: "-" },
  { id: "st-20", num: 20, rollNo: "CSE020", studentName: "Meera Nambiar", status: "Present", remarks: "-" },
  { id: "st-21", num: 21, rollNo: "CSE021", studentName: "Harsh Vardhan", status: "Present", remarks: "-" },
  { id: "st-22", num: 22, rollNo: "CSE022", studentName: "Deepika Padukone", status: "Present", remarks: "-" },
  { id: "st-23", num: 23, rollNo: "CSE023", studentName: "Arjun Rampal", status: "Present", remarks: "-" },
  { id: "st-24", num: 24, rollNo: "CSE024", studentName: "Alia Bhatt", status: "Present", remarks: "-" },
  { id: "st-25", num: 25, rollNo: "CSE025", studentName: "Ranbir Kapoor", status: "Present", remarks: "-" },
  { id: "st-26", num: 26, rollNo: "CSE026", studentName: "Kriti Sanon", status: "Present", remarks: "-" },
  { id: "st-27", num: 27, rollNo: "CSE027", studentName: "Ayushmann Khurrana", status: "Absent", remarks: "Doctor appointment" },
  { id: "st-28", num: 28, rollNo: "CSE028", studentName: "Shraddha Kapoor", status: "Present", remarks: "-" },
  { id: "st-29", num: 29, rollNo: "CSE029", studentName: "Rajkummar Rao", status: "Present", remarks: "-" },
  { id: "st-30", num: 30, rollNo: "CSE030", studentName: "Bhumi Pednekar", status: "Present", remarks: "-" },
  { id: "st-31", num: 31, rollNo: "CSE031", studentName: "Vicky Kaushal", status: "Present", remarks: "-" },
  { id: "st-32", num: 32, rollNo: "CSE032", studentName: "Kiara Advani", status: "Present", remarks: "-" },
  { id: "st-33", num: 33, rollNo: "CSE033", studentName: "Kartik Aaryan", status: "Late", remarks: "Bus breakdown" },
  { id: "st-34", num: 34, rollNo: "CSE034", studentName: "Sara Ali Khan", status: "Present", remarks: "-" },
  { id: "st-35", num: 35, rollNo: "CSE035", studentName: "Ishaan Khatter", status: "Present", remarks: "-" },
  { id: "st-36", num: 36, rollNo: "CSE036", studentName: "Janhvi Kapoor", status: "Present", remarks: "-" },
  { id: "st-37", num: 37, rollNo: "CSE037", studentName: "Siddhant Chaturvedi", status: "Present", remarks: "-" },
  { id: "st-38", num: 38, rollNo: "CSE038", studentName: "Tara Sutaria", status: "Present", remarks: "-" },
  { id: "st-39", num: 39, rollNo: "CSE039", studentName: "Abhimanyu Dassani", status: "Present", remarks: "-" },
  { id: "st-40", num: 40, rollNo: "CSE040", studentName: "Sharvari Wagh", status: "Present", remarks: "-" },
  { id: "st-41", num: 41, rollNo: "CSE041", studentName: "Rohit Saraf", status: "Present", remarks: "-" },
  { id: "st-42", num: 42, rollNo: "CSE042", studentName: "Pashmina Roshan", status: "Present", remarks: "-" },
  { id: "st-43", num: 43, rollNo: "CSE043", studentName: "Ibrahim Ali Khan", status: "Present", remarks: "-" },
  { id: "st-44", num: 44, rollNo: "CSE044", studentName: "Shanaya Kapoor", status: "Present", remarks: "-" },
  { id: "st-45", num: 45, rollNo: "CSE045", studentName: "Agastya Nanda", status: "Present", remarks: "-" },
  { id: "st-46", num: 46, rollNo: "CSE046", studentName: "Suhana Khan", status: "Present", remarks: "-" },
  { id: "st-47", num: 47, rollNo: "CSE047", studentName: "Khushi Kapoor", status: "Absent", remarks: "Fever" },
  { id: "st-48", num: 48, rollNo: "CSE048", studentName: "Vedang Raina", status: "Present", remarks: "-" },
];

const SEED_STUDENTS: StudentAttendanceRow[] = RAW_SEED_STUDENTS.map((s) => {
  const m = computeStudentMonthStats(s.num, s.status, s.remarks, 24);
  return {
    ...s,
    monthPresentCount: m.monthPresentCount,
    monthAbsentCount: m.monthAbsentCount,
    monthLateCount: m.monthLateCount,
  };
});

const DEPARTMENTS = ["CSE", "ECE", "ME", "Civil", "IT", "EEE"];
export const SUBJECTS = [
  "Data Structures",
  "Algorithms",
  "Operating Systems",
  "Database Management",
  "Computer Networks",
  "AI & Machine Learning",
];
const SECTIONS = ["A", "B", "C"];

export interface SubjectConfig {
  id: string;
  name: string;
  code: string;
  faculty: string;
  totalClasses: number;
  color: string;
  bgLight: string;
}

export const SUBJECT_CONFIGS: SubjectConfig[] = [
  { id: "ds", name: "Data Structures", code: "CSE-301", faculty: "Prof. Ganesh Sharma", totalClasses: 24, color: "#2563EB", bgLight: "#EFF6FF" },
  { id: "algo", name: "Algorithms", code: "CSE-302", faculty: "Dr. S. Ramesh", totalClasses: 26, color: "#7C3AED", bgLight: "#F5F3FF" },
  { id: "os", name: "Operating Systems", code: "CSE-303", faculty: "Prof. Meenakshi Rao", totalClasses: 22, color: "#059669", bgLight: "#ECFDF5" },
  { id: "dbms", name: "Database Management", code: "CSE-304", faculty: "Prof. Amit Kulkarni", totalClasses: 25, color: "#D97706", bgLight: "#FFFBEB" },
  { id: "cn", name: "Computer Networks", code: "CSE-305", faculty: "Dr. Preeti Sinha", totalClasses: 24, color: "#0891B2", bgLight: "#ECFEFF" },
  { id: "aiml", name: "AI & Machine Learning", code: "CSE-306", faculty: "Prof. R. V. Raman", totalClasses: 22, color: "#DC2626", bgLight: "#FEF2F2" },
];

export interface StudentSubjectStat {
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  faculty: string;
  totalClasses: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  percentage: number;
  isEligible: boolean;
  classesNeededFor75: number;
}

export const getStudentSubjectBreakdown = (
  student: StudentAttendanceRow,
  currentSubjectName: string,
  totalWorkingDays: number = 24
): StudentSubjectStat[] => {
  return SUBJECT_CONFIGS.map((sub, idx) => {
    let present = 0;
    let absent = 0;
    let late = 0;
    const total = sub.totalClasses;

    if (sub.name === currentSubjectName) {
      present = student.monthPresentCount ?? Math.max(0, total - 2);
      absent = student.monthAbsentCount ?? Math.max(0, total - present);
      late = student.monthLateCount ?? 0;
    } else {
      const hash = (student.num * 7 + idx * 11) % 20;
      if (student.status === "Absent") {
        absent = Math.min(total, 4 + (hash % 3));
        late = hash % 2 === 0 ? 1 : 0;
        present = Math.max(0, total - absent - late);
      } else if (student.num % 13 === 0) {
        absent = Math.min(total, 6 + (hash % 3));
        late = 2;
        present = Math.max(0, total - absent - late);
      } else if (student.num % 7 === 0) {
        absent = Math.min(total, 3 + (hash % 2));
        late = 1;
        present = Math.max(0, total - absent - late);
      } else {
        absent = hash % 5 === 0 ? 2 : hash % 3 === 0 ? 1 : 0;
        late = hash % 7 === 0 ? 1 : 0;
        present = Math.max(0, total - absent - late);
      }
    }

    const pct = total > 0 ? Number(((present / total) * 100).toFixed(1)) : 100;
    const isEligible = pct >= 75;
    const needed = isEligible ? 0 : Math.max(0, Math.ceil(3 * total - 4 * present));

    return {
      subjectId: sub.id,
      subjectName: sub.name,
      subjectCode: sub.code,
      faculty: sub.faculty,
      totalClasses: total,
      presentCount: present,
      absentCount: absent,
      lateCount: late,
      percentage: pct,
      isEligible,
      classesNeededFor75: needed,
    };
  });
};

export default function AdminAttendanceScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const { isDark, colors } = useAppTheme();
  const { t } = useLanguage();

  // Navigation State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [academicsExpanded, setAcademicsExpanded] = useState(true);

  // Filter State
  const [selectedDept, setSelectedDept] = useState("CSE");
  const [selectedSubject, setSelectedSubject] = useState("Data Structures");
  const [selectedSection, setSelectedSection] = useState("A");
  const [selectedMonth, setSelectedMonth] = useState("September 2026");
  const [selectedDay, setSelectedDay] = useState(28);
  const [selectedDate, setSelectedDate] = useState("Sep 28, 2026");
  const [viewScope, setViewScope] = useState<"combined" | "daily" | "monthly" | "subjects">("combined");
  const [studentMonthlyModal, setStudentMonthlyModal] = useState<StudentAttendanceRow | null>(null);
  const [modalActiveTab, setModalActiveTab] = useState<"calendar" | "subjects">("calendar");

  // Connected Students Filter
  const [connectedFilterOnly, setConnectedFilterOnly] = useState(false);
  const [connectedStudentsList, setConnectedStudentsList] = useState<ConnectedStudentItem[]>([]);

  // Search & Pagination State
  const [searchStudent, setSearchStudent] = useState("");
  const [globalSearch, setGlobalSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Student Records Data State
  const [students, setStudents] = useState<StudentAttendanceRow[]>(SEED_STUDENTS);
  const [savingAttendance, setSavingAttendance] = useState(false);

  // Status Selector Modal State
  const [statusModalStudent, setStatusModalStudent] = useState<StudentAttendanceRow | null>(null);

  // Remarks Editor Modal State
  const [remarksModalStudent, setRemarksModalStudent] = useState<StudentAttendanceRow | null>(null);
  const [remarksInput, setRemarksInput] = useState("");

  // Add Student Modal State
  const [addStudentModalVisible, setAddStudentModalVisible] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentRollNo, setNewStudentRollNo] = useState("");
  const [newStudentDept, setNewStudentDept] = useState("CSE");
  const [newStudentSection, setNewStudentSection] = useState("A");
  const [newStudentEmail, setNewStudentEmail] = useState("");
  const [newStudentStatus, setNewStudentStatus] = useState<"Present" | "Absent" | "Late">("Present");
  const [newStudentRemarks, setNewStudentRemarks] = useState("-");

  // Action Menu Modal State (row actions 3-dots)
  const [actionModalStudent, setActionModalStudent] = useState<StudentAttendanceRow | null>(null);

  // Deleted / Removed student tracker so snapshot does not bring back deleted seed/custom students
  const [deletedStudentIds, setDeletedStudentIds] = useState<string[]>([]);

  // Block / Unblock Modal State
  const [blockModalStudent, setBlockModalStudent] = useState<StudentAttendanceRow | null>(null);
  const [blockLoading, setBlockLoading] = useState(false);

  // Remove from Class Modal State
  const [removeModalStudent, setRemoveModalStudent] = useState<StudentAttendanceRow | null>(null);
  const [removeLoading, setRemoveLoading] = useState(false);

  // Permanently Delete Modal State
  const [deleteModalStudent, setDeleteModalStudent] = useState<StudentAttendanceRow | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // User Authentication & Role Protection
  const [currentUserRole, setCurrentUserRole] = useState<"teacher" | "admin" | "student">("teacher");
  const [currentUserName, setCurrentUserName] = useState<string>("Prof. Ganesh Sharma");
  const [isAuthorized, setIsAuthorized] = useState<boolean>(true);
  const [authChecking, setAuthChecking] = useState<boolean>(true);

  // Authenticate user & check teacher/admin role
  useEffect(() => {
    let isMounted = true;
    const checkRole = async () => {
      try {
        const user = auth.currentUser;
        if (!user) {
          if (isMounted) {
            setCurrentUserRole("teacher");
            setCurrentUserName("Prof. Ganesh Sharma");
            setIsAuthorized(true);
            setAuthChecking(false);
          }
          return;
        }

        const email = (user.email || "").toLowerCase();
        const userSnap = await getDoc(doc(db, "users", user.uid));

        let detectedRole: "teacher" | "admin" | "student" = "student";
        let detectedName = user.displayName || "User";

        if (userSnap.exists()) {
          const uData = userSnap.data();
          detectedName = uData.fullName || user.displayName || detectedName;
          if (uData.role === "admin" || email.includes("admin")) {
            detectedRole = "admin";
          } else if (uData.role === "teacher" || uData.isTeacher || email.includes("teacher") || email.includes("faculty")) {
            detectedRole = "teacher";
          } else {
            detectedRole = "student";
          }
        } else {
          if (email.includes("admin")) detectedRole = "admin";
          else if (email.includes("teacher") || email.includes("faculty")) detectedRole = "teacher";
          else detectedRole = "student";
        }

        if (isMounted) {
          setCurrentUserRole(detectedRole);
          setCurrentUserName(detectedName);
          setIsAuthorized(detectedRole === "teacher" || detectedRole === "admin");
          setAuthChecking(false);
        }
      } catch (err) {
        console.warn("Auth role check error in attendence.tsx:", err);
        if (isMounted) {
          setIsAuthorized(true);
          setAuthChecking(false);
        }
      }
    };

    checkRole();
    return () => {
      isMounted = false;
    };
  }, []);

  const ensureAuthorized = (): boolean => {
    if (!isAuthorized || currentUserRole === "student") {
      Alert.alert(
        "Permission Denied 🔒",
        "Only teachers and administrators can mark or change student attendance.\n\nStudents have read-only access to view attendance."
      );
      return false;
    }
    return true;
  };

  // One-tap mark all present for active subject
  const handleBulkMarkPresent = () => {
    if (!ensureAuthorized()) return;
    setStudents((prev) =>
      prev.map((s) => ({
        ...s,
        status: "Present",
        monthPresentCount: (s.monthPresentCount ?? 22) + (s.status !== "Present" ? 1 : 0),
        monthAbsentCount: Math.max(0, (s.monthAbsentCount ?? 2) - (s.status === "Absent" ? 1 : 0)),
        monthLateCount: Math.max(0, (s.monthLateCount ?? 0) - (s.status === "Late" ? 1 : 0)),
      }))
    );
    Alert.alert(
      "Marked All Present ✓",
      `All ${students.length} students set to Present for ${selectedSubject}.\n\nTap "Mark Attendance" to save and sync with student academic profiles.`
    );
  };

  // One-tap mark all absent for active subject
  const handleBulkMarkAbsent = () => {
    if (!ensureAuthorized()) return;
    setStudents((prev) =>
      prev.map((s) => ({
        ...s,
        status: "Absent",
        monthPresentCount: Math.max(0, (s.monthPresentCount ?? 22) - (s.status === "Present" ? 1 : 0)),
        monthAbsentCount: (s.monthAbsentCount ?? 2) + (s.status !== "Absent" ? 1 : 0),
        monthLateCount: Math.max(0, (s.monthLateCount ?? 0) - (s.status === "Late" ? 1 : 0)),
      }))
    );
    Alert.alert(
      "Marked All Absent ✗",
      `All ${students.length} students set to Absent for ${selectedSubject}.\n\nTap "Mark Attendance" to save and sync with student academic profiles.`
    );
  };

  // Dropdown Pickers
  const [activePicker, setActivePicker] = useState<"department" | "subject" | "section" | "month" | "day" | null>(null);

  // Month Configuration & Helpers
  const currentMonthConfig = useMemo(() => {
    return ACADEMIC_MONTHS.find((m) => m.name === selectedMonth) || ACADEMIC_MONTHS[8];
  }, [selectedMonth]);

  const monthWorkingDays = currentMonthConfig.workingDays;
  const selectedDayOfWeek = useMemo(() => {
    return getDayOfWeekName(currentMonthConfig.year, currentMonthConfig.monthIdx, selectedDay);
  }, [currentMonthConfig, selectedDay]);

  const handlePrevDay = () => {
    setSelectedDay((prev) => {
      const nextDay = Math.max(1, prev - 1);
      setSelectedDate(`${currentMonthConfig.short} ${nextDay < 10 ? "0" + nextDay : nextDay}, ${currentMonthConfig.year}`);
      return nextDay;
    });
  };

  const handleNextDay = () => {
    setSelectedDay((prev) => {
      const nextDay = Math.min(currentMonthConfig.days, prev + 1);
      setSelectedDate(`${currentMonthConfig.short} ${nextDay < 10 ? "0" + nextDay : nextDay}, ${currentMonthConfig.year}`);
      return nextDay;
    });
  };

  const handleSelectDay = (day: number) => {
    setSelectedDay(day);
    setSelectedDate(`${currentMonthConfig.short} ${day < 10 ? "0" + day : day}, ${currentMonthConfig.year}`);
  };

  const handleSelectMonth = (monthName: string) => {
    setSelectedMonth(monthName);
    const mConfig = ACADEMIC_MONTHS.find((m) => m.name === monthName) || ACADEMIC_MONTHS[8];
    const validDay = Math.min(selectedDay, mConfig.days);
    setSelectedDay(validDay);
    setSelectedDate(`${mConfig.short} ${validDay < 10 ? "0" + validDay : validDay}, ${mConfig.year}`);
  };

  const handleSelectToday = () => {
    setSelectedMonth("September 2026");
    setSelectedDay(28);
    setSelectedDate("Sep 28, 2026");
  };

  // Firebase Realtime Listener & Initial Sync
  useEffect(() => {
    // 1. Auto-seed demo connected students for TEACH-CSE-101 if needed
    seedDefaultConnectedStudents();

    // 2. Real-time listener for students connected to teacher
    const unsubConnected = listenTeacherConnectedStudents("TEACH-CSE-101", (connectedItems) => {
      setConnectedStudentsList(connectedItems);
    });

    // 3. Real-time listener for all students in users collection
    const unsubUsers = onSnapshot(
      collection(db, "users"),
      (snapshot) => {
        const studentDocs = snapshot.docs
          .filter((d) => d.data().role === "student")
          .map((d) => ({ uid: d.id, ...d.data() }));

        const connectedUids = new Set(connectedStudentsList.map((c) => c.studentUid));
        const connectedRolls = new Set(connectedStudentsList.map((c) => (c.rollNo || "").toUpperCase()));

        // Merge seeded list with live Firestore data
        const merged: StudentAttendanceRow[] = SEED_STUDENTS.map((seed) => {
          const matchedUser: any = studentDocs.find(
            (u: any) =>
              (u.rollNo && u.rollNo.toUpperCase() === seed.rollNo.toUpperCase()) ||
              (u.fullName && u.fullName.toLowerCase() === seed.studentName.toLowerCase())
          );

          const isConn =
            connectedRolls.has(seed.rollNo.toUpperCase()) ||
            (matchedUser && connectedUids.has(matchedUser.uid)) ||
            (matchedUser && matchedUser.connectedTeacherIds && matchedUser.connectedTeacherIds.includes("TEACH-CSE-101")) ||
            seed.num <= 5; // Default top 5 connected

          const isBlocked = !!matchedUser?.isBlocked || matchedUser?.status === "blocked";
          const activeStatus = matchedUser?.lastAttendanceStatus || seed.status;
          const activeRemarks = matchedUser?.lastAttendanceRemarks || seed.remarks;
          const mStats = computeStudentMonthStats(seed.num, activeStatus as any, activeRemarks, 24);

          return {
            ...seed,
            studentUid: matchedUser ? matchedUser.uid : seed.studentUid || `demo-${seed.rollNo.toLowerCase()}`,
            isConnected: !!isConn,
            status: activeStatus,
            remarks: activeRemarks,
            isBlocked,
            monthPresentCount: mStats.monthPresentCount,
            monthAbsentCount: mStats.monthAbsentCount,
            monthLateCount: mStats.monthLateCount,
          };
        });

        // Also add any freshly connected Firestore students not in SEED_STUDENTS
        studentDocs.forEach((u: any, uIdx) => {
          const alreadyExists = merged.some(
            (m) =>
              m.studentUid === u.uid ||
              (u.rollNo && m.rollNo.toUpperCase() === u.rollNo.toUpperCase())
          );

          if (!alreadyExists) {
            const isConn =
              connectedUids.has(u.uid) ||
              (u.connectedTeacherIds && u.connectedTeacherIds.includes("TEACH-CSE-101"));

            const isBlocked = !!u.isBlocked || u.status === "blocked";
            const freshStatus = (u.lastAttendanceStatus as any) || "Present";
            const freshRemarks = u.lastAttendanceRemarks || "-";
            const mStats = computeStudentMonthStats(uIdx + 1, freshStatus, freshRemarks, 24);

            merged.unshift({
              id: u.uid,
              num: 0,
              rollNo: u.rollNo || `CSE10${uIdx + 1}`,
              studentName: u.fullName || u.name || "Student",
              status: freshStatus,
              remarks: freshRemarks,
              studentUid: u.uid,
              isConnected: !!isConn,
              department: u.department || "CSE",
              section: u.section || "A",
              isBlocked,
              monthPresentCount: mStats.monthPresentCount,
              monthAbsentCount: mStats.monthAbsentCount,
              monthLateCount: mStats.monthLateCount,
            });
          }
        });

        // Filter out any student IDs marked as deleted/removed
        const filteredMerged = merged.filter((s) => {
          const isDeleted =
            deletedStudentIds.includes(s.id) ||
            (s.studentUid && deletedStudentIds.includes(s.studentUid)) ||
            (s.rollNo && deletedStudentIds.includes(s.rollNo.toUpperCase()));
          return !isDeleted;
        });

        // Re-number
        const numbered = filteredMerged.map((s, idx) => ({ ...s, num: idx + 1 }));
        setStudents(numbered);
      },
      (err) => {
        console.warn("Realtime user sync warning:", err);
      }
    );

    return () => {
      unsubConnected();
      unsubUsers();
    };
  }, [connectedStudentsList.length, deletedStudentIds]);

  // Load saved attendance for selectedDate if previously recorded
  useEffect(() => {
    let isMounted = true;
    const loadSavedAttendance = async () => {
      try {
        const q = query(
          collection(db, "attendance_logs"),
          where("date", "==", selectedDate),
          where("subject", "==", selectedSubject),
          where("section", "==", selectedSection)
        );
        const snap = await getDocs(q);
        if (!snap.empty && isMounted) {
          const latestDoc: any = snap.docs[snap.docs.length - 1].data();
          if (latestDoc.records && Array.isArray(latestDoc.records)) {
            const statusMap = new Map(latestDoc.records.map((r: any) => [r.rollNo, r]));
            setStudents((prev) =>
              prev.map((s) => {
                const saved: any = statusMap.get(s.rollNo);
                if (saved) {
                  return {
                    ...s,
                    status: saved.status || s.status,
                    remarks: saved.remarks || s.remarks,
                    monthPresentCount: saved.monthPresentCount ?? s.monthPresentCount,
                    monthAbsentCount: saved.monthAbsentCount ?? s.monthAbsentCount,
                    monthLateCount: saved.monthLateCount ?? s.monthLateCount,
                  };
                }
                return s;
              })
            );
          }
        }
      } catch (e) {
        console.warn("Could not fetch date attendance log:", e);
      }
    };
    loadSavedAttendance();
    return () => {
      isMounted = false;
    };
  }, [selectedDate, selectedSubject, selectedSection]);

  // Filtered Students based on search query and connected filter
  const filteredStudents = useMemo(() => {
    let result = students;
    if (connectedFilterOnly) {
      result = result.filter((s) => s.isConnected);
    }
    const q = searchStudent.trim().toLowerCase() || globalSearch.trim().toLowerCase();
    if (!q) return result;
    return result.filter(
      (s) =>
        s.studentName.toLowerCase().includes(q) ||
        s.rollNo.toLowerCase().includes(q) ||
        s.remarks.toLowerCase().includes(q)
    );
  }, [students, searchStudent, globalSearch, connectedFilterOnly]);

  // Pagination calculation
  const totalFiltered = filteredStudents.length;
  const totalPages = Math.max(1, Math.ceil(totalFiltered / pageSize));
  const pageStudents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredStudents.slice(start, start + pageSize);
  }, [filteredStudents, currentPage, pageSize]);

  // Statistics calculation
  const totalCount = students.length;
  const connectedCount = students.filter((s) => s.isConnected).length;

  // 1. DAY STATISTICS ("out of present in day and percentage")
  const presentCount = students.filter((s) => s.status === "Present").length;
  const absentCount = students.filter((s) => s.status === "Absent").length;
  const lateCount = students.filter((s) => s.status === "Late").length;

  const presentPercent = totalCount > 0 ? ((presentCount / totalCount) * 100).toFixed(1) : "0.0";
  const absentPercent = totalCount > 0 ? ((absentCount / totalCount) * 100).toFixed(1) : "0.0";
  const latePercent = totalCount > 0 ? ((lateCount / totalCount) * 100).toFixed(1) : "0.0";
  const dayAttendanceRate = presentPercent;

  // 2. MONTH STATISTICS ("absent and present in month ... and percentage")
  const monthTotalPossible = totalCount * monthWorkingDays;
  const monthTotalPresent = students.reduce((acc, s) => acc + (s.monthPresentCount ?? 22), 0);
  const monthTotalAbsent = students.reduce((acc, s) => acc + (s.monthAbsentCount ?? 2), 0);
  const monthTotalLate = students.reduce((acc, s) => acc + (s.monthLateCount ?? 0), 0);

  const monthPresentPercent = monthTotalPossible > 0 ? ((monthTotalPresent / monthTotalPossible) * 100).toFixed(1) : "0.0";
  const monthAbsentPercent = monthTotalPossible > 0 ? ((monthTotalAbsent / monthTotalPossible) * 100).toFixed(1) : "0.0";
  const monthLatePercent = monthTotalPossible > 0 ? ((monthTotalLate / monthTotalPossible) * 100).toFixed(1) : "0.0";
  const monthAttendanceRate = monthPresentPercent;
  const avgPresentPerDay = monthWorkingDays > 0 ? (monthTotalPresent / monthWorkingDays).toFixed(1) : "0";
  const avgAbsentPerDay = monthWorkingDays > 0 ? (monthTotalAbsent / monthWorkingDays).toFixed(1) : "0";

  // 3. SUBJECT-WISE STATISTICS (All 6 Subjects Present & Absent breakdown)
  const classSubjectSummaries = useMemo(() => {
    return SUBJECT_CONFIGS.map((sub) => {
      let totPresent = 0;
      let totAbsent = 0;
      let totLate = 0;
      let shortageCount = 0;
      const totalPossible = students.length * sub.totalClasses;

      students.forEach((st) => {
        const breakdown = getStudentSubjectBreakdown(st, selectedSubject, monthWorkingDays);
        const stat = breakdown.find((b) => b.subjectId === sub.id);
        if (stat) {
          totPresent += stat.presentCount;
          totAbsent += stat.absentCount;
          totLate += stat.lateCount;
          if (!stat.isEligible) shortageCount += 1;
        }
      });

      const pPct = totalPossible > 0 ? ((totPresent / totalPossible) * 100).toFixed(1) : "0.0";
      const aPct = totalPossible > 0 ? ((totAbsent / totalPossible) * 100).toFixed(1) : "0.0";
      const lPct = totalPossible > 0 ? ((totLate / totalPossible) * 100).toFixed(1) : "0.0";

      return {
        ...sub,
        totalPresent: totPresent,
        totalAbsent: totAbsent,
        totalLate: totLate,
        totalPossible,
        presentPct: pPct,
        absentPct: aPct,
        latePct: lPct,
        shortageCount,
        isCurrent: sub.name === selectedSubject,
      };
    });
  }, [students, selectedSubject, monthWorkingDays]);

  const selectedSubjectConfig = SUBJECT_CONFIGS.find((s) => s.name === selectedSubject);
  const selectedSubjectCode = selectedSubjectConfig?.code || "CS301";

  // Quick Status Switch & DIRECT PROFILE SYNC
  const updateStudentStatus = async (id: string, status: "Present" | "Absent" | "Late") => {
    if (!ensureAuthorized()) return;
    const targetStudent = students.find((s) => s.id === id);
    if (!targetStudent) return;
    const prevStatus = targetStudent.status;

    setStudents((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        let mPresent = s.monthPresentCount ?? 22;
        let mAbsent = s.monthAbsentCount ?? 2;
        let mLate = s.monthLateCount ?? 0;

        if (prevStatus !== status) {
          if (prevStatus === "Present") mPresent = Math.max(0, mPresent - 1);
          else if (prevStatus === "Absent") mAbsent = Math.max(0, mAbsent - 1);
          else if (prevStatus === "Late") mLate = Math.max(0, mLate - 1);

          if (status === "Present") mPresent += 1;
          else if (status === "Absent") mAbsent += 1;
          else if (status === "Late") mLate += 1;
        }

        return {
          ...s,
          status,
          monthPresentCount: mPresent,
          monthAbsentCount: mAbsent,
          monthLateCount: mLate,
        };
      })
    );
    setStatusModalStudent(null);

    // DIRECTLY UPDATE STUDENT PROFILE IN FIREBASE
    if (targetStudent) {
      const uid =
        targetStudent.studentUid ||
        (targetStudent.id.startsWith("st-")
          ? `demo-${targetStudent.rollNo.toLowerCase()}`
          : targetStudent.id);

      await syncAttendanceToStudentProfile({
        studentUid: uid,
        studentName: targetStudent.studentName,
        rollNo: targetStudent.rollNo,
        subject: selectedSubject,
        department: selectedDept,
        section: selectedSection,
        date: selectedDate,
        status,
        remarks: targetStudent.remarks,
        markedBy: currentUserName,
        markedByRole: currentUserRole === "admin" ? "admin" : "teacher",
      });
    }
  };

  // Re-change student attendance for any specific subject (Teacher/Admin only)
  const rechangeSubjectAttendanceInModal = async (
    targetStudent: StudentAttendanceRow,
    subjectName: string,
    newStatus: "Present" | "Absent" | "Late"
  ) => {
    if (!ensureAuthorized()) return;

    if (subjectName === selectedSubject) {
      await updateStudentStatus(targetStudent.id, newStatus);
    } else {
      const uid =
        targetStudent.studentUid ||
        (targetStudent.id.startsWith("st-")
          ? `demo-${targetStudent.rollNo.toLowerCase()}`
          : targetStudent.id);

      await syncAttendanceToStudentProfile({
        studentUid: uid,
        studentName: targetStudent.studentName,
        rollNo: targetStudent.rollNo,
        subject: subjectName,
        department: selectedDept,
        section: selectedSection,
        date: selectedDate,
        status: newStatus,
        remarks: `Re-changed to ${newStatus} by ${currentUserName}`,
        markedBy: currentUserName,
        markedByRole: currentUserRole === "admin" ? "admin" : "teacher",
      });
    }

    setStudentMonthlyModal((prev) => {
      if (!prev) return null;
      let mPresent = prev.monthPresentCount ?? 22;
      let mAbsent = prev.monthAbsentCount ?? 2;
      let mLate = prev.monthLateCount ?? 0;

      if (subjectName === selectedSubject) {
        if (newStatus === "Present") {
          mPresent += 1;
          mAbsent = Math.max(0, mAbsent - 1);
        } else if (newStatus === "Absent") {
          mAbsent += 1;
          mPresent = Math.max(0, mPresent - 1);
        } else {
          mLate += 1;
        }
      }

      return {
        ...prev,
        status: subjectName === selectedSubject ? newStatus : prev.status,
        monthPresentCount: mPresent,
        monthAbsentCount: mAbsent,
        monthLateCount: mLate,
      };
    });

    Alert.alert(
      "Attendance Re-changed ✓",
      `${targetStudent.studentName} (${targetStudent.rollNo}) marked as ${newStatus} in ${subjectName}.\n\nRe-changed by: ${currentUserName} (${currentUserRole.toUpperCase()})`
    );
  };

  // Update Remarks
  const saveRemarks = () => {

    if (!ensureAuthorized()) return;
    if (!remarksModalStudent) return;
    setStudents((prev) =>
      prev.map((s) =>
        s.id === remarksModalStudent.id
          ? { ...s, remarks: remarksInput.trim() || "-" }
          : s
      )
    );
    setRemarksModalStudent(null);
    setRemarksInput("");
  };

  // Add Student Handler
  const handleAddStudent = async () => {
    if (!ensureAuthorized()) return;
    if (!newStudentName.trim()) {
      Alert.alert("Required", "Please enter the student's name.");
      return;
    }
    if (!newStudentRollNo.trim()) {
      Alert.alert("Required", "Please enter the student's roll number.");
      return;
    }

    const cleanName = newStudentName.trim();
    const cleanRoll = newStudentRollNo.trim().toUpperCase();
    const cleanEmail =
      newStudentEmail.trim().toLowerCase() ||
      `${cleanRoll.toLowerCase()}@campusly.edu`;
    const newUid = `user-${Date.now()}`;

    const mStats = computeStudentMonthStats(1, newStudentStatus, newStudentRemarks, 24);
    const newStudent: StudentAttendanceRow = {
      id: `st-custom-${Date.now()}`,
      num: 1,
      rollNo: cleanRoll,
      studentName: cleanName,
      status: newStudentStatus,
      remarks: newStudentRemarks.trim() || "-",
      studentUid: newUid,
      isConnected: true,
      department: newStudentDept,
      section: newStudentSection,
      monthPresentCount: mStats.monthPresentCount,
      monthAbsentCount: mStats.monthAbsentCount,
      monthLateCount: mStats.monthLateCount,
    };

    // Prepend to students list & re-number
    setStudents((prev) => {
      const updated = [newStudent, ...prev];
      return updated.map((s, idx) => ({ ...s, num: idx + 1 }));
    });

    // Save to Firestore under teacher's connected students & sync initial attendance
    try {
      await setDoc(
        doc(db, "teacherCodes", "TEACH-CSE-101", "students", newUid),
        {
          studentUid: newUid,
          studentName: cleanName,
          studentEmail: cleanEmail,
          rollNo: cleanRoll,
          department: newStudentDept,
          section: newStudentSection,
          connectedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Directly sync initial attendance record to student profile in Firebase
      await syncAttendanceToStudentProfile({
        studentUid: newUid,
        studentName: cleanName,
        rollNo: cleanRoll,
        subject: selectedSubject,
        department: newStudentDept,
        section: newStudentSection,
        date: selectedDate,
        status: newStudentStatus,
        remarks: newStudentRemarks.trim() || "-",
        markedBy: "Prof. Ganesh Sharma",
      });
    } catch (fsErr) {
      console.warn("Save student to Firestore warning:", fsErr);
    }

    setAddStudentModalVisible(false);
    setNewStudentName("");
    setNewStudentRollNo("");
    setNewStudentEmail("");
    setNewStudentRemarks("-");

    Alert.alert(
      "Student Added Successfully! 🎉",
      `${cleanName} (${cleanRoll}) is now enrolled in ${newStudentDept} - Sec ${newStudentSection}.\n\nTheir initial attendance status (${newStudentStatus}) has been synchronized directly with their profile.`
    );
  };

  // Remove Student Handler (removes from current attendance sheet & teacher connection)
  const openRemoveStudentModal = (student: StudentAttendanceRow) => {
    setActionModalStudent(null);
    setRemoveModalStudent(student);
  };

  const handleRemoveStudent = (student: StudentAttendanceRow) => {
    openRemoveStudentModal(student);
  };

  const handleConfirmRemoveStudent = async () => {
    if (!removeModalStudent) return;
    try {
      setRemoveLoading(true);
      const student = removeModalStudent;
      const targetUid = student.studentUid || student.id;

      // Track as removed so snapshot listener ignores them
      setDeletedStudentIds((prev) => [
        ...prev,
        student.id,
        ...(targetUid ? [targetUid] : []),
        student.rollNo.toUpperCase(),
      ]);

      // Remove from local state and re-index
      setStudents((prev) => {
        const remaining = prev.filter((s) => s.id !== student.id);
        return remaining.map((s, idx) => ({ ...s, num: idx + 1 }));
      });

      // Delete from Firestore teacher connection if exists
      if (student.studentUid && !student.studentUid.startsWith("demo-")) {
        try {
          await deleteDoc(
            doc(db, "teacherCodes", "TEACH-CSE-101", "students", student.studentUid)
          );
        } catch (delErr) {
          console.warn("Remove teacher student doc warning:", delErr);
        }
      }

      setRemoveModalStudent(null);
      Alert.alert(
        "Student Removed",
        `${student.studentName} (${student.rollNo}) has been removed from today's attendance sheet.`
      );
    } catch (err: any) {
      console.warn("Remove student error:", err);
      Alert.alert("Error", err?.message || "Failed to remove student.");
    } finally {
      setRemoveLoading(false);
    }
  };

  // Permanently Delete Student Handler (deletes user from Firebase entirely)
  const openDeleteStudentModal = (student: StudentAttendanceRow) => {
    setActionModalStudent(null);
    setDeleteModalStudent(student);
  };

  const handleConfirmDeleteStudent = async () => {
    if (!deleteModalStudent) return;
    try {
      setDeleteLoading(true);
      const student = deleteModalStudent;
      const targetUid = student.studentUid || student.id;

      // Track in deleted list
      setDeletedStudentIds((prev) => [
        ...prev,
        student.id,
        ...(targetUid ? [targetUid] : []),
        student.rollNo.toUpperCase(),
      ]);

      // 1. Remove from local state and re-index
      setStudents((prev) => {
        const remaining = prev.filter((s) => s.id !== student.id);
        return remaining.map((s, idx) => ({ ...s, num: idx + 1 }));
      });

      // 2. Delete from users collection if valid
      if (targetUid && !targetUid.startsWith("demo-")) {
        try {
          await deleteDoc(doc(db, "users", targetUid));
        } catch (delErr) {
          console.warn("Delete users doc warning:", delErr);
        }
      }

      // 3. Delete from teacherCodes
      try {
        if (targetUid) {
          await deleteDoc(
            doc(db, "teacherCodes", "TEACH-CSE-101", "students", targetUid)
          );
          await deleteDoc(
            doc(db, "teacherConnections", `TEACH-CSE-101_${targetUid}`)
          );
        }
      } catch {}

      // 4. Log activity
      try {
        await addDoc(collection(db, "activities"), {
          title: `Permanently Deleted Student: ${student.studentName} (${student.rollNo})`,
          time: "Just now",
          user: "Admin",
          type: "students",
          createdAt: serverTimestamp(),
        });
      } catch {}

      setDeleteModalStudent(null);
      Alert.alert(
        "Student Permanently Deleted",
        `${student.studentName} (${student.rollNo}) has been deleted from Firebase database.`
      );
    } catch (err: any) {
      console.warn("Delete student error:", err);
      Alert.alert("Error", err?.message || "Failed to delete student.");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Block / Unblock Student Handler
  const openBlockStudentModal = (student: StudentAttendanceRow) => {
    setActionModalStudent(null);
    setBlockModalStudent(student);
  };

  const handleConfirmBlockStudent = async () => {
    if (!blockModalStudent) return;
    try {
      setBlockLoading(true);
      const student = blockModalStudent;
      const nextBlocked = !student.isBlocked;
      const targetUid = student.studentUid || student.id;

      // Update in Firestore users collection if targetUid exists
      if (targetUid && !targetUid.startsWith("demo-")) {
        try {
          await updateDoc(doc(db, "users", targetUid), {
            isBlocked: nextBlocked,
            status: nextBlocked ? "blocked" : "active",
            updatedAt: serverTimestamp(),
          });
        } catch (uErr) {
          console.warn("Update user doc for block status:", uErr);
        }
      }

      // Also try updating teacherCodes
      try {
        if (targetUid) {
          await updateDoc(doc(db, "teacherCodes", "TEACH-CSE-101", "students", targetUid), {
            isBlocked: nextBlocked,
            status: nextBlocked ? "blocked" : "active",
          });
        }
      } catch {}

      // Log activity
      try {
        await addDoc(collection(db, "activities"), {
          title: `${nextBlocked ? "Blocked" : "Unblocked"} Student: ${student.studentName}`,
          time: "Just now",
          user: "Admin",
          type: "attendance",
          createdAt: serverTimestamp(),
        });
      } catch {}

      // Update local state immediately
      setStudents((prev) =>
        prev.map((s) => (s.id === student.id ? { ...s, isBlocked: nextBlocked } : s))
      );

      setBlockModalStudent(null);
      Alert.alert(
        nextBlocked ? "Student Blocked" : "Student Unblocked",
        `${student.studentName} (${student.rollNo}) has been ${
          nextBlocked ? "blocked and cannot access classes or log in" : "unblocked and access is restored"
        }.`
      );
    } catch (err: any) {
      console.warn("Block student error:", err);
      Alert.alert("Error", err?.message || "Failed to update block status.");
    } finally {
      setBlockLoading(false);
    }
  };

  // Mark Attendance / Save to Firebase & DIRECTLY UPDATE ALL STUDENT PROFILES
  const handleMarkAttendance = async () => {
    if (!ensureAuthorized()) return;
    setSavingAttendance(true);
    try {
      const attendancePayload = {
        department: selectedDept,
        subject: selectedSubject,
        section: selectedSection,
        date: selectedDate,
        day: selectedDay,
        month: selectedMonth,
        dayOfWeek: selectedDayOfWeek,
        totalStudents: totalCount,
        // Day out of present and percentage
        dayPresentCount: presentCount,
        dayAbsentCount: absentCount,
        dayLateCount: lateCount,
        dayPresentRate: `${presentPercent}%`,
        dayAbsentRate: `${absentPercent}%`,
        // Month absent and present and percentage
        monthTotalPossible,
        monthPresentCount: monthTotalPresent,
        monthAbsentCount: monthTotalAbsent,
        monthLateCount: monthTotalLate,
        monthAttendanceRate: `${monthPresentPercent}%`,
        monthAbsentRate: `${monthAbsentPercent}%`,
        markedBy: currentUserName,
        markedByRole: currentUserRole === "admin" ? "admin" : "teacher",
        markedAt: serverTimestamp(),
        records: students.map((s) => ({
          rollNo: s.rollNo,
          studentName: s.studentName,
          status: s.status,
          remarks: s.remarks,
          studentUid: s.studentUid || s.id,
          isConnected: s.isConnected || false,
          monthPresentCount: s.monthPresentCount ?? 22,
          monthAbsentCount: s.monthAbsentCount ?? 2,
          monthLateCount: s.monthLateCount ?? 0,
          monthAttendancePct: monthWorkingDays > 0 ? (((s.monthPresentCount ?? 22) / monthWorkingDays) * 100).toFixed(1) : "91.7",
        })),
      };

      await addDoc(collection(db, "attendance_logs"), attendancePayload);

      // DIRECTLY UPDATE EVERY STUDENT'S PROFILE IN FIRESTORE
      for (const s of students) {
        const uid =
          s.studentUid ||
          (s.id.startsWith("st-") ? `demo-${s.rollNo.toLowerCase()}` : s.id);

        await syncAttendanceToStudentProfile({
          studentUid: uid,
          studentName: s.studentName,
          rollNo: s.rollNo,
          subject: selectedSubject,
          department: selectedDept,
          section: selectedSection,
          date: selectedDate,
          status: s.status,
          remarks: s.remarks,
          markedBy: currentUserName,
          markedByRole: currentUserRole === "admin" ? "admin" : "teacher",
        });
      }

      Alert.alert(
        "Attendance Marked & Updated in Student Profiles! ✓",
        `Attendance for ${selectedSubject} (${selectedDept} - Sec ${selectedSection}) on ${selectedDate} has been saved.\n\n` +
          `• DAY ATTENDANCE (${selectedDayOfWeek}):\n` +
          `  - Present: ${presentCount} out of ${totalCount} (${presentPercent}%)\n` +
          `  - Absent: ${absentCount} out of ${totalCount} (${absentPercent}%)\n` +
          `  - Late: ${lateCount} out of ${totalCount} (${latePercent}%)\n\n` +
          `• MONTH ATTENDANCE (${selectedMonth}):\n` +
          `  - Present: ${monthTotalPresent} out of ${monthTotalPossible} (${monthPresentPercent}%)\n` +
          `  - Absent: ${monthTotalAbsent} out of ${monthTotalPossible} (${monthAbsentPercent}%)\n` +
          `  - Overall Month Rate: ${monthPresentPercent}%\n\n` +
          `Directly updated in Student Profiles in real-time.`
      );
    } catch (e: any) {
      console.warn("Attendance save warning:", e);
      Alert.alert(
        "Attendance Saved Locally",
        `Attendance records for ${selectedDept} - ${selectedSubject} have been updated in Campusly.`
      );
    } finally {
      setSavingAttendance(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safeArea, { backgroundColor: colors.adminSidebar }]} edges={["top", "left", "right"]}>
      <View style={[styles.outerLayout, { backgroundColor: colors.adminBg }]}>
        <AdminSidebar
          activeNav="attendance"
          isDesktop={isDesktop}
          mobileMenuOpen={mobileMenuOpen}
          onCloseMobileMenu={() => setMobileMenuOpen(false)}
        />

        {/* Main Content Area */}
        <View style={[styles.mainContent, { backgroundColor: colors.adminBg }]}>
          <AdminTopBar
            showSearch={true}
            searchQuery={globalSearch}
            onSearchChange={setGlobalSearch}
            searchPlaceholder="Search students, subjects, or anything..."
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
          />

          {/* Scrollable Dashboard Body */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollBody}
          >
            {/* Title & Subtitle */}
            <View style={styles.pageTitleBlock}>
              <Text style={[styles.pageMainHeading, { color: colors.adminText }]}>Attendance</Text>
              <Text style={[styles.pageSubHeading, { color: colors.adminTextSecondary }]}>
                Mark attendance for your classes and keep track of your students.
              </Text>
              {/* Breadcrumb: Home > Dashboard > Attendance */}
              <View style={styles.breadcrumbRow}>
                <Ionicons name="home-outline" size={13} color={colors.adminTextSecondary} />
                <Ionicons name="chevron-forward" size={11} color={colors.adminTextSecondary} style={{ marginHorizontal: 4 }} />
                <TouchableOpacity onPress={() => router.push("/admin")}>
                  <Text style={[styles.breadcrumbLink, { color: colors.adminTextSecondary }]}>Dashboard</Text>
                </TouchableOpacity>
                <Ionicons name="chevron-forward" size={11} color={colors.adminTextSecondary} style={{ marginHorizontal: 4 }} />
                <Text style={styles.breadcrumbActive}>Attendance</Text>
              </View>
            </View>

            {/* ROLE PERMISSION & ACCESS BANNER */}
            {!isAuthorized || currentUserRole === "student" ? (
              <View style={styles.studentRestrictedBanner}>
                <Ionicons name="lock-closed" size={20} color="#DC2626" />
                <View style={{ flex: 1 }}>
                  <Text style={styles.studentRestrictedTitle}>
                    🔒 Student Account (Read-Only Attendance View)
                  </Text>
                  <Text style={styles.studentRestrictedText}>
                    Only verified teachers and administrators are authorized to change or mark student attendance. Modifications are locked.
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.goToStudentAttendanceBtn}
                  onPress={() => router.push("/attendance")}
                >
                  <Text style={styles.goToStudentAttendanceText}>My Attendance</Text>
                  <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.authorizedRoleBanner}>
                <Ionicons
                  name={currentUserRole === "admin" ? "shield-checkmark" : "school"}
                  size={20}
                  color={currentUserRole === "admin" ? "#2563EB" : "#059669"}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.authorizedRoleTitle}>
                    {currentUserRole === "admin"
                      ? "🛡️ Administrator Attendance Mode"
                      : "👨‍🏫 Teacher Attendance Mode"}
                  </Text>
                  <Text style={styles.authorizedRoleText}>
                    Logged in as <Text style={{ fontWeight: "700" }}>{currentUserName}</Text> • Authorized to mark & change subject-wise attendance for {selectedSubject}.
                  </Text>
                </View>
              </View>
            )}

            {/* Filter Bar (Department, Subject, Section, Month, Day + Mark Attendance button) */}
            <View style={styles.filterRow}>
              {/* 1. Department */}
              <TouchableOpacity
                style={[styles.filterCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}
                onPress={() => setActivePicker("department")}
              >
                <Ionicons name="business" size={18} color="#4F46E5" style={styles.filterIcon} />
                <View style={styles.filterTextGroup}>
                  <Text style={[styles.filterFieldLabel, { color: colors.adminTextSecondary }]}>Department</Text>
                  <View style={styles.filterValRow}>
                    <Text style={[styles.filterValText, { color: colors.adminText }]}>{selectedDept}</Text>
                    <Ionicons name="chevron-down" size={14} color={colors.adminTextSecondary} style={{ marginLeft: 6 }} />
                  </View>
                </View>
              </TouchableOpacity>

              {/* 2. Subject */}
              <TouchableOpacity
                style={[styles.filterCard, { flex: 1.3, backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}
                onPress={() => setActivePicker("subject")}
              >
                <Ionicons name="book" size={18} color="#2563EB" style={styles.filterIcon} />
                <View style={styles.filterTextGroup}>
                  <Text style={[styles.filterFieldLabel, { color: colors.adminTextSecondary }]}>Subject</Text>
                  <View style={styles.filterValRow}>
                    <Text style={[styles.filterValText, { color: colors.adminText }]} numberOfLines={1}>
                      {selectedSubject}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color={colors.adminTextSecondary} style={{ marginLeft: 6 }} />
                  </View>
                </View>
              </TouchableOpacity>

              {/* 3. Section */}
              <TouchableOpacity
                style={[styles.filterCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}
                onPress={() => setActivePicker("section")}
              >
                <Ionicons name="people" size={18} color="#0284C7" style={styles.filterIcon} />
                <View style={styles.filterTextGroup}>
                  <Text style={[styles.filterFieldLabel, { color: colors.adminTextSecondary }]}>Section</Text>
                  <View style={styles.filterValRow}>
                    <Text style={[styles.filterValText, { color: colors.adminText }]}>{selectedSection}</Text>
                    <Ionicons name="chevron-down" size={14} color={colors.adminTextSecondary} style={{ marginLeft: 6 }} />
                  </View>
                </View>
              </TouchableOpacity>

              {/* 4. Month Selector */}
              <TouchableOpacity
                style={[styles.filterCard, { flex: 1.2, backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}
                onPress={() => setActivePicker("month")}
              >
                <Ionicons name="calendar" size={18} color="#2563EB" style={styles.filterIcon} />
                <View style={styles.filterTextGroup}>
                  <Text style={[styles.filterFieldLabel, { color: colors.adminTextSecondary }]}>Month</Text>
                  <View style={styles.filterValRow}>
                    <Text style={[styles.filterValText, { color: colors.adminText }]} numberOfLines={1}>
                      {selectedMonth}
                    </Text>
                    <Ionicons name="chevron-down" size={14} color={colors.adminTextSecondary} style={{ marginLeft: 6 }} />
                  </View>
                </View>
              </TouchableOpacity>

              {/* 5. Day Selector */}
              <TouchableOpacity
                style={[styles.filterCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}
                onPress={() => setActivePicker("day")}
              >
                <Ionicons name="today" size={18} color="#10B981" style={styles.filterIcon} />
                <View style={styles.filterTextGroup}>
                  <Text style={[styles.filterFieldLabel, { color: colors.adminTextSecondary }]}>Day</Text>
                  <View style={styles.filterValRow}>
                    <Text style={[styles.filterValText, { color: colors.adminText }]}>
                      Day {selectedDay} ({selectedDayOfWeek})
                    </Text>
                    <Ionicons name="chevron-down" size={14} color={colors.adminTextSecondary} style={{ marginLeft: 6 }} />
                  </View>
                </View>
              </TouchableOpacity>

              {/* 6. Mark Attendance Button */}
              <TouchableOpacity
                style={[styles.markAttendanceBtn, !isAuthorized && styles.disabledMarkBtn]}
                onPress={handleMarkAttendance}
                disabled={savingAttendance || !isAuthorized}
              >
                {savingAttendance ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                    <Text style={styles.markAttendanceBtnText}>Save Attendance</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* SUBJECT SELECTION PILLS & SUBJECT-WISE QUICK ACTIONS */}
            <View style={[styles.subjectSectionCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
              <View style={styles.subjectCardHeaderRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flex: 1 }}>
                  <Ionicons name="library" size={18} color="#2563EB" />
                  <Text style={[styles.subjectSelectorHeading, { color: colors.adminText }]}>
                    Subject: <Text style={{ color: "#2563EB" }}>{selectedSubject}</Text>
                  </Text>
                </View>

                {/* Quick Bulk Present & Absent buttons for Teachers/Admins */}
                <View style={styles.bulkActionsRow}>
                  <TouchableOpacity
                    style={[styles.bulkBtn, styles.bulkPresentBtn, !isAuthorized && styles.disabledBulkBtn]}
                    onPress={handleBulkMarkPresent}
                    disabled={!isAuthorized}
                  >
                    <Ionicons name="checkmark-done" size={14} color="#16A34A" />
                    <Text style={styles.bulkPresentText}>Mark All Present</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.bulkBtn, styles.bulkAbsentBtn, !isAuthorized && styles.disabledBulkBtn]}
                    onPress={handleBulkMarkAbsent}
                    disabled={!isAuthorized}
                  >
                    <Ionicons name="close" size={14} color="#DC2626" />
                    <Text style={styles.bulkAbsentText}>Mark All Absent</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Horizontal Scroll of Subject Pills */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.subjectPillsList}
              >
                {SUBJECT_CONFIGS.map((sub) => {
                  const isActive = selectedSubject === sub.name;
                  return (
                    <TouchableOpacity
                      key={sub.id}
                      style={[
                        styles.subjectPillItem,
                        { borderColor: isActive ? sub.color : colors.adminCardBorder, backgroundColor: isActive ? sub.bgLight : colors.adminInputBg },
                      ]}
                      onPress={() => setSelectedSubject(sub.name)}
                    >
                      <View style={[styles.subjectPillDot, { backgroundColor: sub.color }]} />
                      <Text style={[styles.subjectPillCode, { color: sub.color }]}>{sub.code}</Text>
                      <Text style={[styles.subjectPillName, { color: colors.adminText, fontWeight: isActive ? "800" : "600" }]}>
                        {sub.name}
                      </Text>
                      {isActive && (
                        <View style={[styles.activeCheckCircle, { backgroundColor: sub.color }]}>
                          <Ionicons name="checkmark" size={10} color="#FFFFFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Quick Day Stepper & View Mode Scope Navigation Bar */}
            <View style={styles.dayNavBar}>
              <View style={styles.dayNavLeft}>
                <TouchableOpacity
                  style={[styles.dayNavArrowBtn, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}
                  onPress={handlePrevDay}
                  disabled={selectedDay <= 1}
                >
                  <Ionicons name="chevron-back" size={14} color={selectedDay <= 1 ? colors.adminTextSecondary : colors.adminText} />
                  <Text style={[styles.dayNavArrowText, { color: selectedDay <= 1 ? colors.adminTextSecondary : colors.adminText }]}>
                    Prev Day
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.todayBadgeBtn,
                    { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder },
                    selectedDay === 28 && selectedMonth === "September 2026" && styles.todayBadgeBtnActive,
                  ]}
                  onPress={handleSelectToday}
                >
                  <Ionicons name="time-outline" size={14} color={selectedDay === 28 && selectedMonth === "September 2026" ? "#2563EB" : colors.adminTextSecondary} />
                  <Text
                    style={[
                      styles.todayBadgeText,
                      { color: selectedDay === 28 && selectedMonth === "September 2026" ? "#2563EB" : colors.adminText },
                    ]}
                  >
                    Today (Sep 28)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dayNavArrowBtn, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}
                  onPress={handleNextDay}
                  disabled={selectedDay >= currentMonthConfig.days}
                >
                  <Text style={[styles.dayNavArrowText, { color: selectedDay >= currentMonthConfig.days ? colors.adminTextSecondary : colors.adminText }]}>
                    Next Day
                  </Text>
                  <Ionicons name="chevron-forward" size={14} color={selectedDay >= currentMonthConfig.days ? colors.adminTextSecondary : colors.adminText} />
                </TouchableOpacity>
              </View>

              {/* View Scope Toggle: Combined / Daily Sheet / Monthly Register */}
              <View style={styles.viewModeToggleRow}>
                <TouchableOpacity
                  style={[
                    styles.viewModePill,
                    { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder },
                    viewScope === "combined" && styles.viewModePillActive,
                  ]}
                  onPress={() => setViewScope("combined")}
                >
                  <Ionicons
                    name="grid-outline"
                    size={13}
                    color={viewScope === "combined" ? "#FFFFFF" : colors.adminTextSecondary}
                  />
                  <Text
                    style={[
                      styles.viewModePillText,
                      { color: colors.adminTextSecondary },
                      viewScope === "combined" && styles.viewModePillTextActive,
                    ]}
                  >
                    Day & Month
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.viewModePill,
                    { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder },
                    viewScope === "daily" && styles.viewModePillActive,
                  ]}
                  onPress={() => setViewScope("daily")}
                >
                  <Ionicons
                    name="today-outline"
                    size={13}
                    color={viewScope === "daily" ? "#FFFFFF" : colors.adminTextSecondary}
                  />
                  <Text
                    style={[
                      styles.viewModePillText,
                      { color: colors.adminTextSecondary },
                      viewScope === "daily" && styles.viewModePillTextActive,
                    ]}
                  >
                    Daily Sheet
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.viewModePill,
                    { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder },
                    viewScope === "monthly" && styles.viewModePillActive,
                  ]}
                  onPress={() => setViewScope("monthly")}
                >
                  <Ionicons
                    name="calendar-outline"
                    size={13}
                    color={viewScope === "monthly" ? "#FFFFFF" : colors.adminTextSecondary}
                  />
                  <Text
                    style={[
                      styles.viewModePillText,
                      { color: colors.adminTextSecondary },
                      viewScope === "monthly" && styles.viewModePillTextActive,
                    ]}
                  >
                    Monthly Overview
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.viewModePill,
                    { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder },
                    viewScope === "subjects" && styles.viewModePillActive,
                  ]}
                  onPress={() => setViewScope("subjects")}
                >
                  <Ionicons
                    name="library-outline"
                    size={13}
                    color={viewScope === "subjects" ? "#FFFFFF" : colors.adminTextSecondary}
                  />
                  <Text
                    style={[
                      styles.viewModePillText,
                      { color: colors.adminTextSecondary },
                      viewScope === "subjects" && styles.viewModePillTextActive,
                    ]}
                  >
                    Subject-wise
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Horizontal Scroll of Days in Month (Days 1 to 30) */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.daysScrollList}
            >
              {Array.from({ length: currentMonthConfig.days }, (_, i) => i + 1).map((d) => {
                const isSelected = d === selectedDay;
                const isCurrentDay = d === 28 && selectedMonth === "September 2026";
                const dayOfWeek = getDayOfWeekName(currentMonthConfig.year, currentMonthConfig.monthIdx, d);
                const isWeekend = dayOfWeek === "Sun";
                return (
                  <TouchableOpacity
                    key={d}
                    style={[
                      styles.dayChip,
                      { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder },
                      isSelected && styles.dayChipActive,
                      isWeekend && !isSelected && styles.dayChipWeekend,
                    ]}
                    onPress={() => handleSelectDay(d)}
                  >
                    <Text
                      style={[
                        styles.dayChipDayName,
                        { color: colors.adminTextSecondary },
                        isSelected && styles.dayChipTextActive,
                      ]}
                    >
                      {dayOfWeek}
                    </Text>
                    <Text
                      style={[
                        styles.dayChipNumber,
                        { color: colors.adminText },
                        isSelected && styles.dayChipTextActive,
                      ]}
                    >
                      {d}
                    </Text>
                    {isCurrentDay && <View style={styles.todayIndicatorDot} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {/* KPI Stat Cards (5 Horizontal Cards: Day & Month Metrics) */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.statsScrollContainer}
            >
              {/* Card 1: Day Attendance ("out of present in day and percentage") */}
              <View style={[styles.kpiCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                <View style={[styles.kpiIconBadge, { backgroundColor: "#DCFCE7" }]}>
                  <Ionicons name="today" size={20} color="#16A34A" />
                </View>
                <View style={styles.kpiContent}>
                  <Text style={[styles.kpiLabel, { color: colors.adminTextSecondary }]}>
                    Day Present ({selectedDay} {currentMonthConfig.short})
                  </Text>
                  <Text style={[styles.kpiValue, { color: colors.adminText }]}>
                    {presentCount} / {totalCount}
                  </Text>
                  <View style={styles.kpiSubRow}>
                    <Text style={styles.kpiHighlightText}>{presentCount} out of {totalCount} Present</Text>
                    <View style={styles.badgePillGreen}>
                      <Text style={styles.badgePillGreenText}>{presentPercent}%</Text>
                    </View>
                  </View>
                  <Text style={styles.kpiSubtext}>
                    {absentCount} Absent • {lateCount} Late today
                  </Text>
                </View>
              </View>

              {/* Card 2: Day Absent & Late */}
              <View style={[styles.kpiCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                <View style={[styles.kpiIconBadge, { backgroundColor: "#FEE2E2" }]}>
                  <Ionicons name="close-circle" size={20} color="#DC2626" />
                </View>
                <View style={styles.kpiContent}>
                  <Text style={[styles.kpiLabel, { color: colors.adminTextSecondary }]}>
                    Day Absent & Late
                  </Text>
                  <Text style={[styles.kpiValue, { color: colors.adminText }]}>
                    {absentCount} Absent
                  </Text>
                  <View style={styles.kpiSubRow}>
                    <Text style={styles.kpiHighlightTextRed}>{absentCount} out of {totalCount} Absent</Text>
                    <View style={styles.badgePillRed}>
                      <Text style={styles.badgePillRedText}>{absentPercent}%</Text>
                    </View>
                  </View>
                  <Text style={styles.kpiSubtext}>
                    {lateCount} Late today ({latePercent}%)
                  </Text>
                </View>
              </View>

              {/* Card 3: Month Present ("present in month and percentage") */}
              <View style={[styles.kpiCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                <View style={[styles.kpiIconBadge, { backgroundColor: "#EFF6FF" }]}>
                  <Ionicons name="checkbox" size={20} color="#2563EB" />
                </View>
                <View style={styles.kpiContent}>
                  <Text style={[styles.kpiLabel, { color: colors.adminTextSecondary }]} numberOfLines={1}>
                    Month Present ({currentMonthConfig.short})
                  </Text>
                  <Text style={[styles.kpiValue, { color: colors.adminText }]}>
                    {monthTotalPresent} / {monthTotalPossible}
                  </Text>
                  <View style={styles.kpiSubRow}>
                    <Text style={styles.kpiHighlightTextBlue}>Present Sessions</Text>
                    <View style={styles.badgePillBlue}>
                      <Text style={styles.badgePillBlueText}>{monthPresentPercent}%</Text>
                    </View>
                  </View>
                  <Text style={styles.kpiSubtext}>
                    Avg {avgPresentPerDay} out of {totalCount} / day
                  </Text>
                </View>
              </View>

              {/* Card 4: Month Absent ("absent in month and percentage") */}
              <View style={[styles.kpiCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                <View style={[styles.kpiIconBadge, { backgroundColor: "#FEF3C7" }]}>
                  <Ionicons name="alert-circle" size={20} color="#D97706" />
                </View>
                <View style={styles.kpiContent}>
                  <Text style={[styles.kpiLabel, { color: colors.adminTextSecondary }]} numberOfLines={1}>
                    Month Absent ({currentMonthConfig.short})
                  </Text>
                  <Text style={[styles.kpiValue, { color: colors.adminText }]}>
                    {monthTotalAbsent} / {monthTotalPossible}
                  </Text>
                  <View style={styles.kpiSubRow}>
                    <Text style={styles.kpiHighlightTextAmber}>Absent Sessions</Text>
                    <View style={styles.badgePillAmber}>
                      <Text style={styles.badgePillAmberText}>{monthAbsentPercent}%</Text>
                    </View>
                  </View>
                  <Text style={styles.kpiSubtext}>
                    {monthTotalLate} Late marks ({monthLatePercent}%)
                  </Text>
                </View>
              </View>

              {/* Card 5: Month Attendance Rate */}
              <View style={[styles.kpiCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                <View style={[styles.kpiIconBadge, { backgroundColor: "#F3E8FF" }]}>
                  <Ionicons name="pie-chart" size={20} color="#8B5CF6" />
                </View>
                <View style={styles.kpiContent}>
                  <Text style={[styles.kpiLabel, { color: colors.adminTextSecondary }]}>
                    Month Attendance Rate
                  </Text>
                  <Text style={[styles.kpiValue, { color: colors.adminText }]}>
                    {monthAttendanceRate}%
                  </Text>
                  <View style={styles.kpiSubRow}>
                    <Text style={styles.kpiHighlightTextPurple}>Requirement: ≥ 75%</Text>
                    <View style={styles.badgePillPurple}>
                      <Text style={styles.badgePillPurpleText}>{monthWorkingDays} Days</Text>
                    </View>
                  </View>
                  <Text style={styles.kpiSubtext}>
                    {Number(monthAttendanceRate) >= 75 ? "✓ Excellent (Eligible)" : "⚠ Attention Required"}
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Attendance Summary Banner (Day & Month Combined Visual Breakdown) */}
            <View style={[styles.kpiSummaryBanner, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
              <View style={styles.bannerHeaderRow}>
                <View style={styles.bannerLeftSection}>
                  <View style={styles.bannerBadgeDay}>
                    <Ionicons name="today" size={13} color="#16A34A" />
                    <Text style={styles.bannerBadgeDayText}>
                      DAY SUMMARY: {selectedDate} ({selectedDayOfWeek})
                    </Text>
                  </View>
                  <Text style={[styles.bannerMainStat, { color: colors.adminText }]}>
                    <Text style={{ fontWeight: "800", color: "#16A34A" }}>{presentCount} out of {totalCount}</Text> Students Present ({presentPercent}%)
                  </Text>
                  <Text style={[styles.bannerSubStat, { color: colors.adminTextSecondary }]}>
                    {absentCount} out of {totalCount} Absent ({absentPercent}%) • {lateCount} out of {totalCount} Late ({latePercent}%)
                  </Text>
                </View>

                <View style={[styles.bannerDivider, { backgroundColor: colors.adminCardBorder }]} />

                <View style={styles.bannerRightSection}>
                  <View style={styles.bannerBadgeMonth}>
                    <Ionicons name="calendar" size={13} color="#2563EB" />
                    <Text style={styles.bannerBadgeMonthText}>
                      MONTH REGISTER: {selectedMonth}
                    </Text>
                  </View>
                  <Text style={[styles.bannerMainStat, { color: colors.adminText }]}>
                    <Text style={{ fontWeight: "800", color: "#2563EB" }}>{monthTotalPresent} out of {monthTotalPossible}</Text> Present Sessions ({monthPresentPercent}%)
                  </Text>
                  <Text style={[styles.bannerSubStat, { color: colors.adminTextSecondary }]}>
                    {monthTotalAbsent} Total Absent ({monthAbsentPercent}%) • {monthTotalLate} Total Late ({monthLatePercent}%) • {monthWorkingDays} Classes Held
                  </Text>
                </View>
              </View>

              {/* Colored multi-segment progress bar for month breakdown */}
              <View style={styles.bannerProgressBarBg}>
                <View style={[styles.bannerProgressFill, { flex: Math.max(0.1, monthTotalPresent), backgroundColor: "#2563EB" }]} />
                <View style={[styles.bannerProgressFill, { flex: Math.max(0.01, monthTotalAbsent), backgroundColor: "#DC2626" }]} />
                <View style={[styles.bannerProgressFill, { flex: Math.max(0.01, monthTotalLate), backgroundColor: "#D97706" }]} />
              </View>
            </View>

            {/* Subject-Wise Attendance Breakdown Carousel */}
            <View style={styles.subjectSectionWrapper}>
              <View style={styles.subjectSectionHeader}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <View style={[styles.subjectSectionIcon, { backgroundColor: isDark ? "rgba(37,99,235,0.2)" : "#EFF6FF" }]}>
                    <Ionicons name="library" size={16} color="#2563EB" />
                  </View>
                  <View>
                    <Text style={[styles.subjectSectionTitle, { color: colors.adminText }]}>
                      Subject-Wise Attendance Breakdown
                    </Text>
                    <Text style={[styles.subjectSectionSub, { color: colors.adminTextSecondary }]}>
                      Compare present, absent, and shortage counts across all 6 courses • Click any card to select & mark
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={[styles.subjectToggleScopeBtn, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}
                  onPress={() => setViewScope(viewScope === "subjects" ? "combined" : "subjects")}
                >
                  <Ionicons
                    name={viewScope === "subjects" ? "grid-outline" : "stats-chart-outline"}
                    size={13}
                    color="#2563EB"
                  />
                  <Text style={styles.subjectToggleScopeBtnText}>
                    {viewScope === "subjects" ? "Standard View" : "Subject Matrix"}
                  </Text>
                </TouchableOpacity>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.subjectCardsScroll}
              >
                {classSubjectSummaries.map((subItem) => {
                  const isSelected = subItem.name === selectedSubject;
                  const hasShortage = subItem.shortageCount > 0;
                  return (
                    <TouchableOpacity
                      key={subItem.id}
                      style={[
                        styles.subjectCard,
                        { backgroundColor: colors.adminCard, borderColor: isSelected ? subItem.color : colors.adminCardBorder },
                        isSelected && { borderWidth: 2, shadowColor: subItem.color, shadowOpacity: 0.15 },
                      ]}
                      onPress={() => {
                        setSelectedSubject(subItem.name);
                      }}
                      activeOpacity={0.8}
                    >
                      {/* Top Row: Code + Active Badge */}
                      <View style={styles.subjectCardTopRow}>
                        <View style={[styles.subjectCodePill, { backgroundColor: subItem.bgLight }]}>
                          <Text style={[styles.subjectCodeText, { color: subItem.color }]}>
                            {subItem.code}
                          </Text>
                        </View>
                        {isSelected ? (
                          <View style={[styles.selectedSubjectBadge, { backgroundColor: subItem.color }]}>
                            <Ionicons name="checkmark-circle" size={11} color="#FFFFFF" />
                            <Text style={styles.selectedSubjectBadgeText}>Active</Text>
                          </View>
                        ) : (
                          <Text style={[styles.switchSubjectHint, { color: colors.adminTextSecondary }]}>
                            Tap to switch
                          </Text>
                        )}
                      </View>

                      {/* Subject Name & Faculty */}
                      <Text style={[styles.subjectCardName, { color: colors.adminText }]} numberOfLines={1}>
                        {subItem.name}
                      </Text>
                      <Text style={[styles.subjectCardFaculty, { color: colors.adminTextSecondary }]} numberOfLines={1}>
                        {subItem.faculty} • {subItem.totalClasses} Classes
                      </Text>

                      {/* Present vs Absent Stat Grid */}
                      <View style={[styles.subjectCardGrid, { backgroundColor: colors.adminInputBg }]}>
                        {/* Present */}
                        <View style={styles.subjectStatCol}>
                          <Text style={[styles.subjectStatLabel, { color: "#16A34A" }]}>PRESENT</Text>
                          <Text style={[styles.subjectStatVal, { color: colors.adminText }]}>
                            {subItem.totalPresent}
                          </Text>
                          <Text style={[styles.subjectStatPct, { color: "#16A34A" }]}>
                            {subItem.presentPct}%
                          </Text>
                        </View>

                        <View style={[styles.subjectStatDivider, { backgroundColor: colors.adminCardBorder }]} />

                        {/* Absent */}
                        <View style={styles.subjectStatCol}>
                          <Text style={[styles.subjectStatLabel, { color: "#DC2626" }]}>ABSENT</Text>
                          <Text style={[styles.subjectStatVal, { color: colors.adminText }]}>
                            {subItem.totalAbsent}
                          </Text>
                          <Text style={[styles.subjectStatPct, { color: "#DC2626" }]}>
                            {subItem.absentPct}%
                          </Text>
                        </View>

                        <View style={[styles.subjectStatDivider, { backgroundColor: colors.adminCardBorder }]} />

                        {/* Late */}
                        <View style={styles.subjectStatCol}>
                          <Text style={[styles.subjectStatLabel, { color: "#D97706" }]}>LATE</Text>
                          <Text style={[styles.subjectStatVal, { color: colors.adminText }]}>
                            {subItem.totalLate}
                          </Text>
                          <Text style={[styles.subjectStatPct, { color: "#D97706" }]}>
                            {subItem.latePct}%
                          </Text>
                        </View>
                      </View>

                      {/* Progress Bar */}
                      <View style={styles.subjectProgressBarBg}>
                        <View
                          style={[
                            styles.subjectProgressBarFill,
                            {
                              width: `${Math.min(100, Math.max(0, Number(subItem.presentPct)))}%`,
                              backgroundColor: Number(subItem.presentPct) >= 75 ? "#16A34A" : "#D97706",
                            },
                          ]}
                        />
                      </View>

                      {/* Footer Badge: Shortage Alert */}
                      <View style={styles.subjectCardFooter}>
                        {hasShortage ? (
                          <View style={styles.subjectShortageBadge}>
                            <Ionicons name="alert-circle" size={12} color="#DC2626" />
                            <Text style={styles.subjectShortageText}>
                              {subItem.shortageCount} {subItem.shortageCount === 1 ? "student" : "students"} &lt; 75%
                            </Text>
                          </View>
                        ) : (
                          <View style={styles.subjectSafeBadge}>
                            <Ionicons name="checkmark-circle" size={12} color="#16A34A" />
                            <Text style={styles.subjectSafeText}>All Eligible ≥75%</Text>
                          </View>
                        )}
                        <Ionicons
                          name="chevron-forward"
                          size={13}
                          color={isSelected ? subItem.color : colors.adminTextSecondary}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>

            {/* Main Students Table Card */}
            <View style={[styles.tableCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
              {/* Card Header: Title + Legend + Filter Pills + Student Search */}
              <View style={[styles.tableCardHeader, { borderBottomColor: colors.adminCardBorder }]}>
                <View style={styles.tableTitleRow}>
                  <Ionicons name="people" size={20} color="#2563EB" style={{ marginRight: 8 }} />
                  <Text style={[styles.tableCardTitle, { color: colors.adminText }]}>Students ({totalCount})</Text>
                </View>

                {/* Filter Pills: All vs Connected with Teacher */}
                <View style={styles.filterPillsRow}>
                  <TouchableOpacity
                    style={[
                      styles.tableFilterPill,
                      {
                        backgroundColor: !connectedFilterOnly ? "#2563EB" : colors.adminInputBg,
                        borderColor: !connectedFilterOnly ? "#2563EB" : colors.adminInputBorder,
                      },
                    ]}
                    onPress={() => {
                      setConnectedFilterOnly(false);
                      setCurrentPage(1);
                    }}
                  >
                    <Text
                      style={[
                        styles.tableFilterPillText,
                        {
                          color: !connectedFilterOnly ? "#FFFFFF" : colors.adminTextSecondary,
                        },
                      ]}
                    >
                      All ({students.length})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.tableFilterPill,
                      {
                        backgroundColor: connectedFilterOnly ? "#2563EB" : colors.adminInputBg,
                        borderColor: connectedFilterOnly ? "#2563EB" : colors.adminInputBorder,
                      },
                    ]}
                    onPress={() => {
                      setConnectedFilterOnly(true);
                      setCurrentPage(1);
                    }}
                  >
                    <Ionicons
                      name="checkmark-circle"
                      size={12}
                      color={connectedFilterOnly ? "#FFFFFF" : "#2563EB"}
                    />
                    <Text
                      style={[
                        styles.tableFilterPillText,
                        {
                          color: connectedFilterOnly ? "#FFFFFF" : colors.adminTextSecondary,
                        },
                      ]}
                    >
                      Connected ({connectedCount})
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Legend: Present, Absent, Late */}
                <View style={styles.legendRow}>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: "#16A34A" }]} />
                    <Text style={[styles.legendText, { color: colors.adminTextSecondary }]}>Present</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: "#DC2626" }]} />
                    <Text style={[styles.legendText, { color: colors.adminTextSecondary }]}>Absent</Text>
                  </View>
                  <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: "#D97706" }]} />
                    <Text style={[styles.legendText, { color: colors.adminTextSecondary }]}>Late</Text>
                  </View>
                </View>

                {/* Table search student & Add student button */}
                <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                  <View style={[styles.tableSearchBox, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder }]}>
                    <Ionicons name="search-outline" size={15} color={colors.adminTextSecondary} />
                    <TextInput
                      style={[styles.tableSearchInput, { color: colors.adminText }]}
                      placeholder="Search student..."
                      placeholderTextColor={colors.adminTextSecondary}
                      value={searchStudent}
                      onChangeText={(txt) => {
                        setSearchStudent(txt);
                        setCurrentPage(1);
                      }}
                    />
                    {searchStudent.length > 0 && (
                      <TouchableOpacity onPress={() => setSearchStudent("")}>
                        <Ionicons name="close-circle" size={14} color={colors.adminTextSecondary} />
                      </TouchableOpacity>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.addStudentBtn}
                    onPress={() => setAddStudentModalVisible(true)}
                  >
                    <Ionicons name="person-add" size={14} color="#FFFFFF" />
                    <Text style={styles.addStudentBtnText}>Add Student</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Responsive Scrollable Table Container */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.tableContainer}>
                  {/* Table Column Headers */}
                  <View style={[styles.tableHeaderRow, { backgroundColor: colors.adminSurfaceAlt, borderBottomColor: colors.adminCardBorder }]}>
                    <Text style={[styles.thText, { width: 45, color: colors.adminTextSecondary }]}>#</Text>
                    <Text style={[styles.thText, { width: 120, color: colors.adminTextSecondary }]}>Roll No</Text>
                    <Text style={[styles.thText, { width: 210, color: colors.adminTextSecondary }]}>Student Name</Text>

                    {/* Standard Columns when NOT in subjects-only matrix */}
                    {viewScope !== "subjects" && (
                      <>
                        {(viewScope === "combined" || viewScope === "daily") && (
                          <Text style={[styles.thText, { width: 190, color: colors.adminTextSecondary }]}>
                            Day {selectedDay} ({selectedSubjectCode})
                          </Text>
                        )}

                        {(viewScope === "combined" || viewScope === "monthly") && (
                          <Text style={[styles.thText, { width: 130, color: colors.adminTextSecondary }]}>
                            Month Present
                          </Text>
                        )}

                        {(viewScope === "combined" || viewScope === "monthly") && (
                          <Text style={[styles.thText, { width: 110, color: colors.adminTextSecondary }]}>
                            Month Absent
                          </Text>
                        )}

                        {(viewScope === "combined" || viewScope === "monthly") && (
                          <Text style={[styles.thText, { width: 115, color: colors.adminTextSecondary }]}>
                            Month %
                          </Text>
                        )}

                        <Text style={[styles.thText, { width: 150, color: colors.adminTextSecondary }]}>Remarks</Text>
                      </>
                    )}

                    {/* Subject-Wise Columns when in subjects mode */}
                    {viewScope === "subjects" && (
                      <>
                        {SUBJECT_CONFIGS.map((sub) => (
                          <Text
                            key={sub.id}
                            style={[
                              styles.thText,
                              {
                                width: 120,
                                color: sub.name === selectedSubject ? sub.color : colors.adminTextSecondary,
                                fontWeight: sub.name === selectedSubject ? "700" : "600",
                              },
                            ]}
                          >
                            {sub.code} ({sub.totalClasses})
                          </Text>
                        ))}
                        <Text style={[styles.thText, { width: 105, color: colors.adminTextSecondary }]}>
                          Avg %
                        </Text>
                        <Text style={[styles.thText, { width: 130, color: colors.adminTextSecondary }]}>
                          Status
                        </Text>
                      </>
                    )}

                    <Text style={[styles.thText, { width: 40, textAlign: "right", color: colors.adminTextSecondary }]}> </Text>
                  </View>

                  {/* Table Rows */}
                  {pageStudents.map((row) => {
                    const isPresent = row.status === "Present";
                    const isAbsent = row.status === "Absent";
                    const isLate = row.status === "Late";

                    const badgeBg = isPresent
                      ? "#DCFCE7"
                      : isAbsent
                      ? "#FEE2E2"
                      : "#FEF3C7";

                    const badgeColor = isPresent
                      ? "#16A34A"
                      : isAbsent
                      ? "#DC2626"
                      : "#D97706";

                    const studentMonthPresent = row.monthPresentCount ?? 22;
                    const studentMonthAbsent = row.monthAbsentCount ?? 2;
                    const studentMonthPct = monthWorkingDays > 0 ? ((studentMonthPresent / monthWorkingDays) * 100).toFixed(1) : "91.7";
                    const numPct = Number(studentMonthPct);

                    const pctBadgeBg = numPct >= 75 ? "#DCFCE7" : numPct >= 60 ? "#FEF3C7" : "#FEE2E2";
                    const pctBadgeColor = numPct >= 75 ? "#16A34A" : numPct >= 60 ? "#D97706" : "#DC2626";

                    const studentSubjects = getStudentSubjectBreakdown(row, selectedSubject, monthWorkingDays);
                    const avgSubPct = (
                      studentSubjects.reduce((acc, s) => acc + s.percentage, 0) / studentSubjects.length
                    ).toFixed(1);
                    const shortageSubCount = studentSubjects.filter((s) => !s.isEligible).length;

                    return (
                      <View key={row.id} style={[styles.tableBodyRow, { borderBottomColor: colors.adminCardBorder }]}>
                        {/* Number */}
                        <Text style={[styles.tdText, { width: 45, color: colors.adminTextSecondary }]}>
                          {row.num}
                        </Text>

                        {/* Roll No */}
                        <Text style={[styles.tdText, { width: 120, fontWeight: "600", color: colors.adminText }]}>
                          {row.rollNo}
                        </Text>

                        {/* Student Name + Connected Badge + Blocked Tag */}
                        <View style={{ width: 210, flexDirection: "row", alignItems: "center", gap: 6 }}>
                          <Text style={[styles.tdText, { fontWeight: "500", color: colors.adminText, flexShrink: 1 }]} numberOfLines={1}>
                            {row.studentName}
                          </Text>
                          {row.isBlocked && (
                            <View style={styles.blockedBadgeMini}>
                              <Ionicons name="ban" size={10} color="#DC2626" />
                              <Text style={styles.blockedBadgeMiniText}>Blocked</Text>
                            </View>
                          )}
                          {row.isConnected && !row.isBlocked && (
                            <View style={styles.connectedBadgeMini}>
                              <Ionicons name="checkmark-circle" size={11} color="#2563EB" />
                              <Text style={styles.connectedBadgeText}>Connected</Text>
                            </View>
                          )}
                        </View>

                        {/* STANDARD MODE COLUMNS */}
                        {viewScope !== "subjects" && (
                          <>
                            {/* Day Status Dropdown Pill Badge + Quick P / A Buttons */}
                            {(viewScope === "combined" || viewScope === "daily") && (
                              <View style={{ width: 190, flexDirection: "row", alignItems: "center", gap: 5 }}>
                                {/* Quick P (Present) Button */}
                                <TouchableOpacity
                                  style={[
                                    styles.quickActionToggleBtn,
                                    isPresent && styles.quickActionPresentActive,
                                    !isAuthorized && styles.disabledToggleBtn,
                                  ]}
                                  onPress={() => updateStudentStatus(row.id, "Present")}
                                  disabled={!isAuthorized}
                                  activeOpacity={0.7}
                                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                                >
                                  <Text
                                    style={[
                                      styles.quickActionToggleText,
                                      isPresent && styles.quickActionPresentTextActive,
                                    ]}
                                  >
                                    P
                                  </Text>
                                </TouchableOpacity>

                                {/* Quick A (Absent) Button */}
                                <TouchableOpacity
                                  style={[
                                    styles.quickActionToggleBtn,
                                    isAbsent && styles.quickActionAbsentActive,
                                    !isAuthorized && styles.disabledToggleBtn,
                                  ]}
                                  onPress={() => updateStudentStatus(row.id, "Absent")}
                                  disabled={!isAuthorized}
                                  activeOpacity={0.7}
                                  hitSlop={{ top: 6, bottom: 6, left: 4, right: 4 }}
                                >
                                  <Text
                                    style={[
                                      styles.quickActionToggleText,
                                      isAbsent && styles.quickActionAbsentTextActive,
                                    ]}
                                  >
                                    A
                                  </Text>
                                </TouchableOpacity>

                                {/* Full Status Modal Trigger */}
                                <TouchableOpacity
                                  style={[
                                    styles.statusBadge,
                                    { backgroundColor: badgeBg, flex: 1, paddingHorizontal: 6, minHeight: 28 },
                                    !isAuthorized && { opacity: 0.8 },
                                  ]}
                                  onPress={() => {
                                    if (!ensureAuthorized()) return;
                                    setStatusModalStudent(row);
                                  }}
                                  disabled={!isAuthorized}
                                >
                                  <View style={[styles.statusBadgeDot, { backgroundColor: badgeColor }]} />
                                  <Text style={[styles.statusBadgeText, { color: badgeColor, fontSize: 11 }]}>
                                    {row.status}
                                  </Text>
                                  <Ionicons
                                    name="chevron-down"
                                    size={11}
                                    color={badgeColor}
                                    style={{ marginLeft: 2 }}
                                  />
                                </TouchableOpacity>
                              </View>
                            )}

                            {/* Month Present Badge */}
                            {(viewScope === "combined" || viewScope === "monthly") && (
                              <TouchableOpacity
                                style={{ width: 130 }}
                                onPress={() => {
                                  setModalActiveTab("calendar");
                                  setStudentMonthlyModal(row);
                                }}
                              >
                                <View style={styles.monthPresentBadge}>
                                  <Ionicons name="checkmark-circle" size={13} color="#16A34A" />
                                  <Text style={styles.monthPresentText}>
                                    {studentMonthPresent} / {monthWorkingDays} days
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            )}

                            {/* Month Absent Badge */}
                            {(viewScope === "combined" || viewScope === "monthly") && (
                              <TouchableOpacity
                                style={{ width: 110 }}
                                onPress={() => {
                                  setModalActiveTab("calendar");
                                  setStudentMonthlyModal(row);
                                }}
                              >
                                <View style={[styles.monthAbsentBadge, studentMonthAbsent > 3 && styles.monthAbsentBadgeHigh]}>
                                  <Text style={[styles.monthAbsentText, studentMonthAbsent > 3 && styles.monthAbsentTextHigh]}>
                                    {studentMonthAbsent} {studentMonthAbsent === 1 ? "day" : "days"}
                                  </Text>
                                </View>
                              </TouchableOpacity>
                            )}

                            {/* Month % Badge */}
                            {(viewScope === "combined" || viewScope === "monthly") && (
                              <TouchableOpacity
                                style={{ width: 115 }}
                                onPress={() => {
                                  setModalActiveTab("calendar");
                                  setStudentMonthlyModal(row);
                                }}
                              >
                                <View style={[styles.monthPctBadge, { backgroundColor: pctBadgeBg }]}>
                                  <Text style={[styles.monthPctText, { color: pctBadgeColor }]}>
                                    {studentMonthPct}%
                                  </Text>
                                  <Ionicons
                                    name={numPct >= 75 ? "checkmark" : numPct >= 60 ? "alert" : "warning"}
                                    size={11}
                                    color={pctBadgeColor}
                                    style={{ marginLeft: 3 }}
                                  />
                                </View>
                              </TouchableOpacity>
                            )}

                            {/* Remarks */}
                            <TouchableOpacity
                              style={{ width: 150 }}
                              onPress={() => {
                                setRemarksModalStudent(row);
                                setRemarksInput(row.remarks === "-" ? "" : row.remarks);
                              }}
                            >
                              <Text
                                style={[
                                  styles.tdText,
                                  {
                                    color: row.remarks === "-" ? colors.adminTextSecondary : colors.adminText,
                                    fontStyle: row.remarks === "-" ? "normal" : "italic",
                                  },
                                ]}
                                numberOfLines={1}
                              >
                                {row.remarks}
                              </Text>
                            </TouchableOpacity>
                          </>
                        )}

                        {/* SUBJECT-WISE MATRIX COLUMNS */}
                        {viewScope === "subjects" && (
                          <>
                            {studentSubjects.map((sb) => {
                              const isSafe = sb.isEligible;
                              const cellBg = isSafe ? "#DCFCE7" : "#FEE2E2";
                              const cellColor = isSafe ? "#16A34A" : "#DC2626";
                              const isCurSub = sb.subjectName === selectedSubject;
                              return (
                                <TouchableOpacity
                                  key={sb.subjectId}
                                  style={{ width: 120 }}
                                  onPress={() => {
                                    setModalActiveTab("subjects");
                                    setStudentMonthlyModal(row);
                                  }}
                                >
                                  <View
                                    style={[
                                      styles.subjectCellBadge,
                                      {
                                        backgroundColor: isCurSub ? (isSafe ? "#BBF7D0" : "#FECACA") : cellBg,
                                        borderColor: isCurSub ? (isSafe ? "#16A34A" : "#DC2626") : "transparent",
                                        borderWidth: isCurSub ? 1 : 0,
                                      },
                                    ]}
                                  >
                                    <Text style={[styles.subjectCellVal, { color: cellColor }]}>
                                      {sb.presentCount}/{sb.totalClasses}
                                    </Text>
                                    <Text style={[styles.subjectCellPct, { color: cellColor }]}>
                                      {sb.percentage}%
                                    </Text>
                                  </View>
                                </TouchableOpacity>
                              );
                            })}

                            {/* Average Across All Subjects */}
                            <TouchableOpacity
                              style={{ width: 105 }}
                              onPress={() => {
                                setModalActiveTab("subjects");
                                setStudentMonthlyModal(row);
                              }}
                            >
                              <View
                                style={[
                                  styles.monthPctBadge,
                                  { backgroundColor: Number(avgSubPct) >= 75 ? "#EFF6FF" : "#FEF3C7" },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.monthPctText,
                                    { color: Number(avgSubPct) >= 75 ? "#2563EB" : "#D97706" },
                                  ]}
                                >
                                  {avgSubPct}%
                                </Text>
                              </View>
                            </TouchableOpacity>

                            {/* Status */}
                            <TouchableOpacity
                              style={{ width: 130 }}
                              onPress={() => {
                                setModalActiveTab("subjects");
                                setStudentMonthlyModal(row);
                              }}
                            >
                              {shortageSubCount === 0 ? (
                                <View style={styles.eligibleBadgePill}>
                                  <Ionicons name="checkmark-circle" size={11} color="#16A34A" />
                                  <Text style={styles.eligibleBadgePillText}>Eligible (All 6)</Text>
                                </View>
                              ) : (
                                <View style={styles.shortageBadgePill}>
                                  <Ionicons name="warning" size={11} color="#DC2626" />
                                  <Text style={styles.shortageBadgePillText}>
                                    {shortageSubCount} {shortageSubCount === 1 ? "Shortage" : "Shortages"}
                                  </Text>
                                </View>
                              )}
                            </TouchableOpacity>
                          </>
                        )}

                        {/* Actions 3 dots -> Action Modal */}
                        <TouchableOpacity
                          style={{ width: 40, alignItems: "flex-end", padding: 4 }}
                          onPress={() => setActionModalStudent(row)}
                        >
                          <Ionicons name="ellipsis-vertical" size={16} color={colors.adminTextSecondary} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>

              {/* Table Footer: "Showing 1 - 10 of 48 students" + Pagination */}
              <View style={[styles.tableFooterRow, { borderTopColor: colors.adminCardBorder }]}>
                <Text style={[styles.tableFooterCount, { color: colors.adminTextSecondary }]}>
                  Showing {Math.min(1, totalFiltered)} -{" "}
                  {Math.min(currentPage * pageSize, totalFiltered)} of {totalFiltered} students
                </Text>

                {/* Pagination Controls */}
                <View style={styles.paginationRow}>
                  {/* Prev */}
                  <TouchableOpacity
                    style={[
                      styles.pageArrowBtn,
                      { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder },
                      currentPage === 1 && styles.pageArrowBtnDisabled,
                    ]}
                    disabled={currentPage === 1}
                    onPress={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={14}
                      color={currentPage === 1 ? (isDark ? "#475569" : "#CBD5E1") : colors.adminTextSecondary}
                    />
                  </TouchableOpacity>

                  {/* Page numbers: 1, 2, 3, 4, 5 */}
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    const isCurrent = page === currentPage;
                    return (
                      <TouchableOpacity
                        key={page}
                        style={[
                          styles.pageBtn,
                          { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder },
                          isCurrent && styles.pageBtnActive,
                        ]}
                        onPress={() => setCurrentPage(page)}
                      >
                        <Text
                          style={[
                            styles.pageBtnText,
                            { color: colors.adminTextSecondary },
                            isCurrent && styles.pageBtnTextActive,
                          ]}
                        >
                          {page}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}

                  {/* Next */}
                  <TouchableOpacity
                    style={[
                      styles.pageArrowBtn,
                      { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder },
                      currentPage === totalPages && styles.pageArrowBtnDisabled,
                    ]}
                    disabled={currentPage === totalPages}
                    onPress={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={14}
                      color={currentPage === totalPages ? (isDark ? "#475569" : "#CBD5E1") : colors.adminTextSecondary}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>

      {/* QUICK STATUS SWITCH MODAL */}
      <Modal
        visible={!!statusModalStudent}
        transparent
        animationType="fade"
        onRequestClose={() => setStatusModalStudent(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setStatusModalStudent(null)}
        >
          <View style={[styles.quickModalCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder, borderWidth: 1 }]}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={[styles.modalStudentName, { color: colors.adminText }]}>
                  {statusModalStudent?.studentName}
                </Text>
                <Text style={[styles.modalRollNo, { color: colors.adminTextSecondary }]}>{statusModalStudent?.rollNo}</Text>
              </View>
              <TouchableOpacity onPress={() => setStatusModalStudent(null)}>
                <Ionicons name="close" size={22} color={colors.adminTextSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={[styles.modalPromptText, { color: colors.adminTextSecondary }]}>Change today's status:</Text>

            <View style={styles.statusOptionsCol}>
              {/* Present */}
              <TouchableOpacity
                style={[
                  styles.statusSelectOption,
                  { borderColor: colors.adminCardBorder, backgroundColor: colors.adminInputBg },
                  statusModalStudent?.status === "Present" && {
                    backgroundColor: "#DCFCE7",
                    borderColor: "#16A34A",
                  },
                ]}
                onPress={() =>
                  statusModalStudent &&
                  updateStudentStatus(statusModalStudent.id, "Present")
                }
              >
                <View style={[styles.statusBadgeDot, { backgroundColor: "#16A34A" }]} />
                <Text style={[styles.statusSelectOptionText, { color: "#16A34A" }]}>
                  Present
                </Text>
                {statusModalStudent?.status === "Present" && (
                  <Ionicons name="checkmark-circle" size={18} color="#16A34A" style={{ marginLeft: "auto" }} />
                )}
              </TouchableOpacity>

              {/* Absent */}
              <TouchableOpacity
                style={[
                  styles.statusSelectOption,
                  { borderColor: colors.adminCardBorder, backgroundColor: colors.adminInputBg },
                  statusModalStudent?.status === "Absent" && {
                    backgroundColor: "#FEE2E2",
                    borderColor: "#DC2626",
                  },
                ]}
                onPress={() =>
                  statusModalStudent &&
                  updateStudentStatus(statusModalStudent.id, "Absent")
                }
              >
                <View style={[styles.statusBadgeDot, { backgroundColor: "#DC2626" }]} />
                <Text style={[styles.statusSelectOptionText, { color: "#DC2626" }]}>
                  Absent
                </Text>
                {statusModalStudent?.status === "Absent" && (
                  <Ionicons name="checkmark-circle" size={18} color="#DC2626" style={{ marginLeft: "auto" }} />
                )}
              </TouchableOpacity>

              {/* Late */}
              <TouchableOpacity
                style={[
                  styles.statusSelectOption,
                  { borderColor: colors.adminCardBorder, backgroundColor: colors.adminInputBg },
                  statusModalStudent?.status === "Late" && {
                    backgroundColor: "#FEF3C7",
                    borderColor: "#D97706",
                  },
                ]}
                onPress={() =>
                  statusModalStudent &&
                  updateStudentStatus(statusModalStudent.id, "Late")
                }
              >
                <View style={[styles.statusBadgeDot, { backgroundColor: "#D97706" }]} />
                <Text style={[styles.statusSelectOptionText, { color: "#D97706" }]}>
                  Late
                </Text>
                {statusModalStudent?.status === "Late" && (
                  <Ionicons name="checkmark-circle" size={18} color="#D97706" style={{ marginLeft: "auto" }} />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* REMARKS EDIT MODAL */}
      <Modal
        visible={!!remarksModalStudent}
        transparent
        animationType="fade"
        onRequestClose={() => setRemarksModalStudent(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setRemarksModalStudent(null)}
        >
          <View style={[styles.quickModalCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder, borderWidth: 1 }]}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={[styles.modalStudentName, { color: colors.adminText }]}>Edit Remarks</Text>
                <Text style={[styles.modalRollNo, { color: colors.adminTextSecondary }]}>
                  {remarksModalStudent?.studentName} ({remarksModalStudent?.rollNo})
                </Text>
              </View>
              <TouchableOpacity onPress={() => setRemarksModalStudent(null)}>
                <Ionicons name="close" size={22} color={colors.adminTextSecondary} />
              </TouchableOpacity>
            </View>

            <TextInput
              style={[styles.remarksTextInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
              placeholder="e.g. Sick, 10 mins late, Family emergency..."
              placeholderTextColor={colors.adminTextSecondary}
              value={remarksInput}
              onChangeText={setRemarksInput}
              autoFocus
            />

            {/* Quick remark pills */}
            <View style={styles.quickRemarksPills}>
              {["Sick", "10 mins late", "Family emergency", "Permission taken", "-"].map((quick) => (
                <TouchableOpacity
                  key={quick}
                  style={[styles.quickPill, { backgroundColor: colors.adminInputBg }]}
                  onPress={() => setRemarksInput(quick)}
                >
                  <Text style={[styles.quickPillText, { color: colors.adminTextSecondary }]}>{quick}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.adminInputBg }]}
                onPress={() => setRemarksModalStudent(null)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.adminTextSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={saveRemarks}>
                <Text style={styles.saveBtnText}>Save Remark</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Pressable>
      </Modal>

      {/* DROPDOWN PICKER MODAL (Department, Subject, Section, Month, Day) */}
      <Modal
        visible={!!activePicker}
        transparent
        animationType="fade"
        onRequestClose={() => setActivePicker(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setActivePicker(null)}
        >
          <View style={[styles.quickModalCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder, borderWidth: 1 }]}>
            <View style={styles.modalHeaderRow}>
              <Text style={[styles.modalStudentName, { color: colors.adminText }]}>
                {activePicker === "department"
                  ? "Select Department"
                  : activePicker === "subject"
                  ? "Select Subject"
                  : activePicker === "section"
                  ? "Select Section"
                  : activePicker === "month"
                  ? "Select Academic Month"
                  : "Select Day of Month"}
              </Text>
              <TouchableOpacity onPress={() => setActivePicker(null)}>
                <Ionicons name="close" size={22} color={colors.adminTextSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 340 }}>
              {activePicker === "department" &&
                DEPARTMENTS.map((dept) => (
                  <TouchableOpacity
                    key={dept}
                    style={[
                      styles.pickerOption,
                      selectedDept === dept && styles.pickerOptionActive,
                    ]}
                    onPress={() => {
                      setSelectedDept(dept);
                      setActivePicker(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        { color: colors.adminText },
                        selectedDept === dept && styles.pickerOptionTextActive,
                      ]}
                    >
                      {dept}
                    </Text>
                    {selectedDept === dept && (
                      <Ionicons name="checkmark" size={18} color="#2563EB" />
                    )}
                  </TouchableOpacity>
                ))}

              {activePicker === "subject" &&
                SUBJECTS.map((subj) => (
                  <TouchableOpacity
                    key={subj}
                    style={[
                      styles.pickerOption,
                      selectedSubject === subj && styles.pickerOptionActive,
                    ]}
                    onPress={() => {
                      setSelectedSubject(subj);
                      setActivePicker(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        { color: colors.adminText },
                        selectedSubject === subj && styles.pickerOptionTextActive,
                      ]}
                    >
                      {subj}
                    </Text>
                    {selectedSubject === subj && (
                      <Ionicons name="checkmark" size={18} color="#2563EB" />
                    )}
                  </TouchableOpacity>
                ))}

              {activePicker === "section" &&
                SECTIONS.map((sec) => (
                  <TouchableOpacity
                    key={sec}
                    style={[
                      styles.pickerOption,
                      selectedSection === sec && styles.pickerOptionActive,
                    ]}
                    onPress={() => {
                      setSelectedSection(sec);
                      setActivePicker(null);
                    }}
                  >
                    <Text
                      style={[
                        styles.pickerOptionText,
                        { color: colors.adminText },
                        selectedSection === sec && styles.pickerOptionTextActive,
                      ]}
                    >
                      Section {sec}
                    </Text>
                    {selectedSection === sec && (
                      <Ionicons name="checkmark" size={18} color="#2563EB" />
                    )}
                  </TouchableOpacity>
                ))}

              {activePicker === "month" &&
                ACADEMIC_MONTHS.map((m) => (
                  <TouchableOpacity
                    key={m.name}
                    style={[
                      styles.pickerOption,
                      selectedMonth === m.name && styles.pickerOptionActive,
                    ]}
                    onPress={() => {
                      handleSelectMonth(m.name);
                      setActivePicker(null);
                    }}
                  >
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 10 }}>
                      <Ionicons
                        name="calendar-outline"
                        size={18}
                        color={selectedMonth === m.name ? "#2563EB" : colors.adminTextSecondary}
                      />
                      <View>
                        <Text
                          style={[
                            styles.pickerOptionText,
                            { color: colors.adminText },
                            selectedMonth === m.name && styles.pickerOptionTextActive,
                          ]}
                        >
                          {m.name}
                        </Text>
                        <Text style={{ fontSize: 11, color: colors.adminTextSecondary }}>
                          {m.workingDays} Working Days • {m.days} Total Days
                        </Text>
                      </View>
                    </View>
                    {selectedMonth === m.name && (
                      <Ionicons name="checkmark" size={18} color="#2563EB" />
                    )}
                  </TouchableOpacity>
                ))}

              {activePicker === "day" &&
                Array.from({ length: currentMonthConfig.days }, (_, i) => i + 1).map((d) => {
                  const dayOfWeek = getDayOfWeekName(currentMonthConfig.year, currentMonthConfig.monthIdx, d);
                  const isCurrentDay = d === 28 && selectedMonth === "September 2026";
                  const isSelected = selectedDay === d;
                  return (
                    <TouchableOpacity
                      key={d}
                      style={[
                        styles.pickerOption,
                        isSelected && styles.pickerOptionActive,
                      ]}
                      onPress={() => {
                        handleSelectDay(d);
                        setActivePicker(null);
                      }}
                    >
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text
                          style={[
                            styles.pickerOptionText,
                            { color: colors.adminText },
                            isSelected && styles.pickerOptionTextActive,
                          ]}
                        >
                          Day {d} — {dayOfWeek}, {currentMonthConfig.short} {d}
                        </Text>
                        {isCurrentDay && (
                          <View style={styles.todaySmallBadge}>
                            <Text style={styles.todaySmallBadgeText}>TODAY</Text>
                          </View>
                        )}
                      </View>
                      {isSelected && (
                        <Ionicons name="checkmark" size={18} color="#2563EB" />
                      )}
                    </TouchableOpacity>
                  );
                })}
            </ScrollView>
          </View>
        </Pressable>
      </Modal>

      {/* ADD STUDENT MODAL */}
      <Modal
        visible={addStudentModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setAddStudentModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setAddStudentModalVisible(false)}
        >
          <Pressable style={[styles.quickModalCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder, borderWidth: 1 }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={[styles.modalStudentName, { color: colors.adminText }]}>Add Student to Class</Text>
                <Text style={[styles.modalRollNo, { color: colors.adminTextSecondary }]}>Enroll student into {selectedDept} - {selectedSubject}</Text>
              </View>
              <TouchableOpacity onPress={() => setAddStudentModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.adminTextSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
              {/* Full Name */}
              <Text style={[styles.inputFieldLabel, { color: colors.adminTextSecondary }]}>Student Full Name *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                placeholder="e.g. Rahul Sharma"
                placeholderTextColor={colors.adminTextSecondary}
                value={newStudentName}
                onChangeText={setNewStudentName}
              />

              {/* Roll Number */}
              <Text style={[styles.inputFieldLabel, { color: colors.adminTextSecondary }]}>Roll Number *</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                placeholder="e.g. CSE049"
                placeholderTextColor={colors.adminTextSecondary}
                value={newStudentRollNo}
                onChangeText={setNewStudentRollNo}
                autoCapitalize="characters"
              />

              {/* Email */}
              <Text style={[styles.inputFieldLabel, { color: colors.adminTextSecondary }]}>Email Address (Optional)</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                placeholder="e.g. rahul.sharma@campusly.edu"
                placeholderTextColor={colors.adminTextSecondary}
                value={newStudentEmail}
                onChangeText={setNewStudentEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {/* Department & Section */}
              <View style={{ flexDirection: "row", gap: 10 }}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputFieldLabel, { color: colors.adminTextSecondary }]}>Department</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                    value={newStudentDept}
                    onChangeText={setNewStudentDept}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.inputFieldLabel, { color: colors.adminTextSecondary }]}>Section</Text>
                  <TextInput
                    style={[styles.formInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                    value={newStudentSection}
                    onChangeText={setNewStudentSection}
                  />
                </View>
              </View>

              {/* Initial Attendance Status */}
              <Text style={[styles.inputFieldLabel, { color: colors.adminTextSecondary }]}>Initial Attendance Status</Text>
              <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
                {(["Present", "Absent", "Late"] as const).map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.statusToggleBtn,
                      { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder },
                      newStudentStatus === st &&
                        (st === "Present"
                          ? { backgroundColor: "#DCFCE7", borderColor: "#16A34A" }
                          : st === "Absent"
                          ? { backgroundColor: "#FEE2E2", borderColor: "#DC2626" }
                          : { backgroundColor: "#FEF3C7", borderColor: "#D97706" }),
                    ]}
                    onPress={() => setNewStudentStatus(st)}
                  >
                    <Text
                      style={[
                        styles.statusToggleBtnText,
                        { color: colors.adminTextSecondary },
                        newStudentStatus === st &&
                          (st === "Present"
                            ? { color: "#16A34A", fontWeight: "700" }
                            : st === "Absent"
                            ? { color: "#DC2626", fontWeight: "700" }
                            : { color: "#D97706", fontWeight: "700" }),
                      ]}
                    >
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Remarks */}
              <Text style={[styles.inputFieldLabel, { color: colors.adminTextSecondary }]}>Remarks (Optional)</Text>
              <TextInput
                style={[styles.formInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                placeholder="e.g. Regular student"
                placeholderTextColor={colors.adminTextSecondary}
                value={newStudentRemarks}
                onChangeText={setNewStudentRemarks}
              />
            </ScrollView>

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={[styles.cancelBtn, { backgroundColor: colors.adminInputBg }]}
                onPress={() => setAddStudentModalVisible(false)}
              >
                <Text style={[styles.cancelBtnText, { color: colors.adminTextSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.saveBtn}
                onPress={handleAddStudent}
              >
                <Text style={styles.saveBtnText}>Add Student</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* STUDENT ACTION MODAL (Change status, remarks, or remove) */}
      <Modal
        visible={!!actionModalStudent}
        transparent
        animationType="fade"
        onRequestClose={() => setActionModalStudent(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setActionModalStudent(null)}
        >
          <Pressable style={[styles.quickModalCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder, borderWidth: 1 }]} onPress={(e) => e.stopPropagation()}>
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={[styles.modalStudentName, { color: colors.adminText }]}>
                  {actionModalStudent?.studentName}
                </Text>
                <Text style={[styles.modalRollNo, { color: colors.adminTextSecondary }]}>
                  {actionModalStudent?.rollNo} • Current: {actionModalStudent?.status}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setActionModalStudent(null)}>
                <Ionicons name="close" size={22} color={colors.adminTextSecondary} />
              </TouchableOpacity>
            </View>

            <View style={{ gap: 10 }}>
              {/* Quick Status Options */}
              <Text style={[styles.modalPromptText, { color: colors.adminTextSecondary }]}>Mark Attendance Status:</Text>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {(["Present", "Absent", "Late"] as const).map((st) => (
                  <TouchableOpacity
                    key={st}
                    style={[
                      styles.statusToggleBtn,
                      { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder },
                      actionModalStudent?.status === st &&
                        (st === "Present"
                          ? { backgroundColor: "#DCFCE7", borderColor: "#16A34A" }
                          : st === "Absent"
                          ? { backgroundColor: "#FEE2E2", borderColor: "#DC2626" }
                          : { backgroundColor: "#FEF3C7", borderColor: "#D97706" }),
                    ]}
                    onPress={() => {
                      if (actionModalStudent) {
                        updateStudentStatus(actionModalStudent.id, st);
                        setActionModalStudent(null);
                      }
                    }}
                  >
                    <Text
                      style={[
                        styles.statusToggleBtnText,
                        { color: colors.adminTextSecondary },
                        actionModalStudent?.status === st &&
                          (st === "Present"
                            ? { color: "#16A34A", fontWeight: "700" }
                            : st === "Absent"
                            ? { color: "#DC2626", fontWeight: "700" }
                            : { color: "#D97706", fontWeight: "700" }),
                      ]}
                    >
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Edit Remarks button */}
              <TouchableOpacity
                style={styles.actionMenuBtn}
                onPress={() => {
                  if (actionModalStudent) {
                    setRemarksModalStudent(actionModalStudent);
                    setRemarksInput(
                      actionModalStudent.remarks === "-" ? "" : actionModalStudent.remarks
                    );
                    setActionModalStudent(null);
                  }
                }}
              >
                <Ionicons name="create-outline" size={17} color="#2563EB" />
                <Text style={styles.actionMenuBtnText}>Edit Remarks</Text>
              </TouchableOpacity>

              {/* VIEW MONTHLY ATTENDANCE BREAKDOWN */}
              <TouchableOpacity
                style={[
                  styles.actionMenuBtn,
                  { backgroundColor: isDark ? "rgba(37,99,235,0.15)" : "#EFF6FF", borderColor: "#BFDBFE" },
                ]}
                onPress={() => {
                  if (actionModalStudent) {
                    const st = actionModalStudent;
                    setActionModalStudent(null);
                    setStudentMonthlyModal(st);
                  }
                }}
              >
                <Ionicons name="calendar-outline" size={17} color="#2563EB" />
                <Text style={[styles.actionMenuBtnText, { color: "#2563EB", fontWeight: "700" }]}>
                  View Monthly Attendance Breakdown
                </Text>
              </TouchableOpacity>

              {/* BLOCK / UNBLOCK STUDENT BUTTON */}
              <TouchableOpacity
                style={[
                  styles.actionMenuBtn,
                  actionModalStudent?.isBlocked
                    ? { backgroundColor: isDark ? "rgba(16,185,129,0.15)" : "#DCFCE7", borderColor: "#86EFAC" }
                    : { backgroundColor: isDark ? "rgba(245,158,11,0.15)" : "#FEF3C7", borderColor: "#FDE68A" },
                ]}
                onPress={() => {
                  if (actionModalStudent) {
                    const st = actionModalStudent;
                    setActionModalStudent(null);
                    openBlockStudentModal(st);
                  }
                }}
              >
                <Ionicons
                  name={actionModalStudent?.isBlocked ? "lock-open-outline" : "ban-outline"}
                  size={17}
                  color={actionModalStudent?.isBlocked ? "#16A34A" : "#D97706"}
                />
                <Text
                  style={[
                    styles.actionMenuBtnText,
                    { color: actionModalStudent?.isBlocked ? "#16A34A" : "#D97706" },
                  ]}
                >
                  {actionModalStudent?.isBlocked ? "Unblock Student Account" : "Block Student Account"}
                </Text>
              </TouchableOpacity>

              {/* REMOVE STUDENT FROM TODAY'S CLASS */}
              <TouchableOpacity
                style={[styles.removeStudentActionBtn, { backgroundColor: isDark ? "rgba(245,158,11,0.15)" : "#FFFBEB", borderColor: "#F59E0B" }]}
                onPress={() => {
                  if (actionModalStudent) {
                    const st = actionModalStudent;
                    setActionModalStudent(null);
                    openRemoveStudentModal(st);
                  }
                }}
              >
                <Ionicons name="person-remove-outline" size={17} color="#D97706" />
                <Text style={[styles.removeStudentActionText, { color: "#D97706" }]}>Remove from Today's Class</Text>
              </TouchableOpacity>

              {/* PERMANENTLY DELETE STUDENT */}
              <TouchableOpacity
                style={styles.removeStudentActionBtn}
                onPress={() => {
                  if (actionModalStudent) {
                    const st = actionModalStudent;
                    setActionModalStudent(null);
                    openDeleteStudentModal(st);
                  }
                }}
              >
                <Ionicons name="trash-outline" size={17} color="#DC2626" />
                <Text style={styles.removeStudentActionText}>Permanently Delete Student</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ===================================================== */}
      {/* ATTENDANCE BLOCK / UNBLOCK MODAL */}
      {/* ===================================================== */}
      <Modal visible={!!blockModalStudent} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => !blockLoading && setBlockModalStudent(null)}>
          <Pressable
            style={[
              styles.confirmModalCard,
              { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View
              style={[
                styles.confirmIconCircle,
                blockModalStudent?.isBlocked
                  ? { backgroundColor: isDark ? "rgba(16,185,129,0.2)" : "#DCFCE7" }
                  : { backgroundColor: isDark ? "rgba(245,158,11,0.2)" : "#FEF3C7" },
              ]}
            >
              <Ionicons
                name={blockModalStudent?.isBlocked ? "shield-checkmark" : "ban"}
                size={28}
                color={blockModalStudent?.isBlocked ? "#10B981" : "#D97706"}
              />
            </View>

            <Text style={[styles.confirmModalTitle, { color: colors.adminText }]}>
              {blockModalStudent?.isBlocked ? "Unblock Student Account" : "Block Student Account"}
            </Text>

            <Text style={[styles.confirmModalMessage, { color: colors.adminTextSecondary }]}>
              {blockModalStudent?.isBlocked
                ? `Restore full account access and active attendance status for ${blockModalStudent?.studentName} (${blockModalStudent?.rollNo})?`
                : `Are you sure you want to block ${blockModalStudent?.studentName} (${blockModalStudent?.rollNo})? The student will be marked as blocked in attendance and cannot log in.`}
            </Text>

            <View style={styles.confirmModalActionsRow}>
              <TouchableOpacity
                style={[styles.confirmCancelBtn, { backgroundColor: colors.adminInputBg }]}
                onPress={() => !blockLoading && setBlockModalStudent(null)}
                disabled={blockLoading}
              >
                <Text style={[styles.confirmCancelBtnText, { color: colors.adminTextSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmActionBtn,
                  { backgroundColor: blockModalStudent?.isBlocked ? "#10B981" : "#D97706" },
                ]}
                onPress={handleConfirmBlockStudent}
                disabled={blockLoading}
              >
                {blockLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons
                      name={blockModalStudent?.isBlocked ? "lock-open-outline" : "ban-outline"}
                      size={16}
                      color="#FFFFFF"
                      style={{ marginRight: 6 }}
                    />
                    <Text style={styles.confirmActionBtnText}>
                      {blockModalStudent?.isBlocked ? "Unblock" : "Block"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ===================================================== */}
      {/* ATTENDANCE REMOVE FROM CLASS MODAL */}
      {/* ===================================================== */}
      <Modal visible={!!removeModalStudent} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => !removeLoading && setRemoveModalStudent(null)}>
          <Pressable
            style={[
              styles.confirmModalCard,
              { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.confirmIconCircle, { backgroundColor: isDark ? "rgba(245,158,11,0.2)" : "#FEF3C7" }]}>
              <Ionicons name="person-remove" size={28} color="#D97706" />
            </View>

            <Text style={[styles.confirmModalTitle, { color: colors.adminText }]}>
              Remove from Class Sheet
            </Text>

            <Text style={[styles.confirmModalMessage, { color: colors.adminTextSecondary }]}>
              Remove <Text style={{ fontWeight: "700", color: colors.adminText }}>{removeModalStudent?.studentName}</Text> ({removeModalStudent?.rollNo}) from today's attendance sheet? This will detach them from this class session.
            </Text>

            <View style={styles.confirmModalActionsRow}>
              <TouchableOpacity
                style={[styles.confirmCancelBtn, { backgroundColor: colors.adminInputBg }]}
                onPress={() => !removeLoading && setRemoveModalStudent(null)}
                disabled={removeLoading}
              >
                <Text style={[styles.confirmCancelBtnText, { color: colors.adminTextSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmActionBtn, { backgroundColor: "#D97706" }]}
                onPress={handleConfirmRemoveStudent}
                disabled={removeLoading}
              >
                {removeLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.confirmActionBtnText}>Remove Student</Text>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ===================================================== */}
      {/* ATTENDANCE PERMANENT DELETE MODAL */}
      {/* ===================================================== */}
      <Modal visible={!!deleteModalStudent} transparent animationType="fade">
        <Pressable style={styles.modalBackdrop} onPress={() => !deleteLoading && setDeleteModalStudent(null)}>
          <Pressable
            style={[
              styles.confirmModalCard,
              { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.confirmIconCircle, { backgroundColor: isDark ? "rgba(239,68,68,0.2)" : "#FEE2E2" }]}>
              <Ionicons name="trash" size={28} color="#EF4444" />
            </View>

            <Text style={[styles.confirmModalTitle, { color: colors.adminText }]}>
              Permanently Delete Student
            </Text>

            <Text style={[styles.confirmModalMessage, { color: colors.adminTextSecondary }]}>
              Are you sure you want to permanently delete{" "}
              <Text style={{ fontWeight: "700", color: colors.adminText }}>
                {deleteModalStudent?.studentName}
              </Text>{" "}
              ({deleteModalStudent?.rollNo}) from Firebase? This will delete the student profile across the entire system.
            </Text>

            <View style={styles.confirmModalActionsRow}>
              <TouchableOpacity
                style={[styles.confirmCancelBtn, { backgroundColor: colors.adminInputBg }]}
                onPress={() => !deleteLoading && setDeleteModalStudent(null)}
                disabled={deleteLoading}
              >
                <Text style={[styles.confirmCancelBtnText, { color: colors.adminTextSecondary }]}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.confirmActionBtn, { backgroundColor: "#DC2626" }]}
                onPress={handleConfirmDeleteStudent}
                disabled={deleteLoading}
              >
                {deleteLoading ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <>
                    <Ionicons name="trash-outline" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.confirmActionBtnText}>Delete Permanently</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>

      {/* ===================================================== */}
      {/* STUDENT MONTHLY ATTENDANCE BREAKDOWN MODAL */}
      {/* ===================================================== */}
      <Modal
        visible={!!studentMonthlyModal}
        transparent
        animationType="fade"
        onRequestClose={() => setStudentMonthlyModal(null)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setStudentMonthlyModal(null)}
        >
          <Pressable
            style={[
              styles.monthlyDetailCard,
              { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={styles.modalHeaderRow}>
              <View>
                <Text style={[styles.modalStudentName, { color: colors.adminText }]}>
                  {studentMonthlyModal?.studentName}
                </Text>
                <Text style={[styles.modalRollNo, { color: colors.adminTextSecondary }]}>
                  {studentMonthlyModal?.rollNo} • {studentMonthlyModal?.department || selectedDept} - Sec {studentMonthlyModal?.section || selectedSection}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setStudentMonthlyModal(null)}>
                <Ionicons name="close" size={22} color={colors.adminTextSecondary} />
              </TouchableOpacity>
            </View>

            {/* Modal Tab Switcher: Daily Calendar vs Subject Breakdown */}
            <View style={styles.modalTabBar}>
              <TouchableOpacity
                style={[
                  styles.modalTabBtn,
                  modalActiveTab === "calendar" && styles.modalTabBtnActive,
                ]}
                onPress={() => setModalActiveTab("calendar")}
              >
                <Ionicons
                  name="calendar-outline"
                  size={14}
                  color={modalActiveTab === "calendar" ? "#2563EB" : colors.adminTextSecondary}
                />
                <Text
                  style={[
                    styles.modalTabBtnText,
                    { color: modalActiveTab === "calendar" ? "#2563EB" : colors.adminTextSecondary },
                    modalActiveTab === "calendar" && styles.modalTabBtnTextActive,
                  ]}
                >
                  Daily History Calendar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modalTabBtn,
                  modalActiveTab === "subjects" && styles.modalTabBtnActive,
                ]}
                onPress={() => setModalActiveTab("subjects")}
              >
                <Ionicons
                  name="library-outline"
                  size={14}
                  color={modalActiveTab === "subjects" ? "#2563EB" : colors.adminTextSecondary}
                />
                <Text
                  style={[
                    styles.modalTabBtnText,
                    { color: modalActiveTab === "subjects" ? "#2563EB" : colors.adminTextSecondary },
                    modalActiveTab === "subjects" && styles.modalTabBtnTextActive,
                  ]}
                >
                  Subject Breakdown
                </Text>
              </TouchableOpacity>
            </View>

            {/* TAB 1: DAILY CALENDAR HISTORY */}
            {modalActiveTab === "calendar" && (
              <>
                {/* Sub-header: Month & Subject */}
                <View style={styles.monthlyDetailSubHeader}>
                  <View style={styles.monthlyDetailBadge}>
                    <Ionicons name="calendar" size={14} color="#2563EB" />
                    <Text style={styles.monthlyDetailBadgeText}>
                      {selectedMonth} Attendance Register
                    </Text>
                  </View>
                  <Text style={[styles.monthlyDetailSubjectText, { color: colors.adminTextSecondary }]}>
                    {selectedSubject}
                  </Text>
                </View>

                {/* 4 KPI Metrics Boxes */}
                <View style={styles.monthlyDetailGrid}>
                  {/* Classes Held */}
                  <View style={[styles.monthlyMiniCard, { backgroundColor: colors.adminInputBg }]}>
                    <Text style={[styles.monthlyMiniLabel, { color: colors.adminTextSecondary }]}>Total Held</Text>
                    <Text style={[styles.monthlyMiniVal, { color: colors.adminText }]}>{monthWorkingDays}</Text>
                    <Text style={styles.monthlyMiniSub}>Classes</Text>
                  </View>

                  {/* Present */}
                  <View style={[styles.monthlyMiniCard, { backgroundColor: "#DCFCE7" }]}>
                    <Text style={[styles.monthlyMiniLabel, { color: "#16A34A" }]}>Present</Text>
                    <Text style={[styles.monthlyMiniVal, { color: "#16A34A" }]}>
                      {studentMonthlyModal?.monthPresentCount ?? 22}
                    </Text>
                    <Text style={[styles.monthlyMiniSub, { color: "#16A34A" }]}>
                      out of {monthWorkingDays}
                    </Text>
                  </View>

                  {/* Absent */}
                  <View style={[styles.monthlyMiniCard, { backgroundColor: "#FEE2E2" }]}>
                    <Text style={[styles.monthlyMiniLabel, { color: "#DC2626" }]}>Absent</Text>
                    <Text style={[styles.monthlyMiniVal, { color: "#DC2626" }]}>
                      {studentMonthlyModal?.monthAbsentCount ?? 2}
                    </Text>
                    <Text style={[styles.monthlyMiniSub, { color: "#DC2626" }]}>Days Missed</Text>
                  </View>

                  {/* Percentage */}
                  {(() => {
                    const p = studentMonthlyModal?.monthPresentCount ?? 22;
                    const pct = monthWorkingDays > 0 ? ((p / monthWorkingDays) * 100).toFixed(1) : "91.7";
                    const isSafe = Number(pct) >= 75;
                    return (
                      <View
                        style={[
                          styles.monthlyMiniCard,
                          { backgroundColor: isSafe ? "#EFF6FF" : "#FEF3C7" },
                        ]}
                      >
                        <Text style={[styles.monthlyMiniLabel, { color: isSafe ? "#2563EB" : "#D97706" }]}>
                          Percentage
                        </Text>
                        <Text style={[styles.monthlyMiniVal, { color: isSafe ? "#2563EB" : "#D97706" }]}>
                          {pct}%
                        </Text>
                        <Text style={[styles.monthlyMiniSub, { color: isSafe ? "#2563EB" : "#D97706" }]}>
                          {isSafe ? "Eligible" : "Shortage"}
                        </Text>
                      </View>
                    );
                  })()}
                </View>

                {/* Attendance Status Banner */}
                {(() => {
                  const p = studentMonthlyModal?.monthPresentCount ?? 22;
                  const pct = monthWorkingDays > 0 ? ((p / monthWorkingDays) * 100).toFixed(1) : "91.7";
                  const isSafe = Number(pct) >= 75;
                  return (
                    <View
                      style={[
                        styles.monthlyStatusBanner,
                        { backgroundColor: isSafe ? "#DCFCE7" : "#FEE2E2", borderColor: isSafe ? "#86EFAC" : "#FCA5A5" },
                      ]}
                    >
                      <Ionicons
                        name={isSafe ? "checkmark-circle" : "warning"}
                        size={18}
                        color={isSafe ? "#16A34A" : "#DC2626"}
                      />
                      <Text style={[styles.monthlyStatusBannerText, { color: isSafe ? "#16A34A" : "#DC2626" }]}>
                        {isSafe
                          ? `Academic Standing: Good (${pct}%) — Meets University 75% exam criterion.`
                          : `Academic Warning: Attendance Shortage (${pct}%) — Below minimum 75% requirement.`}
                      </Text>
                    </View>
                  );
                })()}

                {/* Day-by-Day Visual Calendar for Selected Month */}
                <Text style={[styles.monthlyGridHeading, { color: colors.adminText }]}>
                  {currentMonthConfig.name} Day-by-Day Attendance History:
                </Text>
                <ScrollView style={{ maxHeight: 220 }} showsVerticalScrollIndicator={false}>
                  <View style={styles.calendarDayGrid}>
                    {Array.from({ length: currentMonthConfig.days }, (_, i) => i + 1).map((dayNum) => {
                      const dayOfWeek = getDayOfWeekName(currentMonthConfig.year, currentMonthConfig.monthIdx, dayNum);
                      const isSun = dayOfWeek === "Sun";
                      const isToday = dayNum === 28 && selectedMonth === "September 2026";

                      // Compute day status for this student
                      let dayStatus = "P";
                      if (isSun) {
                        dayStatus = "OFF";
                      } else if (isToday) {
                        dayStatus = studentMonthlyModal?.status === "Present" ? "P" : studentMonthlyModal?.status === "Absent" ? "A" : "L";
                      } else {
                        const absDays = studentMonthlyModal?.monthAbsentCount ?? 2;
                        if (absDays >= 5 && (dayNum === 5 || dayNum === 12 || dayNum === 18 || dayNum === 22 || dayNum === 24)) {
                          dayStatus = "A";
                        } else if (absDays >= 3 && (dayNum === 8 || dayNum === 15 || dayNum === 21)) {
                          dayStatus = "A";
                        } else if (absDays >= 1 && (dayNum === 10 || dayNum === 20)) {
                          dayStatus = "A";
                        } else if ((studentMonthlyModal?.monthLateCount ?? 0) > 0 && dayNum === 14) {
                          dayStatus = "L";
                        } else {
                          dayStatus = "P";
                        }
                      }

                      const boxBg = dayStatus === "P"
                        ? "#DCFCE7"
                        : dayStatus === "A"
                        ? "#FEE2E2"
                        : dayStatus === "L"
                        ? "#FEF3C7"
                        : colors.adminInputBg;

                      const textColor = dayStatus === "P"
                        ? "#16A34A"
                        : dayStatus === "A"
                        ? "#DC2626"
                        : dayStatus === "L"
                        ? "#D97706"
                        : colors.adminTextSecondary;

                      return (
                        <TouchableOpacity
                          key={dayNum}
                          style={[
                            styles.calendarDayCell,
                            { backgroundColor: boxBg, borderColor: isToday ? "#2563EB" : colors.adminCardBorder },
                            isToday && { borderWidth: 2 },
                          ]}
                          onPress={() => {
                            if (!isSun && studentMonthlyModal) {
                              const next = dayStatus === "P" ? "Absent" : dayStatus === "Absent" || dayStatus === "A" ? "Late" : "Present";
                              updateStudentStatus(studentMonthlyModal.id, next as any);
                              setStudentMonthlyModal((prev) => prev ? { ...prev, status: next as any } : null);
                            }
                          }}
                        >
                          <Text style={[styles.calendarDayCellNum, { color: textColor }]}>
                            {dayNum}
                          </Text>
                          <Text style={[styles.calendarDayCellSub, { color: textColor }]}>
                            {dayStatus}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </ScrollView>
              </>
            )}

            {/* TAB 2: SUBJECT-WISE BREAKDOWN */}
            {modalActiveTab === "subjects" && (() => {
              const modalSubjectBreakdown = studentMonthlyModal
                ? getStudentSubjectBreakdown(studentMonthlyModal, selectedSubject, monthWorkingDays)
                : [];
              const totalSubClasses = modalSubjectBreakdown.reduce((sum, s) => sum + s.totalClasses, 0);
              const totalSubPresent = modalSubjectBreakdown.reduce((sum, s) => sum + s.presentCount, 0);
              const totalSubAbsent = modalSubjectBreakdown.reduce((sum, s) => sum + s.absentCount, 0);
              const totalSubLate = modalSubjectBreakdown.reduce((sum, s) => sum + s.lateCount, 0);
              const overallSubPct = totalSubClasses > 0 ? ((totalSubPresent / totalSubClasses) * 100).toFixed(1) : "0.0";
              const shortageCount = modalSubjectBreakdown.filter((s) => !s.isEligible).length;

              return (
                <View>
                  {/* Overall 6-Subject Summary Row */}
                  <View style={[styles.studentSubjOverallCard, { backgroundColor: colors.adminInputBg }]}>
                    <View style={styles.studentSubjOverallHeader}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                        <Ionicons name="school" size={16} color="#2563EB" />
                        <Text style={[styles.studentSubjOverallTitle, { color: colors.adminText }]}>
                          Semester Cross-Subject Average
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.studentSubjEligiblePill,
                          { backgroundColor: shortageCount === 0 ? "#DCFCE7" : "#FEE2E2" },
                        ]}
                      >
                        <Ionicons
                          name={shortageCount === 0 ? "checkmark-circle" : "warning"}
                          size={12}
                          color={shortageCount === 0 ? "#16A34A" : "#DC2626"}
                        />
                        <Text
                          style={[
                            styles.studentSubjEligiblePillText,
                            { color: shortageCount === 0 ? "#16A34A" : "#DC2626" },
                          ]}
                        >
                          {shortageCount === 0 ? "Eligible in All Subjects" : `${shortageCount} Subject Shortage`}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.studentSubjOverallGrid}>
                      <View style={styles.studentSubjOverallCol}>
                        <Text style={[styles.studentSubjOverallLabel, { color: colors.adminTextSecondary }]}>Total Held</Text>
                        <Text style={[styles.studentSubjOverallVal, { color: colors.adminText }]}>{totalSubClasses}</Text>
                        <Text style={styles.studentSubjOverallSub}>Lectures</Text>
                      </View>
                      <View style={styles.studentSubjOverallCol}>
                        <Text style={[styles.studentSubjOverallLabel, { color: "#16A34A" }]}>Present</Text>
                        <Text style={[styles.studentSubjOverallVal, { color: "#16A34A" }]}>{totalSubPresent}</Text>
                        <Text style={[styles.studentSubjOverallSub, { color: "#16A34A" }]}>Attended</Text>
                      </View>
                      <View style={styles.studentSubjOverallCol}>
                        <Text style={[styles.studentSubjOverallLabel, { color: "#DC2626" }]}>Absent</Text>
                        <Text style={[styles.studentSubjOverallVal, { color: "#DC2626" }]}>{totalSubAbsent}</Text>
                        <Text style={[styles.studentSubjOverallSub, { color: "#DC2626" }]}>Missed</Text>
                      </View>
                      <View style={styles.studentSubjOverallCol}>
                        <Text style={[styles.studentSubjOverallLabel, { color: "#2563EB" }]}>Overall %</Text>
                        <Text style={[styles.studentSubjOverallVal, { color: "#2563EB" }]}>{overallSubPct}%</Text>
                        <Text style={[styles.studentSubjOverallSub, { color: "#2563EB" }]}>Average</Text>
                      </View>
                    </View>
                  </View>

                  {/* 6 Subject Detail Rows */}
                  <Text style={[styles.monthlyGridHeading, { color: colors.adminText, marginTop: 10 }]}>
                    Subject-Wise Attendance Details:
                  </Text>
                  <ScrollView style={{ maxHeight: 250 }} showsVerticalScrollIndicator={false}>
                    <View style={{ gap: 8, paddingBottom: 6 }}>
                      {modalSubjectBreakdown.map((sb) => {
                        const isSelectedSub = sb.subjectName === selectedSubject;
                        return (
                          <View
                            key={sb.subjectId}
                            style={[
                              styles.studentSubjRowCard,
                              { backgroundColor: colors.adminCard, borderColor: isSelectedSub ? "#2563EB" : colors.adminCardBorder },
                              isSelectedSub && { borderWidth: 1.5 },
                            ]}
                          >
                            <View style={styles.studentSubjRowHeader}>
                              <View style={{ flex: 1 }}>
                                <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                  <Text style={[styles.studentSubjCodeBadge, { color: "#2563EB" }]}>{sb.subjectCode}</Text>
                                  <Text style={[styles.studentSubjName, { color: colors.adminText }]} numberOfLines={1}>
                                    {sb.subjectName}
                                  </Text>
                                  {isSelectedSub && (
                                    <View style={styles.currentSubjTag}>
                                      <Text style={styles.currentSubjTagText}>Current</Text>
                                    </View>
                                  )}
                                </View>
                                <Text style={[styles.studentSubjFaculty, { color: colors.adminTextSecondary }]}>
                                  {sb.faculty} • {sb.totalClasses} Classes
                                </Text>
                              </View>

                              {/* Percentage Pill */}
                              <View
                                style={[
                                  styles.studentSubjPctBadge,
                                  { backgroundColor: sb.isEligible ? "#DCFCE7" : "#FEE2E2" },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.studentSubjPctBadgeText,
                                    { color: sb.isEligible ? "#16A34A" : "#DC2626" },
                                  ]}
                                >
                                  {sb.percentage}%
                                </Text>
                              </View>
                            </View>

                            {/* Stat Counts */}
                            <View style={styles.studentSubjCountsRow}>
                              <Text style={[styles.studentSubjCountText, { color: "#16A34A" }]}>
                                ✓ Present: {sb.presentCount} / {sb.totalClasses}
                              </Text>
                              <Text style={[styles.studentSubjCountText, { color: "#DC2626" }]}>
                                ✗ Absent: {sb.absentCount}
                              </Text>
                              {sb.lateCount > 0 && (
                                <Text style={[styles.studentSubjCountText, { color: "#D97706" }]}>
                                  ◷ Late: {sb.lateCount}
                                </Text>
                              )}
                            </View>

                            {/* Multi-color Progress Bar */}
                            <View style={styles.studentSubjProgressBarBg}>
                              <View
                                style={[
                                  styles.studentSubjProgressBarFill,
                                  {
                                    width: `${Math.min(100, Math.max(0, sb.percentage))}%`,
                                    backgroundColor: sb.isEligible ? "#16A34A" : "#DC2626",
                                  },
                                ]}
                              />
                            </View>

                            {/* Eligibility Alert Note */}
                            <View style={styles.studentSubjEligibilityRow}>
                              <Ionicons
                                name={sb.isEligible ? "checkmark-circle" : "alert-circle"}
                                size={12}
                                color={sb.isEligible ? "#16A34A" : "#DC2626"}
                              />
                              <Text
                                style={[
                                  styles.studentSubjEligibilityText,
                                  { color: sb.isEligible ? "#16A34A" : "#DC2626" },
                                ]}
                              >
                                {sb.isEligible
                                  ? "Eligible for University Examinations (≥ 75%)"
                                  : `Shortage Alert: Must attend next ${sb.classesNeededFor75} ${sb.classesNeededFor75 === 1 ? "class" : "classes"} continuously to reach 75%.`}
                              </Text>
                            </View>

                            {/* Teacher/Admin Re-change Attendance Control */}
                            <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: colors.adminCardBorder }}>
                              <Text style={{ fontSize: 11, fontWeight: "700", color: colors.adminTextSecondary }}>
                                Re-change Attendance:
                              </Text>
                              <View style={{ flexDirection: "row", gap: 6 }}>
                                <TouchableOpacity
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    backgroundColor: "#DCFCE7",
                                    borderWidth: 1,
                                    borderColor: "#86EFAC",
                                    paddingHorizontal: 8,
                                    paddingVertical: 4,
                                    borderRadius: 6,
                                    gap: 3,
                                  }}
                                  onPress={async () => {
                                    if (!ensureAuthorized()) return;
                                    if (!studentMonthlyModal) return;
                                    await rechangeSubjectAttendanceInModal(studentMonthlyModal, sb.subjectName, "Present");
                                  }}
                                >
                                  <Ionicons name="checkmark-circle" size={12} color="#16A34A" />
                                  <Text style={{ fontSize: 10, fontWeight: "800", color: "#16A34A" }}>Present</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    backgroundColor: "#FEE2E2",
                                    borderWidth: 1,
                                    borderColor: "#FCA5A5",
                                    paddingHorizontal: 8,
                                    paddingVertical: 4,
                                    borderRadius: 6,
                                    gap: 3,
                                  }}
                                  onPress={async () => {
                                    if (!ensureAuthorized()) return;
                                    if (!studentMonthlyModal) return;
                                    await rechangeSubjectAttendanceInModal(studentMonthlyModal, sb.subjectName, "Absent");
                                  }}
                                >
                                  <Ionicons name="close-circle" size={12} color="#DC2626" />
                                  <Text style={{ fontSize: 10, fontWeight: "800", color: "#DC2626" }}>Absent</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                  style={{
                                    flexDirection: "row",
                                    alignItems: "center",
                                    backgroundColor: "#FEF3C7",
                                    borderWidth: 1,
                                    borderColor: "#FDE68A",
                                    paddingHorizontal: 8,
                                    paddingVertical: 4,
                                    borderRadius: 6,
                                    gap: 3,
                                  }}
                                  onPress={async () => {
                                    if (!ensureAuthorized()) return;
                                    if (!studentMonthlyModal) return;
                                    await rechangeSubjectAttendanceInModal(studentMonthlyModal, sb.subjectName, "Late");
                                  }}
                                >
                                  <Ionicons name="time" size={12} color="#D97706" />
                                  <Text style={{ fontSize: 10, fontWeight: "800", color: "#D97706" }}>Late</Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          </View>
                        );
                      })}

                    </View>
                  </ScrollView>
                </View>
              );
            })()}

            <View style={styles.modalActionsRow}>
              <TouchableOpacity
                style={[styles.saveBtn, { width: "100%", justifyContent: "center", alignItems: "center" }]}
                onPress={() => setStudentMonthlyModal(null)}
              >
                <Text style={styles.saveBtnText}>Close Attendance Sheet</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

// =====================================================
// STYLES (MATCHING REFERENCE SCREENSHOT PIXEL-PERFECTLY)
// =====================================================
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#0F1A3A",
  },
  outerLayout: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: "#F4F6FB",
  },

  // SIDEBAR STYLES (DARK NAVY / SLATE)
  sidebar: {
    width: 230,
    backgroundColor: "#0F1A3A",
    paddingVertical: 18,
    paddingHorizontal: 14,
    borderRightWidth: 1,
    borderRightColor: "#1E2A4F",
    justifyContent: "space-between",
  },
  mobileSidebar: {
    width: 250,
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    zIndex: 999,
  },
  mobileOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    flexDirection: "row",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  brandIconBox: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  brandSubtitle: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
  },
  closeSidebarBtn: {
    marginLeft: "auto",
    padding: 4,
  },
  navListContainer: {
    paddingVertical: 4,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 3,
  },
  navItemParent: {
    marginBottom: 2,
  },
  navItemActive: {
    backgroundColor: "#2563EB",
  },
  navLabel: {
    fontSize: 13,
    color: "#94A3B8",
    marginLeft: 11,
    fontWeight: "500",
  },
  navLabelActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  subNavItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 9,
    paddingHorizontal: 12,
    paddingLeft: 22,
    borderRadius: 8,
    marginBottom: 3,
  },
  subNavItemActive: {
    backgroundColor: "#2563EB",
  },
  subNavLabel: {
    fontSize: 13,
    color: "#94A3B8",
    marginLeft: 11,
    fontWeight: "500",
  },
  subNavLabelActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderTopWidth: 1,
    borderTopColor: "#1E2A4F",
    marginTop: 8,
  },
  logoutText: {
    fontSize: 13,
    color: "#94A3B8",
    marginLeft: 10,
    fontWeight: "500",
  },

  // MAIN CONTENT AREA
  mainContent: {
    flex: 1,
    backgroundColor: "#F4F6FB",
  },

  // TOP BAR
  topHeaderBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E8EDF5",
  },
  hamburgerBtn: {
    marginRight: 14,
    padding: 4,
  },
  topSearchBox: {
    flex: 1,
    maxWidth: 420,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  topSearchInput: {
    flex: 1,
    fontSize: 13,
    color: "#0F172A",
    marginLeft: 8,
  },
  topRightControls: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 16,
    gap: 12,
  },
  notifBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  profileDropdown: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  adminAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#2563EB",
    alignItems: "center",
    justifyContent: "center",
  },
  adminAvatarLetter: {
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 14,
  },
  adminNameText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E293B",
  },

  // DASHBOARD SCROLL BODY
  scrollBody: {
    padding: 24,
    paddingBottom: 40,
  },

  // TITLE & BREADCRUMBS
  pageTitleBlock: {
    marginBottom: 20,
  },
  pageMainHeading: {
    fontSize: 26,
    fontWeight: "800",
    color: "#0F172A",
    letterSpacing: -0.5,
  },
  pageSubHeading: {
    fontSize: 13,
    color: "#64748B",
    marginTop: 4,
  },
  breadcrumbRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
  },
  breadcrumbLink: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  breadcrumbActive: {
    fontSize: 12,
    color: "#2563EB",
    fontWeight: "600",
  },

  // ROLE-BASED ACCESS CONTROL BANNERS
  studentRestrictedBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#FCA5A5",
    padding: 14,
    marginBottom: 16,
    gap: 12,
  },
  studentRestrictedTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#991B1B",
    marginBottom: 2,
  },
  studentRestrictedText: {
    fontSize: 12,
    color: "#B91C1C",
    lineHeight: 16,
  },
  goToStudentAttendanceBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#DC2626",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  goToStudentAttendanceText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  authorizedRoleBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0FDF4",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#BBF7D0",
    padding: 12,
    marginBottom: 16,
    gap: 12,
  },
  authorizedRoleTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#166534",
    marginBottom: 2,
  },
  authorizedRoleText: {
    fontSize: 12,
    color: "#15803D",
  },
  disabledMarkBtn: {
    opacity: 0.5,
    backgroundColor: "#94A3B8",
  },

  // SUBJECT SELECTION CARD & BULK ACTIONS
  subjectSectionCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 14,
    marginBottom: 18,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  subjectCardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  subjectSelectorHeading: {
    fontSize: 14,
    fontWeight: "700",
    color: "#0F172A",
  },
  bulkActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  bulkBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 11,
    paddingVertical: 6,
    borderRadius: 8,
    gap: 5,
    borderWidth: 1,
  },
  bulkPresentBtn: {
    backgroundColor: "#DCFCE7",
    borderColor: "#86EFAC",
  },
  bulkAbsentBtn: {
    backgroundColor: "#FEE2E2",
    borderColor: "#FCA5A5",
  },
  bulkPresentText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#16A34A",
  },
  bulkAbsentText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#DC2626",
  },
  disabledBulkBtn: {
    opacity: 0.4,
  },
  subjectPillsList: {
    flexDirection: "row",
    gap: 8,
    paddingVertical: 2,
  },
  subjectPillItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 9,
    borderWidth: 1.5,
    gap: 7,
  },
  subjectPillDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  subjectPillCode: {
    fontSize: 11,
    fontWeight: "800",
  },
  subjectPillName: {
    fontSize: 12,
  },
  activeCheckCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 2,
  },

  // QUICK ROW ACTION BUTTONS (P / A)
  quickActionToggleBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: "#CBD5E1",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  quickActionPresentActive: {
    backgroundColor: "#16A34A",
    borderColor: "#16A34A",
  },
  quickActionAbsentActive: {
    backgroundColor: "#DC2626",
    borderColor: "#DC2626",
  },
  quickActionToggleText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#64748B",
  },
  quickActionPresentTextActive: {
    color: "#FFFFFF",
  },
  quickActionAbsentTextActive: {
    color: "#FFFFFF",
  },
  disabledToggleBtn: {
    opacity: 0.35,
  },

  // FILTER BAR ROW
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 20,
  },
  filterCard: {
    flex: 1,
    minWidth: 140,
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    paddingVertical: 10,
    paddingHorizontal: 14,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  filterIcon: {
    marginRight: 10,
  },
  filterTextGroup: {
    flex: 1,
  },
  filterFieldLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
    marginBottom: 1,
  },
  filterValRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  filterValText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0F172A",
  },
  markAttendanceBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2563EB",
    borderRadius: 10,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
    shadowColor: "#2563EB",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  markAttendanceBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // KPI STATS CARDS
  statsScrollContainer: {
    flexDirection: "row",
    gap: 14,
    marginBottom: 22,
    paddingBottom: 4,
  },
  kpiCard: {
    flex: 1,
    minWidth: 170,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  kpiIconBadge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  kpiContent: {
    flex: 1,
  },
  kpiLabel: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },
  kpiValue: {
    fontSize: 22,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
  kpiSubtext: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
    marginTop: 1,
  },
  rateTrendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginTop: 1,
  },
  rateTrendText: {
    fontSize: 11,
    color: "#16A34A",
    fontWeight: "600",
  },

  // MAIN TABLE CARD
  tableCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    overflow: "hidden",
  },
  tableCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
    flexWrap: "wrap",
    gap: 14,
  },
  tableTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  tableCardTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  filterPillsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tableFilterPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 9,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  tableFilterPillActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  tableFilterPillText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  tableFilterPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  connectedBadgeMini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  connectedBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2563EB",
  },
  legendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  tableSearchBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    width: 180,
  },
  tableSearchInput: {
    flex: 1,
    fontSize: 12,
    color: "#0F172A",
    marginLeft: 6,
  },

  // TABLE STYLES
  tableContainer: {
    minWidth: 800,
  },
  tableHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  thText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  tableBodyRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F1F5F9",
  },
  tdText: {
    fontSize: 13,
    color: "#1E293B",
  },

  // STATUS PILL BADGE
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 14,
    gap: 6,
  },
  statusBadgeDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  statusBadgeText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // TABLE FOOTER
  tableFooterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    flexWrap: "wrap",
    gap: 12,
  },
  tableFooterCount: {
    fontSize: 12,
    color: "#64748B",
  },
  paginationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  pageArrowBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
  },
  pageArrowBtnDisabled: {
    backgroundColor: "#F8FAFC",
    borderColor: "#F1F5F9",
  },
  pageBtn: {
    width: 28,
    height: 28,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  pageBtnActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  pageBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  pageBtnTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },

  // MODAL STYLES
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.5)",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  quickModalCard: {
    width: "100%",
    maxWidth: 420,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  modalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalStudentName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
  },
  modalRollNo: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
  },
  modalPromptText: {
    fontSize: 12,
    color: "#64748B",
    marginBottom: 12,
  },
  statusOptionsCol: {
    gap: 8,
  },
  statusSelectOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    gap: 10,
  },
  statusSelectOptionText: {
    fontSize: 14,
    fontWeight: "700",
  },
  remarksTextInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: "#0F172A",
    marginBottom: 12,
  },
  quickRemarksPills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginBottom: 16,
  },
  quickPill: {
    backgroundColor: "#F1F5F9",
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  quickPillText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "500",
  },
  modalActionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  cancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#F1F5F9",
  },
  cancelBtnText: {
    fontSize: 13,
    color: "#64748B",
    fontWeight: "600",
  },
  saveBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: "#2563EB",
  },
  saveBtnText: {
    fontSize: 13,
    color: "#FFFFFF",
    fontWeight: "700",
  },

  // PICKER OPTIONS
  pickerOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 8,
    marginBottom: 4,
  },
  pickerOptionActive: {
    backgroundColor: "#EFF6FF",
  },
  pickerOptionText: {
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "500",
  },
  pickerOptionTextActive: {
    color: "#2563EB",
    fontWeight: "700",
  },

  // ADD STUDENT & ACTION STYLES
  addStudentBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2563EB",
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addStudentBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  inputFieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 5,
    marginTop: 6,
  },
  formInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
    marginBottom: 10,
  },
  statusToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
  },
  statusToggleBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748B",
  },
  actionMenuBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#EFF6FF",
    borderWidth: 1,
    borderColor: "#BFDBFE",
    marginTop: 4,
  },
  actionMenuBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#2563EB",
  },
  removeStudentActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    marginTop: 4,
  },
  removeStudentActionText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#DC2626",
  },
  blockedBadgeMini: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  blockedBadgeMiniText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#DC2626",
  },
  confirmModalCard: {
    width: "90%",
    maxWidth: 420,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    alignItems: "center",
  },
  confirmIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  confirmModalTitle: {
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 10,
  },
  confirmModalMessage: {
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
    marginBottom: 24,
  },
  confirmModalActionsRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  confirmCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmCancelBtnText: {
    fontSize: 14,
    fontWeight: "600",
  },
  confirmActionBtn: {
    flex: 1,
    flexDirection: "row",
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmActionBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  // DAY NAVIGATION & SCOPE SWITCHER
  dayNavBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  dayNavLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dayNavArrowBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  dayNavArrowText: {
    fontSize: 12,
    fontWeight: "600",
  },
  todayBadgeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  todayBadgeBtnActive: {
    backgroundColor: "#EFF6FF",
    borderColor: "#2563EB",
  },
  todayBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  viewModeToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  viewModePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: 8,
    borderWidth: 1,
  },
  viewModePillActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  viewModePillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  viewModePillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  daysScrollList: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: 16,
  },
  dayChip: {
    width: 52,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dayChipActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  dayChipWeekend: {
    opacity: 0.65,
  },
  dayChipDayName: {
    fontSize: 10,
    fontWeight: "600",
    marginBottom: 2,
    textTransform: "uppercase",
  },
  dayChipNumber: {
    fontSize: 15,
    fontWeight: "800",
  },
  dayChipTextActive: {
    color: "#FFFFFF",
  },
  todayIndicatorDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#10B981",
    marginTop: 3,
  },
  todaySmallBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  todaySmallBadgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: "#16A34A",
  },

  // KPI STATS EXTENSIONS
  kpiSubRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
    marginTop: 3,
  },
  kpiHighlightText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#16A34A",
  },
  kpiHighlightTextRed: {
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
  },
  kpiHighlightTextBlue: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
  },
  kpiHighlightTextAmber: {
    fontSize: 11,
    fontWeight: "700",
    color: "#D97706",
  },
  kpiHighlightTextPurple: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8B5CF6",
  },
  badgePillGreen: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgePillGreenText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#16A34A",
  },
  badgePillRed: {
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgePillRedText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#DC2626",
  },
  badgePillBlue: {
    backgroundColor: "#EFF6FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgePillBlueText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#2563EB",
  },
  badgePillAmber: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgePillAmberText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#D97706",
  },
  badgePillPurple: {
    backgroundColor: "#F3E8FF",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgePillPurpleText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#8B5CF6",
  },

  // KPI SUMMARY BANNER
  kpiSummaryBanner: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  bannerHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 12,
  },
  bannerLeftSection: {
    flex: 1,
    minWidth: 260,
  },
  bannerRightSection: {
    flex: 1,
    minWidth: 260,
  },
  bannerDivider: {
    width: 1,
    height: "100%",
    minHeight: 50,
  },
  bannerBadgeDay: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },
  bannerBadgeDayText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#16A34A",
    letterSpacing: 0.3,
  },
  bannerBadgeMonth: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },
  bannerBadgeMonthText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#2563EB",
    letterSpacing: 0.3,
  },
  bannerMainStat: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 3,
  },
  bannerSubStat: {
    fontSize: 12,
    color: "#64748B",
  },
  bannerProgressBarBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#E2E8F0",
    flexDirection: "row",
    overflow: "hidden",
  },
  bannerProgressFill: {
    height: "100%",
  },

  // TABLE MONTH BADGES
  monthPresentBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  monthPresentText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#16A34A",
  },
  monthAbsentBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    backgroundColor: "#F1F5F9",
    alignSelf: "flex-start",
  },
  monthAbsentBadgeHigh: {
    backgroundColor: "#FEE2E2",
  },
  monthAbsentText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#64748B",
  },
  monthAbsentTextHigh: {
    color: "#DC2626",
    fontWeight: "700",
  },
  monthPctBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  monthPctText: {
    fontSize: 11,
    fontWeight: "700",
  },

  // STUDENT MONTHLY BREAKDOWN MODAL
  monthlyDetailCard: {
    width: "100%",
    maxWidth: 580,
    borderRadius: 16,
    padding: 24,
    borderWidth: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  monthlyDetailSubHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    flexWrap: "wrap",
    gap: 8,
  },
  monthlyDetailBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#EFF6FF",
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#BFDBFE",
  },
  monthlyDetailBadgeText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#2563EB",
  },
  monthlyDetailSubjectText: {
    fontSize: 12,
    fontWeight: "500",
  },
  monthlyDetailGrid: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 14,
  },
  monthlyMiniCard: {
    flex: 1,
    borderRadius: 10,
    padding: 10,
    alignItems: "center",
  },
  monthlyMiniLabel: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  monthlyMiniVal: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 2,
  },
  monthlyMiniSub: {
    fontSize: 10,
    fontWeight: "500",
    marginTop: 1,
  },
  monthlyStatusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 14,
  },
  monthlyStatusBannerText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  monthlyGridHeading: {
    fontSize: 13,
    fontWeight: "700",
    marginBottom: 10,
  },
  calendarDayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingBottom: 6,
  },
  calendarDayCell: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  calendarDayCellNum: {
    fontSize: 12,
    fontWeight: "700",
  },
  calendarDayCellSub: {
    fontSize: 9,
    fontWeight: "800",
    marginTop: 1,
  },

  // SUBJECT-WISE SECTION CAROUSEL & CARDS
  subjectSectionWrapper: {
    marginBottom: 20,
  },
  subjectSectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 12,
  },
  subjectSectionIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  subjectSectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    letterSpacing: -0.2,
  },
  subjectSectionSub: {
    fontSize: 11,
    marginTop: 2,
  },
  subjectToggleScopeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  subjectToggleScopeBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#2563EB",
  },
  subjectCardsScroll: {
    flexDirection: "row",
    gap: 12,
    paddingBottom: 4,
  },
  subjectCard: {
    width: 260,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  subjectCardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  subjectCodePill: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  subjectCodeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  selectedSubjectBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  selectedSubjectBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  switchSubjectHint: {
    fontSize: 10,
    fontWeight: "500",
  },
  subjectCardName: {
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  subjectCardFaculty: {
    fontSize: 11,
    fontWeight: "500",
    marginBottom: 10,
  },
  subjectCardGrid: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  subjectStatCol: {
    flex: 1,
    alignItems: "center",
  },
  subjectStatLabel: {
    fontSize: 9,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
  subjectStatVal: {
    fontSize: 15,
    fontWeight: "800",
    marginTop: 1,
  },
  subjectStatPct: {
    fontSize: 10,
    fontWeight: "700",
    marginTop: 1,
  },
  subjectStatDivider: {
    width: 1,
    height: 28,
  },
  subjectProgressBarBg: {
    height: 5,
    borderRadius: 2.5,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
    marginBottom: 10,
  },
  subjectProgressBarFill: {
    height: "100%",
    borderRadius: 2.5,
  },
  subjectCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  subjectShortageBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEE2E2",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  subjectShortageText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#DC2626",
  },
  subjectSafeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  subjectSafeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#16A34A",
  },

  // SUBJECT-WISE TABLE MATRIX CELLS
  subjectCellBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    width: 105,
  },
  subjectCellVal: {
    fontSize: 11,
    fontWeight: "600",
  },
  subjectCellPct: {
    fontSize: 11,
    fontWeight: "800",
  },
  eligibleBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#DCFCE7",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  eligibleBadgePillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#16A34A",
  },
  shortageBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEE2E2",
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    alignSelf: "flex-start",
  },
  shortageBadgePillText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#DC2626",
  },

  // STUDENT MODAL TAB BAR & SUBJECT BREAKDOWN
  modalTabBar: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
    paddingBottom: 8,
  },
  modalTabBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  modalTabBtnActive: {
    backgroundColor: "#EFF6FF",
  },
  modalTabBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  modalTabBtnTextActive: {
    fontWeight: "700",
  },
  studentSubjOverallCard: {
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  studentSubjOverallHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
    flexWrap: "wrap",
    gap: 6,
  },
  studentSubjOverallTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  studentSubjEligiblePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  studentSubjEligiblePillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  studentSubjOverallGrid: {
    flexDirection: "row",
    gap: 8,
  },
  studentSubjOverallCol: {
    flex: 1,
    borderRadius: 8,
    padding: 8,
    alignItems: "center",
  },
  studentSubjOverallLabel: {
    fontSize: 9,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  studentSubjOverallVal: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 2,
  },
  studentSubjOverallSub: {
    fontSize: 9,
    fontWeight: "500",
    marginTop: 1,
  },
  studentSubjRowCard: {
    borderRadius: 10,
    borderWidth: 1,
    padding: 10,
  },
  studentSubjRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  studentSubjCodeBadge: {
    fontSize: 11,
    fontWeight: "800",
    marginRight: 4,
  },
  studentSubjName: {
    fontSize: 13,
    fontWeight: "700",
    flexShrink: 1,
  },
  currentSubjTag: {
    backgroundColor: "#2563EB",
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  currentSubjTagText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  studentSubjFaculty: {
    fontSize: 11,
    fontWeight: "500",
    marginTop: 2,
  },
  studentSubjPctBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  studentSubjPctBadgeText: {
    fontSize: 12,
    fontWeight: "800",
  },
  studentSubjCountsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 6,
    flexWrap: "wrap",
  },
  studentSubjCountText: {
    fontSize: 11,
    fontWeight: "600",
  },
  studentSubjProgressBarBg: {
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E2E8F0",
    overflow: "hidden",
    marginBottom: 6,
  },
  studentSubjProgressBarFill: {
    height: "100%",
    borderRadius: 2,
  },
  studentSubjEligibilityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  studentSubjEligibilityText: {
    fontSize: 10.5,
    fontWeight: "600",
    flex: 1,
  },
});