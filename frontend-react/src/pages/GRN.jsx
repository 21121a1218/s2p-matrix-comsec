import React, { useState, useEffect } from 'react';
import { api, showToast, formatINR, formatDate } from '../services/api';
import Modal from '../components/Modal';

export default function GRN() {
  const [grns, setGrns] = useState([]);
  const [approvedPOs, setApprovedPOs] = useState([]);
  const [selectedPO, setSelectedPO] = useState(null);
  const [poItems, setPOItems] = useState([]);
  const [stats, setStats] = useState({ pending: 0, total: 0 });

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewData, setViewData] = useState(null);

  const [form, setForm] = useState({
    po_id: '', received_date: new Date().toISOString().split('T')[0],
    received_by: 'Warehouse Admin', notes: '', quality_status: 'Accepted',
    auto_settle: false, payment_method: 'NEFT', invoice_file_b64: null
  });
  const [itemQtys, setItemQtys] = useState([]);

  const loadAll = async () => {
    try {
      const [d1, d2, d3, d4] = await Promise.all([
        api.get('/purchase-orders/?status=Approved'),
        api.get('/purchase-orders/?status=Sent to Vendor'),
        api.get('/purchase-orders/?status=Acknowledged'),
        api.get('/purchase-orders/?status=Partially Received'),
      ]);
      const allPOs = [...(d1.purchase_orders || []), ...(d2.purchase_orders || []), ...(d3.purchase_orders || []), ...(d4.purchase_orders || [])];
      setApprovedPOs(allPOs);
      setStats(s => ({ ...s, pending: allPOs.length }));
    } catch (e) { console.error('Failed to load POs', e); }

    try {
      const data = await api.get('/invoices/grn/');
      const list = data.grns || [];
      setGrns(list);
      setStats(s => ({ ...s, total: list.length }));
    } catch (e) { showToast('Failed to load GRNs', 'error'); }
  };

  useEffect(() => { loadAll(); }, []);

  const handlePOSelect = async (poId) => {
    setForm(f => ({ ...f, po_id: poId }));
    if (!poId) { setPOItems([]); setSelectedPO(null); return; }
    try {
      const data = await api.get(`/purchase-orders/${poId}`);
      setSelectedPO(data);
      const eligible = (data.items || []).filter(it => it.remaining_qty > 0);
      setPOItems(eligible);
      setItemQtys(eligible.map(it => ({ po_item_id: it.id, description: it.description, ordered_qty: it.remaining_qty, received_qty: it.remaining_qty, rejected_qty: 0 })));
    } catch (e) { showToast('Failed to load PO details', 'error'); }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) { setForm(f => ({ ...f, invoice_file_b64: null })); return; }
    const reader = new FileReader();
    reader.onload = (ev) => setForm(f => ({ ...f, invoice_file_b64: ev.target.result.split(',')[1] }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    if (!form.po_id || !form.received_date) { showToast('Please select a PO and Date', 'error'); return; }
    const po = approvedPOs.find(p => String(p.id) === String(form.po_id));
    const payload = {
      po_id: parseInt(form.po_id), vendor_id: po?.vendor_id,
      received_date: form.received_date, received_by: form.received_by,
      notes: form.notes, quality_status: form.quality_status,
      auto_settle: form.auto_settle, items: itemQtys,
      payment_method: form.payment_method, invoice_file_b64: form.invoice_file_b64
    };
    try {
      if (form.invoice_file_b64) showToast('Digitizing Document...', 'info');
      const res = await api.post('/invoices/grn/', payload);
      if (res.match_status === 'Mismatch' || res.status === 'mismatch') {
        showToast(`⚠️ AUTOMATION HALTED: ${res.message}`, 'error');
      } else {
        showToast('✅ Zero-Touch Settlement Verified!', 'success');
      }
      setIsCreateOpen(false);
      setForm({ po_id: '', received_date: new Date().toISOString().split('T')[0], received_by: 'Warehouse Admin', notes: '', quality_status: 'Accepted', auto_settle: false, payment_method: 'NEFT', invoice_file_b64: null });
      setPOItems([]); setItemQtys([]);
      loadAll();
    } catch (e) { showToast(e.message || 'Error processing receipt', 'error'); loadAll(); }
  };

  const handleView = async (id) => {
    setViewData(null);
    setIsViewOpen(true);
    try {
      const data = await api.get(`/invoices/grn/${id}`);
      setViewData(data);
    } catch (e) { showToast('Failed to load GRN details', 'error'); setIsViewOpen(false); }
  };

  const getQualityBadge = (status) => {
    const s = status || 'Accepted';
    const cls = (s.includes('Failed') || s === 'Rejected') ? 'badge-rejected' : s === 'Partially Accepted' ? 'badge-pending' : 'badge-approved';
    return <span className={`badge ${cls}`}>{s}</span>;
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button className="btn btn-primary" onClick={() => setIsCreateOpen(true)}><i className="fa fa-plus"></i> Record Receipt</button>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2,1fr)', marginBottom: '20px' }}>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'rgba(88,166,255,0.12)', color: 'var(--primary)' }}><i className="fa fa-clock"></i></div><div className="stat-info"><h3>POs Pending Receipt</h3><p>{stats.pending}</p></div></div>
        <div className="stat-card"><div className="stat-icon" style={{ background: 'rgba(63,185,80,0.12)', color: 'var(--green)' }}><i className="fa fa-check-circle"></i></div><div className="stat-info"><h3>Total GRNs Issued</h3><p>{stats.total}</p></div></div>
      </div>

      <div className="card">
        <div className="card-header"><i className="fa fa-receipt"></i> Recent Goods Receipts</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>GRN No.</th><th>PO No.</th><th>Receipt Date</th><th>Received By</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {grns.length === 0 ? <tr><td colSpan="6" style={{ textAlign: 'center', padding: '20px' }}>No receipts found.</td></tr>
               : grns.map(g => (
                <tr key={g.id}>
                  <td><strong>{g.grn_number}</strong></td>
                  <td>PO#{g.po_id}</td>
                  <td>{formatDate(g.received_date)}</td>
                  <td>{g.received_by || 'system'}</td>
                  <td>{getQualityBadge(g.quality_status)}</td>
                  <td><button className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '11px' }} onClick={() => handleView(g.id)}><i className="fa fa-eye"></i> View</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE RECEIPT MODAL */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Record New Receipt" iconClass="fa fa-truck-loading" maxWidth="560px">
        <div className="form-group">
          <label>Select Purchase Order *</label>
          <select value={form.po_id} onChange={e => handlePOSelect(e.target.value)} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px' }}>
            <option value="">-- Choose Approved PO --</option>
            {approvedPOs.map(p => <option key={p.id} value={p.id}>{p.po_number} — {formatINR(p.total_amount)}</option>)}
          </select>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="form-group"><label>Received Date *</label><input type="date" value={form.received_date} onChange={e => setForm(f => ({ ...f, received_date: e.target.value }))} /></div>
          <div className="form-group"><label>Received By</label><input type="text" value={form.received_by} onChange={e => setForm(f => ({ ...f, received_by: e.target.value }))} /></div>
        </div>
        <div className="form-group">
          <label>Received Quality *</label>
          <select value={form.quality_status} onChange={e => setForm(f => ({ ...f, quality_status: e.target.value }))} style={{ width: '100%', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px' }}>
            <option value="Accepted">Excellent - fully accepted</option>
            <option value="Partially Accepted">Average - partially accepted (minor issues)</option>
            <option value="Rejected">Poor - rejected (items damaged/incorrect)</option>
          </select>
        </div>

        {poItems.length > 0 && (
          <div style={{ display: 'none', marginBottom: '20px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', background: '#f8fafc' }}>
            {/* Hidden since we auto-populate from itemQtys state */}
          </div>
        )}
        {itemQtys.length > 0 && (
          <div style={{ marginBottom: '20px', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '12px', background: '#f8fafc' }}>
            <label style={{ fontWeight: 700, color: 'var(--primary)', display: 'block', marginBottom: '10px', fontSize: '13px' }}><i className="fa fa-list-check"></i> Item Verification Checklist *</label>
            <table style={{ width: '100%', fontSize: '12px', borderCollapse: 'collapse' }}>
              <thead><tr style={{ textAlign: 'left', borderBottom: '1px solid #cbd5e1' }}><th style={{ padding: '6px' }}>Description</th><th style={{ padding: '6px', width: '60px' }}>Ord.</th><th style={{ padding: '6px', width: '70px' }}>Recv.</th><th style={{ padding: '6px', width: '70px' }}>Reject</th></tr></thead>
              <tbody>
                {itemQtys.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '6px', fontWeight: 500 }}>{item.description}</td>
                    <td style={{ padding: '6px' }}>{item.ordered_qty}</td>
                    <td style={{ padding: '6px' }}><input type="number" value={item.received_qty} min="0" max={item.ordered_qty} style={{ width: '50px', padding: '2px' }} onChange={e => { const n = [...itemQtys]; n[i].received_qty = parseFloat(e.target.value); setItemQtys(n); }} /></td>
                    <td style={{ padding: '6px' }}><input type="number" value={item.rejected_qty} min="0" style={{ width: '50px', padding: '2px' }} onChange={e => { const n = [...itemQtys]; n[i].rejected_qty = parseFloat(e.target.value); setItemQtys(n); }} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="form-group"><label>Notes / Quality Observation</label><textarea rows="3" placeholder="e.g. 5 boxes received, no external damage" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}></textarea></div>
        <div className="form-group" style={{ marginTop: '15px', padding: '12px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px' }}>
          <label style={{ fontWeight: 600, color: '#92400e', fontSize: '12px', display: 'block', marginBottom: '8px' }}><i className="fa fa-file-invoice"></i> Vendor Invoice Digitize (PDF/Image)</label>
          <input type="file" accept="application/pdf,image/*" onChange={handleFileChange} style={{ fontSize: '11px' }} />
        </div>
        <div className="form-group" style={{ background: '#fefce8', border: '1px solid #fde68a', padding: '15px', borderRadius: '12px', marginTop: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <input type="checkbox" id="auto-settle" checked={form.auto_settle} onChange={e => setForm(f => ({ ...f, auto_settle: e.target.checked }))} style={{ width: '20px', height: '20px', cursor: 'pointer', accentColor: '#92400e' }} />
            <div><label htmlFor="auto-settle" style={{ margin: 0, fontWeight: 700, color: '#92400e', fontSize: '14px' }}>⚡ Touchless Auto-Settle (ERS)</label><div style={{ fontSize: '11px', color: '#a16207' }}>Verified 3-Way Match: PO ↔ GRN ↔ Invoice</div></div>
          </div>
          {form.auto_settle && (
            <div style={{ paddingTop: '12px', borderTop: '1px dashed #fde68a' }}>
              <label style={{ fontWeight: 600, color: '#92400e', fontSize: '11px', display: 'block', marginBottom: '8px' }}><i className="fa fa-credit-card"></i> SELECT PAYMENT METHOD</label>
              <select value={form.payment_method} onChange={e => setForm(f => ({ ...f, payment_method: e.target.value }))} style={{ width: '100%', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px', fontSize: '13px', background: '#fff' }}>
                <option value="NEFT">NEFT / Bank Transfer</option><option value="RTGS">RTGS (Instant High-Value)</option><option value="Check">Manual Check Payment</option><option value="UPI">Business UPI</option>
              </select>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '25px', justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={() => setIsCreateOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}><i className="fa fa-save"></i> Confirm Receipt</button>
        </div>
      </Modal>

      {/* VIEW MODAL */}
      <Modal isOpen={isViewOpen} onClose={() => setIsViewOpen(false)} title="Receipt Details" iconClass="fa fa-eye" maxWidth="560px">
        {!viewData ? <div style={{ padding: '30px', textAlign: 'center', color: 'var(--text-muted)' }}><i className="fa fa-spinner fa-spin fa-2x"></i><br />Loading details...</div> : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: '12px', fontSize: '14px' }}>
              <div style={{ color: 'var(--text-muted)' }}>GRN Code:</div><div><strong style={{ color: 'var(--primary)' }}>{viewData.grn_number}</strong></div>
              <div style={{ color: 'var(--text-muted)' }}>PO No:</div><div>{viewData.po_number || 'PO#' + viewData.po_id}</div>
              <div style={{ color: 'var(--text-muted)' }}>Date:</div><div>{formatDate(viewData.received_date)}</div>
              <div style={{ color: 'var(--text-muted)' }}>Recv By:</div><div>{viewData.received_by || 'Warehouse Team'}</div>
              <div style={{ color: 'var(--text-muted)' }}>Status:</div><div><span style={{ fontSize: '12px', padding: '3px 8px', borderRadius: '12px', fontWeight: 600, background: viewData.quality_status?.includes('Accepted') ? '#dcfce7' : '#fee2e2', color: viewData.quality_status?.includes('Accepted') ? '#166534' : '#991b1b' }}>{viewData.quality_status}</span></div>
            </div>
            {viewData.items?.length > 0 && (
              <div style={{ marginTop: '16px', borderTop: '1px solid var(--border)', paddingTop: '10px' }}>
                <strong style={{ color: 'var(--primary)' }}><i className="fa fa-boxes"></i> Received Items</strong>
                <table className="data-table" style={{ marginTop: '12px', fontSize: '12px' }}>
                  <thead><tr><th>Description</th><th style={{ textAlign: 'center' }}>Ordered</th><th style={{ textAlign: 'center' }}>Received</th><th style={{ textAlign: 'center' }}>Accepted</th><th style={{ textAlign: 'center' }}>Rejected</th></tr></thead>
                  <tbody>
                    {viewData.items.map((it, i) => (
                      <tr key={i}><td style={{ fontWeight: 500 }}>{it.description}</td><td style={{ textAlign: 'center' }}>{it.ordered_qty}</td><td style={{ textAlign: 'center', fontWeight: 600, color: '#3b82f6' }}>{it.received_qty}</td><td style={{ textAlign: 'center', fontWeight: 600, color: '#16a34a' }}>{it.accepted_qty}</td><td style={{ textAlign: 'center', fontWeight: 600, color: it.rejected_qty > 0 ? '#ef4444' : '#64748b' }}>{it.rejected_qty}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <div style={{ marginTop: '10px', padding: '12px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0', minHeight: '60px', color: '#94a3b8', fontStyle: 'italic' }}>
              {viewData.notes || 'No specific notes recorded.'}
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
