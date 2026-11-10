# Software Requirements Specification (SRS)
## Pharmaceutical Management System (PMS)
**Version:** 1.0.0  
**Target Application:** Web-Based Pharmacy & Medical Store Operations Management  
**Regulatory Framework:** Drugs and Cosmetics Act (1940), Drugs Rules (1945), Indian GST (CBIC), DPDP 2025

---

### 1. Introduction

#### 1.1 Purpose
The Pharmaceutical Management System (PMS) is a centralized, role-based web application engineered to automate the operational, regulatory, inventory, and clinical dispensing workflows of retail and wholesale pharmacy establishments in India.

#### 1.2 Scope
- **Procurement & Purchase**: Supplier directory, Purchase Order (PO) tracking, verified invoice receipt, auto-population of batches into stock.
- **Intelligent Inventory & FEFO**: Granular batch tracking (Batch Number, Mfg Date, Expiry Date, MRP, Purchase Price, Rack Location), First-Expiry-First-Out (FEFO) automated selection, stock level indicators, low-stock threshold alerts, and append-only stock movement logs.
- **Sales & Point of Sale (POS)**: Rapid barcode scanning & auto-complete search, real-time FEFO batch assignment, discount capping, multi-tier GST calculation (CGST + SGST), NPPA/MRP price ceilings, and multi-mode payment settlement (Cash, UPI QR, Card).
- **Clinical & Regulatory Compliance**: Schedule H, Schedule H1, and Schedule X medicine segregation, prescription verification, mandatory statutory Schedule H1 dispensing register, and drug licence (20B/21B) management.
- **Audit & Analytics**: Role-Based Access Control (Admin, Pharmacist, Inventory Manager, Cashier), immutable audit trail, financial metrics, category sales analysis, and PDF invoice generation.

---

### 2. Overall Description

#### 2.1 Product Perspective
The system operates as a modular client-server web architecture. The React frontend interacts via secure REST APIs with a Node.js Express backend and relational database (PostgreSQL / SQLite with Prisma ORM).

#### 2.2 User Classes and Roles
| Role | Permissions & Responsibilities |
| :--- | :--- |
| **Administrator** | Full system governance, user account management, store configuration, financial audits, profit analytics, and database backups. |
| **Pharmacist** | Prescription verification, clinical safety checks, Schedule H/H1/X dispensing authorization, stock consultations. |
| **Inventory Manager** | Supplier onboarding, purchase orders, stock verification upon physical receipt, stock adjustments (write-offs/disposals), batch status management. |
| **Cashier** | Point of Sale (POS) operation, customer checkouts, bill printing, receipt reprints. Restricted from modifying purchase costs or deleting inventory records. |

#### 2.3 Operating Environment
- **Browser**: Modern web browsers (Chrome, Edge, Firefox, Safari) with responsive layouts for desktops, laptops, and POS touch terminals.
- **Backend Runtime**: Node.js v18+ with Express framework.
- **Database**: PostgreSQL 14+ (or SQLite via Prisma ORM for zero-friction standalone deployments).

---

### 3. Functional Requirements

#### FR-01: Authentication & Authorization
- Secure password hashing using bcrypt (salt rounds >= 10).
- Session/JWT based authentication with HTTP-only cookie transport.
- Role-Based Access Control (RBAC) enforced on every API route and UI navigation element.

#### FR-02: Medicine Master Catalog
- Unique Medicine ID, generic composition, brand name, dosage form (Tablet, Capsule, Syrup, Ointment, Injection), strength, pack size, and HSN code.
- Schedule classification: None, Schedule H (Doctor's prescription required), Schedule H1 (Separate register + 3-year record retention), Schedule X (Strictly restricted narcotics/psychotropics).
- Separation of Medicine Master and Medicine Batches (One-to-Many).

#### FR-03: Batch-Wise Inventory & FEFO
- Every inventory unit belongs to a specific batch with manufacturing date, expiry date, purchase price, MRP, and rack location.
- **FEFO Algorithm**: Dispensing algorithms prioritize the earliest expiry batch having positive available quantity.
- Expired or recalled batches are strictly blocked from POS selection and flagged in real-time.
- Append-only stock movements record all transactions: Purchase Receipts, POS Sales, Returns, Damage Write-offs, and Expired Disposals.

#### FR-04: Procurement & Supplier Management
- Supplier records with GSTIN, Drug License numbers (Forms 20B/21B), payment terms, and contact points.
- Purchase order lifecycle: Created -> Received -> Verified. Stock is incremented only upon physical verification.

#### FR-05: Point of Sale (POS) & Billing
- Sub-second search by medicine name, generic name, or barcode.
- Automatic batch allocation according to FEFO with manual override capabilities for authorized staff.
- Automatic pricing constraints: System prohibits setting selling price higher than the package MRP (Drugs Prices Control Order compliance).
- GST calculation (Split 50/50 into CGST and SGST).
- Generation of printable invoices and PDF receipts with QR payment integration.

#### FR-06: Prescription & Statutory Dispensing
- Prescription intake with patient demographics, doctor registration number, clinic details, and uploaded prescription scan.
- Pharmacist verification workflow before controlled drug checkout.
- Automated creation of Indian Schedule H1 Register records containing patient contact, doctor registration, batch number, and dispensed quantity.

#### FR-07: Expiry Monitoring & Alerts
- Tiered expiry alerts:
  - Critical (< 30 days remaining)
  - Expiring Soon (31 - 90 days remaining)
  - Expired (Past expiry date - locked against dispensing)
- Batch recall facility to instantly block defective batches across all POS carts.

#### FR-08: Reporting & Analytics
- Daily, monthly, and yearly sales graphs with Recharts.
- Category-wise revenue distribution.
- Fast-moving vs slow-moving medicines.
- Inventory valuation (Total Purchase Cost vs Total MRP value).
- Estimated gross margin and tax liabilities.

---

### 4. Non-Functional Requirements

- **Performance**: POS product search latency < 150ms; bill settlement < 500ms.
- **Reliability & Concurrency**: Atomic database transactions during sales prevent stock over-selling or race conditions.
- **Security**: Sanitized inputs preventing SQL injection, XSS protection, CORS restriction, secure authentication tokens.
- **Auditability**: All sensitive operations logged to an immutable `audit_logs` table.

