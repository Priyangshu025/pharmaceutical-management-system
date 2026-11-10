import React, { useState, useEffect } from 'react';
import { batchAPI } from '../services/api';
import {
  AlertTriangle,
  AlertOctagon,
  Clock,
  ShieldCheck,
  Search,
  DollarSign,
  Trash2,
  Boxes
} from 'lucide-react';

export default function ExpiryPage() {
  const [expiryFilter, setExpiryFilter] = useState('URGENT'); // EXPIRED, URGENT, WARNING, SAFE
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await batchAPI.getAll({
        expiryFilter,
        search
      });
      if (res.data.success) {
        setBatches(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [expiryFilter, search]);

  // Compute financial value at risk
  const totalValueAtRisk = batches.reduce((sum, b) => sum + b.currentQuantity * b.sellingPrice, 0);
  const totalCostAtRisk = batches.reduce((sum, b) => sum + b.currentQuantity * b.purchasePrice, 0);
  const totalUnitsAtRisk = batches.reduce((sum, b) => sum + b.currentQuantity, 0);

  const handleDisposeExpired = async (batch) => {
    if (window.confirm(`Confirm safe chemical disposal of all ${batch.currentQuantity} expired units of ${batch.medicine.name} (Batch ${batch.batchNumber})?`)) {
      try {
        await batchAPI.adjustStock(batch.id, {
          movementType: 'EXPIRED_DISPOSAL',
          quantityChange: -batch.currentQuantity,
          reason: 'Regulatory compliance: safe destruction of expired pharmaceutical inventory.'
        });
        loadData();
      } catch (e) {
        alert('Disposal failed');
      }
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900">Expiry Monitoring & Risk Analytics</h2>
          <p className="text-xs text-slate-500">
            Track batches nearing expiry, prevent clinical dispensing errors, and calculate stock financial exposure
          </p>
        </div>
      </div>

      {/* Expiry Risk Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Affected Units</span>
          <p className="text-2xl font-bold text-slate-800 mt-1">{totalUnitsAtRisk} units</p>
          <p className="text-[11px] text-slate-400">In selected filter category</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Purchase Cost Exposure</span>
          <p className="text-2xl font-bold text-slate-800 mt-1">₹{totalCostAtRisk.toFixed(2)}</p>
          <p className="text-[11px] text-slate-400">Total acquisition cost</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Retail Sales Value at Risk</span>
          <p className="text-2xl font-bold text-amber-700 mt-1">₹{totalValueAtRisk.toFixed(2)}</p>
          <p className="text-[11px] text-amber-600 font-medium">Potential revenue loss if unsold</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 text-xs">
        <button
          onClick={() => setExpiryFilter('EXPIRED')}
          className={`pb-2.5 px-3 font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            expiryFilter === 'EXPIRED'
              ? 'border-rose-600 text-rose-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertOctagon className="w-4 h-4 text-rose-600" />
          <span>Already Expired (Sale Blocked)</span>
        </button>

        <button
          onClick={() => setExpiryFilter('URGENT')}
          className={`pb-2.5 px-3 font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            expiryFilter === 'URGENT'
              ? 'border-amber-600 text-amber-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          <span>Critical Expiry (&lt; 30 Days)</span>
        </button>

        <button
          onClick={() => setExpiryFilter('WARNING')}
          className={`pb-2.5 px-3 font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            expiryFilter === 'WARNING'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4 text-blue-600" />
          <span>Expiring Soon (31 - 90 Days)</span>
        </button>

        <button
          onClick={() => setExpiryFilter('SAFE')}
          className={`pb-2.5 px-3 font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            expiryFilter === 'SAFE'
              ? 'border-teal-600 text-teal-700'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-teal-600" />
          <span>Safe Inventory (&gt; 90 Days)</span>
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
            placeholder="Search affected medicine or batch..."
            className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Batches Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Batch #</th>
                <th className="py-3 px-3">Medicine Formulation</th>
                <th className="py-3 px-3">Expiry Date</th>
                <th className="py-3 px-3 text-center">Remaining Days</th>
                <th className="py-3 px-3 text-right">Units in Stock</th>
                <th className="py-3 px-3 text-right">Potential Value</th>
                <th className="py-3 px-3">Storage Rack</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {batches.map((b) => (
                <tr key={b.id} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">{b.batchNumber}</td>
                  <td className="py-3 px-3">
                    <p className="font-semibold text-slate-800">{b.medicine?.name}</p>
                    <p className="text-[11px] text-slate-500">{b.medicine?.genericName}</p>
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-slate-800">
                    {new Date(b.expiryDate).toLocaleDateString('en-IN')}
                  </td>
                  <td className="py-3 px-3 text-center font-bold font-mono">
                    <span className={`px-2 py-0.5 rounded text-[10px] ${
                      b.daysToExpiry <= 0 ? 'bg-rose-100 text-rose-800' :
                      b.daysToExpiry <= 30 ? 'bg-amber-100 text-amber-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {b.daysToExpiry <= 0 ? 'EXPIRED' : `${b.daysToExpiry} days`}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right font-bold text-slate-900">{b.currentQuantity} units</td>
                  <td className="py-3 px-3 text-right font-mono font-semibold text-teal-700">
                    ₹{(b.currentQuantity * b.sellingPrice).toFixed(2)}
                  </td>
                  <td className="py-3 px-3 text-slate-500 font-mono text-[11px]">{b.rackLocation || '-'}</td>
                  <td className="py-3 px-4 text-center">
                    {b.daysToExpiry <= 0 && b.currentQuantity > 0 ? (
                      <button
                        onClick={() => handleDisposeExpired(b)}
                        className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-semibold flex items-center gap-1 mx-auto transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Dispose & Write-off</span>
                      </button>
                    ) : (
                      <span className="text-[10px] text-slate-400">FEFO priority</span>
                    )}
                  </td>
                </tr>
              ))}

              {batches.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400">
                    No batches in this expiry horizon.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

