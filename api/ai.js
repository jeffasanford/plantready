// PlantReady AI endpoint (Vercel serverless function).
// The browser sends a task name plus the worker's answers. All prompts live here,
// so your Anthropic API key can only be used for PlantReady's four jobs.

import { paywallOn, canDo, kindForTask } from "../lib/pass.js";
// Interview questions ("ask") stay free. Prices and what each pass unlocks live in lib/pass.js.
const API_URL = "https://api.anthropic.com/v1/messages";
const QUICK_MODEL = process.env.QUICK_MODEL || "claude-haiku-5-5";   // interview questions
const SMART_MODEL = process.env.SMART_MODEL || "claude-sonnet-5-5";  // resumes, scoring, tailoring

const REGIONS = {
  LA: "Louisiana: LNG export terminals (Cameron Parish, Plaquemines), Mississippi River refineries and chemical plants (Baton Rouge, Geismar, Norco), Lake Charles petrochemicals. Common site safety card: Basic Plus.",
  TXG: "Texas Gulf Coast: Houston Ship Channel, Beaumont–Port Arthur, Freeport and Corpus Christi refineries, chemical plants and LNG terminals. Common site safety card: Basic Plus.",
  PER: "Permian Basin (West Texas and southeast New Mexico): cryogenic gas processing plants, compressor stations, pipelines, a few refineries. Remote sites, long commutes, sour gas so H2S awareness is critical.",
  MC: "Mid-Continent (Oklahoma and Kansas): mid-size refineries, gas processing and fertilizer plants.",
  OV: "Ohio River Valley (PA, OH, WV): Marcellus/Utica gas processing and fractionation, an ethane cracker, chemical plants along the river. Cold winters; many crafts are union.",
  GL: "Great Lakes (IL, IN, OH, MI): large refineries around Chicago, NW Indiana, Toledo and Detroit, chemical plants. Heavily union crafts; winterization and cold-weather work.",
  CA: "California: Bay Area and Los Angeles refineries under Cal/OSHA's refinery process safety management rules, strict air-quality rules; heavily union crafts.",
  PNW: "Pacific Northwest (Washington): refineries at Anacortes, Ferndale/Blaine and Tacoma; small, tight-knit market; union crafts common.",
  MSAL: "Mississippi and Alabama Gulf Coast: Chevron's Pascagoula refinery, smaller refineries in Mobile (Saraland), Vicksburg and Tuscaloosa, the chemical corridor around Mobile, and shipyards and fabrication yards along the coast. Hurricane season matters. Common site safety card: Basic Plus.",
  EC: "East Coast: refineries at Linden and Paulsboro, NJ, Trainer, PA, and Delaware City, DE; LNG terminals at Cove Point, MD, and Elba Island near Savannah, GA; chemical plants in Delaware and New Jersey. Crafts are heavily union; cold winters and winter outages."
};

// ---- simple per-visitor rate limit (best effort; resets when the server restarts) ----
const hits = new Map();
const LIMIT = Number(process.env.RATE_LIMIT || 60);   // requests
const WINDOW_MS = 10 * 60 * 1000;                     // per 10 minutes
function limited(ip) {
  const now = Date.now();
  const list = (hits.get(ip) || []).filter(t => now - t < WINDOW_MS);
  list.push(now);
  hits.set(ip, list);
  if (hits.size > 5000) hits.clear();
  return list.length > LIMIT;
}

const clip = (s, n) => String(s ?? "").slice(0, n);
const transcriptOf = turns =>
  (Array.isArray(turns) ? turns : []).slice(-60)
    .map(t => (t.role === "assistant" ? "Interviewer: " : "Candidate: ") + clip(t.content, 2000))
    .join("\n\n");

