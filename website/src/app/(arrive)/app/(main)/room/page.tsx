import type { Metadata } from "next";
import { Room } from "@/components/arrive/student/GateToRoom";

export const metadata: Metadata = { title: "My room" };

export default function Page() {
  return <Room />;
}
