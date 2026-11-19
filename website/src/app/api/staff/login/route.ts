import { staffLogin } from "@/server/auth";
import { body, clientIp, fail, limit, route, str } from "@/server/http";

export const POST = route(async (req) => {
  limit(`staff-login:${clientIp(req)}`, 10, 10 * 60_000);
  const b = await body(req);
  const email = str(b.email, 120), password = str(b.password, 200);
  if (!email || !password) fail(400, "Enter your email and password.");
  await staffLogin(email, password);
});
