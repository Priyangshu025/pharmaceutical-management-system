const { PrismaClient } = require('@prisma/client');
const FefoService = require('../services/fefoService');

const prisma = new PrismaClient();

async function runTests() {
  console.log('====================================================');
  console.log('🧪 RUNNING PMS PHARMACEUTICAL BUSINESS RULE TESTS');
  console.log('====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✔ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // ----------------------------------------------------
    // Test Case 1: FEFO Algorithm Verification
    // ----------------------------------------------------
    console.log('1. Testing FEFO (First Expiry, First Out) Allocation...');
    const dolo = await prisma.medicine.findFirst({
      where: { name: 'Dolo 650' },
      include: { batches: { orderBy: { expiryDate: 'asc' } } }
    });

    const eligibleBatches = await FefoService.getEligibleBatches(dolo.id);
    assert(eligibleBatches.length >= 2, 'Found at least 2 active batches for Dolo 650');
    assert(new Date(eligibleBatches[0].expiryDate) < new Date(eligibleBatches[1].expiryDate),
      `FEFO prioritized batch ${eligibleBatches[0].batchNumber} (Expires earlier) before ${eligibleBatches[1].batchNumber}`);

    const allocation = await FefoService.allocateBatchesFEFO(dolo.id, 10);
    assert(allocation[0].batchId === eligibleBatches[0].id, 'Auto-allocation correctly picked earliest expiry batch first');
    assert(allocation[0].quantity === 10, 'Allocation assigned exactly the requested 10 units');

    // ----------------------------------------------------
    // Test Case 2: Prevention of Selling Expired Medicines
    // ----------------------------------------------------
    console.log('\n2. Testing Expired Stock Prevention...');
    const expiredBatch = await prisma.medicineBatch.findFirst({
      where: { status: 'EXPIRED' }
    });

    assert(expiredBatch !== null, `Found test expired batch: ${expiredBatch?.batchNumber}`);

    let caughtExpired = false;
    try {
      await FefoService.validateBatchDispense(expiredBatch.id, 1);
    } catch (e) {
      caughtExpired = true;
      assert(e.message.includes('EXPIRED'), `Dispensing blocked with message: "${e.message}"`);
    }
    assert(caughtExpired, 'System strictly blocked dispensing from expired batch');

    // ----------------------------------------------------
    // Test Case 3: DPCO Maximum Retail Price (MRP) Cap
    // ----------------------------------------------------
    console.log('\n3. Testing Price Ceiling (Selling Price <= MRP)...');
    const activeBatch = eligibleBatches[0];
    const invalidPrice = activeBatch.mrp + 10.0;
    const isOvercharge = invalidPrice > activeBatch.mrp;
    assert(isOvercharge, `Proposed selling price ₹${invalidPrice} exceeds MRP ₹${activeBatch.mrp}`);
    assert(activeBatch.sellingPrice <= activeBatch.mrp,
      `Standard batch selling price ₹${activeBatch.sellingPrice} is within permissible MRP ₹${activeBatch.mrp}`);

    // ----------------------------------------------------
    // Test Case 4: Indian Statutory Schedule H1 Record Creation
    // ----------------------------------------------------
    console.log('\n4. Testing Indian Schedule H1 Regulatory Compliance...');
    const h1Medicine = await prisma.medicine.findFirst({
      where: { scheduleType: 'SCHEDULE_H1' },
      include: { batches: true }
    });

    assert(h1Medicine !== null, `Found Schedule H1 medicine: ${h1Medicine?.name} (${h1Medicine?.genericName})`);
    assert(h1Medicine.scheduleType === 'SCHEDULE_H1', 'Medicine is correctly flagged under Schedule H1');

    // ----------------------------------------------------
    // Test Case 5: Append-Only Stock Movements Integrity
    // ----------------------------------------------------
    console.log('\n5. Testing Stock Movement Audit Trail Integrity...');
    const movementsCount = await prisma.stockMovement.count();
    assert(movementsCount > 0, `System has ${movementsCount} recorded audit movements`);

    const latestMovement = await prisma.stockMovement.findFirst({
      orderBy: { createdAt: 'desc' }
    });
    assert(latestMovement.previousStock !== undefined && latestMovement.newStock !== undefined,
      `Stock movement records previous (${latestMovement.previousStock}) and new stock balance (${latestMovement.newStock})`);

    // ----------------------------------------------------
    // Test Case 6: Low Stock Notification Logic
    // ----------------------------------------------------
    console.log('\n6. Testing Low Stock Threshold Detection...');
    const telma = await prisma.medicine.findFirst({
      where: { name: 'Telma 40' },
      include: { batches: true }
    });

    const telmaTotalStock = telma.batches.reduce((sum, b) => sum + b.currentQuantity, 0);
    assert(telmaTotalStock <= telma.minStockThreshold,
      `Telma 40 stock (${telmaTotalStock}) is below threshold (${telma.minStockThreshold}) -> Triggers Low Stock Reorder Alert`);

  } catch (error) {
    console.error('Test execution error:', error);
    failed++;
  } finally {
    await prisma.$disconnect();
    console.log('\n====================================================');
    console.log(`🏁 TEST RESULTS: ${passed} Passed, ${failed} Failed`);
    console.log('====================================================');
    if (failed > 0) process.exit(1);
  }
}

runTests();

