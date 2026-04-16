import { useEffect, useState, useCallback } from 'react';
import { customersApi } from '../api/client';
import { Plus, Search, X, Loader2, Users, Phone, CreditCard, ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import clsx from 'clsx';

interface Customer {
  id: number; name: string; phone?: string; email?: string;
  address?: string; credit_balance: number;
}
interface LedgerEntry {
  id: number; type: string; date: string; total?: number; paid?: number;
  balance?: number; amount?: number; payment_method?: string; method?: string;
  notes?: string; entry_type: string;
}

const fmt = (n: number) => `₹${n.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const today = new Date().toISOString().split('T')[0];

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [form, setForm] = useState({ name: '', phone: '', email: '', address: '' });
  const [paymentForm, setPaymentForm] = useState({ amount: '', date: today, method: 'cash', notes: '' });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (search) params.search = search;
      const r = await customersApi.getAll(params);
      setCustomers(r.data);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { load(); }, [load]);

  const openLedger = async (customer: Customer) => {
    setSelectedCustomer(customer);
    setLedgerLoading(true);
    try {
      const r = await customersApi.getLedger(customer.id);
      setLedger(r.data.ledger);
    } finally {
      setLedgerLoading(false);
    }
  };

  const openAdd = () => {
    setEditingCustomer(null);
    setForm({ name: '', phone: '', email: '', address: '' });
    setShowAddModal(true);
  };

  const openEdit = (c: Customer) => {
    setEditingCustomer(c);
    setForm({ name: c.name, phone: c.phone || '', email: c.email || '', address: c.address || '' });
    setShowAddModal(true);
  };

  const save = async () => {
    if (!form.name) return alert('Name is required');
    setSaving(true);
    try {
      if (editingCustomer) {
        await customersApi.update(editingCustomer.id, form);
      } else {
        await customersApi.create(form);
      }
      setShowAddModal(false);
      load();
    } finally {
      setSaving(false);
    }
  };

  const deleteCustomer = async (id: number) => {
    if (!confirm('Delete this customer?')) return;
    await customersApi.delete(id);
    load();
  };

  const recordPayment = async () => {
    if (!paymentForm.amount || !selectedCustomer) return;
    setSaving(true);
    try {
      await customersApi.addPayment(selectedCustomer.id, {
        amount: parseFloat(paymentForm.amount),
        date: paymentForm.date,
        method: paymentForm.method,
        notes: paymentForm.notes,
      });
      setShowPaymentModal(false);
      setPaymentForm({ amount: '', date: today, method: 'cash', notes: '' });
      // Refresh ledger and customer list
      openLedger(selectedCustomer);
      load();
    } finally {
      setSaving(false);
    }
  };

  const totalUdhaar = customers.reduce((s, c) => s + c.credit_balance, 0);

  if (selectedCustomer) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4 flex-wrap">
          <button onClick={() => setSelectedCustomer(null)} className="btn-secondary">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900">{selectedCustomer.name}</h1>
            <p className="text-gray-500 text-sm">{selectedCustomer.phone || 'No phone'} &bull; Ledger Account</p>
          </div>
          {selectedCustomer.credit_balance > 0 && (
            <button onClick={() => setShowPaymentModal(true)} className="btn-primary">
              <CreditCard size={16} /> Collect Payment
            </button>
          )}
        </div>

        {/* Summary card */}
        <div className="grid grid-cols-3 gap-4">
          <div className="card p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Total Udhaar</p>
            <p className={clsx('text-2xl font-bold', selectedCustomer.credit_balance > 0 ? 'text-orange-600' : 'text-green-600')}>
              {fmt(selectedCustomer.credit_balance)}
            </p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Phone</p>
            <p className="text-base font-semibold text-gray-800">{selectedCustomer.phone || '-'}</p>
          </div>
          <div className="card p-4 text-center">
            <p className="text-xs text-gray-500 mb-1">Address</p>
            <p className="text-sm text-gray-700 truncate">{selectedCustomer.address || '-'}</p>
          </div>
        </div>

        {/* Ledger */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Transaction Ledger</h3>
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
                          <span className="badge-blue">Sale</span>
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
                          <span className="text-orange-600 font-medium">{fmt(entry.balance)}</span>
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

        {/* Payment modal */}
        {showPaymentModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
              <div className="flex items-center justify-between px-6 py-4 border-b">
                <h2 className="text-lg font-bold">Collect Payment</h2>
                <button onClick={() => setShowPaymentModal(false)}><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4">
                <div className="bg-orange-50 rounded-xl p-3 text-sm">
                  <span className="text-gray-600">Outstanding balance: </span>
                  <span className="font-bold text-orange-600">{fmt(selectedCustomer.credit_balance)}</span>
                </div>
                <div>
                  <label className="label">Amount (₹)</label>
                  <input type="number" className="input" value={paymentForm.amount}
                    onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                    placeholder="Enter amount received" max={selectedCustomer.credit_balance} />
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
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-500 text-sm">
            {customers.length} customers &bull; Total udhaar: <span className="text-orange-600 font-medium">{fmt(totalUdhaar)}</span>
          </p>
        </div>
        <button onClick={openAdd} className="btn-primary">
          <Plus size={18} /> Add Customer
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
        ) : customers.length === 0 ? (
          <div className="text-center py-12">
            <Users size={40} className="mx-auto text-gray-300 mb-2" />
            <p className="text-gray-400">No customers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="table-th">Name</th>
                  <th className="table-th">Phone</th>
                  <th className="table-th">Address</th>
                  <th className="table-th">Udhaar Balance</th>
                  <th className="table-th">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {customers.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => openLedger(c)}>
                    <td className="table-td font-medium text-blue-700">{c.name}</td>
                    <td className="table-td">
                      {c.phone ? (
                        <a href={`tel:${c.phone}`} className="flex items-center gap-1 text-gray-600 hover:text-blue-600"
                          onClick={e => e.stopPropagation()}>
                          <Phone size={13} /> {c.phone}
                        </a>
                      ) : '-'}
                    </td>
                    <td className="table-td text-gray-400 text-xs">{c.address || '-'}</td>
                    <td className="table-td">
                      <span className={clsx('font-semibold', c.credit_balance > 0 ? 'text-orange-600' : 'text-green-600')}>
                        {fmt(c.credit_balance)}
                      </span>
                    </td>
                    <td className="table-td" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <button onClick={() => openEdit(c)} className="text-blue-500 hover:text-blue-700 p-1"><Pencil size={15} /></button>
                        <button onClick={() => deleteCustomer(c.id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={15} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold">{editingCustomer ? 'Edit Customer' : 'Add Customer'}</h2>
              <button onClick={() => setShowAddModal(false)}><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="label">Name *</label>
                <input className="input" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Customer name" />
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
                <label className="label">Address</label>
                <input className="input" value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} placeholder="Address" />
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <button onClick={() => setShowAddModal(false)} className="btn-secondary">Cancel</button>
              <button onClick={save} disabled={saving} className="btn-primary">
                {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                {editingCustomer ? 'Update' : 'Add'} Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
