import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "./config";

export const addData = async (
  collectionName: string,
  data: any
) => {
  const ref = await addDoc(
    collection(db, collectionName),
    data
  );

  return ref.id;
};

export const getData = async (
  collectionName: string
) => {
  const snapshot = await getDocs(
    collection(db, collectionName)
  );

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
};

export const getUserData = async (
  collectionName: string,
  uid: string
) => {
  const q = query(
    collection(db, collectionName),
    where("studentId", "==", uid)
  );

  const snapshot = await getDocs(q);

  return snapshot.docs.map((item) => ({
    id: item.id,
    ...item.data(),
  }));
};

export const deleteData = async (
  collectionName: string,
  id: string
) => {
  await deleteDoc(
    doc(db, collectionName, id)
  );
};