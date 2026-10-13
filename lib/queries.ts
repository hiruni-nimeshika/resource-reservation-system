import { query, queryOne, isUuid } from "./db";
import { APP_TIMEZONE } from "./env";
import { RULES } from "./rules";

/* ---------------- types ---------------- */

export type Category = { id: string; name: string; description: string | null };

export type ResourceRow = {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  capacity: number | null;
  is_active: boolean;
  category_id: string;
  category_name: string;
  busy_until: Date | null; // set when someone is using it right now
  busy_by: string | null;
  next_start: Date | null; // start of the next upcoming booking
};

export type ReservationRow = {
  id: string;
  resource_id: string;
  resource_name: string;
  user_id: string;
  user_name: string;
  title: string;
  notes: string | null;
  start_time: Date;
  end_time: Date;
  status: "confirmed" | "cancelled";
};

/* ---------------- categories & resources ---------------- */

export const listCategories = () => query<Category>("SELECT id, name, description FROM categories ORDER BY name");

const RESOURCE_SELECT = `
  SELECT r.id, r.name, r.description, r.location, r.capacity, r.is_active, r.category_id,
         c.name AS category_name, cur.end_time AS busy_until, cur.user_name AS busy_by, nxt.start_time AS next_start
    FROM resources r
    JOIN categories c ON c.id = r.category_id
    LEFT JOIN LATERAL (
      SELECT rs.end_time, u.name AS user_name
        FROM reservations rs JOIN users u ON u.id = rs.user_id
       WHERE rs.resource_id = r.id AND rs.status = 'confirmed' AND rs.start_time <= now() AND rs.end_time > now()
       LIMIT 1) cur ON true
    LEFT JOIN LATERAL (
      SELECT rs.start_time FROM reservations rs
       WHERE rs.resource_id = r.id AND rs.status = 'confirmed' AND rs.start_time > now()
       ORDER BY rs.start_time LIMIT 1) nxt ON true`;

export function listResources(opts: { categoryId?: string; search?: string; includeInactive?: boolean }) {
  const categoryId = isUuid(opts.categoryId) ? opts.categoryId : null;
  const search = opts.search?.trim() ? `%${opts.search.trim()}%` : null;
  return query<ResourceRow>(
    `${RESOURCE_SELECT}
      WHERE ($1::uuid IS NULL OR r.category_id = $1)
        AND ($2::text IS NULL OR r.name ILIKE $2 OR r.location ILIKE $2 OR r.description ILIKE $2)
        AND ($3 OR r.is_active)
      ORDER BY r.is_active DESC, c.name, r.name`,
    [categoryId, search, opts.includeInactive ?? false],
  );
}

export const getResource = (id: string) =>
  isUuid(id) ? queryOne<ResourceRow>(`${RESOURCE_SELECT} WHERE r.id = $1`, [id]) : Promise.resolve(null);

export async function countUpcomingForResource(resourceId: string): Promise<number> {
  const row = await queryOne<{ n: number }>(
    "SELECT count(*)::int AS n FROM reservations WHERE resource_id = $1 AND status = 'confirmed' AND end_time > now()",
    [resourceId],
  );
  return row?.n ?? 0;
}

/* ---------------- reservations ---------------- */

const RESERVATION_SELECT = `
  SELECT rs.id, rs.resource_id, r.name AS resource_name, rs.user_id, u.name AS user_name,
         rs.title, rs.notes, rs.start_time, rs.end_time, rs.status
    FROM reservations rs
    JOIN resources r ON r.id = rs.resource_id
    JOIN users u ON u.id = rs.user_id`;

export type DayBlock = ReservationRow & { start_min: number; end_min: number };

