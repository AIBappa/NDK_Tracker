// SyncService.js
// Purpose: Provide resilient logging when backend is offline by queueing items in IndexedDB
// and automatically flushing them when connectivity is restored.
//
// Why: Your backend is the system of record. If the backend goes down or the phone momentarily
// loses WiFi, we don't want users to lose logs. This helper queues logs locally and replays them
// to the backend once it's reachable. This keeps the UX smooth and trustworthy.

const DB_NAME = 'ndk-tracker-db';
const STORE_NAME = 'log-queue';

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function enqueueLog(session) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE_NAME).add({ session, status: 'queued', createdAt: Date.now() });
  });
}

export async function getQueued() {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function removeItem(id) {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
    tx.objectStore(STORE_NAME).delete(id);
  });
}

export async function flushQueue(backendUrl) {
  const items = await getQueued();
  for (const item of items) {
    try {
      const resp = await fetch(`${backendUrl}/input/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(item.session),
      });
      if (resp.ok) {
        await removeItem(item.id);
      } else {
        // Backend reachable but returned error; stop to avoid thrashing
        break;
      }
    } catch (e) {
      // Network error; stop and try again later
      break;
    }
  }
}

// Convenience API: try to send immediately, fall back to queue
export async function sendOrQueue(session, backendUrl) {
  try {
    const resp = await fetch(`${backendUrl}/input/log`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(session),
    });
    if (resp.ok) return { status: 'sent' };
    // If backend rejects, queue for a retry later
    await enqueueLog(session);
    return { status: 'queued' };
  } catch (err) {
    await enqueueLog(session);
    return { status: 'queued' };
  }
}

// Hook up online event listener from top-level app to auto-flush
export function setupOnlineFlush(backendUrlProvider) {
  async function handleOnline() {
    try {
      const url = backendUrlProvider();
      if (url) {
        await flushQueue(url);
      }
    } catch (e) {
      // ignore; will try again later
    }
  }
  window.addEventListener('online', handleOnline);
  return () => window.removeEventListener('online', handleOnline);
}
