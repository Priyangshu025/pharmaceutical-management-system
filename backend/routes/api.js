const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');

// Multer storage for prescription uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../public/uploads/prescriptions'));
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    cb(null, `rx-${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only image and PDF files are allowed for prescription upload.'));
    }
  }
});

// Middlewares
const { authenticateToken, authorize } = require('../middleware/auth');

// Controllers
const authCtrl = require('../controllers/authController');
const medCtrl = require('../controllers/medicineController');
const batchCtrl = require('../controllers/batchController');
const saleCtrl = require('../controllers/saleController');
const purchCtrl = require('../controllers/purchaseController');
const presCtrl = require('../controllers/prescriptionController');
const suppCtrl = require('../controllers/supplierController');
const custCtrl = require('../controllers/customerController');
const regCtrl = require('../controllers/regulatedController');
const repCtrl = require('../controllers/reportController');
const userCtrl = require('../controllers/userController');
const setCtrl = require('../controllers/settingsController');

// --- 1. Authentication ---
router.post('/auth/login', authCtrl.login);
router.get('/auth/me', authenticateToken, authCtrl.getMe);
router.post('/auth/change-password', authenticateToken, authCtrl.changePassword);

// --- 2. Medicine Catalogue ---
router.get('/medicines', authenticateToken, medCtrl.getMedicines);
router.get('/medicines/categories', authenticateToken, medCtrl.getCategories);
router.get('/medicines/manufacturers', authenticateToken, medCtrl.getManufacturers);
router.get('/medicines/:id', authenticateToken, medCtrl.getMedicineById);
router.post('/medicines', authenticateToken, authorize(['ADMIN', 'PHARMACIST', 'INVENTORY_MANAGER']), medCtrl.createMedicine);
router.put('/medicines/:id', authenticateToken, authorize(['ADMIN', 'PHARMACIST', 'INVENTORY_MANAGER']), medCtrl.updateMedicine);
router.delete('/medicines/:id', authenticateToken, authorize(['ADMIN']), medCtrl.deleteMedicine);

// --- 3. Batches & FEFO Inventory ---
router.get('/batches', authenticateToken, batchCtrl.getBatches);
router.get('/batches/fefo/:medicineId', authenticateToken, batchCtrl.getFEFOBatches);
router.post('/batches', authenticateToken, authorize(['ADMIN', 'INVENTORY_MANAGER']), batchCtrl.createBatch);
router.post('/batches/:batchId/adjust', authenticateToken, authorize(['ADMIN', 'INVENTORY_MANAGER', 'PHARMACIST']), batchCtrl.adjustStock);
router.post('/batches/:batchId/recall', authenticateToken, authorize(['ADMIN', 'PHARMACIST']), batchCtrl.recallBatch);

// --- 4. Sales & POS Billing ---
router.post('/sales', authenticateToken, saleCtrl.createSale);
router.get('/sales', authenticateToken, saleCtrl.getSales);
router.get('/sales/:id', authenticateToken, saleCtrl.getSaleById);
router.get('/sales/:id/pdf', authenticateToken, saleCtrl.downloadInvoicePDF);
router.post('/sales/:id/cancel', authenticateToken, authorize(['ADMIN']), saleCtrl.cancelSale);

// --- 5. Procurement & Purchases ---
router.get('/purchases', authenticateToken, purchCtrl.getPurchases);
router.get('/purchases/:id', authenticateToken, purchCtrl.getPurchaseById);
router.post('/purchases', authenticateToken, authorize(['ADMIN', 'INVENTORY_MANAGER']), purchCtrl.createPurchase);
router.post('/purchases/:id/verify', authenticateToken, authorize(['ADMIN', 'INVENTORY_MANAGER']), purchCtrl.verifyAndReceivePurchase);

// --- 6. Prescriptions ---
router.get('/prescriptions', authenticateToken, presCtrl.getPrescriptions);
router.get('/prescriptions/:id', authenticateToken, presCtrl.getPrescriptionById);
router.post('/prescriptions', authenticateToken, upload.single('prescriptionImage'), presCtrl.createPrescription);
router.post('/prescriptions/:id/verify', authenticateToken, authorize(['ADMIN', 'PHARMACIST']), presCtrl.verifyPrescription);

// --- 7. Statutory Indian Drugs Register (Schedule H1 / X) ---
router.get('/regulated/schedule-h1', authenticateToken, regCtrl.getScheduleH1Register);

// --- 8. Suppliers ---
router.get('/suppliers', authenticateToken, suppCtrl.getSuppliers);
router.post('/suppliers', authenticateToken, authorize(['ADMIN', 'INVENTORY_MANAGER']), suppCtrl.createSupplier);
router.put('/suppliers/:id', authenticateToken, authorize(['ADMIN', 'INVENTORY_MANAGER']), suppCtrl.updateSupplier);
router.delete('/suppliers/:id', authenticateToken, authorize(['ADMIN']), suppCtrl.deleteSupplier);

// --- 9. Customers ---
router.get('/customers', authenticateToken, custCtrl.getCustomers);
router.post('/customers', authenticateToken, custCtrl.createCustomer);
router.get('/customers/:id/history', authenticateToken, custCtrl.getCustomerHistory);

// --- 10. Reports & Analytics ---
router.get('/reports/dashboard', authenticateToken, repCtrl.getDashboardMetrics);
router.get('/reports/sales-analytics', authenticateToken, repCtrl.getSalesAnalytics);
router.get('/reports/top-medicines', authenticateToken, repCtrl.getTopMedicines);
router.get('/reports/categories', authenticateToken, repCtrl.getCategoryBreakdown);
router.get('/reports/valuation', authenticateToken, repCtrl.getInventoryValuation);

// --- 11. User Management & Audit ---
router.get('/users', authenticateToken, authorize(['ADMIN']), userCtrl.getUsers);
router.post('/users', authenticateToken, authorize(['ADMIN']), userCtrl.createUser);
router.patch('/users/:id/toggle-status', authenticateToken, authorize(['ADMIN']), userCtrl.toggleUserStatus);
router.get('/audit-logs', authenticateToken, authorize(['ADMIN']), userCtrl.getAuditLogs);

// --- 12. Store Settings ---
router.get('/settings', authenticateToken, setCtrl.getSettings);
router.put('/settings', authenticateToken, authorize(['ADMIN']), setCtrl.updateSettings);

module.exports = router;

