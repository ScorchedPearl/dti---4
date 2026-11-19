import type { Metadata } from "next";
import { Documents } from "@/components/arrive/staff/Documents";

export const metadata: Metadata = { title: "Documents · Staff" };

export default function Page() {
  return <Documents />;
}
