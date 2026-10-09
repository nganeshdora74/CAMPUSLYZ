import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { Platform } from "react-native";
import { db, storage } from "../firebase/config";

export type ResourceFormat = "PDF" | "Photo" | "Video" | "Document" | "Other";

export interface ResourceItem {
  id: string;
  title: string;
  subject: string;
  format: ResourceFormat;
  fileUrl: string;
  fileName: string;
  fileSize?: string;
  videoUrl?: string;
  description?: string;
  targetClass?: string;
  teacherName?: string;
  teacherId?: string;
  downloads?: number;
  createdAt?: any;
  updatedAt?: any;
}

const SEED_RESOURCES: Omit<ResourceItem, "id">[] = [
  {
    title: "Unit 3: Binary Trees, AVL Trees & Graph Traversal",
    subject: "Data Structures & Algorithms",
    format: "PDF",
    fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    fileName: "DSA_Unit3_Binary_Trees.pdf",
    fileSize: "4.2 MB",
    description: "Complete lecture notes and solved numericals on tree balancing and graph traversal.",
    targetClass: "B.Tech CSE - 4th Sem",
    teacherName: "Dr. Priya Sharma",
    teacherId: "TEACH-101",
    downloads: 128,
  },
  {
    title: "Operating Systems: Process Life Cycle & Deadlock Diagram",
    subject: "Operating Systems",
    format: "Photo",
    fileUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=900&auto=format&fit=crop&q=80",
    fileName: "os_process_lifecycle_diagram.jpg",
    fileSize: "1.8 MB",
    description: "High-resolution whiteboard diagram of process state transitions and Banker's algorithm.",
    targetClass: "B.Tech CSE - 4th Sem",
    teacherName: "Prof. Rajesh Kumar",
    teacherId: "TEACH-102",
    downloads: 95,
  },
  {
    title: "Mastering SQL Joins, Normalization & Query Tuning",
    subject: "DBMS",
    format: "Video",
    fileUrl: "https://www.youtube.com/watch?v=HXV3zeQKqGY",
    videoUrl: "https://www.youtube.com/watch?v=HXV3zeQKqGY",
    fileName: "dbms_joins_tutorial.mp4",
    fileSize: "Stream",
    description: "Full recorded video explanation with live terminal demonstration of complex nested joins.",
    targetClass: "B.Tech CSE - 4th Sem",
    teacherName: "Dr. Sandeep Patel",
    teacherId: "TEACH-103",
    downloads: 210,
  },
  {
    title: "Full-Stack Web Development: Lab Manual & React Boilerplate",
    subject: "Web Technologies",
    format: "Document",
    fileUrl: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf",
    fileName: "WebTech_Lab_Manual_2026.docx",
    fileSize: "2.7 MB",
    description: "Step-by-step instructions for weekly lab experiments, environment setup, and viva prep.",
    targetClass: "B.Tech CSE - 4th Sem",
    teacherName: "Prof. Priya Verma",
    teacherId: "TEACH-104",
    downloads: 74,
  },
];

async function uriToBlob(uri: string): Promise<Blob> {
  const response = await fetch(uri);
  return await response.blob();
}

/**
 * Uploads a resource file (PDF, photo, document, or video) to Firebase Storage
 */
export async function uploadResourceFile(
  uri: string,
  format: ResourceFormat,
  fileName: string
): Promise<string> {
  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    return uri;
  }

  try {
    const blob = await uriToBlob(uri);
    const timestamp = Date.now();
    let extension = "pdf";
    let contentType = "application/pdf";

    if (format === "Photo") {
      extension = "jpg";
      contentType = "image/jpeg";
    } else if (format === "Video") {
      extension = "mp4";
      contentType = "video/mp4";
    } else if (format === "Document") {
      extension = fileName.endsWith(".docx") ? "docx" : "pdf";
      contentType = "application/octet-stream";
    }

    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `resources/${format.toLowerCase()}s/${timestamp}_${safeName}`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, blob, { contentType });
    return await getDownloadURL(storageRef);
  } catch (error: any) {
    console.warn(`Resource ${format} upload failed:`, error?.message);
    return uri;
  }
}

/**
 * Real-time listener for study resources
 */
export function subscribeResources(
  callback: (resources: ResourceItem[]) => void
): () => void {
  const colRef = collection(db, "studyResources");
  const q = query(colRef, orderBy("createdAt", "desc"));

  return onSnapshot(
    q,
    async (snap) => {
      if (snap.empty) {
        // Seed default resources once
        try {
          for (const item of SEED_RESOURCES) {
            await addDoc(colRef, {
              ...item,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          }
        } catch (e: any) {
          console.warn("Seeding resources error:", e?.message);
        }
        return;
      }

      const list: ResourceItem[] = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title || "Resource Material",
          subject: data.subject || "Computer Science",
          format: (data.format as ResourceFormat) || "PDF",
          fileUrl: data.fileUrl || "",
          fileName: data.fileName || "Resource",
          fileSize: data.fileSize || "1.0 MB",
          videoUrl: data.videoUrl || undefined,
          description: data.description || "",
          targetClass: data.targetClass || "All Students",
          teacherName: data.teacherName || "Faculty Member",
          teacherId: data.teacherId || "TEACH-101",
          downloads: Number(data.downloads) || 0,
          createdAt: data.createdAt,
          updatedAt: data.updatedAt,
        };
      });

      callback(list);
    },
    (err) => {
      console.warn("subscribeResources error:", err.message);
      callback([]);
    }
  );
}

/**
 * Adds a new study resource (PDF, photo, video, document)
 */
export async function addStudyResource(
  resource: Omit<ResourceItem, "id" | "createdAt" | "updatedAt">
): Promise<string> {
  const colRef = collection(db, "studyResources");
  const docRef = await addDoc(colRef, {
    ...resource,
    downloads: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return docRef.id;
}

/**
 * Deletes a study resource
 */
export async function deleteStudyResource(id: string): Promise<void> {
  const docRef = doc(db, "studyResources", id);
  await deleteDoc(docRef);
}

/**
 * Increments the download counter for a resource
 */
export async function incrementResourceDownload(id: string): Promise<void> {
  try {
    const docRef = doc(db, "studyResources", id);
    await updateDoc(docRef, {
      downloads: increment(1),
    });
  } catch (e: any) {
    console.warn("incrementResourceDownload failed:", e?.message);
  }
}
