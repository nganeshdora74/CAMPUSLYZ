import {
  initializeApp,
  getApps,
  getApp,
} from "firebase/app";

import { getAuth } from "firebase/auth";

import { getFirestore } from "firebase/firestore";

import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyC61W287I2BSiUj5vlRWpbMfR2tYAYVPl0",

  authDomain: "campusly-a2002.firebaseapp.com",

  projectId: "campusly-a2002",

  storageBucket:
    "campusly-a2002.firebasestorage.app",

  messagingSenderId: "385662227728",

  appId:
    "1:385662227728:web:98e5a003ab8db5faa68195",

  measurementId: "G-QGQDLHT7YG",
};

const app = getApps().length
  ? getApp()
  : initializeApp(firebaseConfig);

export const auth = getAuth(app);

export const db = getFirestore(app);

export const storage = getStorage(app);

export default app;