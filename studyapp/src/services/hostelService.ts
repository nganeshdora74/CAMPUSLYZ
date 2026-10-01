import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  where,
} from "firebase/firestore";
import { db, auth } from "../firebase/config";
import { getApiUrl } from "../api";

export interface HostelBlock {
  id: string;
  name: string;
  type: string;
  floors: string;
  roomsCount: number;
  totalCapacity: number;
  occupied: number;
  vacant: number;
  chiefWarden: string;
  wardenPhone: string;
  securityName: string;
  securityPhone: string;
  imageUrl: string;
  status: string;
}

export interface HostelComplaint {
  id: string;
  title: string;
  description: string;
  category: string;
  location: string;
  blockId?: string;
  studentName: string;
  studentRollNo?: string;
  status: "Pending" | "In Progress" | "Resolved";
  priority: "High" | "Normal" | "Low" | "Urgent";
  assignedStaff?: string;
  createdAt?: any;
  timeAgo: string;
  source: "firestore" | "backend";
}

export interface HostelStudent {
  id: string;
  studentId: string;
  studentName: string;
  rollNo: string;
  department: string;
  year: string;
  blockId: string;
  blockName: string;
  floor: string;
  roomNo: string;
  bedNo: string;
  roomType: string;
  roomStrength: number;
  currentOccupants: number;
  guardianName?: string;
  guardianPhone?: string;
  phone?: string;
  status: "Active" | "Vacated" | "On Leave";
  attendance: Record<string, "Present" | "Absent" | "Leave" | "Late">;
}

export interface RoomStrengthInfo {
  roomNo: string;
  floor: string;
  blockId: string;
  roomStrength: number;
  occupiedBeds: number;
  vacantBeds: number;
  isFull: boolean;
  students: HostelStudent[];
}

export const DEFAULT_HOSTEL_BLOCKS: HostelBlock[] = [
  {
    id: "block-a",
    name: "Hostel Block A",
    type: "Boys Residence",
    floors: "Floors 1 to 4 • 120 Rooms",
    roomsCount: 120,
    totalCapacity: 900,
    occupied: 840,
    vacant: 60,
    chiefWarden: "Dr. K. Raman",
    wardenPhone: "+91 98765 43210",
    securityName: "Main Gate Security",
    securityPhone: "Ext. 104 / 105",
    imageUrl: "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400&auto=format&fit=crop&q=80",
    status: "Active",
  },
  {
    id: "block-b",
    name: "Hostel Block B",
    type: "Girls Residence",
    floors: "Floors 1 to 4 • 100 Rooms",
    roomsCount: 100,
    totalCapacity: 750,
    occupied: 690,
    vacant: 60,
    chiefWarden: "Dr. Sunita Sen",
    wardenPhone: "+91 98765 43211",
    securityName: "Block B Security Desk",
    securityPhone: "Ext. 201 / 202",
    imageUrl: "https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?w=400&auto=format&fit=crop&q=80",
    status: "Active",
  },
  {
    id: "block-c",
    name: "Hostel Block C",
    type: "Junior Boys Residence",
    floors: "Floors 1 to 3 • 80 Rooms",
    roomsCount: 80,
    totalCapacity: 600,
    occupied: 540,
    vacant: 60,
    chiefWarden: "Prof. A. K. Nayak",
    wardenPhone: "+91 98765 43212",
    securityName: "North Wing Security Desk",
    securityPhone: "Ext. 301 / 302",
    imageUrl: "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=400&auto=format&fit=crop&q=80",
    status: "Active",
  },
];

