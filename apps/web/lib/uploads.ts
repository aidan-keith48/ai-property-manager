/** Mirrors app/uploads.py's upload_max_bytes default on the API — kept as a
 * separate constant since the frontend has no way to read the API's config
 * at build time. Used for an instant client-side rejection before a doomed
 * upload even leaves the browser; the API still enforces the real limit. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024;

export function formatMaxUploadSize(): string {
  return `${MAX_UPLOAD_BYTES / (1024 * 1024)}MB`;
}
