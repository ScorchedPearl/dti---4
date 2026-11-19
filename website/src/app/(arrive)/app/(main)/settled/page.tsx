import type { Metadata } from "next";
import { Settled } from "@/components/arrive/student/GateToRoom";

export const metadata: Metadata = { title: "Settled" };

export default function Page() {
  return <Settled />;
}
