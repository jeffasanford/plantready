// Products, prices and signed access passes. No database needed.
import crypto from "node:crypto";

// ---- What you sell. Change prices here (amount is in cents). ----
// Stripe tax category: AI as a Service, cloud based, personal use (eligible for Stripe Managed Payments).
export const TAX_CODE = process.env.STRIPE_TAX_CODE || "txcd_10105001";
export const PRODUCTS = {
  resume: {
    name: "PlantReady resume",
    description: "Your finished plant-ready resume, plus tailoring to job postings for 30 days",
    amount: 5000, label: "$50", days: 30,
    unlocks: ["build", "tailor"]
  },
  practice: {
    name: "PlantReady interview practice (5 days)",
    description: "Unlimited scored interview practice with feedback for 5 days",
    amount: 2000, label: "$20", days: 5,
    unlocks: ["grade"]
  }
};

export const paywallOn = () => Boolean(process.env.STRIPE_SECRET_KEY);
export const kindForTask = task => Object.keys(PRODUCTS).find(k => PRODUCTS[k].unlocks.includes(task)) || null;

const secret = () => process.env.PASS_SECRET || process.env.STRIPE_SECRET_KEY || "";
const sign = data => crypto.createHmac("sha256", secret()).update(data).digest("base64url");

export function makePass(sessionId, kind) {
  const exp = Date.now() + PRODUCTS[kind].days * 24 * 60 * 60 * 1000;
  const data = Buffer.from(JSON.stringify({ sid: sessionId, kind, exp })).toString("base64url");
  return { kind, token: data + "." + sign(data), exp };
}

export function checkPass(token, kind) {
  if (!token || typeof token !== "string" || !token.includes(".")) return false;
  const [data, sig] = token.split(".");
  const good = sign(data);
  if (!sig || sig.length !== good.length) return false;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return false;
  try {
    const p = JSON.parse(Buffer.from(data, "base64url").toString());
    return p.kind === kind && p.exp > Date.now();
  } catch { return false; }
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
