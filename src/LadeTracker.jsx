import { useState, useEffect, useMemo, useRef, useCallback } from "react";

const GITHUB_FILE = "data/tracker.json";
const LOCAL_TOKEN_KEY = "ev-gh-token";
const LOCAL_USER_KEY = "ev-default-user";
const LOCAL_NAMES_KEY = "ev-user-names";

// ─── GitHub DB ───
class GitHubDB {
  constructor(token, repo) {
    this.token = token;
    this.repo = repo;
    this.sha = null;
    this.baseUrl = `https://api.github.com/repos/${repo}/contents/${GITHUB_FILE}`;
  }
  async read() {
    try {
      const res = await fetch(this.baseUrl, {
        headers: { Authorization: `Bearer ${this.token}`, Accept: "application/vnd.github.v3+json" },
      });
      if (res.status === 404) return null;
      if (!res.ok) throw new Error(`GitHub API ${res.status}`);
      const json = await res.json();
      this.sha = json.sha;
      return JSON.parse(atob(json.content));
    } catch (e) { console.error("DB read:", e); return null; }
  }
  async write(data) {
    try {
      const body = {
        message: `Update ${new Date().toISOString()}`,
        content: btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2)))),
      };
      if (this.sha) body.sha = this.sha;
      const res = await fetch(this.baseUrl, {
        method: "PUT",
        headers: { Authorization: `Bearer ${this.token}`, Accept: "application/vnd.github.v3+json", "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.status === 409) {
        await this.read();
        body.sha = this.sha;
        const retry = await fetch(this.baseUrl, {
          method: "PUT",
          headers: { Authorization: `Bearer ${this.token}`, Accept: "application/vnd.github.v3+json", "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!retry.ok) throw new Error(`Retry ${retry.status}`);
        this.sha = (await retry.json()).content.sha;
        return true;
      }
      if (!res.ok) throw new Error(`GitHub API ${res.status}`);
      this.sha = (await res.json()).content.sha;
      return true;
    } catch (e) { console.error("DB write:", e); return false; }
  }
}

// ─── Icons ───
const I = ({ d, s = 20, c = "currentColor" }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
);
const ic = {
  bolt: "M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  plus: "M12 5v14M5 12h14",
  chart: "M18 20V10M12 20V4M6 20v-6",
  car: "M5 17h14M5 17a2 2 0 01-2-2V9a2 2 0 012-2h1l2-3h8l2 3h1a2 2 0 012 2v6a2 2 0 01-2 2M8 17v2M16 17v2",
  map: "M21 10c0 6-9 13-9 13S3 16 3 10a9 9 0 0118 0zM12 13a3 3 0 100-6 3 3 0 000 6z",
  user: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 3a4 4 0 100 8 4 4 0 000-8z",
  trash: "M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6",
  chevDown: "M6 9l6 6 6-6",
  download: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
  lock: "M19 11H5a2 2 0 00-2 2v7a2 2 0 002 2h14a2 2 0 002-2v-7a2 2 0 00-2-2zM7 11V7a5 5 0 0110 0v4",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z",
  refresh: "M23 4v6h-6M1 20v-6h6M20.49 9A9 9 0 005.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 013.51 15",
  edit: "M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.12 2.12 0 013 3L12 15l-4 1 1-4 9.5-9.5z",
  eye: "M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8zM12 9a3 3 0 100 6 3 3 0 000-6z",
  eyeOff: "M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22",
  upload: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12",
  save: "M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2zM17 21v-8H7v8M7 3v5h8",
};

const C = {
  bg: "#0F1117", card: "#1A1D27", accent: "#3ECF8E", accentDim: "#2A9D68",
  accentGlow: "rgba(62,207,142,0.12)", text: "#E8ECF1", textDim: "#8B92A5",
  border: "#2A2D3A", danger: "#F45B69", input: "#141620", blue: "#5B8DEF", orange: "#F5A623",
};
const font = "'DM Sans', 'Segoe UI', system-ui, sans-serif";
const mono = "'JetBrains Mono', 'Fira Code', monospace";

function exportCSV(entries) {
  const h = "Datum;Benutzer;Kilometerstand;kWh;Preis (CHF);CHF/kWh;Ladestation;Notizen";
  const r = entries.map(e => [e.date,e.user,e.km,e.kwh.toFixed(1),e.price.toFixed(2),e.pricePerKwh.toFixed(2),`"${e.location}"`,`"${e.notes||""}"`].join(";"));
  const blob = new Blob(["\uFEFF"+[h,...r].join("\n")], { type: "text/csv;charset=utf-8;" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = `evChargeTracker-${new Date().toISOString().slice(0,10)}.csv`; a.click();
}

function exportJSON(entries, locations) {
  const data = { exportDate: new Date().toISOString(), entries, locations };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
  a.download = `evChargeTracker-backup-${new Date().toISOString().slice(0,10)}.json`; a.click();
}

function importJSON(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.entries || !Array.isArray(data.entries)) { reject("Ungültige Backup-Datei"); return; }
        resolve({ entries: data.entries, locations: data.locations || [] });
      } catch { reject("Datei konnte nicht gelesen werden"); }
    };
    reader.onerror = () => reject("Lesefehler");
    reader.readAsText(file);
  });
}

