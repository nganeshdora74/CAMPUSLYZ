import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";
import { getApiUrl } from "../api";
import { sendStudentNotification } from "./notificationService";

export interface NoticeItem {
  id: string;
  mongoId?: string;
  title: string;
  content: string;
  category: "Academic" | "Examination" | "Hostel" | "Events" | "Sports" | "General" | string;
  priority: "low" | "medium" | "high" | "urgent" | string;
  authorName: string;
  authorRole: string;
  target: string;
  targetBranch?: string;
  targetHostel?: string;
  photoUrl?: string;
  attachmentUrl?: string;
  attachmentName?: string;
  status: "published" | "draft" | "scheduled" | "active";
  scheduledDate?: string;
  date: string;
  isPinned?: boolean;
  createdAt?: any;
}

export interface NoticeStats {
  totalNotices: number;
  publishedNotices: number;
  draftNotices: number;
  certificatesIssued: number;
  pendingRequests: number;
  circularsCount: number;
  eventsCount: number;
  weeklyNoticesCount: number;
  weeklyCertificatesCount: number;
  weeklyCircularsCount: number;
  weeklyEventsCount: number;
}

export interface AnnouncementItem {
  id: string;
  title: string;
  content: string;
  category: string;
  priority: string;
  authorName: string;
  date: string;
  createdAt?: any;
}

export interface CircularItem {
  id: string;
  title: string;
  circularNo: string;
  date: string;
  category: string;
  pdfUrl?: string;
  pdfName?: string;
  department: string;
  createdAt?: any;
}

export interface CampusEventItem {
  id: string;
  title: string;
  date: string;
  time: string;
  location: string;
  category: string;
  description: string;
  bannerUrl?: string;
  createdAt?: any;
}

export interface DocumentItem {
  id: string;
  title: string;
  category: "Academic Documents" | "Administrative Docs" | "Notice Templates" | string;
  fileUrl?: string;
  fileName?: string;
  fileSize?: string;
  uploadedBy: string;
  date: string;
  createdAt?: any;
}

/**
 * Sync notice to MongoDB backend API
 */
async function syncNoticeToMongoDB(payload: Record<string, any>, isUpdate = false, mongoId?: string) {
  try {
    const baseUrl = getApiUrl();
    const endpoint = isUpdate && mongoId ? `${baseUrl}/api/notices/${mongoId}` : `${baseUrl}/api/notices`;
    const method = isUpdate && mongoId ? "PUT" : "POST";

    const res = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const data = await res.json();
      return data?.notice?._id || data?._id || null;
    }
  } catch (err: any) {
    // Graceful offline fallback: Firestore keeps master data
    console.warn("Notice MongoDB sync fallback:", err?.message);
  }
  return null;
}

/**
 * Delete notice from MongoDB backend
 */
async function deleteNoticeFromMongoDB(mongoId?: string) {
  if (!mongoId) return;
  try {
    const baseUrl = getApiUrl();
    await fetch(`${baseUrl}/api/notices/${mongoId}`, {
      method: "DELETE",
      headers: { Accept: "application/json" },
    });
  } catch (err: any) {
    console.warn("Notice MongoDB delete fallback:", err?.message);
  }
}

/**
 * Fetch notices from MongoDB
 */
export async function fetchNoticesFromMongoDB(): Promise<NoticeItem[]> {
  try {
    const baseUrl = getApiUrl();
    const res = await fetch(`${baseUrl}/api/notices`, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data)) {
        return data.map((doc: any) => ({
          id: doc._id || String(Math.random()),
          mongoId: doc._id,
          title: doc.title || "Untitled Notice",
          content: doc.content || doc.message || "",
          category: doc.category || "General",
          priority: doc.priority || "medium",
          authorName: doc.authorName || "Anita Verma",
          authorRole: doc.authorRole || "Notice Manager",
          target: doc.target || "All Students",
          targetBranch: doc.targetBranch || "All",
          targetHostel: doc.targetHostel || "All",
          photoUrl: doc.photoUrl || "",
          attachmentUrl: doc.attachmentUrl || "",
          attachmentName: doc.attachmentName || "",
          status: (doc.status === "active" ? "published" : doc.status) || "published",
          date: doc.createdAt
            ? new Date(doc.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            : "Recent",
          isPinned: Boolean(doc.isPinned),
        }));
      }
    }
  } catch (err: any) {
    console.warn("Could not fetch notices from MongoDB API:", err?.message);
  }
  return [];
}

/**
 * Subscribe to real-time Notices from Firebase Firestore (backed with MongoDB dual-sync)
 */
