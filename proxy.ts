import { NextResponse, type NextRequest } from "next/server";
import { supabaseConfigured } from "@/lib/supabase/admin";
import { refreshSession } from "@/lib/supabase/proxy";
import {
  applySecurityHeaders,
  isSameOriginRequest,
  isUnsafeMethod,
} from "@/lib/server/request-guard";

function finalize(response: NextResponse) {
  applySecurityHeaders(response.headers);
  return response;
}

function constantTimeEqual(a: string, b: string) {
  const left = new TextEncoder().encode(a);
  const right = new TextEncoder().encode(b);
  let diff = left.length ^ right.length;
  for (let index = 0; index < Math.max(left.length, right.length); index++) {
    diff |= (left[index] ?? 0) ^ (right[index] ?? 0);
  }
  return diff === 0;
}

function unauthorized() {
  return new NextResponse("Password required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="fasttrack", charset="UTF-8"',
      "Cache-Control": "no-store",
    },
  });
}

export async function proxy(request: NextRequest) {
  if (isUnsafeMethod(request.method) && !isSameOriginRequest(request)) {
    return finalize(
      NextResponse.json({ error: "Permintaan lintas situs ditolak." }, { status: 403 }),
    );
  }

  const username = process.env.FASTTRACK_USER || "fasttrack";
  const password = process.env.FASTTRACK_PASSWORD || "";

  let response = NextResponse.next();
  if (supabaseConfigured()) {
    response = await refreshSession(request);
  }

  if (!password) return finalize(response);

  const header = request.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const separator = decoded.indexOf(":");
      if (separator >= 0) {
        const user = decoded.slice(0, separator);
        const entered = decoded.slice(separator + 1);
        if (constantTimeEqual(user, username) && constantTimeEqual(entered, password)) {
          return finalize(response);
        }
      }
    } catch {
      // Malformed credentials fall through to 401.
    }
  }

  return finalize(unauthorized());
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
