import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { prescriptionAPI, customerAPI, medicineAPI } from '../services/api';
import {
  FileText,
  Plus,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  ShieldCheck,
  ShoppingCart,
  Eye,
  X,
  Search
} from 'lucide-react';

export default function PrescriptionsPage() {
  const { user, hasRole } = useAuth();
  const navigate = useNavigate();

  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [search, setSearch] = useState('');

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedRx, setSelectedRx] = useState(null);

  // Form
  const [formData, setFormData] = useState({
    patientName: '',
    patientAge: '',
    patientGender: 'Male',
    doctorName: '',
    doctorRegNo: '',
    hospitalClinic: '',
    diagnosis: '',
    customerId: '',
    items: [{ medicineName: '', dosage: '1 Tab', frequency: 'Twice daily (BD)', durationDays: 5, quantityRequired: 10 }]
  });
  const [customers, setCustomers] = useState([]);
  const [formError, setFormError] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await prescriptionAPI.getAll({ status: filterStatus, search });
      if (res.data.success) setPrescriptions(res.data.data);
      const cRes = await customerAPI.getAll();
      if (cRes.data.success) setCustomers(cRes.data.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterStatus, search]);

  const handleAddItemRow = () => {
    setFormData({
      ...formData,
      items: [
        ...formData.items,
        { medicineName: '', dosage: '1 Tab', frequency: 'Twice daily (BD)', durationDays: 5, quantityRequired: 10 }
      ]
    });
  };

  const handleRemoveItemRow = (index) => {
    setFormData({
      ...formData,
      items: formData.items.filter((_, i) => i !== index)
    });
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...formData.items];
    updated[index][field] = value;
    setFormData({ ...formData, items: updated });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    try {
      const res = await prescriptionAPI.create(formData);
      if (res.data.success) {
        setIsAddOpen(false);
        loadData();
      }
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to record prescription');
    }
  };

  const handleVerify = async (rxId, status, notes) => {
    try {
      await prescriptionAPI.verify(rxId, { status, verificationNotes: notes });
      loadData();
      if (selectedRx && selectedRx.id === rxId) {
        setIsDetailOpen(false);
      }
    } catch (e) {
      alert('Verification action failed');
    }
  };

  const handleDispenseInPos = (rx) => {
    navigate('/pos', {
      state: {
        prescriptionId: rx.id,
        patient: {
          patientName: rx.patientName,
          doctorName: rx.doctorName,
          doctorRegNo: rx.doctorRegNo,
          phone: rx.customer?.phone || ''
        },
        prescribedItems: rx.items
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Prescription Verification & Dispensing</h2>
          <p className="text-xs text-slate-500">
            Registered medical practitioner prescriptions, pharmacist verification audit, and clinical safety checks
          </p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="px-3.5 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Record New Prescription</span>
        </button>
      </div>

      {/* Filter Tabs & Search */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {['ALL', 'PENDING', 'VERIFIED', 'REJECTED'].map((st) => (
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

        <div className="relative min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient, doctor, or reg #..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
          />
        </div>
      </div>

      {/* Prescriptions List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {prescriptions.map((rx) => (
          <div key={rx.id} className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{rx.patientName}</h3>
                  <p className="text-xs text-slate-500">
                    {rx.patientAge ? `${rx.patientAge} yrs` : ''} {rx.patientGender || ''}
                  </p>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  rx.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' :
                  rx.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                  'bg-amber-100 text-amber-800'
                }`}>
                  {rx.status}
                </span>
              </div>

              <div className="mt-2.5 pt-2.5 border-t border-slate-100 text-xs text-slate-600 space-y-1">
                <p><strong>Doctor:</strong> {rx.doctorName} {rx.doctorRegNo ? `(${rx.doctorRegNo})` : ''}</p>
                <p><strong>Clinic:</strong> {rx.hospitalClinic || 'Private Chamber'}</p>
                {rx.diagnosis && <p><strong>Diagnosis:</strong> {rx.diagnosis}</p>}
                <p className="text-[11px] text-slate-400">Date: {new Date(rx.prescriptionDate).toLocaleDateString('en-IN')}</p>
              </div>

              {/* Items preview */}
              <div className="mt-2 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase">Prescribed Items:</span>
                {rx.items?.map((it, i) => (
                  <div key={i} className="text-xs text-slate-700 bg-slate-50 p-1.5 rounded flex justify-between">
                    <span className="font-medium truncate">{it.medicineName}</span>
                    <span className="text-slate-500">{it.quantityRequired} units</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                onClick={() => {
                  setSelectedRx(rx);
                  setIsDetailOpen(true);
                }}
                className="px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 font-medium hover:bg-slate-100 rounded-lg flex items-center gap-1 transition-colors"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Details</span>
              </button>

              <div className="flex items-center gap-1.5">
                {rx.status === 'PENDING' && hasRole(['ADMIN', 'PHARMACIST']) && (
                  <>
                    <button
                      onClick={() => handleVerify(rx.id, 'VERIFIED', 'Verified by registered pharmacist.')}
                      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleVerify(rx.id, 'REJECTED', 'Prescription unreadable or expired.')}
                      className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Reject</span>
                    </button>
                  </>
                )}

                {rx.status === 'VERIFIED' && (
                  <button
                    onClick={() => handleDispenseInPos(rx)}
                    className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-colors"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    <span>Dispense in POS</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {prescriptions.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center text-slate-400">
            No prescriptions found.
          </div>
        )}
      </div>

      {/* Add Prescription Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-xl w-full overflow-hidden border border-slate-200">
            <div className="p-4 bg-teal-800 text-white flex items-center justify-between">
              <h3 className="font-bold text-sm">Register Medical Prescription</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-white/80 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 space-y-3 text-xs max-h-[80vh] overflow-y-auto">
              {formError && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-700 rounded">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-3 gap-2">
                <div className="col-span-2">
                  <label className="block font-semibold text-slate-700 mb-1">Patient Full Name *</label>
                  <input
                    type="text"
                    value={formData.patientName}
                    onChange={(e) => setFormData({ ...formData, patientName: e.target.value })}
                    placeholder="Patient Name"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Age</label>
                  <input
                    type="number"
                    value={formData.patientAge}
                    onChange={(e) => setFormData({ ...formData, patientAge: e.target.value })}
                    placeholder="Years"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Prescribing Doctor *</label>
                  <input
                    type="text"
                    value={formData.doctorName}
                    onChange={(e) => setFormData({ ...formData, doctorName: e.target.value })}
                    placeholder="Dr. Full Name"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                    required
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Doctor State Reg #</label>
                  <input
                    type="text"
                    value={formData.doctorRegNo}
                    onChange={(e) => setFormData({ ...formData, doctorRegNo: e.target.value })}
                    placeholder="e.g. WB-MC-10492"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Hospital / Clinic</label>
                <input
                  type="text"
                  value={formData.hospitalClinic}
                  onChange={(e) => setFormData({ ...formData, hospitalClinic: e.target.value })}
                  placeholder="Clinic Name & Address"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Diagnosis / Indication</label>
                <input
                  type="text"
                  value={formData.diagnosis}
                  onChange={(e) => setFormData({ ...formData, diagnosis: e.target.value })}
                  placeholder="e.g. Acute Bronchitis"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg"
                />
              </div>

              {/* Items Rows */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="font-semibold text-slate-700">Prescribed Medicine Items *</label>
                  <button
                    type="button"
                    onClick={handleAddItemRow}
                    className="text-xs text-teal-600 font-bold hover:underline"
                  >
                    + Add Item
                  </button>
                </div>

                <div className="space-y-2">
                  {formData.items.map((row, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
                      <input
                        type="text"
                        value={row.medicineName}
                        onChange={(e) => handleItemChange(idx, 'medicineName', e.target.value)}
                        placeholder="Medicine Name (e.g. Augmentin 625)"
                        className="flex-1 p-1 bg-white border border-slate-200 rounded text-xs"
                        required
                      />
                      <input
                        type="text"
                        value={row.dosage}
                        onChange={(e) => handleItemChange(idx, 'dosage', e.target.value)}
                        placeholder="Dosage (1 Tab)"
                        className="w-20 p-1 bg-white border border-slate-200 rounded text-xs"
                      />
                      <input
                        type="number"
                        min="1"
                        value={row.quantityRequired}
                        onChange={(e) => handleItemChange(idx, 'quantityRequired', e.target.value)}
                        placeholder="Qty"
                        className="w-16 p-1 bg-white border border-slate-200 rounded text-xs"
                        required
                      />
                      {formData.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveItemRow(idx)}
                          className="text-rose-500 hover:text-rose-700"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
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
                  Save Prescription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