export const SEED_HOSTEL_COMPLAINTS: Omit<HostelComplaint, "id">[] = [
  {
    title: "Block B - Geyser Heating Issue",
    description: "Geyser on 2nd floor bathroom not heating properly during morning hours.",
    category: "Water",
    location: "Room 204 • Reported yesterday",
    blockId: "block-b",
    studentName: "Rahul Sharma",
    studentRollNo: "23CSE045",
    status: "In Progress",
    priority: "High",
    assignedStaff: "Maintenance Team",
    timeAgo: "Reported yesterday",
    source: "firestore",
  },
  {
    title: "3rd Floor Wi-Fi Router Downtime",
    description: "Wi-Fi access point AP-03 has frequent packet drops and intermittent disconnections.",
    category: "Wi-Fi",
    location: "IT Department notified",
    blockId: "block-a",
    studentName: "Siddharth Verma",
    studentRollNo: "23ECE012",
    status: "In Progress",
    priority: "High",
    assignedStaff: "IT Department",
    timeAgo: "2 hours ago",
    source: "firestore",
  },
  {
    title: "Room 108 Light Fixture Sparking",
    description: "Tube light in room 108 flickering and humming loudly.",
    category: "Electricity",
    location: "Room 108",
    blockId: "block-a",
    studentName: "Aman Gupta",
    studentRollNo: "23MECH023",
    status: "Pending",
    priority: "High",
    assignedStaff: "Electrician Team",
    timeAgo: "3 hours ago",
    source: "firestore",
  },
  {
    title: "Block A 4th Floor Corridor Cleaning",
    description: "Daily sweeping and waste clearance required near room 412.",
    category: "Cleaning",
    location: "Floor 4 Corridor",
    blockId: "block-a",
    studentName: "Karan Patel",
    studentRollNo: "23CIV034",
    status: "Resolved",
    priority: "Normal",
    assignedStaff: "Housekeeping",
    timeAgo: "Resolved today",
    source: "firestore",
  },
];

// Helper to format ISO date YYYY-MM-DD
export function getIsoDate(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Generate past 7 days for the Day-wise Attendance bar
export function getRecentDates(daysCount = 7): {
  dateStr: string;
  dayLabel: string;
  shortDate: string;
  isToday: boolean;
}[] {
  const list = [];
  const today = new Date();
  for (let i = daysCount - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = getIsoDate(d);
    const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });
    const shortDate = d.toLocaleDateString("en-US", { day: "numeric", month: "short" });
    list.push({
      dateStr,
      dayLabel,
      shortDate,
      isToday: i === 0,
    });
  }
  return list;
}

