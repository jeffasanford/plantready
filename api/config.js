// Tells the page whether payments are switched on and what to show as the price.
import { paywallOn, passDays } from "../lib/pass.js";

export default function handler(req, res) {
  res.status(200).json({
    paywall: paywallOn(),
    priceLabel: process.env.PRICE_LABEL || "$19",
    days: passDays(),
    aiReady: Boolean(process.env.ANTHROPIC_API_KEY)
  });
}
