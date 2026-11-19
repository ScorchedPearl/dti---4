import { overview } from "@/server/arrive";
import { requireStaff } from "@/server/auth";
import { route } from "@/server/http";

export const GET = route(async () => {
  const me = await requireStaff();
  return { me, ...overview() };
});