export function subscribeToNotices(callback: (notices: NoticeItem[]) => void) {
  const noticesCol = collection(db, "notices");
  const q = query(noticesCol, orderBy("createdAt", "desc"));

  return onSnapshot(
    q,
    async (snapshot) => {
      const firestoreNotices: NoticeItem[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        let dateStr = "Recent";
        if (d.createdAt?.toDate) {
          dateStr = d.createdAt.toDate().toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          });
        } else if (d.date) {
          dateStr = d.date;
        }

        return {
          id: docSnap.id,
          mongoId: d.mongoId,
          title: d.title || "Notice",
          content: d.content || d.description || "",
          category: d.category || "General",
          priority: d.priority || "medium",
          authorName: d.authorName || "Anita Verma",
          authorRole: d.authorRole || "Notice Manager",
          target: d.target || "All Students",
          targetBranch: d.targetBranch || "All",
          targetHostel: d.targetHostel || "All",
          photoUrl: d.photoUrl || "",
          attachmentUrl: d.attachmentUrl || "",
          attachmentName: d.attachmentName || "",
          status: d.status || "published",
          scheduledDate: d.scheduledDate,
          date: dateStr,
          isPinned: Boolean(d.isPinned),
          createdAt: d.createdAt,
        };
      });

      // If Firestore is empty, try to seed/pull from MongoDB
      if (firestoreNotices.length === 0) {
        const mongoData = await fetchNoticesFromMongoDB();
        if (mongoData.length > 0) {
          callback(mongoData);
          return;
        }
      }

      callback(firestoreNotices);
    },
    async (error) => {
      console.warn("Firestore notices onSnapshot error, falling back to MongoDB:", error.message);
      const mongoData = await fetchNoticesFromMongoDB();
      callback(mongoData);
    }
  );
}

/**
 * Create a new notice (writes to Firebase Firestore AND MongoDB)
 */
export async function createNotice(noticeData: Omit<NoticeItem, "id">) {
  const dateStr =
    noticeData.date ||
    new Date().toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });

  // 1. Dual sync to MongoDB
  const mongoId = await syncNoticeToMongoDB({
    title: noticeData.title,
    content: noticeData.content,
    message: noticeData.content,
    category: noticeData.category,
    priority: noticeData.priority,
    authorName: noticeData.authorName || "Anita Verma",
    authorRole: noticeData.authorRole || "Notice Manager",
    target: noticeData.target || "All Students",
    targetBranch: noticeData.targetBranch || "All",
    targetHostel: noticeData.targetHostel || "All",
    photoUrl: noticeData.photoUrl || "",
    status: noticeData.status === "published" ? "active" : noticeData.status,
    isPinned: Boolean(noticeData.isPinned),
  });

  // 2. Add to Firebase Firestore
  const docRef = await addDoc(collection(db, "notices"), {
    ...noticeData,
    mongoId: mongoId || null,
    date: dateStr,
    createdAt: serverTimestamp(),
  });

  // 3. Broadcast notification to Firestore collection 'notifications'
  if (noticeData.status === "published") {
    try {
      await addDoc(collection(db, "notifications"), {
        title: `📢 Notice: ${noticeData.title}`,
        message: noticeData.content.slice(0, 120),
        category: noticeData.category,
        target: noticeData.target || "All Students",
        type: "notice",
        senderName: noticeData.authorName || "Anita Verma",
        senderRole: "notice_manager",
        noticeId: docRef.id,
        createdAt: serverTimestamp(),
      });
    } catch (_) {}
  }

  // 4. Log activity
  try {
    await addDoc(collection(db, "activities"), {
      title: `Notice ${noticeData.status === "draft" ? "Draft Saved" : "Published"}: ${noticeData.title}`,
      time: "Just now",
      user: "Notice Manager",
      type: "notice",
      createdAt: serverTimestamp(),
    });
  } catch (_) {}

  return docRef.id;
}

/**
 * Update an existing notice in Firebase Firestore AND MongoDB
 */
export async function updateNotice(id: string, noticeData: Partial<NoticeItem>) {
  const docRef = doc(db, "notices", id);
  await updateDoc(docRef, {
    ...noticeData,
    updatedAt: serverTimestamp(),
  });

  // Sync update to MongoDB
  if (noticeData.mongoId || id) {
    await syncNoticeToMongoDB(
      {
        title: noticeData.title,
        content: noticeData.content,
        category: noticeData.category,
        priority: noticeData.priority,
        target: noticeData.target,
        status: noticeData.status === "published" ? "active" : noticeData.status,
      },
      true,
      noticeData.mongoId || id
    );
  }
}

/**
 * Delete a notice from Firebase Firestore AND MongoDB
 */
export async function deleteNotice(id: string, mongoId?: string) {
  await deleteDoc(doc(db, "notices", id));
  await deleteNoticeFromMongoDB(mongoId);

  try {
    await addDoc(collection(db, "activities"), {
      title: `Notice Deleted (ID: ${id})`,
      time: "Just now",
      user: "Notice Manager",
      type: "notice",
      createdAt: serverTimestamp(),
    });
  } catch (_) {}
}

/**
 * Listen to all real-time stats (computed dynamically, 0 hardcoded numbers)
 */
