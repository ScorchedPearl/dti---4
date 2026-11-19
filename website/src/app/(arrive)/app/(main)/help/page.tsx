import type { Metadata } from "next";
import { Help } from "@/components/arrive/student/GateToRoom";

export const metadata: Metadata = { title: "Help" };

export default function Page() {
  return <Help />;
}
