import React, { useState, useEffect } from 'react';
import { customerAPI } from '../services/api';
import { Users, Plus, Search, Phone, Mail, FileText, ShoppingBag, X } from 'lucide-react';

export default function CustomersPage() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  const initialForm = {
    name: '',
    phone: '',
    email: '',
    address: '',
    doctorName: '',
    allergies: ''
  };
  const [formData, setFormData] = useState(initialForm);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await customerAPI.getAll({ search });
      if (res.data.success) setCustomers(res.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [search]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await customerAPI.create(formData);
      if (res.data.success) {
        setIsAddOpen(false);
        setFormData(initialForm);
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to register customer');
    }
  };

  const handleOpenHistory = async (id) => {
    try {
      const res = await customerAPI.getHistory(id);
      if (res.data.success) {
        setSelectedCustomer(res.data.data);
        setIsHistoryOpen(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Patient & Customer Directory</h2>
          <p className="text-xs text-slate-500">
            Maintain customer records, clinical allergies, purchase histories, and linked prescriptions
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Customer</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by customer name or phone number..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
          />
        </div>
      </div>

      {/* Customers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map((c) => (
          <div key={c.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{c.name}</h3>
                  <p className="text-xs text-slate-500 font-mono">{c.phone}</p>
                </div>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="px-1.5 py-0.5 rounded bg-slate-100 font-semibold">{c._count?.sales || 0} Bills</span>
                  <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 font-semibold">{c._count?.prescriptions || 0} Rx</span>
                </div>
              </div>

              {c.allergies && (
                <div className="mt-2 p-2 bg-rose-50 border border-rose-200 rounded text-[11px] text-rose-700">
                  <span className="font-bold">⚠️ Allergy:</span> {c.allergies}
                </div>
              )}

              {c.doctorName && (
                <p className="mt-2 text-xs text-slate-600">
                  <strong>Consulting Dr:</strong> {c.doctorName}
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => handleOpenHistory(c.id)}
                className="text-xs text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1"
              >
                <span>View Full History</span>
              </button>
            </div>
          </div>
        ))}

        {customers.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center text-slate-400">
            No customers found.
          </div>
        )}
      </div>

      {/* Add Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-teal-800 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Register Customer</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Patient / Customer Name"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phone Number *</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+91..."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Consulting Doctor</label>
                <input
                  type="text"
                  value={formData.doctorName}
                  onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
                  placeholder="Regular consulting physician"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Known Drug Allergies / Conditions</label>
                <input
                  type="text"
                  value={formData.allergies}
                  onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                  placeholder="e.g. Penicillin, Sulfa drugs"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Residential Address</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  rows={2}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Modal */}
      {isHistoryOpen && selectedCustomer && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Customer History: {selectedCustomer.name}</h3>
                <p className="text-xs text-slate-400">{selectedCustomer.phone}</p>
              </div>
              <button onClick={() => setIsHistoryOpen(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              <div>
                <h4 className="font-bold text-slate-800 mb-2">Past Invoices & Purchases</h4>
                <div className="border rounded-lg overflow-hidden divide-y divide-slate-100">
                  {selectedCustomer.sales?.map((s) => (
                    <div key={s.id} className="p-2.5 flex items-center justify-between">
                      <div>
                        <span className="font-mono font-semibold text-slate-800">{s.invoiceNumber}</span>
                        <span className="text-slate-400 ml-2">{new Date(s.createdAt).toLocaleDateString('en-IN')}</span>
                      </div>
                      <span className="font-bold text-teal-700">₹{s.grandTotal.toFixed(2)}</span>
                    </div>
                  ))}
                  {(!selectedCustomer.sales || selectedCustomer.sales.length === 0) && (
                    <p className="p-4 text-center text-slate-400">No purchase records found.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

