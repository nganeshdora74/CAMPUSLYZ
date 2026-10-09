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
} from "firebase/firestore";
import { db } from "../firebase/config";
import {
  notifyAdmin,
  notifyMessManager,
  notifyStudent,
  sendStudentNotification,
} from "./notificationService";

export interface UnifiedMeal {
  id: string;
  type: "Breakfast" | "Lunch" | "Snacks" | "Dinner";
  items: string;
  timing: string;
  status: "Served" | "Ongoing" | "Upcoming";
  calories?: string;
  photoUrl?: string;
  takesCount: number;
}

export interface SpecialNote {
  text: string;
  updatedAt: string;
  updatedBy: string;
}

export interface AdminSuggestion {
  id: string;
  suggestion: string;
  mealType: string;
  adminName: string;
  status: "Pending" | "Acknowledged" | "Implemented";
  createdAt: any;
  date: string;
}

export interface FoodFeedback {
  id: string;
  userId?: string;
  userName: string;
  userRole: string;
  meal: "Breakfast" | "Lunch" | "Snacks" | "Dinner" | string;
  rating: number; // 1-5
  tasteRating?: number; // 1-5
  hygieneRating?: number; // 1-5
  comment: string;
  date: string;
  status?: "Pending" | "Reviewed" | "Action Taken";
  adminActionNote?: string;
  createdAt: any;
}

export interface MealOptIn {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  meal: string;
  date: string;
  timestamp: any;
}

const DEFAULT_MEALS: UnifiedMeal[] = [
  {
    id: "m-1",
    type: "Breakfast",
    items: "Idli, Medu Vada, Sambar & Coconut Chutney",
    timing: "7:30 AM - 9:30 AM",
    status: "Served",
    calories: "380 kcal",
    photoUrl: "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=300&auto=format&fit=crop&q=80",
    takesCount: 312,
  },
  {
    id: "m-2",
    type: "Lunch",
    items: "Steamed Rice, Dal Tadka, Aloo Gobi, Curd & Roasted Papad",
    timing: "12:30 PM - 2:30 PM",
    status: "Ongoing",
    calories: "650 kcal",
    photoUrl: "https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=300&auto=format&fit=crop&q=80",
    takesCount: 420,
  },
  {
    id: "m-3",
    type: "Snacks",
    items: "Veg Poha, Samosa & Hot Masala Tea / Coffee",
    timing: "5:00 PM - 6:00 PM",
    status: "Upcoming",
    calories: "280 kcal",
    photoUrl: "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&auto=format&fit=crop&q=80",
    takesCount: 260,
  },
  {
    id: "m-4",
    type: "Dinner",
    items: "Butter Roti, Paneer Butter Masala, Jeera Rice & Gulab Jamun",
    timing: "7:30 PM - 9:30 PM",
    status: "Upcoming",
    calories: "540 kcal",
    photoUrl: "https://images.unsplash.com/photo-1601050690597-df0568f70950?w=300&auto=format&fit=crop&q=80",
    takesCount: 395,
  },
];

const DEFAULT_SPECIAL_NOTE: SpecialNote = {
  text: "🎉 Festival Special: Fresh Paneer Butter Masala & Hot Gulab Jamun served tonight for all students and staff!",
  updatedAt: "Today, 10:00 AM",
  updatedBy: "Mess Manager",
};

/**
 * 1. Subscribe to Live Mess Menu & Timings across all dashboards
 */
