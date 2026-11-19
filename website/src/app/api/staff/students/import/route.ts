import { listStudents } from "@/server/arrive";
import { requireStaff } from "@/server/auth";
import { audit } from "@/server/db";
import { body, fail, route } from "@/server/http";
import { commitImport, previewImport } from "@/server/roster";

const MAX_CHARS = 5 * 1024 * 1024;

// POST {csv, commit: false} → preview report. POST {csv, commit: true} → inserts the valid new rows.
export const POST = route(async (req) => {
  const me = await requireStaff("admin");
  const b = await body(req);
  const csv = typeof b.csv === "string" ? b.csv : "";
  if (!csv.trim()) fail(400, "Choose a CSV file first.");
  if (csv.length > MAX_CHARS) fail(413, "This file is larger than 5 MB. Split it into smaller files.");
  if (b.commit !== true) {
    const p = previewImport(csv);
    if (p.error) fail(400, p.error);
    return { report: p.report };
  }
  const r = commitImport(csv, me.id);
  if (r.error) fail(400, r.error);
  if (r.report?.missingColumns.length) fail(400, `Missing columns: ${r.report.missingColumns.join(", ")}.`);
  audit(me.id, null, "student.import", String(r.imported));
  return { report: r.report, imported: r.imported, students: listStudents("") };
});