/** Confirmed reservations that touch one calendar day (in the app timezone), with minutes-from-midnight for drawing. */
export function getDaySchedule(resourceId: string, date: string) {
  return query<DayBlock>(
    `WITH d AS (SELECT ($2::timestamp AT TIME ZONE $3) AS day_start, (($2::timestamp + interval '1 day') AT TIME ZONE $3) AS day_end)
     SELECT rs.id, rs.resource_id, r.name AS resource_name, rs.user_id, u.name AS user_name,
            rs.title, rs.notes, rs.start_time, rs.end_time, rs.status,
            (EXTRACT(EPOCH FROM (GREATEST(rs.start_time, d.day_start) - d.day_start)) / 60)::int AS start_min,
            (EXTRACT(EPOCH FROM (LEAST(rs.end_time, d.day_end)       - d.day_start)) / 60)::int AS end_min
       FROM d, reservations rs
       JOIN resources r ON r.id = rs.resource_id
       JOIN users u ON u.id = rs.user_id
      WHERE rs.resource_id = $1 AND rs.status = 'confirmed'
        AND rs.start_time < d.day_end AND rs.end_time > d.day_start
      ORDER BY rs.start_time`,
    [resourceId, date, APP_TIMEZONE],
  );
}

export function listUserReservations(userId: string, scope: "upcoming" | "past") {
  const upcoming = scope === "upcoming";
  return query<ReservationRow>(
    `${RESERVATION_SELECT}
      WHERE rs.user_id = $1 AND ${upcoming ? "rs.status = 'confirmed' AND rs.end_time > now()" : "(rs.status = 'cancelled' OR rs.end_time <= now())"}
      ORDER BY rs.start_time ${upcoming ? "ASC" : "DESC"} LIMIT 100`,
    [userId],
  );
}

export function listAllReservations(scope: "upcoming" | "past") {
  const upcoming = scope === "upcoming";
  return query<ReservationRow>(
    `${RESERVATION_SELECT}
      WHERE ${upcoming ? "rs.status = 'confirmed' AND rs.end_time > now()" : "(rs.status = 'cancelled' OR rs.end_time <= now())"}
      ORDER BY rs.start_time ${upcoming ? "ASC" : "DESC"} LIMIT 200`,
  );
}

/* ---------------- dashboard & report ---------------- */

export async function getDashboardStats(userId: string) {
  const row = await queryOne<{ total: number; in_use: number; mine_upcoming: number }>(
    `SELECT (SELECT count(*) FROM resources WHERE is_active)::int AS total,
            (SELECT count(DISTINCT resource_id) FROM reservations
              WHERE status = 'confirmed' AND start_time <= now() AND end_time > now())::int AS in_use,
            (SELECT count(*) FROM reservations
              WHERE user_id = $1 AND status = 'confirmed' AND end_time > now())::int AS mine_upcoming`,
    [userId],
  );
  return row ?? { total: 0, in_use: 0, mine_upcoming: 0 };
}

export type UsageRow = {
  resource_id: string;
  resource_name: string;
  category_name: string;
  bookings: number;
  hours_booked: number;
  cancellations: number;
  utilization: number; // 0..1 of bookable hours in the period
};

/** Usage over the last `days` days: how much each resource was actually used. */
export function getUsageReport(days = 30) {
  const bookableHours = days * (RULES.closeHour - RULES.openHour);
  return query<UsageRow>(
    `SELECT r.id AS resource_id, r.name AS resource_name, c.name AS category_name,
            count(rs.id) FILTER (WHERE rs.status = 'confirmed')::int AS bookings,
            COALESCE(sum(EXTRACT(EPOCH FROM (LEAST(rs.end_time, now()) - rs.start_time)) / 3600)
                     FILTER (WHERE rs.status = 'confirmed'), 0)::float8 AS hours_booked,
            count(rs.id) FILTER (WHERE rs.status = 'cancelled')::int AS cancellations,
            (COALESCE(sum(EXTRACT(EPOCH FROM (LEAST(rs.end_time, now()) - rs.start_time)) / 3600)
                     FILTER (WHERE rs.status = 'confirmed'), 0) / $2::float8)::float8 AS utilization
       FROM resources r
       JOIN categories c ON c.id = r.category_id
       LEFT JOIN reservations rs ON rs.resource_id = r.id
            AND rs.start_time >= now() - make_interval(days => $1) AND rs.start_time < now()
      WHERE r.is_active
      GROUP BY r.id, c.name
      ORDER BY hours_booked DESC, r.name`,
    [days, bookableHours],
  );
}
