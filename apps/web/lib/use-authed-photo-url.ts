"use client";

import { useEffect, useState } from "react";

import { apiFetchBlob, TOKEN_STORAGE_KEY } from "@/lib/api";

/** Fetches an authenticated image endpoint as a blob and returns a local
 * object URL, or null while loading / when there's nothing to fetch. Same
 * lifecycle AuthedImage (components/ui.tsx) uses internally, extracted so
 * callers that need the raw URL — e.g. to pass into PropertyIdentity's
 * `photoUrl` prop rather than rendering a bare <img> — don't duplicate it. */
export function useAuthedPhotoUrl(
  path: string | null,
  tokenKey: string = TOKEN_STORAGE_KEY,
): string | null {
  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!path) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: path went from set to null (e.g. photo deleted), clear the stale URL rather than leaving it stuck
      setObjectUrl(null);
      return;
    }
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

  return objectUrl;
}
