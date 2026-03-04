const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { app } = require('electron');

const dbPath = path.join(app.getPath('userData'), 'chat.db');
const chatdb = new Database(dbPath);

// 🔥 WAL mode = chống corruption
chatdb.pragma("journal_mode = WAL");
chatdb.pragma("synchronous = NORMAL");
chatdb.pragma("foreign_keys = ON");

chatdb.prepare(`
CREATE TABLE IF NOT EXISTS chats (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  role TEXT,
  text TEXT,
  time INTEGER
)
`).run();

chatdb.exec(`
CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT,
  created INTEGER,
  user_key TEXT
);

CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  room_id INTEGER,
  role TEXT,
  text TEXT,
  time INTEGER,
  FOREIGN KEY(room_id) REFERENCES rooms(id)
);
`);


// helper check column
function addColumnIfNotExists(table, column, type) {
  const cols = chatdb.prepare(`PRAGMA table_info(${table})`).all();
  const exists = cols.some(c => c.name === column);

  if (!exists) {
    console.log(`Migrating: add ${column} to ${table}`);
    chatdb.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`).run();
  }
}

addColumnIfNotExists("rooms", "user_key", "TEXT");


chatdb.exec(`
CREATE INDEX IF NOT EXISTS idx_rooms_user
ON rooms(user_key);

CREATE INDEX IF NOT EXISTS idx_msg_room
ON messages(room_id);

`);

// --------------------
// INTEGRITY CHECK
// --------------------

const check = chatdb.prepare("PRAGMA integrity_check").get();

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
        'chat_backup.db'
      );

      fs.copyFileSync(dbPath, backupPath);

      console.log("DB chat backup OK");
    } catch (e) {
      console.error("Chat Backup failed:", e);
    }
  }, 60 * 60 * 1000); // mỗi 60 phút
}

startBackup();

module.exports = chatdb;


//module.exports = db;
