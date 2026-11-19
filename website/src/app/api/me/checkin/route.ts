import { selfCheckIn, studentState } from "@/server/arrive";
import { requireStudent } from "@/server/auth";
import { body, clientIp, limit, route, str } from "@/server/http";

export const POST = route(async (req) => {
  const s = await requireStudent();
  limit(`gate:${s.id}:${clientIp(req)}`, 10, 10 * 60_000);
  selfCheckIn(s, str((await body(req)).code, 40));
  return studentState(s);
});
