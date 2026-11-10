const prisma = require('../config/db');
const { recordAuditLog } = require('../middleware/audit');

// Store Settings
async function getSettings(req, res) {
  try {
    let settings = await prisma.storeSettings.findFirst();
    if (!settings) {
      settings = await prisma.storeSettings.create({
        data: {
          id: 'default-store',
          pharmacyName: 'Apollo MedCare Pharmacy',
          dlNumber20B: 'WB-KOL-20B-184920',
          dlNumber21B: 'WB-KOL-21B-184921',
          gstin: '19AAACH7409R1ZZ',
          address: '12/B Park Street, Kolkata, West Bengal - 700016',
          phone: '+91 98300 12345',
          email: 'contact@apollomedcare.com',
          state: 'West Bengal',
          currencySymbol: '₹',
          warningExpiryDays: 90,
          urgentExpiryDays: 30,
          lowStockThresholdDefault: 20
        }
      });
    }
    return res.json({ success: true, data: settings });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function updateSettings(req, res) {
  try {
    const data = { ...req.body };
    if (data.warningExpiryDays) data.warningExpiryDays = parseInt(data.warningExpiryDays, 10);
    if (data.urgentExpiryDays) data.urgentExpiryDays = parseInt(data.urgentExpiryDays, 10);
    if (data.lowStockThresholdDefault) data.lowStockThresholdDefault = parseInt(data.lowStockThresholdDefault, 10);

    const updated = await prisma.storeSettings.upsert({
      where: { id: 'default-store' },
      update: data,
      create: { id: 'default-store', ...data }
    });

    await recordAuditLog({
      userId: req.user.id,
      userName: req.user.fullName,
      action: 'STORE_SETTINGS_UPDATED',
      entityType: 'StoreSettings',
      entityId: updated.id,
      details: 'Updated pharmacy store settings and licensing details',
      req
    });

    return res.json({ success: true, message: 'Settings updated successfully', data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = { getSettings, updateSettings };

