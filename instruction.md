# PriceTracker - Project Knowledge Base

This document serves as the persistent project knowledge base and provides instructions for all future AI development sessions. It is designed to offer a complete contextual understanding of the project's architecture, patterns, and conventions.

---

## 1. Project Overview

**Purpose:** A lightweight, serverless price tracking application that allows users to monitor product prices across any website.
**Core Domain Problem:** Web scraping is inherently fragile and websites often block automated requests or change structures. This tool provides a flexible way to target specific DOM elements via CSS selectors, with an optional API double-check fallback, and alerting when prices drop below a defined target.
**Key Features:**
- Custom CSS selector-based price scraping from any URL.
- Optional fallback/validation via a JSON API endpoint.
- Visual price history graph using Recharts.
- Push notifications for price drops via `ntfy.sh`.
- Automated background checks every 30 minutes via Vercel Cron.
**Current Status:** Fully functional and deployable on the free tiers of Vercel and MongoDB Atlas.

## 2. Architecture

**High-Level Architecture:**
- **Client:** Next.js Server-Side Rendered (SSR) pages mixed with client-side React state for interactivity (Toast, Manual Check, Edit, Delete).
- **API/Backend:** Next.js Serverless Functions (`/api/*`) acting as the API layer.
- **Database:** MongoDB Atlas cluster, accessed directly via the native Node.js MongoDB driver.
- **Scraper Engine:** Cheerio-based HTML parsing triggered by user actions or cron jobs.
- **Job Scheduler:** Vercel Cron invoking a secure API endpoint (`/api/cron/check-all`) periodically.
- **Notification Service:** External HTTP POST calls to `ntfy.sh` topics.

**Data Flow (Price Check Workflow):**
1. Trigger (Manual UI click OR Vercel Cron invocation).
2. Fetch HTML via native `fetch()` & parse with Cheerio using stored CSS selector.
3. (Optional) Fetch JSON via API endpoint.
4. Compare/Average prices.
5. Atomic push to `priceHistory` array in MongoDB document.
6. Check if `currentPrice < targetPrice` and `!alertSent`.
7. If condition met, dispatch POST to `ntfy.sh` and set `alertSent = true`.

## 3. Technology Stack

- **Framework:** Next.js 16 (Pages Router)
- **UI Library:** React 19
- **Styling:** Tailwind CSS v4
- **Database Driver:** `mongodb` (Native driver, no ORM)
- **Scraping:** `cheerio`
- **Charts:** `recharts`
- **Notifications:** `ntfy.sh`
- **Infrastructure/Hosting:** Vercel (Hosting & Cron)
- **Database Hosting:** MongoDB Atlas

## 4. Codebase Structure

```text
pricetracker/
├── components/           # Reusable React components (Navbar, ProductCard, PriceGraph, etc.)
├── lib/                  # Backend business logic and shared utilities
│   ├── db.js             # Cached MongoDB connection pool
│   ├── notifier.js       # ntfy.sh integration logic
│   ├── priceChecker.js   # Core domain logic: scrape, evaluate, store, notify
│   └── scraper.js        # HTML/API fetching and parsing utilities
├── pages/                # Next.js Pages Router
│   ├── api/              # Serverless API routes
│   │   ├── cron/         # Vercel Cron scheduled tasks
│   │   └── products/     # REST-like endpoints for CRUD
│   ├── products/         # Product detail pages (SSR)
│   ├── _app.js           # Next.js App wrapper
│   ├── add.js            # Add product form view
│   └── index.js          # Homepage view
```

## 5. Development Patterns

- **State Management:** Local component state via `useState`. Server-side data fetched via `getServerSideProps` in Pages.
- **Styling:** Utility-first using Tailwind CSS classes. No external stylesheets aside from `globals.css`.
- **Database Connection:** Warm connection caching in `lib/db.js` to prevent exhaustion of MongoDB connections during serverless spin-ups.
- **Error Handling:** API routes return standard `{ error: 'Message' }` JSON payloads with proper HTTP status codes. Frontend uses custom Toast notifications. Notification failures (`ntfy.sh`) fail silently so they do not interrupt database state updates.
- **Component Pattern:** Small, focused components. Large interactive widgets (like `ProductCard.js`) handle their own API interactions (PATCH, DELETE) and update parent state via callbacks (`onUpdate`, `onDelete`).
- **Module Path Aliases:** Configured in `jsconfig.json` with `@/*` mapped to `./*` (though current files largely use relative imports).

## 6. Domain Knowledge

- **CSS Selectors:** Must be clean. The scraper explicitly removes pseudo-elements (`::after`, etc.) and combinators before executing Cheerio queries.
- **Idempotency in Alerts:** The `alertSent` boolean on the Product document ensures a notification is only sent *once* when a price drops below the target. It resets to `false` when the price rises back above the target or when the user updates the target price.
- **Cron Security:** `/api/cron/check-all` requires an `Authorization: Bearer <CRON_SECRET>` header to prevent abuse.

## 7. Data Layer

- **Database:** MongoDB
- **Collections:** `products`
- **Schema (Implicit):**
  ```javascript
  {
    _id: ObjectId,
    name: String,
    url: String,
    targetPrice: Number,
    cssSelector: String,
    apiEndpoint: String | null,
    useApiCheck: Boolean,
    lastPrice: Number | null,
    lastChecked: Date | null,
    alertSent: Boolean,
    priceHistory: [ { price: Number, timestamp: Date } ],
    createdAt: Date
  }
  ```
- **Updates:** Price updates use atomic MongoDB operators (`$set` and `$push`) inside `findOneAndUpdate` to avoid race conditions.

## 8. Frontend Knowledge

