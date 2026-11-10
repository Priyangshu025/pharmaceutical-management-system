const prisma = require('../config/db');

/**
 * First Expiry, First Out (FEFO) Service
 * Ensures pharmaceutical dispensing strictly prioritizes batches with the nearest expiry date
 * while strictly barring expired, recalled, or blocked batches.
 */
class FefoService {
  /**
   * Retrieves active, non-expired batches for a medicine ordered by expiry date ASC (Earliest Expiry First)
   */
  static async getEligibleBatches(medicineId) {
    const today = new Date();
    return await prisma.medicineBatch.findMany({
      where: {
        medicineId,
        currentQuantity: { gt: 0 },
        status: { in: ['ACTIVE', 'NEAR_EXPIRY'] },
        expiryDate: { gt: today }
      },
      orderBy: {
        expiryDate: 'asc'
      }
    });
  }

  /**
   * Automatically calculates batch allocations according to FEFO
   * @param {string} medicineId 
   * @param {number} requiredQty 
   * @returns {Array<{batchId: string, batchNumber: string, expiryDate: Date, quantity: number, mrp: number, sellingPrice: number}>}
   */
  static async allocateBatchesFEFO(medicineId, requiredQty) {
    const batches = await this.getEligibleBatches(medicineId);
    let remainingToAllocate = requiredQty;
    const allocations = [];

    const totalAvailable = batches.reduce((sum, b) => sum + b.currentQuantity, 0);
    if (totalAvailable < requiredQty) {
      throw new Error(`Insufficient eligible FEFO stock. Requested: ${requiredQty}, Available: ${totalAvailable}`);
    }

    for (const batch of batches) {
      if (remainingToAllocate <= 0) break;

      const takeQty = Math.min(batch.currentQuantity, remainingToAllocate);
      allocations.push({
        batchId: batch.id,
        batchNumber: batch.batchNumber,
        expiryDate: batch.expiryDate,
        quantity: takeQty,
        mrp: batch.mrp,
        sellingPrice: batch.sellingPrice,
        rackLocation: batch.rackLocation
      });

      remainingToAllocate -= takeQty;
    }

    return allocations;
  }

  /**
   * Verifies if a specific chosen batch can be safely dispensed
   */
  static async validateBatchDispense(batchId, quantity) {
    const batch = await prisma.medicineBatch.findUnique({
      where: { id: batchId },
      include: { medicine: true }
    });

    if (!batch) {
      throw new Error(`Batch ID ${batchId} not found.`);
    }

    if (batch.status === 'RECALLED') {
      throw new Error(`Batch ${batch.batchNumber} has been RECALLED by manufacturer. Dispensing is strictly prohibited.`);
    }

    if (batch.status === 'BLOCKED') {
      throw new Error(`Batch ${batch.batchNumber} is temporarily blocked.`);
    }

    const today = new Date();
    if (new Date(batch.expiryDate) <= today || batch.status === 'EXPIRED') {
      throw new Error(`Batch ${batch.batchNumber} of ${batch.medicine.name} EXPIRED on ${new Date(batch.expiryDate).toLocaleDateString()}. Cannot be sold.`);
    }

    if (batch.currentQuantity < quantity) {
      throw new Error(`Insufficient stock in Batch ${batch.batchNumber}. Available: ${batch.currentQuantity}, Requested: ${quantity}`);
    }

    return batch;
  }

  /**
   * Scans and updates batch statuses based on current date and store settings
   */
  static async refreshBatchStatuses() {
    const settings = await prisma.storeSettings.findFirst() || {
      warningExpiryDays: 90,
      urgentExpiryDays: 30
    };

    const now = new Date();
    const warningDate = new Date(now.getTime() + settings.warningExpiryDays * 86400000);

    // 1. Mark expired
    await prisma.medicineBatch.updateMany({
      where: {
        expiryDate: { lte: now },
        status: { notIn: ['EXPIRED', 'RECALLED'] }
      },
      data: { status: 'EXPIRED' }
    });

    // 2. Mark near expiry
    await prisma.medicineBatch.updateMany({
      where: {
        expiryDate: { gt: now, lte: warningDate },
        status: 'ACTIVE'
      },
      data: { status: 'NEAR_EXPIRY' }
    });
  }
}

module.exports = FefoService;

