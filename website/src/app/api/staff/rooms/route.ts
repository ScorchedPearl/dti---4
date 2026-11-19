import { inspectRoom, listRooms, listTickets } from "@/server/arrive";
import { requireStaff } from "@/server/auth";
import { body, fail, int, route } from "@/server/http";

export const GET = route(async () => {
  await requireStaff("warden");
  return { rooms: listRooms(), tickets: listTickets() };
});

export const POST = route(async (req) => {
  const me = await requireStaff("warden");
  const b = await body(req);
  const id = int(b.roomId);
  if (Number.isNaN(id) || !Array.isArray(b.checks)) fail(400, "Missing room or checks.");
  inspectRoom(id, (b.checks as unknown[]).map(Boolean), me);
  return { rooms: listRooms(), tickets: listTickets() };
});
