import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listCategories, listResources } from "@/lib/queries";
import { StatusPill } from "@/components/StatusPill";
import { formatTime } from "@/lib/time";

export const metadata: Metadata = { title: "Resources" };

type Props = { searchParams: Promise<{ category?: string; q?: string }> };

export default async function ResourcesPage({ searchParams }: Props) {
  const user = await requireUser();
  const { category, q } = await searchParams;
  const isAdmin = user.role === "admin";
  const [categories, resources] = await Promise.all([
    listCategories(),
    listResources({ categoryId: category, search: q, includeInactive: isAdmin }),
  ]);

  return (
    <div className="stack">
      <div className="page-head">
        <div><h1>Resources</h1><p>Choose something to see its day and book a time.</p></div>
        {isAdmin && <Link className="btn" href="/resources/new">Add resource</Link>}
      </div>

      <div className="stack-sm">
        <form className="search" action="/resources">
          {category && <input type="hidden" name="category" value={category} />}
          <input name="q" defaultValue={q} placeholder="Search by name, place or description" aria-label="Search resources" />
          <button className="btn secondary" type="submit">Search</button>
        </form>
        <div className="chips">
          <Link className="chip" href="/resources" aria-current={!category ? "true" : undefined}>All</Link>
          {categories.map((c) => (
            <Link key={c.id} className="chip" href={`/resources?category=${c.id}`} aria-current={category === c.id ? "true" : undefined}>{c.name}</Link>
          ))}
        </div>
      </div>

      {resources.length === 0 ? (
        <div className="empty">No resources match. {isAdmin ? "Add one to get started." : "Try a different search."}</div>
      ) : (
        <div className="grid">
          {resources.map((r) => (
            <Link key={r.id} href={`/resources/${r.id}`} className={`resource-card${!r.is_active ? " off" : r.busy_until ? " busy" : ""}`}>
              <div className="row between">
                <h3>{r.name}</h3>
              </div>
              <StatusPill resource={r} />
              <p className="small muted">
                {r.category_name}
                {r.location ? ` · ${r.location}` : ""}
                {r.capacity ? ` · up to ${r.capacity}` : ""}
              </p>
              {r.is_active && r.next_start && <p className="small">Next booking at {formatTime(r.next_start)}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
