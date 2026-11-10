import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { medicineAPI } from '../services/api';
import {
  Pill,
  Search,
  Plus,
  Filter,
  Eye,
  Edit2,
  Trash2,
  AlertCircle,
  ShieldAlert,
  Boxes,
  Barcode,
  X,
  CheckCircle2
} from 'lucide-react';

export default function MedicinesPage() {
  const { hasRole } = useAuth();
  const [medicines, setMedicines] = useState([]);
  const [categories, setCategories] = useState([]);
  const [manufacturers, setManufacturers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState('ALL');
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [editingMedicine, setEditingMedicine] = useState(null);

  // Form State
  const initialForm = {
    name: '',
    genericName: '',
    brand: '',
    dosageForm: 'Tablet',
    strength: '',
    packSize: '',
    hsnCode: '3004',
    gstRate: 12.0,
    scheduleType: 'NONE',
    minStockThreshold: 20,
    barcode: '',
    description: '',
    categoryId: '',
    manufacturerId: ''
  };
  const [formData, setFormData] = useState(initialForm);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (selectedCategory) params.categoryId = selectedCategory;
      if (selectedSchedule !== 'ALL') params.scheduleType = selectedSchedule;
      if (lowStockOnly) params.lowStock = 'true';

      const [mRes, cRes, mfgRes] = await Promise.all([
        medicineAPI.getAll(params),
        medicineAPI.getCategories(),
        medicineAPI.getManufacturers()
      ]);

      if (mRes.data.success) setMedicines(mRes.data.data);
      if (cRes.data.success) setCategories(cRes.data.data);
      if (mfgRes.data.success) setManufacturers(mfgRes.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(loadData, 200);
    return () => clearTimeout(timer);
  }, [search, selectedCategory, selectedSchedule, lowStockOnly]);

  const handleOpenAdd = () => {
    setEditingMedicine(null);
    setFormData({
      ...initialForm,
      categoryId: categories[0]?.id || '',
      manufacturerId: manufacturers[0]?.id || ''
    });
    setFormError('');
    setFormSuccess('');
    setIsFormOpen(true);
  };

  const handleOpenEdit = (med) => {
    setEditingMedicine(med);
    setFormData({
      name: med.name,
      genericName: med.genericName,
      brand: med.brand || '',
      dosageForm: med.dosageForm,
      strength: med.strength,
      packSize: med.packSize,
      hsnCode: med.hsnCode,
      gstRate: med.gstRate,
      scheduleType: med.scheduleType,
      minStockThreshold: med.minStockThreshold,
      barcode: med.barcode || '',
      description: med.description || '',
      categoryId: med.categoryId,
      manufacturerId: med.manufacturerId
    });
    setFormError('');
    setFormSuccess('');
    setIsFormOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setFormSuccess('');

    try {
      if (editingMedicine) {
        const res = await medicineAPI.update(editingMedicine.id, formData);
        if (res.data.success) {
          setFormSuccess('Medicine updated successfully');
          setTimeout(() => {
            setIsFormOpen(false);
            loadData();
          }, 800);
        }
      } else {
        const res = await medicineAPI.create(formData);
        if (res.data.success) {
          setFormSuccess('Medicine registered successfully');
          setTimeout(() => {
            setIsFormOpen(false);
            loadData();
          }, 800);
        }
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save medicine');
    }
  };

  const handleOpenDetail = async (id) => {
    try {
      const res = await medicineAPI.getById(id);
      if (res.data.success) {
        setSelectedMedicine(res.data.data);
        setIsDetailOpen(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeactivate = async (id, name) => {
    if (window.confirm(`Are you sure you want to deactivate medicine "${name}"?`)) {
      try {
        await medicineAPI.delete(id);
        loadData();
      } catch (e) {
        alert('Failed to deactivate medicine');
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Medicine Master Catalogue</h2>
          <p className="text-xs text-slate-500">Manage formulations, HSN codes, Indian Drug Schedules, and stock levels</p>
        </div>

        {hasRole(['ADMIN', 'PHARMACIST', 'INVENTORY_MANAGER']) && (
          <button
            onClick={handleOpenAdd}
            className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Medicine</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by Medicine, Generic name or Barcode..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500 focus:bg-white"
          />
        </div>

        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={selectedSchedule}
          onChange={(e) => setSelectedSchedule(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-teal-500"
        >
          <option value="ALL">All Drug Schedules</option>
          <option value="NONE">OTC / General (None)</option>
          <option value="SCHEDULE_H">Schedule H (Prescription)</option>
          <option value="SCHEDULE_H1">Schedule H1 (Statutory Register)</option>
          <option value="SCHEDULE_X">Schedule X (Narcotic/Restricted)</option>
        </select>

        <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer select-none bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100">
          <input
            type="checkbox"
            checked={lowStockOnly}
            onChange={(e) => setLowStockOnly(e.target.checked)}
            className="rounded text-teal-600 focus:ring-teal-500"
          />
          <span>Low Stock Only</span>
        </label>
      </div>

      {/* Medicines Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Medicine & Generic</th>
                <th className="py-3 px-3">Form & Strength</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Schedule Class</th>
                <th className="py-3 px-2">HSN / GST</th>
                <th className="py-3 px-3 text-right">Available Stock</th>
                <th className="py-3 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {medicines.map((med) => (
                <tr key={med.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-3 px-4">
                    <p className="font-bold text-slate-900">{med.name}</p>
                    <p className="text-[11px] text-slate-500">{med.genericName}</p>
                    {med.barcode && (
                      <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                        <Barcode className="w-3 h-3" /> {med.barcode}
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-3">
                    <span className="font-medium text-slate-700">{med.dosageForm}</span>
                    <span className="text-[11px] text-slate-500 block">{med.strength}</span>
                    <span className="text-[10px] text-slate-400 block">{med.packSize}</span>
                  </td>

                  <td className="py-3 px-3 text-slate-600">
                    {med.category?.name}
                  </td>

                  <td className="py-3 px-3">
                    {med.scheduleType === 'SCHEDULE_H' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                        Schedule H
                      </span>
                    )}
                    {med.scheduleType === 'SCHEDULE_H1' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        Schedule H1 (Reg)
                      </span>
                    )}
                    {med.scheduleType === 'SCHEDULE_X' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                        Schedule X
                      </span>
                    )}
                    {med.scheduleType === 'NONE' && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-600">
                        OTC / General
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-2 text-slate-600 font-mono text-[11px]">
                    {med.hsnCode} / {med.gstRate}%
                  </td>

                  <td className="py-3 px-3 text-right">
                    <span className={`font-bold text-sm ${med.isLowStock ? 'text-rose-600' : 'text-teal-700'}`}>
                      {med.totalStock} units
                    </span>
                    {med.isLowStock && (
                      <span className="text-[10px] text-rose-500 block font-medium">
                        Below Min ({med.minStockThreshold})
                      </span>
                    )}
                  </td>

                  <td className="py-3 px-4 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      <button
                        onClick={() => handleOpenDetail(med.id)}
                        title="View Batches & History"
                        className="p-1.5 text-slate-500 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      {hasRole(['ADMIN', 'PHARMACIST', 'INVENTORY_MANAGER']) && (
                        <button
                          onClick={() => handleOpenEdit(med)}
                          title="Edit Medicine"
                          className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}

                      {hasRole(['ADMIN']) && (
                        <button
                          onClick={() => handleDeactivate(med.id, med.name)}
                          title="Deactivate Medicine"
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {medicines.length === 0 && !loading && (
                <tr>
                  <td colSpan={7} className="py-10 text-center text-slate-400">
                    No medicines match the selected filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Medicine Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-teal-800 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">
                {editingMedicine ? `Edit Medicine: ${editingMedicine.name}` : 'Register New Medicine Master'}
              </h3>
              <button onClick={() => setIsFormOpen(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              {formError && (
                <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg">
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-lg">
                  {formSuccess}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Brand Name *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g. Dolo 650"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Generic / Chemical Name *</label>
                  <input
                    type="text"
                    value={formData.genericName}
                    onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                    placeholder="e.g. Paracetamol"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Dosage Form *</label>
                  <select
                    value={formData.dosageForm}
                    onChange={(e) => setFormData({ ...formData, dosageForm: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="Tablet">Tablet</option>
                    <option value="Capsule">Capsule</option>
                    <option value="Syrup">Syrup</option>
                    <option value="Injection">Injection</option>
                    <option value="Ointment">Ointment</option>
                    <option value="Drops">Drops</option>
                    <option value="Inhaler">Inhaler</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Strength *</label>
                  <input
                    type="text"
                    value={formData.strength}
                    onChange={(e) => setFormData({ ...formData, strength: e.target.value })}
                    placeholder="e.g. 650mg, 100ml"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pack Size *</label>
                  <input
                    type="text"
                    value={formData.packSize}
                    onChange={(e) => setFormData({ ...formData, packSize: e.target.value })}
                    placeholder="e.g. 15 Tablets/Strip"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Therapeutic Category *</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                    required
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Manufacturer *</label>
                  <select
                    value={formData.manufacturerId}
                    onChange={(e) => setFormData({ ...formData, manufacturerId: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                    required
                  >
                    {manufacturers.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Drug Schedule *</label>
                  <select
                    value={formData.scheduleType}
                    onChange={(e) => setFormData({ ...formData, scheduleType: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="NONE">OTC / None</option>
                    <option value="SCHEDULE_H">Schedule H</option>
                    <option value="SCHEDULE_H1">Schedule H1</option>
                    <option value="SCHEDULE_X">Schedule X</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">HSN Code</label>
                  <input
                    type="text"
                    value={formData.hsnCode}
                    onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">GST Rate (%)</label>
                  <select
                    value={formData.gstRate}
                    onChange={(e) => setFormData({ ...formData, gstRate: parseFloat(e.target.value) })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  >
                    <option value="0">0%</option>
                    <option value="5">5%</option>
                    <option value="12">12%</option>
                    <option value="18">18%</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min Stock Threshold (Alert)</label>
                  <input
                    type="number"
                    value={formData.minStockThreshold}
                    onChange={(e) => setFormData({ ...formData, minStockThreshold: e.target.value })}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Barcode (EAN / UPC)</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                    placeholder="Optional barcode number"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold shadow-sm"
                >
                  {editingMedicine ? 'Update Medicine' : 'Save Medicine'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Medicine Details & Batches Modal */}
      {isDetailOpen && selectedMedicine && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">{selectedMedicine.name}</h3>
                <p className="text-xs text-slate-300">{selectedMedicine.genericName} • {selectedMedicine.dosageForm} {selectedMedicine.strength}</p>
              </div>
              <button onClick={() => setIsDetailOpen(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto text-xs">
              {/* Batch list */}
              <div>
                <h4 className="font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                  <Boxes className="w-4 h-4 text-teal-600" />
                  <span>Associated Batches & Expiry (FEFO Ordered)</span>
                </h4>

                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Batch #</th>
                        <th className="py-2 px-2">Expiry Date</th>
                        <th className="py-2 px-2">MRP / Selling</th>
                        <th className="py-2 px-2 text-right">Available</th>
                        <th className="py-2 px-2 text-center">Status</th>
                        <th className="py-2 px-3">Rack</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                      {selectedMedicine.batches?.map((b) => (
                        <tr key={b.id}>
                          <td className="py-2 px-3 font-semibold text-slate-800">{b.batchNumber}</td>
                          <td className="py-2 px-2">{new Date(b.expiryDate).toLocaleDateString('en-IN')}</td>
                          <td className="py-2 px-2">₹{b.mrp.toFixed(2)} / ₹{b.sellingPrice.toFixed(2)}</td>
                          <td className="py-2 px-2 text-right font-bold text-teal-700">{b.currentQuantity}</td>
                          <td className="py-2 px-2 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              b.status === 'EXPIRED' ? 'bg-rose-100 text-rose-800' :
                              b.status === 'RECALLED' ? 'bg-purple-100 text-purple-800' :
                              'bg-emerald-100 text-emerald-800'
                            }`}>
                              {b.status}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-slate-500 font-sans">{b.rackLocation || '-'}</td>
                        </tr>
                      ))}
                      {(!selectedMedicine.batches || selectedMedicine.batches.length === 0) && (
                        <tr>
                          <td colSpan={6} className="py-4 text-center text-slate-400 font-sans">
                            No batches registered for this medicine yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Stock movement history */}
              <div>
                <h4 className="font-bold text-slate-900 mb-2">Recent Stock Movement Audit Trail</h4>
                <div className="space-y-1.5 max-h-40 overflow-y-auto">
                  {selectedMedicine.stockMovements?.map((m) => (
                    <div key={m.id} className="p-2 bg-slate-50 rounded border border-slate-200 flex items-center justify-between text-[11px]">
                      <div>
                        <span className="font-semibold text-slate-800">{m.movementType}</span>
                        <span className="text-slate-400 ml-2">Batch: {m.batch?.batchNumber}</span>
                        <p className="text-slate-500 text-[10px]">{m.reason}</p>
                      </div>
                      <div className="text-right">
                        <span className={`font-bold ${m.quantityChange > 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {m.quantityChange > 0 ? '+' : ''}{m.quantityChange} units
                        </span>
                        <span className="block text-[10px] text-slate-400">Balance: {m.newStock}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

