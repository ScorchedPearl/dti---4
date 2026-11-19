import { addStudent, listStudents } from "@/server/arrive";
import { requireStaff } from "@/server/auth";
import { body, fail, route, str } from "@/server/http";
import { validateStudent } from "@/server/roster";

export const GET = route(async (req) => {
  await requireStaff("verifier");
  return { students: listStudents(req.nextUrl.searchParams.get("q") ?? "") };
});

export const POST = route(async (req) => {
  const me = await requireStaff("admin");
  const b = await body(req);
  const v = validateStudent(Object.fromEntries(Object.entries(b).map(([k, x]) => [k, str(x, 120)])));
  if (!v.ok) return fail(400, v.errors[0][0].toUpperCase() + v.errors[0].slice(1) + ".");
  const id = addStudent(v.s, me.id);
  return { id, students: listStudents("") };
});
