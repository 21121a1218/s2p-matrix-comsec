import React from 'react';

export default function Topbar({ title, subtitle, toggleSidebar, action }) {
  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric"
  });

  return (
    <header className="topbar">
      <button className="menu-toggle" onClick={toggleSidebar}>
        <i className="fa fa-bars"></i>
      </button>
      <div className="topbar-title">
        <h1>{title || 'Dashboard'}</h1>
        <span>{subtitle || 'Matrix S2P System'}</span>
      </div>
      <div className="topbar-right">
        {action && action}
        <span className="badge-date">{today}</span>
        <div className="user-avatar"><i className="fa fa-user-circle"></i></div>
      </div>
    </header>
  );
}

