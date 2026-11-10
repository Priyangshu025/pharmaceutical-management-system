const prisma = require('../config/db');
const FefoService = require('../services/fefoService');

// Main dashboard overview metrics
async function getDashboardMetrics(req, res) {
  try {
    await FefoService.refreshBatchStatuses();

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const datePlus90 = new Date(now.getTime() + 90 * 86400000);

    // 1. Total medicines
    const totalMedicines = await prisma.medicine.count({ where: { isActive: true } });

    // 2. Active batches and total stock
    const activeBatches = await prisma.medicineBatch.findMany({
      where: {
        status: { in: ['ACTIVE', 'NEAR_EXPIRY'] },
        expiryDate: { gt: now }
      },
      select: { currentQuantity: true, purchasePrice: true, sellingPrice: true, mrp: true }
    });

    const totalStock = activeBatches.reduce((acc, b) => acc + b.currentQuantity, 0);

    // 3. Today's sales
    const todaySales = await prisma.sale.aggregate({
      where: {
        createdAt: { gte: startOfToday },
        status: 'COMPLETED'
      },
      _sum: { grandTotal: true },
      _count: { id: true }
    });

    // 4. Monthly sales
    const monthlySales = await prisma.sale.aggregate({
      where: {
        createdAt: { gte: startOfMonth },
        status: 'COMPLETED'
      },
      _sum: { grandTotal: true },
      _count: { id: true }
    });

    // 5. Expiring medicines count (<90 days)
    const expiringCount = await prisma.medicineBatch.count({
      where: {
        expiryDate: { gt: now, lte: datePlus90 },
        currentQuantity: { gt: 0 }
      }
    });

    // 6. Expired batches count
    const expiredCount = await prisma.medicineBatch.count({
      where: {
        OR: [
          { expiryDate: { lte: now } },
          { status: 'EXPIRED' }
        ],
        currentQuantity: { gt: 0 }
      }
    });

    // 7. Low stock count
    const allMedicines = await prisma.medicine.findMany({
      where: { isActive: true },
      select: {
        id: true,
        minStockThreshold: true,
        batches: {
          where: {
            status: { in: ['ACTIVE', 'NEAR_EXPIRY'] },
            expiryDate: { gt: now }
          },
          select: { currentQuantity: true }
        }
      }
    });

    let lowStockCount = 0;
    allMedicines.forEach((med) => {
      const stock = med.batches.reduce((sum, b) => sum + b.currentQuantity, 0);
      if (stock <= med.minStockThreshold) {
        lowStockCount++;
      }
    });

    // 8. Total suppliers & customers
    const totalSuppliers = await prisma.supplier.count({ where: { isActive: true } });
    const totalCustomers = await prisma.customer.count();

    // 9. Recent transactions
    const recentSales = await prisma.sale.findMany({
      take: 6,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: { select: { name: true } },
        cashier: { select: { fullName: true } }
      }
    });

    // 10. Urgent Expiry Batches (<30 days)
    const datePlus30 = new Date(now.getTime() + 30 * 86400000);
    const urgentExpiring = await prisma.medicineBatch.findMany({
      where: {
        expiryDate: { gt: now, lte: datePlus30 },
        currentQuantity: { gt: 0 }
      },
      take: 5,
      include: { medicine: { select: { name: true } } },
      orderBy: { expiryDate: 'asc' }
    });

    return res.json({
      success: true,
      data: {
        totalMedicines,
        totalStock,
        todayRevenue: todaySales._sum.grandTotal || 0,
        todayTransactions: todaySales._count.id || 0,
        monthlyRevenue: monthlySales._sum.grandTotal || 0,
        monthlyTransactions: monthlySales._count.id || 0,
        expiringCount,
        expiredCount,
        lowStockCount,
        totalSuppliers,
        totalCustomers,
        recentSales,
        urgentExpiring
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
}

// Sales analytics: daily trend & payment methods
async function getSalesAnalytics(req, res) {
  try {
    const pastDays = 14;
    const now = new Date();
    const startDate = new Date(now.getTime() - pastDays * 86400000);

    const sales = await prisma.sale.findMany({
      where: {
        createdAt: { gte: startDate },
        status: 'COMPLETED'
      },
      select: {
        createdAt: true,
        grandTotal: true,
        paymentMethod: true
      }
    });

    // Group by Day
    const dayMap = {};
    for (let i = pastDays - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400000);
      const label = d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      dayMap[label] = { date: label, revenue: 0, orders: 0 };
    }

    const paymentMethods = { CASH: 0, UPI: 0, CARD: 0, CREDIT: 0 };

    sales.forEach((s) => {
      const label = new Date(s.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
      if (dayMap[label]) {
        dayMap[label].revenue += s.grandTotal;
        dayMap[label].orders += 1;
      }
      if (paymentMethods[s.paymentMethod] !== undefined) {
        paymentMethods[s.paymentMethod] += s.grandTotal;
      }
    });

    const paymentChart = Object.entries(paymentMethods).map(([name, value]) => ({ name, value }));

    return res.json({
      success: true,
      data: {
        dailyTrend: Object.values(dayMap),
        paymentBreakdown: paymentChart
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// Top selling medicines
async function getTopMedicines(req, res) {
  try {
    const saleItems = await prisma.saleItem.groupBy({
      by: ['medicineId'],
      _sum: {
        quantity: true,
        totalAmount: true
      },
      orderBy: {
        _sum: {
          quantity: 'desc'
        }
      },
      take: 6
    });

    const enriched = await Promise.all(
      saleItems.map(async (item) => {
        const med = await prisma.medicine.findUnique({
          where: { id: item.medicineId },
          select: { name: true, strength: true, dosageForm: true }
        });
        return {
          medicineId: item.medicineId,
          name: med ? `${med.name} (${med.strength})` : 'Medicine',
          totalQuantity: item._sum.quantity || 0,
          totalRevenue: item._sum.totalAmount || 0
        };
      })
    );

    return res.json({ success: true, data: enriched });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// Category breakdown
async function getCategoryBreakdown(req, res) {
  try {
    const categories = await prisma.category.findMany({
      include: {
        medicines: {
          select: {
            id: true,
            batches: {
              where: { status: { in: ['ACTIVE', 'NEAR_EXPIRY'] } },
              select: { currentQuantity: true }
            }
          }
        }
      }
    });

    const breakdown = categories.map((cat) => {
      const totalUnits = cat.medicines.reduce((sum, med) => {
        return sum + med.batches.reduce((bSum, b) => bSum + b.currentQuantity, 0);
      }, 0);

      return {
        name: cat.name,
        medicinesCount: cat.medicines.length,
        stockUnits: totalUnits
      };
    });

    return res.json({ success: true, data: breakdown });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// Inventory valuation (Cost vs MRP)
async function getInventoryValuation(req, res) {
  try {
    const batches = await prisma.medicineBatch.findMany({
      where: {
        currentQuantity: { gt: 0 },
        status: { in: ['ACTIVE', 'NEAR_EXPIRY'] }
      },
      include: {
        medicine: { select: { name: true, category: { select: { name: true } } } }
      }
    });

    let totalPurchaseCost = 0;
    let totalSellingValue = 0;
    let totalMRPValue = 0;
    let totalUnits = 0;

    batches.forEach((b) => {
      totalUnits += b.currentQuantity;
      totalPurchaseCost += b.currentQuantity * b.purchasePrice;
      totalSellingValue += b.currentQuantity * b.sellingPrice;
      totalMRPValue += b.currentQuantity * b.mrp;
    });

    const estimatedMargin = totalSellingValue - totalPurchaseCost;
    const marginPercent = totalPurchaseCost > 0 ? (estimatedMargin / totalPurchaseCost) * 100 : 0;

    return res.json({
      success: true,
      data: {
        totalBatches: batches.length,
        totalUnits,
        totalPurchaseCost: parseFloat(totalPurchaseCost.toFixed(2)),
        totalSellingValue: parseFloat(totalSellingValue.toFixed(2)),
        totalMRPValue: parseFloat(totalMRPValue.toFixed(2)),
        estimatedMargin: parseFloat(estimatedMargin.toFixed(2)),
        marginPercent: parseFloat(marginPercent.toFixed(1))
      }
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getDashboardMetrics,
  getSalesAnalytics,
  getTopMedicines,
  getCategoryBreakdown,
  getInventoryValuation
};

