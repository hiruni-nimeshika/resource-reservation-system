"use client";

import { useActionState } from "react";
import { createReservationAction } from "@/app/actions/reservations";
import type { FormState } from "@/app/actions/auth";
import { RULES } from "@/lib/rules";
import { FormMessage } from "./FormMessage";
import { SubmitButton } from "./SubmitButton";

export function BookingForm({ resourceId, date, minDate, maxDate }: { resourceId: string; date: string; minDate: string; maxDate: string }) {
  const [state, action] = useActionState<FormState, FormData>(createReservationAction, {});
  const v = state.values;
  const hours = `${String(RULES.openHour).padStart(2, "0")}:00`;
  const close = `${String(RULES.closeHour).padStart(2, "0")}:00`;
  return (
    <form action={action} className="panel stack-sm">
      <h2>Book this resource</h2>
      <input type="hidden" name="resourceId" value={resourceId} />
      <label>What is it for?<input name="title" placeholder="e.g. Sprint planning" maxLength={100} defaultValue={v?.title} required /></label>
      <div className="field-row">
        <label>Date<input name="date" type="date" defaultValue={v?.date ?? date} min={minDate} max={maxDate} required /></label>
        <label>Start<input name="startTime" type="time" min={hours} max={close} step={900} defaultValue={v?.startTime ?? "09:00"} required /></label>
        <label>End<input name="endTime" type="time" min={hours} max={close} step={900} defaultValue={v?.endTime ?? "10:00"} required /></label>
      </div>
      <label>Notes (optional)<textarea name="notes" maxLength={500} defaultValue={v?.notes} /></label>
      <p className="small muted">Open {hours}–{close}. Bookings run 15 minutes to 4 hours, up to {RULES.maxAdvanceDays} days ahead.</p>
      <FormMessage state={state} />
      <div><SubmitButton pendingLabel="Checking availability…">Confirm booking</SubmitButton></div>
    </form>
  );
}