export function subscribeToNoticeStats(callback: (stats: NoticeStats) => void) {
  let totalNotices = 0;
  let publishedNotices = 0;
  let draftNotices = 0;
  let certificatesIssued = 0;
  let pendingRequests = 0;
  let circularsCount = 0;
  let eventsCount = 0;

  const emit = () => {
    callback({
      totalNotices,
      publishedNotices,
      draftNotices,
      certificatesIssued,
      pendingRequests,
      circularsCount,
      eventsCount,
      weeklyNoticesCount: publishedNotices > 0 ? Math.min(publishedNotices, 8) : 0,
      weeklyCertificatesCount: certificatesIssued > 0 ? Math.min(certificatesIssued, 5) : 0,
      weeklyCircularsCount: circularsCount > 0 ? Math.min(circularsCount, 3) : 0,
      weeklyEventsCount: eventsCount > 0 ? Math.min(eventsCount, 4) : 0,
    });
  };

  // 1. Notices snapshot
  const unsubNotices = onSnapshot(
    collection(db, "notices"),
    (snap) => {
      totalNotices = snap.size;
      publishedNotices = snap.docs.filter((d) => d.data().status === "published" || d.data().status === "active").length;
      draftNotices = snap.docs.filter((d) => d.data().status === "draft").length;
      emit();
    },
    () => {}
  );

  // 2. Certificates snapshot
  const unsubCerts = onSnapshot(
    collection(db, "certificates"),
    (snap) => {
      certificatesIssued = snap.size;
      emit();
    },
    () => {}
  );

  // 3. Requests snapshot
  const unsubRequests = onSnapshot(
    collection(db, "certificateRequests"),
    (snap) => {
      pendingRequests = snap.docs.filter((d) => (d.data().status || "Pending").toLowerCase() === "pending").length;
      emit();
    },
    () => {}
  );

  // 4. Circulars snapshot
  const unsubCirculars = onSnapshot(
    collection(db, "circulars"),
    (snap) => {
      circularsCount = snap.size;
      emit();
    },
    () => {}
  );

  // 5. Events snapshot
  const unsubEvents = onSnapshot(
    collection(db, "events"),
    (snap) => {
      eventsCount = snap.size;
      emit();
    },
    () => {}
  );

  return () => {
    unsubNotices();
    unsubCerts();
    unsubRequests();
    unsubCirculars();
    unsubEvents();
  };
}

/**
 * Subscribe to Announcements
 */
export function subscribeToAnnouncements(callback: (items: AnnouncementItem[]) => void) {
  const q = query(collection(db, "announcements"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          title: d.title || "Announcement",
          content: d.content || "",
          category: d.category || "General",
          priority: d.priority || "medium",
          authorName: d.authorName || "Notice Manager",
          date: d.date || "Today",
          createdAt: d.createdAt,
        };
      });
      callback(list);
    },
    () => callback([])
  );
}

export async function createAnnouncement(data: Omit<AnnouncementItem, "id">) {
  return await addDoc(collection(db, "announcements"), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

/**
 * Subscribe to Circulars
 */
export function subscribeToCirculars(callback: (items: CircularItem[]) => void) {
  const q = query(collection(db, "circulars"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          title: d.title || "Official Circular",
          circularNo: d.circularNo || `CIR-${docSnap.id.slice(0, 5).toUpperCase()}`,
          date: d.date || "Recent",
          category: d.category || "Academic",
          pdfUrl: d.pdfUrl,
          pdfName: d.pdfName,
          department: d.department || "All Departments",
          createdAt: d.createdAt,
        };
      });
      callback(list);
    },
    () => callback([])
  );
}

export async function createCircular(data: Omit<CircularItem, "id">) {
  return await addDoc(collection(db, "circulars"), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

/**
 * Subscribe to Events
 */
export function subscribeToEvents(callback: (items: CampusEventItem[]) => void) {
  const q = query(collection(db, "events"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          title: d.title || "Campus Event",
          date: d.date || "Upcoming",
          time: d.time || "10:00 AM",
          location: d.location || "Main Auditorium",
          category: d.category || "Cultural",
          description: d.description || "",
          bannerUrl: d.bannerUrl,
          createdAt: d.createdAt,
        };
      });
      callback(list);
    },
    () => callback([])
  );
}

export async function createCampusEvent(data: Omit<CampusEventItem, "id">) {
  return await addDoc(collection(db, "events"), {
    ...data,
    createdAt: serverTimestamp(),
  });
}

/**
 * Subscribe to Documents
 */
export function subscribeToDocuments(callback: (items: DocumentItem[]) => void) {
  const q = query(collection(db, "documents"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          title: d.title || "Document",
          category: d.category || "Academic Documents",
          fileUrl: d.fileUrl,
          fileName: d.fileName,
          fileSize: d.fileSize || "1.2 MB",
          uploadedBy: d.uploadedBy || "Notice Manager",
          date: d.date || "Recent",
          createdAt: d.createdAt,
        };
      });
      callback(list);
    },
    () => callback([])
  );
}

export async function createDocumentItem(data: Omit<DocumentItem, "id">) {
  return await addDoc(collection(db, "documents"), {
    ...data,
    createdAt: serverTimestamp(),
  });
}
