import { bookSlot, studentState } from "@/server/arrive";
import { requireStudent } from "@/server/auth";
import { body, fail, int, route } from "@/server/http";

export const POST = route(async (req) => {
  const s = await requireStudent();
  const slotId = int((await body(req)).slotId);
  if (Number.isNaN(slotId)) fail(400, "Choose a slot.");
  bookSlot(s, slotId);
  return studentState(s);
});
