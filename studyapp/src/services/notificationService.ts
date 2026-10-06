import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "../firebase/config";

export interface CampusNotification {
  id: string;
  title: string;
  body: string;
  type: "notice" | "certificate" | "fee" | "hostel" | "mess" | "attendance" | "general";
  category?: string;
  target?: "All Students" | "Hostel Students" | "Faculty" | "Specific";
  targetHostel?: string | null;
  studentId?: string | null;
  studentEmail?: string | null;
  senderName?: string;
  data?: Record<string, any>;
  readBy?: string[];
  createdAt?: any;
  date?: string;
}

/**
 * Broadcast notification for notices, college-wide announcements, or hostel students
 */
export async function sendBroadcastNotification({
  title,
  body,
  message,
  type = "notice",
  category = "General",
  target = "All Students",
  targetHostel = null,
  senderName = "Campus Administration",
  actionRoute,
  metadata,
  data = {},
}: {
  title: string;
  body?: string;
  message?: string;
  type?: "notice" | "certificate" | "fee" | "hostel" | "mess" | "attendance" | "general";
  category?: string;
  target?: "All Students" | "Hostel Students" | "Faculty" | "Specific";
  targetHostel?: string | null;
  senderName?: string;
  actionRoute?: string;
  metadata?: Record<string, any>;
  data?: Record<string, any>;
}): Promise<string> {
  try {
    const content = body || message || "";
    const mergedData = { ...data, ...(metadata || {}), ...(actionRoute ? { actionRoute } : {}) };
    const todayStr = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const docRef = await addDoc(collection(db, "notifications"), {
      title,
      body: content,
      type,
      category,
      target,
      targetHostel,
      senderName,
      data: mergedData,
      readBy: [],
      date: todayStr,
      createdAt: serverTimestamp(),
    });

    // Also record in central activities feed
    try {
      await addDoc(collection(db, "activities"), {
        title: `Notification: ${title}`,
        subtitle: content.slice(0, 60),
        category: category || "Notice",
        type: type,
        time: "Just now",
        createdAt: serverTimestamp(),
      });
    } catch (_) {}

    return docRef.id;
  } catch (err: any) {
    console.warn("sendBroadcastNotification error:", err?.message);
    throw err;
  }
}

/**
 * Send a targeted notification specifically to a student (e.g. certificate issued, fee paid)
 */
export async function sendStudentNotification({
  studentId,
  studentEmail,
  title,
  body,
  message,
  type = "general",
  category = "Academic",
  senderName = "Faculty / Administration",
  actionRoute,
  metadata,
  data = {},
}: {
  studentId?: string | null;
  studentEmail?: string | null;
  title: string;
  body?: string;
  message?: string;
  type?: "notice" | "certificate" | "fee" | "hostel" | "mess" | "attendance" | "general";
  category?: string;
  senderName?: string;
  actionRoute?: string;
  metadata?: Record<string, any>;
  data?: Record<string, any>;
}): Promise<string> {
  try {
    const content = body || message || "";
    const mergedData = { ...data, ...(metadata || {}), ...(actionRoute ? { actionRoute } : {}) };
    const todayStr = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const docRef = await addDoc(collection(db, "notifications"), {
      title,
      body: content,
      type,
      category,
      target: "Specific",
      studentId: studentId || null,
      studentEmail: studentEmail ? studentEmail.toLowerCase() : null,
      senderName,
      data: mergedData,
      readBy: [],
      date: todayStr,
      createdAt: serverTimestamp(),
    });

    return docRef.id;
  } catch (err: any) {
    console.warn("sendStudentNotification error:", err?.message);
    throw err;
  }
}

/**
 * Mark a notification as read by a specific user (UID or email)
 */
export async function markNotificationAsRead(
  notificationId: string,
  userIdentifier: string
): Promise<void> {
  try {
    const notifRef = doc(db, "notifications", notificationId);
    await updateDoc(notifRef, {
      readBy: [userIdentifier],
    });
  } catch (err: any) {
    console.warn("markNotificationAsRead error:", err?.message);
  }
}

/**
 * Real-time listener for notifications relevant to current user
 */
export function listenUserNotifications(
  userUid: string | null,
  userEmail: string | null,
  isHostelResident: boolean,
  callback: (notifications: CampusNotification[]) => void
): () => void {
  const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"));

  return onSnapshot(
    q,
    (snapshot) => {
      const normalizedEmail = (userEmail || "").trim().toLowerCase();
      const list: CampusNotification[] = [];

      snapshot.docs.forEach((d) => {
        const data = d.data();
        const target = data.target || "All Students";
        const nStudentEmail = (data.studentEmail || "").toLowerCase();
        const nStudentId = data.studentId;

        // Check if notification applies to this user:
        // 1. Target is "All Students" or "All"
        // 2. Specific to this student (by UID or email)
        // 3. Target is "Hostel Students" and user is a resident
        const isForMe =
          target === "All Students" ||
          target === "All" ||
          (target === "Hostel Students" && isHostelResident) ||
          (userUid && nStudentId === userUid) ||
          (normalizedEmail && nStudentEmail === normalizedEmail);

        if (isForMe) {
          list.push({
            id: d.id,
            title: data.title || "Notification",
            body: data.body || "",
            type: data.type || "general",
            category: data.category || "General",
            target: data.target,
            targetHostel: data.targetHostel,
            studentId: data.studentId,
            studentEmail: data.studentEmail,
            senderName: data.senderName,
            data: data.data || {},
            readBy: Array.isArray(data.readBy) ? data.readBy : [],
            date: data.date || "Today",
            createdAt: data.createdAt,
          });
        }
      });

      callback(list);
    },
    (err) => console.warn("listenUserNotifications error:", err?.message)
  );
}
