import type { Metadata } from "next";
import { redirect } from "next/navigation";
import StudentLogin from "@/components/arrive/StudentLogin";
import { currentStudent } from "@/server/auth";
import { devOtpAllowed } from "@/server/sms";

export const metadata: Metadata = { title: "Sign in" };
export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await currentStudent()) redirect("/app");
  return <StudentLogin demo={devOtpAllowed()} />;
}
