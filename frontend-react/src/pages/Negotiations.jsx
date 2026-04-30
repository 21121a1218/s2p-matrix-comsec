import React, { useState, useEffect } from 'react';
import { api, showToast, formatINR } from '../services/api';
import Modal from '../components/Modal';
import SearchableSelect from '../components/SearchableSelect';
import { useSearchParams } from 'react-router-dom';

export default function Negotiations() {
  const [searchParams] = useSearchParams();
  const [negotiations, setNegotiations] = useState([]);
  const [summary, setSummary] = useState(null);
  const [vendorOptions, setVendorOptions] = useState([]);
  const [quotationOptions, setQuotationOptions] = useState([]);
  const [quotationItems, setQuotationItems] = useState([]);

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isOutcomeModalOpen, setIsOutcomeModalOpen] = useState(false);
  const [selectedNeg, setSelectedNeg] = useState(null);

  const [form, setForm] = useState({
    vendor_id: '', quotation_id: '', subject: '', initial_price: '',
    target_price: '', payment_terms: '', delivery_commitment: '', negotiated_by: 'Procurement Team'
  });
  const [outcome, setOutcome] = useState({ status: 'Agreed', outcome_notes: '', fallback_agreed: '' });

  const loadAll = async () => {
    try {
      const [negData, sumData, venData, quotData] = await Promise.all([
        api.get('/negotiations/'), api.get('/negotiations/summary'),
        api.get('/vendors/'), api.get('/quotations/')
      ]);
      setNegotiations(negData.negotiations || []);
      setSummary(sumData);
      setVendorOptions((venData.vendors || []).map(v => ({ value: String(v.id), label: `${v.vendor_code} — ${v.company_name}` })));
      setQuotationOptions((quotData.quotations || []).map(q => ({ value: String(q.id), label: `${q.quotation_number} — ₹${parseFloat(q.total_amount || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}` })));
    } catch (e) { showToast('Failed to load negotiations', 'error'); }
  };

  useEffect(() => {
    loadAll();
    const vId = searchParams.get('vendor_id');
    const price = searchParams.get('initial_price');
    const subject = searchParams.get('subject');
    if (vId || price) {
      setForm(f => ({ ...f, vendor_id: vId || '', initial_price: price || '', subject: subject || '' }));
      setIsCreateModalOpen(true);
    }
  }, []);

  const handleQuotationSelect = async (qId) => {
    setForm(f => ({ ...f, quotation_id: qId }));
    if (!qId) { setQuotationItems([]); return; }
    try {
      const data = await api.get(`/negotiations/quotation-items/${qId}`);
      setForm(f => ({ ...f, initial_price: data.total_amount }));
      setQuotationItems(data.items || []);
    } catch (e) { showToast('Could not load quotation items', 'error'); }
  };

  const handleSubmit = async () => {
    if (!form.vendor_id || !form.subject) { showToast('Vendor and Subject are required.', 'error'); return; }
    if (!form.initial_price) { showToast('Link a quotation or enter an initial price.', 'error'); return; }
    const items = quotationItems.map((item, i) => ({
      description: item.description, quantity: parseFloat(item.quantity),
      initial_unit_price: parseFloat(item.unit_price),
      target_unit_price: parseFloat(document.getElementById(`ni-target-${i}`)?.value) || null,
      tax_percent: parseFloat(item.tax_percent) || 18,
      quotation_item_id: parseInt(item.id) || null
    }));
    try {
      const res = await api.post('/negotiations/', {
        vendor_id: parseInt(form.vendor_id), quotation_id: form.quotation_id ? parseInt(form.quotation_id) : null,
        subject: form.subject, initial_price: parseFloat(form.initial_price),
        target_price: parseFloat(form.target_price) || parseFloat(form.initial_price),
        payment_terms: form.payment_terms, delivery_commitment: form.delivery_commitment,
        negotiated_by: form.negotiated_by, items
      });
      showToast(`Negotiation ${res.ref} started!`, 'success');
      setIsCreateModalOpen(false);
      setForm({ vendor_id: '', quotation_id: '', subject: '', initial_price: '', target_price: '', payment_terms: '', delivery_commitment: '', negotiated_by: 'Procurement Team' });
      setQuotationItems([]);
      loadAll();
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  };

  const handleSaveOutcome = async () => {
    if (!selectedNeg) return;
    const itemPayload = [];
    (selectedNeg.items || []).forEach((item, i) => {
      const el = document.getElementById(`oi-agreed-${i}`);
      const val = parseFloat(el?.value);
      if (!isNaN(val) && val > 0) itemPayload.push({ negotiation_item_id: item.id, agreed_unit_price: val });
    });
    const payload = { status: outcome.status, outcome_notes: outcome.outcome_notes, items: itemPayload };
    if (!selectedNeg.items?.length && outcome.fallback_agreed) payload.agreed_price = parseFloat(outcome.fallback_agreed);
    try {
      const res = await api.patch(`/negotiations/${selectedNeg.id}/close`, payload);
      showToast(`Outcome saved! Savings: ${formatINR(res.savings_achieved)} (${res.savings_percent}%)`, 'success');
      setIsOutcomeModalOpen(false);
      loadAll();
    } catch (e) { showToast(e.message, 'error'); }
  };

  const openCount = negotiations.filter(n => n.status === 'Open' || n.status === 'In Progress').length;

  const StatusBadge = ({ status }) => {
    const styles = {
      'Open': { background: '#dbeafe', color: '#1d4ed8' },
      'In Progress': { background: '#fef9c3', color: '#a16207' },
      'Agreed': { background: '#dcfce7', color: '#15803d' },
      'Failed': { background: '#fee2e2', color: '#b91c1c' },
      'Closed': { background: '#f3f4f6', color: '#6b7280' }
    };
    const s = styles[status] || styles['Closed'];
    return <span style={{ padding: '3px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 700, ...s }}>{status}</span>;
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
          <i className="fa fa-plus"></i> Start Negotiation
        </button>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)' }}>
        <div className="kpi-card blue"><div className="kpi-icon"><i className="fa fa-handshake"></i></div><div className="kpi-data"><span className="kpi-value">{negotiations.length}</span><span className="kpi-label">Total Negotiations</span></div></div>
        <div className="kpi-card green"><div className="kpi-icon"><i className="fa fa-rupee-sign"></i></div><div className="kpi-data"><span className="kpi-value">{summary ? formatINR(summary.total_savings_inr) : '—'}</span><span className="kpi-label">Total Savings (INR)</span></div></div>
        <div className="kpi-card purple"><div className="kpi-icon"><i className="fa fa-percent"></i></div><div className="kpi-data"><span className="kpi-value">{summary ? (summary.avg_savings_percent || 0) + '%' : '—'}</span><span className="kpi-label">Avg Savings %</span></div></div>
        <div className="kpi-card orange"><div className="kpi-icon"><i className="fa fa-clock"></i></div><div className="kpi-data"><span className="kpi-value">{openCount}</span><span className="kpi-label">Open Negotiations</span></div></div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {negotiations.length === 0 ? (
          <div className="empty-state"><i className="fa fa-handshake"></i><p>No negotiations yet. Start one from a quotation.</p></div>
        ) : negotiations.map(n => (
          <div key={n.id} style={{ background: '#fff', borderRadius: '14px', border: '1px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a' }}>{n.negotiation_ref} <span style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginLeft: '8px' }}>{n.vendor_name}</span></div>
                <div style={{ fontSize: '12px', color: '#64748b' }}><i className="fa fa-comment-alt" style={{ fontSize: '10px' }}></i> {n.subject}</div>
              </div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <StatusBadge status={n.status} />
                {['Open', 'In Progress'].includes(n.status) && (
                  <button className="btn btn-success" style={{ padding: '5px 14px', fontSize: '12px', borderRadius: '8px' }}
                    onClick={() => { setSelectedNeg(n); setOutcome({ status: 'Agreed', outcome_notes: '', fallback_agreed: '' }); setIsOutcomeModalOpen(true); }}>
                    <i className="fa fa-check"></i> Record Outcome
                  </button>
                )}
              </div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
              {[
                { label: 'Initial Budget', val: formatINR(n.initial_price), color: '#0f172a' },
                { label: 'Target Price', val: formatINR(n.target_price), color: '#3b82f6' },
                { label: 'Agreed Price', val: n.agreed_price ? formatINR(n.agreed_price) : '—', color: '#0f766e' },
                { label: 'Savings Achieved', val: n.savings_achieved > 0 ? `${formatINR(n.savings_achieved)} (${n.savings_percent}%)` : '—', color: '#16a34a' }
              ].map(cell => (
                <div key={cell.label} style={{ padding: '10px 20px', borderRight: '1px solid #f1f5f9' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '3px' }}>{cell.label}</div>
                  <div style={{ fontSize: '15px', fontWeight: 800, color: cell.color }}>{cell.val}</div>
                </div>
              ))}
            </div>
            {n.items && n.items.length > 0 && (
              <div style={{ padding: '0 0 4px' }}>
                <table className="data-table" style={{ fontSize: '13px' }}>
                  <thead><tr><th style={{ paddingLeft: '20px' }}>Description</th><th>Qty</th><th>Initial ₹/Unit</th><th>Target ₹/Unit</th><th>Agreed ₹/Unit</th><th style={{ paddingRight: '20px' }}>Line Savings</th></tr></thead>
                  <tbody>
                    {n.items.map(item => (
                      <tr key={item.id}>
                        <td style={{ paddingLeft: '20px' }}><strong style={{ color: '#0f172a' }}>{item.description}</strong></td>
                        <td>{parseFloat(item.quantity).toLocaleString('en-IN')} {item.unit}</td>
                        <td>{formatINR(item.initial_unit_price)}</td>
                        <td style={{ color: '#3b82f6' }}>{item.target_unit_price ? formatINR(item.target_unit_price) : '—'}</td>
                        <td style={{ color: '#0f766e', fontWeight: 700 }}>{item.agreed_unit_price ? formatINR(item.agreed_unit_price) : '—'}</td>
                        <td style={{ color: '#16a34a', fontWeight: 700, paddingRight: '20px' }}>
                          {item.agreed_unit_price && item.agreed_unit_price < item.initial_unit_price
                            ? formatINR((item.initial_unit_price - item.agreed_unit_price) * item.quantity)
                            : item.agreed_unit_price ? <span style={{ color: '#94a3b8' }}>No saving</span> : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* CREATE MODAL */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Start Negotiation" iconClass="fa fa-handshake" maxWidth="760px">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="form-group"><label>Vendor *</label><SearchableSelect options={vendorOptions} value={form.vendor_id} onChange={val => setForm(f => ({ ...f, vendor_id: val }))} placeholder="Select Vendor" /></div>
          <div className="form-group"><label>Negotiated By</label><input type="text" value={form.negotiated_by} onChange={e => setForm(f => ({ ...f, negotiated_by: e.target.value }))} /></div>
          <div className="form-group"><label>Link Quotation (Optional)</label><SearchableSelect options={quotationOptions} value={form.quotation_id} onChange={handleQuotationSelect} placeholder="Select Quotation" /></div>
          <div className="form-group"><label>Subject *</label><input type="text" placeholder="e.g. Q2 Laptop pricing negotiation" value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} /></div>
          <div className="form-group"><label>Initial / Quoted Price (INR) *</label><input type="number" placeholder="Auto-filled from quotation" style={{ background: '#f1f5f9' }} readOnly value={form.initial_price} onChange={e => setForm(f => ({ ...f, initial_price: e.target.value }))} /></div>
          <div className="form-group"><label>Overall Target Price (INR)</label><input type="number" placeholder="e.g. 420000" value={form.target_price} onChange={e => setForm(f => ({ ...f, target_price: e.target.value }))} /></div>
          <div className="form-group"><label>Payment Terms</label><input type="text" placeholder="e.g. 45 days net" value={form.payment_terms} onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))} /></div>
          <div className="form-group"><label>Delivery Commitment</label><input type="text" placeholder="e.g. 14 days from PO" value={form.delivery_commitment} onChange={e => setForm(f => ({ ...f, delivery_commitment: e.target.value }))} /></div>
        </div>
        {quotationItems.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <div style={{ fontSize: '12px', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '10px' }}><i className="fa fa-list"></i> Item-wise Target Prices</div>
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden' }}>
              <div style={{ overflowX: 'auto' }}>
                <table className="data-table" style={{ fontSize: '13px' }}>
                  <thead><tr><th style={{ minWidth: '160px' }}>Description</th><th>Qty</th><th>Unit</th><th style={{ whiteSpace: 'nowrap' }}>Initial ₹/Unit</th><th style={{ whiteSpace: 'nowrap' }}>Target ₹/Unit</th><th>Tax %</th></tr></thead>
                  <tbody>
                    {quotationItems.map((item, i) => (
                      <tr key={i}>
                        <td><strong style={{ color: '#0f172a', display: 'block', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.description}>{item.description}</strong></td>
                        <td>{parseFloat(item.quantity).toLocaleString('en-IN')}</td>
                        <td>PCS</td>
                        <td style={{ whiteSpace: 'nowrap' }}>₹{parseFloat(item.unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td><input id={`ni-target-${i}`} type="number" placeholder="Target ₹" style={{ width: '110px', padding: '6px 10px', border: '1.5px solid #d1d5db', borderRadius: '7px', fontSize: '13px', fontWeight: 600, textAlign: 'right' }} /></td>
                        <td>{item.tax_percent}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit}><i className="fa fa-paper-plane"></i> Start & Email Vendor</button>
        </div>
      </Modal>

      {/* OUTCOME MODAL */}
      <Modal isOpen={isOutcomeModalOpen} onClose={() => setIsOutcomeModalOpen(false)} title="Record Negotiation Outcome" iconClass="fa fa-check-circle" maxWidth="700px">
        {selectedNeg && (
          <>
            {(!selectedNeg.items || selectedNeg.items.length === 0) ? (
              <div className="form-group"><label>Agreed Total Price (INR) *</label><input type="number" placeholder="Final agreed amount" value={outcome.fallback_agreed} onChange={e => setOutcome(o => ({ ...o, fallback_agreed: e.target.value }))} /></div>
            ) : (
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '10px', overflow: 'hidden', marginBottom: '16px' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table className="data-table" style={{ fontSize: '13px' }}>
                    <thead><tr><th style={{ minWidth: '160px' }}>Description</th><th>Qty</th><th style={{ whiteSpace: 'nowrap' }}>Initial ₹/Unit</th><th style={{ whiteSpace: 'nowrap' }}>Agreed ₹/Unit</th><th style={{ whiteSpace: 'nowrap' }}>Line Savings</th></tr></thead>
                    <tbody>
                      {selectedNeg.items.map((item, i) => (
                        <tr key={i}>
                          <td><strong style={{ color: '#0f172a', display: 'block', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.description}>{item.description}</strong><div style={{ fontSize: '11px', color: '#94a3b8' }}>{item.quantity} PCS · {item.tax_percent}% GST</div></td>
                          <td>{parseFloat(item.quantity).toLocaleString('en-IN')}</td>
                          <td style={{ whiteSpace: 'nowrap' }}>₹{parseFloat(item.initial_unit_price).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                          <td><input id={`oi-agreed-${i}`} type="number" placeholder="Agreed ₹" defaultValue={item.agreed_unit_price || ''} style={{ width: '110px', padding: '6px 10px', border: '1.5px solid #d1d5db', borderRadius: '7px', fontSize: '13px', textAlign: 'right' }} /></td>
                          <td style={{ color: '#16a34a', fontWeight: 700 }}>—</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div className="form-group"><label>Outcome *</label><select value={outcome.status} onChange={e => setOutcome(o => ({ ...o, status: e.target.value }))}><option value="Agreed">Agreed ✅</option><option value="Failed">Failed ❌</option><option value="In Progress">Still In Progress</option></select></div>
              <div className="form-group"><label>Outcome Notes</label><input type="text" placeholder="Key commitments, conditions..." value={outcome.outcome_notes} onChange={e => setOutcome(o => ({ ...o, outcome_notes: e.target.value }))} /></div>
            </div>
            <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'flex-end' }}>
              <button className="btn btn-outline" onClick={() => setIsOutcomeModalOpen(false)}>Cancel</button>
              <button className="btn btn-success" onClick={handleSaveOutcome}><i className="fa fa-check"></i> Save & Sync PO</button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}
