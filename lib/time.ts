import { APP_TIMEZONE } from "./env";

const timeFmt = new Intl.DateTimeFormat("en-GB", { timeZone: APP_TIMEZONE, hour: "2-digit", minute: "2-digit", hour12: false });
const dateFmt = new Intl.DateTimeFormat("en-GB", { timeZone: APP_TIMEZONE, weekday: "short", day: "numeric", month: "short" });
const longDateFmt = new Intl.DateTimeFormat("en-GB", { timeZone: APP_TIMEZONE, weekday: "long", day: "numeric", month: "long", year: "numeric" });
const isoDateFmt = new Intl.DateTimeFormat("en-CA", { timeZone: APP_TIMEZONE, year: "numeric", month: "2-digit", day: "2-digit" });

export const formatTime = (d: Date) => timeFmt.format(d);
export const formatDate = (d: Date) => dateFmt.format(d);
export const formatDateTime = (d: Date) => `${dateFmt.format(d)}, ${timeFmt.format(d)}`;
export const formatRange = (start: Date, end: Date) => `${formatDate(start)}, ${formatTime(start)}–${formatTime(end)}`;

/** "YYYY-MM-DD" for the given instant, in the app timezone. */
export const toDateString = (d: Date) => isoDateFmt.format(d);
export const todayString = () => toDateString(new Date());

export function isValidDateString(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(value);
}

export function addDays(dateString: string, days: number): string {
  const d = new Date(`${dateString}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function formatLongDateString(dateString: string): string {
  return longDateFmt.format(new Date(`${dateString}T12:00:00Z`));
}
