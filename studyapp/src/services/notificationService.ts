import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { Alert, Platform } from "react-native";
import { auth, db } from "../firebase/config";
import { getApiUrl } from "../api";
import { parseNameAndRoleFromEmail } from "../utils/userEmailParser";

export interface CampusNotification {
  id: string;
  title: string;
  body: string;
  type:
    | "notice"
    | "certificate"
    | "fee"
    | "hostel"
    | "mess"
    | "attendance"
    | "leave"
    | "gate_pass"
    | "general";
  category?: string;
  target?: "All Students" | "Hostel Students" | "Faculty" | "Specific" | "All";
  targetHostel?: string | null;
  // Sender info (for Outgoing / Going notifications)
  senderId?: string | null;
  senderName?: string;
  senderEmail?: string | null;
  senderRole?: string | null;
  // Recipient info (for Incoming / Coming notifications)
  studentId?: string | null;
  studentEmail?: string | null;
  status?: "sent" | "delivered" | "read";
  data?: Record<string, any>;
  readBy?: string[];
  createdAt?: any;
  date?: string;
  isOutgoing?: boolean;
}

/**
 * Helper to sync notification to MongoDB backend
 */
async function syncToMongoDB(payload: Record<string, any>) {
  try {
    const baseUrl = getApiUrl();
    const res = await fetch(`${baseUrl}/api/notifications`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (err: any) {
    console.warn("MongoDB notification sync fallback:", err?.message);
    return null;
  }
}

/**
 * Broadcast notification for notices, college-wide announcements, or hostel students
 * Stores in Firestore AND MongoDB, and tracks both outgoing (for sender) and incoming (for recipients).
 */
export async function sendBroadcastNotification({
  title,
  body,
  message,
  type = "notice",
  category = "General",
  target = "All Students",
  targetHostel = null,
  senderId,
  senderName = "Campus Administration",
  senderEmail,
  senderRole = "admin",
  actionRoute,
  metadata,
  data = {},
  showSuccessAlert = true,
}: {
  title: string;
  body?: string;
  message?: string;
  type?:
    | "notice"
    | "certificate"
    | "fee"
    | "hostel"
    | "mess"
    | "attendance"
    | "leave"
    | "gate_pass"
    | "general";
  category?: string;
  target?: "All Students" | "Hostel Students" | "Faculty" | "Specific" | "All";
  targetHostel?: string | null;
  senderId?: string | null;
  senderName?: string;
  senderEmail?: string | null;
  senderRole?: string | null;
  actionRoute?: string;
  metadata?: Record<string, any>;
  data?: Record<string, any>;
  showSuccessAlert?: boolean;
}): Promise<string> {
  try {
    const content = body || message || "";
    const mergedData = { ...data, ...(metadata || {}), ...(actionRoute ? { actionRoute } : {}) };
    const todayStr = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const notifPayload = {
      title,
      body: content,
      message: content,
      type,
      category,
      target,
      targetHostel,
      senderId: senderId || null,
      senderName,
      senderEmail: (senderEmail || "").toLowerCase(),
      senderRole: senderRole || "admin",
      data: mergedData,
      status: "sent",
      readBy: [],
      date: todayStr,
      createdAt: serverTimestamp(),
    };

    // 1. Store in Firestore
    const docRef = await addDoc(collection(db, "notifications"), notifPayload);

    // 2. Store in MongoDB database
    await syncToMongoDB({
      ...notifPayload,
      createdAt: new Date(),
    });

    // 3. Record in central activities feed
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

    // 4. Show success confirmation
    if (showSuccessAlert) {
      const targetLabel = targetHostel ? `Hostel ${targetHostel}` : target;
      Alert.alert(
        "Notification Sent Successfully! 🚀",
        `"${title}" was successfully broadcast to ${targetLabel}. Saved in MongoDB & Firebase.`
      );
    }

    return docRef.id;
  } catch (err: any) {
    console.warn("sendBroadcastNotification error:", err?.message);
    throw err;
  }
}

/**
 * Send a targeted notification specifically to a student (e.g. certificate issued, fee paid, pass approved)
 * Stores in Firestore AND MongoDB, and tracks both outgoing and incoming.
 */
export async function sendStudentNotification(
  studentIdOrOptions:
    | string
    | {
        studentId?: string | null;
        studentEmail?: string | null;
        title: string;
        body?: string;
        message?: string;
        type?:
          | "notice"
          | "certificate"
          | "fee"
          | "hostel"
          | "mess"
          | "attendance"
          | "leave"
          | "gate_pass"
          | "general";
        category?: string;
        senderId?: string | null;
        senderName?: string;
        senderEmail?: string | null;
        senderRole?: string | null;
        actionRoute?: string;
        metadata?: Record<string, any>;
        data?: Record<string, any>;
        showSuccessAlert?: boolean;
      },
  titleArg?: string,
  bodyArg?: string,
  typeArg?: any
): Promise<string> {
  const options: Record<string, any> =
    typeof studentIdOrOptions === "string"
      ? {
          studentId: studentIdOrOptions,
          title: titleArg || "",
          body: bodyArg || "",
          type: typeArg || "general",
        }
      : studentIdOrOptions;

  const {
    studentId,
    studentEmail,
    title,
    body,
    message,
    type = "general",
    category = "Academic",
    senderId,
    senderName = "Faculty / Administration",
    senderEmail,
    senderRole = "admin",
    actionRoute,
    metadata,
    data = {},
    showSuccessAlert = true,
  } = options;

  try {
    const content = body || message || "";
    const mergedData = { ...data, ...(metadata || {}), ...(actionRoute ? { actionRoute } : {}) };
    const todayStr = new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

    const notifPayload = {
      title,
      body: content,
      message: content,
      type,
      category,
      target: "Specific",
      studentId: studentId || null,
      studentEmail: studentEmail ? studentEmail.toLowerCase() : null,
      senderId: senderId || null,
      senderName,
      senderEmail: (senderEmail || "").toLowerCase(),
      senderRole,
      data: mergedData,
      status: "sent",
      readBy: [],
      date: todayStr,
      createdAt: serverTimestamp(),
    };

    // 1. Store in Firestore
    const docRef = await addDoc(collection(db, "notifications"), notifPayload);

    // 2. Store in MongoDB database
    await syncToMongoDB({
      ...notifPayload,
      createdAt: new Date(),
    });

    // 3. Show success confirmation
    if (showSuccessAlert) {
      Alert.alert(
        "Notification Sent Successfully! 🚀",
        `Direct notification sent to ${studentEmail || "student"}. Saved in MongoDB & Firebase.`
      );
    }

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
      status: "read",
    });

    // Also inform MongoDB
    try {
      const baseUrl = getApiUrl();
      await fetch(`${baseUrl}/api/notifications/${notificationId}/read`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIdentifier }),
      });
    } catch (_) {}
  } catch (err: any) {
    console.warn("markNotificationAsRead error:", err?.message);
  }
}