// Initial seed hostel residents
export const SEED_HOSTEL_STUDENTS: Omit<HostelStudent, "id">[] = [
  // Block A - Room A-101 (Floor 1, Strength 2)
  {
    studentId: "st-cse-045",
    studentName: "Rahul Sharma",
    rollNo: "23CSE045",
    department: "Computer Science",
    year: "3rd Year",
    blockId: "block-a",
    blockName: "Hostel Block A",
    floor: "1st Floor",
    roomNo: "A-101",
    bedNo: "Bed 01",
    roomType: "Double Sharing (AC)",
    roomStrength: 2,
    currentOccupants: 2,
    guardianName: "Rajesh Sharma",
    guardianPhone: "+91 98765 00001",
    phone: "+91 98765 10001",
    status: "Active",
    attendance: {
      [getIsoDate(new Date())]: "Present",
      [getIsoDate(new Date(Date.now() - 86400000))]: "Present",
      [getIsoDate(new Date(Date.now() - 86400000 * 2))]: "Present",
      [getIsoDate(new Date(Date.now() - 86400000 * 3))]: "Leave",
      [getIsoDate(new Date(Date.now() - 86400000 * 4))]: "Present",
    },
  },
  {
    studentId: "st-cse-046",
    studentName: "Amit Kumar",
    rollNo: "23CSE046",
    department: "Computer Science",
    year: "3rd Year",
    blockId: "block-a",
    blockName: "Hostel Block A",
    floor: "1st Floor",
    roomNo: "A-101",
    bedNo: "Bed 02",
    roomType: "Double Sharing (AC)",
    roomStrength: 2,
    currentOccupants: 2,
    guardianName: "Sunil Kumar",
    guardianPhone: "+91 98765 00002",
    phone: "+91 98765 10002",
    status: "Active",
    attendance: {
      [getIsoDate(new Date())]: "Present",
      [getIsoDate(new Date(Date.now() - 86400000))]: "Present",
      [getIsoDate(new Date(Date.now() - 86400000 * 2))]: "Absent",
      [getIsoDate(new Date(Date.now() - 86400000 * 3))]: "Present",
      [getIsoDate(new Date(Date.now() - 86400000 * 4))]: "Present",
    },
  },

  // Block A - Room A-102 (Floor 1, Strength 2, 1 Vacant)
  {
    studentId: "st-ece-012",
    studentName: "Siddharth Verma",
    rollNo: "23ECE012",
    department: "Electronics & Comm.",
    year: "3rd Year",
    blockId: "block-a",
    blockName: "Hostel Block A",
    floor: "1st Floor",
    roomNo: "A-102",
    bedNo: "Bed 01",
    roomType: "Double Sharing (AC)",
    roomStrength: 2,
    currentOccupants: 1,
    guardianName: "Manoj Verma",
    guardianPhone: "+91 98765 00003",
    phone: "+91 98765 10003",
    status: "Active",
    attendance: {
      [getIsoDate(new Date())]: "Present",
      [getIsoDate(new Date(Date.now() - 86400000))]: "Present",
      [getIsoDate(new Date(Date.now() - 86400000 * 2))]: "Present",
      [getIsoDate(new Date(Date.now() - 86400000 * 3))]: "Present",
      [getIsoDate(new Date(Date.now() - 86400000 * 4))]: "Present",
    },
  },

  // Block A - Room A-201 (Floor 2, Strength 3, Full)
  {
    studentId: "st-mech-023",
    studentName: "Aman Gupta",
    rollNo: "23MECH023",
    department: "Mechanical Engg.",
    year: "2nd Year",
    blockId: "block-a",
    blockName: "Hostel Block A",
    floor: "2nd Floor",
    roomNo: "A-201",
    bedNo: "Bed 01",
    roomType: "Triple Sharing",
    roomStrength: 3,
    currentOccupants: 3,
    guardianName: "Pradeep Gupta",
    guardianPhone: "+91 98765 00004",
    phone: "+91 98765 10004",
    status: "Active",
    attendance: {
      [getIsoDate(new Date())]: "Present",
      [getIsoDate(new Date(Date.now() - 86400000))]: "Absent",
      [getIsoDate(new Date(Date.now() - 86400000 * 2))]: "Present",
      [getIsoDate(new Date(Date.now() - 86400000 * 3))]: "Present",
      [getIsoDate(new Date(Date.now() - 86400000 * 4))]: "Present",
    },
  },
  {
    studentId: "st-civ-034",
    studentName: "Karan Patel",
    rollNo: "23CIV034",
    department: "Civil Engineering",
    year: "2nd Year",
    blockId: "block-a",
    blockName: "Hostel Block A",
    floor: "2nd Floor",
    roomNo: "A-201",
    bedNo: "Bed 02",
    roomType: "Triple Sharing",
    roomStrength: 3,
    currentOccupants: 3,
    guardianName: "Jignesh Patel",
    guardianPhone: "+91 98765 00005",
    phone: "+91 98765 10005",
    status: "Active",
    attendance: {
      [getIsoDate(new Date())]: "Present",
      [getIsoDate(new Date(Date.now() - 86400000))]: "Present",
      [getIsoDate(new Date(Date.now() - 86400000 * 2))]: "Present",
      [getIsoDate(new Date(Date.now() - 86400000 * 3))]: "Present",
      [getIsoDate(new Date(Date.now() - 86400000 * 4))]: "Present",
    },
  },
  {
    studentId: "st-ee-019",
    studentName: "Rohan Das",
    rollNo: "23EE019",
    department: "Electrical Engg.",
    year: "2nd Year",
    blockId: "block-a",
    blockName: "Hostel Block A",
    floor: "2nd Floor",
    roomNo: "A-201",
    bedNo: "Bed 03",
    roomType: "Triple Sharing",
    roomStrength: 3,
    currentOccupants: 3,
    guardianName: "Subhas Das",
    guardianPhone: "+91 98765 00006",
    phone: "+91 98765 10006",
    status: "Active",
    attendance: {
      [getIsoDate(new Date())]: "Absent",
      [getIsoDate(new Date(Date.now() - 86400000))]: "Present",
      [getIsoDate(new Date(Date.now() - 86400000 * 2))]: "Present",
      [getIsoDate(new Date(Date.now() - 86400000 * 3))]: "Leave",
      [getIsoDate(new Date(Date.now() - 86400000 * 4))]: "Present",
    },
  },

  // Block A - Room A-204 (Floor 2, Strength 2, Full)
  {
    studentId: "st-cse-102",
    studentName: "Bikram Jena",
    rollNo: "23CSE102",
    department: "Computer Science",
    year: "4th Year",
    blockId: "block-a",
    blockName: "Hostel Block A",
    floor: "2nd Floor",
    roomNo: "A-204",
    bedNo: "Bed 01",
    roomType: "Double Sharing (AC)",
    roomStrength: 2,
    currentOccupants: 2,
    guardianName: "Pradipta Jena",
    guardianPhone: "+91 98765 00007",
    phone: "+91 98765 10007",
    status: "Active",
    attendance: {
      [getIsoDate(new Date())]: "Present",
      [getIsoDate(new Date(Date.now() - 86400000))]: "Present",
      [getIsoDate(new Date(Date.now() - 86400000 * 2))]: "Present",
      [getIsoDate(new Date(Date.now() - 86400000 * 3))]: "Present",
      [getIsoDate(new Date(Date.now() - 86400000 * 4))]: "Present",
    },
  },
  {
    studentId: "st-cse-108",
    studentName: "Sourav Mohanty",
    rollNo: "23CSE108",
    department: "Computer Science",
    year: "4th Year",
    blockId: "block-a",
    blockName: "Hostel Block A",
    floor: "2nd Floor",
    roomNo: "A-204",
    bedNo: "Bed 02",
    roomType: "Double Sharing (AC)",
    roomStrength: 2,
    currentOccupants: 2,
    guardianName: "Ashok Mohanty",
    guardianPhone: "+91 98765 00008",
    phone: "+91 98765 10008",
    status: "Active",
    attendance: {
      [getIsoDate(new Date())]: "Present",
      [getIsoDate(new Date(Date.now() - 86400000))]: "Present",
      [getIsoDate(new Date(Date.now() - 86400000 * 2))]: "Leave",
      [getIsoDate(new Date(Date.now() - 86400000 * 3))]: "Present",
      [getIsoDate(new Date(Date.now() - 86400000 * 4))]: "Present",
    },
  },

  // Block B - Room B-101 (Girls Block, Floor 1, Strength 2)
  {
    studentId: "st-cse-088",
    studentName: "Ananya Roy",
    rollNo: "23CSE088",
    department: "Computer Science",
    year: "3rd Year",
    blockId: "block-b",
    blockName: "Hostel Block B",
    floor: "1st Floor",
    roomNo: "B-101",
    bedNo: "Bed 01",
    roomType: "Double Sharing (AC)",
    roomStrength: 2,
    currentOccupants: 2,
    guardianName: "Debashis Roy",
    guardianPhone: "+91 98765 00009",
    phone: "+91 98765 10009",
    status: "Active",
    attendance: {
      [getIsoDate(new Date())]: "Present",
      [getIsoDate(new Date(Date.now() - 86400000))]: "Present",
      [getIsoDate(new Date(Date.now() - 86400000 * 2))]: "Present",
      [getIsoDate(new Date(Date.now() - 86400000 * 3))]: "Present",
      [getIsoDate(new Date(Date.now() - 86400000 * 4))]: "Present",
    },
  },
  {
    studentId: "st-cse-089",
    studentName: "Sneha Mohapatra",
    rollNo: "23CSE089",
    department: "Computer Science",
    year: "3rd Year",
    blockId: "block-b",
    blockName: "Hostel Block B",
    floor: "1st Floor",
    roomNo: "B-101",
    bedNo: "Bed 02",
    roomType: "Double Sharing (AC)",
    roomStrength: 2,
    currentOccupants: 2,
    guardianName: "Bijay Mohapatra",
    guardianPhone: "+91 98765 00010",
    phone: "+91 98765 10010",
    status: "Active",
    attendance: {
      [getIsoDate(new Date())]: "Leave",
      [getIsoDate(new Date(Date.now() - 86400000))]: "Leave",
      [getIsoDate(new Date(Date.now() - 86400000 * 2))]: "Present",
      [getIsoDate(new Date(Date.now() - 86400000 * 3))]: "Present",
      [getIsoDate(new Date(Date.now() - 86400000 * 4))]: "Present",
    },
  },

  // Block C - Room C-101 (Junior Boys, Floor 1, Strength 2)
  {
    studentId: "st-cse-2405",
    studentName: "Ayush Tripathy",
    rollNo: "24CSE005",
    department: "Computer Science",
    year: "1st Year",
    blockId: "block-c",
    blockName: "Hostel Block C",
    floor: "1st Floor",
    roomNo: "C-101",
    bedNo: "Bed 01",
    roomType: "Double Sharing",
    roomStrength: 2,
    currentOccupants: 2,
    guardianName: "Sanat Tripathy",
    guardianPhone: "+91 98765 00011",
    phone: "+91 98765 10011",
    status: "Active",
    attendance: {
      [getIsoDate(new Date())]: "Present",
      [getIsoDate(new Date(Date.now() - 86400000))]: "Present",
      [getIsoDate(new Date(Date.now() - 86400000 * 2))]: "Present",
      [getIsoDate(new Date(Date.now() - 86400000 * 3))]: "Present",
      [getIsoDate(new Date(Date.now() - 86400000 * 4))]: "Present",
    },
  },
  {
    studentId: "st-cse-2406",
    studentName: "Harsh Vardhan",
    rollNo: "24CSE006",
    department: "Computer Science",
    year: "1st Year",
    blockId: "block-c",
    blockName: "Hostel Block C",
    floor: "1st Floor",
    roomNo: "C-101",
    bedNo: "Bed 02",
    roomType: "Double Sharing",
    roomStrength: 2,
    currentOccupants: 2,
    guardianName: "Vinod Vardhan",
    guardianPhone: "+91 98765 00012",
    phone: "+91 98765 10012",
    status: "Active",
    attendance: {
      [getIsoDate(new Date())]: "Present",
      [getIsoDate(new Date(Date.now() - 86400000))]: "Present",
      [getIsoDate(new Date(Date.now() - 86400000 * 2))]: "Present",
      [getIsoDate(new Date(Date.now() - 86400000 * 3))]: "Present",
      [getIsoDate(new Date(Date.now() - 86400000 * 4))]: "Present",
    },
  },
];

