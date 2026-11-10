# Data Flow Diagrams (DFD)
## Pharmaceutical Management System (PMS)

### Level 0 DFD (Context Diagram)

```mermaid
flowchart TD
    Supplier["Supplier / Wholesaler"] -->|Delivery Challan & Batch Invoices| PMS["Pharmaceutical Management System (PMS)"]
    PMS -->|Purchase Orders & Payment Invoices| Supplier

    Doctor["Medical Practitioner"] -->|Prescription Orders| PMS
    
    Customer["Customer / Patient"] -->|Prescription & Medicine Request| PMS
    PMS -->|Cash Memo, Medicines & Tax Invoice| Customer

    Pharmacist["Pharmacist / Cashier"] -->|Dispensing Operations & Verification| PMS
    PMS -->|FEFO Batch Selection & Regulatory Alerts| Pharmacist

    DrugInspector["Drug Control Authority"] <--|Schedule H1 Register & Expiry Logs| PMS
```

---

### Level 1 DFD (Major Functional Processes)

```mermaid
flowchart TD
    User["Store User"] -->|Credentials| P1["1.0 Authentication & RBAC"]
    P1 -->|Session Token| DataStore_Users[("Users Store")]

    Supplier["Supplier"] -->|Goods Invoice| P2["2.0 Procurement & Receiving"]
    P2 -->|Verify Batches| DataStore_Batches[("Medicine Batches")]
    P2 -->|Log Movement| DataStore_Movements[("Stock Movements")]

    Customer["Customer"] -->|Prescription / Order| P3["3.0 POS Billing Engine"]
    P3 -->|Check Earliest Expiry| DataStore_Batches
    P3 -->|Validate Price <= MRP| P3
    P3 -->|Atomic Stock Deduction| DataStore_Batches
    P3 -->|Record Sale Item| DataStore_Sales[("Sales Invoices")]
    P3 -->|Append Stock Log| DataStore_Movements
    P3 -->|Log if Sched H1| DataStore_H1[("Regulated Dispenses")]

    P3 -->|Generate PDF| InvoiceDoc["Printed Tax Invoice & Memo"]

    Admin["Administrator"] -->|Request Analytics| P4["4.0 Analytics & Audit Engine"]
    DataStore_Sales --> P4
    DataStore_Batches --> P4
    P4 -->|Dashboard Visualizations| Admin
```

