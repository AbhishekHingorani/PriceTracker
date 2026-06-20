/**
 * /products/[id] – product detail page.
 *
 * Shows full product metadata, a larger price history graph,
 * a chronological price history table, and a manual check button.
 */
import { useState }   from 'react';
import Link           from 'next/link';
import { ObjectId }   from 'mongodb';
import Navbar         from '../../components/Navbar';
import PriceGraph     from '../../components/PriceGraph';
import { getDb }      from '../../lib/db';

/** Format a date to a readable string. */
function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-US', {
    year:   'numeric',
    month:  'short',
    day:    'numeric',
    hour:   '2-digit',
    minute: '2-digit',
  });
}

export default function ProductDetail({ product: initialProduct }) {
  const [product, setProduct] = useState(initialProduct);
  const [loading, setLoading] = useState(false);
  const [toast,   setToast]   = useState(null);

  const isBelowTarget =
    product.lastPrice !== null &&
    (product.lastPrice < product.targetPrice ||
    (product.targetPrice2 && product.lastPrice < product.targetPrice2) ||
    (product.targetPrice3 && product.lastPrice < product.targetPrice3));

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  /** Trigger a manual price check. */
  const handleCheck = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/products/${product._id}/check`, { method: 'POST' });
      const data = await res.json();

      if (!res.ok) {
        if (data.product) {
          setProduct(data.product);
        }
        showToast('error', data.error || 'Price check failed');
      } else {
        setProduct(data.product);
        showToast('success', `Price updated: ₹${data.product.lastPrice?.toFixed(2)}`);
      }
    } catch {
      showToast('error', 'Network error — check your connection');
    } finally {
      setLoading(false);
    }
  };

  /** Compute stats from priceHistory. */
  const stats = (() => {
    if (!product.priceHistory?.length) return null;
    const prices = product.priceHistory.map((h) => h.price);
    return {
      min: Math.min(...prices),
      max: Math.max(...prices),
      avg: prices.reduce((a, b) => a + b, 0) / prices.length,
    };
  })();

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-3xl mx-auto px-4 py-8">

        {/* ── Toast ─────────────────────────────────────────────────────── */}
        {toast && (
          <div
            className={`mb-4 text-sm font-medium px-4 py-3 rounded-lg ${
              toast.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {toast.message}
          </div>
        )}

        <div className="mb-5">
          <Link href="/" className="text-sm text-gray-500 hover:text-indigo-600">
            ← Back to products
          </Link>
        </div>

        {/* ── Product overview card ─────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6 mb-5">

          {/* ── Error Banner ──────────────────────────────────────────────── */}
          {product.lastError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl mb-5 flex items-start gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mt-0.5 shrink-0 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="flex-1">
                <span className="font-semibold block mb-0.5">Last price check failed</span>
                <span className="opacity-90 leading-relaxed">{product.lastError}</span>
              </div>
            </div>
          )}

          {/* Header */}
          <div className="mb-5">
            <h1 className="text-xl font-bold text-gray-900">{product.name}</h1>
            <a
              href={product.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-indigo-500 hover:underline break-all"
            >
              {product.url}
            </a>
          </div>

          {/* Prices */}
          <div className="flex flex-wrap gap-8 mb-5">
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Current Price</p>
              <p
                className={`text-4xl font-bold ${
                  isBelowTarget ? 'text-green-600' : 'text-gray-900'
                }`}
              >
                {product.lastPrice !== null ? `₹${product.lastPrice.toFixed(2)}` : '—'}
              </p>
              {isBelowTarget && (
                <span className="inline-block mt-1 text-xs font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  Below target!
                </span>
              )}
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-0.5">Target Price</p>
              <p className="text-4xl font-bold text-indigo-600">
                ₹{product.targetPrice.toFixed(2)}
              </p>
            </div>
            {product.targetPrice2 && (
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Target Price 2</p>
                <p className="text-3xl font-bold text-indigo-600 mt-1">
                  ₹{product.targetPrice2.toFixed(2)}
                </p>
              </div>
            )}
            {product.targetPrice3 && (
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Target Price 3</p>
                <p className="text-3xl font-bold text-indigo-600 mt-1">
                  ₹{product.targetPrice3.toFixed(2)}
                </p>
              </div>
            )}
          </div>

          {/* Stats */}
          {stats && (
            <div className="flex gap-6 mb-5 text-sm">
              {[
                { label: 'Minimum', value: stats.min },
                { label: 'Maximum', value: stats.max },
                { label: 'Average', value: stats.avg },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-xs text-gray-400">{label}</p>
                  <p className="font-semibold text-gray-800">₹{value.toFixed(2)}</p>
                </div>
              ))}
            </div>
          )}

          {/* Metadata grid */}
          <dl className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm border-t border-gray-100 pt-4 mb-5">
            <div>
              <dt className="text-xs text-gray-400">Last Checked</dt>
              <dd className="text-gray-800 font-medium">{formatDate(product.lastChecked)}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">Added On</dt>
              <dd className="text-gray-800 font-medium">{formatDate(product.createdAt)}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">CSS Selector</dt>
              <dd className="text-gray-800 font-mono text-xs break-all">{product.cssSelector}</dd>
            </div>
            <div>
              <dt className="text-xs text-gray-400">API Double-check</dt>
              <dd className={`font-medium ${product.useApiCheck ? 'text-green-600' : 'text-gray-400'}`}>
                {product.useApiCheck ? 'Enabled' : 'Disabled'}
              </dd>
            </div>
            {product.apiEndpoint && (
              <div className="col-span-2">
                <dt className="text-xs text-gray-400">API Endpoint</dt>
                <dd className="text-gray-800 font-mono text-xs break-all">{product.apiEndpoint}</dd>
              </div>
            )}
            <div>
              <dt className="text-xs text-gray-400">Alert Status</dt>
              <dd className={`font-medium ${(product.alertSent || product.alertSent2 || product.alertSent3) ? 'text-orange-500' : 'text-gray-500'}`}>
                {(product.alertSent || product.alertSent2 || product.alertSent3) ? 'Alert sent — watching for price rise' : 'Watching for drop'}
              </dd>
            </div>
          </dl>

          {/* Check button */}
          <button
            onClick={handleCheck}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-semibold px-6 py-2.5 rounded-lg transition-colors inline-flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                </svg>
                Checking…
              </>
            ) : (
              'Check Price Now'
            )}
          </button>
        </div>

        {/* ── Price history card ────────────────────────────────────────── */}
        <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-1">
            Price History
          </h2>
          <p className="text-xs text-gray-400 mb-4">
            {product.priceHistory.length} recorded data point{product.priceHistory.length !== 1 ? 's' : ''}
          </p>

          {/* Full-size graph */}
          <PriceGraph priceHistory={product.priceHistory} compact={false} />

          {/* History table */}
          {product.priceHistory.length > 0 && (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-xs text-gray-400">
                    <th className="text-left pb-2 font-medium">Date &amp; Time</th>
                    <th className="text-right pb-2 font-medium">Price</th>
                  </tr>
                </thead>
                <tbody>
                  {[...product.priceHistory].reverse().map((entry, i) => (
                    <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                      <td className="py-2.5 text-gray-600">{formatDate(entry.timestamp)}</td>
                      <td className="py-2.5 text-gray-900 font-semibold text-right">
                        ₹{entry.price.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export async function getServerSideProps({ params }) {
  const { id } = params;

  if (!ObjectId.isValid(id)) {
    return { notFound: true };
  }

  try {
    const db      = await getDb();
    const product = await db
      .collection('products')
      .findOne({ _id: new ObjectId(id) });

    if (!product) return { notFound: true };

    // Serialise MongoDB types to plain JSON
    return { props: { product: JSON.parse(JSON.stringify(product)) } };
  } catch (err) {
    console.error('[products/[id]] Failed to load product:', err.message);
    return { notFound: true };
  }
}
