import type { Metadata } from "next";
import { Review } from "@/components/arrive/student/ReadyPass";

export const metadata: Metadata = { title: "Review and slot" };

export default function Page() {
  return <Review />;
}
