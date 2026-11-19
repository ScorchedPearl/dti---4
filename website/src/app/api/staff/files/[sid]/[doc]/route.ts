import { fileFor } from "@/server/arrive";
import { requireStaff } from "@/server/auth";
import { sendFile } from "@/server/files";
import { int, route } from "@/server/http";

export const GET = route<{ sid: string; doc: string }>(async (_req, { params }) => {
  await requireStaff("verifier", "desk");
  const { sid, doc } = await params;
  return sendFile(fileFor(int(sid), doc));
});
