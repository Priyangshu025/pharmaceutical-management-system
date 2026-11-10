const prisma = require('../config/db');

async function recordAuditLog({ userId, userName, action, entityType, entityId, details, req }) {
  try {
    const ipAddress = req ? (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1') : '127.0.0.1';
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        userName: userName || 'SYSTEM',
        action,
        entityType,
        entityId: entityId ? String(entityId) : null,
        details: typeof details === 'object' ? JSON.stringify(details) : details,
        ipAddress: String(ipAddress)
      }
    });
  } catch (error) {
    console.error('Failed to write audit log:', error.message);
  }
}

module.exports = { recordAuditLog };

