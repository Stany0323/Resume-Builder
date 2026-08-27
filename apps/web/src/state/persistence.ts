import { migrateResumeDocument, type ResumeDocument } from "@resume-builder/core";

/**
 * Local-first persistence (commitment A6). One working document per SIGNED-IN
 * USER, autosaved to IndexedDB.
 *
 * ── Why the key is scoped by user id ──
 *
 * IndexedDB is scoped to the origin, not to the account. A single fixed key
 * therefore hands whoever signs in next the previous user's resume — on a
 * shared machine that is a privacy leak, not just a confusing default. Every
 * read and write is keyed by `working:<userId>`.
 *
 * The pre-auth `working` record from earlier builds is deliberately left
 * untouched: reading it would reintroduce the leak (whoever signs in first
 * claims it), and deleting it would destroy work without asking. It is simply
 * never read again. Clear site data if you want it gone.
 */

const DB_NAME = "resume-builder";
const DB_VERSION = 1;
const STORE = "documents";

function workingKey(userId: string) {
  return `working:${userId}`;
}

export type SaveStatus =
  | "idle"
  | "saving"
  | "saved"
  | "error"
  | "syncing"
  | "synced"
  | "offline"
  | "syncFailed";

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

export async function loadWorkingDocument(userId: string): Promise<ResumeDocument | null> {
  try {
    const stored = await withStore<unknown>("readonly", (store) => store.get(workingKey(userId)));

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

export async function saveWorkingDocument(userId: string, resume: ResumeDocument): Promise<void> {
  await withStore("readwrite", (store) => store.put(resume, workingKey(userId)));
}

export async function clearWorkingDocument(userId: string): Promise<void> {
  await withStore("readwrite", (store) => store.delete(workingKey(userId)));
}

/**
 * Debounced autosave: local first, then cloud. Returns a `save` to call on
 * every change and a `flush` for beforeunload, so an in-flight debounce can't
 * lose the last edit.
 *
 * Local success and cloud success are reported separately — a failed sync must
 * never read as lost work, because the local write already succeeded.
 */
export function createAutosave(
  onStatus: (status: SaveStatus) => void,
  userId: string,
  syncToCloud?: (resume: ResumeDocument) => Promise<unknown>,
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

    const stamped: ResumeDocument = {
      ...pending,
      meta: { ...pending.meta, updatedAt: new Date().toISOString() },
    };

    onStatus("saving");
    try {
      await saveWorkingDocument(userId, stamped);
      onStatus("saved");
    } catch {
      onStatus("error");
      return;
    }

    if (!syncToCloud) {
      return;
    }

    onStatus("syncing");
    try {
      await syncToCloud(stamped);
      onStatus("synced");
    } catch {
      onStatus(navigator.onLine ? "syncFailed" : "offline");
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
