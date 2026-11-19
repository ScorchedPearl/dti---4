"use client";

import { Check, ExternalLink, FileSearch, ShieldCheck, X } from "lucide-react";
import { useEffect, useState } from "react";
import { PROOF, REJECT_REASONS, docType } from "@/lib/arrive/catalog";
import { api, errMsg, relTime } from "@/lib/arrive/client";
import { kb } from "@/lib/arrive/image";
import { Button, Empty, Spinner, useToast } from "../ui";
import { Head, useConsole, useStaffData } from "./ConsoleShell";

type Q = { student_id: number; doc_id: string; file_name: string | null; file_mime: string | null; file_size: number | null; updated_at: string; name: string; josaa: string; branch: string; category: string };
const key = (q: Q) => `${q.student_id}:${q.doc_id}`;

export function Documents() {
  const toast = useToast();
  const { refreshCounts } = useConsole();
  const { data, setData, error } = useStaffData<{ queue: Q[] }>("/api/staff/documents", 8000);
  const [sel, setSel] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [mode, setMode] = useState<"view" | "reject">("view");
  const [busy, setBusy] = useState<"accept" | "reject" | null>(null);
  const queue = data?.queue ?? [];
  const cur = queue.find((q) => key(q) === sel) ?? queue[0];

  useEffect(() => { setMode("view"); setReason(""); }, [sel]);

  async function decide(decision: "accept" | "reject") {
    if (!cur) return;
    setBusy(decision);
    const idx = queue.indexOf(cur);
    try {
      const r = await api<{ queue: Q[] }>("/api/staff/documents", { json: { studentId: cur.student_id, docId: cur.doc_id, decision, reason } });
      setData(r);
      const next = r.queue[Math.min(idx, r.queue.length - 1)];
      setSel(next ? key(next) : null);
      setMode("view"); setReason("");
      refreshCounts();
      toast(decision === "accept" ? `Accepted ${docType(cur.doc_id)?.short} for ${cur.name}` : `Sent back to ${cur.name} with your reason`);
    } catch (e) { toast(errMsg(e), "error"); } finally { setBusy(null); }
  }

  const t = cur ? docType(cur.doc_id) : null;
  const url = cur ? `/api/staff/files/${cur.student_id}/${cur.doc_id}` : "";
  return (
    <div className="c-page">
      <Head title="Document review" sub="Oldest first. Students see your decision on their checklist within seconds." >
        {data && <span className="pill navy"><span className="light" />{queue.length} waiting</span>}
      </Head>
      {error && <div className="form-error">{error}</div>}
      {!data ? <Spinner /> : !queue.length ? (
        <section className="card"><Empty icon={<FileSearch />} title="Nothing to review">New uploads appear here as students send them.</Empty></section>
      ) : (
        <div className="split">
          <section className="card flush" aria-label="Review queue">
            {queue.map((q) => (
              <button key={key(q)} className="qitem" aria-current={cur && key(q) === key(cur)} onClick={() => setSel(key(q))}>
                <b>{q.name}</b><span className="tiny faint">{relTime(Date.parse(q.updated_at))}</span>
                <span className="small muted">{docType(q.doc_id)?.name}</span>
              </button>
            ))}
          </section>
          {cur && t && (
            <section className="card stack-lg">
              <div className="between wrap">
                <div className="stack-sm"><h2 className="h2">{t.name}</h2><p className="small muted">{cur.name} · {cur.branch} · {cur.category} · JoSAA {cur.josaa}</p></div>
                <span className="tag"><ShieldCheck size={13} />{PROOF[t.proof].label}</span>
              </div>
              {cur.file_mime?.startsWith("image/")
                // eslint-disable-next-line @next/next/no-img-element
                ? <img className="preview-img" src={url} alt={`${t.name} uploaded by ${cur.name}`} />
                : <iframe className="preview" src={url} title={`${t.name} uploaded by ${cur.name}`} />}
              <div className="between small muted wrap"><span>{cur.file_name} · {cur.file_size ? kb(cur.file_size) : ""}</span><a href={url} target="_blank" rel="noreferrer" className="row" style={{ gap: 4 }}>Open in new tab<ExternalLink size={14} /></a></div>
              <div className="card" style={{ background: "var(--tint)" }}>
                <b className="small">Check before accepting</b>
                <ul className="small muted" style={{ margin: "6px 0 0", paddingLeft: 18 }}>{t.callouts.map((c) => <li key={c}>{c}</li>)}<li>{PROOF[t.proof].detail}</li></ul>
              </div>
              {mode === "view" ? (
                <div className="row wrap">
                  <Button className="accent" busy={busy === "accept"} onClick={() => decide("accept")}><Check size={18} />Accept</Button>
                  <button className="btn ghost" onClick={() => setMode("reject")}><X size={18} />Ask to redo</button>
                </div>
              ) : (
                <div className="stack">
                  <b>Why does it need redoing?</b>
                  <div className="reasons">{REJECT_REASONS.map((r) => <button key={r} aria-pressed={reason === r} onClick={() => setReason(r)}>{r}</button>)}</div>
                  <label className="field">Message to the student<textarea value={reason} onChange={(e) => setReason(e.target.value)} maxLength={300} placeholder="Say exactly what to fix, in plain words." /></label>
                  <div className="row wrap">
                    <Button className="danger" busy={busy === "reject"} disabled={reason.trim().length < 8} onClick={() => decide("reject")}>Send back to student</Button>
                    <button className="btn ghost" onClick={() => setMode("view")}>Cancel</button>
                  </div>
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
