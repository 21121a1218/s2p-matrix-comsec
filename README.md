# 🏭 S2P Automation System — Matrix Comsec Pvt. Ltd.

AI-powered **Source-to-Pay (S2P)** procurement automation platform built
with Python + FastAPI + MySQL.

---

## 📋 BRD Coverage — 21/21 Requirements ✅

| Module | BRD Req | Status |
|---|---|---|
| AI Vendor Discovery | BR-S2P-01 | ✅ |
| Vendor Master Database | BR-S2P-02 | ✅ |
| RFQ Generation & Distribution | BR-S2P-03 | ✅ |
| Quotation Comparison Engine | BR-S2P-04 | ✅ |
| Vendor Approval Workflow | BR-S2P-05 | ✅ |
| Negotiation Tracking | BR-S2P-06 | ✅ |
| Contract Management | BR-S2P-07 | ✅ |
| Commercial Governance Dashboard | BR-S2P-08 | ✅ |
| PO Automation & Approvals | BR-S2P-09 | ✅ |
| Invoice 3-Way Match | BR-S2P-10 | ✅ |
| Payment Tracking + Alerts | BR-S2P-11 | ✅ |
| Procurement Checklist Engine | BR-S2P-12 | ✅ |
| Vendor Performance Scoring | BR-S2P-13 | ✅ |
| AMC & Service Contract Tracking | BR-S2P-14 | ✅ |
| Web Interface | BR-S2P-15 | ✅ |
| SAP S/4HANA Integration | NFR-01 | ✅ |
| Data Security | NFR-02 | ✅ |
| Solution Flexibility | NFR-03 | ✅ |
| Scalability | NFR-04 | ✅ |
| Usability | NFR-05 | ✅ |
| Audit Trail | NFR-06 | ✅ |

---

## 🧱 Tech Stack

| Layer | Technology |
|---|---|
| Backend | Python 3.10 + FastAPI |
| Database | MySQL 8.0 + SQLAlchemy |
| AI/ML | Rule-based scoring + scikit-learn |
| Frontend | HTML5 + CSS3 + Vanilla JS |
| SAP Layer | Mock OData API (swap for real) |
| Hosting | Render (free tier) |

---

## 🚀 Local Setup

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/s2p_matrix.git
cd s2p_matrix
```

### 2. Create virtual environment
```bash
python -m venv venv
venv\Scripts\activate     # Windows
source venv/bin/activate  # Mac/Linux
```

### 3. Install dependencies
```bash
pip install -r requirements.txt
```

### 4. Setup environment
```bash
cp .env.example .env
# Edit .env with your MySQL credentials
```

### 5. Setup database
```bash
# In MySQL:
CREATE DATABASE s2p_matrix CHARACTER SET utf8mb4;
# Then run: database/schema.sql and database/seed_data.sql
```

### 6. Start the server
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

### 7. Open frontend
```
Open frontend/index.html with Live Server
```

---

## 📁 Project Structure
```
s2p_matrix/
├── backend/
│   └── app/
│       ├── main.py
│       ├── database.py
│       ├── models/
│       ├── routers/        ← 11 API modules
│       ├── services/       ← AI + scoring engines
│       └── utils/          ← SAP mock + audit
├── frontend/
│   ├── index.html          ← Dashboard
│   ├── css/style.css
│   ├── js/api.js
│   └── pages/              ← 14 module pages
├── database/
│   ├── schema.sql
│   └── seed_data.sql
├── requirements.txt
└── .env.example
```

---

## 🔑 API Documentation

Once running: `http://localhost:8000/docs`

---

## 👤 Author

Built for Matrix Comsec Pvt. Ltd. — Gujarat, India