const inp = { width:"100%", padding:"14px 16px", background:C.input, border:`1px solid ${C.border}`, borderRadius:12, color:C.text, fontSize:16, fontFamily:font, outline:"none", boxSizing:"border-box" };
const lbl = { display:"block", fontSize:12, fontWeight:600, color:C.textDim, textTransform:"uppercase", letterSpacing:"0.08em", marginBottom:6, fontFamily:font };
const btnP = { width:"100%", padding:"16px", background:`linear-gradient(135deg,${C.accent},${C.accentDim})`, border:"none", borderRadius:14, color:"#fff", fontSize:16, fontWeight:700, fontFamily:font, cursor:"pointer", boxShadow:`0 4px 20px ${C.accentGlow}` };

// ═══ SETUP ═══
function Setup({ onDone }) {
  const [token, setToken] = useState(""); const [repo, setRepo] = useState("");
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(""); const [show, setShow] = useState(false);
  const go = async () => {
    if (!token.trim()||!repo.trim()) return; setBusy(true); setErr("");
    try {
      const r = await fetch(`https://api.github.com/repos/${repo.trim()}`, { headers:{Authorization:`Bearer ${token.trim()}`} });
      if (!r.ok) throw new Error(r.status===404?"Repo nicht gefunden":`Fehler ${r.status}`);
      localStorage.setItem(LOCAL_TOKEN_KEY, JSON.stringify({token:token.trim(),repo:repo.trim()}));
      onDone(token.trim(), repo.trim());
    } catch(e) { setErr(e.message); } finally { setBusy(false); }
  };
  return (
    <div style={{ minHeight:"100dvh", background:C.bg, fontFamily:font, color:C.text, display:"flex", alignItems:"center", justifyContent:"center", padding:20 }}>
      <div style={{ maxWidth:400, width:"100%" }}>
        <div style={{ textAlign:"center", marginBottom:32 }}>
          <div style={{ width:64,height:64,borderRadius:20,margin:"0 auto 16px",background:`linear-gradient(135deg,${C.accent},${C.accentDim})`,display:"flex",alignItems:"center",justifyContent:"center" }}>
            <I d={ic.bolt} s={32} c="#fff" />
          </div>
          <h1 style={{ margin:0, fontSize:24, fontWeight:800 }}>evChargeTracker</h1>
          <p style={{ color:C.textDim, fontSize:14, marginTop:8 }}>Einmalige Einrichtung</p>
        </div>
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <div>
            <label style={lbl}>GitHub Repository</label>
            <input type="text" placeholder="username/lade-tracker" value={repo} onChange={e=>setRepo(e.target.value)} style={inp} />
            <p style={{ fontSize:11, color:C.textDim, marginTop:4 }}>Format: dein-username/repo-name</p>
          </div>
          <div>
            <label style={lbl}>GitHub Personal Access Token</label>
            <div style={{ position:"relative" }}>
              <input type={show?"text":"password"} placeholder="ghp_xxxxxxxxxxxx" value={token} onChange={e=>setToken(e.target.value)} style={{...inp,paddingRight:44}} />
              <button onClick={()=>setShow(!show)} style={{ position:"absolute",right:8,top:"50%",transform:"translateY(-50%)",border:"none",background:"transparent",cursor:"pointer",padding:6 }}>
                <I d={show?ic.eyeOff:ic.eye} s={18} c={C.textDim} />
              </button>
            </div>
            <p style={{ fontSize:11, color:C.textDim, marginTop:4 }}>GitHub → Settings → Developer Settings → Fine-grained tokens → Berechtigung: Contents Read & Write</p>
          </div>
          {err && <div style={{ padding:"12px 16px", background:"rgba(244,91,105,0.1)", borderRadius:10, color:C.danger, fontSize:13 }}>{err}</div>}
          <button onClick={go} disabled={busy} style={{...btnP, opacity:busy?0.6:1}}>{busy?"Verbinde...":"Verbinden & Weiter"}</button>
        </div>
      </div>
    </div>
  );
}

