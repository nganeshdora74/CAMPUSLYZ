import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";

export interface AssignmentItem {
  id: string;
  title: string;
  subject: string;
  department: string;
  section: string;
  classTag: string;
  targetClass?: string;
  description: string;
  dueDate: string;
  dueTime?: string;
  pdfUrl?: string;
  pdfName?: string;
  pdfSize?: string;
  teacherName: string;
  teacherId?: string;
  teacherUid?: string;
  status: "Pending" | "Published" | "Under Review" | "Active" | "Closed" | "Evaluated";
  totalMarks?: number;
  totalPoints?: number;
  instructions?: string;
  teacherFeedback?: string;
  completedStudents?: string[]; // Array of student UIDs
  createdAt?: any;
  updatedAt?: any;
}

const INITIAL_STARTER_ASSIGNMENTS: Omit<AssignmentItem, "id">[] = [
  {
    title: "Binary Search Trees & AVL Balancing",
    subject: "Data Structures & Algorithms",
    department: "CSE",
    section: "A",
    classTag: "CSE - A",
    description:
      "Implement AVL tree rotations, self-balancing insertions, and write a detailed analysis comparing worst-case search complexity with standard BSTs.",
    dueDate: "20 Oct 2026",
    dueTime: "11:59 PM",
    pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    pdfName: "DSA_Unit3_Assignment_AVL_Trees.pdf",
    pdfSize: "1.4 MB",
    teacherName: "Prof. Priya Sharma",
    status: "Published",
    totalMarks: 20,
    instructions:
      "Submit well-commented source code and a brief PDF report. Hand-written derivations should be scanned clearly.",
    completedStudents: [],
  },
  {
    title: "SQL Schema Design & Normalization",
    subject: "Database Management Systems",
    department: "CSE",
    section: "B",
    classTag: "CSE - B",
    description:
      "Design an E-R diagram and 3NF relational schema for an Online Hospital Management System. Formulate complex queries with subqueries and inner/outer joins.",
    dueDate: "24 Oct 2026",
    dueTime: "05:00 PM",
    pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    pdfName: "DBMS_Schema_Design_Assignment.pdf",
    pdfSize: "2.1 MB",
    teacherName: "Dr. S. Ramesh",
    status: "Published",
    totalMarks: 25,
    instructions:
      "Include table DDL statements and sample test records. Verify that Boyce-Codd Normal Form holds.",
    completedStudents: [],
  },
  {
    title: "Process Scheduling & Deadlock Prevention",
    subject: "Operating Systems",
    department: "CSE",
    section: "A",
    classTag: "CSE - A",
    description:
      "Simulate Round-Robin and Shortest Job First CPU scheduling algorithms. Solve Banker's algorithm numerical problems to determine safety state.",
    dueDate: "28 Oct 2026",
    dueTime: "11:59 PM",
    pdfUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    pdfName: "OS_Process_Scheduling_Problems.pdf",
    pdfSize: "850 KB",
    teacherName: "Prof. Ananya Gupta",
    status: "Published",
    totalMarks: 15,
    instructions: "Attach Gantt charts and computation of average waiting & turnaround times.",
    completedStudents: [],
  },
];

/**
 * Subscribes to assignments collection in real-time.
 */
export function subscribeAssignments(
  callback: (list: AssignmentItem[]) => void
): () => void {
  const colRef = collection(db, "assignments");
  const q = query(colRef, orderBy("createdAt", "desc"));

  return onSnapshot(
    q,
    async (snap) => {
      if (snap.empty) {
        try {
          for (const item of INITIAL_STARTER_ASSIGNMENTS) {
            await addDoc(colRef, {
              ...item,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        } catch (e: any) {
          console.warn("Seeding initial assignments error:", e?.message);
        }
        return;
      }

      const list: AssignmentItem[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title || "Assignment",
          subject: data.subject || "Subject",
          department: data.department || "CSE",
          section: data.section || "A",
          classTag: data.classTag || `${data.department || "CSE"} - ${data.section || "A"}`,
          description: data.description || "",
          dueDate: data.dueDate || "30 Oct 2026",
          dueTime: data.dueTime || "11:59 PM",
          pdfUrl: data.pdfUrl || undefined,
          pdfName: data.pdfName || undefined,
          pdfSize: data.pdfSize || undefined,
          teacherName: data.teacherName || "Faculty",
          teacherId: data.teacherId || undefined,
          teacherUid: data.teacherUid || undefined,
          status: data.status || "Published",
          totalMarks: data.totalMarks || 20,
          instructions: data.instructions || "",
          completedStudents: Array.isArray(data.completedStudents) ? data.completedStudents : [],
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      });

      callback(list);
    },
    (err) => {
      console.warn("Assignments listener error:", err.message);
      callback(
        INITIAL_STARTER_ASSIGNMENTS.map((a, i) => ({
          ...a,
          id: `sample-asg-${i}`,
        }))
      );
    }
  );
}

/**
 * Creates a new assignment.
 */
export async function createAssignment(
  data: Omit<AssignmentItem, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const colRef = collection(db, "assignments");
  const docRef = await addDoc(colRef, {
    ...data,
    completedStudents: data.completedStudents || [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Updates an existing assignment (status, instructions, details).
 */
export async function updateAssignment(
  id: string,
  updates: Partial<AssignmentItem>
): Promise<void> {
  const docRef = doc(db, "assignments", id);
  const payload: Record<string, any> = {
    ...updates,
    updatedAt: serverTimestamp(),
  };
  delete payload.id;
  await updateDoc(docRef, payload);
}

/**
 * Deletes an assignment.
 */
export async function deleteAssignment(id: string): Promise<void> {
  const docRef = doc(db, "assignments", id);
  await deleteDoc(docRef);
}

/**
 * Toggles a student's completion/submission status for a given assignment.
 */
export async function toggleStudentAssignmentCompletion(
  assignmentId: string,
  studentUid: string,
  markComplete?: boolean
): Promise<void> {
  if (!assignmentId || !studentUid) return;
  const docRef = doc(db, "assignments", assignmentId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return;

  const currentList: string[] = snap.data().completedStudents || [];
  const currentlyCompleted = currentList.includes(studentUid);
  const shouldComplete = markComplete !== undefined ? markComplete : !currentlyCompleted;

  let updatedList: string[];

  if (shouldComplete) {
    if (!currentList.includes(studentUid)) {
      updatedList = [...currentList, studentUid];
    } else {
      updatedList = currentList;
    }
  } else {
    updatedList = currentList.filter((uid) => uid !== studentUid);
  }

  await updateDoc(docRef, {
    completedStudents: updatedList,
    updatedAt: serverTimestamp(),
  });
}
