// Starts a Stripe Checkout payment and sends the visitor to Stripe's payment page.
import { paywallOn, stripe } from "../lib/pass.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ code: "method" });
  if (!paywallOn()) return res.status(400).json({ code: "paywall_off" });
  const origin = process.env.SITE_URL || ("https://" + req.headers.host);
  try {
    const s = await stripe("checkout/sessions", {
      method: "POST",
      form: {
        mode: "payment",
        "line_items[0][price]": process.env.STRIPE_PRICE_ID,
        "line_items[0][quantity]": "1",
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
