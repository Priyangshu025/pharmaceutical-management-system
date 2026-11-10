import React, { useState, useEffect } from 'react';
import { reportAPI } from '../services/api';
import {
  BarChart3,
  TrendingUp,
  DollarSign,
  PieChart as PieIcon,
  Download,
  Calendar,
  Percent,
  Boxes
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

export default function ReportsPage() {
  const [valuation, setValuation] = useState(null);
  const [salesAnalytics, setSalesAnalytics] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [topMedicines, setTopMedicines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReports() {
      setLoading(true);
      try {
        const [vRes, sRes, cRes, tRes] = await Promise.all([
          reportAPI.getValuation(),
          reportAPI.getSalesAnalytics(),
          reportAPI.getCategories(),
          reportAPI.getTopMedicines()
        ]);

        if (vRes.data.success) setValuation(vRes.data.data);
        if (sRes.data.success) setSalesAnalytics(sRes.data.data);
        if (cRes.data.success) setCategoryData(cRes.data.data);
        if (tRes.data.success) setTopMedicines(tRes.data.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    loadReports();
  }, []);

  const COLORS = ['#0d9488', '#0284c7', '#8b5cf6', '#f59e0b', '#ec4899', '#10b981', '#6366f1'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900">Financial Reports & Inventory Analytics</h2>
          <p className="text-xs text-slate-500">
            Valuation, profit margins, sales velocity, and category performance
          </p>
        </div>
      </div>

      {/* Valuation Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Inventory at Cost</span>
          <p className="text-xl font-bold text-slate-900 mt-1">₹{valuation?.totalPurchaseCost?.toFixed(2) || '0.00'}</p>
          <p className="text-[11px] text-slate-400">{valuation?.totalUnits || 0} active units in store</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Inventory at MRP Value</span>
          <p className="text-xl font-bold text-slate-900 mt-1">₹{valuation?.totalMRPValue?.toFixed(2) || '0.00'}</p>
          <p className="text-[11px] text-slate-400">Total maximum retail value</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Estimated Gross Margin</span>
          <p className="text-xl font-bold text-teal-700 mt-1">₹{valuation?.estimatedMargin?.toFixed(2) || '0.00'}</p>
          <p className="text-[11px] text-teal-600 font-semibold">{valuation?.marginPercent || 0}% potential markup</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <span className="text-xs font-medium text-slate-500">Active Batches</span>
          <p className="text-xl font-bold text-slate-900 mt-1">{valuation?.totalBatches || 0}</p>
          <p className="text-[11px] text-slate-400">Tracked in database</p>
        </div>
      </div>

      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Revenue Trend */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900">14-Day Sales Velocity</h3>
            <p className="text-xs text-slate-500">Daily gross revenue</p>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesAnalytics?.dailyTrend || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" fontSize={11} stroke="#94a3b8" />
                <YAxis fontSize={11} stroke="#94a3b8" tickFormatter={(v) => `₹${v}`} />
                <Tooltip formatter={(v) => [`₹${v}`, 'Revenue']} />
                <Area type="monotone" dataKey="revenue" stroke="#0d9488" fill="#ccfbf1" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top-Selling Medicines */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Top-Selling Formulations</h3>
            <p className="text-xs text-slate-500">Highest volume items dispensed</p>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topMedicines} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" fontSize={11} stroke="#94a3b8" />
                <YAxis dataKey="name" type="category" width={110} fontSize={10} stroke="#94a3b8" />
                <Tooltip formatter={(v) => [`${v} Units`, 'Quantity']} />
                <Bar dataKey="totalQuantity" fill="#0284c7" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown (Pie) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Inventory Distribution by Category</h3>
            <p className="text-xs text-slate-500">Unit distribution</p>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="stockUnits"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, percent }) => `${name?.slice(0, 10)}... (${(percent * 100).toFixed(0)}%)`}
                  labelLine={false}
                >
                  {categoryData.map((e, idx) => (
                    <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Payment Mode Distribution */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div>
            <h3 className="font-bold text-sm text-slate-900">Payment Mode Breakdown</h3>
            <p className="text-xs text-slate-500">Cash vs Digital UPI vs Card revenue</p>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={salesAnalytics?.paymentBreakdown || []}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="name" fontSize={11} stroke="#94a3b8" />
                <YAxis fontSize={11} stroke="#94a3b8" tickFormatter={(v) => `₹${v}`} />
                <Tooltip formatter={(v) => [`₹${v}`, 'Revenue']} />
                <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}

