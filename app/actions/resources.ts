"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { pgErrorCode, PG_UNIQUE_VIOLATION, query, isUuid } from "@/lib/db";
import { countUpcomingForResource } from "@/lib/queries";
import { firstError, formString, submittedValues, resourceSchema } from "@/lib/validation";
import type { FormState } from "./auth";

function readResourceForm(formData: FormData) {
  return resourceSchema.safeParse({
    name: formString(formData, "name"),
    categoryId: formString(formData, "categoryId"),
    location: formString(formData, "location"),
    floor: formString(formData, "floor"),
    description: formString(formData, "description"),
    capacity: formString(formData, "capacity"),
  });
}

export async function createResourceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const parsed = readResourceForm(formData);
  if (!parsed.success) return { error: firstError(parsed.error), values: submittedValues(formData) };
  const d = parsed.data;
  try {
    const rows = await query<{ id: string }>(
      "INSERT INTO resources (category_id, name, description, location, floor, capacity) VALUES ($1,$2,$3,$4,$5,$6) RETURNING id",
      [d.categoryId, d.name, d.description, d.location, d.floor, d.capacity],
    );
    revalidatePath("/", "layout");
    redirect(`/resources/${rows[0].id}`);
  } catch (error) {
    if (pgErrorCode(error) === PG_UNIQUE_VIOLATION) return { error: "A resource with this name already exists.", values: submittedValues(formData) };
    throw error;
  }
}

export async function updateResourceAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = formString(formData, "id");
  if (!isUuid(id)) return { error: "Unknown resource.", values: submittedValues(formData) };
  const parsed = readResourceForm(formData);
  if (!parsed.success) return { error: firstError(parsed.error), values: submittedValues(formData) };
  const d = parsed.data;
  try {
    await query(
      `UPDATE resources SET category_id=$2, name=$3, description=$4, location=$5, floor=$6, capacity=$7, updated_at=now() WHERE id=$1`,
      [id, d.categoryId, d.name, d.description, d.location, d.floor, d.capacity],
    );
  } catch (error) {
    if (pgErrorCode(error) === PG_UNIQUE_VIOLATION) return { error: "A resource with this name already exists.", values: submittedValues(formData) };
    throw error;
  }
  revalidatePath("/", "layout");
  redirect(`/resources/${id}`);
}

/** Retire / restore. Retiring is blocked while future bookings exist, so nobody turns up to a resource that vanished. */
export async function setResourceActiveAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const id = formString(formData, "id");
  const active = formString(formData, "active") === "true";
  if (!isUuid(id)) return { error: "Unknown resource.", values: submittedValues(formData) };
  if (!active) {
    const upcoming = await countUpcomingForResource(id);
    if (upcoming > 0) {
      return { error: `${upcoming} upcoming reservation${upcoming === 1 ? "" : "s"} must be cancelled before retiring this resource.`, values: submittedValues(formData) };
    }
  }
  await query("UPDATE resources SET is_active = $2, updated_at = now() WHERE id = $1", [id, active]);
  revalidatePath("/", "layout");
  return { success: active ? "Resource restored." : "Resource retired." };
}