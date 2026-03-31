# routers/vendors.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.vendor import Vendor, VendorDocument
from app.models.payment import VendorPerformance          # ← ADD THIS
from app.services.vendor_scorer import score_vendor, score_all_vendors  # ← ADD THIS
from app.services.ai_discovery import discover_vendors_for_category, get_market_benchmark  # ← ADD THIS
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter()

# ── Pydantic Schemas ──────────────────────────────────────────
class VendorCreate(BaseModel):
    company_name    : str
    contact_person  : Optional[str] = None
    email           : str
    phone           : Optional[str] = None
    address         : Optional[str] = None
    city            : Optional[str] = None
    state           : Optional[str] = None
    pincode         : Optional[str] = None
    category        : str   # Electronic / Mechanical / Both
    vendor_type     : Optional[str] = "Distributor"
    oem_approved    : Optional[bool] = False
    oem_brand       : Optional[str] = None
    gst_number      : Optional[str] = None
    pan_number      : Optional[str] = None
    msme_registered : Optional[bool] = False

class VendorUpdate(BaseModel):
    company_name    : Optional[str] = None
    contact_person  : Optional[str] = None
    phone           : Optional[str] = None
    address         : Optional[str] = None
    city            : Optional[str] = None
    state           : Optional[str] = None
    category        : Optional[str] = None
    vendor_type     : Optional[str] = None
    oem_approved    : Optional[bool] = None
    oem_brand       : Optional[str] = None
    gst_number      : Optional[str] = None
    status          : Optional[str] = None

# ── Helper: Auto-generate vendor code ────────────────────────
def generate_vendor_code(db: Session) -> str:
    count = db.query(func.count(Vendor.id)).scalar()
    return f"VEN-{str(count + 1).zfill(4)}"

# ── ROUTES ────────────────────────────────────────────────────

# GET all vendors
@router.get("/")
def get_vendors(
    status   : Optional[str] = None,
    category : Optional[str] = None,
    db       : Session = Depends(get_db)
):
    query = db.query(Vendor)
    if status:
        query = query.filter(Vendor.status == status)
    if category:
        query = query.filter(Vendor.category == category)
    vendors = query.order_by(Vendor.created_at.desc()).all()
    return {"total": len(vendors), "vendors": vendors}

# GET single vendor
@router.get("/{vendor_id}")
def get_vendor(vendor_id: int, db: Session = Depends(get_db)):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    return vendor

# POST create vendor
@router.post("/")
def create_vendor(data: VendorCreate, db: Session = Depends(get_db)):
    # Check duplicate email
    existing = db.query(Vendor).filter(Vendor.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    vendor = Vendor(
        vendor_code    = generate_vendor_code(db),
        company_name   = data.company_name,
        contact_person = data.contact_person,
        email          = data.email,
        phone          = data.phone,
        address        = data.address,
        city           = data.city,
        state          = data.state,
        pincode        = data.pincode,
        category       = data.category,
        vendor_type    = data.vendor_type,
        oem_approved   = data.oem_approved,
        oem_brand      = data.oem_brand,
        gst_number     = data.gst_number,
        pan_number     = data.pan_number,
        msme_registered = data.msme_registered,
        status         = "Pending"
    )
    db.add(vendor)
    db.commit()
    db.refresh(vendor)
    return {"message": "Vendor created successfully", "vendor": vendor}

# PATCH update vendor
@router.patch("/{vendor_id}")
def update_vendor(vendor_id: int, data: VendorUpdate, db: Session = Depends(get_db)):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    for field, value in data.dict(exclude_none=True).items():
        setattr(vendor, field, value)

    db.commit()
    db.refresh(vendor)
    return {"message": "Vendor updated", "vendor": vendor}

# POST approve vendor (BR-S2P-05)
@router.post("/{vendor_id}/approve")
def approve_vendor(vendor_id: int, approver: str, db: Session = Depends(get_db)):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")

    vendor.status      = "Approved"
    vendor.approved_by = approver
    vendor.approved_at = datetime.utcnow()
    db.commit()
    return {"message": f"Vendor {vendor.company_name} approved by {approver}"}

# POST reject/blacklist vendor
@router.post("/{vendor_id}/blacklist")
def blacklist_vendor(vendor_id: int, db: Session = Depends(get_db)):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    vendor.status = "Blacklisted"
    db.commit()
    return {"message": f"Vendor {vendor.company_name} blacklisted"}

# DELETE vendor
@router.delete("/{vendor_id}")
def delete_vendor(vendor_id: int, db: Session = Depends(get_db)):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    db.delete(vendor)
    db.commit()
    return {"message": "Vendor deleted"}

# GET vendor performance history
@router.get("/{vendor_id}/performance")
def get_vendor_performance(vendor_id: int, db: Session = Depends(get_db)):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    history = db.query(VendorPerformance).filter(
        VendorPerformance.vendor_id == vendor_id
    ).order_by(VendorPerformance.evaluated_at.desc()).all()
    return {
        "vendor"  : {"id": vendor.id, "name": vendor.company_name,
                     "code": vendor.vendor_code},
        "history" : history
    }

# POST score a single vendor
@router.post("/{vendor_id}/score")
def score_single_vendor(
    vendor_id: int,
    period   : Optional[str] = None,
    db       : Session = Depends(get_db)
):
    vendor = db.query(Vendor).filter(Vendor.id == vendor_id).first()
    if not vendor:
        raise HTTPException(status_code=404, detail="Vendor not found")
    result = score_vendor(vendor_id, db, period)
    return {"message": "Vendor scored successfully", "result": result}

# POST score ALL approved vendors
@router.post("/score-all")
def score_all(db: Session = Depends(get_db)):
    results = score_all_vendors(db)
    return {
        "message"       : f"Scored {len(results)} vendors",
        "leaderboard"   : results
    }

# GET AI vendor discovery (BR-S2P-01)
@router.get("/discover/{category}")
def discover_vendors(
    category : str,
    oem_only : bool  = False,
    min_score: float = 0.0,
    db       : Session = Depends(get_db)
):
    results = discover_vendors_for_category(category, db, min_score, oem_only)
    return {
        "category"     : category,
        "total_found"  : len(results),
        "vendors"      : results
    }

# GET market benchmark for a category
@router.get("/benchmark/{category}")
def market_benchmark(category: str, db: Session = Depends(get_db)):
    return get_market_benchmark(category, db)
