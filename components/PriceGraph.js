/**
 * PriceGraph – line chart showing price over time.
 *
 * Uses Recharts (client-side only). Renders a friendly placeholder
 * when no history data is available yet.
 *
 * Props:
 *   priceHistory {Array<{ price: number, timestamp: string|Date }>}
 *   compact      {boolean} – true renders a small card-sized chart (default: false)
 */
import dynamic from 'next/dynamic';

// Recharts relies on browser APIs; disable SSR to avoid hydration errors
const Chart = dynamic(() => import('./_PriceGraphInner'), { ssr: false });

export default function PriceGraph({ priceHistory = [], compact = false }) {
  if (!priceHistory || priceHistory.length === 0) {
    return (
      <div
        className={`flex items-center justify-center bg-gray-50 rounded-lg text-gray-400 text-xs ${
          compact ? 'h-24' : 'h-48'
        }`}
      >
        No price history yet
      </div>
    );
  }

  return <Chart priceHistory={priceHistory} compact={compact} />;
}