// What changes per work type: who's interviewing, what to ask, what hiring managers value.
const TRACKS = {
  plant: {
    label: "full-time plant job",
    interviewer: "shift supervisor",
    resumeFor: "process plant",
    terms: "correct plant terms (outside rounds, permit-to-work, LOTO, DCS, startup, turnaround, blinds, bolt-up, confined space, fire watch)",
    translate: "",
    screener: "hiring panel member for process operator jobs",
    asker: "hiring panel member interviewing a process operator candidate",
    values: "stopping unsafe work, communicating with the control room and supervisor, following procedures and permits, owning mistakes, showing up, and teamwork",
    cover: "target role; name and city; each past job (company, title, dates); for plant jobs, which units/equipment, board (DCS) vs outside, permits issued, lockout/tagout, startups, shutdowns, turnarounds; for non-plant jobs, transferable skills (safety, mechanical, shift work, leadership); certifications (TWIC, OSHA 10/30, process technology degree, others); education"
  },
  ta: {
    label: "turnaround / shutdown contract work (also construction crafts)",
    interviewer: "turnaround general foreman",
    resumeFor: "turnaround / shutdown contract",
    terms: "correct plant terms (outside rounds, permit-to-work, LOTO, DCS, startup, turnaround, blinds, bolt-up, confined space, fire watch)",
    translate: "",
    screener: "turnaround superintendent screening contract craft hands by phone",
    asker: "turnaround superintendent screening a contract craft hand by phone",
    values: "stopping unsafe work, respecting permits and scaffold tags, verifying isolation, quality work the first time, showing up every shift, staying sharp on long rotations, and teamwork",
    cover: "craft and target position; name and home city; start date; travel range and willingness to work nights and 12s/7-on; each turnaround or construction job worked (site or plant type, rough dates, contractor, role, scope); regular employers and dates; safety tickets and badges (TWIC, local site safety card, OSHA 10/30, H2S, respirator fit test, confined space, crane or forklift cards, weld tests, union card if any); education"
  },
  dc: {
    label: "data center operations (critical facilities)",
    interviewer: "data center critical facilities manager who came up through plant operations",
    resumeFor: "data center operations (critical facilities technician)",
    terms: "correct data center terms (MOPs/SOPs/EOPs, switchgear, ATS, UPS, generators, chilled water, cooling towers, CRAH/CRAC, BMS/EPMS, LOTO, arc flash/NFPA 70E, CMMS, preventive maintenance, uptime)",
    translate: "Where the candidate's plant or industrial experience genuinely maps to data center work, phrase it the way data center hiring managers read it (for example: written switching or startup procedures → working to MOPs/SOPs; DCS or SCADA monitoring → monitoring through a BMS/EPMS-style system; PM work orders → CMMS preventive maintenance). Never claim data center equipment, voltages or systems they didn't describe.",
    screener: "critical facilities manager hiring data center technicians",
    asker: "critical facilities manager interviewing a data center technician candidate who comes from plants",
    values: "following written procedures (MOPs) exactly, protecting uptime, escalating early, electrical safety and arc flash awareness, change management, clear shift handover and documentation, and teamwork",
    cover: "target role (critical facilities technician, data center technician, electrical or mechanical tech, facility operations engineer); name and city; each past job (company, title, dates); electrical work (switchgear, breakers, transfer switches, voltages, switching under written procedures); backup power (generators, UPS, batteries); cooling (chillers, cooling towers, pumps, air handlers); controls and monitoring (DCS, SCADA, BMS); LOTO and permits; preventive maintenance and work orders; alarm and emergency response; shift work; certifications (OSHA 10/30, NFPA 70E, EPA 608, electrical license, TWIC, process technology degree, others); education"
  }
};
const trackOf = t => TRACKS[t] || TRACKS.plant;

function context(region, track) {
  return `Region: ${REGIONS[region] || REGIONS.LA}\nWork type: ${trackOf(track).label}`;
}

