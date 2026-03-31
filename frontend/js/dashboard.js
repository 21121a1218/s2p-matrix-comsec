// dashboard.js — Loads KPI data into dashboard
document.addEventListener("DOMContentLoaded", async () => {

  // Set today's date
  const d = new Date();
  document.getElementById("today-date").textContent =
    d.toLocaleDateString("en-IN", { weekday: "short", day: "2-digit",
                                     month: "short", year: "numeric" });

  try {
    const data = await api.get("/dashboard/summary");

    // KPI Cards
    document.getElementById("kpi-vendors").textContent =
      data.vendors.total;
    document.getElementById("kpi-approved").textContent =
      data.vendors.approved;
    document.getElementById("kpi-rfq").textContent =
      data.rfq.open;
    document.getElementById("kpi-po").textContent =
      data.purchase_orders.total;
    document.getElementById("kpi-unmatched").textContent =
      data.invoices.unmatched;
    document.getElementById("kpi-spend").textContent =
      formatINR(data.purchase_orders.total_spend_inr);

    // Pending Approvals panel
    const approvalBox = document.getElementById("pending-approvals");
    const pendingPO   = data.purchase_orders.pending_approval;
    const pendingVen  = data.vendors.pending;

    if (pendingPO === 0 && pendingVen === 0) {
      approvalBox.innerHTML =
        `<div class="empty-state">
           <i class="fa fa-check-circle"></i>
           <p>No pending approvals 🎉</p>
         </div>`;
    } else {
      approvalBox.innerHTML = `
        <table class="data-table">
          <thead><tr><th>Item</th><th>Count</th><th>Action</th></tr></thead>
          <tbody>
            <tr>
              <td><i class="fa fa-shopping-cart" style="color:var(--orange)"></i>
                  Purchase Orders</td>
              <td><span class="badge badge-pending">${pendingPO}</span></td>
              <td><a href="pages/purchase_orders.html" class="btn btn-outline" style="padding:5px 12px;font-size:12px">View</a></td>
            </tr>
            <tr>
              <td><i class="fa fa-building" style="color:var(--blue)"></i>
                  New Vendors</td>
              <td><span class="badge badge-pending">${pendingVen}</span></td>
              <td><a href="pages/vendors.html" class="btn btn-outline" style="padding:5px 12px;font-size:12px">View</a></td>
            </tr>
          </tbody>
        </table>`;
    }

    // Invoice Exceptions panel
    const invBox    = document.getElementById("invoice-exceptions");
    const unmatched = data.invoices.unmatched;
    const unpaid    = data.invoices.unpaid;

    if (unmatched === 0 && unpaid === 0) {
      invBox.innerHTML =
        `<div class="empty-state">
           <i class="fa fa-check-circle"></i>
           <p>All invoices are clean ✅</p>
         </div>`;
    } else {
      invBox.innerHTML = `
        <table class="data-table">
          <thead><tr><th>Type</th><th>Count</th><th>Amount</th></tr></thead>
          <tbody>
            <tr>
              <td><i class="fa fa-exclamation-triangle" style="color:var(--red)"></i>
                  Unmatched Invoices</td>
              <td><span class="badge badge-mismatch">${unmatched}</span></td>
              <td>—</td>
            </tr>
            <tr>
              <td><i class="fa fa-clock" style="color:var(--orange)"></i>
                  Unpaid Invoices</td>
              <td><span class="badge badge-pending">${unpaid}</span></td>
              <td>${formatINR(data.invoices.unpaid_amount_inr)}</td>
            </tr>
          </tbody>
        </table>`;
    }

  } catch (err) {
    console.error(err);
    showToast("Failed to load dashboard data. Is the server running?", "error");
  }
});