// Plans, prices, Stripe helpers and signed access passes. No database needed.
import crypto from "node:crypto";

// ---- What you sell: monthly plans, cancel anytime. Amount is in cents. ----
// Stripe tax category: AI as a Service, cloud based, personal use (eligible for Stripe Managed Payments).
export const TAX_CODE = process.env.STRIPE_TAX_CODE || "txcd_10105001";
export const PRODUCTS = {
  resume: {
    name: "PlantReady Resume",
    description: "Build, rebuild, download and tailor your plant-ready resume. Billed monthly, cancel anytime.",
    amount: 999, label: "$9.99/mo",
    unlocks: ["build", "tailor"]
  },
  practice: {
    name: "PlantReady Interview Coaching",
    description: "Unlimited scored interview practice, including questions from your own resume. Billed monthly, cancel anytime.",
    amount: 499, label: "$4.99/mo",
    unlocks: ["grade", "question"]
  },
  both: {
    name: "PlantReady Resume + Coaching",
    description: "Everything in Resume and Interview Coaching. Billed monthly, cancel anytime.",
    amount: 1299, label: "$12.99/mo",
    unlocks: ["build", "tailor", "grade", "question"]
  }
};
const GRACE_MS = 2 * 86400e3;               // a little slack around renewal day
const LIVE = new Set(["active", "trialing"]);

export const paywallOn = () => Boolean(process.env.STRIPE_SECRET_KEY);
export const kindForTask = task => ["resume", "practice"].find(k => PRODUCTS[k].unlocks.includes(task)) || null;
// True if any pass the visitor holds unlocks this task.
export const canDo = (task, passes = {}) =>
  Object.keys(PRODUCTS).some(k => PRODUCTS[k].unlocks.includes(task) && checkPass(passes?.[k], k));

const secret = () => process.env.PASS_SECRET || process.env.STRIPE_SECRET_KEY || "";
const sign = data => crypto.createHmac("sha256", secret()).update(data).digest("base64url");

export function makePass(sid, kind, expAt) {
  const exp = expAt || Date.now() + 30 * 86400e3;
  const data = Buffer.from(JSON.stringify({ sid, kind, exp })).toString("base64url");
  return { kind, token: data + "." + sign(data), exp };
}

// Reads a pass we signed, even if it has expired (used to renew it). Returns null if forged.
export function readPass(token) {
  if (!token || typeof token !== "string" || !token.includes(".")) return null;
  const [data, sig] = token.split(".");
  const good = sign(data);
  if (!sig || sig.length !== good.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(good))) return null;
  try { return JSON.parse(Buffer.from(data, "base64url").toString()); } catch { return null; }
}

export function checkPass(token, kind) {
  const p = readPass(token);
  return !!p && p.kind === kind && p.exp > Date.now();
}

export async function stripe(path, { method = "GET", form } = {}) {
  const r = await fetch("https://api.stripe.com/v1/" + path, {
    method,
    headers: {
      Authorization: "Bearer " + String(process.env.STRIPE_SECRET_KEY || "").trim(),
      ...(form ? { "Content-Type": "application/x-www-form-urlencoded" } : {})
    },
    body: form ? new URLSearchParams(form).toString() : undefined
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error?.message || "Stripe error " + r.status);
  return j;
}

// When the current paid month ends, from a Stripe subscription (field moved in newer API versions).
const periodEnd = sub => (sub.current_period_end || sub.items?.data?.[0]?.current_period_end || 0) * 1000;

// Turns a live subscription into a pass, or null if it isn't active.
export function passFromSubscription(sub) {
  const kind = sub?.metadata?.kind;
  if (!sub || !PRODUCTS[kind] || !LIVE.has(sub.status)) return null;
  const end = periodEnd(sub);
  return makePass(sub.id, kind, (end || Date.now() + 30 * 86400e3) + GRACE_MS);
}

// Finds this plan's monthly Stripe price, creating the product (with its tax code) and price the first time.
export async function ensurePrice(kind) {
  const p = PRODUCTS[kind];
  const key = `plantready_${kind}_${p.amount}_monthly`;
  const find = async () => (await stripe(`prices?active=true&limit=1&lookup_keys[]=${encodeURIComponent(key)}`)).data?.[0]?.id;
  const existing = await find();
  if (existing) return existing;
  const product = await stripe("products", { method: "POST", form: { name: p.name, description: p.description, tax_code: TAX_CODE } });
  try {
    const price = await stripe("prices", { method: "POST", form: {
      product: product.id, unit_amount: String(p.amount), currency: "usd",
      "recurring[interval]": "month", lookup_key: key } });
    return price.id;
  } catch (e) {
    const again = await find();
    if (again) return again;
    throw e;
  }
}

export const bodyOf = req => (typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {}));
