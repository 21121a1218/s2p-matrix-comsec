// api.js — Central API connector for all frontend pages
const API_BASE = "http://127.0.0.1:8000/api";

const api = {
  get: async (path) => {
    const res = await fetch(`${API_BASE}${path}`);
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
  },
  post: async (path, body) => {
    const res = await fetch(`${API_BASE}${path}`, {
      method : "POST",
      headers: { "Content-Type": "application/json" },
      body   : JSON.stringify(body)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.detail || `API Error: ${res.status}`);
    }
    return res.json();
  },
  patch: async (path, body) => {
    const res = await fetch(`${API_BASE}${path}`, {
      method : "PATCH",
      headers: { "Content-Type": "application/json" },
      body   : JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
  },
  put: async (path, body) => {
    const res = await fetch(`${API_BASE}${path}`, {
      method : "PUT",
      headers: { "Content-Type": "application/json" },
      body   : JSON.stringify(body)
    });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
  },
  delete: async (path) => {
    const res = await fetch(`${API_BASE}${path}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
  }
};

// Toast Notification
function showToast(message, type = "success") {
  const colors = { success: "#10b981", error: "#ef4444", info: "#6366f1" };
  const icons  = { success: "&#10003;", error: "&#10007;", info: "&#8505;" };
  const toast  = document.createElement("div");
  toast.style.cssText = `
    position:fixed;bottom:1.5rem;right:1.5rem;z-index:9999;
    background:${colors[type]};color:#fff;padding:0.75rem 1.25rem;
    border-radius:8px;font-size:0.875rem;font-weight:500;
    box-shadow:0 4px 12px rgba(0,0,0,0.2);
    animation:slideIn 0.3s ease;
  `;
  toast.innerHTML = `${icons[type]} ${message}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.style.opacity = "0", 3000);
  setTimeout(() => toast.remove(), 3500);
}

// Status Badge helper
function badge(text) {
  const map = {
    "Approved"      : "badge-success",
    "Matched"       : "badge-success",
    "Paid"          : "badge-success",
    "Active"        : "badge-success",
    "Received"      : "badge-success",
    "Closed"        : "badge-success",
    "Pending"       : "badge-warning",
    "Under Review"  : "badge-warning",
    "Draft"         : "badge-warning",
    "Sent"          : "badge-warning",
    "Acknowledged"  : "badge-warning",
    "Partially Received": "badge-warning",
    "Blacklisted"   : "badge-danger",
    "Inactive"      : "badge-danger",
    "Mismatch"      : "badge-danger",
    "Rejected"      : "badge-danger",
    "Cancelled"     : "badge-danger",
    "Exception"     : "badge-danger",
    "Selected"      : "badge-success",
    "Sent to Vendor": "badge-info"
  };
  const cls = map[text] || "badge-warning";
  return `<span class="badge ${cls}">${text || "—"}</span>`;
}

// Currency formatter
function formatINR(amount) {
  if (!amount && amount !== 0) return "—";
  return "Rs. " + Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 0, maximumFractionDigits: 0
  });
}

// Date formatter
function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric"
  });
}

// Toggle sidebar on mobile
function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
}
