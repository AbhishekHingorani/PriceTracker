/**
 * Homepage – displays all tracked products as cards with price info and graphs.
 *
 * Data is fetched server-side via getServerSideProps so the list is always
 * up-to-date on each page load. Client-side state is then used to reflect
 * updates from "Check Price Now" and delete actions without a full reload.
 */
import { useState }    from 'react';
import Link            from 'next/link';
import Navbar          from '../components/Navbar';
import ProductCard     from '../components/ProductCard';
import { getDb }       from '../lib/db';

export default function Home({ initialProducts }) {
  const [products, setProducts] = useState(initialProducts);

  /** Replace a product in state after a successful price check. */
  const handleUpdate = (updated) => {
    setProducts((prev) =>
      prev.map((p) => (p._id === updated._id ? updated : p))
    );
  };

  /** Remove a product from state after deletion. */
  const handleDelete = (id) => {
    setProducts((prev) => prev.filter((p) => p._id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-5xl mx-auto px-4 py-8">
        {/* ── Page header ─────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tracked Products</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {products.length} product{products.length !== 1 ? 's' : ''} being monitored
            </p>
          </div>
        </div>

        {/* ── Empty state ─────────────────────────────────────────────── */}
        {products.length === 0 ? (
          <div className="text-center py-24 text-gray-400">
            <div className="text-5xl mb-4">📦</div>
            <p className="text-lg font-medium text-gray-600">No products tracked yet.</p>
            <p className="text-sm mt-2">
              <Link href="/add" className="text-indigo-500 hover:underline font-medium">
                Add your first product
              </Link>{' '}
              to start watching prices.
            </p>
          </div>
        ) : (
          /* ── Product grid ─────────────────────────────────────────── */
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard
                key={product._id}
                product={product}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

/**
 * Fetch products directly from MongoDB (server-side).
 * Serialises ObjectId and Date fields to plain JSON strings.
 */
export async function getServerSideProps() {
  try {
    const db       = await getDb();
    const products = await db
      .collection('products')
      .find({})
      .sort({ name: 1 })
      .toArray();

    return {
      props: {
        initialProducts: JSON.parse(JSON.stringify(products)),
      },
    };
  } catch (err) {
    console.error('[index] Failed to load products:', err.message);
    return { props: { initialProducts: [] } };
  }
}
