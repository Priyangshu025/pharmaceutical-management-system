const prisma = require('../config/db');
const { recordAuditLog } = require('../middleware/audit');

// List purchase transactions
async function getPurchases(req, res) {
  try {
    const { status } = req.query;
    const where = {};
    if (status && status !== 'ALL') {
      where.status = status;
    }

    const purchases = await prisma.purchase.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        supplier: true,
        verifiedBy: { select: { fullName: true } },
        _count: { select: { items: true } }
      }
    });

    return res.json({ success: true, count: purchases.length, data: purchases });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// Get single purchase with items
async function getPurchaseById(req, res) {
  try {
    const { id } = req.params;
    const purchase = await prisma.purchase.findUnique({
      where: { id },
      include: {
        supplier: true,
        verifiedBy: { select: { fullName: true } },
        items: {
          include: { medicine: true }
        }
      }
    });

    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase record not found' });
    }

    return res.json({ success: true, data: purchase });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// Create purchase order
async function createPurchase(req, res) {
  try {
    const { supplierId, invoiceNumber, notes, items } = req.body;

    if (!supplierId || !items || !items.length) {
      return res.status(400).json({ success: false, message: 'Supplier and line items are required' });
    }

    const count = await prisma.purchase.count();
    const poNumber = `PO-${new Date().getFullYear()}-${String(count + 1).padStart(4, '0')}`;

    let subtotal = 0;
    let taxAmount = 0;

    const mappedItems = items.map((item) => {
      const qty = parseInt(item.quantity, 10);
      const cost = parseFloat(item.purchasePrice);
      const taxRate = parseFloat(item.taxRate || 12.0);
      const mrp = parseFloat(item.mrp);
      const sellingPrice = parseFloat(item.sellingPrice || (mrp * 0.9));

      const lineCost = qty * cost;
      const lineTax = lineCost * (taxRate / 100);
      const lineTotal = lineCost + lineTax;

      subtotal += lineCost;
      taxAmount += lineTax;

      return {
        medicineId: item.medicineId,
        batchNumber: item.batchNumber.trim(),
        mfgDate: new Date(item.mfgDate),
        expiryDate: new Date(item.expiryDate),
        quantity: qty,
        purchasePrice: cost,
        mrp,
        sellingPrice,
        taxRate,
        totalAmount: parseFloat(lineTotal.toFixed(2))
      };
    });

    const totalAmount = parseFloat((subtotal + taxAmount).toFixed(2));

    const purchase = await prisma.purchase.create({
      data: {
        poNumber,
        supplierId,
        invoiceNumber,
        subtotal: parseFloat(subtotal.toFixed(2)),
        taxAmount: parseFloat(taxAmount.toFixed(2)),
        totalAmount,
        status: 'ORDERED',
        notes,
        items: {
          create: mappedItems
        }
      },
      include: { items: true, supplier: true }
    });

    await recordAuditLog({
      userId: req.user.id,
      userName: req.user.fullName,
      action: 'PURCHASE_ORDER_CREATED',
      entityType: 'Purchase',
      entityId: purchase.id,
      details: `Created Purchase Order ${poNumber} for ₹${totalAmount} with supplier ${purchase.supplier.companyName}`,
      req
    });

    return res.status(201).json({ success: true, message: 'Purchase Order created', data: purchase });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// Receive and Verify Goods: strictly updates inventory only after physical verification!
async function verifyAndReceivePurchase(req, res) {
  try {
    const { id } = req.params;

    const purchase = await prisma.purchase.findUnique({
      where: { id },
      include: {
        items: { include: { medicine: true } },
        supplier: true
      }
    });

    if (!purchase) {
      return res.status(404).json({ success: false, message: 'Purchase not found' });
    }

    if (purchase.status === 'VERIFIED') {
      return res.status(400).json({ success: false, message: 'Purchase order is already verified and inventory received.' });
    }

    await prisma.$transaction(async (tx) => {
      for (const item of purchase.items) {
        // Upsert medicine batch
        const existingBatch = await tx.medicineBatch.findUnique({
          where: {
            medicineId_batchNumber: {
              medicineId: item.medicineId,
              batchNumber: item.batchNumber
            }
          }
        });

        let targetBatchId;
        let previousQty = 0;
        let newQty = item.quantity;

        if (existingBatch) {
          previousQty = existingBatch.currentQuantity;
          newQty = previousQty + item.quantity;
          targetBatchId = existingBatch.id;

          await tx.medicineBatch.update({
            where: { id: existingBatch.id },
            data: {
              currentQuantity: newQty,
              purchasePrice: item.purchasePrice,
              sellingPrice: item.sellingPrice,
              mrp: item.mrp,
              status: new Date(item.expiryDate) <= new Date() ? 'EXPIRED' : 'ACTIVE'
            }
          });
        } else {
          const createdBatch = await tx.medicineBatch.create({
            data: {
              medicineId: item.medicineId,
              batchNumber: item.batchNumber,
              mfgDate: item.mfgDate,
              expiryDate: item.expiryDate,
              purchasePrice: item.purchasePrice,
              sellingPrice: item.sellingPrice,
              mrp: item.mrp,
              initialQuantity: item.quantity,
              currentQuantity: item.quantity,
              status: new Date(item.expiryDate) <= new Date() ? 'EXPIRED' : 'ACTIVE',
              rackLocation: 'Main Storage'
            }
          });
          targetBatchId = createdBatch.id;
        }

        // Record stock movement
        await tx.stockMovement.create({
          data: {
            movementType: 'PURCHASE_RECEIPT',
            quantityChange: item.quantity,
            previousStock: previousQty,
            newStock: newQty,
            referenceId: purchase.poNumber,
            reason: `Purchase receipt & verification from ${purchase.supplier.companyName}`,
            medicineId: item.medicineId,
            batchId: targetBatchId,
            performedById: req.user.id
          }
        });
      }

      await tx.purchase.update({
        where: { id },
        data: {
          status: 'VERIFIED',
          receivedAt: new Date(),
          verifiedById: req.user.id
        }
      });
    });

    await recordAuditLog({
      userId: req.user.id,
      userName: req.user.fullName,
      action: 'PURCHASE_VERIFIED',
      entityType: 'Purchase',
      entityId: id,
      details: `Goods physically verified for PO ${purchase.poNumber}. Stock automatically updated into inventory.`,
      req
    });

    return res.json({
      success: true,
      message: `Purchase ${purchase.poNumber} verified. Inventory stock has been updated.`
    });
  } catch (error) {
    console.error('Verify purchase error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getPurchases,
  getPurchaseById,
  createPurchase,
  verifyAndReceivePurchase
};

