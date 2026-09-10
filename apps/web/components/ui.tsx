"use client";

import { useEffect, useState, type ReactNode } from "react";

import { apiFetchBlob, TOKEN_STORAGE_KEY } from "@/lib/api";
import { cn } from "@/lib/utils";

export function ErrorText({ children }: { children: ReactNode }) {
  if (!children) return null;
  return <p className="text-sm text-destructive">{children}</p>;
}

export function AuthedImage({
  path,
  tokenKey = TOKEN_STORAGE_KEY,
  alt,
  className = "",
}: {
  path: string;
  tokenKey?: string;
  alt: string;
  className?: string;
}) {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    apiFetchBlob(path, tokenKey).then((blob) => {
      if (cancelled) return;
      url = URL.createObjectURL(blob);
      setObjectUrl(url);
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [path, tokenKey]);

  if (!objectUrl) {
    return <div className={cn("animate-pulse rounded-lg bg-muted", className)} />;
  }
  // eslint-disable-next-line @next/next/no-img-element -- object URL from an authenticated fetch, next/image can't handle that
  return <img src={objectUrl} alt={alt} className={className} />;
}

/** Small letter-spaced uppercase label. The rung the type scale was missing —
 *  it gives a heading something to sit against without adding another weight. */
export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={cn("eyebrow text-muted-foreground", className)}>{children}</p>
  );
}

/** "Section title + action" row, the pattern the reference designs use above
 *  every list. Replaces hand-rolled h2 + ghost-button rows. */
export function SectionHeader({
  title,
  action,
  className,
}: {
  title: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("mb-4 flex items-center justify-between gap-3", className)}>
      <h2 className="font-heading text-lg font-semibold tracking-tight text-foreground">{title}</h2>
      {action}
    </div>
  );
}

/** Every optional prop here was added for the redesign; the original
 *  title/description/children signature still compiles unchanged. */
export function PageHeader({
  eyebrow,
  title,
  description,
  leading,
  size = "default",
  children,
}: {
  eyebrow?: string;
  title: string;
  description?: ReactNode;
  leading?: ReactNode;
  size?: "default" | "display";
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div className="flex min-w-0 items-start gap-4">
        {leading ? <div className="shrink-0">{leading}</div> : null}
        <div className="min-w-0">
          {eyebrow ? <Eyebrow className="mb-1.5">{eyebrow}</Eyebrow> : null}
          {/* Size class kept out of a cn() call that also carries a colour —
              see the note in property-identity.tsx. */}
          <h1
            className={`font-heading text-foreground ${
              size === "display" ? "text-display" : "text-display-sm"
            }`}
          >
            {title}
          </h1>
          {description ? (
            <div className="mt-2 text-sm text-muted-foreground">{description}</div>
          ) : null}
        </div>
      </div>
      {children}
    </div>
  );
}
