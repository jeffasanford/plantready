# PlantReady website

AI resume builder, interview practice and hiring lists for plant and turnaround workers, by region.

## What's in here

| File | What it does |
|---|---|
| `index.html` | The whole website people see |
| `api/ai.js` | Small server program that talks to Claude using your secret API key |
| `privacy.html` | Privacy page (fill in the [brackets]) |
| `package.json` | Tells the host which Node version to use |
| `api/checkout.js`, `api/verify.js`, `api/config.js` | Stripe payments and the access pass |
| `lib/pass.js` | Products, prices and the access pass |
| `api/restore.js` | Restore purchase by checkout email |
| `api/refresh.js`, `api/portal.js` | Monthly renewal check, and Manage or cancel |
| `testimonials.json` | Approved worker stories shown on the site |
| `api/jobs.js` | Live job postings from Adzuna (needs `ADZUNA_APP_ID` and `ADZUNA_APP_KEY`) |
| `export.js` | Makes the PDF and Word resume downloads in the buyer's browser |

## Going live (about 30 minutes)

1. **Anthropic API key**: at console.anthropic.com, sign up, add a payment method, set a monthly spend limit (start at $25), and create an API key. Copy it somewhere safe.
2. **GitHub**: at github.com, create a free account and a new private repository named `plantready`. Use "uploading an existing file" and drag in everything from this folder, keeping the `api` folder.
3. **Vercel**: at vercel.com, sign up with your GitHub account. Click Add New → Project, pick `plantready`, and before deploying open Environment Variables and add:
   - Name `ANTHROPIC_API_KEY`, value: your key from step 1
4. Click **Deploy**. Vercel gives you a free address like `plantready.vercel.app`. Test it on your phone.
5. **Domain**: buy your domain (Cloudflare, Porkbun or Namecheap), then in Vercel go to Project → Settings → Domains, add it, and copy the DNS records Vercel shows into your registrar.

## Changing things later

- **Edit text or employer lists**: open `index.html` on GitHub, click the pencil, edit, and commit. Vercel redeploys automatically in about a minute.
- **Regions** live in the `REGIONS` and `EMPLOYERS` blocks in `index.html`. Add the region's one-line context to `REGIONS` in `api/ai.js` too.
- **Models**: optional environment variables `QUICK_MODEL` (default `claude-haiku-5-5`) and `SMART_MODEL` (default `claude-sonnet-5-5`).
- **Rate limit**: optional `RATE_LIMIT` (default 60 AI requests per visitor per 10 minutes).

## Keeping costs safe

- Your key never reaches the browser; only `api/ai.js` uses it.
- The server only runs PlantReady's four built-in tasks, so nobody can use your key as a free chatbot.
- The spending limit in the Anthropic console is your hard ceiling. Check usage there weekly at first.

## Payments (Stripe): monthly plans

Interview questions and job listings are free. Three monthly plans, cancel anytime:

| Plan | Price | Unlocks |
|---|---|---|
| Resume | $9.99/mo | Build, rebuild, download and tailor the resume |
| Interview coaching | $4.99/mo | Scored practice, including questions from your own resume |
| Resume + coaching | $12.99/mo | Everything |

Prices live at the top of `lib/pass.js` (amount in cents). Products and monthly prices are created in Stripe automatically on first checkout.

- Turn on with `STRIPE_SECRET_KEY` in Vercel.
- **Manage or cancel** uses Stripe's customer portal. Turn it on once in Stripe: Settings → Billing → Customer portal → Save (do it in test mode and live mode).
- Passes renew automatically: when a month rolls over, the site checks Stripe and keeps access on if the subscription is still active (`api/refresh.js`).
- Restore purchase finds active subscriptions by checkout email (`api/restore.js`).

## Worker stories

Customers write stories in the "Share your story" section; it opens an email to management@aspisllc.com. To post an approved story, add it to `testimonials.json`:

```json
[{ "name": "Marcus", "trade": "Process operator", "area": "Lake Charles, LA", "rating": 5, "text": "..." }]
```
Only post real stories from customers who checked the permission box.

## Live job postings (Adzuna)

"Who's hiring" shows real postings from the last 30 days when these are set in Vercel:
- `ADZUNA_APP_ID` and `ADZUNA_APP_KEY` from developer.adzuna.com

Without them, the Latest openings box stays hidden and the employer list still works. Results are cached for 6 hours per region. Search words and locations per region are at the top of `api/jobs.js`. Adzuna requires the "Jobs by Adzuna" credit on the page, and its terms allow commercial use for a trial period before a license is needed.
