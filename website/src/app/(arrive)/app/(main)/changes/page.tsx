import type { Metadata } from "next";
import { Changes } from "@/components/arrive/student/ReadyPass";

export const metadata: Metadata = { title: "Rule changes" };

export default function Page() {
  return <Changes />;
}
