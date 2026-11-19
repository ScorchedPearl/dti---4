import { checkIn, findStudent, gateCode, recentCheckins } from "@/server/arrive";
import { requireStaff } from "@/server/auth";
import { body, fail, route, str } from "@/server/http";

export const GET = route(async () => {
  await requireStaff("desk");
  return { code: gateCode(), recent: recentCheckins() };
});

export const POST = route(async (req) => {
  const me = await requireStaff("desk");
  const q = str((await body(req)).query, 60);
  if (!q) fail(400, "Scan a pass or type a pass code or JoSAA number.");
  const s = findStudent(q) ?? fail(404, "No student matches that pass code or JoSAA number.");
  const r = checkIn(s.id, me.id);
  return { student: s, ...r, recent: recentCheckins() };
});
