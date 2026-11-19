import { studentState } from "@/server/arrive";
import { requireStudent } from "@/server/auth";
import { route } from "@/server/http";

export const GET = route(async () => studentState(await requireStudent()));
