import type { Metadata } from "next";
import { Overview } from "@/components/arrive/staff/Overview";

export const metadata: Metadata = { title: "Overview · Staff" };

export default function Page() {
  return <Overview />;
}
