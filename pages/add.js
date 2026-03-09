/**
 * /add – form page for adding a new tracked product.
 */
import Link           from 'next/link';
import Navbar         from '../components/Navbar';
import AddProductForm from '../components/AddProductForm';

export default function AddProduct() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      <main className="max-w-xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link href="/" className="text-sm text-gray-500 hover:text-indigo-600 inline-flex items-center gap-1">
            ← Back to products
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">Add New Product</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Enter the product details below to start tracking its price.
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <AddProductForm />
        </div>

        {/* ── Tips ──────────────────────────────────────────────────────── */}
        <div className="mt-5 text-xs text-gray-400 space-y-1">
          <p>
            <strong className="text-gray-500">Tip:</strong> To find the CSS selector, open the
            product page in Chrome, right-click the price, choose <em>Inspect</em>, then
            right-click the highlighted element → <em>Copy → Copy selector</em>.
          </p>
          <p>
            Price alerts are sent via <strong className="text-gray-500">ntfy</strong>. Subscribe to
            your topic in the{' '}
            <a href="https://ntfy.sh" target="_blank" rel="noopener noreferrer" className="underline hover:text-indigo-500">
              ntfy app or website
            </a>.
          </p>
        </div>
      </main>
    </div>
  );
}
