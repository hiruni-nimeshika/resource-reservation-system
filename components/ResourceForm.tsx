"use client";

import { useActionState } from "react";
import { createResourceAction, updateResourceAction } from "@/app/actions/resources";
import type { FormState } from "@/app/actions/auth";
import type { Category, ResourceRow } from "@/lib/queries";
import { FormMessage } from "./FormMessage";
import { SubmitButton } from "./SubmitButton";

export function ResourceForm({ categories, resource }: { categories: Category[]; resource?: ResourceRow }) {
  const [state, action] = useActionState<FormState, FormData>(resource ? updateResourceAction : createResourceAction, {});
  const v = state.values;
  return (
    <form action={action} className="panel stack-sm" style={{ maxWidth: 560 }}>
      {resource && <input type="hidden" name="id" value={resource.id} />}
      <label>Name<input name="name" defaultValue={v?.name ?? resource?.name} maxLength={80} required /></label>
      <label>
        Category
        <select name="categoryId" defaultValue={v?.categoryId ?? resource?.category_id ?? ""} required>
          <option value="" disabled>Choose a category</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>
      <div className="field-row">
        <label>Location<input name="location" defaultValue={v?.location ?? resource?.location ?? ""} maxLength={120} /></label>
        <label>Floor (optional)<input name="floor" defaultValue={v?.floor ?? resource?.floor ?? ""} maxLength={50} placeholder="e.g. 3rd floor" /></label>
      </div>
      <label>Capacity (optional)<input name="capacity" type="number" min={1} step={1} defaultValue={v?.capacity ?? resource?.capacity ?? ""} /></label>
      <label>Description<textarea name="description" defaultValue={v?.description ?? resource?.description ?? ""} maxLength={500} /></label>
      <FormMessage state={state} />
      <div><SubmitButton>{resource ? "Save changes" : "Add resource"}</SubmitButton></div>
    </form>
  );
}