import { NextResponse, type NextRequest } from "next/server";

const WINDOW_MS = 60_000;
const MAX_REQUESTS = 10;

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function clientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}

function prune(now: number) {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

export function middleware(request: NextRequest) {
  if (request.method !== "POST") return NextResponse.next();

  const now = Date.now();
  prune(now);

  const ip = clientIp(request);
  let bucket = buckets.get(ip);

  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + WINDOW_MS };
    buckets.set(ip, bucket);
  }

  bucket.count += 1;

  const resetSeconds = Math.ceil((bucket.resetAt - now) / 1000);
  const remaining = Math.max(0, MAX_REQUESTS - bucket.count);

  if (bucket.count > MAX_REQUESTS) {
    return NextResponse.json(
      { error: "Terlalu banyak permintaan. Coba lagi nanti." },
      {
        status: 429,
        headers: {
          "Retry-After": String(resetSeconds),
          "X-RateLimit-Limit": String(MAX_REQUESTS),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(resetSeconds),
        },
      },
    );
  }

  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Limit", String(MAX_REQUESTS));
  response.headers.set("X-RateLimit-Remaining", String(remaining));
  response.headers.set("X-RateLimit-Reset", String(resetSeconds));
  return response;
}

export const config = {
  matcher: ["/api/screenshot"],
};