import "server-only";
import { mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { seed } from "./seed";

// One SQLite file for the whole product. Node's built-in driver is synchronous,
// which suits short request handlers and keeps every write transactional.

// Serverless hosts (Vercel, AWS Lambda) mount the app read-only; only the temp folder is writable.
const SERVERLESS = !!(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
export const DATA_DIR = process.env.ARRIVE_DATA_DIR ?? (SERVERLESS ? path.join(tmpdir(), "arrive") : path.join(process.cwd(), ".data"));
export const UPLOAD_DIR = path.join(DATA_DIR, "uploads");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS students (
  id INTEGER PRIMARY KEY,
  josaa TEXT NOT NULL UNIQUE,
  dob TEXT NOT NULL,
  name TEXT NOT NULL,
  branch TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'GEN',
  phone TEXT NOT NULL,
  parent_name TEXT NOT NULL DEFAULT '',
  parent_phone TEXT NOT NULL DEFAULT '',
  fee_status TEXT NOT NULL DEFAULT 'pending',
  fee_ref TEXT,
  fee_note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS staff (
  id INTEGER PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  role TEXT NOT NULL,
  desk TEXT,
  pass_hash TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  subject_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS otps (
  id INTEGER PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  used INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS student_docs (
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  doc_id TEXT NOT NULL,
  status TEXT NOT NULL,
  source TEXT,
  reason TEXT,
  file_name TEXT,
  file_key TEXT,
  file_mime TEXT,
  file_size INTEGER,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  reviewed_by INTEGER REFERENCES staff(id),
  PRIMARY KEY (student_id, doc_id)
);
CREATE TABLE IF NOT EXISTS slots (
  id INTEGER PRIMARY KEY,
  day TEXT NOT NULL,
  label TEXT NOT NULL,
  capacity INTEGER NOT NULL,
  held INTEGER NOT NULL DEFAULT 0,
  sort INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS bookings (
  student_id INTEGER PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  slot_id INTEGER NOT NULL REFERENCES slots(id),
  pass_code TEXT NOT NULL UNIQUE,
  share_token TEXT NOT NULL UNIQUE,
  shared_lang TEXT,
  shared_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS checkins (
  student_id INTEGER PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  token_no INTEGER NOT NULL UNIQUE,
  checked_in_at TEXT NOT NULL DEFAULT (datetime('now')),
  checked_in_by INTEGER REFERENCES staff(id)
);
CREATE TABLE IF NOT EXISTS steps (
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  desk TEXT NOT NULL,
  seq INTEGER NOT NULL,
  status TEXT NOT NULL,
  queued_at INTEGER,
  called_at INTEGER,
  ack_at INTEGER,
  done_at INTEGER,
  PRIMARY KEY (student_id, desk)
);
CREATE INDEX IF NOT EXISTS steps_queue ON steps (desk, status, queued_at);
CREATE TABLE IF NOT EXISTS rooms (
  id INTEGER PRIMARY KEY,
  block TEXT NOT NULL,
  number TEXT NOT NULL,
  wing TEXT NOT NULL,
  checks TEXT,
  passed INTEGER NOT NULL DEFAULT 0,
  inspected_by TEXT,
  inspected_at TEXT,
  UNIQUE (block, number)
);
CREATE TABLE IF NOT EXISTS allocations (
  student_id INTEGER PRIMARY KEY REFERENCES students(id) ON DELETE CASCADE,
  room_id INTEGER NOT NULL REFERENCES rooms(id),
  accepted_at TEXT
);
CREATE TABLE IF NOT EXISTS tickets (
  id INTEGER PRIMARY KEY,
  room_id INTEGER NOT NULL REFERENCES rooms(id),
  student_id INTEGER REFERENCES students(id) ON DELETE SET NULL,
  item TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'reported',
  eta TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS messages (
  id INTEGER PRIMARY KEY,
  student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  author TEXT NOT NULL,
  author_name TEXT,
  staff_id INTEGER REFERENCES staff(id),
  body TEXT NOT NULL,
  escalated INTEGER NOT NULL DEFAULT 0,
  resolved INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS audit (
  id INTEGER PRIMARY KEY,
  staff_id INTEGER,
  student_id INTEGER,
  action TEXT NOT NULL,
  detail TEXT,
  at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS meta (k TEXT PRIMARY KEY, v TEXT NOT NULL);
`;

const g = globalThis as unknown as { __arriveDb?: DatabaseSync };

export function db(): DatabaseSync {
  if (g.__arriveDb) return g.__arriveDb;
  mkdirSync(UPLOAD_DIR, { recursive: true });
  const d = new DatabaseSync(path.join(DATA_DIR, "arrive.db"));
  d.exec("PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 4000;");
  d.exec(SCHEMA);
  const seeded = d.prepare("SELECT v FROM meta WHERE k = 'seeded'").get();
  if (!seeded) {
    tx(d, () => {
      seed(d);
      d.prepare("INSERT INTO meta (k, v) VALUES ('seeded', ?)").run(new Date().toISOString());
    });
  }
  g.__arriveDb = d;
  return d;
}

/** Run fn inside a transaction. Nested calls join the outer transaction. */
let depth = 0;
export function tx<T>(d: DatabaseSync, fn: () => T): T {
  if (depth > 0) {
    depth++;
    try { return fn(); } finally { depth--; }
  }
  depth = 1;
  try { return outer(d, fn); } finally { depth = 0; }
}

function outer<T>(d: DatabaseSync, fn: () => T): T {
  d.exec("BEGIN IMMEDIATE");
  try {
    const r = fn();
    d.exec("COMMIT");
    return r;
  } catch (e) {
    d.exec("ROLLBACK");
    throw e;
  }
}

export const now = () => Date.now();

export function audit(staffId: number | null, studentId: number | null, action: string, detail?: string) {
  db().prepare("INSERT INTO audit (staff_id, student_id, action, detail) VALUES (?, ?, ?, ?)").run(staffId, studentId, action, detail ?? null);
}
