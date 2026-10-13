import type { FormState } from "@/app/actions/auth";

export function FormMessage({ state }: { state: FormState }) {
  if (state.error) return <p className="notice error" role="alert">{state.error}</p>;
  if (state.success) return <p className="notice ok" role="status">{state.success}</p>;
  return null;
}
