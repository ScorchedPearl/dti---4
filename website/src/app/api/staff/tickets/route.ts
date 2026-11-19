import type { TicketStatus } from "@/lib/arrive/catalog";
import { listRooms, listTickets, updateTicket } from "@/server/arrive";
import { requireStaff } from "@/server/auth";
import { body, fail, int, route, str } from "@/server/http";

export const POST = route(async (req) => {
  const me = await requireStaff("warden");
  const b = await body(req);
  const id = int(b.id);
  if (Number.isNaN(id)) fail(400, "Missing ticket.");
  updateTicket(id, str(b.status, 12) as TicketStatus, str(b.eta, 40) || null, me.id);
  return { rooms: listRooms(), tickets: listTickets() };
});
