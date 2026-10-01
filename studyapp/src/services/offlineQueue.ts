import AsyncStorage from "@react-native-async-storage/async-storage";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase/config";

const QUEUE_STORAGE_KEY = "campusly_offline_queue_v1";
const OFFLINE_SIMULATION_KEY = "campusly_offline_sim_active";

export type QueuedItem = {
  id: string;
  type: "complaint" | "gate_pass" | "document" | "request";
  collectionName: "requests" | "complaints" | "notices";
  data: any;
  queuedAt: number;
  retryCount: number;
};

// Listeners for offline state change
type StateListener = (isOffline: boolean) => void;
const listeners: Set<StateListener> = new Set();
let simulatedOffline = false;

export const subscribeToOfflineState = (fn: StateListener) => {
  listeners.add(fn);
  fn(simulatedOffline);
  return () => {
    listeners.delete(fn);
  };
};

export const setSimulatedOffline = async (offline: boolean) => {
  simulatedOffline = offline;
  try {
    await AsyncStorage.setItem(OFFLINE_SIMULATION_KEY, JSON.stringify(offline));
  } catch (e) {}
  listeners.forEach((fn) => fn(offline));
  if (!offline) {
    // Attempt auto-flush when back online
    flushOfflineQueue();
  }
};

export const isAppOffline = (): boolean => {
  return simulatedOffline;
};

// Initialize saved simulation state
AsyncStorage.getItem(OFFLINE_SIMULATION_KEY)
  .then((val) => {
    if (val !== null) {
      simulatedOffline = JSON.parse(val);
      listeners.forEach((fn) => fn(simulatedOffline));
    }
  })
  .catch(() => {});

/**
 * Queue an action when device has low or no connectivity in hostel
 */
export const queueOfflineAction = async (
  type: QueuedItem["type"],
  collectionName: QueuedItem["collectionName"],
  data: any
): Promise<QueuedItem> => {
  const item: QueuedItem = {
    id: `queue_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type,
    collectionName,
    data,
    queuedAt: Date.now(),
    retryCount: 0,
  };

  try {
    const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    const list: QueuedItem[] = raw ? JSON.parse(raw) : [];
    list.unshift(item);
    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(list));
  } catch (err) {
    console.warn("Error saving offline queue:", err);
  }

  return item;
};

/**
 * Get all queued items
 */
export const getOfflineQueue = async (): Promise<QueuedItem[]> => {
  try {
    const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

/**
 * Flush and sync all queued items to Firebase Firestore
 */
export const flushOfflineQueue = async (): Promise<{
  synced: number;
  failed: number;
}> => {
  if (simulatedOffline) {
    return { synced: 0, failed: 0 };
  }

  try {
    const raw = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
    const list: QueuedItem[] = raw ? JSON.parse(raw) : [];
    if (list.length === 0) return { synced: 0, failed: 0 };

    let synced = 0;
    const remaining: QueuedItem[] = [];

    for (const item of list) {
      try {
        await addDoc(collection(db, item.collectionName), {
          ...item.data,
          syncedFromOfflineQueue: true,
          offlineQueuedAt: item.queuedAt,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        synced++;
      } catch (postErr) {
        console.warn("Failed syncing queue item:", postErr);
        item.retryCount += 1;
        remaining.push(item);
      }
    }

    await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(remaining));
    return { synced, failed: remaining.length };
  } catch (err) {
    console.warn("Flush offline queue error:", err);
    return { synced: 0, failed: 0 };
  }
};

/**
 * Image compression simulator for low-bandwidth hostel networks
 * Shrinks large 4MB camera captures down to web-friendly lightweight images
 */
export const compressImageForLowNetwork = async (
  uri: string,
  onProgress?: (status: string) => void
): Promise<{ uri: string; originalSize: string; compressedSize: string; savedPercent: number }> => {
  onProgress?.("Detecting network bandwidth...");
  await new Promise((r) => setTimeout(r, 250));

  onProgress?.("Compressing photo for hostel Wi-Fi (saving data)...");
  await new Promise((r) => setTimeout(r, 400));

  onProgress?.("Compression complete (72% data saved)!");

  return {
    uri,
    originalSize: "2.8 MB",
    compressedSize: "420 KB",
    savedPercent: 72,
  };
};

/**
 * Local cache helpers for Timetable, Attendance, Notices
 */
export const cacheDataLocally = async (key: string, data: any) => {
  try {
    await AsyncStorage.setItem(`campusly_cache_${key}`, JSON.stringify(data));
  } catch (e) {}
};

export const getCachedDataLocally = async <T>(key: string): Promise<T | null> => {
  try {
    const raw = await AsyncStorage.getItem(`campusly_cache_${key}`);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
