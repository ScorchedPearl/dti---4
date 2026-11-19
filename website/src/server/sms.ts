import "server-only";

/**
 * Outbound SMS. Point SMS_WEBHOOK_URL at your provider (MSG91, Twilio, Gupshup or a small
 * relay) and it receives POST {to, text}. Without it, nothing leaves the server and the
 * caller decides whether to show the code on screen (development only).
 */
export async function sendSms(to: string, text: string): Promise<boolean> {
  const url = process.env.SMS_WEBHOOK_URL;
  if (!url) {
    if (process.env.NODE_ENV !== "production") console.info(`[arrive:sms] to …${to.slice(-4)}: ${text}`);
    return false;
  }
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(process.env.SMS_WEBHOOK_TOKEN ? { Authorization: `Bearer ${process.env.SMS_WEBHOOK_TOKEN}` } : {}) },
    body: JSON.stringify({ to: `+91${to}`, text }),
  });
  return r.ok;
}

/**
 * Prototype mode: when no SMS provider delivers the code, show it on screen, in development and
 * in production, so the whole workflow can be demonstrated on a deployed site. Set
 * ARRIVE_DEV_OTP=0 to switch this off once a real SMS provider is configured.
 */
export const devOtpAllowed = () => process.env.ARRIVE_DEV_OTP !== "0";