export function subscribeMessMenu(
  callback: (data: { meals: UnifiedMeal[]; specialNote: SpecialNote | null }) => void
) {
  const menuDocRef = doc(db, "system", "messMenu");

  return onSnapshot(
    menuDocRef,
    async (snap) => {
      if (!snap.exists()) {
        // Seed default if not yet created in Firestore
        try {
          await setDoc(menuDocRef, {
            breakfast: DEFAULT_MEALS[0].items,
            breakfastTime: DEFAULT_MEALS[0].timing,
            breakfastStatus: DEFAULT_MEALS[0].status,
            breakfastTakes: DEFAULT_MEALS[0].takesCount,

            lunch: DEFAULT_MEALS[1].items,
            lunchTime: DEFAULT_MEALS[1].timing,
            lunchStatus: DEFAULT_MEALS[1].status,
            lunchTakes: DEFAULT_MEALS[1].takesCount,

            snacks: DEFAULT_MEALS[2].items,
            snacksTime: DEFAULT_MEALS[2].timing,
            snacksStatus: DEFAULT_MEALS[2].status,
            snacksTakes: DEFAULT_MEALS[2].takesCount,

            dinner: DEFAULT_MEALS[3].items,
            dinnerTime: DEFAULT_MEALS[3].timing,
            dinnerStatus: DEFAULT_MEALS[3].status,
            dinnerTakes: DEFAULT_MEALS[3].takesCount,

            specialNote: DEFAULT_SPECIAL_NOTE.text,
            specialNoteUpdatedAt: DEFAULT_SPECIAL_NOTE.updatedAt,
            specialNoteUpdatedBy: DEFAULT_SPECIAL_NOTE.updatedBy,

            updatedAt: serverTimestamp(),
            lastUpdatedBy: "Mess Manager",
          });
        } catch (_) {}

        callback({ meals: DEFAULT_MEALS, specialNote: DEFAULT_SPECIAL_NOTE });
        return;
      }

      const d = snap.data();
      const meals: UnifiedMeal[] = [
        {
          id: "m-1",
          type: "Breakfast",
          items: d.breakfast || DEFAULT_MEALS[0].items,
          timing: d.breakfastTime || DEFAULT_MEALS[0].timing,
          status: (d.breakfastStatus as any) || DEFAULT_MEALS[0].status,
          calories: d.breakfastCalories || DEFAULT_MEALS[0].calories,
          photoUrl: DEFAULT_MEALS[0].photoUrl,
          takesCount: d.breakfastTakes ?? DEFAULT_MEALS[0].takesCount,
        },
        {
          id: "m-2",
          type: "Lunch",
          items: d.lunch || DEFAULT_MEALS[1].items,
          timing: d.lunchTime || DEFAULT_MEALS[1].timing,
          status: (d.lunchStatus as any) || DEFAULT_MEALS[1].status,
          calories: d.lunchCalories || DEFAULT_MEALS[1].calories,
          photoUrl: DEFAULT_MEALS[1].photoUrl,
          takesCount: d.lunchTakes ?? DEFAULT_MEALS[1].takesCount,
        },
        {
          id: "m-3",
          type: "Snacks",
          items: d.snacks || DEFAULT_MEALS[2].items,
          timing: d.snacksTime || DEFAULT_MEALS[2].timing,
          status: (d.snacksStatus as any) || DEFAULT_MEALS[2].status,
          calories: d.snacksCalories || DEFAULT_MEALS[2].calories,
          photoUrl: DEFAULT_MEALS[2].photoUrl,
          takesCount: d.snacksTakes ?? DEFAULT_MEALS[2].takesCount,
        },
        {
          id: "m-4",
          type: "Dinner",
          items: d.dinner || DEFAULT_MEALS[3].items,
          timing: d.dinnerTime || DEFAULT_MEALS[3].timing,
          status: (d.dinnerStatus as any) || DEFAULT_MEALS[3].status,
          calories: d.dinnerCalories || DEFAULT_MEALS[3].calories,
          photoUrl: DEFAULT_MEALS[3].photoUrl,
          takesCount: d.dinnerTakes ?? DEFAULT_MEALS[3].takesCount,
        },
      ];

      const specialNote: SpecialNote | null = d.specialNote
        ? {
            text: d.specialNote,
            updatedAt: d.specialNoteUpdatedAt || "Today",
            updatedBy: d.specialNoteUpdatedBy || "Mess Manager",
          }
        : null;

      callback({ meals, specialNote });
    },
    (err: any) => {
      if (err?.code !== "permission-denied") {
        console.warn("Mess Menu listener warning:", err);
      }
      callback({ meals: DEFAULT_MEALS, specialNote: DEFAULT_SPECIAL_NOTE });
    }
  );
}

/**
 * 2. Update Meal Items and Timings (MESS MANAGER ONLY)
 */
