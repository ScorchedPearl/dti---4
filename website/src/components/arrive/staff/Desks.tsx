"use client";

import { BellRing, CheckCircle2, Printer, QrCode, ScanLine, Undo2, UserCheck, UsersRound, X } from "lucide-react";
import { useEffect, useState } from "react";
import { DESKS, type DeskKey } from "@/lib/arrive/catalog";
import { api, errMsg, relTime } from "@/lib/arrive/client";
import Scanner, { canScan } from "../Scanner";
import { Button, Empty, FormError, Pill, Qr, Spinner, useToast } from "../ui";
import { Head, useConsole, useStaffData } from "./ConsoleShell";

/* ================================================================== gate */
type Recent = { token_no: number; checked_in_at: string; name: string; branch: string; greenLane: boolean };
type CheckinResult = { student: { name: string; josaa: string; branch: string }; token: number; already: boolean; recent: Recent[] };

export function Gate() {
  const toast = useToast();
  const { data, setData } = useStaffData<{ code: string; recent: Recent[] }>("/api/staff/gate", 8000);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [last, setLast] = useState<CheckinResult | null>(null);
  const [scan, setScan] = useState(false);
  const [scanOk, setScanOk] = useState(false);
  useEffect(() => setScanOk(canScan()), []);

  async function checkIn(query = q) {
    setErr(""); setBusy(true); setScan(false);
    try {
      const r = await api<CheckinResult>("/api/staff/gate", { json: { query } });
      setLast(r); setQ("");
      setData((d) => (d ? { ...d, recent: r.recent } : d));
      toast(r.already ? `${r.student.name} was already checked in` : `${r.student.name} checked in · token #${r.token}`);
    } catch (e) { setErr(errMsg(e)); setLast(null); } finally { setBusy(false); }
  }

  return (
    <div className="c-page">
      <Head title="Gate" sub="Scan the Ready to Report pass, or type the pass code or JoSAA number. Students can also check themselves in with the poster code." />
      <div className="split">
        <section className="card stack-lg" id="poster">
          <div className="between"><h2 className="h3">Today&apos;s gate poster</h2><button className="btn ghost xs" onClick={() => window.print()}><Printer size={14} />Print</button></div>
          {data ? (
            <>
              <div style={{ width: 200, margin: "0 auto" }}><Qr value={`ARRIVE-GATE:${data.code}`} label="Gate check-in QR code" /></div>
              <div className="center"><div className="eyebrow">Gate code</div><div className="big-code mono">{data.code}</div></div>
              <p className="small muted center">Students with a pass open Reporting day in the app, then scan this or type the code.</p>
            </>
          ) : <Spinner />}
        </section>
        <div className="stack-lg">
          <section className="card stack">
            <h2 className="h3">Check a student in</h2>
            {scan ? (
              <>
                <Scanner onCode={(t) => checkIn(t)} />
                <button className="btn ghost" onClick={() => setScan(false)}><X size={16} />Stop camera</button>
              </>
            ) : (
              <form className="stack" onSubmit={(e) => { e.preventDefault(); checkIn(); }}>
                <label className="field">Pass code or JoSAA number<input className="mono" value={q} onChange={(e) => setQ(e.target.value)} placeholder="IIITA26-XXXX-XXXX or 12 digits" autoComplete="off" /></label>
                <FormError>{err}</FormError>
                <div className="row wrap">
                  <Button className="accent" busy={busy} disabled={!q.trim()} type="submit"><UserCheck size={18} />Check in</Button>
                  {scanOk && <button type="button" className="btn ghost" onClick={() => setScan(true)}><ScanLine size={18} />Scan pass</button>}
                </div>
              </form>
            )}
            {last && (
              <div className={`banner ${last.already ? "info" : "good"}`}>
                <CheckCircle2 size={20} />
                <span><b>{last.student.name} · token #{last.token}</b>{last.already ? "Already checked in earlier." : last.recent.find((r) => r.token_no === last.token)?.greenLane ? "Green lane: send them straight to Desk B." : "Documents not complete: send them to Desk A first."}</span>
              </div>
            )}
          </section>
          <section className="card flush">
            <div className="card-head" style={{ padding: "16px 18px 0" }}><h2 className="h3">Latest check-ins</h2></div>
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Token</th><th>Student</th><th>Lane</th><th>When</th></tr></thead>
              <tbody>{data?.recent.map((r) => (
                <tr key={r.token_no}><td className="token">#{r.token_no}</td><td><b>{r.name}</b><div className="tiny muted">{r.branch}</div></td><td>{r.greenLane ? <Pill status="ok" label="Green lane" /> : <Pill status="review" label="Desk A" />}</td><td className="small muted">{relTime(Date.parse(r.checked_in_at))}</td></tr>
              ))}</tbody>
            </table></div>
          </section>
        </div>
      </div>
    </div>
  );
}

/* ================================================================== desks */
type Row = { studentId: number; name: string; token: number; status: "waiting" | "called"; queuedAt: number | null; calledAt: number | null; ack: boolean; greenLane: boolean };
const HOLD = 5 * 60_000;

