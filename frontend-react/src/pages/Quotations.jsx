import React, { useState, useEffect } from 'react';
import { api, showToast, formatINR } from '../services/api';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

export default function Quotations() {
  const [searchParams] = useSearchParams();
  const initialRfqId = searchParams.get('rfq') || '';
  
  const navigate = useNavigate();

  const [rfqOptions, setRfqOptions] = useState([]);
  const [quotations, setQuotations] = useState([]);
  const [selectedRfqId, setSelectedRfqId] = useState(initialRfqId);
  const [comparisonData, setComparisonData] = useState(null);
  
  const [isLoadingQuotations, setIsLoadingQuotations] = useState(true);
  const [isComparing, setIsComparing] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const rfqData = await api.get('/rfq/');
        setRfqOptions(rfqData.rfqs || []);
      } catch (e) {
        console.error("Failed to load RFQs");
      }
      loadQuotations();
    };
    init();
  }, []);

  // If a URL parameter is passed, we might want to automatically trigger a comparison, but let's wait for user interaction to run the heavy ML model.

  const loadQuotations = async () => {
    setIsLoadingQuotations(true);
    try {
      const data = await api.get('/quotations/');
      setQuotations(data.quotations || []);
    } catch (e) {
      showToast('Failed to load quotations', 'error');
    } finally {
      setIsLoadingQuotations(false);
    }
  };

  const handleCompare = async () => {
    if (!selectedRfqId) {
      showToast('Please select an RFQ', 'error');
      return;
    }

    setIsComparing(true);
    try {
      const data = await api.get(`/quotations/compare/${selectedRfqId}?strategy=best_value`);
      setComparisonData(data);
      // Refresh the table below because the backend marks one as Recommended
      loadQuotations();
    } catch (e) {
      showToast('No quotations found for this RFQ', 'error');
      setComparisonData(null);
    } finally {
      setIsComparing(false);
    }
  };

  const handleGeneratePO = async (quotationId) => {
    if (!quotationId) { showToast('No quotation ID found', 'error'); return; }
    if (!window.confirm('Generate a Purchase Order from this quotation? The quotation will be marked as Selected.')) return;
    
    try {
      showToast('Generating Purchase Order...', 'info');
      const data = await api.post(`/purchase-orders/generate-from-quotation/${quotationId}`, {});
      if (data.existing) {
         showToast(`PO ${data.po_number} already exists! Redirecting...`, 'info');
      } else {
         showToast(`${data.po_number} created successfully!`, 'success');
      }
      setTimeout(() => {
        navigate('/purchase-orders');
      }, 1200);
    } catch (e) {
      showToast('Failed to generate PO. Check if quotation has line items.', 'error');
    }
  };

  const ScoreBar = ({ val, color }) => {
    const pct = Math.min(100, Math.max(0, val || 0));
    const bgColor = color === 'blue' ? '#3b82f6' : color === 'green' ? '#22c55e' : color === 'purple' ? '#8b5cf6' : '#f59e0b';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: '90px' }}>
        <div style={{ background: 'var(--border, #e2e8f0)', borderRadius: '4px', height: '7px', width: '56px', overflow: 'hidden', flexShrink: 0 }}>
          <div style={{ background: bgColor, height: '100%', width: `${pct}%`, borderRadius: '4px', transition: 'width .4s ease' }}></div>
        </div>
        <span style={{ fontSize: '12px', fontWeight: 600 }}>{val || 0}</span>
      </div>
    );
  };

  const getScoreColor = (v) => {
    return v >= 70 ? '#16a34a' : v >= 50 ? '#d97706' : '#ef4444';
  };

  const renderBadge = (status) => {
    const cls = status === 'Selected' ? 'badge-approved' : 
                status === 'Rejected' ? 'badge-rejected' : 'badge-pending';
    return <span className={`badge ${cls}`}>{status}</span>;
  };

  return (
    <>
      {/* Compare Controls */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header"><i className="fa fa-balance-scale"></i> Compare Quotations by RFQ</div>
        <div className="card-body" style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          <select 
            value={selectedRfqId}
            onChange={(e) => setSelectedRfqId(e.target.value)}
            style={{ padding: '9px 14px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px', flex: 1, minWidth: '220px' }}
          >
            <option value="">-- Select RFQ to compare --</option>
            {rfqOptions.map(r => (
              <option key={r.id} value={r.id}>{r.rfq_number} — {r.title}</option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={handleCompare} disabled={isComparing}>
            <i className={`fa ${isComparing ? 'fa-spinner fa-spin' : 'fa-play'}`}></i> {isComparing ? 'Running ML...' : 'Run Random Forest ML Prediction'}
          </button>
        </div>
        <div className="card-body" style={{ paddingTop: 0, paddingBottom: '8px' }}>
          <small style={{ color: 'var(--text-muted)', fontSize: '11px' }}>
            <i className="fa fa-robot"></i> <strong>Predictive ML Pipeline Active</strong>: This tool passes quotation features (price variance, past performance, delivery speed, OEM status) through the Random Forest model to predict the math-driven probability of on-time & high-quality fulfillment.
          </small>
        </div>
      </div>

      {/* Comparison Results */}
      {comparisonData && (
        <>
          <div style={{ display: 'flex', background: 'linear-gradient(135deg,#f0fdf4,#ecfdf5)', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '14px 20px', marginBottom: '16px', gap: '24px', flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ fontSize: '22px' }}>💰</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '.5px' }}>Strategy</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#2563eb' }}>Best Value</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '.5px' }}>Quotes Compared</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#2563eb' }}>{comparisonData.total_quotes || '—'}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '.5px' }}>Price Range</div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#374151' }}>
                {comparisonData.price_range?.lowest ? `${formatINR(comparisonData.price_range.lowest)} – ${formatINR(comparisonData.price_range.highest)}` : '—'}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '.5px' }}>Savings vs Highest Quote</div>
              <div style={{ fontSize: '18px', fontWeight: 800, color: '#16a34a' }}>
                {comparisonData.savings_vs_highest ? formatINR(comparisonData.savings_vs_highest) : '₹0'}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', color: '#6b7280', letterSpacing: '.5px' }}>Spread</div>
              <div style={{ fontSize: '13px', fontWeight: 800, color: '#374151' }}>
                {comparisonData.price_range?.spread_pct != null ? `${comparisonData.price_range.spread_pct}% price spread` : '—'}
              </div>
            </div>
          </div>

          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header"><i className="fa fa-trophy" style={{ color: 'gold' }}></i> Comparison Result</div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Rank</th><th>Quotation</th><th>Vendor</th><th>Total (INR)</th><th>Delivery</th><th>Warranty</th>
                    <th title="Price competitiveness (0-100)">Price Score</th>
                    <th title="Faster delivery = higher score (0-100)">Delivery Score</th>
                    <th title="Warranty coverage score (0-100)">Perf Score</th>
                    <th title="Probability of successful fulfillment based on ML Model">ML Success Prob.</th>
                    <th>ML Reasoning Output</th><th>Recommendation</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.comparison.map((q, i) => (
                    <tr key={i} style={q.recommended ? { background: 'rgba(34,197,94,.06)', borderLeft: '3px solid #22c55e' } : {}}>
                      <td>
                        {i === 0 ? <span style={{ fontSize: '20px' }} title="1st">🥇</span> :
                         i === 1 ? <span style={{ fontSize: '20px' }} title="2nd">🥈</span> :
                         i === 2 ? <span style={{ fontSize: '20px' }} title="3rd">🥉</span> :
                         <span style={{ color: 'var(--text-muted)' }}>#{i + 1}</span>}
                      </td>
                      <td><strong>{q.quotation_number}</strong></td>
                      <td>
                        <div style={{ fontWeight: 600, fontSize: '13px' }}>{q.vendor_name || 'Vendor #' + q.vendor_id}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                          {q.vendor_type || ''} {q.oem_approved && <span style={{ color: '#d97706' }}>· 🏅 OEM</span>}
                        </div>
                      </td>
                      <td><strong>{formatINR(q.total_amount)}</strong></td>
                      <td>{q.delivery_days != null ? q.delivery_days + ' days' : '—'}</td>
                      <td>{q.warranty_months != null ? q.warranty_months + ' mo' : '—'}</td>
                      <td><ScoreBar val={q.price_score} color="blue" /></td>
                      <td><ScoreBar val={q.delivery_score} color="green" /></td>
                      <td><ScoreBar val={q.performance_score ?? q.warranty_score} color="purple" /></td>
                      <td>
                        <span style={{ fontSize: '16px', fontWeight: 800, color: getScoreColor(q.ai_score ?? q.total_score) }}>
                          {(q.ai_score ?? q.total_score).toFixed(1)}%
                        </span>
                      </td>
                      <td>
                        <div style={{ fontSize: '11px', color: '#6b7280', maxWidth: '260px', lineHeight: 1.5, whiteSpace: 'normal' }}>
                          {(q.reasoning || '').split(' | ').slice(0, 2).map((r, idx) => <div key={idx}>{r}</div>)}
                        </div>
                      </td>
                      <td>
                        {q.recommended ? <span style={{ color: 'var(--green)', fontWeight: 700, whiteSpace: 'nowrap' }}>✅ Recommended</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <Link 
                          to={`/negotiations?vendor_id=${q.vendor_id || 0}&initial_price=${q.total_amount || 0}&rfq_id=${selectedRfqId}&subject=Negotiation for ${q.quotation_number || 'Quote'}`}
                          className="btn btn-outline" style={{ padding: '4px 8px', fontSize: '11px', marginBottom: '4px', display: 'inline-block', textDecoration: 'none' }}
                        >
                          <i className="fa fa-handshake"></i> Negotiate
                        </Link>
                        {q.quotation_id && (
                          <button 
                            className="btn btn-success" 
                            style={{ padding: '4px 8px', fontSize: '11px', background: '#0f766e', borderColor: '#0f766e', marginLeft: '4px' }}
                            onClick={() => handleGeneratePO(q.quotation_id)}
                          >
                            <i className="fa fa-file-invoice"></i> Generate PO
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* All Quotations */}
      <div className="card">
        <div className="card-header"><i className="fa fa-list"></i> All Quotations</div>
        <div style={{ overflowX: 'auto' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Quotation No.</th><th>RFQ</th><th>Vendor</th>
                <th>Total (INR)</th><th>Delivery Days</th><th>AI Score</th><th>Status</th>
              </tr>
            </thead>
            <tbody>
              {isLoadingQuotations ? (
                <tr><td colSpan="7" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Loading...</td></tr>
              ) : quotations.length === 0 ? (
                <tr><td colSpan="7"><div className="empty-state"><i className="fa fa-balance-scale"></i><p>No quotations yet</p></div></td></tr>
              ) : quotations.map(q => (
                <tr key={q.id}>
                  <td><strong>{q.quotation_number}</strong></td>
                  <td>RFQ #{q.rfq_id}</td>
                  <td>Vendor #{q.vendor_id}</td>
                  <td><strong>{formatINR(q.total_amount)}</strong></td>
                  <td>{q.delivery_days ? q.delivery_days + ' days' : '—'}</td>
                  <td>
                    {q.ai_score != null ? (
                      <strong style={{ color: getScoreColor(q.ai_score) }}>{q.ai_score}</strong>
                    ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td>{renderBadge(q.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
