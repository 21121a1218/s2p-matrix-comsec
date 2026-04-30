import React, { useState, useEffect } from 'react';
import { api, showToast, formatINR, formatDate } from '../services/api';
import Modal from '../components/Modal';
import SearchableSelect from '../components/SearchableSelect';
import { Link } from 'react-router-dom';

export default function PurchaseOrders() {
  const [pos, setPOs] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [stats, setStats] = useState({ draft: 0, l1: 0, l2: 0, approved: 0 });
  const [isLoading, setIsLoading] = useState(true);

  // Modals
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isApproveOpen, setIsApproveOpen] = useState(false);
  const [approveTarget, setApproveTarget] = useState({ id: null, level: '', num: '' });
  const [approverName, setApproverName] = useState('');

  // Create PO form
  const [form, setForm] = useState({
    vendor_id: '', po_date: new Date().toISOString().split('T')[0],
    delivery_date: '', payment_terms: '', incoterms: 'DAP — Gandhinagar',
    department: 'Procurement',
    delivery_address: 'Matrix Comsec — Stores\nPlot No. 12, Electronic Estate\nGandhinagar - 382 021, Gujarat',
    notes: ''
  });
  const [items, setItems] = useState([{ id: 1, item_code: '', description: '', quantity: 1, unit: 'PCS', unit_price: '', tax_percent: 18 }]);

  const loadPOs = async () => {
    setIsLoading(true);
    try {
      const [venData, poData] = await Promise.all([api.get('/vendors/?status=Approved'), api.get('/purchase-orders/')]);
      setVendors((venData.vendors || []).map(v => ({ value: String(v.id), label: `${v.vendor_code} — ${v.company_name}` })));
      const poList = poData.purchase_orders || [];
      setPOs(poList);
      const s = { draft: 0, l1: 0, l2: 0, approved: 0 };
      poList.forEach(p => {
        if (p.status === 'Draft') s.draft++;
        else if (p.status === 'Pending L1 Approval') s.l1++;
        else if (p.status === 'Pending L2 Approval') s.l2++;
        else if (['Approved', 'Sent to Vendor', 'Received', 'Closed'].includes(p.status)) s.approved++;
      });
      setStats(s);
    } catch (e) { showToast('Failed to load POs', 'error'); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { loadPOs(); }, []);

  const calcTotal = () => {
    return items.reduce((t, i) => t + (parseFloat(i.quantity) || 0) * (parseFloat(i.unit_price) || 0) * (1 + (parseFloat(i.tax_percent) || 0) / 100), 0);
  };

  const addItem = () => setItems([...items, { id: Date.now(), item_code: '', description: '', quantity: 1, unit: 'PCS', unit_price: '', tax_percent: 18 }]);
  const removeItem = (id) => setItems(items.filter(i => i.id !== id));
  const updateItem = (id, field, value) => setItems(items.map(i => i.id === id ? { ...i, [field]: value } : i));

  const handleSubmitPO = async () => {
    if (!form.vendor_id || !form.po_date) { showToast('Vendor and PO date required', 'error'); return; }
    const cleanItems = items.filter(i => i.description.trim()).map(i => ({
      item_code: i.item_code, description: i.description.trim(),
      quantity: parseFloat(i.quantity) || 1, unit: i.unit || 'PCS',
      unit_price: parseFloat(i.unit_price) || 0, tax_percent: parseFloat(i.tax_percent) || 18
    }));
    if (!cleanItems.length) { showToast('Add at least one item', 'error'); return; }
    try {
      const res = await api.post('/purchase-orders/', { ...form, vendor_id: parseInt(form.vendor_id), items: cleanItems });
      showToast(`✅ ${res.po_number} created!`, 'success');
      setIsCreateOpen(false);
      setForm({ vendor_id: '', po_date: new Date().toISOString().split('T')[0], delivery_date: '', payment_terms: '', incoterms: 'DAP — Gandhinagar', department: 'Procurement', delivery_address: 'Matrix Comsec — Stores\nPlot No. 12, Electronic Estate\nGandhinagar - 382 021, Gujarat', notes: '' });
      setItems([{ id: 1, item_code: '', description: '', quantity: 1, unit: 'PCS', unit_price: '', tax_percent: 18 }]);
      loadPOs();
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  };

  const handleSubmitForApproval = async (id, num) => {
    try { await api.post(`/purchase-orders/${id}/submit`); showToast(`${num} submitted for L1 approval`, 'info'); loadPOs(); }
    catch (e) { showToast(e.message, 'error'); }
  };

  const handleSendToVendor = async (id, num) => {
    if (!window.confirm(`Send PO ${num} to the vendor via email?`)) return;
    try {
      showToast('Sending email to vendor...', 'info');
      const res = await api.post(`/purchase-orders/${id}/send-to-vendor`);
      showToast(`✅ ${res.message} (${res.email_status})`, 'success');
      loadPOs();
    } catch (e) { showToast('Failed to send: ' + e.message, 'error'); }
  };

  const openApproveModal = (id, level, num) => { setApproveTarget({ id, level, num }); setApproverName(''); setIsApproveOpen(true); };

  const handleConfirmApprove = async () => {
    if (!approverName.trim()) { showToast('Enter approver name', 'error'); return; }
    try {
      const endpoint = approveTarget.level === 'L1'
        ? `/purchase-orders/${approveTarget.id}/approve-l1?approver=${encodeURIComponent(approverName)}`
        : `/purchase-orders/${approveTarget.id}/approve-l2?approver=${encodeURIComponent(approverName)}`;
      const res = await api.post(endpoint);
      showToast(`✅ ${res.message}`, 'success');
      setIsApproveOpen(false);
      loadPOs();
    } catch (e) { showToast(e.message, 'error'); }
  };

  const badge = (status) => {
    const cls = ['Approved', 'Closed', 'Sent to Vendor'].includes(status) ? 'badge-approved' :
                status === 'Draft' ? 'badge-pending' :
                ['Pending L1 Approval', 'Pending L2 Approval'].includes(status) ? 'badge-review' : 'badge-pending';
    return <span className={`badge ${cls}`}>{status}</span>;
  };

  const poTotal = calcTotal();

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button className="btn btn-primary" onClick={() => setIsCreateOpen(true)}><i className="fa fa-plus"></i> Create PO</button>
      </div>

      <div className="kpi-grid" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className="kpi-card blue"><div className="kpi-icon"><i className="fa fa-pencil"></i></div><div className="kpi-data"><span className="kpi-value">{stats.draft}</span><span className="kpi-label">Draft</span></div></div>
        <div className="kpi-card orange"><div className="kpi-icon"><i className="fa fa-user-check"></i></div><div className="kpi-data"><span className="kpi-value">{stats.l1}</span><span className="kpi-label">Awaiting L1</span></div></div>
        <div className="kpi-card purple"><div className="kpi-icon"><i className="fa fa-user-shield"></i></div><div className="kpi-data"><span className="kpi-value">{stats.l2}</span><span className="kpi-label">Awaiting L2</span></div></div>
        <div className="kpi-card green"><div className="kpi-icon"><i className="fa fa-check-double"></i></div><div className="kpi-data"><span className="kpi-value">{stats.approved}</span><span className="kpi-label">Approved</span></div></div>
      </div>

      <div className="card">
        <div className="card-header"><i className="fa fa-shopping-cart"></i> All Purchase Orders</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead><tr><th>PO No.</th><th>Vendor</th><th>PO Date</th><th>Delivery Date</th><th>Total (INR)</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {isLoading ? <tr><td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Loading...</td></tr>
               : pos.length === 0 ? <tr><td colSpan="7"><div className="empty-state"><i className="fa fa-shopping-cart"></i><p>No Purchase Orders yet</p></div></td></tr>
               : pos.map(p => (
                <tr key={p.id}>
                  <td><strong>{p.po_number}</strong>{p.quotation_id && <><br/><span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>Auto-Generated</span></>}</td>
                  <td>Vendor #{p.vendor_id}</td>
                  <td>{formatDate(p.po_date)}</td>
                  <td>{formatDate(p.delivery_date)}</td>
                  <td><strong>{formatINR(p.total_amount)}</strong></td>
                  <td>{badge(p.status)}</td>
                  <td style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '12px', color: '#0f766e', borderColor: '#0f766e' }} onClick={() => handleSendToVendor(p.id, p.po_number)}>
                      <i className="fa fa-paper-plane"></i> Send to Vendor
                    </button>
                    {p.status === 'Draft' && <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => handleSubmitForApproval(p.id, p.po_number)}>Submit for Approval</button>}
                    {p.status === 'Pending L1 Approval' && <button className="btn btn-success" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => openApproveModal(p.id, 'L1', p.po_number)}>L1 Approve</button>}
                    {p.status === 'Pending L2 Approval' && <button className="btn btn-success" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={() => openApproveModal(p.id, 'L2', p.po_number)}>L2 Approve</button>}
                    {['Approved', 'Sent to Vendor', 'Received'].includes(p.status) && <Link to="/grn" className="btn btn-primary" style={{ padding: '4px 10px', fontSize: '12px', textDecoration: 'none' }}><i className="fa fa-truck-loading"></i> Receive</Link>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE PO MODAL */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Purchase Order" iconClass="fa fa-shopping-cart" maxWidth="760px">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="form-group"><label>Vendor *</label><SearchableSelect options={vendors} value={form.vendor_id} onChange={val => setForm(f => ({ ...f, vendor_id: val }))} placeholder="Select Vendor" /></div>
          <div className="form-group"><label>Payment Terms</label><input type="text" placeholder="e.g. 30 days net" value={form.payment_terms} onChange={e => setForm(f => ({ ...f, payment_terms: e.target.value }))} /></div>
          <div className="form-group"><label>PO Date *</label><input type="date" value={form.po_date} onChange={e => setForm(f => ({ ...f, po_date: e.target.value }))} /></div>
          <div className="form-group"><label>Expected Delivery Date</label><input type="date" value={form.delivery_date} onChange={e => setForm(f => ({ ...f, delivery_date: e.target.value }))} /></div>
          <div className="form-group"><label>Incoterms</label><input type="text" value={form.incoterms} onChange={e => setForm(f => ({ ...f, incoterms: e.target.value }))} /></div>
          <div className="form-group"><label>Department</label><input type="text" value={form.department} onChange={e => setForm(f => ({ ...f, department: e.target.value }))} /></div>
          <div className="form-group"><label>Delivery Address</label><textarea rows="2" value={form.delivery_address} onChange={e => setForm(f => ({ ...f, delivery_address: e.target.value }))}></textarea></div>
          <div className="form-group"><label>Notes / Terms</label><textarea rows="2" placeholder="Special conditions, warranty..." value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}></textarea></div>
        </div>

        <div style={{ margin: '16px 0 8px', fontWeight: 700, fontSize: '14px' }}>
          <i className="fa fa-list"></i> Line Items
          <button type="button" className="btn btn-outline" style={{ padding: '4px 12px', fontSize: '12px', marginLeft: '12px' }} onClick={addItem}>+ Add Item</button>
        </div>
        {items.map(item => (
          <div key={item.id} style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 0.8fr 0.8fr 1fr 0.8fr auto', gap: '8px', marginBottom: '8px', alignItems: 'end' }}>
            {['item_code', 'description', 'quantity', 'unit', 'unit_price', 'tax_percent'].map((field, fi) => (
              <input key={fi} type={['quantity', 'unit_price', 'tax_percent'].includes(field) ? 'number' : 'text'}
                placeholder={{ item_code: 'Item Code', description: 'Description *', quantity: 'Qty', unit: 'Unit', unit_price: 'Unit Price', tax_percent: 'GST %' }[field]}
                style={{ padding: '8px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '13px' }}
                value={item[field]} onChange={e => updateItem(item.id, field, e.target.value)} />
            ))}
            <button onClick={() => removeItem(item.id)} style={{ padding: '8px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>✕</button>
          </div>
        ))}
        {poTotal > 0 && <div style={{ textAlign: 'right', fontWeight: 700, fontSize: '16px', color: 'var(--primary)' }}>Total: {formatINR(poTotal)}</div>}

        <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={() => setIsCreateOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmitPO}><i className="fa fa-save"></i> Create PO</button>
        </div>
      </Modal>

      {/* APPROVE MODAL */}
      <Modal isOpen={isApproveOpen} onClose={() => setIsApproveOpen(false)} title={`${approveTarget.level} Approve — ${approveTarget.num}`} iconClass="fa fa-check" maxWidth="400px">
        <div className="form-group"><label>Approver Name *</label><input type="text" placeholder="Your name" value={approverName} onChange={e => setApproverName(e.target.value)} /></div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={() => setIsApproveOpen(false)}>Cancel</button>
          <button className="btn btn-success" onClick={handleConfirmApprove}><i className="fa fa-check"></i> Approve</button>
        </div>
      </Modal>
    </>
  );
}
