const { getDb } = require("./database.cjs");
const fs = require("node:fs");
const { BrowserWindow } = require("electron");
let timer = null;
let audioWindow = null;
let lastTickSecond = -1;
let runTickNow = null;

function playAudio(filePath, volume=1) {
  if (!fs.existsSync(filePath)) throw new Error("Audio fayl topilmadi: " + filePath);
  if (!audioWindow || audioWindow.isDestroyed()) {
    audioWindow = new BrowserWindow({
      show: false, width: 1, height: 1,
      webPreferences: { preload: require("node:path").join(__dirname, "player-preload.cjs"), contextIsolation: true, nodeIntegration: false, sandbox: true }
    });
    audioWindow.loadFile(require("node:path").join(__dirname, "player.html"));
  }
  const send = () => audioWindow.webContents.send("player:play", { fileUrl: require("node:url").pathToFileURL(filePath).href, volume: Math.max(0, Math.min(1, Number(volume))) });
  if (audioWindow.webContents.isLoading()) audioWindow.webContents.once("did-finish-load", send); else send();
}
function stopAudio() { if (audioWindow && !audioWindow.isDestroyed()) audioWindow.webContents.send("player:stop"); }

function startScheduler(onEvent=()=>{}) {
  if (timer) return;
  const tick = () => {
    const now = new Date();
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Tashkent", hour: "2-digit", minute: "2-digit", second: "2-digit",
      year: "numeric", month: "2-digit", day: "2-digit", weekday: "short", hourCycle: "h23"
    }).formatToParts(now).reduce((acc,p) => (acc[p.type]=p.value,acc), {});
    const second = Math.floor(now.getTime()/1000);
    if (second === lastTickSecond) return;
    lastTickSecond = second;
    const settings = Object.fromEntries(getDb().prepare("SELECT key,value FROM settings").all().map(x=>[x.key,x.value]));
    if (settings.auto_enabled !== "true") return;
    const time = `${parts.hour}:${parts.minute}:${parts.second}`;
    const weekdayIndex = ({Sun:0,Mon:1,Tue:2,Wed:3,Thu:4,Fri:5,Sat:6})[parts.weekday];
    const day = weekdayIndex;
    const dayKey = `${parts.year}-${parts.month}-${parts.day}`;
    const due = getDb().prepare("SELECT s.*,a.file_path FROM schedules s LEFT JOIN audio_files a ON a.id=s.audio_id WHERE s.enabled=1 AND s.time=?").all(time);
    for (const item of due) {
      let days=[]; try { days=JSON.parse(item.days); } catch {}
      if (!days.includes(day)) continue;
      const firedKey = `${dayKey} ${time}`;
      if (item.last_fired_key === firedKey) continue;
      getDb().prepare("UPDATE schedules SET last_fired_key=? WHERE id=?").run(firedKey,item.id);
      let result="no-audio";
      try { if (item.file_path) { playAudio(item.file_path,1); result="started"; } }
      catch (err) { result="error"; }
      getDb().prepare("INSERT INTO history(source,name,result,created_at) VALUES(?,?,?,?)")
        .run("automatic",item.name,result,now.toISOString());
      onEvent({name:item.name,time,result,source:"automatic"});
    }
  };
  runTickNow = tick;
  tick();
  // Main-process scheduler; aligns each wake-up to the next wall-clock second.
  const scheduleNext = () => {
    const delay = 1000 - (Date.now() % 1000);
    timer = setTimeout(() => { tick(); scheduleNext(); }, delay);
  };
  scheduleNext();
}
function checkSchedulerNow() { if (runTickNow) { lastTickSecond = -1; runTickNow(); } }
function stopScheduler() { if (timer) clearTimeout(timer); timer=null; runTickNow=null; }
module.exports = { startScheduler, stopScheduler, checkSchedulerNow, playAudio, stopAudio };