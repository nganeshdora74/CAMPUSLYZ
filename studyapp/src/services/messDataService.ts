import { auth, db } from "../firebase/config";
import {
  collection,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import notificationService from "./notificationService";

export interface MealItem {
  id: string;
  type: "Breakfast" | "Lunch" | "Snacks" | "Dinner";
  items: string;
  timing: string;
  status: "Served" | "Ongoing" | "Upcoming";
  photoUrl?: string;
  calories?: string;
}

export interface DayMenu {
  day: string;
  breakfast: string;
  lunch: string;
  dinner: string;
}

export interface MessAttendanceStudent {
  id: string;
  rollNo: string;
  name: string;
  room: string;
  breakfast: boolean;
  lunch: boolean;
  snacks: boolean;
  dinner: boolean;
  status: "Present" | "Absent" | "On Leave";
}

export interface InventoryItem {
  id: string;
  item: string;
  category: "Grains" | "Vegetables" | "Essentials" | "Pulses" | "Dairy" | "Spices";
  currentStock: number;
  unit: "kg" | "L" | "packets" | "tins";
  minStock: number;
  status: "Good" | "Low Stock" | "Out of Stock";
  lastRestocked?: string;
}

export interface MessExpenseItem {
  id: string;
  date: string;
  category: "Vegetables" | "Grains" | "LPG" | "Milk" | "Groceries" | "Equipment" | "Staff";
  amount: number;
  mode: "Cash" | "UPI" | "Card" | "Net Banking";
  description?: string;
}

export interface MessFeedbackItem {
  id: string;
  studentName: string;
  date: string;
  messHall: string;
  category: string;
  description: string;
  rating?: number;
  status: "Pending" | "In Progress" | "Resolved";
  assignedTo?: string;
}

export interface FoodWastageRecord {
  id: string;
  date: string;
  breakfastKg: number;
  lunchKg: number;
  snacksKg: number;
  dinnerKg: number;
  totalKg: number;
  topItem: string;
}

export interface MessNoticeItem {
  id: string;
  title: string;
  message?: string;
  date: string;
  audience: string;
  status: "Active" | "Archived";
}

// Initial defaults matching screenshot 2
const DEFAULT_TODAY_MEALS: MealItem[] = [
  {
    id: "m-1",
    type: "Breakfast",
    items: "Idli + Chutney + Tea",
    timing: "07:30 AM – 09:30 AM",
    status: "Served",
    photoUrl: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=300&auto=format&fit=crop&q=80",
    calories: "380 kcal",
  },
  {
    id: "m-2",
    type: "Lunch",
    items: "Rice + Sambar + Veg Curry + Curd",
    timing: "12:30 PM – 02:30 PM",
    status: "Ongoing",
    photoUrl: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300&auto=format&fit=crop&q=80",
    calories: "650 kcal",
  },
  {
    id: "m-3",
    type: "Snacks",
    items: "Poha + Hot Tea",
    timing: "05:00 PM – 06:00 PM",
    status: "Upcoming",
    photoUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&auto=format&fit=crop&q=80",
    calories: "260 kcal",
  },
  {
    id: "m-4",
    type: "Dinner",
    items: "Roti + Dal + Veg Curry + Salad",
    timing: "08:00 PM – 10:00 PM",
    status: "Upcoming",
    photoUrl: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300&auto=format&fit=crop&q=80",
    calories: "520 kcal",
  },
];

const DEFAULT_WEEKLY_MENU: DayMenu[] = [
  { day: "Mon", breakfast: "Idli + Sambar", lunch: "Rice + Rajma", dinner: "Roti + Dal + Veg" },
  { day: "Tue", breakfast: "Dosa + Chutney", lunch: "Veg Pulao", dinner: "Dal Makhani + Roti" },
  { day: "Wed", breakfast: "Upma + Tea", lunch: "Rice + Sambar", dinner: "Curry + Rice" },
  { day: "Thu", breakfast: "Paratha + Curd", lunch: "Roti + Dal", dinner: "Veg Curry + Roti" },
  { day: "Fri", breakfast: "Idli + Vada", lunch: "Chole Bhature", dinner: "Dal + Rice" },
  { day: "Sat", breakfast: "Poha + Tea", lunch: "Khichdi", dinner: "Paneer + Roti" },
  { day: "Sun", breakfast: "Upma + Chutney", lunch: "Dal Rice + Sweet", dinner: "Roti + Dal" },
];

const DEFAULT_ATTENDANCE: MessAttendanceStudent[] = [
  { id: "s-1", rollNo: "STU001", name: "Rahul Sharma", room: "A101", breakfast: true, lunch: true, snacks: true, dinner: true, status: "Present" },
  { id: "s-2", rollNo: "STU002", name: "Sneha Reddy", room: "A102", breakfast: true, lunch: true, snacks: false, dinner: true, status: "Present" },
  { id: "s-3", rollNo: "STU003", name: "Akash Patel", room: "B201", breakfast: false, lunch: true, snacks: false, dinner: false, status: "Present" },
  { id: "s-4", rollNo: "STU004", name: "Priya Nair", room: "B202", breakfast: true, lunch: true, snacks: true, dinner: true, status: "Present" },
  { id: "s-5", rollNo: "STU005", name: "Rohit Kumar", room: "C101", breakfast: false, lunch: false, snacks: false, dinner: false, status: "On Leave" },
  { id: "s-6", rollNo: "STU006", name: "Anjali Singh", room: "C102", breakfast: true, lunch: true, snacks: true, dinner: true, status: "Present" },
  { id: "s-7", rollNo: "STU007", name: "Karan Verma", room: "D101", breakfast: false, lunch: false, snacks: false, dinner: false, status: "Absent" },
  { id: "s-8", rollNo: "STU008", name: "Neha Gupta", room: "D102", breakfast: true, lunch: true, snacks: true, dinner: true, status: "Present" },
];

const DEFAULT_INVENTORY: InventoryItem[] = [
  { id: "inv-1", item: "Rice", category: "Grains", currentStock: 82, unit: "kg", minStock: 30, status: "Good" },
  { id: "inv-2", item: "Wheat Flour", category: "Grains", currentStock: 45, unit: "kg", minStock: 20, status: "Good" },
  { id: "inv-3", item: "Potato", category: "Vegetables", currentStock: 12, unit: "kg", minStock: 15, status: "Low Stock" },
  { id: "inv-4", item: "Onion", category: "Vegetables", currentStock: 9, unit: "kg", minStock: 15, status: "Low Stock" },
  { id: "inv-5", item: "Tomato", category: "Vegetables", currentStock: 20, unit: "kg", minStock: 10, status: "Good" },
  { id: "inv-6", item: "Cooking Oil", category: "Essentials", currentStock: 8, unit: "L", minStock: 10, status: "Low Stock" },
  { id: "inv-7", item: "Dal (Toor)", category: "Pulses", currentStock: 36, unit: "kg", minStock: 20, status: "Good" },
  { id: "inv-8", item: "Milk", category: "Dairy", currentStock: 12, unit: "L", minStock: 10, status: "Good" },
];

const DEFAULT_EXPENSES: MessExpenseItem[] = [
  { id: "exp-1", date: "12 Oct 2025", category: "Vegetables", amount: 8300, mode: "UPI", description: "Daily fresh market purchase" },
  { id: "exp-2", date: "11 Oct 2025", category: "Grains", amount: 12000, mode: "Net Banking", description: "Basmati & Sona Masoori Rice sacks" },
  { id: "exp-3", date: "10 Oct 2025", category: "LPG", amount: 3200, mode: "Card", description: "2 Commercial LPG Cylinders" },
  { id: "exp-4", date: "09 Oct 2025", category: "Milk", amount: 4800, mode: "Cash", description: "Amul Pasteurised milk dairy delivery" },
];

const DEFAULT_FEEDBACK: MessFeedbackItem[] = [
  { id: "fb-1", studentName: "Aarav Sharma", date: "12 Oct 2025", messHall: "Mess 1", category: "Food Quality", description: "Food was cold and vegetables were undercooked in dinner.", status: "Pending", assignedTo: "Mess Manager" },
  { id: "fb-2", studentName: "Rohan Verma", date: "11 Oct 2025", messHall: "Mess 2", category: "Late Serving", description: "Lunch serving started 25 minutes late today.", status: "In Progress", assignedTo: "Kitchen Supervisor" },
  { id: "fb-3", studentName: "Sneha Patil", date: "10 Oct 2025", messHall: "Mess 1", category: "Hygiene", description: "Tables not wiped before lunch rush.", status: "Pending", assignedTo: "Mess Manager" },
  { id: "fb-4", studentName: "Pooja Singh", date: "08 Oct 2025", messHall: "Mess 2", category: "Quantity", description: "Paneer portion size was quite small.", status: "Resolved", assignedTo: "Mess Manager" },
];

const DEFAULT_NOTICES: MessNoticeItem[] = [
  { id: "not-1", title: "Mess will remain closed on Sunday dinner", message: "Kitchen deep clean and pest control treatment.", date: "15 Oct 2025", audience: "All Students", status: "Active" },
  { id: "not-2", title: "New breakfast menu for next week", message: "South Indian filter coffee & oats porridge added on request.", date: "13 Oct 2025", audience: "All Students", status: "Active" },
  { id: "not-3", title: "Important: Hygiene inspection tomorrow", message: "Campus health committee conducting monthly audit.", date: "11 Oct 2025", audience: "Mess Staff", status: "Active" },
  { id: "not-4", title: "Festival special meal announcement", message: "Special Diwali feast on coming Friday night.", date: "05 Oct 2025", audience: "All Students", status: "Archived" },
];

// Persistent state holders
let todayMealsData: MealItem[] = [...DEFAULT_TODAY_MEALS];
let weeklyMenuData: DayMenu[] = [...DEFAULT_WEEKLY_MENU];
let attendanceData: MessAttendanceStudent[] = [...DEFAULT_ATTENDANCE];
let inventoryData: InventoryItem[] = [...DEFAULT_INVENTORY];
let expensesData: MessExpenseItem[] = [...DEFAULT_EXPENSES];
let feedbackData: MessFeedbackItem[] = [...DEFAULT_FEEDBACK];
let noticesData: MessNoticeItem[] = [...DEFAULT_NOTICES];
let foodWastageData: FoodWastageRecord[] = [
  { id: "w-1", date: "12 Oct 2025", breakfastKg: 8, lunchKg: 14, snacksKg: 2, dinnerKg: 9, totalKg: 31, topItem: "Rice" },
  { id: "w-2", date: "11 Oct 2025", breakfastKg: 9, lunchKg: 16, snacksKg: 3, dinnerKg: 7, totalKg: 35, topItem: "Vegetables" },
  { id: "w-3", date: "10 Oct 2025", breakfastKg: 7, lunchKg: 13, snacksKg: 2, dinnerKg: 8, totalKg: 30, topItem: "Dal" },
];

class MessDataService {
  // Meals
  getTodayMeals(): MealItem[] {
    return [...todayMealsData];
  }

  updateMeal(id: string, updates: Partial<MealItem>): MealItem | null {
    const idx = todayMealsData.findIndex((m) => m.id === id || m.type === id);
    if (idx !== -1) {
      todayMealsData[idx] = { ...todayMealsData[idx], ...updates };
      notificationService.notifyUser(
        `${todayMealsData[idx].type} Updated! 🍛`,
        `${todayMealsData[idx].type} is now marked as ${todayMealsData[idx].status}: ${todayMealsData[idx].items}`,
        "general"
      );
      return todayMealsData[idx];
    }
    return null;
  }

  // Weekly Menu
  getWeeklyMenu(): DayMenu[] {
    return [...weeklyMenuData];
  }

  updateDayMenu(day: string, updates: Partial<DayMenu>) {
    const idx = weeklyMenuData.findIndex((m) => m.day.toLowerCase() === day.toLowerCase());
    if (idx !== -1) {
      weeklyMenuData[idx] = { ...weeklyMenuData[idx], ...updates };
    }
  }

  // Attendance
  getAttendance(): MessAttendanceStudent[] {
    const seen = new Set<string>();
    return attendanceData.filter((item) => {
      const key = item.id || item.rollNo;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  toggleMealAttendance(studentId: string, meal: "breakfast" | "lunch" | "snacks" | "dinner") {
    const student = attendanceData.find((s) => s.id === studentId || s.rollNo === studentId);
    if (student) {
      student[meal] = !student[meal];
      if (student.breakfast || student.lunch || student.snacks || student.dinner) {
        student.status = "Present";
      } else {
        student.status = "Absent";
      }
    }
    return student;
  }

  markStudentStatus(studentId: string, status: "Present" | "Absent" | "On Leave") {
    const student = attendanceData.find((s) => s.id === studentId || s.rollNo === studentId);
    if (student) {
      student.status = status;
      if (status === "On Leave" || status === "Absent") {
        student.breakfast = false;
        student.lunch = false;
        student.snacks = false;
        student.dinner = false;
      } else {
        student.breakfast = true;
        student.lunch = true;
      }
    }
    return student;
  }

  addStudent(student: Omit<MessAttendanceStudent, "id"> & { id?: string }) {
    // If student already exists by rollNo or name, update rather than duplicating
    const existingIdx = attendanceData.findIndex(
      (s) =>
        (student.rollNo && s.rollNo && s.rollNo.toLowerCase() === student.rollNo.toLowerCase()) ||
        (student.name && s.name && s.name.toLowerCase() === student.name.toLowerCase())
    );
    if (existingIdx !== -1) {
      attendanceData[existingIdx] = {
        ...attendanceData[existingIdx],
        ...student,
        id: attendanceData[existingIdx].id,
      };
      return attendanceData[existingIdx];
    }

    const uniqueKey = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const newId = student.id || (student.rollNo ? `s-${student.rollNo}` : `s-${uniqueKey}`);
    const newS: MessAttendanceStudent = {
      ...student,
      id: newId,
    };
    attendanceData = [newS, ...attendanceData];
    notificationService.notifyUser(
      "Mess Student Enrolled",
      `${newS.name} (${newS.rollNo}) registered in Mess database.`,
      "general"
    );
    return newS;
  }

  // Inventory
  getInventory(): InventoryItem[] {
    return [...inventoryData];
  }

  addInventoryItem(item: Omit<InventoryItem, "id">): InventoryItem {
    const newItem: InventoryItem = {
      ...item,
      id: `inv-${Date.now()}`,
    };
    inventoryData = [newItem, ...inventoryData];
    notificationService.notifyUser(
      "Stock Item Added",
      `${newItem.item} (${newItem.currentStock} ${newItem.unit}) recorded in inventory.`,
      "general"
    );
    return newItem;
  }

  updateStock(id: string, delta: number) {
    const item = inventoryData.find((i) => i.id === id);
    if (item) {
      item.currentStock = Math.max(0, item.currentStock + delta);
      if (item.currentStock === 0) {
        item.status = "Out of Stock";
      } else if (item.currentStock <= item.minStock) {
        item.status = "Low Stock";
        notificationService.notifyUser(
          "Low Stock Warning! ⚠️",
          `${item.item} is running low (${item.currentStock} ${item.unit} remaining).`,
          "general"
        );
      } else {
        item.status = "Good";
      }
    }
    return item;
  }

  // Expenses
  getExpenses(): MessExpenseItem[] {
    return [...expensesData];
  }

  addExpense(exp: Omit<MessExpenseItem, "id">): MessExpenseItem {
    const newExp: MessExpenseItem = {
      ...exp,
      id: `exp-${Date.now()}`,
    };
    expensesData = [newExp, ...expensesData];
    notificationService.notifyUser(
      "Mess Expense Recorded",
      `₹${newExp.amount.toLocaleString()} recorded for ${newExp.category} (${newExp.mode}).`,
      "fee"
    );
    return newExp;
  }

  // Wastage
  getWastageHistory(): FoodWastageRecord[] {
    return [...foodWastageData];
  }

  logWastage(rec: Omit<FoodWastageRecord, "id">): FoodWastageRecord {
    const newRec: FoodWastageRecord = {
      ...rec,
      id: `w-${Date.now()}`,
    };
    foodWastageData = [newRec, ...foodWastageData];
    notificationService.notifyUser(
      "Wastage Logged",
      `Today's wastage logged: ${newRec.totalKg} kg.`,
      "general"
    );
    return newRec;
  }

  // Feedback & Complaints
  getFeedback(): MessFeedbackItem[] {
    return [...feedbackData];
  }

  addFeedback(fb: Omit<MessFeedbackItem, "id">): MessFeedbackItem {
    const newFb: MessFeedbackItem = {
      ...fb,
      id: `fb-${Date.now()}`,
    };
    feedbackData = [newFb, ...feedbackData];
    notificationService.notifyUser(
      "Complaint Submitted",
      `New feedback from ${newFb.studentName} for ${newFb.category}.`,
      "general"
    );
    return newFb;
  }

  updateComplaintStatus(id: string, status: "Pending" | "In Progress" | "Resolved") {
    const comp = feedbackData.find((f) => f.id === id);
    if (comp) {
      comp.status = status;
      notificationService.notifyUser(
        `Complaint Marked as ${status}! ⭐`,
        `Complaint regarding "${comp.category}" is now ${status}.`,
        "general"
      );
    }
    return comp;
  }

  // Notices
  getNotices(): MessNoticeItem[] {
    return [...noticesData];
  }

  createNotice(notice: Omit<MessNoticeItem, "id">): MessNoticeItem {
    const newNotice: MessNoticeItem = {
      ...notice,
      id: `not-${Date.now()}`,
    };
    noticesData = [newNotice, ...noticesData];

    // Dual-write to Firebase Firestore
    try {
      addDoc(collection(db, "notices"), {
        title: newNotice.title,
        message: newNotice.message || "",
        category: "Mess",
        date: newNotice.date,
        audience: newNotice.audience,
        createdAt: serverTimestamp(),
      });
    } catch (_) {}

    notificationService.notifyUser(
      "Mess Notice Published! 📢",
      `"${newNotice.title}" has been published to ${newNotice.audience}.`,
      "notice"
    );
    return newNotice;
  }

  // Stats
  getStats() {
    const totalStudents = 480;
    const presentCount = attendanceData.filter((a) => a.status === "Present").length;
    const presentRate = Math.round((presentCount / Math.max(1, attendanceData.length)) * 100);
    const mealsServed = 418;
    const pendingComplaints = feedbackData.filter((f) => f.status === "Pending").length;
    const totalItems = inventoryData.length;
    const inStock = inventoryData.filter((i) => i.status === "Good").length;
    const lowStock = inventoryData.filter((i) => i.status === "Low Stock").length;
    const outOfStock = inventoryData.filter((i) => i.status === "Out of Stock").length;
    const foodCost = expensesData
      .filter((e) => e.category === "Vegetables" || e.category === "Grains" || e.category === "Milk")
      .reduce((sum, e) => sum + e.amount, 184500);
    const otherCost = expensesData
      .filter((e) => e.category !== "Vegetables" && e.category !== "Grains" && e.category !== "Milk")
      .reduce((sum, e) => sum + e.amount, 32400);

    return {
      totalStudents,
      todayAttendance: 432,
      todayAttendanceRate: 90,
      mealsServed,
      pendingComplaints,
      totalItems,
      inStock,
      lowStock,
      outOfStock,
      foodCost,
      otherCost,
      totalExpenses: foodCost + otherCost,
      costPerStudent: 452,
      costPerMeal: 31,
    };
  }

  // Aliases & Helper Methods
  updateAttendance(id: string, updates: Partial<MessAttendanceStudent>) {
    const idx = attendanceData.findIndex((s) => s.id === id || s.rollNo === id);
    if (idx !== -1) {
      attendanceData[idx] = { ...attendanceData[idx], ...updates };
      return attendanceData[idx];
    }
    return null;
  }

  addAttendanceStudent(student: Omit<MessAttendanceStudent, "id">) {
    return this.addStudent(student);
  }

  adjustStock(id: string, delta: number) {
    return this.updateStock(id, delta);
  }

  updateFeedbackStatus(id: string, status: "Pending" | "In Progress" | "Resolved") {
    return this.updateComplaintStatus(id, status);
  }

  addNotice(notice: Omit<MessNoticeItem, "id">) {
    return this.createNotice(notice);
  }
}

export default new MessDataService();
