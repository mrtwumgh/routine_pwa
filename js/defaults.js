// The routine the app starts with, and what "Restore my original routine" brings back.
// Once the app is running you edit the routine on the Routine tab, not here.
//
// days:      0 = Sunday ... 6 = Saturday
// important: buzzes longer, stays on screen, and counts toward your streak
// quiet:     shown in the app but no notification

const EVERY = [0, 1, 2, 3, 4, 5, 6];
const WORKDAYS = [1, 2, 3, 4, 5];
const WEEKEND = [0, 6];

const ROUTINE = [
  { time: "05:00", icon: "💧", title: "Wake up", note: "Drink a full glass of water, brush your teeth, make your bed.", days: EVERY },
  { time: "05:15", icon: "📚", title: "Learning block", note: "Phone away. One topic, 75 minutes, while it is quiet.", days: EVERY },
  { time: "06:30", icon: "🧹", title: "Morning chores", note: "30 minutes: dishes, sweep, tidy up, take out the trash.", days: EVERY },
  { time: "07:00", icon: "🍳", title: "Breakfast", note: "Sit down and eat a proper meal: protein plus carbs.", days: EVERY, important: true },
  { time: "08:15", icon: "💪", title: "Workout", note: "Warm up for 2 minutes, then do your plan. Start small and build up.", days: EVERY, important: true },
  { time: "08:45", icon: "🥛", title: "Post-workout snack", note: "Protein within the hour: eggs, milk, peanuts or a banana. Drink water.", days: EVERY, important: true },
  { time: "09:00", icon: "🚿", title: "Shower and skincare", note: "Shower, then do your morning skincare steps.", days: EVERY },
  { time: "09:30", icon: "🧺", title: "Laundry", note: "Wash and hang everything so it dries before evening.", days: WEEKEND },
  { time: "09:30", icon: "🧺", title: "Laundry (optional)", note: "Friday laundry day. Skip it if your clothes are fine.", days: [5] },
  { time: "09:30", icon: "☕", title: "Free time", note: "Rest, reply to messages, or learn a little more.", days: [1, 2, 3, 4], quiet: true },
  { time: "10:00", icon: "🎒", title: "Get ready for work", note: "Charge your laptop and phone, set up your desk, fill your water bottle.", days: WORKDAYS },
  { time: "10:30", icon: "😴", title: "Nap", note: "30 minutes. Set an alarm so you are fully awake before work.", days: WORKDAYS },
  { time: "10:30", icon: "☕", title: "Free time", note: "Rest, hobbies, or build something.", days: WEEKEND, quiet: true },
  { time: "11:15", icon: "🍛", title: "Lunch", note: "Eat a full meal before you log on.", days: WORKDAYS, important: true },
  { time: "12:00", icon: "💻", title: "Work starts", note: "Log on. Keep water within reach.", days: WORKDAYS },
  { time: "12:30", icon: "🍛", title: "Lunch", note: "Eat a full meal.", days: WEEKEND, important: true },
  { time: "13:15", icon: "🛋️", title: "Free time", note: "Rest, hobbies, or catch up with people.", days: WEEKEND, quiet: true },
  { time: "14:00", icon: "🧘", title: "Water and stretch", note: "Stand up, drink water, stretch your neck and shoulders for 5 minutes.", days: WORKDAYS },
  { time: "14:00", icon: "🛒", title: "Groceries and meal prep", note: "Buy the next days of food and prep a few meals so eating is easy.", days: [6] },
  { time: "15:30", icon: "🍽️", title: "Mid-shift meal", note: "Step away from the screen and eat something real.", days: WORKDAYS, important: true },
  { time: "16:00", icon: "🥜", title: "Snack", note: "Something with protein, and water.", days: WEEKEND, important: true },
  { time: "17:45", icon: "💧", title: "Water and rest your eyes", note: "Drink water, look far away for a minute, walk around.", days: WORKDAYS },
  { time: "19:00", icon: "🗓️", title: "Weekly reset", note: "Open Progress, see what you missed this week, and plan the next one.", days: [0] },
  { time: "19:30", icon: "🍲", title: "Dinner", note: "Eat a proper dinner.", days: WEEKEND, important: true },
  { time: "20:00", icon: "✅", title: "Work ends", note: "Close the laptop. You are done for the day.", days: WORKDAYS },
  { time: "20:15", icon: "🍲", title: "Dinner", note: "Eat a proper dinner, not just a snack.", days: WORKDAYS, important: true },
  { time: "20:15", icon: "🛋️", title: "Free time", note: "Relax. No chores, no studying.", days: WEEKEND, quiet: true },
  { time: "20:45", icon: "🛋️", title: "Free time", note: "Relax. No work, no studying.", days: WORKDAYS, quiet: true },
  { time: "21:15", icon: "🌙", title: "Wind down", note: "Night skincare, brush your teeth, lay out tomorrow's clothes, phone away from the bed.", days: EVERY },
  { time: "21:45", icon: "🛌", title: "Lights out", note: "Sleep now so you get 7 hours before 5am.", days: EVERY, important: true },
];

const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * Starting items get ids like "0815-workout" (the same ids the previous version used, so
 * ticks carry over). Items you add later get random ids. An id never changes when you edit
 * an item, so its history stays attached.
 */
export const DEFAULT_ROUTINE = ROUTINE.map((item) => ({
  important: false,
  quiet: false,
  ...item,
  id: `${item.time.replace(":", "")}-${slug(item.title)}`,
}));
