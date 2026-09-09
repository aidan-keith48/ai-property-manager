"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth-context";

export default function DashboardLayout({ children }: LayoutProps<"/">) {
  const { landlord, loading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !landlord) {
      router.replace("/login");
    }
  }, [loading, landlord, router]);

  if (loading) {
    return <div className="flex flex-1 items-center justify-center text-slate-500">Loading...</div>;
  }

  if (!landlord) {
    return null;
  }

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <nav className="flex gap-4 text-sm font-medium text-slate-700">
            <Link href="/properties" className="hover:text-slate-900">
              Properties
            </Link>
            <Link href="/tenants" className="hover:text-slate-900">
              Tenants
            </Link>
          </nav>
          <div className="flex items-center gap-3 text-sm text-slate-600">
            <span>{landlord.email}</span>
            <button
              onClick={() => {
                logout();
                router.replace("/login");
              }}
              className="font-medium text-slate-900 underline"
            >
              Log out
            </button>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6">{children}</main>
    </div>
  );
}