/**
 * Real-time listener partitioned into incoming ("coming") and outgoing ("going")
 */
export function listenUserNotificationsWithDirection(
  userUid: string | null,
  userEmail: string | null,
  isHostelResident: boolean,
  callback: (data: {
    incoming: CampusNotification[];
    outgoing: CampusNotification[];
    all: CampusNotification[];
  }) => void
): () => void {
  if (!auth.currentUser && !userUid) {
    callback({ incoming: [], outgoing: [], all: [] });
    return () => {};
  }

  const q = query(collection(db, "notifications"), orderBy("createdAt", "desc"));

  return onSnapshot(
    q,
    (snapshot) => {
      const normalizedEmail = (userEmail || "").trim().toLowerCase();
      const incoming: CampusNotification[] = [];
      const outgoing: CampusNotification[] = [];
      const all: CampusNotification[] = [];

      const userRole = parseNameAndRoleFromEmail(userEmail).role;

      snapshot.docs.forEach((d) => {
        const data = d.data();
        const target = data.target || "All Students";
        const nStudentEmail = (data.studentEmail || "").toLowerCase();
        const nStudentId = data.studentId;
        const nSenderEmail = (data.senderEmail || "").toLowerCase();
        const nSenderId = data.senderId;
        const nTarget = String(target || "");
        const nTargetRole = String(data.targetRole || data.data?.targetRole || "").toLowerCase();
        const nType = String(data.type || "").toLowerCase();
        const nCategory = String(data.category || "").toLowerCase();

        // Check if outgoing (Sent by current user)
        const isSentByMe = Boolean(
          (userUid && nSenderId === userUid) ||
          (normalizedEmail && nSenderEmail === normalizedEmail)
        );

        // Check if incoming (Targeted to current user)
        let isReceivedByMe = false;

        // Targeted directly to specific student/user
        if (
          (userUid && nStudentId === userUid) ||
          (normalizedEmail && nStudentEmail === normalizedEmail)
        ) {
          isReceivedByMe = true;
        } else if (userRole === "admin") {
          // Admin oversees all broadcasts, admin notifications, hostel requests, complaints, and mess feedback
          isReceivedByMe =
            nTarget === "All" ||
            nTarget.toLowerCase() === "admin" ||
            nTargetRole === "admin" ||
            nCategory === "hostel" ||
            nCategory === "mess" ||
            nCategory === "admin" ||
            nType === "leave" ||
            nType === "complaint";
        } else if (userRole === "hostel_manager") {
          isReceivedByMe =
            nTarget === "Hostel Manager" ||
            nTarget.toLowerCase() === "hostel" ||
            nTargetRole === "hostel_manager" ||
            nTargetRole === "hostel" ||
            nCategory === "hostel" ||
            nType === "hostel" ||
            nType === "leave" ||
            nType === "gate_pass";
        } else if (userRole === "mess_manager") {
          isReceivedByMe =
            nTarget === "Mess Manager" ||
            nTarget.toLowerCase() === "mess" ||
            nTargetRole === "mess_manager" ||
            nTargetRole === "mess" ||
            nCategory === "mess" ||
            nType === "mess";
        } else {
          // Student role
          isReceivedByMe =
            nTarget === "All Students" ||
            nTarget === "All" ||
            (nTarget === "Hostel Students" && isHostelResident) ||
            nTargetRole === "student";
        }

        const item: CampusNotification = {
          id: d.id,
          title: data.title || "Notification",
          body: data.body || data.message || "",
          type: data.type || "general",
          category: data.category || "General",
          target: data.target,
          targetHostel: data.targetHostel,
          senderId: data.senderId,
          senderName: data.senderName,
          senderEmail: data.senderEmail,
          senderRole: data.senderRole,
          studentId: data.studentId,
          studentEmail: data.studentEmail,
          status: data.status || "sent",
          data: data.data || {},
          readBy: Array.isArray(data.readBy) ? data.readBy : [],
          date: data.date || "Today",
          createdAt: data.createdAt,
          isOutgoing: isSentByMe,
        };

        if (isSentByMe) {
          outgoing.push(item);
        }
        if (isReceivedByMe && (!isSentByMe || data.studentEmail === normalizedEmail)) {
          incoming.push(item);
        }
        if (isSentByMe || isReceivedByMe) {
          all.push(item);
        }
      });

      callback({ incoming, outgoing, all });
    },
    (err) => {
      if (err?.code !== "permission-denied") {
        console.warn("listenUserNotificationsWithDirection error:", err?.message);
      }
      callback({ incoming: [], outgoing: [], all: [] });
    }
  );
}

