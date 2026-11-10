const bcrypt = require('bcryptjs');
const prisma = require('../config/db');
const { recordAuditLog } = require('../middleware/audit');

async function getUsers(req, res) {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        isActive: true,
        createdAt: true,
        _count: { select: { sales: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, count: users.length, data: users });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function createUser(req, res) {
  try {
    const { username, email, password, fullName, role = 'CASHIER', phone } = req.body;

    if (!username || !email || !password || !fullName) {
      return res.status(400).json({ success: false, message: 'Username, email, password, and full name are required.' });
    }

    const existing = await prisma.user.findFirst({
      where: {
        OR: [{ username }, { email }]
      }
    });

    if (existing) {
      return res.status(400).json({ success: false, message: 'Username or email is already registered.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: {
        username: username.trim(),
        email: email.trim().toLowerCase(),
        passwordHash,
        fullName: fullName.trim(),
        role,
        phone
      },
      select: {
        id: true,
        username: true,
        email: true,
        fullName: true,
        role: true,
        phone: true,
        isActive: true
      }
    });

    await recordAuditLog({
      userId: req.user.id,
      userName: req.user.fullName,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: user.id,
      details: `Created new user ${user.username} with role ${user.role}`,
      req
    });

    return res.status(201).json({ success: true, message: 'User created successfully', data: user });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function toggleUserStatus(req, res) {
  try {
    const { id } = req.params;
    const user = await prisma.user.findUnique({ where: { id } });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (user.id === req.user.id) {
      return res.status(400).json({ success: false, message: 'Cannot deactivate your own account.' });
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: { id: true, username: true, isActive: true }
    });

    await recordAuditLog({
      userId: req.user.id,
      userName: req.user.fullName,
      action: updated.isActive ? 'USER_ACTIVATED' : 'USER_DEACTIVATED',
      entityType: 'User',
      entityId: id,
      details: `Toggled user status to ${updated.isActive ? 'Active' : 'Inactive'}`,
      req
    });

    return res.json({ success: true, message: `User status changed to ${updated.isActive ? 'Active' : 'Inactive'}`, data: updated });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

async function getAuditLogs(req, res) {
  try {
    const { limit = 50, action } = req.query;
    const where = {};
    if (action) where.action = action;

    const logs = await prisma.auditLog.findMany({
      where,
      take: parseInt(limit, 10),
      orderBy: { createdAt: 'desc' }
    });

    return res.json({ success: true, count: logs.length, data: logs });
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
}

module.exports = {
  getUsers,
  createUser,
  toggleUserStatus,
  getAuditLogs
};

