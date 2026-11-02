// Renews passes after a monthly billing date: checks each subscription is still active.
import { paywallOn, readPass, passFromSubscription, stripe, bodyOf } from "../lib/pass.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ code: "method" });
  if (!paywallOn()) return res.status(400).json({ code: "paywall_off" });
  const tokens = Object.values(bodyOf(req).passes || {}).filter(t => typeof t === "string").slice(0, 3);
  const passes = [], ended = [];
  for (const t of tokens) {
    const p = readPass(t);
    if (!p || !/^sub_/.test(String(p.sid))) continue;       // only subscriptions can renew
    try {
      const fresh = passFromSubscription(await stripe("subscriptions/" + p.sid));
      if (fresh) passes.push(fresh); else ended.push(p.kind);
    } catch (e) { console.error(e); }
  }
  res.status(200).json({ passes, ended });
}