/**
 * Backwards compatibility for existing listenUserNotifications
 */
export function listenUserNotifications(
  userUid: string | null,
  userEmail: string | null,
  isHostelResident: boolean,
  callback: (notifications: CampusNotification[]) => void
): () => void {
  return listenUserNotificationsWithDirection(
    userUid,
    userEmail,
    isHostelResident,
    ({ incoming }) => callback(incoming)
  );
}

export async function notifyUser(
  titleOrPayload:
    | string
    | {
        studentEmail?: string;
        title: string;
        body: string;
        category?: string;
        type?: any;
        senderRole?: string;
        metadata?: Record<string, any>;
      },
  maybeBody?: string,
  maybeRoleOrType?: string
) {
  if (typeof titleOrPayload === "string") {
    const title = titleOrPayload;
    const body = maybeBody || "";
    const role = maybeRoleOrType || "admin";
    return sendBroadcastNotification({
      title,
      body,
      category: "General",
      type: "general",
      senderRole: role,
      showSuccessAlert: false,
    });
  }

  const {
    studentEmail,
    title,
    body,
    category = "General",
    type = "general",
    senderRole = "admin",
    metadata,
  } = titleOrPayload;

  if (studentEmail) {
    return sendStudentNotification({
      studentEmail,
      title,
      body,
      category,
      type: type || "general",
      senderRole: senderRole || "admin",
      metadata,
      showSuccessAlert: false,
    });
  } else {
    return sendBroadcastNotification({
      title,
      body,
      category,
      type: type || "general",
      senderRole: senderRole || "admin",
      metadata,
      showSuccessAlert: false,
    });
  }
}

