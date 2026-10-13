import { queryOne, pgErrorCode, PG_EXCLUSION_VIOLATION } from "./db";
import { APP_TIMEZONE } from "./env";
import { validateInstants, validateLocalWindow } from "./rules";
import { formatTime } from "./time";

/**
 * Booking service: all business rules in one place, free of Next.js code,
 * so server actions stay thin and the rules can be tested directly against the database.
 */

export type BookingInput = {
  resourceId: string;
  userId: string;
  title: string;
  notes?: string | null;
  date: string; // YYYY-MM-DD in APP_TIMEZONE
  startTime: string; // HH:mm in APP_TIMEZONE
  endTime: string; // HH:mm in APP_TIMEZONE
};

export type Result<T = object> = ({ ok: true } & T) | { ok: false; error: string };

export async function createReservation(input: BookingInput, now = new Date()): Promise<Result<{ id: string }>> {
  // 1. Rules that only need the typed times.
  const localError = validateLocalWindow(input.startTime, input.endTime);
  if (localError) return { ok: false, error: localError };

  // 2. Turn "2026-10-20 10:00" (in the org's timezone) into real instants. Postgres does the
  //    timezone maths so we never hand-roll offsets in JavaScript.
  const times = await queryOne<{ start_time: Date; end_time: Date }>(
    `SELECT ($1::timestamp AT TIME ZONE $3) AS start_time, ($2::timestamp AT TIME ZONE $3) AS end_time`,
    [`${input.date} ${input.startTime}`, `${input.date} ${input.endTime}`, APP_TIMEZONE],
  );
  if (!times) return { ok: false, error: "Could not read the selected date and time." };

  // 3. Rules that need real instants (past, duration, how far ahead).
  const instantError = validateInstants({ start: times.start_time, end: times.end_time, now });
  if (instantError) return { ok: false, error: instantError };

  // 4. The resource must exist and be active.
  const resource = await queryOne<{ is_active: boolean }>("SELECT is_active FROM resources WHERE id = $1", [input.resourceId]);
  if (!resource) return { ok: false, error: "This resource no longer exists." };
  if (!resource.is_active) return { ok: false, error: "This resource is retired and can't be booked." };

  // 5. Insert. We do NOT "check availability then insert" (that has a race window).
  //    The EXCLUDE constraint in the database rejects overlaps atomically.
  try {
    const row = await queryOne<{ id: string }>(
      `INSERT INTO reservations (resource_id, user_id, title, notes, start_time, end_time)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [input.resourceId, input.userId, input.title.trim(), input.notes?.trim() || null, times.start_time, times.end_time],
    );
    return { ok: true, id: row!.id };
  } catch (error) {
    if (pgErrorCode(error) === PG_EXCLUSION_VIOLATION) {
      return { ok: false, error: await describeConflict(input.resourceId, times.start_time, times.end_time) };
    }
    throw error;
  }
}

/** Builds a helpful "who has it and when" message for a rejected overlap. */
async function describeConflict(resourceId: string, start: Date, end: Date): Promise<string> {
  const clash = await queryOne<{ start_time: Date; end_time: Date; user_name: string }>(
    `SELECT r.start_time, r.end_time, u.name AS user_name
       FROM reservations r JOIN users u ON u.id = r.user_id
      WHERE r.resource_id = $1 AND r.status = 'confirmed'
        AND tstzrange(r.start_time, r.end_time, '[)') && tstzrange($2, $3, '[)')
      ORDER BY r.start_time LIMIT 1`,
    [resourceId, start, end],
  );
  return clash
    ? `Not available: already booked ${formatTime(clash.start_time)}–${formatTime(clash.end_time)} by ${clash.user_name}. Pick a free slot on the timeline.`
    : "That time was just taken by someone else. Pick a free slot on the timeline.";
}

/** A member may cancel their own reservation; an admin may cancel any. Past reservations are history. */
export async function cancelReservation(
  reservationId: string,
  actor: { id: string; role: "admin" | "member" },
): Promise<Result> {
  const row = await queryOne<{ id: string }>(
    `UPDATE reservations
        SET status = 'cancelled', cancelled_at = now(), cancelled_by = $2
      WHERE id = $1 AND status = 'confirmed' AND end_time > now()
        AND ($3 OR user_id = $2)
    RETURNING id`,
    [reservationId, actor.id, actor.role === "admin"],
  );
  return row ? { ok: true } : { ok: false, error: "This reservation can't be cancelled (already cancelled, finished, or not yours)." };
}
