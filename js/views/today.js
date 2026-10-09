// The Today tab: where you are in the day, what's next, and the checklist.

import { st, update, doneOn } from "../state.js";
import { itemsFor, isWeekend, isDayOff } from "../schedule.js";
import { dateKey, addDays, mins, fmtDuration, esc } from "../util.js";

export function renderToday(view, ctx) {
  const now = new Date();
  const list = itemsFor(st, now);
  const done = doneOn();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const today = dateKey(now);
  const snoozed = Object.fromEntries(st.snoozes.filter((z) => z.date === today).map((z) => [z.id, z.time]));

  ctx.setHeader(
    now.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" }),
    `${list.filter((i) => done[i.id]).length} of ${list.length} done${isDayOff(st, now) ? ", day off" : ""}`,
  );

  // The current item is the last one whose time has passed.
  let current = -1;
  list.forEach((item, i) => {
    if (mins(item.time) <= nowMin) current = i;
  });
  const first = list.length ? mins(list[0].time) : 0;
  const last = list.length ? mins(list[list.length - 1].time) : 1;
  const progress = Math.max(0, Math.min(100, ((nowMin - first) / Math.max(1, last - first)) * 100));

  let hero;
  if (!list.length) {
    hero = `<h2>Nothing planned</h2><p>Add items on the Routine tab.</p>`;
  } else if (current < 0) {
    hero = `<h2>Rest up</h2><p>First up at ${list[0].time}: ${esc(list[0].title)}.</p>`;
  } else {
    const item = list[current];
    const next = list[current + 1];
    const meta = next
      ? `${fmtDuration(mins(next.time) - nowMin)} left, next: ${next.time} ${esc(next.title)}`
      : "Last one of the day. Sleep well.";
    hero = `<h2>${esc(item.icon)} ${esc(item.title)}</h2><p>${esc(item.note)}</p><p class="meta">${meta}</p>
      <button class="big" data-tick="${item.id}">${done[item.id] ? "Undo" : "Mark done"}</button>`;
  }

  view.innerHTML = `
    ${dayOffRow(now)}
    <div class="track" aria-hidden="true"><div class="fill" style="width:${progress}%"></div><span class="sun" style="left:${progress}%"></span></div>
    <section class="hero" aria-live="polite">${hero}</section>
    <ul class="checklist">${list
      .map((item, i) => {
        const d = !!done[item.id];
        const cls = [i === current && "now", d && "done", i < current && !d && "missed"].filter(Boolean).join(" ");
        const extra = snoozed[item.id] && !d ? `<em class="snoozed">Snoozed to ${snoozed[item.id]}</em>` : "";
        return `<li class="${cls}"><button data-tick="${item.id}" aria-pressed="${d}">
          <time>${item.time}</time><span aria-hidden="true">${esc(item.icon)}</span>
          <span class="tx"><b>${esc(item.title)}</b><small>${esc(item.note)}</small>${extra}</span><i class="ck"></i></button></li>`;
      })
      .join("")}</ul>`;

  view.onclick = async (e) => {
    const tick = e.target.closest("[data-tick]");
    const off = e.target.closest("[data-off]");
    if (tick) await toggleDone(tick.dataset.tick);
    else if (off) await toggleDayOff(off.dataset.off, ctx);
    else return;
    ctx.refresh();
    ctx.syncSoon();
  };
}

/** Day off buttons for today and tomorrow, shown only on weekdays. */
function dayOffRow(now) {
  const days = [
    [now, "Today"],
    [addDays(now, 1), "Tomorrow"],
  ].filter(([d]) => !isWeekend(d));
  if (!days.length) return "";
  return `<div class="dayoff" role="group" aria-label="Days off">${days
    .map(([d, label]) => {
      const on = isDayOff(st, d);
      return `<button data-off="${dateKey(d)}" aria-pressed="${on}">${on ? `${label} is a day off` : `${label} off?`}</button>`;
    })
    .join("")}</div>`;
}

async function toggleDone(id) {
  const today = dateKey();
  await update((s) => {
    const d = (s.done[today] ||= {});
    if (d[id]) delete d[id];
    else {
      d[id] = 1;
      s.snoozes = s.snoozes.filter((z) => !(z.id === id && z.date === today));
    }
  });
}

async function toggleDayOff(key, ctx) {
  const on = !st.dayOff[key];
  await update((s) => {
    if (on) s.dayOff[key] = true;
    else delete s.dayOff[key];
  });
  const which = key === dateKey() ? "Today" : "Tomorrow";
  ctx.toast(on ? `${which} uses your weekend routine. Work reminders are off.` : `${which} is a workday again.`);
}
