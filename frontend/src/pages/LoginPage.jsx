import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Cross, Lock, User, AlertCircle, ShieldCheck, CheckCircle2 } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login(username, password);
      if (res.success) {
        navigate('/');
      } else {
        setError(res.message || 'Login failed. Please check credentials.');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Unable to connect to server.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = (u, p) => {
    setUsername(u);
    setPassword(p);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-teal-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-teal-700 to-teal-900 p-6 text-white text-center relative">
          <div className="w-14 h-14 bg-white/10 backdrop-blur rounded-2xl border border-white/20 flex items-center justify-center mx-auto mb-3 shadow-lg">
            <Cross className="w-8 h-8 text-teal-300 stroke-[2.5]" />
          </div>
          <h2 className="text-xl font-bold tracking-tight">PharmIQ Management System</h2>
          <p className="text-xs text-teal-200 mt-1">Web-Based Pharmacy & Clinical Store Operations</p>
          <div className="inline-flex items-center gap-1.5 mt-3 px-2.5 py-1 bg-white/10 rounded-full text-[11px] text-teal-100 border border-white/15">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-300" />
            <span>Compliant with Indian Drugs Rules, 1945</span>
          </div>
        </div>

        {/* Form Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Username or Email</label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Enter username"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-semibold shadow-md shadow-teal-600/30 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Authenticating...' : 'Sign In to Store'}
            </button>
          </form>

          {/* Quick Demo Role Selector */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
              Quick 1-Click Role Login
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('admin', 'admin123')}
                className={`p-2 text-left border rounded-lg transition-all ${
                  username === 'admin'
                    ? 'border-purple-400 bg-purple-50 text-purple-900 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span>👑 Administrator</span>
                  {username === 'admin' && <CheckCircle2 className="w-3.5 h-3.5 text-purple-600" />}
                </div>
                <p className="text-[10px] text-slate-400">admin / admin123</p>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('pharmacist', 'pharma123')}
                className={`p-2 text-left border rounded-lg transition-all ${
                  username === 'pharmacist'
                    ? 'border-emerald-400 bg-emerald-50 text-emerald-900 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span>🩺 Pharmacist</span>
                  {username === 'pharmacist' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                </div>
                <p className="text-[10px] text-slate-400">pharmacist / pharma123</p>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('inventory', 'stock123')}
                className={`p-2 text-left border rounded-lg transition-all ${
                  username === 'inventory'
                    ? 'border-blue-400 bg-blue-50 text-blue-900 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span>📦 Inventory Mgr</span>
                  {username === 'inventory' && <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />}
                </div>
                <p className="text-[10px] text-slate-400">inventory / stock123</p>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('cashier', 'cash123')}
                className={`p-2 text-left border rounded-lg transition-all ${
                  username === 'cashier'
                    ? 'border-amber-400 bg-amber-50 text-amber-900 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span>💳 Cashier / POS</span>
                  {username === 'cashier' && <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />}
                </div>
                <p className="text-[10px] text-slate-400">cashier / cash123</p>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-50 p-3 text-center border-t border-slate-100 text-[11px] text-slate-400">
          Indian Drugs & Cosmetics Act, 1940 | CBIC GST HSN 3004
        </div>
      </div>
    </div>
  );
}

