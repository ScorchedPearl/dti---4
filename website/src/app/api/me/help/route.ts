import { ask, studentState } from "@/server/arrive";
import { requireStudent } from "@/server/auth";
import { body, fail, limit, route, str } from "@/server/http";

export const POST = route(async (req) => {
  const s = await requireStudent();
  limit(`help:${s.id}`, 30, 10 * 60_000);
  const text = str((await body(req)).text, 500);
  if (text.length < 2) fail(400, "Type a question first.");
  ask(s.id, text);
  return studentState(s);
});
