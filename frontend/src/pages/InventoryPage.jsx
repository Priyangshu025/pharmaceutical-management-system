import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { batchAPI, medicineAPI } from '../services/api';
import {
  Boxes,
  Plus,
  AlertTriangle,
  RotateCcw,
  SlidersHorizontal,
  Search,
  CheckCircle2,
  X,
  ShieldAlert,
  Flame,
  FileText
} from 'lucide-react';

export default function InventoryPage() {
  const { hasRole } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'batches';

  const [batches, setBatches] = useState([]);
  const [medicines, setMedicines] = useState([]);
  const [reorderList, setReorderList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals
  const [isAddBatchOpen, setIsAddBatchOpen] = useState(false);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [isRecallOpen, setIsRecallOpen] = useState(false);
  const [selectedBatch, setSelectedBatch] = useState(null);

  // Add Batch Form
  const [batchForm, setBatchForm] = useState({
    medicineId: '',
    batchNumber: '',
    mfgDate: '',
    expiryDate: '',
    purchasePrice: '',
    sellingPrice: '',
    mrp: '',
    initialQuantity: '',
    rackLocation: ''
  });

  // Adjustment Form
  const [adjustForm, setAdjustForm] = useState({
    movementType: 'DAMAGE_WRITEOFF',
    quantityChange: -1,
    reason: ''
  });

  // Recall Form
  const [recallReason, setRecallReason] = useState('Manufacturer quality recall notice');

  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const loadBatches = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const [bRes, mRes] = await Promise.all([
        batchAPI.getAll(params),
        medicineAPI.getAll({ lowStock: 'true' })
      ]);

      if (bRes.data.success) setBatches(bRes.data.data);
      if (mRes.data.success) setReorderList(mRes.data.data);

      const allMedRes = await medicineAPI.getAll({});
      if (allMedRes.data.success) setMedicines(allMedRes.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadBatches, 200);
    return () => clearTimeout(timer);
  }, [search, statusFilter]);

  const handleOpenAddBatch = () => {
    setBatchForm({
      medicineId: medicines[0]?.id || '',
      batchNumber: '',
      mfgDate: new Date().toISOString().slice(0, 10),
      expiryDate: '',
      purchasePrice: '',
      sellingPrice: '',
      mrp: '',
      initialQuantity: '',
      rackLocation: 'Shelf A-1'
    });
    setActionError('');
    setActionSuccess('');
    setIsAddBatchOpen(true);
  };

  const handleAddBatchSubmit = async (e) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');
    try {
      const res = await batchAPI.create(batchForm);
      if (res.data.success) {
        setActionSuccess('Batch added and stock movement recorded');
        setTimeout(() => {
          setIsAddBatchOpen(false);
          loadBatches();
        }, 800);
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Failed to create batch');
    }
  };

  const handleOpenAdjust = (b) => {
    setSelectedBatch(b);
    setAdjustForm({
      movementType: 'DAMAGE_WRITEOFF',
      quantityChange: -1,
      reason: ''
    });
    setActionError('');
    setActionSuccess('');
    setIsAdjustOpen(true);
  };

  const handleAdjustSubmit = async (e) => {
    e.preventDefault();
    setActionError('');
    setActionSuccess('');
    try {
      const res = await batchAPI.adjustStock(selectedBatch.id, adjustForm);
      if (res.data.success) {
        setActionSuccess('Stock adjustment and audit movement registered');
        setTimeout(() => {
          setIsAdjustOpen(false);
          loadBatches();
        }, 800);
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Adjustment failed');
    }
  };

  const handleOpenRecall = (b) => {
    setSelectedBatch(b);
    setRecallReason('Manufacturer product quality / CDSCO recall notice');
    setActionError('');
    setIsRecallOpen(true);
  };

  const handleRecallSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await batchAPI.recall(selectedBatch.id, { recallReason });
      if (res.data.success) {
        setIsRecallOpen(false);
        loadBatches();
      }
    } catch (err) {
      setActionError(err.response?.data?.message || 'Recall action failed');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Batch-Wise Inventory Management</h2>
          <p className="text-xs text-slate-500">
            Real-time batch tracking, FEFO dispatch priorities, write-offs, and recall quarantine
          </p>
        </div>

        {hasRole(['ADMIN', 'INVENTORY_MANAGER']) && (
          <button
            onClick={handleOpenAddBatch}
            className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Medicine Batch</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs">
        <button
          onClick={() => setSearchParams({ tab: 'batches' })}
          className={`pb-2.5 px-3 font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'batches'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>All Medicine Batches ({batches.length})</span>
        </button>

        <button
          onClick={() => setSearchParams({ tab: 'reorder' })}
          className={`pb-2.5 px-3 font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === 'reorder'
              ? 'border-rose-600 text-rose-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Flame className="w-4 h-4 text-rose-600" />
          <span>Automatic Reorder Suggestions ({reorderList.length})</span>
        </button>
      </div>

      {/* Tab 1: All Batches */}
      {activeTab === 'batches' && (
        <div className="space-y-3">
          {/* Filters */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search batch # or medicine name..."
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Batch Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="NEAR_EXPIRY">Near Expiry (&lt;90d)</option>
              <option value="EXPIRED">Expired</option>
              <option value="RECALLED">Recalled</option>
            </select>
          </div>

          {/* Batches Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-3 px-4">Batch Number</th>
                    <th className="py-3 px-3">Medicine Form</th>
                    <th className="py-3 px-3">Mfg / Expiry Date</th>
                    <th className="py-3 px-3">Pricing (Cost / MRP / Sale)</th>
                    <th className="py-3 px-3 text-right">Available Qty</th>
                    <th className="py-3 px-3 text-center">Batch Status</th>
                    <th className="py-3 px-3">Rack</th>
                    <th className="py-3 px-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {batches.map((b) => (
                    <tr key={b.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {b.batchNumber}
                        {b.status === 'RECALLED' && (
                          <span className="block text-[10px] text-purple-600 font-sans font-bold">RECALLED</span>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-800">{b.medicine?.name}</p>
                        <p className="text-[11px] text-slate-500">{b.medicine?.dosageForm} • {b.medicine?.strength}</p>
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px]">
                        <span className="text-slate-500">Mfg: {new Date(b.mfgDate).toLocaleDateString('en-IN')}</span>
                        <span className={`block font-bold ${
                          b.urgency === 'EXPIRED' ? 'text-rose-600' :
                          b.urgency === 'URGENT' ? 'text-amber-600 font-bold' :
                          'text-slate-700'
                        }`}>
                          Exp: {new Date(b.expiryDate).toLocaleDateString('en-IN')} ({b.daysToExpiry > 0 ? `${b.daysToExpiry}d left` : 'Expired'})
                        </span>
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px]">
                        <span className="text-slate-500">Cost: ₹{b.purchasePrice.toFixed(2)}</span>
                        <span className="block text-slate-800 font-medium">MRP: ₹{b.mrp.toFixed(2)} | Sale: ₹{b.sellingPrice.toFixed(2)}</span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        <span className="font-bold text-sm text-teal-800">{b.currentQuantity} units</span>
                        <span className="text-[10px] text-slate-400 block font-mono">Init: {b.initialQuantity}</span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          b.status === 'EXPIRED' ? 'bg-rose-100 text-rose-800 border border-rose-200' :
                          b.status === 'RECALLED' ? 'bg-purple-100 text-purple-800 border border-purple-200' :
                          b.status === 'NEAR_EXPIRY' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
                          'bg-emerald-100 text-emerald-800'
                        }`}>
                          {b.status}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-600 font-mono text-[11px]">
                        {b.rackLocation || 'Unassigned'}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {hasRole(['ADMIN', 'INVENTORY_MANAGER', 'PHARMACIST']) && (
                            <button
                              onClick={() => handleOpenAdjust(b)}
                              title="Stock Adjustment (Damage/Count/Disposal)"
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-[11px] font-medium transition-colors"
                            >
                              Adjust
                            </button>
                          )}

                          {hasRole(['ADMIN', 'PHARMACIST']) && b.status !== 'RECALLED' && (
                            <button
                              onClick={() => handleOpenRecall(b)}
                              title="Recall Batch (Quarantine from sales)"
                              className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded text-[11px] font-medium transition-colors"
                            >
                              Recall
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}

                  {batches.length === 0 && !loading && (
                    <tr>
                      <td colSpan={8} className="py-10 text-center text-slate-400">
                        No batches found matching query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Reorder Suggestions */}
      {activeTab === 'reorder' && (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-sm text-slate-900">Medicines Below Configured Minimum Threshold</h3>
              <p className="text-xs text-slate-500">
                Automated reorder suggestion engine analyzing available stock across active batches
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3">Medicine</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3 text-right">Current Available</th>
                  <th className="py-3 px-3 text-right">Min Threshold</th>
                  <th className="py-3 px-3 text-right">Recommended Reorder Qty</th>
                  <th className="py-3 px-3">Manufacturer</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reorderList.map((m) => {
                  const suggested = Math.max(50, m.minStockThreshold * 3 - m.totalStock);
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/60">
                      <td className="py-3 px-3 font-semibold text-slate-900">
                        {m.name} ({m.strength})
                      </td>
                      <td className="py-3 px-3 text-slate-600">{m.category?.name}</td>
                      <td className="py-3 px-3 text-right font-bold text-rose-600">{m.totalStock} units</td>
                      <td className="py-3 px-3 text-right font-mono text-slate-500">{m.minStockThreshold}</td>
                      <td className="py-3 px-3 text-right font-bold text-teal-700">{suggested} units</td>
                      <td className="py-3 px-3 text-slate-600">{m.manufacturer?.name}</td>
                    </tr>
                  );
                })}

                {reorderList.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-emerald-600 font-medium">
                      All inventory levels are currently above minimum safety thresholds!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Batch Modal */}
      {isAddBatchOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-teal-800 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Add New Medicine Batch</h3>
              <button onClick={() => setIsAddBatchOpen(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddBatchSubmit} className="p-5 space-y-3 text-xs">
              {actionError && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded">
                  {actionError}
                </div>
              )}
              {actionSuccess && (
                <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded">
                  {actionSuccess}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Medicine *</label>
                <select
                  value={batchForm.medicineId}
                  onChange={(e) => setBatchForm({ ...batchForm, medicineId: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  required
                >
                  {medicines.map((m) => (
                    <option key={m.id} value={m.id}>{m.name} ({m.strength} - {m.dosageForm})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Batch Number *</label>
                  <input
                    type="text"
                    value={batchForm.batchNumber}
                    onChange={(e) => setBatchForm({ ...batchForm, batchNumber: e.target.value })}
                    placeholder="e.g. BATCH-2026-X1"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg uppercase font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Rack / Storage Bin</label>
                  <input
                    type="text"
                    value={batchForm.rackLocation}
                    onChange={(e) => setBatchForm({ ...batchForm, rackLocation: e.target.value })}
                    placeholder="e.g. Shelf B-2"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Manufacturing Date *</label>
                  <input
                    type="date"
                    value={batchForm.mfgDate}
                    onChange={(e) => setBatchForm({ ...batchForm, mfgDate: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Expiry Date *</label>
                  <input
                    type="date"
                    value={batchForm.expiryDate}
                    onChange={(e) => setBatchForm({ ...batchForm, expiryDate: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Purchase Cost (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={batchForm.purchasePrice}
                    onChange={(e) => setBatchForm({ ...batchForm, purchasePrice: e.target.value })}
                    placeholder="Cost"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Selling Price (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={batchForm.sellingPrice}
                    onChange={(e) => setBatchForm({ ...batchForm, sellingPrice: e.target.value })}
                    placeholder="Sale"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Printed MRP (₹) *</label>
                  <input
                    type="number"
                    step="0.01"
                    value={batchForm.mrp}
                    onChange={(e) => setBatchForm({ ...batchForm, mrp: e.target.value })}
                    placeholder="Max Retail"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Initial Quantity Received *</label>
                <input
                  type="number"
                  min="1"
                  value={batchForm.initialQuantity}
                  onChange={(e) => setBatchForm({ ...batchForm, initialQuantity: e.target.value })}
                  placeholder="Units received"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddBatchOpen(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold"
                >
                  Create Batch & Add Stock
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Adjustment Modal */}
      {isAdjustOpen && selectedBatch && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-800 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Stock Adjustment: Batch {selectedBatch.batchNumber}</h3>
              <button onClick={() => setIsAdjustOpen(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="p-5 space-y-3 text-xs">
              {actionError && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded">
                  {actionError}
                </div>
              )}
              {actionSuccess && (
                <div className="p-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded">
                  {actionSuccess}
                </div>
              )}

              <p className="text-slate-600">
                Medicine: <strong>{selectedBatch.medicine?.name}</strong> | Current Stock: <strong>{selectedBatch.currentQuantity} units</strong>
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Adjustment Type *</label>
                <select
                  value={adjustForm.movementType}
                  onChange={(e) => setAdjustForm({ ...adjustForm, movementType: e.target.value })}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <option value="DAMAGE_WRITEOFF">Damaged / Broken Blister Write-off (-)</option>
                  <option value="EXPIRED_DISPOSAL">Expired Stock Destruction & Disposal (-)</option>
                  <option value="INVENTORY_CORRECTION">Physical Stock Count Correction (+ / -)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Quantity Change (+ or -) *</label>
                <input
                  type="number"
                  value={adjustForm.quantityChange}
                  onChange={(e) => setAdjustForm({ ...adjustForm, quantityChange: e.target.value })}
                  placeholder="-5 or +5"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono font-bold"
                  required
                />
                <span className="text-[10px] text-slate-400">Use negative number to write-off (e.g. -5), or positive to adjust upwards.</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mandatory Audit Justification / Reason *</label>
                <textarea
                  value={adjustForm.reason}
                  onChange={(e) => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                  placeholder="e.g. 2 strips damaged due to moisture during shelf inspection"
                  rows={3}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdjustOpen(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg font-bold"
                >
                  Commit Adjustment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Recall Modal */}
      {isRecallOpen && selectedBatch && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-purple-900 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Manufacturer Batch Recall Notice</h3>
              <button onClick={() => setIsRecallOpen(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRecallSubmit} className="p-5 space-y-3 text-xs">
              <p className="text-slate-600">
                Marking Batch <strong>{selectedBatch.batchNumber}</strong> as <strong>RECALLED</strong> will immediately block it from being sold in the POS or dispensed under prescriptions.
              </p>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Recall Reason / Regulatory Reference</label>
                <textarea
                  value={recallReason}
                  onChange={(e) => setRecallReason(e.target.value)}
                  rows={3}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsRecallOpen(false)}
                  className="px-4 py-2 border rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg font-bold"
                >
                  Confirm Recall & Quarantine
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

