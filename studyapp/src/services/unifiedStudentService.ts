import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase/config";
import hostelDataService from "./hostelDataService";
import messDataService from "./messDataService";
import notificationService from "./notificationService";

export interface UnifiedStudent {
  id: string;
  fullName: string;
  name: string;
  email: string;
  rollNo: string;
  department: string;
  semester: string;
  college?: string;
  phone?: string;
  role: "student";
  status: "active" | "blocked";
  isBlocked: boolean;
  // Hostel fields
  hostelStatus: "Enrolled" | "Unassigned";
  roomNo?: string;
  hostelBlock?: string;
  hostelAssignedAt?: string;
  hostelAssignedBy?: string;
  // Mess fields
  messStatus: "Active" | "Inactive";
  diet?: "Veg" | "Non-Veg" | "Jain";
  // Fee fields
  totalFee: number;
  paidFee: number;
  dueFee: number;
  feeStatus: "PAID" | "PENDING" | "OVERDUE";
  lastPaymentDate?: string;
  createdAt?: any;
}

// Default fallback student profiles to guarantee mock/testing data
const DEFAULT_STUDENTS: UnifiedStudent[] = [
  {
    id: "std-default-1",
    fullName: "Ganesh Sharma",
    name: "Ganesh Sharma",
    email: "ganesh.student@gmail.com",
    rollNo: "23CSE001",
    department: "CSE",
    semester: "4",
    college: "Campusly Institute of Tech",
    phone: "9876543210",
    role: "student",
    status: "active",
    isBlocked: false,
    hostelStatus: "Enrolled",
    roomNo: "101",
    hostelBlock: "Block A",
    messStatus: "Active",
    diet: "Veg",
    totalFee: 101000,
    paidFee: 72000,
    dueFee: 29000,
    feeStatus: "PENDING",
  },
  {
    id: "std-default-2",
    fullName: "Rahul Kumar",
    name: "Rahul Kumar",
    email: "rahul.k.student@campusly.edu",
    rollNo: "CS2101",
    department: "CSE",
    semester: "3",
    college: "Campusly Institute of Tech",
    phone: "9876543211",
    role: "student",
    status: "active",
    isBlocked: false,
    hostelStatus: "Enrolled",
    roomNo: "102",
    hostelBlock: "Block A",
    messStatus: "Active",
    diet: "Veg",
    totalFee: 101000,
    paidFee: 101000,
    dueFee: 0,
    feeStatus: "PAID",
  },
  {
    id: "std-default-3",
    fullName: "Ananya Verma",
    name: "Ananya Verma",
    email: "ananya.v.student@campusly.edu",
    rollNo: "CS2102",
    department: "CSE",
    semester: "3",
    college: "Campusly Institute of Tech",
    phone: "9876543212",
    role: "student",
    status: "active",
    isBlocked: false,
    hostelStatus: "Unassigned",
    roomNo: "",
    hostelBlock: "",
    messStatus: "Active",
    diet: "Veg",
    totalFee: 101000,
    paidFee: 101000,
    dueFee: 0,
    feeStatus: "PAID",
  },
  {
    id: "std-default-4",
    fullName: "Priya Singh",
    name: "Priya Singh",
    email: "priya.s.student@campusly.edu",
    rollNo: "CS2104",
    department: "ECE",
    semester: "3",
    college: "Campusly Institute of Tech",
    phone: "9876543213",
    role: "student",
    status: "active",
    isBlocked: false,
    hostelStatus: "Enrolled",
    roomNo: "104",
    hostelBlock: "Block B",
    messStatus: "Active",
    diet: "Veg",
    totalFee: 101000,
    paidFee: 40000,
    dueFee: 61000,
    feeStatus: "OVERDUE",
  },
  {
    id: "std-default-5",
    fullName: "Rohan Patel",
    name: "Rohan Patel",
    email: "rohan.p.student@campusly.edu",
    rollNo: "CS2103",
    department: "ME",
    semester: "3",
    college: "Campusly Institute of Tech",
    phone: "9876543214",
    role: "student",
    status: "active",
    isBlocked: false,
    hostelStatus: "Unassigned",
    roomNo: "",
    hostelBlock: "",
    messStatus: "Active",
    diet: "Non-Veg",
    totalFee: 101000,
    paidFee: 70000,
    dueFee: 31000,
    feeStatus: "PENDING",
  },
];

