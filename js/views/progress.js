// The Progress tab: your streak, the last 7 days, and what you miss most.
// Built for the Sunday "Weekly reset".
//
// Past days are scored against your current routine (edits aren't kept as history),
// and items marked "No reminder" don't count, since free time can't really be missed.

import { st } from "../state.js";
import { itemsFor, isDayOff } from "../schedule.js";
import { dateKey, parseKey, addDays, esc, DAY_SHORT } from "../util.js";

const counted = (s, d) => itemsFor(s, d).filter((i) => !i.quiet);

function dayScore(d) {
  const items = counted(st, d);
  const done = st.done[dateKey(d)] || {};
  const important = items.filter((i) => i.important);
  return {
    total: items.length,
    done: items.filter((i) => done[i.id]).length,
    kept: important.every((i) => done[i.id]),
    off: isDayOff(st, d),
  };
}

/** Days in a row with every important item ticked. Today only counts once it's complete. */
function streak(now) {
  const since = parseKey(st.since);
  let n = dayScore(now).kept ? 1 : 0;
  for (let d = addDays(now, -1); d >= since; d = addDays(d, -1)) {
    if (!dayScore(d).kept) break;
    n++;
  }
  return n;
}

function mostMissed(now) {
  const since = parseKey(st.since);
  const tally = {};
  for (let k = 1; k <= 14; k++) {
    const d = addDays(now, -k);
    if (d < since) break;
    const done = st.done[dateKey(d)] || {};
    for (const item of counted(st, d)) {
      const t = (tally[item.id] ||= { item, due: 0, done: 0 });
      t.due++;
      if (done[item.id]) t.done++;
    }
  }
  return Object.values(tally)
    .filter((t) => t.due >= 2 && t.done < t.due)
    .sort((a, b) => a.done / a.due - b.done / b.due || b.due - a.due)
    .slice(0, 5);
}

export function renderProgress(view, ctx) {
  const now = new Date();
  const since = parseKey(st.since);
  ctx.setHeader("Progress", `Since ${since.toLocaleDateString(undefined, { day: "numeric", month: "long" })}`);

  const days = [];
  for (let k = 6; k >= 0; k--) {
    const d = addDays(now, -k);
    days.push({ d, before: d < since, today: k === 0, ...dayScore(d) });
  }
  const tracked = days.filter((x) => !x.before && !x.today);
  const weekPct = tracked.length
    ? Math.round((100 * tracked.reduce((a, x) => a + x.done, 0)) / Math.max(1, tracked.reduce((a, x) => a + x.total, 0)))
    : null;
  const s = streak(now);
  const missed = mostMissed(now);

  const label = (x) =>
    `${x.today ? "Today" : x.d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" })}: ` +
    (x.before ? "before you started" : `${x.done} of ${x.total} done${x.off ? ", day off" : ""}${x.kept ? ", all important items" : ""}`);

  view.innerHTML = `
    <section class="stats">
      <div class="stat"><b>${s}</b><span>${s === 1 ? "day" : "days"} in a row with every important item ticked (meals, workout, lights out)</span></div>
      <div class="stat"><b>${weekPct === null ? "–" : weekPct + "%"}</b><span>of items done in the last 6 days</span></div>
    </section>

    <h2 class="sec">Last 7 days</h2>
    <div class="bars" role="list">${days
      .map((x) => {
        const pct = x.before || !x.total ? 0 : Math.round((100 * x.done) / x.total);
        return `<button class="bar${x.today ? " today" : ""}${x.before ? " before" : ""}" role="listitem"
            aria-label="${esc(label(x))}" data-label="${esc(label(x))}">
          <span class="col"><span class="val" style="height:${pct}%"></span></span>
          <span class="day">${x.today ? "Today" : DAY_SHORT[x.d.getDay()]}${x.off ? "<small>off</small>" : ""}${x.kept && !x.before ? "<small>✓</small>" : ""}</span>
        </button>`;
      })
      .join("")}</div>
    <p class="caption" aria-live="polite">Tap a bar to see the day. ✓ means every important item was ticked.</p>

    <h2 class="sec">Missed most in the last 2 weeks</h2>
    ${
      missed.length
        ? `<ul class="missed-list">${missed
            .map(
              (t) => `<li><span aria-hidden="true">${esc(t.item.icon)}</span><span class="tx"><b>${esc(t.item.title)}</b>
                <small>${t.item.time}, done ${t.done} of ${t.due} times</small></span>
                <span class="rate" aria-hidden="true"><span style="width:${Math.round((100 * t.done) / t.due)}%"></span></span></li>`,
            )
            .join("")}</ul>`
        : `<p class="empty">${
            tracked.length ? "Nothing missed more than once. Keep it going." : "Tick items off for a couple of days and the ones you miss show up here."
          }</p>`
    }`;

  view.onclick = (e) => {
    const bar = e.target.closest(".bar");
    if (!bar) return;
    view.querySelectorAll(".bar").forEach((b) => b.classList.toggle("picked", b === bar));
    view.querySelector(".caption").textContent = bar.dataset.label;
  };
}
