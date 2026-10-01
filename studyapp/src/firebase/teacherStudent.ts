import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "./config";

export interface TeacherCode {
  id: string; // teacherId
  teacherId: string;
  password: string;
  teacherName: string;
  teacherEmail?: string;
  teacherUid?: string;
  subject: string;
  department?: string;
  description?: string;
  updatedAt?: any;
  studentCount?: number;
}

export interface ConnectedTeacherInfo {
  teacherId: string;
  teacherName: string;
  subject: string;
  department?: string;
  connectedAt: string;
}

export interface TeacherStudentMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: "student" | "teacher" | "admin";
  text: string;
  photoUrl?: string;
  pdfUrl?: string;
  pdfName?: string;
  createdAt: any;
}

const DEFAULT_TEACHER_CODE: TeacherCode = {
  id: "TEACH-CSE-101",
  teacherId: "TEACH-CSE-101",
  password: "123",
  teacherName: "Prof. Ganesh Sharma",
  teacherEmail: "ganesh.faculty@campusly.edu",
  subject: "Data Structures & Algorithms",
  department: "Computer Science & Engineering",
  description: "Official class channel for DSA lectures, assignments, doubt solving, and notices.",
};

/**
 * Ensures default teacher code exists so students and teachers can test immediately.
 */
export async function seedDefaultTeacherCode(): Promise<void> {
  try {
    const docRef = doc(db, "teacherCodes", "TEACH-CSE-101");
    const snapshot = await getDoc(docRef);
    if (!snapshot.exists()) {
      await setDoc(docRef, {
        ...DEFAULT_TEACHER_CODE,
        updatedAt: serverTimestamp(),
      });
      console.log("Seeded default teacher code: TEACH-CSE-101 (pass: 123)");
    }
  } catch (err: any) {
    console.warn("Could not seed default teacher code:", err?.message);
  }
}

/**
 * Fetch a teacher code record by ID.
 */
export async function getTeacherCode(teacherId: string): Promise<TeacherCode | null> {
  const normalized = teacherId.trim().toUpperCase();
  try {
    const docRef = doc(db, "teacherCodes", normalized);
    const snapshot = await getDoc(docRef);
    if (snapshot.exists()) {
      return { id: snapshot.id, ...snapshot.data() } as TeacherCode;
    }

    // Fallback: search by teacherId field case-insensitively
    const q = query(collection(db, "teacherCodes"));
    const all = await getDocs(q);
    for (const docItem of all.docs) {
      const data = docItem.data();
      if (String(data.teacherId || "").trim().toUpperCase() === normalized) {
        return { id: docItem.id, ...data } as TeacherCode;
      }
    }
  } catch (err: any) {
    console.warn("getTeacherCode error:", err?.message);
  }
  return null;
}

/**
 * Teacher updates their unique ID and Password in Firebase.
 */