export async function updateMealByMessManager(
  mealType: "Breakfast" | "Lunch" | "Snacks" | "Dinner",
  updates: {
    items: string;
    timing: string;
    status: "Served" | "Ongoing" | "Upcoming";
    calories?: string;
  }
) {
  const menuDocRef = doc(db, "system", "messMenu");
  const keyPrefix = mealType.toLowerCase();

  await updateDoc(menuDocRef, {
    [keyPrefix]: updates.items,
    [`${keyPrefix}Time`]: updates.timing,
    [`${keyPrefix}Status`]: updates.status,
    [`${keyPrefix}Calories`]: updates.calories || "",
    updatedAt: serverTimestamp(),
    lastUpdatedBy: "Mess Manager",
  });

  // Broadcast alert to users of updated meal
  try {
    await addDoc(collection(db, "notifications"), {
      title: `🍛 Mess Menu Updated: ${mealType}`,
      message: `${mealType} items: ${updates.items}. Timing: ${updates.timing}. Status: ${updates.status}.`,
      type: "mess",
      target: "All",
      senderRole: "mess_manager",
      createdAt: serverTimestamp(),
    });
  } catch (_) {}
}

/**
 * 3. Update Special Note (MESS MANAGER ONLY)
 */
export async function updateSpecialNoteByMessManager(noteText: string) {
  const menuDocRef = doc(db, "system", "messMenu");
  const nowStr = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

  await updateDoc(menuDocRef, {
    specialNote: noteText.trim(),
    specialNoteUpdatedAt: `Today, ${nowStr}`,
    specialNoteUpdatedBy: "Mess Manager",
    updatedAt: serverTimestamp(),
  });

  // Broadcast notification about special note
  try {
    await addDoc(collection(db, "notifications"), {
      title: "⭐ Mess Special Note",
      message: noteText.trim(),
      type: "mess",
      target: "All",
      senderRole: "mess_manager",
      createdAt: serverTimestamp(),
    });
  } catch (_) {}
}

/**
 * 4. Submit Admin Suggestion for Mess Manager (ADMIN CANNOT EDIT, BUT GIVES SUGGESTION)
 */
export async function sendAdminSuggestion(suggestionText: string, mealType = "General", adminName = "Admin") {
  const docRef = await addDoc(collection(db, "mess_suggestions"), {
    suggestion: suggestionText.trim(),
    mealType,
    adminName,
    status: "Pending",
    date: new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    createdAt: serverTimestamp(),
  });

  // Send direct urgent notification to Mess Manager
  try {
    await addDoc(collection(db, "notifications"), {
      title: `💡 Admin Suggestion for Mess: ${mealType}`,
      message: `Admin suggestion: "${suggestionText.trim()}". Please review and adjust kitchen schedule.`,
      type: "mess_suggestion",
      targetRole: "mess_manager",
      suggestionId: docRef.id,
      createdAt: serverTimestamp(),
    });
  } catch (_) {}

  return docRef.id;
}

/**
 * 5. Subscribe to Admin Suggestions (for Mess Manager and Admin)
 */
export function subscribeAdminSuggestions(callback: (items: AdminSuggestion[]) => void) {
  const q = query(collection(db, "mess_suggestions"), orderBy("createdAt", "desc"));

  return onSnapshot(
    q,
    (snap) => {
      const list: AdminSuggestion[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          suggestion: data.suggestion || "",
          mealType: data.mealType || "General",
          adminName: data.adminName || "Admin",
          status: data.status || "Pending",
          createdAt: data.createdAt,
          date: data.date || "Today",
        };
      });
      callback(list);
    },
    (err: any) => {
      if (err?.code !== "permission-denied") {
        console.warn("Admin suggestions listener warning:", err);
      }
      callback([]);
    }
  );
}

/**
 * 6. Admin Action on Mess (e.g. Request Revision, Order Inspection, Quality Warning)
 */
export async function takeAdminActionOnMess(
  actionType: "Request Revision" | "Order Inspection" | "Issue Quality Warning" | "Approve Menu",
  note: string
) {
  const actionDoc = await addDoc(collection(db, "mess_actions"), {
    actionType,
    note: note.trim(),
    status: "Active",
    adminName: "Campus Administration",
    createdAt: serverTimestamp(),
  });

  // Notify Mess Manager of high-priority action
  try {
    await addDoc(collection(db, "notifications"), {
      title: `⚠️ Admin Action: ${actionType}`,
      message: note.trim() || `Administration has ordered: ${actionType} regarding the dining service.`,
      type: "urgent_task",
      targetRole: "mess_manager",
      createdAt: serverTimestamp(),
    });
  } catch (_) {}

  return actionDoc.id;
}

