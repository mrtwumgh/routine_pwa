// Wires the page together: tabs, settings, app updates, and staying in step with the service worker.

import { st, loadState, update } from "./state.js";
import { syncReminders } from "./sync.js";
import { dateKey } from "./util.js";
import { supported, turnOnReminders, turnOffReminders, sendTest } from "./push.js";
import { renderToday } from "./views/today.js";
import { renderRoutine } from "./views/routine.js";
import { renderProgress } from "./views/progress.js";

const $ = (s) => document.querySelector(s);
const VIEWS = { today: renderToday, routine: renderRoutine, progress: renderProgress };
let tab = "today";

// ---------- shared helpers handed to each view ----------

let toastTimer;
function toast(text) {
  const el = $("#toast");
  el.textContent = text;
  el.classList.add("on");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("on"), 3500);
}

// Wait a moment before syncing so several changes in a row cost one server write.
let syncTimer;
function syncSoon() {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(async () => {
    if (st.pushOn && !(await syncReminders())) toast("Saved, but the reminder server didn't get the change. It will retry.");
  }, 2000);
}

const ctx = {
  toast,
  syncSoon,
  refresh: () => render(),
  setHeader(title, sub) {
    $("#title").textContent = title;
    $("#sub").textContent = sub;
  },
};

function render() {
  for (const name of Object.keys(VIEWS)) {
    $(`#view-${name}`).hidden = name !== tab;
    $(`[data-tab="${name}"]`).setAttribute("aria-current", name === tab ? "page" : "false");
  }
  VIEWS[tab]($(`#view-${tab}`), ctx);
}

// ---------- tabs ----------

$("nav.tabs").onclick = (e) => {
  const btn = e.target.closest("[data-tab]");
  if (!btn || btn.dataset.tab === tab) return;
  tab = btn.dataset.tab;
  render();
  scrollTo({ top: 0 });
  if (tab === "today") scrollToNow();
};

const scrollToNow = () => document.querySelector(".checklist .now")?.scrollIntoView({ block: "center" });

// ---------- settings ----------

function renderSettings() {
  $("#pushStatus").textContent = !supported()
    ? "This browser can't receive reminders. Open the app in Chrome on Android."
    : st.pushOn
      ? "Reminders are on for this phone. Use Done or Snooze right on a reminder."
      : "Reminders are off.";
  $("#pushToggle").textContent = st.pushOn ? "Turn off reminders" : "Turn on reminders";
  $("#test").disabled = !st.pushOn;
}

async function busy(btn, work) {
  btn.disabled = true;
  try {
    toast(await work());
  } finally {
    btn.disabled = false;
    renderSettings();
  }
}

$("#gear").onclick = () => {
  renderSettings();
  $("#settings").showModal();
};
$("#close").onclick = () => $("#settings").close();
$("#pushToggle").onclick = (e) => busy(e.currentTarget, st.pushOn ? turnOffReminders : turnOnReminders);
$("#test").onclick = (e) => busy(e.currentTarget, sendTest);
$("#reset").onclick = async () => {
  const today = dateKey();
  await update((s) => {
    delete s.done[today];
  });
  $("#settings").close();
  render();
  syncSoon();
  toast("Today's ticks are cleared.");
};

// ---------- app updates ----------
// A new version installs in the background; the banner lets you switch to it when you're ready.

let updating = false;
if ("serviceWorker" in navigator) {
  // type: "module" lets sw.js import the same code as the page.
  navigator.serviceWorker.register("sw.js", { type: "module" }).then((reg) => {
    const offer = (worker) => {
      $("#update").hidden = false;
      $("#updateBtn").onclick = () => {
        updating = true;
        worker.postMessage("skip-waiting");
      };
    };
    if (reg.waiting && navigator.serviceWorker.controller) offer(reg.waiting);
    reg.addEventListener("updatefound", () => {
      const worker = reg.installing;
      worker?.addEventListener("statechange", () => {
        if (worker.state === "installed" && navigator.serviceWorker.controller) offer(worker);
      });
    });
  });

  // Reload only when you tapped Update. On the very first install the worker also takes
  // control of the page, and reloading then would just flash the screen.
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (updating) {
      updating = false;
      location.reload();
    }
  });

  // Done or Snooze tapped on a reminder while the app is open.
  navigator.serviceWorker.addEventListener("message", async (e) => {
    if (e.data?.type === "state-changed") {
      await loadState();
      render();
    }
  });
}

// ---------- start ----------

await loadState();
render();
scrollToNow();
syncReminders();
setInterval(() => tab === "today" && render(), 30000);
document.addEventListener("visibilitychange", async () => {
  if (document.hidden) return;
  await loadState(); // the service worker may have changed things while the app was closed
  render();
  syncReminders();
});
