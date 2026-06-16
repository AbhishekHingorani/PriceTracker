import { useState }   from 'react';
import Link           from 'next/link';
import PriceGraph     from './PriceGraph';

/** Compute min, max, avg from the priceHistory array. */
function calcStats(priceHistory) {
  if (!priceHistory?.length) return { min: null, max: null, avg: null };
  const prices = priceHistory.map((h) => h.price);
  return {
    min: Math.min(...prices),
    max: Math.max(...prices),
    avg: prices.reduce((a, b) => a + b, 0) / prices.length,
  };
}

/** Relative-time formatter (e.g., "5 min ago", "2 hrs ago"). */
function relativeTime(d) {
  if (!d) return '—';
  const diffMs   = Date.now() - new Date(d).getTime();
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 1)  return 'just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHrs = Math.round(diffMins / 60);
  if (diffHrs < 24)  return `${diffHrs} hr${diffHrs !== 1 ? 's' : ''} ago`;
  const diffDays = Math.round(diffHrs / 24);
  return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
}

const INPUT_CLASS =
  'w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent ' +
  'placeholder:text-gray-400 font-normal';

export default function ProductCard({ product, onUpdate, onDelete }) {
  const [loading, setLoading]               = useState(false);
  const [toast, setToast]                   = useState(null);
  const [currentProduct, setCurrentProduct] = useState(product);
  const [editing, setEditing]               = useState(false);
  const [editForm, setEditForm]             = useState({
    name:        product.name,
    url:         product.url,
    targetPrice: product.targetPrice,
    cssSelector: product.cssSelector,
    apiEndpoint: product.apiEndpoint || '',
    useApiCheck: product.useApiCheck || false,
  });
  const [editLoading, setEditLoading] = useState(false);
  const [editError,   setEditError]   = useState(null);

  const stats         = calcStats(currentProduct.priceHistory);
  const isBelowTarget =
    currentProduct.lastPrice !== null &&
    currentProduct.lastPrice < currentProduct.targetPrice;

  const showToast = (type, message) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 4000);
  };

  const handleCheck = async () => {
    setLoading(true);
    try {
      const res  = await fetch(`/api/products/${currentProduct._id}/check`, { method: 'POST' });
      const data = await res.json();
      if (!res.ok) {
        showToast('error', data.error || 'Price check failed');
      } else {
        setCurrentProduct(data.product);
        if (onUpdate) onUpdate(data.product);
        showToast('success', `Updated: ₹${data.product.lastPrice?.toFixed(2)}`);
      }
    } catch {
      showToast('error', 'Network error — check your connection');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Remove "${currentProduct.name}" from tracking?`)) return;
    try {
      const res = await fetch(`/api/products/${currentProduct._id}`, { method: 'DELETE' });
      if (res.ok) {
        if (onDelete) onDelete(currentProduct._id);
      } else {
        showToast('error', 'Could not delete — try again');
      }
    } catch {
      showToast('error', 'Network error');
    }
  };

  const handleEditChange = (e) => {
    const { name, value, type, checked } = e.target;
    setEditForm((prev) => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditError(null);

    if (!editForm.name.trim() || !editForm.url.trim() || !editForm.cssSelector.trim()) {
      setEditError('Name, URL and CSS selector are required.');
      return;
    }
    const parsed = parseFloat(editForm.targetPrice);
    if (isNaN(parsed) || parsed <= 0) {
      setEditError('Target price must be a positive number.');
      return;
    }

    setEditLoading(true);
    try {
      const res  = await fetch(`/api/products/${currentProduct._id}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setEditError(data.error || 'Failed to save changes.');
      } else {
        setCurrentProduct(data);
        if (onUpdate) onUpdate(data);
        setEditing(false);
        showToast('success', 'Product updated');
      }
    } catch {
      setEditError('Network error. Try again.');
    } finally {
      setEditLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5 flex flex-col gap-4 relative">

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toast && (
        <div
          className={`absolute top-3 right-3 text-xs font-medium px-3 py-1.5 rounded-full shadow ${
            toast.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
          }`}
        >
          {toast.message}
        </div>
      )}

      {/* ── Edit modal ─────────────────────────────────────────────────────── */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-gray-900">Edit Product</h2>
              <button
                onClick={() => { setEditing(false); setEditError(null); }}
                className="text-gray-400 hover:text-gray-600 text-xl leading-none"
              >
                ×
              </button>
            </div>

            {editError && (
              <div className="mb-3 text-xs text-red-700 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">
                {editError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="flex flex-col gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Product Name</label>
                <input type="text" name="name" value={editForm.name} onChange={handleEditChange} className={INPUT_CLASS} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Product URL</label>
                <input type="url" name="url" value={editForm.url} onChange={handleEditChange} className={INPUT_CLASS} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Target Price (INR)</label>
                <input type="number" name="targetPrice" value={editForm.targetPrice} onChange={handleEditChange} step="0.01" min="0.01" className={INPUT_CLASS} required />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">CSS Selector</label>
                <input type="text" name="cssSelector" value={editForm.cssSelector} onChange={handleEditChange} className={`${INPUT_CLASS} font-mono`} required />
              </div>

              {/* API double-check toggle */}
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" name="useApiCheck" checked={editForm.useApiCheck} onChange={handleEditChange} className="rounded" />
                <span className="text-xs text-gray-600 font-medium">Enable API double-check</span>
              </label>

              {editForm.useApiCheck && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">API Endpoint</label>
                  <input type="url" name="apiEndpoint" value={editForm.apiEndpoint} onChange={handleEditChange} className={INPUT_CLASS} placeholder="https://api.example.com/price" />
                </div>
              )}

              <div className="flex gap-3 pt-1">
                <button
                  type="submit"
                  disabled={editLoading}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-semibold py-2 rounded-lg transition-colors"
                >
                  {editLoading ? 'Saving…' : 'Save Changes'}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditing(false); setEditError(null); }}
                  className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Header: name + actions ─────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <a
            href={currentProduct.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-base font-semibold text-gray-900 hover:text-indigo-600 transition-colors line-clamp-2 break-words"
          >
            {currentProduct.name}
          </a>
          <p className="text-xs text-gray-400 mt-0.5">
            Checked {relativeTime(currentProduct.lastChecked)}
          </p>
        </div>

        <div className="flex items-center gap-1 shrink-0 mt-0.5">
          {/* Edit button */}
          <button
            onClick={() => { setEditing(true); setEditError(null); }}
            className="text-gray-300 hover:text-indigo-500 transition-colors p-0.5"
            title="Edit product"
            aria-label="Edit product"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
          </button>
          {/* Delete button */}
          <button
            onClick={handleDelete}
            className="text-gray-300 hover:text-red-400 transition-colors p-0.5"
            title="Remove product"
            aria-label="Delete product"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Price comparison ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 flex-wrap">
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Current</p>
          <p className={`text-2xl font-bold ${isBelowTarget ? 'text-green-600' : 'text-gray-900'}`}>
            {currentProduct.lastPrice !== null ? `₹${currentProduct.lastPrice.toFixed(2)}` : '—'}
          </p>
        </div>
        <div className="w-px h-10 bg-gray-200 shrink-0" />
        <div>
          <p className="text-xs text-gray-500 mb-0.5">Target</p>
          <p className="text-2xl font-bold text-indigo-600">
            ₹{currentProduct.targetPrice.toFixed(2)}
          </p>
        </div>
        {isBelowTarget && (
          <span className="ml-auto text-xs font-semibold bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
            Below target!
          </span>
        )}
      </div>

      {/* ── Stats row ──────────────────────────────────────────────────────── */}
      {stats.min !== null && (
        <div className="flex gap-4 text-xs text-gray-500">
          <span>Min <span className="text-gray-800 font-medium">₹{stats.min.toFixed(2)}</span></span>
          <span>Max <span className="text-gray-800 font-medium">₹{stats.max.toFixed(2)}</span></span>
          <span>Avg <span className="text-gray-800 font-medium">₹{stats.avg.toFixed(2)}</span></span>
        </div>
      )}

      {/* ── Compact price graph ─────────────────────────────────────────────── */}
      <PriceGraph priceHistory={currentProduct.priceHistory} compact />

      {/* ── Action buttons ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-3 pt-1">
        <button
          onClick={handleCheck}
          disabled={loading}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Checking…
            </>
          ) : 'Check Price Now'}
        </button>
        <Link
          href={`/products/${currentProduct._id}`}
          className="text-sm text-gray-500 hover:text-indigo-600 font-medium px-3 py-2 rounded-lg border border-gray-200 hover:border-indigo-300 transition-colors whitespace-nowrap"
        >
          Details
        </Link>
      </div>
    </div>
  );
}
