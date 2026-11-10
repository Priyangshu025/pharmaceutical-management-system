# Pharmaceutical Management System (PMS)
> **Comprehensive Web-Based Pharmacy & Clinical Store Operations Platform**  
> Built strictly according to the *Pharmaceutical Management System — Research & Development Blueprint*.  
> Compliant with the **Drugs and Cosmetics Act (1940)**, **Drugs Rules (1945)**, **Drugs (Prices Control) Order (2013)**, and **Indian GST Regulations**.

---

## 🌟 Key Features & Architectural Capabilities

### 1. Intelligent Inventory & FEFO Dispatch
- **Separate Medicine Master & Batch Inventory**: Distinguishes formulation details from individual physical lots (manufacturing date, expiry date, purchase cost, printed MRP, selling price, and rack location).
- **First Expiry, First Out (FEFO)**: Point of Sale billing automatically queues and allocates the batch with the nearest non-expired date.
- **Strict Expiry Blocking**: System categorically prohibits selling expired or recalled batches.
- **Append-Only Stock Movement History**: Every stock addition, POS sale, damage write-off, or disposal writes an immutable audit record with previous balance, new balance, and reason.

### 2. Clinical & Indian Regulatory Compliance
- **Indian Drug Schedules Classification**: Identifies formulations under General OTC, **Schedule H** (Prescription required), **Schedule H1** (Separate statutory register required), and **Schedule X** (Strictly controlled).
- **Schedule H1 Statutory Register**: Generates the mandatory inspection register recording date, patient demographics, prescribing doctor's registration number, drug name, batch number, quantity, and dispensing pharmacist.
- **NPPA / DPCO Price Ceiling Protection**: Hardcoded checks block dispensing at a unit price higher than the package printed Maximum Retail Price (MRP).
- **Configurable GST & HSN Codes**: Calculates CGST and SGST on taxable amounts based on medicine HSN codes (default 3004).
- **Drug License Display**: Form 20B and 21B license numbers rendered on tax invoices.

### 3. Rapid Point of Sale (POS) & Billing
- **Instant Search & Barcode Lookup**: Live search by brand, generic composition, indication, or barcode.
- **Interactive Payment Options**: Cash (with tender and return change calculator), UPI (with generated UPI QR code simulator), Card, and Store Credit.
- **Dual Invoice Generation**: Instant in-browser printable cash memo and downloadable PDF invoices using PDFKit.

### 4. Role-Based Access Control (RBAC)
- **Administrator**: Complete system control, user account provisioning, store settings, and financial audits.
- **Pharmacist**: Prescription review, clinical verification, Schedule H/H1/X dispensing authorization.
- **Inventory Manager**: Supplier onboarding, purchase orders, physical receiving verification, batch adjustments.
- **Cashier**: Point of Sale checkout and cash memo printing. Restricted from modifying purchase costs or deleting inventory.

---

## 🏗️ Technology Stack

| Layer | Technology | Description |
| :--- | :--- | :--- |
| **Frontend** | React 18, Vite 6, Tailwind CSS | High-performance SPA with modern clinical teal/white aesthetic |
| **Icons & Charts** | Lucide React, Recharts | Interactive SVG area charts, pie charts, and bar charts |
| **Backend Runtime** | Node.js (v24), Express.js | Modular REST API server with JWT authentication and middleware |
| **Database & ORM** | Prisma ORM, SQLite / PostgreSQL | Relational database schema with transactions and row-locking |
| **PDF Engine** | PDFKit | Server-side vector tax invoice and receipt generation |

---

## 📁 Project Structure

```text
pharmaceutical-management-system/
├── backend/
│   ├── config/             # Database connection (Prisma client)
│   ├── controllers/        # Auth, Medicine, Batch, Sale, Purchase, Prescription, Report controllers
│   ├── middleware/         # JWT authentication, RBAC authorization, and Audit logger
│   ├── routes/             # Express REST API endpoints (/api)
│   ├── services/           # FEFO algorithm, Expiry refresh, and PDFKit invoice generator
│   ├── prisma/
│   │   ├── schema.prisma   # SQLite development schema
│   │   ├── schema.sql      # Production PostgreSQL DDL script
│   │   └── seed.js         # Realistic Indian pharmaceutical seed data
│   ├── test/
│   │   └── business-rules.test.js # Automated verification test suite
│   ├── server.js           # Main Express server entry point
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── context/        # AuthContext & Session management
│   │   ├── layouts/        # Sidebar navigation & Top Navbar
│   │   ├── pages/          # Dashboard, POS, Medicines, Inventory, Expiry, Prescriptions,
│   │   │                   # Schedule H1 Register, Purchases, Suppliers, Customers, Reports, Settings
│   │   ├── services/       # Axios API client
│   │   ├── App.jsx         # React router configuration
│   │   └── index.css       # Tailwind CSS & print styles
│   ├── index.html
│   ├── vite.config.js
│   ├── tailwind.config.js
│   └── package.json
│
├── documentation/
│   ├── SRS/                # Software Requirement Specification
│   ├── Architecture_and_Workflow.md
│   ├── ER_Diagram/         # Entity Relationship diagram with Mermaid
│   ├── DFD/                # Level 0 & Level 1 Data Flow Diagrams
│   ├── UML/                # Use Case & Sequence Diagrams
│   └── Test_Cases/         # Test Case Specification matrix
│
└── README.md
```

---

## ⚡ Quick Start Guide

### Prerequisites
- Node.js v18+ and npm installed.

### 1. Database Setup & Seeding
In the `backend` folder:
```bash
cd backend
npm install
npx prisma db push
node prisma/seed.js
```

### 2. Running Business Rule Verification Tests
```bash
npm test
```
*Expected: 14 out of 14 tests pass (FEFO prioritization, expired stock prevention, price capping, Schedule H1 logging, etc.).*

### 3. Start the Backend API Server
```bash
npm run dev
# Server will start on http://localhost:5000
```

### 4. Start the Frontend React Client
Open a second terminal:
```bash
cd frontend
npm install
npm run dev
# Client will start on http://localhost:5173
```

---

## 🔑 Demo Login Credentials

The seed script preconfigures accounts for each role with quick 1-click login buttons on the login screen:

| Role | Username | Password | Full Name / Scope |
| :--- | :--- | :--- | :--- |
| **Administrator** | `admin` | `admin123` | Super Administrator (Full access) |
| **Pharmacist** | `pharmacist` | `pharma123` | Dr. Rajiv Sengupta (R.Ph.) (Rx approval & H1 dispensing) |
| **Inventory Manager** | `inventory` | `stock123` | Pooja Sharma (Stock receiving & PO management) |
| **Cashier** | `cashier` | `cash123` | Amit Verma (POS checkout & billing) |

---

## 📜 Regulatory Citations & Compliance
- **Drugs and Cosmetics Act, 1940 & Rules 1945**: Rule 65 (Condition of licences) & Schedule H1 statutory register requirements.
- **National Pharmaceutical Pricing Authority (NPPA)**: Drugs (Prices Control) Order, 2013 (DPCO) ceiling price compliance.
- **Central Board of Indirect Taxes and Customs (CBIC)**: GST Chapter 30, HSN 3004 medicaments taxation.

