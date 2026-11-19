import type { Metadata } from "next";
import { Report } from "@/components/arrive/student/GateToRoom";

export const metadata: Metadata = { title: "Report a problem" };

export default function Page() {
  return <Report />;
}
