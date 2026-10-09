import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase/config";

export interface ScheduleEntry {
  id: string;
  day: "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun" | string;
  subject: string;
  subjectCode?: string;
  startTime: string; // e.g. "09:00 AM"
  endTime: string; // e.g. "10:00 AM"
  timeRange?: string; // e.g. "09:00 AM – 10:00 AM"
  room: string;
  faculty: string;
  department?: string;
  section?: string;
  color?: string;
  bg?: string;
  icon?: string;
  createdAt?: any;
  updatedAt?: any;
}

export type ClassStatus = "Ongoing" | "Upcoming" | "Completed";

const DAY_MAP: Record<string, number> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

/**
 * Parses time strings like "09:00 AM", "9:30 AM", "02:15 PM", "14:30" into minutes from midnight (0–1439).
 */
export function parseTimeToMinutes(timeStr: string): number {
  if (!timeStr) return 0;
  const clean = timeStr.trim().toUpperCase();

  // Match 12-hour format: "09:30 AM" or "9:30AM"
  const match12 = clean.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/);
  if (match12) {
    let hours = parseInt(match12[1], 10);
    const minutes = parseInt(match12[2], 10);
    const meridian = match12[3];

    if (meridian === "PM" && hours < 12) hours += 12;
    if (meridian === "AM" && hours === 12) hours = 0;
    return hours * 60 + minutes;
  }

  // Fallback match e.g. "10 AM"
  const matchShort = clean.match(/^(\d{1,2})\s*(AM|PM)$/);
  if (matchShort) {
    let hours = parseInt(matchShort[1], 10);
    const meridian = matchShort[2];
    if (meridian === "PM" && hours < 12) hours += 12;
    if (meridian === "AM" && hours === 12) hours = 0;
    return hours * 60;
  }

  return 0;
}

/**
 * Computes dynamic live status ("Ongoing" | "Upcoming" | "Completed")
 * by comparing the class's day and start/end times with the current system time.
 */
export function getDynamicClassStatus(
  dayOrItem:
    | string
    | {
        day?: string;
        startTime?: string;
        endTime?: string;
        timeRange?: string;
        time?: string;
      },
  startTimeOrNow?: string | Date,
  endTime?: string,
  nowDate: Date = new Date()
): ClassStatus {
  let itemDay = "";
  let startStr = "";
  let endStr = "";
  let now = nowDate;

  if (typeof dayOrItem === "object" && dayOrItem !== null) {
    itemDay = (dayOrItem.day || "").slice(0, 3);
    startStr = dayOrItem.startTime || "";
    endStr = dayOrItem.endTime || "";

    if ((!startStr || !endStr) && (dayOrItem.timeRange || dayOrItem.time)) {
      const raw = (dayOrItem.timeRange || dayOrItem.time || "").replace(/\n/g, " ");
      const parts = raw.split(/[-–—]/);
      if (parts.length >= 2) {
        if (!startStr) startStr = parts[0].trim();
        if (!endStr) endStr = parts[1].trim();
      }
    }

    if (startTimeOrNow instanceof Date) {
      now = startTimeOrNow;
    }
  } else {
    itemDay = String(dayOrItem || "").slice(0, 3);
    startStr = typeof startTimeOrNow === "string" ? startTimeOrNow : "";
    endStr = endTime || "";
  }

  const startMin = parseTimeToMinutes(startStr);
  const endMin = parseTimeToMinutes(endStr);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const currentDayShort = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][now.getDay()];

  // If the class is scheduled for today:
  if (!itemDay || itemDay.toLowerCase() === currentDayShort.toLowerCase()) {
    if (startMin > 0 && endMin > 0) {
      if (nowMin < startMin) {
        return "Upcoming";
      }
      if (nowMin >= startMin && nowMin <= endMin) {
        return "Ongoing";
      }
      return "Completed";
    }

    // Default if only start time known
    if (startMin > 0) {
      if (nowMin < startMin) return "Upcoming";
      if (nowMin >= startMin && nowMin <= startMin + 60) return "Ongoing";
      return "Completed";
    }

    return "Upcoming";
  }

  // If scheduled for a different day of the week:
  const targetDayNum = DAY_MAP[itemDay];
  const todayDayNum = now.getDay();

  if (targetDayNum !== undefined) {
    if (targetDayNum < todayDayNum) return "Completed";
    return "Upcoming";
  }

  return "Upcoming";
}

