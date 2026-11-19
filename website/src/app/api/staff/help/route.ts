import { inbox } from "@/server/arrive";
import { requireStaff } from "@/server/auth";
import { route } from "@/server/http";

export const GET = route(async () => {
  await requireStaff("volunteer");
  return { threads: inbox() };
});
