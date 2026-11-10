const prisma = require('../config/db');

// List Schedule H1 & Schedule X statutory dispensing register
async function getScheduleH1Register(req, res) {
  try {
    const { startDate, endDate, scheduleType = 'SCHEDULE_H1', search } = req.query;

    const where = {};
    if (scheduleType && scheduleType !== 'ALL') {
      where.scheduleType = scheduleType;
    }

    if (startDate || endDate) {
      where.dispensedAt = {};
      if (startDate) where.dispensedAt.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        where.dispensedAt.lte = end;
      }
    }

    if (search) {
      where.OR = [
        { patientName: { contains: search } },
        { doctorName: { contains: search } },
        { doctorRegNo: { contains: search } },
        { medicine: { name: { contains: search } } }
      ];
    }

    const records = await prisma.regulatedDispense.findMany({
      where,
      orderBy: { dispensedAt: 'desc' },
      include: {
        medicine: { select: { id: true, name: true, strength: true, dosageForm: true, scheduleType: true } },
        batch: { select: { id: true, batchNumber: true, expiryDate: true } },
        pharmacist: { select: { id: true, fullName: true, username: true } },
        sale: { select: { invoiceNumber: true } }
      }
    });

    return res.json({
      success: true,
      title: 'Indian Drugs Rules - Schedule H1 / Schedule X Statutory Dispensing Register',
      count: records.length,
      data: records
    });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = { getScheduleH1Register };

