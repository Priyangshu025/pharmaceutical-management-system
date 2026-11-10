import React, { useState, useEffect } from 'react';
import { regulatedAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  ShieldCheck,
  Search,
  Printer,
  Calendar,
  FileSpreadsheet,
  AlertCircle
} from 'lucide-react';

export default function ScheduleH1Page() {
  const { settings } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [scheduleType, setScheduleType] = useState('SCHEDULE_H1');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await regulatedAPI.getScheduleH1({
        scheduleType,
        search,
        startDate,
        endDate
      });
      if (res.data.success) {
        setRecords(res.data.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [scheduleType, search, startDate, endDate]);

  const handlePrint = () => {
    window.print();
  };

  const exportCSV = () => {
    if (records.length === 0) return;
    const headers = ['Date & Time', 'Invoice #', 'Patient Name', 'Patient Address', 'Doctor Name', 'Doctor Reg #', 'Medicine', 'Batch #', 'Qty Dispensed', 'Pharmacist'];
    const rows = records.map((r) => [
      new Date(r.dispensedAt).toLocaleString('en-IN'),
      r.sale?.invoiceNumber || '-',
      `"${r.patientName}"`,
      `"${r.patientAddress || 'Local'}"`,
      `"${r.doctorName}"`,
      r.doctorRegNo,
      `"${r.medicine?.name} (${r.medicine?.strength})"`,
      r.batch?.batchNumber || '-',
      r.quantity,
      `"${r.pharmacist?.fullName || '-'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Schedule_H1_Register_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-rose-600" />
            <h2 className="text-base font-bold text-slate-900">Schedule H1 Statutory Register</h2>
          </div>
          <p className="text-xs text-slate-500">
            Mandatory Indian Drugs & Cosmetics Rules recordkeeping for Schedule H1 & Schedule X restricted medications
          </p>
        </div>

        <div className="flex items-center gap-2 no-print">
          <button
            onClick={exportCSV}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-sm transition-colors"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Register</span>
          </button>
        </div>
      </div>

      {/* Statutory Info Banner */}
      <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 text-xs text-rose-800 flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">Statutory Legal Requirement (Drugs Rules, 1945):</span> The licensee must record every transaction of Schedule H1 drugs in a separate register with patient details, doctor registration number, batch number, and quantity. This register must be preserved for a minimum of 3 years for drug inspector audit.
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center gap-3 no-print">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search patient, doctor, or drug name..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none"
          />
        </div>

        <select
          value={scheduleType}
          onChange={(e) => setScheduleType(e.target.value)}
          className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5"
        >
          <option value="SCHEDULE_H1">Schedule H1 Drugs</option>
          <option value="SCHEDULE_X">Schedule X Drugs</option>
          <option value="ALL">All Regulated</option>
        </select>
      </div>

      {/* Statutory Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-200 text-center only-print">
          <h2 className="text-base font-bold">{settings?.pharmacyName}</h2>
          <p className="text-xs text-slate-600">SCHEDULE H1 DRUG DISPENSING REGISTER</p>
          <p className="text-[10px] text-slate-500">DL: {settings?.dlNumber20B} | Address: {settings?.address}</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-3">Date & Time</th>
                <th className="py-3 px-3">Patient Name & Address</th>
                <th className="py-3 px-3">Doctor & Reg #</th>
                <th className="py-3 px-3">Drug Name</th>
                <th className="py-3 px-2">Batch #</th>
                <th className="py-3 px-2 text-center">Qty</th>
                <th className="py-3 px-3">Dispensing Pharmacist</th>
                <th className="py-3 px-2">Invoice #</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {records.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/70 font-sans">
                  <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                    {new Date(r.dispensedAt).toLocaleString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </td>

                  <td className="py-2.5 px-3">
                    <p className="font-semibold text-slate-900">{r.patientName}</p>
                    <p className="text-[10px] text-slate-500">{r.patientAddress || 'Walk-in'} • {r.patientPhone || ''}</p>
                  </td>

                  <td className="py-2.5 px-3">
                    <p className="font-semibold text-slate-800">{r.doctorName}</p>
                    <p className="text-[10px] text-teal-700 font-mono">Reg: {r.doctorRegNo}</p>
                  </td>

                  <td className="py-2.5 px-3 font-medium text-slate-900">
                    {r.medicine?.name} ({r.medicine?.strength})
                  </td>

                  <td className="py-2.5 px-2 font-mono text-slate-700">
                    {r.batch?.batchNumber}
                  </td>

                  <td className="py-2.5 px-2 text-center font-bold text-slate-900">
                    {r.quantity}
                  </td>

                  <td className="py-2.5 px-3 text-slate-700">
                    {r.pharmacist?.fullName || 'Registered Pharmacist'}
                  </td>

                  <td className="py-2.5 px-2 font-mono text-[10px] text-slate-500">
                    {r.sale?.invoiceNumber || '-'}
                  </td>
                </tr>
              ))}

              {records.length === 0 && !loading && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-400 font-sans">
                    No Schedule H1 / Schedule X dispensing entries recorded yet.
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

