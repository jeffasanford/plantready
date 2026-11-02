// "Restore purchase": finds a buyer's recent paid checkouts in Stripe by email and re-issues their passes.
import { paywallOn, PRODUCTS, makePass, stripe } from "../lib/pass.js";

const hits = new Map();
function limited(ip) {                       // at most 8 tries per visitor per hour
  const now = Date.now();
  const list = (hits.get(ip) || []).filter(t => now - t < 3600e3);
  list.push(now); hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > 8;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ code: "method" });
  if (!paywallOn()) return res.status(400).json({ code: "paywall_off" });
  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (limited(ip)) return res.status(429).json({ code: "rate_limited" });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const typed = String(body.email || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(typed) || typed.length > 200) return res.status(400).json({ code: "bad_email" });

  const maxDays = Math.max(...Object.values(PRODUCTS).map(p => p.days));
  const since = Math.floor(Date.now() / 1000) - maxDays * 86400;
  try {
    const seen = new Map();
    for (const email of [...new Set([typed, typed.toLowerCase()])]) {
      const q = `checkout/sessions?limit=100&status=complete&created[gte]=${since}&customer_details[email]=${encodeURIComponent(email)}`;
      for (const s of (await stripe(q)).data || []) seen.set(s.id, s);
    }
    const best = {};
    for (const s of seen.values()) {
      const kind = s.metadata?.kind;
      if (s.payment_status !== "paid" || !PRODUCTS[kind]) continue;
      const exp = s.created * 1000 + PRODUCTS[kind].days * 86400e3;
      if (exp > Date.now() && (!best[kind] || exp > best[kind].exp)) best[kind] = { id: s.id, exp };
    }
    const passes = Object.entries(best).map(([kind, b]) => makePass(b.id, kind, b.exp));
    if (!passes.length) return res.status(404).json({ code: "none_found" });
    res.status(200).json({ passes });
  } catch (e) {
    console.error(e);
    res.status(502).json({ code: "stripe_error", detail: String(e.message).slice(0, 200) });
  }
}
