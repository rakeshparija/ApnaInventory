import { useEffect, useState } from 'react';
import { reportsApi } from '../api/client';
import {
  TrendingUp, TrendingDown, Package, ShoppingCart, Loader2, BarChart3
} from 'lucide-react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface PLData {
  revenue: number;
  cogs: number;
  gross_profit: number;
  gross_margin: number;
  expenses: number;
  net_profit: number;
  net_margin: number;
  purchases: number;
  sales_count: number;
}
interface BestSeller {
  id: number; name: string; category: string; unit: string;
  qty_sold: number; revenue: number; profit: number; margin: number;
}
interface MonthlyData {
  month: string; label: string; sales: number; purchases: number; profit: number; expenses: number;
}
interface InventoryValue {
  total_products: number; total_cost_value: number; total_selling_value: number;
  potential_profit: number; categories: Array<{ category: string; items: number; cost_value: number; selling_value: number }>;
}

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const fmtPct = (n: number) => `${n.toFixed(1)}%`;
const today = new Date().toISOString().split('T')[0];
const firstOfMonth = today.slice(0, 7) + '-01';

export default function Reports() {
  const [from, setFrom] = useState(firstOfMonth);
  const [to, setTo] = useState(today);
  const [pl, setPL] = useState<PLData | null>(null);
  const [bestSellers, setBestSellers] = useState<BestSeller[]>([]);
  const [monthly, setMonthly] = useState<MonthlyData[]>([]);
  const [invValue, setInvValue] = useState<InventoryValue | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      reportsApi.getProfitLoss({ from, to }),
      reportsApi.getBestSellers({ from, to, limit: 10 }),
      reportsApi.getMonthlyTrend(),
      reportsApi.getInventoryValue(),
    ]).then(([plRes, bsRes, monthlyRes, invRes]) => {
      setPL(plRes.data);
      setBestSellers(bsRes.data);
      setMonthly(monthlyRes.data);
      setInvValue(invRes.data);
    }).finally(() => setLoading(false));
  }, [from, to]);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <Loader2 className="animate-spin text-blue-800" size={32} />
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports & Insights</h1>
          <p className="text-gray-500 text-sm">Business performance analytics</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">From</label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input w-36" />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs text-gray-500">To</label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input w-36" />
          </div>
        </div>
      </div>

      {/* P&L Summary */}
      {pl && (
        <div className="card p-6">
          <h2 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <BarChart3 size={18} className="text-blue-700" />
            Profit & Loss Summary
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Total Revenue</p>
              <p className="text-2xl font-bold text-blue-700">{fmt(pl.revenue)}</p>
              <p className="text-xs text-gray-400">{pl.sales_count} sales</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Cost of Goods (COGS)</p>
              <p className="text-2xl font-bold text-orange-600">{fmt(pl.cogs)}</p>
              <p className="text-xs text-gray-400">Stock sold at cost</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Gross Profit</p>
              <p className="text-2xl font-bold text-green-700">{fmt(pl.gross_profit)}</p>
              <p className="text-xs text-gray-400">Margin: {fmtPct(pl.gross_margin)}</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Total Expenses</p>
              <p className="text-2xl font-bold text-red-600">{fmt(pl.expenses)}</p>
              <p className="text-xs text-gray-400">Operating costs</p>
            </div>
          </div>

          <div className="mt-4 p-4 rounded-xl border-2 border-dashed flex items-center justify-between flex-wrap gap-3"
            style={{ borderColor: pl.net_profit >= 0 ? '#16a34a' : '#dc2626', backgroundColor: pl.net_profit >= 0 ? '#f0fdf4' : '#fef2f2' }}>
            <div>
              <p className="text-sm text-gray-600 font-medium">Net Profit / Loss</p>
              <p className="text-xs text-gray-400">After all expenses</p>
            </div>
            <div className="flex items-center gap-3">
              {pl.net_profit >= 0
                ? <TrendingUp size={32} className="text-green-600" />
                : <TrendingDown size={32} className="text-red-500" />}
              <div className="text-right">
                <p className={`text-3xl font-bold ${pl.net_profit >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {fmt(pl.net_profit)}
                </p>
                <p className="text-xs text-gray-500">Net margin: {fmtPct(pl.net_margin)}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Monthly Trend Chart */}
      {monthly.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Monthly Trend — Last 6 Months</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="label" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, '']} />
              <Legend />
              <Line type="monotone" dataKey="sales" name="Sales" stroke="#1e40af" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="profit" name="Net Profit" stroke="#16a34a" strokeWidth={2} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="expenses" name="Expenses" stroke="#dc2626" strokeWidth={2} strokeDasharray="5 5" dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Best Sellers */}
      {bestSellers.length > 0 && (
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800 flex items-center gap-2">
              <ShoppingCart size={18} className="text-blue-700" />
              Best Selling Products
            </h3>
          </div>
          <div className="p-5">
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={bestSellers.slice(0, 8)} layout="vertical" margin={{ left: 80 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                <Tooltip formatter={(v: number) => [`₹${v.toLocaleString('en-IN')}`, '']} />
                <Bar dataKey="revenue" name="Revenue" fill="#1e40af" radius={[0, 4, 4, 0]} />
                <Bar dataKey="profit" name="Profit" fill="#16a34a" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-x-auto border-t border-gray-100">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="table-th">#</th>
                  <th className="table-th">Product</th>
                  <th className="table-th">Category</th>
                  <th className="table-th">Qty Sold</th>
                  <th className="table-th">Revenue</th>
                  <th className="table-th">Profit</th>
                  <th className="table-th">Margin</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {bestSellers.map((p, i) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="table-td font-bold text-gray-400">#{i + 1}</td>
                    <td className="table-td font-medium">{p.name}</td>
                    <td className="table-td text-xs text-gray-400">{p.category || '-'}</td>
                    <td className="table-td">{p.qty_sold} {p.unit}</td>
                    <td className="table-td font-semibold text-blue-700">{fmt(p.revenue)}</td>
                    <td className="table-td font-semibold text-green-700">{fmt(p.profit)}</td>
                    <td className="table-td">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${p.margin >= 20 ? 'bg-green-100 text-green-700' : p.margin >= 10 ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-700'}`}>
                        {fmtPct(p.margin)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inventory Value */}
      {invValue && (
        <div className="card p-6">
          <h3 className="font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Package size={18} className="text-purple-700" />
            Inventory Value
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-purple-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Total Products</p>
              <p className="text-2xl font-bold text-purple-700">{invValue.total_products}</p>
            </div>
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Stock at Cost</p>
              <p className="text-2xl font-bold text-blue-700">{fmt(invValue.total_cost_value)}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Stock at MRP</p>
              <p className="text-2xl font-bold text-green-700">{fmt(invValue.total_selling_value)}</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">Potential Profit</p>
              <p className="text-2xl font-bold text-orange-600">{fmt(invValue.potential_profit)}</p>
            </div>
          </div>
          {invValue.categories.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-gray-600 mb-3">By Category</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {invValue.categories.map(c => (
                  <div key={c.category} className="border border-gray-100 rounded-xl p-3">
                    <p className="text-xs font-semibold text-gray-600">{c.category || 'Uncategorized'}</p>
                    <p className="text-sm font-bold text-gray-800 mt-1">{fmt(c.selling_value)}</p>
                    <p className="text-xs text-gray-400">{c.items} items · Cost: {fmt(c.cost_value)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
