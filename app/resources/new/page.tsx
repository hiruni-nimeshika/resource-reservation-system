import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { listCategories } from "@/lib/queries";
import { ResourceForm } from "@/components/ResourceForm";

export const metadata: Metadata = { title: "Add resource" };

export default async function NewResourcePage() {
  await requireAdmin();
  const categories = await listCategories();
  return (
    <div className="stack">
      <div className="page-head"><div><h1>Add resource</h1><p><Link href="/resources">Back to resources</Link></p></div></div>
      <ResourceForm categories={categories} />
    </div>
  );
}
