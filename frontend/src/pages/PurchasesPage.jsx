import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { purchaseAPI, supplierAPI, medicineAPI } from '../services/api';
import {
  Truck,
  Plus,
  CheckCircle2,
  Clock,
  Eye,
  Boxes,
  X,
  Search,
  DollarSign
} from 'lucide-react';

export default function PurchasesPage() {
  const { hasRole } = useAuth();
  const [purchases, setPurchases] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    supplierId: '',
    invoiceNumber: '',
    notes: '',
    items: [
      {
        medicineId: '',
        batchNumber: '',
        mfgDate: new Date().toISOString().slice(0, 10),
        expiryDate: '',
        quantity: 100,
        purchasePrice: '',
        mrp: '',
        sellingPrice: '',
        taxRate: 12.0
      }
    ]
  });

  const [formError, setFormError] = useState('');
  const [verifyingId, setVerifyingId] = useState(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [pRes, sRes, mRes] = await Promise.all([
        purchaseAPI.getAll({ status: filterStatus }),
        supplierAPI.getAll(),
        medicineAPI.getAll({})
      ]);

      if (pRes.data.success) setPurchases(pRes.data.data);
      if (sRes.data.success) setSuppliers(sRes.data.data);
      if (mRes.data.success) setMedicines(mRes.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  const handleOpenAdd = () => {
    setFormData({
      supplierId: suppliers[0]?.id || '',
      invoiceNumber: '',
      notes: '',
      items: [
        {
          medicineId: medicines[0]?.id || '',
          batchNumber: `BAT-${Math.floor(1000 + Math.random() * 9000)}`,
          mfgDate: new Date().toISOString().slice(0, 10),
          expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
          quantity: 100,
          purchasePrice: 20,
          mrp: 30,
          sellingPrice: 28,
          taxRate: 12.0
        }
      ]
    });
    setFormError('');
    setIsAddOpen(true);
  };

  const handleAddItemRow = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        {
          medicineId: medicines[0]?.id || '',
          batchNumber: `BAT-${Math.floor(1000 + Math.random() * 9000)}`,
          mfgDate: new Date().toISOString().slice(0, 10),
          expiryDate: new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10),
          quantity: 100,
          purchasePrice: 20,
          mrp: 30,
          sellingPrice: 28,
          taxRate: 12.0
        }
      ]
    });
  };

  const handleRemoveItemRow = (idx) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== idx)
    });
  };

  const handleItemChange = (idx, field, val) => {
    const updated = [...formData.items];
    updated[idx][field] = val;
    setFormData({ ...formData, items: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      const res = await purchaseAPI.create(formData);
      if (res.data.success) {
        setIsAddOpen(false);
        loadData();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to create PO');
    }
  };

  // Verify and receive goods: increments stock in inventory!
  const handleVerifyPurchase = async (id) => {
    if (window.confirm('Verify that goods have been physically received, batch labels verified, and ready to update live inventory stock?')) {
      setVerifyingId(id);
      try {
        const res = await purchaseAPI.verify(id);
        if (res.data.success) {
          alert('✔ Goods verified! Inventory batches and stock have been updated successfully.');
          loadData();
          if (selectedPurchase && selectedPurchase.id === id) {
            setIsDetailOpen(false);
          }
        }
      } catch (err) {
        alert(err.response?.data?.message || 'Verification failed');
      } finally {
        setVerifyingId(null);
      }
    }
  };

  const handleOpenDetail = async (id) => {
    try {
      const res = await purchaseAPI.getById(id);
      if (res.data.success) {
        setSelectedPurchase(res.data.data);
        setIsDetailOpen(true);
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
          <h2 className="text-base font-bold text-slate-900">Procurement & Purchase Orders</h2>
          <p className="text-xs text-slate-500">
            Create vendor orders, verify received batches, and automatically synchronize stock into inventory
          </p>
        </div>

        {hasRole(['ADMIN', 'INVENTORY_MANAGER']) && (
          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Create Purchase Order</span>
          </button>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center gap-2">
        {['ALL', 'ORDERED', 'VERIFIED'].map((st) => (
          <button
            key={st}
            onClick={() => setFilterStatus(st)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              filterStatus === st
                ? 'bg-teal-50 text-teal-800 border border-teal-200'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {st}
          </button>
        ))}
      </div>

      {/* Purchases Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">PO Number</th>
                <th className="py-3 px-3">Supplier Name</th>
                <th className="py-3 px-3">Date</th>
                <th className="py-3 px-2 text-center">Items</th>
                <th className="py-3 px-3 text-right">Total Amount</th>
                <th className="py-3 px-3 text-center">Status</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {purchases.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{p.poNumber}</td>

                  <td className="py-3 px-3">
                    <p className="font-semibold text-slate-800">{p.supplier?.companyName}</p>
                    <p className="text-[10px] text-slate-400">GSTIN: {p.supplier?.gstin || '-'}</p>
                  </td>

                  <td className="py-3 px-3 text-slate-600">
                    {new Date(p.purchaseDate).toLocaleDateString('en-IN')}
                  </td>

                  <td className="py-3 px-2 text-center font-bold text-slate-700">
                    {p._count?.items || 0}
                  </td>

                  <td className="py-3 px-3 text-right font-bold text-teal-700">
                    ₹{p.totalAmount.toFixed(2)}
                  </td>

                  <td className="py-3 px-3 text-center">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      p.status === 'VERIFIED'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {p.status}
                    </span>
                  </td>

                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleOpenDetail(p.id)}
                        className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded"
                        title="View PO Details"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {p.status === 'ORDERED' && hasRole(['ADMIN', 'INVENTORY_MANAGER']) && (
                        <button
                          onClick={() => handleVerifyPurchase(p.id)}
                          disabled={verifyingId === p.id}
                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 transition-colors"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Verify & Receive Goods</span>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {purchases.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No purchase orders found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Purchase Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-3xl w-full overflow-hidden border border-slate-200 flex flex-col max-h-[90vh]">
            <div className="p-4 bg-teal-800 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Create New Purchase Order</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
              {formError && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Select Supplier *</label>
                  <select
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                    required
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.companyName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Vendor Invoice #</label>
                  <input
                    type="text"
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                    placeholder="Supplier invoice reference"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              {/* Items Section */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-slate-800">Medicines / Batches to Procure</span>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs text-teal-600 font-bold hover:underline"
                  >
                    + Add Another Item
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.items.map((row, idx) => (
                    <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-slate-700">Item #{idx + 1}</span>
                        {formData.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveItemRow(idx)}
                            className="text-rose-500 hover:text-rose-700 text-xs font-bold"
                          >
                            Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                        <div className="col-span-2">
                          <label className="block text-[10px] text-slate-500">Medicine *</label>
                          <select
                            value={row.medicineId}
                            onChange={(e) => handleItemChange(idx, 'medicineId', e.target.value)}
                            className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs"
                            required
                          >
                            {medicines.map((m) => (
                              <option key={m.id} value={m.id}>{m.name} ({m.strength})</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-500">Batch # *</label>
                          <input
                            type="text"
                            value={row.batchNumber}
                            onChange={(e) => handleItemChange(idx, 'batchNumber', e.target.value)}
                            className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs font-mono uppercase"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-500">Expiry Date *</label>
                          <input
                            type="date"
                            value={row.expiryDate}
                            onChange={(e) => handleItemChange(idx, 'expiryDate', e.target.value)}
                            className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs"
                            required
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-2">
                        <div>
                          <label className="block text-[10px] text-slate-500">Quantity *</label>
                          <input
                            type="number"
                            min="1"
                            value={row.quantity}
                            onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                            className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs font-bold"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-500">Purchase Cost (₹) *</label>
                          <input
                            type="number"
                            step="0.01"
                            value={row.purchasePrice}
                            onChange={(e) => handleItemChange(idx, 'purchasePrice', e.target.value)}
                            className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs font-mono"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-500">Printed MRP (₹) *</label>
                          <input
                            type="number"
                            step="0.01"
                            value={row.mrp}
                            onChange={(e) => handleItemChange(idx, 'mrp', e.target.value)}
                            className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs font-mono"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] text-slate-500">Selling Price (₹)</label>
                          <input
                            type="number"
                            step="0.01"
                            value={row.sellingPrice}
                            onChange={(e) => handleItemChange(idx, 'sellingPrice', e.target.value)}
                            className="w-full p-1.5 bg-white border border-slate-200 rounded text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Terms, delivery instructions..."
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
                  Create Purchase Order
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Purchase Detail Modal */}
      {isDetailOpen && selectedPurchase && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Purchase Order: {selectedPurchase.poNumber}</h3>
                <p className="text-xs text-slate-400">Supplier: {selectedPurchase.supplier?.companyName}</p>
              </div>
              <button onClick={() => setIsDetailOpen(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              <div className="grid grid-cols-3 gap-2 bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div>
                  <span className="text-slate-400">Date:</span>
                  <p className="font-semibold">{new Date(selectedPurchase.purchaseDate).toLocaleDateString('en-IN')}</p>
                </div>
                <div>
                  <span className="text-slate-400">Status:</span>
                  <p className="font-bold text-emerald-700">{selectedPurchase.status}</p>
                </div>
                <div>
                  <span className="text-slate-400">Total Value:</span>
                  <p className="font-bold text-slate-900">₹{selectedPurchase.totalAmount.toFixed(2)}</p>
                </div>
              </div>

              <div>
                <h4 className="font-bold text-slate-800 mb-2">Itemized Goods Breakdown</h4>
                <table className="w-full text-left text-xs border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b">
                    <tr>
                      <th className="py-2 px-3">Medicine</th>
                      <th className="py-2 px-2">Batch #</th>
                      <th className="py-2 px-2">Expiry</th>
                      <th className="py-2 px-2 text-center">Qty</th>
                      <th className="py-2 px-2 text-right">Cost</th>
                      <th className="py-2 px-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {selectedPurchase.items?.map((it) => (
                      <tr key={it.id}>
                        <td className="py-2 px-3 font-sans font-medium text-slate-900">{it.medicine?.name}</td>
                        <td className="py-2 px-2">{it.batchNumber}</td>
                        <td className="py-2 px-2">{new Date(it.expiryDate).toLocaleDateString('en-IN')}</td>
                        <td className="py-2 px-2 text-center font-bold text-slate-900 font-sans">{it.quantity}</td>
                        <td className="py-2 px-2 text-right">₹{it.purchasePrice.toFixed(2)}</td>
                        <td className="py-2 px-3 text-right font-bold text-teal-700">₹{it.totalAmount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {selectedPurchase.status === 'ORDERED' && hasRole(['ADMIN', 'INVENTORY_MANAGER']) && (
                <div className="pt-3 border-t border-slate-200 flex justify-end">
                  <button
                    onClick={() => handleVerifyPurchase(selectedPurchase.id)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Verify & Sync Stock to Inventory</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

