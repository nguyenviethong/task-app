const { app, Notification } = require("electron");
const { db } = require("./db");

let timer = null;
let lastRun = Date.now();

const NOTIFY_MAP_old = {
    "start-30m": "⏳ Còn 30 phút nữa bắt đầu",
    "start-10m": "⏳ Còn 10 phút nữa bắt đầu",
    "start-5m": "⏳ Còn 5 phút nữa bắt đầu",
    "end-10m": "⚠ Còn 10 phút nữa kết thúc",
    "end-5m": "⚠ Còn 5 phút nữa kết thúc",
    "overdue": "❌ Đã quá hạn",
	"reminder": "⏰ Reminder"
  }
  
const START_OFFSETS = [
  { label: "⏳ Còn 30 phút nữa bắt đầu", offset: 30 * 60000 },
  { label: "⏳ Còn 10 phút nữa bắt đầu", offset: 10 * 60000 },
  { label: "⏳ Còn 5 phút nữa bắt đầu", offset: 5 * 60000 }
];

const END_OFFSETS = [
  { label: "⚠ Còn 10 phút nữa kết thúc", offset: 10 * 60000 },
  { label: "⚠ Còn 5 phút nữa kết thúc", offset: 5 * 60000 }
];

function notify(task, title) {
  const n = new Notification({
    title,
    body: task.title,
    actions: [{ type: "button", text: "Snooze 5m" }],
    silent: false
  });

  n.show();

  // macOS action button
  n.on("action", () => snooze(task));

  // Windows fallback: click notification
  n.on("click", () => snooze(task));
}

function snooze(task) {
  const snoozeUntil = Date.now() + 5 * 60000;

  db.prepare(`
    UPDATE tasks
    SET snoozeUntil=?,
        overdueNotified=0
    WHERE id=?
  `).run(snoozeUntil, task.id);
  scheduleNext(); // tính lại lịch
}

function shouldTrigger(triggerTime, now) {
  return triggerTime > lastRun && triggerTime <= now;
}

function getAllTasks() {
  return db.prepare(`
    SELECT * FROM tasks WHERE done = 0
  `).all();
}

function processTriggers() {
  const now = Date.now();
  const tasks = getAllTasks();

  for (const task of tasks) {

    if (task.snoozeUntil && task.snoozeUntil > now) {
      continue;
    }

    // ======================
    // START REMINDERS
    // ======================
    if (task.startAt) {
      for (const config of START_OFFSETS) {
        const triggerTime = task.startAt - config.offset;

        if (shouldTrigger(triggerTime, now)) {
          notify(task, config.label);
        }
      }
    }

    // ======================
    // END REMINDERS
    // ======================
    if (task.endAt) {

      for (const config of END_OFFSETS) {
        const triggerTime = task.endAt - config.offset;

        if (shouldTrigger(triggerTime, now)) {
          notify(task, config.label);
        }
      }

      // OVERDUE
      if (shouldTrigger(task.endAt, now)) {
        notify(task, "❌ Đã quá hạn");
      }
    }

    // ======================
    // REMINDER
    // ======================
    if (task.remindAt && shouldTrigger(task.remindAt, now)) {
      notify(task, "⏰ Reminder");

      if (task.repeatInterval) {
        db.prepare(`
          UPDATE tasks
          SET remindAt=?
          WHERE id=?
        `).run(now + task.repeatInterval, task.id);
      }
    }
  }

  lastRun = now;
}

function getNextTriggerTime() {
  const now = Date.now();
  const tasks = getAllTasks();

  let nextTime = null;

  for (const task of tasks) {

    if (task.snoozeUntil && task.snoozeUntil > now) {
      nextTime = pickSooner(nextTime, task.snoozeUntil);
      continue;
    }

    if (task.startAt) {
      for (const config of START_OFFSETS) {
        const t = task.startAt - config.offset;
        if (t > now) nextTime = pickSooner(nextTime, t);
      }
    }

    if (task.endAt) {
      for (const config of END_OFFSETS) {
        const t = task.endAt - config.offset;
        if (t > now) nextTime = pickSooner(nextTime, t);
      }

      if (task.endAt > now) {
        nextTime = pickSooner(nextTime, task.endAt);
      }
    }

    if (task.remindAt && task.remindAt > now) {
      nextTime = pickSooner(nextTime, task.remindAt);
    }
  }

  return nextTime;
}

function pickSooner(current, candidate) {
  if (!current) return candidate;
  return candidate < current ? candidate : current;
}

function scheduleNext() {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }

  processTriggers();

  const nextTime = getNextTriggerTime();
  if (!nextTime) {
    console.log("No upcoming triggers.");
    return;
  }

  const delay = Math.max(nextTime - Date.now(), 0);

  console.log("Next trigger in", formatDelay(delay));

  timer = setTimeout(scheduleNext, delay);
}

function reschedule() {
  scheduleNext();
}

function formatDelay(ms) {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

module.exports = {
  startScheduler: scheduleNext,
  reschedule
};
