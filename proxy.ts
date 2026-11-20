import { NextResponse, type NextRequest } from "next/server";

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

export function proxy(request: NextRequest) {
  const username = process.env.FASTTRACK_USER || "fasttrack";
  const password = process.env.FASTTRACK_PASSWORD || "";
  if (!password) return NextResponse.next();

  const header = request.headers.get("authorization");
  if (header?.startsWith("Basic ")) {
    try {
      const decoded = atob(header.slice(6));
      const separator = decoded.indexOf(":");
      if (separator >= 0) {
        const user = decoded.slice(0, separator);
        const entered = decoded.slice(separator + 1);
        if (constantTimeEqual(user, username) && constantTimeEqual(entered, password)) {
          return NextResponse.next();
        }
      }
    } catch {
      // Malformed credentials fall through to 401.
    }
  }

  return unauthorized();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg).*)"],
};