// ═══ MAIN ═══
export default function LadeTracker() {
  const [state, setState] = useState("loading");
  const [db, setDb] = useState(null);
  const [entries, setEntries] = useState([]);
  const [locations, setLocations] = useState([]);
  const [view, setView] = useState("list");
  const [delId, setDelId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [showSet, setShowSet] = useState(false);
  const saveTimer = useRef(null);
  const [userNames, setUserNames] = useState(() => {
    try { return JSON.parse(localStorage.getItem(LOCAL_NAMES_KEY)) || ["Patrick","Eveline"]; } catch { return ["Patrick","Eveline"]; }
  });
  const [editingNames, setEditingNames] = useState(false);
  const [nameInputs, setNameInputs] = useState(["",""]);
  const savedUser = localStorage.getItem(LOCAL_USER_KEY) || userNames[0];
  const [form, setForm] = useState({ km:"",kwh:"",price:"",location:"",newLocation:"",user:savedUser,date:new Date().toISOString().slice(0,10),notes:"" });
  const [showNewLoc, setShowNewLoc] = useState(false);
  const [formError, setFormError] = useState("");
  const [editId, setEditId] = useState(null);
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const DEFAULT_LOCATIONS = ["Zu Hause", "Migros", "Coop", "Lidl", "Tesla Supercharger"];

  // Last km for pre-fill
  const lastKm = useMemo(() => {
    if (!entries.length) return null;
    const sorted = [...entries].sort((a,b) => b.km - a.km);
    return sorted[0].km;
  }, [entries]);

  // ─── Auto-update check ───
  useEffect(() => {
    const STORED_VERSION_KEY = "ev-app-version";
    let initialVersion = null;
    const checkUpdate = async () => {
      try {
        const res = await fetch("version.json?t=" + Date.now());
        if (!res.ok) return;
        const data = await res.json();
        // First check after page load: save version, no banner
        if (!initialVersion) { initialVersion = data.version; localStorage.setItem(STORED_VERSION_KEY, data.version); return; }
        // Subsequent checks: compare with version we loaded with
        if (data.version !== initialVersion) { setUpdateAvailable(true); }
      } catch {}
    };
    checkUpdate();
    const interval = setInterval(checkUpdate, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const s = localStorage.getItem(LOCAL_TOKEN_KEY);
    if (!s) { setState("setup"); return; }
    try {
      const {token,repo} = JSON.parse(s);
      const d = new GitHubDB(token,repo); setDb(d);
      d.read().then(data => {
        if (data) { setEntries(data.entries||[]); setLocations(data.locations||[]); }
        setLastSync(new Date());
        setState("app");
      });
    } catch { setState("setup"); }
  }, []);

  const saveGH = useCallback(async (e, l) => {
    if(!db) return; setSaving(true);
    await db.write({entries:e, locations:l});
    setLastSync(new Date()); setSaving(false);
  }, [db]);

  const dSave = useCallback((e,l) => {
    if(saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(()=>saveGH(e,l), 500);
  }, [saveGH]);

  const sync = async () => { if(!db)return; setSaving(true); const d=await db.read(); if(d){setEntries(d.entries||[]);setLocations(d.locations||[]);setLastSync(new Date());} setSaving(false); };

  const addEntry = () => {
    const loc = showNewLoc ? form.newLocation.trim() : form.location;
    const missing = [];
    if (!form.km) missing.push("Kilometerstand");
    if (!form.kwh) missing.push("kWh");
    if (!loc) missing.push("Ladestation");
    if (missing.length > 0) { setFormError("Bitte ausfüllen: " + missing.join(", ")); return; }
    setFormError("");
    const priceVal = form.price ? parseFloat(form.price) : 0;
    const entryData = { km:parseFloat(form.km), kwh:parseFloat(form.kwh), price:priceVal, location:loc, user:form.user, date:form.date, notes:form.notes.trim(), pricePerKwh:priceVal > 0 ? priceVal/parseFloat(form.kwh) : 0 };

    let nl = locations;
    if (!locations.includes(loc)) { nl=[...locations,loc].sort(); setLocations(nl); }

    let ne;
    if (editId) {
      ne = entries.map(e => e.id === editId ? { ...e, ...entryData } : e);
      setEditId(null);
    } else {
      ne = [{ id:Date.now(), ...entryData }, ...entries];
    }
    setEntries(ne); dSave(ne, nl);
    localStorage.setItem(LOCAL_USER_KEY, form.user);
    setForm({km:"",kwh:"",price:"",location:"",newLocation:"",user:form.user,date:new Date().toISOString().slice(0,10),notes:""});
    setShowNewLoc(false); setView("list");
  };

  const startEdit = (e) => {
    setForm({ km:String(e.km), kwh:String(e.kwh), price:e.price>0?String(e.price):"", location:e.location, newLocation:"", user:e.user, date:e.date, notes:e.notes||"" });
    setEditId(e.id);
    setShowNewLoc(false);
    setFormError("");
    setView("add");
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm({km:"",kwh:"",price:"",location:"",newLocation:"",user:savedUser,date:new Date().toISOString().slice(0,10),notes:""});
    setFormError("");
    setView("list");
  };

  const delEntry = (id) => { const ne=entries.filter(e=>e.id!==id); setEntries(ne); dSave(ne,locations); setDelId(null); };

  const stats = useMemo(() => {
    if (!entries.length) return null;
    const tK=entries.reduce((s,e)=>s+e.kwh,0), tC=entries.reduce((s,e)=>s+e.price,0), avg=tC/tK;
    const sorted=[...entries].sort((a,b)=>a.km-b.km);
    const range=sorted.length>1?sorted[sorted.length-1].km-sorted[0].km:0;
    const cons=range>0?(tK/range)*100:0;
    const mo={}; entries.forEach(e=>{const m=e.date.slice(0,7);if(!mo[m])mo[m]={kwh:0,cost:0,count:0};mo[m].kwh+=e.kwh;mo[m].cost+=e.price;mo[m].count+=1;});
    const lf={}; entries.forEach(e=>{lf[e.location]=(lf[e.location]||0)+1;});
    return {totalKwh:tK,totalCost:tC,avgPricePerKwh:avg,kmRange:range,consumption:cons,monthly:mo,locFreq:lf};
  }, [entries]);

  if (state==="loading") return <div style={{minHeight:"100dvh",background:C.bg,display:"flex",alignItems:"center",justifyContent:"center"}}><div style={{color:C.accent,fontSize:18,fontFamily:font}}>Laden...</div></div>;
  if (state==="setup") return <Setup onDone={(t,r)=>{const d=new GitHubDB(t,r);setDb(d);d.read().then(data=>{if(data){setEntries(data.entries||[]);setLocations(data.locations||[]);}setLastSync(new Date());setState("app");});}} />;

  return (
    <div style={{ minHeight:"100dvh", background:C.bg, fontFamily:font, color:C.text, maxWidth:480, margin:"0 auto", paddingBottom:100 }}>
      {/* Header */}
      <div style={{ padding:"24px 20px 16px", background:`linear-gradient(180deg,rgba(62,207,142,0.08)0%,transparent 100%)` }}>
        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between" }}>
          <div style={{ display:"flex", alignItems:"center", gap:10 }}>
            <div style={{ width:40,height:40,borderRadius:12,background:`linear-gradient(135deg,${C.accent},${C.accentDim})`,display:"flex",alignItems:"center",justifyContent:"center" }}>
              <I d={ic.bolt} s={22} c="#fff" />
            </div>
            <div>
              <h1 style={{ margin:0,fontSize:22,fontWeight:800,letterSpacing:"-0.02em" }}>evChargeTracker</h1>
              <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                <p style={{ margin:0,fontSize:12,color:C.textDim }}>{entries.length} Ladevorgänge</p>
                {saving && <span style={{ fontSize:10,color:C.orange }}>speichert...</span>}
              </div>
            </div>
          </div>
          <div style={{ display:"flex", gap:6 }}>
            <button onClick={sync} style={{ border:`1px solid ${C.border}`,background:"transparent",borderRadius:10,padding:8,cursor:"pointer",display:"flex",alignItems:"center" }}>
              <I d={ic.refresh} s={16} c={C.textDim} />
            </button>
            {entries.length>0 && <button onClick={()=>exportCSV(entries)} style={{ border:`1px solid ${C.border}`,background:"transparent",borderRadius:10,padding:"8px 10px",cursor:"pointer",display:"flex",alignItems:"center",gap:4,color:C.textDim,fontSize:11,fontFamily:font,fontWeight:600 }}>
              <I d={ic.download} s={14} c={C.textDim} />CSV
            </button>}
            <button onClick={()=>setShowSet(!showSet)} style={{ border:`1px solid ${C.border}`,background:"transparent",borderRadius:10,padding:8,cursor:"pointer",display:"flex",alignItems:"center" }}>
              <I d={ic.settings} s={16} c={C.textDim} />
            </button>
          </div>
        </div>
        {showSet && (
          <div style={{ marginTop:12,background:C.card,borderRadius:14,padding:16,border:`1px solid ${C.border}`,display:"flex",flexDirection:"column",gap:10 }}>
            {lastSync && <p style={{ fontSize:11,color:C.textDim,margin:0 }}>Letzte Sync: {lastSync.toLocaleTimeString("de-DE")}</p>}

            <p style={{ fontSize:12,fontWeight:600,color:C.textDim,margin:"8px 0 0",textTransform:"uppercase",letterSpacing:"0.05em" }}>Benutzer</p>
            {!editingNames ? (
              <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",padding:10,background:C.input,borderRadius:10 }}>
                <span style={{ fontSize:14,fontWeight:500 }}>{userNames.join(" & ")}</span>
                <button onClick={()=>{setNameInputs([...userNames]);setEditingNames(true);}} style={{ border:"none",background:"transparent",cursor:"pointer",padding:4 }}>
                  <I d={ic.edit} s={16} c={C.blue} />
                </button>
              </div>
            ) : (
              <div style={{ display:"flex",flexDirection:"column",gap:8 }}>
                {nameInputs.map((n,i) => (
                  <input key={i} type="text" value={n} placeholder={`Person ${i+1}`}
                    onChange={e=>{const u=[...nameInputs];u[i]=e.target.value;setNameInputs(u);}}
                    style={inp} />
                ))}
                {nameInputs.length < 4 && (
                  <button onClick={()=>setNameInputs([...nameInputs,""])} style={{ padding:8,border:`1px dashed ${C.border}`,borderRadius:8,background:"transparent",color:C.textDim,fontSize:12,fontFamily:font,cursor:"pointer" }}>
                    + Weitere Person
                  </button>
                )}
                <div style={{ display:"flex",gap:8 }}>
                  <button onClick={()=>{
                    const names = nameInputs.map(n=>n.trim()).filter(Boolean);
                    if (names.length < 1) return;
                    setUserNames(names);
                    localStorage.setItem(LOCAL_NAMES_KEY, JSON.stringify(names));
                    if (!names.includes(form.user)) setForm({...form, user: names[0]});
                    setEditingNames(false);
                  }} style={{ flex:1,padding:10,border:"none",borderRadius:10,background:C.accent,color:"#000",fontSize:13,fontFamily:font,cursor:"pointer",fontWeight:700 }}>
                    Speichern
                  </button>
                  <button onClick={()=>setEditingNames(false)} style={{ padding:10,border:`1px solid ${C.border}`,borderRadius:10,background:"transparent",color:C.textDim,fontSize:13,fontFamily:font,cursor:"pointer",fontWeight:600 }}>
                    Abbrechen
                  </button>
                </div>
              </div>
            )}

            <p style={{ fontSize:12,fontWeight:600,color:C.textDim,margin:"8px 0 0",textTransform:"uppercase",letterSpacing:"0.05em" }}>Backup</p>
            <button onClick={()=>exportJSON(entries,locations)} style={{ padding:10,border:`1px solid ${C.border}`,borderRadius:10,background:"transparent",color:C.text,fontSize:13,fontFamily:font,cursor:"pointer",fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:8 }}>
              <I d={ic.download} s={16} c={C.accent} /> Backup herunterladen (JSON)
            </button>
            <label style={{ padding:10,border:`1px solid ${C.border}`,borderRadius:10,background:"transparent",color:C.text,fontSize:13,fontFamily:font,cursor:"pointer",fontWeight:600,display:"flex",alignItems:"center",justifyContent:"center",gap:8,textAlign:"center" }}>
              <I d={ic.upload} s={16} c={C.blue} /> Backup wiederherstellen
              <input type="file" accept=".json" style={{display:"none"}} onChange={async(ev)=>{
                const file = ev.target.files?.[0];
                if (!file) return;
                try {
                  const data = await importJSON(file);
                  const merged = [...data.entries];
                  const existingIds = new Set(entries.map(e=>e.id));
                  const newOnly = merged.filter(e=>!existingIds.has(e.id));
                  if (newOnly.length === 0 && merged.length <= entries.length) {
                    if (confirm(`Backup enthält ${merged.length} Einträge. Aktuelle Daten (${entries.length} Einträge) komplett ersetzen?`)) {
                      const nl = [...new Set([...data.locations, ...locations])].sort();
                      setEntries(merged); setLocations(nl); dSave(merged, nl);
                      alert(`Wiederhergestellt: ${merged.length} Einträge`);
                    }
                  } else {
                    const ne = [...entries, ...newOnly].sort((a,b) => new Date(b.date) - new Date(a.date));
                    const nl = [...new Set([...data.locations, ...locations])].sort();
                    setEntries(ne); setLocations(nl); dSave(ne, nl);
                    alert(`${newOnly.length} neue Einträge hinzugefügt (${ne.length} total)`);
                  }
                } catch (err) { alert("Fehler: " + err); }
                ev.target.value = "";
              }} />
            </label>
            <p style={{ fontSize:12,fontWeight:600,color:C.textDim,margin:"8px 0 0",textTransform:"uppercase",letterSpacing:"0.05em" }}>System</p>
            <button onClick={()=>{localStorage.removeItem(LOCAL_TOKEN_KEY);setState("setup");}} style={{ padding:10,border:`1px solid rgba(244,91,105,0.3)`,borderRadius:10,background:"rgba(244,91,105,0.08)",color:C.danger,fontSize:13,fontFamily:font,cursor:"pointer",fontWeight:600 }}>
              Verbindung zurücksetzen
            </button>
          </div>
        )}
      </div>

      {/* Update Banner */}
      {updateAvailable && (
        <div style={{ margin:"0 20px 12px",padding:"12px 16px",background:"rgba(91,141,239,0.12)",border:`1px solid rgba(91,141,239,0.3)`,borderRadius:12,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10 }}>
          <span style={{ fontSize:13,color:C.blue,fontWeight:600 }}>Neue Version verfügbar</span>
          <button onClick={()=>window.location.reload()} style={{ padding:"8px 14px",border:"none",borderRadius:8,background:C.blue,color:"#fff",fontSize:12,fontWeight:700,fontFamily:font,cursor:"pointer",whiteSpace:"nowrap" }}>
            Jetzt aktualisieren
          </button>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:"flex",gap:4,marginInline:20,borderRadius:14,padding:4,background:C.card,marginBottom:20 }}>
        {[{id:"list",l:"Übersicht",i:ic.car},{id:"add",l:"Eintragen",i:ic.plus},{id:"stats",l:"Statistik",i:ic.chart}].map(t=>(
          <button key={t.id} onClick={()=>setView(t.id)} style={{
            flex:1,padding:"12px 8px",border:"none",borderRadius:11,
            background:view===t.id?C.accent:"transparent",color:view===t.id?"#000":C.textDim,
            fontSize:12,fontWeight:700,fontFamily:font,cursor:"pointer",
            display:"flex",alignItems:"center",justifyContent:"center",gap:5,transition:"all 0.2s",
          }}><I d={t.i} s={15} c={view===t.id?"#000":C.textDim} />{t.l}</button>
        ))}
      </div>

      <div style={{ padding:"0 20px" }}>

        {/* ADD / EDIT */}
        {view==="add" && (
          <div style={{ display:"flex",flexDirection:"column",gap:16 }}>
            <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center" }}>
              <h2 style={{ fontSize:18,fontWeight:700,margin:0 }}>{editId ? "Eintrag bearbeiten" : "Neuer Ladevorgang"}</h2>
              {editId && <button onClick={cancelEdit} style={{ border:`1px solid ${C.border}`,borderRadius:10,background:"transparent",color:C.textDim,fontSize:12,fontFamily:font,cursor:"pointer",padding:"8px 12px",fontWeight:600 }}>Abbrechen</button>}
            </div>
            <div>
              <label style={lbl}>Wer lädt?</label>
              <div style={{ display:"flex",gap:8 }}>
                {userNames.map(u=>(
                  <button key={u} onClick={()=>setForm({...form,user:u})} style={{
                    flex:1,padding:12,border:`2px solid ${form.user===u?C.accent:C.border}`,borderRadius:12,
                    background:form.user===u?C.accentGlow:"transparent",color:form.user===u?C.accent:C.textDim,
                    fontSize:14,fontWeight:600,fontFamily:font,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",
                  }}><I d={ic.user} s={16} c={form.user===u?C.accent:C.textDim} /><span style={{marginLeft:6}}>{u}</span></button>
                ))}
              </div>
            </div>
            <div><label style={lbl}>Datum</label><input type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} style={{...inp,colorScheme:"dark"}} /></div>
            <div>
              <label style={lbl}>Kilometerstand</label>
              <input type="number" inputMode="decimal" placeholder={lastKm ? `Letzter: ${lastKm.toLocaleString("de-CH")} km` : "z.B. 12345"} value={form.km} onChange={e=>setForm({...form,km:e.target.value})} style={inp} />
              {lastKm && !editId && (
                <div style={{display:"flex",gap:6,marginTop:8,flexWrap:"wrap"}}>
                  <button onClick={()=>setForm({...form,km:String(lastKm)})} style={{padding:"8px 12px",border:`1px solid ${C.border}`,borderRadius:8,background:C.card,color:C.text,fontSize:12,fontFamily:mono,fontWeight:600,cursor:"pointer"}}>
                    = {lastKm.toLocaleString("de-CH")}
                  </button>
                  {[50,100,200,500].map(d=>(
                    <button key={d} onClick={()=>setForm({...form,km:String(lastKm+d)})} style={{padding:"8px 12px",border:`1px solid ${C.border}`,borderRadius:8,background:C.card,color:C.accent,fontSize:12,fontFamily:mono,fontWeight:600,cursor:"pointer"}}>
                      +{d}
                    </button>
                  ))}
                </div>
              )}
              {lastKm && form.km && parseFloat(form.km) > lastKm && (
                <div style={{marginTop:6,fontSize:13,color:C.blue,fontFamily:mono,fontWeight:500}}>+ {(parseFloat(form.km) - lastKm).toLocaleString("de-CH")} km seit letztem Laden</div>
              )}
            </div>
            <div><label style={lbl}>Geladene kWh</label><input type="number" inputMode="decimal" step="0.1" placeholder="z.B. 42.5" value={form.kwh} onChange={e=>setForm({...form,kwh:e.target.value})} style={inp} /></div>
            <div>
              <label style={lbl}>Bezahlter Preis in CHF (leer = gratis)</label>
              <input type="number" inputMode="decimal" step="0.01" placeholder="z.B. 18.50 (leer = gratis)" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} style={inp} />
              {form.kwh&&form.price&&<div style={{marginTop:6,fontSize:13,color:C.accent,fontFamily:mono,fontWeight:500}}>= {(parseFloat(form.price)/parseFloat(form.kwh)).toFixed(2)} CHF/kWh</div>}
            </div>
            <div>
              <label style={lbl}>Ladestation</label>
              {(()=>{ const allLocs = [...new Set([...DEFAULT_LOCATIONS, ...locations])].sort(); return !showNewLoc ? (
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  <div style={{position:"relative"}}>
                    <select value={form.location} onChange={e=>setForm({...form,location:e.target.value})} style={{...inp,appearance:"none",WebkitAppearance:"none",paddingRight:40,colorScheme:"dark"}}>
                      <option value="">Ladestation wählen...</option>
                      {allLocs.map(l=><option key={l} value={l}>{l}</option>)}
                    </select>
                    <div style={{position:"absolute",right:14,top:"50%",transform:"translateY(-50%)",pointerEvents:"none"}}><I d={ic.chevDown} s={18} c={C.textDim} /></div>
                  </div>
                  <button onClick={()=>setShowNewLoc(true)} style={{padding:10,border:`1px dashed ${C.border}`,borderRadius:10,background:"transparent",color:C.textDim,fontSize:13,fontFamily:font,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                    <I d={ic.plus} s={14} c={C.textDim} /> Neue Ladestation
                  </button>
                </div>
              ) : (
                <div style={{display:"flex",flexDirection:"column",gap:8}}>
                  <input type="text" placeholder="z.B. Aldi, Shell Recharge..." value={form.newLocation} onChange={e=>setForm({...form,newLocation:e.target.value})} style={inp} />
                  <button onClick={()=>{setShowNewLoc(false);setForm({...form,newLocation:""});}} style={{padding:8,border:"none",borderRadius:8,background:"transparent",color:C.textDim,fontSize:13,fontFamily:font,cursor:"pointer"}}>← Bestehende Station</button>
                </div>
              );})()}
            </div>
            <div><label style={lbl}>Notizen (optional)</label><input type="text" placeholder="z.B. DC 150kW..." value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} style={inp} /></div>
            {formError && <div style={{padding:"12px 16px",background:"rgba(244,91,105,0.1)",borderRadius:10,color:C.danger,fontSize:13,fontWeight:500}}>{formError}</div>}
            <button onClick={addEntry} style={btnP}>{editId ? "Änderungen speichern" : "Ladevorgang speichern"}</button>
          </div>
        )}

        {/* LIST */}
        {view==="list" && (
          <div>
            {entries.length===0 ? (
              <div style={{textAlign:"center",padding:"60px 20px",color:C.textDim}}>
                <div style={{fontSize:48,marginBottom:16}}>⚡</div>
                <p style={{margin:0,fontWeight:600}}>Noch keine Einträge</p>
                <p style={{margin:"8px 0 0",fontSize:13}}>Trage deinen ersten Ladevorgang ein!</p>
                <button onClick={()=>setView("add")} style={{...btnP,marginTop:24,width:"auto",padding:"14px 32px",display:"inline-block"}}>Jetzt eintragen</button>
              </div>
            ) : (
              <div style={{display:"flex",flexDirection:"column",gap:10}}>
                {stats && <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginBottom:8}}>
                  {[{l:"Gesamt kWh",v:stats.totalKwh.toFixed(1),u:"kWh"},{l:"Gesamt CHF",v:stats.totalCost.toFixed(2),u:"CHF"},{l:"Ø Preis",v:stats.avgPricePerKwh.toFixed(2),u:"CHF/kWh"}].map((s,i)=>(
                    <div key={i} style={{background:C.card,borderRadius:14,padding:"14px 12px",textAlign:"center",border:`1px solid ${C.border}`}}>
                      <div style={{fontSize:11,color:C.textDim,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em"}}>{s.l}</div>
                      <div style={{fontSize:18,fontWeight:800,fontFamily:mono,color:C.accent,marginTop:4}}>{s.v}</div>
                      <div style={{fontSize:10,color:C.textDim}}>{s.u}</div>
                    </div>
                  ))}
                </div>}
                {entries.map(e=>(
                  <div key={e.id} onClick={()=>{ if(delId!==e.id) startEdit(e); }} style={{background:C.card,borderRadius:16,padding:16,border:`1px solid ${C.border}`,position:"relative",cursor:"pointer"}}>
                    {delId===e.id && <div style={{position:"absolute",inset:0,background:"rgba(15,17,23,0.92)",borderRadius:16,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12,zIndex:2}}>
                      <p style={{fontSize:14,color:C.text,margin:0}}>Wirklich löschen?</p>
                      <div style={{display:"flex",gap:10}}>
                        <button onClick={(ev)=>{ev.stopPropagation();delEntry(e.id);}} style={{padding:"10px 20px",border:"none",borderRadius:10,background:C.danger,color:"#fff",fontSize:13,fontWeight:700,fontFamily:font,cursor:"pointer"}}>Ja</button>
                        <button onClick={(ev)=>{ev.stopPropagation();setDelId(null);}} style={{padding:"10px 20px",border:`1px solid ${C.border}`,borderRadius:10,background:"transparent",color:C.textDim,fontSize:13,fontFamily:font,cursor:"pointer"}}>Nein</button>
                      </div>
                    </div>}
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start"}}>
                      <div>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
                          <span style={{fontSize:11,fontWeight:700,padding:"3px 8px",borderRadius:6,background:e.user===userNames[0]?C.accentGlow:"rgba(91,141,239,0.12)",color:e.user===userNames[0]?C.accent:C.blue}}>{e.user}</span>
                          <span style={{fontSize:12,color:C.textDim}}>{new Date(e.date).toLocaleDateString("de-DE",{day:"2-digit",month:"short",year:"numeric"})}</span>
                        </div>
                        <div style={{display:"flex",alignItems:"center",gap:6,fontSize:13,color:C.textDim}}><I d={ic.map} s={13} c={C.textDim} />{e.location}</div>
                      </div>
                      <div style={{display:"flex",gap:4}}>
                        <button onClick={(ev)=>{ev.stopPropagation();startEdit(e);}} style={{border:"none",background:"transparent",cursor:"pointer",padding:6,opacity:0.4}}><I d={ic.edit} s={16} c={C.blue} /></button>
                        <button onClick={(ev)=>{ev.stopPropagation();setDelId(e.id);}} style={{border:"none",background:"transparent",cursor:"pointer",padding:6,opacity:0.4}}><I d={ic.trash} s={16} c={C.danger} /></button>
                      </div>
                    </div>
                    <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:8,marginTop:14,padding:12,background:C.input,borderRadius:12}}>
                      <div><div style={{fontSize:10,color:C.textDim,fontWeight:600,textTransform:"uppercase"}}>km-Stand</div><div style={{fontSize:15,fontWeight:700,fontFamily:mono,marginTop:2}}>{e.km.toLocaleString("de-DE")}</div></div>
                      <div><div style={{fontSize:10,color:C.textDim,fontWeight:600,textTransform:"uppercase"}}>kWh</div><div style={{fontSize:15,fontWeight:700,fontFamily:mono,color:C.accent,marginTop:2}}>{e.kwh.toFixed(1)}</div></div>
                      <div><div style={{fontSize:10,color:C.textDim,fontWeight:600,textTransform:"uppercase"}}>Preis</div><div style={{fontSize:15,fontWeight:700,fontFamily:mono,color:e.price>0?C.orange:C.accent,marginTop:2}}>{e.price>0?`${e.price.toFixed(2)} CHF`:"Gratis"}</div></div>
                    </div>
                    <div style={{fontSize:11,color:C.textDim,marginTop:6,fontFamily:mono}}>{e.pricePerKwh>0?`${e.pricePerKwh.toFixed(2)} CHF/kWh`:"Kostenlos geladen"}</div>
                    {e.notes && <div style={{fontSize:12,color:C.textDim,marginTop:6,fontStyle:"italic"}}>{e.notes}</div>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* STATS */}
        {view==="stats" && (
          <div>
            {!stats ? <div style={{textAlign:"center",padding:"60px 20px",color:C.textDim}}><p>Mindestens ein Eintrag nötig.</p></div> : (
              <div style={{display:"flex",flexDirection:"column",gap:16}}>
                <h2 style={{fontSize:18,fontWeight:700,margin:0}}>Statistiken</h2>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  {[{l:"Gesamtverbrauch",v:`${stats.totalKwh.toFixed(1)} kWh`,c:C.accent},{l:"Gesamtkosten",v:`${stats.totalCost.toFixed(2)} CHF`,c:C.orange},{l:"Ø Preis/kWh",v:`${stats.avgPricePerKwh.toFixed(2)} CHF`,c:C.blue},{l:"Ø Verbrauch",v:stats.consumption>0?`${stats.consumption.toFixed(1)} kWh/100km`:"—",c:C.accent}].map((s,i)=>(
                    <div key={i} style={{background:C.card,borderRadius:16,padding:"18px 16px",border:`1px solid ${C.border}`}}>
                      <div style={{fontSize:11,color:C.textDim,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.05em"}}>{s.l}</div>
                      <div style={{fontSize:20,fontWeight:800,fontFamily:mono,color:s.c,marginTop:8}}>{s.v}</div>
                    </div>
                  ))}
                </div>
                {Object.keys(stats.monthly).length>0 && (
                  <div style={{background:C.card,borderRadius:16,padding:18,border:`1px solid ${C.border}`}}>
                    <h3 style={{fontSize:14,fontWeight:700,margin:"0 0 14px",color:C.textDim,textTransform:"uppercase",letterSpacing:"0.05em"}}>Monatliche Kosten</h3>
                    {(()=>{const ms=Object.entries(stats.monthly).sort(([a],[b])=>a.localeCompare(b));const mx=Math.max(...ms.map(([,d])=>d.cost));return(
                      <div style={{display:"flex",flexDirection:"column",gap:8}}>
                        {ms.map(([m,d])=>(
                          <div key={m} style={{display:"flex",alignItems:"center",gap:10}}>
                            <div style={{width:52,fontSize:12,fontFamily:mono,color:C.textDim,flexShrink:0}}>{new Date(m+"-01").toLocaleDateString("de-DE",{month:"short",year:"2-digit"})}</div>
                            <div style={{flex:1,height:28,background:C.input,borderRadius:6,overflow:"hidden"}}>
                              <div style={{height:"100%",borderRadius:6,width:`${(d.cost/mx)*100}%`,background:`linear-gradient(90deg,${C.accent},${C.accentDim})`,display:"flex",alignItems:"center",justifyContent:"flex-end",paddingRight:8,minWidth:50}}>
                                <span style={{fontSize:11,fontWeight:700,fontFamily:mono,color:"#000"}}>{d.cost.toFixed(0)} CHF</span>
                              </div>
                            </div>
                            <div style={{fontSize:11,color:C.textDim,fontFamily:mono,width:60,textAlign:"right"}}>{d.kwh.toFixed(0)} kWh</div>
                          </div>
                        ))}
                      </div>
                    );})()}
                  </div>
                )}
                <div style={{background:C.card,borderRadius:16,padding:18,border:`1px solid ${C.border}`}}>
                  <h3 style={{fontSize:14,fontWeight:700,margin:"0 0 14px",color:C.textDim,textTransform:"uppercase",letterSpacing:"0.05em"}}>Häufigste Ladestationen</h3>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {Object.entries(stats.locFreq).sort(([,a],[,b])=>b-a).slice(0,8).map(([loc,count],i)=>(
                      <div key={loc} style={{display:"flex",alignItems:"center",gap:10,padding:"10px 12px",background:C.input,borderRadius:10}}>
                        <span style={{width:24,height:24,borderRadius:8,fontSize:12,fontWeight:800,display:"flex",alignItems:"center",justifyContent:"center",fontFamily:mono,flexShrink:0,background:i===0?C.accentGlow:"transparent",color:i===0?C.accent:C.textDim}}>{i+1}</span>
                        <span style={{flex:1,fontSize:13,fontWeight:500}}>{loc}</span>
                        <span style={{fontSize:12,fontFamily:mono,color:C.textDim,fontWeight:600}}>{count}×</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
