import React, { useEffect, useMemo, useState } from "react";
import { AlarmClock, Bell, CalendarClock, Clock3, Headphones, History, LayoutDashboard, Moon, Plus, Power, Settings, Sun, Trash2, Upload, Volume2, X, Pencil, Save } from "lucide-react";

const api = window.smartBell;
const dayNames = ["Yakshanba","Dushanba","Seshanba","Chorshanba","Payshanba","Juma","Shanba"];
const fmt = (d) => new Intl.DateTimeFormat("uz-UZ",{hour:"2-digit",minute:"2-digit",second:"2-digit",hour12:false,timeZone:"Asia/Tashkent"}).format(d);
const dateFmt = (d) => new Intl.DateTimeFormat("uz-UZ",{weekday:"long",year:"numeric",month:"long",day:"numeric",timeZone:"Asia/Tashkent"}).format(d);

export default function App(){
  const [now,setNow]=useState(new Date());
  const [schedules,setSchedules]=useState([]);
  const [audio,setAudio]=useState([]);
  const [history,setHistory]=useState([]);
  const [settings,setSettings]=useState({auto_enabled:"true"});
  const [tab,setTab]=useState("dashboard");
  const [dark,setDark]=useState(true);
  const [playing,setPlaying]=useState(false);
  const [notice,setNotice]=useState("");
  const [modal,setModal]=useState(false);
  const [audioEdit,setAudioEdit]=useState(null);
  const [audioEditName,setAudioEditName]=useState("");
  const [editingId,setEditingId]=useState(null);
  const [draft,setDraft]=useState({name:"Dars boshlanishi",time:"09:00:00",audio_id:"",days:[1,2,3,4,5,6],enabled:true});

  async function refresh(){
    try { const [s,a,h,st]=await Promise.all([api.listSchedules(),api.listAudio(),api.listHistory(),api.getSettings()]); setSchedules(s);setAudio(a);setHistory(h);setSettings(st); }
    catch(e){setNotice(e.message);}
  }
  useEffect(()=>{refresh();const t=setInterval(()=>setNow(new Date()),250);const off=api.onBellEvent(e=>{setNotice(`Qo‘ng‘iroq: ${e.name} — ${e.result}`);refresh();});const offResume=api.onSystemResume?.(()=>{setNow(new Date());refresh();setNotice("Kompyuter uyqu rejimidan uyg‘ondi. Jadval qayta tekshirildi.");});return()=>{clearInterval(t);off();offResume?.();};},[]);
  // Keyingi hodisani bugun va kelasi 7 kun ichidan topamiz.
  // Shunda ertangi kunning haftalik jadvali ham to‘g‘ri hisoblanadi.
  const next=useMemo(()=>{
    const candidates=[];
    for(let offset=0;offset<=7;offset++){
      const date=new Date(now);
      date.setDate(date.getDate()+offset);
      const day=date.getDay();
      for(const item of schedules){
        let days=[];
        try{days=JSON.parse(item.days||"[]");}catch{}
        if(!item.enabled || !days.includes(day)) continue;
        const [h,m,sec]=String(item.time||"00:00:00").split(":").map(Number);
        const at=new Date(date);
        at.setHours(h||0,m||0,sec||0,0);
        if(at>now) candidates.push({...item,at});
      }
    }
    candidates.sort((a,b)=>a.at-b.at);
    return candidates[0]||null;
  },[schedules,now]);
  const countdown=next?Math.max(0,Math.floor((next.at-now)/1000)):null;
  const openNewSchedule=()=>{setEditingId(null);setDraft({name:"",time:"09:00:00",audio_id:"",days:[1,2,3,4,5,6],enabled:true});setModal(true);};
  const openEditSchedule=(item)=>{setEditingId(item.id);setDraft({id:item.id,name:item.name,time:item.time,audio_id:item.audio_id??"",days:JSON.parse(item.days||"[1,2,3,4,5,6]"),enabled:Boolean(item.enabled)});setModal(true);};
  const save=async()=>{try{await api.saveSchedule({...draft,id:editingId||undefined,audio_id:draft.audio_id===""?null:Number(draft.audio_id)});setModal(false);setEditingId(null);await refresh();setNotice(editingId?"Qo‘ng‘iroq ma’lumotlari yangilandi.":"Yangi qo‘ng‘iroq saqlandi.");}catch(e){setNotice(e.message);}};
  const renameAudio=(item)=>{setAudioEdit(item);setAudioEditName(item.name||"");};
  const saveAudioName=async()=>{if(!audioEdit)return;try{await api.renameAudio({id:audioEdit.id,name:audioEditName});setAudioEdit(null);setAudioEditName("");await refresh();setNotice("Audio nomi muvaffaqiyatli yangilandi.");}catch(e){setNotice(e.message);}};
  const importAudio=async()=>{try{const item=await api.importAudio();if(item){await refresh();setNotice("Audio yuklandi.");}}catch(e){setNotice(e.message);}};
  const manualPlay=async(id)=>{if(!id){setNotice("Avval audio tanlang.");return;}try{await api.playAudio({id,volume:1});setPlaying(true);setNotice("Audio ijro etilmoqda.");}catch(e){setNotice(e.message);}};
  const stop=async()=>{await api.stopAudio();setPlaying(false);setNotice("Ovoz to‘xtatildi.");};
  const toggleAuto=async()=>{const value=settings.auto_enabled!=="true"?"true":"false";await api.setSetting({key:"auto_enabled",value});await refresh();};
  const backup=async()=>{try{const result=await api.createBackup();if(result)setNotice("Zaxira nusxa yaratildi.");}catch(e){setNotice("Zaxira nusxada xatolik: "+e.message);}};
  const removeSchedule=async(id)=>{await api.deleteSchedule(id);refresh();};
  const removeAudio=async(id)=>{await api.deleteAudio(id);refresh();};
  const [manualId,setManualId]=useState("");
  return <div className={dark?"app dark":"app light"}>
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark"><Bell size={23}/></div><div><b>IT-LINE</b><small>SMART BELL</small></div></div>
      <div className="side-label">ASOSIY</div>
      {[["dashboard",LayoutDashboard,"Dashboard"],["schedule",CalendarClock,"Qo‘ng‘iroqlar jadvali"],["audio",Headphones,"Audio kutubxonasi"],["history",History,"Qo‘ng‘iroqlar tarixi"]].map(([id,Icon,label])=><button key={id} className={`nav ${tab===id?"active":""}`} onClick={()=>setTab(id)}><Icon size={18}/>{label}</button>)}
      <div className="sidebar-bottom"><div className="system"><span className="pulse"/> Scheduler faol</div><button className="nav" onClick={()=>setDark(!dark)}>{dark?<Sun size={18}/>:<Moon size={18}/>} {dark?"Yorug‘ rejim":"Qorong‘i rejim"}</button></div>
    </aside>
    <main className="main">
      <header className="topbar"><div><span className="eyebrow">IT-LINE MAKTABI</span><h1>{tab==="dashboard"?"Boshqaruv paneli":tab==="schedule"?"Qo‘ng‘iroqlar jadvali":tab==="audio"?"Audio kutubxonasi":"Qo‘ng‘iroqlar tarixi"}</h1></div><div className="top-actions"><span className="live"><i/> Tizim ish holatida</span><button className="icon-btn" title="Zaxira nusxa olish" aria-label="Zaxira nusxa olish" onClick={backup}><Save size={18}/></button><button className="icon-btn" onClick={()=>setDark(!dark)}>{dark?<Sun size={18}/>:<Moon size={18}/>}</button></div></header>
      {notice&&<div className="notice" onClick={()=>setNotice("")}>{notice}<X size={15}/></div>}
      {tab==="dashboard"&&<>
        <section className="hero-grid">
          <div className="clock-card"><div className="card-kicker"><Clock3 size={16}/> HOZIRGI VAQT · TOSHKENT</div><div className="clock">{fmt(now)}</div><div className="date">{dateFmt(now)}</div><div className="clock-footer"><span className="green-dot"/> Kompyuter tizim soati bilan sinxron</div></div>
          <div className="next-card"><div className="card-kicker"><AlarmClock size={16}/> KEYINGI QO‘NG‘IROQ</div>{next?<><h2>{next.name}</h2><div className="next-time">{next.time}</div><div className="countdown"><span>{String(Math.floor(countdown/3600)).padStart(2,"0")}</span><em>:</em><span>{String(Math.floor(countdown%3600/60)).padStart(2,"0")}</span><em>:</em><span>{String(countdown%60).padStart(2,"0")}</span></div><small>SOAT · DAQIQA · SEKUND</small></>:<div className="empty-next">Bugun uchun faol qo‘ng‘iroq yo‘q</div>}</div>
        </section>
        <section className="stats"><div className="stat"><span>Bugungi jadval</span><b>{schedules.length}</b><small>Jami qo‘ng‘iroqlar</small></div><div className="stat"><span>Audio fayllar</span><b>{audio.length}</b><small>Yuklangan ovozlar</small></div><div className="stat"><span>Oxirgi hodisalar</span><b>{history.length}</b><small>Tarixda saqlangan</small></div><div className="stat"><span>Avtomatik rejim</span><b className={settings.auto_enabled==="true"?"status-on":"status-off"}>{settings.auto_enabled==="true"?"YOQIQ":"O‘CHIQ"}</b><small>Scheduler boshqaruvi</small></div></section>
        <section className="content-grid">
          <div className="panel"><div className="panel-head"><div><h3>Bugungi qo‘ng‘iroqlar</h3><p>Faol jadval va belgilangan vaqtlar</p></div><button className="text-btn" onClick={()=>setTab("schedule")}>Barchasi <span>→</span></button></div>
            {schedules.length===0?<div className="blank">Hozircha jadval yo‘q. Birinchi qo‘ng‘iroq vaqtini qo‘shing.</div>:<div className="table">{schedules.slice(0,7).map(s=><div className="schedule-row" key={s.id}><div className="time-pill">{s.time}</div><div className="row-name">{s.name}<small>{s.enabled?"Faol":"O‘chirilgan"}</small></div><span className={s.enabled?"tag":"tag muted"}>{s.enabled?"Yoqilgan":"O‘chiq"}</span></div>)}</div>}
          </div>
          <div className="panel manual"><div className="panel-head"><div><h3>Qo‘lda boshqarish</h3><p>Istalgan vaqtda ovoz chiqarish</p></div><div className="manual-icon"><Bell size={19}/></div></div><label>Audio faylni tanlang</label><select value={manualId} onChange={e=>setManualId(e.target.value)}><option value="">Audio tanlanmagan</option>{audio.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select><button className="primary full" onClick={()=>manualPlay(Number(manualId))}><Bell size={17}/> QO‘NG‘IROQ CHALISH</button><button className="stop full" onClick={stop} disabled={!playing}><X size={17}/> OVOZNI TO‘XTATISH</button><button className="auto-toggle" onClick={toggleAuto}><Power size={16}/> Avtomatik rejim {settings.auto_enabled==="true"?"yoqiq":"o‘chiq"}</button></div>
        </section>
      </>}
      {tab==="schedule"&&<section className="panel page-panel"><div className="panel-head"><div><h3>Qo‘ng‘iroqlar jadvali</h3><p>Vaqtlarni qo‘shing, tahrirlang va boshqaring</p></div><button className="primary" onClick={openNewSchedule}><Plus size={17}/> Yangi vaqt</button></div>
        {schedules.length===0?<div className="blank">Jadval bo‘sh.</div>:schedules.map(s=><div className="schedule-row large" key={s.id}><div className="time-pill">{s.time}</div><div className="row-name">{s.name}<small>{(JSON.parse(s.days||"[]")).map(d=>dayNames[d].slice(0,3)).join(", ")}</small></div><button className={`switch ${s.enabled?"on":""}`} aria-label="Faollashtirish" onClick={async()=>{await api.toggleSchedule({id:s.id,enabled:!s.enabled});refresh()}}/><button className="icon-btn" title="Tahrirlash" aria-label="Tahrirlash" onClick={()=>openEditSchedule(s)}><Pencil size={17}/></button><button className="icon-btn danger" title="O‘chirish" aria-label="O‘chirish" onClick={()=>removeSchedule(s.id)}><Trash2 size={17}/></button></div>)}
      </section>}
      {tab==="audio"&&<section className="panel page-panel"><div className="panel-head"><div><h3>Audio kutubxonasi</h3><p>O‘zingizning qo‘ng‘iroq va musiqa fayllaringiz</p></div><button className="primary" onClick={importAudio}><Upload size={17}/> Audio yuklash</button></div>
        {audio.length===0?<div className="blank">Hozircha audio fayllar yuklanmagan.</div>:audio.map(a=><div className="schedule-row large" key={a.id}><div className="audio-icon"><Volume2 size={18}/></div><div className="row-name">{a.name}<small>Audio fayl · ID {a.id}</small></div><button className="icon-btn" title="Eshitib ko‘rish" onClick={()=>manualPlay(a.id)}><Bell size={17}/></button><button className="icon-btn" title="Nomini tahrirlash" onClick={()=>renameAudio(a)}><Pencil size={17}/></button><button className="icon-btn danger" title="O‘chirish" onClick={()=>removeAudio(a.id)}><Trash2 size={17}/></button></div>)}
      </section>}
      {tab==="history"&&<section className="panel page-panel"><div className="panel-head"><div><h3>Qo‘ng‘iroqlar tarixi</h3><p>Avtomatik va qo‘lda bajarilgan hodisalar</p></div><button className="icon-btn" onClick={refresh}>↻</button></div>
        {history.length===0?<div className="blank">Hali qo‘ng‘iroqlar tarixi mavjud emas.</div>:history.map(h=><div className="schedule-row large" key={h.id}><div className="history-mark"><History size={17}/></div><div className="row-name">{h.name}<small>{new Date(h.created_at).toLocaleString("uz-UZ")} · {h.source==="automatic"?"Avtomatik":"Qo‘lda"}</small></div><span className="tag">{h.result}</span></div>)}
      </section>}
      <footer>IT-LINE SMART BELL <span>Mahalliy Windows dasturi · Asia/Tashkent</span></footer>
    </main>
    {audioEdit&&<div className="modal-backdrop" onClick={()=>setAudioEdit(null)}><div className="modal" onClick={e=>e.stopPropagation()}><div className="modal-head"><h3>Audio nomini tahrirlash</h3><button className="icon-btn" onClick={()=>setAudioEdit(null)}><X/></button></div><label>Audio nomi</label><input autoFocus value={audioEditName} onChange={e=>setAudioEditName(e.target.value)} placeholder="Audio nomini kiriting" maxLength={100}/><button className="primary full" onClick={saveAudioName} disabled={!audioEditName.trim()}><Save size={16}/> O‘zgarishlarni saqlash</button></div></div>}
    {modal&&<div className="modal-backdrop"><div className="modal"><div className="modal-head"><h3>{editingId?"Qo‘ng‘iroqni tahrirlash":"Yangi qo‘ng‘iroq vaqti"}</h3><button className="icon-btn" onClick={()=>setModal(false)}><X/></button></div><label>Qo‘ng‘iroq nomi</label><input value={draft.name} onChange={e=>setDraft({...draft,name:e.target.value})} placeholder="Masalan: 1-dars boshlanishi"/><label>Vaqt (soat:daqiqa:sekund)</label><input type="time" step="1" value={draft.time} onChange={e=>setDraft({...draft,time:e.target.value.length===5?e.target.value+":00":e.target.value})}/><label>Audio fayl</label><select value={draft.audio_id} onChange={e=>setDraft({...draft,audio_id:e.target.value})}><option value="">Audio tanlang</option>{audio.map(a=><option key={a.id} value={a.id}>{a.name}</option>)}</select><label>Hafta kunlari</label><div className="days">{dayNames.slice(1).concat(dayNames[0]).map((d,i)=>{const day=(i+1)%7;return <button key={d} className={draft.days.includes(day)?"day selected":"day"} onClick={()=>setDraft({...draft,days:draft.days.includes(day)?draft.days.filter(x=>x!==day):[...draft.days,day]})}>{d.slice(0,2)}</button>})}</div><button className="primary full" onClick={save}><Save size={16}/>{editingId?"O‘zgarishlarni saqlash":"Saqlash"}</button></div></div>}
  </div>
}