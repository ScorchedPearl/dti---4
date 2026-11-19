import { recordShare } from "@/server/arrive";
import { requireStudent } from "@/server/auth";
import { body, route, str } from "@/server/http";

export const POST = route(async (req) => {
  const s = await requireStudent();
  recordShare(s.id, str((await body(req)).lang, 2));
});
