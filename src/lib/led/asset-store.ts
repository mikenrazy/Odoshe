/**
 * Binary/large media storage for content-canvas layers.
 *
 * Uploaded artwork and video are far too large for localStorage, so the project
 * JSON only stores a light `assetId` reference and the payload lives in IndexedDB.
 */

const DB_NAME = "dx5ve.assets";
const STORE = "assets";

function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === "undefined") return Promise.resolve(null);
  return new Promise((resolve) => {
    try {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export function newAssetId() {
  return `asset_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export async function putAsset(id: string, dataUrl: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  await new Promise<void>((resolve) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(dataUrl, id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => resolve();
    tx.onabort = () => resolve();
  });
}

export async function getAsset(id: string): Promise<string | null> {
  const db = await openDb();
  if (!db) return null;
  return new Promise((resolve) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => resolve(typeof req.result === "string" ? req.result : null);
    req.onerror = () => resolve(null);
  });
}

export async function getAssets(ids: string[]): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  for (const id of ids) {
    const value = await getAsset(id);
    if (value) out[id] = value;
  }
  return out;
}
