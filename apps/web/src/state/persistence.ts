import { migrateResumeDocument, type ResumeDocument } from "@resume-builder/core";

/**
 * Local-first persistence (commitment A6). One working document, autosaved to
 * IndexedDB. No account, no network, nothing to lose on refresh.
 *
 * Deliberately dependency-free — the raw IndexedDB API is unpleasant but this
 * is the whole of it, and a wrapper library would be more code than this file.
 */

const DB_NAME = "resume-builder";
const DB_VERSION = 1;
const STORE = "documents";
const WORKING_KEY = "working";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE)) {
        request.result.createObjectStore(STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDatabase();

  try {
    return await new Promise<T>((resolve, reject) => {
      const transaction = db.transaction(STORE, mode);
      const request = run(transaction.objectStore(STORE));

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
      transaction.onabort = () => reject(transaction.error);
    });
  } finally {
    db.close();
  }
}

export async function loadWorkingDocument(): Promise<ResumeDocument | null> {
  try {
    const stored = await withStore<unknown>("readonly", (store) => store.get(WORKING_KEY));

    if (!stored) {
      return null;
    }

    // Anything already on disk may predate the current schema.
    return migrateResumeDocument(stored as unknown as Parameters<typeof migrateResumeDocument>[0]);
  } catch {
    // A corrupt or unreadable store must never block startup — the user gets a
    // blank document rather than a broken app.
    return null;
  }
}

export async function saveWorkingDocument(resume: ResumeDocument): Promise<void> {
  await withStore("readwrite", (store) => store.put(resume, WORKING_KEY));
}

export async function clearWorkingDocument(): Promise<void> {
  await withStore("readwrite", (store) => store.delete(WORKING_KEY));
}

/**
 * Debounced autosave. Returns a `save` to call on every change and a
 * `flush` for beforeunload, so an in-flight debounce can't lose the last edit.
 */
export function createAutosave(
  onStatus: (status: SaveStatus) => void,
  delayMs = 500,
) {
  let timer: ReturnType<typeof setTimeout> | null = null;
  let queued: ResumeDocument | null = null;

  const write = async () => {
    const pending = queued;
    queued = null;
    timer = null;

    if (!pending) {
      return;
    }

    onStatus("saving");
    try {
      await saveWorkingDocument({ ...pending, meta: { ...pending.meta, updatedAt: new Date().toISOString() } });
      onStatus("saved");
    } catch {
      onStatus("error");
    }
  };

  return {
    save(resume: ResumeDocument) {
      queued = resume;
      if (timer) {
        clearTimeout(timer);
      }
      timer = setTimeout(write, delayMs);
    },
    flush() {
      if (timer) {
        clearTimeout(timer);
      }
      return write();
    },
  };
}
