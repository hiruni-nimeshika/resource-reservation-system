import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { getResource, listCategories } from "@/lib/queries";
import { ResourceForm } from "@/components/ResourceForm";
import { RetireButton } from "@/components/RetireButton";

export const metadata: Metadata = { title: "Edit resource" };

export default async function EditResourcePage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  const [resource, categories] = await Promise.all([getResource(id), listCategories()]);
  if (!resource) notFound();
  return (
    <div className="stack">
      <div className="page-head"><div><h1>Edit {resource.name}</h1><p><Link href={`/resources/${resource.id}`}>Back to resource</Link></p></div></div>
      <ResourceForm categories={categories} resource={resource} />
      <section className="panel stack-sm" style={{ maxWidth: 560 }}>
        <h2>{resource.is_active ? "Retire" : "Restore"}</h2>
        <p className="muted small">
          {resource.is_active
            ? "Retired resources can't be booked but keep their history. Upcoming reservations must be cancelled first."
            : "Restoring makes this resource bookable again."}
        </p>
        <RetireButton id={resource.id} active={resource.is_active} />
      </section>
    </div>
  );
}
