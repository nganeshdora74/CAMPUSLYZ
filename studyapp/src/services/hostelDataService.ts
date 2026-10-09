import { auth, db } from "../firebase/config";
import {
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import notificationService from "./notificationService";
import { getApiUrl } from "../api";

export interface HostelRoom {
  id: string;
  roomNo: string;
  type: "Single" | "Double" | "Triple";
  capacity: number;
  status: "Available" | "Occupied" | "Maintenance";
  residents: string[];
  residentNames?: string;
  floor?: string;
  rent?: number;
}

export interface HostelResident {
  id: string;
  name: string;
  studentId: string;
  roomNo: string;
  phone: string;
  email?: string;
  course?: string;
  year?: string;
  status: "Active" | "Inactive";
  checkInDate: string;
  emergencyContact?: string;
}

export interface GatePassItem {
  id: string;
  studentName: string;
  studentId?: string;
  purpose: string;
  outTime: string;
  returnTime?: string;
  requestedAt: string;
  approvedAt?: string;
  status: "Pending" | "Approved" | "Rejected";
}

export interface HostelLeaveItem {
  id: string;
  studentName: string;
  studentId?: string;
  leaveType: "Medical" | "Personal" | "Family" | "Academic";
  fromDate: string;
  toDate: string;
  status: "Pending" | "Approved" | "Rejected";
  reason?: string;
}

export interface HostelComplaintItem {
  id: string;
  category: "Room Maintenance" | "Food Quality" | "Cleanliness" | "Security" | "Wi-Fi";
  description: string;
  date: string;
  status: "New" | "In Progress" | "Resolved";
  studentName?: string;
  roomNo?: string;
}

export interface HostelNoticeItem {
  id: string;
  title: string;
  message?: string;
  date: string;
  audience: string;
  status?: "Active" | "Archived";
}

// Initial default seed matching screenshot 1
const DEFAULT_ROOMS: HostelRoom[] = [
  { id: "r-101", roomNo: "101", type: "Single", capacity: 1, status: "Occupied", residents: ["Rohan Sharma"], residentNames: "Rohan Sharma", floor: "1st Floor", rent: 5000 },
  { id: "r-102", roomNo: "102", type: "Single", capacity: 1, status: "Occupied", residents: ["Amit Kumar"], residentNames: "Amit Kumar", floor: "1st Floor", rent: 5000 },
  { id: "r-103", roomNo: "103", type: "Single", capacity: 1, status: "Available", residents: [], residentNames: "-", floor: "1st Floor", rent: 5000 },
  { id: "r-104", roomNo: "104", type: "Double", capacity: 2, status: "Occupied", residents: ["Sneha Patil", "Pooja Singh"], residentNames: "Sneha Patil, Pooja Singh", floor: "1st Floor", rent: 4000 },
  { id: "r-105", roomNo: "105", type: "Double", capacity: 2, status: "Occupied", residents: ["Rahul Verma", "Kunal Jain"], residentNames: "Rahul Verma, Kunal Jain", floor: "1st Floor", rent: 4000 },
  { id: "r-106", roomNo: "106", type: "Double", capacity: 2, status: "Available", residents: [], residentNames: "-", floor: "1st Floor", rent: 4000 },
  { id: "r-107", roomNo: "107", type: "Triple", capacity: 3, status: "Occupied", residents: ["Akash Yadav", "Suman Devi"], residentNames: "Akash Yadav, Suman Devi", floor: "1st Floor", rent: 3500 },
  { id: "r-108", roomNo: "108", type: "Triple", capacity: 3, status: "Occupied", residents: ["Rohit Kumar", "Sameer Khan"], residentNames: "Rohit Kumar, Sameer Khan", floor: "1st Floor", rent: 3500 },
  { id: "r-109", roomNo: "109", type: "Triple", capacity: 3, status: "Available", residents: [], residentNames: "-", floor: "1st Floor", rent: 3500 },
  { id: "r-110", roomNo: "110", type: "Single", capacity: 1, status: "Occupied", residents: ["Neha Gupta"], residentNames: "Neha Gupta", floor: "1st Floor", rent: 5000 },
  { id: "r-111", roomNo: "111", type: "Double", capacity: 2, status: "Occupied", residents: ["Meera Sharma"], residentNames: "Meera Sharma", floor: "1st Floor", rent: 4000 },
  { id: "r-112", roomNo: "112", type: "Double", capacity: 2, status: "Available", residents: [], residentNames: "-", floor: "1st Floor", rent: 4000 },
  { id: "r-113", roomNo: "113", type: "Triple", capacity: 3, status: "Occupied", residents: ["Vikash Singh"], residentNames: "Vikash Singh", floor: "1st Floor", rent: 3500 },
  { id: "r-115", roomNo: "115", type: "Single", capacity: 1, status: "Available", residents: [], residentNames: "-", floor: "1st Floor", rent: 5000 },
  { id: "r-118", roomNo: "118", type: "Triple", capacity: 3, status: "Available", residents: [], residentNames: "-", floor: "1st Floor", rent: 3500 },
];

const DEFAULT_RESIDENTS: HostelResident[] = [
  { id: "res-1", name: "Rohan Sharma", studentId: "B001", roomNo: "101", phone: "9876543210", email: "rohan.sharma@campusly.edu", course: "B.Tech CSE", year: "3rd Year", status: "Active", checkInDate: "12 Aug 2025", emergencyContact: "9876543219" },
  { id: "res-2", name: "Amit Kumar", studentId: "B002", roomNo: "102", phone: "9876543211", email: "amit.kumar@campusly.edu", course: "B.Tech IT", year: "2nd Year", status: "Active", checkInDate: "15 Aug 2025", emergencyContact: "9876543218" },
  { id: "res-3", name: "Sneha Patil", studentId: "B003", roomNo: "104", phone: "9876543212", email: "sneha.patil@campusly.edu", course: "B.Tech ECE", year: "3rd Year", status: "Active", checkInDate: "10 Aug 2025", emergencyContact: "9876543217" },
  { id: "res-4", name: "Rahul Verma", studentId: "B004", roomNo: "105", phone: "9876543213", email: "rahul.verma@campusly.edu", course: "B.Tech ME", year: "4th Year", status: "Active", checkInDate: "11 Aug 2025", emergencyContact: "9876543216" },
  { id: "res-5", name: "Pooja Singh", studentId: "B005", roomNo: "105", phone: "9876543214", email: "pooja.singh@campusly.edu", course: "B.Tech CSE", year: "2nd Year", status: "Active", checkInDate: "08 Aug 2025", emergencyContact: "9876543215" },
  { id: "res-6", name: "Akash Yadav", studentId: "B006", roomNo: "107", phone: "9876543215", email: "akash.yadav@campusly.edu", course: "B.Tech Civil", year: "3rd Year", status: "Active", checkInDate: "09 Aug 2025", emergencyContact: "9876543214" },
  { id: "res-7", name: "Suman Devi", studentId: "B007", roomNo: "107", phone: "9876543216", email: "suman.devi@campusly.edu", course: "B.Tech IT", year: "1st Year", status: "Active", checkInDate: "14 Aug 2025", emergencyContact: "9876543213" },
  { id: "res-8", name: "Rohit Kumar", studentId: "B008", roomNo: "108", phone: "9876543217", email: "rohit.kumar@campusly.edu", course: "B.Tech EE", year: "2nd Year", status: "Active", checkInDate: "12 Aug 2025", emergencyContact: "9876543212" },
];

const DEFAULT_GATE_PASSES: GatePassItem[] = [
  { id: "gp-1", studentName: "Rohan Sharma", purpose: "Medical", outTime: "10:30 AM", requestedAt: "15 Oct 2025 09:45 AM", status: "Pending" },
  { id: "gp-2", studentName: "Sneha Patil", purpose: "Library", outTime: "11:00 AM", requestedAt: "15 Oct 2025 09:50 AM", status: "Approved", approvedAt: "15 Oct 2025 09:58 AM" },
  { id: "gp-3", studentName: "Amit Kumar", purpose: "Home", outTime: "12:15 PM", requestedAt: "15 Oct 2025 10:15 AM", status: "Approved", approvedAt: "15 Oct 2025 10:20 AM" },
  { id: "gp-4", studentName: "Pooja Singh", purpose: "Bank", outTime: "01:00 PM", requestedAt: "15 Oct 2025 10:45 AM", status: "Approved", approvedAt: "15 Oct 2025 11:00 AM" },
  { id: "gp-5", studentName: "Rahul Verma", purpose: "Medical", outTime: "02:30 PM", requestedAt: "15 Oct 2025 11:30 AM", status: "Pending" },
  { id: "gp-6", studentName: "Neha Gupta", purpose: "Appointment", outTime: "04:00 PM", requestedAt: "15 Oct 2025 12:15 PM", status: "Pending" },
];

const DEFAULT_LEAVES: HostelLeaveItem[] = [
  { id: "lv-1", studentName: "Sneha Patil", leaveType: "Medical", fromDate: "10 Oct 2025", toDate: "15 Oct 2025", status: "Approved", reason: "Medical leave for dental checkup" },
  { id: "lv-2", studentName: "Rohit Kumar", leaveType: "Personal", fromDate: "12 Oct 2025", toDate: "13 Oct 2025", status: "Approved", reason: "Family event in hometown" },
  { id: "lv-3", studentName: "Neha Gupta", leaveType: "Family", fromDate: "15 Oct 2025", toDate: "18 Oct 2025", status: "Approved", reason: "Attending cousin wedding" },
  { id: "lv-4", studentName: "Vikash Singh", leaveType: "Personal", fromDate: "17 Oct 2025", toDate: "18 Oct 2025", status: "Approved", reason: "Personal work" },
  { id: "lv-5", studentName: "Pooja Singh", leaveType: "Family", fromDate: "20 Oct 2025", toDate: "21 Oct 2025", status: "Approved", reason: "Family gathering" },
];

const DEFAULT_COMPLAINTS: HostelComplaintItem[] = [
  { id: "cmp-1", category: "Room Maintenance", description: "Fan not working in Room 104", date: "14 Oct 2025", status: "New", studentName: "Sneha Patil", roomNo: "104" },
  { id: "cmp-2", category: "Food Quality", description: "Food quality issue in dinner", date: "12 Oct 2025", status: "In Progress", studentName: "Rohan Sharma", roomNo: "101" },
  { id: "cmp-3", category: "Cleanliness", description: "Washroom not cleaned on 2nd floor", date: "11 Oct 2025", status: "Resolved", studentName: "Amit Kumar", roomNo: "102" },
  { id: "cmp-4", category: "Security", description: "Corridor light flickering", date: "08 Oct 2025", status: "Resolved", studentName: "Rahul Verma", roomNo: "105" },
];

const DEFAULT_NOTICES: HostelNoticeItem[] = [
  { id: "not-1", title: "Mess will be closed on Sunday", message: "Special maintenance work will take place in the central kitchen this Sunday.", date: "15 Oct 2025", audience: "All Residents", status: "Active" },
  { id: "not-2", title: "Maintenance work on Block B", message: "Water supply pipeline repairs scheduled from 2 PM to 5 PM.", date: "12 Oct 2025", audience: "All Residents", status: "Active" },
  { id: "not-3", title: "Gym leave policy updated", message: "Please show your resident card at the fitness center entrance.", date: "10 Oct 2025", audience: "Students", status: "Active" },
  { id: "not-4", title: "Water supply disruption notice", message: "Temporary disruption between 10 AM and 12 PM for tank cleaning.", date: "08 Oct 2025", audience: "All Residents", status: "Active" },
];

// Persistent state holder
let roomsData: HostelRoom[] = [...DEFAULT_ROOMS];
let residentsData: HostelResident[] = [...DEFAULT_RESIDENTS];
let gatePassesData: GatePassItem[] = [...DEFAULT_GATE_PASSES];
let leavesData: HostelLeaveItem[] = [...DEFAULT_LEAVES];
let complaintsData: HostelComplaintItem[] = [...DEFAULT_COMPLAINTS];
let noticesData: HostelNoticeItem[] = [...DEFAULT_NOTICES];

class HostelDataService {
  // Rooms
  getRooms(): HostelRoom[] {
    return [...roomsData];
  }

  addRoom(room: Omit<HostelRoom, "id">): HostelRoom {
    const newRoom: HostelRoom = {
      ...room,
      id: `r-${Date.now()}`,
    };
    roomsData = [newRoom, ...roomsData];
    notificationService.notifyUser(
      `Room ${newRoom.roomNo} Added`,
      `Room ${newRoom.roomNo} (${newRoom.type}) has been added to the hostel system.`,
      "general"
    );
    return newRoom;
  }

  updateRoom(id: string, updates: Partial<HostelRoom>): HostelRoom | null {
    const idx = roomsData.findIndex((r) => r.id === id || r.roomNo === id);
    if (idx !== -1) {
      roomsData[idx] = { ...roomsData[idx], ...updates };
      return roomsData[idx];
    }
    return null;
  }

  deleteRoom(id: string) {
    roomsData = roomsData.filter((r) => r.id !== id && r.roomNo !== id);
  }

  allocateRoom(studentName: string, roomNo: string): boolean {
    const room = roomsData.find((r) => r.roomNo === roomNo);
    if (!room) return false;

    if (!room.residents.includes(studentName)) {
      room.residents.push(studentName);
    }
    room.residentNames = room.residents.join(", ");
    if (room.residents.length >= room.capacity) {
      room.status = "Occupied";
    }

    // Update or add resident record
    const res = residentsData.find((r) => r.name.toLowerCase() === studentName.toLowerCase());
    if (res) {
      res.roomNo = roomNo;
      res.status = "Active";
    } else {
      residentsData.push({
        id: `res-${Date.now()}`,
        name: studentName,
        studentId: `B${Math.floor(100 + Math.random() * 900)}`,
        roomNo,
        phone: "9876543210",
        status: "Active",
        checkInDate: "Today",
      });
    }

    notificationService.notifyUser(
      "Room Allocated Successfully",
      `Room ${roomNo} has been successfully allocated to ${studentName}.`,
      "pass"
    );
    return true;
  }

  // Residents
  getResidents(): HostelResident[] {
    return [...residentsData];
  }

  addResident(resident: Omit<HostelResident, "id">): HostelResident {
    const newRes: HostelResident = {
      ...resident,
      id: `res-${Date.now()}`,
    };
    residentsData = [newRes, ...residentsData];

    // If room is assigned, update room resident list
    if (newRes.roomNo) {
      const room = roomsData.find((r) => r.roomNo === newRes.roomNo);
      if (room) {
        if (!room.residents.includes(newRes.name)) {
          room.residents.push(newRes.name);
          room.residentNames = room.residents.join(", ");
        }
        if (room.residents.length >= room.capacity) {
          room.status = "Occupied";
        }
      }
    }

    notificationService.notifyUser(
      "Resident Enrolled",
      `${newRes.name} has been enrolled into Room ${newRes.roomNo || "Pending Allocation"}.`,
      "general"
    );
    return newRes;
  }

  updateResident(id: string, updates: Partial<HostelResident>) {
    const idx = residentsData.findIndex((r) => r.id === id);
    if (idx !== -1) {
      residentsData[idx] = { ...residentsData[idx], ...updates };
      return residentsData[idx];
    }
    return null;
  }

  deleteResident(id: string) {
    residentsData = residentsData.filter((r) => r.id !== id);
  }

  // Gate Passes
  getGatePasses(): GatePassItem[] {
    return [...gatePassesData];
  }

  createGatePass(pass: Omit<GatePassItem, "id">): GatePassItem {
    const newPass: GatePassItem = {
      ...pass,
      id: `gp-${Date.now()}`,
    };
    gatePassesData = [newPass, ...gatePassesData];
    notificationService.notifyUser(
      "Gate Pass Submitted",
      `Gate pass request for ${newPass.studentName} (${newPass.purpose}) created.`,
      "pass"
    );
    return newPass;
  }

  updateGatePassStatus(id: string, status: "Approved" | "Rejected" | "Pending") {
    const pass = gatePassesData.find((p) => p.id === id);
    if (pass) {
      pass.status = status;
      if (status === "Approved") {
        pass.approvedAt = "Just now";
        notificationService.notifyUser(
          "Gate Pass Approved! 🚪",
          `Gate pass for ${pass.studentName} has been approved for ${pass.outTime}.`,
          "pass"
        );
      } else if (status === "Rejected") {
        notificationService.notifyUser(
          "Gate Pass Rejected",
          `Gate pass for ${pass.studentName} was rejected.`,
          "pass"
        );
      }
    }
    return pass;
  }

  // Leaves
  getLeaves(): HostelLeaveItem[] {
    return [...leavesData];
  }

  createLeave(leave: Omit<HostelLeaveItem, "id">): HostelLeaveItem {
    const newLeave: HostelLeaveItem = {
      ...leave,
      id: `lv-${Date.now()}`,
    };
    leavesData = [newLeave, ...leavesData];
    notificationService.notifyUser(
      "Leave Application Received",
      `Leave request for ${newLeave.studentName} (${newLeave.leaveType}) registered.`,
      "pass"
    );
    return newLeave;
  }

  updateLeaveStatus(id: string, status: "Approved" | "Rejected" | "Pending") {
    const lv = leavesData.find((l) => l.id === id);
    if (lv) {
      lv.status = status;
      notificationService.notifyUser(
        `Leave ${status}! 📝`,
        `Leave for ${lv.studentName} from ${lv.fromDate} to ${lv.toDate} is ${status}.`,
        "pass"
      );
    }
    return lv;
  }

  // Complaints
  getComplaints(): HostelComplaintItem[] {
    return [...complaintsData];
  }

  createComplaint(comp: Omit<HostelComplaintItem, "id">): HostelComplaintItem {
    const newComp: HostelComplaintItem = {
      ...comp,
      id: `cmp-${Date.now()}`,
    };
    complaintsData = [newComp, ...complaintsData];
    notificationService.notifyUser(
      "Complaint Registered",
      `New complaint for ${newComp.category}: ${newComp.description}.`,
      "general"
    );
    return newComp;
  }

  updateComplaintStatus(id: string, status: "New" | "In Progress" | "Resolved") {
    const comp = complaintsData.find((c) => c.id === id);
    if (comp) {
      comp.status = status;
      notificationService.notifyUser(
        `Complaint Marked as ${status}`,
        `Complaint for ${comp.category} status changed to ${status}.`,
        "general"
      );
    }
    return comp;
  }

  // Notices
  getNotices(): HostelNoticeItem[] {
    return [...noticesData];
  }

  createNotice(notice: Omit<HostelNoticeItem, "id">): HostelNoticeItem {
    const newNotice: HostelNoticeItem = {
      ...notice,
      id: `not-${Date.now()}`,
    };
    noticesData = [newNotice, ...noticesData];

    // Dual-write to Firebase Firestore if possible
    try {
      addDoc(collection(db, "notices"), {
        title: newNotice.title,
        message: newNotice.message || "",
        category: "Hostel",
        date: newNotice.date,
        audience: newNotice.audience,
        createdAt: serverTimestamp(),
      });
    } catch (_) {}

    notificationService.notifyUser(
      "Hostel Notice Published! 📢",
      `"${newNotice.title}" has been broadcast to ${newNotice.audience}.`,
      "notice"
    );
    return newNotice;
  }

  // Stats
  getStats() {
    const totalRooms = roomsData.length;
    const occupiedRooms = roomsData.filter((r) => r.status === "Occupied").length;
    const availableRooms = roomsData.filter((r) => r.status === "Available").length;
    const totalResidents = residentsData.length;
    const occupancyRate = totalRooms > 0 ? Math.round((occupiedRooms / totalRooms) * 100) : 0;
    const pendingGatePasses = gatePassesData.filter((p) => p.status === "Pending").length;
    const pendingLeaves = leavesData.filter((l) => l.status === "Pending").length;
    const newComplaints = complaintsData.filter((c) => c.status === "New").length;
    const totalNotices = noticesData.length;

    return {
      totalRooms,
      occupiedRooms,
      availableRooms,
      totalResidents,
      occupancyRate,
      pendingGatePasses,
      pendingLeaves,
      newComplaints,
      totalNotices,
    };
  }

  // Aliases
  addGatePass(pass: Omit<GatePassItem, "id">): GatePassItem {
    return this.createGatePass(pass);
  }

  addLeave(leave: Omit<HostelLeaveItem, "id">): HostelLeaveItem {
    return this.createLeave(leave);
  }

  addComplaint(comp: Omit<HostelComplaintItem, "id">): HostelComplaintItem {
    return this.createComplaint(comp);
  }

  addNotice(notice: Omit<HostelNoticeItem, "id">): HostelNoticeItem {
    return this.createNotice(notice);
  }
}

export default new HostelDataService();
