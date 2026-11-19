import type { Metadata } from "next";
import { Rooms } from "@/components/arrive/staff/Rooms";

export const metadata: Metadata = { title: "Rooms · Staff" };

export default function Page() {
  return <Rooms />;
}
