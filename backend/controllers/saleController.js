const prisma = require('../config/db');
const FefoService = require('../services/fefoService');
const { generateInvoicePDF } = require('../services/pdfService');
const { recordAuditLog } = require('../middleware/audit');

// Generate unique invoice number: INV-YYYYMMDD-XXXX
async function generateInvoiceNumber() {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const countToday = await prisma.sale.count({
    where: {
      invoiceNumber: {
        startsWith: `INV-${dateStr}`
      }
    }
  });
  const seq = String(countToday + 1).padStart(4, '0');
  return `INV-${dateStr}-${seq}`;
}

// POS Checkout / Sale Confirmation
async function createSale(req, res) {
  try {
    const {
      customerId,
      prescriptionId,
      paymentMethod = 'CASH',
      paymentStatus = 'PAID',
      notes,
      items, // Array of { medicineId, batchId, quantity, unitPrice, discountPercent }
      patientDetails // { patientName, patientAddress, patientPhone, doctorName, doctorRegNo } for statutory H1 logging
    } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Sale must contain at least one medicine item.' });
    }

    // Step 1: Pre-validation of all items before opening transaction
    const validatedLines = [];
    let calculatedSubtotal = 0;
    let calculatedDiscount = 0;
    let calculatedTax = 0;

    for (const item of items) {
      const { medicineId, batchId, quantity, unitPrice, discountPercent = 0 } = item;
      const parsedQty = parseInt(quantity, 10);
      const parsedPrice = parseFloat(unitPrice);
      const parsedDisc = parseFloat(discountPercent) || 0;

      if (!parsedQty || parsedQty <= 0) {
        return res.status(400).json({ success: false, message: `Invalid quantity specified for item.` });
      }

      // Check batch eligibility (active, not expired, not recalled, enough stock)
      const batch = await FefoService.validateBatchDispense(batchId, parsedQty);

      // Check DPCO rule: Selling price cannot exceed MRP
      if (parsedPrice > batch.mrp) {
        return res.status(400).json({
          success: false,
          message: `Selling price (₹${parsedPrice}) exceeds printed MRP (₹${batch.mrp}) for ${batch.medicine.name} (DPCO violation).`
        });
      }

      // Calculate line totals
      const lineGross = parsedPrice * parsedQty;
      const lineDiscountAmount = lineGross * (parsedDisc / 100);
      const lineTaxable = lineGross - lineDiscountAmount;
      const lineTaxAmount = lineTaxable * (batch.medicine.gstRate / 100);
      const lineTotal = lineTaxable + lineTaxAmount;

      calculatedSubtotal += lineGross;
      calculatedDiscount += lineDiscountAmount;
      calculatedTax += lineTaxAmount;

      validatedLines.push({
        medicineId,
        medicine: batch.medicine,
        batchId,
        batch,
        quantity: parsedQty,
        unitPrice: parsedPrice,
        mrp: batch.mrp,
        discountPercent: parsedDisc,
        taxRate: batch.medicine.gstRate,
        taxAmount: parseFloat(lineTaxAmount.toFixed(2)),
        totalAmount: parseFloat(lineTotal.toFixed(2))
      });
    }

    const calculatedGrandTotal = Math.round((calculatedSubtotal - calculatedDiscount + calculatedTax) * 100) / 100;
    const invoiceNumber = await generateInvoiceNumber();

    // Step 2: Atomic Database Transaction
    const completedSale = await prisma.$transaction(async (tx) => {
      // 1. Create Sale Header
      const sale = await tx.sale.create({
        data: {
          invoiceNumber,
          customerId: customerId || null,
          prescriptionId: prescriptionId || null,
          cashierId: req.user.id,
          subtotal: parseFloat(calculatedSubtotal.toFixed(2)),
          discountAmount: parseFloat(calculatedDiscount.toFixed(2)),
          taxAmount: parseFloat(calculatedTax.toFixed(2)),
          grandTotal: calculatedGrandTotal,
          paymentMethod,
          paymentStatus,
          status: 'COMPLETED',
          notes: notes || null
        }
      });

      // 2. Create Sale Items and Deduct Stock Atomically
      for (const line of validatedLines) {
        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            medicineId: line.medicineId,
            batchId: line.batchId,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            mrp: line.mrp,
            discountPercent: line.discountPercent,
            taxRate: line.taxRate,
            taxAmount: line.taxAmount,
            totalAmount: line.totalAmount
          }
        });

        // Re-read with row update
        const freshBatch = await tx.medicineBatch.findUnique({ where: { id: line.batchId } });
        if (freshBatch.currentQuantity < line.quantity) {
          throw new Error(`Concurrency conflict: insufficient stock in batch ${freshBatch.batchNumber}`);
        }

        const newStock = freshBatch.currentQuantity - line.quantity;
        await tx.medicineBatch.update({
          where: { id: line.batchId },
          data: { currentQuantity: newStock }
        });

        // Stock movement audit
        await tx.stockMovement.create({
          data: {
            movementType: 'SALE_DEDUCTION',
            quantityChange: -line.quantity,
            previousStock: freshBatch.currentQuantity,
            newStock,
            referenceId: invoiceNumber,
            reason: `POS Sale dispensing to invoice ${invoiceNumber}`,
            medicineId: line.medicineId,
            batchId: line.batchId,
            performedById: req.user.id
          }
        });

        // Statutory Register: Check Schedule H1 or Schedule X
        if (['SCHEDULE_H1', 'SCHEDULE_X'].includes(line.medicine.scheduleType)) {
          const ptName = patientDetails?.patientName || 'Patient (POS Dispense)';
          const ptAddr = patientDetails?.patientAddress || 'Local Area';
          const ptPhone = patientDetails?.patientPhone || '';
          const docName = patientDetails?.doctorName || 'Dr. Registered Practitioner';
          const docReg = patientDetails?.doctorRegNo || 'REG-PENDING';

          await tx.regulatedDispense.create({
            data: {
              scheduleType: line.medicine.scheduleType,
              saleId: sale.id,
              medicineId: line.medicineId,
              batchId: line.batchId,
              patientName: ptName,
              patientAddress: ptAddr,
              patientPhone: ptPhone,
              doctorName: docName,
              doctorRegNo: docReg,
              quantity: line.quantity,
              pharmacistId: req.user.id
            }
          });
        }
      }

      // If prescription linked, update items dispensed count
      if (prescriptionId) {
        const presItems = await tx.prescriptionItem.findMany({ where: { prescriptionId } });
        for (const pi of presItems) {
          const matchedLine = validatedLines.find((l) => l.medicine.name.toLowerCase().includes(pi.medicineName.toLowerCase()));
          if (matchedLine) {
            await tx.prescriptionItem.update({
              where: { id: pi.id },
              data: { quantityDispensed: pi.quantityDispensed + matchedLine.quantity }
            });
          }
        }
      }

      return sale;
    });

    // Step 3: Audit logging
    await recordAuditLog({
      userId: req.user.id,
      userName: req.user.fullName,
      action: 'SALE_CONFIRMED',
      entityType: 'Sale',
      entityId: completedSale.id,
      details: `Generated Invoice ${invoiceNumber} for ₹${calculatedGrandTotal} with ${validatedLines.length} line items via ${paymentMethod}`,
      req
    });

    // Fetch full sale representation to return
    const fullSale = await prisma.sale.findUnique({
      where: { id: completedSale.id },
      include: {
        customer: true,
        cashier: { select: { fullName: true, username: true } },
        items: {
          include: {
            medicine: true,
            batch: true
          }
        }
      }
    });

    return res.status(201).json({
      success: true,
      message: 'Sale finalized successfully',
      data: fullSale
    });
  } catch (error) {
    console.error('Sale error:', error);
    return res.status(400).json({ success: false, message: error.message });
  }
}

