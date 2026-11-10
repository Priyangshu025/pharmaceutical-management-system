const PDFDocument = require('pdfkit');

/**
 * PDF Invoice Generator Service
 * Generates an itemized, compliant retail pharmacy invoice conforming to Indian GST and Drug Rules.
 */
function generateInvoicePDF(sale, settings, dataCallback, endCallback) {
  const doc = new PDFDocument({ margin: 40, size: 'A4' });

  doc.on('data', dataCallback);
  doc.on('end', endCallback);

  // Pharmacy Header
  doc
    .fontSize(18)
    .font('Helvetica-Bold')
    .fillColor('#0f766e') // Teal accent
    .text(settings?.pharmacyName || 'APOLLO MEDCARE PHARMACY', { align: 'center' });

  doc
    .fontSize(9)
    .font('Helvetica')
    .fillColor('#4b5563')
    .text(settings?.address || '12/B Park Street, Kolkata, West Bengal - 700016', { align: 'center' })
    .text(`Phone: ${settings?.phone || '+91 98300 12345'} | Email: ${settings?.email || 'contact@apollomedcare.com'}`, { align: 'center' })
    .text(`Drug Lic. No: Form 20B: ${settings?.dlNumber20B || 'WB-KOL-20B-184920'} | Form 21B: ${settings?.dlNumber21B || 'WB-KOL-21B-184921'}`, { align: 'center' })
    .text(`GSTIN: ${settings?.gstin || '19AAACH7409R1ZZ'} | State: ${settings?.state || 'West Bengal'} (Code: 19)`, { align: 'center' });

  doc.moveDown(0.5);
  doc.strokeColor('#cbd5e1').lineWidth(1).moveTo(40, doc.y).lineTo(555, doc.y).stroke();
  doc.moveDown(0.5);

  // Invoice Title & Metadata
  const startY = doc.y;
  doc
    .fontSize(12)
    .font('Helvetica-Bold')
    .fillColor('#1e293b')
    .text('TAX INVOICE / CASH MEMO', 40, startY)
    .fontSize(9)
    .font('Helvetica')
    .text(`Invoice No: ${sale.invoiceNumber}`, 40, startY + 16)
    .text(`Date & Time: ${new Date(sale.createdAt).toLocaleString('en-IN')}`, 40, startY + 28)
    .text(`Payment Mode: ${sale.paymentMethod} (${sale.paymentStatus})`, 40, startY + 40);

  // Customer & Doctor Details
  const customerName = sale.customer?.name || 'Retail Walk-in Customer';
  const customerPhone = sale.customer?.phone || 'N/A';
  const doctorName = sale.prescription?.doctorName || sale.customer?.doctorName || 'Self / Not Prescribed';

  doc
    .fontSize(9)
    .font('Helvetica-Bold')
    .text('Patient / Customer:', 320, startY)
    .font('Helvetica')
    .text(customerName, 320, startY + 14)
    .text(`Phone: ${customerPhone}`, 320, startY + 26)
    .text(`Doctor: ${doctorName}`, 320, startY + 38);

  doc.moveDown(3);
  const tableTop = doc.y + 15;

  // Table Headers
  doc.rect(40, tableTop, 515, 20).fill('#f1f5f9');
  doc.fillColor('#1e293b').font('Helvetica-Bold').fontSize(8);

  doc.text('#', 45, tableTop + 5, { width: 20 });
  doc.text('Medicine / Product', 70, tableTop + 5, { width: 140 });
  doc.text('Batch', 215, tableTop + 5, { width: 55 });
  doc.text('Expiry', 275, tableTop + 5, { width: 45 });
  doc.text('HSN', 325, tableTop + 5, { width: 35 });
  doc.text('Qty', 365, tableTop + 5, { width: 30, align: 'right' });
  doc.text('MRP', 400, tableTop + 5, { width: 40, align: 'right' });
  doc.text('Rate', 445, tableTop + 5, { width: 40, align: 'right' });
  doc.text('GST%', 490, tableTop + 5, { width: 25, align: 'right' });
  doc.text('Total (₹)', 520, tableTop + 5, { width: 35, align: 'right' });

  // Rows
  let curY = tableTop + 24;
  doc.font('Helvetica').fontSize(8);

  sale.items.forEach((item, index) => {
    const medName = item.medicine ? `${item.medicine.name} (${item.medicine.strength})` : 'Medicine Item';
    const batchNum = item.batch ? item.batch.batchNumber : '-';
    const expiry = item.batch ? new Date(item.batch.expiryDate).toLocaleDateString('en-IN', { month: '2-digit', year: '2-digit' }) : '-';
    const hsn = item.medicine?.hsnCode || '3004';

    doc.fillColor('#334155');
    doc.text(String(index + 1), 45, curY, { width: 20 });
    doc.text(medName, 70, curY, { width: 140 });
    doc.text(batchNum, 215, curY, { width: 55 });
    doc.text(expiry, 275, curY, { width: 45 });
    doc.text(hsn, 325, curY, { width: 35 });
    doc.text(String(item.quantity), 365, curY, { width: 30, align: 'right' });
    doc.text(item.mrp.toFixed(2), 400, curY, { width: 40, align: 'right' });
    doc.text(item.unitPrice.toFixed(2), 445, curY, { width: 40, align: 'right' });
    doc.text(`${item.taxRate}%`, 490, curY, { width: 25, align: 'right' });
    doc.text(item.totalAmount.toFixed(2), 520, curY, { width: 35, align: 'right' });

    curY += 18;
    if (curY > 700) {
      doc.addPage();
      curY = 40;
    }
  });

  doc.strokeColor('#e2e8f0').lineWidth(0.5).moveTo(40, curY + 5).lineTo(555, curY + 5).stroke();
  curY += 15;

  // Tax Breakdown & Totals Box
  const cgst = (sale.taxAmount || 0) / 2;
  const sgst = (sale.taxAmount || 0) / 2;

  doc.font('Helvetica').fontSize(8.5);
  doc.text(`Subtotal:`, 380, curY, { width: 80, align: 'right' });
  doc.text(`₹ ${sale.subtotal.toFixed(2)}`, 470, curY, { width: 80, align: 'right' });

  if (sale.discountAmount > 0) {
    curY += 14;
    doc.text(`Discount:`, 380, curY, { width: 80, align: 'right' });
    doc.text(`- ₹ ${sale.discountAmount.toFixed(2)}`, 470, curY, { width: 80, align: 'right' });
  }

  curY += 14;
  doc.text(`CGST (Est. 6%):`, 380, curY, { width: 80, align: 'right' });
  doc.text(`₹ ${cgst.toFixed(2)}`, 470, curY, { width: 80, align: 'right' });

  curY += 14;
  doc.text(`SGST (Est. 6%):`, 380, curY, { width: 80, align: 'right' });
  doc.text(`₹ ${sgst.toFixed(2)}`, 470, curY, { width: 80, align: 'right' });

  curY += 18;
  doc.strokeColor('#0f766e').lineWidth(1.5).moveTo(380, curY - 4).lineTo(555, curY - 4).stroke();

  doc.font('Helvetica-Bold').fontSize(11).fillColor('#0f766e');
  doc.text(`Grand Total:`, 360, curY, { width: 100, align: 'right' });
  doc.text(`₹ ${sale.grandTotal.toFixed(2)}`, 470, curY, { width: 80, align: 'right' });

  // Cashier and Sign
  curY += 35;
  doc.font('Helvetica').fontSize(8).fillColor('#64748b');
  doc.text(`Billed by: ${sale.cashier?.fullName || 'Cashier Desk'}`, 40, curY);
  doc.text('Authorized Pharmacist / Store Stamp:', 380, curY, { width: 175, align: 'right' });

  // Statutory Footer
  curY += 30;
  doc
    .fontSize(7.5)
    .font('Helvetica-Oblique')
    .fillColor('#6b7280')
    .text(settings?.receiptFooterNote || 'Medicines once sold without sealed blister cannot be returned. Schedule H/H1 drugs dispensed strictly on registered medical prescription.', 40, curY, { width: 515, align: 'center' });

  doc.end();
}

module.exports = { generateInvoicePDF };

