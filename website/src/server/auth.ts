import "server-only";
import { cookies } from "next/headers";
import type { StaffRole } from "@/lib/arrive/catalog";
import { db, now } from "./db";
import { otpCode, safeEqual, sha256, token, verifyPassword } from "./crypto";
import { fail } from "./http";

export const STUDENT_COOKIE = "arrive_student";
export const STAFF_COOKIE = "arrive_staff";
const STUDENT_TTL = 14 * 24 * 3600_000;
const STAFF_TTL = 12 * 3600_000;
const OTP_TTL = 5 * 60_000;

export type Student = {
  id: number; josaa: string; dob: string; name: string; branch: string; category: string; phone: string;
  parent_name: string; parent_phone: string; fee_status: string; fee_ref: string | null; fee_note: string | null;
};
export type Staff = { id: number; email: string; name: string; title: string; role: StaffRole; desk: string | null };

/* ------------------------------------------------------------------ sessions */
async function startSession(kind: "student" | "staff", subjectId: number) {
  const t = token();
  const ttl = kind === "student" ? STUDENT_TTL : STAFF_TTL;
  db().prepare("DELETE FROM sessions WHERE expires_at < ?").run(now());
  db().prepare("INSERT INTO sessions (token_hash, kind, subject_id, expires_at) VALUES (?, ?, ?, ?)").run(sha256(t), kind, subjectId, now() + ttl);
  (await cookies()).set(kind === "student" ? STUDENT_COOKIE : STAFF_COOKIE, t, {
    httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" && process.env.ARRIVE_INSECURE_COOKIES !== "1", path: "/", maxAge: ttl / 1000,
  });
}

async function subject(kind: "student" | "staff") {
  const t = (await cookies()).get(kind === "student" ? STUDENT_COOKIE : STAFF_COOKIE)?.value;
  if (!t) return null;
  const row = db().prepare("SELECT subject_id FROM sessions WHERE token_hash = ? AND kind = ? AND expires_at > ?").get(sha256(t), kind, now()) as { subject_id: number } | undefined;
  return row?.subject_id ?? null;
}

export async function endSession(kind: "student" | "staff") {
  const jar = await cookies();
  const name = kind === "student" ? STUDENT_COOKIE : STAFF_COOKIE;
  const t = jar.get(name)?.value;
  if (t) db().prepare("DELETE FROM sessions WHERE token_hash = ?").run(sha256(t));
  jar.delete(name);
}

export async function currentStudent(): Promise<Student | null> {
  const id = await subject("student");
  if (!id) return null;
  const row = db().prepare("SELECT * FROM students WHERE id = ?").get(id) as Student | undefined;
  return row ? { ...row } : null;
}

export async function requireStudent(): Promise<Student> {
  return (await currentStudent()) ?? fail(401, "Please sign in again.");
}

export async function currentStaff(): Promise<Staff | null> {
  const id = await subject("staff");
  if (!id) return null;
  const row = db().prepare("SELECT id, email, name, title, role, desk FROM staff WHERE id = ? AND active = 1").get(id) as Staff | undefined;
  // node:sqlite rows have a null prototype; copy so they can cross into client components.
  return row ? { ...row } : null;
}

/** Admins can do everything; otherwise the role must be one of `roles`. */
export async function requireStaff(...roles: StaffRole[]): Promise<Staff> {
  const s = (await currentStaff()) ?? fail(401, "Please sign in to the staff console.");
  if (roles.length && s.role !== "admin" && !roles.includes(s.role)) fail(403, "Your role does not allow this.");
  return s;
}

/* ------------------------------------------------------------------ student OTP */
export const maskPhone = (p: string) => `ending ${p.slice(-4)}`;
const normDob = (s: string) => {
  const m = s.trim().match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
  if (m) return `${m[3]}-${m[2].padStart(2, "0")}-${m[1].padStart(2, "0")}`;
  return /^\d{4}-\d{2}-\d{2}$/.test(s.trim()) ? s.trim() : "";
};

export function requestOtp(josaa: string, dob: string) {
  const s = db().prepare("SELECT id, dob, phone FROM students WHERE josaa = ?").get(josaa.replace(/\s/g, "")) as { id: number; dob: string; phone: string } | undefined;
  if (!s || s.dob !== normDob(dob)) fail(400, "These details do not match your JoSAA record. Check the application number and date of birth.");
  const recent = db().prepare("SELECT COUNT(*) n FROM otps WHERE student_id = ? AND created_at > ?").get(s!.id, now() - 10 * 60_000) as { n: number };
  if (recent.n >= 4) fail(429, "Too many codes requested. Wait 10 minutes and try again.");
  const code = otpCode();
  db().prepare("UPDATE otps SET used = 1 WHERE student_id = ? AND used = 0").run(s!.id);
  db().prepare("INSERT INTO otps (student_id, code_hash, expires_at, created_at) VALUES (?, ?, ?, ?)").run(s!.id, sha256(`${s!.id}:${code}`), now() + OTP_TTL, now());
  return { studentId: s!.id, code, phone: s!.phone };
}

export async function verifyOtp(josaa: string, code: string) {
  const s = db().prepare("SELECT id FROM students WHERE josaa = ?").get(josaa.replace(/\s/g, "")) as { id: number } | undefined;
  if (!s) fail(400, "Request a new code.");
  const o = db().prepare("SELECT id, code_hash, expires_at, attempts FROM otps WHERE student_id = ? AND used = 0 ORDER BY id DESC LIMIT 1").get(s!.id) as { id: number; code_hash: string; expires_at: number; attempts: number } | undefined;
  if (!o || o.expires_at < now()) fail(400, "This code has expired. Request a new one.");
  if (o!.attempts >= 5) fail(429, "Too many wrong codes. Request a new one.");
  if (!safeEqual(o!.code_hash, sha256(`${s!.id}:${code.trim()}`))) {
    db().prepare("UPDATE otps SET attempts = attempts + 1 WHERE id = ?").run(o!.id);
    fail(400, `That code is not right. ${4 - o!.attempts} tries left.`);
  }
  db().prepare("UPDATE otps SET used = 1 WHERE id = ?").run(o!.id);
  await startSession("student", s!.id);
}

/* ------------------------------------------------------------------ staff */
export async function staffLogin(email: string, password: string) {
  const s = db().prepare("SELECT id, pass_hash FROM staff WHERE email = ? AND active = 1").get(email.toLowerCase().trim()) as { id: number; pass_hash: string } | undefined;
  // Verify against a dummy hash when the email is unknown so timing does not leak accounts.
  const ok = verifyPassword(password, s?.pass_hash ?? "scrypt$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=");
  if (!s || !ok) fail(400, "Email or password is wrong.");
  await startSession("staff", s!.id);
}
