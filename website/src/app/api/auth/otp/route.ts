import { maskPhone, requestOtp } from "@/server/auth";
import { body, clientIp, fail, limit, route, str } from "@/server/http";
import { devOtpAllowed, sendSms } from "@/server/sms";

export const POST = route(async (req) => {
  limit(`otp:${clientIp(req)}`, 12, 10 * 60_000);
  const b = await body(req);
  const josaa = str(b.josaa, 20), dob = str(b.dob, 12);
  if (!/^\d{12}$/.test(josaa.replace(/\s/g, ""))) fail(400, "The JoSAA application number has 12 digits.");
  if (!dob) fail(400, "Enter your date of birth.");
  const { code, phone } = requestOtp(josaa, dob);
  const sent = await sendSms(phone, `${code} is your IIITA ReadyPass sign-in code. It expires in 5 minutes. Do not share it.`);
  if (!sent && !devOtpAllowed()) fail(503, "We could not send the code right now. Try again in a minute.");
  return { phone: maskPhone(phone), devCode: sent ? undefined : code };
});
