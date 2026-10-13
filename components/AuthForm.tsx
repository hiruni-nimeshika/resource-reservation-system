"use client";

import Link from "next/link";
import { useActionState } from "react";
import { loginAction, registerAction, type FormState } from "@/app/actions/auth";
import { FormMessage } from "./FormMessage";
import { SubmitButton } from "./SubmitButton";

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const [state, action] = useActionState<FormState, FormData>(mode === "login" ? loginAction : registerAction, {});
  const isLogin = mode === "login";
  return (
    <form action={action} className="stack-sm" noValidate>
      {!isLogin && (
        <label>Full name<input name="name" autoComplete="name" defaultValue={state.values?.name} required /></label>
      )}
      <label>Email<input name="email" type="email" autoComplete="email" defaultValue={state.values?.email} required /></label>
      <label>
        Password
        <input name="password" type="password" autoComplete={isLogin ? "current-password" : "new-password"} minLength={isLogin ? undefined : 8} required />
      </label>
      <FormMessage state={state} />
      <SubmitButton pendingLabel={isLogin ? "Signing in…" : "Creating account…"}>{isLogin ? "Sign in" : "Create account"}</SubmitButton>
      <p className="small muted">
        {isLogin ? <>New here? <Link href="/register">Create an account</Link></> : <>Already registered? <Link href="/login">Sign in</Link></>}
      </p>
    </form>
  );
}
