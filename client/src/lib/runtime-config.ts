const rawApiBaseUrl = (import.meta.env.VITE_API_BASE_URL ?? "").trim();

export const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, "");

const BACKEND_PATH_PATTERN = /^\/(api|uploads|songs)(\/|$)/i;

export function withApiBase(url: string): string {
  if (!API_BASE_URL) return url;

  try {
    const parsed = new URL(url, window.location.origin);
    const pathWithSearch = `${parsed.pathname}${parsed.search}${parsed.hash}`;

    // Rewrite same-origin backend paths to the configured backend origin.
    if (
      BACKEND_PATH_PATTERN.test(parsed.pathname) &&
      (parsed.origin === window.location.origin || url.startsWith("/"))
    ) {
      return `${API_BASE_URL}${pathWithSearch}`;
    }
  } catch {
    return url;
  }

  return url;
}
