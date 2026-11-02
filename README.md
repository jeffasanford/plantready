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

## Payments (Stripe)

Interview questions are free. Two things are paid:

| Product | Price | Unlocks |
|---|---|---|
| Resume | $50 one time | Building the finished resume, plus rebuilding and tailoring for 30 days |
| Interview practice | $20 one time | Scored practice answers for 5 days |

Prices, names and day counts live at the top of `lib/pass.js` (amount is in cents). No products need to be created in Stripe.

To turn payments on, add one setting in Vercel → Settings → Environment Variables:
- `STRIPE_SECRET_KEY`: your Stripe secret key (`sk_test_…` while testing, `sk_live_…` for real money)

Optional: `PASS_SECRET` (a long random phrase that signs access passes; if you set it, never change it or existing buyers lose access) and `SITE_URL` (`https://www.plantready.net`).

Test with card 4242 4242 4242 4242, any future date and any CVC.

Access is saved on the buyer's device. If they clear their browser or switch phones, they tap **Restore purchase** and enter their checkout email (`api/restore.js` looks it up in Stripe). Anyone who knows a buyer's email can restore that purchase, which the privacy page and the checkout notice both say.

## Live job postings (Adzuna)

"Who's hiring" shows real postings from the last 30 days when these are set in Vercel:
- `ADZUNA_APP_ID` and `ADZUNA_APP_KEY` from developer.adzuna.com

Without them, the Latest openings box stays hidden and the employer list still works. Results are cached for 6 hours per region. Search words and locations per region are at the top of `api/jobs.js`. Adzuna requires the "Jobs by Adzuna" credit on the page, and its terms allow commercial use for a trial period before a license is needed.
