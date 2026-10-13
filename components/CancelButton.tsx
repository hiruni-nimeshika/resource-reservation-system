"use client";

import { useActionState } from "react";
import { cancelReservationAction } from "@/app/actions/reservations";
import type { FormState } from "@/app/actions/auth";

export function CancelButton({ reservationId }: { reservationId: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(cancelReservationAction, {});
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (!confirm("Cancel this reservation? This frees the time slot for others.")) e.preventDefault();
      }}
    >
      <input type="hidden" name="reservationId" value={reservationId} />
      <button type="submit" className="btn danger small" disabled={pending}>{pending ? "Cancelling…" : "Cancel"}</button>
      {state.error && <p className="small" role="alert" style={{ color: "var(--warn)", marginTop: 4 }}>{state.error}</p>}
    </form>
  );
}
