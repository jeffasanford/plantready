// Tells the page whether payments are on, and what each product costs.
import { paywallOn, PRODUCTS } from "../lib/pass.js";

export default function handler(req, res) {
  const products = Object.fromEntries(Object.entries(PRODUCTS).map(([k, p]) =>
    [k, { name: p.name, label: p.label, days: p.days, unlocks: p.unlocks }]));
  res.status(200).json({
    paywall: paywallOn(),
    products,
    aiReady: Boolean(process.env.ANTHROPIC_API_KEY)
  });
}