export async function updateTeacherCode(
  teacherUid: string,
  data: {
    teacherId: string;
    password: string;
    teacherName: string;
    subject: string;
    department?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const normalizedId = data.teacherId.trim().toUpperCase();
    if (!normalizedId) return { success: false, error: "Teacher ID cannot be empty." };
    if (!data.password.trim()) return { success: false, error: "Password cannot be empty." };

    const docRef = doc(db, "teacherCodes", normalizedId);
    await setDoc(
      docRef,
      {
        teacherId: normalizedId,
        password: data.password.trim(),
        teacherName: data.teacherName.trim() || "Professor",
        subject: data.subject.trim() || "General Academic",
        department: data.department || "Academic Department",
        teacherUid,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Also update user's own profile doc with teacher credentials
    await setDoc(
      doc(db, "users", teacherUid),
      {
        isTeacher: true,
        teacherId: normalizedId,
        teacherPassword: data.password.trim(),
        teacherSubject: data.subject.trim(),
      },
      { merge: true }
    );

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to update teacher code." };
  }
}

/**
 * Student connects to teacher by entering Teacher ID and Password.
 */
export async function connectStudentToTeacher(
  studentUid: string,
  studentName: string,
  studentEmail: string,
  enteredId: string,
  enteredPassword: string
): Promise<{ success: boolean; teacher?: TeacherCode; error?: string }> {
  try {
    const normalizedId = enteredId.trim().toUpperCase();
    const cleanPassword = enteredPassword.trim();

    if (!normalizedId || !cleanPassword) {
      return { success: false, error: "Please enter both Teacher ID and Password." };
    }

    // Auto-seed default code if needed
    await seedDefaultTeacherCode();

    const teacher = await getTeacherCode(normalizedId);
    if (!teacher) {
      return {
        success: false,
        error: `Teacher ID "${enteredId}" not found. Please verify with your professor.`,
      };
    }

    if (String(teacher.password).trim() !== cleanPassword) {
      return {
        success: false,
        error: "Incorrect Password for this Teacher ID. Please check and try again.",
      };
    }

    // Connect student in user's profile
    const userRef = doc(db, "users", studentUid);
    const userSnap = await getDoc(userRef);
    const existing = (userSnap.data()?.connectedTeachers as ConnectedTeacherInfo[]) || [];

    // Avoid duplicates
    const filtered = existing.filter(
      (t) => t.teacherId.toUpperCase() !== normalizedId
    );

    const newConnection: ConnectedTeacherInfo = {
      teacherId: normalizedId,
      teacherName: teacher.teacherName,
      subject: teacher.subject,
      department: teacher.department,
      connectedAt: new Date().toISOString(),
    };

    filtered.push(newConnection);

    const connectedTeacherIds = filtered.map((t) => t.teacherId.toUpperCase());

    await setDoc(
      userRef,
      {
        connectedTeachers: filtered,
        connectedTeacherIds,
      },
      { merge: true }
    );

    // Get full student details from user profile
    const uData = userSnap.data() || {};
    const sRollNo = uData.rollNo || "23CSE001";
    const sDept = uData.department || "Computer Science & Engineering";
    const sSec = uData.section || "A";
    const sName = uData.fullName || studentName || "Student";
    const sEmail = studentEmail || uData.email || "";

    // Register student under teacher's collection
    try {
      await setDoc(
        doc(db, "teacherCodes", normalizedId, "students", studentUid),
        {
          studentUid,
          studentName: sName,
          studentEmail: sEmail,
          rollNo: sRollNo,
          department: sDept,
          section: sSec,
          connectedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Also record in central teacherConnections collection
      await setDoc(
        doc(db, "teacherConnections", `${normalizedId}_${studentUid}`),
        {
          teacherId: normalizedId,
          teacherName: teacher.teacherName,
          studentUid,
          studentName: sName,
          studentEmail: sEmail,
          rollNo: sRollNo,
          department: sDept,
          section: sSec,
          connectedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (subErr) {
      console.warn("Could not write to teacher students subcollection:", subErr);
    }

    return { success: true, teacher };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to connect to teacher." };
  }
}

/**
 * Disconnect a student from a teacher.
 */
export async function disconnectStudentFromTeacher(
  studentUid: string,
  teacherId: string
): Promise<boolean> {
  try {
    const normalizedId = teacherId.trim().toUpperCase();
    const userRef = doc(db, "users", studentUid);
    const userSnap = await getDoc(userRef);
    if (!userSnap.exists()) return true;

    const existing = (userSnap.data()?.connectedTeachers as ConnectedTeacherInfo[]) || [];
    const updated = existing.filter((t) => t.teacherId.toUpperCase() !== normalizedId);
    const connectedTeacherIds = updated.map((t) => t.teacherId.toUpperCase());

    await updateDoc(userRef, {
      connectedTeachers: updated,
      connectedTeacherIds,
    });

    try {
      await deleteDoc(doc(db, "teacherCodes", normalizedId, "students", studentUid));
    } catch {}

    return true;
  } catch (err) {
    console.warn("disconnect error:", err);
    return false;
  }
}

/**
 * Send message between teacher, student or campus-wide hub (supports text, emojis, photoUrl, pdfUrl).
 */
export async function sendTeacherStudentMessage(
  chatId: string,
  senderId: string,
  senderName: string,
  senderRole: "student" | "teacher" | "admin",
  text: string,
  photoUrl?: string,
  pdfUrl?: string,
  pdfName?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanText = text.trim();
    if (!cleanText && !photoUrl && !pdfUrl) {
      return { success: false, error: "Cannot send empty message." };
    }

    const messagesRef = collection(db, "teacherStudentChats", chatId, "messages");
    await addDoc(messagesRef, {
      senderId,
      senderName,
      senderRole,
      text: cleanText,
      photoUrl: photoUrl || "",
      pdfUrl: pdfUrl || "",
      pdfName: pdfName || "",
      createdAt: serverTimestamp(),
    });

    // Update chat metadata
    await setDoc(
      doc(db, "teacherStudentChats", chatId),
      {
        lastMessage: cleanText || (photoUrl ? "📷 Photo" : pdfUrl ? `📄 ${pdfName || "PDF Document"}` : ""),
        lastSenderName: senderName,
        lastUpdatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to send message." };
  }
}

export interface CampusFacultyMember {
  id: string;
  name: string;
  designation: string;
  department: string;
  subject: string;
  avatarColor: string;
  online: boolean;
}

export interface CampusStudentPeer {
  id: string;
  name: string;
  rollNo: string;
  department: string;
  year: string;
  avatarColor: string;
  online: boolean;
}

export const CAMPUS_FACULTY_LIST: CampusFacultyMember[] = [
  {
    id: "TEACH-CSE-101",
    name: "Prof. Ganesh Sharma",
    designation: "Head of Dept & Senior Professor",
    department: "Computer Science & Eng",
    subject: "Data Structures & Algorithms",
    avatarColor: "#6366F1",
    online: true,
  },
  {
    id: "TEACH-CSE-102",
    name: "Dr. S. Ramesh",
    designation: "Associate Professor",
    department: "Computer Science & Eng",
    subject: "Operating Systems & Systems Arch",
    avatarColor: "#2563EB",
    online: true,
  },
  {
    id: "TEACH-CSE-103",
    name: "Prof. L. Prasad",
    designation: "Assistant Professor",
    department: "Information Technology",
    subject: "Database Management Systems & SQL",
    avatarColor: "#059669",
    online: false,
  },
  {
    id: "TEACH-CSE-104",
    name: "Dr. K. Sushma",
    designation: "Professor",
    department: "Computer Science & Eng",
    subject: "Computer Networks & Security",
    avatarColor: "#D97706",
    online: true,
  },
  {
    id: "TEACH-CSE-105",
    name: "Prof. A. Venkatesh",
    designation: "Assistant Professor",
    department: "AI & Data Science",
    subject: "Machine Learning & Python",
    avatarColor: "#9333EA",
    online: true,
  },
];

export const CAMPUS_STUDENTS_LIST: CampusStudentPeer[] = [
  {
    id: "STUDENT-CSE-001",
    name: "Aarav Patel",
    rollNo: "23CSE001",
    department: "CSE - 3rd Year",
    year: "Semester 6",
    avatarColor: "#3B82F6",
    online: true,
  },
  {
    id: "STUDENT-CSE-002",
    name: "Priya Sharma",
    rollNo: "23CSE015",
    department: "CSE - 3rd Year",
    year: "Semester 6",
    avatarColor: "#EC4899",
    online: true,
  },
  {
    id: "STUDENT-CSE-003",
    name: "Rohan Gupta",
    rollNo: "23CSE042",
    department: "CSE - 3rd Year",
    year: "Semester 6",
    avatarColor: "#10B981",
    online: false,
  },
  {
    id: "STUDENT-CSE-004",
    name: "Sneha Reddy",
    rollNo: "23CSE089",
    department: "CSE - 3rd Year",
    year: "Semester 6",
    avatarColor: "#F59E0B",
    online: true,
  },
  {
    id: "STUDENT-CSE-005",
    name: "Arjun Mehta",
    rollNo: "23CSE112",
    department: "CSE - 3rd Year",
    year: "Semester 6",
    avatarColor: "#8B5CF6",
    online: true,
  },
  {
    id: "STUDENT-CSE-006",
    name: "Ananya Singh",
    rollNo: "23CSE124",
    department: "CSE - 3rd Year",
    year: "Semester 6",
    avatarColor: "#06B6D4",
    online: false,
  },
];

/**
 * Seeds default community messages in the unified Campus All-Hands hub
 * so teachers and students have an immediate active hub with emojis, photos, and PDFs.
 */
export async function seedCampusCommunityChat(): Promise<void> {
  try {
    const hubRef = collection(db, "teacherStudentChats", "campus_community_hub", "messages");
    const snap = await getDocs(query(hubRef));
    if (snap.empty) {
      const now = Date.now();
      const initialSeed = [
        {
          senderId: "TEACH-CSE-101",
          senderName: "Prof. Ganesh Sharma",
          senderRole: "teacher",
          text: "Welcome to the Campusly Unified Hub! 🎓✨ Students and faculty can discuss questions, share lecture slides, and collaborate freely here. Feel free to ask doubts below! 💡📚",
          photoUrl: "",
          pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
          pdfName: "DSA_Master_Quick_Reference_Sheet.pdf",
          createdAt: new Date(now - 3600000 * 5),
        },
        {
          senderId: "STUDENT-CSE-001",
          senderName: "Aarav Patel",
          senderRole: "student",
          text: "Thank you Professor! Could you please clarify if Dijkstra's algorithm handles negative weight cycles? 🤔 Here is the graph from today's assignment.",
          photoUrl: "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=800&auto=format&fit=crop&q=80",
          pdfUrl: "",
          pdfName: "",
          createdAt: new Date(now - 3600000 * 3),
        },
        {
          senderId: "TEACH-CSE-102",
          senderName: "Dr. S. Ramesh",
          senderRole: "teacher",
          text: "Good question Aarav! 👍 Dijkstra assumes all edge weights are non-negative. For negative weights, you should use the Bellman-Ford algorithm instead. 🚀💯",
          photoUrl: "",
          pdfUrl: "",
          pdfName: "",
          createdAt: new Date(now - 3600000 * 2),
        },
        {
          senderId: "STUDENT-CSE-002",
          senderName: "Priya Sharma",
          senderRole: "student",
          text: "That makes complete sense! Thank you professors! 🙏✨ Attaching my lab notes for everyone in CSE 3rd year.",
          photoUrl: "",
          pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
          pdfName: "Algorithms_Lab_Unit3_Notes.pdf",
          createdAt: new Date(now - 3600000),
        },
      ];

      for (const msg of initialSeed) {
        await addDoc(hubRef, msg);
      }

      await setDoc(
        doc(db, "teacherStudentChats", "campus_community_hub"),
        {
          lastMessage: "Priya Sharma: That makes complete sense! 🙏",
          lastSenderName: "Priya Sharma",
          lastUpdatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  } catch (err: any) {
    console.warn("seedCampusCommunityChat warning:", err?.message);
  }
}

// =====================================================
// ATTENDANCE SYNC & CONNECTED STUDENTS FOR ATTENDANCE
// =====================================================

export interface AttendanceSyncRecord {
  studentUid: string;
  studentName: string;
  rollNo: string;
  subject: string;
  department: string;
  section: string;
  date: string;
  status: "Present" | "Absent" | "Late";
  remarks: string;
  markedBy: string;
  markedByRole?: "teacher" | "admin";
}

export interface ConnectedStudentItem {
  id: string;
  studentUid: string;
  studentName: string;
  studentEmail: string;
  rollNo: string;
  department: string;
  section: string;
  connectedAt?: any;
}

/**
 * When attendance is taken or re-changed for a student by the teacher/admin:
 * 1. Writes or updates attendance session doc in 'attendance' collection (deterministic doc ID prevents duplicates)
 * 2. Directly updates the student's profile doc in 'users/{studentUid}'
 * 3. Updates 'users/{studentUid}/subjects/{subject}' for subject-wise attendance breakdown
 */
export async function syncAttendanceToStudentProfile(
  record: AttendanceSyncRecord
): Promise<void> {
  try {
    const isPresent = record.status === "Present";
    const safeStudentUid = record.studentUid || "unknown_student";
    const safeSubject = (record.subject || "General").replace(/[^a-zA-Z0-9]/g, "_");
    const safeDate = (record.date || "Recent").replace(/[^a-zA-Z0-9]/g, "_");
    const attendanceDocId = `${safeStudentUid}_${safeSubject}_${safeDate}`;

    // 1. Write or update deterministic session doc in 'attendance' collection
    const attendanceDocRef = doc(db, "attendance", attendanceDocId);
    await setDoc(
      attendanceDocRef,
      {
        studentId: record.studentUid,
        studentName: record.studentName,
        rollNo: record.rollNo,
        subject: record.subject,
        department: record.department || "CSE",
        section: record.section || "A",
        date: record.date,
        present: isPresent,
        status: record.status,
        remarks: record.remarks || "-",
        markedBy: record.markedBy || "Prof. Ganesh Sharma",
        markedByRole: record.markedByRole || "teacher",
        markedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // 2. Fetch all attendance records for this student to compute exact stats
    let totalClasses = 0;
    let classesAttended = 0;
    let sTotal = 0;
    let sAttended = 0;
    let sAbsent = 0;
    let sLate = 0;

    try {
      const q = query(
        collection(db, "attendance"),
        where("studentId", "==", record.studentUid)
      );
      const snap = await getDocs(q);

      if (!snap.empty) {
        totalClasses = snap.docs.length;
        snap.docs.forEach((d) => {
          const item = d.data();
          const p = item.present || item.status === "Present";
          if (p) classesAttended += 1;

          if (item.subject === record.subject) {
            sTotal += 1;
            if (p) sAttended += 1;
            if (item.status === "Absent") sAbsent += 1;
            if (item.status === "Late") sLate += 1;
          }
        });
      }
    } catch (e) {
      console.warn("Could not query student attendance aggregate:", e);
    }

    // Fallbacks if no other docs exist yet
    if (sTotal === 0) {
      sTotal = 1;
      sAttended = isPresent ? 1 : 0;
      sAbsent = record.status === "Absent" ? 1 : 0;
      sLate = record.status === "Late" ? 1 : 0;
    }
    if (totalClasses === 0) {
      totalClasses = 1;
      classesAttended = isPresent ? 1 : 0;
    }

    const calculatedPct = Math.round((classesAttended / totalClasses) * 100);
    const pctString = `${calculatedPct}%`;
    const subjectPct = Math.round((sAttended / sTotal) * 100);

    // 3. Directly update student's profile document
    const userRef = doc(db, "users", record.studentUid);
    await setDoc(
      userRef,
      {
        attendancePercentage: pctString,
        classesAttended,
        totalClasses,
        lastAttendanceStatus: record.status,
        lastAttendanceDate: record.date,
        lastAttendanceSubject: record.subject,
        lastAttendanceTeacher: record.markedBy || "Prof. Ganesh Sharma",
        lastAttendanceRemarks: record.remarks || "-",
        lastAttendanceUpdated: serverTimestamp(),
      },
      { merge: true }
    );

    // 4. Update student's subject-wise record
    try {
      const subjRef = doc(db, "users", record.studentUid, "subjects", record.subject);
      await setDoc(
        subjRef,
        {
          subjectName: record.subject,
          totalClasses: sTotal,
          attendedClasses: sAttended,
          absentClasses: sAbsent,
          lateClasses: sLate,
          attendancePercentage: `${subjectPct}%`,
          lastStatus: record.status,
          lastDate: record.date,
          lastMarkedBy: record.markedBy,
          lastMarkedByRole: record.markedByRole || "teacher",
          lastUpdated: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (subjErr) {
      console.warn("Subject attendance subdoc warning:", subjErr);
    }
  } catch (err: any) {
    console.warn("syncAttendanceToStudentProfile error:", err?.message);
  }
}

/**
 * Re-change a student's attendance for a specific subject and date.
 * Strictly enforced: Only Teachers and Administrators can perform this action.
 */
export async function rechangeStudentAttendance({
  studentUid,
  studentName,
  rollNo,
  subject,
  department,
  section,
  date,
  newStatus,
  remarks,
  markedBy,
  markedByRole,
  actorRole,
}: {
  studentUid: string;
  studentName: string;
  rollNo: string;
  subject: string;
  department?: string;
  section?: string;
  date: string;
  newStatus: "Present" | "Absent" | "Late";
  remarks?: string;
  markedBy: string;
  markedByRole: "teacher" | "admin";
  actorRole: "student" | "teacher" | "admin";
}): Promise<{ success: boolean; error?: string }> {
  if (actorRole !== "teacher" && actorRole !== "admin") {
    return {
      success: false,
      error: "Permission Denied: Only teachers and administrators can re-change student attendance. Students have read-only access.",
    };
  }

  try {
    await syncAttendanceToStudentProfile({
      studentUid,
      studentName,
      rollNo,
      subject,
      department: department || "CSE",
      section: section || "A",
      date,
      status: newStatus,
      remarks: remarks || `Re-changed to ${newStatus} by ${markedBy}`,
      markedBy,
      markedByRole,
    });
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || "Failed to re-change attendance." };
  }
}


/**
 * Realtime listener for students connected to a teacher.
 */
export function listenTeacherConnectedStudents(
  teacherId: string,
  callback: (students: ConnectedStudentItem[]) => void
): () => void {
  const normalizedId = teacherId.trim().toUpperCase();
  const studentsCol = collection(db, "teacherCodes", normalizedId, "students");

  return onSnapshot(
    studentsCol,
    (snap) => {
      const list: ConnectedStudentItem[] = snap.docs.map((docItem) => {
        const data = docItem.data();
        return {
          id: docItem.id,
          studentUid: data.studentUid || docItem.id,
          studentName: data.studentName || "Student",
          studentEmail: data.studentEmail || "",
          rollNo: data.rollNo || "23CSE001",
          department: data.department || "CSE",
          section: data.section || "A",
          connectedAt: data.connectedAt,
        };
      });
      callback(list);
    },
    (err) => console.warn("listenTeacherConnectedStudents error:", err?.message)
  );
}

/**
 * Seeds initial demo connected students for TEACH-CSE-101 if none exist.
 */
export async function seedDefaultConnectedStudents(): Promise<void> {
  try {
    const colRef = collection(db, "teacherCodes", "TEACH-CSE-101", "students");
    const snap = await getDocs(colRef);
    if (snap.empty) {
      const demoStudents = [
        {
          studentUid: "demo-st-1",
          studentName: "Aarav Sharma",
          studentEmail: "aarav.sharma@campusly.edu",
          rollNo: "CSE001",
          department: "CSE",
          section: "A",
        },
        {
          studentUid: "demo-st-2",
          studentName: "Sneha Reddy",
          studentEmail: "sneha.reddy@campusly.edu",
          rollNo: "CSE002",
          department: "CSE",
          section: "A",
        },
        {
          studentUid: "demo-st-3",
          studentName: "Rohit Kumar",
          studentEmail: "rohit.kumar@campusly.edu",
          rollNo: "CSE003",
          department: "CSE",
          section: "A",
        },
        {
          studentUid: "demo-st-4",
          studentName: "Priya Singh",
          studentEmail: "priya.singh@campusly.edu",
          rollNo: "CSE004",
          department: "CSE",
          section: "A",
        },
        {
          studentUid: "demo-st-5",
          studentName: "Karan Mehta",
          studentEmail: "karan.mehta@campusly.edu",
          rollNo: "CSE005",
          department: "CSE",
          section: "A",
        },
      ];

      for (const s of demoStudents) {
        await setDoc(doc(colRef, s.studentUid), {
          ...s,
          connectedAt: serverTimestamp(),
        });
      }
    }
  } catch (err: any) {
    console.warn("seedDefaultConnectedStudents warning:", err?.message);
  }
}

