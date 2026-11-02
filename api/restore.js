// "Restore purchase": finds a buyer's active subscriptions in Stripe by checkout email and re-issues passes.
import { paywallOn, PRODUCTS, makePass, passFromSubscription, stripe, bodyOf } from "../lib/pass.js";

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

  const typed = String(bodyOf(req).email || "").trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(typed) || typed.length > 200) return res.status(400).json({ code: "bad_email" });

  try {
    const sessions = new Map();
    for (const email of [...new Set([typed, typed.toLowerCase()])]) {
      const q = `checkout/sessions?limit=100&status=complete&customer_details[email]=${encodeURIComponent(email)}`;
      for (const s of (await stripe(q)).data || []) sessions.set(s.id, s);
    }
    const best = {};
    const keep = p => { if (p && (!best[p.kind] || p.exp > best[p.kind].exp)) best[p.kind] = p; };
    const subIds = new Set();
    for (const s of sessions.values()) {
      if (s.subscription) subIds.add(typeof s.subscription === "string" ? s.subscription : s.subscription.id);
      else if (s.payment_status === "paid" && PRODUCTS[s.metadata?.kind] && s.metadata.kind !== "both") {
        // older one-time purchases: 30 days for a resume, 5 for practice
        const days = s.metadata.kind === "practice" ? 5 : 30;
        const exp = s.created * 1000 + days * 86400e3;
        if (exp > Date.now()) keep(makePass(s.id, s.metadata.kind, exp));
      }
    }
    for (const id of [...subIds].slice(0, 10)) {
      try { keep(passFromSubscription(await stripe("subscriptions/" + id))); } catch (e) { console.error(e); }
    }
    const passes = Object.values(best);
    if (!passes.length) return res.status(404).json({ code: "none_found" });
    res.status(200).json({ passes });
  } catch (e) {
    console.error(e);
    res.status(502).json({ code: "stripe_error", detail: String(e.message).slice(0, 200) });
  }
}
