import "server-only";
import { NextResponse, type NextRequest } from "next/server";
import { devOtpAllowed } from "./sms";

export class HttpError extends Error {
  constructor(public status: number, message: string, public extra?: Record<string, unknown>) {
    super(message);
  }
}

export const fail = (status: number, message: string, extra?: Record<string, unknown>): never => {
  throw new HttpError(status, message, extra);
};

type Ctx<P> = { params: Promise<P> };
type Handler<P> = (req: NextRequest, ctx: Ctx<P>) => Promise<unknown> | unknown;

/**
 * Wraps a route handler: same-origin check on writes, JSON responses, and
 * HttpError → status code. Anything else is logged and returned as a 500.
 */
export function route<P = Record<string, string>>(fn: Handler<P>) {
  return async (req: NextRequest, ctx: Ctx<P>) => {
    try {
      if (req.method !== "GET" && req.method !== "HEAD") {
        const origin = req.headers.get("origin");
        const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
        if (origin && host && new URL(origin).host !== host) fail(403, "Cross-site request blocked.");
      }
      const out = await fn(req, ctx);
      if (out instanceof Response) return out;
      return NextResponse.json(out ?? { ok: true }, { headers: { "Cache-Control": "no-store" } });
    } catch (e) {
      if (e instanceof HttpError) return NextResponse.json({ error: e.message, ...e.extra }, { status: e.status });
      console.error("[arrive]", req.method, req.nextUrl.pathname, e);
      // In showcase mode there is nothing secret to hide, so say what actually failed. That makes a broken deploy easy to diagnose.
      const cause = devOtpAllowed() ? ` (${e instanceof Error ? e.message : String(e)})`.slice(0, 260) : "";
      return NextResponse.json({ error: `Something went wrong on our side. Please try again.${cause}` }, { status: 500 });
    }
  };
}

export async function body<T extends Record<string, unknown>>(req: NextRequest): Promise<Partial<T>> {
  try {
    const j = await req.json();
    return j && typeof j === "object" ? (j as Partial<T>) : {};
  } catch {
    return {};
  }
}

export const str = (v: unknown, max = 500) => (typeof v === "string" ? v.trim().slice(0, max) : "");
export const int = (v: unknown) => (typeof v === "number" && Number.isInteger(v) ? v : typeof v === "string" && /^\d+$/.test(v) ? Number(v) : NaN);

/** Fixed-window, in-memory limiter. Good for one node; swap for Redis when scaling out. */
const hits = new Map<string, { n: number; reset: number }>();
export function limit(key: string, max: number, windowMs: number) {
  const t = Date.now();
  const h = hits.get(key);
  if (!h || h.reset < t) { hits.set(key, { n: 1, reset: t + windowMs }); return; }
  if (++h.n > max) fail(429, `Too many attempts. Try again in ${Math.ceil((h.reset - t) / 60_000)} min.`);
}

export const clientIp = (req: NextRequest) => req.headers.get("x-forwarded-for")?.split(",")[0].trim() || "local";
