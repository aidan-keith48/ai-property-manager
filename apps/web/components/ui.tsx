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

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}
