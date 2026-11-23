const Database = require("better-sqlite3");
const path = require("node:path");
const fs = require("node:fs");
let db;

const timetable = [
  ["1-dars boshlanishi","08:30:00",1], ["1-dars tugashi — tanaffus boshlanishi","09:15:00",2],
  ["2-dars boshlanishi","09:35:00",1], ["2-dars tugashi — tanaffus boshlanishi","10:20:00",2],
  ["3-dars boshlanishi","10:25:00",1], ["3-dars tugashi — tanaffus boshlanishi","11:10:00",2],
  ["4-dars boshlanishi","11:15:00",1], ["4-dars tugashi — tanaffus boshlanishi","12:00:00",2],
  ["5-dars boshlanishi","12:45:00",1], ["5-dars tugashi — tanaffus boshlanishi","13:30:00",2],
  ["6-dars boshlanishi","13:35:00",1], ["6-dars tugashi — tanaffus boshlanishi","14:20:00",2],
  ["7-dars boshlanishi","14:25:00",1], ["7-dars tugashi — tanaffus boshlanishi","15:10:00",2],
  ["8-dars boshlanishi","15:15:00",1], ["Darslar tugadi","16:00:00",null]
];

function initDatabase(userDataPath, resourcesPath, isPackaged) {
  const file = path.join(userDataPath, "smart-bell.sqlite");
  db = new Database(file);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.exec(`
    CREATE TABLE IF NOT EXISTS audio_files (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, file_path TEXT NOT NULL, created_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS schedules (
      id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL, time TEXT NOT NULL,
      audio_id INTEGER REFERENCES audio_files(id) ON DELETE SET NULL,
      days TEXT NOT NULL DEFAULT '[1,2,3,4,5,6]', enabled INTEGER NOT NULL DEFAULT 1,
      last_fired_key TEXT
    );
    CREATE TABLE IF NOT EXISTS history (
      id INTEGER PRIMARY KEY AUTOINCREMENT, source TEXT NOT NULL, name TEXT NOT NULL,
      result TEXT NOT NULL, created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
  `);
  db.prepare("INSERT OR IGNORE INTO settings(key,value) VALUES('auto_enabled','true')").run();

  // Oldingi versiyadagi "dars tugashi" yozuvlarini tanaffus bosqichi sifatida yangilash.
  const oldEndings = db.prepare("SELECT id,name FROM schedules WHERE name LIKE '%-dars tugashi'");
  const updateEnding = db.prepare("UPDATE schedules SET name=? WHERE id=?");
  for (const row of oldEndings.all()) {
    updateEnding.run(row.name + " — tanaffus boshlanishi", row.id);
  }

  // Copy the two audio samples supplied by the school into persistent user data.
  const sourceDir = isPackaged ? path.join(resourcesPath, "bell-audio") : path.join(__dirname, "../../assets");
  const targetDir = path.join(userDataPath, "audio");
  fs.mkdirSync(targetDir, { recursive: true });
  const audioSeeds = [
    { source: path.join(sourceDir, "qongiroq-1.wav"), name: "IT-LINE qo‘ng‘iroq 1" },
    { source: path.join(sourceDir, "qongiroq-2.m4a"), name: "IT-LINE qo‘ng‘iroq 2" }
  ];
  const audioIds = {};
  for (const seed of audioSeeds) {
    const exists = db.prepare("SELECT id FROM audio_files WHERE name=?").get(seed.name);
    if (exists) { audioIds[seed.name] = exists.id; continue; }
    if (!fs.existsSync(seed.source)) continue;
    const dest = path.join(targetDir, path.basename(seed.source));
    if (!fs.existsSync(dest)) fs.copyFileSync(seed.source, dest);
    const result = db.prepare("INSERT INTO audio_files(name,file_path) VALUES(?,?)").run(seed.name,dest);
    audioIds[seed.name] = Number(result.lastInsertRowid);
  }

  // Seed the photographed IT-LINE timetable only on a fresh schedule table.
  const count = db.prepare("SELECT COUNT(*) AS n FROM schedules").get().n;
  if (count === 0) {
    const insert = db.prepare("INSERT INTO schedules(name,time,audio_id,days,enabled) VALUES(?,?,?,?,1)");
    const tx = db.transaction(() => {
      for (const [name,time,audioNumber] of timetable) {
        const audioName = audioNumber === 1 ? "IT-LINE qo‘ng‘iroq 1" : audioNumber === 2 ? "IT-LINE qo‘ng‘iroq 2" : null;
        insert.run(name,time,audioName ? (audioIds[audioName] || null) : null,JSON.stringify([1,2,3,4,5,6]));
      }
    });
    tx();
  }
}
function getDb() { if (!db) throw new Error("Database hali ishga tushmagan."); return db; }
module.exports = { initDatabase, getDb };