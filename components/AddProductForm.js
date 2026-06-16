/**
 * AddProductForm – controlled form for adding a new tracked product.
 *
 * On successful submit, POSTs to POST /api/products and redirects to "/".
 *
 * Fields:
 *   name         – product display name (required)
 *   url          – product page URL (required)
 *   targetPrice  – alert threshold in USD (required)
 *   cssSelector  – CSS selector pointing to the price element (required)
 *   useApiCheck  – toggle to enable API double-check (optional)
 *   apiEndpoint  – JSON API URL for the double-check (optional, shown when toggle is on)
 */
import { useState }   from 'react';
import { useRouter }  from 'next/router';

const INPUT_CLASS =
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm ' +
  'focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent ' +
  'placeholder:text-gray-400 disabled:bg-gray-50';

const LABEL_CLASS = 'block text-sm font-medium text-gray-700 mb-1';

export default function AddProductForm() {
  const router = useRouter();

  const [form, setForm] = useState({
    name:         '',
    url:          '',
    targetPrice:  '',
    targetPrice2: '',
    targetPrice3: '',
    cssSelector:  '',
    apiEndpoint:  '',
    useApiCheck:  false,
  });

  const [error,   setError]   = useState(null);
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    // Client-side validation
    if (!form.name.trim() || !form.url.trim() || !form.targetPrice || !form.cssSelector.trim()) {
      setError('Please fill in all required fields.');
      return;
    }

    const parsed = parseFloat(form.targetPrice);
    if (isNaN(parsed) || parsed <= 0) {
      setError('Target price must be a positive number (e.g. 49.99).');
      return;
    }

    if (form.targetPrice2) {
      const parsed2 = parseFloat(form.targetPrice2);
      if (isNaN(parsed2) || parsed2 <= 0) {
        setError('Target price 2 must be a positive number.');
        return;
      }
    }

    if (form.targetPrice3) {
      const parsed3 = parseFloat(form.targetPrice3);
      if (isNaN(parsed3) || parsed3 <= 0) {
        setError('Target price 3 must be a positive number.');
        return;
      }
    }

    if (form.useApiCheck && !form.apiEndpoint.trim()) {
      setError('Please provide an API endpoint URL, or disable the API double-check toggle.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/products', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to add product. Please try again.');
      } else {
        // Success — return to homepage
        router.push('/');
      }
    } catch {
      setError('Network error. Check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5" noValidate>

      {/* ── Error banner ──────────────────────────────────────────────────── */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* ── Product Name ──────────────────────────────────────────────────── */}
      <div>
        <label htmlFor="name" className={LABEL_CLASS}>
          Product Name <span className="text-red-500">*</span>
        </label>
        <input
          id="name"
          type="text"
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="e.g. Sony WH-1000XM5 Headphones"
          className={INPUT_CLASS}
          disabled={loading}
          required
        />
      </div>

      {/* ── Product URL ───────────────────────────────────────────────────── */}
      <div>
        <label htmlFor="url" className={LABEL_CLASS}>
          Product URL <span className="text-red-500">*</span>
        </label>
        <input
          id="url"
          type="url"
          name="url"
          value={form.url}
          onChange={handleChange}
          placeholder="https://www.amazon.com/dp/B09XS7JWHH"
          className={INPUT_CLASS}
          disabled={loading}
          required
        />
      </div>

      {/* ── Target Price ──────────────────────────────────────────────────── */}
      <div>
        <label htmlFor="targetPrice" className={LABEL_CLASS}>
          Target Price (INR) <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">
            ₹
          </span>
          <input
            id="targetPrice"
            type="number"
            name="targetPrice"
            value={form.targetPrice}
            onChange={handleChange}
            placeholder="199.99"
            step="0.01"
            min="0.01"
            className={`${INPUT_CLASS} pl-7`}
            disabled={loading}
            required
          />
        </div>
        <p className="text-xs text-gray-400 mt-1">
          You&apos;ll receive an alert when the price drops below this value.
        </p>
      </div>

      {/* ── Target Price 2 ──────────────────────────────────────────────────── */}
      <div>
        <label htmlFor="targetPrice2" className={LABEL_CLASS}>
          Target Price 2 (Optional)
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">
            ₹
          </span>
          <input
            id="targetPrice2"
            type="number"
            name="targetPrice2"
            value={form.targetPrice2}
            onChange={handleChange}
            placeholder="149.99"
            step="0.01"
            min="0.01"
            className={`${INPUT_CLASS} pl-7`}
            disabled={loading}
          />
        </div>
      </div>

      {/* ── Target Price 3 ──────────────────────────────────────────────────── */}
      <div>
        <label htmlFor="targetPrice3" className={LABEL_CLASS}>
          Target Price 3 (Optional)
        </label>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm select-none">
            ₹
          </span>
          <input
            id="targetPrice3"
            type="number"
            name="targetPrice3"
            value={form.targetPrice3}
            onChange={handleChange}
            placeholder="99.99"
            step="0.01"
            min="0.01"
            className={`${INPUT_CLASS} pl-7`}
            disabled={loading}
          />
        </div>
      </div>

      {/* ── CSS Selector ──────────────────────────────────────────────────── */}
      <div>
        <label htmlFor="cssSelector" className={LABEL_CLASS}>
          CSS Selector for Price <span className="text-red-500">*</span>
        </label>
        <input
          id="cssSelector"
          type="text"
          name="cssSelector"
          value={form.cssSelector}
          onChange={handleChange}
          placeholder=".a-price .a-offscreen"
          className={`${INPUT_CLASS} font-mono`}
          disabled={loading}
          required
        />
        <p className="text-xs text-gray-400 mt-1">
          Right-click the price on the product page → <strong>Inspect</strong> → right-click the
          element in DevTools → <strong>Copy → Copy selector</strong>.
        </p>
      </div>

      {/* ── API double-check toggle ───────────────────────────────────────── */}
      <div className="bg-gray-50 rounded-xl p-4 flex flex-col gap-3">
        <label className="flex items-center gap-3 cursor-pointer select-none">
          <div className="relative">
            <input
              type="checkbox"
              name="useApiCheck"
              id="useApiCheck"
              checked={form.useApiCheck}
              onChange={handleChange}
              className="sr-only"
              disabled={loading}
            />
            <div
              className={`w-9 h-5 rounded-full transition-colors ${
                form.useApiCheck ? 'bg-indigo-600' : 'bg-gray-300'
              }`}
            />
            <div
              className={`absolute top-0.5 left-0.5 bg-white w-4 h-4 rounded-full shadow transition-transform ${
                form.useApiCheck ? 'translate-x-4' : ''
              }`}
            />
          </div>
          <span className="text-sm font-medium text-gray-700">
            Enable API double-check
            <span className="ml-1 text-gray-400 font-normal">(optional)</span>
          </span>
        </label>

        {form.useApiCheck && (
          <div>
            <label htmlFor="apiEndpoint" className={LABEL_CLASS}>
              API Endpoint URL
            </label>
            <input
              id="apiEndpoint"
              type="url"
              name="apiEndpoint"
              value={form.apiEndpoint}
              onChange={handleChange}
              placeholder="https://api.example.com/product/123/price"
              className={INPUT_CLASS}
              disabled={loading}
            />
            <p className="text-xs text-gray-400 mt-1">
              Must return JSON. The first numeric value found in the response will be treated as the
              price and averaged with the CSS-scraped price.
            </p>
          </div>
        )}
      </div>

      {/* ── Submit ────────────────────────────────────────────────────────── */}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
      >
        {loading ? (
          <>
            <svg
              className="animate-spin h-4 w-4"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Adding…
          </>
        ) : (
          'Add Product'
        )}
      </button>
    </form>
  );
}
