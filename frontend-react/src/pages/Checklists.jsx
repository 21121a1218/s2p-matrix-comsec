import React, { useState, useEffect } from 'react';
import { api, showToast, formatDate } from '../services/api';
import Modal from '../components/Modal';

export default function Checklists() {
  const [checklists, setChecklists] = useState([]);
  const [overdue, setOverdue] = useState({ count: 0, show: false });
  const [isLoading, setIsLoading] = useState(true);

  // Create checklist modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [clForm, setCLForm] = useState({ name: '', category: 'Electronic', review_months: 3 });
  const [clItems, setCLItems] = useState([{ id: 1, text: '', mandatory: true }]);

  // Add item modal
  const [isAddItemOpen, setIsAddItemOpen] = useState(false);
  const [addItemTarget, setAddItemTarget] = useState(null);
  const [addItemText, setAddItemText] = useState('');
  const [addItemMandatory, setAddItemMandatory] = useState(true);

  const loadChecklists = async () => {
    setIsLoading(true);
    try {
      const data = await api.get('/checklists/');
      setChecklists(data.checklists || []);
    } catch (e) { showToast('Failed to load checklists: ' + e.message, 'error'); }
    finally { setIsLoading(false); }

    try {
      const od = await api.get('/checklists/overdue');
      setOverdue({ count: od.overdue_count || 0, show: (od.overdue_count || 0) > 0 });
    } catch (e) {}
  };

  useEffect(() => { loadChecklists(); }, []);

  const addCLItem = () => setCLItems(prev => [...prev, { id: Date.now(), text: '', mandatory: true }]);
  const removeCLItem = (id) => setCLItems(prev => prev.filter(i => i.id !== id));
  const updateCLItem = (id, field, value) => setCLItems(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));

  const openCreate = () => {
    setCLForm({ name: '', category: 'Electronic', review_months: 3 });
    setCLItems([{ id: 1, text: '', mandatory: true }]);
    setIsCreateOpen(true);
  };

  const handleSubmitChecklist = async () => {
    if (!clForm.name.trim()) { showToast('Checklist name required', 'error'); return; }
    const items = clItems.filter(i => i.text.trim()).map((i, idx) => ({ item_text: i.text.trim(), is_mandatory: i.mandatory, sort_order: idx }));
    try {
      await api.post('/checklists/', { name: clForm.name, category: clForm.category, review_months: parseInt(clForm.review_months), items });
      showToast('✅ Checklist created!', 'success');
      setIsCreateOpen(false);
      loadChecklists();
    } catch (e) { showToast('Error: ' + e.message, 'error'); }
  };

  const openAddItem = (clId) => { setAddItemTarget(clId); setAddItemText(''); setAddItemMandatory(true); setIsAddItemOpen(true); };

  const handleAddItem = async () => {
    if (!addItemText.trim()) { showToast('Item text required', 'error'); return; }
    try {
      await api.post(`/checklists/${addItemTarget}/items`, { item_text: addItemText.trim(), is_mandatory: addItemMandatory, sort_order: 99 });
      showToast('✅ Item added!', 'success');
      setIsAddItemOpen(false);
      loadChecklists();
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleDeleteItem = async (clId, itemId) => {
    if (!window.confirm('Remove this item?')) return;
    try {
      await api.delete(`/checklists/${clId}/items/${itemId}`);
      showToast('Item removed', 'info');
      loadChecklists();
    } catch (e) { showToast(e.message, 'error'); }
  };

  const handleMarkReviewed = async (id, name, reviewMonths) => {
    if (!window.confirm(`Mark "${name}" as reviewed? This resets the review cycle.`)) return;
    try {
      const res = await api.post(`/checklists/${id}/review?review_months=${reviewMonths}`);
      showToast(`✅ Reviewed! ${res.message}`, 'success');
      loadChecklists();
    } catch (e) { showToast(e.message, 'error'); }
  };

  const getCategoryStyle = (cat) => {
    const styles = {
      Electronic: { background: '#dbeafe', color: '#1e40af' },
      Mechanical: { background: '#fef9c3', color: '#854d0e' },
      General:    { background: '#f0fdf4', color: '#166534' }
    };
    return styles[cat] || styles.General;
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '16px' }}>
        <button className="btn btn-primary" onClick={openCreate}><i className="fa fa-plus"></i> New Checklist</button>
      </div>

      {/* Overdue Alert */}
      {overdue.show && (
        <div style={{ display: 'flex', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '12px', padding: '16px 20px', alignItems: 'center', gap: '12px', marginBottom: '24px' }}>
          <i className="fa fa-exclamation-triangle" style={{ color: 'var(--red)', fontSize: '20px' }}></i>
          <div>
            <strong style={{ color: 'var(--red)' }}>Review Overdue!</strong>
            <span style={{ fontSize: '14px', color: 'var(--text-muted)', marginLeft: '8px' }}>{overdue.count} checklist(s) are overdue for review!</span>
          </div>
        </div>
      )}

      {/* Checklist Grid */}
      {isLoading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>Loading...</div>
      ) : checklists.length === 0 ? (
        <div className="empty-state"><i className="fa fa-tasks"></i><p>No checklists yet. Create your first one!</p></div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(480px, 1fr))', gap: '20px' }}>
          {checklists.map(cl => (
            <div key={cl.id} className="card" style={{ border: cl.review_overdue ? '2px solid var(--orange)' : undefined }}>
              <div className="card-header" style={{ justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ ...getCategoryStyle(cl.category), padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>{cl.category}</span>
                  {cl.review_overdue && <span style={{ background: '#fef2f2', color: 'var(--red)', padding: '3px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 700 }}>⚠️ REVIEW OVERDUE</span>}
                </div>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>v{cl.version}</span>
              </div>

              <div style={{ padding: '16px 20px' }}>
                <div style={{ fontSize: '16px', fontWeight: 700, marginBottom: '8px' }}>{cl.name}</div>
                <div style={{ display: 'flex', gap: '16px', fontSize: '13px', color: 'var(--text-muted)', marginBottom: '16px' }}>
                  <span><i className="fa fa-list"></i> {cl.total_items} items ({cl.mandatory} mandatory)</span>
                  <span><i className="fa fa-calendar"></i> Next review: <strong style={{ color: cl.review_overdue ? 'var(--red)' : 'var(--text-dark)' }}>{formatDate(cl.next_review)}</strong></span>
                </div>

                {/* Items list */}
                <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '12px', marginBottom: '12px', maxHeight: '200px', overflowY: 'auto' }}>
                  {(cl.items || []).map((item, i) => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', marginBottom: '8px' }}>
                      <span style={{ width: '20px', height: '20px', borderRadius: '50%', background: item.mandatory ? 'var(--primary)' : 'var(--text-muted)', color: 'white', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '1px' }}>{i + 1}</span>
                      <div style={{ flex: 1, fontSize: '13px' }}>
                        {item.text || item.item_text}
                        {item.mandatory && <span style={{ color: 'var(--red)', fontSize: '10px', marginLeft: '4px' }}>*</span>}
                      </div>
                      <button onClick={() => handleDeleteItem(cl.id, item.id)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '12px' }} title="Remove item">✕</button>
                    </div>
                  ))}
                  {(!cl.items || cl.items.length === 0) && <div style={{ color: 'var(--text-muted)', fontSize: '13px', textAlign: 'center' }}>No items yet.</div>}
                </div>

                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                  <button className="btn btn-outline" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => openAddItem(cl.id)}><i className="fa fa-plus"></i> Add Item</button>
                  <button className="btn btn-success" style={{ padding: '6px 12px', fontSize: '13px' }} onClick={() => handleMarkReviewed(cl.id, cl.name, cl.review_months)}><i className="fa fa-check"></i> Mark Reviewed</button>
                  {cl.review_overdue && <span style={{ fontSize: '12px', color: 'var(--red)', alignSelf: 'center' }}>⚠️ Overdue! Please review now.</span>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE MODAL */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="New Checklist" iconClass="fa fa-tasks" maxWidth="600px">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
          <div className="form-group"><label>Checklist Name *</label><input type="text" placeholder="e.g. Q2 Electronic Components Checklist" value={clForm.name} onChange={e => setCLForm(f => ({ ...f, name: e.target.value }))} /></div>
          <div className="form-group"><label>Category *</label>
            <select value={clForm.category} onChange={e => setCLForm(f => ({ ...f, category: e.target.value }))}>
              <option value="Electronic">Electronic</option><option value="Mechanical">Mechanical</option><option value="General">General</option>
            </select>
          </div>
        </div>
        <div className="form-group"><label>Review Cycle (months)</label>
          <select value={clForm.review_months} onChange={e => setCLForm(f => ({ ...f, review_months: e.target.value }))}>
            <option value="1">Monthly</option><option value="3">Quarterly (Recommended)</option><option value="6">Half-Yearly</option><option value="12">Annual</option>
          </select>
        </div>
        <div style={{ margin: '16px 0 8px', fontWeight: 700, fontSize: '14px' }}>
          <i className="fa fa-list"></i> Checklist Items
          <button type="button" className="btn btn-outline" style={{ padding: '4px 12px', fontSize: '12px', marginLeft: '12px' }} onClick={addCLItem}>+ Add Item</button>
        </div>
        {clItems.map(item => (
          <div key={item.id} style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'center' }}>
            <input type="text" className="cl-item-text" placeholder="Checklist item..." style={{ flex: 1, padding: '8px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px' }} value={item.text} onChange={e => updateCLItem(item.id, 'text', e.target.value)} />
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', whiteSpace: 'nowrap' }}>
              <input type="checkbox" checked={item.mandatory} onChange={e => updateCLItem(item.id, 'mandatory', e.target.checked)} /> Mandatory
            </label>
            <button onClick={() => removeCLItem(item.id)} style={{ padding: '6px 10px', background: 'var(--red)', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer' }}>✕</button>
          </div>
        ))}
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={() => setIsCreateOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSubmitChecklist}><i className="fa fa-save"></i> Create</button>
        </div>
      </Modal>

      {/* ADD ITEM MODAL */}
      <Modal isOpen={isAddItemOpen} onClose={() => setIsAddItemOpen(false)} title="Add Checklist Item" iconClass="fa fa-plus" maxWidth="440px">
        <div className="form-group"><label>Item Text *</label><textarea rows="3" placeholder="e.g. Verify OEM approval certificate is not expired" value={addItemText} onChange={e => setAddItemText(e.target.value)}></textarea></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <input type="checkbox" id="add-mandatory" checked={addItemMandatory} onChange={e => setAddItemMandatory(e.target.checked)} style={{ width: '16px', height: '16px' }} />
          <label htmlFor="add-mandatory" style={{ fontSize: '14px', fontWeight: 600 }}>Mandatory Item</label>
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={() => setIsAddItemOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddItem}><i className="fa fa-plus"></i> Add</button>
        </div>
      </Modal>
    </>
  );
}
