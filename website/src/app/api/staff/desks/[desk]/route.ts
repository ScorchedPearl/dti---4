import { DESKS, type DeskKey } from "@/lib/arrive/catalog";
import { callNext, completeStep, deskQueue, requeue } from "@/server/arrive";
import { requireStaff } from "@/server/auth";
import { body, fail, int, route } from "@/server/http";

const deskOf = (k: string) => (DESKS.some((d) => d.key === k && k !== "R") ? (k as DeskKey) : fail(404, "Unknown desk."));

export const GET = route<{ desk: string }>(async (_req, { params }) => {
  await requireStaff("desk");
  return deskQueue(deskOf((await params).desk));
});

export const POST = route<{ desk: string }>(async (req, { params }) => {
  const me = await requireStaff("desk");
  const desk = deskOf((await params).desk);
  const b = await body(req);
  const sid = int(b.studentId);
  if (b.action === "call") callNext(desk, me.id);
  else if (Number.isNaN(sid)) fail(400, "Missing student.");
  else if (b.action === "done") completeStep(sid, desk, me.id);
  else if (b.action === "requeue") requeue(sid, desk, me.id);
  else fail(400, "Unknown action.");
  return deskQueue(desk);
});
