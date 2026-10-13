import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "Create account" };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <div className="auth">
      <div className="panel">
        <div><h1>Create account</h1><p className="muted">New accounts can book resources. Administrators manage them.</p></div>
        <AuthForm mode="register" />
      </div>
    </div>
  );
}
