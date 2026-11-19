import { addStudent, listStudents } from "@/server/arrive";
import { requireStaff } from "@/server/auth";
import { body, fail, route, str } from "@/server/http";

export const GET = route(async (req) => {
  await requireStaff("verifier");
  return { students: listStudents(req.nextUrl.searchParams.get("q") ?? "") };
});

const CATS = ["GEN", "OBC-NCL", "SC", "ST", "EWS"];
export const POST = route(async (req) => {
  const me = await requireStaff("admin");
  const b = await body(req);
  const p = {
    josaa: str(b.josaa, 12), dob: str(b.dob, 10), name: str(b.name, 80), branch: str(b.branch, 40), category: str(b.category, 10),
    phone: str(b.phone, 10), parentName: str(b.parentName, 40), parentPhone: str(b.parentPhone, 10),
  };
  if (!/^\d{12}$/.test(p.josaa)) fail(400, "JoSAA application number must be 12 digits.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(p.dob)) fail(400, "Enter the date of birth.");
  if (p.name.length < 3) fail(400, "Enter the student's full name.");
  if (!p.branch) fail(400, "Choose a branch.");
  if (!CATS.includes(p.category)) fail(400, "Choose a category.");
  if (!/^[6-9]\d{9}$/.test(p.phone)) fail(400, "Student phone must be a 10-digit Indian mobile number.");
  if (p.parentPhone && !/^[6-9]\d{9}$/.test(p.parentPhone)) fail(400, "Parent phone must be a 10-digit Indian mobile number.");
  const id = addStudent(p, me.id);
  return { id, students: listStudents("") };
});
