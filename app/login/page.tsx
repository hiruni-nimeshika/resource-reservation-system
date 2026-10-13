import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { AuthForm } from "@/components/AuthForm";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/");
  return (
    <div className="auth">
      <div className="panel">
        <div><h1>Sign in</h1><p className="muted">Book rooms, equipment and vehicles.</p></div>
        <AuthForm mode="login" />
        <div className="demo">
          Demo accounts: <b>admin@demo.test</b> / Admin@1234 &nbsp;·&nbsp; <b>nimal@demo.test</b> / Member@1234
        </div>
      </div>
    </div>
  );
}
