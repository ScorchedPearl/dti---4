import type { Metadata } from "next";
import { Checklist } from "@/components/arrive/student/ReadyPass";

export const metadata: Metadata = { title: "My checklist" };

export default function Page() {
  return <Checklist />;
}