// Starter fallback curriculum schedule
export const INITIAL_CURRICULUM_CLASSES: Omit<ScheduleEntry, "id">[] = [
  {
    day: "Mon",
    startTime: "09:00 AM",
    endTime: "10:00 AM",
    timeRange: "09:00 AM – 10:00 AM",
    subject: "Data Structures & Algorithms",
    subjectCode: "CS-401",
    room: "CSE - A • Room 204",
    faculty: "Prof. Priya Sharma",
    department: "CSE",
    section: "A",
    color: "#2563EB",
    bg: "#EFF6FF",
    icon: "code-slash",
  },
  {
    day: "Mon",
    startTime: "10:15 AM",
    endTime: "11:15 AM",
    timeRange: "10:15 AM – 11:15 AM",
    subject: "Database Management Systems",
    subjectCode: "CS-402",
    room: "CSE - B • Room 103",
    faculty: "Dr. S. Ramesh",
    department: "CSE",
    section: "B",
    color: "#7C3AED",
    bg: "#FAF5FF",
    icon: "server",
  },
  {
    day: "Mon",
    startTime: "11:30 AM",
    endTime: "12:30 PM",
    timeRange: "11:30 AM – 12:30 PM",
    subject: "Operating Systems",
    subjectCode: "CS-403",
    room: "CSE - A • Room 302",
    faculty: "Prof. Ananya Gupta",
    department: "CSE",
    section: "A",
    color: "#059669",
    bg: "#ECFDF5",
    icon: "hardware-chip",
  },
  {
    day: "Mon",
    startTime: "02:00 PM",
    endTime: "03:30 PM",
    timeRange: "02:00 PM – 03:30 PM",
    subject: "Computer Networks Lab",
    subjectCode: "CS-404L",
    room: "Lab 2 • 1st Floor",
    faculty: "Prof. Rajesh Kumar",
    department: "CSE",
    section: "A",
    color: "#EA580C",
    bg: "#FFF7ED",
    icon: "git-network",
  },
  {
    day: "Tue",
    startTime: "09:00 AM",
    endTime: "10:00 AM",
    timeRange: "09:00 AM – 10:00 AM",
    subject: "Web Technologies",
    subjectCode: "CS-405",
    room: "CSE - A • Room 101",
    faculty: "Prof. Priya Sharma",
    department: "CSE",
    section: "A",
    color: "#0891B2",
    bg: "#CFFAFE",
    icon: "globe",
  },
  {
    day: "Tue",
    startTime: "10:15 AM",
    endTime: "11:15 AM",
    timeRange: "10:15 AM – 11:15 AM",
    subject: "Data Structures & Algorithms",
    subjectCode: "CS-401",
    room: "CSE - B • Room 204",
    faculty: "Prof. Priya Sharma",
    department: "CSE",
    section: "B",
    color: "#2563EB",
    bg: "#EFF6FF",
    icon: "code-slash",
  },
  {
    day: "Tue",
    startTime: "12:00 PM",
    endTime: "01:00 PM",
    timeRange: "12:00 PM – 01:00 PM",
    subject: "Software Engineering",
    subjectCode: "CS-406",
    room: "Room 105 • 2nd Floor",
    faculty: "Dr. S. Ramesh",
    department: "CSE",
    section: "A",
    color: "#D97706",
    bg: "#FEF3C7",
    icon: "layers",
  },
  {
    day: "Wed",
    startTime: "09:30 AM",
    endTime: "11:00 AM",
    timeRange: "09:30 AM – 11:00 AM",
    subject: "Algorithms Lab",
    subjectCode: "CS-401L",
    room: "Computer Lab 3",
    faculty: "Prof. Priya Sharma",
    department: "CSE",
    section: "A",
    color: "#2563EB",
    bg: "#EFF6FF",
    icon: "flask",
  },
  {
    day: "Wed",
    startTime: "11:30 AM",
    endTime: "12:30 PM",
    timeRange: "11:30 AM – 12:30 PM",
    subject: "Database Management Systems",
    subjectCode: "CS-402",
    room: "Room 103",
    faculty: "Dr. S. Ramesh",
    department: "CSE",
    section: "B",
    color: "#7C3AED",
    bg: "#FAF5FF",
    icon: "server",
  },
  {
    day: "Thu",
    startTime: "09:00 AM",
    endTime: "10:00 AM",
    timeRange: "09:00 AM – 10:00 AM",
    subject: "Operating Systems",
    subjectCode: "CS-403",
    room: "Room 304",
    faculty: "Prof. Ananya Gupta",
    department: "CSE",
    section: "A",
    color: "#059669",
    bg: "#ECFDF5",
    icon: "hardware-chip",
  },
  {
    day: "Thu",
    startTime: "10:30 AM",
    endTime: "11:30 AM",
    timeRange: "10:30 AM – 11:30 AM",
    subject: "Computer Networks",
    subjectCode: "CS-404",
    room: "Room 201",
    faculty: "Prof. Rajesh Kumar",
    department: "CSE",
    section: "B",
    color: "#EA580C",
    bg: "#FFF7ED",
    icon: "git-network",
  },
  {
    day: "Fri",
    startTime: "09:00 AM",
    endTime: "10:00 AM",
    timeRange: "09:00 AM – 10:00 AM",
    subject: "Artificial Intelligence",
    subjectCode: "CS-407",
    room: "Seminar Hall 1",
    faculty: "Prof. Priya Sharma",
    department: "CSE",
    section: "A",
    color: "#4F46E5",
    bg: "#EEF2FF",
    icon: "sparkles",
  },
  {
    day: "Fri",
    startTime: "10:30 AM",
    endTime: "11:30 AM",
    timeRange: "10:30 AM – 11:30 AM",
    subject: "Data Structures & Algorithms",
    subjectCode: "CS-401",
    room: "Room 204",
    faculty: "Prof. Priya Sharma",
    department: "CSE",
    section: "A",
    color: "#2563EB",
    bg: "#EFF6FF",
    icon: "code-slash",
  },
  {
    day: "Fri",
    startTime: "02:00 PM",
    endTime: "03:30 PM",
    timeRange: "02:00 PM – 03:30 PM",
    subject: "Web Development Project Lab",
    subjectCode: "CS-405L",
    room: "Lab 1 • 2nd Floor",
    faculty: "Prof. Rajesh Kumar",
    department: "CSE",
    section: "A",
    color: "#059669",
    bg: "#ECFDF5",
    icon: "code-slash",
  },
  {
    day: "Sat",
    startTime: "10:00 AM",
    endTime: "11:30 AM",
    timeRange: "10:00 AM – 11:30 AM",
    subject: "Technical Seminar & Doubt Solving",
    subjectCode: "CS-408",
    room: "Room 102",
    faculty: "Prof. Priya Sharma",
    department: "CSE",
    section: "All",
    color: "#7C3AED",
    bg: "#FAF5FF",
    icon: "school",
  },
];

