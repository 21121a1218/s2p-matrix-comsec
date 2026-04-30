import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api, formatINR } from '../services/api';
import StatCard from '../components/StatCard';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  LineController,
  BarController,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { Chart } from 'react-chartjs-2';

// Register ChartJS plugins
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  LineController,
  BarController,
  Title,
  Tooltip,
  Legend
);

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [governance, setGovernance] = useState(null);
  const [negotiations, setNegotiations] = useState(null);
  const [chartData, setChartData] = useState(null);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [sumRes, govRes, negSumRes, negChartRes] = await Promise.all([
          api.get('/dashboard/summary').catch(() => null),
          api.get('/governance/governance-summary').catch(() => null),
          api.get('/negotiations/summary').catch(() => null),
          api.get('/negotiations/chart-data/').catch(() => null)
        ]);

        setSummary(sumRes);
        setGovernance(govRes);
        setNegotiations(negSumRes);
        setChartData(negChartRes);
      } catch (e) {
        console.error("Dashboard init error", e);
      }
    }
    loadDashboardData();
  }, []);

  if (!summary) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading dashboard...</div>;

  const { vendors, rfq, purchase_orders, invoices } = summary;

  // Formatting helpers for the budget chart
  const budgetChartData = {
    labels: governance?.category_spend?.map(c => c.category) || [],
    datasets: [
      {
        type: 'bar',
        label: "Planned Budget (INR)",
        data: governance?.category_spend?.map(c => c.planned_inr) || [],
        backgroundColor: "rgba(59,130,246,0.25)",
        borderColor: "#3b82f6",
        borderWidth: 2,
        borderRadius: 8,
      },
      {
        type: 'bar',
        label: "Actual Spend (INR)",
        data: governance?.category_spend?.map(c => c.actual_inr) || [],
        backgroundColor: "rgba(34,197,94,0.35)",
        borderColor: "#22c55e",
        borderWidth: 2,
        borderRadius: 8,
      }
    ]
  };

  const budgetChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          callback: v => "₹" + (v >= 100000 ? (v/100000).toFixed(1) + "L" : Number(v).toLocaleString("en-IN")),
          font: { size: 12 }
        },
        grid: { color: "rgba(0,0,0,0.05)" }
      },
      x: { ticks: { font: { size: 13, weight: "600" } } }
    },
    plugins: {
      legend: { position: "top", labels: { usePointStyle: true, boxWidth: 8, font: { size: 13 } } },
      tooltip: {
        callbacks: { label: ctx => ` ${ctx.dataset.label}: ₹${Number(ctx.raw).toLocaleString("en-IN")}` }
      }
    }
  };

  // Formatting helpers for Savings chart
  const savingsChartData = {
    labels: chartData?.labels || [],
    datasets: [
      {
        type: 'line',
        label: "Savings (INR)",
        data: chartData?.savings || [],
        backgroundColor: "rgba(34,197,94,0.1)",
        borderColor: "#22c55e",
        borderWidth: 3,
        pointRadius: 6,
        tension: 0.4,
        yAxisID: "y"
      },
      {
        type: 'bar',
        label: "Initial Value",
        data: chartData?.initial || [],
        backgroundColor: "rgba(59,130,246,0.25)",
        borderRadius: 8,
        yAxisID: "y1"
      },
      {
        type: 'bar',
        label: "Agreed Value",
        data: chartData?.agreed || [],
        backgroundColor: "rgba(147,51,234,0.25)",
        borderRadius: 8,
        yAxisID: "y1"
      }
    ]
  };

  const savingsChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: "index", intersect: false },
    scales: {
      y: {
        type: "linear", display: true, position: "right",
        title: { display: true, text: "Savings (INR)", font: { size: 12, weight: "bold" } },
        ticks: { font: { size: 11 } },
        grid: { drawOnChartArea: false }
      },
      y1: {
        type: "linear", display: true, position: "left",
        title: { display: true, text: "Total Value (INR)", font: { size: 12, weight: "bold" } },
        ticks: { font: { size: 11 } }
      },
      x: { ticks: { font: { size: 12, weight: "600" } } }
    },
    plugins: {
      legend: { position: "top", labels: { usePointStyle: true, boxWidth: 8, font: { size: 12 } } }
    }
  };

  return (
    <>
      <div className="kpi-grid" id="kpi-grid" style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}>
        <StatCard title="Total Vendors" value={vendors?.total || 0} iconClass="fa fa-building" colorClass="blue" />
        <StatCard title="Approved Vendors" value={vendors?.approved || 0} iconClass="fa fa-check-circle" colorClass="green" />
        <StatCard title="Open RFQs" value={rfq?.open || 0} iconClass="fa fa-file-alt" colorClass="orange" />
        <StatCard title="Total POs" value={purchase_orders?.total || 0} iconClass="fa fa-shopping-cart" colorClass="purple" />
        <StatCard title="Unmatched Invoices" value={invoices?.unmatched || 0} iconClass="fa fa-exclamation-triangle" colorClass="red" />
        <StatCard title="Total Spend (INR)" value={formatINR(purchase_orders?.total_spend_inr || 0)} iconClass="fa fa-rupee-sign" colorClass="teal" />
      </div>

      <div style={{ margin: '20px 0 16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '5px', height: '36px', background: 'linear-gradient(180deg,#3b82f6,#8b5cf6)', borderRadius: '6px', flexShrink: 0 }}></div>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a' }}>Commercial Governance</span>
              <span style={{ fontSize: '10px', fontWeight: 700, background: 'linear-gradient(90deg,#3b82f6,#8b5cf6)', color: '#fff', padding: '2px 10px', borderRadius: '99px', letterSpacing: '0.5px' }}>BR-S2P-08</span>
            </div>
            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px' }}>Budget tracking · EBIT margin monitoring · Spend-vs-Plan at category &amp; vendor level</div>
          </div>
        </div>
      </div>

      {/* Governance KPI Strip */}
      {governance && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))', gap: '16px', marginBottom: '20px' }}>
          {[{ bg: 'linear-gradient(135deg,#0f172a 0%,#1e3a5f 100%)', glow: '#3b82f6', label: 'Total Planned Budget', value: formatINR(governance.summary.total_planned_inr), sub: 'From RFQ Estimates', icon: 'fa fa-chart-pie', vcolor: '#93c5fd' },
            { bg: 'linear-gradient(135deg,#052e16 0%,#065f46 100%)', glow: '#22c55e', label: 'Actual Spend (INR)', value: formatINR(governance.summary.total_actual_inr), sub: 'Committed POs', icon: 'fa fa-rupee-sign', vcolor: '#6ee7b7' },
            { bg: 'linear-gradient(135deg,#3b0764 0%,#5b21b6 100%)', glow: '#a855f7', label: 'EBIT Contribution', value: formatINR(governance.ebit.ebit_savings_inr), sub: 'Direct Procurement Savings', icon: 'fa fa-arrow-trend-up', vcolor: '#d8b4fe' },
            { bg: 'linear-gradient(135deg,#7c2d12 0%,#c2410c 100%)', glow: '#f97316', label: 'EBIT Margin %', value: governance.ebit.ebit_margin_pct + '%', sub: 'Savings vs. Quoted Value', icon: 'fa fa-percent', vcolor: '#fdba74' }
          ].map((k, i) => (
            <div key={i} style={{ background: k.bg, color: '#fff', borderRadius: '16px', padding: '22px 20px', boxShadow: `0 8px 32px ${k.glow}33, 0 0 0 1px ${k.glow}22`, position: 'relative', overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '70px', height: '70px', background: k.glow + '22', borderRadius: '50%' }}></div>
              <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '1.2px', opacity: 0.65, marginBottom: '10px', fontWeight: 700 }}>
                <i className={k.icon} style={{ marginRight: '6px' }}></i>{k.label}
              </div>
              <div style={{ fontSize: '22px', fontWeight: 900, color: k.vcolor, lineHeight: 1.1 }}>{k.value}</div>
              <div style={{ fontSize: '11px', opacity: 0.55, marginTop: '8px' }}>{k.sub}</div>
            </div>
          ))}
        </div>
      )}

      {/* Budget Chart + Vendor Spend Table */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '20px', marginBottom: '20px', alignItems: 'stretch' }}>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div className="card-header"><i className="fa fa-chart-bar"></i> Budget vs Actual Spend — by Category</div>
          <div className="card-body" style={{ height: '300px', position: 'relative', flexShrink: 0 }}>
            <Chart type="bar" data={budgetChartData} options={budgetChartOptions} />
          </div>
          <div style={{ padding: '0 16px 16px', flex: 1 }}>
            {governance?.category_spend?.length > 0 && (
              <table className="data-table" style={{ marginTop: '12px' }}>
                <thead>
                  <tr>
                    <th>Category</th>
                    <th style={{ textAlign: 'right' }}>Budget (INR)</th>
                    <th style={{ textAlign: 'right' }}>Actual (INR)</th>
                    <th style={{ textAlign: 'right' }}>Utilisation</th>
                    <th style={{ textAlign: 'right' }}>Variance</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {governance.category_spend.map((c, i) => (
                    <tr key={i}>
                      <td><strong>{c.category}</strong></td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{formatINR(c.planned_inr)}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{formatINR(c.actual_inr)}</td>
                      <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end' }}>
                          <div style={{ width: '44px', height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden', flexShrink: 0 }}>
                            <div style={{ width: `${Math.min(c.utilisation_pct, 100)}%`, height: '100%', background: c.utilisation_pct > 100 ? '#ef4444' : c.utilisation_pct > 80 ? '#f59e0b' : '#22c55e', borderRadius: '3px' }}></div>
                          </div>
                          <span style={{ fontWeight: 700, color: c.utilisation_pct > 100 ? '#ef4444' : c.utilisation_pct > 80 ? '#d97706' : '#16a34a' }}>{c.utilisation_pct}%</span>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', color: c.variance_inr >= 0 ? '#16a34a' : '#ef4444', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {c.variance_inr >= 0 ? '+' : ''}{formatINR(Math.abs(c.variance_inr))}
                      </td>
                      <td style={{ whiteSpace: 'nowrap' }}>
                        <span style={{ fontSize: '11px', fontWeight: 700, padding: '3px 8px', borderRadius: '99px', whiteSpace: 'nowrap', background: c.status === 'Over Budget' ? '#fee2e2' : '#dcfce7', color: c.status === 'Over Budget' ? '#991b1b' : '#166534' }}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="card" style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div className="card-header"><i className="fa fa-trophy"></i> Top Vendor Spend Allocation</div>
          <div className="card-body" style={{ padding: 0, flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <div style={{ overflowY: 'auto', overflowX: 'hidden', flex: 1 }}>
              {!governance?.vendor_allocation?.length ? (
                <div style={{ textAlign: 'center', padding: '30px', color: 'var(--text-muted)' }}>
                  <i className="fa fa-box-open fa-2x" style={{ marginBottom: '10px', display: 'block' }}></i>No vendor spend data yet.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                  <colgroup>
                    <col style={{ width: '22px' }} />
                    <col />
                    <col style={{ width: '80px' }} />
                    <col style={{ width: '58px' }} />
                  </colgroup>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                      <th style={{ padding: '10px 8px', fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'left' }}>#</th>
                      <th style={{ padding: '10px 8px', fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'left' }}>Vendor</th>
                      <th style={{ padding: '10px 8px', fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right' }}>Spend (INR)</th>
                      <th style={{ padding: '10px 8px', fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', textAlign: 'right' }}>Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {governance.vendor_allocation.map((v, i) => (
                      <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        <td style={{ padding: '10px 8px', fontWeight: 700, color: '#cbd5e1', fontSize: '12px', verticalAlign: 'top', paddingTop: '12px' }}>{i + 1}</td>
                        <td style={{ padding: '10px 8px', overflow: 'hidden', maxWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: '12px', color: '#2563eb', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={v.vendor_name}>{v.vendor_name}</div>
                          <div style={{ fontSize: '10px', color: '#94a3b8', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.vendor_type} · {v.po_count} PO(s) · {v.category}</div>
                        </td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', fontWeight: 700, fontSize: '12px', whiteSpace: 'nowrap', color: '#0f172a', verticalAlign: 'middle' }}>{formatINR(v.spend_inr)}</td>
                        <td style={{ padding: '10px 8px', textAlign: 'right', verticalAlign: 'middle' }}>
                          <div style={{ fontWeight: 700, fontSize: '12px', color: '#2563eb', whiteSpace: 'nowrap' }}>{v.share_pct}%</div>
                          <div style={{ width: '100%', height: '4px', background: '#e2e8f0', borderRadius: '2px', overflow: 'hidden', marginTop: '4px' }}>
                            <div style={{ width: `${v.share_pct}%`, height: '100%', background: 'linear-gradient(90deg,#3b82f6,#6366f1)', borderRadius: '2px' }}></div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Value Realization + Negotiation Efficiency */}
      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '20px', marginBottom: '20px' }}>
        <div className="card" style={{ minWidth: 0 }}>
          <div className="card-header"><i className="fa fa-chart-line"></i> Procurement Value Realization (Monthly)</div>
          <div className="card-body" style={{ height: '300px', position: 'relative' }}>
            <Chart type="bar" data={savingsChartData} options={savingsChartOptions} />
          </div>
        </div>
        
        <div className="card" style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div className="card-header"><i className="fa fa-bullseye"></i> Negotiation Efficiency</div>
          <div className="card-body" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)', padding: '24px 20px', borderRadius: '12px', textAlign: 'center', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '12px', color: '#166534', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 800, marginBottom: '8px' }}>Procurement Efficiency</div>
              <div style={{ fontSize: '42px', fontWeight: 900, color: '#15803d', lineHeight: 1 }}>{negotiations?.avg_savings_percent || 0}%</div>
              <div style={{ fontSize: '12px', color: '#166534', opacity: 0.8, marginTop: '8px' }}>Avg. Negotiated Savings</div>
            </div>
            <div style={{ flex: 1 }}>
              {negotiations ? (
                <div style={{ fontSize: '14px', lineHeight: 1.6 }}>
                  <div style={{ marginBottom: '12px' }}><strong>Status:</strong> <span style={{ color: 'var(--green)' }}>{negotiations.total_savings_inr > 100000 ? "Excellent" : "On Track"} Performance</span></div>
                  <div style={{ marginBottom: '12px' }}>You have achieved <strong>{formatINR(negotiations.total_savings_inr)}</strong> in direct cost avoidance this period.</div>
                  <div style={{ padding: '12px', background: 'rgba(59,130,246,0.05)', borderRadius: '8px', fontSize: '13px', color: 'var(--primary)' }}>
                    <i className="fa fa-info-circle"></i> Negotiation efficiency is trending at <strong>{negotiations.avg_savings_percent}%</strong> reduction vs. market quotes.
                  </div>
                </div>
              ) : (
                <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}><i className="fa fa-sync-alt fa-spin"></i> Loading insights...</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pending Approvals + Invoice Exceptions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
        <div className="card" style={{ borderTop: '3px solid #f59e0b' }}>
          <div className="card-header" style={{ background: 'linear-gradient(90deg,#fffbeb,#fff)' }}>
            <i className="fa fa-clock" style={{ color: '#d97706' }}></i> <span style={{ color: '#92400e', fontWeight: 700 }}>Pending Approvals</span>
          </div>
          <div className="card-body" style={{ padding: '16px' }}>
            {summary?.purchase_orders?.pending_approval === 0 && summary?.vendors?.pending === 0 ? (
              <div className="empty-state"><i className="fa fa-check-circle"></i><p>No pending approvals 🎉</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[{ label: 'Purchase Orders', count: summary?.purchase_orders?.pending_approval || 0, icon: 'fa fa-shopping-cart', color: '#f59e0b', to: '/purchase-orders' },
                  { label: 'New Vendors', count: summary?.vendors?.pending || 0, icon: 'fa fa-building', color: '#3b82f6', to: '/vendors' }].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#fafafa', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '34px', height: '34px', background: item.color + '18', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className={item.icon} style={{ color: item.color, fontSize: '14px' }}></i>
                      </div>
                      <span style={{ fontWeight: 600, fontSize: '14px' }}>{item.label}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontWeight: 800, fontSize: '18px', color: item.count > 0 ? '#ef4444' : '#94a3b8' }}>{item.count}</span>
                      <Link to={item.to} className="btn btn-outline" style={{ padding: '4px 12px', fontSize: '12px' }}>View</Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="card" style={{ borderTop: '3px solid #ef4444' }}>
          <div className="card-header" style={{ background: 'linear-gradient(90deg,#fff5f5,#fff)' }}>
            <i className="fa fa-exclamation-circle" style={{ color: '#dc2626' }}></i> <span style={{ color: '#991b1b', fontWeight: 700 }}>Invoice Exceptions</span>
          </div>
          <div className="card-body" style={{ padding: '16px' }}>
            {summary?.invoices?.unmatched === 0 && summary?.invoices?.unpaid === 0 ? (
              <div className="empty-state"><i className="fa fa-check-circle"></i><p>All invoices are clean ✅</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {[{ label: 'Unmatched Invoices', count: summary?.invoices?.unmatched || 0, amount: null, icon: 'fa fa-exclamation-triangle', color: '#ef4444', to: '/invoices' },
                  { label: 'Unpaid Invoices', count: summary?.invoices?.unpaid || 0, amount: formatINR(summary?.invoices?.unpaid_amount_inr || 0), icon: 'fa fa-clock', color: '#f59e0b', to: '/payments' }].map((item, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: '#fafafa', borderRadius: '10px', border: '1px solid #f1f5f9' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{ width: '34px', height: '34px', background: item.color + '18', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className={item.icon} style={{ color: item.color, fontSize: '14px' }}></i>
                      </div>
                      <div><div style={{ fontWeight: 600, fontSize: '14px' }}>{item.label}</div>{item.amount && <div style={{ fontSize: '12px', color: '#64748b' }}>{item.amount}</div>}</div>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '18px', color: item.count > 0 ? item.color : '#94a3b8' }}>{item.count}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card full-width" style={{ background: 'linear-gradient(135deg,#0f172a 0%,#1e293b 100%)', border: 'none' }}>
        <div className="card-header" style={{ background: 'transparent', borderBottom: '1px solid rgba(255,255,255,0.08)', color: '#e2e8f0' }}>
          <i className="fa fa-bolt" style={{ color: '#fbbf24' }}></i> <span style={{ fontWeight: 700 }}>Quick Actions</span>
        </div>
        <div style={{ display: 'flex', gap: '12px', padding: '16px', flexWrap: 'wrap' }}>
          {[{ to: '/vendors', icon: 'fa fa-plus', label: 'Add Vendor', color: '#3b82f6', bg: '#1d4ed8' },
            { to: '/rfq', icon: 'fa fa-file-alt', label: 'Create RFQ', color: '#22c55e', bg: '#15803d' },
            { to: '/purchase-orders', icon: 'fa fa-shopping-cart', label: 'Create PO', color: '#f97316', bg: '#c2410c' },
            { to: '/invoices', icon: 'fa fa-file-invoice', label: 'Upload Invoice', color: '#a855f7', bg: '#7e22ce' },
            { to: '/quotations', icon: 'fa fa-balance-scale', label: 'Compare Quotes', color: '#14b8a6', bg: '#0f766e' }
          ].map((a, i) => (
            <Link key={i} to={a.to} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 20px', background: `${a.bg}33`, border: `1px solid ${a.color}44`, borderRadius: '12px', color: a.color, textDecoration: 'none', fontWeight: 700, fontSize: '14px', flex: '1', minWidth: '150px', transition: 'all 0.2s' }}
              onMouseEnter={e => { e.currentTarget.style.background = `${a.bg}66`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = `${a.bg}33`; e.currentTarget.style.transform = 'translateY(0)'; }}>
              <div style={{ width: '36px', height: '36px', background: a.color + '22', borderRadius: '9px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className={a.icon} style={{ fontSize: '16px' }}></i>
              </div>
              {a.label}
            </Link>
          ))}
        </div>
      </div>

    </>
  );
}
