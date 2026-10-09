// Which items happen on which day, including days off.

import { dateKey, byTime } from "./util.js";

export const isWeekend = (d) => d.getDay() === 0 || d.getDay() === 6;

/** A day off only applies to weekdays; weekends already use the weekend routine. */
export const isDayOff = (s, d) => !isWeekend(d) && !!s.dayOff[dateKey(d)];

/** On a day off you get the items Saturday and Sunday have in common (no groceries, no weekly reset). */
export const offDayItem = (item) => item.days.includes(0) && item.days.includes(6);

export function itemsFor(s, d = new Date()) {
  const list = isDayOff(s, d) ? s.routine.filter(offDayItem) : s.routine.filter((i) => i.days.includes(d.getDay()));
  return list.sort(byTime);
}
