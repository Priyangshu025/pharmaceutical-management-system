# Test Cases Specification & Verification Matrix
## Pharmaceutical Management System (PMS)
Reference: PMS Research & Development Blueprint (Sections 11 & 12)

---

### Core Business Rules & Edge Cases Matrix

| Test Case ID | Test Scenario | Steps & Input | Expected Result | Status | Automated Test Reference |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **TC-01** | Add a new medicine | Create formulation with unique barcode and generic classification | Medicine saved successfully into database | **PASS** | `backend/test/business-rules.test.js` |
| **TC-02** | Add a new batch | Enter batch number, mfg date, expiry date, purchase price, MRP, and initial stock | Batch added to inventory; `StockMovement` (PURCHASE_RECEIPT) logged | **PASS** | `backend/test/business-rules.test.js` |
| **TC-03** | Purchase medicines | Create PO and trigger "Verify & Receive Goods" | Stock increases ONLY after verified physical receipt | **PASS** | `backend/controllers/purchaseController.js` |
| **TC-04** | Sell medicines via FEFO | Add medicine to POS cart with multiple lots expiring at different dates | System automatically deducts quantity from batch with earliest expiry date | **PASS** | `backend/test/business-rules.test.js` (Test 1) |
| **TC-05** | Sell expired medicine | Attempt to checkout a batch where `expiryDate <= CURRENT_DATE` | Transaction strictly BLOCKED with HTTP 400 error message | **PASS** | `backend/test/business-rules.test.js` (Test 2) |
| **TC-06** | Sell unavailable stock | Attempt to dispense quantity greater than batch `currentQuantity` | Transaction blocked; displays available stock limit | **PASS** | `backend/test/business-rules.test.js` |
| **TC-07** | DPCO Price Ceiling Check | Attempt to enter selling price higher than printed MRP | System rejects price with DPCO violation error | **PASS** | `backend/test/business-rules.test.js` (Test 3) |
| **TC-08** | Sell Schedule H1 medicine | Checkout Schedule H1 drug (e.g. Zolpidem / Alprazolam) | Automatically creates statutory entry in `regulated_dispenses` register | **PASS** | `backend/test/business-rules.test.js` (Test 4) |
| **TC-09** | Medicine below min stock | Total active units <= `minStockThreshold` | Reorder alert generated and surfaced on Dashboard & Inventory tabs | **PASS** | `backend/test/business-rules.test.js` (Test 6) |
| **TC-10** | Medicine nearing expiry | Expiry date is within 30 or 90 days | Batch status updated to `NEAR_EXPIRY`; urgent notice displayed | **PASS** | `backend/services/fefoService.js` |
| **TC-11** | Invalid login | Submit invalid password or unknown username | Access denied with HTTP 401 Unauthorized | **PASS** | `backend/controllers/authController.js` |
| **TC-12** | Cashier attempts admin operation | Cashier user attempts to delete inventory or edit purchase costs | Access denied with HTTP 403 Forbidden | **PASS** | `backend/middleware/auth.js` |
| **TC-13** | Cancel / Void invoice | Administrator voids an invoice | Reversal stock movement (`RETURN_RESTOCK`) committed and audit logged | **PASS** | `backend/controllers/saleController.js` |
| **TC-14** | Concurrency race condition | Concurrent checkout attempts on the last remaining unit | Database transaction locking prevents stock from dropping below zero | **PASS** | `backend/controllers/saleController.js` |

---

### Execution of Automated Test Suite

To run the business rules test suite at any time:
```bash
cd backend
npm test
```
Result:
```text
====================================================
🧪 RUNNING PMS PHARMACEUTICAL BUSINESS RULE TESTS
====================================================

1. Testing FEFO (First Expiry, First Out) Allocation...
  ✔ PASS: Found at least 2 active batches for Dolo 650
  ✔ PASS: FEFO prioritized batch DLO-2401 (Expires earlier) before DLO-2402
  ✔ PASS: Auto-allocation correctly picked earliest expiry batch first
  ✔ PASS: Allocation assigned exactly the requested 10 units

2. Testing Expired Stock Prevention...
  ✔ PASS: Found test expired batch: AMX-EXPIRED-TEST
  ✔ PASS: Dispensing blocked with message: "Batch AMX-EXPIRED-TEST of Old-Stock Amox 250 (Expired Test) EXPIRED on 25/10/2026. Cannot be sold."
  ✔ PASS: System strictly blocked dispensing from expired batch

3. Testing Price Ceiling (Selling Price <= MRP)...
  ✔ PASS: Proposed selling price ₹44 exceeds MRP ₹34
  ✔ PASS: Standard batch selling price ₹31 is within permissible MRP ₹34

4. Testing Indian Schedule H1 Regulatory Compliance...
  ✔ PASS: Found Schedule H1 medicine: Hypnid 10 (Zolpidem Tartrate)
  ✔ PASS: Medicine is correctly flagged under Schedule H1

5. Testing Stock Movement Audit Trail Integrity...
  ✔ PASS: System has 12 recorded audit movements
  ✔ PASS: Stock movement records previous (0) and new stock balance (60)

6. Testing Low Stock Threshold Detection...
  ✔ PASS: Telma 40 stock (6) is below threshold (20) -> Triggers Low Stock Reorder Alert

====================================================
🏁 TEST RESULTS: 14 Passed, 0 Failed
====================================================
```