- **UI Architecture:** Page templates wrap feature-rich components.
- **Routing:** Pages Router (not App Router).
- **Client/Server boundary:** `getServerSideProps` fetches initial data directly via MongoDB. Client takes over for mutations, meaning UI needs optimistic/callback updates (`handleUpdate`, `handleDelete` in `pages/index.js`).
- **Data Serialization:** Because Next.js `getServerSideProps` cannot pass raw `ObjectId` or `Date` objects to components, `JSON.parse(JSON.stringify(data))` is used for quick serialization.

## 9. Backend Knowledge

- **API Architecture:** REST-ish structure over Next.js API Routes.
- **Scraping logic (`lib/scraper.js`):** Implements a robust `parsePrice` function handling EU/US number formats (e.g. `$1,200.50` vs `1.200,50 €`).
- **Event Systems:** Synchronous sequential execution in background jobs. To avoid overwhelming target servers, the cron job (`pages/api/cron/check-all.js`) processes products in a synchronous `for...of` loop rather than a parallel `Promise.all`.

## 10. Testing Strategy

- **Current State:** No automated testing frameworks (Jest/Cypress/Playwright) are currently implemented.
- **Expectation for Future Work:** If complex parsing logic is updated, manual testing of `parsePrice` and CSS selector sanitization is required. Consider adding Jest for pure functions in `lib/scraper.js`.

## 11. DevOps & Operations

- **Deployment:** Vercel.
- **Background Jobs:** Managed by Vercel Cron defined in `vercel.json` (Every 30 minutes).
- **Environment Variables:**
  - `MONGODB_URI`: Connection string.
  - `NTFY_SERVER_URL`: Base URL (default `https://ntfy.sh`).
  - `NTFY_TOPIC`: Notification channel name.
  - `CRON_SECRET`: Auth token for cron job.

## 12. Known Constraints

- **Technical Debt:** Data serialization in `getServerSideProps` (`JSON.parse(JSON.stringify(...))`) is inefficient for large datasets but acceptable for personal tracking.
- **Scraping Limitations:** `fetch` + `cheerio` does not render JavaScript. It cannot scrape SPAs or sites heavily protected by Cloudflare/Bot management.
- **Performance:** History array grows indefinitely. In the long term, very large `priceHistory` arrays could cause performance/document-size issues (MongoDB document limit is 16MB).
- **Architecture limitations:** Shared hosting timeout limits on Vercel Free tier (10-15s for API functions). The sequential `for...of` cron job could hit this timeout if checking too many products.

---

# Instructions For Future AI Sessions

### Project Understanding
This is a serverless price tracker using Next.js Pages router and MongoDB. The core flow is fetching HTML, parsing the DOM with Cheerio based on user-defined selectors, storing historical price data, and pushing notifications via ntfy.

### Development Rules
- **DO NOT** convert the project from Pages Router to App Router unless explicitly commanded by the user.
- **DO NOT** introduce an ORM like Mongoose or Prisma. Stick to the native `mongodb` driver.
- **DO NOT** change the UI framework away from Tailwind CSS.
- **ALWAYS** retain the `alertSent` idempotency logic when modifying the price checking flow.

### Coding Standards
- Use ES Modules (`import`/`export`).
- Use relative imports primarily, though `@/*` is configured.
- Maintain atomic operations (`$set`, `$push`) when updating MongoDB documents.
- Keep components focused. Pass state updates up to parent pages via callbacks (`onUpdate`, `onDelete`).

### Architecture Rules
- Background jobs (cron) **MUST** process items sequentially (`for...of`) to avoid rate limits from target websites and stay within memory bounds, despite Vercel timeout risks.
- Database connections **MUST** use the caching wrapper in `lib/db.js` (`getDb()`). Do not instantiate new `MongoClient` instances inside endpoints directly.
- The `notifier.js` **MUST NEVER** throw errors that break the main application flow. It should fail silently.

### Before Making Changes
1. **Check impact on Cron:** Any changes to `priceChecker.js` will impact both manual checks and background crons. Ensure execution speed and error handling are robust.
2. **Review Data Structure:** If modifying the product schema, check if `getServerSideProps` parsing needs updates, and if previous documents lacking new fields will cause crashes.

### When Adding New Features
- If adding new fields to a Product, ensure they are added to:
  - `POST /api/products` (Creation)
  - `PATCH /api/products/[id]` (Updates)
  - `components/ProductCard.js` (Edit form state & payload)
  - `pages/add.js` (Creation form)
- Ensure backwards compatibility with old records (e.g. use optional chaining `?.`).

### When Refactoring
- Test changes to scraping logic against both string permutations (US vs EU formatting) and empty states.
- If moving React components, ensure Tailwind class names remain intact and that the `toast` notification system is still accessible if required.

### Common Pitfalls
- **Timeout on Vercel:** Firing too many external HTTP requests inside a single API handler will crash the serverless function.
- **Client/Server Hydration Mismatch:** The `formatDate` or `relativeTime` functions may cause hydration errors if server and client evaluate different timezones. (Currently safely isolated or handled via server-side props).
- **Cheerio Selectors:** Not all CSS selectors work in Cheerio (which does not execute JS). Always remind the user that SPAs might not be scrapeable using this tool.

### Recommended Workflow
1. **Understand:** Read this document and review `lib/priceChecker.js` (the core engine).
2. **Plan:** If modifying UI, update the Component first. If modifying logic, update `lib/` utilities. If modifying data, update API routes and verify DB schema assumptions.
3. **Implement:** Write code adhering strictly to existing conventions.
4. **Test Manually:** Test adding, editing, deleting, and manual price checking from the UI.
