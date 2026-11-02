// After Stripe sends the visitor back, confirm they paid and give them an access pass.
import { paywallOn, PRODUCTS, makePass, stripe } from "../lib/pass.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ code: "method" });
  if (!paywallOn()) return res.status(400).json({ code: "paywall_off" });
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const id = String(body.session_id || "");
  if (!/^cs_[A-Za-z0-9_]+$/.test(id)) return res.status(400).json({ code: "bad_session" });
  try {
    const s = await stripe("checkout/sessions/" + id);
    if (s.payment_status !== "paid") return res.status(402).json({ code: "not_paid" });
    const kind = s.metadata?.kind;
    if (!PRODUCTS[kind]) return res.status(400).json({ code: "bad_product" });
    if ((Date.now() / 1000 - s.created) / 86400 > 2) return res.status(400).json({ code: "expired_link" });
    res.status(200).json(makePass(id, kind));
  } catch (e) {
    console.error(e);
    res.status(502).json({ code: "stripe_error", detail: String(e.message).slice(0, 200) });
  }
}
