const prisma = require('../config/db');
const FefoService = require('../services/fefoService');
const { recordAuditLog } = require('../middleware/audit');

// List batches with status, search, and expiry status grouping
async function getBatches(req, res) {
  try {
    const { status, medicineId, expiryFilter, search } = req.query;

    // Refresh batch statuses before returning
    await FefoService.refreshBatchStatuses();

    const where = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }
    if (medicineId) {
      where.medicineId = medicineId;
    }

    const now = new Date();
    const datePlus30 = new Date(now.getTime() + 30 * 86400000);
    const datePlus90 = new Date(now.getTime() + 90 * 86400000);

    if (expiryFilter === 'EXPIRED') {
      where.expiryDate = { lte: now };
    } else if (expiryFilter === 'URGENT') {
      where.expiryDate = { gt: now, lte: datePlus30 };
    } else if (expiryFilter === 'WARNING') {
      where.expiryDate = { gt: datePlus30, lte: datePlus90 };
    } else if (expiryFilter === 'SAFE') {
      where.expiryDate = { gt: datePlus90 };
    }

    if (search) {
      where.OR = [
        { batchNumber: { contains: search } },
        { medicine: { name: { contains: search } } },
        { medicine: { genericName: { contains: search } } }
      ];
    }

    const batches = await prisma.medicineBatch.findMany({
      where,
      include: {
        medicine: {
          select: {
            id: true,
            name: true,
            genericName: true,
            dosageForm: true,
            strength: true,
            scheduleType: true,
            minStockThreshold: true,
            category: { select: { name: true } }
          }
        }
      },
      orderBy: { expiryDate: 'asc' }
    });

    // Decorate each batch with remaining days and classification
    const enriched = batches.map((b) => {
      const exp = new Date(b.expiryDate);
      const diffMs = exp.getTime() - now.getTime();
      const daysToExpiry = Math.ceil(diffMs / 86400000);

      let urgency = 'SAFE';
      if (daysToExpiry <= 0) urgency = 'EXPIRED';
      else if (daysToExpiry <= 30) urgency = 'URGENT';
      else if (daysToExpiry <= 90) urgency = 'WARNING';

      return {
        ...b,
        daysToExpiry,
        urgency
      };
    });

    return res.json({ success: true, count: enriched.length, data: enriched });
  } catch (error) {
    console.error('Error fetching batches:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// Get FEFO eligible batches for POS medicine selection
async function getFEFOBatches(req, res) {
  try {
    const { medicineId } = req.params;
    const batches = await FefoService.getEligibleBatches(medicineId);
    return res.json({ success: true, data: batches });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// Manually add a batch
async function createBatch(req, res) {
  try {
    const {
      medicineId,
      batchNumber,
      mfgDate,
      expiryDate,
      purchasePrice,
      sellingPrice,
      mrp,
      initialQuantity,
      rackLocation
    } = req.body;

    if (!medicineId || !batchNumber || !mfgDate || !expiryDate || !purchasePrice || !sellingPrice || !mrp || initialQuantity == null) {
      return res.status(400).json({ success: false, message: 'All batch fields including dates, prices, and quantity are required.' });
    }

    if (parseFloat(sellingPrice) > parseFloat(mrp)) {
      return res.status(400).json({
        success: false,
        message: `Selling price (₹${sellingPrice}) cannot exceed printed Maximum Retail Price (₹${mrp}) under DPCO guidelines.`
      });
    }

    const parsedMfg = new Date(mfgDate);
    const parsedExp = new Date(expiryDate);
    if (parsedExp <= parsedMfg) {
      return res.status(400).json({ success: false, message: 'Expiry date must be after manufacturing date.' });
    }

    const now = new Date();
    const isExpired = parsedExp <= now;

    const batch = await prisma.$transaction(async (tx) => {
      const created = await tx.medicineBatch.create({
        data: {
          medicineId,
          batchNumber: batchNumber.trim(),
          mfgDate: parsedMfg,
          expiryDate: parsedExp,
          purchasePrice: parseFloat(purchasePrice),
          sellingPrice: parseFloat(sellingPrice),
          mrp: parseFloat(mrp),
          currentQuantity: parseInt(initialQuantity, 10),
          initialQuantity: parseInt(initialQuantity, 10),
          status: isExpired ? 'EXPIRED' : 'ACTIVE',
          rackLocation: rackLocation || null
        },
        include: { medicine: true }
      });

      await tx.stockMovement.create({
        data: {
          movementType: 'PURCHASE_RECEIPT',
          quantityChange: parseInt(initialQuantity, 10),
          previousStock: 0,
          newStock: parseInt(initialQuantity, 10),
          referenceId: `BATCH-ADD-${batchNumber}`,
          reason: 'Manual batch stock receipt',
          medicineId,
          batchId: created.id,
          performedById: req.user?.id
        }
      });

      return created;
    });

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.fullName,
      action: 'BATCH_CREATED',
      entityType: 'MedicineBatch',
      entityId: batch.id,
      details: `Created batch ${batch.batchNumber} for medicine ${batch.medicine.name} with ${initialQuantity} units`,
      req
    });

    return res.status(201).json({ success: true, message: 'Batch added successfully', data: batch });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'This batch number already exists for this medicine.' });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
}

// Adjust stock (Damage, Count Correction, Expired Disposal)
async function adjustStock(req, res) {
  try {
    const { batchId } = req.params;
    const { movementType, quantityChange, reason } = req.body;

    const parsedQtyChange = parseInt(quantityChange, 10);
    if (!parsedQtyChange || !movementType || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Movement type, non-zero quantity change, and a justification reason are mandatory for stock adjustments.'
      });
    }

    const batch = await prisma.medicineBatch.findUnique({
      where: { id: batchId },
      include: { medicine: true }
    });

    if (!batch) {
      return res.status(404).json({ success: false, message: 'Batch not found' });
    }

    const newStock = batch.currentQuantity + parsedQtyChange;
    if (newStock < 0) {
      return res.status(400).json({
        success: false,
        message: `Adjustment exceeds available quantity. Available: ${batch.currentQuantity}, Adjustment: ${parsedQtyChange}`
      });
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedBatch = await tx.medicineBatch.update({
        where: { id: batchId },
        data: {
          currentQuantity: newStock,
          status: newStock === 0 && movementType === 'EXPIRED_DISPOSAL' ? 'EXPIRED' : batch.status
        }
      });

      const movement = await tx.stockMovement.create({
        data: {
          movementType,
          quantityChange: parsedQtyChange,
          previousStock: batch.currentQuantity,
          newStock,
          referenceId: `ADJ-${Date.now()}`,
          reason: reason.trim(),
          medicineId: batch.medicineId,
          batchId: batch.id,
          performedById: req.user?.id
        }
      });

      return { updatedBatch, movement };
    });

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.fullName,
      action: 'STOCK_ADJUSTMENT',
      entityType: 'MedicineBatch',
      entityId: batchId,
      details: `${movementType}: ${parsedQtyChange > 0 ? '+' : ''}${parsedQtyChange} units on Batch ${batch.batchNumber} (${batch.medicine.name}). Reason: ${reason}`,
      req
    });

    return res.json({
      success: true,
      message: 'Stock adjusted successfully',
      data: result.updatedBatch
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// Recall batch
async function recallBatch(req, res) {
  try {
    const { batchId } = req.params;
    const { recallReason } = req.body;

    const batch = await prisma.medicineBatch.update({
      where: { id: batchId },
      data: { status: 'RECALLED' },
      include: { medicine: true }
    });

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.fullName,
      action: 'BATCH_RECALLED',
      entityType: 'MedicineBatch',
      entityId: batchId,
      details: `Batch ${batch.batchNumber} of ${batch.medicine.name} marked as RECALLED. Reason: ${recallReason || 'Manufacturer Quality Recall Notice'}. All sales blocked.`,
      req
    });

    return res.json({
      success: true,
      message: `Batch ${batch.batchNumber} has been successfully RECALLED and quarantined from sales.`,
      data: batch
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getBatches,
  getFEFOBatches,
  createBatch,
  adjustStock,
  recallBatch
};

