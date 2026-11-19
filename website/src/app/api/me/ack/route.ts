import { ackCall, studentState } from "@/server/arrive";
import { requireStudent } from "@/server/auth";
import { route } from "@/server/http";

export const POST = route(async () => {
  const s = await requireStudent();
  ackCall(s.id);
  return studentState(s);
});
