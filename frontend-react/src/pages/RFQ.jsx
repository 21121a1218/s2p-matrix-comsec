import React, { useState, useEffect } from 'react';
import { api, showToast, formatINR, formatDate } from '../services/api';
import Modal from '../components/Modal';
import { Link } from 'react-router-dom';

export default function RFQ() {
  const [rfqs, setRfqs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isSendResultModalOpen, setIsSendResultModalOpen] = useState(false);

  // Specific Modal Data
  const [selectedRFQ, setSelectedRFQ] = useState(null); // For View & Details
  const [sendResultData, setSendResultData] = useState([]);

  // Create Form State
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    issue_date: new Date().toISOString().split('T')[0],
    deadline: '',
    estimated_value: '',
    created_by: 'Procurement Team',
    target_category: 'Electronic'
  });
  const [items, setItems] = useState([{ id: 1, description: '', quantity: 1, unit: 'PCS' }]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadRFQs = async () => {
    setIsLoading(true);
    try {
      const data = await api.get('/rfq/');
      setRfqs(data.rfqs || []);
    } catch (e) {
      showToast('Failed to load RFQs', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { loadRFQs(); }, []);

  // -- Create Logic --
  const handleAddItem = () => {
    setItems([...items, { id: Date.now(), description: '', quantity: 1, unit: 'PCS' }]);
  };

  const handleRemoveItem = (id) => {
    setItems(items.filter(item => item.id !== id));
  };

  const handleItemChange = (id, field, value) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleSubmit = async () => {
    if (!formData.title || !formData.issue_date || !formData.deadline) {
      showToast('Title, issue date and deadline are required', 'error');
      return;
    }

    const cleanItems = items.filter(i => i.description.trim() !== '').map(i => ({
      description: i.description.trim(),
      quantity: parseFloat(i.quantity) || 1,
      unit: i.unit || 'PCS'
    }));

    setIsSubmitting(true);
    try {
      const res = await api.post('/rfq/', {
        ...formData,
        estimated_value: parseFloat(formData.estimated_value) || null,
        items: cleanItems,
        vendor_ids: []
      });
      showToast(`✅ ${res.rfq_number} created with AI assigned vendors!`, 'success');
      setIsCreateModalOpen(false);
      setFormData({
        title: '', description: '', issue_date: new Date().toISOString().split('T')[0],
        deadline: '', estimated_value: '', created_by: 'Procurement Team', target_category: 'Electronic'
      });
      setItems([{ id: Date.now(), description: '', quantity: 1, unit: 'PCS' }]);
      loadRFQs();
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  // -- View / Details Logic --
  const handleView = async (rfqId) => {
    setSelectedRFQ(null);
    setIsViewModalOpen(true);
    try {
      const data = await api.get(`/rfq/${rfqId}`);
      setSelectedRFQ(data);
    } catch (e) {
      showToast('Failed to load details', 'error');
      setIsViewModalOpen(false);
    }
  };

  const handleShowVendors = async (rfqId) => {
    setSelectedRFQ(null);
    setIsDetailModalOpen(true);
    try {
      const data = await api.get(`/rfq/${rfqId}`);
      if (data.vendors) {
        data.vendors.sort((a, b) => (b.ai_score || 0) - (a.ai_score || 0));
      }
      setSelectedRFQ(data);
    } catch (e) {
      showToast('Failed to load vendors', 'error');
      setIsDetailModalOpen(false);
    }
  };

  // -- Send Logic --
  const handleSend = async (rfqId, rfqNum) => {
    if (!window.confirm(`Send ${rfqNum} to all assigned vendors?\nVendors will receive a secure portal link to submit their quotation.`)) return;
    
    try {
      showToast('Sending RFQ...', 'info');
      const res = await api.post(`/rfq/${rfqId}/send`);
      if (!res.vendors || res.vendors.length === 0) {
        showToast('No vendors assigned to this RFQ. Assign vendors first.', 'error');
        return;
      }
      setSendResultData(res.vendors);
      setIsSendResultModalOpen(true);
      showToast(`✅ ${res.message}`, 'success');
      loadRFQs();
    } catch (e) {
      showToast('Error: ' + e.message, 'error');
    }
  };

  const copyLink = (url) => {
    navigator.clipboard.writeText(url).then(() => showToast('Link copied!', 'success'));
  };

  const renderBadge = (status) => {
    const cls = status === 'Sent' ? 'badge-approved' : 
                status === 'Draft' ? 'badge-pending' : 'badge-review';
    return <span className={`badge ${cls}`}>{status}</span>;
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button className="btn btn-primary" onClick={() => setIsCreateModalOpen(true)}>
          <i className="fa fa-plus"></i> Create RFQ
        </button>
      </div>

      <div className="card">
        <div className="card-header"><i className="fa fa-file-alt"></i> All RFQs</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>RFQ No.</th><th>Title</th><th>Issue Date</th>
                <th>Submission Deadline</th><th>Est. Value</th><th>Vendors</th>
                <th>Status</th><th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Loading...</td></tr>
              ) : rfqs.length === 0 ? (
                <tr><td colSpan="8"><div className="empty-state"><i className="fa fa-file-alt"></i><p>No RFQs yet. Create your first one!</p></div></td></tr>
              ) : rfqs.map(r => (
                <tr key={r.id}>
                  <td><strong>{r.rfq_number}</strong></td>
                  <td>{r.title}</td>
                  <td>{formatDate(r.issue_date)}</td>
                  <td>{formatDate(r.deadline)}</td>
                  <td>{r.estimated_value ? formatINR(r.estimated_value) : '—'}</td>
                  <td>
                    <button className="btn btn-outline" style={{ padding: '3px 10px', fontSize: '12px' }} onClick={() => handleShowVendors(r.id)}>
                      <i className="fa fa-users"></i> Vendors
                    </button>
                  </td>
                  <td>{renderBadge(r.status)}</td>
                  <td style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button className="btn btn-outline" style={{ padding: '5px 12px', fontSize: '12px' }} onClick={() => handleView(r.id)} title="View Details">
                      <i className="fa fa-eye"></i> View
                    </button>
                    {r.status === 'Draft' && (
                      <button className="btn btn-primary" style={{ padding: '5px 12px', fontSize: '12px' }} onClick={() => handleSend(r.id, r.rfq_number)}>
                        <i className="fa fa-paper-plane"></i> Send
                      </button>
                    )}
                    {r.status === 'Sent' && (
                      <button className="btn btn-outline" style={{ padding: '5px 12px', fontSize: '12px' }} onClick={() => handleSend(r.id, r.rfq_number)}>
                        <i className="fa fa-redo"></i> Re-send
                      </button>
                    )}
                    <Link to={`/quotations?rfq=${r.id}`} style={{ fontSize: '12px', color: 'var(--primary)', textDecoration: 'none', marginLeft: '6px' }}>
                      <i className="fa fa-quote-right"></i> Quotes
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE RFQ MODAL */}
      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New RFQ" iconClass="fa fa-file-alt" maxWidth="720px">
        <div className="form-group">
          <label>RFQ Title *</label>
          <input type="text" placeholder="e.g. CCTV Cameras Q2 2026" value={formData.title} onChange={e => setFormData({ ...formData, title: e.target.value })} />
        </div>
        <div className="form-group">
          <label>Description</label>
          <textarea rows="2" placeholder="Procurement details, technical specs..." value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })}></textarea>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="form-group">
            <label>Issue Date *</label>
            <input type="date" value={formData.issue_date} onChange={e => setFormData({ ...formData, issue_date: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Quote Submission Deadline *</label>
            <input type="date" value={formData.deadline} onChange={e => setFormData({ ...formData, deadline: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Estimated Value (INR)</label>
            <input type="number" placeholder="500000" value={formData.estimated_value} onChange={e => setFormData({ ...formData, estimated_value: e.target.value })} />
          </div>
          <div className="form-group">
            <label>Created By</label>
            <input type="text" value={formData.created_by} onChange={e => setFormData({ ...formData, created_by: e.target.value })} />
          </div>
        </div>

        {/* Line Items */}
        <div style={{ margin: '16px 0 8px', fontWeight: 700, fontSize: '14px' }}>
          <i className="fa fa-list"></i> Line Items
          <button type="button" className="btn btn-outline" style={{ padding: '4px 12px', fontSize: '12px', marginLeft: '12px' }} onClick={handleAddItem}>+ Add Item</button>
        </div>
        <div>
          {items.map((item) => (
            <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: '8px', marginBottom: '8px', alignItems: 'end' }}>
              <input type="text" placeholder="Item description *" style={{ padding: '8px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px' }} value={item.description} onChange={e => handleItemChange(item.id, 'description', e.target.value)} />
              <input type="number" placeholder="Qty" style={{ padding: '8px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px' }} value={item.quantity} onChange={e => handleItemChange(item.id, 'quantity', e.target.value)} />
              <input type="text" placeholder="Unit" style={{ padding: '8px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px' }} value={item.unit} onChange={e => handleItemChange(item.id, 'unit', e.target.value)} />
              <button onClick={() => handleRemoveItem(item.id)} style={{ padding: '8px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>✕</button>
            </div>
          ))}
        </div>

        {/* AI Vendor Discovery */}
        <div style={{ margin: '20px 0 8px', fontWeight: 700, fontSize: '14px', color: 'var(--primary)' }}>
          <i className="fa fa-robot"></i> AI Vendor Discovery
        </div>
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px 16px', marginBottom: '12px', fontSize: '13px', color: '#1d4ed8' }}>
          <i className="fa fa-info-circle"></i> System will automatically discover and assign the <strong>top 10 best-performing vendors</strong> tailored to the Category you select below.
        </div>
        <div className="form-group">
          <label>Procurement Category *</label>
          <select value={formData.target_category} onChange={e => setFormData({ ...formData, target_category: e.target.value })}>
            <option value="Electronic">Electronic</option>
            <option value="Mechanical">Mechanical</option>
            <option value="Both">Both (Electronic & Mechanical)</option>
          </select>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmit} disabled={isSubmitting}>
            <i className={`fa ${isSubmitting ? 'fa-spinner fa-spin' : 'fa-save'}`}></i> {isSubmitting ? 'Discovering...' : 'Create RFQ'}
          </button>
        </div>
      </Modal>

      {/* VIEW MODAL */}
      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title={`RFQ Details — ${selectedRFQ?.rfq_number || ''}`} iconClass="fa fa-file-alt" maxWidth="720px">
        {!selectedRFQ ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading details...</div>
        ) : (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '24px' }}>
              <div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Title</div><div style={{ fontWeight: 600, fontSize: '15px' }}>{selectedRFQ.title}</div></div>
              <div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Status</div><div>{renderBadge(selectedRFQ.status)}</div></div>
              <div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Procurement Category</div><div style={{ fontWeight: 500 }}>{selectedRFQ.category_id ? 'Matrix Comsec Managed Category' : (selectedRFQ.target_category || 'Mechanical/Electronic')}</div></div>
              <div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Created By</div><div style={{ fontWeight: 500 }}>{selectedRFQ.created_by || 'Procurement Team'}</div></div>
              <div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Issue Date</div><div style={{ fontWeight: 500 }}>{formatDate(selectedRFQ.issue_date)}</div></div>
              <div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Deadline</div><div style={{ fontWeight: 500, color: 'var(--danger)' }}>{formatDate(selectedRFQ.deadline)}</div></div>
              <div style={{ gridColumn: '1 / -1' }}><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Description</div><div style={{ fontSize: '14px', lineHeight: 1.5, background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>{selectedRFQ.description || 'No description provided.'}</div></div>
              <div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Estimated Value</div><div style={{ fontWeight: 600, color: 'var(--primary)' }}>{selectedRFQ.estimated_value ? formatINR(selectedRFQ.estimated_value) : 'Not specified'}</div></div>
            </div>
            <div>
              <h3 style={{ fontSize: '15px', marginBottom: '8px' }}><i className="fa fa-list"></i> Bill of Materials (Line Items)</h3>
              {(!selectedRFQ.items || selectedRFQ.items.length === 0) ? (
                <div style={{ padding: '16px', color: 'var(--text-muted)', fontStyle: 'italic' }}>No line items found.</div>
              ) : (
                <table className="data-table">
                  <thead><tr><th>Description</th><th style={{ textAlign: 'right' }}>Qty</th><th>Unit</th></tr></thead>
                  <tbody>
                    {selectedRFQ.items.map((i, idx) => (
                      <tr key={idx}><td>{i.description}</td><td style={{ textAlign: 'right' }}>{i.quantity}</td><td>{i.unit}</td></tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </>
        )}
      </Modal>

      {/* VENDOR DETAIL MODAL */}
      <Modal isOpen={isDetailModalOpen} onClose={() => setIsDetailModalOpen(false)} title={`Vendor Responses — ${selectedRFQ?.rfq_number || ''}`} iconClass="fa fa-users" maxWidth="720px">
        {!selectedRFQ ? (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>Loading...</div>
        ) : !selectedRFQ.vendors || selectedRFQ.vendors.length === 0 ? (
          <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#92400e' }}>
            <i className="fa fa-info-circle"></i> No vendors assigned yet.
          </div>
        ) : (
          <table className="data-table" style={{ fontSize: '13px' }}>
            <thead>
              <tr><th>Vendor Intelligence</th><th style={{ width: '100px' }}>AI Score</th><th>Contact Email</th><th>Status</th></tr>
            </thead>
            <tbody>
              {selectedRFQ.vendors.map(v => (
                <tr key={v.vendor_id}>
                  <td>
                    <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{v.vendor_name}</div>
                    <div style={{ fontSize: '11px', color: '#15803d', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span>Proven Volume: <strong>{v.history_count} orders</strong></span><span>·</span><span>{(v.ai_reasons || []).slice(0, 1).join('')}</span>
                    </div>
                    {(v.ai_flags && v.ai_flags.length > 0) && (
                      <div style={{ fontSize: '10px', color: '#b91c1c', marginTop: '2px' }}><i className="fa fa-triangle-exclamation"></i> {v.ai_flags[0]}</div>
                    )}
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '16px', fontWeight: 800, color: v.ai_score > 80 ? '#15803d' : v.ai_score > 60 ? '#b45309' : '#b91c1c' }}>{v.ai_score}</div>
                    <div style={{ fontSize: '9px', textTransform: 'uppercase', color: 'var(--text-muted)' }}>{v.recommendation || 'N/A'}</div>
                  </td>
                  <td style={{ fontSize: '12px' }}>{v.email}</td>
                  <td>
                    <span style={{ display: 'inline-flex', padding: '3px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 700, background: v.response_status === 'Responded' ? '#dcfce7' : '#fef3c7', color: v.response_status === 'Responded' ? '#15803d' : '#92400e' }}>{v.response_status || 'Pending'}</span>
                    <div style={{ fontSize: '9px', color: 'var(--text-muted)', marginTop: '2px' }}>Sent: {v.sent_at ? new Date(v.sent_at).toLocaleDateString() : '—'}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Modal>

      {/* SEND RESULT MODAL */}
      <Modal isOpen={isSendResultModalOpen} onClose={() => setIsSendResultModalOpen(false)} title="RFQ Sent — Vendor Portal Links" iconClass="fa fa-paper-plane" maxWidth="680px">
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '12px 16px', marginBottom: '16px', fontSize: '13px', color: '#1d4ed8' }}>
          <i className="fa fa-info-circle"></i> <strong>Email mode: Simulated.</strong> In production, vendors receive these links via email. You can share portal links directly for testing.
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {sendResultData.map(v => (
            <div key={v.vendor_name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', flexWrap: 'wrap', gap: '10px' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '14px' }}>{v.vendor_name}</div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{v.email}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <span style={{ padding: '3px 10px', borderRadius: '99px', fontSize: '11px', fontWeight: 700, background: '#eff6ff', color: '#1d4ed8' }}>{v.email_status}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '6px 12px' }}>
                  <a href={v.portal_link} target="_blank" rel="noreferrer" title={v.portal_link} style={{ fontSize: '12px', color: '#15803d', fontWeight: 600, textDecoration: 'none', maxWidth: '260px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>🔗 Open Portal</a>
                  <button onClick={() => copyLink(v.portal_link)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#15803d', fontSize: '13px', padding: '2px 6px' }}><i className="fa fa-copy"></i></button>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '20px', textAlign: 'right' }}>
          <button className="btn btn-primary" onClick={() => setIsSendResultModalOpen(false)}>
            <i className="fa fa-check"></i> Done
          </button>
        </div>
      </Modal>
    </>
  );
}
