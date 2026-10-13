import type { ResourceRow } from "@/lib/queries";
import { formatTime } from "@/lib/time";

export function StatusPill({ resource }: { resource: Pick<ResourceRow, "is_active" | "busy_until"> }) {
  if (!resource.is_active) return <span className="pill off">Retired</span>;
  if (resource.busy_until) return <span className="pill busy">In use until {formatTime(resource.busy_until)}</span>;
  return <span className="pill">Available now</span>;
}
