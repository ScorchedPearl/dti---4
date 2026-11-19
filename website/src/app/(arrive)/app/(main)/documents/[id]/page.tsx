import type { Metadata } from "next";
import { DocDetail } from "@/components/arrive/student/ReadyPass";
import { docType } from "@/lib/arrive/catalog";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  return { title: docType((await params).id)?.name ?? "Document" };
}

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  return <DocDetail id={(await params).id} />;
}
