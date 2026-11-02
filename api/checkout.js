// Starts a Stripe Checkout for a monthly plan and sends the visitor to Stripe.
import { paywallOn, PRODUCTS, ensurePrice, stripe, bodyOf } from "../lib/pass.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ code: "method" });
  if (!paywallOn()) return res.status(400).json({ code: "paywall_off" });
  const kind = String(bodyOf(req).kind || "");
  if (!PRODUCTS[kind]) return res.status(400).json({ code: "bad_product" });
  const origin = process.env.SITE_URL || ("https://" + req.headers.host);
  try {
    const s = await stripe("checkout/sessions", {
      method: "POST",
      form: {
        mode: "subscription",
        "line_items[0][price]": await ensurePrice(kind),
        "line_items[0][quantity]": "1",
        "metadata[kind]": kind,
        "subscription_data[metadata][kind]": kind,
        allow_promotion_codes: "true",
        success_url: origin + "/?paid={CHECKOUT_SESSION_ID}",
        cancel_url: origin + "/?canceled=1"
      }
    });
    res.status(200).json({ url: s.url });
  } catch (e) {
    console.error(e);
    res.status(502).json({ code: "stripe_error", detail: String(e.message).slice(0, 200) });
  }
}
