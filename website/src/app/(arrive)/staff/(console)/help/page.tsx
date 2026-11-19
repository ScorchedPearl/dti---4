import type { Metadata } from "next";
import { HelpInbox } from "@/components/arrive/staff/HelpInbox";

export const metadata: Metadata = { title: "Help inbox · Staff" };

export default function Page() {
  return <HelpInbox />;
}
