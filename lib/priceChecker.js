/**
 * Shared price-check logic.
 *
 * Used by both:
 *   - POST /api/products/[id]/check  (manual trigger)
 *   - GET  /api/cron/check-all       (Vercel cron automated run)
 *
 * Flow:
 *   1. Scrape price via CSS selector
 *   2. Optionally fetch price from API endpoint and average with scraped price
 *   3. Append entry to product's priceHistory array in MongoDB
 *   4. Update lastPrice and lastChecked fields
 *   5. If price < targetPrice and no alert was already sent → fire ntfy notification
 *   6. Reset alertSent flag when price rises back above target
 */
import { getDb }                   from './db';
import { scrapePrice, fetchApiPrice } from './scraper';
import { sendAlert, sendErrorAlert }  from './notifier';
import { ObjectId }                 from 'mongodb';

/**
 * Performs a full price check for one product and persists results to MongoDB.
 *
 * @param {object} product - Full MongoDB document for the product
 * @returns {Promise<{
 *   updatedProduct: object | null,
 *   scrapedPrice:   number | null,
 *   apiPrice:       number | null,
 *   error:          string | null
 * }>}
 */
export async function checkProductPrice(product) {
  const db  = await getDb();
  const col = db.collection('products');

  let scrapedPrice = null;
  let apiPrice     = null;
  let finalPrice   = null;

  try {
    // ── Step 1: CSS selector scrape ────────────────────────────────────────
    scrapedPrice = await scrapePrice(product.url, product.cssSelector);
    finalPrice   = scrapedPrice;

    // ── Step 2: Optional API double-check ──────────────────────────────────
    if (product.useApiCheck && product.apiEndpoint) {
      try {
        apiPrice   = await fetchApiPrice(product.apiEndpoint);
        finalPrice = (scrapedPrice + apiPrice) / 2;

        const diff = Math.abs(scrapedPrice - apiPrice);
        if (diff > 1.00) {
          console.warn(
            `[checker] Price discrepancy for "${product.name}": ` +
            `CSS=₹${scrapedPrice} API=₹${apiPrice} (diff=₹${diff.toFixed(2)})`
          );
        }
      } catch (apiErr) {
        // API check failure is non-fatal; fall back to scraped price
        console.error(`[checker] API double-check failed for "${product.name}":`, apiErr.message);
        finalPrice = scrapedPrice;
      }
    }

    // ── Step 3 & 4: Build history entry and determine alert state ──────────
    const historyEntry = { price: finalPrice, timestamp: new Date() };

    // Fire alert only once while price is below target (idempotency)
    const priceBelowTarget = finalPrice < product.targetPrice;
    const shouldAlert      = priceBelowTarget && !product.alertSent;
    const newAlertSent     = priceBelowTarget;

    let shouldAlert2 = false;
    let newAlertSent2 = product.alertSent2 || false;
    if (product.targetPrice2) {
      const priceBelowTarget2 = finalPrice < product.targetPrice2;
      shouldAlert2 = priceBelowTarget2 && !product.alertSent2;
      newAlertSent2 = priceBelowTarget2;
    }

    let shouldAlert3 = false;
    let newAlertSent3 = product.alertSent3 || false;
    if (product.targetPrice3) {
      const priceBelowTarget3 = finalPrice < product.targetPrice3;
      shouldAlert3 = priceBelowTarget3 && !product.alertSent3;
      newAlertSent3 = priceBelowTarget3;
    }

    // ── Atomic DB update ───────────────────────────────────────────────────
    const updatedProduct = await col.findOneAndUpdate(
      { _id: new ObjectId(product._id) },
      {
        $set: {
          lastPrice:      finalPrice,
          lastChecked:    new Date(),
          alertSent:      newAlertSent,
          alertSent2:     newAlertSent2,
          alertSent3:     newAlertSent3,
          errorAlertSent: false,
          lastError:      null,
          consecutiveErrors: 0,
        },
        $push: { priceHistory: historyEntry },
      },
      { returnDocument: 'after' }
    );

    // ── Step 5: Send ntfy alert if warranted ──────────────────────────────
    let alertTargetToUse = null;

    if (shouldAlert) {
      alertTargetToUse = product.targetPrice;
    }
    if (shouldAlert2) {
      if (alertTargetToUse === null || product.targetPrice2 < alertTargetToUse) {
        alertTargetToUse = product.targetPrice2;
      }
    }
    if (shouldAlert3) {
      if (alertTargetToUse === null || product.targetPrice3 < alertTargetToUse) {
        alertTargetToUse = product.targetPrice3;
      }
    }

    if (alertTargetToUse !== null) {
      await sendAlert({
        productName:  product.name,
        currentPrice: finalPrice,
        targetPrice:  alertTargetToUse,
        productUrl:   product.url,
      });
    }

    return { updatedProduct, scrapedPrice, apiPrice, error: null };

  } catch (err) {
    const newConsecutiveErrors = (product.consecutiveErrors || 0) + 1;
    const isThirdError = newConsecutiveErrors >= 3;
    const shouldSendErrorAlert = isThirdError && !product.errorAlertSent;

    // On hard failure still record the lastChecked timestamp and update error state
    const failedProduct = await col.findOneAndUpdate(
      { _id: new ObjectId(product._id) },
      { $set: { 
          lastChecked: new Date(),
          errorAlertSent: shouldSendErrorAlert ? true : product.errorAlertSent,
          lastError: err.message,
          consecutiveErrors: newConsecutiveErrors
        } 
      },
      { returnDocument: 'after' }
    );

    if (shouldSendErrorAlert) {
      await sendErrorAlert({
        productName:  product.name,
        errorMessage: err.message + ` (Failed ${newConsecutiveErrors} consecutive times)`,
        productUrl:   product.url,
      });
    }

    return { updatedProduct: failedProduct, scrapedPrice, apiPrice, error: err.message };
  }
}
