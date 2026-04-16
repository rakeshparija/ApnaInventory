import { useEffect, useState, useCallback } from 'react';
import { suppliersApi } from '../api/client';
import { Plus, Search, X, Loader2, Truck, Phone, CreditCard, ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import clsx from 'clsx';

interface Supplier {
  id: number; name: string; phone?: string; email?: string;
  gstin?: string; credit_balance: number;
}
interface LedgerEntry {
  id: number; type: string; date: string; total?: number; paid?: number;
  balance?: number; amount?: number; payment_method?: string; method?: string;
  notes?: string; entry_type: string;
}

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const today = new Date().toISOString().split('T')[0];

export default function Suppliers() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', gstin: '' });
  const [paymentForm, setPaymentForm] = useState({ amount: '', date: today, method: 'cash', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      const r = await suppliersApi.getAll(params);
      setSuppliers(r.data);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const openLedger = async (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setLedgerLoading(true);
    try {
      const r = await suppliersApi.getLedger(supplier.id);
      setLedger(r.data.ledger);
    } finally {
      setLedgerLoading(false);
    }
  };

  const openAdd = () => {
    setEditingSupplier(null);
    setForm({ name: '', phone: '', email: '', gstin: '' });
    setShowAddModal(true);
  };

  const openEdit = (s: Supplier) => {
    setEditingSupplier(s);
    setForm({ name: s.name, phone: s.phone || '', email: s.email || '', gstin: s.gstin || '' });
    setShowAddModal(true);
  };

  const save = async () => {
    if (!form.name) return alert('Name is required');
    setSaving(true);
    try {
      if (editingSupplier) {
        await suppliersApi.update(editingSupplier.id, form);
      } else {
        await suppliersApi.create(form);
      }
      setShowAddModal(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const deleteSupplier = async (id: number) => {
    if (!confirm('Delete this supplier?')) return;
    await suppliersApi.delete(id);
    load();
  };

  const recordPayment = async () => {
    if (!paymentForm.amount || !selectedSupplier) return;
    setSaving(true);
    try {
      await suppliersApi.addPayment(selectedSupplier.id, {
        amount: parseFloat(paymentForm.amount),
        date: paymentForm.date,
        method: paymentForm.method,
        notes: paymentForm.notes,
      });
      setShowPaymentModal(false);
      setPaymentForm({ amount: '', date: today, method: 'cash', notes: '' });
      openLedger(selectedSupplier);
      load();
    } finally {
      setSaving(false);
    }
  };

  const totalPayable = suppliers.reduce((s, sup) => s + sup.credit_balance, 0);

  if (selectedSupplier) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 flex-wrap">
          <button onClick={() => setSelectedSupplier(null)} className="btn-secondary">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{selectedSupplier.name}</h1>
            <p className="text-gray-500 text-sm">{selectedSupplier.phone || 'No phone'} &bull; Supplier Ledger</p>
          </div>
          {selectedSupplier.credit_balance > 0 && (
            <button onClick={() => setShowPaymentModal(true)} className="btn-primary">
              <CreditCard size={16} /> Pay Supplier
            </button>
          )}
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Amount Payable</p>
            <p className={clsx('text-2xl font-bold', selectedSupplier.credit_balance > 0 ? 'text-red-600' : 'text-green-600')}>
              {fmt(selectedSupplier.credit_balance)}
            </p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Phone</p>
            <p className="text-base font-semibold text-gray-800">{selectedSupplier.phone || '-'}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">GSTIN</p>
            <p className="text-sm font-mono text-gray-700">{selectedSupplier.gstin || '-'}</p>
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Supplier Ledger</h3>
          </div>
          {ledgerLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="animate-spin text-blue-800" size={24} /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="table-th">Date</th>
                    <th className="table-th">Type</th>
                    <th className="table-th">Amount</th>
                    <th className="table-th">Paid</th>
                    <th className="table-th">Balance</th>
                    <th className="table-th">Method</th>
                    <th className="table-th">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {ledger.map((entry) => (
                    <tr key={`${entry.entry_type}-${entry.id}`} className={clsx(
                      'hover:bg-gray-50',
                      entry.entry_type === 'payment' && 'bg-green-50/40'
                    )}>
                      <td className="table-td">{entry.date}</td>
                      <td className="table-td">
                        {entry.entry_type === 'payment' ? (
                          <span className="badge-green">Payment</span>
                        ) : (
                          <span className="badge-blue">Purchase</span>
                        )}
                      </td>
                      <td className="table-td font-semibold">
                        {entry.entry_type === 'payment' ? fmt(entry.amount!) : fmt(entry.total!)}
                      </td>
                      <td className="table-td text-green-700">
                        {entry.entry_type === 'payment' ? fmt(entry.amount!) : fmt(entry.paid!)}
                      </td>
                      <td className="table-td">
                        {entry.entry_type === 'payment' ? (
                          <span className="text-green-600 font-medium">-{fmt(entry.amount!)}</span>
                        ) : entry.balance && entry.balance > 0 ? (
                          <span className="text-red-600 font-medium">{fmt(entry.balance)}</span>
                        ) : (
                          <span className="badge-green">Paid</span>
                        )}
                      </td>
                      <td className="table-td text-xs text-gray-400 uppercase">
                        {entry.payment_method || entry.method || '-'}
                      </td>
                      <td className="table-td text-gray-400 text-xs">{entry.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {showPaymentModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h2 className="text-lg font-bold">Pay Supplier</h2>
                <button onClick={() => setShowPaymentModal(false)}><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-red-50 rounded-xl p-3 text-sm">
                  <span className="text-gray-600">Outstanding payable: </span>
                  <span className="font-bold text-red-600">{fmt(selectedSupplier.credit_balance)}</span>
                </div>
                <div>
                  <label className="label">Amount (₹)</label>
                  <input type="number" className="input" value={paymentForm.amount}
                    onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="Enter amount paid" max={selectedSupplier.credit_balance} />
                </div>
                <div>
                  <label className="label">Date</label>
                  <input type="date" className="input" value={paymentForm.date}
                    onChange={e => setPaymentForm(f => ({ ...f, date: e.target.value }))} />
                </div>
                <div>
                  <label className="label">Method</label>
                  <select className="input" value={paymentForm.method}
                    onChange={e => setPaymentForm(f => ({ ...f, method: e.target.value }))}>
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="bank">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                  </select>
                </div>
                <div>
                  <label className="label">Notes</label>
                  <input type="text" className="input" value={paymentForm.notes}
                    onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))} />
                </div>
              </div>
              <div className="px-6 py-4 border-t flex justify-end gap-3">
                <button onClick={() => setShowPaymentModal(false)} className="btn-secondary">Cancel</button>
                <button onClick={recordPayment} disabled={saving} className="btn-primary">
                  {saving ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
                  Record Payment
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Suppliers</h1>
          <p className="text-gray-500 text-sm">
            {suppliers.length} suppliers &bull; Total payable: <span className="text-red-600 font-medium">{fmt(totalPayable)}</span>
          </p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus size={18} /> Add Supplier
        </button>
      </div>

      <div className="card p-4">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" placeholder="Search by name or phone..."
            value={search} onChange={e => setSearch(e.target.value)} className="input pl-9" />
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12"><Loader2 className="animate-spin text-blue-800" size={28} /></div>
        ) : suppliers.length === 0 ? (
          <div className="text-center py-12">
            <Truck size={40} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-400">No suppliers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-th">Name</th>
                  <th className="table-th">Phone</th>
                  <th className="table-th">GSTIN</th>
                  <th className="table-th">Amount Payable</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {suppliers.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => openLedger(s)}>
                    <td className="table-td font-medium text-blue-700">{s.name}</td>
                    <td className="table-td">
                      {s.phone ? (
                        <a href={`tel:${s.phone}`} className="flex items-center gap-1 text-gray-600 hover:text-blue-600"
                          onClick={e => e.stopPropagation()}>
                          <Phone size={13} /> {s.phone}
                        </a>
                      ) : '-'}
                    </td>
                    <td className="table-td text-xs font-mono text-gray-400">{s.gstin || '-'}</td>
                    <td className="table-td">
                      <span className={clsx('font-semibold', s.credit_balance > 0 ? 'text-red-600' : 'text-green-600')}>
                        {fmt(s.credit_balance)}
                      </span>
                    </td>
                    <td className="table-td" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(s)} className="text-blue-500 hover:text-blue-700 p-1"><Pencil size={15} /></button>
                        <button onClick={() => deleteSupplier(s.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold">{editingSupplier ? 'Edit Supplier' : 'Add Supplier'}</h2>
              <button onClick={() => setShowAddModal(false)}><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Name *</label>
                <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Supplier / company name" />
              </div>
              <div>
                <label className="label">Phone</label>
                <input className="input" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} placeholder="Mobile number" />
              </div>
              <div>
                <label className="label">Email</label>
                <input type="email" className="input" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="Email address" />
              </div>
              <div>
                <label className="label">GSTIN</label>
                <input className="input" value={form.gstin} onChange={e => setForm(f => ({ ...f, gstin: e.target.value }))} placeholder="GST number (optional)" />
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={save} disabled={saving} className="btn-primary">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {editingSupplier ? 'Update' : 'Add'} Supplier
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
