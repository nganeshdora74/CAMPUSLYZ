import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { auth, db } from "../firebase/config";

export interface SubjectItem {
  id: string;
  name: string;
  teacherName: string;
  code?: string;
}

const DEFAULT_SUBJECTS = [
  { name: "Data Structures & Algorithms", teacherName: "Prof. Sharma", code: "CS-301" },
  { name: "Database Management Systems", teacherName: "Prof. Verma", code: "CS-302" },
  { name: "Operating Systems", teacherName: "Prof. Patel", code: "CS-303" },
  { name: "Computer Networks", teacherName: "Prof. Kumar", code: "CS-304" },
  { name: "Artificial Intelligence & ML", teacherName: "Prof. Gupta", code: "CS-305" },
  { name: "English & Communication", teacherName: "Dr. Ananya", code: "HU-301" },
];

export function useSubjects() {
  const [subjects, setSubjects] = useState<SubjectItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) {
      setSubjects(DEFAULT_SUBJECTS.map((s, i) => ({ id: `default-${i}`, ...s })));
      setLoading(false);
      return;
    }

    const subjectsCol = collection(db, "users", user.uid, "subjects");
    const q = query(subjectsCol, orderBy("name", "asc"));

    const unsubscribe = onSnapshot(
      q,
      async (snap) => {
        if (snap.empty) {
          // Seed defaults into Firestore once so they exist permanently
          try {
            for (const s of DEFAULT_SUBJECTS) {
              await addDoc(subjectsCol, {
                ...s,
                createdAt: serverTimestamp(),
              });
            }
          } catch (seedErr) {
            console.warn("Seeding subjects failed:", seedErr);
          }
          setLoading(false);
          return;
        }

        const loaded: SubjectItem[] = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name: data.name || "Subject",
            teacherName: data.teacherName || "Professor",
            code: data.code || "",
          };
        });

        setSubjects(loaded);
        setLoading(false);
      },
      (err) => {
        console.warn("useSubjects listener error:", err);
        setSubjects(DEFAULT_SUBJECTS.map((s, i) => ({ id: `default-${i}`, ...s })));
        setLoading(false);
      }
    );

    return unsubscribe;
  }, []);

  const addSubject = async (name: string, teacherName: string, code?: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Not logged in");
    const subjectsCol = collection(db, "users", user.uid, "subjects");
    return await addDoc(subjectsCol, {
      name: name.trim(),
      teacherName: teacherName.trim(),
      code: code ? code.trim() : "",
      createdAt: serverTimestamp(),
    });
  };

  const deleteSubject = async (subjectId: string) => {
    const user = auth.currentUser;
    if (!user) throw new Error("Not logged in");
    await deleteDoc(doc(db, "users", user.uid, "subjects", subjectId));
  };

  return { subjects, loading, addSubject, deleteSubject };
}
