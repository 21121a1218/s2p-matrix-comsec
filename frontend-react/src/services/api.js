// src/services/api.js
const API_BASE = "http://127.0.0.1:8000/api";

let apiRequestCount = 0;

function showGlobalLoader() {
  let loader = document.getElementById('global-api-loader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'global-api-loader';
    loader.innerHTML = `
      <div class="loader-spinner"></div>
      <div style="margin-top:20px; font-weight:600; color:#1d4ed8; font-size:16px;">Processing...</div>
    `;
    const style = document.createElement('style');
    style.innerHTML = `
      #global-api-loader {
        position: fixed; top: 0; left: 0; width: 100vw; height: 100vh;
        background: rgba(255,255,255,0.85); z-index: 99999;
        display: none; flex-direction: column; justify-content: center; align-items: center;
        backdrop-filter: blur(4px);
      }
      .loader-spinner {
        width: 60px; height: 60px;
        border: 6px solid #e2e8f0; border-top-color: #3b82f6;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      @keyframes spin { 100% { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);
    document.body.appendChild(loader);
  }
  loader.style.display = 'flex';
}

function hideGlobalLoader() {
  const loader = document.getElementById('global-api-loader');
  if (loader) loader.style.display = 'none';
}

function beforeApi() {
  apiRequestCount++;
  showGlobalLoader();
}

function afterApi() {
  apiRequestCount--;
  if (apiRequestCount <= 0) {
    apiRequestCount = 0;
    hideGlobalLoader();
  }
}

export const api = {
  get: async (path) => {
    beforeApi();
    try {
      const res = await fetch(`${API_BASE}${path}`);
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      return await res.json();
    } finally { afterApi(); }
  },
  post: async (path, body) => {
    beforeApi();
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify(body)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || `API Error: ${res.status}`);
      }
      return await res.json();
    } finally { afterApi(); }
  },
  patch: async (path, body) => {
    beforeApi();
    try {
      const res = await fetch(`${API_BASE}${path}`, {
        method : "PATCH",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify(body)
      });
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      return await res.json();
    } finally { afterApi(); }
  },
  delete: async (path) => {
    beforeApi();
    try {
      const res = await fetch(`${API_BASE}${path}`, { method: "DELETE" });
      if (!res.ok) throw new Error(`API Error: ${res.status}`);
      return await res.json();
    } finally { afterApi(); }
  }
};

// ── Toast Notification ──────────────────────────────────────
export function showToast(message, type = "success") {
  const icons = { success: "✅", error: "❌", info: "ℹ️" };
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `${icons[type]} ${message}`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3500);
}

// ── Formatter Helpers ──────────────────────────────────────────
export function formatINR(amount) {
  if (!amount && amount !== 0) return "—";
  return "₹ " + Number(amount).toLocaleString("en-IN", {
    minimumFractionDigits: 0, maximumFractionDigits: 0
  });
}

export function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric"
  });
}