/**
 * 7. Take Food / Opt-in Toggle (Every Role User: Student, Teacher, Staff)
 */
export async function toggleTakeFood(
  mealType: "Breakfast" | "Lunch" | "Snacks" | "Dinner",
  userId: string,
  userName: string,
  userRole: string
) {
  const todayKey = new Date().toISOString().split("T")[0];
  const optInDocId = `${todayKey}_${userId}_${mealType}`;
  const optInDocRef = doc(db, "meal_optins", optInDocId);

  const existing = await getDoc(optInDocRef);
  const isTaking = !existing.exists();

  const menuDocRef = doc(db, "system", "messMenu");
  const takesFieldKey = `${mealType.toLowerCase()}Takes`;

  if (isTaking) {
    // Add opt in
    await setDoc(optInDocRef, {
      userId,
      userName,
      userRole,
      meal: mealType,
      date: todayKey,
      timestamp: serverTimestamp(),
    });

    const menuSnap = await getDoc(menuDocRef);
    const currCount = menuSnap.exists() ? menuSnap.data()[takesFieldKey] || 0 : 0;
    await updateDoc(menuDocRef, {
      [takesFieldKey]: currCount + 1,
    });
  } else {
    // Remove opt in
    await deleteDoc(optInDocRef);

    const menuSnap = await getDoc(menuDocRef);
    const currCount = menuSnap.exists() ? menuSnap.data()[takesFieldKey] || 1 : 1;
    await updateDoc(menuDocRef, {
      [takesFieldKey]: Math.max(0, currCount - 1),
    });
  }

  return isTaking;
}

/**
 * Check if specific user has marked "Take Food" for today
 */
export async function checkUserMealOptIn(userId: string, mealType: string): Promise<boolean> {
  const todayKey = new Date().toISOString().split("T")[0];
  const optInDocId = `${todayKey}_${userId}_${mealType}`;
  const optInDocRef = doc(db, "meal_optins", optInDocId);
  const snap = await getDoc(optInDocRef);
  return snap.exists();
}

/**
 * 8. Submit Food Feedback (Every Role User can submit feedback)
 */
export async function submitFoodFeedback(data: {
  userId?: string;
  userEmail?: string;
  userName: string;
  userRole: string;
  meal: string;
  rating: number;
  tasteRating?: number;
  hygieneRating?: number;
  comment: string;
}) {
  const dateStr = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const docRef = await addDoc(collection(db, "mess_feedback"), {
    ...data,
    date: dateStr,
    status: "Pending",
    createdAt: serverTimestamp(),
  });

  // Dual-dispatch notifications: To Mess Manager and Administration
  try {
    await notifyMessManager(
      `🍽️ New Mess Feedback: ${data.meal} (${data.rating}★)`,
      `Feedback from ${data.userName} (${data.userRole}): "${data.comment}"`,
      "mess",
      { feedbackId: docRef.id, meal: data.meal, rating: data.rating }
    );
  } catch (_) {}

  try {
    await notifyAdmin(
      `🍽️ New Mess Feedback: ${data.meal} (${data.rating}★)`,
      `Feedback from ${data.userName} (${data.userRole}): "${data.comment}"`,
      "mess",
      { feedbackId: docRef.id, meal: data.meal, rating: data.rating }
    );
  } catch (_) {}

  return docRef.id;
}

/**
 * 9. Subscribe to Food Feedback Feed (Admin Dashboard & Mess Manager)
 */
export function subscribeFoodFeedback(callback: (items: FoodFeedback[]) => void) {
  const q = query(collection(db, "mess_feedback"), orderBy("createdAt", "desc"));

  return onSnapshot(
    q,
    (snap) => {
      const list: FoodFeedback[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          userId: data.userId || "",
          userName: data.userName || data.studentName || "Campus User",
          userRole: data.userRole || "student",
          meal: data.meal || "Lunch",
          rating: data.rating || 5,
          tasteRating: data.tasteRating || data.rating || 5,
          hygieneRating: data.hygieneRating || 5,
          comment: data.comment || data.feedback || "Food was good.",
          date: data.date || "Today",
          status: data.status || "Pending",
          adminActionNote: data.adminActionNote,
          createdAt: data.createdAt,
        };
      });
      callback(list);
    },
    (err: any) => {
      if (err?.code !== "permission-denied") {
        console.warn("Food feedback listener warning:", err);
      }
      callback([]);
    }
  );
}

