import type { Metadata } from "next";
import { redirect } from "next/navigation";
import StaffLogin from "@/components/arrive/staff/StaffLogin";
import { currentStaff } from "@/server/auth";
import { devOtpAllowed } from "@/server/sms";

export const metadata: Metadata = { title: "Staff sign in" };
export const dynamic = "force-dynamic";

export default async function Page() {
  if (await currentStaff()) redirect("/staff");
  return <StaffLogin demo={devOtpAllowed()} />;
}