function Held({ since }: { since: number }) {
  const [, tick] = useState(0);
  useEffect(() => { const t = setInterval(() => tick((n) => n + 1), 1000); return () => clearInterval(t); }, []);
  const left = HOLD - (Date.now() - since);
  if (left <= 0) return <span className="badc small">Hold expired</span>;
  const m = Math.floor(left / 60000), s = Math.floor((left % 60000) / 1000);
  return <span className="small muted num">Held {m}:{String(s).padStart(2, "0")}</span>;
}

export function DeskConsole() {
  const { me } = useConsole();
  const toast = useToast();
  const [desk, setDesk] = useState<DeskKey>((me.desk as DeskKey) ?? "B");
  const { data, setData, error } = useStaffData<{ rows: Row[]; done: number }>(`/api/staff/desks/${desk}`, 3000);
  const [busy, setBusy] = useState<string | null>(null);
  const info = DESKS.find((d) => d.key === desk)!;
  const called = data?.rows.filter((r) => r.status === "called") ?? [];
  const waiting = data?.rows.filter((r) => r.status === "waiting") ?? [];

  async function act(action: "call" | "done" | "requeue", studentId?: number) {
    setBusy(action + (studentId ?? ""));
    try {
      const r = await api<{ rows: Row[]; done: number }>(`/api/staff/desks/${desk}`, { json: { action, studentId } });
      setData(r);
      if (action === "call") { const c = r.rows.find((x) => x.status === "called" && !called.some((y) => y.studentId === x.studentId)); if (c) toast(`Calling #${c.token} ${c.name}. Their phone is ringing.`); }
      if (action === "done") toast("Done. They are queued at the next step.");
    } catch (e) { toast(errMsg(e), "error"); } finally { setBusy(null); }
  }

  return (
    <div className="c-page">
      <Head title="Desks" sub="Call the next student and their phone shows a full-screen alert. Mark them done and they join the next desk's line automatically." />
      <div className="desk-tabs" role="group" aria-label="Choose desk">
        {DESKS.filter((d) => d.key !== "R").map((d) => (
          <button key={d.key} aria-pressed={desk === d.key} onClick={() => setDesk(d.key)}><span className="k">{d.key}</span><span><b className="small">{d.name}</b><span className="tiny muted" style={{ display: "block" }}>{d.where}</span></span></button>
        ))}
      </div>
      {error && <div className="form-error">{error}</div>}
      <div className="split">
        <div className="stack-lg">
          <section className="card stack">
            <div className="between"><h2 className="h3">Desk {desk} · {info.name}</h2><span className="small muted">{data?.done ?? 0} done today</span></div>
            <div className="facts">
              <div className="fact"><span className="eyebrow">Waiting</span><b className="token" style={{ fontSize: 28 }}>{data ? waiting.length : "–"}</b></div>
              <div className="fact"><span className="eyebrow">Avg. time</span><b className="token" style={{ fontSize: 28 }}>{info.minutes}m</b></div>
            </div>
            <Button className="accent block" busy={busy === "call"} disabled={!waiting.length} onClick={() => act("call")}><BellRing size={18} />Call next student</Button>
            {!waiting.length && data && <p className="small muted center">Nobody is waiting at this desk.</p>}
          </section>
          {called.map((r) => (
            <section key={r.studentId} className="card serving stack">
              <div className="between"><span className="token">#{r.token}</span>{r.ack ? <Pill status="ok" label="On the way" /> : <Pill status="review" label="Not seen yet" />}</div>
              <div><b className="h3">{r.name}</b><p className="small muted">Called {r.calledAt ? relTime(r.calledAt) : ""} · {r.calledAt && <Held since={r.calledAt} />}</p></div>
              <div className="row wrap">
                <Button className="sm" busy={busy === "done" + r.studentId} onClick={() => act("done", r.studentId)}><CheckCircle2 size={16} />Done</Button>
                <Button className="ghost sm" busy={busy === "requeue" + r.studentId} onClick={() => act("requeue", r.studentId)}><Undo2 size={16} />Back in line</Button>
              </div>
            </section>
          ))}
        </div>
        <section className="card flush">
          <div className="card-head" style={{ padding: "16px 18px 0" }}><h2 className="h3">In line</h2><span className="small muted">Oldest first</span></div>
          {!data ? <div style={{ padding: 18 }}><Spinner /></div> : waiting.length ? (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>#</th><th>Token</th><th>Student</th><th>Waiting</th><th>Lane</th></tr></thead>
              <tbody>{waiting.map((r, i) => (
                <tr key={r.studentId}><td className="num muted">{i + 1}</td><td className="token">#{r.token}</td><td><b>{r.name}</b></td><td className="small muted">{r.queuedAt ? relTime(r.queuedAt).replace(" ago", "") : ""}</td><td>{r.greenLane ? <Pill status="ok" label="Green" /> : <Pill status="review" label="Checked at A" />}</td></tr>
              ))}</tbody>
            </table></div>
          ) : <Empty icon={<UsersRound />} title="The line is empty">Students appear here when they finish the previous step.</Empty>}
        </section>
      </div>
      <p className="tiny faint row"><QrCode size={14} />Students track their place live in the app, so nobody needs to stand in the line.</p>
    </div>
  );
}
