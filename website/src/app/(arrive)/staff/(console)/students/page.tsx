import type { Metadata } from "next";
import { Students } from "@/components/arrive/staff/Students";

export const metadata: Metadata = { title: "Students · Staff" };

export default function Page() {
  return <Students />;
}
