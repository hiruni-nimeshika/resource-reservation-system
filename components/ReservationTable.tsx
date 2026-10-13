import type { ReservationRow } from "@/lib/queries";
import type { SessionUser } from "@/lib/auth";
import { formatRange } from "@/lib/time";
import { CancelButton } from "./CancelButton";
import Link from "next/link";
import { toDateString } from "@/lib/time";

export function ReservationTable({ rows, user, showUser, allowCancel, hideResource = false }: { rows: ReservationRow[]; user: SessionUser; showUser: boolean; allowCancel: boolean; hideResource?: boolean }) {
  if (rows.length === 0) return <div className="empty">Nothing here yet.</div>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>When</th>
            {!hideResource && <th>Resource</th>}
            <th>Title</th>
            {showUser && <th>Booked by</th>}
            <th>Status</th>
            <th><span className="visually-hidden">Actions</span></th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td>{formatRange(r.start_time, r.end_time)}</td>
              {!hideResource && <td><Link href={`/resources/${r.resource_id}?date=${toDateString(r.start_time)}`}>{r.resource_name}</Link></td>}
              <td>{r.title}</td>
              {showUser && <td>{r.user_name}</td>}
              <td><span className={`pill${r.status === "cancelled" ? " cancelled" : ""}`}>{r.status === "cancelled" ? "Cancelled" : r.end_time > new Date() ? "Confirmed" : "Completed"}</span></td>
              <td>
                {allowCancel && r.status === "confirmed" && (r.user_id === user.id || user.role === "admin") && <CancelButton reservationId={r.id} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