/**
 * 10. Admin or Mess Manager Action on a specific feedback item
 */
export async function takeActionOnFeedback(feedbackId: string, actionNote: string) {
  const fbRef = doc(db, "mess_feedback", feedbackId);
  const snap = await getDoc(fbRef);
  await updateDoc(fbRef, {
    status: "Action Taken",
    adminActionNote: actionNote.trim(),
    actionTakenAt: serverTimestamp(),
  });

  if (snap.exists()) {
    const data = snap.data();
    const recipient = data.userEmail || data.studentEmail || data.userId || data.studentId;
    if (recipient) {
      try {
        await notifyStudent(
          recipient,
          `🍽️ Mess Feedback Update: ${data.meal || "Mess Issue"}`,
          `Your mess feedback has been addressed: "${actionNote.trim()}"`,
          "mess",
          { feedbackId, meal: data.meal }
        );
      } catch (_) {}
    }
  }
}

/**
 * 11. AI Assistant for Mess (Answers meal items, timings, nutrition, special notes)
 */
export function getMessAiResponse(
  userQuery: string,
  meals: UnifiedMeal[],
  specialNote: SpecialNote | null,
  feedbackCount: number
): string {
  const q = userQuery.toLowerCase();

  if (q.includes("special") || q.includes("note")) {
    return specialNote
      ? `⭐ Today's Special Note: "${specialNote.text}" (Updated by ${specialNote.updatedBy}).`
      : "There is no special note posted by the Mess Manager today.";
  }

  if (q.includes("breakfast")) {
    const b = meals.find((m) => m.type === "Breakfast");
    return b
      ? `🥞 Breakfast: ${b.items}.\nTiming: ${b.timing} (Status: ${b.status}). Estimated ${b.calories || "380 kcal"}. ${b.takesCount} users opted in.`
      : "Breakfast details not available.";
  }

  if (q.includes("lunch")) {
    const l = meals.find((m) => m.type === "Lunch");
    return l
      ? `🍛 Lunch: ${l.items}.\nTiming: ${l.timing} (Status: ${l.status}). Estimated ${l.calories || "650 kcal"}. ${l.takesCount} users opted in.`
      : "Lunch details not available.";
  }

  if (q.includes("dinner")) {
    const d = meals.find((m) => m.type === "Dinner");
    return d
      ? `🍲 Dinner: ${d.items}.\nTiming: ${d.timing} (Status: ${d.status}). Estimated ${d.calories || "540 kcal"}. ${d.takesCount} users opted in.`
      : "Dinner details not available.";
  }

  if (q.includes("time") || q.includes("timing") || q.includes("schedule")) {
    return `🕒 Today's Dining Schedule:\n• Breakfast: ${meals[0]?.timing || "7:30 AM - 9:30 AM"}\n• Lunch: ${meals[1]?.timing || "12:30 PM - 2:30 PM"}\n• Snacks: ${meals[2]?.timing || "5:00 PM - 6:00 PM"}\n• Dinner: ${meals[3]?.timing || "7:30 PM - 9:30 PM"}`;
  }

  if (q.includes("headcount") || q.includes("opt") || q.includes("take")) {
    return `📊 Today's "Take Food" Opt-ins:\n• Breakfast: ${meals[0]?.takesCount || 0} students\n• Lunch: ${meals[1]?.takesCount || 0} students\n• Snacks: ${meals[2]?.takesCount || 0} students\n• Dinner: ${meals[3]?.takesCount || 0} students`;
  }

  if (q.includes("feedback") || q.includes("rating")) {
    return `⭐ Feedback Overview: There are ${feedbackCount} recent reviews submitted across students and staff. You can view all ratings and take action in the Feedback section.`;
  }

  return `🍽️ Today's Central Dining Overview:\n• Breakfast: ${meals[0]?.items} (${meals[0]?.timing})\n• Lunch: ${meals[1]?.items} (${meals[1]?.timing})\n• Dinner: ${meals[3]?.items} (${meals[3]?.timing})\n${specialNote ? `\n⭐ Note: "${specialNote.text}"` : ""}`;
}
