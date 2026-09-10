import Link from "next/link";
import type { ReactNode } from "react";
import { Building2 } from "lucide-react";

import { PropertyIdentity } from "@/components/property-identity";
import { Card } from "@/components/ui/card";
import { Eyebrow } from "@/components/ui";

/**
 * Shared chrome for login and signup, which were near-duplicates.
 *
 * `data-surface="editorial"` is the whole accent switch: it re-declares
 * --primary as near-black for this subtree, so the submit button, focus rings
 * and links all follow without any of them opting in. See globals.css.
 *
 * The decorative panel must never contain a form control or a label whose text
 * contains "Name", "Email" or "Password" — the E2E helpers use getByLabel,
 * which matches substrings under strict mode — and the form must contain
 * exactly one button[type=submit].
 */
export function AuthShell({
  eyebrow,
  title,
  subtitle,
  children,
  footer,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div data-surface="editorial" className="flex flex-1 flex-col lg:flex-row">
      {/* Decorative. Collapses to a slim band on mobile so the form stays
          above the fold on a phone. */}
      <aside className="relative hidden overflow-hidden lg:flex lg:w-[45%] lg:flex-col lg:justify-between lg:p-12">
        <PropertyIdentity
          seed="auth-panel"
          label={title}
          variant="plain"
          size="hero"
          className="absolute inset-0 !aspect-auto !rounded-none"
        />
        <Link href="/" className="relative flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-white/15 text-white backdrop-blur-sm">
            <Building2 className="size-4.5" aria-hidden />
          </span>
          <span className="font-heading text-sm font-bold tracking-tight text-white">
            Property Manager
          </span>
        </Link>
        <div className="relative max-w-sm">
          <p className="text-eyebrow uppercase text-white/70">Built for landlords</p>
          <p className="mt-3 font-heading text-display-sm text-white">
            Every property, tenant and issue in one place.
          </p>
        </div>
      </aside>

      <main className="flex flex-1 items-center justify-center p-4 py-10 lg:p-12">
        <div className="w-full max-w-sm">
          <span className="mb-5 flex size-11 items-center justify-center rounded-xl bg-primary text-primary-foreground lg:hidden">
            <Building2 className="size-5" aria-hidden />
          </span>

          {eyebrow ? <Eyebrow className="mb-2">{eyebrow}</Eyebrow> : null}
          <h1 className="font-heading text-display text-foreground">{title}</h1>
          {subtitle ? <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p> : null}

          <Card className="mt-7 p-6">{children}</Card>

          {footer ? (
            <p className="mt-6 text-sm text-muted-foreground">{footer}</p>
          ) : null}
        </div>
      </main>
    </div>
  );
}
