"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { FAQ, SCREENS, SLOTS, TASKS, fresh, store, type Concept, type Data, type Doc, type Step, type Task } from "./data";
import { VIEWS, type Api } from "./Screens";

type Sheet = "pick" | "large" | "digi" | "share" | null;
type Result = { when: string; pid: string; task: string; outcome: "success" | "fail"; secs: number; taps: number; seq: number | ""; note: string; mode: string };
type Run = { task: Task; start: number; taps: number; phase: "run" | "rate"; outcome?: "success" | "fail"; secs?: number; seq?: number };

const homeOf = (c: Concept, D: Data) => (c === "ready" ? (D.signedIn ? "home" : "login") : D.checkedIn ? "route" : "gate");

export default function ArriveBench() {
  /* ------------------------------------------------------------ state */
  const [mounted, setMounted] = useState(false);
  const [D, setD] = useState<Data>(fresh);
  const [concept, setConcept] = useState<Concept>("ready");
  const [fid, setFid] = useState<"styled" | "wire">("styled");
  const [screen, setScreen] = useState("login");
  const [stack, setStack] = useState<string[]>([]);
  const [docId, setDocId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<Sheet>(null);
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [alert, setAlert] = useState<Step | null>(null);
  const [fix, setFix] = useState<string | null>(null);
  const [scale, setScale] = useState(1);
  const toastT = useRef<ReturnType<typeof setTimeout>>(undefined);
  const viewRef = useRef<HTMLElement>(null);

  // test kit
  const [pid, setPid] = useState("");
  const [results, setResults] = useState<Result[]>([]);
  const [run, setRun] = useState<Run | null>(null);
  const runRef = useRef<Run | null>(null);
  runRef.current = run;
  const [, setTick] = useState(0);
  const [note, setNote] = useState("");
  const [copyNote, setCopyNote] = useState("Copies a tab-separated table you can paste into Sheets or the A4 report.");
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    const d = store.get<Data>("arrive.data.v1", fresh());
    const c = store.get<Concept>("arrive.concept", "ready");
    setD(d); setConcept(c); setFid(store.get("arrive.fid", "styled")); setScreen(homeOf(c, d));
    setResults(store.get<Result[]>("arrive.results", [])); setPid(store.get("arrive.pid", ""));
    setMounted(true);
  }, []);
  useEffect(() => { if (mounted) store.set("arrive.data.v1", D); }, [D, mounted]);
  useEffect(() => { if (mounted) { store.set("arrive.concept", concept); store.set("arrive.fid", fid); store.set("arrive.pid", pid); } }, [concept, fid, pid, mounted]);
  useEffect(() => { if (mounted) store.set("arrive.results", results); }, [results, mounted]);

  /* ------------------------------------------------------------ helpers */
  const toast = useCallback((m: string, ms = 2600) => { setToastMsg(m); clearTimeout(toastT.current); toastT.current = setTimeout(() => setToastMsg(null), ms); }, []);
  const emit = useCallback((ev: string) => {
    const r = runRef.current;
    if (r && r.phase === "run" && r.task.ev === ev) setRun({ ...r, phase: "rate", outcome: "success", secs: Math.round((Date.now() - r.start) / 100) / 10 });
  }, []);
  const patchDoc = (id: string, p: Partial<Doc>) => setD((d) => ({ ...d, docs: d.docs.map((x) => (x.id === id ? { ...x, ...p } : x)) }));
  const go = (s: string) => { if (s !== screen) setStack((st) => [...st, screen]); setScreen(s); setSheet(null); if (s === "route") emit("open:route"); };
  const openDoc = (id: string) => { setDocId(id); go("doc"); emit("open:" + id); };
  const back = () => { const n = [...stack]; setScreen(n.pop() ?? homeOf(concept, D)); setStack(n); setSheet(null); };
  const switchConcept = (c: Concept) => { setConcept(c); setStack([]); setSheet(null); setAlert(null); setScreen(homeOf(c, D)); };

  /* ------------------------------------------------------------ timers */
  // the category certificate review finishes a short while after sign-in
  const catInReview = D.docs.find((d) => d.id === "cat")?.status === "review";
  useEffect(() => {
    if (!mounted || !D.signedIn || !catInReview) return;
    const t = setTimeout(() => { patchDoc("cat", { status: "ok", via: "Accepted by Desk A staff" }); toast("Category certificate accepted"); }, 9000);
    return () => clearTimeout(t);
  }, [mounted, D.signedIn, catInReview, toast]);
  // the live queue at the next desk
  const dRef = useRef(D);
  dRef.current = D;
  useEffect(() => {
    if (!D.checkedIn || alert) return;
    const t = setInterval(() => {
      const d = dRef.current;
      const i = d.route.findIndex((r) => r.st === "now");
      const now = d.route[i];
      if (!now || now.k === "R") return;
      const ahead = Math.max(0, (now.ahead ?? 1) - 1);
      setD({ ...d, route: d.route.map((r, k) => (k === i ? { ...r, ahead } : r)) });
      if (ahead === 0) setAlert({ ...now, ahead });
    }, 3500);
    return () => clearInterval(t);
  }, [D.checkedIn, alert]);
  // keep the chat scrolled to the newest message
  useEffect(() => { if (screen === "help" && viewRef.current) viewRef.current.scrollTop = viewRef.current.scrollHeight; }, [D.chat.length, screen]);
  // run clock
  useEffect(() => { if (run?.phase !== "run") return; const t = setInterval(() => setTick((n) => n + 1), 250); return () => clearInterval(t); }, [run?.phase]);
  // fit the phone into the window height
  useEffect(() => {
    const fit = () => setScale(window.innerWidth <= 460 ? 1 : Math.min(1, (window.innerHeight - 40) / 800));
    fit(); window.addEventListener("resize", fit); return () => window.removeEventListener("resize", fit);
  }, []);

  /* ------------------------------------------------------------ actions */
  function ask(q: string) {
    setD((d) => ({ ...d, chat: [...d.chat, { me: true, text: q }] }));
    const f = FAQ.find((x) => x.q === q || x.k.some((k) => q.toLowerCase().includes(k)));
    setTimeout(() => {
      setD((d) => ({ ...d, chat: [...d.chat, f ? { who: "IIITA Help · official FAQ", text: f.a } : { who: "IIITA Help", text: "The FAQ does not cover this. I have passed it to a verified senior volunteer. Expect a reply within 10 minutes." }] }));
      if (!f) setTimeout(() => {
        setD((d) => ({ ...d, chat: [...d.chat, { who: "Rahul S. · B.Tech 3rd year · verified volunteer", text: /luggage|bag/i.test(q) ? "Yes. Leave bags at the cloak room next to Hall 2 (free, open till 6 pm). Show your token number." : "Good question. I checked with the office: they will confirm at Desk A. Find me at the help tent near the gate if you need more." }] }));
        emit("senior");
      }, 3500);
    }, 900);
  }
  function upload(kind: string) {
    const id = docId!; setSheet(null);
    if (kind === "large") { setSheet("large"); return; }
    patchDoc(id, { status: "checking" });
    setTimeout(() => {
      if (kind === "blur") { patchDoc(id, { status: "action", reason: "This photo is also blurry. Use daylight, hold the phone still and keep your face in focus." }); toast("Photo rejected: still blurry"); }
      else { patchDoc(id, { status: "ok", via: "Uploaded and accepted just now" }); toast("Accepted"); emit("ok:" + id); }
    }, 1600);
  }
  function act(name: string, arg?: string | number) {
    switch (name) {
      case "login": setD((d) => ({ ...d, signedIn: true })); setStack([]); setScreen("home"); break;
      case "pick": case "digi": case "share": setSheet(name); break;
      case "slot": setD((d) => ({ ...d, slot: arg as number })); break;
      case "getpass": setD((d) => ({ ...d, pass: true })); setStack([]); setScreen("pass"); emit("pass"); break;
      case "toGate": switchConcept("gate"); break;
      case "ask": ask(arg as string); break;
      case "checkin": setD((d) => ({ ...d, checkedIn: true })); setStack([]); setScreen("route"); toast("Checked in. Token #247"); emit("checkin"); break;
      case "demoReady": { const now = D.route.find((r) => r.st === "now"); if (now && now.k !== "R") { setD((d) => ({ ...d, route: d.route.map((r) => (r.k === now.k ? { ...r, ahead: 0 } : r)) })); setAlert({ ...now, ahead: 0 }); setScreen("route"); } break; }
      case "fix": setFix(arg as string); break;
      case "report": setD((d) => ({ ...d, room: { ...d.room, ticket: fix } })); setFix(null); setScreen("room"); toast("Reported. Ticket #R-1182"); emit("report"); break;
      case "accept": setD((d) => ({ ...d, room: { ...d.room, accepted: true } })); emit("accept"); go("settled"); break;
    }
  }
  function onMyWay() {
    const i = D.route.findIndex((r) => r.st === "now");
    setAlert(null); emit("onmyway");
    if (i >= 0) {
      setD((d) => ({ ...d, route: d.route.map((r, k) => (k === i ? { ...r, st: "done" } : k === i + 1 ? { ...r, st: "now" } : r)) }));
      toast(`Desk ${D.route[i].k} done. Next: ${D.route[i + 1]?.t ?? "finished"}`);
    }
    setScreen("route");
  }
  function jump(k: string) {
    if (concept === "ready" && k !== "login") setD((d) => ({ ...d, signedIn: true }));
    if (concept === "gate" && k !== "gate") setD((d) => ({ ...d, checkedIn: true }));
    if (k === "doc" && !docId) setDocId("pho");
    setStack([]); setSheet(null); setScreen(k === "gate" && D.checkedIn ? "route" : k);
  }
  function reset() { const d = fresh(); setD(d); setAlert(null); setFix(null); setSheet(null); setStack([]); setScreen(homeOf(concept, d)); toast("Prototype data reset"); }

  /* ------------------------------------------------------------ test kit */
  const finish = (outcome: "success" | "fail") => { const r = runRef.current; if (r) setRun({ ...r, phase: "rate", outcome, secs: Math.round((Date.now() - r.start) / 100) / 10 }); };
  function saveRun() {
    if (!run || run.phase !== "rate") return;
    setResults((rs) => [...rs, { when: new Date().toISOString().slice(0, 16).replace("T", " "), pid: pid.trim() || "unnamed", task: run.task.id, outcome: run.outcome!, secs: run.secs!, taps: run.taps, seq: run.seq ?? "", note: note.trim(), mode: fid }]);
    setRun(null); setNote("");
  }
  async function copy() {
    const head = ["time", "participant", "task", "result", "seconds", "taps", "ease_1to7", "notes", "fidelity"];
    const tsv = [head.join("\t"), ...results.map((r) => [r.when, r.pid, r.task, r.outcome, r.secs, r.taps, r.seq, r.note.replace(/\s+/g, " "), r.mode].join("\t"))].join("\n");
    try { await navigator.clipboard.writeText(tsv); setCopyNote(`Copied ${results.length} rows. Paste into Sheets or the report.`); }
    catch { setCopyNote("Copy was blocked here. Select the table above and copy it manually."); }
  }
  const who = pid.trim() || "unnamed";

  /* ------------------------------------------------------------ render */
  const api: Api = { D, docId, fix, go, back, openDoc, act };
  const View = VIEWS[screen] ?? VIEWS[homeOf(concept, D)];
  const cur = screen === "gate" && D.checkedIn ? "route" : screen;
  const tabs = concept === "ready" ? (screen !== "login" ? [["home", "☑", "Checklist"], ["pass", "▣", "My pass"], ["help", "?", "Help"]] : null)
    : D.checkedIn ? [["route", "➜", "Route"], ["room", "⌂", "Room"], ["help", "?", "Help"]] : null;
  const doc = D.docs.find((d) => d.id === docId);

  return (
    <div className="pt">
      <div className="bench">
        <header className="brand">
          <Link href="/" className="crumb">← Group 10 project site</Link>
          <h1>IIITA Arrive</h1>
          <p>Assignment 4 clickable prototype of the two concepts we selected in Assignment 3: <b>ReadyPass</b> (PS-1, before travel) and <b>Gate-to-Room Pass</b> (PS-2, reporting day). Example student: Ananya Verma.</p>
        </header>

        <div className="stage" style={{ height: scale < 1 ? 800 * scale : undefined }}>
          <div className="device" style={{ transform: scale < 1 ? `scale(${scale})` : undefined }}>
            <div className={`screen${fid === "wire" ? " wire" : ""}`} onClickCapture={() => { if (runRef.current?.phase === "run") setRun({ ...runRef.current, taps: runRef.current.taps + 1 }); }}>
              <div className="island" />
              <div className="status-bar"><span>9:41</span><span>{concept === "ready" ? "5G" : "IIITA-Guest"} ●●●</span></div>
              <main className="view" ref={viewRef} key={screen}>{mounted ? <View api={api} /> : null}</main>
              {tabs && (
                <nav className="tabbar">
                  {tabs.map(([k, i, l]) => <button key={k} aria-current={cur === k || (k === "home" && screen === "doc")} onClick={() => { setStack([]); go(k); }}><i>{i}</i>{l}</button>)}
                </nav>
              )}
              {sheet && (
                <div className="sheet-wrap" onClick={(e) => { if (e.target === e.currentTarget) setSheet(null); }}>
                  <div className="sheet" role="dialog" aria-modal="true">
                    <div className="grab" />
                    {sheet === "pick" && doc && (() => {
                      const files = [{ f: `${doc.id}_scan_jul.pdf`, sz: "480 KB", kind: "good" }];
                      if (doc.bad === "blur") files.unshift({ f: "IMG_2041.jpg", sz: "1.1 MB · taken indoors", kind: "blur" });
                      if (doc.bad === "large") files.unshift({ f: `${doc.id}_scanner.pdf`, sz: "6.8 MB", kind: "large" });
                      if (doc.id === "pho") files[files.length - 1] = { f: "IMG_2077.jpg", sz: "640 KB · taken outside", kind: "good" };
                      return (<>
                        <b className="h3">Choose a file</b><p className="sub">Recent files on this phone</p>
                        {files.map((x) => <button key={x.f} className="file" onClick={() => upload(x.kind)}><span className="ic">{x.f.split(".").pop()!.toUpperCase()}</span><span><b>{x.f}</b><br /><span className="sub">{x.sz}</span></span></button>)}
                        <button className="cta ghost" onClick={() => setSheet(null)}>Cancel</button>
                      </>);
                    })()}
                    {sheet === "large" && <>
                      <b className="h3">File is too large</b><p className="sub">This file is 6.8 MB. The limit is 2 MB. We can shrink it on your phone without losing readability.</p>
                      <button className="cta teal" onClick={() => { const id = docId!; setSheet(null); patchDoc(id, { status: "checking" }); setTimeout(() => { patchDoc(id, { status: "ok", via: "Compressed to 912 KB and accepted" }); toast("Compressed and accepted"); emit("ok:" + id); }, 1800); }}>Compress to about 900 KB and upload</button>
                      <button className="cta ghost" onClick={() => setSheet("pick")}>Choose another file</button>
                    </>}
                    {sheet === "digi" && <>
                      <b className="h3">Share from DigiLocker</b><p className="sub">IIIT Allahabad wants to read one document from your DigiLocker account:</p>
                      <div className="card"><b>Class 12 marksheet</b><p className="sub">CBSE · 2026 · issued 12 May 2026</p></div>
                      <button className="cta teal" onClick={() => { const id = docId!; setSheet(null); patchDoc(id, { status: "ok", via: "From DigiLocker, verified" }); toast("Fetched from DigiLocker and accepted"); emit("ok:" + id); }}>Allow and fetch</button>
                      <button className="cta ghost" onClick={() => setSheet(null)}>Not now</button>
                    </>}
                    {sheet === "share" && (() => {
                      const hi = D.lang === "hi";
                      const [d, t] = SLOTS[D.slot ?? 1];
                      const txt = hi ? `अनन्या का रजिस्ट्रेशन पूरा और स्वीकृत है। रिपोर्टिंग: ${d}, ${t}, मुख्य गेट। साथ लाएँ: जाति प्रमाण पत्र (मूल)। कोई और दस्तावेज़ नहीं माँगा जाएगा।` : `Ananya's registration is complete and accepted. Reporting: ${d}, ${t}, main gate. Bring: original category certificate. No other document will be asked for.`;
                      return (<>
                        <b className="h3">Share with a parent</b>
                        <div className="between"><span className="sub">Language</span><div className="lang" role="group" aria-label="Language"><button aria-pressed={!hi} onClick={() => setD((x) => ({ ...x, lang: "en" }))}>English</button><button aria-pressed={hi} onClick={() => setD((x) => ({ ...x, lang: "hi" }))}>हिन्दी</button></div></div>
                        <div className="card"><p className="sharetxt">{txt}</p></div>
                        <button className="cta teal" onClick={() => { setSheet(null); toast(hi ? "Sent to Papa in Hindi" : "Sent to Papa"); emit("share:" + D.lang); }}>Send by SMS to Papa (98••• ••210)</button>
                        <button className="cta ghost" onClick={() => setSheet(null)}>Close</button>
                      </>);
                    })()}
                  </div>
                </div>
              )}
              {alert && concept === "gate" && (
                <div className="alert" role="alertdialog" aria-label="Your desk is ready">
                  <div className="alerteyebrow">IT IS YOUR TURN</div>
                  <div className="big">Go to Desk {alert.k}</div>
                  <p>{alert.t}<br />{alert.w}</p>
                  <p className="soft">Desk staff will hold your place for 5 minutes.</p>
                  <button className="cta" onClick={onMyWay}>I am on my way</button>
                </div>
              )}
              {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
            </div>
          </div>
        </div>

        <aside className="rail" aria-label="Prototype controls">
          <section className="panel">
            <h2>Concept</h2>
            <div className="seg" role="group" aria-label="Concept">
              <button aria-pressed={concept === "ready"} onClick={() => switchConcept("ready")}>ReadyPass<small>PS-1 · before travel</small></button>
              <button aria-pressed={concept === "gate"} onClick={() => switchConcept("gate")}>Gate-to-Room Pass<small>PS-2 · on campus</small></button>
            </div>
            <h2>Fidelity</h2>
            <div className="seg" role="group" aria-label="Fidelity">
              <button aria-pressed={fid === "wire"} onClick={() => setFid("wire")}>Wireframe<small>v1, low-fi</small></button>
              <button aria-pressed={fid === "styled"} onClick={() => setFid("styled")}>Styled<small>clickable prototype</small></button>
            </div>
          </section>

          <section className="panel">
            <h2>Screen map</h2>
            <div className="map">
              {SCREENS[concept].map(([k, l], i) => <button key={k} aria-current={cur === k} onClick={() => jump(k)}><span>{i + 1}</span>{l}</button>)}
            </div>
            <div className="row"><button className="btn" onClick={reset}>Reset prototype data</button></div>
            <p className="note">Jump to any screen, or use the app normally. Reset puts every document, the queue and the room back to the start.</p>
          </section>

          <section className="panel">
            <h2>Usability test</h2>
            <label className="field">Participant<input value={pid} onChange={(e) => setPid(e.target.value)} placeholder="e.g. P3, first year, CSE" autoComplete="off" /></label>
            {run && run.phase === "run" && (
              <div className="runbar">
                <div><b>{run.task.id}</b> {run.task.t}</div>
                <div className="clock">{((Date.now() - run.start) / 1000).toFixed(1)} s · {run.taps} taps</div>
                <div className="row"><button className="btn primary" onClick={() => finish("success")}>Mark success</button><button className="btn" onClick={() => finish("fail")}>Gave up</button><button className="btn" onClick={() => setRun(null)}>Cancel</button></div>
              </div>
            )}
            {run && run.phase === "rate" && (
              <div className="runbar">
                <div><b>{run.task.id}</b> {run.outcome === "success" ? "completed" : "not completed"} in {run.secs} s with {run.taps} taps.</div>
                <div className="field">How easy was that? (1 very hard, 7 very easy)
                  <div className="seq" role="group" aria-label="Ease rating">{[1, 2, 3, 4, 5, 6, 7].map((n) => <button key={n} aria-pressed={run.seq === n} onClick={() => setRun({ ...run, seq: n })}>{n}</button>)}</div>
                </div>
                <label className="field">What did they say or struggle with?<textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} /></label>
                <div className="row"><button className="btn primary" onClick={saveRun}>Save result</button></div>
              </div>
            )}
            <div className="tasks">
              {TASKS[concept].map((t) => {
                const last = results.filter((r) => r.task === t.id && r.pid === who).slice(-1)[0];
                const running = run?.task.id === t.id;
                const cls = running ? "run" : last ? (last.outcome === "success" ? "ok" : "fail") : "";
                const lbl = running ? "running" : last ? (last.outcome === "success" ? `${last.secs} s` : "gave up") : t.ev ? "auto" : "manual";
                return (
                  <div key={t.id} className={`task${running ? " active" : ""}`}>
                    <div><b>{t.id}</b> {t.t}</div><span className={`st ${cls}`}>{lbl}</span>
                    <div className="row span"><button className="btn" disabled={!!run} onClick={() => setRun({ task: t, start: Date.now(), taps: 0, phase: "run" })}>Start</button></div>
                  </div>
                );
              })}
            </div>
            <p className="note">Press <b>Start</b>, read the task aloud, then hand over the phone. Tasks marked <span className="kbd">auto</span> finish themselves when the participant gets there. Taps inside the phone are counted.</p>
          </section>

          <section className="panel">
            <h2>Results on this device</h2>
            <div className="results">
              {results.length ? (
                <table>
                  <thead><tr><th>Who</th><th>Task</th><th>Result</th><th>Time</th><th>Taps</th><th>Ease</th></tr></thead>
                  <tbody>{results.slice(-12).reverse().map((r, i) => <tr key={i}><td>{r.pid}</td><td>{r.task}</td><td>{r.outcome === "success" ? "done" : "gave up"}</td><td>{r.secs} s</td><td>{r.taps}</td><td>{r.seq || "-"}</td></tr>)}</tbody>
                </table>
              ) : <p className="note">No results yet. Run a task to see it here.</p>}
              {results.length > 12 && <p className="note">Showing the latest 12 of {results.length}. Copy includes all.</p>}
            </div>
            <div className="row">
              <button className="btn primary" onClick={copy} disabled={!results.length}>Copy results</button>
              <button className="btn" disabled={!results.length} onClick={() => { if (armed) { setResults([]); setArmed(false); } else { setArmed(true); setTimeout(() => setArmed(false), 3000); } }}>{armed ? "Tap again to clear" : "Clear results"}</button>
            </div>
            <p className="note">{copyNote}</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
