import "server-only";
import { db, tx } from "./db";
import { addStudent } from "./arrive";

// Student roster: one validator shared by the "Add student" form and the CSV import
// of the JoSAA / CSAB allotment list.

export type NewStudent = { josaa: string; dob: string; name: string; branch: string; category: string; phone: string; parentName: string; parentPhone: string };
export const CATEGORIES = ["GEN", "OBC-NCL", "SC", "ST", "EWS"];
export const MAX_IMPORT_ROWS = 5000;

const CAT_ALIASES: Record<string, string> = {
  GEN: "GEN", GENERAL: "GEN", OPEN: "GEN", UR: "GEN", "GEN-PWD": "GEN", "OPEN (PWD)": "GEN",
  OBC: "OBC-NCL", "OBC-NCL": "OBC-NCL", "OBC NCL": "OBC-NCL", "OBC-NCL-PWD": "OBC-NCL",
  SC: "SC", "SC-PWD": "SC", ST: "ST", "ST-PWD": "ST",
  EWS: "EWS", "GEN-EWS": "EWS", "EWS-PWD": "EWS", "GEN-EWS-PWD": "EWS",
};

/** Accepts DD/MM/YYYY, DD-MM-YYYY, DD.MM.YYYY or YYYY-MM-DD and returns YYYY-MM-DD, or "" if not a real date. */
export function normDate(s: string) {
  const t = s.trim();
  let y: number, m: number, d: number;
  let r = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (r) { y = +r[1]; m = +r[2]; d = +r[3]; }
  else if ((r = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/))) { d = +r[1]; m = +r[2]; y = +r[3]; }
  else return "";
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return "";
  if (y < 1990 || y > new Date().getFullYear() - 10) return "";
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const normPhone = (s: string) => s.replace(/[\s()-]/g, "").replace(/^(\+91|0091|91(?=\d{10}$)|0(?=\d{10}$))/, "");

/** Normalise and check one student record. Returns the clean record, or a list of plain-English problems. */
export function validateStudent(raw: Record<string, string>): { ok: true; s: NewStudent } | { ok: false; errors: string[] } {
  const g = (k: string) => (raw[k] ?? "").trim();
  const s: NewStudent = {
    josaa: g("josaa").replace(/\s/g, ""),
    dob: normDate(g("dob")),
    name: g("name").replace(/\s+/g, " ").slice(0, 80),
    branch: g("branch").replace(/\s+/g, " ").slice(0, 40),
    category: CAT_ALIASES[g("category").toUpperCase()] ?? (g("category") ? "" : "GEN"),
    phone: normPhone(g("phone")),
    parentName: g("parentName").slice(0, 40),
    parentPhone: normPhone(g("parentPhone")),
  };
  const errors: string[] = [];
  if (!/^\d{12}$/.test(s.josaa)) errors.push("JoSAA number must be 12 digits");
  if (!s.dob) errors.push(g("dob") ? `date of birth "${g("dob")}" is not a valid date` : "date of birth is missing");
  if (s.name.length < 3) errors.push("name is missing");
  if (!s.branch) errors.push("branch is missing");
  if (!s.category) errors.push(`category "${g("category")}" is not one of ${CATEGORIES.join(", ")}`);
  if (!/^[6-9]\d{9}$/.test(s.phone)) errors.push("student phone must be a 10-digit Indian mobile number");
  if (s.parentPhone && !/^[6-9]\d{9}$/.test(s.parentPhone)) errors.push("parent phone must be a 10-digit Indian mobile number");
  return errors.length ? { ok: false, errors } : { ok: true, s };
}

/* ------------------------------------------------------------------ CSV */

