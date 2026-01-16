import AsyncStorage from '@react-native-async-storage/async-storage';
import { sendPunchBatch } from './api';

const STORAGE_KEY = 'offline_punch_queue';

type OfflinePunch = {
  actionType: string;
  recordedAt: string;
  comment?: string;
  latitude?: number;
  longitude?: number;
};

async function loadQueue(): Promise<OfflinePunch[]> {
  const stored = await AsyncStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored) as OfflinePunch[];
  } catch {
    return [];
  }
}

export async function queuePunch(punch: OfflinePunch) {
  const queue = await loadQueue();
  queue.push(punch);
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
}

export async function flushQueuedPunches(authToken?: string) {
  if (!authToken) {
    return { flushed: 0 };
  }

  const queue = await loadQueue();
  if (!queue.length) {
    return { flushed: 0 };
  }

  const result = await sendPunchBatch(queue, authToken);
  if (result.status === 'success') {
    await AsyncStorage.removeItem(STORAGE_KEY);
    return { flushed: queue.length };
  }

  return { flushed: 0, error: result.message };
}

export async function getQueuedPunchCount(): Promise<number> {
  const queue = await loadQueue();
  return queue.length;
}
