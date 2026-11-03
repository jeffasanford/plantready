// Live job postings for a region from Adzuna (https://developer.adzuna.com).
// Needs ADZUNA_APP_ID and ADZUNA_APP_KEY in Vercel. Results are cached at Vercel's edge for 6 hours
// so we stay well under Adzuna's free limits.

const WHERE = {
  LA:  ["Lake Charles, Louisiana", "Baton Rouge, Louisiana", "New Orleans, Louisiana", "Cameron, Louisiana"],
  TXG: ["Houston, Texas", "Beaumont, Texas", "Corpus Christi, Texas", "Freeport, Texas"],
  PER: ["Midland, Texas", "Odessa, Texas", "Pecos, Texas", "Carlsbad, New Mexico"],
  MC:  ["Oklahoma", "Kansas"],
  OV:  ["Pittsburgh, Pennsylvania", "Ohio", "West Virginia"],
  GL:  ["Chicago, Illinois", "Whiting, Indiana", "Toledo, Ohio", "Detroit, Michigan"],
  CA:  ["Los Angeles, California", "Martinez, California", "Bakersfield, California"],
  PNW: ["Anacortes, Washington", "Bellingham, Washington", "Tacoma, Washington"],
  MSAL: ["Pascagoula, Mississippi", "Gulfport, Mississippi", "Mobile, Alabama"],
  EC: ["Linden, New Jersey", "Philadelphia, Pennsylvania", "Wilmington, Delaware", "Baltimore, Maryland", "Savannah, Georgia"]
};

const SEARCH = {
  plant: { what: "operator", what_or: "process refinery chemical plant lng petrochemical field board gas", what_exclude: "forklift cnc machine truck excavator call center" },
  ta:    { what_or: "turnaround shutdown outage pipefitter boilermaker millwright scaffold insulator rigger", what_exclude: "retail restaurant nurse sales store" },
  dc:    { what: "data center", what_or: "technician facilities critical operations engineer electrician mechanical", what_exclude: "sales software developer analyst recruiter" }
};

const clean = s => String(s || "").replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

export default async function handler(req, res) {
  const id = process.env.ADZUNA_APP_ID, key = process.env.ADZUNA_APP_KEY;
  if (!id || !key) return res.status(200).json({ code: "not_configured", jobs: [] });

  const region = WHERE[req.query.region] ? req.query.region : "LA";
  const track = SEARCH[req.query.track] ? req.query.track : "plant";
  const q = String(req.query.q || "").slice(0, 60).trim();

  const params = q ? { what: q } : SEARCH[track];
  try {
    const lists = await Promise.all(WHERE[region].map(async where => {
      const u = new URL("https://api.adzuna.com/v1/api/jobs/us/search/1");
      Object.entries({ app_id: id, app_key: key, results_per_page: "20", max_days_old: "30", sort_by: "date",
        where, distance: "60", "content-type": "application/json", ...params }).forEach(([k, v]) => u.searchParams.set(k, v));
      const r = await fetch(u);
      if (!r.ok) { console.error("Adzuna", r.status, (await r.text()).slice(0, 300)); return []; }
      return (await r.json()).results || [];
    }));
    const seen = new Set();
    const jobs = lists.flat()
      .filter(j => j && !seen.has(j.id) && seen.add(j.id))
      .map(j => ({
        id: String(j.id),
        title: clean(j.title),
        company: clean(j.company?.display_name),
        location: clean(j.location?.display_name),
        created: j.created,
        url: j.redirect_url,
        snippet: clean(j.description).slice(0, 600),
        salary: j.salary_is_predicted === "1" || j.salary_is_predicted === 1 ? null
          : (j.salary_min || j.salary_max) ? { min: j.salary_min, max: j.salary_max } : null
      }))
      .filter(j => j.title && j.url)
      .sort((a, b) => new Date(b.created) - new Date(a.created))
      .slice(0, 40);
    res.setHeader("Cache-Control", "s-maxage=21600, stale-while-revalidate=86400");
    res.status(200).json({ jobs, region, track, q });
  } catch (e) {
    console.error(e);
    res.status(502).json({ code: "error", jobs: [] });
  }
}
