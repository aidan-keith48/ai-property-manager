"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/lib/auth-context";

export default function DashboardLayout({ children }: LayoutProps<"/">) {
  const { landlord, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !landlord) {
      router.replace("/login");
    }
  }, [loading, landlord, router]);

  if (loading) {
    return (
      <div className="flex flex-1 flex-col gap-4 p-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 w-full max-w-3xl rounded-xl" />
      </div>
    );
  }

  if (!landlord) {
    return null;
  }

  return (
    <div className="flex flex-1 flex-col md:flex-row">
      <DashboardSidebar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 md:px-8 md:py-8">
        {children}
      </main>
    </div>
  );
}
