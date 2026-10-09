// The Routine tab: every item, with an editor to change, add or remove them.

import { st, update, newItemId } from "../state.js";
import { DEFAULT_ROUTINE } from "../defaults.js";
import { byTime, daysLabel, esc, DAY_SHORT } from "../util.js";

const $ = (s) => document.querySelector(s);
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Monday first in the editor

export function renderRoutine(view, ctx) {
  const items = [...st.routine].sort(byTime);
  ctx.setHeader("Your routine", `${items.length} items. Tap one to change it.`);

  view.innerHTML = `
    <button class="add" data-add>Add an item</button>
    <ul class="routine">${items
      .map(
        (i) => `<li><button data-edit="${i.id}">
          <time>${i.time}</time><span aria-hidden="true">${esc(i.icon)}</span>
          <span class="tx"><b>${esc(i.title)}</b><small>${daysLabel(i.days)}${i.important ? ", important" : ""}${i.quiet ? ", no reminder" : ""}</small></span>
        </button></li>`,
      )
      .join("")}</ul>
    <button class="plain" data-restore>Restore my original routine</button>`;

  view.onclick = async (e) => {
    const edit = e.target.closest("[data-edit]");
    if (edit) openEditor(st.routine.find((i) => i.id === edit.dataset.edit), ctx);
    else if (e.target.closest("[data-add]")) openEditor(null, ctx);
    else if (e.target.closest("[data-restore]")) {
      if (!confirm("Replace your routine with the original one? Your ticks and history stay.")) return;
      await update((s) => {
        s.routine = structuredClone(DEFAULT_ROUTINE);
      });
      ctx.toast("Original routine restored.");
      ctx.refresh();
      ctx.syncSoon();
    }
  };
}

// ---------- editor ----------

function openEditor(item, ctx) {
  const dlg = $("#editor");
  const isNew = !item;
  item ||= { id: newItemId(), time: "12:00", icon: "⭐", title: "", note: "", days: [0, 1, 2, 3, 4, 5, 6], important: false, quiet: false };

  dlg.innerHTML = `
    <form method="dialog" class="edit">
      <h3>${isNew ? "New item" : "Change item"}</h3>
      <div class="pair">
        <label>Time<input name="time" type="time" required value="${item.time}"></label>
        <label class="icon">Icon<input name="icon" maxlength="4" value="${esc(item.icon)}"></label>
      </div>
      <label>Name<input name="title" required maxlength="40" value="${esc(item.title)}" placeholder="Drink water"></label>
      <label>What to do<textarea name="note" rows="2" maxlength="140" placeholder="Shown in the app and on the reminder">${esc(item.note)}</textarea></label>
      <fieldset class="days"><legend>Days</legend>${WEEK_ORDER.map(
        (d) => `<label><input type="checkbox" name="day" value="${d}" ${item.days.includes(d) ? "checked" : ""}><span>${DAY_SHORT[d].slice(0, 2)}</span></label>`,
      ).join("")}</fieldset>
      <label class="check"><input type="checkbox" name="important" ${item.important ? "checked" : ""}>
        <span>Important<small>Buzzes longer, stays on screen, counts toward your streak</small></span></label>
      <label class="check"><input type="checkbox" name="quiet" ${item.quiet ? "checked" : ""}>
        <span>No reminder<small>Shows in the app only</small></span></label>
      <p class="error" role="alert"></p>
      <div class="row">
        <button value="save" class="primary">Save</button>
        <button value="cancel" formnovalidate>Cancel</button>
        ${isNew ? "" : `<button value="delete" class="danger" formnovalidate>Delete</button>`}
      </div>
    </form>`;

  const form = dlg.querySelector("form");
  form.onsubmit = async (e) => {
    const action = e.submitter?.value;
    if (action === "cancel") return;
    if (action === "delete") {
      e.preventDefault();
      if (!confirm(`Delete "${item.title}"?`)) return;
      await update((s) => {
        s.routine = s.routine.filter((i) => i.id !== item.id);
      });
      dlg.close();
      ctx.toast("Deleted.");
      ctx.refresh();
      ctx.syncSoon();
      return;
    }

    e.preventDefault();
    const f = new FormData(form);
    const days = f.getAll("day").map(Number);
    const title = String(f.get("title")).trim();
    const error = form.querySelector(".error");
    if (!title) return (error.textContent = "Give it a name.");
    if (!days.length) return (error.textContent = "Pick at least one day.");

    const saved = {
      ...item,
      time: String(f.get("time")).slice(0, 5),
      icon: String(f.get("icon")).trim() || "⭐",
      title,
      note: String(f.get("note")).trim(),
      days: days.sort(),
      important: f.has("important"),
      quiet: f.has("quiet"),
    };
    await update((s) => {
      const at = s.routine.findIndex((i) => i.id === saved.id);
      if (at >= 0) s.routine[at] = saved;
      else s.routine.push(saved);
    });
    dlg.close();
    ctx.toast("Saved.");
    ctx.refresh();
    ctx.syncSoon();
  };

  dlg.showModal();
}
