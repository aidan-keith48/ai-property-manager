"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  Building2,
  FileText,
  Inbox,
  LayoutDashboard,
  LogOut,
  Menu,
  Users,
  type LucideIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/lib/auth-context";
import { cn } from "@/lib/utils";

const NAV_ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/properties", label: "Properties", icon: Building2 },
  { href: "/tenants", label: "Tenants", icon: Users },
  { href: "/leases", label: "Leases", icon: FileText },
  { href: "/inbox", label: "Inbox", icon: Inbox },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1">
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <Icon className="size-4" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter() {
  const { landlord, logout } = useAuth();
  const router = useRouter();

  return (
    <div className="border-t border-sidebar-border pt-4">
      <p className="truncate px-3 text-xs text-muted-foreground">{landlord?.email}</p>
      <Button
        variant="ghost"
        size="sm"
        className="mt-2 w-full justify-start gap-3 px-3 text-muted-foreground"
        onClick={() => {
          logout();
          router.replace("/login");
        }}
      >
        <LogOut className="size-4" />
        Log out
      </Button>
    </div>
  );
}

function SidebarBrand() {
  return (
    <Link href="/" className="flex items-center gap-2 px-3">
      <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
        <Building2 className="size-4" />
      </span>
      <span className="text-sm font-semibold text-foreground">Property Manager</span>
    </Link>
  );
}

export function DashboardSidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop */}
      <aside className="hidden w-60 shrink-0 flex-col justify-between border-r border-sidebar-border bg-sidebar px-3 py-5 md:flex">
        <div className="flex flex-col gap-6">
          <SidebarBrand />
          <NavLinks />
        </div>
        <SidebarFooter />
      </aside>

      {/* Mobile */}
      <header className="flex items-center gap-3 border-b border-sidebar-border bg-sidebar px-4 py-3 md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label="Open navigation">
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="flex h-full flex-col justify-between px-3 py-5">
              <div className="flex flex-col gap-6">
                <SidebarBrand />
                <NavLinks onNavigate={() => setOpen(false)} />
              </div>
              <SidebarFooter />
            </div>
          </SheetContent>
        </Sheet>
        <SidebarBrand />
      </header>
    </>
  );
}
