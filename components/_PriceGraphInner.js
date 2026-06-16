/**
 * _PriceGraphInner – the actual Recharts implementation.
 * Imported dynamically by PriceGraph.js with ssr: false to avoid
 * server-side rendering errors with Recharts' browser-only APIs.
 */
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

/**
 * @param {{ priceHistory: Array<{ price: number, timestamp: string }>, compact: boolean }} props
 */
export default function PriceGraphInner({ priceHistory, compact }) {
  const data = priceHistory.map((entry) => ({
    price: entry.price,
    date: new Date(entry.timestamp).toLocaleDateString('en-US', {
      month: 'short',
      day:   'numeric',
      ...(compact ? {} : { hour: '2-digit', minute: '2-digit' }),
    }),
  }));

  const height = compact ? 100 : 240;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />

        <XAxis
          dataKey="date"
          tick={{ fontSize: compact ? 10 : 12, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          interval="preserveStartEnd"
        />

        <YAxis
          tick={{ fontSize: compact ? 10 : 12, fill: '#9ca3af' }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `₹${v.toFixed(0)}`}
          width={compact ? 36 : 50}
        />

        <Tooltip
          formatter={(value) => [`₹${value.toFixed(2)}`, 'Price']}
          contentStyle={{
            borderRadius: '8px',
            border:       '1px solid #e5e7eb',
            fontSize:     '13px',
            boxShadow:    '0 1px 6px rgba(0,0,0,0.06)',
          }}
        />

        <Line
          type="monotone"
          dataKey="price"
          stroke="#6366f1"
          strokeWidth={2}
          dot={compact ? false : { r: 3, fill: '#6366f1' }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
