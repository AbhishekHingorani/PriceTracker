/**
 * ntfy push notification helper.
 *
 * Sends price-drop alerts via ntfy.sh (or a self-hosted ntfy instance).
 * Fails silently — notification errors never break the main price-check flow.
 *
 * Required env vars:
 *   NTFY_SERVER_URL  - ntfy server base URL  (default: https://ntfy.sh)
 *   NTFY_TOPIC       - topic/channel name     (default: price-tracker-alerts)
 *
 * Subscribe to alerts in the ntfy app or at https://ntfy.sh/<NTFY_TOPIC>
 */

const NTFY_SERVER = process.env.NTFY_SERVER_URL || 'https://ntfy.sh';
const NTFY_TOPIC  = process.env.NTFY_TOPIC      || 'price-tracker-alerts';

/**
 * Sends a price-drop alert notification via ntfy.
 *
 * @param {object} params
 * @param {string} params.productName   - Human-readable product name
 * @param {number} params.currentPrice  - Newly detected price
 * @param {number} params.targetPrice   - User's target threshold
 * @param {string} params.productUrl    - Product page URL (used as click action)
 * @returns {Promise<void>}
 */
export async function sendAlert({ productName, currentPrice, targetPrice, productUrl }) {
  try {
    const endpoint = `${NTFY_SERVER}/${NTFY_TOPIC}`;

    const message =
      `${productName} dropped to ₹${currentPrice.toFixed(2)} ` +
      `— below your target of ₹${targetPrice.toFixed(2)}!`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Title:            `Price Alert: ${productName}`,
        Priority:         'high',
        Tags:             'moneybag,bell',
        Click:            productUrl,
        'Content-Type':   'text/plain',
      },
      body: message,
    });

    if (!res.ok) {
      console.error(`[notifier] ntfy POST failed: HTTP ${res.status} to ${endpoint}`);
    } else {
      console.log(`[notifier] Alert sent for "${productName}" at ₹${currentPrice.toFixed(2)}`);
    }
  } catch (err) {
    // Notification errors must never throw — price check must continue
    console.error('[notifier] Failed to send ntfy alert:', err.message);
  }
}

/**
 * Sends an error alert notification via ntfy.
 *
 * @param {object} params
 * @param {string} params.productName   - Human-readable product name
 * @param {string} params.errorMessage  - The error message
 * @param {string} params.productUrl    - Product page URL (used as click action)
 * @returns {Promise<void>}
 */
export async function sendErrorAlert({ productName, errorMessage, productUrl }) {
  try {
    const endpoint = `${NTFY_SERVER}/${NTFY_TOPIC}`;

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Title:            `Error: ${productName}`,
        Priority:         'high',
        Tags:             'rotating_light,warning',
        Click:            productUrl,
        'Content-Type':   'text/plain',
      },
      body: `PriceTracker failed to check "${productName}".\nError: ${errorMessage}`,
    });

    if (!res.ok) {
      console.error(`[notifier] ntfy POST failed (error alert): HTTP ${res.status} to ${endpoint}`);
    } else {
      console.log(`[notifier] Error alert sent for "${productName}"`);
    }
  } catch (err) {
    console.error('[notifier] Failed to send ntfy error alert:', err.message);
  }
}
