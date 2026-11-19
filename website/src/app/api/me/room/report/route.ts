import { reportProblem, studentState } from "@/server/arrive";
import { requireStudent } from "@/server/auth";
import { body, limit, route, str } from "@/server/http";

export const POST = route(async (req) => {
  const s = await requireStudent();
  limit(`ticket:${s.id}`, 10, 60 * 60_000);
  const b = await body(req);
  const code = reportProblem(s.id, str(b.item, 20), str(b.note, 400));
  return { ...studentState(s), code };
});
