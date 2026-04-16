import { useEffect, useState, useCallback } from 'react';
import { transactionsApi, customersApi, suppliersApi, productsApi } from '../api/client';
import { Plus, Trash2, Search, Filter, X, Loader2, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

interface Transaction {
  id: number; type: string; date: string; total: number; paid: number;
  subtotal: number; discount: number; payment_method: string; notes?: string;
  customer_name?: string; supplier_name?: string;
  customer_id?: number; supplier_id?: number;
}
interface Product { id: number; name: string; selling_price: number; cost_price: number; unit: string; stock_qty: number; }
interface Customer { id: number; name: string; phone?: string; }
interface Supplier { id: number; name: string; phone?: string; }
interface SaleItem { product_id: number; qty: number; price: number; product?: Product; }

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const today = new Date().toISOString().split('T')[0];

export default function Transactions() {
  const [tab, setTab] = useState<'sale' | 'purchase'>('sale');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [saving, setSaving] = useState(false);

  // Form state
  const [form, setForm] = useState({
    date: today,
    customer_id: '',
    supplier_id: '',
    payment_method: 'cash',
    discount: 0,
    paid: 0,
    notes: '',
  });
  const [items, setItems] = useState<SaleItem[]>([{ product_id: 0, qty: 1, price: 0 }]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = { type: tab };
      if (from) params.from = from;
      if (to) params.to = to;
      const r = await transactionsApi.getAll(params);
      setTransactions(r.data);
    } finally {
      setLoading(false);
    }
  }, [tab, from, to]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (showModal) {
      customersApi.getAll().then(r => setCustomers(r.data));
      suppliersApi.getAll().then(r => setSuppliers(r.data));
      productsApi.getAll().then(r => setProducts(r.data));
    }
  }, [showModal]);

  const openModal = () => {
    setForm({ date: today, customer_id: '', supplier_id: '', payment_method: 'cash', discount: 0, paid: 0, notes: '' });
    setItems([{ product_id: 0, qty: 1, price: 0 }]);
    setShowModal(true);
  };

  const addItem = () => setItems(prev => [...prev, { product_id: 0, qty: 1, price: 0 }]);
  const removeItem = (idx: number) => setItems(prev => prev.filter((_, i) => i !== idx));

  const updateItem = (idx: number, field: keyof SaleItem, value: number) => {
    setItems(prev => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value };
      if (field === 'product_id') {
        const prod = products.find(p => p.id === value);
        if (prod) {
          next[idx].price = tab === 'sale' ? prod.selling_price : prod.cost_price;
          next[idx].product = prod;
        }
      }
      return next;
    });
  };

  const subtotal = items.reduce((sum, it) => sum + it.qty * it.price, 0);
  const total = subtotal - form.discount;

  const save = async () => {
    if (items.some(it => !it.product_id)) return alert('Please select all products');
    setSaving(true);
    try {
      await transactionsApi.create({
        type: tab,
        date: form.date,
        customer_id: form.customer_id ? parseInt(form.customer_id) : null,
        supplier_id: form.supplier_id ? parseInt(form.supplier_id) : null,
        items: items.map(it => ({ product_id: it.product_id, qty: it.qty, price: it.price })),
        discount: form.discount,
        paid: form.payment_method === 'credit' ? 0 : total,
        payment_method: form.payment_method,
        notes: form.notes,
      });
      setShowModal(false);
      load();
    } catch (err: unknown) {
      alert((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to save transaction');
    } finally {
      setSaving(false);
    }
  };

  const deleteTransaction = async (id: number) => {
    if (!confirm('Delete this transaction? Stock will be reversed.')) return;
    await transactionsApi.delete(id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-500 text-sm">Sales and purchase records</p>
        </div>
        <button onClick={openModal} className="btn-primary">
          <Plus size={18} /> New {tab === 'sale' ? 'Sale' : 'Purchase'}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-lg w-fit">
        {(['sale', 'purchase'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={clsx(
              'px-5 py-2 rounded-md text-sm font-medium transition-all',
              tab === t ? 'bg-white shadow-sm text-blue-800 font-semibold' : 'text-gray-600 hover:text-gray-800'
            )}
          >
            {t === 'sale' ? 'Sales' : 'Purchases'}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <Filter size={16} className="text-gray-400" />
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">From:</label>
          <input type="date" value={from} onChange={e => setFrom(e.target.value)} className="input w-36" />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500">To:</label>
          <input type="date" value={to} onChange={e => setTo(e.target.value)} className="input w-36" />
        </div>
        {(from || to) && (
          <button onClick={() => { setFrom(''); setTo(''); }} className="text-sm text-red-600 hover:underline flex items-center gap-1">
            <X size={14} /> Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-blue-800" size={28} />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 text-gray-400">No transactions found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-th">#</th>
                  <th className="table-th">Date</th>
                  <th className="table-th">{tab === 'sale' ? 'Customer' : 'Supplier'}</th>
                  <th className="table-th">Total</th>
                  <th className="table-th">Paid</th>
                  <th className="table-th">Balance</th>
                  <th className="table-th">Method</th>
                  <th className="table-th"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {transactions.map(tx => (
                  <tr key={tx.id} className="hover:bg-gray-50 transition-colors">
                    <td className="table-td text-gray-400">#{tx.id}</td>
                    <td className="table-td">{tx.date}</td>
                    <td className="table-td font-medium">{tx.customer_name || tx.supplier_name || '-'}</td>
                    <td className="table-td font-semibold">{fmt(tx.total)}</td>
                    <td className="table-td text-green-700">{fmt(tx.paid)}</td>
                    <td className="table-td">
                      {tx.total - tx.paid > 0
                        ? <span className="text-orange-600 font-medium">{fmt(tx.total - tx.paid)}</span>
                        : <span className="badge-green">Paid</span>
                      }
                    </td>
                    <td className="table-td">
                      <span className={clsx(
                        tx.payment_method === 'cash' ? 'badge-green' :
                        tx.payment_method === 'upi' ? 'badge-blue' : 'badge-yellow'
                      )}>
                        {tx.payment_method.toUpperCase()}
                      </span>
                    </td>
                    <td className="table-td">
                      <button onClick={() => deleteTransaction(tx.id)} className="text-red-400 hover:text-red-600 p-1">
                        <Trash2 size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New Transaction Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-slide-up">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold text-gray-900">
                New {tab === 'sale' ? 'Sale' : 'Purchase'}
              </h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            <div className="overflow-y-auto p-6 space-y-4 flex-1">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label">Date</label>
                  <input type="date" value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    className="input" />
                </div>
                <div>
                  <label className="label">Payment Method</label>
                  <select value={form.payment_method}
                    onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))}
                    className="input">
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="credit">Credit (Udhaar)</option>
                  </select>
                </div>
              </div>

              {tab === 'sale' ? (
                <div>
                  <label className="label">Customer</label>
                  <select value={form.customer_id}
                    onChange={e => setForm(f => ({ ...f, customer_id: e.target.value }))}
                    className="input">
                    <option value="">-- Walk-in Customer --</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ''}</option>)}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="label">Supplier</label>
                  <select value={form.supplier_id}
                    onChange={e => setForm(f => ({ ...f, supplier_id: e.target.value }))}
                    className="input">
                    <option value="">-- Select Supplier --</option>
                    {suppliers.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              )}

              {/* Items */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="label mb-0">Items</label>
                  <button onClick={addItem} className="text-sm text-blue-700 hover:underline flex items-center gap-1">
                    <Plus size={14} /> Add Item
                  </button>
                </div>
                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <select
                        value={item.product_id || ''}
                        onChange={e => updateItem(idx, 'product_id', parseInt(e.target.value))}
                        className="input flex-1"
                      >
                        <option value="">Select product</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id}>{p.name} (Stock: {p.stock_qty} {p.unit})</option>
                        ))}
                      </select>
                      <input
                        type="number" min="0.1" step="0.1" value={item.qty}
                        onChange={e => updateItem(idx, 'qty', parseFloat(e.target.value) || 1)}
                        className="input w-20" placeholder="Qty"
                      />
                      <input
                        type="number" min="0" value={item.price}
                        onChange={e => updateItem(idx, 'price', parseFloat(e.target.value) || 0)}
                        className="input w-24" placeholder="Price"
                      />
                      <span className="text-sm font-medium text-gray-700 w-20 text-right">
                        {fmt(item.qty * item.price)}
                      </span>
                      {items.length > 1 && (
                        <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600 flex-shrink-0">
                          <X size={16} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium">{fmt(subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm items-center">
                  <span className="text-gray-600">Discount</span>
                  <input type="number" min="0" value={form.discount}
                    onChange={e => setForm(f => ({ ...f, discount: parseFloat(e.target.value) || 0 }))}
                    className="input w-24 text-right" />
                </div>
                <div className="flex justify-between font-bold text-base border-t pt-2">
                  <span>Total</span>
                  <span className="text-blue-800">{fmt(total)}</span>
                </div>
              </div>

              <div>
                <label className="label">Notes (optional)</label>
                <input type="text" value={form.notes}
                  onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                  className="input" placeholder="Any additional notes..." />
              </div>
            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={save} disabled={saving} className="btn-primary">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                Save {tab === 'sale' ? 'Sale' : 'Purchase'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
