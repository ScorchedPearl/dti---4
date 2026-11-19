import { redirect } from "next/navigation";
import ConsoleShell from "@/components/arrive/staff/ConsoleShell";
import { currentStaff } from "@/server/auth";

export const dynamic = "force-dynamic";

export default async function ConsoleLayout({ children }: { children: React.ReactNode }) {
  const me = await currentStaff();
  if (!me) redirect("/staff/login");
  return <ConsoleShell me={me}>{children}</ConsoleShell>;
}
