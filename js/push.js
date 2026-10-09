// Turning reminders on and off from the page. Each function returns a message to show you.

import { VAPID_PUBLIC } from "./config.js";
import { st, update } from "./state.js";
import { syncReminders, post, lastError } from "./sync.js";

export const supported = () =>
  "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;

export async function turnOnReminders() {
  if (!supported())
    return "This browser cannot receive reminders. Use Chrome on Android, ideally with the app installed.";
  if ((await Notification.requestPermission()) !== "granted")
    return "Notifications are blocked. Allow them for this app in Android settings, then try again.";
  try {
    const reg = await navigator.serviceWorker.ready;
    const options = { userVisibleOnly: true, applicationServerKey: keyBytes(VAPID_PUBLIC) };
    let sub = await reg.pushManager.getSubscription();
    try {
      sub ||= await reg.pushManager.subscribe(options);
    } catch {
      // An old subscription made with a different key blocks a new one; replace it.
      if (sub) await sub.unsubscribe();
      sub = await reg.pushManager.subscribe(options);
    }
    await update((s) => {
      s.pushOn = true;
    });
    if (await syncReminders({ force: true })) return "Reminders are on.";
    await update((s) => {
      s.pushOn = false;
    });
    return lastError || "Could not reach the reminder server.";
  } catch (e) {
    return "Could not turn on reminders: " + e.message;
  }
}

export async function turnOffReminders() {
  try {
    const sub = await (await navigator.serviceWorker.ready).pushManager.getSubscription();
    if (sub) await sub.unsubscribe();
    await post("/remove", {});
  } catch {
    /* offline: the server drops the subscription once pushes start failing */
  }
  await update((s) => {
    s.pushOn = false;
    s.pushSent = "";
  });
  return "Reminders are off.";
}

export async function sendTest() {
  if (!st.pushOn) return "Turn reminders on first.";
  if (!(await syncReminders())) return lastError || "Could not reach the reminder server.";
  try {
    const res = await post("/test", {});
    return res.ok ? "Test sent. It should arrive in a few seconds." : lastError;
  } catch {
    return "Could not reach the reminder server.";
  }
}

/** VAPID keys are base64url text; the browser wants raw bytes (65 bytes starting with 0x04). */
export function keyBytes(key) {
  const clean = String(key).replace(/[^A-Za-z0-9_\-+/]/g, "");
  const b64 = clean.replace(/-/g, "+").replace(/_/g, "/");
  const bytes = Uint8Array.from(atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4)), (c) => c.charCodeAt(0));
  if (bytes.length !== 65 || bytes[0] !== 4) throw new Error("VAPID_PUBLIC in js/config.js isn't a valid public key.");
  return bytes;
}
