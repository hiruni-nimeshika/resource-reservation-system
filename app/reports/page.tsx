import type { Metadata } from "next";
import { requireAdmin } from "@/lib/auth";
import { getUsageReport } from "@/lib/queries";
import { RULES } from "@/lib/rules";

export const metadata: Metadata = { title: "Usage report" };

const DAYS = 30;

export default async function ReportsPage() {
  await requireAdmin();
  const rows = await getUsageReport(DAYS);
  const totalHours = rows.reduce((s, r) => s + r.hours_booked, 0);
  const totalBookings = rows.reduce((s, r) => s + r.bookings, 0);
  const unused = rows.filter((r) => r.bookings === 0);

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Usage report</h1>
          <p>Last {DAYS} days. Utilisation = hours booked ÷ bookable hours ({RULES.closeHour - RULES.openHour}h a day).</p>
        </div>
      </div>

      <div className="facts">
        <div className="fact"><b>{totalBookings}</b><span>bookings</span></div>
        <div className="fact"><b>{totalHours.toFixed(1)}</b><span>hours booked</span></div>
        <div className="fact"><b>{unused.length}</b><span>resources never booked</span></div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Resource</th><th>Category</th><th className="num">Bookings</th><th className="num">Hours</th><th className="num">Cancelled</th><th>Utilisation</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.resource_id}>
                <td>{r.resource_name}</td>
                <td className="muted">{r.category_name}</td>
                <td className="num">{r.bookings}</td>
                <td className="num">{r.hours_booked.toFixed(1)}</td>
                <td className="num">{r.cancellations}</td>
                <td>
                  <div className="row">
                    <div className="bar" aria-hidden><i style={{ width: `${Math.min(100, r.utilization * 100)}%` }} /></div>
                    <span className="small">{(r.utilization * 100).toFixed(1)}%</span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
