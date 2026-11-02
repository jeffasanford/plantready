// "Manage or cancel": opens Stripe's billing page for the visitor's subscription.
import { paywallOn, readPass, stripe, bodyOf } from "../lib/pass.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ code: "method" });
  if (!paywallOn()) return res.status(400).json({ code: "paywall_off" });
  const tokens = Object.values(bodyOf(req).passes || {}).filter(t => typeof t === "string");
  const sid = tokens.map(readPass).find(p => p && /^sub_/.test(String(p.sid)))?.sid;
  if (!sid) return res.status(404).json({ code: "no_subscription" });
  const origin = process.env.SITE_URL || ("https://" + req.headers.host);
  try {
    const sub = await stripe("subscriptions/" + sid);
    const s = await stripe("billing_portal/sessions", { method: "POST", form: { customer: sub.customer, return_url: origin + "/" } });
    res.status(200).json({ url: s.url });
  } catch (e) {
    console.error(e);
    res.status(502).json({ code: "portal_error", detail: String(e.message).slice(0, 200) });
  }
}
