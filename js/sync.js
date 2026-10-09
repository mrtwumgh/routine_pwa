// Keeps the reminder server's copy of your schedule up to date. Used by the page and the service worker.
//
// The worker only understands weekly reminders ({ tag, title, body, days, times }) plus a list of
// tags to skip today. Everything else is built from those two:
//   - Ticked off today        -> its tag goes in today's skip list
//   - Day off today           -> workday-only items go in the skip list
//   - Day off in the next week -> weekend items become one-off reminders on that weekday, tagged "<tag>~<MMDD>"
//   - Snooze                  -> a one-off reminder tagged "<tag>~z<MMDD><HHMM>"
// One-offs repeat weekly as far as the worker knows, so they're removed again once they've fired:
// the service worker re-syncs after every push it receives, and the 5am wake-up push does it daily.
//
// The worker cuts tags at 32 characters, so the server sees a short code per item ("r1k9x2pq")
// instead of its id ("1745-water-and-rest-your-eyes"). The longest tag, a snooze, is 18 characters.

import { PUSH_URL } from "./config.js";
import { st, update } from "./state.js";
import { isDayOff, offDayItem } from "./schedule.js";
import { dateKey, parseKey, addDays, mins } from "./util.js";

/** Last error message from the server, for showing to the user. */
export let lastError = "";

/** Short, stable code for an item id (FNV-1a hash in base 36). */
export function tagFor(id) {
  let h = 0x811c9dc5;
  for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 0x01000193);
  return "r" + (h >>> 0).toString(36);
}

const mmdd = (key) => key.slice(5).replace("-", "");

const entry = (tag, item, days, time = item.time) => ({
  tag,
  title: `${item.icon} ${item.title}`,
  body: item.note,
  days,
  times: [time],
});

export const snoozeTag = (z) => `${tagFor(z.id)}~z${mmdd(z.date)}${z.time.replace(":", "")}`;

/** The routine item a pushed tag belongs to, or null (e.g. the server's test message). */
export const itemFromTag = (routine, tag = "") => {
  const code = tag.split("~")[0];
  return routine.find((i) => tagFor(i.id) === code) || null;
};

export function buildSchedule(s, now = new Date()) {
  const today = dateKey(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const reminders = s.routine.filter((i) => !i.quiet).map((i) => entry(tagFor(i.id), i, i.days));
  const skip = new Set();
  const oneOffToday = new Set(); // ids that got a one-off reminder for today

  for (let k = 0; k < 7; k++) {
    const d = addDays(now, k);
    if (!isDayOff(s, d)) continue;
    const key = dateKey(d);
    const weekday = d.getDay();
    for (const item of s.routine) {
      if (item.quiet) continue;
      const usuallyOn = item.days.includes(weekday);
      if (offDayItem(item) && !usuallyOn) {
        reminders.push(entry(`${tagFor(item.id)}~${mmdd(key)}`, item, [weekday]));
        if (k === 0) oneOffToday.add(item.id);
      }
      if (k === 0 && usuallyOn && !offDayItem(item)) skip.add(tagFor(item.id));
    }
  }

  for (const z of s.snoozes) {
    const item = s.routine.find((i) => i.id === z.id);
    if (!item || z.date < today) continue;
    if (z.date === today && mins(z.time) < nowMin - 10) continue; // already went off
    reminders.push(entry(snoozeTag(z), item, [parseKey(z.date).getDay()], z.time));
  }

  for (const id of Object.keys(s.done[today] || {})) {
    skip.add(tagFor(id));
    if (oneOffToday.has(id)) skip.add(`${tagFor(id)}~${mmdd(today)}`);
  }

  return { reminders, done: skip.size ? { date: today, tags: [...skip].sort() } : null };
}

export async function post(path, data) {
  const res = await fetch(PUSH_URL + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: st.deviceId, ...data }),
  });
  if (!res.ok) {
    let message = "";
    try {
      message = (await res.json()).error;
    } catch {
      /* no JSON body */
    }
    lastError = message || `The reminder server replied ${res.status}.`;
  }
  return res;
}

// In the service worker `self.registration` exists; on the page we wait for it.
const registration = () => self.registration || navigator.serviceWorker.ready;

/**
 * Send the schedule to the server if it changed since last time (saves the free tier's writes).
 * Safe to call often. Returns true when the server is up to date.
 */
export async function syncReminders({ force = false } = {}) {
  if (!st?.pushOn) return false;
  lastError = "";
  try {
    const sub = await (await registration()).pushManager.getSubscription();
    if (!sub) {
      await update((s) => {
        s.pushOn = false;
      });
      return false;
    }
    const data = {
      sub: sub.toJSON(),
      tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
      ...buildSchedule(st),
    };
    const fingerprint = JSON.stringify(data);
    if (!force && fingerprint === st.pushSent) return true;
    const res = await post("/sync", data);
    if (!res.ok) return false;
    await update((s) => {
      s.pushSent = fingerprint;
    });
    return true;
  } catch {
    lastError = "Could not reach the reminder server. Check your connection.";
    return false;
  }
}
