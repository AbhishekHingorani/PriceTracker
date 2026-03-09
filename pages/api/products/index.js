/**
 * GET  /api/products  – returns all tracked products, sorted by name
 * POST /api/products  – adds a new product to the tracker
 *
 * POST body (JSON):
 *   name         {string}  required – human-readable product name
 *   url          {string}  required – product page URL
 *   targetPrice  {number}  required – price threshold for alerts
 *   cssSelector  {string}  required – CSS selector targeting the price element
 *   apiEndpoint  {string}  optional – JSON API URL for double-checking price
 *   useApiCheck  {boolean} optional – whether to use the API endpoint
 */
import { getDb } from '../../../lib/db';

export default async function handler(req, res) {
  let db;
  try {
    db = await getDb();
  } catch (err) {
    return res.status(500).json({ error: 'Database connection failed: ' + err.message });
  }

  const col = db.collection('products');

  // ── GET – list all products ──────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const products = await col.find({}).sort({ name: 1 }).toArray();
      return res.status(200).json(products);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── POST – add a product ─────────────────────────────────────────────────
  if (req.method === 'POST') {
    const { name, url, targetPrice, cssSelector, apiEndpoint, useApiCheck } = req.body || {};

    // Validate required fields
    if (!name?.trim() || !url?.trim() || !targetPrice || !cssSelector?.trim()) {
      return res.status(400).json({
        error: 'name, url, targetPrice, and cssSelector are all required',
      });
    }

    const parsedTarget = parseFloat(targetPrice);
    if (isNaN(parsedTarget) || parsedTarget <= 0) {
      return res.status(400).json({ error: 'targetPrice must be a positive number' });
    }

    const doc = {
      name:         name.trim(),
      url:          url.trim(),
      targetPrice:  parsedTarget,
      cssSelector:  cssSelector.trim(),
      apiEndpoint:  apiEndpoint?.trim() || null,
      useApiCheck:  Boolean(useApiCheck),
      lastPrice:    null,
      lastChecked:  null,
      alertSent:    false,
      priceHistory: [],
      createdAt:    new Date(),
    };

    try {
      const result = await col.insertOne(doc);
      return res.status(201).json({ ...doc, _id: result.insertedId });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}
