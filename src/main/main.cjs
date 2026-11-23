const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  Tray,
  Menu,
  nativeImage,
  powerMonitor,
} = require("electron");

const path = require("node:path");
const fs = require("node:fs");

const { initDatabase, getDb } = require("./database.cjs");

const {
  startScheduler,
  stopScheduler,
  playAudio,
  stopAudio,
  checkSchedulerNow,
} = require("./scheduler.cjs");

// ==========================================
// GLOBAL VARIABLES
// ==========================================

let mainWindow = null;
let tray = null;
let isQuitting = false;

const APP_NAME = "IT-LINE SMART BELL";

// ==========================================
// HELPER FUNCTIONS
// ==========================================

function getDatabase() {
  return getDb();
}

function logEvent(source, name, result) {
  try {
    getDatabase()
      .prepare(
        `
        INSERT INTO history
        (source, name, result, created_at)
        VALUES (?, ?, ?, ?)
      `,
      )
      .run(source, name, result, new Date().toISOString());
  } catch (error) {
    console.error("Tarixga yozishda xatolik:", error);
  }
}

function normalizeTime(value) {
  const time = String(value || "").trim();

  // 08:30 formatini 08:30:00 ga aylantirish
  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    return time + ":00";
  }

  // 08:30:00 formatini tekshirish
  if (/^([01]\d|2[0-3]):[0-5]\d:[0-5]\d$/.test(time)) {
    return time;
  }

  throw new Error("Vaqtni to‘g‘ri kiriting. Masalan: 08:30");
}

function validateName(value) {
  const name = String(value || "").trim();

  if (!name) {
    throw new Error("Qo‘ng‘iroq nomini kiriting.");
  }

  if (name.length > 100) {
    throw new Error("Nom 100 ta belgidan oshmasligi kerak.");
  }

  return name;
}

function validateDays(value) {
  const days = Array.isArray(value) ? value : [1, 2, 3, 4, 5, 6];

  const result = [
    ...new Set(
      days
        .map(Number)
        .filter((day) => Number.isInteger(day) && day >= 0 && day <= 6),
    ),
  ];

  if (result.length === 0) {
    throw new Error("Kamida bitta hafta kunini tanlang.");
  }

  return result.sort((a, b) => a - b);
}

function validateId(value) {
  const id = Number(value);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("ID noto‘g‘ri.");
  }

  return id;
}

function getAudioById(id) {
  const audioId = validateId(id);

  const audio = getDatabase()
    .prepare("SELECT * FROM audio_files WHERE id = ?")
    .get(audioId);

  if (!audio) {
    throw new Error("Audio fayl topilmadi.");
  }

  return audio;
}

