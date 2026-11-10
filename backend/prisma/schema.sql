-- =========================================================================
-- PHARMACEUTICAL MANAGEMENT SYSTEM (PMS) - PostgreSQL Database Schema
-- Standard PostgreSQL DDL Script based on Drugs and Cosmetics Act & Indian GST
-- =========================================================================

-- Enums
CREATE TYPE role_enum AS ENUM ('ADMIN', 'PHARMACIST', 'INVENTORY_MANAGER', 'CASHIER');
CREATE TYPE schedule_type_enum AS ENUM ('NONE', 'SCHEDULE_H', 'SCHEDULE_H1', 'SCHEDULE_X');
CREATE TYPE batch_status_enum AS ENUM ('ACTIVE', 'NEAR_EXPIRY', 'EXPIRED', 'RECALLED', 'BLOCKED');
CREATE TYPE purchase_status_enum AS ENUM ('ORDERED', 'RECEIVED', 'VERIFIED', 'CANCELLED');
CREATE TYPE payment_status_enum AS ENUM ('PAID', 'PARTIAL', 'PENDING');
CREATE TYPE payment_method_enum AS ENUM ('CASH', 'CARD', 'UPI', 'CREDIT');
CREATE TYPE sale_status_enum AS ENUM ('COMPLETED', 'CANCELLED', 'REFUNDED');
CREATE TYPE prescription_status_enum AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE movement_type_enum AS ENUM ('PURCHASE_RECEIPT', 'SALE_DEDUCTION', 'RETURN_RESTOCK', 'DAMAGE_WRITEOFF', 'EXPIRED_DISPOSAL', 'INVENTORY_CORRECTION');

-- 1. Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    role role_enum NOT NULL DEFAULT 'CASHIER',
    phone VARCHAR(20),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Categories
CREATE TABLE categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) UNIQUE NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Manufacturers
CREATE TABLE manufacturers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) UNIQUE NOT NULL,
    country VARCHAR(100) DEFAULT 'India',
    contact_phone VARCHAR(20),
    email VARCHAR(150),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Medicines (Catalogue Master)
CREATE TABLE medicines (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(200) NOT NULL,
    generic_name VARCHAR(200) NOT NULL,
    brand VARCHAR(150),
    dosage_form VARCHAR(50) NOT NULL, -- Tablet, Syrup, Injection, etc.
    strength VARCHAR(50) NOT NULL,    -- 500mg, 10ml, etc.
    pack_size VARCHAR(50) NOT NULL,   -- 10 Tablets / Strip, etc.
    hsn_code VARCHAR(20) DEFAULT '3004',
    gst_rate NUMERIC(5,2) DEFAULT 12.00,
    schedule_type schedule_type_enum DEFAULT 'NONE',
    min_stock_threshold INT DEFAULT 20,
    barcode VARCHAR(100) UNIQUE,
    description TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    category_id UUID NOT NULL REFERENCES categories(id),
    manufacturer_id UUID NOT NULL REFERENCES manufacturers(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Medicine Batches (Batch-wise stock & Expiry)
CREATE TABLE medicine_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_number VARCHAR(100) NOT NULL,
    medicine_id UUID NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
    mfg_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    purchase_price NUMERIC(10,2) NOT NULL,
    selling_price NUMERIC(10,2) NOT NULL,
    mrp NUMERIC(10,2) NOT NULL,
    current_quantity INT NOT NULL DEFAULT 0 CHECK (current_quantity >= 0),
    initial_quantity INT NOT NULL DEFAULT 0,
    status batch_status_enum DEFAULT 'ACTIVE',
    rack_location VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_medicine_batch UNIQUE (medicine_id, batch_number)
);

-- 6. Suppliers
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_name VARCHAR(200) NOT NULL,
    contact_person VARCHAR(100),
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(150),
    address TEXT,
    gstin VARCHAR(20),
    drug_license_no VARCHAR(100),
    payment_terms VARCHAR(100) DEFAULT '30 Days Net',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Purchases (Procurement)
CREATE TABLE purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    po_number VARCHAR(50) UNIQUE NOT NULL,
    supplier_id UUID NOT NULL REFERENCES suppliers(id),
    invoice_number VARCHAR(100),
    purchase_date DATE DEFAULT CURRENT_DATE,
    subtotal NUMERIC(12,2) DEFAULT 0,
    tax_amount NUMERIC(12,2) DEFAULT 0,
    total_amount NUMERIC(12,2) DEFAULT 0,
    status purchase_status_enum DEFAULT 'ORDERED',
    payment_status payment_status_enum DEFAULT 'PENDING',
    notes TEXT,
    received_at TIMESTAMP WITH TIME ZONE,
    verified_by_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Purchase Items
CREATE TABLE purchase_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    purchase_id UUID NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
    medicine_id UUID NOT NULL REFERENCES medicines(id),
    batch_number VARCHAR(100) NOT NULL,
    mfg_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    quantity INT NOT NULL CHECK (quantity > 0),
    purchase_price NUMERIC(10,2) NOT NULL,
    mrp NUMERIC(10,2) NOT NULL,
    selling_price NUMERIC(10,2) NOT NULL,
    tax_rate NUMERIC(5,2) DEFAULT 12.00,
    total_amount NUMERIC(12,2) NOT NULL
);

