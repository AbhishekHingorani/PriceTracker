/**
 * MongoDB connection helper.
 *
 * Uses a module-level cached promise to reuse connections across
 * serverless function invocations (warm re-use), which is the
 * recommended pattern for Next.js + MongoDB Atlas.
 *
 * Required env var: MONGODB_URI
 * Optional env var: MONGODB_DB (default: "pricetracker")
 */
import { MongoClient } from 'mongodb';

const dbName = process.env.MONGODB_DB || 'PriceTracker';

/** @type {MongoClient | null} */
let cachedClient = null;

/** @type {import('mongodb').Db | null} */
let cachedDb = null;

/**
 * Returns a connected MongoDB Db instance.
 * Creates a new connection on first call; returns the cached instance on subsequent calls.
 *
 * @returns {Promise<import('mongodb').Db>}
 */
export async function getDb() {
  // Check at call-time (not module-eval time) so builds without env vars still compile
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('Please add MONGODB_URI to your .env.local file');
  }

  if (cachedDb) return cachedDb;

  const client = new MongoClient(uri);
  await client.connect();

  cachedClient = client;
  cachedDb = client.db(dbName);

  return cachedDb;
}

/**
 * Returns the raw MongoClient (useful for advanced operations or cleanup).
 *
 * @returns {Promise<import('mongodb').MongoClient>}
 */
export async function getClient() {
  if (cachedClient) return cachedClient;
  await getDb();
  return cachedClient;
}
