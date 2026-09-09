"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import { ClipboardList, PlusCircle } from "lucide-react";

import { TENANT_TOKEN_STORAGE_KEY } from "@/lib/api";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/portal/submit", label: "Report", icon: PlusCircle },
  { href: "/portal/submissions", label: "History", icon: ClipboardList },
];

/** Only shown once a tenant is signed in — the magic-link request and verify
 * screens have nowhere to navigate to yet. */
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  return () => window.removeEventListener("storage", onChange);
}

export function PortalTabBar() {
  const pathname = usePathname();
  const signedIn = useSyncExternalStore(
    subscribe,
    () => Boolean(window.localStorage.getItem(TENANT_TOKEN_STORAGE_KEY)),
    () => false // no token on the server, so the bar renders after hydration
  );

  if (!signedIn) return null;

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-card">
      <div className="mx-auto flex max-w-lg">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 py-3 text-xs font-medium transition-colors",
                active ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="size-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
