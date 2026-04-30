import React, { useState, useEffect } from 'react';
import { api, showToast } from '../services/api';
import Modal from '../components/Modal';

export default function Vendors() {
  const [activeTab, setActiveTab] = useState('master');
  
  // Data States
  const [vendors, setVendors] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [discoveryResult, setDiscoveryResult] = useState(null);
  const [benchmarkData, setBenchmarkData] = useState(null);

  // Loading States
  const [isLoadingMaster, setIsLoadingMaster] = useState(false);
  const [isScoring, setIsScoring] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  // Modal States
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isMigrateModalOpen, setIsMigrateModalOpen] = useState(false);
  
  // Modal Data
  const [approveVendorId, setApproveVendorId] = useState(null);
  const [approverName, setApproverName] = useState('');
  const [migrateFile, setMigrateFile] = useState(null);
  const [newVendor, setNewVendor] = useState({
    company_name: '', contact_person: '', email: '', phone: '',
    category: 'Electronic', vendor_type: 'Distributor', city: '', state: '',
    gst_number: '', oem_brand: '', oem_approved: false, msme_registered: false
  });

  // Discovery Form
  const [discCategory, setDiscCategory] = useState('Electronic');
  const [discMinScore, setDiscMinScore] = useState('60');
  const [discOemOnly, setDiscOemOnly] = useState(false);

  // ── Master Tab Logic ──────────────────────────────────────────────────────
  const loadVendors = async () => {
    setIsLoadingMaster(true);
    try {
      let url = "/vendors/?";
      if (statusFilter) url += `status=${statusFilter}&`;
      if (categoryFilter) url += `category=${categoryFilter}`;
      const data = await api.get(url);
      setVendors(data.vendors || []);
    } catch (e) {
      showToast("Failed to load vendors", "error");
    } finally {
      setIsLoadingMaster(false);
    }
  };

  useEffect(() => {
    loadVendors();
  }, [statusFilter, categoryFilter]);

  const filteredVendors = vendors.filter(v => 
    v.company_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    v.vendor_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
    v.vendor_type.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddVendor = async () => {
    if (!newVendor.company_name || !newVendor.email) {
      showToast("Company name and email are required", "error");
      return;
    }
    try {
      await api.post("/vendors/", newVendor);
      showToast("✅ Vendor added successfully!", "success");
      setIsAddModalOpen(false);
      setNewVendor({
        company_name: '', contact_person: '', email: '', phone: '',
        category: 'Electronic', vendor_type: 'Distributor', city: '', state: '',
        gst_number: '', oem_brand: '', oem_approved: false, msme_registered: false
      });
      loadVendors();
    } catch(e) {
      showToast("Error: " + e.message, "error");
    }
  };

  const handleApprove = async () => {
    if (!approverName) { showToast("Enter approver name", "error"); return; }
    try {
      await api.post(`/vendors/${approveVendorId}/approve?approver=${encodeURIComponent(approverName)}`);
      showToast("✅ Vendor approved!", "success");
      setIsApproveModalOpen(false);
      setApproverName('');
      loadVendors();
    } catch(e) { showToast("Error: " + e.message, "error"); }
  };

  const handleBlacklist = async (id, name) => {
    if (!window.confirm(`Blacklist ${name}?`)) return;
    try {
      await api.post(`/vendors/${id}/blacklist`);
      showToast(`${name} blacklisted`, "info");
      loadVendors();
    } catch(e) { showToast("Error: " + e.message, "error"); }
  };

  const handleMigration = async () => {
    if (!migrateFile) { showToast("Please select a CSV file first", "error"); return; }
    const formData = new FormData();
    formData.append("file", migrateFile);

    try {
      showToast("Processing migration...", "info");
      const response = await fetch("http://127.0.0.1:8000/api/vendors/migrate", {
        method: "POST",
        body: formData
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.detail || "Migration failed");
      showToast(`✅ Success! ${data.count} vendors migrated.`, "success");
      setIsMigrateModalOpen(false);
      setMigrateFile(null);
      loadVendors();
    } catch (e) {
      showToast(e.message, "error");
    }
  };

  const downloadTemplate = () => {
    const headers = "Company Name,Email,Phone,Contact Person,Category,Vendor Type,GST,PAN,MSME Registered,OEM Approved,OEM Brand,Address,City,State,Pincode,Country\n";
    const sample  = "Example Corp,sales@example.sample,9876543210,John Doe,Electronic,Distributor,24AABCT1234A1Z5,ABCDE1234F,Yes,No,,123 Industrial Area,Ahmedabad,Gujarat,380001,India";
    const csvContent = "\ufeff" + headers + sample;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url  = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 's2p_full_fidelity_template.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  // ── Discovery Logic ───────────────────────────────────────────────────────
  const runDiscovery = async () => {
    try {
      const [discData, benchData] = await Promise.all([
        api.get(`/vendors/discover/${discCategory}?min_score=${discMinScore}&oem_only=${discOemOnly}`),
        api.get(`/vendors/benchmark/${discCategory}`)
      ]);
      setDiscoveryResult(discData);
      setBenchmarkData(benchData);
    } catch (e) {
      showToast("Discovery failed", "error");
    }
  };

  // ── Performance Logic ─────────────────────────────────────────────────────
  const handleScoreAll = async () => {
    setIsScoring(true);
    try {
      const data = await api.post("/vendors/score-all");
      setLeaderboard(data.leaderboard || []);
      showToast(`✅ ${data.message}`, "success");
    } catch (e) {
      showToast("Error scoring vendors", "error");
    } finally {
      setIsScoring(false);
    }
  };

  const renderBadge = (status) => {
    const cls = status === 'Approved' ? 'badge-approved' : 
                status === 'Pending' ? 'badge-pending' : 
                status === 'Under Review' ? 'badge-review' : 'badge-rejected';
    return <span className={`badge ${cls}`}>{status}</span>;
  };

  const gradeColor = (grade) => {
    if (!grade) return '#94a3b8';
    if (grade.startsWith("A+")) return "#15803d";
    if (grade.startsWith("A"))  return "#0d9488";
    if (grade.startsWith("B"))  return "#1a56db";
    if (grade.startsWith("C"))  return "#ea7800";
    return "#dc2626";
  };

  const ScoreBar = ({ value, color }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <div style={{ background: '#e2e8f0', borderRadius: '20px', height: '8px', width: '70px', overflow: 'hidden' }}>
        <div style={{ background: color, height: '100%', width: `${value}%`, borderRadius: '20px' }}></div>
      </div>
      <span style={{ fontSize: '13px', fontWeight: 600 }}>{value}</span>
    </div>
  );

  return (
    <>
      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '24px', borderBottom: '2px solid var(--border)', marginBottom: '24px' }}>
        <div onClick={() => setActiveTab('master')} style={{ padding: '12px', cursor: 'pointer', fontWeight: activeTab === 'master' ? 700 : 600, color: activeTab === 'master' ? 'var(--primary)' : 'var(--text-muted)', borderBottom: activeTab === 'master' ? '3px solid var(--primary)' : 'none', marginBottom: '-2px' }}>
          <i className="fa fa-building"></i> Vendor Master
        </div>
        <div onClick={() => setActiveTab('discovery')} style={{ padding: '12px', cursor: 'pointer', fontWeight: activeTab === 'discovery' ? 700 : 600, color: activeTab === 'discovery' ? 'var(--primary)' : 'var(--text-muted)', borderBottom: activeTab === 'discovery' ? '3px solid var(--primary)' : 'none', marginBottom: '-2px' }}>
          <i className="fa fa-robot"></i> AI Discovery
        </div>
        <div onClick={() => setActiveTab('performance')} style={{ padding: '12px', cursor: 'pointer', fontWeight: activeTab === 'performance' ? 700 : 600, color: activeTab === 'performance' ? 'var(--primary)' : 'var(--text-muted)', borderBottom: activeTab === 'performance' ? '3px solid var(--primary)' : 'none', marginBottom: '-2px' }}>
          <i className="fa fa-star"></i> Performance
        </div>
      </div>

      {/* Conditional Header Actions based on Tab */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '20px' }}>
        {activeTab === 'master' && (
          <>
            <button className="btn btn-outline" onClick={() => setIsMigrateModalOpen(true)} style={{ marginRight: '8px', borderColor: 'var(--primary)', color: 'var(--primary)' }}>
              <i className="fa fa-file-import"></i> Migrate Google Sheets
            </button>
            <button className="btn btn-primary" onClick={() => setIsAddModalOpen(true)}>
              <i className="fa fa-plus"></i> Add Vendor
            </button>
          </>
        )}
        {activeTab === 'performance' && (
          <button className="btn btn-primary" onClick={handleScoreAll} disabled={isScoring}>
            <i className={`fa ${isScoring ? 'fa-spinner fa-spin' : 'fa-sync'}`}></i> {isScoring ? 'Scoring...' : 'Score All Vendors'}
          </button>
        )}
      </div>

      {/* TAB: VENDOR MASTER */}
      {activeTab === 'master' && (
        <div>
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-body" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
              <input type="text" placeholder="Search by name or code..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} style={{ padding: '8px 14px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px', flex: 1, minWidth: '200px' }} />
              <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} style={{ padding: '8px 14px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px' }}>
                <option value="">All Status</option>
                <option value="Pending">Pending</option>
                <option value="Under Review">Under Review</option>
                <option value="Approved">Approved</option>
                <option value="Blacklisted">Blacklisted</option>
              </select>
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)} style={{ padding: '8px 14px', border: '1px solid var(--border)', borderRadius: '8px', fontSize: '14px' }}>
                <option value="">All Categories</option>
                <option value="Electronic">Electronic</option>
                <option value="Mechanical">Mechanical</option>
                <option value="Both">Both</option>
              </select>
              <span style={{ color: 'var(--text-muted)', fontSize: '14px', marginLeft: 'auto' }}>{filteredVendors.length} vendor(s) found</span>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><i className="fa fa-building"></i> Vendor List</div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Code</th><th>Company</th><th>Category</th>
                    <th>Type</th><th>OEM</th><th>City</th>
                    <th>Status</th><th>Score</th><th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoadingMaster ? (
                    <tr><td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Loading...</td></tr>
                  ) : filteredVendors.length === 0 ? (
                    <tr><td colSpan="9" style={{ textAlign: 'center', padding: '30px' }}><div className="empty-state"><i className="fa fa-building"></i><p>No vendors found</p></div></td></tr>
                  ) : filteredVendors.map(v => (
                    <tr key={v.id}>
                      <td><strong>{v.vendor_code}</strong></td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{v.company_name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{v.email}</div>
                      </td>
                      <td>{v.category}</td>
                      <td>{v.vendor_type}</td>
                      <td>{v.oem_approved ? <span style={{ color: 'var(--green)' }}><i className="fa fa-check-circle"></i> {v.oem_brand || ''}</span> : <span style={{ color: 'var(--text-muted)' }}>—</span>}</td>
                      <td>{v.city || '—'}</td>
                      <td>{renderBadge(v.status)}</td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <div style={{ background: '#e2e8f0', borderRadius: '20px', height: '6px', width: '60px', overflow: 'hidden' }}>
                            <div style={{ background: 'var(--green)', height: '100%', width: `${v.performance_score || 0}%` }}></div>
                          </div>
                          <span style={{ fontSize: '12px' }}>{v.performance_score || 0}</span>
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {(v.status === 'Pending' || v.status === 'Under Review') && (
                            <button className="btn btn-success" style={{ padding: '5px 10px', fontSize: '12px' }} onClick={() => { setApproveVendorId(v.id); setIsApproveModalOpen(true); }}>
                              <i className="fa fa-check"></i> Approve
                            </button>
                          )}
                          {v.status !== 'Blacklisted' && (
                            <button className="btn btn-danger" style={{ padding: '5px 10px', fontSize: '12px' }} onClick={() => handleBlacklist(v.id, v.company_name)}>
                              <i className="fa fa-ban"></i>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: AI DISCOVERY */}
      {activeTab === 'discovery' && (
        <div>
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header"><i className="fa fa-robot"></i> Discover Vendors</div>
            <div className="card-body">
              <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '160px' }}>
                  <label>Category *</label>
                  <select value={discCategory} onChange={e => setDiscCategory(e.target.value)}>
                    <option value="Electronic">Electronic</option>
                    <option value="Mechanical">Mechanical</option>
                    <option value="Both">Both</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0, flex: 1, minWidth: '160px' }}>
                  <label>Minimum AI Score</label>
                  <select value={discMinScore} onChange={e => setDiscMinScore(e.target.value)}>
                    <option value="0">Any (0+)</option>
                    <option value="40">Acceptable (40+)</option>
                    <option value="60">Good (60+)</option>
                    <option value="80">Excellent (80+)</option>
                  </select>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingBottom: '2px' }}>
                  <input type="checkbox" id="disc-oem" style={{ width: '16px', height: '16px' }} checked={discOemOnly} onChange={e => setDiscOemOnly(e.target.checked)} />
                  <label htmlFor="disc-oem" style={{ fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}>OEM Only</label>
                </div>
                <button className="btn btn-primary" onClick={runDiscovery} style={{ padding: '10px 24px' }}>
                  <i className="fa fa-search"></i> Discover
                </button>
              </div>
            </div>
          </div>

          {benchmarkData && benchmarkData.total_vendors > 0 && (
            <div className="card" style={{ marginBottom: '20px' }}>
              <div className="card-header"><i className="fa fa-chart-bar"></i> Category Benchmark</div>
              <div className="card-body">
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '16px', textAlign: 'center' }}>
                  <div><div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--blue)' }}>{benchmarkData.total_vendors}</div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Total Vendors</div></div>
                  <div><div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--green)' }}>{benchmarkData.avg_score}</div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Avg Score</div></div>
                  <div><div style={{ fontSize: '22px', fontWeight: 800, color: 'gold' }}>{benchmarkData.top_score}</div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Top Score</div></div>
                  <div><div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--purple)' }}>{benchmarkData.oem_vendors}</div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>OEM Vendors</div></div>
                  <div><div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--teal)' }}>{benchmarkData.msme_vendors}</div><div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>MSME Vendors</div></div>
                </div>
              </div>
            </div>
          )}

          {discoveryResult && (
            <div className="card">
              <div className="card-header">
                <i className="fa fa-list"></i> Discovery Results ({discoveryResult.total_found} found)
              </div>
              <div style={{ padding: '20px' }}>
                {discoveryResult.vendors.length === 0 ? (
                  <div className="empty-state"><i className="fa fa-robot"></i><p>No vendors match your criteria.</p></div>
                ) : (
                  discoveryResult.vendors.map((v, i) => (
                    <div key={i} style={{ border: '1px solid var(--border)', borderRadius: '12px', padding: '20px', marginBottom: '16px', borderColor: i === 0 ? 'var(--green)' : 'var(--border)', background: i === 0 ? '#f0fdf4' : 'transparent' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px' }}>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <span style={{ fontSize: '20px' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🏷️'}</span>
                            <div>
                              <div style={{ fontSize: '16px', fontWeight: 800 }}>{v.company_name}</div>
                              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{v.vendor_code} &bull; {v.vendor_type}</div>
                            </div>
                          </div>
                          <div style={{ marginTop: '12px' }}>{v.recommendation}</div>
                        </div>
                        <div style={{ textAlign: 'center', minWidth: '80px' }}>
                          <div style={{ fontSize: '36px', fontWeight: 900, color: v.ai_match_score >= 80 ? 'var(--green)' : v.ai_match_score >= 60 ? 'var(--blue)' : v.ai_match_score >= 40 ? 'var(--orange)' : 'var(--red)' }}>
                            {v.ai_match_score}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>AI Match Score</div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB: PERFORMANCE */}
      {activeTab === 'performance' && (
        <div>
          <div className="card" style={{ marginBottom: '20px' }}>
            <div className="card-header"><i className="fa fa-info-circle"></i> Scoring Formula</div>
            <div className="card-body">
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', textAlign: 'center' }}>
                <div style={{ padding: '16px', background: '#dbeafe', borderRadius: '10px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--blue)' }}>35%</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}><i className="fa fa-truck"></i> On-Time Delivery</div>
                </div>
                <div style={{ padding: '16px', background: '#dcfce7', borderRadius: '10px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--green)' }}>30%</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}><i className="fa fa-check-double"></i> Quality Acceptance</div>
                </div>
                <div style={{ padding: '16px', background: '#ede9fe', borderRadius: '10px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--purple)' }}>20%</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}><i className="fa fa-rupee-sign"></i> Price</div>
                </div>
                <div style={{ padding: '16px', background: '#ffedd5', borderRadius: '10px' }}>
                  <div style={{ fontSize: '24px', fontWeight: 800, color: 'var(--orange)' }}>15%</div>
                  <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginTop: '4px' }}><i className="fa fa-reply"></i> RFQ Response</div>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><i className="fa fa-trophy"></i> Vendor Leaderboard</div>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Rank</th><th>Vendor</th><th>Delivery</th>
                    <th>Quality</th><th>Pricing</th><th>Response</th>
                    <th>Overall</th><th>Grade</th><th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.length === 0 ? (
                    <tr><td colSpan="9" style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>Click "Score All Vendors" in the top right to generate scores</td></tr>
                  ) : leaderboard.map((v, i) => (
                    <tr key={v.vendor_id} style={{ background: i === 0 ? '#f0fdf4' : 'transparent' }}>
                      <td style={{ fontSize: '20px', textAlign: 'center' }}>{i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}</td>
                      <td>
                        <div style={{ fontWeight: 700 }}>{v.vendor_name}</div>
                        <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>{v.period} &bull; {v.total_orders} orders</div>
                      </td>
                      <td><ScoreBar value={v.delivery_score} color="var(--blue)" /></td>
                      <td><ScoreBar value={v.quality_score} color="var(--green)" /></td>
                      <td><ScoreBar value={v.pricing_score} color="var(--purple)" /></td>
                      <td><ScoreBar value={v.response_score} color="var(--orange)" /></td>
                      <td><div style={{ fontSize: '22px', fontWeight: 800, color: gradeColor(v.grade) }}>{v.overall_score}</div></td>
                      <td><span style={{ fontWeight: 700, fontSize: '12px', color: gradeColor(v.grade) }}>{v.grade}</span></td>
                      <td>
                        <button className="btn btn-outline" style={{ padding: '4px 10px', fontSize: '12px' }} onClick={async () => {
                          try {
                            const res = await api.post(`/vendors/${v.vendor_id}/score`);
                            showToast(`✅ ${v.vendor_name} rescored: ${res.result.overall_score}`, "success");
                            handleScoreAll();
                          } catch(e) { showToast(e.message, "error"); }
                        }}> Rescore</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODALS */}
      <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Vendor" iconClass="fa fa-building" maxWidth="700px">
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
          <div className="form-group"><label>Company Name *</label><input type="text" placeholder="e.g. Techno Electronics Pvt Ltd" value={newVendor.company_name} onChange={e => setNewVendor({ ...newVendor, company_name: e.target.value })} /></div>
          <div className="form-group"><label>Contact Person</label><input type="text" placeholder="e.g. Ramesh Shah" value={newVendor.contact_person} onChange={e => setNewVendor({ ...newVendor, contact_person: e.target.value })} /></div>
          <div className="form-group"><label>Email *</label><input type="email" placeholder="vendor@company.in" value={newVendor.email} onChange={e => setNewVendor({ ...newVendor, email: e.target.value })} /></div>
          <div className="form-group"><label>Phone</label><input type="text" placeholder="9876543210" value={newVendor.phone} onChange={e => setNewVendor({ ...newVendor, phone: e.target.value })} /></div>
          <div className="form-group"><label>Category *</label><select value={newVendor.category} onChange={e => setNewVendor({ ...newVendor, category: e.target.value })}><option value="Electronic">Electronic</option><option value="Mechanical">Mechanical</option><option value="Both">Both</option></select></div>
          <div className="form-group"><label>Vendor Type</label><select value={newVendor.vendor_type} onChange={e => setNewVendor({ ...newVendor, vendor_type: e.target.value })}><option value="Distributor">Distributor</option><option value="OEM">OEM</option><option value="Trader">Trader</option><option value="Service">Service</option></select></div>
          <div className="form-group"><label>City</label><input type="text" placeholder="Ahmedabad" value={newVendor.city} onChange={e => setNewVendor({ ...newVendor, city: e.target.value })} /></div>
          <div className="form-group"><label>State</label><input type="text" placeholder="Gujarat" value={newVendor.state} onChange={e => setNewVendor({ ...newVendor, state: e.target.value })} /></div>
          <div className="form-group"><label>GST Number</label><input type="text" placeholder="24AABCT1234A1Z5" value={newVendor.gst_number} onChange={e => setNewVendor({ ...newVendor, gst_number: e.target.value })} /></div>
          <div className="form-group"><label>OEM Brand</label><input type="text" placeholder="e.g. Hikvision" value={newVendor.oem_brand} onChange={e => setNewVendor({ ...newVendor, oem_brand: e.target.value })} /></div>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginBottom: '20px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}><input type="checkbox" checked={newVendor.oem_approved} onChange={e => setNewVendor({ ...newVendor, oem_approved: e.target.checked })} /> OEM Approved</label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', cursor: 'pointer' }}><input type="checkbox" checked={newVendor.msme_registered} onChange={e => setNewVendor({ ...newVendor, msme_registered: e.target.checked })} /> MSME Registered</label>
        </div>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={() => setIsAddModalOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleAddVendor}><i className="fa fa-save"></i> Save Vendor</button>
        </div>
      </Modal>

      <Modal isOpen={isApproveModalOpen} onClose={() => setIsApproveModalOpen(false)} title="Approve Vendor" iconClass="fa fa-check-circle" maxWidth="400px">
        <div className="form-group">
          <label>Approver Name *</label>
          <input type="text" placeholder="e.g. Bhavesh Shah" value={approverName} onChange={e => setApproverName(e.target.value)} />
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '16px', justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={() => setIsApproveModalOpen(false)}>Cancel</button>
          <button className="btn btn-success" onClick={handleApprove}><i className="fa fa-check"></i> Approve</button>
        </div>
      </Modal>

      <Modal isOpen={isMigrateModalOpen} onClose={() => setIsMigrateModalOpen(false)} title="Migrate Legacy Data" iconClass="fa fa-file-import" maxWidth="500px">
        <div style={{ padding: '10px 0' }}>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', marginBottom: '15px' }}>Upload your exported Google Sheet (.csv) to migrate vendor master data into the secure S2P database.</p>
          <div style={{ marginBottom: '15px', padding: '10px', background: '#eff6ff', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '10px', border: '1px solid #bfdbfe' }}>
            <i className="fa fa-info-circle" style={{ color: '#2563eb' }}></i>
            <span style={{ fontSize: '13px', color: '#1e40af' }}>Please use our standard template for a 100% accurate migration. <a href="#" onClick={(e) => { e.preventDefault(); downloadTemplate(); }} style={{ fontWeight: 700, textDecoration: 'underline', color: '#2563eb' }}>Download Template</a></span>
          </div>
          <div style={{ border: '2px dashed var(--border)', padding: '30px', textAlign: 'center', borderRadius: '12px', background: '#f8fafc' }}>
            <i className="fa fa-cloud-upload-alt" style={{ fontSize: '40px', color: 'var(--primary)', opacity: 0.5, marginBottom: '10px' }}></i>
            <input type="file" accept=".csv" onChange={(e) => setMigrateFile(e.target.files[0])} style={{ display: 'block', margin: '10px auto', fontSize: '13px' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: '12px', marginTop: '20px', justifyContent: 'flex-end' }}>
          <button className="btn btn-outline" onClick={() => setIsMigrateModalOpen(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={handleMigration}><i className="fa fa-upload"></i> Start Migration</button>
        </div>
      </Modal>
    </>
  );
}
