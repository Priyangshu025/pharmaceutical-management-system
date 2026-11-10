import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { reportAPI } from '../services/api';
import {
  Bell,
  AlertTriangle,
  AlertCircle,
  ShoppingCart,
  PlusCircle,
  FileCheck2,
  Calendar,
  Building2
} from 'lucide-react';

export default function Navbar() {
  const { user, settings } = useAuth();
  const navigate = useNavigate();
  const [metrics, setMetrics] = useState(null);

  useEffect(() => {
    async function loadAlerts() {
      try {
        const res = await reportAPI.getDashboard();
        if (res.data.success) {
          setMetrics(res.data.data);
        }
      } catch (e) {
        // quiet fail
      }
    }
    loadAlerts();
    const interval = setInterval(loadAlerts, 60000);
    return () => clearInterval(interval);
  }, []);

  const todayStr = new Date().toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });

  return (
    <header className="h-16 bg-white border-b border-slate-200 sticky top-0 z-20 px-6 flex items-center justify-between">
      {/* Left: Pharmacy Info & Date */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-slate-700">
          <Building2 className="w-4 h-4 text-teal-600" />
          <span className="font-semibold text-sm">{settings?.pharmacyName}</span>
          <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono">
            GSTIN: {settings?.gstin}
          </span>
        </div>
        <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-500 pl-4 border-l border-slate-200">
          <Calendar className="w-3.5 h-3.5" />
          <span>{todayStr}</span>
        </div>
      </div>

      {/* Right: Quick Alert Pills & Quick Actions */}
      <div className="flex items-center gap-3">
        {/* Urgent Expiring Alert Pill */}
        {metrics && metrics.expiringCount > 0 && (
          <button
            onClick={() => navigate('/expiry')}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 bg-amber-50 text-amber-800 border border-amber-200 rounded-full hover:bg-amber-100 transition-colors"
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>{metrics.expiringCount} Near Expiry</span>
          </button>
        )}

        {/* Low Stock Alert Pill */}
        {metrics && metrics.lowStockCount > 0 && (
          <button
            onClick={() => navigate('/inventory?tab=reorder')}
            className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 bg-rose-50 text-rose-800 border border-rose-200 rounded-full hover:bg-rose-100 transition-colors"
          >
            <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
            <span>{metrics.lowStockCount} Low Stock</span>
          </button>
        )}

        {/* Quick POS Button */}
        <button
          onClick={() => navigate('/pos')}
          className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 bg-teal-600 text-white rounded-lg hover:bg-teal-700 shadow-sm shadow-teal-600/20 transition-all"
        >
          <ShoppingCart className="w-3.5 h-3.5" />
          <span>New Sale (POS)</span>
        </button>
      </div>
    </header>
  );
}

