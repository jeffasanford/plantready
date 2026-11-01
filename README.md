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
| `lib/pass.js` | Shared payment helper |

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

## Turning on payments (Stripe)

Interview questions stay free. Building the resume, scored practice and tailoring need a paid pass. Until both Stripe settings below are added, the whole site stays free.

1. Sign up at stripe.com and finish account setup (business info and bank account).
2. **Product catalog → Add product**: name it "PlantReady 30-day access", choose **One-off**, set the price (for example $19), and save. Open the price and copy its ID (starts with `price_`).
3. **Developers → API keys**: copy the **Secret key** (starts with `sk_live_`, or `sk_test_` while testing).
4. In Vercel → **Settings → Environment Variables**, add:
   - `STRIPE_SECRET_KEY`: your secret key
   - `STRIPE_PRICE_ID`: your price ID
   - `PRICE_LABEL`: what the site shows, for example `$19`
   - `PASS_SECRET`: any long random phrase only you know (it signs access passes)
   - Optional `PASS_DAYS`: how long access lasts, default `30`
   - Optional `SITE_URL`: `https://www.plantready.net`
5. Redeploy.

Test first with Stripe's test mode keys and card number 4242 4242 4242 4242, any future date and any CVC. Switch to live keys when it works.

Access is saved on the buyer's device. If someone switches phones or clears their browser, look up their payment in Stripe and give them a refund or a promo code to buy again free.
