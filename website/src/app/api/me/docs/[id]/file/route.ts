import { fileFor } from "@/server/arrive";
import { requireStudent } from "@/server/auth";
import { sendFile } from "@/server/files";
import { route } from "@/server/http";

export const GET = route<{ id: string }>(async (_req, { params }) => {
  const s = await requireStudent();
  return sendFile(fileFor(s.id, (await params).id));
});
