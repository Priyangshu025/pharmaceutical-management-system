import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { settingsAPI } from '../services/api';
import { Settings, Save, CheckCircle2, ShieldCheck, Building2 } from 'lucide-react';

export default function SettingsPage() {
  const { settings: initialSettings, setSettings: updateContextSettings } = useAuth();
  const [formData, setFormData] = useState({
    pharmacyName: '',
    dlNumber20B: '',
    dlNumber21B: '',
    gstin: '',
    address: '',
    phone: '',
    email: '',
    state: 'West Bengal',
    warningExpiryDays: 90,
    urgentExpiryDays: 30,
    lowStockThresholdDefault: 20,
    receiptFooterNote: ''
  });
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialSettings) {
      setFormData(initialSettings);
    }
  }, [initialSettings]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccess('');
    try {
      const res = await settingsAPI.update(formData);
      if (res.data.success) {
        updateContextSettings(res.data.data);
        setSuccess('Pharmacy configuration and licensing parameters updated successfully.');
        setTimeout(() => setSuccess(''), 3000);
      }
    } catch (e) {
      alert('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Pharmacy Configuration & Licensing</h2>
          <p className="text-xs text-slate-500">
            Establishment details, retail drug licenses (Forms 20B/21B), GSTIN, and alert parameters
          </p>
        </div>
      </div>

      {success && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Pharmacy Identity Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 text-xs">
          <div className="flex items-center gap-2 text-teal-800 font-bold border-b pb-2">
            <Building2 className="w-4 h-4" />
            <span>Store Identity & Communication</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Pharmacy Trade Name *</label>
              <input
                type="text"
                value={formData.pharmacyName}
                onChange={(e) => setFormData({ ...formData, pharmacyName: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">State / Jurisdiction</label>
              <input
                type="text"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Official Contact Phone *</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                required
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Official Email Address *</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                required
              />
            </div>

            <div className="md:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Registered Business Address *</label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={2}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                required
              />
            </div>
          </div>
        </div>

        {/* Legal Drug License & Taxation Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 text-xs">
          <div className="flex items-center gap-2 text-rose-800 font-bold border-b pb-2">
            <ShieldCheck className="w-4 h-4 text-rose-600" />
            <span>Statutory Licensing & GST Credentials</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Drug License (Form 20B) *</label>
              <input
                type="text"
                value={formData.dlNumber20B}
                onChange={(e) => setFormData({ ...formData, dlNumber20B: e.target.value })}
                placeholder="State Drug Controller License"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs uppercase"
                required
              />
              <span className="text-[10px] text-slate-400">Retail allopathic drugs</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Drug License (Form 21B) *</label>
              <input
                type="text"
                value={formData.dlNumber21B}
                onChange={(e) => setFormData({ ...formData, dlNumber21B: e.target.value })}
                placeholder="State Drug Controller License"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs uppercase"
                required
              />
              <span className="text-[10px] text-slate-400">Biological & special products</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">GSTIN Number *</label>
              <input
                type="text"
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value })}
                placeholder="15-character GSTIN"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-mono text-xs uppercase"
                required
              />
              <span className="text-[10px] text-slate-400">CBIC Indian GST identifier</span>
            </div>
          </div>
        </div>

        {/* Alert Thresholds Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4 text-xs">
          <div className="font-bold text-slate-800 border-b pb-2">
            Automated Alert & Notification Thresholds
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Critical Expiry Horizon (Days)</label>
              <input
                type="number"
                value={formData.urgentExpiryDays}
                onChange={(e) => setFormData({ ...formData, urgentExpiryDays: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-amber-700 text-xs"
              />
              <span className="text-[10px] text-slate-400">Default: 30 days</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Warning Expiry Horizon (Days)</label>
              <input
                type="number"
                value={formData.warningExpiryDays}
                onChange={(e) => setFormData({ ...formData, warningExpiryDays: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-blue-700 text-xs"
              />
              <span className="text-[10px] text-slate-400">Default: 90 days</span>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Default Low Stock Threshold</label>
              <input
                type="number"
                value={formData.lowStockThresholdDefault}
                onChange={(e) => setFormData({ ...formData, lowStockThresholdDefault: e.target.value })}
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg font-bold text-rose-700 text-xs"
              />
              <span className="text-[10px] text-slate-400">Trigger reorder suggestion</span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Printed Bill / Cash Memo Legal Footer Note</label>
            <textarea
              value={formData.receiptFooterNote}
              onChange={(e) => setFormData({ ...formData, receiptFooterNote: e.target.value })}
              rows={2}
              className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold shadow-md shadow-teal-600/20 flex items-center gap-2 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Updating...' : 'Save Configuration Changes'}</span>
          </button>
        </div>
      </form>
    </div>
  );
}

