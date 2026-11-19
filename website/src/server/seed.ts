import "server-only";
import { writeFileSync } from "node:fs";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import { DESKS, ROOM_CHECKS, docsForCategory, type DocStatus } from "@/lib/arrive/catalog";
import { hashPassword, passCode, token } from "./crypto";
import { UPLOAD_DIR } from "./paths";

// First-run data. The four Assignment 2 personas are real accounts, Ananya Verma is the
// worked example from the A4 brief, and six students already wait at Desk B so the
// queue is live from the start. Staff log in with ARRIVE_STAFF_PASSWORD (see .env.example).

type DocSeed = Partial<Record<string, [DocStatus, string?, string?]>>;

const STUDENTS: { josaa: string; dob: string; name: string; branch: string; category: string; phone: string; parent: [string, string]; fee: [string, string | null, string | null]; docs: DocSeed }[] = [
  {
    josaa: "260310442817", dob: "2008-03-14", name: "Ananya Verma", branch: "B.Tech IT", category: "OBC-NCL", phone: "9876504417",
    parent: ["Papa", "9812345210"], fee: ["paid", "IIITA26-88412", "Confirmed in 4 min"],
    docs: {
      jee: ["ok", "From JoSAA"], c10: ["ok", "From DigiLocker"], c12: ["todo"], cat: ["review", "Uploaded 18 Jul"], inc: ["todo"], aff: ["todo"],
      med: ["ok", "Uploaded 18 Jun"], pho: ["action", "Uploaded 16 Jul", "Photo is blurry and the face is shadowed. Retake it in daylight against a plain wall."], aad: ["ok", "From DigiLocker"],
    },
  },
  {
    josaa: "260310551203", dob: "2007-11-02", name: "Kabir Singh", branch: "B.Tech ECE", category: "GEN", phone: "9935102288",
    parent: ["Mummy", "9839011420"], fee: ["pending", null, "Bank reference awaited"],
    docs: { jee: ["ok", "From JoSAA"], c10: ["todo"], c12: ["todo"], aff: ["todo"], med: ["todo"], pho: ["review", "Uploaded 19 Jul"], aad: ["todo"] },
  },
  {
    josaa: "260310667734", dob: "2008-01-21", name: "Rohan Iyer", branch: "B.Tech CSE", category: "GEN", phone: "9444023317",
    parent: ["Appa", "9444012876"], fee: ["paid", "IIITA26-90127", "Confirmed in 2 min"],
    docs: { jee: ["ok", "From JoSAA"], c10: ["ok", "From DigiLocker"], c12: ["ok", "From DigiLocker"], aff: ["review", "Uploaded 20 Jul"], med: ["ok", "Uploaded 14 Jul"], pho: ["ok", "Uploaded 14 Jul"], aad: ["ok", "From DigiLocker"] },
  },
  {
    josaa: "260310778921", dob: "2007-09-09", name: "Meera Nair", branch: "B.Tech IT-BI", category: "EWS", phone: "9847066120",
    parent: ["Amma", "9847011093"], fee: ["paid", "IIITA26-87034", "Confirmed in 6 min"],
    docs: { jee: ["ok", "From JoSAA"], c10: ["ok", "From DigiLocker"], c12: ["ok", "From DigiLocker"], cat: ["review", "Uploaded 17 Jul"], inc: ["review", "Uploaded 17 Jul"], aff: ["review", "Uploaded 21 Jul"], med: ["ok", "Uploaded 12 Jul"], pho: ["ok", "Uploaded 12 Jul"], aad: ["ok", "From DigiLocker"] },
  },
];

const QUEUE = ["Aarav Mehta", "Diya Kapoor", "Ishaan Rao", "Sneha Pillai", "Arjun Nair", "Tanvi Joshi"];

