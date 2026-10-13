/**
 * Booking rules - pure functions with no database or framework code,
 * so they are easy to read, reuse on the client, and unit-test.
 */
export const RULES = {
  openHour: 6, // resources can be booked from 06:00 ...
  closeHour: 22, // ... until 22:00
  minMinutes: 15,
  maxMinutes: 4 * 60,
  maxAdvanceDays: 90,
  pastGraceSeconds: 60, // tolerance for slow form submits / small clock drift
} as const;

const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

export function timeToMinutes(time: string): number | null {
  const m = TIME_RE.exec(time);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h && m) return `${h}h ${m}m`;
  return h ? `${h}h` : `${m}m`;
}

/** Checks that only need the typed "HH:mm" values (same-day booking, opening hours). */
export function validateLocalWindow(startTime: string, endTime: string): string | null {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (start === null || end === null) return "Enter valid start and end times.";
  if (end <= start) return "End time must be after the start time.";
  const open = RULES.openHour * 60;
  const close = RULES.closeHour * 60;
  if (start < open || end > close) {
    return `Bookings must fall between ${pad(RULES.openHour)}:00 and ${pad(RULES.closeHour)}:00.`;
  }
  return null;
}

/** Checks that need real instants (past bookings, duration, how far ahead). */
export function validateInstants(args: { start: Date; end: Date; now: Date }): string | null {
  const { start, end, now } = args;
  if (start.getTime() < now.getTime() - RULES.pastGraceSeconds * 1000) {
    return "That start time has already passed. Choose a future time.";
  }
  const minutes = Math.round((end.getTime() - start.getTime()) / 60000);
  if (minutes < RULES.minMinutes) return `Bookings must be at least ${RULES.minMinutes} minutes long.`;
  if (minutes > RULES.maxMinutes) return `Bookings can be at most ${formatDuration(RULES.maxMinutes)} long.`;
  const latest = now.getTime() + RULES.maxAdvanceDays * 86_400_000;
  if (start.getTime() > latest) return `You can book at most ${RULES.maxAdvanceDays} days ahead.`;
  return null;
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}
