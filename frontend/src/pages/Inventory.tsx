import { useEffect, useState, useCallback } from 'react';
import { productsApi } from '../api/client';
import { Plus, Pencil, Trash2, Search, Package, X, Loader2, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

interface Product {
  id: number; name: string; sku?: string; category?: string; unit: string;
  cost_price: number; selling_price: number; stock_qty: number; min_stock_alert: number;
}

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const margin = (cost: number, sell: number) => sell > 0 ? (((sell - cost) / sell) * 100).toFixed(1) : '0.0';

const EMPTY_FORM = {
  name: '', sku: '', category: '', unit: 'pcs',
  cost_price: '', selling_price: '', stock_qty: '', min_stock_alert: '5',
};

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<typeof EMPTY_FORM & { [key: string]: string }>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      if (category) params.category = category;
      if (lowStockOnly) params.low_stock = 'true';
      const r = await productsApi.getAll(params);
      setProducts(r.data);
    } finally {
      setLoading(false);
    }
  }, [search, category, lowStockOnly]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    productsApi.getCategories().then(r => setCategories(r.data));
  }, []);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  };

  const openEdit = (p: Product) => {
    setEditing(p);
    setForm({
      name: p.name, sku: p.sku || '', category: p.category || '', unit: p.unit,
      cost_price: String(p.cost_price), selling_price: String(p.selling_price),
      stock_qty: String(p.stock_qty), min_stock_alert: String(p.min_stock_alert),
    });
    setShowModal(true);
  };

  const save = async () => {
    if (!form.name || !form.cost_price || !form.selling_price) {
      return alert('Name, cost price, and selling price are required');
    }
    setSaving(true);
    try {
      const data = {
        name: form.name, sku: form.sku || undefined, category: form.category || undefined,
        unit: form.unit, cost_price: parseFloat(form.cost_price),
        selling_price: parseFloat(form.selling_price), stock_qty: parseFloat(form.stock_qty || '0'),
        min_stock_alert: parseFloat(form.min_stock_alert || '5'),
      };
      if (editing) {
        await productsApi.update(editing.id, data);
      } else {
        await productsApi.create(data);
      }
      setShowModal(false);
      load();
      productsApi.getCategories().then(r => setCategories(r.data));
    } catch (err: unknown) {
      alert((err as { response?: { data?: { error?: string } } })?.response?.data?.error || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const deleteProduct = async (id: number) => {
    if (!confirm('Delete this product?')) return;
    await productsApi.delete(id);
    load();
  };

  const lowStockCount = products.filter(p => p.stock_qty <= p.min_stock_alert).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventory</h1>
          <p className="text-gray-500 text-sm">{products.length} products &bull; {lowStockCount} low stock</p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus size={18} /> Add Product
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4 flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-48">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text" placeholder="Search products..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="input pl-9"
          />
        </div>
        <select value={category} onChange={e => setCategory(e.target.value)} className="input w-44">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
          <input type="checkbox" checked={lowStockOnly} onChange={e => setLowStockOnly(e.target.checked)}
            className="rounded border-gray-300 text-blue-600" />
          Low stock only
        </label>
        {lowStockCount > 0 && (
          <span className="flex items-center gap-1 text-orange-600 text-sm font-medium">
            <AlertTriangle size={14} /> {lowStockCount} items need restock
          </span>
        )}
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="animate-spin text-blue-800" size={28} />
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <Package size={40} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-400">No products found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-th">Product</th>
                  <th className="table-th">SKU</th>
                  <th className="table-th">Category</th>
                  <th className="table-th">Stock</th>
                  <th className="table-th">Cost Price</th>
                  <th className="table-th">Selling Price</th>
                  <th className="table-th">Margin</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map(p => {
                  const isLow = p.stock_qty <= p.min_stock_alert;
                  const isOut = p.stock_qty <= 0;
                  return (
                    <tr key={p.id} className={clsx('hover:bg-gray-50 transition-colors', isLow && 'bg-orange-50/40')}>
                      <td className="table-td">
                        <div className="flex items-center gap-2">
                          {isLow && <AlertTriangle size={14} className={isOut ? 'text-red-500' : 'text-orange-500'} />}
                          <span className="font-medium text-gray-800">{p.name}</span>
                        </div>
                      </td>
                      <td className="table-td text-gray-400 text-xs">{p.sku || '-'}</td>
                      <td className="table-td">
                        {p.category && <span className="badge-blue">{p.category}</span>}
                      </td>
                      <td className="table-td">
                        <span className={clsx(
                          'font-semibold',
                          isOut ? 'text-red-600' : isLow ? 'text-orange-600' : 'text-gray-800'
                        )}>
                          {p.stock_qty} {p.unit}
                        </span>
                      </td>
                      <td className="table-td">{fmt(p.cost_price)}</td>
                      <td className="table-td font-medium">{fmt(p.selling_price)}</td>
                      <td className="table-td">
                        <span className={clsx(
                          'font-semibold',
                          parseFloat(margin(p.cost_price, p.selling_price)) > 20 ? 'text-green-600' : 'text-gray-600'
                        )}>
                          {margin(p.cost_price, p.selling_price)}%
                        </span>
                      </td>
                      <td className="table-td">
                        <div className="flex items-center gap-2">
                          <button onClick={() => openEdit(p)} className="text-blue-500 hover:text-blue-700 p-1">
                            <Pencil size={15} />
                          </button>
                          <button onClick={() => deleteProduct(p.id)} className="text-red-400 hover:text-red-600 p-1">
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg animate-slide-up">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold">{editing ? 'Edit Product' : 'Add Product'}</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="label">Product Name *</label>
                <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Tata Salt 1kg" />
              </div>
              <div>
                <label className="label">SKU</label>
                <input className="input" value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))} placeholder="e.g. TATA-SALT-1KG" />
              </div>
              <div>
                <label className="label">Category</label>
                <input className="input" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} placeholder="e.g. Grocery" list="cats" />
                <datalist id="cats">{categories.map(c => <option key={c} value={c} />)}</datalist>
              </div>
              <div>
                <label className="label">Unit</label>
                <select className="input" value={form.unit} onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}>
                  {['pcs', 'kg', 'g', 'L', 'mL', 'pkt', 'btl', 'box', 'bag', 'jar', 'tube'].map(u => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
              <div>
                <label className="label">Stock Qty</label>
                <input type="number" className="input" value={form.stock_qty} onChange={e => setForm(f => ({ ...f, stock_qty: e.target.value }))} placeholder="0" />
              </div>
              <div>
                <label className="label">Cost Price (₹) *</label>
                <input type="number" className="input" value={form.cost_price} onChange={e => setForm(f => ({ ...f, cost_price: e.target.value }))} placeholder="0.00" />
              </div>
              <div>
                <label className="label">Selling Price (₹) *</label>
                <input type="number" className="input" value={form.selling_price} onChange={e => setForm(f => ({ ...f, selling_price: e.target.value }))} placeholder="0.00" />
              </div>
              <div>
                <label className="label">Min Stock Alert</label>
                <input type="number" className="input" value={form.min_stock_alert} onChange={e => setForm(f => ({ ...f, min_stock_alert: e.target.value }))} placeholder="5" />
              </div>
              {form.cost_price && form.selling_price && (
                <div className="col-span-2 bg-green-50 rounded-lg p-3 text-sm">
                  <span className="text-gray-600">Margin: </span>
                  <span className="font-bold text-green-700">
                    {margin(parseFloat(form.cost_price || '0'), parseFloat(form.selling_price || '0'))}%
                  </span>
                  <span className="text-gray-500 ml-3">
                    Profit per unit: {fmt(parseFloat(form.selling_price || '0') - parseFloat(form.cost_price || '0'))}
                  </span>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={save} disabled={saving} className="btn-primary">
                {saving ? <Loader2 size={16} className="animate-spin" /> : null}
                {editing ? 'Update' : 'Add'} Product
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
