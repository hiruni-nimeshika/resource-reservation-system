import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getDaySchedule, getResource } from "@/lib/queries";
import { BookingForm } from "@/components/BookingForm";
import { DayTimeline } from "@/components/DayTimeline";
import { ReservationTable } from "@/components/ReservationTable";
import { StatusPill } from "@/components/StatusPill";
import { RULES, timeToMinutes } from "@/lib/rules";
import { addDays, formatLongDateString, formatTime, isValidDateString, todayString } from "@/lib/time";

type Props = { params: Promise<{ id: string }>; searchParams: Promise<{ date?: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const resource = await getResource((await params).id);
  return { title: resource?.name ?? "Resource" };
}

export default async function ResourcePage({ params, searchParams }: Props) {
  const user = await requireUser();
  const { id } = await params;
  const resource = await getResource(id);
  if (!resource) notFound();

  const today = todayString();
  const { date: dateParam } = await searchParams;
  const date = isValidDateString(dateParam) ? dateParam : today;
  const blocks = await getDaySchedule(resource.id, date);
  const nowMinutes = date === today ? timeToMinutes(formatTime(new Date())) : null;
  const base = `/resources/${resource.id}`;

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <p><Link href="/resources">All resources</Link></p>
          <h1>{resource.name}</h1>
          <p>
            {resource.category_name}
            {resource.location ? ` · ${resource.location}` : ""}
            {resource.capacity ? ` · up to ${resource.capacity}` : ""}
          </p>
        </div>
        <div className="row">
          <StatusPill resource={resource} />
          {user.role === "admin" && <Link className="btn secondary small" href={`${base}/edit`}>Edit</Link>}
        </div>
      </div>
      {resource.description && <p className="muted">{resource.description}</p>}

      <section className="stack-sm">
        <div className="row between">
          <h2>{formatLongDateString(date)}</h2>
          <div className="date-nav">
            <Link className="btn secondary small" href={`${base}?date=${addDays(date, -1)}`}>Previous day</Link>
            <Link className="btn secondary small" href={base}>Today</Link>
            <Link className="btn secondary small" href={`${base}?date=${addDays(date, 1)}`}>Next day</Link>
          </div>
        </div>
        <DayTimeline blocks={blocks} userId={user.id} nowMinutes={nowMinutes} />
        {blocks.length > 0 && <ReservationTable rows={blocks} user={user} showUser allowCancel hideResource />}
      </section>

      {resource.is_active ? (
        <div style={{ maxWidth: 560 }}>
          <BookingForm resourceId={resource.id} date={date < today ? today : date} minDate={today} maxDate={addDays(today, RULES.maxAdvanceDays)} />
        </div>
      ) : (
        <p className="notice error">This resource is retired and can't be booked.</p>
      )}
    </div>
  );
}
