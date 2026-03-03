const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

const dbPath = path.join(app.getPath('userData'), 'tasks.db');
const db = new Database(dbPath);

// 🔥 WAL mode = chống corruption
db.pragma("journal_mode = WAL");
db.pragma("synchronous = NORMAL");
db.pragma("foreign_keys = ON");

db.prepare(`
CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  done INTEGER,
  remindAt INTEGER
)
`).run();

db.exec(`
CREATE TABLE IF NOT EXISTS tracking_sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  taskId INTEGER NOT NULL,
  startAt INTEGER NOT NULL,
  endAt INTEGER NOT NULL,
  FOREIGN KEY(taskId) REFERENCES tasks(id)
);
`);

// helper check column
function addColumnIfNotExists(column, type) {
  const cols = db.prepare(`PRAGMA table_info(tasks)`).all();
  const exists = cols.some(c => c.name === column);

  if (!exists) {
    db.prepare(`ALTER TABLE tasks ADD COLUMN ${column} ${type}`).run();
  }
}

function addColumnIfNotExistsTrackingSessions(column, type) {
  const cols = db.prepare(`PRAGMA table_info(tracking_sessions)`).all();
  const exists = cols.some(c => c.name === column);

  if (!exists) {
    db.prepare(`ALTER TABLE tracking_sessions ADD COLUMN ${column} ${type}`).run();
  }
}

function addIndexIfNotExists(indexName, table, column) {
  const indexes = db.prepare(`
    PRAGMA index_list(${table})
  `).all();

  const exists = indexes.some(i => i.name === indexName);

  if (!exists) {
    db.prepare(`
      CREATE INDEX ${indexName}
      ON ${table} (${column})
    `).run();
  }
}

// migrations
addColumnIfNotExists("type", "TEXT");
addColumnIfNotExists("startAt", "INTEGER");
addColumnIfNotExists("endAt", "INTEGER");
addColumnIfNotExists("snoozeUntil", "INTEGER");
addColumnIfNotExists("repeatInterval", "INTEGER");
addColumnIfNotExists("overdueNotified", "INTEGER");
addColumnIfNotExists("createdAt", "INTEGER");
addColumnIfNotExists("reminderNotified", "INTEGER");
addColumnIfNotExists("priority", "TEXT");
addColumnIfNotExists("completedAt", "INTEGER");
//TIME TRACKING
addColumnIfNotExists("actualStart", "INTEGER");
addColumnIfNotExists("actualEnd", "INTEGER");
addColumnIfNotExists("totalTimeSpent", "INTEGER DEFAULT 0");
addColumnIfNotExists("isTracking", "INTEGER DEFAULT 0");
//SYNC
addColumnIfNotExists("updatedAt", "INTEGER");
addColumnIfNotExists("deletedAt", "INTEGER");
addColumnIfNotExists("syncStatus", "TEXT DEFAULT 'synced'");
addColumnIfNotExists("uuid", "TEXT");
// values: 'synced' | 'dirty' | 'deleted'

//tracking_sessions
addColumnIfNotExistsTrackingSessions("updatedAt", "INTEGER");
addColumnIfNotExistsTrackingSessions("deletedAt", "INTEGER");
addColumnIfNotExistsTrackingSessions("syncStatus", "TEXT DEFAULT 'synced'");

//tạo index
addIndexIfNotExists("idx_tasks_syncStatus", "tasks", "syncStatus");
addIndexIfNotExists("idx_tasks_startAt", "tasks", "startAt");
addIndexIfNotExists("idx_tasks_createdAt", "tasks", "createdAt");
addIndexIfNotExists("idx_tasks_type", "tasks", "type");
addIndexIfNotExists("idx_tasks_priority", "tasks", "priority");


// --------------------
// INTEGRITY CHECK
// --------------------

const check = db.prepare("PRAGMA integrity_check").get();

if (check.integrity_check !== "ok") {
  console.error("❌ DB corrupted!");
}

// --------------------
// AUTO BACKUP
// --------------------

function startBackup() {
  setInterval(() => {
    try {
      const backupPath = path.join(
        app.getPath('userData'),
        'tasks_backup.db'
      );

      fs.copyFileSync(dbPath, backupPath);

      console.log("DB backup OK");
    } catch (e) {
      console.error("Backup failed:", e);
    }
  }, 5 * 60 * 1000); // mỗi 5 phút
}

startBackup();

function exportTasks(filePath) {
  const data = db.prepare("SELECT * FROM tasks").all();
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function importTasks(filePath) {
  const data = JSON.parse(fs.readFileSync(filePath));

  const insert = db.prepare(`
    INSERT OR REPLACE INTO tasks
    VALUES (@id,@title,@done,@remindAt,@type,@startAt,@endAt,
            @snoozeUntil,@repeatInterval,@overdueNotified,
            @createdAt,@reminderNotified,@priority,@completedAt)
  `);

  const tx = db.transaction(tasks => {
    for (const t of tasks) insert.run(t);
  });

  tx(data);
}

module.exports = {
  db,
  exportTasks,
  importTasks
};


//module.exports = db;
