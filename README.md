# PriceTracker

A lightweight, serverless price tracking app built with Next.js, MongoDB Atlas, and ntfy push notifications. Fully deployable on **Vercel free tier** + **MongoDB Atlas free tier**.

## Features

- **Track any product** — add a URL + CSS selector to extract the price from any webpage
- **API double-check** — optionally validate with a JSON API endpoint and average the two prices
- **Price history graph** — Recharts line chart showing price trends over time
- **Manual "Check Price Now"** — trigger an immediate scrape from the UI
- **Push alerts via ntfy** — free, no-account-required notifications when price drops below target
- **Automated checks** — Vercel Cron Jobs run every 30 minutes
- **Min / max / avg stats** — displayed on every product card

---

## Project Structure

```
pricetracker/
├── pages/
│   ├── index.js                    # Homepage — product list
│   ├── add.js                      # Add product form
│   ├── products/[id].js            # Product detail + full history
│   └── api/
│       ├── products/
│       │   ├── index.js            # GET /api/products, POST /api/products
│       │   └── [id]/
│       │       ├── index.js        # GET + DELETE /api/products/[id]
│       │       └── check.js        # POST /api/products/[id]/check
│       └── cron/
│           └── check-all.js        # Vercel Cron endpoint
├── lib/
│   ├── db.js                       # Cached MongoDB connection
│   ├── scraper.js                  # Cheerio HTML scraper + API price fetcher
│   ├── notifier.js                 # ntfy push notification helper
│   └── priceChecker.js             # Shared check logic (scrape → DB → alert)
├── components/
│   ├── Navbar.js                   # Top navigation
│   ├── ProductCard.js              # Card with price, stats, graph, actions
│   ├── PriceGraph.js               # Recharts wrapper (lazy-loaded, no SSR)
│   ├── _PriceGraphInner.js         # Recharts implementation
│   └── AddProductForm.js           # Controlled add-product form
├── styles/globals.css
├── vercel.json                     # Cron schedule config
└── .env.local.example              # Environment variable template
```

---

## Getting Started

### 1. Clone / open the project

```bash
cd pricetracker
npm install
```

### 2. Set up MongoDB Atlas (free tier)

1. Create an account at [cloud.mongodb.com](https://cloud.mongodb.com)
2. Create a **free M0 cluster** (any region)
3. In **Database Access**, add a user with read/write permissions
4. In **Network Access**, add `0.0.0.0/0` (allow from anywhere — required for Vercel)
5. In your cluster, click **Connect → Drivers** and copy the connection string

### 3. Configure environment variables

```bash
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
MONGODB_URI=mongodb+srv://youruser:yourpass@cluster0.xxxxx.mongodb.net/pricetracker?retryWrites=true&w=majority
NTFY_SERVER_URL=https://ntfy.sh
NTFY_TOPIC=my-unique-price-alerts-topic
CRON_SECRET=generate-with-openssl-rand-hex-32
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Usage

### Adding a product

1. Click **+ Add Product** in the navbar
2. Fill in:
   - **Product Name** — a label for the product
   - **Product URL** — the full URL of the product page
   - **Target Price** — you'll be alerted when the price drops below this
   - **CSS Selector** — the selector that points to the price element on the page

**Finding the CSS selector:**
Open the product page in Chrome → right-click the price → **Inspect** → right-click the highlighted element in DevTools → **Copy → Copy selector**

### Price alerts via ntfy

1. Install the [ntfy app](https://ntfy.sh) on your phone (Android/iOS) or use the web UI
2. Subscribe to the topic you set in `NTFY_TOPIC` (e.g. `my-unique-price-alerts-topic`)
3. When a tracked price drops below the target, you'll receive a push notification

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/products` | List all products |
| POST | `/api/products` | Add a new product |
| GET | `/api/products/[id]` | Get product details |
| DELETE | `/api/products/[id]` | Remove a product |
| POST | `/api/products/[id]/check` | Trigger an immediate price check |
| GET | `/api/cron/check-all` | Check all products (cron / protected) |

---

## Deployment on Vercel

### 1. Push to GitHub

```bash
git init
git add .
git commit -m "Initial commit"
git remote add origin https://github.com/yourusername/pricetracker.git
git push -u origin main
```

### 2. Import to Vercel

1. Go to [vercel.com/new](https://vercel.com/new) and import the repository
2. In **Environment Variables**, add all four keys from your `.env.local`:
   - `MONGODB_URI`
   - `NTFY_SERVER_URL`
   - `NTFY_TOPIC`
   - `CRON_SECRET`
3. Click **Deploy**

### 3. Verify the cron job

The `vercel.json` schedules `/api/cron/check-all` every 30 minutes automatically.
In the Vercel dashboard → **Cron Jobs** tab, you can see the next run time and logs.

To manually trigger the cron from your terminal:
```bash
curl -X GET https://your-app.vercel.app/api/cron/check-all \
  -H "Authorization: Bearer your-cron-secret"
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js (Pages Router), React, Tailwind CSS |
| Backend | Next.js API Routes (serverless) |
| Database | MongoDB Atlas (native driver) |
| Scraping | Cheerio |
| Charts | Recharts |
| Notifications | ntfy.sh |
| Automation | Vercel Cron Jobs |
| Hosting | Vercel (free tier) |

---

## Getting Started

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `pages/index.js`. The page auto-updates as you edit the file.

[API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) can be accessed on [http://localhost:3000/api/hello](http://localhost:3000/api/hello). This endpoint can be edited in `pages/api/hello.js`.

The `pages/api` directory is mapped to `/api/*`. Files in this directory are treated as [API routes](https://nextjs.org/docs/pages/building-your-application/routing/api-routes) instead of React pages.

This project uses [`next/font`](https://nextjs.org/docs/pages/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn-pages-router) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/pages/building-your-application/deploying) for more details.
