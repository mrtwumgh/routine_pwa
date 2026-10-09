// Everything the app remembers. Shared by the page and the service worker through IndexedDB.
//
// `st` is a snapshot for reading. To change anything, call update(fn): it re-reads the latest
// copy, applies fn, and writes it back in one step, then refreshes `st`.

import { read, change } from "./db.js";
import { DEFAULT_ROUTINE } from "./defaults.js";
import { dateKey, addDays } from "./util.js";

const KEY = "state";
const KEEP_DAYS = 120;
const OLD_LOCAL_KEY = "routine"; // where the previous version kept its data

export let st = null;

function randomHex() {
  return [...crypto.getRandomValues(new Uint8Array(16))].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export const newItemId = () => "i" + randomHex().slice(0, 10);

function fresh() {
  return {
    version: 2,
    deviceId: randomHex(), // this phone on the reminder server: 32 hex characters, never the fitness app's ID
    pushOn: false,
    pushSent: "", // last schedule sent, to skip identical re-sends
    since: dateKey(), // first day of use, so progress doesn't count days before it
    routine: structuredClone(DEFAULT_ROUTINE),
    done: {}, // { "YYYY-MM-DD": { itemId: 1 } }
    dayOff: {}, // { "YYYY-MM-DD": true } for weekdays you're not working
    snoozes: [], // [{ id, date, time }]
  };
}

/** Bring in the previous version's localStorage data, keeping its device ID so the server doesn't get a duplicate. */
function fromLocalStorage() {
  if (typeof localStorage === "undefined") return null;
  try {
    const old = JSON.parse(localStorage.getItem(OLD_LOCAL_KEY) || "null");
    if (!old) return null;
    const s = fresh();
    if (old.deviceId) s.deviceId = old.deviceId;
    s.pushOn = !!old.pushOn;
    s.done = old.done || {};
    const days = Object.keys(s.done).sort();
    if (days.length) s.since = days[0];
    return s;
  } catch {
    return null;
  }
}

// The worker only accepts 16 to 64 hex characters as an ID.
const validId = (id) => typeof id === "string" && /^[a-f0-9]{16,64}$/.test(id);

function normalize(s) {
  const base = fresh();
  const out = { ...base, ...s, done: s.done || {}, dayOff: s.dayOff || {}, snoozes: s.snoozes || [], routine: s.routine || base.routine };
  // Earlier versions made IDs like "routine-<hex>", which the worker rejects. Keep the hex part.
  if (!validId(out.deviceId)) {
    const hex = String(out.deviceId || "").replace(/^routine-/, "");
    out.deviceId = validId(hex) ? hex : base.deviceId;
  }
  return out;
}

function prune(s) {
  const oldest = dateKey(addDays(new Date(), -KEEP_DAYS));
  const today = dateKey();
  for (const day of Object.keys(s.done)) if (day < oldest || !Object.keys(s.done[day]).length) delete s.done[day];
  for (const day of Object.keys(s.dayOff)) if (day < oldest || !s.dayOff[day]) delete s.dayOff[day];
  s.snoozes = s.snoozes.filter((z) => z.date >= today);
  return s;
}

/**
 * Load the latest state into `st`.
 * The page creates it on first run. The service worker passes create: false: if it made a
 * fresh state before the page migrated the old one, the phone would end up with two device IDs
 * on the server and get every reminder twice.
 */
export async function loadState({ create = true } = {}) {
  if (!create) {
    const saved = await read(KEY);
    st = saved ? normalize(saved) : null;
    return st;
  }
  st = await change(KEY, (cur) => {
    if (cur) {
      const fixed = normalize(cur);
      return fixed.deviceId === cur.deviceId ? undefined : fixed; // save a repaired ID straight away
    }
    const s = normalize(fromLocalStorage() || fresh());
    try {
      localStorage.removeItem(OLD_LOCAL_KEY);
    } catch {
      /* not available */
    }
    return s;
  });
  st = normalize(st);
  return st;
}

export async function update(fn) {
  st = await change(KEY, (cur) => {
    const s = normalize(cur || fresh());
    fn(s);
    return prune(s);
  });
  return st;
}

export const doneOn = (day = dateKey()) => st.done[day] || {};
