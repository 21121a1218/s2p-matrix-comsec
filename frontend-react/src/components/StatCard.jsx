import React from 'react';

export default function StatCard({ title, value, iconClass, colorClass = 'blue' }) {
  return (
    <div className={`kpi-card ${colorClass}`}>
      <div className="kpi-icon">
        <i className={iconClass} />
      </div>
      <div className="kpi-data">
        <span className="kpi-value">{value}</span>
        <span className="kpi-label">{title}</span>
      </div>
    </div>
  );
}
