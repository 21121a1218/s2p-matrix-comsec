# routers/negotiations.py — BR-S2P-06 Negotiation Tracking
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import Column, Integer, String, Text, DateTime, DECIMAL, Enum, ForeignKey, Boolean
from app.database import get_db, Base
from app.models.vendor import Vendor
from app.models.purchase_order import PurchaseOrder
from pydantic import BaseModel
from typing import Optional
from datetime import datetime

router = APIRouter()

class Negotiation(Base):
    __tablename__ = "negotiations"
    id                  = Column(Integer, primary_key=True, index=True)
    negotiation_ref     = Column(String(30), unique=True)
    vendor_id           = Column(Integer, ForeignKey("vendors.id"))
    rfq_id              = Column(Integer, nullable=True)
    po_id               = Column(Integer, ForeignKey("purchase_orders.id"), nullable=True)
    subject             = Column(String(255), nullable=False)
    initial_price       = Column(DECIMAL(15,2))
    target_price        = Column(DECIMAL(15,2))
    agreed_price        = Column(DECIMAL(15,2))
    savings_achieved    = Column(DECIMAL(15,2), default=0)
    savings_percent     = Column(DECIMAL(5,2),  default=0)
    payment_terms       = Column(String(100))
    delivery_commitment = Column(String(100))
    warranty_terms      = Column(String(100))
    status              = Column(Enum("Open","In Progress","Agreed","Closed","Failed"), default="Open")
    outcome_notes       = Column(Text)
    negotiated_by       = Column(String(100))
    created_at          = Column(DateTime, default=datetime.utcnow)
    updated_at          = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class NegotiationCreate(BaseModel):
    vendor_id           : int
    rfq_id              : Optional[int] = None
    po_id               : Optional[int] = None
    subject             : str
    initial_price       : float
    target_price        : float
    payment_terms       : Optional[str] = None
    delivery_commitment : Optional[str] = None
    warranty_terms      : Optional[str] = None
    negotiated_by       : Optional[str] = "Procurement Team"

class NegotiationUpdate(BaseModel):
    agreed_price        : Optional[float] = None
    payment_terms       : Optional[str]   = None
    delivery_commitment : Optional[str]   = None
    warranty_terms      : Optional[str]   = None
    status              : Optional[str]   = None
    outcome_notes       : Optional[str]   = None

def gen_neg_ref(db: Session) -> str:
    from sqlalchemy import func
    count = db.query(func.count(Negotiation.id)).scalar()
    return f"NEG-{datetime.now().year}-{str(count+1).zfill(4)}"

@router.get("/")
def get_negotiations(status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Negotiation)
    if status:
        query = query.filter(Negotiation.status == status)
    negs = query.order_by(Negotiation.created_at.desc()).all()
    result = []
    for n in negs:
        vendor = db.query(Vendor).filter(Vendor.id == n.vendor_id).first()
        result.append({
            "id"                 : n.id,
            "negotiation_ref"    : n.negotiation_ref,
            "vendor_name"        : vendor.company_name if vendor else "Unknown",
            "vendor_id"          : n.vendor_id,
            "subject"            : n.subject,
            "initial_price"      : float(n.initial_price or 0),
            "target_price"       : float(n.target_price or 0),
            "agreed_price"       : float(n.agreed_price or 0) if n.agreed_price else None,
            "savings_achieved"   : float(n.savings_achieved or 0),
            "savings_percent"    : float(n.savings_percent or 0),
            "payment_terms"      : n.payment_terms,
            "delivery_commitment": n.delivery_commitment,
            "warranty_terms"     : n.warranty_terms,
            "status"             : n.status,
            "outcome_notes"      : n.outcome_notes,
            "negotiated_by"      : n.negotiated_by,
            "created_at"         : str(n.created_at)
        })
    total_savings = sum(r["savings_achieved"] for r in result)
    return {"total": len(result), "total_savings_inr": total_savings, "negotiations": result}

@router.post("/")
def create_negotiation(data: NegotiationCreate, db: Session = Depends(get_db)):
    neg = Negotiation(
        negotiation_ref     = gen_neg_ref(db),
        vendor_id           = data.vendor_id,
        rfq_id              = data.rfq_id,
        po_id               = data.po_id,
        subject             = data.subject,
        initial_price       = data.initial_price,
        target_price        = data.target_price,
        payment_terms       = data.payment_terms,
        delivery_commitment = data.delivery_commitment,
        warranty_terms      = data.warranty_terms,
        negotiated_by       = data.negotiated_by,
        status              = "Open"
    )
    db.add(neg)
    db.commit()
    db.refresh(neg)
    return {"message": "Negotiation started", "ref": neg.negotiation_ref}

@router.patch("/{neg_id}/close")
def close_negotiation(neg_id: int, data: NegotiationUpdate, db: Session = Depends(get_db)):
    neg = db.query(Negotiation).filter(Negotiation.id == neg_id).first()
    if not neg:
        raise HTTPException(status_code=404, detail="Negotiation not found")

    if data.agreed_price:
        neg.agreed_price     = data.agreed_price
        # Calculate savings
        savings              = float(neg.initial_price) - float(data.agreed_price)
        neg.savings_achieved = max(savings, 0)
        neg.savings_percent  = round((savings / float(neg.initial_price)) * 100, 2) if neg.initial_price else 0

    for field, value in data.dict(exclude_none=True).items():
        if field not in ["agreed_price"]:
            setattr(neg, field, value)

    neg.updated_at = datetime.utcnow()
    db.commit()
    return {
        "message"         : "Negotiation updated",
        "savings_achieved": float(neg.savings_achieved or 0),
        "savings_percent" : float(neg.savings_percent or 0)
    }

@router.get("/summary")
def negotiation_summary(db: Session = Depends(get_db)):
    """Overall savings tracking — BR-S2P-06"""
    from sqlalchemy import func
    negs = db.query(Negotiation).filter(Negotiation.status == "Agreed").all()
    total_initial = sum(float(n.initial_price or 0) for n in negs)
    total_agreed  = sum(float(n.agreed_price  or 0) for n in negs if n.agreed_price)
    total_savings = total_initial - total_agreed
    return {
        "total_negotiations"   : len(negs),
        "total_initial_value"  : round(total_initial, 2),
        "total_agreed_value"   : round(total_agreed,  2),
        "total_savings_inr"    : round(total_savings,  2),
        "avg_savings_percent"  : round(
            sum(float(n.savings_percent or 0) for n in negs) / len(negs), 2
        ) if negs else 0
    }