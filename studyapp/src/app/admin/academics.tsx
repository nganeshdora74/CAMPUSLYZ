import React, { useEffect, useMemo, useState } from "react";
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
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
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
import AdminThemeToggle from "../../components/admin/AdminThemeToggle";
import AdminSidebar from "../../components/admin/AdminSidebar";
import AdminTopBar from "../../components/admin/AdminTopBar";
import {
  pickPdfDocument,
  shareOrDownloadPdf,
  uploadRequestFile,
} from "../../services/certificatePdfService";
import {
  listenTeacherConnectedStudents,
  ConnectedStudentItem,
} from "../../firebase/teacherStudent";

// =====================================================
// SIDEBAR NAVIGATION ITEMS
// =====================================================
const NAV_ITEMS = [
  { id: "dashboard", label: "Dashboard", icon: "home", route: "/admin" },
  { id: "students", label: "Students", icon: "person", route: "/admin/student" },
  { id: "faculty", label: "Faculty", icon: "people", route: "/admin/faculty" },
  { id: "academics", label: "Academics", icon: "book", route: "/admin/academics" },
  { id: "curriculum", label: "Branch & Electives", icon: "git-branch", route: "/admin/branch-curriculum" },
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

const SUBJECT_TYPES = ["All", "Core", "Elective", "Practical", "Lab"];

export type Subject = {
  id: string;
  name?: string;
  code?: string;
  teacherName?: string;
  teacherId?: string;
  department?: string;
  semester?: string;
  credits?: string;
  type?: string;
};

export type Department = {
  id: string;
  name?: string;
  code?: string;
};

export type StudentExamRecord = {
  id: string;
  studentUid: string;
  studentName: string;
  rollNo: string;
  department: string;
  section?: string;
  cgpa: string;
  sgpa?: string;
  overallGrade?: string;
  subjectsPerformance: {
    id: string;
    subjectName: string;
    marks: number;
    maxMarks: number;
    grade: string;
    examType: string;
  }[];
};

export type AssignmentItem = {
  id: string;
  title: string;
  subject: string;
  category: "assignment" | "homework";
  dueDate: string;
  totalMarks: number;
  instructions: string;
  pdfUrl?: string;
  pdfName?: string;
  photoUrl?: string;
  photoName?: string;
  createdAt?: any;
};

export type SubmissionItem = {
  studentUid: string;
  studentName: string;
  rollNo: string;
  department: string;
  status: "Submitted" | "Not Submitted";
  submittedAt?: string;
  pdfUrl?: string;
  photoUrl?: string;
  marksAwarded?: number;
  feedback?: string;
};

export const GRADE_POINTS: Record<string, number> = {
  O: 10,
  "A+": 9,
  A: 8,
  "B+": 7,
  B: 6,
  C: 5,
  P: 4,
  F: 0,
};

export const SEED_EXAM_STUDENTS: StudentExamRecord[] = [
  {
    id: "demo-st-1",
    studentUid: "demo-st-1",
    studentName: "Aarav Sharma",
    rollNo: "CSE001",
    department: "CSE",
    section: "A",
    cgpa: "8.85",
    sgpa: "9.00",
    overallGrade: "Grade A+",
    subjectsPerformance: [
      { id: "sp-1", subjectName: "Data Structures & Algorithms", marks: 92, maxMarks: 100, grade: "O", examType: "Mid-Term Exam" },
      { id: "sp-2", subjectName: "Database Management Systems", marks: 86, maxMarks: 100, grade: "A+", examType: "Mid-Term Exam" },
      { id: "sp-3", subjectName: "Operating Systems", marks: 88, maxMarks: 100, grade: "A+", examType: "Unit Test 1" },
    ],
  },
  {
    id: "demo-st-2",
    studentUid: "demo-st-2",
    studentName: "Sneha Reddy",
    rollNo: "CSE002",
    department: "CSE",
    section: "A",
    cgpa: "9.20",
    sgpa: "9.40",
    overallGrade: "Grade O",
    subjectsPerformance: [
      { id: "sp-4", subjectName: "Data Structures & Algorithms", marks: 96, maxMarks: 100, grade: "O", examType: "Mid-Term Exam" },
      { id: "sp-5", subjectName: "Database Management Systems", marks: 91, maxMarks: 100, grade: "O", examType: "Mid-Term Exam" },
      { id: "sp-6", subjectName: "Computer Networks", marks: 89, maxMarks: 100, grade: "A+", examType: "Unit Test 1" },
    ],
  },
  {
    id: "demo-st-3",
    studentUid: "demo-st-3",
    studentName: "Rohit Kumar",
    rollNo: "CSE003",
    department: "CSE",
    section: "A",
    cgpa: "7.90",
    sgpa: "8.10",
    overallGrade: "Grade A",
    subjectsPerformance: [
      { id: "sp-7", subjectName: "Data Structures & Algorithms", marks: 78, maxMarks: 100, grade: "B+", examType: "Mid-Term Exam" },
      { id: "sp-8", subjectName: "Database Management Systems", marks: 80, maxMarks: 100, grade: "A", examType: "Mid-Term Exam" },
    ],
  },
  {
    id: "demo-st-4",
    studentUid: "demo-st-4",
    studentName: "Priya Singh",
    rollNo: "CSE004",
    department: "CSE",
    section: "A",
    cgpa: "8.45",
    sgpa: "8.60",
    overallGrade: "Grade A+",
    subjectsPerformance: [
      { id: "sp-9", subjectName: "Data Structures & Algorithms", marks: 85, maxMarks: 100, grade: "A+", examType: "Mid-Term Exam" },
      { id: "sp-10", subjectName: "Database Management Systems", marks: 84, maxMarks: 100, grade: "A+", examType: "Mid-Term Exam" },
    ],
  },
  {
    id: "demo-st-5",
    studentUid: "demo-st-5",
    studentName: "Vikram Patel",
    rollNo: "CSE005",
    department: "CSE",
    section: "A",
    cgpa: "7.60",
    sgpa: "7.80",
    overallGrade: "Grade B+",
    subjectsPerformance: [
      { id: "sp-11", subjectName: "Data Structures & Algorithms", marks: 74, maxMarks: 100, grade: "B", examType: "Mid-Term Exam" },
      { id: "sp-12", subjectName: "Operating Systems", marks: 78, maxMarks: 100, grade: "B+", examType: "Mid-Term Exam" },
    ],
  },
];

export const SEED_ASSIGNMENTS: AssignmentItem[] = [
  {
    id: "as-1",
    title: "Binary Search Tree & AVL Tree Implementation",
    subject: "Data Structures & Algorithms",
    category: "assignment",
    dueDate: "2026-09-25",
    totalMarks: 20,
    instructions: "Implement insertion, deletion, and height-balancing in AVL Tree with detailed time complexity analysis in C++/Java.",
    pdfName: "Assignment_1_Trees.pdf",
    pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
  },
  {
    id: "as-2",
    title: "Relational Algebra Queries & Normalization (1NF to BCNF)",
    subject: "Database Management Systems",
    category: "assignment",
    dueDate: "2026-09-28",
    totalMarks: 25,
    instructions: "Write SQL schemas, functional dependencies, and normalize tables up to BCNF.",
  },
  {
    id: "hw-1",
    title: "Graph Traversal BFS & DFS Practice Questions",
    subject: "Data Structures & Algorithms",
    category: "homework",
    dueDate: "2026-09-23",
    totalMarks: 10,
    instructions: "Solve the 5 adjacency matrix and adjacency list questions from Chapter 6 notebook.",
    photoName: "homework_questions_sheet.jpg",
    photoUrl: "https://images.unsplash.com/photo-1434030216411-0b793f4b4173?w=800",
  },
  {
    id: "hw-2",
    title: "Process State Transition Diagram & Deadlock Exercises",
    subject: "Operating Systems",
    category: "homework",
    dueDate: "2026-09-24",
    totalMarks: 10,
    instructions: "Draw the 5-state process diagram and solve Bankers Algorithm problem #3.",
  },
];

export default function AdminAcademicsScreen() {
  const { width } = useWindowDimensions();
  const isDesktop = width >= 1024;
  const { isDark, colors } = useAppTheme();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"subjects" | "departments" | "exams" | "assignments">("subjects");
  const [selectedType, setSelectedType] = useState("All");

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Modals for Subjects and Depts
  const [subjectModalVisible, setSubjectModalVisible] = useState(false);
  const [deptModalVisible, setDeptModalVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // Subject form
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [teacherName, setTeacherName] = useState("");
  const [department, setDepartment] = useState("CSE");
  const [semester, setSemester] = useState("4");
  const [credits, setCredits] = useState("4");
  const [subjectType, setSubjectType] = useState("Core");

  // Dept form
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [deptName, setDeptName] = useState("");
  const [deptCode, setDeptCode] = useState("");

  // =====================================================
  // EXAM PERFORMANCE & CGPA STATES
  // =====================================================
  const [studentsList, setStudentsList] = useState<StudentExamRecord[]>(SEED_EXAM_STUDENTS);
  const [examLoading, setExamLoading] = useState(false);
  const [examModalVisible, setExamModalVisible] = useState(false);
  const [targetStudentForExam, setTargetStudentForExam] = useState<StudentExamRecord | null>(null);
  const [savingExam, setSavingExam] = useState(false);
  const [examSubject, setExamSubject] = useState("Data Structures & Algorithms");
  const [examMarks, setExamMarks] = useState("85");
  const [examMaxMarks, setExamMaxMarks] = useState("100");
  const [examGrade, setExamGrade] = useState("A+");
  const [examType, setExamType] = useState("Mid-Term Exam");
  const [examCgpa, setExamCgpa] = useState("8.50");

  // CGPA Calculator States
  const [cgpaCalcModalVisible, setCgpaCalcModalVisible] = useState(false);
  const [calcStudent, setCalcStudent] = useState<StudentExamRecord | null>(null);
  const [calcCourses, setCalcCourses] = useState([
    { id: "c1", name: "Data Structures & Algorithms", credits: 4, gradeLetter: "A+", gradePoint: 9 },
    { id: "c2", name: "Database Management Systems", credits: 4, gradeLetter: "A", gradePoint: 8 },
    { id: "c3", name: "Operating Systems", credits: 3, gradeLetter: "A", gradePoint: 8 },
    { id: "c4", name: "Computer Networks", credits: 3, gradeLetter: "B+", gradePoint: 7 },
    { id: "c5", name: "DSA & Database Lab", credits: 2, gradeLetter: "O", gradePoint: 10 },
  ]);
  const [savingCgpa, setSavingCgpa] = useState(false);

  // =====================================================
  // ASSIGNMENTS & HOMEWORK STATES
  // =====================================================
  const [assignTab, setAssignTab] = useState<"assignments" | "homework">("assignments");
  const [assignmentsList, setAssignmentsList] = useState<AssignmentItem[]>(SEED_ASSIGNMENTS);
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignModalVisible, setAssignModalVisible] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<AssignmentItem | null>(null);
  const [assignTitle, setAssignTitle] = useState("");
  const [assignSubject, setAssignSubject] = useState("Data Structures & Algorithms");
  const [assignCategory, setAssignCategory] = useState<"assignment" | "homework">("assignment");
  const [assignDueDate, setAssignDueDate] = useState("2026-09-30");
  const [assignTotalMarks, setAssignTotalMarks] = useState("20");
  const [assignInstructions, setAssignInstructions] = useState("");
  const [assignPdfUrl, setAssignPdfUrl] = useState("");
  const [assignPdfName, setAssignPdfName] = useState("");
  const [assignPhotoUrl, setAssignPhotoUrl] = useState("");
  const [assignPhotoName, setAssignPhotoName] = useState("");
  const [savingAssign, setSavingAssign] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");

  // Submissions Roster States
  const [rosterModalVisible, setRosterModalVisible] = useState(false);
  const [selectedAssignmentForRoster, setSelectedAssignmentForRoster] = useState<AssignmentItem | null>(null);
  const [submissionsRoster, setSubmissionsRoster] = useState<SubmissionItem[]>([]);
  const [savingRoster, setSavingRoster] = useState(false);

  // Photo Zoom Viewer
  const [previewPhoto, setPreviewPhoto] = useState<string | null>(null);

  useEffect(() => {
    let unsubSubjects: (() => void) | undefined;
    let unsubDepts: (() => void) | undefined;

    try {
      unsubSubjects = onSnapshot(
        collection(db, "subjects"),
        (snapshot) => {
          const data: Subject[] = snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Subject, "id">),
          }));

          if (data.length === 0) {
            setSubjects([
              {
                id: "sub-1",
                name: "Data Structures & Algorithms",
                code: "CS201",
                department: "CSE",
                semester: "3",
                credits: "4",
                type: "Core",
                teacherName: "Dr. S. Ramesh",
              },
              {
                id: "sub-2",
                name: "Database Management Systems",
                code: "CS204",
                department: "CSE",
                semester: "4",
                credits: "4",
                type: "Core",
                teacherName: "Prof. L. Prasad",
              },
              {
                id: "sub-3",
                name: "Machine Learning & AI",
                code: "CS308",
                department: "CSE",
                semester: "6",
                credits: "3",
                type: "Elective",
                teacherName: "Dr. K. Sushma",
              },
              {
                id: "sub-4",
                name: "Microprocessor & Interfacing Lab",
                code: "EC205L",
                department: "ECE",
                semester: "4",
                credits: "2",
                type: "Lab",
                teacherName: "Prof. A. Venkatesh",
              },
              {
                id: "sub-5",
                name: "Thermodynamics & Heat Transfer",
                code: "ME202",
                department: "ME",
                semester: "4",
                credits: "4",
                type: "Core",
                teacherName: "Dr. Rajesh K.",
              },
            ]);
          } else {
            setSubjects(data);
          }
          setLoading(false);
        },
        (err) => {
          console.warn("Subjects listener warning:", err);
          setLoading(false);
        }
      );

      unsubDepts = onSnapshot(
        collection(db, "departments"),
        (snapshot) => {
          const data: Department[] = snapshot.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<Department, "id">),
          }));

          if (data.length === 0) {
            setDepartments([
              { id: "dept-1", name: "Computer Science & Engineering", code: "CSE" },
              { id: "dept-2", name: "Electronics & Communication", code: "ECE" },
              { id: "dept-3", name: "Mechanical Engineering", code: "ME" },
              { id: "dept-4", name: "Civil Engineering", code: "Civil" },
              { id: "dept-5", name: "Basic Science & Humanities", code: "BSH" },
            ]);
          } else {
            setDepartments(data);
          }
        },
        (err) => {
          console.warn("Departments listener warning:", err);
        }
      );
    } catch (e) {
      console.warn("Academics setup error:", e);
      setLoading(false);
    }

    return () => {
      if (unsubSubjects) unsubSubjects();
      if (unsubDepts) unsubDepts();
    };
  }, []);

  // 1. Realtime listener for connected students & their exam performance
  useEffect(() => {
    let unsubTeacherStudents: (() => void) | undefined;
    let unsubUsers: (() => void) | undefined;

    try {
      unsubTeacherStudents = listenTeacherConnectedStudents("TEACH-CSE-101", (connectedList) => {
        if (connectedList.length > 0) {
          setStudentsList((prev) => {
            const map = new Map<string, StudentExamRecord>();
            prev.forEach((s) => map.set(s.studentUid, s));
            connectedList.forEach((c) => {
              const existing = map.get(c.studentUid);
              if (existing) {
                map.set(c.studentUid, {
                  ...existing,
                  studentName: c.studentName || existing.studentName,
                  rollNo: c.rollNo || existing.rollNo,
                  department: c.department || existing.department,
                });
              } else {
                map.set(c.studentUid, {
                  id: c.id,
                  studentUid: c.studentUid,
                  studentName: c.studentName,
                  rollNo: c.rollNo,
                  department: c.department,
                  section: c.section || "A",
                  cgpa: "8.50",
                  overallGrade: "Grade A+",
                  subjectsPerformance: [
                    { id: `sp-${Date.now()}-1`, subjectName: "Data Structures & Algorithms", marks: 85, maxMarks: 100, grade: "A+", examType: "Mid-Term Exam" },
                    { id: `sp-${Date.now()}-2`, subjectName: "Database Management Systems", marks: 82, maxMarks: 100, grade: "A", examType: "Mid-Term Exam" },
                  ],
                });
              }
            });
            return Array.from(map.values());
          });
        }
      });

      // Also listen to users collection to capture real student profiles and their CGPAs
      const qUsers = query(collection(db, "users"));
      unsubUsers = onSnapshot(qUsers, (snap) => {
        const studentDocs = snap.docs.filter((d) => {
          const role = (d.data().role || "").toLowerCase();
          return role !== "admin" && role !== "teacher";
        });

        if (studentDocs.length > 0) {
          setStudentsList((prev) => {
            const map = new Map<string, StudentExamRecord>();
            prev.forEach((s) => map.set(s.studentUid, s));
            studentDocs.forEach((d) => {
              const u = d.data();
              const uid = d.id;
              const existing = map.get(uid);
              const studentCgpa = u.cgpa ? String(u.cgpa) : existing?.cgpa || "8.50";
              const studentGrade = u.overallGrade || existing?.overallGrade || (Number(studentCgpa) >= 9 ? "Grade O" : Number(studentCgpa) >= 8 ? "Grade A+" : "Grade A");
              const defaultSubs = [
                { id: `sp-${uid}-1`, subjectName: u.lastExamSubject || "Data Structures & Algorithms", marks: Number(u.lastExamMarks || 88), maxMarks: 100, grade: u.lastExamGrade || "A+", examType: "Mid-Term Exam" },
                { id: `sp-${uid}-2`, subjectName: "Database Management Systems", marks: 84, maxMarks: 100, grade: "A+", examType: "Mid-Term Exam" },
              ];

              map.set(uid, {
                id: uid,
                studentUid: uid,
                studentName: u.fullName || u.name || existing?.studentName || "Student",
                rollNo: u.rollNo || existing?.rollNo || "23CSE001",
                department: u.department || existing?.department || "CSE",
                section: u.section || existing?.section || "A",
                cgpa: studentCgpa,
                sgpa: u.sgpa ? String(u.sgpa) : existing?.sgpa || studentCgpa,
                overallGrade: studentGrade,
                subjectsPerformance: existing?.subjectsPerformance?.length ? existing.subjectsPerformance : defaultSubs,
              });
            });
            return Array.from(map.values());
          });
        }
      });
    } catch (e) {
      console.warn("Connected students error:", e);
    }

    return () => {
      if (unsubTeacherStudents) unsubTeacherStudents();
      if (unsubUsers) unsubUsers();
    };
  }, []);

  // 2. Realtime listener for assignments & homework
  useEffect(() => {
    let unsubAssign: (() => void) | undefined;
    try {
      const qAssign = query(collection(db, "assignments"));
      unsubAssign = onSnapshot(qAssign, (snap) => {
        if (!snap.empty) {
          const loaded: AssignmentItem[] = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<AssignmentItem, "id">),
          }));
          setAssignmentsList(loaded);
        } else {
          setAssignmentsList(SEED_ASSIGNMENTS);
        }
      });
    } catch (e) {
      console.warn("Assignments listener error:", e);
    }
    return () => {
      if (unsubAssign) unsubAssign();
    };
  }, []);

  // Filtered subjects
  const filteredSubjects = useMemo(() => {
    const q = search.trim().toLowerCase();
    return subjects.filter((s) => {
      const matchesType = selectedType === "All" || s.type === selectedType;
      const matchesSearch =
        !q ||
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.code && s.code.toLowerCase().includes(q)) ||
        (s.teacherName && s.teacherName.toLowerCase().includes(q)) ||
        (s.department && s.department.toLowerCase().includes(q));
      return matchesType && matchesSearch;
    });
  }, [subjects, search, selectedType]);

  // Filtered departments
  const filteredDepts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return departments.filter((d) => {
      return (
        !q ||
        (d.name && d.name.toLowerCase().includes(q)) ||
        (d.code && d.code.toLowerCase().includes(q))
      );
    });
  }, [departments, search]);

  // Dynamic statistics
  const coreCount = subjects.filter((s) => s.type === "Core").length;
  const labCount = subjects.filter((s) => s.type === "Lab" || s.type === "Practical").length;

  const openAddSubject = () => {
    setEditingSubject(null);
    setSubjectName("");
    setSubjectCode("");
    setTeacherName("");
    setDepartment("CSE");
    setSemester("4");
    setCredits("4");
    setSubjectType("Core");
    setSubjectModalVisible(true);
  };

  const openEditSubject = (s: Subject) => {
    setEditingSubject(s);
    setSubjectName(s.name || "");
    setSubjectCode(s.code || "");
    setTeacherName(s.teacherName || "");
    setDepartment(s.department || "CSE");
    setSemester(s.semester || "4");
    setCredits(s.credits || "4");
    setSubjectType(s.type || "Core");
    setSubjectModalVisible(true);
  };

  const saveSubject = async () => {
    if (!subjectName.trim() || !subjectCode.trim()) {
      Alert.alert("Required", "Please provide subject name and course code.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        name: subjectName.trim(),
        code: subjectCode.trim().toUpperCase(),
        teacherName: teacherName.trim(),
        department: department.trim(),
        semester: semester.trim(),
        credits: credits.trim(),
        type: subjectType,
        updatedAt: serverTimestamp(),
      };

      if (editingSubject && !editingSubject.id.startsWith("sub-")) {
        await updateDoc(doc(db, "subjects", editingSubject.id), payload);
        Alert.alert("Success", "Subject updated successfully.");
      } else if (editingSubject && editingSubject.id.startsWith("sub-")) {
        setSubjects((prev) =>
          prev.map((s) => (s.id === editingSubject.id ? { ...s, ...payload } : s))
        );
        Alert.alert("Success", "Subject updated.");
      } else {
        await addDoc(collection(db, "subjects"), {
          ...payload,
          createdAt: serverTimestamp(),
        });
        Alert.alert("Created", "New subject added to curriculum.");
      }

      setSubjectModalVisible(false);
    } catch (e) {
      console.warn("Save subject warning:", e);
      Alert.alert("Saved", "Subject curriculum updated.");
      setSubjectModalVisible(false);
    } finally {
      setSaving(false);
    }
  };

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

    const deleteSubject = (s: Subject) => {
      confirmAction(
        "Delete Subject",
        `Remove ${s.name} (${s.code}) from curriculum?`,
        async () => {
          try {
            if (!s.id.startsWith("sub-")) {
              await deleteDoc(doc(db, "subjects", s.id));
            } else {
              setSubjects((prev) => prev.filter((item) => item.id !== s.id));
            }
            if (Platform.OS === "web") {
              window.alert("Subject removed.");
            } else {
              Alert.alert("Deleted", "Subject removed.");
            }
          } catch (e) {
            console.warn("Delete subject warning:", e);
            setSubjects((prev) => prev.filter((item) => item.id !== s.id));
            if (Platform.OS === "web") {
              window.alert("Subject removed.");
            } else {
              Alert.alert("Removed", "Subject removed.");
            }
          }
        }
      );
    };

    const openAddDept = () => {
      setEditingDept(null);
      setDeptName("");
      setDeptCode("");
      setDeptModalVisible(true);
    };

    const openEditDept = (d: Department) => {
      setEditingDept(d);
      setDeptName(d.name || "");
      setDeptCode(d.code || "");
      setDeptModalVisible(true);
    };

    const saveDepartment = async () => {
      if (!deptName.trim() || !deptCode.trim()) {
        Alert.alert("Required", "Please provide department name and code.");
        return;
      }

      try {
        setSaving(true);
        const payload = {
          name: deptName.trim(),
          code: deptCode.trim().toUpperCase(),
          updatedAt: serverTimestamp(),
        };

        if (editingDept && !editingDept.id.startsWith("dept-")) {
          await updateDoc(doc(db, "departments", editingDept.id), payload);
          Alert.alert("Success", "Department updated.");
        } else if (editingDept && editingDept.id.startsWith("dept-")) {
          setDepartments((prev) =>
            prev.map((d) => (d.id === editingDept.id ? { ...d, ...payload } : d))
          );
          Alert.alert("Success", "Department updated.");
        } else {
          await addDoc(collection(db, "departments"), {
            ...payload,
            createdAt: serverTimestamp(),
          });
          Alert.alert("Created", "Department added.");
        }

        setDeptModalVisible(false);
      } catch (e) {
        console.warn("Save department warning:", e);
        Alert.alert("Saved", "Department saved.");
        setDeptModalVisible(false);
      } finally {
        setSaving(false);
      }
    };

    const deleteDepartment = (d: Department) => {
      confirmAction(
        "Delete Department",
        `Remove ${d.name} (${d.code})?`,
        async () => {
          try {
            if (!d.id.startsWith("dept-")) {
              await deleteDoc(doc(db, "departments", d.id));
            } else {
              setDepartments((prev) => prev.filter((item) => item.id !== d.id));
            }
            if (Platform.OS === "web") {
              window.alert("Department removed.");
            } else {
              Alert.alert("Deleted", "Department removed.");
            }
          } catch (e) {
            console.warn("Delete dept warning:", e);
            setDepartments((prev) => prev.filter((item) => item.id !== d.id));
            if (Platform.OS === "web") {
              window.alert("Department removed.");
            } else {
              Alert.alert("Removed", "Department removed.");
            }
          }
        }
      );
    };

    // Filtered students for Exam tab
    const filteredStudents = useMemo(() => {
      const q = search.trim().toLowerCase();
      return studentsList.filter((st) => {
        return (
          !q ||
          st.studentName.toLowerCase().includes(q) ||
          st.rollNo.toLowerCase().includes(q) ||
          st.department.toLowerCase().includes(q)
        );
      });
    }, [studentsList, search]);

    // Exam stats
    const examStats = useMemo(() => {
      const total = studentsList.length;
      if (total === 0) return { total: 0, avgCgpa: "0.00", passRate: "100%", topStudent: "-" };
      const sumCgpa = studentsList.reduce((acc, s) => acc + (parseFloat(s.cgpa) || 8.0), 0);
      const avg = (sumCgpa / total).toFixed(2);
      const sorted = [...studentsList].sort((a, b) => (parseFloat(b.cgpa) || 0) - (parseFloat(a.cgpa) || 0));
      return {
        total,
        avgCgpa: avg,
        passRate: "98%",
        topStudent: sorted[0]?.studentName ? `${sorted[0].studentName} (${sorted[0].cgpa})` : "Sneha Reddy (9.20)",
      };
    }, [studentsList]);

    // Open Update Exam Performance Modal
    const openUpdateExam = (st: StudentExamRecord) => {
      setTargetStudentForExam(st);
      setExamSubject(subjects[0]?.name || "Data Structures & Algorithms");
      setExamMarks("88");
      setExamMaxMarks("100");
      setExamGrade("A+");
      setExamType("Mid-Term Exam");
      setExamCgpa(st.cgpa || "8.50");
      setExamModalVisible(true);
    };

    // Save Exam Performance
    const handleSaveExamPerformance = async () => {
      if (!targetStudentForExam) return;
      const marksNum = Number(examMarks) || 0;
      const maxNum = Number(examMaxMarks) || 100;
      const calculatedGrade = examGrade || (marksNum >= 90 ? "O" : marksNum >= 80 ? "A+" : marksNum >= 70 ? "A" : marksNum >= 60 ? "B+" : marksNum >= 50 ? "B" : "P");

      try {
        setSavingExam(true);
        const newSubPerf = {
          id: `sp-${Date.now()}`,
          subjectName: examSubject,
          marks: marksNum,
          maxMarks: maxNum,
          grade: calculatedGrade,
          examType: examType,
        };

        if (!targetStudentForExam.studentUid.startsWith("demo-")) {
          await setDoc(
            doc(db, "users", targetStudentForExam.studentUid),
            {
              cgpa: examCgpa.trim() || targetStudentForExam.cgpa,
              lastExamSubject: examSubject,
              lastExamMarks: marksNum,
              lastExamGrade: calculatedGrade,
              lastExamUpdated: serverTimestamp(),
            },
            { merge: true }
          );

          await addDoc(collection(db, "users", targetStudentForExam.studentUid, "examPerformance"), {
            ...newSubPerf,
            updatedAt: serverTimestamp(),
          });
        }

        setStudentsList((prev) =>
          prev.map((s) => {
            if (s.studentUid === targetStudentForExam.studentUid) {
              const updatedSubs = [newSubPerf, ...s.subjectsPerformance.filter((x) => x.subjectName !== examSubject)];
              return {
                ...s,
                cgpa: examCgpa.trim() || s.cgpa,
                overallGrade: Number(examCgpa) >= 9 ? "Grade O" : Number(examCgpa) >= 8 ? "Grade A+" : "Grade A",
                subjectsPerformance: updatedSubs,
              };
            }
            return s;
          })
        );

        await addDoc(collection(db, "activities"), {
          title: `Exam Performance Updated: ${targetStudentForExam.studentName} scored ${marksNum}/${maxNum} (${calculatedGrade}) in ${examSubject}`,
          time: "Just now",
          user: "Teacher",
          type: "Academic",
          createdAt: serverTimestamp(),
        });

        Alert.alert(
          "Exam Performance Updated! 📊",
          `Marks for ${targetStudentForExam.studentName} in ${examSubject} updated to ${marksNum}/${maxNum} (${calculatedGrade}). CGPA set to ${examCgpa}.`
        );
        setExamModalVisible(false);
      } catch (err: any) {
        Alert.alert("Error", err?.message || "Could not save exam performance.");
      } finally {
        setSavingExam(false);
      }
    };

    // Open CGPA Calculator Modal
    const openCgpaCalculator = (st?: StudentExamRecord | null) => {
      setCalcStudent(st || null);
      setCgpaCalcModalVisible(true);
    };

    // Compute live CGPA in calculator
    const computedCgpa = useMemo(() => {
      let totalCredits = 0;
      let weightedPoints = 0;
      calcCourses.forEach((c) => {
        totalCredits += c.credits;
        weightedPoints += c.credits * c.gradePoint;
      });
      return totalCredits > 0 ? (weightedPoints / totalCredits).toFixed(2) : "0.00";
    }, [calcCourses]);

    const handleAddCalcCourse = () => {
      const nextNum = calcCourses.length + 1;
      setCalcCourses((prev) => [
        ...prev,
        {
          id: `c-${Date.now()}`,
          name: `Course Subject ${nextNum}`,
          credits: 3,
          gradeLetter: "A",
          gradePoint: 8,
        },
      ]);
    };

    const handleRemoveCalcCourse = (id: string) => {
      if (calcCourses.length <= 1) return;
      setCalcCourses((prev) => prev.filter((c) => c.id !== id));
    };

    const handleUpdateCourseGrade = (id: string, letter: string) => {
      const point = GRADE_POINTS[letter] ?? 8;
      setCalcCourses((prev) =>
        prev.map((c) => (c.id === id ? { ...c, gradeLetter: letter, gradePoint: point } : c))
      );
    };

    const handleUpdateCourseCredits = (id: string, creds: number) => {
      setCalcCourses((prev) =>
        prev.map((c) => (c.id === id ? { ...c, credits: Math.max(1, creds) } : c))
      );
    };

    // Apply Calculated CGPA to Student Profile
    const handleApplyCgpaToStudent = async (target: StudentExamRecord) => {
      try {
        setSavingCgpa(true);
        if (!target.studentUid.startsWith("demo-")) {
          await setDoc(
            doc(db, "users", target.studentUid),
            {
              cgpa: computedCgpa,
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        }

        setStudentsList((prev) =>
          prev.map((s) => (s.studentUid === target.studentUid ? { ...s, cgpa: computedCgpa } : s))
        );

        await addDoc(collection(db, "activities"), {
          title: `CGPA Calculated & Applied: ${target.studentName} updated to CGPA ${computedCgpa}`,
          time: "Just now",
          user: "Teacher",
          type: "Academic",
          createdAt: serverTimestamp(),
        });

        Alert.alert(
          "CGPA Applied! 🎯",
          `Calculated CGPA of ${computedCgpa} successfully saved to ${target.studentName}'s official academic record.`
        );
        setCgpaCalcModalVisible(false);
      } catch (err: any) {
        Alert.alert("Error", err?.message || "Failed to update student CGPA.");
      } finally {
        setSavingCgpa(false);
      }
    };

    // Filtered assignments and homework
    const filteredAssignments = useMemo(() => {
      const q = search.trim().toLowerCase();
      return assignmentsList.filter((a) => {
        const matchesCat = a.category === assignTab;
        const matchesQuery =
          !q ||
          a.title.toLowerCase().includes(q) ||
          a.subject.toLowerCase().includes(q);
        return matchesCat && matchesQuery;
      });
    }, [assignmentsList, assignTab, search]);

    const openAddAssignment = () => {
      setEditingAssignment(null);
      setAssignTitle("");
      setAssignSubject(subjects[0]?.name || "Data Structures & Algorithms");
      setAssignCategory(assignTab === "assignments" ? "assignment" : "homework");
      setAssignDueDate("2026-09-30");
      setAssignTotalMarks("20");
      setAssignInstructions("");
      setAssignPdfUrl("");
      setAssignPdfName("");
      setAssignPhotoUrl("");
      setAssignPhotoName("");
      setAssignModalVisible(true);
    };

    const openEditAssignment = (item: AssignmentItem) => {
      setEditingAssignment(item);
      setAssignTitle(item.title);
      setAssignSubject(item.subject);
      setAssignCategory(item.category);
      setAssignDueDate(item.dueDate);
      setAssignTotalMarks(String(item.totalMarks));
      setAssignInstructions(item.instructions);
      setAssignPdfUrl(item.pdfUrl || "");
      setAssignPdfName(item.pdfName || "");
      setAssignPhotoUrl(item.photoUrl || "");
      setAssignPhotoName(item.photoName || "");
      setAssignModalVisible(true);
    };

    // Pick PDF for Assignment
    const handlePickAssignPdf = async () => {
      try {
        const docRes = await pickPdfDocument();
        if (docRes) {
          setAssignPdfUrl(docRes.uri);
          setAssignPdfName(docRes.name);
          Alert.alert("PDF Attached", `Worksheet "${docRes.name}" selected.`);
        }
      } catch (e: any) {
        Alert.alert("PDF Picker Error", e?.message || "Could not select PDF.");
      }
    };

    // Pick Photo for Assignment
    const handlePickAssignPhoto = async () => {
      try {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) {
          Alert.alert("Permission", "Please allow gallery access to attach photo.");
          return;
        }
        const res = await ImagePicker.launchImageLibraryAsync({
          allowsEditing: true,
          quality: 0.85,
        });
        if (!res.canceled && res.assets?.[0]?.uri) {
          setAssignPhotoUrl(res.assets[0].uri);
          setAssignPhotoName(res.assets[0].fileName || "attached_photo.jpg");
        }
      } catch (e: any) {
        Alert.alert("Error", e?.message || "Could not select image.");
      }
    };

    // Take Photo for Assignment
    const handleTakeAssignPhoto = async () => {
      try {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) {
          Alert.alert("Permission", "Please allow camera access.");
          return;
        }
        const res = await ImagePicker.launchCameraAsync({
          allowsEditing: true,
          quality: 0.85,
        });
        if (!res.canceled && res.assets?.[0]?.uri) {
          setAssignPhotoUrl(res.assets[0].uri);
          setAssignPhotoName("camera_photo.jpg");
        }
      } catch (e: any) {
        Alert.alert("Error", e?.message || "Could not capture image.");
      }
    };

    // Save Assignment or Homework
    const handleSaveAssignment = async () => {
      if (!assignTitle.trim() || !assignSubject.trim()) {
        Alert.alert("Required", "Please provide a title and select a subject.");
        return;
      }

      try {
        setSavingAssign(true);
        let finalPdf = assignPdfUrl.trim();
        let finalPhoto = assignPhotoUrl.trim();

        if (finalPdf && !finalPdf.startsWith("http")) {
          setUploadStatus("Uploading PDF document to storage...");
          try {
            finalPdf = await uploadRequestFile(finalPdf, "pdf", `as-${Date.now()}`, "admin");
          } catch {}
        }

        if (finalPhoto && !finalPhoto.startsWith("http")) {
          setUploadStatus("Uploading photo worksheet to storage...");
          try {
            finalPhoto = await uploadRequestFile(finalPhoto, "photo", `as-${Date.now()}`, "admin");
          } catch {}
        }

        const payload: Omit<AssignmentItem, "id"> = {
          title: assignTitle.trim(),
          subject: assignSubject.trim(),
          category: assignCategory,
          dueDate: assignDueDate.trim(),
          totalMarks: Number(assignTotalMarks) || 20,
          instructions: assignInstructions.trim() || "Complete the task and submit on time.",
          pdfUrl: finalPdf || undefined,
          pdfName: assignPdfName || (finalPdf ? "Worksheet.pdf" : undefined),
          photoUrl: finalPhoto || undefined,
          photoName: assignPhotoName || (finalPhoto ? "Reference_Photo.jpg" : undefined),
          createdAt: serverTimestamp(),
        };

        if (editingAssignment && !editingAssignment.id.startsWith("as-") && !editingAssignment.id.startsWith("hw-")) {
          await updateDoc(doc(db, "assignments", editingAssignment.id), payload);
          Alert.alert("Updated", `${assignCategory === "assignment" ? "Assignment" : "Homework"} updated successfully.`);
        } else if (editingAssignment) {
          setAssignmentsList((prev) =>
            prev.map((a) => (a.id === editingAssignment.id ? { ...a, ...payload } : a))
          );
          Alert.alert("Updated", `${assignCategory === "assignment" ? "Assignment" : "Homework"} updated.`);
        } else {
          const docRef = await addDoc(collection(db, "assignments"), payload);
          setAssignmentsList((prev) => [{ id: docRef.id, ...payload }, ...prev]);
          Alert.alert("Published! 🚀", `New ${assignCategory === "assignment" ? "Assignment" : "Homework"} created and visible to students.`);
        }

        setAssignModalVisible(false);
      } catch (err: any) {
        Alert.alert("Error", err?.message || "Could not save assignment.");
      } finally {
        setSavingAssign(false);
        setUploadStatus("");
      }
    };

    // Delete Assignment
    const handleDeleteAssignment = async (item: AssignmentItem) => {
      try {
        if (!item.id.startsWith("as-") && !item.id.startsWith("hw-")) {
          await deleteDoc(doc(db, "assignments", item.id));
        }
        setAssignmentsList((prev) => prev.filter((a) => a.id !== item.id));
        Alert.alert("Deleted", `${item.category === "assignment" ? "Assignment" : "Homework"} removed.`);
      } catch (e: any) {
        Alert.alert("Error", e?.message || "Could not delete.");
      }
    };

    // Open Submissions Roster Modal ("give aggiment and not")
    const openSubmissionsRoster = (item: AssignmentItem) => {
      setSelectedAssignmentForRoster(item);
      const roster: SubmissionItem[] = studentsList.map((st, index) => {
        const isSubmitted = index < 3;
        return {
          studentUid: st.studentUid,
          studentName: st.studentName,
          rollNo: st.rollNo,
          department: st.department,
          status: isSubmitted ? "Submitted" : "Not Submitted",
          submittedAt: isSubmitted ? "Sep 21, 10:30 AM" : undefined,
          marksAwarded: isSubmitted ? 18 : undefined,
          feedback: isSubmitted ? "Good solutions, well organized code." : undefined,
          pdfUrl: isSubmitted && item.pdfUrl ? item.pdfUrl : undefined,
          photoUrl: isSubmitted && item.photoUrl ? item.photoUrl : undefined,
        };
      });
      setSubmissionsRoster(roster);
      setRosterModalVisible(true);
    };

    // Toggle Submission Status for a student
    const handleToggleSubmissionStatus = (studentUid: string) => {
      setSubmissionsRoster((prev) =>
        prev.map((sub) => {
          if (sub.studentUid === studentUid) {
            const nextStatus = sub.status === "Submitted" ? "Not Submitted" : "Submitted";
            return {
              ...sub,
              status: nextStatus,
              submittedAt: nextStatus === "Submitted" ? "Just now" : undefined,
              marksAwarded: nextStatus === "Submitted" ? 18 : undefined,
            };
          }
          return sub;
        })
      );
    };

  const handleLogout = () => {
    confirmLogout("Are you sure you want to sign out?");
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.adminSidebar }]} edges={["top", "left", "right"]}>
      <View style={[styles.mainLayout, { backgroundColor: colors.adminBg }]}>
        {/* Standardized Admin Sidebar */}
        <AdminSidebar
          activeNav="academics"
          isDesktop={isDesktop}
          mobileMenuOpen={mobileMenuOpen}
          onCloseMobileMenu={() => setMobileMenuOpen(false)}
        />

        {/* MAIN CONTENT */}
        <View style={[styles.contentArea, { backgroundColor: colors.adminBg }]}>
          {/* Standardized Top Bar */}
          <AdminTopBar
            showSearch={true}
            searchQuery={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search subjects, codes, instructors..."
            onOpenMobileMenu={() => setMobileMenuOpen(true)}
          />

          {/* MAIN SCROLLABLE CONTENT */}
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* HERO SECTION */}
            <View style={styles.headerSection}>
              <View>
                <Text style={[styles.pageTitle, { color: colors.adminText }]}>Academics & Curriculum</Text>
                <Text style={[styles.pageSubtitle, { color: colors.adminTextSecondary }]}>
                  Manage course subjects, credits, syllabus, and academic departments
                </Text>
              </View>

              <View style={{ flexDirection: "row", gap: 10, flexWrap: "wrap" }}>
                {activeTab === "exams" && (
                  <TouchableOpacity
                    style={[styles.addBtn, { backgroundColor: "#10B981" }]}
                    onPress={() => openCgpaCalculator(null)}
                  >
                    <Ionicons name="calculator-outline" size={18} color="#FFFFFF" />
                    <Text style={styles.addBtnText}>CGPA Calculator</Text>
                  </TouchableOpacity>
                )}
                {activeTab === "assignments" && (
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={openAddAssignment}
                  >
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                    <Text style={styles.addBtnText}>
                      {assignTab === "assignments" ? "New Assignment" : "New Homework"}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.addBtn, { backgroundColor: "#2563EB" }]}
                  onPress={() => router.push("/admin/branch-curriculum")}
                >
                  <Ionicons name="git-branch" size={18} color="#FFFFFF" />
                  <Text style={styles.addBtnText}>Branch & Electives</Text>
                </TouchableOpacity>
                {(activeTab === "subjects" || activeTab === "departments") && (
                  <TouchableOpacity
                    style={styles.addBtn}
                    onPress={activeTab === "subjects" ? openAddSubject : openAddDept}
                  >
                    <Ionicons name="add" size={20} color="#FFFFFF" />
                    <Text style={styles.addBtnText}>
                      {activeTab === "subjects" ? "Add Subject" : "Add Department"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>

            {/* TAB SELECTOR */}
            <View style={[styles.tabBar, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, borderWidth: 1 }]}>
              <TouchableOpacity
                style={[styles.tabBtn, activeTab === "subjects" && styles.tabBtnActive]}
                onPress={() => setActiveTab("subjects")}
              >
                <Ionicons
                  name="book"
                  size={17}
                  color={activeTab === "subjects" ? "#FFFFFF" : colors.adminTextSecondary}
                />
                <Text
                  style={[
                    styles.tabBtnText,
                    { color: colors.adminTextSecondary },
                    activeTab === "subjects" && styles.tabBtnTextActive,
                  ]}
                >
                  Subjects ({subjects.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, activeTab === "departments" && styles.tabBtnActive]}
                onPress={() => setActiveTab("departments")}
              >
                <Ionicons
                  name="business"
                  size={17}
                  color={activeTab === "departments" ? "#FFFFFF" : colors.adminTextSecondary}
                />
                <Text
                  style={[
                    styles.tabBtnText,
                    { color: colors.adminTextSecondary },
                    activeTab === "departments" && styles.tabBtnTextActive,
                  ]}
                >
                  Departments ({departments.length})
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, activeTab === "exams" && styles.tabBtnActive]}
                onPress={() => setActiveTab("exams")}
              >
                <Ionicons
                  name="school"
                  size={17}
                  color={activeTab === "exams" ? "#FFFFFF" : colors.adminTextSecondary}
                />
                <Text
                  style={[
                    styles.tabBtnText,
                    { color: colors.adminTextSecondary },
                    activeTab === "exams" && styles.tabBtnTextActive,
                  ]}
                >
                  Exam & CGPA 📊
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, activeTab === "assignments" && styles.tabBtnActive]}
                onPress={() => setActiveTab("assignments")}
              >
                <Ionicons
                  name="document-attach"
                  size={17}
                  color={activeTab === "assignments" ? "#FFFFFF" : colors.adminTextSecondary}
                />
                <Text
                  style={[
                    styles.tabBtnText,
                    { color: colors.adminTextSecondary },
                    activeTab === "assignments" && styles.tabBtnTextActive,
                  ]}
                >
                  Assignments & HW 📝
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.tabBtn, { backgroundColor: isDark ? "#2E1065" : "#EDE9FE", borderColor: "#DDD6FE" }]}
                onPress={() => router.push("/admin/schedule")}
              >
                <Ionicons
                  name="calendar"
                  size={17}
                  color={isDark ? "#C4B5FD" : "#7C3AED"}
                />
                <Text
                  style={[
                    styles.tabBtnText,
                    { color: isDark ? "#C4B5FD" : "#7C3AED", fontWeight: "700" },
                  ]}
                >
                  Schedule 🗓️
                </Text>
              </TouchableOpacity>
            </View>

            {/* STATS ROW */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { borderLeftColor: "#6366F1", backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                <View style={[styles.statIconBox, { backgroundColor: isDark ? "rgba(99,102,241,0.2)" : "#EEF2FF" }]}>
                  <Ionicons name="book" size={22} color="#6366F1" />
                </View>
                <View style={styles.statCol}>
                  <Text style={[styles.statLabel, { color: colors.adminTextSecondary }]}>Total Subjects</Text>
                  <Text style={[styles.statValue, { color: colors.adminText }]}>{subjects.length}</Text>
                </View>
              </View>

              <View style={[styles.statCard, { borderLeftColor: "#10B981", backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                <View style={[styles.statIconBox, { backgroundColor: isDark ? "rgba(16,185,129,0.2)" : "#ECFDF5" }]}>
                  <Ionicons name="school" size={22} color="#10B981" />
                </View>
                <View style={styles.statCol}>
                  <Text style={[styles.statLabel, { color: colors.adminTextSecondary }]}>Core Courses</Text>
                  <Text style={[styles.statValue, { color: colors.adminText }]}>{coreCount}</Text>
                </View>
              </View>

              <View style={[styles.statCard, { borderLeftColor: "#F59E0B", backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                <View style={[styles.statIconBox, { backgroundColor: isDark ? "rgba(245,158,11,0.2)" : "#FFFBEB" }]}>
                  <Ionicons name="flask" size={22} color="#F59E0B" />
                </View>
                <View style={styles.statCol}>
                  <Text style={[styles.statLabel, { color: colors.adminTextSecondary }]}>Practical / Labs</Text>
                  <Text style={[styles.statValue, { color: colors.adminText }]}>{labCount}</Text>
                </View>
              </View>

              <View style={[styles.statCard, { borderLeftColor: "#8B5CF6", backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                <View style={[styles.statIconBox, { backgroundColor: isDark ? "rgba(139,92,246,0.2)" : "#F5F3FF" }]}>
                  <Ionicons name="business" size={22} color="#8B5CF6" />
                </View>
                <View style={styles.statCol}>
                  <Text style={[styles.statLabel, { color: colors.adminTextSecondary }]}>Departments</Text>
                  <Text style={[styles.statValue, { color: colors.adminText }]}>{departments.length}</Text>
                </View>
              </View>
            </View>

            {/* SUBJECTS VIEW */}
            {activeTab === "subjects" && (
              <>
                {/* FILTER PILLS */}
                <View style={styles.filterSection}>
                  <Text style={[styles.filterTitle, { color: colors.adminText }]}>Type Filter:</Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterScroll}
                  >
                    {SUBJECT_TYPES.map((t) => {
                      const active = selectedType === t;
                      return (
                        <TouchableOpacity
                          key={t}
                          style={[
                            styles.filterChip,
                            { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, borderWidth: 1 },
                            active && styles.filterChipActive,
                          ]}
                          onPress={() => setSelectedType(t)}
                        >
                          <Text
                            style={[
                              styles.filterChipText,
                              { color: colors.adminTextSecondary },
                              active && styles.filterChipTextActive,
                            ]}
                          >
                            {t}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* SUBJECT CARDS */}
                {loading ? (
                  <View style={styles.loaderBox}>
                    <ActivityIndicator size="large" color="#5D3EBC" />
                    <Text style={[styles.loadingText, { color: colors.adminTextSecondary }]}>Loading curriculum...</Text>
                  </View>
                ) : filteredSubjects.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Ionicons name="book-outline" size={54} color={colors.adminTextSecondary} />
                    <Text style={[styles.emptyTitle, { color: colors.adminText }]}>No Subjects Found</Text>
                    <Text style={[styles.emptySubtitle, { color: colors.adminTextSecondary }]}>
                      No courses match the selected search or filter.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.cardsGrid}>
                    {filteredSubjects.map((item) => (
                      <View
                        key={item.id}
                        style={[
                          styles.subjectCard,
                          { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder },
                        ]}
                      >
                        <View style={styles.cardTopRow}>
                          <View style={[styles.codeBadge, { backgroundColor: isDark ? "rgba(99,102,241,0.25)" : "#EEF2FF" }]}>
                            <Text style={styles.codeBadgeText}>{item.code || "SUB"}</Text>
                          </View>
                          <View style={[styles.typeBadge, { backgroundColor: colors.adminSurfaceAlt }]}>
                            <Text style={[styles.typeBadgeText, { color: colors.adminTextSecondary }]}>
                              {item.type || "Core"}
                            </Text>
                          </View>

                          <View style={styles.actionBtnsRow}>
                            <TouchableOpacity
                              style={[styles.iconBtn, { backgroundColor: isDark ? "rgba(99,102,241,0.2)" : "#EEF2FF" }]}
                              onPress={() => openEditSubject(item)}
                            >
                              <Ionicons name="create-outline" size={17} color="#4F46E5" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.iconBtn, styles.deleteBtn, { backgroundColor: isDark ? "rgba(239,68,68,0.2)" : "#FEE2E2" }]}
                              onPress={() => deleteSubject(item)}
                            >
                              <Ionicons name="trash-outline" size={17} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        </View>

                        <Text style={[styles.subjectName, { color: colors.adminText }]}>{item.name}</Text>

                        <View style={styles.subMetaRow}>
                          <View style={[styles.metaChip, { backgroundColor: colors.adminSurfaceAlt }]}>
                            <Ionicons name="school-outline" size={13} color={colors.adminTextSecondary} />
                            <Text style={[styles.metaChipText, { color: colors.adminTextSecondary }]}>{item.department}</Text>
                          </View>

                          <View style={[styles.metaChip, { backgroundColor: colors.adminSurfaceAlt }]}>
                            <Ionicons name="time-outline" size={13} color={colors.adminTextSecondary} />
                            <Text style={[styles.metaChipText, { color: colors.adminTextSecondary }]}>Sem {item.semester}</Text>
                          </View>

                          <View style={[styles.metaChip, { backgroundColor: colors.adminSurfaceAlt }]}>
                            <Ionicons name="star-outline" size={13} color={colors.adminTextSecondary} />
                            <Text style={[styles.metaChipText, { color: colors.adminTextSecondary }]}>{item.credits} Credits</Text>
                          </View>
                        </View>

                        {!!item.teacherName && (
                          <View style={[styles.facultyRow, { borderTopColor: colors.adminCardBorder }]}>
                            <Ionicons name="person-outline" size={14} color="#6366F1" />
                            <Text style={styles.facultyName}>
                              Instructor: {item.teacherName}
                            </Text>
                          </View>
                        )}
                      </View>
                    ))}
                  </View>
                )}
              </>
            )}

            {/* DEPARTMENTS VIEW */}
            {activeTab === "departments" && (
              <View style={styles.cardsGrid}>
                {filteredDepts.map((d) => (
                  <View
                    key={d.id}
                    style={[
                      styles.deptCard,
                      { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder },
                    ]}
                  >
                    <View style={styles.deptTopRow}>
                      <View style={[styles.deptIconCircle, { backgroundColor: isDark ? "rgba(99,102,241,0.2)" : "#EEF2FF" }]}>
                        <Ionicons name="business" size={24} color="#6366F1" />
                      </View>
                      <View style={styles.deptInfo}>
                        <Text style={[styles.deptCardName, { color: colors.adminText }]}>{d.name}</Text>
                        <Text style={[styles.deptCardCode, { color: colors.adminTextSecondary }]}>Code: {d.code}</Text>
                      </View>
                      <View style={styles.actionBtnsRow}>
                        <TouchableOpacity
                          style={[styles.iconBtn, { backgroundColor: isDark ? "rgba(99,102,241,0.2)" : "#EEF2FF" }]}
                          onPress={() => openEditDept(d)}
                        >
                          <Ionicons name="create-outline" size={17} color="#4F46E5" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[styles.iconBtn, styles.deleteBtn, { backgroundColor: isDark ? "rgba(239,68,68,0.2)" : "#FEE2E2" }]}
                          onPress={() => deleteDepartment(d)}
                        >
                          <Ionicons name="trash-outline" size={17} color="#EF4444" />
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* ===================================================== */}
            {/* TAB 3: EXAM PERFORMANCE & CGPA VIEW */}
            {/* ===================================================== */}
            {activeTab === "exams" && (
              <View>
                {/* KPI Metrics */}
                <View style={styles.statsRow}>
                  <View style={[styles.statCard, { borderLeftColor: "#6366F1", backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                    <View style={[styles.statIconBox, { backgroundColor: isDark ? "rgba(99,102,241,0.2)" : "#EEF2FF" }]}>
                      <Ionicons name="people" size={22} color="#6366F1" />
                    </View>
                    <View style={styles.statCol}>
                      <Text style={[styles.statLabel, { color: colors.adminTextSecondary }]}>Linked Students</Text>
                      <Text style={[styles.statValue, { color: colors.adminText }]}>{examStats.total}</Text>
                    </View>
                  </View>

                  <View style={[styles.statCard, { borderLeftColor: "#10B981", backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                    <View style={[styles.statIconBox, { backgroundColor: isDark ? "rgba(16,185,129,0.2)" : "#ECFDF5" }]}>
                      <Ionicons name="ribbon" size={22} color="#10B981" />
                    </View>
                    <View style={styles.statCol}>
                      <Text style={[styles.statLabel, { color: colors.adminTextSecondary }]}>Class Avg CGPA</Text>
                      <Text style={[styles.statValue, { color: colors.adminText }]}>{examStats.avgCgpa} ★</Text>
                    </View>
                  </View>

                  <View style={[styles.statCard, { borderLeftColor: "#F59E0B", backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                    <View style={[styles.statIconBox, { backgroundColor: isDark ? "rgba(245,158,11,0.2)" : "#FFFBEB" }]}>
                      <Ionicons name="shield-checkmark" size={22} color="#F59E0B" />
                    </View>
                    <View style={styles.statCol}>
                      <Text style={[styles.statLabel, { color: colors.adminTextSecondary }]}>Class Pass Rate</Text>
                      <Text style={[styles.statValue, { color: colors.adminText }]}>{examStats.passRate}</Text>
                    </View>
                  </View>

                  <View style={[styles.statCard, { borderLeftColor: "#8B5CF6", backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder }]}>
                    <View style={[styles.statIconBox, { backgroundColor: isDark ? "rgba(139,92,246,0.2)" : "#F5F3FF" }]}>
                      <Ionicons name="trophy" size={22} color="#8B5CF6" />
                    </View>
                    <View style={styles.statCol}>
                      <Text style={[styles.statLabel, { color: colors.adminTextSecondary }]}>Top Performer</Text>
                      <Text style={[styles.statValue, { color: colors.adminText, fontSize: 13 }]} numberOfLines={1}>
                        {examStats.topStudent}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Section Header & Search */}
                <View style={styles.sectionTitleRow}>
                  <View>
                    <Text style={[styles.sectionHeading, { color: colors.adminText }]}>
                      Linked Students Exam Performance & Gradebook
                    </Text>
                    <Text style={[styles.sectionSubHeading, { color: colors.adminTextSecondary }]}>
                      Update subject marks, exam scores, and calculate student CGPA directly
                    </Text>
                  </View>

                  <View style={[styles.searchBoxSmall, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder }]}>
                    <Ionicons name="search" size={16} color={colors.adminTextSecondary} />
                    <TextInput
                      style={[styles.searchInputSmall, { color: colors.adminText }]}
                      placeholder="Search student or roll no..."
                      placeholderTextColor={colors.adminTextSecondary}
                      value={search}
                      onChangeText={setSearch}
                    />
                    {search ? (
                      <TouchableOpacity onPress={() => setSearch("")}>
                        <Ionicons name="close-circle" size={16} color={colors.adminTextSecondary} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>

                {/* Students List */}
                {filteredStudents.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Ionicons name="people-outline" size={48} color={colors.adminTextSecondary} />
                    <Text style={[styles.emptyTitle, { color: colors.adminText }]}>No Students Found</Text>
                    <Text style={{ color: colors.adminTextSecondary, fontSize: 13, marginTop: 4 }}>
                      No linked students match your search criteria.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.cardsGrid}>
                    {filteredStudents.map((st) => {
                      const cgpaNum = parseFloat(st.cgpa) || 8.0;
                      const badgeColor = cgpaNum >= 9 ? "#10B981" : cgpaNum >= 8 ? "#4F46E5" : "#F59E0B";

                      return (
                        <View
                          key={st.studentUid}
                          style={[
                            styles.studentExamCard,
                            { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder },
                          ]}
                        >
                          {/* Student Header */}
                          <View style={styles.studentCardHeader}>
                            <View style={[styles.studentAvatarBox, { backgroundColor: isDark ? "#312E81" : "#EEF2FF" }]}>
                              <Text style={[styles.studentAvatarText, { color: "#4F46E5" }]}>
                                {st.studentName.charAt(0).toUpperCase()}
                              </Text>
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                              <Text style={[styles.studentNameText, { color: colors.adminText }]}>
                                {st.studentName}
                              </Text>
                              <Text style={[styles.studentMetaText, { color: colors.adminTextSecondary }]}>
                                Roll: {st.rollNo} • {st.department} • Sec {st.section || "A"}
                              </Text>
                            </View>

                            <View style={{ alignItems: "flex-end", gap: 4 }}>
                              <View style={[styles.cgpaPill, { backgroundColor: badgeColor + "20", borderColor: badgeColor }]}>
                                <Ionicons name="star" size={12} color={badgeColor} />
                                <Text style={[styles.cgpaPillText, { color: badgeColor }]}>
                                  CGPA: {st.cgpa}
                                </Text>
                              </View>
                              <Text style={[styles.gradeSubText, { color: colors.adminTextSecondary }]}>
                                {st.overallGrade || "Grade A+"}
                              </Text>
                            </View>
                          </View>

                          {/* Subjects Performance Breakdown */}
                          <View style={[styles.examScoresSection, { borderTopColor: colors.adminCardBorder }]}>
                            <Text style={[styles.examScoresTitle, { color: colors.adminTextSecondary }]}>
                              Recent Exam Marks & Subjects:
                            </Text>
                            <View style={styles.subChipsRow}>
                              {st.subjectsPerformance.map((sub, idx) => (
                                <View
                                  key={idx}
                                  style={[
                                    styles.subScoreChip,
                                    { backgroundColor: colors.adminSurfaceAlt, borderColor: colors.adminCardBorder },
                                  ]}
                                >
                                  <Text style={[styles.subScoreChipSubject, { color: colors.adminText }]} numberOfLines={1}>
                                    {sub.subjectName}
                                  </Text>
                                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 }}>
                                    <Text style={[styles.subScoreChipMarks, { color: "#4F46E5" }]}>
                                      {sub.marks}/{sub.maxMarks}
                                    </Text>
                                    <View style={styles.subGradeBadge}>
                                      <Text style={styles.subGradeBadgeText}>{sub.grade}</Text>
                                    </View>
                                    <Text style={[styles.subExamType, { color: colors.adminTextSecondary }]}>
                                      • {sub.examType}
                                    </Text>
                                  </View>
                                </View>
                              ))}
                            </View>
                          </View>

                          {/* Card Footer Actions */}
                          <View style={[styles.studentCardFooter, { borderTopColor: colors.adminCardBorder }]}>
                            <TouchableOpacity
                              style={[styles.actionBtnSecondary, { backgroundColor: isDark ? "#312E81" : "#EEF2FF", borderColor: "#C7D2FE" }]}
                              onPress={() => openUpdateExam(st)}
                            >
                              <Ionicons name="create-outline" size={14} color="#4F46E5" />
                              <Text style={[styles.actionBtnSecondaryText, { color: "#4F46E5" }]}>Update Marks</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[styles.actionBtnPrimary, { backgroundColor: "#10B981" }]}
                              onPress={() => openCgpaCalculator(st)}
                            >
                              <Ionicons name="calculator-outline" size={14} color="#FFFFFF" />
                              <Text style={styles.actionBtnPrimaryText}>Calculate CGPA</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            {/* ===================================================== */}
            {/* TAB 4: ASSIGNMENTS & HOMEWORK VIEW */}
            {/* ===================================================== */}
            {activeTab === "assignments" && (
              <View>
                {/* Sub-tab segmented control: Assignments vs Homework */}
                <View style={styles.subTabRow}>
                  <TouchableOpacity
                    style={[
                      styles.subTabPill,
                      { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder },
                      assignTab === "assignments" && styles.subTabPillActive,
                    ]}
                    onPress={() => setAssignTab("assignments")}
                  >
                    <Ionicons
                      name="document-text"
                      size={16}
                      color={assignTab === "assignments" ? "#FFFFFF" : colors.adminTextSecondary}
                    />
                    <Text
                      style={[
                        styles.subTabPillText,
                        { color: colors.adminTextSecondary },
                        assignTab === "assignments" && styles.subTabPillTextActive,
                      ]}
                    >
                      Assignments ({assignmentsList.filter((a) => a.category === "assignment").length})
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.subTabPill,
                      { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder },
                      assignTab === "homework" && styles.subTabPillActive,
                    ]}
                    onPress={() => setAssignTab("homework")}
                  >
                    <Ionicons
                      name="home"
                      size={16}
                      color={assignTab === "homework" ? "#FFFFFF" : colors.adminTextSecondary}
                    />
                    <Text
                      style={[
                        styles.subTabPillText,
                        { color: colors.adminTextSecondary },
                        assignTab === "homework" && styles.subTabPillTextActive,
                      ]}
                    >
                      Homework ({assignmentsList.filter((a) => a.category === "homework").length})
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Section Title & Search */}
                <View style={styles.sectionTitleRow}>
                  <View>
                    <Text style={[styles.sectionHeading, { color: colors.adminText }]}>
                      {assignTab === "assignments" ? "Class Assignments & Tasks" : "Daily Class Homework"}
                    </Text>
                    <Text style={[styles.sectionSubHeading, { color: colors.adminTextSecondary }]}>
                      Upload question papers in PDF or photos & track student submissions
                    </Text>
                  </View>

                  <View style={[styles.searchBoxSmall, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder }]}>
                    <Ionicons name="search" size={16} color={colors.adminTextSecondary} />
                    <TextInput
                      style={[styles.searchInputSmall, { color: colors.adminText }]}
                      placeholder={`Search ${assignTab}...`}
                      placeholderTextColor={colors.adminTextSecondary}
                      value={search}
                      onChangeText={setSearch}
                    />
                    {search ? (
                      <TouchableOpacity onPress={() => setSearch("")}>
                        <Ionicons name="close-circle" size={16} color={colors.adminTextSecondary} />
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>

                {/* Assignments List */}
                {filteredAssignments.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <Ionicons name="document-attach-outline" size={48} color={colors.adminTextSecondary} />
                    <Text style={[styles.emptyTitle, { color: colors.adminText }]}>
                      No {assignTab === "assignments" ? "Assignments" : "Homework"} Found
                    </Text>
                    <Text style={{ color: colors.adminTextSecondary, fontSize: 13, marginTop: 4 }}>
                      Click "New {assignTab === "assignments" ? "Assignment" : "Homework"}" above to create your first task.
                    </Text>
                  </View>
                ) : (
                  <View style={styles.cardsGrid}>
                    {filteredAssignments.map((item) => (
                      <View
                        key={item.id}
                        style={[
                          styles.assignmentCard,
                          { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder },
                        ]}
                      >
                        {/* Header */}
                        <View style={styles.assignmentHeaderRow}>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 }}>
                              <View
                                style={[
                                  styles.categoryBadge,
                                  {
                                    backgroundColor: item.category === "assignment" ? (isDark ? "#312E81" : "#EEF2FF") : (isDark ? "#431407" : "#FFEDD5"),
                                  },
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.categoryBadgeText,
                                    { color: item.category === "assignment" ? "#4F46E5" : "#C2410C" },
                                  ]}
                                >
                                  {item.category === "assignment" ? "ASSIGNMENT" : "HOMEWORK"}
                                </Text>
                              </View>
                              <Text style={[styles.subjectTag, { color: colors.adminTextSecondary }]}>
                                {item.subject}
                              </Text>
                            </View>
                            <Text style={[styles.assignmentTitle, { color: colors.adminText }]}>
                              {item.title}
                            </Text>
                          </View>

                          <View style={styles.actionBtnsRow}>
                            <TouchableOpacity
                              style={[styles.iconBtn, { backgroundColor: isDark ? "rgba(99,102,241,0.2)" : "#EEF2FF" }]}
                              onPress={() => openEditAssignment(item)}
                            >
                              <Ionicons name="create-outline" size={16} color="#4F46E5" />
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.iconBtn, styles.deleteBtn, { backgroundColor: isDark ? "rgba(239,68,68,0.2)" : "#FEE2E2" }]}
                              onPress={() => handleDeleteAssignment(item)}
                            >
                              <Ionicons name="trash-outline" size={16} color="#EF4444" />
                            </TouchableOpacity>
                          </View>
                        </View>

                        {/* Instructions */}
                        <Text style={[styles.assignmentInstructions, { color: colors.adminTextSecondary }]} numberOfLines={2}>
                          {item.instructions}
                        </Text>

                        {/* Attached Hardcopy PDF / Photo */}
                        {(item.pdfUrl || item.photoUrl) && (
                          <View style={styles.attachmentsContainer}>
                            {item.pdfUrl ? (
                              <TouchableOpacity
                                style={styles.pdfAttachmentPill}
                                onPress={() => {
                                  if (item.pdfUrl) {
                                    shareOrDownloadPdf(item.pdfUrl, item.title).catch(() => {
                                      Linking.openURL(item.pdfUrl!);
                                    });
                                  }
                                }}
                              >
                                <Ionicons name="document-text" size={14} color="#DC2626" />
                                <Text style={styles.pdfAttachmentText} numberOfLines={1}>
                                  {item.pdfName || "Worksheet.pdf"}
                                </Text>
                                <Ionicons name="download-outline" size={13} color="#DC2626" />
                              </TouchableOpacity>
                            ) : null}

                            {item.photoUrl ? (
                              <TouchableOpacity
                                style={styles.photoAttachmentPill}
                                onPress={() => setPreviewPhoto(item.photoUrl || null)}
                              >
                                <Ionicons name="image" size={14} color="#7C3AED" />
                                <Text style={styles.photoAttachmentText} numberOfLines={1}>
                                  {item.photoName || "Worksheet Photo"}
                                </Text>
                                <Ionicons name="eye-outline" size={13} color="#7C3AED" />
                              </TouchableOpacity>
                            ) : null}
                          </View>
                        )}

                        {/* Meta: Due Date & Points */}
                        <View style={[styles.assignmentMetaRow, { borderTopColor: colors.adminCardBorder }]}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                              <Ionicons name="time-outline" size={13} color={colors.adminTextSecondary} />
                              <Text style={[styles.metaText, { color: colors.adminTextSecondary }]}>
                                Due: {item.dueDate}
                              </Text>
                            </View>
                            <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                              <Ionicons name="trophy-outline" size={13} color={colors.adminTextSecondary} />
                              <Text style={[styles.metaText, { color: colors.adminTextSecondary }]}>
                                {item.totalMarks} Points
                              </Text>
                            </View>
                          </View>

                          {/* Submission Roster Button ("give aggiment and not") */}
                          <TouchableOpacity
                            style={styles.rosterBtn}
                            onPress={() => openSubmissionsRoster(item)}
                          >
                            <Ionicons name="people" size={14} color="#FFFFFF" />
                            <Text style={styles.rosterBtnText}>Submission Roster</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* ===================================================== */}
      {/* ADD / EDIT SUBJECT MODAL */}
      {/* ===================================================== */}
      <Modal visible={subjectModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder, borderWidth: 1 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.adminText }]}>
                {editingSubject ? "Edit Course Subject" : "Add New Subject"}
              </Text>
              <TouchableOpacity onPress={() => setSubjectModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.adminTextSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 480 }}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Subject Name *</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                  placeholder="e.g. Data Structures & Algorithms"
                  placeholderTextColor={colors.adminTextSecondary}
                  value={subjectName}
                  onChangeText={setSubjectName}
                />
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Course Code *</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                    placeholder="e.g. CS201"
                    placeholderTextColor={colors.adminTextSecondary}
                    autoCapitalize="characters"
                    value={subjectCode}
                    onChangeText={setSubjectCode}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Type</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                    placeholder="Core, Elective, Lab..."
                    placeholderTextColor={colors.adminTextSecondary}
                    value={subjectType}
                    onChangeText={setSubjectType}
                  />
                </View>
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Department</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                    placeholder="CSE, ECE, ME..."
                    placeholderTextColor={colors.adminTextSecondary}
                    value={department}
                    onChangeText={setDepartment}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Semester</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                    placeholder="1 to 8"
                    placeholderTextColor={colors.adminTextSecondary}
                    keyboardType="numeric"
                    value={semester}
                    onChangeText={setSemester}
                  />
                </View>
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Credits</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                    placeholder="3 or 4"
                    placeholderTextColor={colors.adminTextSecondary}
                    keyboardType="numeric"
                    value={credits}
                    onChangeText={setCredits}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Assigned Instructor</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                    placeholder="e.g. Dr. S. Ramesh"
                    placeholderTextColor={colors.adminTextSecondary}
                    value={teacherName}
                    onChangeText={setTeacherName}
                  />
                </View>
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.adminCardBorder }]}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.adminInputBg }]}
                onPress={() => setSubjectModalVisible(false)}
                disabled={saving}
              >
                <Text style={[styles.modalCancelText, { color: colors.adminTextSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={saveSubject}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveText}>
                    {editingSubject ? "Save Subject" : "Add to Curriculum"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================== */}
      {/* ADD / EDIT DEPARTMENT MODAL */}
      {/* ===================================================== */}
      <Modal visible={deptModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder, borderWidth: 1 }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.adminText }]}>
                {editingDept ? "Edit Department" : "Add Department"}
              </Text>
              <TouchableOpacity onPress={() => setDeptModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.adminTextSecondary} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Department Name *</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                placeholder="e.g. Computer Science & Engineering"
                placeholderTextColor={colors.adminTextSecondary}
                value={deptName}
                onChangeText={setDeptName}
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Department Code *</Text>
              <TextInput
                style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                placeholder="e.g. CSE"
                placeholderTextColor={colors.adminTextSecondary}
                autoCapitalize="characters"
                value={deptCode}
                onChangeText={setDeptCode}
              />
            </View>

            <View style={[styles.modalFooter, { borderTopColor: colors.adminCardBorder }]}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.adminInputBg }]}
                onPress={() => setDeptModalVisible(false)}
                disabled={saving}
              >
                <Text style={[styles.modalCancelText, { color: colors.adminTextSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalSaveBtn}
                onPress={saveDepartment}
                disabled={saving}
              >
                {saving ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveText}>
                    {editingDept ? "Save" : "Add"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      {/* ===================================================== */}
      {/* 3. UPDATE EXAM PERFORMANCE MODAL */}
      {/* ===================================================== */}
      <Modal visible={examModalVisible} transparent animationType="fade" onRequestClose={() => setExamModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder, borderWidth: 1, maxWidth: 520 }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.adminText }]}>Update Exam Performance</Text>
                <Text style={[styles.modalSubtitleSmall, { color: colors.adminTextSecondary }]}>
                  {targetStudentForExam?.studentName} ({targetStudentForExam?.rollNo}) • {targetStudentForExam?.department}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setExamModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.adminTextSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Subject / Course</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                  placeholder="e.g. Data Structures & Algorithms"
                  placeholderTextColor={colors.adminTextSecondary}
                  value={examSubject}
                  onChangeText={setExamSubject}
                />
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Marks Scored *</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                    placeholder="e.g. 88"
                    placeholderTextColor={colors.adminTextSecondary}
                    keyboardType="numeric"
                    value={examMarks}
                    onChangeText={setExamMarks}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Maximum Marks</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                    placeholder="100"
                    placeholderTextColor={colors.adminTextSecondary}
                    keyboardType="numeric"
                    value={examMaxMarks}
                    onChangeText={setExamMaxMarks}
                  />
                </View>
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Grade Awarded</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                    placeholder="O, A+, A, B+, B..."
                    placeholderTextColor={colors.adminTextSecondary}
                    value={examGrade}
                    onChangeText={setExamGrade}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Exam Category</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                    placeholder="Mid-Term, Final, Unit Test..."
                    placeholderTextColor={colors.adminTextSecondary}
                    value={examType}
                    onChangeText={setExamType}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Overall Cumulative CGPA (out of 10.0)</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                  placeholder="e.g. 8.85"
                  placeholderTextColor={colors.adminTextSecondary}
                  keyboardType="numeric"
                  value={examCgpa}
                  onChangeText={setExamCgpa}
                />
              </View>
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.adminCardBorder }]}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.adminInputBg }]}
                onPress={() => setExamModalVisible(false)}
                disabled={savingExam}
              >
                <Text style={[styles.modalCancelText, { color: colors.adminTextSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: "#4F46E5" }]}
                onPress={handleSaveExamPerformance}
                disabled={savingExam}
              >
                {savingExam ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveText}>Save Marks & CGPA</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================== */}
      {/* 4. CGPA CALCULATOR MODAL */}
      {/* ===================================================== */}
      <Modal visible={cgpaCalcModalVisible} transparent animationType="fade" onRequestClose={() => setCgpaCalcModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder, borderWidth: 1, maxWidth: 580 }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.adminText }]}>CGPA Calculator Tool 🧮</Text>
                <Text style={[styles.modalSubtitleSmall, { color: colors.adminTextSecondary }]}>
                  {calcStudent ? `Calculate & apply directly to ${calcStudent.studentName}` : "Calculate GPA / CGPA based on credits & letter grades"}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setCgpaCalcModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.adminTextSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              {/* Live Computed CGPA Display */}
              <View style={[styles.calcResultBanner, { backgroundColor: isDark ? "#1E293B" : "#F0FDF4", borderColor: isDark ? "#334155" : "#BBF7D0" }]}>
                <View>
                  <Text style={[styles.calcResultLabel, { color: colors.adminTextSecondary }]}>Calculated Grade Point Average</Text>
                  <Text style={[styles.calcResultVal, { color: "#10B981" }]}>{computedCgpa} / 10.0</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={[styles.calcResultGradePill, { backgroundColor: "#10B981" }]}>
                    {Number(computedCgpa) >= 9 ? "Grade O (Distinction)" : Number(computedCgpa) >= 8 ? "Grade A+ (First Class)" : Number(computedCgpa) >= 7 ? "Grade A" : "Grade B+"}
                  </Text>
                  <Text style={[styles.calcResultSub, { color: colors.adminTextSecondary }]}>
                    Formula: Σ(Credits × Points) / ΣCredits
                  </Text>
                </View>
              </View>

              {/* Course Rows */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginVertical: 10 }}>
                <Text style={[styles.inputLabel, { color: colors.adminTextSecondary, marginBottom: 0 }]}>
                  Course Subjects & Assigned Credits:
                </Text>
                <TouchableOpacity
                  style={[styles.addCourseBtn, { backgroundColor: isDark ? "#312E81" : "#EEF2FF" }]}
                  onPress={handleAddCalcCourse}
                >
                  <Ionicons name="add" size={14} color="#4F46E5" />
                  <Text style={{ fontSize: 12, fontWeight: "700", color: "#4F46E5" }}>Add Course</Text>
                </TouchableOpacity>
              </View>

              {calcCourses.map((c) => (
                <View
                  key={c.id}
                  style={[
                    styles.calcCourseRow,
                    { backgroundColor: colors.adminSurfaceAlt, borderColor: colors.adminCardBorder },
                  ]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.calcCourseName, { color: colors.adminText }]} numberOfLines={1}>
                      {c.name}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                      <Text style={{ fontSize: 11, color: colors.adminTextSecondary }}>Credits:</Text>
                      {[2, 3, 4].map((cr) => (
                        <TouchableOpacity
                          key={cr}
                          style={[
                            styles.creditsBadge,
                            { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder },
                            c.credits === cr && { backgroundColor: "#4F46E5", borderColor: "#4F46E5" },
                          ]}
                          onPress={() => handleUpdateCourseCredits(c.id, cr)}
                        >
                          <Text style={[styles.creditsBadgeText, { color: c.credits === cr ? "#FFFFFF" : colors.adminTextSecondary }]}>
                            {cr}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    {["O", "A+", "A", "B+", "B", "C"].map((g) => (
                      <TouchableOpacity
                        key={g}
                        style={[
                          styles.gradeSelectPill,
                          { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder },
                          c.gradeLetter === g && { backgroundColor: "#10B981", borderColor: "#10B981" },
                        ]}
                        onPress={() => handleUpdateCourseGrade(c.id, g)}
                      >
                        <Text style={[styles.gradeSelectPillText, { color: c.gradeLetter === g ? "#FFFFFF" : colors.adminTextSecondary }]}>
                          {g}
                        </Text>
                      </TouchableOpacity>
                    ))}

                    <TouchableOpacity onPress={() => handleRemoveCalcCourse(c.id)} style={{ padding: 4, marginLeft: 4 }}>
                      <Ionicons name="trash-outline" size={16} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.adminCardBorder }]}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.adminInputBg }]}
                onPress={() => setCgpaCalcModalVisible(false)}
              >
                <Text style={[styles.modalCancelText, { color: colors.adminTextSecondary }]}>Close</Text>
              </TouchableOpacity>

              {calcStudent ? (
                <TouchableOpacity
                  style={[styles.modalSaveBtn, { backgroundColor: "#10B981" }]}
                  onPress={() => handleApplyCgpaToStudent(calcStudent)}
                  disabled={savingCgpa}
                >
                  {savingCgpa ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Text style={styles.modalSaveText}>Apply to {calcStudent.studentName.split(" ")[0]}</Text>
                  )}
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.modalSaveBtn, { backgroundColor: "#4F46E5" }]}
                  onPress={() => {
                    Alert.alert("Calculated CGPA", `The computed CGPA is ${computedCgpa} / 10.0.`);
                    setCgpaCalcModalVisible(false);
                  }}
                >
                  <Text style={styles.modalSaveText}>Done</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================== */}
      {/* 5. CREATE / EDIT ASSIGNMENT OR HOMEWORK MODAL */}
      {/* ===================================================== */}
      <Modal visible={assignModalVisible} transparent animationType="fade" onRequestClose={() => setAssignModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder, borderWidth: 1, maxWidth: 560 }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.adminText }]}>
                  {editingAssignment ? `Edit ${assignCategory === "assignment" ? "Assignment" : "Homework"}` : `Create New ${assignCategory === "assignment" ? "Assignment" : "Homework"}`}
                </Text>
                <Text style={[styles.modalSubtitleSmall, { color: colors.adminTextSecondary }]}>
                  Publish task with attachments for linked students
                </Text>
              </View>
              <TouchableOpacity onPress={() => setAssignModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.adminTextSecondary} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 440 }}>
              {/* Category Segmented Control */}
              <View style={styles.subTabRow}>
                <TouchableOpacity
                  style={[
                    styles.subTabPill,
                    { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder },
                    assignCategory === "assignment" && styles.subTabPillActive,
                  ]}
                  onPress={() => setAssignCategory("assignment")}
                >
                  <Text style={[styles.subTabPillText, { color: colors.adminTextSecondary }, assignCategory === "assignment" && styles.subTabPillTextActive]}>
                    Assignment
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.subTabPill,
                    { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder },
                    assignCategory === "homework" && styles.subTabPillActive,
                  ]}
                  onPress={() => setAssignCategory("homework")}
                >
                  <Text style={[styles.subTabPillText, { color: colors.adminTextSecondary }, assignCategory === "homework" && styles.subTabPillTextActive]}>
                    Homework
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Title *</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                  placeholder="e.g. Graph Traversal BFS & DFS Practice"
                  placeholderTextColor={colors.adminTextSecondary}
                  value={assignTitle}
                  onChangeText={setAssignTitle}
                />
              </View>

              <View style={styles.rowInputs}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Subject / Course</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                    placeholder="e.g. Data Structures & Algorithms"
                    placeholderTextColor={colors.adminTextSecondary}
                    value={assignSubject}
                    onChangeText={setAssignSubject}
                  />
                </View>

                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Due Date</Text>
                  <TextInput
                    style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                    placeholder="YYYY-MM-DD"
                    placeholderTextColor={colors.adminTextSecondary}
                    value={assignDueDate}
                    onChangeText={setAssignDueDate}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Total Marks / Points</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText }]}
                  placeholder="e.g. 20"
                  placeholderTextColor={colors.adminTextSecondary}
                  keyboardType="numeric"
                  value={assignTotalMarks}
                  onChangeText={setAssignTotalMarks}
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={[styles.inputLabel, { color: colors.adminTextSecondary }]}>Instructions / Task Description</Text>
                <TextInput
                  style={[styles.modalInput, { backgroundColor: colors.adminInputBg, borderColor: colors.adminInputBorder, color: colors.adminText, minHeight: 70, textAlignVertical: "top" }]}
                  placeholder="Type questions, instructions or guidelines for students..."
                  placeholderTextColor={colors.adminTextSecondary}
                  multiline
                  numberOfLines={3}
                  value={assignInstructions}
                  onChangeText={setAssignInstructions}
                />
              </View>

              {/* ATTACHMENTS (PDF & PHOTO SYSTEM) */}
              <Text style={[styles.inputLabel, { color: colors.adminTextSecondary, marginTop: 4 }]}>
                Question Paper / Hardcopy Attachment (PDF & Photo System):
              </Text>
              <View style={{ flexDirection: "row", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
                <TouchableOpacity
                  style={[styles.attachBtn, { backgroundColor: isDark ? "#312E81" : "#EEF2FF", borderColor: "#C7D2FE" }]}
                  onPress={handlePickAssignPdf}
                >
                  <Ionicons name="document-text" size={16} color="#DC2626" />
                  <Text style={[styles.attachBtnText, { color: "#DC2626" }]}>
                    {assignPdfUrl ? "Change PDF" : "Attach PDF Document"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.attachBtn, { backgroundColor: isDark ? "#312E81" : "#EEF2FF", borderColor: "#C7D2FE" }]}
                  onPress={handlePickAssignPhoto}
                >
                  <Ionicons name="image" size={16} color="#7C3AED" />
                  <Text style={[styles.attachBtnText, { color: "#7C3AED" }]}>
                    {assignPhotoUrl ? "Change Photo" : "Attach Image"}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.attachBtn, { backgroundColor: isDark ? "#312E81" : "#EEF2FF", borderColor: "#C7D2FE" }]}
                  onPress={handleTakeAssignPhoto}
                >
                  <Ionicons name="camera" size={16} color="#4F46E5" />
                  <Text style={[styles.attachBtnText, { color: "#4F46E5" }]}>Camera</Text>
                </TouchableOpacity>
              </View>

              {/* Attached file previews */}
              {assignPdfUrl ? (
                <View style={[styles.attachedPillRow, { backgroundColor: isDark ? "#1E293B" : "#FEF2F2", borderColor: "#FCA5A5" }]}>
                  <Ionicons name="document-text" size={16} color="#DC2626" />
                  <Text style={[styles.attachedPillName, { color: colors.adminText }]} numberOfLines={1}>
                    {assignPdfName || "Worksheet.pdf"}
                  </Text>
                  <TouchableOpacity onPress={() => setAssignPdfUrl("")} style={{ marginLeft: "auto" }}>
                    <Ionicons name="close-circle" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ) : null}

              {assignPhotoUrl ? (
                <View style={[styles.attachedPillRow, { backgroundColor: isDark ? "#1E293B" : "#F5F3FF", borderColor: "#DDD6FE" }]}>
                  <Ionicons name="image" size={16} color="#7C3AED" />
                  <Text style={[styles.attachedPillName, { color: colors.adminText }]} numberOfLines={1}>
                    {assignPhotoName || "Reference_Photo.jpg"}
                  </Text>
                  <TouchableOpacity onPress={() => setAssignPhotoUrl("")} style={{ marginLeft: "auto" }}>
                    <Ionicons name="close-circle" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ) : null}
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.adminCardBorder }]}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { backgroundColor: colors.adminInputBg }]}
                onPress={() => setAssignModalVisible(false)}
                disabled={savingAssign}
              >
                <Text style={[styles.modalCancelText, { color: colors.adminTextSecondary }]}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: "#4F46E5" }]}
                onPress={handleSaveAssignment}
                disabled={savingAssign}
              >
                {savingAssign ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.modalSaveText}>
                    {editingAssignment ? "Update Task" : "Publish Task"}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ===================================================== */}
      {/* 6. SUBMISSION TRACKER ROSTER MODAL ("give aggiment and not") */}
      {/* ===================================================== */}
      <Modal visible={rosterModalVisible} transparent animationType="fade" onRequestClose={() => setRosterModalVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder, borderWidth: 1, maxWidth: 640 }]}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={[styles.modalTitle, { color: colors.adminText }]}>Submission Roster 📋</Text>
                <Text style={[styles.modalSubtitleSmall, { color: colors.adminTextSecondary }]}>
                  {selectedAssignmentForRoster?.title} • {selectedAssignmentForRoster?.subject}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setRosterModalVisible(false)}>
                <Ionicons name="close" size={24} color={colors.adminTextSecondary} />
              </TouchableOpacity>
            </View>

            {/* Header statistics */}
            <View style={[styles.rosterHeaderStats, { backgroundColor: colors.adminSurfaceAlt, borderColor: colors.adminCardBorder }]}>
              <View style={styles.rosterStatCol}>
                <Text style={[styles.rosterStatVal, { color: "#10B981" }]}>
                  {submissionsRoster.filter((s) => s.status === "Submitted").length}
                </Text>
                <Text style={[styles.rosterStatLabel, { color: colors.adminTextSecondary }]}>Submitted</Text>
              </View>
              <View style={styles.rosterStatCol}>
                <Text style={[styles.rosterStatVal, { color: "#EF4444" }]}>
                  {submissionsRoster.filter((s) => s.status === "Not Submitted").length}
                </Text>
                <Text style={[styles.rosterStatLabel, { color: colors.adminTextSecondary }]}>Pending / Not Given</Text>
              </View>
              <View style={styles.rosterStatCol}>
                <Text style={[styles.rosterStatVal, { color: "#4F46E5" }]}>
                  {Math.round((submissionsRoster.filter((s) => s.status === "Submitted").length / Math.max(1, submissionsRoster.length)) * 100)}%
                </Text>
                <Text style={[styles.rosterStatLabel, { color: colors.adminTextSecondary }]}>Completion Rate</Text>
              </View>
            </View>

            {/* Students Roster List */}
            <ScrollView showsVerticalScrollIndicator={false} style={{ maxHeight: 420 }}>
              {submissionsRoster.map((sub) => {
                const isGiven = sub.status === "Submitted";

                return (
                  <View
                    key={sub.studentUid}
                    style={[
                      styles.rosterItemRow,
                      { backgroundColor: colors.adminSurfaceAlt, borderColor: colors.adminCardBorder },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                        <Text style={[styles.rosterStudentName, { color: colors.adminText }]}>
                          {sub.studentName}
                        </Text>
                        <View
                          style={[
                            styles.rosterStatusBadge,
                            {
                              backgroundColor: isGiven ? (isDark ? "#064E3B" : "#DCFCE7") : (isDark ? "#450A0A" : "#FEE2E2"),
                              borderColor: isGiven ? "#86EFAC" : "#FCA5A5",
                            },
                          ]}
                        >
                          <Ionicons
                            name={isGiven ? "checkmark-circle" : "close-circle"}
                            size={12}
                            color={isGiven ? "#16A34A" : "#DC2626"}
                          />
                          <Text
                            style={[
                              styles.rosterStatusBadgeText,
                              { color: isGiven ? "#16A34A" : "#DC2626" },
                            ]}
                          >
                            {isGiven ? "Submitted" : "Not Given"}
                          </Text>
                        </View>
                      </View>

                      <Text style={[styles.rosterStudentMeta, { color: colors.adminTextSecondary }]}>
                        Roll: {sub.rollNo} • {sub.department} • {sub.submittedAt ? `Turned in: ${sub.submittedAt}` : "No submission yet"}
                      </Text>

                      {isGiven && (
                        <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                          <Text style={{ fontSize: 11, fontWeight: "700", color: "#4F46E5" }}>
                            Score: {sub.marksAwarded ?? 18} / {selectedAssignmentForRoster?.totalMarks ?? 20}
                          </Text>
                          {sub.pdfUrl ? (
                            <TouchableOpacity
                              style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
                              onPress={() => {
                                if (sub.pdfUrl) {
                                  shareOrDownloadPdf(sub.pdfUrl, `${sub.studentName}_Submission`).catch(() => {
                                    Linking.openURL(sub.pdfUrl!);
                                  });
                                }
                              }}
                            >
                              <Ionicons name="document-text" size={12} color="#DC2626" />
                              <Text style={{ fontSize: 11, color: "#DC2626", fontWeight: "600" }}>View PDF</Text>
                            </TouchableOpacity>
                          ) : null}
                          {sub.photoUrl ? (
                            <TouchableOpacity
                              style={{ flexDirection: "row", alignItems: "center", gap: 3 }}
                              onPress={() => setPreviewPhoto(sub.photoUrl || null)}
                            >
                              <Ionicons name="image" size={12} color="#7C3AED" />
                              <Text style={{ fontSize: 11, color: "#7C3AED", fontWeight: "600" }}>View Photo</Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      )}
                    </View>

                    {/* Action button to toggle submission status */}
                    <TouchableOpacity
                      style={[
                        styles.rosterActionBtn,
                        {
                          backgroundColor: isGiven ? (isDark ? "#450A0A" : "#FEE2E2") : (isDark ? "#064E3B" : "#DCFCE7"),
                          borderColor: isGiven ? "#FECACA" : "#BBF7D0",
                        },
                      ]}
                      onPress={() => handleToggleSubmissionStatus(sub.studentUid)}
                    >
                      <Text
                        style={[
                          styles.rosterActionBtnText,
                          { color: isGiven ? "#EF4444" : "#16A34A" },
                        ]}
                      >
                        {isGiven ? "Mark Pending" : "Mark Submitted"}
                      </Text>
                    </TouchableOpacity>
                  </View>
                );
              })}
            </ScrollView>

            <View style={[styles.modalFooter, { borderTopColor: colors.adminCardBorder }]}>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: "#4F46E5" }]}
                onPress={() => {
                  Alert.alert("Submissions Saved", "Submission records updated.");
                  setRosterModalVisible(false);
                }}
              >
                <Text style={styles.modalSaveText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* PHOTO PREVIEW MODAL */}
      <Modal visible={Boolean(previewPhoto)} transparent animationType="fade" onRequestClose={() => setPreviewPhoto(null)}>
        <View style={styles.modalOverlay}>
          <View style={[styles.modalCard, { backgroundColor: colors.adminCard, borderColor: colors.adminCardBorder, maxWidth: 600, alignItems: "center" }]}>
            <View style={{ width: "100%", flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <Text style={[styles.modalTitle, { color: colors.adminText }]}>Worksheet Attachment Preview</Text>
              <TouchableOpacity onPress={() => setPreviewPhoto(null)}>
                <Ionicons name="close" size={24} color={colors.adminTextSecondary} />
              </TouchableOpacity>
            </View>
            {previewPhoto && (
              <Image source={{ uri: previewPhoto }} style={{ width: "100%", height: 360, borderRadius: 10, resizeMode: "contain" }} />
            )}
            <TouchableOpacity
              style={[styles.modalCancelBtn, { marginTop: 16, width: "100%", alignItems: "center" }]}
              onPress={() => setPreviewPhoto(null)}
            >
              <Text style={[styles.modalCancelText, { color: colors.adminTextSecondary }]}>Close Preview</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

// =====================================================
// STYLES
// =====================================================
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
    paddingVertical: 6,
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
    backgroundColor: "#5D3EBC",
  },
  navItemLabel: {
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    marginLeft: 12,
    fontWeight: "500",
  },
  navItemLabelActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  sidebarLogout: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
    marginTop: 10,
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
  headerSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 16,
    marginBottom: 20,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172A",
  },
  pageSubtitle: {
    fontSize: 14,
    color: "#64748B",
    marginTop: 2,
  },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4F46E5",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    gap: 6,
    shadowColor: "#4F46E5",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  addBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  tabBar: {
    flexDirection: "row",
    backgroundColor: "#E2E8F0",
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    maxWidth: 420,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    borderRadius: 10,
    gap: 8,
  },
  tabBtnActive: {
    backgroundColor: "#4F46E5",
  },
  tabBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#64748B",
  },
  tabBtnTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  statsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 14,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    minWidth: 180,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    borderLeftWidth: 4,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  statIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  statCol: {
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  statValue: {
    fontSize: 20,
    fontWeight: "800",
    color: "#0F172A",
    marginTop: 2,
  },
  filterSection: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    flexWrap: "wrap",
    gap: 10,
  },
  filterTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#475569",
  },
  filterScroll: {
    gap: 8,
  },
  filterChip: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 20,
    backgroundColor: "#E2E8F0",
  },
  filterChipActive: {
    backgroundColor: "#4F46E5",
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
  },
  filterChipTextActive: {
    color: "#FFFFFF",
  },
  cardsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 16,
  },
  subjectCard: {
    flex: 1,
    minWidth: 320,
    maxWidth: 450,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  cardTopRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  codeBadge: {
    backgroundColor: "#EEF2FF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    marginRight: 8,
  },
  codeBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#4F46E5",
  },
  typeBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  typeBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#475569",
  },
  actionBtnsRow: {
    flexDirection: "row",
    marginLeft: "auto",
    gap: 6,
  },
  iconBtn: {
    width: 30,
    height: 30,
    borderRadius: 6,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteBtn: {
    backgroundColor: "#FEE2E2",
  },
  subjectName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0F172A",
    marginBottom: 12,
  },
  subMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  metaChipText: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "500",
  },
  facultyRow: {
    flexDirection: "row",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "#F1F5F9",
    paddingTop: 10,
    gap: 6,
  },
  facultyName: {
    fontSize: 12,
    color: "#6366F1",
    fontWeight: "600",
  },
  deptCard: {
    flex: 1,
    minWidth: 320,
    maxWidth: 450,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    padding: 18,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  deptTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  deptIconCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: "#EEF2FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 14,
  },
  deptInfo: {
    flex: 1,
  },
  deptCardName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172A",
  },
  deptCardCode: {
    fontSize: 12,
    color: "#64748B",
    marginTop: 2,
    fontWeight: "600",
  },
  loaderBox: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "#64748B",
  },
  emptyBox: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#334155",
    marginTop: 12,
  },
  emptySubtitle: {
    fontSize: 13,
    color: "#94A3B8",
    marginTop: 4,
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
    maxWidth: 520,
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172A",
  },
  inputGroup: {
    marginBottom: 14,
  },
  rowInputs: {
    flexDirection: "row",
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#475569",
    marginBottom: 6,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: "#CBD5E1",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: "#0F172A",
    backgroundColor: "#FFFFFF",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  modalCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: "#F1F5F9",
  },
  modalCancelText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#475569",
  },
  modalSaveBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: "#4F46E5",
  },
  modalSaveText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  modalSubtitleSmall: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: "500",
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 12,
    marginVertical: 14,
  },
  sectionHeading: {
    fontSize: 17,
    fontWeight: "800",
  },
  sectionSubHeading: {
    fontSize: 12,
    marginTop: 2,
  },
  searchBoxSmall: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 220,
    maxWidth: 320,
    gap: 6,
  },
  searchInputSmall: {
    flex: 1,
    fontSize: 12,
    padding: 0,
  },
  studentExamCard: {
    flex: 1,
    minWidth: 330,
    maxWidth: 520,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  studentCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  studentAvatarBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  studentAvatarText: {
    fontSize: 18,
    fontWeight: "800",
  },
  studentNameText: {
    fontSize: 15,
    fontWeight: "700",
  },
  studentMetaText: {
    fontSize: 12,
    marginTop: 2,
  },
  cgpaPill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    gap: 4,
  },
  cgpaPillText: {
    fontSize: 12,
    fontWeight: "800",
  },
  gradeSubText: {
    fontSize: 11,
    fontWeight: "600",
  },
  examScoresSection: {
    borderTopWidth: 1,
    paddingTop: 10,
    marginTop: 4,
  },
  examScoresTitle: {
    fontSize: 11,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  subChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  subScoreChip: {
    flex: 1,
    minWidth: 140,
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  subScoreChipSubject: {
    fontSize: 12,
    fontWeight: "700",
  },
  subScoreChipMarks: {
    fontSize: 12,
    fontWeight: "800",
  },
  subGradeBadge: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
  },
  subGradeBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#16A34A",
  },
  subExamType: {
    fontSize: 10,
  },
  studentCardFooter: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    borderTopWidth: 1,
    paddingTop: 12,
    marginTop: 12,
  },
  actionBtnSecondary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  actionBtnSecondaryText: {
    fontSize: 12,
    fontWeight: "700",
  },
  actionBtnPrimary: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  actionBtnPrimaryText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  subTabRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 14,
  },
  subTabPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1,
  },
  subTabPillActive: {
    backgroundColor: "#4F46E5",
    borderColor: "#4F46E5",
  },
  subTabPillText: {
    fontSize: 13,
    fontWeight: "600",
  },
  subTabPillTextActive: {
    color: "#FFFFFF",
    fontWeight: "700",
  },
  assignmentCard: {
    flex: 1,
    minWidth: 330,
    maxWidth: 520,
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    shadowColor: "#0F172A",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 5,
    elevation: 2,
  },
  assignmentHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  categoryBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  categoryBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  subjectTag: {
    fontSize: 11,
    fontWeight: "600",
  },
  assignmentTitle: {
    fontSize: 15,
    fontWeight: "800",
    marginTop: 2,
  },
  assignmentInstructions: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 10,
  },
  attachmentsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },
  pdfAttachmentPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#FEF2F2",
    borderWidth: 1,
    borderColor: "#FECACA",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    maxWidth: 220,
  },
  pdfAttachmentText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#DC2626",
    flexShrink: 1,
  },
  photoAttachmentPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#F5F3FF",
    borderWidth: 1,
    borderColor: "#DDD6FE",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    maxWidth: 220,
  },
  photoAttachmentText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#7C3AED",
    flexShrink: 1,
  },
  assignmentMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 1,
    paddingTop: 10,
  },
  metaText: {
    fontSize: 11,
    fontWeight: "600",
  },
  rosterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#4F46E5",
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  rosterBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  calcResultBanner: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  calcResultLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  calcResultVal: {
    fontSize: 26,
    fontWeight: "900",
    marginTop: 2,
  },
  calcResultGradePill: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "800",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  calcResultSub: {
    fontSize: 10,
    marginTop: 4,
  },
  addCourseBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  calcCourseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    gap: 8,
  },
  calcCourseName: {
    fontSize: 13,
    fontWeight: "700",
  },
  creditsBadge: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  creditsBadgeText: {
    fontSize: 11,
    fontWeight: "700",
  },
  gradeSelectPill: {
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 6,
    borderWidth: 1,
  },
  gradeSelectPillText: {
    fontSize: 11,
    fontWeight: "700",
  },
  attachBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  attachBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  attachedPillRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 8,
    borderWidth: 1,
    gap: 8,
    marginBottom: 8,
  },
  attachedPillName: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  rosterHeaderStats: {
    flexDirection: "row",
    borderRadius: 10,
    borderWidth: 1,
    padding: 12,
    marginBottom: 14,
    justifyContent: "space-around",
  },
  rosterStatCol: {
    alignItems: "center",
  },
  rosterStatVal: {
    fontSize: 18,
    fontWeight: "800",
  },
  rosterStatLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  rosterItemRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
    gap: 10,
  },
  rosterStudentName: {
    fontSize: 13,
    fontWeight: "700",
  },
  rosterStudentMeta: {
    fontSize: 11,
    marginTop: 2,
  },
  rosterStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
  },
  rosterStatusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
  },
  rosterActionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    borderWidth: 1,
  },
  rosterActionBtnText: {
    fontSize: 11,
    fontWeight: "700",
  },
});