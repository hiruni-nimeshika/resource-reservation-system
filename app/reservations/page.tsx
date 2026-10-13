import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listAllReservations, listUserReservations } from "@/lib/queries";
import { ReservationTable } from "@/components/ReservationTable";

export const metadata: Metadata = { title: "Reservations" };

type Props = { searchParams: Promise<{ view?: string; tab?: string }> };

export default async function ReservationsPage({ searchParams }: Props) {
  const user = await requireUser();
  const { view, tab } = await searchParams;
  const showAll = user.role === "admin" && view === "all";
  const scope = tab === "past" ? "past" : "upcoming";
  const rows = showAll ? await listAllReservations(scope) : await listUserReservations(user.id, scope);
  const qs = (t: string) => `/reservations?${new URLSearchParams({ ...(showAll ? { view: "all" } : {}), tab: t })}`;

  return (
    <div className="stack">
      <div className="page-head">
        <div><h1>{showAll ? "All reservations" : "My reservations"}</h1><p>{showAll ? "Everyone's bookings across the organisation." : "Everything you have booked."}</p></div>
        {user.role === "admin" && (
          <Link className="btn secondary" href={showAll ? `/reservations?tab=${scope}` : `/reservations?view=all&tab=${scope}`}>
            {showAll ? "Show only mine" : "Show everyone's"}
          </Link>
        )}
      </div>
      <nav className="tabs" aria-label="Reservation period">
        <Link href={qs("upcoming")} aria-current={scope === "upcoming" ? "page" : undefined}>Upcoming</Link>
        <Link href={qs("past")} aria-current={scope === "past" ? "page" : undefined}>Past &amp; cancelled</Link>
      </nav>
      <ReservationTable rows={rows} user={user} showUser={showAll} allowCancel={scope === "upcoming"} />
    </div>
  );
}
