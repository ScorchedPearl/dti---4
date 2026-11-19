import { confirmFee, listStudents } from "@/server/arrive";
import { requireStaff } from "@/server/auth";
import { body, fail, int, route, str } from "@/server/http";

export const POST = route<{ id: string }>(async (req, { params }) => {
  const me = await requireStaff("admin");
  const ref = str((await body(req)).feeRef, 40);
  if (ref.length < 4) fail(400, "Enter the bank or gateway reference.");
  confirmFee(int((await params).id), ref, me.id);
  return { students: listStudents("") };
});
