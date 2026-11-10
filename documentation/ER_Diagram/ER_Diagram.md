# Entity Relationship (ER) Diagram
## Pharmaceutical Management System (PMS)

The PMS database schema is relational, strongly typed, and normalized to ensure inventory consistency, batch segregation, and regulatory compliance under the Drugs and Cosmetics Act.

```mermaid
erDiagram
    USERS ||--o{ SALES : "bills"
    USERS ||--o{ PURCHASES : "verifies"
    USERS ||--o{ PRESCRIPTIONS : "verifies"
    USERS ||--o{ STOCK_MOVEMENTS : "performs"
    USERS ||--o{ REGULATED_DISPENSES : "dispenses"

    CATEGORIES ||--o{ MEDICINES : "classifies"
    MANUFACTURERS ||--o{ MEDICINES : "manufactures"
    
    MEDICINES ||--o{ MEDICINE_BATCHES : "has many lots"
    MEDICINES ||--o{ PURCHASE_ITEMS : "ordered as"
    MEDICINES ||--o{ SALE_ITEMS : "sold as"
    
    MEDICINE_BATCHES ||--o{ SALE_ITEMS : "dispensed from"
    MEDICINE_BATCHES ||--o{ STOCK_MOVEMENTS : "tracks changes"
    MEDICINE_BATCHES ||--o{ REGULATED_DISPENSES : "recorded in"

    SUPPLIERS ||--o{ PURCHASES : "fulfills"
    PURCHASES ||--o{ PURCHASE_ITEMS : "contains"

    CUSTOMERS ||--o{ SALES : "purchases"
    CUSTOMERS ||--o{ PRESCRIPTIONS : "has"

    SALES ||--o{ SALE_ITEMS : "includes"
    SALES ||--o{ REGULATED_DISPENSES : "triggers"
    SALES ||--o{ SALE_RETURNS : "refunded via"

    PRESCRIPTIONS ||--o{ PRESCRIPTION_ITEMS : "prescribes"
    PRESCRIPTIONS ||--o{ SALES : "authorizes"

    USERS {
        uuid id PK
        string username UK
        string email UK
        string passwordHash
        string fullName
        enum role "ADMIN, PHARMACIST, INVENTORY_MANAGER, CASHIER"
        boolean isActive
    }

    MEDICINES {
        uuid id PK
        string name
        string genericName
        string dosageForm
        string strength
        string packSize
        string hsnCode "3004"
        float gstRate "12.0"
        enum scheduleType "NONE, SCHEDULE_H, SCHEDULE_H1, SCHEDULE_X"
        int minStockThreshold
        string barcode UK
    }

    MEDICINE_BATCHES {
        uuid id PK
        string batchNumber
        date mfgDate
        date expiryDate
        float purchasePrice
        float sellingPrice
        float mrp
        int currentQuantity
        int initialQuantity
        enum status "ACTIVE, NEAR_EXPIRY, EXPIRED, RECALLED, BLOCKED"
        string rackLocation
    }

    SALES {
        uuid id PK
        string invoiceNumber UK
        float subtotal
        float discountAmount
        float taxAmount
        float grandTotal
        enum paymentMethod "CASH, CARD, UPI, CREDIT"
        enum status "COMPLETED, CANCELLED, REFUNDED"
    }

    REGULATED_DISPENSES {
        uuid id PK
        enum scheduleType "SCHEDULE_H1, SCHEDULE_X"
        string patientName
        string patientAddress
        string doctorName
        string doctorRegNo
        int quantity
        datetime dispensedAt
    }

    STOCK_MOVEMENTS {
        uuid id PK
        enum movementType "PURCHASE_RECEIPT, SALE_DEDUCTION, RETURN_RESTOCK, DAMAGE_WRITEOFF, EXPIRED_DISPOSAL"
        int quantityChange
        int previousStock
        int newStock
        string referenceId
        string reason
    }
```

