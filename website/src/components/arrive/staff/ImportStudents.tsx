"use client";

import { CheckCircle2, Download, FileSpreadsheet, RotateCcw, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { api, errMsg } from "@/lib/arrive/client";
import { kb } from "@/lib/arrive/image";
import { Button, FormError, Pill, Sheet, useToast } from "../ui";

type Row = { line: number; josaa: string; name: string; status: "new" | "exists" | "duplicate" | "error"; errors: string[] };
type Report = { total: number; ready: number; exists: number; invalid: number; missingColumns: string[]; unknownColumns: string[]; rows: Row[] };
type Student = { id: number; name: string; josaa: string; branch: string; category: string; fee_status: string; ok: number; total: number; pass: boolean; token: number | null };

const LABEL: Record<Row["status"], [string, "ok" | "todo" | "action"]> = { new: ["Will import", "ok"], exists: ["Already added", "todo"], duplicate: ["Duplicate", "action"], error: ["Problem", "action"] };
const FIELD_NAMES: Record<string, string> = { josaa: "josaa", dob: "dob", name: "name", branch: "branch", phone: "phone" };

/** Upload a JoSAA / CSAB allotment CSV, preview what will happen, then import the valid new rows. */
export default function ImportStudents({ open, onClose, onDone }: { open: boolean; onClose: () => void; onDone: (students: Student[]) => void }) {
  const toast = useToast();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<{ name: string; size: number; text: string } | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [busy, setBusy] = useState<"preview" | "import" | null>(null);
  const [err, setErr] = useState("");
  const [over, setOver] = useState(false);
  const [onlyProblems, setOnlyProblems] = useState(false);

  function reset() { setFile(null); setReport(null); setErr(""); setOnlyProblems(false); }
  function close() { reset(); onClose(); }

  async function choose(f: File | undefined) {
    if (!f) return;
    reset();
    if (!/\.(csv|tsv|txt)$/i.test(f.name) && !/csv|text/.test(f.type)) return setErr("Choose a .csv file. In Excel or Google Sheets use File → Download / Save as → CSV.");
    if (f.size > 5 * 1024 * 1024) return setErr("This file is larger than 5 MB. Split it into smaller files.");
    const text = await f.text();
    setFile({ name: f.name, size: f.size, text });
    setBusy("preview");
    try {
      const r = await api<{ report: Report }>("/api/staff/students/import", { json: { csv: text, commit: false } });
      setReport(r.report);
      setOnlyProblems(r.report.invalid > 0);
    } catch (e) { setErr(errMsg(e)); } finally { setBusy(null); }
  }

  async function commit() {
    if (!file) return;
    setBusy("import"); setErr("");
    try {
      const r = await api<{ imported: number; students: Student[] }>("/api/staff/students/import", { json: { csv: file.text, commit: true } });
      onDone(r.students);
      toast(`${r.imported} student${r.imported === 1 ? "" : "s"} imported. They can sign in with their JoSAA number now.`);
      close();
    } catch (e) { setErr(errMsg(e)); } finally { setBusy(null); }
  }

  const rows = report ? (onlyProblems ? report.rows.filter((r) => r.status === "error" || r.status === "duplicate") : report.rows) : [];
  return (
    <Sheet open={open} onClose={close} title="Import allotment list">
      {!file ? (
        <>
          <p className="muted small">Upload the CSV of students allotted to IIITA (from the JoSAA or CSAB portal, or your own sheet). You will see a preview before anything is saved.</p>
          <div className={`drop${over ? " over" : ""}`} onDragOver={(e) => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)}
            onDrop={(e) => { e.preventDefault(); setOver(false); choose(e.dataTransfer.files?.[0]); }}>
            <FileSpreadsheet size={32} color="var(--teal)" />
            <b>Drop the CSV here</b>
            <button className="btn ghost sm" onClick={() => input.current?.click()}><Upload size={16} />Choose file</button>
            <input ref={input} type="file" hidden accept=".csv,.tsv,text/csv" onChange={(e) => { choose(e.target.files?.[0]); e.target.value = ""; }} />
          </div>
          <div className="card stack-sm" style={{ background: "var(--tint)" }}>
            <b className="small">Columns</b>
            <p className="tiny muted">
              Required: <span className="mono">josaa</span>, <span className="mono">dob</span>, <span className="mono">name</span>, <span className="mono">branch</span>, <span className="mono">phone</span>.
              Optional: <span className="mono">category</span> (GEN if empty), <span className="mono">parent_name</span>, <span className="mono">parent_phone</span>.
              Common JoSAA headings such as &ldquo;Application No&rdquo;, &ldquo;Candidate Name&rdquo;, &ldquo;Allotted Program&rdquo; and &ldquo;Mobile No&rdquo; are recognised. Dates can be DD/MM/YYYY or YYYY-MM-DD.
            </p>
            <a className="linkbtn small" href="/students-template.csv" download><Download size={14} />Download a template</a>
          </div>
          <FormError>{err}</FormError>
        </>
      ) : (
        <>
          <div className="filecard">
            <span className="ext">CSV</span>
            <div className="grow"><b>{file.name}</b><p className="small muted">{kb(file.size)}{report ? ` · ${report.total} rows` : ""}</p></div>
            <button className="iconbtn" onClick={reset} aria-label="Choose a different file"><RotateCcw size={18} /></button>
          </div>
          {busy === "preview" && <div className="row"><span className="spin" /><span className="muted small">Checking every row…</span></div>}
          {report && report.missingColumns.length > 0 && (
            <div className="banner bad"><span><b>Missing columns: {report.missingColumns.map((c) => FIELD_NAMES[c] ?? c).join(", ")}</b>
              The first row must be the column headings.{report.unknownColumns.length ? ` Found: ${report.unknownColumns.slice(0, 8).join(", ")}.` : ""}</span></div>
          )}
          {report && !report.missingColumns.length && (
            <>
              <div className="facts" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                <div className="fact"><span className="eyebrow">New</span><b className="token okc" style={{ fontSize: 24 }}>{report.ready}</b></div>
                <div className="fact"><span className="eyebrow">Already added</span><b className="token" style={{ fontSize: 24 }}>{report.exists}</b></div>
                <div className="fact"><span className="eyebrow">Problems</span><b className={`token ${report.invalid ? "badc" : ""}`} style={{ fontSize: 24 }}>{report.invalid}</b></div>
              </div>
              {report.unknownColumns.length > 0 && <p className="tiny muted">Ignored columns: {report.unknownColumns.join(", ")}</p>}
              {report.invalid > 0 && (
                <div className="between small"><span className="muted">Rows with problems are skipped. Fix them in the sheet and upload again later.</span>
                  <button className="linkbtn" onClick={() => setOnlyProblems((v) => !v)}>{onlyProblems ? "Show all" : "Only problems"}</button></div>
              )}
              <div className="card flush" style={{ maxHeight: 280, overflowY: "auto" }}>
                <table className="table">
                  <thead><tr><th>Row</th><th>Student</th><th>Status</th></tr></thead>
                  <tbody>
                    {rows.slice(0, 200).map((r) => (
                      <tr key={r.line}>
                        <td className="num muted small">{r.line}</td>
                        <td><b className="small">{r.name || "—"}</b><div className="tiny muted mono">{r.josaa || "no JoSAA number"}</div>{r.errors.length > 0 && <div className="tiny badc" style={{ fontWeight: 500 }}>{r.errors.join("; ")}</div>}</td>
                        <td><Pill status={LABEL[r.status][1]} label={LABEL[r.status][0]} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {rows.length > 200 && <p className="tiny muted" style={{ padding: 12 }}>Showing the first 200 of {rows.length} rows.</p>}
              </div>
            </>
          )}
          <FormError>{err}</FormError>
          <Button className="accent block" busy={busy === "import"} disabled={!report || report.ready === 0 || !!busy} onClick={commit}>
            <CheckCircle2 size={18} />{report?.ready ? `Import ${report.ready} student${report.ready === 1 ? "" : "s"}` : "Nothing new to import"}
          </Button>
        </>
      )}
    </Sheet>
  );
}
