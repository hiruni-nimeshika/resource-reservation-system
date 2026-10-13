"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { cancelReservation, createReservation } from "@/lib/reservations";
import { bookingSchema, firstError, formString, submittedValues } from "@/lib/validation";
import type { FormState } from "./auth";

export async function createReservationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser(); // never trust the client about who is booking
  const parsed = bookingSchema.safeParse({
    resourceId: formString(formData, "resourceId"),
    title: formString(formData, "title"),
    notes: formString(formData, "notes"),
    date: formString(formData, "date"),
    startTime: formString(formData, "startTime"),
    endTime: formString(formData, "endTime"),
  });
  if (!parsed.success) return { error: firstError(parsed.error), values: submittedValues(formData) };

  const result = await createReservation({ ...parsed.data, userId: user.id });
  if (!result.ok) return { error: result.error, values: submittedValues(formData) };

  revalidatePath("/", "layout"); // dashboard, resource pages, lists all change
  return { success: "Reservation confirmed." };
}

export async function cancelReservationAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();
  const id = formString(formData, "reservationId");
  const result = await cancelReservation(id, user);
  if (!result.ok) return { error: result.error, values: submittedValues(formData) };
  revalidatePath("/", "layout");
  return { success: "Reservation cancelled." };
}
