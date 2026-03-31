USE s2p_matrix;

-- ============================================================
-- SEED DATA — Sample data to test the system
-- ============================================================

-- Commodity Categories
INSERT INTO commodity_categories (name, parent_category, description) VALUES
('CCTV & Surveillance', 'Electronic', 'IP Cameras, DVR, NVR systems'),
('Access Control', 'Electronic', 'Biometric, RFID, card readers'),
('Video Door Phone', 'Electronic', 'VDP units and accessories'),
('Cable & Connectors', 'Electronic', 'Coaxial, CAT6, power cables'),
('Metal Enclosures', 'Mechanical', 'Junction boxes, panels, cabinets'),
('Mounting Hardware', 'Mechanical', 'Brackets, stands, poles'),
('PCB Components', 'Electronic', 'ICs, capacitors, resistors'),
('Packaging Material', 'Mechanical', 'Cartons, foam, bubble wrap');

-- Sample Vendors
INSERT INTO vendors (vendor_code, company_name, contact_person, email, phone,
    city, state, category, vendor_type, oem_approved, oem_brand, gst_number, status) VALUES
('VEN-0001', 'Techno Electronics Pvt Ltd', 'Ramesh Shah', 'ramesh@technoelec.in',
 '9876543210', 'Ahmedabad', 'Gujarat', 'Electronic', 'Distributor', TRUE,
 'Hikvision', '24AABCT1234A1Z5', 'Approved'),

('VEN-0002', 'Global Components Ltd', 'Priya Mehta', 'priya@globalcomp.in',
 '9812345678', 'Surat', 'Gujarat', 'Electronic', 'Trader', FALSE,
 NULL, '24BBBCG5678B2Z6', 'Approved'),

('VEN-0003', 'Metal Craft Industries', 'Suresh Patel', 'suresh@metalcraft.in',
 '9867890123', 'Vadodara', 'Gujarat', 'Mechanical', 'OEM', TRUE,
 'Matrix', '24CCCMC9012C3Z7', 'Approved'),

('VEN-0004', 'Smart Cable Solutions', 'Anjali Verma', 'anjali@smartcable.in',
 '9845671234', 'Rajkot', 'Gujarat', 'Electronic', 'Distributor', FALSE,
 NULL, '24DDDSC3456D4Z8', 'Under Review'),

('VEN-0005', 'Horizon Tech Systems', 'Vikram Joshi', 'vikram@horizontech.in',
 '9823456789', 'Mumbai', 'Maharashtra', 'Both', 'Distributor', TRUE,
 'Dahua', '27EEEHTS7890E5Z9', 'Pending');

-- Procurement Checklists (BR-S2P-12)
INSERT INTO checklists (name, category, version, last_reviewed, next_review) VALUES
('Electronic Components Procurement Checklist', 'Electronic', '1.0',
 '2024-01-01', '2024-04-01'),
('Mechanical Parts Procurement Checklist', 'Mechanical', '1.0',
 '2024-01-01', '2024-04-01');

INSERT INTO checklist_items (checklist_id, item_text, is_mandatory, sort_order) VALUES
(1, 'Verify OEM approval certificate is valid and not expired', TRUE, 1),
(1, 'Check GST registration status on government portal', TRUE, 2),
(1, 'Confirm technical specifications match Matrix Comsec standards', TRUE, 3),
(1, 'Validate RoHS compliance certificate for electronic components', TRUE, 4),
(1, 'Check lead time and confirm stock availability', TRUE, 5),
(1, 'Compare pricing against last 3 purchase history', FALSE, 6),
(1, 'Verify warranty terms (minimum 12 months for electronics)', TRUE, 7),
(2, 'Verify material grade and certification (IS standards)', TRUE, 1),
(2, 'Check dimensional drawings match engineering specifications', TRUE, 2),
(2, 'Confirm surface finish and coating requirements', TRUE, 3),
(2, 'Validate MSME/SSI registration for preferential treatment', FALSE, 4),
(2, 'Check previous quality rejection history', TRUE, 5);