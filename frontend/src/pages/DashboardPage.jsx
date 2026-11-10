import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { reportAPI } from '../services/api';
import {
  Pill,
  Boxes,
  TrendingUp,
  DollarSign,
  AlertTriangle,
  AlertCircle,
  Users,
  Truck,
  ShoppingCart,
  Plus,
  ArrowRight,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar
} from 'recharts';

export default function DashboardPage() {
  const { user, settings } = useAuth();
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState(null);
  const [salesAnalytics, setSalesAnalytics] = useState(null);
  const [categoryData, setCategoryData] = useState([]);
  const [topMedicines, setTopMedicines] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);
      try {
        const [mRes, sRes, cRes, tRes] = await Promise.all([
          reportAPI.getDashboard(),
          reportAPI.getSalesAnalytics(),
          reportAPI.getCategories(),
          reportAPI.getTopMedicines()
        ]);

        if (mRes.data.success) setMetrics(mRes.data.data);
        if (sRes.data.success) setSalesAnalytics(sRes.data.data);
        if (cRes.data.success) setCategoryData(cRes.data.data);
        if (tRes.data.success) setTopMedicines(tRes.data.data);
      } catch (err) {
        console.error('Failed to load dashboard metrics:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const COLORS = ['#0d9488', '#0284c7', '#8b5cf6', '#f59e0b', '#ec4899', '#10b981', '#6366f1'];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-slate-500 font-medium">Loading Pharmacy Dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Welcome Banner & Quick Action Buttons */}
      <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-slate-900 rounded-2xl p-6 text-white shadow-md flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-teal-500/30 text-teal-200 text-xs font-semibold uppercase tracking-wider">
              {user?.role?.replace('_', ' ')} PORTAL
            </span>
            <span className="text-xs text-teal-300">|</span>
            <span className="text-xs text-teal-300">{settings?.pharmacyName}</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight">Welcome back, {user?.fullName}</h2>
          <p className="text-sm text-teal-100/90 mt-1 max-w-xl">
            Real-time batch-wise inventory, FEFO automatic dispensing, and Indian regulatory compliance monitor.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => navigate('/pos')}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-semibold shadow-md flex items-center gap-2 transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            <span>Launch POS Billing</span>
          </button>
          <button
            onClick={() => navigate('/prescriptions')}
            className="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-sm font-medium border border-white/15 transition-colors"
          >
            Prescriptions
          </button>
        </div>
      </div>

      {/* Urgent Expiry Banner (if any) */}
      {metrics?.urgentExpiring?.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-rose-900">Urgent Expiry Notice (&lt; 30 Days)</h4>
              <p className="text-xs text-rose-700">
                {metrics.urgentExpiring.length} batches are nearing imminent expiry. Prioritize dispensing via FEFO or initiate vendor returns.
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate('/expiry')}
            className="text-xs font-semibold px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors flex items-center gap-1 shrink-0"
          >
            <span>Review Batches</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* 8 Core Metric Cards specified in Blueprint Page 6 */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total Medicines */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Total Medicines</span>
            <div className="p-2 rounded-lg bg-teal-50 text-teal-600">
              <Pill className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics?.totalMedicines || 0}</p>
          <p className="text-[11px] text-slate-500 mt-1">Active catalog products</p>
        </div>

        {/* Card 2: Total Stock */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Total Stock</span>
            <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
              <Boxes className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics?.totalStock?.toLocaleString('en-IN') || 0}</p>
          <p className="text-[11px] text-slate-500 mt-1">Available batch units</p>
        </div>

        {/* Card 3: Today's Sales */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Today's Sales</span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">₹{metrics?.todayRevenue?.toFixed(2) || '0.00'}</p>
          <p className="text-[11px] text-emerald-600 font-medium mt-1">
            {metrics?.todayTransactions || 0} invoices today
          </p>
        </div>

        {/* Card 4: Monthly Revenue */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Monthly Revenue</span>
            <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">₹{metrics?.monthlyRevenue?.toFixed(2) || '0.00'}</p>
          <p className="text-[11px] text-purple-600 font-medium mt-1">
            {metrics?.monthlyTransactions || 0} total orders
          </p>
        </div>

        {/* Card 5: Low Stock */}
        <div
          onClick={() => navigate('/inventory?tab=reorder')}
          className="bg-white p-4 rounded-xl border border-rose-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-rose-50/20"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-rose-700">Low Stock Alert</span>
            <div className="p-2 rounded-lg bg-rose-100 text-rose-700">
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-rose-800">{metrics?.lowStockCount || 0}</p>
          <p className="text-[11px] text-rose-600 mt-1 flex items-center gap-1">
            <span>Needs Reorder</span>
            <ArrowRight className="w-3 h-3" />
          </p>
        </div>

        {/* Card 6: Expiring Medicines */}
        <div
          onClick={() => navigate('/expiry')}
          className="bg-white p-4 rounded-xl border border-amber-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer bg-amber-50/20"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-amber-700">Expiring (&lt;90d)</span>
            <div className="p-2 rounded-lg bg-amber-100 text-amber-700">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-amber-800">{metrics?.expiringCount || 0}</p>
          <p className="text-[11px] text-amber-600 mt-1 flex items-center gap-1">
            <span>{metrics?.expiredCount || 0} already expired</span>
            <ArrowRight className="w-3 h-3" />
          </p>
        </div>

        {/* Card 7: Total Suppliers */}
        <div
          onClick={() => navigate('/suppliers')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Suppliers</span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Truck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics?.totalSuppliers || 0}</p>
          <p className="text-[11px] text-slate-500 mt-1">Verified distributors</p>
        </div>

        {/* Card 8: Total Customers */}
        <div
          onClick={() => navigate('/customers')}
          className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Registered Customers</span>
            <div className="p-2 rounded-lg bg-cyan-50 text-cyan-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl font-bold text-slate-900">{metrics?.totalCustomers || 0}</p>
          <p className="text-[11px] text-slate-500 mt-1">Patient records</p>
        </div>
      </div>

      {/* Visualizations Section (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales Trend Chart */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Daily Revenue Trend</h3>
              <p className="text-xs text-slate-500">Sales performance over the last 14 days</p>
            </div>
            <span className="text-xs font-medium px-2 py-1 bg-teal-50 text-teal-700 rounded-lg border border-teal-100">
              Revenue in ₹
            </span>
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={salesAnalytics?.dailyTrend || []}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0d9488" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#0d9488" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip
                  formatter={(val) => [`₹${val}`, 'Revenue']}
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#0d9488" strokeWidth={2.5} fillOpacity={1} fill="url(#salesGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category Breakdown (Pie) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
          <div className="mb-2">
            <h3 className="font-bold text-slate-900 text-sm">Inventory by Category</h3>
            <p className="text-xs text-slate-500">Stock distribution across therapeutic classes</p>
          </div>

          <div className="h-48 my-auto">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryData}
                  dataKey="stockUnits"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={3}
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val, name) => [`${val} Units`, name]}
                  contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: 'none', color: '#fff', fontSize: '11px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="space-y-1 mt-2 max-h-28 overflow-y-auto pr-1">
            {categoryData.slice(0, 4).map((c, i) => (
              <div key={c.name} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 truncate">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }}></span>
                  <span className="text-slate-600 truncate">{c.name}</span>
                </div>
                <span className="font-semibold text-slate-800 shrink-0">{c.stockUnits} units</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Recent Sales & Top Fast-Moving Drugs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Recent POS Transactions</h3>
              <p className="text-xs text-slate-500">Latest completed customer sales</p>
            </div>
            <button
              onClick={() => navigate('/pos')}
              className="text-xs text-teal-600 hover:text-teal-700 font-semibold flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 font-semibold">
                  <th className="pb-2">Invoice #</th>
                  <th className="pb-2">Customer</th>
                  <th className="pb-2">Mode</th>
                  <th className="pb-2 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {metrics?.recentSales?.map((sale) => (
                  <tr key={sale.id} className="hover:bg-slate-50/80">
                    <td className="py-2.5 font-mono font-medium text-slate-700">{sale.invoiceNumber}</td>
                    <td className="py-2.5 text-slate-600 truncate max-w-[120px]">{sale.customer?.name || 'Walk-in'}</td>
                    <td className="py-2.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700">
                        {sale.paymentMethod}
                      </span>
                    </td>
                    <td className="py-2.5 text-right font-bold text-teal-700">₹{sale.grandTotal.toFixed(2)}</td>
                  </tr>
                ))}
                {(!metrics?.recentSales || metrics.recentSales.length === 0) && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400">
                      No sales recorded yet today. Click 'Launch POS' to start billing!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Fast-Moving Medicines */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-slate-900 text-sm">Top Fast-Moving Medicines</h3>
              <p className="text-xs text-slate-500">Highest volume items dispensed</p>
            </div>
            <span className="text-xs text-slate-400">By Dispensed Units</span>
          </div>

          <div className="space-y-3">
            {topMedicines.length > 0 ? (
              topMedicines.map((item, idx) => (
                <div key={item.medicineId} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="w-5 h-5 rounded bg-slate-100 text-slate-600 font-bold flex items-center justify-center text-[10px] shrink-0">
                      #{idx + 1}
                    </span>
                    <span className="font-medium text-slate-800 truncate">{item.name}</span>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-slate-900">{item.totalQuantity} units</span>
                    <span className="text-[11px] text-slate-400 block">₹{item.totalRevenue.toFixed(2)}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-400 py-6 text-center">
                Top dispensing statistics will appear as sales are finalized.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

