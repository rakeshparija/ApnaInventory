import { useEffect, useState, useCallback } from 'react';
import { expensesApi } from '../api/client';
import { Plus, X, Loader2, Wallet, Trash2, Pencil } from 'lucide-react';

interface Expense {
  id: number; date: string; category: string; amount: number; description?: string;
}

const CATEGORIES = ['Rent', 'Electricity', 'Salary', 'Transport', 'Packaging', 'Marketing', 'Repairs', 'Other'];
const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const today = new Date().toISOString().split('T')[0];

const CATEGORY_COLORS: Record<string, string> = {
  Rent: 'bg-purple-100 text-purple-700',
  Electricity: 'bg-yellow-100 text-yellow-700',
  Salary: 'bg-blue-100 text-blue-700',
  Transport: 'bg-green-100 text-green-700',
  Packaging: 'bg-orange-100 text-orange-700',
  Marketing: 'bg-pink-100 text-pink-700',
  Repairs: 'bg-red-100 text-red-700',
  Other: 'bg-gray-100 text-gray-700',
};

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ date: today, category: 'Rent', amount: '', description: '' });
  const [filterMonth, setFilterMonth] = useState(today.slice(0, 7));

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (filterMonth) {
        params.from = `${filterMonth}-01`;
        const [y, m] = filterMonth.split('-').map(Number);
        const lastDay = new Date(y, m, 0).getDate();
        params.to = `${filterMonth}-${lastDay}`;
      }
      const r = await expensesApi.getAll(params);
      setExpenses(r.data);
    } finally {
      setLoading(false);
    }
  }, [filterMonth]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => {
    setEditing(null);
    setForm({ date: today, category: 'Rent', amount: '', description: '' });
    setShowModal(true);
  };

  const openEdit = (e: Expense) => {
    setEditing(e);
    setForm({ date: e.date, category: e.category, amount: String(e.amount), description: e.description || '' });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) return alert('Enter a valid amount');
    setSaving(true);
    try {
      const data = { date: form.date, category: form.category, amount: parseFloat(form.amount), description: form.description };
      if (editing) {
        await expensesApi.update(editing.id, data);
      } else {
        await expensesApi.create(data);
      }
      setShowModal(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const del = async (id: number) => {
    if (!confirm('Delete this expense?')) return;
    await expensesApi.delete(id);
    load();
  };

  const total = expenses.reduce((s, e) => s + e.amount, 0);

  // Category breakdown
  const byCategory = CATEGORIES.map(cat => ({
    cat,
    total: expenses.filter(e => e.category === cat).reduce((s, e) => s + e.amount, 0),
  })).filter(c => c.total > 0).sort((a, b) => b.total - a.total);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
          <p className="text-gray-500 text-sm">Track all your business expenses</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="month" value={filterMonth} onChange={e => setFilterMonth(e.target.value)}
            className="input w-40" />
          <button onClick={openAdd} className="btn-primary">
            <Plus size={18} /> Add Expense
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="card p-4 sm:col-span-2">
          <p className="text-xs text-gray-500 mb-1">Total Expenses</p>
          <p className="text-3xl font-bold text-red-600">{fmt(total)}</p>
          <p className="text-xs text-gray-400 mt-1">{expenses.length} entries this month</p>
        </div>
        {byCategory.slice(0, 2).map(c => (
          <div key={c.cat} className="card p-4">
            <p className="text-xs text-gray-500 mb-1">{c.cat}</p>
            <p className="text-xl font-bold text-gray-800">{fmt(c.total)}</p>
            <p className="text-xs text-gray-400 mt-1">{total > 0 ? Math.round(c.total / total * 100) : 0}% of total</p>
          </div>
        ))}
      </div>

      {/* Category breakdown */}
      {byCategory.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-800 mb-4">Spending by Category</h3>
          <div className="space-y-2">
            {byCategory.map(c => (
              <div key={c.cat} className="flex items-center gap-3">
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full w-28 text-center ${CATEGORY_COLORS[c.cat] || 'bg-gray-100 text-gray-700'}`}>
                  {c.cat}
                </span>
                <div className="flex-1 bg-gray-100 rounded-full h-2">
                  <div className="bg-red-400 h-2 rounded-full transition-all"
                    style={{ width: `${total > 0 ? (c.total / total * 100) : 0}%` }} />
                </div>
                <span className="text-sm font-semibold text-gray-700 w-24 text-right">{fmt(c.total)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Expenses table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">All Expenses</h3>
          <span className="text-sm text-gray-400">{expenses.length} entries</span>
        </div>
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-800" size={28} /></div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-12">
            <Wallet size={40} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-400">No expenses recorded for this month</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-th">Date</th>
                  <th className="table-th">Category</th>
                  <th className="table-th">Description</th>
                  <th className="table-th">Amount</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {expenses.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td text-gray-500">{e.date}</td>
                    <td className="table-td">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[e.category] || 'bg-gray-100 text-gray-700'}`}>
                        {e.category}
                      </span>
                    </td>
                    <td className="table-td text-gray-500">{e.description || '-'}</td>
                    <td className="table-td font-semibold text-red-600">{fmt(e.amount)}</td>
                    <td className="table-td">
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(e)} className="text-blue-500 hover:text-blue-700 p-1"><Pencil size={15} /></button>
                        <button onClick={() => del(e.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold">{editing ? 'Edit Expense' : 'Add Expense'}</h2>
              <button onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Date</label>
                <input type="date" className="input" value={form.date}
                  onChange={e => setForm(f => ({ ...f, date: e.target.value }))} />
              </div>
              <div>
                <label className="label">Category</label>
                <select className="input" value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Amount (₹)</label>
                <input type="number" className="input" value={form.amount}
                  onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0" min="0" step="0.01" />
              </div>
              <div>
                <label className="label">Description (optional)</label>
                <input className="input" value={form.description}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                  placeholder="e.g., Monthly shop rent" />
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={save} disabled={saving} className="btn-primary">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {editing ? 'Update' : 'Add'} Expense
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
