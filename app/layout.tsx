import type { Metadata } from "next";
import Link from "next/link";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/figtree";
import "./globals.css";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "./actions/auth";
import { Nav } from "@/components/Nav";

export const metadata: Metadata = {
  title: { default: "Reserve · Resource Reservation", template: "%s · Reserve" },
  description: "Book shared rooms, equipment and vehicles without double-bookings.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <html lang="en">
      <body>
        {user ? (
          <div className="shell">
            <aside className="sidebar">
              <Link href="/" className="brand">Reserve<small>Shared resources, one calendar</small></Link>
              <Nav isAdmin={user.role === "admin"} />
              <div className="who">
                <strong>{user.name}</strong>
                <span>{user.role === "admin" ? "Administrator" : "Member"}</span>
                <form action={logoutAction}><button className="linklike" type="submit">Sign out</button></form>
              </div>
            </aside>
            <main className="main">{children}</main>
          </div>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
