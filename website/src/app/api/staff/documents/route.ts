import { reviewDoc, reviewQueue } from "@/server/arrive";
import { requireStaff } from "@/server/auth";
import { body, fail, int, route, str } from "@/server/http";

export const GET = route(async () => {
  await requireStaff("verifier");
  return { queue: reviewQueue() };
});

export const POST = route(async (req) => {
  const me = await requireStaff("verifier");
  const b = await body(req);
  const sid = int(b.studentId);
  const decision = b.decision === "accept" ? "accept" : b.decision === "reject" ? "reject" : fail(400, "Accept or reject.");
  if (Number.isNaN(sid)) fail(400, "Missing student.");
  reviewDoc(sid, str(b.docId, 10), decision, str(b.reason, 300), me.id);
  return { queue: reviewQueue() };
});