/**
 * Format relative time
 */
export function formatTimeAgo(timestamp: any): string {
  if (!timestamp) return "Recently";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  if (isNaN(date.getTime())) return "Recently";

  const diffMs = Date.now() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? "s" : ""} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays === 1) return "Reported yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

/**
 * Listen to real-time hostel blocks in Firestore
 */
export function listenHostelBlocks(onUpdate: (blocks: HostelBlock[]) => void): () => void {
  const colRef = collection(db, "hostels");

  const unsubscribe = onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        try {
          for (const b of DEFAULT_HOSTEL_BLOCKS) {
            await setDoc(doc(db, "hostels", b.id), {
              ...b,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        } catch (e) {
          console.warn("Error seeding default hostel blocks:", e);
        }
        onUpdate(DEFAULT_HOSTEL_BLOCKS);
        return;
      }

      const list: HostelBlock[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          name: data.name || "Hostel Block",
          type: data.type || "Residence",
          floors: data.floors || "Floors 1 to 4 • 120 Rooms",
          roomsCount: data.roomsCount || 120,
          totalCapacity: data.totalCapacity || 900,
          occupied: data.occupied || 840,
          vacant: (data.totalCapacity || 900) - (data.occupied || 840),
          chiefWarden: data.chiefWarden || data.warden || "Dr. K. Raman",
          wardenPhone: data.wardenPhone || data.contact || "+91 98765 43210",
          securityName: data.securityName || "Main Gate Security",
          securityPhone: data.securityPhone || "Ext. 104 / 105",
          imageUrl: data.imageUrl || "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400&auto=format&fit=crop&q=80",
          status: data.status || "Active",
        });
      });

      list.sort((a, b) => a.id.localeCompare(b.id));
      onUpdate(list);
    },
    (err) => {
      console.warn("Hostel blocks listener error:", err);
      onUpdate(DEFAULT_HOSTEL_BLOCKS);
    }
  );

  return unsubscribe;
}

