const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('--- Seeding Pharmaceutical Management System Database ---');

  // 1. Store Settings
  await prisma.storeSettings.upsert({
    where: { id: 'default-store' },
    update: {},
    create: {
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
      lowStockThresholdDefault: 20,
      receiptFooterNote: 'Medicines once sold without sealed blister cannot be returned. Schedule H/H1 drugs dispensed strictly on registered medical prescription.'
    }
  });

  // 2. Users
  const passwordAdmin = await bcrypt.hash('admin123', 10);
  const passwordPharma = await bcrypt.hash('pharma123', 10);
  const passwordStock = await bcrypt.hash('stock123', 10);
  const passwordCash = await bcrypt.hash('cash123', 10);

  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      email: 'admin@pms.local',
      passwordHash: passwordAdmin,
      fullName: 'Super Administrator',
      role: 'ADMIN',
      phone: '+91 98310 99999'
    }
  });

  const pharmacist = await prisma.user.upsert({
    where: { username: 'pharmacist' },
    update: {},
    create: {
      username: 'pharmacist',
      email: 'pharmacist@pms.local',
      passwordHash: passwordPharma,
      fullName: 'Dr. Rajiv Sengupta (R.Ph.)',
      role: 'PHARMACIST',
      phone: '+91 98311 88888'
    }
  });

  const inventoryMgr = await prisma.user.upsert({
    where: { username: 'inventory' },
    update: {},
    create: {
      username: 'inventory',
      email: 'inventory@pms.local',
      passwordHash: passwordStock,
      fullName: 'Pooja Sharma',
      role: 'INVENTORY_MANAGER',
      phone: '+91 98312 77777'
    }
  });

  const cashier = await prisma.user.upsert({
    where: { username: 'cashier' },
    update: {},
    create: {
      username: 'cashier',
      email: 'cashier@pms.local',
      passwordHash: passwordCash,
      fullName: 'Amit Verma',
      role: 'CASHIER',
      phone: '+91 98313 66666'
    }
  });

  // 3. Categories
  const categoriesData = [
    { name: 'Analgesics & Antipyretics', description: 'Pain relief and fever reducers' },
    { name: 'Antibiotics & Antimicrobials', description: 'Bacterial and infection treatments' },
    { name: 'Antacids & Gastrointestinal', description: 'Acid reflux, GERD and gut motility' },
    { name: 'Antidiabetic Agents', description: 'Blood sugar regulation' },
    { name: 'Cardiovascular & Antihypertensive', description: 'Blood pressure and cardiac support' },
    { name: 'Vitamins & Dietary Supplements', description: 'Nutritional and immunity supplements' },
    { name: 'Cough, Cold & Antiallergic', description: 'Respiratory relief and antihistamines' },
    { name: 'Sedatives & Central Nervous System', description: 'Psychotropic and neurological medications' }
  ];

  const catMap = {};
  for (const cat of categoriesData) {
    const c = await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat
    });
    catMap[cat.name] = c.id;
  }

  // 4. Manufacturers
  const manufacturersData = [
    { name: 'Sun Pharmaceutical Industries Ltd', contactPhone: '+91 22 4324 4324', email: 'orders@sunpharma.com' },
    { name: 'Cipla Limited', contactPhone: '+91 22 2482 6000', email: 'supply@cipla.com' },
    { name: 'Dr. Reddy\'s Laboratories', contactPhone: '+91 40 4900 2900', email: 'customercare@drreddys.com' },
    { name: 'Mankind Pharma Ltd', contactPhone: '+91 11 4684 6700', email: 'sales@mankindpharma.com' },
    { name: 'Abbott Healthcare India', contactPhone: '+91 22 3816 2000', email: 'india@abbott.com' },
    { name: 'Micro Labs Limited', contactPhone: '+91 80 2839 4860', email: 'info@microlabs.in' }
  ];

  const mfgMap = {};
  for (const m of manufacturersData) {
    const rec = await prisma.manufacturer.upsert({
      where: { name: m.name },
      update: {},
      create: m
    });
    mfgMap[m.name] = rec.id;
  }

  // 5. Suppliers
  const suppliersData = [
    {
      companyName: 'Medico Pharma Wholesalers Pvt Ltd',
      contactPerson: 'Suresh Agarwal',
      phone: '+91 98301 22334',
      email: 'sales@medicopharma.in',
      address: '77 Canning Street, Burrabazar, Kolkata - 700001',
      gstin: '19AABCM1122D1Z4',
      drugLicenseNo: 'WB-KOL-W-104928'
    },
    {
      companyName: 'Bengal Lifecare Distributors',
      contactPerson: 'Deepak Roy',
      phone: '+91 98305 66778',
      email: 'deepak@bengallifecare.com',
      address: '14 B.B. Ganguly Street, Bowbazar, Kolkata - 700012',
      gstin: '19AABCB5544C1Z9',
      drugLicenseNo: 'WB-KOL-W-203911'
    }
  ];

  for (const s of suppliersData) {
    await prisma.supplier.upsert({
      where: { id: s.companyName.toLowerCase().replace(/\s+/g, '-') },
      update: {},
      create: {
        id: s.companyName.toLowerCase().replace(/\s+/g, '-'),
        ...s
      }
    });
  }

  // 6. Customers
  const customer1 = await prisma.customer.upsert({
    where: { phone: '+91 98765 43210' },
    update: {},
    create: {
      name: 'Ramesh Chandra Roy',
      phone: '+91 98765 43210',
      email: 'ramesh.roy@gmail.com',
      address: '45 Lake View Road, South Kolkata',
      doctorName: 'Dr. S. K. Mukherjee (Cardiologist)',
      allergies: 'Penicillin sensitive'
    }
  });

  const customer2 = await prisma.customer.upsert({
    where: { phone: '+91 98200 54321' },
    update: {},
    create: {
      name: 'Sneha Sen',
      phone: '+91 98200 54321',
      email: 'sneha.sen@outlook.com',
      address: 'Block C, Salt Lake Sector 1, Kolkata',
      doctorName: 'Dr. Ananya Bose (ENT)'
    }
  });

  // 7. Medicines & Batches with dates for FEFO and Expiry testing
  const now = new Date();
  const datePlus = (days) => new Date(now.getTime() + days * 86400000);
  const dateMinus = (days) => new Date(now.getTime() - days * 86400000);

  const medicinesData = [
    {
      name: 'Dolo 650',
      genericName: 'Paracetamol',
      brand: 'Dolo',
      dosageForm: 'Tablet',
      strength: '650mg',
      packSize: '15 Tablets / Strip',
      hsnCode: '3004',
      gstRate: 12.0,
      scheduleType: 'NONE',
      minStockThreshold: 30,
      barcode: '890123450001',
      description: 'Used for fever and mild to moderate pain relief',
      category: 'Analgesics & Antipyretics',
      manufacturer: 'Micro Labs Limited',
      batches: [
        {
          batchNumber: 'DLO-2401',
          mfgDate: dateMinus(180),
          expiryDate: datePlus(120), // Expires in ~4 months (FEFO should pick this first!)
          purchasePrice: 22.50,
          sellingPrice: 31.00,
          mrp: 34.00,
          currentQuantity: 80,
          initialQuantity: 100,
          status: 'ACTIVE',
          rackLocation: 'Rack A-01'
        },
        {
          batchNumber: 'DLO-2402',
          mfgDate: dateMinus(90),
          expiryDate: datePlus(450), // Expires in >1 year
          purchasePrice: 23.00,
          sellingPrice: 31.00,
          mrp: 34.00,
          currentQuantity: 150,
          initialQuantity: 150,
          status: 'ACTIVE',
          rackLocation: 'Rack A-01'
        }
      ]
    },
    {
      name: 'Augmentin 625 Duo',
      genericName: 'Amoxicillin and Potassium Clavulanate',
      brand: 'Augmentin',
      dosageForm: 'Tablet',
      strength: '625mg',
      packSize: '10 Tablets / Strip',
      hsnCode: '3004',
      gstRate: 12.0,
      scheduleType: 'SCHEDULE_H', // Doctor prescription required
      minStockThreshold: 20,
      barcode: '890123450002',
      description: 'Broad spectrum antibacterial prescription medication',
      category: 'Antibiotics & Antimicrobials',
      manufacturer: 'Abbott Healthcare India',
      batches: [
        {
          batchNumber: 'AUG-8819',
          mfgDate: dateMinus(120),
          expiryDate: datePlus(240),
          purchasePrice: 145.00,
          sellingPrice: 198.00,
          mrp: 204.50,
          currentQuantity: 45,
          initialQuantity: 50,
          status: 'ACTIVE',
          rackLocation: 'Rack B-03'
        }
      ]
    },
    {
      name: 'Azee 500',
      genericName: 'Azithromycin',
      brand: 'Azee',
      dosageForm: 'Tablet',
      strength: '500mg',
      packSize: '5 Tablets / Strip',
      hsnCode: '3004',
      gstRate: 12.0,
      scheduleType: 'SCHEDULE_H',
      minStockThreshold: 25,
      barcode: '890123450003',
      description: 'Macrolide antibiotic for upper and lower respiratory tract infections',
      category: 'Antibiotics & Antimicrobials',
      manufacturer: 'Cipla Limited',
      batches: [
        {
          batchNumber: 'AZ-1011',
          mfgDate: dateMinus(150),
          expiryDate: datePlus(300),
          purchasePrice: 85.00,
          sellingPrice: 119.00,
          mrp: 125.00,
          currentQuantity: 60,
          initialQuantity: 60,
          status: 'ACTIVE',
          rackLocation: 'Rack B-04'
        }
      ]
    },
    {
      name: 'Pan 40',
      genericName: 'Pantoprazole Sodium Gastro-resistant',
      brand: 'Pan',
      dosageForm: 'Tablet',
      strength: '40mg',
      packSize: '15 Tablets / Strip',
      hsnCode: '3004',
      gstRate: 12.0,
      scheduleType: 'NONE',
      minStockThreshold: 40,
      barcode: '890123450004',
      description: 'Proton-pump inhibitor for hyperacidity and gastroesophageal reflux',
      category: 'Antacids & Gastrointestinal',
      manufacturer: 'Sun Pharmaceutical Industries Ltd',
      batches: [
        {
          batchNumber: 'PAN-741',
          mfgDate: dateMinus(100),
          expiryDate: datePlus(360),
          purchasePrice: 92.00,
          sellingPrice: 135.00,
          mrp: 142.50,
          currentQuantity: 120,
          initialQuantity: 120,
          status: 'ACTIVE',
          rackLocation: 'Rack C-02'
        }
      ]
    },
    {
      name: 'Glycomet 500 SR',
      genericName: 'Metformin Hydrochloride Prolonged-Release',
      brand: 'Glycomet',
      dosageForm: 'Tablet',
      strength: '500mg',
      packSize: '20 Tablets / Strip',
      hsnCode: '3004',
      gstRate: 12.0,
      scheduleType: 'SCHEDULE_H',
      minStockThreshold: 30,
      barcode: '890123450005',
      description: 'First-line anti-hyperglycemic for Type 2 Diabetes Mellitus',
      category: 'Antidiabetic Agents',
      manufacturer: 'Sun Pharmaceutical Industries Ltd',
      batches: [
        {
          batchNumber: 'GLY-332',
          mfgDate: dateMinus(200),
          expiryDate: datePlus(280),
          purchasePrice: 38.00,
          sellingPrice: 48.00,
          mrp: 52.00,
          currentQuantity: 110,
          initialQuantity: 110,
          status: 'ACTIVE',
          rackLocation: 'Rack D-01'
        }
      ]
    },
    {
      name: 'Hypnid 10',
      genericName: 'Zolpidem Tartrate',
      brand: 'Hypnid',
      dosageForm: 'Tablet',
      strength: '10mg',
      packSize: '10 Tablets / Strip',
      hsnCode: '3004',
      gstRate: 12.0,
      scheduleType: 'SCHEDULE_H1', // SCHEDULE H1 - Indian statutory register requirement!
      minStockThreshold: 15,
      barcode: '890123450006',
      description: 'Schedule H1 hypnotic sedative. Requires separate statutory register.',
      category: 'Sedatives & Central Nervous System',
      manufacturer: 'Sun Pharmaceutical Industries Ltd',
      batches: [
        {
          batchNumber: 'HYP-0982',
          mfgDate: dateMinus(60),
          expiryDate: datePlus(500),
          purchasePrice: 65.00,
          sellingPrice: 94.00,
          mrp: 99.00,
          currentQuantity: 30,
          initialQuantity: 30,
          status: 'ACTIVE',
          rackLocation: 'Safe Lock Box S-01'
        }
      ]
    },
    {
      name: 'Limcee 500 Chewable',
      genericName: 'Ascorbic Acid (Vitamin C)',
      brand: 'Limcee',
      dosageForm: 'Tablet',
      strength: '500mg',
      packSize: '15 Tablets / Strip',
      hsnCode: '3004',
      gstRate: 12.0,
      scheduleType: 'NONE',
      minStockThreshold: 20,
      barcode: '890123450007',
      description: 'Chewable vitamin C nutritional supplement for immune support',
      category: 'Vitamins & Dietary Supplements',
      manufacturer: 'Abbott Healthcare India',
      batches: [
        {
          batchNumber: 'LIM-EXP-URGENT',
          mfgDate: dateMinus(340),
          expiryDate: datePlus(20), // Expires in 20 days -> CRITICAL EXPIRY ALERT!
          purchasePrice: 15.00,
          sellingPrice: 22.00,
          mrp: 24.50,
          currentQuantity: 18,
          initialQuantity: 50,
          status: 'NEAR_EXPIRY',
          rackLocation: 'Rack E-02'
        },
        {
          batchNumber: 'LIM-FRESH',
          mfgDate: dateMinus(45),
          expiryDate: datePlus(380),
          purchasePrice: 15.50,
          sellingPrice: 22.00,
          mrp: 24.50,
          currentQuantity: 80,
          initialQuantity: 80,
          status: 'ACTIVE',
          rackLocation: 'Rack E-02'
        }
      ]
    },
    {
      name: 'Cetzine 10mg',
      genericName: 'Cetirizine Hydrochloride',
      brand: 'Cetzine',
      dosageForm: 'Tablet',
      strength: '10mg',
      packSize: '10 Tablets / Strip',
      hsnCode: '3004',
      gstRate: 12.0,
      scheduleType: 'NONE',
      minStockThreshold: 25,
      barcode: '890123450008',
      description: 'Second-generation antihistamine for seasonal allergic rhinitis',
      category: 'Cough, Cold & Antiallergic',
      manufacturer: 'Dr. Reddy\'s Laboratories',
      batches: [
        {
          batchNumber: 'CET-WARN',
          mfgDate: dateMinus(300),
          expiryDate: datePlus(55), // Expires in 55 days -> WARNING EXPIRY ALERT!
          purchasePrice: 12.00,
          sellingPrice: 18.00,
          mrp: 20.00,
          currentQuantity: 35,
          initialQuantity: 50,
          status: 'NEAR_EXPIRY',
          rackLocation: 'Rack E-05'
        }
      ]
    },
    {
      name: 'Old-Stock Amox 250 (Expired Test)',
      genericName: 'Amoxicillin Trihydrate',
      brand: 'Amoxil',
      dosageForm: 'Capsule',
      strength: '250mg',
      packSize: '10 Capsules / Strip',
      hsnCode: '3004',
      gstRate: 12.0,
      scheduleType: 'SCHEDULE_H',
      minStockThreshold: 10,
      barcode: '890123450009',
      description: 'Expired test inventory batch to demonstrate system prevention of expired medicine sales',
      category: 'Antibiotics & Antimicrobials',
      manufacturer: 'Cipla Limited',
      batches: [
        {
          batchNumber: 'AMX-EXPIRED-TEST',
          mfgDate: dateMinus(450),
          expiryDate: dateMinus(15), // Expired 15 days ago!
          purchasePrice: 30.00,
          sellingPrice: 45.00,
          mrp: 50.00,
          currentQuantity: 12,
          initialQuantity: 30,
          status: 'EXPIRED',
          rackLocation: 'Quarantine Bin Q-01'
        }
      ]
    },
    {
      name: 'Telma 40',
      genericName: 'Telmisartan',
      brand: 'Telma',
      dosageForm: 'Tablet',
      strength: '40mg',
      packSize: '15 Tablets / Strip',
      hsnCode: '3004',
      gstRate: 12.0,
      scheduleType: 'SCHEDULE_H',
      minStockThreshold: 20, // Only 6 units remain -> LOW STOCK ALERT!
      barcode: '890123450010',
      description: 'Angiotensin II receptor antagonist for essential hypertension',
      category: 'Cardiovascular & Antihypertensive',
      manufacturer: 'Sun Pharmaceutical Industries Ltd',
      batches: [
        {
          batchNumber: 'TEL-4091',
          mfgDate: dateMinus(90),
          expiryDate: datePlus(400),
          purchasePrice: 95.00,
          sellingPrice: 135.00,
          mrp: 145.00,
          currentQuantity: 6, // Low stock!
          initialQuantity: 60,
          status: 'ACTIVE',
          rackLocation: 'Rack D-03'
        }
      ]
    }
  ];

  for (const m of medicinesData) {
    const med = await prisma.medicine.create({
      data: {
        name: m.name,
        genericName: m.genericName,
        brand: m.brand,
        dosageForm: m.dosageForm,
        strength: m.strength,
        packSize: m.packSize,
        hsnCode: m.hsnCode,
        gstRate: m.gstRate,
        scheduleType: m.scheduleType,
        minStockThreshold: m.minStockThreshold,
        barcode: m.barcode,
        description: m.description,
        categoryId: catMap[m.category],
        manufacturerId: mfgMap[m.manufacturer]
      }
    });

    for (const b of m.batches) {
      const batchRec = await prisma.medicineBatch.create({
        data: {
          batchNumber: b.batchNumber,
          medicineId: med.id,
          mfgDate: b.mfgDate,
          expiryDate: b.expiryDate,
          purchasePrice: b.purchasePrice,
          sellingPrice: b.sellingPrice,
          mrp: b.mrp,
          currentQuantity: b.currentQuantity,
          initialQuantity: b.initialQuantity,
          status: b.status,
          rackLocation: b.rackLocation
        }
      });

      // Record initial stock movement audit log
      await prisma.stockMovement.create({
        data: {
          movementType: 'PURCHASE_RECEIPT',
          quantityChange: b.initialQuantity,
          previousStock: 0,
          newStock: b.initialQuantity,
          referenceId: 'INITIAL-STOCK-SETUP',
          reason: 'Initial pharmacy inventory setup',
          medicineId: med.id,
          batchId: batchRec.id,
          performedById: admin.id
        }
      });
    }
  }

  // 8. Sample Verified Prescription
  const prescription1 = await prisma.prescription.create({
    data: {
      patientName: 'Ramesh Chandra Roy',
      patientAge: 56,
      patientGender: 'Male',
      doctorName: 'Dr. S. K. Mukherjee (Cardiologist)',
      doctorRegNo: 'WB-MC-28491',
      hospitalClinic: 'Woodlands Multispeciality Hospital, Kolkata',
      prescriptionDate: dateMinus(2),
      diagnosis: 'Stage 1 Hypertension & Acid Dyspepsia',
      status: 'VERIFIED',
      verificationNotes: 'Verified with patient and Dr. Mukherjee registry. Legitimate indication.',
      customerId: customer1.id,
      verifiedById: pharmacist.id,
      items: {
        create: [
          { medicineName: 'Telma 40', dosage: '1 Tab', frequency: 'Once daily (OD) morning', durationDays: 30, quantityRequired: 30, quantityDispensed: 15 },
          { medicineName: 'Pan 40', dosage: '1 Tab', frequency: 'Once daily before breakfast', durationDays: 15, quantityRequired: 15, quantityDispensed: 15 }
        ]
      }
    }
  });

  // 9. Initial Audit Log
  await prisma.auditLog.create({
    data: {
      userName: 'admin',
      action: 'SYSTEM_INITIALIZATION',
      entityType: 'System',
      details: 'Pharmaceutical Management System seed data populated successfully.',
      userId: admin.id,
      ipAddress: '127.0.0.1'
    }
  });

  console.log('✅ Database seeded successfully with Indian medicine catalog, FEFO batches, users, and compliance rules!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

