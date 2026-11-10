const prisma = require('../config/db');

async function getCustomers(req, res) {
  try {
    const { search } = req.query;
    const where = {};
    if (search) {
      where.OR = [
        { name: { contains: search } },
        { phone: { contains: search } },
        { email: { contains: search } }
      ];
    }

    const customers = await prisma.customer.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: { select: { sales: true, prescriptions: true } }
      }
    });

    return res.json({ success: true, count: customers.length, data: customers });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function createCustomer(req, res) {
  try {
    const { name, phone, email, address, doctorName, allergies } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ success: false, message: 'Name and phone are required.' });
    }

    const customer = await prisma.customer.create({
      data: {
        name,
        phone,
        email,
        address,
        doctorName,
        allergies
      }
    });

    return res.status(201).json({ success: true, message: 'Customer registered', data: customer });
  } catch (error) {
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Customer with this phone number already exists.' });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function getCustomerHistory(req, res) {
  try {
    const { id } = req.params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        sales: {
          orderBy: { createdAt: 'desc' },
          include: { items: { include: { medicine: true, batch: true } } }
        },
        prescriptions: {
          orderBy: { createdAt: 'desc' },
          include: { items: true, verifiedBy: { select: { fullName: true } } }
        }
      }
    });

    if (!customer) {
      return res.status(404).json({ success: false, message: 'Customer not found' });
    }

    return res.json({ success: true, data: customer });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getCustomers,
  createCustomer,
  getCustomerHistory
};

