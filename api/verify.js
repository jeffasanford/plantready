// After Stripe sends the visitor back, confirm the subscription is active and give them a pass.
import { paywallOn, passFromSubscription, stripe, bodyOf } from "../lib/pass.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ code: "method" });
  if (!paywallOn()) return res.status(400).json({ code: "paywall_off" });
  const id = String(bodyOf(req).session_id || "");
  if (!/^cs_[A-Za-z0-9_]+$/.test(id)) return res.status(400).json({ code: "bad_session" });
  try {
    const s = await stripe("checkout/sessions/" + id + "?expand[]=subscription");
    if (s.status !== "complete" || !s.subscription) return res.status(402).json({ code: "not_paid" });
    const sub = typeof s.subscription === "string" ? await stripe("subscriptions/" + s.subscription) : s.subscription;
    const pass = passFromSubscription(sub);
    if (!pass) return res.status(402).json({ code: "not_active" });
    res.status(200).json(pass);
  } catch (e) {
    console.error(e);
    res.status(502).json({ code: "stripe_error", detail: String(e.message).slice(0, 200) });
  }
}
