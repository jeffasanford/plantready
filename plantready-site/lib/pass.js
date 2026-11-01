// Signed access pass: proves a visitor paid, without needing a database.
import crypto from "node:crypto";

const secret = () => process.env.PASS_SECRET || process.env.STRIPE_SECRET_KEY || "";

export const paywallOn = () => Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PRICE_ID);
export const passDays = () => Number(process.env.PASS_DAYS || 30);

const b64 = s => Buffer.from(s).toString("base64url");
const sign = data => crypto.createHmac("sha256", secret()).update(data).digest("base64url");

export function makePass(sessionId) {
  const exp = Date.now() + passDays() * 24 * 60 * 60 * 1000;
  const data = b64(JSON.stringify({ sid: sessionId, exp }));
  return { token: data + "." + sign(data), exp };
}

export function checkPass(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return false;
  const [data, sig] = token.split(".");
  const good = sign(data);
  if (!sig || sig.length !== good.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return false;
  try { return JSON.parse(Buffer.from(data, "base64url").toString()).exp > Date.now(); }
  catch { return false; }
}

export async function stripe(path, { method = "GET", form } = {}) {
  const r = await fetch("https://api.stripe.com/v1/" + path, {
    method,
    headers: {
      Authorization: "Bearer " + process.env.STRIPE_SECRET_KEY,
      ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {})
    },
    body: form ? new URLSearchParams(form).toString() : undefined
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || "Stripe error " + r.status);
  return j;
}
