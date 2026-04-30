import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

const NAV_ITEMS = [
  { to: '/', icon: 'fa fa-chart-pie', label: 'Dashboard', exact: true },
  { to: '/vendors', icon: 'fa fa-building', label: 'Vendors' },
  { to: '/rfq', icon: 'fa fa-file-alt', label: 'RFQ' },
  { to: '/quotations', icon: 'fa fa-balance-scale', label: 'Quotations' },
  { to: '/negotiations', icon: 'fa fa-handshake', label: 'Negotiations' },
  { to: '/contracts', icon: 'fa fa-file-signature', label: 'Contracts' },
  { to: '/purchase-orders', icon: 'fa fa-shopping-cart', label: 'Purchase Orders' },
  { to: '/grn', icon: 'fa fa-truck-loading', label: 'Goods Receipt' },
  { to: '/invoices', icon: 'fa fa-file-invoice', label: 'Invoices' },
  { to: '/payments', icon: 'fa fa-money-bill-wave', label: 'Payments' },
  { to: '/checklists', icon: 'fa fa-tasks', label: 'Checklists' },
  { to: '/audit', icon: 'fa fa-history', label: 'Audit Trail' },
  { to: '/sap-integration', icon: 'fa fa-plug', label: 'SAP Integration' },
];

export default function Sidebar({ isOpen }) {
  const navigate = useNavigate();

  return (
    <div className={`sidebar ${isOpen ? 'open' : ''}`} id="sidebar">
      <div
        className="sidebar-header"
        onClick={() => navigate('/')}
        style={{ cursor: 'pointer' }}
        title="Go to Dashboard"
      >
        <div className="logo-icon"><i className="fa-solid fa-network-wired"></i></div>
        <div className="logo-text">
          <span className="logo-main">HG INFO TECH</span>
          <span className="logo-sub">S2P Workflow Automation</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV_ITEMS.map(({ to, icon, label, exact }) => (
          <NavLink
            key={to}
            to={to}
            end={exact}
            className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
          >
            <i className={icon}></i><span>{label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span><i className="fa fa-circle green-dot"></i> System Online</span>
      </div>
    </div>
  );
}
