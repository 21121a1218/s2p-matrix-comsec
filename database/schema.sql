-- ============================================================
-- S2P Automation System — Matrix Comsec Pvt. Ltd.
-- Database Schema v1.0
-- Based on BRD requirements BR-S2P-01 to BR-S2P-15
-- ============================================================

USE s2p_matrix;

-- ============================================================
-- TABLE 1: VENDORS (BR-S2P-02)
-- Replaces Google Sheets vendor master
-- ============================================================
CREATE TABLE IF NOT EXISTS vendors (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    vendor_code         VARCHAR(20) UNIQUE NOT NULL,       -- e.g. VEN-0001
    company_name        VARCHAR(255) NOT NULL,
    contact_person      VARCHAR(100),
    email               VARCHAR(150) UNIQUE NOT NULL,
    phone               VARCHAR(20),
    address             TEXT,
    city                VARCHAR(100),
    state               VARCHAR(100),
    pincode             VARCHAR(10),
    country             VARCHAR(100) DEFAULT 'India',
    
    -- Classification
    category            ENUM('Electronic', 'Mechanical', 'Both') NOT NULL,
    vendor_type         ENUM('OEM', 'Distributor', 'Trader', 'Service') DEFAULT 'Distributor',
    
    -- OEM & Compliance (BR-S2P-01)
    oem_approved        BOOLEAN DEFAULT FALSE,
    oem_brand           VARCHAR(255),                      -- which OEM they represent
    gst_number          VARCHAR(20),
    pan_number          VARCHAR(15),
    msme_registered     BOOLEAN DEFAULT FALSE,
    
    -- Status & Workflow (BR-S2P-05)
    status              ENUM('Pending', 'Under Review', 'Approved', 'Blacklisted', 'Inactive') DEFAULT 'Pending',
    approved_by         VARCHAR(100),
    approved_at         DATETIME,
    
    -- Performance (BR-S2P-13)
    performance_score   DECIMAL(5,2) DEFAULT 0.00,         -- 0 to 100
    
    -- SAP Integration (NFR-01)
    sap_vendor_code     VARCHAR(20),                       -- maps to SAP MM vendor
    
    -- Audit Trail (NFR-06)
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    created_by          VARCHAR(100) DEFAULT 'system'
);

-- ============================================================
-- TABLE 2: VENDOR DOCUMENTS (BR-S2P-05)
-- Stores onboarding documents
-- ============================================================
CREATE TABLE IF NOT EXISTS vendor_documents (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    vendor_id       INT NOT NULL,
    doc_type        ENUM('GST Certificate', 'PAN Card', 'OEM Letter',
                         'Bank Details', 'MSME Certificate', 'Other') NOT NULL,
    file_name       VARCHAR(255),
    file_path       VARCHAR(500),
    uploaded_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
);

