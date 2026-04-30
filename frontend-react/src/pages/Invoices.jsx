import React, { useState, useEffect } from 'react';
import { api, showToast, formatINR, formatDate } from '../services/api';
import Modal from '../components/Modal';

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [poOptions, setPOOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isReasonOpen, setIsReasonOpen] = useState(false);
  const [reasonText, setReasonText] = useState('');

  const [form, setForm] = useState({
    invoice_number: '', vendor_id: '', po_id: '',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '', total_amount: '', subtotal: '', tax_amount: ''
  });

  const loadAll = async () => {
    setIsLoading(true);
    try {
      const [vData, poData, invData] = await Promise.all([
        api.get('/vendors/'), api.get('/purchase-orders/'), api.get('/invoices/')
      ]);
      setVendors(vData.vendors || []);
      setPOOptions(poData.purchase_orders || []);
      setInvoices(invData.invoices || []);
    } catch (e) { showToast('Failed to load invoices', 'error'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { loadAll(); }, []);

  const handleSubmit = async () => {
    if (!form.invoice_number || !form.vendor_id || !form.total_amount || !form.invoice_date) {
      showToast('Invoice number, vendor, amount and date are required', 'error'); return;
    }
    try {
      const res = await api.post('/invoices/', {
        invoice_number: form.invoice_number, vendor_id: parseInt(form.vendor_id),
        po_id: parseInt(form.po_id) || null, invoice_date: form.invoice_date,
        due_date: form.due_date || null,
        subtotal: parseFloat(form.subtotal) || parseFloat(form.total_amount),
        tax_amount: parseFloat(form.tax_amount) || 0,
        total_amount: parseFloat(form.total_amount)
      });
      if (res.warning) showToast(res.warning, 'error');
      else showToast(`✅ Invoice ${res.invoice?.internal_ref} recorded!`, 'success');
      setIsCreateOpen(false);
      setForm({ invoice_number: '', vendor_id: '', po_id: '', invoice_date: new Date().toISOString().split('T')[0], due_date: '', total_amount: '', subtotal: '', tax_amount: '' });
      loadAll();
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  };

  const extractTags = (notes) => {
    const tags = [];
    if (/price|amount|value|rate|total|financial/i.test(notes)) tags.push({ icon: '₹', label: 'Financial' });
    if (/qty|quantity|received|short|count/i.test(notes)) tags.push({ icon: '📦', label: 'Quantity' });
    if (/vendor|supplier/i.test(notes)) tags.push({ icon: '🏢', label: 'Vendor' });
    if (/duplicate|dup/i.test(notes)) tags.push({ icon: '🔁', label: 'Duplicate' });
    if (/grn|receipt|delivery/i.test(notes)) tags.push({ icon: '🚚', label: 'Receipt' });
    if (/po|order|source/i.test(notes)) tags.push({ icon: '📋', label: 'PO Link' });
    if (/ocr|document|engine/i.test(notes)) tags.push({ icon: '📄', label: 'Extraction' });
    if (tags.length === 0 && notes) tags.push({ icon: '⚠️', label: 'Exception' });
    return tags;
  };

  const renderReasonCell = (inv) => {
    const notes = inv.match_notes || '';
    if (inv.match_status === 'Mismatch' && notes) {
      const tags = extractTags(notes);
      return (
        <div style={{ marginTop: '5px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {tags.map((t, i) => (
              <span key={i} title={t.label} style={{ background: '#fee2e2', color: '#b91c1c', padding: '2px 8px', borderRadius: '4px', fontSize: '10px', fontWeight: 700, border: '1px solid #fecaca' }}>
                {t.icon} {t.label}
              </span>
            ))}
          </div>
          <button 
            className="btn btn-outline" 
            style={{ padding: '4px 10px', fontSize: '11px', color: '#b91c1c', borderColor: '#fca5a5', background: 'white', width: 'fit-content' }} 
            onClick={() => { setReasonText(notes); setIsReasonOpen(true); }}
          >
            <i className="fa fa-search"></i> View Audit Failure
          </button>
        </div>
      );
    }
    if (inv.match_status === 'Partial Match' && notes) {
      return (
        <div style={{ marginTop: '5px' }}>
          <button 
            className="btn btn-outline" 
            style={{ padding: '4px 10px', fontSize: '11px', color: '#92400e', borderColor: '#fcd34d', background: '#fffbeb' }} 
            onClick={() => { setReasonText(notes); setIsReasonOpen(true); }}
          >
            <i className="fa fa-exclamation-triangle"></i> Review Discrepancy
          </button>
        </div>
      );
    }
    if (inv.match_status === 'Matched') return <div style={{ fontSize: '11px', color: '#15803d', fontWeight: 600, marginTop: '4px' }}><i className="fa fa-check-double"></i> 3-Way Match Verified</div>;
    if (inv.match_status === 'Pending') return <span style={{ fontSize: '11px', color: '#94a3b8', fontStyle: 'italic' }}>Awaiting Audit Run</span>;
    return '—';
  };

  const badge = (status) => {
    const map = {
      'Matched': 'badge-approved', 'Paid': 'badge-approved',
      'Mismatch': 'badge-rejected', 'Unpaid': 'badge-pending',
      'Partial Match': 'badge-review', 'Pending': 'badge-pending'
    };
    return <span className={`badge ${map[status] || 'badge-pending'}`}>{status}</span>;
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button className="btn btn-primary" onClick={() => setIsCreateOpen(true)}><i className="fa fa-plus"></i> Add Invoice</button>
      </div>

      <div className="card">
        <div className="card-header"><i className="fa fa-file-invoice"></i> All Invoices</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>Ref</th><th>Invoice No.</th><th>Vendor</th><th>Date</th><th>Amount</th><th>Match Status</th><th>Mismatch Reason</th><th>Payment</th></tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Loading...</td></tr>
               : invoices.length === 0 ? <tr><td colSpan="8"><div className="empty-state"><i className="fa fa-file-invoice"></i><p>No invoices recorded yet</p></div></td></tr>
               : invoices.map(inv => (
                <tr key={inv.id} style={{ background: inv.match_status === 'Mismatch' ? '#fff5f5' : inv.match_status === 'Partial Match' ? '#fffdf0' : '' }}>
                  <td><strong>{inv.internal_ref}</strong></td>
                  <td>{inv.invoice_number}{inv.is_duplicate && <span style={{ color: 'var(--red)', fontSize: '11px' }}> ⚠️ DUP</span>}</td>
                  <td>Vendor #{inv.vendor_id}</td>
                  <td>{formatDate(inv.invoice_date)}</td>
                  <td><strong>{formatINR(inv.total_amount)}</strong></td>
                  <td>{badge(inv.match_status)}</td>
                  <td>{renderReasonCell(inv)}</td>
                  <td>{badge(inv.payment_status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE MODAL */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Record Invoice" iconClass="fa fa-file-invoice" maxWidth="580px">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="form-group"><label>Vendor Invoice Number *</label><input type="text" placeholder="e.g. INV/2024/1234" value={form.invoice_number} onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))} /></div>
          <div className="form-group">
            <label>Vendor *</label>
            <select value={form.vendor_id} onChange={e => setForm(f => ({ ...f, vendor_id: e.target.value }))} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px' }}>
              <option value="">-- Select --</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.vendor_code} — {v.company_name}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label>Link to PO</label>
            <select value={form.po_id} onChange={e => setForm(f => ({ ...f, po_id: e.target.value }))} style={{ width: '100%', padding: '10px 14px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px' }}>
              <option value="">-- Optional --</option>
              {poOptions.map(p => <option key={p.id} value={p.id}>{p.po_number} ({formatINR(p.total_amount)})</option>)}
            </select>
          </div>
          <div className="form-group"><label>Invoice Date *</label><input type="date" value={form.invoice_date} onChange={e => setForm(f => ({ ...f, invoice_date: e.target.value }))} /></div>
          <div className="form-group"><label>Due Date</label><input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} /></div>
          <div className="form-group"><label>Total Amount (INR) *</label><input type="number" placeholder="e.g. 118000" value={form.total_amount} onChange={e => { const v = e.target.value; setForm(f => ({ ...f, total_amount: v, subtotal: v ? (parseFloat(v) / 1.18).toFixed(2) : '', tax_amount: v ? (parseFloat(v) - parseFloat(v) / 1.18).toFixed(2) : '' })); }} /></div>
          <div className="form-group"><label>Subtotal (before tax)</label><input type="number" placeholder="e.g. 100000" value={form.subtotal} onChange={e => setForm(f => ({ ...f, subtotal: e.target.value }))} /></div>
          <div className="form-group"><label>Tax Amount (GST)</label><input type="number" placeholder="e.g. 18000" value={form.tax_amount} onChange={e => setForm(f => ({ ...f, tax_amount: e.target.value }))} /></div>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={() => setIsCreateOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}><i className="fa fa-save"></i> Record Invoice</button>
        </div>
      </Modal>

      {/* REASON MODAL — ENHANCED CLARITY */}
      <Modal isOpen={isReasonOpen} onClose={() => setIsReasonOpen(false)} title="Audit Verification Result" iconClass="fa fa-shield-halved" maxWidth="600px">
        <div style={{ padding: '2px' }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '24px', marginBottom: '20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444' }}>
                <i className="fa fa-circle-xmark fa-lg"></i>
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 800, color: '#0f172a' }}>Compliance Failure Detected</h3>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: '#64748b' }}>The automated 3-way match engine identified the following discrepancies:</p>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {(reasonText || '').split(/;|❌|FAILED:|Verification Failed:/).filter(t => t.trim()).map((text, idx) => {
                const isPrice = /price|amount|value|financial/i.test(text);
                const isQty = /qty|quantity|count/i.test(text);
                const isHeader = /vendor|po|grn|ref/i.test(text);
                
                return (
                  <div key={idx} style={{ display: 'flex', gap: '12px', padding: '12px 16px', background: 'white', border: '1px solid #f1f5f9', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
                    <div style={{ color: isPrice ? '#2563eb' : isQty ? '#f59e0b' : '#6366f1', fontSize: '14px', marginTop: '2px' }}>
                      <i className={`fa ${isPrice ? 'fa-indian-rupee-sign' : isQty ? 'fa-box-open' : 'fa-clipboard-check'}`}></i>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8', marginBottom: '2px' }}>
                        {isPrice ? 'Financial Mismatch' : isQty ? 'Quantity Variance' : 'Structural Error'}
                      </div>
                      <div style={{ fontSize: '14px', color: '#334155', lineHeight: '1.5', fontWeight: 500 }}>{text.trim()}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
            <button className="btn btn-primary" style={{ background: '#0f172a' }} onClick={() => setIsReasonOpen(false)}>Acknowledge</button>
          </div>
        </div>
      </Modal>
    </>
  );
}
