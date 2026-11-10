const prisma = require('../config/db');
const { recordAuditLog } = require('../middleware/audit');

// List medicines with category, manufacturer, and aggregate stock info
async function getMedicines(req, res) {
  try {
    const { search, categoryId, scheduleType, lowStock, activeOnly = 'true' } = req.query;

    const where = {};

    if (activeOnly === 'true') {
      where.isActive = true;
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (scheduleType && scheduleType !== 'ALL') {
      where.scheduleType = scheduleType;
    }

    if (search) {
      const q = search.trim();
      where.OR = [
        { name: { contains: q } },
        { genericName: { contains: q } },
        { brand: { contains: q } },
        { barcode: { contains: q } }
      ];
    }

    const medicines = await prisma.medicine.findMany({
      where,
      include: {
        category: true,
        manufacturer: true,
        batches: {
          select: {
            id: true,
            batchNumber: true,
            currentQuantity: true,
            expiryDate: true,
            mrp: true,
            sellingPrice: true,
            status: true,
            rackLocation: true
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const now = new Date();

    // Map total stock and check low stock condition
    const mapped = medicines.map((med) => {
      const totalStock = med.batches.reduce((sum, b) => {
        // Only count active batches that are not expired/recalled
        if (['ACTIVE', 'NEAR_EXPIRY'].includes(b.status) && new Date(b.expiryDate) > now) {
          return sum + b.currentQuantity;
        }
        return sum;
      }, 0);

      const isLowStock = totalStock <= med.minStockThreshold;

      return {
        ...med,
        totalStock,
        isLowStock
      };
    });

    const result = lowStock === 'true' ? mapped.filter((m) => m.isLowStock) : mapped;

    return res.json({ success: true, count: result.length, data: result });
  } catch (error) {
    console.error('Error fetching medicines:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// Get single medicine by ID with full batch details and stock movement history
async function getMedicineById(req, res) {
  try {
    const { id } = req.params;
    const medicine = await prisma.medicine.findUnique({
      where: { id },
      include: {
        category: true,
        manufacturer: true,
        batches: {
          orderBy: { expiryDate: 'asc' }
        },
        stockMovements: {
          take: 20,
          orderBy: { createdAt: 'desc' },
          include: { performedBy: { select: { fullName: true } }, batch: true }
        }
      }
    });

    if (!medicine) {
      return res.status(404).json({ success: false, message: 'Medicine not found' });
    }

    return res.json({ success: true, data: medicine });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// Create new medicine master record
async function createMedicine(req, res) {
  try {
    const {
      name,
      genericName,
      brand,
      dosageForm,
      strength,
      packSize,
      hsnCode = '3004',
      gstRate = 12.0,
      scheduleType = 'NONE',
      minStockThreshold = 20,
      barcode,
      description,
      categoryId,
      manufacturerId
    } = req.body;

    if (!name || !genericName || !dosageForm || !strength || !packSize || !categoryId || !manufacturerId) {
      return res.status(400).json({
        success: false,
        message: 'Name, generic name, dosage form, strength, pack size, category, and manufacturer are required.'
      });
    }

    if (barcode) {
      const existingBarcode = await prisma.medicine.findUnique({ where: { barcode } });
      if (existingBarcode) {
        return res.status(400).json({ success: false, message: 'Barcode is already assigned to another medicine.' });
      }
    }

    const medicine = await prisma.medicine.create({
      data: {
        name,
        genericName,
        brand,
        dosageForm,
        strength,
        packSize,
        hsnCode,
        gstRate: parseFloat(gstRate),
        scheduleType,
        minStockThreshold: parseInt(minStockThreshold, 10),
        barcode: barcode || null,
        description,
        categoryId,
        manufacturerId
      },
      include: { category: true, manufacturer: true }
    });

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.fullName,
      action: 'MEDICINE_CREATED',
      entityType: 'Medicine',
      entityId: medicine.id,
      details: `Created medicine ${medicine.name} (${medicine.dosageForm} ${medicine.strength})`,
      req
    });

    return res.status(201).json({ success: true, message: 'Medicine created successfully', data: medicine });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// Update medicine master record
async function updateMedicine(req, res) {
  try {
    const { id } = req.params;
    const updateData = { ...req.body };

    if (updateData.gstRate) updateData.gstRate = parseFloat(updateData.gstRate);
    if (updateData.minStockThreshold) updateData.minStockThreshold = parseInt(updateData.minStockThreshold, 10);

    const updated = await prisma.medicine.update({
      where: { id },
      data: updateData,
      include: { category: true, manufacturer: true }
    });

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.fullName,
      action: 'MEDICINE_UPDATED',
      entityType: 'Medicine',
      entityId: id,
      details: `Updated details for medicine ${updated.name}`,
      req
    });

    return res.json({ success: true, message: 'Medicine updated successfully', data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// Soft delete medicine
async function deleteMedicine(req, res) {
  try {
    const { id } = req.params;
    const updated = await prisma.medicine.update({
      where: { id },
      data: { isActive: false }
    });

    await recordAuditLog({
      userId: req.user?.id,
      userName: req.user?.fullName,
      action: 'MEDICINE_DEACTIVATED',
      entityType: 'Medicine',
      entityId: id,
      details: `Deactivated medicine ${updated.name}`,
      req
    });

    return res.json({ success: true, message: 'Medicine deactivated successfully' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// Get categories
async function getCategories(req, res) {
  try {
    const categories = await prisma.category.findMany({
      include: { _count: { select: { medicines: true } } },
      orderBy: { name: 'asc' }
    });
    return res.json({ success: true, data: categories });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// Get manufacturers
async function getManufacturers(req, res) {
  try {
    const manufacturers = await prisma.manufacturer.findMany({
      include: { _count: { select: { medicines: true } } },
      orderBy: { name: 'asc' }
    });
    return res.json({ success: true, data: manufacturers });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getMedicines,
  getMedicineById,
  createMedicine,
  updateMedicine,
  deleteMedicine,
  getCategories,
  getManufacturers
};

