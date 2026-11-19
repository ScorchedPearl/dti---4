import type { Metadata } from "next";
import { Day } from "@/components/arrive/student/GateToRoom";

export const metadata: Metadata = { title: "Reporting day" };

export default function Page() {
  return <Day />;
}