class UnifiedStudentService {
  private inMemoryStudents: UnifiedStudent[] = [...DEFAULT_STUDENTS];

  /**
   * Subscribes to the shared Firestore 'users' collection for students in real-time.
   * Seamlessly falls back to local cache/defaults if Firestore is temporarily offline.
   */
  subscribeStudents(callback: (students: UnifiedStudent[]) => void) {
    try {
      const q = query(collection(db, "users"));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const list: UnifiedStudent[] = [];

          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const role = (data.role || "").toLowerCase();

            if (role === "student") {
              const fullName = data.fullName || data.name || "Student";
              const totalFee = Number(data.totalFee ?? 101000);
              const paidFee = Number(data.paidFee ?? 0);
              const dueFee = Number(data.dueFee ?? Math.max(0, totalFee - paidFee));
              const isBlocked = !!data.isBlocked || data.status === "blocked";
              const roomNo = data.roomNo || "";
              const hostelStatus = data.hostelStatus || (roomNo ? "Enrolled" : "Unassigned");

              const studentItem: UnifiedStudent = {
                id: docSnap.id,
                fullName,
                name: fullName,
                email: data.email || "",
                rollNo: data.rollNo || "23CSE001",
                department: data.department || "CSE",
                semester: String(data.semester || "1"),
                college: data.college || "Campusly Institute of Tech",
                phone: data.phone || "9876543210",
                role: "student",
                status: isBlocked ? "blocked" : "active",
                isBlocked,
                hostelStatus,
                roomNo,
                hostelBlock: data.hostelBlock || (roomNo ? "Block A" : ""),
                hostelAssignedAt: data.hostelAssignedAt,
                hostelAssignedBy: data.hostelAssignedBy,
                messStatus: data.messStatus || "Active",
                diet: data.diet || "Veg",
                totalFee,
                paidFee,
                dueFee,
                feeStatus:
                  data.feeStatus || (dueFee === 0 ? "PAID" : paidFee > 0 ? "PENDING" : "OVERDUE"),
                lastPaymentDate: data.lastPaymentDate,
                createdAt: data.createdAt,
              };

              list.push(studentItem);

              // Auto-sync into Mess Manager service
              try {
                const messAtt = messDataService.getAttendance();
                if (!messAtt.some((m) => m.name.toLowerCase() === fullName.toLowerCase() || m.rollNo === studentItem.rollNo)) {
                  messDataService.addAttendanceStudent({
                    name: fullName,
                    rollNo: studentItem.rollNo,
                    room: roomNo || "Day Scholar",
                    breakfast: true,
                    lunch: true,
                    snacks: true,
                    dinner: true,
                    status: "Present",
                  });
                }
              } catch (_) {}

              // Auto-sync into Hostel Manager service if enrolled
              try {
                if (hostelStatus === "Enrolled" && roomNo) {
                  const residents = hostelDataService.getResidents();
                  if (!residents.some((r) => r.name.toLowerCase() === fullName.toLowerCase())) {
                    hostelDataService.addResident({
                      name: fullName,
                      studentId: studentItem.rollNo,
                      roomNo,
                      phone: studentItem.phone || "9876543210",
                      email: studentItem.email,
                      course: `B.Tech ${studentItem.department}`,
                      year: `${studentItem.semester} Sem`,
                      status: "Active",
                      checkInDate: "Active",
                    });
                  }
                }
              } catch (_) {}
            }
          });

          // Merge default seeds if Firestore is brand new
          DEFAULT_STUDENTS.forEach((def) => {
            if (!list.some((item) => item.rollNo === def.rollNo || item.email === def.email)) {
              list.push(def);
            }
          });

