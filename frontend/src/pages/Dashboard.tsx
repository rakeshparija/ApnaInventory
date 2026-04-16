import { useEffect, useState, useCallback } from 'react';
import { reportsApi } from '../api/client';
import StatCard from '../components/StatCard';
import {
  TrendingUp, Package, Users, IndianRupee,
  AlertTriangle, ArrowUpRight, ShoppingCart, Loader2, Calendar
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';

interface DashboardData {
  from: string;
  to: string;
  today: {
    sales: number;
    sales_count: number;
    purchases: number;
    gross_profit: number;
    net_profit: number;
    expenses: number;
  };
  stock: { cost_value: number; selling_value: number };
  pending_udhaar: number;
  supplier_payable: number;
  low_stock: Array<{ id: number; name: string; stock_qty: number; unit: string; min_stock_alert: number }>;
  recent_transactions: Array<{
    id: number; type: string; date: string; total: number; paid: number;
    customer_name?: string; supplier_name?: string; payment_method: string;
  }>;
  chart_data: Array<{ date: string; label: string; sales: number; profit: number; gross_profit: number; expenses: number }>;
}

type Preset = 'today' | 'yesterday' | 'last7' | 'thisMonth' | 'lastMonth' | 'custom';

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;

function toISO(d: Date) {
  return d.toISOString().split('T')[0];
}

function getPresetRange(preset: Exclude<Preset, 'custom'>): { from: string; to: string } {
  const today = new Date();
  switch (preset) {
    case 'today':
      return { from: toISO(today), to: toISO(today) };
    case 'yesterday': {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      return { from: toISO(y), to: toISO(y) };
    }
    case 'last7': {
      const from = new Date(today);
      from.setDate(from.getDate() - 6);
      return { from: toISO(from), to: toISO(today) };
    }
    case 'thisMonth': {
      const from = new Date(today.getFullYear(), today.getMonth(), 1);
      return { from: toISO(from), to: toISO(today) };
    }
    case 'lastMonth': {
      const from = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const to = new Date(today.getFullYear(), today.getMonth(), 0);
      return { from: toISO(from), to: toISO(to) };
    }
  }
}

function formatPeriodLabel(from: string, to: string): string {
  if (from === to) {
    return new Date(from + 'T12:00:00').toLocaleDateString('en-IN', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
    });
  }
  const f = new Date(from + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  const t = new Date(to + 'T12:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${f} – ${t}`;
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const todayStr = toISO(new Date());
  const [preset, setPreset] = useState<Preset>('today');
  const [customFrom, setCustomFrom] = useState(todayStr);
  const [customTo, setCustomTo] = useState(todayStr);
  const [appliedFrom, setAppliedFrom] = useState(todayStr);
  const [appliedTo, setAppliedTo] = useState(todayStr);

  const fetchData = useCallback((from: string, to: string) => {
    setLoading(true);
    setError('');
    reportsApi.getDashboard({ from, to })
      .then(r => setData(r.data))
      .catch(() => setError('Failed to load dashboard data'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchData(appliedFrom, appliedTo);
  }, [appliedFrom, appliedTo, fetchData]);

  function handlePreset(p: Exclude<Preset, 'custom'>) {
    setPreset(p);
    const range = getPresetRange(p);
    setAppliedFrom(range.from);
    setAppliedTo(range.to);
  }

  function handleCustomApply() {
    if (customFrom > customTo) return;
    setPreset('custom');
    setAppliedFrom(customFrom);
    setAppliedTo(customTo);
  }

  const presets: { key: Exclude<Preset, 'custom'>; label: string }[] = [
    { key: 'today', label: 'Today' },
    { key: 'yesterday', label: 'Yesterday' },
    { key: 'last7', label: 'Last 7 Days' },
    { key: 'thisMonth', label: 'This Month' },
    { key: 'lastMonth', label: 'Last Month' },
  ];

  const periodLabel = data ? formatPeriodLabel(data.from, data.to) : '';
  const isSingleDay = appliedFrom === appliedTo;

  if (error) return (
    <div className="text-center py-12 text-red-600">{error}</div>
  );

  const { today, stock, pending_udhaar, low_stock, recent_transactions, chart_data } = data ?? {} as DashboardData;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          {data && (
            <p className="text-gray-500 text-sm mt-1">{periodLabel}</p>
          )}
        </div>
      </div>

      {/* Date Filter Bar */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-gray-500 text-sm font-medium">
            <Calendar size={16} />
            <span>Filter:</span>
          </div>

          {/* Preset buttons */}
          <div className="flex flex-wrap gap-2">
            {presets.map(p => (
              <button
                key={p.key}
                onClick={() => handlePreset(p.key)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  preset === p.key
                    ? 'bg-blue-800 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Divider */}
          <div className="hidden sm:block w-px h-6 bg-gray-200" />

          {/* Custom range */}
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="date"
              value={customFrom}
              max={customTo}
              onChange={e => setCustomFrom(e.target.value)}
              className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-400 text-sm">to</span>
            <input
              type="date"
              value={customTo}
              min={customFrom}
              max={todayStr}
              onChange={e => setCustomTo(e.target.value)}
              className="border border-gray-300 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleCustomApply}
              disabled={customFrom > customTo}
              className="px-3 py-1.5 rounded-lg text-sm font-medium bg-blue-800 text-white hover:bg-blue-900 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="animate-spin text-blue-800" size={32} />
        </div>
      ) : data && (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <StatCard
              title={isSingleDay ? "Sales" : "Total Sales"}
              value={fmt(today.sales)}
              subtitle={`${today.sales_count} transactions`}
              icon={<ShoppingCart size={22} className="text-blue-700" />}
              iconBg="bg-blue-100"
            />
            <StatCard
              title={isSingleDay ? "Net Profit" : "Total Net Profit"}
              value={fmt(today.net_profit)}
              subtitle={`Gross: ${fmt(today.gross_profit)}`}
              icon={<TrendingUp size={22} className="text-green-700" />}
              iconBg="bg-green-100"
              valueColor={today.net_profit >= 0 ? 'text-green-700' : 'text-red-600'}
            />
            <StatCard
              title="Total Stock Value"
              value={fmt(stock.selling_value)}
              subtitle={`Cost: ${fmt(stock.cost_value)}`}
              icon={<Package size={22} className="text-purple-700" />}
              iconBg="bg-purple-100"
            />
            <StatCard
              title="Pending Udhaar"
              value={fmt(pending_udhaar)}
              subtitle="Customer credit balance"
              icon={<Users size={22} className="text-orange-700" />}
              iconBg="bg-orange-100"
              valueColor={pending_udhaar > 0 ? 'text-orange-600' : 'text-gray-900'}
            />
          </div>

          {/* Secondary stats */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="card p-4 flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-xl">
                <IndianRupee size={20} className="text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">{isSingleDay ? "Expenses" : "Total Expenses"}</p>
                <p className="text-xl font-bold text-red-600">{fmt(today.expenses)}</p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-xl">
                <IndianRupee size={20} className="text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Supplier Payable</p>
                <p className="text-xl font-bold text-yellow-600">{fmt(data.supplier_payable)}</p>
              </div>
            </div>
            <div className="card p-4 flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-xl">
                <Package size={20} className="text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-500">Low Stock Items</p>
                <p className="text-xl font-bold text-blue-600">{low_stock.length}</p>
              </div>
            </div>
          </div>

          {/* Chart + Low Stock */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Bar Chart */}
            <div className="card p-5 xl:col-span-2">
              <h3 className="font-semibold text-gray-800 mb-4">
                Sales vs Profit — {periodLabel}
              </h3>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={chart_data} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`} />
                  <Tooltip
                    formatter={(value: number) => [`₹${value.toLocaleString('en-IN')}`, '']}
                    labelStyle={{ fontWeight: 600 }}
                  />
                  <Legend />
                  <Bar dataKey="sales" name="Sales" fill="#1e40af" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="profit" name="Net Profit" fill="#16a34a" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Low Stock Alerts */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle size={18} className="text-orange-500" />
                <h3 className="font-semibold text-gray-800">Low Stock Alerts</h3>
              </div>
              {low_stock.length === 0 ? (
                <p className="text-gray-400 text-sm text-center py-4">All stock levels are healthy!</p>
              ) : (
                <div className="space-y-2">
                  {low_stock.map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-gray-800 truncate max-w-[160px]">{p.name}</p>
                        <p className="text-xs text-gray-400">Min: {p.min_stock_alert} {p.unit}</p>
                      </div>
                      <span className={`text-sm font-bold ${p.stock_qty <= 0 ? 'text-red-600' : 'text-orange-500'}`}>
                        {p.stock_qty} {p.unit}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="card">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">
                Transactions — {periodLabel}
              </h3>
              <a href="/transactions" className="text-sm text-blue-700 hover:underline flex items-center gap-1">
                View all <ArrowUpRight size={14} />
              </a>
            </div>
            {recent_transactions.length === 0 ? (
              <p className="text-center text-gray-400 text-sm py-8">No transactions in this period.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="table-th">Date</th>
                      <th className="table-th">Type</th>
                      <th className="table-th">Party</th>
                      <th className="table-th">Total</th>
                      <th className="table-th">Paid</th>
                      <th className="table-th">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {recent_transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                        <td className="table-td text-gray-500">{tx.date}</td>
                        <td className="table-td">
                          <span className={`badge-${tx.type === 'sale' ? 'green' : 'blue'}`}>
                            {tx.type === 'sale' ? 'Sale' : 'Purchase'}
                          </span>
                        </td>
                        <td className="table-td font-medium">{tx.customer_name || tx.supplier_name || '-'}</td>
                        <td className="table-td font-semibold">{fmt(tx.total)}</td>
                        <td className="table-td text-green-700">{fmt(tx.paid)}</td>
                        <td className="table-td">
                          {tx.total - tx.paid > 0 ? (
                            <span className="text-orange-600 font-medium">{fmt(tx.total - tx.paid)}</span>
                          ) : (
                            <span className="text-green-600">Paid</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