// ==========================================
// WINDOW
// ==========================================

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 360,
    minHeight: 560,
    show: false,
    backgroundColor: "#0b1020",
    title: APP_NAME,

    webPreferences: {
      preload: path.join(__dirname, "../preload/preload.cjs"),

      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (app.isPackaged) {
    mainWindow.loadFile(path.join(__dirname, "../../dist/index.html"));
  } else {
    mainWindow.loadURL("http://127.0.0.1:5173");
  }

  mainWindow.once("ready-to-show", () => {
    if (!process.argv.includes("--hidden")) {
      mainWindow.show();
    }
  });

  mainWindow.on("close", (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

// ==========================================
// SYSTEM TRAY
// ==========================================

function createTray() {
  try {
    const iconPath = path.join(process.resourcesPath, "app.ico");

    const icon = fs.existsSync(iconPath)
      ? nativeImage.createFromPath(iconPath)
      : nativeImage.createEmpty();

    tray = new Tray(icon);

    tray.setToolTip(APP_NAME);

    tray.setContextMenu(
      Menu.buildFromTemplate([
        {
          label: "IT-LINE SMART BELL",
          enabled: false,
        },
        { type: "separator" },
        {
          label: "Oynani ochish",
          click: () => {
            showWindow();
          },
        },
        {
          label: "Ovozni to‘xtatish",
          click: () => {
            stopAudio();
          },
        },
        {
          label: "Zaxira nusxa olish...",
          click: () => {
            createBackup();
          },
        },
        { type: "separator" },
        {
          label: "Dasturdan chiqish",
          click: () => {
            isQuitting = true;
            stopScheduler();
            app.quit();
          },
        },
      ]),
    );

    tray.on("double-click", showWindow);
  } catch (error) {
    console.error("Tray yaratishda xatolik:", error);
  }
}

function showWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    createWindow();
  } else {
    mainWindow.show();
    mainWindow.focus();
  }
}

// ==========================================
// BACKUP — DATABASE + AUDIO FILES
// ==========================================

async function createBackup() {
  const picked = await dialog.showOpenDialog(mainWindow, {
    title: "Zaxira nusxa saqlanadigan papkani tanlang",
    properties: ["openDirectory", "createDirectory"],
  });
  if (picked.canceled || !picked.filePaths[0]) return null;

  const userData = app.getPath("userData");
  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupDir = path.join(picked.filePaths[0], `ITLINE-SMART-BELL-${stamp}`);
  fs.mkdirSync(backupDir, { recursive: true });

  // WAL ichidagi oxirgi tranzaksiyalarni asosiy SQLite fayliga yozib qo‘yamiz.
  try { getDatabase().pragma("wal_checkpoint(FULL)"); } catch (error) {
    console.error("SQLite checkpoint xatosi:", error);
  }

  const dbFile = path.join(userData, "smart-bell.sqlite");
  if (fs.existsSync(dbFile)) fs.copyFileSync(dbFile, path.join(backupDir, "smart-bell.sqlite"));
  const audioDir = path.join(userData, "audio");
  if (fs.existsSync(audioDir)) fs.cpSync(audioDir, path.join(backupDir, "audio"), { recursive: true });
  fs.writeFileSync(path.join(backupDir, "backup-info.txt"),
    `IT-LINE SMART BELL zaxira nusxasi\nSana: ${new Date().toLocaleString("uz-UZ")}\nTarkib: ma'lumotlar bazasi va audio fayllar\n`, "utf8");

  dialog.showMessageBox(mainWindow, {
    type: "info", title: APP_NAME,
    message: "Zaxira nusxa muvaffaqiyatli yaratildi.",
    detail: backupDir,
  });
  return backupDir;
}

// ==========================================
// APPLICATION START
// ==========================================

app.whenReady().then(() => {
  try {
    initDatabase(
      app.getPath("userData"),
      process.resourcesPath,
      app.isPackaged,
    );

    createWindow();
    createTray();

    // Avtomatik qo‘ng‘iroq scheduler
    startScheduler((event) => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("bell:event", event);
      }
    });

    // Windows bilan birga avtomatik ishga tushirish
    if (process.platform === "win32" && app.isPackaged) {
      app.setLoginItemSettings({
        openAtLogin: true,
        path: process.execPath,
        args: ["--hidden"],
      });
    }
  } catch (error) {
    console.error("Dastur ishga tushishida xatolik:", error);

    dialog.showErrorBox(
      "IT-LINE SMART BELL",
      "Dastur ishga tushmadi:\n" + error.message,
    );

    app.quit();
  }
});

app.on("before-quit", () => {
  isQuitting = true;
  stopScheduler();
  stopAudio();
});

app.on("window-all-closed", () => {
  // Windows tray rejimida dastur ishlashda davom etadi.
});

app.on("activate", () => {
  showWindow();
});

// Uyqu rejimidan qaytganda scheduler vaqtni qayta tekshiradi.
powerMonitor.on("resume", () => {
  checkSchedulerNow();
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("system:resumed", { at: new Date().toISOString() });
  }
});

// ==========================================
// APPLICATION STATUS
// ==========================================

ipcMain.handle("backup:create", () => createBackup());

ipcMain.handle("app:status", () => {
  return {
    name: APP_NAME,
    version: app.getVersion(),
    platform: process.platform,
    timezone: "Asia/Tashkent",
    now: new Date().toISOString(),
    packaged: app.isPackaged,
  };
});

// ==========================================
// SCHEDULE: LIST
// ==========================================