/** A valid one-page PDF with a single line of text, used as the seeded scans. */
function tinyPdf(line: string) {
  const text = line.replace(/[()\\]/g, "");
  const stream = `BT /F1 14 Tf 60 760 Td (${text}) Tj 0 -24 Td /F1 10 Tf (Seeded sample scan for IIITA Arrive) Tj ET`;
  const objs = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  ];
  let out = "%PDF-1.4\n";
  const offs: number[] = [];
  objs.forEach((o, i) => { offs.push(out.length); out += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const xref = out.length;
  out += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n${offs.map((o) => String(o).padStart(10, "0") + " 00000 n \n").join("")}`;
  out += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(out, "latin1");
}

export function seed(d: DatabaseSync) {
  const uploads = UPLOAD_DIR;
  const pw = hashPassword(process.env.ARRIVE_STAFF_PASSWORD ?? "arrive-2026");
  const staff = d.prepare("INSERT INTO staff (email, name, title, role, desk, pass_hash) VALUES (?, ?, ?, ?, ?, ?)");
  staff.run("admin@iiita.ac.in", "Registration Office", "Admin", "admin", null, pw);
  staff.run("verify@iiita.ac.in", "Dr. P. Mishra", "Document verification", "verifier", null, pw);
  staff.run("desk@iiita.ac.in", "S. Gupta", "Reporting day desks", "desk", "B", pw);
  staff.run("warden@iiita.ac.in", "R. Yadav", "Caretaker, BH-3", "warden", null, pw);
  staff.run("senior@iiita.ac.in", "Rahul S.", "B.Tech 3rd year · verified volunteer", "volunteer", null, pw);

  const slot = d.prepare("INSERT INTO slots (day, label, capacity, held, sort) VALUES (?, ?, ?, ?, ?)");
  slot.run("Mon 27 Jul", "09:30 to 10:30", 120, 120, 1);
  slot.run("Mon 27 Jul", "10:30 to 11:30", 120, 108, 2);
  slot.run("Mon 27 Jul", "14:00 to 15:00", 120, 88, 3);

  const room = d.prepare("INSERT INTO rooms (block, number, wing, checks, passed, inspected_by, inspected_at) VALUES (?, ?, ?, ?, ?, ?, ?)");
  const allOk = JSON.stringify(ROOM_CHECKS.map(() => true));
  for (let n = 210; n <= 220; n++) {
    const wing = n < 215 ? "Second floor, east wing" : "Second floor, west wing";
    if (n === 217) room.run("BH-3", String(n), wing, JSON.stringify(ROOM_CHECKS.map((_, i) => i !== 1)), 0, "R. Yadav", "27 Jul, 08:40");
    else if (n >= 218) room.run("BH-3", String(n), wing, null, 0, null, null);
    else room.run("BH-3", String(n), wing, allOk, 1, "R. Yadav", n === 214 ? "27 Jul, 09:12" : "27 Jul, 08:5" + (n % 10));
  }
  const roomId = (num: string) => (d.prepare("SELECT id FROM rooms WHERE block = 'BH-3' AND number = ?").get(num) as { id: number }).id;

  const insStudent = d.prepare("INSERT INTO students (josaa, dob, name, branch, category, phone, parent_name, parent_phone, fee_status, fee_ref, fee_note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
  const insDoc = d.prepare("INSERT INTO student_docs (student_id, doc_id, status, source, reason, file_name, file_key, file_mime, file_size) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
  const ids: Record<string, number> = {};
  for (const s of STUDENTS) {
    const r = insStudent.run(s.josaa, s.dob, s.name, s.branch, s.category, s.phone, s.parent[0], s.parent[1], ...s.fee);
    const sid = Number(r.lastInsertRowid);
    ids[s.name] = sid;
    for (const t of docsForCategory(s.category)) {
      const [status, source, reason] = s.docs[t.id] ?? ["todo"];
      let file: [string | null, string | null, string | null, number | null] = [null, null, null, null];
      if ((status === "review" || status === "action" || (status === "ok" && source?.startsWith("Uploaded")))) {
        const key = `${token(12)}.pdf`;
        const buf = tinyPdf(`${t.name} - ${s.name}`);
        writeFileSync(path.join(uploads, key), buf);
        file = [`${t.id}_scan.pdf`, key, "application/pdf", buf.length];
      }
      insDoc.run(sid, t.id, status, source ?? null, reason ?? null, ...file);
    }
  }
  // Rohan has booked; Ananya's room-mate already accepted the shared room.
  d.prepare("INSERT INTO bookings (student_id, slot_id, pass_code, share_token) VALUES (?, 3, ?, ?)").run(ids["Rohan Iyer"], passCode(), token(16));

  const mate = insStudent.run("260310889402", "2008-05-30", "Ishita Rao", "B.Tech CSE", "GEN", "9900112233", "Father", "9900112200", "paid", "IIITA26-88001", null);
  d.prepare("INSERT INTO allocations (student_id, room_id, accepted_at) VALUES (?, ?, '27 Jul, 09:40')").run(Number(mate.lastInsertRowid), roomId("214"));
  d.prepare("INSERT INTO allocations (student_id, room_id) VALUES (?, ?)").run(ids["Ananya Verma"], roomId("214"));
  d.prepare("INSERT INTO allocations (student_id, room_id) VALUES (?, ?)").run(ids["Meera Nair"], roomId("215"));
  d.prepare("INSERT INTO allocations (student_id, room_id) VALUES (?, ?)").run(ids["Rohan Iyer"], roomId("216"));

  // Six students already checked in and waiting at Desk B (tokens 241 to 246).
  const t0 = Date.now() - 25 * 60_000;
  QUEUE.forEach((name, i) => {
    const r = insStudent.run(`2603109${String(10000 + i * 137).slice(-5)}`, "2008-01-01", name, "B.Tech IT", "GEN", `98000000${10 + i}`, "Parent", "9800000099", "paid", `IIITA26-8${7100 + i}`, null);
    const sid = Number(r.lastInsertRowid);
    for (const t of docsForCategory("GEN")) insDoc.run(sid, t.id, "ok", "Verified", null, null, null, null, null);
    d.prepare("INSERT INTO checkins (student_id, token_no) VALUES (?, ?)").run(sid, 241 + i);
    DESKS.forEach((k, seq) => {
      const st = k.key === "A" ? "skipped" : k.key === "B" ? "waiting" : "pending";
      d.prepare("INSERT INTO steps (student_id, desk, seq, status, queued_at) VALUES (?, ?, ?, ?, ?)").run(sid, k.key, seq, st, k.key === "B" ? t0 + i * 60_000 : null);
    });
  });

  // Ticket numbers continue from the paper register, so the next one is #R-1182.
  d.prepare("INSERT INTO tickets (id, room_id, item, note, status, eta) VALUES (1181, ?, 'fan', 'Fan regulator stuck on speed 1', 'assigned', 'Today, 4:00 pm')").run(roomId("217"));
}
