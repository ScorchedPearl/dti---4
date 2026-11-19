import type { Metadata } from "next";
import { DeskConsole } from "@/components/arrive/staff/Desks";

export const metadata: Metadata = { title: "Desks · Staff" };

export default function Page() {
  return <DeskConsole />;
}
