export type PendingSource =
  | {
      kind: "link";
      url: string;
      createdAt: number;
    }
  | {
      kind: "file";
      blob: Blob;
      name: string;
      createdAt: number;
    };

const DB_NAME = "fasttrack-pending";
const STORE = "source";
const KEY = "next";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Browser storage is unavailable."));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Storage failed."));
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = action(tx.objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error ?? new Error("Storage failed."));
      tx.onabort = () => reject(tx.error ?? new Error("Storage failed."));
    });
  } finally {
    db.close();
  }
}

export async function savePendingSource(source: PendingSource) {
  await withStore("readwrite", (store) => store.put(source, KEY));
}

export async function readPendingSource() {
  const value = await withStore<PendingSource | undefined>(
    "readonly",
    (store) => store.get(KEY),
  );
  return value ?? null;
}

export async function clearPendingSource() {
  await withStore("readwrite", (store) => store.delete(KEY));
}
