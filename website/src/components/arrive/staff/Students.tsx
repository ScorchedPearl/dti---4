"use client";

import { FileSpreadsheet, Plus, Search, Users } from "lucide-react";
import { useState } from "react";
import { api, errMsg } from "@/lib/arrive/client";
import { Button, Empty, FormError, Pill, Sheet, Spinner, useToast } from "../ui";
import { Head, useConsole, useStaffData } from "./ConsoleShell";
import ImportStudents from "./ImportStudents";

type S = { id: number; name: string; josaa: string; branch: string; category: string; fee_status: string; ok: number; total: number; pass: boolean; token: number | null };
const BRANCHES = ["B.Tech IT", "B.Tech IT-BI", "B.Tech CSE", "B.Tech ECE"];
const EMPTY = { josaa: "", dob: "", name: "", branch: BRANCHES[0], category: "GEN", phone: "", parentName: "", parentPhone: "" };

export function Students() {
  const { me, refreshCounts } = useConsole();
  const toast = useToast();
  const [q, setQ] = useState("");
  const { data, setData } = useStaffData<{ students: S[] }>(`/api/staff/students?q=${encodeURIComponent(q)}`, 15000);
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [fee, setFee] = useState<S | null>(null);
  const [ref, setRef] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const admin = me.role === "admin";

  async function add(e: React.FormEvent) {
    e.preventDefault(); setErr(""); setBusy(true);
    try {
      const r = await api<{ students: S[] }>("/api/staff/students", { json: form });
      setData(r); setAdding(false); setForm(EMPTY); refreshCounts();
      toast(`${form.name} added. They can sign in with their JoSAA number now.`);
    } catch (e2) { setErr(errMsg(e2)); } finally { setBusy(false); }
  }
  async function confirmFee(e: React.FormEvent) {
    e.preventDefault(); if (!fee) return; setErr(""); setBusy(true);
    try {
      const r = await api<{ students: S[] }>(`/api/staff/students/${fee.id}`, { json: { feeRef: ref } });
      setData(r); toast(`Fee confirmed for ${fee.name}`); setFee(null); setRef(""); refreshCounts();
    } catch (e2) { setErr(errMsg(e2)); } finally { setBusy(false); }
  }
  const f = (k: keyof typeof EMPTY) => ({ value: form[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((x) => ({ ...x, [k]: e.target.value })) });

  return (
    <div className="c-page">
      <Head title="Students" sub="Everyone allotted to IIITA through JoSAA. Search by name or application number.">
        {admin && <button className="btn ghost sm" onClick={() => setImporting(true)}><FileSpreadsheet size={16} />Import CSV</button>}
        {admin && <button className="btn sm" onClick={() => { setAdding(true); setErr(""); }}><Plus size={16} />Add student</button>}
      </Head>
      <div className="row" style={{ maxWidth: 420, position: "relative" }}>
        <Search size={18} style={{ position: "absolute", left: 14, color: "var(--faint)" }} aria-hidden />
        <input className="input" style={{ paddingLeft: 42 }} value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or JoSAA number" aria-label="Search students" />
      </div>
      <section className="card flush">
        {!data ? <div style={{ padding: 18 }}><Spinner /></div> : !data.students.length ? <Empty icon={<Users />} title="No students match">Try part of the name or the last digits of the application number.</Empty> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Student</th><th>JoSAA</th><th>Category</th><th>Documents</th><th>Fee</th><th>Pass</th><th>Token</th></tr></thead>
            <tbody>{data.students.map((s) => (
              <tr key={s.id}>
                <td><b>{s.name}</b><div className="tiny muted">{s.branch}</div></td>
                <td className="mono small">{s.josaa}</td>
                <td className="small">{s.category}</td>
                <td style={{ minWidth: 130 }}><div className="small num" style={{ marginBottom: 4 }}>{s.ok}/{s.total}</div><div className="progress"><i style={{ width: `${(100 * s.ok) / Math.max(1, s.total)}%` }} /></div></td>
                <td>{s.fee_status === "paid" ? <Pill status="ok" label="Paid" /> : admin ? <button className="btn ghost xs" onClick={() => { setFee(s); setErr(""); }}>Confirm fee</button> : <Pill status="review" label="Pending" />}</td>
                <td>{s.pass ? <Pill status="ok" label="Issued" /> : <span className="faint small">–</span>}</td>
                <td className="token" style={{ fontSize: 15 }}>{s.token ? `#${s.token}` : <span className="faint small">–</span>}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </section>

      <ImportStudents open={importing} onClose={() => setImporting(false)} onDone={(students) => { setQ(""); setData({ students }); refreshCounts(); }} />
      <Sheet open={adding} onClose={() => setAdding(false)} title="Add a student">
        <form className="stack" onSubmit={add} noValidate>
          <label className="field">Full name (as in JoSAA)<input {...f("name")} autoComplete="off" /></label>
          <div className="facts">
            <label className="field">JoSAA application no.<input {...f("josaa")} inputMode="numeric" maxLength={12} /></label>
            <label className="field">Date of birth<input type="date" {...f("dob")} /></label>
            <label className="field">Branch<select {...f("branch")}>{BRANCHES.map((b) => <option key={b}>{b}</option>)}</select></label>
            <label className="field">Category<select {...f("category")}>{["GEN", "OBC-NCL", "SC", "ST", "EWS"].map((c) => <option key={c}>{c}</option>)}</select></label>
            <label className="field">Student mobile<input {...f("phone")} inputMode="tel" maxLength={10} placeholder="10 digits" /></label>
            <label className="field">Parent mobile<input {...f("parentPhone")} inputMode="tel" maxLength={10} placeholder="Optional" /></label>
          </div>
          <label className="field">Parent name (how the student calls them)<input {...f("parentName")} placeholder="e.g. Papa" /></label>
          <p className="tiny muted">Their checklist is created from the category. The JEE scorecard is marked accepted from JoSAA.</p>
          <FormError>{err}</FormError>
          <Button className="accent block" busy={busy} type="submit">Add student</Button>
        </form>
      </Sheet>
      <Sheet open={!!fee} onClose={() => setFee(null)} title={`Confirm fee for ${fee?.name ?? ""}`}>
        <form className="stack" onSubmit={confirmFee}>
          <p className="muted small">Only confirm after the payment shows in the bank statement or gateway dashboard.</p>
          <label className="field">Bank or gateway reference<input value={ref} onChange={(e) => setRef(e.target.value)} placeholder="e.g. IIITA26-91234" autoFocus /></label>
          <FormError>{err}</FormError>
          <Button className="accent block" busy={busy} type="submit">Confirm fee paid</Button>
        </form>
      </Sheet>
    </div>
  );
}
