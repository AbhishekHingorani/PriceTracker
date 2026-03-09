/**
 * POST /api/products/[id]/check
 *
 * Triggers an immediate price check for a specific product.
 * Returns the updated product document along with raw scrape/API prices.
 *
 * Response 200: { product, scrapedPrice, apiPrice }
 * Response 422: { error, scrapedPrice, apiPrice }  (check attempted but failed)
 */
import { getDb }              from '../../../../lib/db';
import { ObjectId }           from 'mongodb';
import { checkProductPrice }  from '../../../../lib/priceChecker';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: `Method ${req.method} not allowed` });
  }

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

  let product;
  try {
    product = await col.findOne({ _id: new ObjectId(id) });
    if (!product) return res.status(404).json({ error: 'Product not found' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }

  const { updatedProduct, scrapedPrice, apiPrice, error } = await checkProductPrice(product);

  if (error) {
    return res.status(422).json({ error, scrapedPrice, apiPrice });
  }

  return res.status(200).json({ product: updatedProduct, scrapedPrice, apiPrice });
}
