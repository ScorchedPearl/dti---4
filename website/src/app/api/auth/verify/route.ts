import { verifyOtp } from "@/server/auth";
import { body, clientIp, fail, limit, route, str } from "@/server/http";

export const POST = route(async (req) => {
  limit(`verify:${clientIp(req)}`, 30, 10 * 60_000);
  const b = await body(req);
  const code = str(b.code, 6);
  if (!/^\d{6}$/.test(code)) fail(400, "The code has 6 digits.");
  await verifyOtp(str(b.josaa, 20), code);
  return { ok: true };
});
