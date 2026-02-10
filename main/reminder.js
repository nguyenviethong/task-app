const { Notification } = require("electron");
const { db } = require("./db");

function notify(task, type) {
  const n = new Notification({
    title: type === "overdue" ? "⚠ Quá hạn" : "⏰ Reminder",
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
}

function check() {
  const now = Date.now();

  const tasks = db.prepare(`SELECT * FROM tasks`).all();

  tasks.forEach(task => {

    // đang snooze → skip
    if (task.snoozeUntil && task.snoozeUntil > now) return;

    // reminder
    if (task.remindAt && task.remindAt <= now && !task.reminderNotified) {
      notify(task, "reminder");

      if (task.repeatInterval) {
        db.prepare(`
          UPDATE tasks
          SET remindAt=?, reminderNotified=0
          WHERE id=?
        `).run(now + task.repeatInterval, task.id);
      } else {
        db.prepare(`
          UPDATE tasks
          SET remindAt=NULL,
              reminderNotified=1
          WHERE id=?
        `).run(task.id);
      }
    }

    // overdue
    if (!task.done && task.endAt && task.endAt < now && !task.overdueNotified) {
      notify(task, "overdue");

      db.prepare(`
        UPDATE tasks
        SET overdueNotified=1
        WHERE id=?
      `).run(task.id);
    }

  });
}

setInterval(check, 60000);
check();

module.exports = {};
