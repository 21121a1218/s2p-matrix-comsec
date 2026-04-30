import React, { useState, useEffect } from 'react';
import { api, showToast } from '../services/api';

const ACTION_COLORS = {
  CREATE: { bg: '#dbeafe', text: '#1e40af' }, APPROVE: { bg: '#dcfce7', text: '#15803d' },
  REJECT: { bg: '#fee2e2', text: '#991b1b' }, UPDATE: { bg: '#fef9c3', text: '#854d0e' },
  DELETE: { bg: '#fee2e2', text: '#991b1b' }, MATCH: { bg: '#ede9fe', text: '#5b21b6' },
  SYNC: { bg: '#ccfbf1', text: '#0f766e' }, SEND: { bg: '#dbeafe', text: '#1e40af' }
};

export default function Audit() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [tableFilter, setTableFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const loadAudit = async () => {
    setIsLoading(true);
    try {
      let url = '/audit/?limit=200';
      if (tableFilter) url += `&table_name=${tableFilter}`;
      if (actionFilter) url += `&action=${actionFilter}`;
      const data = await api.get(url);
      setLogs(data.logs || []);
      setTotal(data.total || 0);
    } catch (e) { showToast('Failed to load audit log', 'error'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { loadAudit(); }, [tableFilter, actionFilter]);

  return (
    <>
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-body" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={tableFilter} onChange={e => setTableFilter(e.target.value)} style={{ padding: '8px 14px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px' }}>
            <option value="">All Tables</option>
            <option value="vendors">Vendors</option>
            <option value="rfq">RFQ</option>
            <option value="purchase_orders">Purchase Orders</option>
            <option value="invoices">Invoices</option>
            <option value="payments">Payments</option>
            <option value="contracts">Contracts</option>
          </select>
          <select value={actionFilter} onChange={e => setActionFilter(e.target.value)} style={{ padding: '8px 14px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px' }}>
            <option value="">All Actions</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="APPROVE">APPROVE</option>
            <option value="REJECT">REJECT</option>
            <option value="DELETE">DELETE</option>
            <option value="MATCH">MATCH</option>
            <option value="SYNC">SYNC</option>
          </select>
          <button className="btn btn-outline" onClick={loadAudit}><i className="fa fa-refresh"></i> Refresh</button>
          <span style={{ marginLeft: 'auto', fontSize: '14px', color: 'var(--text-muted)', alignSelf: 'center' }}>{total} record(s)</span>
        </div>
      </div>

      <div className="card">
        <div className="card-header"><i className="fa fa-history"></i> Transaction Log</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>#</th><th>Time</th><th>Table</th><th>Record</th><th>Action</th><th>By</th><th>Details</th></tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Loading...</td></tr>
               : logs.length === 0 ? (
                <tr><td colSpan="7"><div className="empty-state"><i className="fa fa-history"></i><p>No audit records yet. Actions will appear here automatically.</p></div></td></tr>
               ) : logs.map(l => {
                const colors = ACTION_COLORS[l.action] || { bg: '#f1f5f9', text: '#475569' };
                return (
                  <tr key={l.id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: '12px' }}>{l.id}</td>
                    <td style={{ fontSize: '12px', whiteSpace: 'nowrap' }}>{l.changed_at}</td>
                    <td><code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px', fontSize: '12px' }}>{l.table}</code></td>
                    <td style={{ fontSize: '13px' }}>#{l.record_id}</td>
                    <td><span style={{ background: colors.bg, color: colors.text, padding: '3px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>{l.action}</span></td>
                    <td style={{ fontSize: '13px' }}>{l.changed_by || 'system'}</td>
                    <td style={{ fontSize: '12px', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {l.new_values ? <span style={{ color: 'var(--text-muted)' }}>{JSON.stringify(l.new_values).substring(0, 60)}...</span> : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
