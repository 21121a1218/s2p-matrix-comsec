import React, { useState, useEffect, useRef } from 'react';
import { api, showToast, formatINR } from '../services/api';

const DATA_FLOW = [
  { action: 'Add/Approve Vendor', sap_tx: 'XK01 / MK01', sap_api: 'API_BUSINESS_PARTNER', dir: '→ SAP' },
  { action: 'Create Purchase Order', sap_tx: 'ME21N', sap_api: 'API_PURCHASEORDER_PROCESS_SRV', dir: '→ SAP' },
  { action: 'Goods Receipt (GRN)', sap_tx: 'MIGO', sap_api: 'API_MATERIAL_DOCUMENT_SRV', dir: '→ SAP' },
  { action: 'Invoice Verification', sap_tx: 'MIRO', sap_api: 'API_SUPPLIERINVOICE_PROCESS_SRV', dir: '→ SAP' },
  { action: 'Read PO Status', sap_tx: 'ME23N', sap_api: 'API_PURCHASEORDER_PROCESS_SRV', dir: '← SAP' },
];

export default function SAPIntegration() {
  const [syncStatus, setSyncStatus] = useState({ vendors: { synced: '—', pending: '—' }, purchase_orders: { synced: '—', pending: '—' } });
  const [health, setHealth] = useState({ text: 'Checking...', ok: null });
  const [vendors, setVendors] = useState([]);
  const [pos, setPOs] = useState([]);
  const [selectedVendor, setSelectedVendor] = useState('');
  const [selectedPO, setSelectedPO] = useState('');
  const [vendorSyncResult, setVendorSyncResult] = useState(null);
  const [poSyncResult, setPOSyncResult] = useState(null);
  const [logs, setLogs] = useState([{ color: '#64748b', label: '// SAP responses will appear here...', data: null, time: null }]);
  const logRef = useRef(null);

  const appendLog = (label, data, success = true) => {
    const time = new Date().toLocaleTimeString();
    setLogs(prev => [...prev, { color: success ? '#4ade80' : '#f87171', label, data, time }]);
  };

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [logs]);

  useEffect(() => {
    const init = async () => {
      // Health check
      try {
        const data = await api.get('/sap/health');
        setHealth({ text: `⚡ ${data.status} — ${data.environment}`, ok: true });
        appendLog('SAP Health Check', data, true);
      } catch (e) {
        setHealth({ text: '❌ SAP Unreachable', ok: false });
      }

      // Sync status
      try {
        const data = await api.get('/sap/sync-status');
        setSyncStatus(data.sync_status);
      } catch (e) {}

      // Load dropdowns
      try {
        const [vData, poData] = await Promise.all([api.get('/vendors/?status=Approved'), api.get('/purchase-orders/')]);
        setVendors(vData.vendors || []);
        setPOs((poData.purchase_orders || []).filter(p => ['Approved', 'Sent to Vendor'].includes(p.status)));
      } catch (e) {}

      // Demo stream
      const demoLogs = [
        { l: 'SYSTEM START', d: { message: 'Connecting to SAP S/4HANA OData V2...' }, t: 1200 },
        { l: 'OAUTH2 AUTH', d: { token: 'Bearer eyJhbGciOi...', expires_in: 3600 }, t: 1500 },
        { l: 'VENDOR SYNC → SAP (XK01)', d: { vendor: 'VEN-0021', sap_vendor_code: '100412', status: 'Success' }, t: 2500 },
        { l: 'PO SYNC → SAP (ME21N)', d: { po_number: 'PO-2026-004', sap_po_number: '450002139', amount: 1250000 }, t: 4200 },
        { l: 'GRN POST → SAP (MIGO)', d: { grn_number: 'GRN-010', material_doc: '5000001221', movement_type: 101 }, t: 5800 },
        { l: 'INVOICE MATCH → SAP (MIRO)', d: { invoice: 'INV-992', sap_invoice: '5105611112', status: 'Posted' }, t: 7100 },
        { l: 'HEARTBEAT OK', d: { service: 'API_PURCHASEORDER_PROCESS_SRV', latency: '42ms' }, t: 8500 },
      ];
      demoLogs.forEach(log => {
        setTimeout(() => appendLog(log.l, log.d, true), log.t);
      });
    };
    init();
  }, []);

  const handleSyncVendor = async () => {
    if (!selectedVendor) { showToast('Select a vendor', 'error'); return; }
    try {
      const res = await api.post(`/sap/sync/vendor/${selectedVendor}`);
      showToast(`✅ ${res.message}`, 'success');
      appendLog('VENDOR SYNC → SAP (XK01)', res, true);
      setVendorSyncResult(res);
      const data = await api.get('/sap/sync-status');
      setSyncStatus(data.sync_status);
    } catch (e) {
      appendLog('VENDOR SYNC ERROR', { error: e.message }, false);
      showToast('Error: ' + e.message, 'error');
    }
  };

  const handleSyncPO = async () => {
    if (!selectedPO) { showToast('Select a PO', 'error'); return; }
    try {
      const res = await api.post(`/sap/sync/po/${selectedPO}`);
      showToast(`✅ ${res.message}`, 'success');
      appendLog('PO SYNC → SAP (ME21N)', res, true);
      setPOSyncResult(res);
      const data = await api.get('/sap/sync-status');
      setSyncStatus(data.sync_status);
    } catch (e) {
      appendLog('PO SYNC ERROR', { error: e.message }, false);
      showToast('Error: ' + e.message, 'error');
    }
  };

  return (
    <>
      {/* Health Badge */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <span style={{ padding: '6px 16px', borderRadius: '20px', fontSize: '13px', fontWeight: 600, background: health.ok === false ? '#fee2e2' : '#dcfce7', color: health.ok === false ? '#991b1b' : '#15803d' }}>
          <i className="fa fa-circle" style={{ fontSize: '9px' }}></i> {health.text}
        </span>
      </div>

      {/* KPIs */}
      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className="kpi-card blue"><div className="kpi-icon"><i className="fa fa-building"></i></div><div className="kpi-data"><span className="kpi-value">{syncStatus.vendors?.synced ?? '—'}</span><span className="kpi-label">Vendors Synced</span></div></div>
        <div className="kpi-card orange"><div className="kpi-icon"><i className="fa fa-building" style={{ opacity: 0.4 }}></i></div><div className="kpi-data"><span className="kpi-value">{syncStatus.vendors?.pending ?? '—'}</span><span className="kpi-label">Vendors Pending</span></div></div>
        <div className="kpi-card green"><div className="kpi-icon"><i className="fa fa-shopping-cart"></i></div><div className="kpi-data"><span className="kpi-value">{syncStatus.purchase_orders?.synced ?? '—'}</span><span className="kpi-label">POs Synced</span></div></div>
        <div className="kpi-card red"><div className="kpi-icon"><i className="fa fa-shopping-cart" style={{ opacity: 0.4 }}></i></div><div className="kpi-data"><span className="kpi-value">{syncStatus.purchase_orders?.pending ?? '—'}</span><span className="kpi-label">POs Pending</span></div></div>
      </div>

      {/* Architecture */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header"><i className="fa fa-flask"></i> Integration Architecture</div>
        <div className="card-body">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr auto 1fr', alignItems: 'center', gap: '8px', textAlign: 'center', padding: '16px 0' }}>
            <div style={{ padding: '20px', background: '#dbeafe', borderRadius: '12px' }}><div style={{ fontSize: '28px' }}>🖥️</div><div style={{ fontWeight: 700, marginTop: '8px' }}>S2P System</div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>FastAPI + MySQL</div></div>
            <div style={{ fontSize: '24px', color: 'var(--primary)' }}>⇄</div>
            <div style={{ padding: '20px', background: '#f0fdf4', borderRadius: '12px' }}><div style={{ fontSize: '28px' }}>🔌</div><div style={{ fontWeight: 700, marginTop: '8px' }}>Integration Layer</div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>OData REST API</div></div>
            <div style={{ fontSize: '24px', color: 'var(--primary)' }}>⇄</div>
            <div style={{ padding: '20px', background: '#fef9c3', borderRadius: '12px' }}><div style={{ fontSize: '28px' }}>🏭</div><div style={{ fontWeight: 700, marginTop: '8px' }}>SAP S/4HANA</div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>MM Module (Cloud)</div></div>
          </div>
          <div style={{ marginTop: '20px' }}>
            <div style={{ fontWeight: 700, marginBottom: '12px', fontSize: '14px' }}><i className="fa fa-exchange-alt"></i> Data Flow Mapping</div>
            <table className="data-table">
              <thead><tr><th>S2P Action</th><th>SAP Transaction</th><th>SAP API</th><th>Direction</th></tr></thead>
              <tbody>
                {DATA_FLOW.map((row, i) => (
                  <tr key={i}>
                    <td>{row.action}</td>
                    <td><code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{row.sap_tx}</code></td>
                    <td><code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{row.sap_api}</code></td>
                    <td style={{ fontWeight: 600, color: row.dir.startsWith('→') ? '#0f766e' : '#1d4ed8' }}>{row.dir}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Sync Controls */}
      <div className="section-row">
        <div className="card">
          <div className="card-header"><i className="fa fa-building"></i> Vendor Master Sync</div>
          <div className="card-body">
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>Push approved vendors to SAP Vendor Master (XK01)</p>
            <div className="form-group">
              <label>Select Vendor</label>
              <select value={selectedVendor} onChange={e => setSelectedVendor(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px' }}>
                <option value="">-- Select approved vendor --</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.vendor_code} — {v.company_name}{v.sap_vendor_code ? ` ✅ SAP:${v.sap_vendor_code}` : ''}</option>)}
              </select>
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSyncVendor}><i className="fa fa-upload"></i> Sync to SAP</button>
            {vendorSyncResult && (
              <div style={{ marginTop: '12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '12px', fontSize: '13px' }}>
                ✅ <strong>SAP Vendor Code:</strong> {vendorSyncResult.sap_vendor_code}<br />
                🕐 {vendorSyncResult.synced_at}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-header"><i className="fa fa-shopping-cart"></i> Purchase Order Sync</div>
          <div className="card-body">
            <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '16px' }}>Push approved POs to SAP ME21N</p>
            <div className="form-group">
              <label>Select Purchase Order</label>
              <select value={selectedPO} onChange={e => setSelectedPO(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px' }}>
                <option value="">-- Select approved PO --</option>
                {pos.map(p => <option key={p.id} value={p.id}>{p.po_number} — {formatINR(p.total_amount)}{p.sap_po_number ? ` ✅ SAP:${p.sap_po_number}` : ''}</option>)}
              </select>
            </div>
            <button className="btn btn-primary" style={{ width: '100%' }} onClick={handleSyncPO}><i className="fa fa-upload"></i> Sync to SAP</button>
            {poSyncResult && (
              <div style={{ marginTop: '12px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '8px', padding: '12px', fontSize: '13px' }}>
                ✅ <strong>SAP PO Number:</strong> {poSyncResult.sap_po_number}<br />
                📋 Transaction: ME21N<br />
                🕐 {poSyncResult.synced_at}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SAP Response Log */}
      <div className="card">
        <div className="card-header" style={{ display: 'flex', alignItems: 'center' }}>
          <i className="fa fa-terminal"></i> SAP Response Log
          <button className="btn btn-outline" style={{ padding: '4px 12px', fontSize: '12px', marginLeft: 'auto' }} onClick={() => setLogs([])}>Clear</button>
        </div>
        <div ref={logRef} style={{ background: '#0f172a', color: '#e2e8f0', padding: '20px', fontFamily: 'monospace', fontSize: '13px', minHeight: '160px', maxHeight: '320px', overflowY: 'auto', borderRadius: '0 0 12px 12px' }}>
          {logs.map((log, i) => (
            log.time ? (
              <div key={i} style={{ marginBottom: '12px', borderLeft: `3px solid ${log.color}`, paddingLeft: '12px' }}>
                <span style={{ color: '#94a3b8' }}>[{log.time}]</span>
                <span style={{ color: log.color, fontWeight: 700 }}> {log.label}</span>
                {log.data && <pre style={{ marginTop: '6px', color: '#cbd5e1', whiteSpace: 'pre-wrap' }}>{JSON.stringify(log.data, null, 2)}</pre>}
              </div>
            ) : (
              <span key={i} style={{ color: log.color }}>{log.label}</span>
            )
          ))}
        </div>
      </div>
    </>
  );
}
