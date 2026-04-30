import React, { useState, useEffect, useMemo, useContext } from 'react';
import { TopbarActionContext } from '../components/Layout';
import { api, showToast, formatINR, formatDate } from '../services/api';
import StatCard from '../components/StatCard';
import Modal from '../components/Modal';
import SearchableSelect from '../components/SearchableSelect';

export default function Payments() {
  const registerTopbarAction = useContext(TopbarActionContext);
  const [payments, setPayments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState('');

  // Modal & Form state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [invoiceOptions, setInvoiceOptions] = useState([]);
  const [vendorOptions, setVendorOptions] = useState([]);
  
  const [formData, setFormData] = useState({
    invoice_id: '',
    vendor_id: '',
    amount: '',
    payment_mode: 'NEFT',
    payment_date: new Date().toISOString().split('T')[0],
    bank_reference: ''
  });

  // Load Data
  const loadPayments = async () => {
    try {
      setIsLoading(true);
      const data = await api.get("/invoices/payments/");
      setPayments(data.payments || []);
    } catch (e) {
      showToast("Failed to sync payments", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const loadDropdowns = async () => {
    try {
      const invData = await api.get("/invoices/");
      const venData = await api.get("/vendors/");
      
      const invoices = invData.invoices
        .filter(i => i.payment_status !== 'Paid')
        .map(i => ({
          value: String(i.id),
          label: `${i.invoice_number || i.internal_ref} — ${formatINR(i.total_amount)}`
        }));
        
      const vendors = venData.vendors.map(v => ({
        value: String(v.id),
        label: `${v.vendor_code} — ${v.company_name}`
      }));

      setInvoiceOptions(invoices);
      setVendorOptions(vendors);
    } catch (e) {
      console.error("Dropdown load failed", e);
    }
  };

  useEffect(() => {
    loadPayments();
    loadDropdowns();
  }, []);

  // Register topbar button to match legacy HTML topbar-right placement
  useEffect(() => {
    registerTopbarAction(
      <button
        onClick={() => setIsModalOpen(true)}
        style={{ background: 'var(--primary-gradient)', border: 'none', padding: '10px 22px', borderRadius: '10px', fontWeight: 600, boxShadow: '0 4px 12px rgba(59,130,246,0.35)', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}
      >
        <i className="fa fa-plus-circle"></i> Record Payment
      </button>
    );
  }, []);

  // Stats calculation
  const totalPaid = payments.reduce((acc, p) => acc + parseFloat(p.amount), 0);
  const settledCount = payments.length;
  const pendingRuns = Math.floor(payments.length / 4); // Mock stat

  // Filtering
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const matchesSearch = p.payment_ref.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            (p.vendor_name && p.vendor_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                            String(p.invoice_id).includes(searchTerm);
      const matchesMode = !filterMode || p.payment_mode === filterMode;
      return matchesSearch && matchesMode;
    });
  }, [payments, searchTerm, filterMode]);

  // Submit Handler
  const handleSubmit = async () => {
    if (!formData.invoice_id || !formData.vendor_id || !formData.amount || !formData.payment_date) {
      showToast("Missing required transaction data", "error");
      return;
    }

    try {
      const res = await api.post("/invoices/payments/", {
        invoice_id: parseInt(formData.invoice_id),
        vendor_id: parseInt(formData.vendor_id),
        amount: parseFloat(formData.amount),
        payment_mode: formData.payment_mode,
        payment_date: formData.payment_date,
        bank_reference: formData.bank_reference || null
      });
      showToast(`✅ Payment ${res.payment.payment_ref} settled successfully`, "success");
      setIsModalOpen(false);
      setFormData(prev => ({ ...prev, amount: '', bank_reference: '', invoice_id: '', vendor_id: '' }));
      loadPayments();
      loadDropdowns(); // Refresh pending invoices
    } catch (e) {
      showToast("Settle failed: " + e.message, "error");
    }
  };

  return (
    <>
      <div className="stats-container">
        <StatCard title="Total Disbursed" value={formatINR(totalPaid)} iconClass="fa fa-receipt" colorClass="blue" />
        <StatCard title="Settled Invoices" value={settledCount} iconClass="fa fa-check-double" colorClass="green" />
        <StatCard title="Pending Runs" value={pendingRuns} iconClass="fa fa-clock" colorClass="orange" />
      </div>

      <div className="search-filter-bar">
        <div className="search-wrapper">
          <i className="fa fa-search"></i>
          <input 
            type="text" 
            className="search-input" 
            placeholder="Search by payment ref, invoice or vendor..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="search-input" 
          style={{ width: 'auto' }} 
          value={filterMode}
          onChange={(e) => setFilterMode(e.target.value)}
        >
          <option value="">All Modes</option>
          <option value="NEFT">NEFT</option>
          <option value="RTGS">RTGS</option>
          <option value="UPI">UPI</option>
          <option value="Cheque">Cheque</option>
        </select>
      </div>

      <div className="payment-table-card">
        <div style={{ overflowX: 'auto' }}>
          <table className="payment-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th>Reference</th>
                <th>Invoice</th>
                <th>Amount (INR)</th>
                <th>Vendor</th>
                <th>Mode</th>
                <th>Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '50px', color: '#94a3b8' }}>
                    <i className="fa fa-spinner fa-spin fa-2x"></i><br/><br/>Analyzing payment records...
                  </td>
                </tr>
              ) : filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: 'center', padding: '60px' }}>
                    <div style={{ color: '#94a3b8' }}>
                      <i className="fa fa-folder-open fa-3x"></i>
                      <p style={{ marginTop: '10px', fontWeight: 500 }}>No transactions found</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredPayments.map(p => (
                  <tr key={p.id}>
                    <td><span style={{ fontWeight: 700, color: '#1e293b' }}>{p.payment_ref}</span></td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#3b82f6' }}>INV #{p.invoice_id}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>Ref: {p.invoice_ref || 'INTERNAL'}</div>
                    </td>
                    <td><strong style={{ color: '#16a34a', fontSize: '15px' }}>{formatINR(p.amount)}</strong></td>
                    <td>
                      <div style={{ fontWeight: 600, color: '#1e293b' }}>{p.vendor_name || 'Vendor #' + p.vendor_id}</div>
                      <div style={{ fontSize: '11px', color: '#94a3b8' }}>Code: VEN-{String(p.vendor_id).padStart(4, '0')}</div>
                    </td>
                    <td><span style={{ padding: '4px 8px', background: '#f1f5f9', borderRadius: '6px', fontSize: '11px', fontWeight: 700 }}>{p.payment_mode}</span></td>
                    <td><span style={{ color: '#64748b' }}>{formatDate(p.payment_date)}</span></td>
                    <td><span className={`badge-premium badge-${p.status.toLowerCase()}`}>{p.status}</span></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Record Transaction" 
        iconClass="fa fa-money-bill-wave"
      >
        <div className="responsive-form-row">
          <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Invoice Reference *</label>
            <SearchableSelect 
              options={invoiceOptions}
              value={formData.invoice_id}
              onChange={(val) => setFormData(prev => ({ ...prev, invoice_id: val }))}
              placeholder="Select Pending Invoice"
            />
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Select Vendor *</label>
            <SearchableSelect 
              options={vendorOptions}
              value={formData.vendor_id}
              onChange={(val) => setFormData(prev => ({ ...prev, vendor_id: val }))}
              placeholder="Select Payee Vendor"
            />
          </div>
        </div>

        <div className="responsive-form-row">
          <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Payment Amount (INR) *</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontWeight: 600 }}>₹</span>
              <input 
                type="number" 
                placeholder="0.00" 
                style={{ width: '100%', padding: '10px 12px 10px 28px', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 600, boxSizing: 'border-box' }}
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              />
            </div>
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Transfer Mode</label>
            <select 
              className="search-input" 
              style={{ padding: '10px 12px', width: '100%', boxSizing: 'border-box' }}
              value={formData.payment_mode}
              onChange={(e) => setFormData(prev => ({ ...prev, payment_mode: e.target.value }))}
            >
              <option value="NEFT">NEFT / Bank Transfer</option>
              <option value="RTGS">RTGS (High Value)</option>
              <option value="UPI">UPI / Instant</option>
              <option value="IMPS">IMPS</option>
              <option value="Cheque">Manual Cheque</option>
            </select>
          </div>
        </div>

        <div className="responsive-form-row">
          <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Execution Date *</label>
            <input 
              type="date" 
              className="search-input" 
              style={{ padding: '10px 12px', width: '100%', boxSizing: 'border-box' }}
              value={formData.payment_date}
              onChange={(e) => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
            />
          </div>
          <div className="form-group" style={{ flex: 1, minWidth: '200px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '8px' }}>Bank Reference / UTR</label>
            <input 
              type="text" 
              placeholder="e.g. UTR-987654321" 
              className="search-input" 
              style={{ padding: '10px 12px', width: '100%', boxSizing: 'border-box' }}
              value={formData.bank_reference}
              onChange={(e) => setFormData(prev => ({ ...prev, bank_reference: e.target.value }))}
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', marginTop: '10px', justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={() => setIsModalOpen(false)} style={{ borderRadius: '10px', padding: '12px 24px' }}>Discard</button>
          <button className="btn btn-primary" onClick={handleSubmit} style={{ background: 'var(--primary-gradient)', border: 'none', borderRadius: '10px', padding: '12px 24px', fontWeight: 600 }}>
            Confirm & Settle
          </button>
        </div>
      </Modal>
    </>
  );
}
