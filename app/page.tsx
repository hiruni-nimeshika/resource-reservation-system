import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { getDashboardStats, listResources, listUserReservations } from "@/lib/queries";
import { StatusPill } from "@/components/StatusPill";
import { formatRange, formatTime } from "@/lib/time";

export default async function DashboardPage() {
  const user = await requireUser();
  const [stats, resources, mine] = await Promise.all([
    getDashboardStats(user.id),
    listResources({}),
    listUserReservations(user.id, "upcoming"),
  ]);
  const free = stats.total - stats.in_use;

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Good to see you, {user.name.split(" ")[0]}</h1>
          <p>What is free right now, and what you have coming up.</p>
        </div>
        <Link className="btn" href="/resources">Book a resource</Link>
      </div>

      <div className="facts">
        <div className="fact"><b>{free}</b><span>of {stats.total} resources free now</span></div>
        <div className="fact"><b>{stats.in_use}</b><span>in use right now</span></div>
        <div className="fact"><b>{stats.mine_upcoming}</b><span>your upcoming reservations</span></div>
      </div>

      <div className="two-col">
        <section className="panel">
          <h2>Right now</h2>
          <ul className="list">
            {resources.map((r) => (
              <li key={r.id}>
                <div>
                  <Link className="name" href={`/resources/${r.id}`}>{r.name}</Link>
                  <div className="sub">
                    {r.category_name}
                    {r.busy_until ? ` · ${r.busy_by}` : r.next_start ? ` · next booking ${formatTime(r.next_start)}` : ""}
                  </div>
                </div>
                <StatusPill resource={r} />
              </li>
            ))}
          </ul>
        </section>

        <section className="panel">
          <div className="row between"><h2>Your next reservations</h2><Link href="/reservations" className="small">View all</Link></div>
          {mine.length === 0 ? (
            <p className="muted" style={{ marginTop: "0.75rem" }}>You have nothing booked. Pick a resource to reserve it.</p>
          ) : (
            <ul className="list">
              {mine.slice(0, 5).map((r) => (
                <li key={r.id}>
                  <div>
                    <div className="name">{r.title}</div>
                    <div className="sub">{r.resource_name} · {formatRange(r.start_time, r.end_time)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
