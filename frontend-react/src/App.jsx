import { Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';

// Pages
import Dashboard from './pages/Dashboard';
import Vendors from './pages/Vendors';
import RFQ from './pages/RFQ';
import Quotations from './pages/Quotations';
import Negotiations from './pages/Negotiations';
import Contracts from './pages/Contracts';
import PurchaseOrders from './pages/PurchaseOrders';
import GRN from './pages/GRN';
import Invoices from './pages/Invoices';
import Payments from './pages/Payments';
import Checklists from './pages/Checklists';
import Audit from './pages/Audit';
import SAPIntegration from './pages/SAPIntegration';

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="vendors" element={<Vendors />} />
        <Route path="rfq" element={<RFQ />} />
        <Route path="quotations" element={<Quotations />} />
        <Route path="negotiations" element={<Negotiations />} />
        <Route path="contracts" element={<Contracts />} />
        <Route path="purchase-orders" element={<PurchaseOrders />} />
        <Route path="grn" element={<GRN />} />
        <Route path="invoices" element={<Invoices />} />
        <Route path="payments" element={<Payments />} />
        <Route path="checklists" element={<Checklists />} />
        <Route path="audit" element={<Audit />} />
        <Route path="sap-integration" element={<SAPIntegration />} />
        <Route path="*" element={<div style={{ padding: '40px', textAlign: 'center' }}><h2>404 — Page Not Found</h2></div>} />
      </Route>
    </Routes>
  );
}

export default App;