/**
 * Subscribes in realtime to Firestore `schedules` collection.
 * Automatically seeds default curriculum entries if collection is empty.
 */
export function subscribeSchedules(
  callback: (entries: ScheduleEntry[]) => void
): () => void {
  const scheduleCol = collection(db, "schedules");

  return onSnapshot(
    scheduleCol,
    async (snap) => {
      if (snap.empty) {
        try {
          for (const item of INITIAL_CURRICULUM_CLASSES) {
            await addDoc(scheduleCol, {
              ...item,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        } catch (seedErr: any) {
          console.warn("Seeding default schedule error:", seedErr?.message);
        }
        return;
      }

      const list: ScheduleEntry[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        const sTime = d.startTime || (d.time?.split("-")[0]?.trim()) || "09:00 AM";
        const eTime = d.endTime || (d.time?.split("-")[1]?.trim()) || "10:00 AM";
        const formattedRange = d.timeRange || `${sTime} – ${eTime}`;

        return {
          id: docSnap.id,
          day: d.day || "Mon",
          subject: d.subject || "Subject",
          subjectCode: d.subjectCode || "",
          startTime: sTime,
          endTime: eTime,
          timeRange: formattedRange,
          room: d.room || "Room 101",
          faculty: d.faculty || d.teacherName || "Faculty",
          department: d.department || "CSE",
          section: d.section || "A",
          color: d.color || "#2563EB",
          bg: d.bg || "#EFF6FF",
          icon: d.icon || "book",
          createdAt: d.createdAt,
          updatedAt: d.updatedAt,
        };
      });

      // Sort by day of week then start time
      list.sort((a, b) => {
        const dayA = DAY_MAP[a.day.slice(0, 3)] ?? 7;
        const dayB = DAY_MAP[b.day.slice(0, 3)] ?? 7;
        if (dayA !== dayB) return dayA - dayB;
        return parseTimeToMinutes(a.startTime) - parseTimeToMinutes(b.startTime);
      });

      callback(list);
    },
    (err) => {
      console.warn("Schedule listener error:", err.message);
      // Fallback to sample classes
      callback(
        INITIAL_CURRICULUM_CLASSES.map((c, i) => ({
          ...c,
          id: `sample-${i}`,
        }))
      );
    }
  );
}

/**
 * Creates a new schedule entry in Firestore.
 */
export async function addScheduleEntry(
  entry: Omit<ScheduleEntry, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const scheduleCol = collection(db, "schedules");
  const timeRange = entry.timeRange || `${entry.startTime} – ${entry.endTime}`;
  const docRef = await addDoc(scheduleCol, {
    ...entry,
    timeRange,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Updates an existing schedule entry in Firestore.
 */
export async function updateScheduleEntry(
  id: string,
  entry: Partial<ScheduleEntry>
): Promise<void> {
  const docRef = doc(db, "schedules", id);
  const timeRange =
    entry.startTime && entry.endTime
      ? `${entry.startTime} – ${entry.endTime}`
      : entry.timeRange;

  const payload: Record<string, any> = {
    ...entry,
    updatedAt: serverTimestamp(),
  };
  if (timeRange) payload.timeRange = timeRange;
  delete payload.id;

  await updateDoc(docRef, payload);
}

/**
 * Deletes a schedule entry from Firestore.
 */
export async function deleteScheduleEntry(id: string): Promise<void> {
  const docRef = doc(db, "schedules", id);
  await deleteDoc(docRef);
}
