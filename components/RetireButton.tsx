"use client";

import { useActionState } from "react";
import { setResourceActiveAction } from "@/app/actions/resources";
import type { FormState } from "@/app/actions/auth";
import { FormMessage } from "./FormMessage";

export function RetireButton({ id, active }: { id: string; active: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(setResourceActiveAction, {});
  return (
    <form action={action} className="stack-sm">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="active" value={active ? "false" : "true"} />
      <button type="submit" className={active ? "btn danger" : "btn secondary"} disabled={pending}>
        {active ? "Retire resource" : "Restore resource"}
      </button>
      <FormMessage state={state} />
    </form>
  );
}
