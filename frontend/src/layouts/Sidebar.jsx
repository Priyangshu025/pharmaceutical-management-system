import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  ShoppingCart,
  Pill,
  Boxes,
  AlertTriangle,
  FileText,
  Truck,
  Users,
  ShieldCheck,
  BarChart3,
  UserCog,
  Settings,
  LogOut,
  Cross
} from 'lucide-react';

export default function Sidebar() {
  const { user, logout, hasRole, settings } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navItems = [
    { name: 'Dashboard', path: '/', icon: LayoutDashboard, roles: ['ADMIN', 'PHARMACIST', 'INVENTORY_MANAGER', 'CASHIER'] },
    { name: 'Point of Sale (POS)', path: '/pos', icon: ShoppingCart, roles: ['ADMIN', 'CASHIER', 'PHARMACIST'] },
    { name: 'Medicines Master', path: '/medicines', icon: Pill, roles: ['ADMIN', 'PHARMACIST', 'INVENTORY_MANAGER', 'CASHIER'] },
    { name: 'Batch Inventory', path: '/inventory', icon: Boxes, roles: ['ADMIN', 'INVENTORY_MANAGER', 'PHARMACIST'] },
    { name: 'Expiry & Alerts', path: '/expiry', icon: AlertTriangle, roles: ['ADMIN', 'INVENTORY_MANAGER', 'PHARMACIST'] },
    { name: 'Prescriptions', path: '/prescriptions', icon: FileText, roles: ['ADMIN', 'PHARMACIST', 'CASHIER'] },
    { name: 'Schedule H1 Register', path: '/schedule-h1', icon: ShieldCheck, roles: ['ADMIN', 'PHARMACIST'] },
    { name: 'Purchases & PO', path: '/purchases', icon: Truck, roles: ['ADMIN', 'INVENTORY_MANAGER'] },
    { name: 'Suppliers', path: '/suppliers', icon: Users, roles: ['ADMIN', 'INVENTORY_MANAGER'] },
    { name: 'Customers', path: '/customers', icon: Users, roles: ['ADMIN', 'CASHIER', 'PHARMACIST'] },
    { name: 'Reports & Analytics', path: '/reports', icon: BarChart3, roles: ['ADMIN', 'INVENTORY_MANAGER'] },
    { name: 'Users & Audit', path: '/users', icon: UserCog, roles: ['ADMIN'] },
    { name: 'Settings', path: '/settings', icon: Settings, roles: ['ADMIN'] },
  ];

  const roleColors = {
    ADMIN: 'bg-purple-100 text-purple-800 border-purple-200',
    PHARMACIST: 'bg-emerald-100 text-emerald-800 border-emerald-200',
    INVENTORY_MANAGER: 'bg-blue-100 text-blue-800 border-blue-200',
    CASHIER: 'bg-amber-100 text-amber-800 border-amber-200'
  };

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen fixed left-0 top-0 z-30 shadow-sm">
      {/* Brand Header */}
      <div className="p-4 border-b border-slate-100 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-teal-600 to-cyan-500 flex items-center justify-center text-white shadow-md shadow-teal-500/20">
          <Cross className="w-6 h-6 stroke-[2.5]" />
        </div>
        <div className="min-w-0">
          <h1 className="font-bold text-slate-900 text-base leading-tight truncate">
            {settings?.pharmacyName || 'PharmIQ PMS'}
          </h1>
          <p className="text-xs text-teal-600 font-medium flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-teal-500 animate-pulse"></span>
            Pharmacy Management
          </p>
        </div>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems
          .filter((item) => hasRole(item.roles))
          .map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-teal-50 text-teal-700 shadow-sm border border-teal-100/60 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                <Icon className="w-4 h-4 shrink-0 text-teal-600" />
                <span className="truncate">{item.name}</span>
              </NavLink>
            );
          })}
      </nav>

      {/* User Info & Footer */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center font-bold text-slate-700 text-xs">
              {user?.fullName?.charAt(0) || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">{user?.fullName}</p>
              <span className={`inline-block px-1.5 py-0.5 text-[10px] font-medium rounded border ${roleColors[user?.role] || 'bg-slate-100 text-slate-700'}`}>
                {user?.role?.replace('_', ' ')}
              </span>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Sign Out"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
        <div className="text-[10px] text-slate-400 flex justify-between">
          <span>Drugs Act, 1940</span>
          <span>DL: {settings?.dlNumber20B?.slice(0, 11) || 'Form 20B'}</span>
        </div>
      </div>
    </aside>
  );
}

