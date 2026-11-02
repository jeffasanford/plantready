// Starts a Stripe Checkout payment for one product and sends the visitor to Stripe.
import { paywallOn, PRODUCTS, ensurePrice, stripe } from "../lib/pass.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ code: "method" });
  if (!paywallOn()) return res.status(400).json({ code: "paywall_off" });
  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  const kind = String(body.kind || "");
  const p = PRODUCTS[kind];
  if (!p) return res.status(400).json({ code: "bad_product" });
  const origin = process.env.SITE_URL || ("https://" + req.headers.host);
  try {
    const s = await stripe("checkout/sessions", {
      method: "POST",
      form: {
        mode: "payment",
        "line_items[0][price]": await ensurePrice(kind),
        "line_items[0][quantity]": "1",
        "metadata[kind]": kind,
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
