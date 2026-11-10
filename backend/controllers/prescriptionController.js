const prisma = require('../config/db');
const { recordAuditLog } = require('../middleware/audit');

// List prescriptions
async function getPrescriptions(req, res) {
  try {
    const { status, search } = req.query;
    const where = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { patientName: { contains: search } },
        { doctorName: { contains: search } },
        { doctorRegNo: { contains: search } }
      ];
    }

    const prescriptions = await prisma.prescription.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        customer: true,
        verifiedBy: { select: { fullName: true } },
        items: true
      }
    });

    return res.json({ success: true, count: prescriptions.length, data: prescriptions });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// Get single prescription
async function getPrescriptionById(req, res) {
  try {
    const { id } = req.params;
    const prescription = await prisma.prescription.findUnique({
      where: { id },
      include: {
        customer: true,
        verifiedBy: { select: { fullName: true, role: true } },
        items: true,
        sales: {
          select: { id: true, invoiceNumber: true, grandTotal: true, createdAt: true }
        }
      }
    });

    if (!prescription) {
      return res.status(404).json({ success: false, message: 'Prescription not found' });
    }

    return res.json({ success: true, data: prescription });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// Create new prescription
async function createPrescription(req, res) {
  try {
    const {
      patientName,
      patientAge,
      patientGender,
      doctorName,
      doctorRegNo,
      hospitalClinic,
      prescriptionDate,
      diagnosis,
      customerId,
      items // Array of { medicineName, dosage, frequency, durationDays, quantityRequired }
    } = req.body;

    if (!patientName || !doctorName) {
      return res.status(400).json({ success: false, message: 'Patient name and doctor name are mandatory.' });
    }

    // Prescription file uploaded via multer or placeholder
    const imagePath = req.file ? `/uploads/prescriptions/${req.file.filename}` : null;

    const parsedItems = typeof items === 'string' ? JSON.parse(items) : (items || []);

    const prescription = await prisma.prescription.create({
      data: {
        patientName,
        patientAge: patientAge ? parseInt(patientAge, 10) : null,
        patientGender,
        doctorName,
        doctorRegNo,
        hospitalClinic,
        prescriptionDate: prescriptionDate ? new Date(prescriptionDate) : new Date(),
        diagnosis,
        imagePath,
        status: req.user.role === 'PHARMACIST' || req.user.role === 'ADMIN' ? 'VERIFIED' : 'PENDING',
        verifiedById: req.user.role === 'PHARMACIST' || req.user.role === 'ADMIN' ? req.user.id : null,
        customerId: customerId || null,
        items: {
          create: parsedItems.map((item) => ({
            medicineName: item.medicineName,
            dosage: item.dosage || '1 unit',
            frequency: item.frequency || 'Once daily',
            durationDays: item.durationDays ? parseInt(item.durationDays, 10) : 5,
            quantityRequired: item.quantityRequired ? parseInt(item.quantityRequired, 10) : 10
          }))
        }
      },
      include: { items: true, customer: true }
    });

    await recordAuditLog({
      userId: req.user.id,
      userName: req.user.fullName,
      action: 'PRESCRIPTION_REGISTERED',
      entityType: 'Prescription',
      entityId: prescription.id,
      details: `Prescription recorded for ${patientName} by ${doctorName}`,
      req
    });

    return res.status(201).json({ success: true, message: 'Prescription registered', data: prescription });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

// Pharmacist Verification workflow
async function verifyPrescription(req, res) {
  try {
    const { id } = req.params;
    const { status, verificationNotes } = req.body;

    if (!['VERIFIED', 'REJECTED'].includes(status)) {
      return res.status(400).json({ success: false, message: 'Status must be VERIFIED or REJECTED.' });
    }

    const prescription = await prisma.prescription.update({
      where: { id },
      data: {
        status,
        verificationNotes,
        verifiedById: req.user.id
      }
    });

    await recordAuditLog({
      userId: req.user.id,
      userName: req.user.fullName,
      action: `PRESCRIPTION_${status}`,
      entityType: 'Prescription',
      entityId: id,
      details: `Pharmacist ${req.user.fullName} reviewed prescription for ${prescription.patientName}: ${status}. Notes: ${verificationNotes || 'None'}`,
      req
    });

    return res.json({ success: true, message: `Prescription marked as ${status}`, data: prescription });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getPrescriptions,
  getPrescriptionById,
  createPrescription,
  verifyPrescription
};

