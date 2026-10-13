"use server";

import { redirect } from "next/navigation";
import { queryOne, pgErrorCode, PG_UNIQUE_VIOLATION } from "@/lib/db";
import { createSession, destroySession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";
import { firstError, formString, submittedValues, loginSchema, registerSchema } from "@/lib/validation";

export type FormState = { error?: string; success?: string; values?: Record<string, string> };

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = loginSchema.safeParse({ email: formString(formData, "email"), password: formString(formData, "password") });
  if (!parsed.success) return { error: firstError(parsed.error), values: submittedValues(formData) };

  const user = await queryOne<{ id: string; password_hash: string }>(
    "SELECT id, password_hash FROM users WHERE lower(email) = $1",
    [parsed.data.email],
  );
  // Same message for "no such user" and "wrong password" so emails can't be probed.
  if (!user || !(await verifyPassword(parsed.data.password, user.password_hash))) {
    return { error: "Incorrect email or password.", values: submittedValues(formData) };
  }
  await createSession(user.id);
  redirect("/");
}

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = registerSchema.safeParse({
    name: formString(formData, "name"),
    email: formString(formData, "email"),
    password: formString(formData, "password"),
  });
  if (!parsed.success) return { error: firstError(parsed.error), values: submittedValues(formData) };

  try {
    const user = await queryOne<{ id: string }>(
      "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id",
      [parsed.data.name, parsed.data.email, await hashPassword(parsed.data.password)],
    );
    await createSession(user!.id);
  } catch (error) {
    if (pgErrorCode(error) === PG_UNIQUE_VIOLATION) return { error: "An account with this email already exists.", values: submittedValues(formData) };
    throw error;
  }
  redirect("/");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}