-- 9. Customers
CREATE TABLE customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(150) NOT NULL,
    phone VARCHAR(20) UNIQUE NOT NULL,
    email VARCHAR(150),
    address TEXT,
    doctor_name VARCHAR(150),
    allergies TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Prescriptions
CREATE TABLE prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    customer_id UUID REFERENCES customers(id),
    patient_name VARCHAR(150) NOT NULL,
    patient_age INT,
    patient_gender VARCHAR(10),
    doctor_name VARCHAR(150) NOT NULL,
    doctor_reg_no VARCHAR(100),
    hospital_clinic VARCHAR(200),
    prescription_date DATE DEFAULT CURRENT_DATE,
    image_path TEXT,
    diagnosis TEXT,
    status prescription_status_enum DEFAULT 'PENDING',
    verified_by_id UUID REFERENCES users(id),
    verification_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Prescription Items
CREATE TABLE prescription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
    medicine_name VARCHAR(200) NOT NULL,
    dosage VARCHAR(100),
    frequency VARCHAR(100),
    duration_days INT DEFAULT 5,
    quantity_required INT DEFAULT 10,
    quantity_dispensed INT DEFAULT 0
);

-- 12. Sales (Invoices)
CREATE TABLE sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_number VARCHAR(50) UNIQUE NOT NULL,
    customer_id UUID REFERENCES customers(id),
    cashier_id UUID NOT NULL REFERENCES users(id),
    prescription_id UUID REFERENCES prescriptions(id),
    subtotal NUMERIC(12,2) NOT NULL,
    discount_amount NUMERIC(12,2) DEFAULT 0,
    tax_amount NUMERIC(12,2) DEFAULT 0,
    grand_total NUMERIC(12,2) NOT NULL,
    payment_method payment_method_enum DEFAULT 'CASH',
    payment_status payment_status_enum DEFAULT 'PAID',
    status sale_status_enum DEFAULT 'COMPLETED',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Sale Items
CREATE TABLE sale_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sale_id UUID NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
    medicine_id UUID NOT NULL REFERENCES medicines(id),
    batch_id UUID NOT NULL REFERENCES medicine_batches(id),
    quantity INT NOT NULL CHECK (quantity > 0),
    unit_price NUMERIC(10,2) NOT NULL,
    mrp NUMERIC(10,2) NOT NULL,
    discount_percent NUMERIC(5,2) DEFAULT 0,
    tax_rate NUMERIC(5,2) DEFAULT 12.00,
    tax_amount NUMERIC(10,2) DEFAULT 0,
    total_amount NUMERIC(12,2) NOT NULL
);

-- 14. Regulated Dispensing (Mandatory Indian Schedule H1 / Schedule X Register)
CREATE TABLE regulated_dispenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    schedule_type schedule_type_enum NOT NULL,
    sale_id UUID NOT NULL REFERENCES sales(id),
    medicine_id UUID NOT NULL REFERENCES medicines(id),
    batch_id UUID NOT NULL REFERENCES medicine_batches(id),
    patient_name VARCHAR(150) NOT NULL,
    patient_address TEXT,
    patient_phone VARCHAR(20),
    doctor_name VARCHAR(150) NOT NULL,
    doctor_reg_no VARCHAR(100) NOT NULL,
    quantity INT NOT NULL,
    dispensed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    pharmacist_id UUID NOT NULL REFERENCES users(id)
);

-- 15. Stock Movement (Append-only Audit Log of Inventory)
CREATE TABLE stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    movement_type movement_type_enum NOT NULL,
    medicine_id UUID NOT NULL REFERENCES medicines(id),
    batch_id UUID NOT NULL REFERENCES medicine_batches(id),
    quantity_change INT NOT NULL, -- positive for increment, negative for decrement
    previous_stock INT NOT NULL,
    new_stock INT NOT NULL,
    reference_id VARCHAR(100),
    reason TEXT,
    performed_by_id UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. Audit Logs
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    user_name VARCHAR(150) NOT NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id VARCHAR(100),
    details TEXT,
    ip_address VARCHAR(50) DEFAULT '127.0.0.1',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 17. Store Settings
CREATE TABLE store_settings (
    id VARCHAR(50) PRIMARY KEY DEFAULT 'default-store',
    pharmacy_name VARCHAR(200) NOT NULL,
    dl_number_20b VARCHAR(100) NOT NULL,
    dl_number_21b VARCHAR(100) NOT NULL,
    gstin VARCHAR(30) NOT NULL,
    address TEXT NOT NULL,
    phone VARCHAR(30) NOT NULL,
    email VARCHAR(150) NOT NULL,
    state VARCHAR(100) DEFAULT 'West Bengal',
    currency_symbol VARCHAR(10) DEFAULT '₹',
    warning_expiry_days INT DEFAULT 90,
    urgent_expiry_days INT DEFAULT 30,
    low_stock_threshold_default INT DEFAULT 20,
    receipt_footer_note TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_batches_expiry ON medicine_batches(expiry_date, status);
CREATE INDEX idx_batches_medicine ON medicine_batches(medicine_id);
CREATE INDEX idx_sales_created ON sales(created_at);
CREATE INDEX idx_stock_movements_batch ON stock_movements(batch_id);