          // Sort alphabetically
          list.sort((a, b) => a.fullName.localeCompare(b.fullName));
          this.inMemoryStudents = list;
          callback(list);
        },
        (error: any) => {
          if (error?.code !== "permission-denied") {
            console.warn("UnifiedStudentService snapshot warning:", error);
          }
          callback(this.inMemoryStudents);
        }
      );

      return unsubscribe;
    } catch (err) {
      console.warn("UnifiedStudentService subscribe error:", err);
      callback(this.inMemoryStudents);
      return () => {};
    }
  }

  /**
   * Notice Manager action to enroll/add any student into Hostel Manager.
   * Updates Firestore and registers them in Hostel Manager room directory.
   */
  async addStudentToHostel(
    studentId: string,
    studentName: string,
    roomNo: string,
    block: string = "Block A"
  ): Promise<boolean> {
    try {
      // 1. Update student Firestore doc
      try {
        const studentRef = doc(db, "users", studentId);
        await updateDoc(studentRef, {
          hostelStatus: "Enrolled",
          roomNo,
          hostelBlock: block,
          hostelAssignedAt: new Date().toISOString(),
          hostelAssignedBy: "Notice Manager",
          updatedAt: serverTimestamp(),
        });

        // Also sync directly to student's hostel allocation subcollection for instant realtime reflection
        try {
          const allocRef = doc(db, "users", studentId, "hostel", "allocation");
          await setDoc(
            allocRef,
            {
              roomNo,
              blockName: block,
              status: "Active",
              updatedAt: serverTimestamp(),
            },
            { merge: true }
          );
        } catch (allocErr) {
          console.warn("Hostel allocation subcollection write error:", allocErr);
        }
      } catch (fsErr) {
        console.warn("Firestore updateDoc hostel status warning:", fsErr);
      }

      // 2. Allocate or register resident in Hostel Data Service
      hostelDataService.allocateRoom(studentName, roomNo);

      // 3. Update in-memory record
      const idx = this.inMemoryStudents.findIndex((s) => s.id === studentId || s.name === studentName);
      if (idx !== -1) {
        this.inMemoryStudents[idx].hostelStatus = "Enrolled";
        this.inMemoryStudents[idx].roomNo = roomNo;
        this.inMemoryStudents[idx].hostelBlock = block;
      }

      // 4. Send notification
      notificationService.notifyUser(
        "Hostel Room Allocated! 🏨",
        `Notice Manager has allocated Room ${roomNo} (${block}) to ${studentName}. Now active in Hostel Manager.`,
        "pass"
      );

      return true;
    } catch (error: any) {
      console.error("Failed to add student to hostel:", error);
      throw error;
    }
  }

  /**
   * Update student fee payment in Fee Manager.
   */
  async recordFeePayment(
    studentId: string,
    amount: number
  ): Promise<boolean> {
    try {
      const student = this.inMemoryStudents.find((s) => s.id === studentId);
      const newPaid = (student?.paidFee || 0) + amount;
      const total = student?.totalFee || 101000;
      const newDue = Math.max(0, total - newPaid);
      const newStatus = newDue === 0 ? "PAID" : "PENDING";

      try {
        const studentRef = doc(db, "users", studentId);
        await updateDoc(studentRef, {
          paidFee: newPaid,
          dueFee: newDue,
          feeStatus: newStatus,
          lastPaymentDate: new Date().toLocaleDateString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
          }),
          updatedAt: serverTimestamp(),
        });
      } catch (_) {}

      if (student) {
        student.paidFee = newPaid;
        student.dueFee = newDue;
        student.feeStatus = newStatus;
      }

      notificationService.notifyUser(
        "Fee Payment Recorded 💰",
        `Payment of ₹${amount.toLocaleString()} recorded for ${student?.fullName || "Student"}.`,
        "general"
      );

      return true;
    } catch (e: any) {
      console.error("Error recording fee payment:", e);
      throw e;
    }
  }

  getStudentsSnapshot(): UnifiedStudent[] {
    return [...this.inMemoryStudents];
  }
}

export const unifiedStudentService = new UnifiedStudentService();
export default unifiedStudentService;
