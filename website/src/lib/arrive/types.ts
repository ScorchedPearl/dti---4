import type { DeskKey, DocStatus, StaffRole, StepStatus, TicketStatus } from "./catalog";

export type StudentDoc = { id: string; status: DocStatus; source: string | null; reason: string | null; fileName: string | null; updatedAt: string };
export type Slot = { id: number; day: string; label: string; left: number; full: boolean };
export type RouteStep = { desk: DeskKey; status: StepStatus; ahead: number; etaMin: number; calledAt: number | null; ack: boolean };
export type Ticket = { id: number; code: string; item: string; note: string; status: TicketStatus; eta: string | null; createdAt: string; room?: string; student?: string | null };
export type ChatMsg = { id: number; author: "student" | "bot" | "volunteer"; name: string | null; body: string; at: number };

export type StudentState = {
  me: { name: string; first: string; branch: string; josaa: string; category: string; phone: string; parentName: string; parentPhone: string };
  fee: { status: "paid" | "pending"; ref: string | null; note: string | null; amount: number };
  docs: StudentDoc[];
  slots: Slot[];
  booking: { slotId: number; passCode: string; shareToken: string; sharedLang: string | null } | null;
  checkin: { token: number; at: string } | null;
  route: RouteStep[];
  room: {
    label: string; wing: string; passed: boolean; checks: boolean[] | null; inspectedBy: string | null; inspectedAt: string | null;
    acceptedAt: string | null; mate: { name: string; branch: string; phone: string | null } | null;
  } | null;
  tickets: Ticket[];
  chat: ChatMsg[];
};

export type StaffMe = { id: number; name: string; title: string; role: StaffRole; desk: string | null; email: string };

export type ParentStatus = {
  name: string; first: string; branch: string; slot: string; ready: boolean; checkedIn: boolean; token: number | null;
  stepsDone: number; stepsTotal: number; current: string | null; room: string | null; roomAccepted: boolean; openTickets: number;
};
