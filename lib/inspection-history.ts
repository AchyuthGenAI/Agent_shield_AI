import type { Inspection } from "@/lib/firewall";
import type { ProtectedAgentDemo } from "@/lib/protected-agent";

export type SavedInspection = {
  id: string;
  inspectedAt: string;
  source: Inspection["source"];
  content: string;
  question: string;
  result: Inspection & { protectedAgent: ProtectedAgentDemo };
};

const DATABASE = "promptguard-inspection-history";
const STORE = "inspections";
const LIMIT = 100;

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("Browser storage is unavailable."));
      return;
    }
    const request = indexedDB.open(DATABASE, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE)) {
        const store = database.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("inspectedAt", "inspectedAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Could not open browser storage."));
    request.onblocked = () => reject(new Error("Browser storage is busy. Close other PromptGuard tabs and try again."));
  });
}

function transact<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore, finish: (value: T) => void) => void): Promise<T> {
  return openDatabase().then(database => new Promise<T>((resolve, reject) => {
    let value: T;
    const transaction = database.transaction(STORE, mode);
    transaction.oncomplete = () => { database.close(); resolve(value); };
    transaction.onerror = () => { database.close(); reject(transaction.error ?? new Error("Browser storage failed.")); };
    transaction.onabort = () => { database.close(); reject(transaction.error ?? new Error("Browser storage was interrupted.")); };
    action(transaction.objectStore(STORE), result => { value = result; });
  }));
}

export function listSavedInspections(): Promise<SavedInspection[]> {
  return transact("readonly", (store, finish) => {
    const request = store.getAll();
    request.onsuccess = () => finish((request.result as SavedInspection[]).sort((a, b) => b.inspectedAt.localeCompare(a.inspectedAt)));
  });
}

export function saveInspection(record: SavedInspection): Promise<void> {
  return transact("readwrite", (store, finish) => {
    store.put(record);
    const cursorRequest = store.index("inspectedAt").openCursor(null, "prev");
    let count = 0;
    cursorRequest.onsuccess = () => {
      const cursor = cursorRequest.result;
      if (!cursor) { finish(undefined); return; }
      count += 1;
      if (count > LIMIT) cursor.delete();
      cursor.continue();
    };
  });
}

export function deleteSavedInspection(id: string): Promise<void> {
  return transact("readwrite", (store, finish) => { store.delete(id); finish(undefined); });
}

export function clearSavedInspections(): Promise<void> {
  return transact("readwrite", (store, finish) => { store.clear(); finish(undefined); });
}