function buildPrompt(b) {
  const T = trackOf(b.track);
  const ctx = context(b.region, b.track);
  const transcript = transcriptOf(b.turns);

  if (b.task === "ask") {
    const cover = T.cover;
    return { model: QUICK_MODEL, max_tokens: 2000, json: false, prompt:
`You are an interviewer for PlantReady, helping workers write resumes for ${T.resumeFor} jobs. Talk like a friendly, experienced ${T.interviewer} from this region.

${ctx}

Rules:
- Ask exactly ONE short question per reply (1–3 sentences). No lists.
- Cover, roughly in order: ${cover}.
- Use the region's real context when it helps (its plant types, weather, local safety cards), but never claim specific facts about a named plant or site.
- Ask a follow-up when an answer is vague.
- Never suggest experience the candidate didn't mention.
- Once you have enough for a resume, reply only: "I've got enough to build your resume. Tap Build my resume, or tell me anything else you want added."

Conversation so far:
${transcript}

Write the interviewer's next reply only.` };
  }

  if (b.task === "build") {
    return { model: SMART_MODEL, max_tokens: 8000, json: true, prompt:
`Write a resume for a ${T.resumeFor} job from this interview. Use ONLY facts the candidate stated. Never invent employers, sites, dates, certifications, numbers or skills. If something is missing, use an empty string or empty array. Rewrite the candidate's words into strong, plain bullets using ${T.terms} only where the candidate described that work. ${T.translate}

${ctx}

Interview:
${transcript}

Return ONLY JSON with exactly these keys:
{"name":"","headline":"target role in under 8 words","contact":"city and any contact info stated","available":"start date or empty","travel":"travel range or empty","schedule":"shifts/rotation or empty","summary":"2 sentences","turnarounds":[{"site":"","dates":"","role":"","scope":"one short line"}],"skills":["up to 8 short skills"],"experience":[{"title":"","company":"","dates":"","bullets":["2-4 bullets"]}],"certifications":[""],"education":[""]}` };
  }

  if (b.task === "grade") {
    return { model: SMART_MODEL, max_tokens: 4000, json: true, prompt:
`You are a ${T.screener}. Score a candidate's interview answer.

${ctx}

Question (${clip(b.category, 60)}): ${clip(b.question, 500)}
Candidate's answer: ${clip(b.answer, 4000)}

Scoring, 1–5: 1 = unsafe or off-topic; 2 = vague; 3 = acceptable but missing specifics or outcome; 4 = clear, specific, safety-minded; 5 = specific situation, clear actions, safety and communication shown, result stated.
Hiring managers value: ${T.values}.

Be direct and encouraging, in plain language. For "better", rewrite the candidate's OWN answer into a stronger spoken answer of 3–5 sentences. Use only facts they gave; put [brackets] where they should add their own real details. Never invent experience.

Return ONLY JSON: {"score":3,"verdict":"one sentence","strengths":["1-2 items"],"improve":["2-3 specific items"],"better":"..."}` };
  }

  if (b.task === "question") {
    const asked = (Array.isArray(b.asked) ? b.asked : []).slice(-15).map(q => "- " + clip(q, 300)).join("\n") || "(none yet)";
    return { model: QUICK_MODEL, max_tokens: 2000, json: true, prompt:
`You are a ${T.asker}. Write ONE interview question tailored to this candidate's own resume.

${ctx}

Candidate's resume (JSON):
${clip(JSON.stringify(b.resume || {}), 8000)}

Questions already asked (do not repeat or closely rephrase):
${asked}

Rules:
- Ask about something specific on the resume: a named job, unit, piece of equipment, turnaround, ticket, or a gap or career change.
- Mix the type: behavioral ("tell me about a time…"), technical ("walk me through…"), or safety scenario ("what would you do if…").
- One or two sentences, spoken plainly, the way a real interviewer would ask it.
- Never invent experience the resume doesn't show; if the resume is thin, ask about what's there or about their target role.

Return ONLY JSON: {"c":"2-4 word topic label","q":"the question"}` };
  }

  if (b.task === "tailor") {
    return { model: SMART_MODEL, max_tokens: 10000, json: true, prompt:
`Tailor a plant worker's resume to a specific job posting.

STRICT RULES: Use ONLY facts already in the resume. Never add employers, sites, dates, certifications, equipment or skills the resume does not contain. You may reorder, rewrite the headline and summary, and reword bullets to use the posting's exact terms where the candidate's real experience matches.

${ctx}
Employer: ${clip(b.employer, 120)}
Job posting:
${clip(b.posting, 12000)}

Current resume (JSON):
${clip(JSON.stringify(b.resume || {}), 12000)}

Return ONLY JSON:
{"fit":"Strong|Partial|Weak","fitNote":"one sentence on how well the resume fits","matched":["up to 8 requirements the resume already shows"],"gaps":["up to 5 requirements the resume does not show"],"resume":{same keys as the current resume, tailored}}` };
  }
  return null;
}

function parseJson(text) {
  const start = text.indexOf("{"), end = text.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("no json");
  return JSON.parse(text.slice(start, end + 1));
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ code: "method" });
  if (!process.env.ANTHROPIC_API_KEY) return res.status(500).json({ code: "not_configured" });

  const ip = (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || "unknown";
  if (limited(ip)) return res.status(429).json({ code: "rate_limited" });

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
  if (JSON.stringify(body).length > 60000) return res.status(413).json({ code: "too_long" });

  const job = buildPrompt(body);
  if (!job) return res.status(400).json({ code: "bad_task" });
  const need = kindForTask(body.task);
  if (paywallOn() && need && !canDo(body.task, body.passes)) {
    return res.status(402).json({ code: "payment_required", kind: need });
  }

  try {
    const call = async () => {
      const r = await fetch(API_URL, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-api-key": process.env.ANTHROPIC_API_KEY,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: job.model,
          max_tokens: job.max_tokens,
          messages: [{ role: "user", content: job.prompt }]
        })
      });
      if (!r.ok) return { r };
      const data = await r.json();
      const text = (data.content || []).filter(c => c.type === "text").map(c => c.text).join("").trim();
      return { r, data, text };
    };
    // One automatic retry if the reply comes back empty, cut off, or unreadable.
    let out, result, lastErr = "";
    for (let attempt = 0; attempt < 2; attempt++) {
      out = await call();
      const { r } = out;
      if (r.status === 429 || r.status === 529) return res.status(429).json({ code: "rate_limited" });
      if (!r.ok) {
        const raw = await r.text();
        console.error("Anthropic error", r.status, raw);
        let msg = "";
        try { msg = JSON.parse(raw)?.error?.message || ""; } catch {}
        return res.status(502).json({ code: "upstream", status: r.status, detail: msg.slice(0, 200) });
      }
      const stop = out.data.stop_reason;
      if (!out.text || (stop === "max_tokens" && !job.json)) { lastErr = `empty reply (stop: ${stop})`; console.error(lastErr); continue; }
      try { result = job.json ? parseJson(out.text) : out.text; break; }
      catch { lastErr = `unreadable reply (stop: ${stop})`; console.error(lastErr, out.text.slice(0, 300)); }
    }
    if (result === undefined) return res.status(502).json({ code: "empty", detail: lastErr });
    return res.status(200).json({ result });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ code: "error", detail: String(e?.message || e).slice(0, 200) });
  }
}
