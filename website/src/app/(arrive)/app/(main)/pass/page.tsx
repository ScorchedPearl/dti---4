import type { Metadata } from "next";
import { Pass } from "@/components/arrive/student/ReadyPass";

export const metadata: Metadata = { title: "My pass" };

export default function Page() {
  return <Pass />;
}
