import React, { useState, useEffect } from 'react';
import { api, showToast, formatINR, formatDate } from '../services/api';
import Modal from '../components/Modal';
import SearchableSelect from '../components/SearchableSelect';

export default function Contracts() {
  const [contracts, setContracts] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [kpis, setKpis] = useState({ total: 0, active: 0, expiring: 0, expired: 0 });
  const [vendorOptions, setVendorOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');

  const [form, setForm] = useState({
    title: '', vendor_id: '', contract_type: 'Annual',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '', contract_value: '', renewal_alert_days: 30, notes: ''
  });

  const loadContracts = async () => {
    setIsLoading(true);
    try {
      const data = await api.get('/contracts/');
      let list = data.contracts || [];
      if (statusFilter) list = list.filter(c => c.status === statusFilter);
      if (typeFilter) list = list.filter(c => c.contract_type === typeFilter);
      setContracts(list);
      setKpis({
        total: data.total || 0,
        active: (data.contracts || []).filter(c => c.status === 'Active').length,
        expiring: data.expiring_soon || 0,
        expired: data.expired || 0
      });
      setAlerts((data.contracts || []).filter(c => c.status === 'Expiring Soon' || c.status === 'Expired'));
    } catch (e) { showToast('Failed to load contracts: ' + e.message, 'error'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => {
    const loadVendors = async () => {
      try {
        const data = await api.get('/vendors/');
        setVendorOptions((data.vendors || []).map(v => ({ value: String(v.id), label: `${v.vendor_code} — ${v.company_name}` })));
      } catch (e) {}
    };
    loadVendors();
    loadContracts();
  }, []);

  useEffect(() => { loadContracts(); }, [statusFilter, typeFilter]);

  const handleSubmit = async () => {
    if (!form.title || !form.vendor_id || !form.start_date || !form.end_date) {
      showToast('Title, vendor, start and end date required', 'error'); return;
    }
    try {
      const res = await api.post('/contracts/', {
        title: form.title, vendor_id: parseInt(form.vendor_id),
        contract_type: form.contract_type, start_date: form.start_date,
        end_date: form.end_date,
        contract_value: parseFloat(form.contract_value) || null,
        renewal_alert_days: parseInt(form.renewal_alert_days) || 30,
        notes: form.notes
      });
      showToast(`✅ ${res.contract_number} created!`, 'success');
      setIsCreateOpen(false);
      setForm({ title: '', vendor_id: '', contract_type: 'Annual', start_date: new Date().toISOString().split('T')[0], end_date: '', contract_value: '', renewal_alert_days: 30, notes: '' });
      loadContracts();
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  };

  const handleTerminate = async (id, num) => {
    if (!window.confirm(`Terminate contract ${num}?`)) return;
    try {
      await api.post(`/contracts/${id}/terminate`);
      showToast(`Contract ${num} terminated`, 'info');
      loadContracts();
    } catch (e) { showToast(e.message, 'error'); }
  };

  const badge = (status) => {
    const cls = status === 'Active' ? 'badge-approved' : status === 'Expiring Soon' ? 'badge-review' :
                status === 'Expired' || status === 'Terminated' ? 'badge-rejected' : 'badge-pending';
    return <span className={`badge ${cls}`}>{status}</span>;
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button className="btn btn-primary" onClick={() => setIsCreateOpen(true)}><i className="fa fa-plus"></i> New Contract</button>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className="kpi-card blue"><div className="kpi-icon"><i className="fa fa-file-contract"></i></div><div className="kpi-data"><span className="kpi-value">{kpis.total}</span><span className="kpi-label">Total Contracts</span></div></div>
        <div className="kpi-card green"><div className="kpi-icon"><i className="fa fa-check-circle"></i></div><div className="kpi-data"><span className="kpi-value">{kpis.active}</span><span className="kpi-label">Active</span></div></div>
        <div className="kpi-card orange"><div className="kpi-icon"><i className="fa fa-exclamation-triangle"></i></div><div className="kpi-data"><span className="kpi-value">{kpis.expiring}</span><span className="kpi-label">Expiring Soon</span></div></div>
        <div className="kpi-card red"><div className="kpi-icon"><i className="fa fa-times-circle"></i></div><div className="kpi-data"><span className="kpi-value">{kpis.expired}</span><span className="kpi-label">Expired</span></div></div>
      </div>

      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <div className="card" style={{ marginBottom: '20px' }}>
          <div className="card-header" style={{ background: '#fff7ed', color: '#ea7800' }}><i className="fa fa-bell"></i> Renewal Alerts</div>
          <div className="card-body">
            {alerts.map(a => (
              <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                <div>
                  <strong>{a.contract_number}</strong> — {a.vendor_name}<br/>
                  <span style={{ fontSize: '13px', color: 'var(--text-muted)' }}>{a.title}</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: a.days_remaining < 0 ? 'var(--red)' : 'var(--orange)', fontWeight: 700 }}>
                    {a.days_remaining < 0 ? `Expired ${Math.abs(a.days_remaining)} days ago` : `Expires in ${a.days_remaining} days`}
                  </span><br/>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{a.end_date}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-body" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '8px 14px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px' }}>
            <option value="">All Status</option>
            <option value="Draft">Draft</option><option value="Active">Active</option>
            <option value="Expiring Soon">Expiring Soon</option><option value="Expired">Expired</option>
            <option value="Terminated">Terminated</option>
          </select>
          <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} style={{ padding: '8px 14px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px' }}>
            <option value="">All Types</option>
            <option value="Annual">Annual</option><option value="AMC">AMC</option>
            <option value="Rate Contract">Rate Contract</option><option value="One-Time">One-Time</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card">
        <div className="card-header"><i className="fa fa-file-contract"></i> Contract Repository</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>Contract No.</th><th>Vendor</th><th>Title</th><th>Type</th><th>Start</th><th>End</th><th>Days Left</th><th>Value</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan="10" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Loading...</td></tr>
               : contracts.length === 0 ? <tr><td colSpan="10"><div className="empty-state"><i className="fa fa-file-contract"></i><p>No contracts found</p></div></td></tr>
               : contracts.map(c => (
                <tr key={c.id} style={{ background: c.status === 'Expiring Soon' ? '#fff7ed' : c.status === 'Expired' ? '#fef2f2' : '' }}>
                  <td><strong>{c.contract_number}</strong></td>
                  <td>{c.vendor_name}</td>
                  <td style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.title}>{c.title}</td>
                  <td><span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '20px', fontSize: '12px' }}>{c.contract_type}</span></td>
                  <td>{formatDate(c.start_date)}</td>
                  <td>{formatDate(c.end_date)}</td>
                  <td><span style={{ fontWeight: 700, color: c.days_remaining < 0 ? 'var(--red)' : c.days_remaining < 30 ? 'var(--orange)' : 'var(--green)' }}>{c.days_remaining < 0 ? 'Expired' : `${c.days_remaining}d`}</span></td>
                  <td>{c.contract_value ? formatINR(c.contract_value) : '—'}</td>
                  <td>{badge(c.status)}</td>
                  <td>
                    {c.status !== 'Terminated' && c.status !== 'Expired'
                      ? <button className="btn btn-danger" style={{ padding: '4px 10px', fontSize: '12px', background: '#ef4444', borderColor: '#ef4444', color: 'white' }} onClick={() => handleTerminate(c.id, c.contract_number)}><i className="fa fa-times"></i> Terminate</button>
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MODAL */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="New Contract" iconClass="fa fa-file-contract" maxWidth="620px">
        <div className="form-group"><label>Contract Title *</label><input type="text" placeholder="e.g. Annual Supply Agreement — CCTV Components" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="form-group"><label>Vendor *</label><SearchableSelect options={vendorOptions} value={form.vendor_id} onChange={val => setForm(f => ({ ...f, vendor_id: val }))} placeholder="Select Vendor" /></div>
          <div className="form-group"><label>Contract Type</label><select value={form.contract_type} onChange={e => setForm(f => ({ ...f, contract_type: e.target.value }))}><option value="Annual">Annual</option><option value="AMC">AMC (Maintenance)</option><option value="Rate Contract">Rate Contract</option><option value="One-Time">One-Time</option></select></div>
          <div className="form-group"><label>Start Date *</label><input type="date" value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} /></div>
          <div className="form-group"><label>End Date *</label><input type="date" value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))} /></div>
          <div className="form-group"><label>Contract Value (INR)</label><input type="number" placeholder="e.g. 500000" value={form.contract_value} onChange={e => setForm(f => ({ ...f, contract_value: e.target.value }))} /></div>
          <div className="form-group"><label>Renewal Alert (days before expiry)</label><input type="number" value={form.renewal_alert_days} onChange={e => setForm(f => ({ ...f, renewal_alert_days: e.target.value }))} /></div>
        </div>
        <div className="form-group"><label>Notes</label><textarea rows="2" placeholder="Key terms, SLAs, special conditions..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}></textarea></div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={() => setIsCreateOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}><i className="fa fa-save"></i> Save Contract</button>
        </div>
      </Modal>
    </>
  );
}
