import type { DayBlock } from "@/lib/queries";
import { RULES } from "@/lib/rules";
import { formatTime } from "@/lib/time";

const OPEN = RULES.openHour * 60;
const SPAN = (RULES.closeHour - RULES.openHour) * 60;
const pct = (minutes: number) => Math.min(100, Math.max(0, ((minutes - OPEN) / SPAN) * 100));

/** The day at a glance: the bookable hours as a strip, with each booking drawn where it falls. */
export function DayTimeline({ blocks, userId, nowMinutes }: { blocks: DayBlock[]; userId: string; nowMinutes: number | null }) {
  const ticks: number[] = [];
  for (let h = RULES.openHour; h <= RULES.closeHour; h += 2) ticks.push(h);
  return (
    <div>
      <div className="timeline" role="img" aria-label={blocks.length ? `${blocks.length} bookings on this day` : "No bookings on this day"}>
        <div className="scale" aria-hidden>
          {ticks.map((h, i) => (
            <span key={h} className={`tick${i === 0 ? " first" : i === ticks.length - 1 ? " last" : ""}${(h - RULES.openHour) % 4 ? " minor" : ""}`} style={{ left: `${pct(h * 60)}%` }}>
              {String(h).padStart(2, "0")}:00
            </span>
          ))}
        </div>
        <div className="track">
          {blocks.map((b) => (
            <div
              key={b.id}
              className={`block${b.user_id === userId ? " mine" : ""}`}
              style={{ left: `${pct(b.start_min)}%`, width: `${Math.max(pct(b.end_min) - pct(b.start_min), 1)}%` }}
              title={`${b.title} · ${formatTime(b.start_time)}–${formatTime(b.end_time)} · ${b.user_name}`}
            >
              <b>{b.title}</b>
              {b.user_name.split(" ")[0]}
            </div>
          ))}
          {nowMinutes !== null && nowMinutes >= OPEN && nowMinutes <= OPEN + SPAN && (
            <div className="now-line" style={{ left: `${pct(nowMinutes)}%` }} aria-hidden />
          )}
        </div>
      </div>
      <div className="legend">
        <span><i className="swatch" style={{ background: "var(--accent-soft)", border: "1px solid #b6d8c8" }} />Free</span>
        <span><i className="swatch" style={{ background: "var(--taken)" }} />Booked by someone else</span>
        <span><i className="swatch" style={{ background: "var(--accent)" }} />Your booking</span>
        {nowMinutes !== null && <span><i className="swatch" style={{ background: "var(--warn)", width: 3 }} />Now</span>}
      </div>
    </div>
  );
}
