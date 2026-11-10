import React, { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { medicineAPI, batchAPI, saleAPI, customerAPI, prescriptionAPI } from '../services/api';
import {
  Search,
  Barcode,
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  CheckCircle2,
  Printer,
  Download,
  AlertTriangle,
  ShieldAlert,
  User,
  CreditCard,
  QrCode,
  DollarSign,
  ArrowRight,
  FileText
} from 'lucide-react';

export default function PosPage() {
  const { user, settings } = useAuth();
  const location = useLocation();

  // Search & Products
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');

  // Cart
  const [cart, setCart] = useState([]);
  const [discountOverall, setDiscountOverall] = useState(0);

  // Customer & Prescription
  const [customers, setCustomers] = useState([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedPrescriptionId, setSelectedPrescriptionId] = useState('');
  const [patientDetails, setPatientDetails] = useState({
    patientName: '',
    patientAddress: '',
    patientPhone: '',
    doctorName: '',
    doctorRegNo: ''
  });

  // Payment
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [cashTendered, setCashTendered] = useState('');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [completedSale, setCompletedSale] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const searchInputRef = useRef(null);

  // Load customers
  useEffect(() => {
    async function loadInitialData() {
      try {
        const cRes = await customerAPI.getAll();
        if (cRes.data.success) setCustomers(cRes.data.data);
      } catch (e) {
        console.error(e);
      }
    }
    loadInitialData();
  }, []);

  // Check if routed from Prescriptions page with pre-filled items
  useEffect(() => {
    if (location.state?.prescribedItems) {
      const items = location.state.prescribedItems;
      setSelectedPrescriptionId(location.state.prescriptionId || '');
      if (location.state.patient) {
        setPatientDetails({
          patientName: location.state.patient.patientName || '',
          patientAddress: location.state.patient.address || '',
          patientPhone: location.state.patient.phone || '',
          doctorName: location.state.patient.doctorName || '',
          doctorRegNo: location.state.patient.doctorRegNo || ''
        });
      }
      // Load first matches
      items.forEach(async (pi) => {
        try {
          const res = await medicineAPI.getAll({ search: pi.medicineName });
          if (res.data.success && res.data.data.length > 0) {
            addItemToCart(res.data.data[0], pi.quantityRequired || 10);
          }
        } catch (e) {}
      });
    }
  }, [location.state]);

  // Handle medicine live search
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchTerm.trim().length >= 2) {
        setSearching(true);
        try {
          const res = await medicineAPI.getAll({ search: searchTerm.trim() });
          if (res.data.success) {
            setSearchResults(res.data.data);
          }
        } catch (e) {
          console.error(e);
        } finally {
          setSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Handle barcode enter
  const handleBarcodeSubmit = async (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;
    try {
      const res = await medicineAPI.getAll({ search: barcodeInput.trim() });
      if (res.data.success && res.data.data.length > 0) {
        const matched = res.data.data.find((m) => m.barcode === barcodeInput.trim()) || res.data.data[0];
        addItemToCart(matched);
        setBarcodeInput('');
      } else {
        setErrorMessage(`No medicine found with barcode: ${barcodeInput}`);
      }
    } catch (e) {
      setErrorMessage('Barcode lookup failed');
    }
  };

  // Add medicine to cart with automatic FEFO batch selection
  const addItemToCart = async (medicine, initialQty = 1) => {
    setErrorMessage('');
    try {
      const fefoRes = await batchAPI.getFEFO(medicine.id);
      const batches = fefoRes.data.data;

      if (!batches || batches.length === 0) {
        setErrorMessage(`No active, eligible batches available for ${medicine.name}. (All stock may be expired, recalled or zero).`);
        return;
      }

      // Earliest expiry batch chosen automatically (FEFO)
      const bestBatch = batches[0];

      // Check if already in cart with same batch
      const existingIndex = cart.findIndex((item) => item.medicineId === medicine.id && item.batchId === bestBatch.id);

      if (existingIndex > -1) {
        const updated = [...cart];
        const newQty = updated[existingIndex].quantity + initialQty;
        if (newQty > bestBatch.currentQuantity) {
          setErrorMessage(`Cannot exceed available batch stock (${bestBatch.currentQuantity} units).`);
          return;
        }
        updated[existingIndex].quantity = newQty;
        setCart(updated);
      } else {
        setCart([
          ...cart,
          {
            medicineId: medicine.id,
            medicine,
            batchId: bestBatch.id,
            batch: bestBatch,
            allBatches: batches,
            quantity: Math.min(initialQty, bestBatch.currentQuantity),
            unitPrice: bestBatch.sellingPrice,
            mrp: bestBatch.mrp,
            discountPercent: 0,
            gstRate: medicine.gstRate
          }
        ]);
      }

      setSearchTerm('');
      setSearchResults([]);
    } catch (err) {
      setErrorMessage(err.response?.data?.message || 'Failed to select FEFO batch');
    }
  };

  // Change selected batch for a cart line
  const handleBatchChange = (index, newBatchId) => {
    const updated = [...cart];
    const item = updated[index];
    const chosenBatch = item.allBatches.find((b) => b.id === newBatchId);
    if (chosenBatch) {
      item.batchId = chosenBatch.id;
      item.batch = chosenBatch;
      item.unitPrice = chosenBatch.sellingPrice;
      item.mrp = chosenBatch.mrp;
      if (item.quantity > chosenBatch.currentQuantity) {
        item.quantity = chosenBatch.currentQuantity;
      }
      setCart(updated);
    }
  };

  const updateQuantity = (index, delta) => {
    const updated = [...cart];
    const item = updated[index];
    const newQty = item.quantity + delta;

    if (newQty <= 0) {
      removeItem(index);
      return;
    }

    if (newQty > item.batch.currentQuantity) {
      setErrorMessage(`Maximum available stock in Batch ${item.batch.batchNumber} is ${item.batch.currentQuantity}.`);
      return;
    }

    item.quantity = newQty;
    setCart(updated);
  };

  const updateDiscount = (index, disc) => {
    const updated = [...cart];
    const val = Math.max(0, Math.min(50, parseFloat(disc) || 0));
    updated[index].discountPercent = val;
    setCart(updated);
  };

  const removeItem = (index) => {
    const updated = cart.filter((_, i) => i !== index);
    setCart(updated);
  };

  // Totals calculations
  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;

  cart.forEach((item) => {
    const gross = item.unitPrice * item.quantity;
    const disc = gross * (item.discountPercent / 100);
    const taxable = gross - disc;
    const tax = taxable * (item.gstRate / 100);

    subtotal += gross;
    totalDiscount += disc;
    totalTax += tax;
  });

  const grandTotal = Math.round((subtotal - totalDiscount + totalTax) * 100) / 100;
  const changeDue = Math.max(0, (parseFloat(cashTendered) || 0) - grandTotal);

  // Check if cart contains Schedule H1 or Schedule X
  const hasControlledMedicines = cart.some((i) => ['SCHEDULE_H1', 'SCHEDULE_X'].includes(i.medicine.scheduleType));

  // Finalize Checkout
  const handleCheckout = async () => {
    if (cart.length === 0) {
      setErrorMessage('Cart is empty.');
      return;
    }

    // Schedule H1 validation
    if (hasControlledMedicines) {
      if (!patientDetails.patientName || !patientDetails.doctorName) {
        setErrorMessage('Schedule H1 / Schedule X drugs present: Patient Name and Doctor Name are legally mandatory under Indian Drugs Rules.');
        return;
      }
    }

    setCheckoutLoading(true);
    setErrorMessage('');

    try {
      const payload = {
        customerId: selectedCustomerId || null,
        prescriptionId: selectedPrescriptionId || null,
        paymentMethod,
        paymentStatus: 'PAID',
        patientDetails: hasControlledMedicines ? patientDetails : undefined,
        items: cart.map((item) => ({
          medicineId: item.medicineId,
          batchId: item.batchId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountPercent: item.discountPercent
        }))
      };

      const res = await saleAPI.create(payload);
      if (res.data.success) {
        setCompletedSale(res.data.data);
        setCart([]);
        setCashTendered('');
      }
    } catch (err) {
      console.error('Checkout error:', err);
      setErrorMessage(err.response?.data?.message || 'Sale checkout failed.');
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      {/* Top Banner & Barcode Quick Scan Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-teal-50 text-teal-700">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900">Point of Sale (POS) Billing</h2>
            <p className="text-xs text-slate-500">Auto-FEFO Batch Selection & GST Invoice Generation</p>
          </div>
        </div>

        {/* Barcode scanner input */}
        <form onSubmit={handleBarcodeSubmit} className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Barcode className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="Scan Barcode & Press Enter..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
            />
          </div>
          <button
            type="submit"
            className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-semibold hover:bg-slate-900 transition-colors"
          >
            Scan
          </button>
        </form>
      </div>

      {/* Error notification banner */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage('')} className="text-xs font-bold hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Main Grid: Left Medicine Search & Cart | Right Summary & Payment */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Search & Cart (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          {/* Product Search Card */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search medicine by Brand, Generic Name, or Indication (e.g. Paracetamol, Dolo, Augmentin)..."
                className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:bg-white"
              />
              {searching && (
                <div className="absolute right-3 top-3">
                  <div className="w-4 h-4 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>

            {/* Live Search Results Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute left-4 right-4 top-16 bg-white rounded-xl shadow-xl border border-slate-200 z-20 max-h-72 overflow-y-auto divide-y divide-slate-100">
                {searchResults.map((med) => (
                  <div
                    key={med.id}
                    onClick={() => addItemToCart(med)}
                    className="p-3 hover:bg-teal-50/60 cursor-pointer flex items-center justify-between transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900">{med.name}</span>
                        <span className="text-xs text-slate-500">({med.strength} - {med.dosageForm})</span>
                        {med.scheduleType === 'SCHEDULE_H' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                            Sched H
                          </span>
                        )}
                        {med.scheduleType === 'SCHEDULE_H1' && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">
                            Sched H1 (Register)
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{med.genericName} • {med.packSize}</p>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-teal-700 block">
                        Stock: {med.totalStock} units
                      </span>
                      <span className="text-[11px] text-slate-400">Click to Add (FEFO)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cart Table */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-slate-800">Dispensing Cart</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-teal-100 text-teal-800">
                  {cart.length} items
                </span>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-xs text-rose-600 hover:text-rose-700 font-medium"
                >
                  Clear Cart
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <ShoppingCart className="w-12 h-12 stroke-[1.5] mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-medium text-slate-600">Cart is empty</p>
                <p className="text-xs mt-1">Search medicine by name or scan barcode to add items.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Medicine</th>
                      <th className="py-2.5 px-2">Batch (FEFO)</th>
                      <th className="py-2.5 px-2 text-center">Qty</th>
                      <th className="py-2.5 px-2 text-right">MRP / Unit</th>
                      <th className="py-2.5 px-2 text-right">Disc%</th>
                      <th className="py-2.5 px-2 text-right">GST</th>
                      <th className="py-2.5 px-3 text-right">Total</th>
                      <th className="py-2.5 px-2 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {cart.map((item, idx) => {
                      const lineGross = item.unitPrice * item.quantity;
                      const lineDisc = lineGross * (item.discountPercent / 100);
                      const lineTaxable = lineGross - lineDisc;
                      const lineTax = lineTaxable * (item.gstRate / 100);
                      const lineTotal = lineTaxable + lineTax;

                      const isEarliestBatch = item.allBatches?.[0]?.id === item.batchId;

                      return (
                        <tr key={`${item.medicineId}-${item.batchId}`} className="hover:bg-slate-50/50">
                          {/* Medicine Name & Details */}
                          <td className="py-2.5 px-3 max-w-[180px]">
                            <p className="font-semibold text-slate-900 truncate">{item.medicine.name}</p>
                            <p className="text-[11px] text-slate-400 truncate">{item.medicine.genericName}</p>
                            {item.medicine.scheduleType !== 'NONE' && (
                              <span className="inline-block mt-0.5 text-[9px] px-1 py-0.2 rounded font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                {item.medicine.scheduleType.replace('_', ' ')}
                              </span>
                            )}
                          </td>

                          {/* Batch Selector */}
                          <td className="py-2.5 px-2">
                            <select
                              value={item.batchId}
                              onChange={(e) => handleBatchChange(idx, e.target.value)}
                              className="text-xs bg-slate-50 border border-slate-200 rounded px-1.5 py-1 focus:outline-none focus:ring-1 focus:ring-teal-500 font-mono"
                            >
                              {item.allBatches.map((b, bIdx) => (
                                <option key={b.id} value={b.id}>
                                  {b.batchNumber} {bIdx === 0 ? '(FEFO)' : ''} - Exp: {new Date(b.expiryDate).toLocaleDateString('en-IN', { month: '2-digit', year: '2-digit' })} ({b.currentQuantity} left)
                                </option>
                              ))}
                            </select>
                            {isEarliestBatch && (
                              <span className="block text-[10px] text-teal-600 font-medium mt-0.5">
                                ★ Priority FEFO
                              </span>
                            )}
                          </td>

                          {/* Quantity Controls */}
                          <td className="py-2.5 px-2 text-center">
                            <div className="inline-flex items-center border border-slate-200 rounded-lg overflow-hidden bg-white">
                              <button
                                onClick={() => updateQuantity(idx, -1)}
                                className="px-2 py-1 text-slate-500 hover:bg-slate-100 transition-colors"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="px-2 text-xs font-bold text-slate-800 min-w-[24px]">
                                {item.quantity}
                              </span>
                              <button
                                onClick={() => updateQuantity(idx, 1)}
                                className="px-2 py-1 text-slate-500 hover:bg-slate-100 transition-colors"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </td>

                          {/* MRP & Selling Price */}
                          <td className="py-2.5 px-2 text-right">
                            <span className="font-semibold text-slate-900 block">₹{item.unitPrice.toFixed(2)}</span>
                            <span className="text-[10px] text-slate-400 block line-through">MRP: ₹{item.mrp.toFixed(2)}</span>
                          </td>

                          {/* Discount Input */}
                          <td className="py-2.5 px-2 text-right">
                            <input
                              type="number"
                              min="0"
                              max="50"
                              value={item.discountPercent}
                              onChange={(e) => updateDiscount(idx, e.target.value)}
                              className="w-12 text-right p-1 bg-slate-50 border border-slate-200 rounded text-xs"
                            />
                            <span className="text-[10px] text-slate-400 ml-0.5">%</span>
                          </td>

                          {/* GST Rate */}
                          <td className="py-2.5 px-2 text-right text-slate-500">
                            {item.gstRate}%
                          </td>

                          {/* Line Total */}
                          <td className="py-2.5 px-3 text-right font-bold text-slate-900">
                            ₹{lineTotal.toFixed(2)}
                          </td>

                          {/* Remove */}
                          <td className="py-2.5 px-2 text-center">
                            <button
                              onClick={() => removeItem(idx)}
                              className="text-slate-400 hover:text-rose-600 transition-colors p-1"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Schedule H1 Statutory Compliance Box (Appears if controlled drugs in cart) */}
          {hasControlledMedicines && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-2 text-amber-900 font-bold text-xs uppercase tracking-wide">
                <ShieldAlert className="w-4 h-4 text-amber-700" />
                <span>Schedule H1 / Schedule X Statutory Register Requirement</span>
              </div>
              <p className="text-xs text-amber-800">
                Indian Drugs Rules mandate patient and prescribing physician registration for restricted drugs.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Patient Full Name *</label>
                  <input
                    type="text"
                    value={patientDetails.patientName}
                    onChange={(e) => setPatientDetails({ ...patientDetails, patientName: e.target.value })}
                    placeholder="Patient Name"
                    className="w-full p-2 bg-white border border-amber-300 rounded-lg focus:ring-1 focus:ring-amber-500 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Patient Contact Phone</label>
                  <input
                    type="text"
                    value={patientDetails.patientPhone}
                    onChange={(e) => setPatientDetails({ ...patientDetails, patientPhone: e.target.value })}
                    placeholder="+91..."
                    className="w-full p-2 bg-white border border-amber-300 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Prescribing Doctor *</label>
                  <input
                    type="text"
                    value={patientDetails.doctorName}
                    onChange={(e) => setPatientDetails({ ...patientDetails, doctorName: e.target.value })}
                    placeholder="Dr. Name"
                    className="w-full p-2 bg-white border border-amber-300 rounded-lg text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Doctor Medical Reg No</label>
                  <input
                    type="text"
                    value={patientDetails.doctorRegNo}
                    onChange={(e) => setPatientDetails({ ...patientDetails, doctorRegNo: e.target.value })}
                    placeholder="State Medical Council Reg #"
                    className="w-full p-2 bg-white border border-amber-300 rounded-lg text-xs"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Customer, Payment & Final Billing (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Customer Selection */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Patient / Customer</span>
              <span className="text-[11px] text-teal-600 font-medium">Walk-in Optional</span>
            </div>

            <select
              value={selectedCustomerId}
              onChange={(e) => {
                setSelectedCustomerId(e.target.value);
                const cust = customers.find((c) => c.id === e.target.value);
                setSelectedCustomer(cust || null);
                if (cust) {
                  setPatientDetails((prev) => ({
                    ...prev,
                    patientName: cust.name,
                    patientPhone: cust.phone,
                    doctorName: cust.doctorName || prev.doctorName
                  }));
                }
              }}
              className="w-full p-2 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="">-- Walk-in Retail Customer --</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.phone})
                </option>
              ))}
            </select>

            {selectedCustomer?.allergies && (
              <div className="p-2 bg-rose-50 border border-rose-200 rounded text-[11px] text-rose-700">
                <span className="font-bold">⚠️ Allergy Alert:</span> {selectedCustomer.allergies}
              </div>
            )}
          </div>

          {/* Payment Method Selector */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block">Payment Method</span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPaymentMethod('CASH')}
                className={`py-2 px-2 text-center rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                  paymentMethod === 'CASH'
                    ? 'border-teal-600 bg-teal-50 text-teal-800'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <DollarSign className="w-4 h-4" />
                <span>Cash</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('UPI')}
                className={`py-2 px-2 text-center rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                  paymentMethod === 'UPI'
                    ? 'border-teal-600 bg-teal-50 text-teal-800'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <QrCode className="w-4 h-4" />
                <span>UPI QR</span>
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('CARD')}
                className={`py-2 px-2 text-center rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                  paymentMethod === 'CARD'
                    ? 'border-teal-600 bg-teal-50 text-teal-800'
                    : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>Card</span>
              </button>
            </div>

            {/* Cash Tendered Calculator */}
            {paymentMethod === 'CASH' && (
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-600">Cash Received:</span>
                  <input
                    type="number"
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    placeholder="₹ 0.00"
                    className="w-24 p-1 text-right border border-slate-200 rounded font-semibold text-xs"
                  />
                </div>
                {cashTendered && parseFloat(cashTendered) >= grandTotal && (
                  <div className="flex items-center justify-between text-xs bg-emerald-50 text-emerald-800 p-2 rounded-lg font-bold">
                    <span>Return Change:</span>
                    <span>₹{changeDue.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            {/* UPI QR Simulator */}
            {paymentMethod === 'UPI' && (
              <div className="p-3 bg-slate-50 rounded-lg text-center border border-slate-200 space-y-2">
                <div className="w-24 h-24 bg-white border border-slate-300 rounded-lg mx-auto flex items-center justify-center p-1">
                  {/* Generated QR representation */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=upi://pay?pa=${settings?.gstin?.toLowerCase() || 'pharmacy'}@okaxis&am=${grandTotal}&cu=INR`}
                    alt="UPI QR"
                    className="w-full h-full object-contain"
                  />
                </div>
                <p className="text-[11px] font-bold text-slate-700">Scan via GPay / PhonePe / Paytm</p>
                <p className="text-[10px] text-slate-500">Amount: ₹{grandTotal.toFixed(2)}</p>
              </div>
            )}
          </div>

          {/* Bill Summary Card */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Bill Calculation</h3>

            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Subtotal (Gross):</span>
                <span>₹{subtotal.toFixed(2)}</span>
              </div>
              {totalDiscount > 0 && (
                <div className="flex justify-between text-emerald-600">
                  <span>Total Discount:</span>
                  <span>- ₹{totalDiscount.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-500">
                <span>CGST (Est.):</span>
                <span>₹{(totalTax / 2).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>SGST (Est.):</span>
                <span>₹{(totalTax / 2).toFixed(2)}</span>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm">
                <span className="font-bold text-slate-900">Grand Total:</span>
                <span className="text-lg font-black text-teal-700">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || checkoutLoading}
              className="w-full py-3 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm shadow-md shadow-teal-600/30 transition-all flex items-center justify-center gap-2"
            >
              {checkoutLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  <span>Finalizing Sale...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Confirm Sale & Print Memo</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Completed Sale Modal & Printable Cash Memo */}
      {completedSale && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="p-4 bg-teal-700 text-white flex items-center justify-between no-print">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-teal-300" />
                <h3 className="font-bold text-sm">Sale Completed Successfully</h3>
              </div>
              <button
                onClick={() => setCompletedSale(null)}
                className="text-white/80 hover:text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>

            {/* Printable Cash Memo Section */}
            <div id="printable-receipt" className="p-6 overflow-y-auto font-sans text-xs space-y-4">
              <div className="text-center pb-3 border-b border-slate-200">
                <h2 className="text-base font-bold text-teal-800">{settings?.pharmacyName}</h2>
                <p className="text-[11px] text-slate-500">{settings?.address}</p>
                <p className="text-[10px] text-slate-500">DL: {settings?.dlNumber20B} | GSTIN: {settings?.gstin}</p>
                <p className="text-[10px] text-slate-500">Phone: {settings?.phone}</p>
              </div>

              <div className="flex justify-between text-[11px] text-slate-600">
                <div>
                  <p><strong>Invoice:</strong> {completedSale.invoiceNumber}</p>
                  <p><strong>Date:</strong> {new Date(completedSale.createdAt).toLocaleString('en-IN')}</p>
                  <p><strong>Cashier:</strong> {completedSale.cashier?.fullName || user?.fullName}</p>
                </div>
                <div className="text-right">
                  <p><strong>Customer:</strong> {completedSale.customer?.name || 'Retail Walk-in'}</p>
                  <p><strong>Payment:</strong> {completedSale.paymentMethod}</p>
                </div>
              </div>

              <table className="w-full text-left text-[11px] border-t border-b border-slate-200 py-2">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500 font-semibold">
                    <th className="py-1">Item</th>
                    <th className="py-1">Batch</th>
                    <th className="py-1 text-center">Qty</th>
                    <th className="py-1 text-right">Rate</th>
                    <th className="py-1 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {completedSale.items?.map((it) => (
                    <tr key={it.id}>
                      <td className="py-1.5 font-medium">{it.medicine?.name}</td>
                      <td className="py-1.5 font-mono text-[10px]">{it.batch?.batchNumber}</td>
                      <td className="py-1.5 text-center">{it.quantity}</td>
                      <td className="py-1.5 text-right">₹{it.unitPrice.toFixed(2)}</td>
                      <td className="py-1.5 text-right font-semibold">₹{it.totalAmount.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="text-right space-y-1 text-xs">
                <p className="text-slate-500">Subtotal: ₹{completedSale.subtotal.toFixed(2)}</p>
                <p className="text-slate-500">GST (CGST+SGST): ₹{completedSale.taxAmount.toFixed(2)}</p>
                {completedSale.discountAmount > 0 && (
                  <p className="text-emerald-600">Discount: -₹{completedSale.discountAmount.toFixed(2)}</p>
                )}
                <p className="text-sm font-bold text-teal-800 pt-1 border-t border-slate-200">
                  Grand Total: ₹{completedSale.grandTotal.toFixed(2)}
                </p>
              </div>

              <div className="text-center pt-3 border-t border-slate-100 text-[10px] text-slate-400">
                <p>{settings?.receiptFooterNote || 'Medicines once sold cannot be returned without original cash memo.'}</p>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between no-print">
              <button
                onClick={handlePrint}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 hover:bg-slate-900 transition-colors"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print Memo</span>
              </button>

              <div className="flex items-center gap-2">
                <a
                  href={`/api/sales/${completedSale.id}/pdf`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3.5 py-2 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </a>
                <button
                  onClick={() => setCompletedSale(null)}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700 transition-colors"
                >
                  New Sale
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