export async function notifyHostelManager(
  title: string,
  body: string,
  type: any = "hostel",
  metadata: Record<string, any> = {}
) {
  return sendBroadcastNotification({
    title,
    body,
    type,
    category: "Hostel",
    target: "Specific",
    senderRole: "system",
    metadata: { ...metadata, targetRole: "hostel_manager" },
    showSuccessAlert: false,
  });
}

export async function notifyAdmin(
  title: string,
  body: string,
  type: any = "general",
  metadata: Record<string, any> = {}
) {
  return sendBroadcastNotification({
    title,
    body,
    type,
    category: "Admin",
    target: "Specific",
    senderRole: "system",
    metadata: { ...metadata, targetRole: "admin" },
    showSuccessAlert: false,
  });
}

export async function notifyMessManager(
  title: string,
  body: string,
  type: any = "mess",
  metadata: Record<string, any> = {}
) {
  return sendBroadcastNotification({
    title,
    body,
    type,
    category: "Mess",
    target: "Specific",
    senderRole: "system",
    metadata: { ...metadata, targetRole: "mess_manager" },
    showSuccessAlert: false,
  });
}

export async function notifyStudent(
  studentEmailOrId: string,
  title: string,
  body: string,
  type: any = "general",
  metadata: Record<string, any> = {}
) {
  const isEmail = typeof studentEmailOrId === "string" && studentEmailOrId.includes("@");
  return sendStudentNotification({
    studentEmail: isEmail ? studentEmailOrId : (metadata.studentEmail || undefined),
    studentId: !isEmail ? studentEmailOrId : (metadata.studentId || undefined),
    title,
    body,
    type,
    category: metadata.category || "General",
    senderRole: "system",
    metadata,
    showSuccessAlert: false,
  });
}

export const notificationService = {
  sendNotification: async ({
    title,
    body,
    role,
    targetRoles,
    category,
    metadata,
  }: {
    title: string;
    body: string;
    role?: string;
    targetRoles?: string[];
    category?: string;
    metadata?: Record<string, any>;
  }) => {
    return sendBroadcastNotification({
      title,
      body,
      category: category || "General",
      senderRole: role || "admin",
      metadata,
      showSuccessAlert: false,
    });
  },
  sendBroadcastNotification,
  sendStudentNotification,
  notifyUser,
  notifyHostelManager,
  notifyAdmin,
  notifyMessManager,
  notifyStudent,
  markNotificationAsRead,
  listenUserNotificationsWithDirection,
  listenUserNotifications,
};

export default notificationService;
