import React, { useState, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export const TopbarActionContext = React.createContext(() => {});

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [topbarAction, setTopbarAction] = useState(null);
  const location = useLocation();

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  const registerTopbarAction = useCallback((node) => {
    setTopbarAction(node);
  }, []);

  const PAGE_META = {
    '/':                 { title: 'Dashboard',               subtitle: 'Commercial Governance · Source-to-Pay Overview' },
    '/vendors':          { title: 'Vendor Master',           subtitle: 'Vendor Management & Compliance' },
    '/rfq':              { title: 'Request for Quotation',   subtitle: 'Create and manage RFQs (BR-S2P-03)' },
    '/quotations':       { title: 'Quotation Comparison',    subtitle: 'AI-powered vendor selection (BR-S2P-04)' },
    '/negotiations':     { title: 'Negotiation Tracking',    subtitle: 'Item-wise price revisions & savings (BR-S2P-06)' },
    '/contracts':        { title: 'Contract Management',     subtitle: 'Centralised contract repository with expiry alerts (BR-S2P-07)' },
    '/purchase-orders':  { title: 'Purchase Orders',         subtitle: 'Multi-level approval workflow (BR-S2P-09)' },
    '/grn':              { title: 'Goods Receipt Note (GRN)', subtitle: 'Confirm physical delivery of goods against Purchase Orders' },
    '/invoices':         { title: 'Invoice Reconciliation',  subtitle: '3-Way Match: PO ↔ GRN ↔ Invoice (BR-S2P-10)' },
    '/payments':         { title: 'Payment Control Center',  subtitle: 'Financial fulfillment and payment disbursement (BR-S2P-11)' },
    '/checklists':       { title: 'Procurement Checklists',  subtitle: 'Dynamic checklists with quarterly review cycle (BR-S2P-12)' },
    '/audit':            { title: 'Audit Trail',             subtitle: 'Full transaction log for compliance (NFR-06)' },
    '/sap-integration':  { title: 'SAP Integration',         subtitle: 'SAP S/4HANA MM sync layer (NFR-01) — Mock Mode' },
  };

  // Reset action on route change
  React.useEffect(() => { setTopbarAction(null); }, [location.pathname]);

  const { title, subtitle } = PAGE_META[location.pathname] || { title: 'Matrix S2P', subtitle: 'Workflow Automation' };

  return (
    <TopbarActionContext.Provider value={registerTopbarAction}>
      <Sidebar isOpen={isSidebarOpen} />
      <div className="main-content">
        <Topbar
          title={title}
          subtitle={subtitle}
          toggleSidebar={toggleSidebar}
          action={topbarAction}
        />
        <div className="content-body">
          <Outlet />
        </div>
      </div>
    </TopbarActionContext.Provider>
  );
}