ipcMain.handle("schedule:list", () => {
  return getDatabase()
    .prepare(
      `
      SELECT
        s.*,
        a.name AS audio_name
      FROM schedules s
      LEFT JOIN audio_files a
        ON a.id = s.audio_id
      ORDER BY s.time ASC, s.id ASC
    `,
    )
    .all();
});

// ==========================================
// SCHEDULE: SAVE / UPDATE
// ==========================================

ipcMain.handle("schedule:save", (_event, item) => {
  const db = getDatabase();

  if (!item || typeof item !== "object") {
    throw new Error("Qo‘ng‘iroq ma'lumotlari noto‘g‘ri.");
  }

  const name = validateName(item.name);
  const time = normalizeTime(item.time);
  const days = validateDays(item.days);

  let audioId = null;

  if (
    item.audio_id !== null &&
    item.audio_id !== undefined &&
    item.audio_id !== ""
  ) {
    audioId = validateId(item.audio_id);

    const audio = db
      .prepare("SELECT id FROM audio_files WHERE id = ?")
      .get(audioId);

    if (!audio) {
      throw new Error("Tanlangan audio fayl topilmadi.");
    }
  }

  const enabled = item.enabled === false ? 0 : 1;

  // MAVJUD QO‘NG‘IROQNI YANGILASH
  if (item.id !== null && item.id !== undefined && item.id !== "") {
    const id = validateId(item.id);

    const result = db
      .prepare(
        `
      UPDATE schedules
      SET
        name = ?,
        time = ?,
        audio_id = ?,
        days = ?,
        enabled = ?,
        last_fired_key = NULL
      WHERE id = ?
    `,
      )
      .run(name, time, audioId, JSON.stringify(days), enabled, id);

    if (result.changes === 0) {
      throw new Error("Yangilanadigan qo‘ng‘iroq topilmadi.");
    }

    return db
      .prepare(
        `
      SELECT * FROM schedules WHERE id = ?
    `,
      )
      .get(id);
  }

  // YANGI QO‘NG‘IROQ QO‘SHISH
  const result = db
    .prepare(
      `
    INSERT INTO schedules
    (
      name,
      time,
      audio_id,
      days,
      enabled
    )
    VALUES (?, ?, ?, ?, ?)
  `,
    )
    .run(name, time, audioId, JSON.stringify(days), enabled);

  const newItem = db
    .prepare(
      `
    SELECT * FROM schedules WHERE id = ?
  `,
    )
    .get(Number(result.lastInsertRowid));

  return newItem;
});

// ==========================================
// SCHEDULE: DELETE
// ==========================================

ipcMain.handle("schedule:delete", (_event, id) => {
  const scheduleId = validateId(id);

  const result = getDatabase()
    .prepare("DELETE FROM schedules WHERE id = ?")
    .run(scheduleId);

  return result.changes > 0;
});

// ==========================================
// SCHEDULE: ENABLE / DISABLE
// ==========================================

ipcMain.handle("schedule:toggle", (_event, data) => {
  if (!data) {
    throw new Error("Ma'lumot noto‘g‘ri.");
  }

  const id = validateId(data.id);
  const enabled = data.enabled ? 1 : 0;

  const result = getDatabase()
    .prepare(
      `
        UPDATE schedules
        SET enabled = ?
        WHERE id = ?
      `,
    )
    .run(enabled, id);

  return result.changes > 0;
});

// ==========================================
// AUDIO: IMPORT
// ==========================================

ipcMain.handle("audio:import", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: "Audio fayl tanlang",
    properties: ["openFile"],
    filters: [
      {
        name: "Audio fayllar",
        extensions: ["mp3", "wav", "ogg", "m4a", "aac", "flac"],
      },
    ],
  });

  if (result.canceled || !result.filePaths[0]) {
    return null;
  }

  const source = result.filePaths[0];
  const extension = path.extname(source).toLowerCase();

  const audioDir = path.join(app.getPath("userData"), "audio");

  fs.mkdirSync(audioDir, {
    recursive: true,
  });

  const uniqueName =
    Date.now() + "-" + Math.random().toString(16).slice(2, 8) + extension;

  const destination = path.join(audioDir, uniqueName);

  fs.copyFileSync(source, destination);

  try {
    const name = path.basename(source, extension);

    const result = getDatabase()
      .prepare(
        `
        INSERT INTO audio_files
        (name, file_path)
        VALUES (?, ?)
      `,
      )
      .run(name, destination);

    return getDatabase()
      .prepare(
        `
        SELECT id, name
        FROM audio_files
        WHERE id = ?
      `,
      )
      .get(Number(result.lastInsertRowid));
  } catch (error) {
    try {
      fs.unlinkSync(destination);
    } catch {}

    throw error;
  }
});

