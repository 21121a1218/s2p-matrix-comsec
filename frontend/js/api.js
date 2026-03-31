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
  delete: async (path) => {
    const res = await fetch(`${API_BASE}${path}`, { method: "DELETE" });
    if (!res.ok) throw new Error(`API Error: ${res.status}`);
    return res.json();
  }
};

// ── Toast Notification ──────────────────────────────────────
function showToast(message, type = "success") {
  const icons = { success: "✅", error: "❌", info: "ℹ️" };
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `${icons[type]} ${message}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ── Status Badge helper ─────────────────────────────────────
function badge(text) {
  const map = {
    "Approved"      : "badge-approved",
    "Pending"       : "badge-pending",
    "Under Review"  : "badge-pending",
    "Blacklisted"   : "badge-rejected",
    "Inactive"      : "badge-rejected",
    "Draft"         : "badge-draft",
    "Sent"          : "badge-sent",
    "Matched"       : "badge-matched",
    "Mismatch"      : "badge-mismatch",
    "Rejected"      : "badge-rejected",
    "Selected"      : "badge-approved",
    "Cancelled"     : "badge-rejected"
  };
  const cls = map[text] || "badge-draft";
  return `<span class="badge ${cls}">${text || "—"}</span>`;
}

// ── Currency formatter ──────────────────────────────────────
function formatINR(amount) {
  if (!amount && amount !== 0) return "—";
  return "₹ " + Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 0, maximumFractionDigits: 0
  });
}

// ── Date formatter ──────────────────────────────────────────
function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric"
  });
}

// ── Toggle sidebar on mobile ────────────────────────────────
function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
}