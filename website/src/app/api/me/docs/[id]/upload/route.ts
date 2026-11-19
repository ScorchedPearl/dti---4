import { studentState, uploadDoc } from "@/server/arrive";
import { requireStudent } from "@/server/auth";
import { fail, route } from "@/server/http";

export const POST = route<{ id: string }>(async (req, { params }) => {
  const s = await requireStudent();
  const { id } = await params;
  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) fail(400, "Choose a file to upload.");
  await uploadDoc(s.id, id, file as File);
  return studentState(s);
});
