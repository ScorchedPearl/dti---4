import type { Metadata } from "next";
import { Gate } from "@/components/arrive/staff/Desks";

export const metadata: Metadata = { title: "Gate · Staff" };

export default function Page() {
  return <Gate />;
}
