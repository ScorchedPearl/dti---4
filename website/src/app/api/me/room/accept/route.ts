import { acceptRoom, studentState } from "@/server/arrive";
import { requireStudent } from "@/server/auth";
import { route } from "@/server/http";

export const POST = route(async () => {
  const s = await requireStudent();
  acceptRoom(s.id);
  return studentState(s);
});
