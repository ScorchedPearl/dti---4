import { inbox, reply, thread } from "@/server/arrive";
import { requireStaff } from "@/server/auth";
import { body, fail, int, route, str } from "@/server/http";

export const GET = route<{ sid: string }>(async (_req, { params }) => {
  await requireStaff("volunteer");
  return { messages: thread(int((await params).sid)) };
});

export const POST = route<{ sid: string }>(async (req, { params }) => {
  const me = await requireStaff("volunteer");
  const sid = int((await params).sid);
  const text = str((await body(req)).text, 800);
  if (text.length < 2) fail(400, "Write a reply first.");
  reply(sid, me, text);
  return { messages: thread(sid), threads: inbox() };
});