/**
 * Save / Update a Hostel Block
 */
export async function updateHostelBlock(block: Partial<HostelBlock> & { id: string }): Promise<void> {
  const vacant = (block.totalCapacity ?? 900) - (block.occupied ?? 840);
  await setDoc(
    doc(db, "hostels", block.id),
    {
      ...block,
      vacant: Math.max(0, vacant),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

/**
 * Listen to real-time hostel complaints from Firestore & Backend
 */
export function listenHostelComplaints(onUpdate: (complaints: HostelComplaint[]) => void): () => void {
  const complaintsCol = collection(db, "complaints");

  const unsubscribe = onSnapshot(
    complaintsCol,
    async (snapshot) => {
      if (snapshot.empty) {
        try {
          for (const c of SEED_HOSTEL_COMPLAINTS) {
            await addDoc(complaintsCol, {
              ...c,
              type: "Hostel",
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        } catch (e) {
          console.warn("Error seeding hostel complaints:", e);
        }
        return;
      }

      const list: HostelComplaint[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        const isHostel =
          data.type === "Hostel" ||
          data.category === "Hostel" ||
          data.category === "Water" ||
          data.category === "Wi-Fi" ||
          data.category === "Electricity" ||
          data.category === "Cleaning" ||
          data.category === "Maintenance" ||
          Boolean(data.roomNo) ||
          Boolean(data.blockId);

        if (isHostel) {
          const timeText = data.timeAgo || formatTimeAgo(data.createdAt);
          const location =
            data.location ||
            (data.roomNo ? `Room ${data.roomNo}` : "") ||
            "Hostel Premises";

          list.push({
            id: d.id,
            title: data.title || data.message || "Hostel Maintenance Issue",
            description: data.description || data.message || "",
            category: data.category || "Maintenance",
            location: location,
            blockId: data.blockId || "block-a",
            studentName: data.studentName || data.userEmail || "Resident Student",
            studentRollNo: data.studentRollNo || data.rollNo || "",
            status: (data.status as any) || "Pending",
            priority: (data.priority as any) || "High",
            assignedStaff: data.assignedStaff || data.assignedTo || "Maintenance Team",
            createdAt: data.createdAt,
            timeAgo: timeText,
            source: "firestore",
          });
        }
      });

      list.sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
        return timeB - timeA;
      });

      onUpdate(list.length > 0 ? list : SEED_HOSTEL_COMPLAINTS.map((c, i) => ({ ...c, id: `seed-${i}` })));
    },
    (err) => {
      console.warn("Hostel complaints listener error:", err);
      onUpdate(SEED_HOSTEL_COMPLAINTS.map((c, i) => ({ ...c, id: `seed-${i}` })));
    }
  );

  return unsubscribe;
}

/**
 * Register a new hostel inspection / complaint
 */
export async function createHostelComplaint(data: {
  title: string;
  description: string;
  category: string;
  location: string;
  blockId: string;
  priority: "High" | "Normal" | "Low" | "Urgent";
  assignedStaff: string;
  status: "Pending" | "In Progress" | "Resolved";
}): Promise<void> {
  await addDoc(collection(db, "complaints"), {
    ...data,
    type: "Hostel",
    studentName: "Admin / Hostel Warden",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await addDoc(collection(db, "requests"), {
    title: data.title,
    description: data.description,
    category: "Hostel",
    subCategory: data.category,
    location: data.location,
    priority: data.priority,
    status: data.status,
    assignedTo: data.assignedStaff,
    requesterName: "Admin / Hostel Warden",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await addDoc(collection(db, "activities"), {
    title: `Hostel Complaint: ${data.title}`,
    time: "Just now",
    user: "Admin",
    type: "hostel",
    createdAt: serverTimestamp(),
  });

  try {
    const baseUrl = getApiUrl();
    await fetch(`${baseUrl}/api/admin/complaints`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: data.title,
        description: data.description,
        category: "Hostel",
        location: data.location,
        status: data.status,
      }),
    }).catch(() => {});
  } catch (e) {}
}

/**
 * Update complaint status
 */
export async function updateHostelComplaintStatus(
  complaintId: string,
  newStatus: "Pending" | "In Progress" | "Resolved",
  assignedStaff?: string
): Promise<void> {
  if (complaintId.startsWith("seed-")) {
    return;
  }

  const payload: any = {
    status: newStatus,
    updatedAt: serverTimestamp(),
  };

  if (assignedStaff) {
    payload.assignedStaff = assignedStaff;
    payload.assignedTo = assignedStaff;
  }

  if (newStatus === "Resolved") {
    payload.resolvedDate = new Date().toISOString();
  }

  await updateDoc(doc(db, "complaints", complaintId), payload);

  try {
    const baseUrl = getApiUrl();
    await fetch(`${baseUrl}/api/admin/complaints/${complaintId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: newStatus }),
    }).catch(() => {});
  } catch (e) {}
}

/**
 * Listen to real-time hostel student residents
 */
export function listenHostelStudents(
  onUpdate: (students: HostelStudent[]) => void
): () => void {
  const colRef = collection(db, "hostel_students");

  const unsubscribe = onSnapshot(
    colRef,
    async (snapshot) => {
      if (snapshot.empty) {
        // Auto-seed default students across rooms
        try {
          for (const s of SEED_HOSTEL_STUDENTS) {
            await addDoc(colRef, {
              ...s,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        } catch (e) {
          console.warn("Error seeding hostel students:", e);
        }
        onUpdate(SEED_HOSTEL_STUDENTS.map((s, i) => ({ ...s, id: `seed-st-${i}` })));
        return;
      }

      const list: HostelStudent[] = [];
      snapshot.forEach((d) => {
        const data = d.data();
        list.push({
          id: d.id,
          studentId: data.studentId || d.id,
          studentName: data.studentName || "Hostel Resident",
          rollNo: data.rollNo || "23CSE000",
          department: data.department || "Computer Science",
          year: data.year || "3rd Year",
          blockId: data.blockId || "block-a",
          blockName: data.blockName || "Hostel Block A",
          floor: data.floor || "1st Floor",
          roomNo: data.roomNo || "A-101",
          bedNo: data.bedNo || "Bed 01",
          roomType: data.roomType || "Double Sharing",
          roomStrength: data.roomStrength || 2,
          currentOccupants: data.currentOccupants || 2,
          guardianName: data.guardianName || "",
          guardianPhone: data.guardianPhone || "",
          phone: data.phone || "",
          status: data.status || "Active",
          attendance: data.attendance || {},
        });
      });

      // Sort by room number, then bed number
      list.sort((a, b) => a.roomNo.localeCompare(b.roomNo) || a.bedNo.localeCompare(b.bedNo));
      onUpdate(list);
    },
    (err) => {
      console.warn("Hostel students listener error:", err);
      onUpdate(SEED_HOSTEL_STUDENTS.map((s, i) => ({ ...s, id: `seed-st-${i}` })));
    }
  );

  return unsubscribe;
}

/**
 * Update day-wise attendance for a student (Present, Absent, Leave, Late)
 */
export async function updateHostelStudentAttendance(
  studentDocId: string,
  dateStr: string,
  status: "Present" | "Absent" | "Leave" | "Late"
): Promise<void> {
  if (studentDocId.startsWith("seed-")) {
    return;
  }

  const docRef = doc(db, "hostel_students", studentDocId);
  await updateDoc(docRef, {
    [`attendance.${dateStr}`]: status,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Batch mark day-wise attendance for all students in a block
 */
export async function markBatchHostelAttendance(
  studentIds: string[],
  dateStr: string,
  status: "Present" | "Absent"
): Promise<void> {
  for (const id of studentIds) {
    if (!id.startsWith("seed-")) {
      const docRef = doc(db, "hostel_students", id);
      await updateDoc(docRef, {
        [`attendance.${dateStr}`]: status,
        updatedAt: serverTimestamp(),
      });
    }
  }
}

/**
 * Allocate / Add a student to a room in a hostel block
 */
export async function allocateHostelStudent(
  data: Omit<HostelStudent, "id">
): Promise<void> {
  await addDoc(collection(db, "hostel_students"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Also log activity
  await addDoc(collection(db, "activities"), {
    title: `Allocated ${data.studentName} to ${data.blockName} ${data.roomNo}`,
    time: "Just now",
    user: "Hostel Admin",
    type: "hostel",
    createdAt: serverTimestamp(),
  });
}

/**
 * Update student allocation
 */
export async function updateHostelStudent(
  studentDocId: string,
  data: Partial<HostelStudent>
): Promise<void> {
  if (studentDocId.startsWith("seed-")) return;
  const docRef = doc(db, "hostel_students", studentDocId);
  await updateDoc(docRef, {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Remove or vacate student from room
 */
export async function deleteHostelStudent(studentDocId: string): Promise<void> {
  if (studentDocId.startsWith("seed-")) return;
  await deleteDoc(doc(db, "hostel_students", studentDocId));
}