/** RFC 4180 CSV: quoted fields, escaped quotes, commas and newlines inside quotes, CRLF, BOM. Also reads tab- or semicolon-separated files. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, "");
  const first = src.split(/\r?\n/, 1)[0] ?? "";
  const sep = [",", "\t", ";"].reduce((a, b) => (first.split(b).length > first.split(a).length ? b : a), ",");
  const rows: string[][] = [];
  let row: string[] = [], field = "", q = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (q) {
      if (c === '"' && src[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else if (c === '"' && field === "") q = true;
    else if (c === sep) { row.push(field); field = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && src[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some((f) => f.trim())) rows.push(row);
      row = [];
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim())) rows.push(row);
  return rows;
}

// Header names seen in JoSAA / CSAB exports and hand-made sheets, mapped to our fields.
const HEADERS: Record<keyof NewStudent, string[]> = {
  josaa: ["josaa", "josaa no", "josaa number", "josaa application number", "application no", "application number", "app no", "jee application number", "jee main application number", "roll no", "roll number"],
  dob: ["dob", "date of birth", "birth date", "birthdate"],
  name: ["name", "candidate name", "student name", "full name", "candidate's name"],
  branch: ["branch", "program", "programme", "course", "allotted program", "allotted branch", "academic program"],
  category: ["category", "allotted category", "seat category", "candidate category"],
  phone: ["phone", "mobile", "mobile no", "mobile number", "phone number", "student phone", "student mobile", "contact"],
  parentName: ["parent name", "parent", "guardian", "guardian name", "father name", "father's name"],
  parentPhone: ["parent phone", "parent mobile", "guardian phone", "guardian mobile", "father mobile", "father's mobile", "parent contact"],
};
const norm = (h: string) => h.toLowerCase().replace(/[_\-.]+/g, " ").replace(/\s+/g, " ").trim();

export type ImportRow = { line: number; josaa: string; name: string; status: "new" | "exists" | "duplicate" | "error"; errors: string[] };
export type ImportReport = { total: number; ready: number; exists: number; invalid: number; missingColumns: string[]; unknownColumns: string[]; rows: ImportRow[] };

function analyse(text: string) {
  const grid = parseCsv(text);
  if (grid.length < 2) return { report: { total: 0, ready: 0, exists: 0, invalid: 0, missingColumns: [], unknownColumns: [], rows: [] } as ImportReport, valid: [] as NewStudent[], error: "The file has no student rows. The first row must be the column headings." };
  if (grid.length - 1 > MAX_IMPORT_ROWS) return { report: null, valid: [], error: `The file has ${grid.length - 1} rows. Import at most ${MAX_IMPORT_ROWS} at a time.` };

  const head = grid[0].map(norm);
  const col: Partial<Record<keyof NewStudent, number>> = {};
  (Object.keys(HEADERS) as (keyof NewStudent)[]).forEach((k) => {
    const i = head.findIndex((h) => HEADERS[k].includes(h));
    if (i >= 0) col[k] = i;
  });
  const required: (keyof NewStudent)[] = ["josaa", "dob", "name", "branch", "phone"];
  const missingColumns = required.filter((k) => col[k] === undefined);
  const used = new Set(Object.values(col));
  const unknownColumns = grid[0].filter((h, i) => h.trim() && !used.has(i));
  if (missingColumns.length) {
    return { report: { total: grid.length - 1, ready: 0, exists: 0, invalid: 0, missingColumns, unknownColumns, rows: [] }, valid: [], error: null };
  }

  const existing = new Set((db().prepare("SELECT josaa FROM students").all() as { josaa: string }[]).map((r) => r.josaa));
  const seen = new Set<string>();
  const rows: ImportRow[] = [];
  const valid: NewStudent[] = [];
  grid.slice(1).forEach((cells, i) => {
    const raw: Record<string, string> = {};
    (Object.keys(col) as (keyof NewStudent)[]).forEach((k) => { raw[k] = cells[col[k]!] ?? ""; });
    const v = validateStudent(raw);
    const line = i + 2;
    const josaa = (raw.josaa ?? "").replace(/\s/g, "");
    const name = (raw.name ?? "").trim();
    if (!v.ok) rows.push({ line, josaa, name, status: "error", errors: v.errors });
    else if (existing.has(v.s.josaa)) rows.push({ line, josaa, name, status: "exists", errors: [] });
    else if (seen.has(v.s.josaa)) rows.push({ line, josaa, name, status: "duplicate", errors: ["same JoSAA number appears earlier in the file"] });
    else { seen.add(v.s.josaa); valid.push(v.s); rows.push({ line, josaa, name, status: "new", errors: [] }); }
  });
  const report: ImportReport = {
    total: rows.length, ready: valid.length, exists: rows.filter((r) => r.status === "exists").length,
    invalid: rows.filter((r) => r.status === "error" || r.status === "duplicate").length, missingColumns, unknownColumns, rows,
  };
  return { report, valid, error: null };
}

export function previewImport(text: string) {
  return analyse(text);
}

/** Insert every valid new row in one transaction. Rows that already exist or have errors are skipped. */
export function commitImport(text: string, staffId: number) {
  const a = analyse(text);
  if (a.error || !a.report || a.report.missingColumns.length) return { ...a, imported: 0 };
  tx(db(), () => { for (const s of a.valid) addStudent(s, staffId); });
  return { ...a, imported: a.valid.length };
}
