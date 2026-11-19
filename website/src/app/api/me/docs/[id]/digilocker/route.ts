import { fetchFromDigiLocker, studentState } from "@/server/arrive";
import { requireStudent } from "@/server/auth";
import { route } from "@/server/http";

export const POST = route<{ id: string }>(async (_req, { params }) => {
  const s = await requireStudent();
  const { sandbox } = fetchFromDigiLocker(s.id, (await params).id);
  return { ...studentState(s), sandbox };
});
