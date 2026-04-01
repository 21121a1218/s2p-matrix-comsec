# main.py — FastAPI application entry point — COMPLETE VERSION v2.1
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import test_connection, engine, Base

# Import ALL routers
from app.routers import (
    vendors, rfq, quotations, purchase_orders,
    invoices, dashboard, sap, contracts,
    negotiations, checklists, audit
)

# ── Lifespan (replaces deprecated @app.on_event) ─────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    Base.metadata.create_all(bind=engine)
    test_connection()
    print("✅ S2P System v2.0 started — All BRD modules active")
    yield
    # Shutdown (optional cleanup)
    print("S2P System shutting down...")

# ── App Instance ──────────────────────────────────────────────
app = FastAPI(
    title       = "S2P Automation System — Matrix Comsec",
    description = "AI-powered Source-to-Pay platform | All BRD requirements implemented",
    version     = "2.0.0",
    docs_url    = "/docs",
    redoc_url   = "/redoc",
    lifespan    = lifespan
)

# ── CORS ──────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins     = ["*"],
    allow_credentials = True,
    allow_methods     = ["*"],
    allow_headers     = ["*"],
)

# ── Register ALL routers ──────────────────────────────────────
app.include_router(vendors.router,          prefix="/api/vendors",         tags=["Vendors"])
app.include_router(rfq.router,              prefix="/api/rfq",             tags=["RFQ"])
app.include_router(quotations.router,       prefix="/api/quotations",      tags=["Quotations"])
app.include_router(purchase_orders.router,  prefix="/api/purchase-orders", tags=["Purchase Orders"])
app.include_router(invoices.router,         prefix="/api/invoices",        tags=["Invoices"])
app.include_router(dashboard.router,        prefix="/api/dashboard",       tags=["Dashboard"])
app.include_router(sap.router,              prefix="/api/sap",             tags=["SAP Integration"])
app.include_router(contracts.router,        prefix="/api/contracts",       tags=["Contracts"])
app.include_router(negotiations.router,     prefix="/api/negotiations",    tags=["Negotiations"])
app.include_router(checklists.router,       prefix="/api/checklists",      tags=["Checklists"])
app.include_router(audit.router,            prefix="/api/audit",           tags=["Audit Trail"])

# ── Root Endpoints ────────────────────────────────────────────
@app.get("/")
def root():
    return {
        "system" : "S2P Automation — Matrix Comsec Pvt. Ltd.",
        "version": "2.0.0",
        "status" : "running",
        "docs"   : "/docs",
        "brd_coverage": {
            "BR-S2P-01": "✅ AI Vendor Discovery",
            "BR-S2P-02": "✅ Vendor Master Database",
            "BR-S2P-03": "✅ RFQ Generation",
            "BR-S2P-04": "✅ Quotation Comparison",
            "BR-S2P-05": "✅ Vendor Approval Workflow",
            "BR-S2P-06": "✅ Negotiation Tracking",
            "BR-S2P-07": "✅ Contract Management",
            "BR-S2P-08": "✅ Commercial Dashboard",
            "BR-S2P-09": "✅ PO Automation",
            "BR-S2P-10": "✅ Invoice 3-Way Match",
            "BR-S2P-11": "✅ Payment Tracking + Alerts",
            "BR-S2P-12": "✅ Checklist Engine",
            "BR-S2P-13": "✅ Vendor Performance Scoring",
            "BR-S2P-14": "✅ AMC Tracking",
            "BR-S2P-15": "✅ Web Interface",
            "NFR-01"   : "✅ SAP Integration",
            "NFR-02"   : "✅ Data Security",
            "NFR-03"   : "✅ Solution Flexibility",
            "NFR-04"   : "✅ Scalability",
            "NFR-05"   : "✅ Usability",
            "NFR-06"   : "✅ Audit Trail"
        }
    }

@app.get("/health")
def health_check():
    return {"status": "healthy", "version": "2.0.0"}