// ==========================================
// AUDIO: LIST
// ==========================================

ipcMain.handle("audio:list", () => {
  return getDatabase()
    .prepare(
      `
      SELECT id, name
      FROM audio_files
      ORDER BY name ASC
    `,
    )
    .all();
});

// ==========================================
// AUDIO: RENAME
// ==========================================

ipcMain.handle("audio:rename", (_event, data) => {
  const id = validateId(data?.id);
  const name = validateName(data?.name);

  const result = getDatabase()
    .prepare(
      `
        UPDATE audio_files
        SET name = ?
        WHERE id = ?
      `,
    )
    .run(name, id);

  return result.changes > 0;
});

// ==========================================
// AUDIO: DELETE
// ==========================================

ipcMain.handle("audio:delete", (_event, id) => {
  const audioId = validateId(id);
  const db = getDatabase();

  const audio = db
    .prepare(
      `
    SELECT * FROM audio_files WHERE id = ?
  `,
    )
    .get(audioId);

  if (!audio) {
    return false;
  }

  // Audio ishlatilayotgan jadval yozuvlarini bo‘shatish
  db.prepare(
    `
    UPDATE schedules
    SET audio_id = NULL
    WHERE audio_id = ?
  `,
  ).run(audioId);

  db.prepare(
    `
    DELETE FROM audio_files WHERE id = ?
  `,
  ).run(audioId);

  // Faylni o‘chirish
  try {
    if (fs.existsSync(audio.file_path)) {
      fs.unlinkSync(audio.file_path);
    }
  } catch (error) {
    console.error("Audio faylni o‘chirishda xatolik:", error);
  }

  return true;
});

// ==========================================
// AUDIO: PLAY
// ==========================================

ipcMain.handle("audio:play", (_event, data) => {
  const audio = getAudioById(data?.id);

  const volume = Math.max(0, Math.min(1, Number(data?.volume ?? 1)));

  if (!Number.isFinite(volume)) {
    throw new Error("Ovoz balandligi noto‘g‘ri.");
  }

  playAudio(audio.file_path, volume);

  logEvent("manual", audio.name, "started");

  return true;
});

// ==========================================
// AUDIO: STOP
// ==========================================

ipcMain.handle("audio:stop", () => {
  stopAudio();

  logEvent("manual", "Ovoz to‘xtatildi", "stopped");

  return true;
});

// ==========================================
// HISTORY: LIST
// ==========================================

ipcMain.handle("history:list", () => {
  return getDatabase()
    .prepare(
      `
      SELECT *
      FROM history
      ORDER BY id DESC
      LIMIT 100
    `,
    )
    .all();
});

// ==========================================
// SETTINGS: GET
// ==========================================

ipcMain.handle("settings:get", () => {
  const rows = getDatabase()
    .prepare(
      `
      SELECT key, value
      FROM settings
    `,
    )
    .all();

  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
});

// ==========================================
// SETTINGS: SET
// ==========================================

ipcMain.handle("settings:set", (_event, data) => {
  const key = String(data?.key || "").trim();

  if (!key || key.length > 100) {
    throw new Error("Sozlama nomi noto‘g‘ri.");
  }

  const value = String(data?.value ?? "");

  getDatabase()
    .prepare(
      `
        INSERT INTO settings (key, value)
        VALUES (?, ?)
        ON CONFLICT(key)
        DO UPDATE SET value = excluded.value
      `,
    )
    .run(key, value);

  return true;
});

// ==========================================
// IPC ERROR HANDLING
// ==========================================

process.on("uncaughtException", (error) => {
  console.error("Kutilmagan xatolik:", error);
});

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Promise Rejection:", reason);
});
