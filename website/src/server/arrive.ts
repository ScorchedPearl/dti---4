import "server-only";
import { randomUUID } from "node:crypto";
import { unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import {
  CHECKLIST, DESKS, DOC_TYPES, FIX_ITEMS, ROOM_CHECKS, SENIOR_FALLBACK, docType, docsForCategory, matchFaq,
  type DeskKey, type DocStatus, type StepStatus, type TicketStatus,
} from "@/lib/arrive/catalog";
import type { ChatMsg, ParentStatus, RouteStep, StudentState, Ticket } from "@/lib/arrive/types";
import type { Student } from "./auth";
import { UPLOAD_DIR, audit, db, now, tx } from "./db";
import { passCode, token } from "./crypto";
import { fail } from "./http";

/* ------------------------------------------------------------------ helpers */
export const iso = (sqlTime: string) => (sqlTime.includes("T") ? sqlTime : sqlTime.replace(" ", "T") + "Z");
export const istStamp = (d = new Date()) =>
  d.toLocaleString("en-IN", { timeZone: "Asia/Kolkata", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).replace(/ at /, ", ");
export const ticketCode = (id: number) => `R-${id}`;

type DocRow = { doc_id: string; status: DocStatus; source: string | null; reason: string | null; file_name: string | null; file_key: string | null; updated_at: string };
type StepRow = { desk: DeskKey; seq: number; status: StepStatus; queued_at: number | null; called_at: number | null; ack_at: number | null };

const docRows = (sid: number) => db().prepare("SELECT doc_id, status, source, reason, file_name, file_key, updated_at FROM student_docs WHERE student_id = ?").all(sid) as DocRow[];
const allAccepted = (sid: number) => docRows(sid).every((d) => d.status === "ok");
const order = (id: string) => DOC_TYPES.findIndex((t) => t.id === id);

function aheadAt(desk: string, queuedAt: number | null) {
  if (queuedAt == null) return 0;
  return (db().prepare("SELECT COUNT(*) n FROM steps WHERE desk = ? AND status = 'waiting' AND queued_at < ?").get(desk, queuedAt) as { n: number }).n;
}

/* ------------------------------------------------------------------ state */
export function studentState(s: Student): StudentState {
  const d = db();
  const docs = docRows(s.id).sort((a, b) => order(a.doc_id) - order(b.doc_id)).map((r) => ({
    id: r.doc_id, status: r.status, source: r.source, reason: r.reason, fileName: r.file_name, updatedAt: iso(r.updated_at),
  }));
  const slots = (d.prepare(`SELECT s.id, s.day, s.label, s.capacity - s.held - (SELECT COUNT(*) FROM bookings b WHERE b.slot_id = s.id) AS left FROM slots s ORDER BY sort`).all() as { id: number; day: string; label: string; left: number }[])
    .map((x) => ({ ...x, left: Math.max(0, x.left), full: x.left <= 0 }));
  const b = d.prepare("SELECT slot_id, pass_code, share_token, shared_lang FROM bookings WHERE student_id = ?").get(s.id) as { slot_id: number; pass_code: string; share_token: string; shared_lang: string | null } | undefined;
  const c = d.prepare("SELECT token_no, checked_in_at FROM checkins WHERE student_id = ?").get(s.id) as { token_no: number; checked_in_at: string } | undefined;
  const route: RouteStep[] = (d.prepare("SELECT desk, seq, status, queued_at, called_at, ack_at FROM steps WHERE student_id = ? ORDER BY seq").all(s.id) as StepRow[]).map((r) => {
    const ahead = r.status === "waiting" && r.desk !== "R" ? aheadAt(r.desk, r.queued_at) : 0;
    const per = DESKS.find((k) => k.key === r.desk)!.minutes;
    return { desk: r.desk, status: r.status, ahead, etaMin: Math.max(1, (ahead + 1) * per), calledAt: r.called_at, ack: !!r.ack_at };
  });

  const a = d.prepare(`SELECT a.accepted_at, r.id room_id, r.block, r.number, r.wing, r.checks, r.passed, r.inspected_by, r.inspected_at
    FROM allocations a JOIN rooms r ON r.id = a.room_id WHERE a.student_id = ?`).get(s.id) as
    { accepted_at: string | null; room_id: number; block: string; number: string; wing: string; checks: string | null; passed: number; inspected_by: string | null; inspected_at: string | null } | undefined;
  let room: StudentState["room"] = null;
  if (a) {
    const m = d.prepare(`SELECT s.name, s.branch, s.phone, a.accepted_at FROM allocations a JOIN students s ON s.id = a.student_id WHERE a.room_id = ? AND a.student_id != ?`).get(a.room_id, s.id) as
      { name: string; branch: string; phone: string; accepted_at: string | null } | undefined;
    const both = !!(a.accepted_at && m?.accepted_at);
    room = {
      label: `Room ${a.number}, ${a.block}`, wing: a.wing, passed: !!a.passed, checks: a.checks ? (JSON.parse(a.checks) as boolean[]) : null,
      inspectedBy: a.inspected_by, inspectedAt: a.inspected_at, acceptedAt: a.accepted_at,
      mate: m ? { name: m.name, branch: m.branch, phone: both ? m.phone : null } : null,
    };
  }
  const tickets = (d.prepare("SELECT id, item, note, status, eta, created_at FROM tickets WHERE student_id = ? ORDER BY id DESC").all(s.id) as
    { id: number; item: string; note: string; status: TicketStatus; eta: string | null; created_at: string }[])
    .map((t) => ({ id: t.id, code: ticketCode(t.id), item: t.item, note: t.note, status: t.status, eta: t.eta, createdAt: iso(t.created_at) }));
  const chat = (d.prepare("SELECT id, author, author_name, body, created_at FROM messages WHERE student_id = ? ORDER BY id").all(s.id) as
    { id: number; author: ChatMsg["author"]; author_name: string | null; body: string; created_at: number }[])
    .map((m) => ({ id: m.id, author: m.author, name: m.author_name, body: m.body, at: m.created_at }));

  return {
    me: {
      name: s.name, first: s.name.split(" ")[0], branch: s.branch, josaa: s.josaa, category: s.category,
      phone: s.phone.slice(-4), parentName: s.parent_name, parentPhone: s.parent_phone,
    },
    fee: { status: s.fee_status === "paid" ? "paid" : "pending", ref: s.fee_ref, note: s.fee_note, amount: CHECKLIST.fee },
    docs, slots,
    booking: b ? { slotId: b.slot_id, passCode: b.pass_code, shareToken: b.share_token, sharedLang: b.shared_lang } : null,
    checkin: c ? { token: c.token_no, at: iso(c.checked_in_at) } : null,
    route, room, tickets, chat,
  };
}

/* ------------------------------------------------------------------ documents */
export const MAX_UPLOAD = 2 * 1024 * 1024;
const SIGS: { mime: string; ext: string; test: (b: Buffer) => boolean }[] = [
  { mime: "application/pdf", ext: "pdf", test: (b) => b.subarray(0, 5).toString("latin1") === "%PDF-" },
  { mime: "image/jpeg", ext: "jpg", test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  { mime: "image/png", ext: "png", test: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) },
];

function ownDoc(sid: number, docId: string) {
  const r = db().prepare("SELECT doc_id, status, file_key FROM student_docs WHERE student_id = ? AND doc_id = ?").get(sid, docId) as { doc_id: string; status: DocStatus; file_key: string | null } | undefined;
  return r ?? fail(404, "This document is not on your checklist.");
}

export async function uploadDoc(sid: number, docId: string, file: File) {
  const cur = ownDoc(sid, docId);
  if (cur.status === "ok") fail(409, "This document is already accepted.");
  if (file.size > MAX_UPLOAD) fail(413, `This file is ${(file.size / 1048576).toFixed(1)} MB. The limit is 2 MB.`, { code: "too_large" });
  if (file.size < 200) fail(400, "This file looks empty. Choose another one.");
  const buf = Buffer.from(await file.arrayBuffer());
  const sig = SIGS.find((s) => s.test(buf));
  if (!sig) fail(415, "Only PDF, JPG or PNG files are accepted.");
  if (docType(docId)?.photo && sig!.mime === "application/pdf") fail(415, "The photo must be a JPG or PNG image, not a PDF.");
  const key = `${randomUUID()}.${sig!.ext}`;
  await writeFile(path.join(UPLOAD_DIR, key), buf, { mode: 0o600 });
  const name = file.name.replace(/[^\w.\- ]+/g, "_").slice(0, 80) || `${docId}.${sig!.ext}`;
  db().prepare(`UPDATE student_docs SET status = 'review', source = ?, reason = NULL, file_name = ?, file_key = ?, file_mime = ?, file_size = ?, updated_at = datetime('now'), reviewed_by = NULL
    WHERE student_id = ? AND doc_id = ?`).run(`Uploaded ${istStamp().split(",")[0]}`, name, key, sig!.mime, buf.length, sid, docId);
  if (cur.file_key) unlink(path.join(UPLOAD_DIR, cur.file_key)).catch(() => {});
  audit(null, sid, "doc.upload", docId);
}

/**
 * DigiLocker pull. With DIGILOCKER_CLIENT_ID set this is where the partner API's
 * issued-document fetch goes; without it the sandbox issuer answers, which marks the
 * record as sandbox-verified so staff can tell the difference.
 */
export function fetchFromDigiLocker(sid: number, docId: string) {
  const t = docType(docId);
  if (!t?.digi) fail(400, "This document is not available in DigiLocker.");
  const cur = ownDoc(sid, docId);
  if (cur.status === "ok") fail(409, "This document is already accepted.");
  const sandbox = !process.env.DIGILOCKER_CLIENT_ID;
  db().prepare(`UPDATE student_docs SET status = 'ok', source = ?, reason = NULL, updated_at = datetime('now') WHERE student_id = ? AND doc_id = ?`)
    .run(sandbox ? "From DigiLocker (sandbox issuer)" : "From DigiLocker, verified", sid, docId);
  audit(null, sid, "doc.digilocker", docId);
  return { sandbox };
}

export function fileFor(docOwner: number, docId: string) {
  return db().prepare("SELECT file_key, file_mime, file_name FROM student_docs WHERE student_id = ? AND doc_id = ? AND file_key IS NOT NULL").get(docOwner, docId) as
    { file_key: string; file_mime: string; file_name: string } | undefined;
}

/* ------------------------------------------------------------------ slot and pass */
export function bookSlot(s: Student, slotId: number) {
  const d = db();
  return tx(d, () => {
    if (s.fee_status !== "paid") fail(409, "Your fee is not confirmed yet.");
    if (!allAccepted(s.id)) fail(409, "Every document has to be accepted first.");
    if (d.prepare("SELECT 1 FROM checkins WHERE student_id = ?").get(s.id)) fail(409, "You have already checked in, so the slot is fixed.");
    const left = d.prepare(`SELECT capacity - held - (SELECT COUNT(*) FROM bookings b WHERE b.slot_id = s.id AND b.student_id != ?) AS left FROM slots s WHERE id = ?`).get(s.id, slotId) as { left: number } | undefined;
    if (!left) fail(404, "That slot does not exist.");
    if (left!.left <= 0) fail(409, "That slot just filled up. Choose another one.");
    const has = d.prepare("SELECT 1 FROM bookings WHERE student_id = ?").get(s.id);
    if (has) d.prepare("UPDATE bookings SET slot_id = ? WHERE student_id = ?").run(slotId, s.id);
    else d.prepare("INSERT INTO bookings (student_id, slot_id, pass_code, share_token) VALUES (?, ?, ?, ?)").run(s.id, slotId, passCode(), token(16));
    audit(null, s.id, has ? "slot.change" : "pass.issue", String(slotId));
  });
}

export function recordShare(sid: number, lang: string) {
  const r = db().prepare("UPDATE bookings SET shared_lang = ?, shared_at = datetime('now') WHERE student_id = ?").run(lang === "hi" ? "hi" : "en", sid);
  if (!r.changes) fail(409, "Get your pass first.");
}

export function parentStatus(shareToken: string): ParentStatus | null {
  const d = db();
  const r = d.prepare(`SELECT s.id, s.name, s.branch, sl.day, sl.label FROM bookings b JOIN students s ON s.id = b.student_id JOIN slots sl ON sl.id = b.slot_id WHERE b.share_token = ?`).get(shareToken) as
    { id: number; name: string; branch: string; day: string; label: string } | undefined;
  if (!r) return null;
  const c = d.prepare("SELECT token_no FROM checkins WHERE student_id = ?").get(r.id) as { token_no: number } | undefined;
  const steps = d.prepare("SELECT desk, status FROM steps WHERE student_id = ? ORDER BY seq").all(r.id) as { desk: DeskKey; status: StepStatus }[];
  const cur = steps.find((x) => x.status === "waiting" || x.status === "called");
  const a = d.prepare("SELECT a.accepted_at, r.block, r.number FROM allocations a JOIN rooms r ON r.id = a.room_id WHERE a.student_id = ?").get(r.id) as { accepted_at: string | null; block: string; number: string } | undefined;
  const open = (d.prepare("SELECT COUNT(*) n FROM tickets WHERE student_id = ? AND status != 'fixed'").get(r.id) as { n: number }).n;
  return {
    name: r.name, first: r.name.split(" ")[0], branch: r.branch, slot: `${r.day} · ${r.label}`, ready: allAccepted(r.id), checkedIn: !!c, token: c?.token_no ?? null,
    stepsDone: steps.filter((x) => x.status === "done" || x.status === "skipped").length, stepsTotal: steps.length || DESKS.length,
    current: cur ? DESKS.find((k) => k.key === cur.desk)!.name : null, room: a ? `Room ${a.number}, ${a.block}` : null, roomAccepted: !!a?.accepted_at, openTickets: open,
  };
}

/* ------------------------------------------------------------------ gate and queue */
export function gateCode() {
  const d = db();
  let r = d.prepare("SELECT v FROM meta WHERE k = 'gate_code'").get() as { v: string } | undefined;
  if (!r) {
    const v = passCode().slice(8, 12);
    d.prepare("INSERT INTO meta (k, v) VALUES ('gate_code', ?)").run(v);
    r = { v };
  }
  return r.v;
}

export function checkIn(sid: number, staffId: number | null) {
  const d = db();
  return tx(d, () => {
    const existing = d.prepare("SELECT token_no FROM checkins WHERE student_id = ?").get(sid) as { token_no: number } | undefined;
    if (existing) return { token: existing.token_no, already: true };
    const next = ((d.prepare("SELECT MAX(token_no) m FROM checkins").get() as { m: number | null }).m ?? 240) + 1;
    d.prepare("INSERT INTO checkins (student_id, token_no, checked_in_by) VALUES (?, ?, ?)").run(sid, next, staffId);
    const green = allAccepted(sid);
    let first = true;
    DESKS.forEach((k, seq) => {
      let st: StepStatus = "pending";
      if (k.key === "A" && green) st = "skipped";
      else if (first) { st = "waiting"; first = false; }
      d.prepare("INSERT INTO steps (student_id, desk, seq, status, queued_at) VALUES (?, ?, ?, ?, ?)").run(sid, k.key, seq, st, st === "waiting" ? now() : null);
    });
    audit(staffId, sid, "gate.checkin", String(next));
    return { token: next, already: false };
  });
}

export function selfCheckIn(s: Student, code: string) {
  if (!db().prepare("SELECT 1 FROM bookings WHERE student_id = ?").get(s.id)) fail(409, "Get your Ready to Report pass first, or show your JoSAA number to the gate staff.");
  if (code.trim().toUpperCase().replace(/^ARRIVE-GATE:/, "") !== gateCode()) fail(400, "That is not today's gate code. It is on the poster at the gate.");
  return checkIn(s.id, null);
}

export function ackCall(sid: number) {
  const r = db().prepare("UPDATE steps SET ack_at = ? WHERE student_id = ? AND status = 'called' AND ack_at IS NULL").run(now(), sid);
  if (!r.changes) fail(409, "No desk is calling you right now.");
}

export type QueueRow = { studentId: number; name: string; token: number; status: StepStatus; queuedAt: number | null; calledAt: number | null; ack: boolean; greenLane: boolean };
export function deskQueue(desk: DeskKey) {
  const rows = db().prepare(`SELECT st.student_id, s.name, c.token_no, st.status, st.queued_at, st.called_at, st.ack_at,
      (SELECT status FROM steps x WHERE x.student_id = st.student_id AND x.desk = 'A') AS a_status
    FROM steps st JOIN students s ON s.id = st.student_id JOIN checkins c ON c.student_id = st.student_id
    WHERE st.desk = ? AND st.status IN ('waiting', 'called') ORDER BY st.status = 'called' DESC, st.queued_at`).all(desk) as
    { student_id: number; name: string; token_no: number; status: StepStatus; queued_at: number | null; called_at: number | null; ack_at: number | null; a_status: string }[];
  const done = (db().prepare("SELECT COUNT(*) n FROM steps WHERE desk = ? AND status = 'done'").get(desk) as { n: number }).n;
  return {
    rows: rows.map((r) => ({ studentId: r.student_id, name: r.name, token: r.token_no, status: r.status, queuedAt: r.queued_at, calledAt: r.called_at, ack: !!r.ack_at, greenLane: r.a_status === "skipped" })),
    done,
  };
}

export function callNext(desk: DeskKey, staffId: number) {
  if (desk === "R") fail(400, "Rooms are handed over in the Rooms tab.");
  const d = db();
  return tx(d, () => {
    const r = d.prepare("SELECT student_id FROM steps WHERE desk = ? AND status = 'waiting' ORDER BY queued_at LIMIT 1").get(desk) as { student_id: number } | undefined;
    if (!r) fail(409, "Nobody is waiting at this desk.");
    d.prepare("UPDATE steps SET status = 'called', called_at = ?, ack_at = NULL WHERE student_id = ? AND desk = ?").run(now(), r!.student_id, desk);
    audit(staffId, r!.student_id, "desk.call", desk);
    return r!.student_id;
  });
}

/** Finish the student's step at `desk` and queue them at the next one. */
export function completeStep(sid: number, desk: DeskKey, staffId: number | null) {
  const d = db();
  tx(d, () => {
    const st = d.prepare("SELECT seq, status FROM steps WHERE student_id = ? AND desk = ?").get(sid, desk) as { seq: number; status: StepStatus } | undefined;
    if (!st || (st.status !== "waiting" && st.status !== "called")) fail(409, "This step is not open.");
    d.prepare("UPDATE steps SET status = 'done', done_at = ? WHERE student_id = ? AND desk = ?").run(now(), sid, desk);
    const nxt = d.prepare("SELECT desk FROM steps WHERE student_id = ? AND seq > ? AND status = 'pending' ORDER BY seq LIMIT 1").get(sid, st!.seq) as { desk: string } | undefined;
    if (nxt) d.prepare("UPDATE steps SET status = 'waiting', queued_at = ? WHERE student_id = ? AND desk = ?").run(now(), sid, nxt.desk);
    audit(staffId, sid, "desk.done", desk);
  });
}

export function requeue(sid: number, desk: DeskKey, staffId: number) {
  const r = db().prepare("UPDATE steps SET status = 'waiting', queued_at = ?, called_at = NULL, ack_at = NULL WHERE student_id = ? AND desk = ? AND status = 'called'").run(now(), sid, desk);
  if (!r.changes) fail(409, "This student is not being called.");
  audit(staffId, sid, "desk.requeue", desk);
}

/* ------------------------------------------------------------------ room */
function allocation(sid: number) {
  return db().prepare("SELECT a.room_id, a.accepted_at, r.passed FROM allocations a JOIN rooms r ON r.id = a.room_id WHERE a.student_id = ?").get(sid) as
    { room_id: number; accepted_at: string | null; passed: number } | undefined;
}

export function acceptRoom(sid: number) {
  const a = allocation(sid) ?? fail(404, "No room is allocated to you yet.");
  if (a.accepted_at) return;
  const r = db().prepare("SELECT status FROM steps WHERE student_id = ? AND desk = 'R'").get(sid) as { status: StepStatus } | undefined;
  if (!r || r.status === "pending") fail(409, "Finish the hostel office step first. They hand over your key.");
  if (!a.passed) fail(409, "This room has not passed inspection yet. The caretaker has been told.");
  tx(db(), () => {
    db().prepare("UPDATE allocations SET accepted_at = ? WHERE student_id = ?").run(istStamp(), sid);
    if (r!.status === "waiting" || r!.status === "called") completeStep(sid, "R", null);
  });
}

export function reportProblem(sid: number, item: string, note: string) {
  const a = allocation(sid) ?? fail(404, "No room is allocated to you yet.");
  if (!FIX_ITEMS.some((f) => f.id === item)) fail(400, "Choose what is wrong.");
  const r = db().prepare("INSERT INTO tickets (room_id, student_id, item, note, eta) VALUES (?, ?, ?, ?, 'Today, 6:00 pm')").run(a.room_id, sid, item, note);
  audit(null, sid, "ticket.open", item);
  return ticketCode(Number(r.lastInsertRowid));
}

export function listTickets(): Ticket[] {
  return (db().prepare(`SELECT t.id, t.item, t.note, t.status, t.eta, t.created_at, r.block, r.number, s.name FROM tickets t JOIN rooms r ON r.id = t.room_id LEFT JOIN students s ON s.id = t.student_id
    ORDER BY t.status = 'fixed', t.id DESC`).all() as { id: number; item: string; note: string; status: TicketStatus; eta: string | null; created_at: string; block: string; number: string; name: string | null }[])
    .map((t) => ({ id: t.id, code: ticketCode(t.id), item: t.item, note: t.note, status: t.status, eta: t.eta, createdAt: iso(t.created_at), room: `${t.number}, ${t.block}`, student: t.name }));
}

export function updateTicket(id: number, status: TicketStatus, eta: string | null, staffId: number) {
  if (!["reported", "assigned", "fixed"].includes(status)) fail(400, "Unknown status.");
  const r = db().prepare("UPDATE tickets SET status = ?, eta = COALESCE(?, eta), updated_at = datetime('now') WHERE id = ?").run(status, eta, id);
  if (!r.changes) fail(404, "Ticket not found.");
  audit(staffId, null, "ticket." + status, ticketCode(id));
}

export function listRooms() {
  return (db().prepare(`SELECT r.id, r.block, r.number, r.wing, r.checks, r.passed, r.inspected_by, r.inspected_at,
      (SELECT COUNT(*) FROM allocations a WHERE a.room_id = r.id) occupants,
      (SELECT COUNT(*) FROM allocations a WHERE a.room_id = r.id AND a.accepted_at IS NOT NULL) accepted,
      (SELECT COUNT(*) FROM tickets t WHERE t.room_id = r.id AND t.status != 'fixed') open
    FROM rooms r ORDER BY r.block, r.number`).all() as { id: number; block: string; number: string; wing: string; checks: string | null; passed: number; inspected_by: string | null; inspected_at: string | null; occupants: number; accepted: number; open: number }[])
    .map((r) => ({ ...r, checks: r.checks ? (JSON.parse(r.checks) as boolean[]) : null, passed: !!r.passed }));
}

export function inspectRoom(roomId: number, checks: boolean[], staff: { id: number; name: string }) {
  if (checks.length !== ROOM_CHECKS.length) fail(400, "Answer every check.");
  const passed = checks.every(Boolean);
  const r = db().prepare("UPDATE rooms SET checks = ?, passed = ?, inspected_by = ?, inspected_at = ? WHERE id = ?").run(JSON.stringify(checks), passed ? 1 : 0, staff.name, istStamp(), roomId);
  if (!r.changes) fail(404, "Room not found.");
  audit(staff.id, null, "room.inspect", `${roomId}:${passed ? "pass" : "fail"}`);
  return passed;
}

/* ------------------------------------------------------------------ help */
export function ask(sid: number, text: string) {
  const d = db();
  tx(d, () => {
    const f = matchFaq(text);
    const t = now();
    d.prepare("INSERT INTO messages (student_id, author, body, escalated, created_at) VALUES (?, 'student', ?, ?, ?)").run(sid, text, f ? 0 : 1, t);
    d.prepare("INSERT INTO messages (student_id, author, author_name, body, created_at) VALUES (?, 'bot', ?, ?, ?)").run(sid, f ? "IIITA Help · official FAQ" : "IIITA Help", f ? f.a : SENIOR_FALLBACK, t + 1);
  });
}

export function inbox() {
  return db().prepare(`SELECT s.id, s.name, s.branch,
      (SELECT body FROM messages m WHERE m.student_id = s.id AND m.escalated = 1 ORDER BY id DESC LIMIT 1) last,
      (SELECT MAX(created_at) FROM messages m WHERE m.student_id = s.id) at,
      (SELECT COUNT(*) FROM messages m WHERE m.student_id = s.id AND m.escalated = 1 AND m.resolved = 0) open
    FROM students s WHERE EXISTS (SELECT 1 FROM messages m WHERE m.student_id = s.id AND m.escalated = 1)
    ORDER BY open > 0 DESC, at DESC`).all() as { id: number; name: string; branch: string; last: string; at: number; open: number }[];
}

export function thread(sid: number): ChatMsg[] {
  return (db().prepare("SELECT id, author, author_name, body, created_at, escalated FROM messages WHERE student_id = ? ORDER BY id").all(sid) as
    { id: number; author: ChatMsg["author"]; author_name: string | null; body: string; created_at: number }[])
    .map((m) => ({ id: m.id, author: m.author, name: m.author_name, body: m.body, at: m.created_at }));
}

export function reply(sid: number, staff: { id: number; name: string; title: string }, text: string) {
  const d = db();
  if (!d.prepare("SELECT 1 FROM students WHERE id = ?").get(sid)) fail(404, "Student not found.");
  tx(d, () => {
    d.prepare("INSERT INTO messages (student_id, author, author_name, staff_id, body, created_at) VALUES (?, 'volunteer', ?, ?, ?, ?)").run(sid, `${staff.name} · ${staff.title}`, staff.id, text, now());
    d.prepare("UPDATE messages SET resolved = 1 WHERE student_id = ? AND escalated = 1").run(sid);
  });
  audit(staff.id, sid, "help.reply");
}

/* ------------------------------------------------------------------ staff: documents and students */
export function reviewQueue() {
  return (db().prepare(`SELECT sd.student_id, sd.doc_id, sd.file_name, sd.file_mime, sd.file_size, sd.updated_at, s.name, s.josaa, s.branch, s.category
    FROM student_docs sd JOIN students s ON s.id = sd.student_id WHERE sd.status = 'review' ORDER BY sd.updated_at`).all() as
    { student_id: number; doc_id: string; file_name: string | null; file_mime: string | null; file_size: number | null; updated_at: string; name: string; josaa: string; branch: string; category: string }[])
    .map((r) => ({ ...r, updated_at: iso(r.updated_at) }));
}

export function reviewDoc(sid: number, docId: string, decision: "accept" | "reject", reason: string, staffId: number) {
  if (decision === "reject" && reason.length < 8) fail(400, "Tell the student what to fix (at least a short sentence).");
  const r = db().prepare(`UPDATE student_docs SET status = ?, reason = ?, source = CASE WHEN ? = 'ok' THEN 'Accepted by the verification team' ELSE source END, reviewed_by = ?, updated_at = datetime('now')
    WHERE student_id = ? AND doc_id = ? AND status = 'review'`).run(decision === "accept" ? "ok" : "action", decision === "accept" ? null : reason, decision === "accept" ? "ok" : "action", staffId, sid, docId);
  if (!r.changes) fail(409, "Someone already reviewed this document.");
  audit(staffId, sid, `doc.${decision}`, docId);
}

export function findStudent(q: string) {
  const t = q.trim().toUpperCase();
  return db().prepare(`SELECT s.id, s.name, s.josaa, s.branch FROM students s LEFT JOIN bookings b ON b.student_id = s.id WHERE s.josaa = ? OR b.pass_code = ? OR b.pass_code = ?`).get(t, t, t.replace(/^ARRIVE:/, "")) as
    { id: number; name: string; josaa: string; branch: string } | undefined;
}

export function recentCheckins() {
  return (db().prepare(`SELECT c.token_no, c.checked_in_at, s.name, s.branch, (SELECT status FROM steps x WHERE x.student_id = s.id AND x.desk = 'A') a FROM checkins c JOIN students s ON s.id = c.student_id ORDER BY c.token_no DESC LIMIT 12`).all() as
    { token_no: number; checked_in_at: string; name: string; branch: string; a: string }[]).map((r) => ({ ...r, checked_in_at: iso(r.checked_in_at), greenLane: r.a === "skipped" }));
}

export function listStudents(q: string) {
  const like = `%${q.trim()}%`;
  return (db().prepare(`SELECT s.id, s.name, s.josaa, s.branch, s.category, s.fee_status,
      (SELECT COUNT(*) FROM student_docs d WHERE d.student_id = s.id AND d.status = 'ok') ok,
      (SELECT COUNT(*) FROM student_docs d WHERE d.student_id = s.id) total,
      EXISTS (SELECT 1 FROM bookings b WHERE b.student_id = s.id) pass,
      (SELECT token_no FROM checkins c WHERE c.student_id = s.id) token
    FROM students s WHERE s.name LIKE ? OR s.josaa LIKE ? ORDER BY s.name LIMIT 200`).all(like, like) as
    { id: number; name: string; josaa: string; branch: string; category: string; fee_status: string; ok: number; total: number; pass: number; token: number | null }[])
    .map((r) => ({ ...r, pass: !!r.pass }));
}

export function addStudent(p: { josaa: string; dob: string; name: string; branch: string; category: string; phone: string; parentName: string; parentPhone: string }, staffId: number) {
  const d = db();
  if (d.prepare("SELECT 1 FROM students WHERE josaa = ?").get(p.josaa)) fail(409, "A student with this JoSAA number already exists.");
  return tx(d, () => {
    const r = d.prepare("INSERT INTO students (josaa, dob, name, branch, category, phone, parent_name, parent_phone) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
      .run(p.josaa, p.dob, p.name, p.branch, p.category, p.phone, p.parentName, p.parentPhone);
    const sid = Number(r.lastInsertRowid);
    for (const t of docsForCategory(p.category)) {
      const st = t.id === "jee" ? "ok" : "todo";
      d.prepare("INSERT INTO student_docs (student_id, doc_id, status, source) VALUES (?, ?, ?, ?)").run(sid, t.id, st, st === "ok" ? "From JoSAA" : null);
    }
    audit(staffId, sid, "student.add");
    return sid;
  });
}

export function confirmFee(sid: number, ref: string, staffId: number) {
  const r = db().prepare("UPDATE students SET fee_status = 'paid', fee_ref = ?, fee_note = ? WHERE id = ?").run(ref, `Confirmed ${istStamp()}`, sid);
  if (!r.changes) fail(404, "Student not found.");
  audit(staffId, sid, "fee.confirm", ref);
}

export function overview() {
  const d = db();
  const n = (sql: string) => (d.prepare(sql).get() as { n: number }).n;
  return {
    students: n("SELECT COUNT(*) n FROM students"),
    passes: n("SELECT COUNT(*) n FROM bookings"),
    toReview: n("SELECT COUNT(*) n FROM student_docs WHERE status = 'review'"),
    checkedIn: n("SELECT COUNT(*) n FROM checkins"),
    settled: n("SELECT COUNT(*) n FROM allocations WHERE accepted_at IS NOT NULL"),
    openTickets: n("SELECT COUNT(*) n FROM tickets WHERE status != 'fixed'"),
    openHelp: n("SELECT COUNT(DISTINCT student_id) n FROM messages WHERE escalated = 1 AND resolved = 0"),
    feePending: n("SELECT COUNT(*) n FROM students WHERE fee_status != 'paid'"),
    desks: DESKS.filter((k) => k.key !== "R").map((k) => ({
      key: k.key, name: k.name,
      waiting: n(`SELECT COUNT(*) n FROM steps WHERE desk = '${k.key}' AND status = 'waiting'`),
      called: n(`SELECT COUNT(*) n FROM steps WHERE desk = '${k.key}' AND status = 'called'`),
      done: n(`SELECT COUNT(*) n FROM steps WHERE desk = '${k.key}' AND status = 'done'`),
    })),
    activity: (d.prepare(`SELECT a.action, a.detail, a.at, s.name student, st.name staff FROM audit a LEFT JOIN students s ON s.id = a.student_id LEFT JOIN staff st ON st.id = a.staff_id ORDER BY a.id DESC LIMIT 12`).all() as
      { action: string; detail: string | null; at: string; student: string | null; staff: string | null }[]).map((r) => ({ ...r, at: iso(r.at) })),
  };
}
