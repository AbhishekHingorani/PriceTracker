/**
 * GET    /api/products/[id]  – returns a single product's full details
 * PATCH  /api/products/[id]  – updates editable fields on a product
 * DELETE /api/products/[id]  – permanently removes a product from tracking
 */
import { getDb }    from '../../../../lib/db';
import { ObjectId } from 'mongodb';

export default async function handler(req, res) {
  const { id } = req.query;

  if (!ObjectId.isValid(id)) {
    return res.status(400).json({ error: 'Invalid product ID' });
  }

  let db;
  try {
    db = await getDb();
  } catch (err) {
    return res.status(500).json({ error: 'Database connection failed: ' + err.message });
  }

  const col = db.collection('products');

  // ── GET ─────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const product = await col.findOne({ _id: new ObjectId(id) });
      if (!product) return res.status(404).json({ error: 'Product not found' });
      return res.status(200).json(product);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── PATCH ────────────────────────────────────────────────────────────────
  if (req.method === 'PATCH') {
    const { name, url, targetPrice, targetPrice2, targetPrice3, cssSelector, apiEndpoint, useApiCheck } = req.body || {};
    const update = {};

    if (name        !== undefined) update.name        = name.trim();
    if (url         !== undefined) update.url         = url.trim();
    if (cssSelector !== undefined) update.cssSelector = cssSelector.trim();
    if (apiEndpoint !== undefined) update.apiEndpoint = apiEndpoint?.trim() || null;
    if (useApiCheck !== undefined) update.useApiCheck = Boolean(useApiCheck);

    if (targetPrice !== undefined) {
      const parsed = parseFloat(targetPrice);
      if (isNaN(parsed) || parsed <= 0) {
        return res.status(400).json({ error: 'targetPrice must be a positive number' });
      }
      update.targetPrice = parsed;
      // Reset alertSent so the new target is evaluated fresh on next check
      update.alertSent = false;
    }

    if (targetPrice2 !== undefined) {
      if (targetPrice2 === null || targetPrice2 === '') {
        update.targetPrice2 = null;
        update.alertSent2 = false;
      } else {
        const parsed = parseFloat(targetPrice2);
        if (isNaN(parsed) || parsed <= 0) {
          return res.status(400).json({ error: 'targetPrice2 must be a positive number' });
        }
        update.targetPrice2 = parsed;
        update.alertSent2 = false;
      }
    }

    if (targetPrice3 !== undefined) {
      if (targetPrice3 === null || targetPrice3 === '') {
        update.targetPrice3 = null;
        update.alertSent3 = false;
      } else {
        const parsed = parseFloat(targetPrice3);
        if (isNaN(parsed) || parsed <= 0) {
          return res.status(400).json({ error: 'targetPrice3 must be a positive number' });
        }
        update.targetPrice3 = parsed;
        update.alertSent3 = false;
      }
    }

    if (Object.keys(update).length === 0) {
      return res.status(400).json({ error: 'No valid fields provided to update' });
    }

    try {
      const updated = await col.findOneAndUpdate(
        { _id: new ObjectId(id) },
        { $set: update },
        { returnDocument: 'after' }
      );
      if (!updated) return res.status(404).json({ error: 'Product not found' });
      return res.status(200).json(updated);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ── DELETE ───────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    try {
      const result = await col.deleteOne({ _id: new ObjectId(id) });
      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Product not found' });
      }
      return res.status(200).json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: `Method ${req.method} not allowed` });
}