// List sales with pagination and filters
async function getSales(req, res) {
  try {
    const { startDate, endDate, paymentMethod, status = 'COMPLETED', limit = 50 } = req.query;

    const where = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (paymentMethod && paymentMethod !== 'ALL') {
      where.paymentMethod = paymentMethod;
    }
    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) where.createdAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.createdAt.lte = end;
      }
    }

    const sales = await prisma.sale.findMany({
      where,
      take: parseInt(limit, 10),
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        cashier: { select: { fullName: true, username: true } },
        _count: { select: { items: true } }
      }
    });

    return res.json({ success: true, count: sales.length, data: sales });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// Get single sale details
async function getSaleById(req, res) {
  try {
    const { id } = req.params;
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        customer: true,
        cashier: { select: { fullName: true, username: true, role: true } },
        prescription: true,
        items: {
          include: {
            medicine: true,
            batch: true
          }
        }
      }
    });

    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale invoice not found' });
    }

    return res.json({ success: true, data: sale });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// Stream generated PDF Invoice
async function downloadInvoicePDF(req, res) {
  try {
    const { id } = req.params;
    const sale = await prisma.sale.findUnique({
      where: { id },
      include: {
        customer: true,
        cashier: true,
        prescription: true,
        items: {
          include: {
            medicine: true,
            batch: true
          }
        }
      }
    });

    if (!sale) {
      return res.status(404).json({ success: false, message: 'Invoice not found' });
    }

    const settings = await prisma.storeSettings.findFirst();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="Invoice-${sale.invoiceNumber}.pdf"`);

    generateInvoicePDF(
      sale,
      settings,
      (chunk) => res.write(chunk),
      () => res.end()
    );
  } catch (error) {
    console.error('PDF error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// Cancel / Refund sale
async function cancelSale(req, res) {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, message: 'A reason is required to cancel an invoice.' });
    }

    const sale = await prisma.sale.findUnique({
      where: { id },
      include: { items: true }
    });

    if (!sale) {
      return res.status(404).json({ success: false, message: 'Sale not found.' });
    }

    if (sale.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Sale is already cancelled.' });
    }

    await prisma.$transaction(async (tx) => {
      // Revert stock for each sold item
      for (const item of sale.items) {
        const batch = await tx.medicineBatch.findUnique({ where: { id: item.batchId } });
        if (batch) {
          const newStock = batch.currentQuantity + item.quantity;
          await tx.medicineBatch.update({
            where: { id: item.batchId },
            data: { currentQuantity: newStock }
          });

          await tx.stockMovement.create({
            data: {
              movementType: 'RETURN_RESTOCK',
              quantityChange: item.quantity,
              previousStock: batch.currentQuantity,
              newStock,
              referenceId: sale.invoiceNumber,
              reason: `Invoice ${sale.invoiceNumber} cancellation/void: ${reason}`,
              medicineId: item.medicineId,
              batchId: item.batchId,
              performedById: req.user.id
            }
          });
        }
      }

      await tx.sale.update({
        where: { id },
        data: {
          status: 'CANCELLED',
          notes: `${sale.notes ? sale.notes + ' | ' : ''}CANCELLED: ${reason}`
        }
      });
    });

    await recordAuditLog({
      userId: req.user.id,
      userName: req.user.fullName,
      action: 'SALE_CANCELLED',
      entityType: 'Sale',
      entityId: id,
      details: `Cancelled invoice ${sale.invoiceNumber}. Restocked items. Reason: ${reason}`,
      req
    });

    return res.json({ success: true, message: `Invoice ${sale.invoiceNumber} has been successfully cancelled and stock replenished.` });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  createSale,
  getSales,
  getSaleById,
  downloadInvoicePDF,
  cancelSale
};

