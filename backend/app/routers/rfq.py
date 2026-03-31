# routers/rfq.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.rfq import RFQ, RFQItem, RFQVendor
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime

router = APIRouter()

# ── Pydantic Schemas ──────────────────────────────────────────
class RFQItemIn(BaseModel):
    item_code     : Optional[str] = None
    description   : str
    quantity      : float
    unit          : Optional[str] = "PCS"
    specification : Optional[str] = None

class RFQCreate(BaseModel):
    title           : str
    description     : Optional[str] = None
    category_id     : Optional[int] = None
    issue_date      : date
    deadline        : date
    estimated_value : Optional[float] = None
    created_by      : Optional[str] = "system"
    items           : List[RFQItemIn] = []
    vendor_ids      : List[int] = []

# ── Helper ────────────────────────────────────────────────────
def generate_rfq_number(db: Session) -> str:
    year  = datetime.now().year
    count = db.query(func.count(RFQ.id)).scalar()
    return f"RFQ-{year}-{str(count + 1).zfill(4)}"

# ── ROUTES ────────────────────────────────────────────────────

# GET all RFQs
@router.get("/")
def get_rfqs(status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(RFQ)
    if status:
        query = query.filter(RFQ.status == status)
    rfqs = query.order_by(RFQ.created_at.desc()).all()
    return {"total": len(rfqs), "rfqs": rfqs}

# GET single RFQ with items
@router.get("/{rfq_id}")
def get_rfq(rfq_id: int, db: Session = Depends(get_db)):
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    return rfq

# POST create RFQ
@router.post("/")
def create_rfq(data: RFQCreate, db: Session = Depends(get_db)):
    rfq = RFQ(
        rfq_number      = generate_rfq_number(db),
        title           = data.title,
        description     = data.description,
        category_id     = data.category_id,
        issue_date      = data.issue_date,
        deadline        = data.deadline,
        estimated_value = data.estimated_value,
        created_by      = data.created_by,
        status          = "Draft"
    )
    db.add(rfq)
    db.flush()  # get rfq.id before commit

    # Add line items
    for item in data.items:
        db.add(RFQItem(
            rfq_id        = rfq.id,
            item_code     = item.item_code,
            description   = item.description,
            quantity      = item.quantity,
            unit          = item.unit,
            specification = item.specification
        ))

    # Assign vendors
    for vendor_id in data.vendor_ids:
        db.add(RFQVendor(rfq_id=rfq.id, vendor_id=vendor_id))

    db.commit()
    db.refresh(rfq)
    return {"message": "RFQ created", "rfq_number": rfq.rfq_number, "rfq": rfq}

# POST send RFQ to vendors
@router.post("/{rfq_id}/send")
def send_rfq(rfq_id: int, db: Session = Depends(get_db)):
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    if rfq.status != "Draft":
        raise HTTPException(status_code=400, detail=f"RFQ is already {rfq.status}")

    rfq.status = "Sent"
    # Mark all vendor assignments as sent
    for rv in rfq.vendors:
        rv.sent_at = datetime.utcnow()

    db.commit()
    return {
        "message"      : f"RFQ {rfq.rfq_number} sent to {len(rfq.vendors)} vendor(s)",
        "vendors_count": len(rfq.vendors)
    }

# PATCH update RFQ status
@router.patch("/{rfq_id}/status")
def update_rfq_status(rfq_id: int, status: str, db: Session = Depends(get_db)):
    rfq = db.query(RFQ).filter(RFQ.id == rfq_id).first()
    if not rfq:
        raise HTTPException(status_code=404, detail="RFQ not found")
    rfq.status = status
    db.commit()
    return {"message": f"RFQ status updated to {status}"}