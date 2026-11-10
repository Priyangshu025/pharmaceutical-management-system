require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const fs = require('fs');

const apiRoutes = require('./routes/api');
const FefoService = require('./services/fefoService');

const app = express();
const PORT = process.env.PORT || 5000;

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'public/uploads/prescriptions');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Static files for prescription uploads
app.use('/uploads', express.static(path.join(__dirname, 'public/uploads')));

// Mount API routes
app.use('/api', apiRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'HEALTHY',
    service: 'Pharmaceutical Management System (PMS) Backend',
    timestamp: new Date().toISOString()
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Application Error:', err);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal Server Error'
  });
});

// Periodic background job: Expiry check & status refresh every 12 hours
setInterval(async () => {
  try {
    console.log('[System Cron] Refreshing medicine batch expiry statuses...');
    await FefoService.refreshBatchStatuses();
  } catch (e) {
    console.error('[System Cron] Error updating batch statuses:', e.message);
  }
}, 12 * 60 * 60 * 1000);

// Run initial status check on startup
FefoService.refreshBatchStatuses()
  .then(() => {
    console.log('✔ Initial FEFO batch expiry validation check completed.');
  })
  .catch((err) => {
    console.warn('Initial expiry check warning:', err.message);
  });

app.listen(PORT, () => {
  console.log(`=======================================================`);
  console.log(`🚀 PMS Backend API Server listening on port ${PORT}`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`🏥 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`=======================================================`);
});

module.exports = app;