-- ============================================================
-- TABLE 3: COMMODITY CATEGORIES
-- Electronic vs Mechanical — from BRD checklist engine
-- ============================================================
CREATE TABLE IF NOT EXISTS commodity_categories (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,                 -- e.g. "CCTV Cameras"
    parent_category ENUM('Electronic', 'Mechanical', 'Service') NOT NULL,
    description     TEXT,
    is_active       BOOLEAN DEFAULT TRUE,
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
-- TABLE 4: RFQ — Request for Quotation (BR-S2P-03)
-- ============================================================
CREATE TABLE IF NOT EXISTS rfq (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    rfq_number      VARCHAR(30) UNIQUE NOT NULL,           -- e.g. RFQ-2024-0001
    title           VARCHAR(255) NOT NULL,
    description     TEXT,
    category_id     INT,
    
    -- Dates
    issue_date      DATE NOT NULL,
    deadline        DATE NOT NULL,                         -- vendor response deadline
    
    -- Status
    status          ENUM('Draft', 'Sent', 'Responses Received',
                         'Evaluation', 'Closed', 'Cancelled') DEFAULT 'Draft',
    
    -- Financials
    estimated_value DECIMAL(15,2),                         -- budgeted amount
    currency        VARCHAR(5) DEFAULT 'INR',
    
    -- Audit
    created_by      VARCHAR(100),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (category_id) REFERENCES commodity_categories(id)
);

-- ============================================================
-- TABLE 5: RFQ LINE ITEMS
-- Individual items in an RFQ
-- ============================================================
CREATE TABLE IF NOT EXISTS rfq_items (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    rfq_id          INT NOT NULL,
    item_code       VARCHAR(50),                           -- internal part number
    description     VARCHAR(500) NOT NULL,
    quantity        DECIMAL(10,2) NOT NULL,
    unit            VARCHAR(20) DEFAULT 'PCS',             -- PCS, KG, MTR, etc.
    specification   TEXT,                                  -- technical specs
    FOREIGN KEY (rfq_id) REFERENCES rfq(id) ON DELETE CASCADE
);

-- ============================================================
-- TABLE 6: RFQ VENDOR DISTRIBUTION
-- Which vendors received this RFQ
-- ============================================================
CREATE TABLE IF NOT EXISTS rfq_vendors (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    rfq_id          INT NOT NULL,
    vendor_id       INT NOT NULL,
    sent_at         DATETIME,
    response_status ENUM('Pending', 'Responded', 'Declined', 'No Response') DEFAULT 'Pending',
    FOREIGN KEY (rfq_id) REFERENCES rfq(id) ON DELETE CASCADE,
    FOREIGN KEY (vendor_id) REFERENCES vendors(id),
    UNIQUE KEY unique_rfq_vendor (rfq_id, vendor_id)
);

-- ============================================================
-- TABLE 7: QUOTATIONS (BR-S2P-04)
-- Vendor responses to RFQs
-- ============================================================
CREATE TABLE IF NOT EXISTS quotations (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    quotation_number    VARCHAR(30) UNIQUE NOT NULL,       -- e.g. QUO-2024-0001
    rfq_id              INT NOT NULL,
    vendor_id           INT NOT NULL,
    
    -- Validity
    submitted_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    valid_until         DATE,
    
    -- Financials
    subtotal            DECIMAL(15,2) DEFAULT 0.00,
    tax_amount          DECIMAL(15,2) DEFAULT 0.00,
    total_amount        DECIMAL(15,2) DEFAULT 0.00,
    currency            VARCHAR(5) DEFAULT 'INR',
    
    -- Terms
    payment_terms       VARCHAR(100),                      -- e.g. "30 days net"
    delivery_days       INT,                               -- lead time in days
    warranty_months     INT DEFAULT 0,
    
    -- AI Comparison Score (BR-S2P-04)
    ai_score            DECIMAL(5,2) DEFAULT 0.00,         -- 0-100 score
    ai_recommendation   TEXT,                              -- AI reasoning
    is_recommended      BOOLEAN DEFAULT FALSE,
    
    -- Status
    status              ENUM('Received', 'Under Evaluation',
                             'Selected', 'Rejected') DEFAULT 'Received',
    notes               TEXT,
    
    FOREIGN KEY (rfq_id) REFERENCES rfq(id),
    FOREIGN KEY (vendor_id) REFERENCES vendors(id)
);

-- ============================================================
-- TABLE 8: QUOTATION LINE ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS quotation_items (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    quotation_id    INT NOT NULL,
    rfq_item_id     INT,
    description     VARCHAR(500) NOT NULL,
    quantity        DECIMAL(10,2) NOT NULL,
    unit_price      DECIMAL(15,2) NOT NULL,
    tax_percent     DECIMAL(5,2) DEFAULT 18.00,            -- GST %
    total_price     DECIMAL(15,2) NOT NULL,
    FOREIGN KEY (quotation_id) REFERENCES quotations(id) ON DELETE CASCADE,
    FOREIGN KEY (rfq_item_id) REFERENCES rfq_items(id)
);

-- ============================================================
-- TABLE 9: PURCHASE ORDERS (BR-S2P-09)
-- ============================================================
CREATE TABLE IF NOT EXISTS purchase_orders (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    po_number       VARCHAR(30) UNIQUE NOT NULL,           -- e.g. PO-2024-0001
    vendor_id       INT NOT NULL,
    quotation_id    INT,
    rfq_id          INT,
    
    -- Dates
    po_date         DATE NOT NULL,
    delivery_date   DATE,
    
    -- Financials
    subtotal        DECIMAL(15,2) DEFAULT 0.00,
    tax_amount      DECIMAL(15,2) DEFAULT 0.00,
    total_amount    DECIMAL(15,2) NOT NULL,
    currency        VARCHAR(5) DEFAULT 'INR',
    
    -- Terms
    payment_terms   VARCHAR(100),
    delivery_address TEXT,
    
    -- Approval Workflow (BR-S2P-09)
    status          ENUM('Draft', 'Pending L1 Approval', 'Pending L2 Approval',
                         'Approved', 'Sent to Vendor', 'Acknowledged',
                         'Partially Received', 'Received', 'Closed',
                         'Cancelled') DEFAULT 'Draft',
    l1_approver     VARCHAR(100),
    l1_approved_at  DATETIME,
    l2_approver     VARCHAR(100),
    l2_approved_at  DATETIME,
    
    -- SAP (NFR-01)
    sap_po_number   VARCHAR(20),                           -- SAP MM PO number
    
    -- Audit
    created_by      VARCHAR(100),
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    notes           TEXT,
    
    FOREIGN KEY (vendor_id) REFERENCES vendors(id),
    FOREIGN KEY (quotation_id) REFERENCES quotations(id),
    FOREIGN KEY (rfq_id) REFERENCES rfq(id)
);

-- ============================================================
-- TABLE 10: PO LINE ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS po_items (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    po_id           INT NOT NULL,
    item_code       VARCHAR(50),
    description     VARCHAR(500) NOT NULL,
    quantity        DECIMAL(10,2) NOT NULL,
    unit            VARCHAR(20) DEFAULT 'PCS',
    unit_price      DECIMAL(15,2) NOT NULL,
    tax_percent     DECIMAL(5,2) DEFAULT 18.00,
    total_price     DECIMAL(15,2) NOT NULL,
    received_qty    DECIMAL(10,2) DEFAULT 0.00,
    FOREIGN KEY (po_id) REFERENCES purchase_orders(id) ON DELETE CASCADE
);

-- ============================================================
-- TABLE 11: GRN — Goods Receipt Note
-- Needed for 3-way match (BR-S2P-10)
-- ============================================================
CREATE TABLE IF NOT EXISTS grn (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    grn_number      VARCHAR(30) UNIQUE NOT NULL,           -- e.g. GRN-2024-0001
    po_id           INT NOT NULL,
    vendor_id       INT NOT NULL,
    received_date   DATE NOT NULL,
    received_by     VARCHAR(100),
    
    -- Quality
    quality_status  ENUM('Accepted', 'Partially Accepted',
                         'Rejected') DEFAULT 'Accepted',
    rejection_reason TEXT,
    
    -- SAP
    sap_grn_number  VARCHAR(20),
    
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes           TEXT,
    
    FOREIGN KEY (po_id) REFERENCES purchase_orders(id),
    FOREIGN KEY (vendor_id) REFERENCES vendors(id)
);

-- ============================================================
-- TABLE 12: GRN LINE ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS grn_items (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    grn_id          INT NOT NULL,
    po_item_id      INT NOT NULL,
    description     VARCHAR(500),
    ordered_qty     DECIMAL(10,2),
    received_qty    DECIMAL(10,2) NOT NULL,
    accepted_qty    DECIMAL(10,2),
    rejected_qty    DECIMAL(10,2) DEFAULT 0.00,
    FOREIGN KEY (grn_id) REFERENCES grn(id) ON DELETE CASCADE,
    FOREIGN KEY (po_item_id) REFERENCES po_items(id)
);

-- ============================================================
-- TABLE 13: INVOICES (BR-S2P-10)
-- ============================================================
CREATE TABLE IF NOT EXISTS invoices (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    invoice_number      VARCHAR(50) NOT NULL,              -- vendor's invoice no
    internal_ref        VARCHAR(30) UNIQUE,                -- our ref: INV-2024-0001
    vendor_id           INT NOT NULL,
    po_id               INT,
    grn_id              INT,
    
    -- Dates
    invoice_date        DATE NOT NULL,
    received_date       DATE,
    due_date            DATE,
    
    -- Financials
    subtotal            DECIMAL(15,2) DEFAULT 0.00,
    tax_amount          DECIMAL(15,2) DEFAULT 0.00,
    total_amount        DECIMAL(15,2) NOT NULL,
    currency            VARCHAR(5) DEFAULT 'INR',
    
    -- 3-Way Match (BR-S2P-10)
    match_status        ENUM('Pending', 'Matched', 'Partial Match',
                             'Mismatch', 'Exception') DEFAULT 'Pending',
    match_notes         TEXT,                              -- AI match reasoning
    
    -- Payment Status (BR-S2P-11)
    payment_status      ENUM('Unpaid', 'Partially Paid',
                             'Paid', 'On Hold') DEFAULT 'Unpaid',
    
    -- Duplicate Check
    is_duplicate        BOOLEAN DEFAULT FALSE,
    
    -- Audit
    status              ENUM('Received', 'Under Review', 'Approved',
                             'Rejected', 'Paid') DEFAULT 'Received',
    created_at          DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at          DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (vendor_id) REFERENCES vendors(id),
    FOREIGN KEY (po_id) REFERENCES purchase_orders(id),
    FOREIGN KEY (grn_id) REFERENCES grn(id)
);

-- ============================================================
-- TABLE 14: PAYMENTS (BR-S2P-11)
-- ============================================================
CREATE TABLE IF NOT EXISTS payments (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    payment_ref     VARCHAR(30) UNIQUE NOT NULL,           -- PAY-2024-0001
    invoice_id      INT NOT NULL,
    vendor_id       INT NOT NULL,
    
    -- Financials
    amount          DECIMAL(15,2) NOT NULL,
    currency        VARCHAR(5) DEFAULT 'INR',
    payment_mode    ENUM('NEFT', 'RTGS', 'IMPS', 'Cheque', 'UPI') DEFAULT 'NEFT',
    
    -- Dates
    payment_date    DATE NOT NULL,
    value_date      DATE,
    
    -- Bank
    bank_reference  VARCHAR(100),
    
    -- Status
    status          ENUM('Scheduled', 'Processed',
                         'Failed', 'Returned') DEFAULT 'Scheduled',
    
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes           TEXT,
    
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (vendor_id) REFERENCES vendors(id)
);

-- ============================================================
-- TABLE 15: CONTRACTS (BR-S2P-07)
-- ============================================================
CREATE TABLE IF NOT EXISTS contracts (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    contract_number VARCHAR(30) UNIQUE NOT NULL,           -- CON-2024-0001
    vendor_id       INT NOT NULL,
    title           VARCHAR(255) NOT NULL,
    contract_type   ENUM('Annual', 'One-Time', 'AMC', 'Rate Contract') DEFAULT 'Annual',
    
    -- Dates
    start_date      DATE NOT NULL,
    end_date        DATE NOT NULL,
    renewal_alert_days INT DEFAULT 30,                     -- alert X days before expiry
    
    -- Financials
    contract_value  DECIMAL(15,2),
    
    -- Status
    status          ENUM('Draft', 'Active', 'Expiring Soon',
                         'Expired', 'Terminated') DEFAULT 'Draft',
    
    file_path       VARCHAR(500),                          -- uploaded contract PDF
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes           TEXT,
    
    FOREIGN KEY (vendor_id) REFERENCES vendors(id)
);

-- ============================================================
-- TABLE 16: VENDOR PERFORMANCE (BR-S2P-13)
-- ============================================================
CREATE TABLE IF NOT EXISTS vendor_performance (
    id                  INT AUTO_INCREMENT PRIMARY KEY,
    vendor_id           INT NOT NULL,
    evaluation_period   VARCHAR(20) NOT NULL,              -- e.g. "Q1-2024"
    
    -- KPI Scores (0-100 each)
    delivery_score      DECIMAL(5,2) DEFAULT 0.00,         -- on-time delivery
    quality_score       DECIMAL(5,2) DEFAULT 0.00,         -- acceptance rate
    pricing_score       DECIMAL(5,2) DEFAULT 0.00,         -- price competitiveness
    response_score      DECIMAL(5,2) DEFAULT 0.00,         -- RFQ response time
    overall_score       DECIMAL(5,2) DEFAULT 0.00,         -- weighted average
    
    -- Raw Data used for calculation
    total_orders        INT DEFAULT 0,
    on_time_deliveries  INT DEFAULT 0,
    quality_rejections  INT DEFAULT 0,
    rfqs_received       INT DEFAULT 0,
    rfqs_responded      INT DEFAULT 0,
    
    evaluated_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes               TEXT,
    
    FOREIGN KEY (vendor_id) REFERENCES vendors(id),
    UNIQUE KEY unique_vendor_period (vendor_id, evaluation_period)
);

-- ============================================================
-- TABLE 17: PROCUREMENT CHECKLISTS (BR-S2P-12)
-- ============================================================
CREATE TABLE IF NOT EXISTS checklists (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    category        ENUM('Electronic', 'Mechanical', 'General') NOT NULL,
    version         VARCHAR(10) DEFAULT '1.0',
    is_active       BOOLEAN DEFAULT TRUE,
    last_reviewed   DATE,
    next_review     DATE,                                  -- quarterly recommended
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS checklist_items (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    checklist_id    INT NOT NULL,
    item_text       TEXT NOT NULL,
    is_mandatory    BOOLEAN DEFAULT TRUE,
    sort_order      INT DEFAULT 0,
    FOREIGN KEY (checklist_id) REFERENCES checklists(id) ON DELETE CASCADE
);

-- ============================================================
-- TABLE 18: AUDIT LOG (NFR-06)
-- Full audit trail for all transactions
-- ============================================================
CREATE TABLE IF NOT EXISTS audit_log (
    id              INT AUTO_INCREMENT PRIMARY KEY,
    table_name      VARCHAR(50) NOT NULL,
    record_id       INT NOT NULL,
    action          ENUM('CREATE', 'UPDATE', 'DELETE', 'APPROVE',
                         'REJECT', 'SEND') NOT NULL,
    changed_by      VARCHAR(100) DEFAULT 'system',
    changed_at      DATETIME DEFAULT CURRENT_TIMESTAMP,
    old_values      JSON,
    new_values      JSON,
    ip_address      VARCHAR(45)
);

-- ============================================================
-- INDEXES for performance
-- ============================================================
CREATE INDEX idx_vendor_status ON vendors(status);
CREATE INDEX idx_vendor_category ON vendors(category);
CREATE INDEX idx_rfq_status ON rfq(status);
CREATE INDEX idx_rfq_deadline ON rfq(deadline);
CREATE INDEX idx_po_status ON purchase_orders(status);
CREATE INDEX idx_invoice_match ON invoices(match_status);
CREATE INDEX idx_invoice_payment ON invoices(payment_status);
CREATE INDEX idx_payment_date ON payments(payment_date);
CREATE INDEX idx_contract_end ON contracts(end_date);