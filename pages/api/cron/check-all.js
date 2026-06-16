/**
 * GET /api/cron/check-all
 *
 * Vercel Cron Job endpoint — scheduled every 30 minutes via vercel.json.
 * Iterates every tracked product and performs a price check for each.
 *
 * Security: protected by CRON_SECRET environment variable.
 * Vercel automatically sends Authorization: Bearer <CRON_SECRET> on cron invocations.
 * For manual testing: pass the same Authorization header.
 *
 * Response: { checked, successful, failed, results[], timestamp }
 */
import { getDb }              from '../../../lib/db';
import { checkProductPrice }  from '../../../lib/priceChecker';

export default async function handler(req, res) {
  // ── Auth guard ────────────────────────────────────────────────────────────
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const authHeader = req.headers['authorization'];
    if (authHeader !== `Bearer ${cronSecret}`) {
      return res.status(401).json({ error: 'Unauthorized' });
    }
  }

  console.log('[cron] check-all started at', new Date().toISOString());

  let db;
  try {
    db = await getDb();
  } catch (err) {
    return res.status(500).json({ error: 'Database connection failed: ' + err.message });
  }

  const products = await db.collection('products').find({}).toArray();
  console.log(`[cron] Found ${products.length} product(s) to check`);

  /** @type {Array<{ id: string, name: string, scrapedPrice: number|null, apiPrice: number|null, error: string|null }>} */
  const results = [];

  // Process products sequentially to avoid overwhelming target servers
  for (const product of products) {
    const { scrapedPrice, apiPrice, error } = await checkProductPrice(product);

    results.push({
      id:           product._id.toString(),
      name:         product.name,
      scrapedPrice,
      apiPrice,
      error,
    });

    if (error) {
      console.error(`[cron] Failed "${product.name}": ${error}`);
    } else {
      console.log(`[cron] OK "${product.name}" → ₹${scrapedPrice}`);
    }
  }

  const successful = results.filter((r) => !r.error).length;
  const failed     = results.filter((r) => r.error).length;

  console.log(`[cron] Done — ${successful} ok, ${failed} failed`);

  return res.status(200).json({
    checked: products.length,
    successful,
    failed,
    results,
    timestamp: new Date().toISOString(),
  });
}
