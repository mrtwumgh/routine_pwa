// A tiny IndexedDB key-value store.
//
// Why not localStorage any more: the Done and Snooze buttons on a notification run inside the
// service worker, and service workers can't use localStorage. IndexedDB works in both places.

const DB_NAME = "daily-routine"; // all your apps share this site, so the name has to be specific
const STORE = "kv";

let opening;
function db() {
  opening ||= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => {
      const conn = req.result;
      conn.onversionchange = () => {
        conn.close();
        opening = null;
      };
      resolve(conn);
    };
    req.onerror = () => {
      opening = null;
      reject(req.error);
    };
  });
  return opening;
}

export async function read(key) {
  const conn = await db();
  return new Promise((resolve, reject) => {
    const req = conn.transaction(STORE).objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/**
 * Read, change and write a value in one transaction, so the page and the service worker
 * can't overwrite each other's changes. `fn` gets the current value and returns the new one
 * (or undefined to leave it as it is).
 */
export async function change(key, fn) {
  const conn = await db();
  return new Promise((resolve, reject) => {
    const tx = conn.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    let result;
    const req = store.get(key);
    req.onsuccess = () => {
      result = fn(req.result);
      if (result !== undefined) store.put(result, key);
      else result = req.result;
    };
    tx.oncomplete = () => resolve(result);
    tx.onerror = tx.onabort = () => reject(tx.error);
  });
}
