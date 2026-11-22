const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Route handlers do not get the origin check that server actions get. Check
 * both Origin and Sec-Fetch-Site so a cross-site form post cannot mutate state
 * even when the auth cookie is sent by the browser.
 */
export function isSameOriginRequest(req: Request) {
  const fetchSite = req.headers.get("sec-fetch-site");
  if (fetchSite && fetchSite !== "same-origin" && fetchSite !== "none") {
    return false;
  }

  const origin = req.headers.get("origin");
  if (!origin) return true;
  if (origin === "null") return false;

  try {
    const received = new URL(origin).origin;
    const allowed = new Set<string>([new URL(req.url).origin]);
    if (process.env.APP_URL) {
      allowed.add(new URL(process.env.APP_URL).origin);
    }
    return allowed.has(received);
  } catch {
    return false;
  }
}

export function isUnsafeMethod(method: string) {
  return !SAFE_METHODS.has(method.toUpperCase());
}

export function applySecurityHeaders(headers: Headers) {
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.set("Cross-Origin-Opener-Policy", "same-origin");
  headers.set("Cross-Origin-Resource-Policy", "same-origin");
  headers.set("X-Permitted-Cross-Domain-Policies", "none");

  const https =
    process.env.NODE_ENV === "production" ||
    process.env.APP_URL?.startsWith("https://") ||
    process.env.COOKIE_SECURE === "1";
  if (https) {
    headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }

  if (process.env.NODE_ENV === "production") {
    headers.set(
      "Content-Security-Policy",
      [
        "default-src 'self'",
        "base-uri 'self'",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "frame-src 'none'",
        "form-action 'self'",
        "script-src 'self' 'unsafe-inline'",
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' data: https://fonts.gstatic.com",
        "img-src 'self' data: blob: https:",
        "media-src 'self' blob:",
        "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
        "worker-src 'self' blob:",
        "upgrade-insecure-requests",
      ].join("; "),
    );
  }
}
