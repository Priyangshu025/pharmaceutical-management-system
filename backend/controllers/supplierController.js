const prisma = require('../config/db');
const { recordAuditLog } = require('../middleware/audit');

async function getSuppliers(req, res) {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { companyName: 'asc' },
      include: {
        _count: { select: { purchases: true } }
      }
    });
    return res.json({ success: true, data: suppliers });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function createSupplier(req, res) {
  try {
    const { companyName, contactPerson, phone, email, address, gstin, drugLicenseNo, paymentTerms } = req.body;

    if (!companyName || !phone) {
      return res.status(400).json({ success: false, message: 'Company name and phone number are required.' });
    }

    const supplier = await prisma.supplier.create({
      data: {
        companyName,
        contactPerson,
        phone,
        email,
        address,
        gstin,
        drugLicenseNo,
        paymentTerms: paymentTerms || '30 Days Net'
      }
    });

    await recordAuditLog({
      userId: req.user.id,
      userName: req.user.fullName,
      action: 'SUPPLIER_CREATED',
      entityType: 'Supplier',
      entityId: supplier.id,
      details: `Created supplier ${supplier.companyName}`,
      req
    });

    return res.status(201).json({ success: true, message: 'Supplier registered', data: supplier });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function updateSupplier(req, res) {
  try {
    const { id } = req.params;
    const updated = await prisma.supplier.update({
      where: { id },
      data: req.body
    });

    return res.json({ success: true, message: 'Supplier updated', data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function deleteSupplier(req, res) {
  try {
    const { id } = req.params;
    await prisma.supplier.update({
      where: { id },
      data: { isActive: false }
    });
    return res.json({ success: true, message: 'Supplier deactivated' });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getSuppliers,
  createSupplier,
  updateSupplier,
  deleteSupplier
};

