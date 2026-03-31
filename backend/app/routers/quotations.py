# routers/quotations.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.quotation import Quotation, QuotationItem
from app.models.rfq import RFQVendor
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime

router = APIRouter()

class QuotationItemIn(BaseModel):
    rfq_item_id : Optional[int] = None
    description : str
    quantity    : float
    unit_price  : float
    tax_percent : Optional[float] = 18.0

class QuotationCreate(BaseModel):
    rfq_id        : int
    vendor_id     : int
    valid_until   : Optional[date] = None
    payment_terms : Optional[str] = None
    delivery_days : Optional[int] = None
    warranty_months: Optional[int] = 0
    notes         : Optional[str] = None
    items         : List[QuotationItemIn] = []

def generate_quotation_number(db: Session) -> str:
    year  = datetime.now().year
    count = db.query(func.count(Quotation.id)).scalar()
    return f"QUO-{year}-{str(count + 1).zfill(4)}"

# GET all quotations (optionally filter by RFQ)
@router.get("/")
def get_quotations(rfq_id: Optional[int] = None, db: Session = Depends(get_db)):
    query = db.query(Quotation)
    if rfq_id:
        query = query.filter(Quotation.rfq_id == rfq_id)
    return {"quotations": query.order_by(Quotation.submitted_at.desc()).all()}

# GET single quotation
@router.get("/{quotation_id}")
def get_quotation(quotation_id: int, db: Session = Depends(get_db)):
    q = db.query(Quotation).filter(Quotation.id == quotation_id).first()
    if not q:
        raise HTTPException(status_code=404, detail="Quotation not found")
    return q

# POST submit quotation
@router.post("/")
def create_quotation(data: QuotationCreate, db: Session = Depends(get_db)):
    # Calculate totals
    subtotal = sum(
        item.quantity * item.unit_price for item in data.items
    )
    tax_amount = sum(
        (item.quantity * item.unit_price * item.tax_percent / 100)
        for item in data.items
    )
    total = subtotal + tax_amount

    quotation = Quotation(
        quotation_number = generate_quotation_number(db),
        rfq_id           = data.rfq_id,
        vendor_id        = data.vendor_id,
        valid_until      = data.valid_until,
        payment_terms    = data.payment_terms,
        delivery_days    = data.delivery_days,
        warranty_months  = data.warranty_months,
        notes            = data.notes,
        subtotal         = subtotal,
        tax_amount       = tax_amount,
        total_amount     = total,
        status           = "Received"
    )
    db.add(quotation)
    db.flush()

    for item in data.items:
        db.add(QuotationItem(
            quotation_id = quotation.id,
            rfq_item_id  = item.rfq_item_id,
            description  = item.description,
            quantity     = item.quantity,
            unit_price   = item.unit_price,
            tax_percent  = item.tax_percent,
            total_price  = item.quantity * item.unit_price * (1 + item.tax_percent / 100)
        ))

    # Update vendor response status on RFQ
    rv = db.query(RFQVendor).filter(
        RFQVendor.rfq_id == data.rfq_id,
        RFQVendor.vendor_id == data.vendor_id
    ).first()
    if rv:
        rv.response_status = "Responded"

    db.commit()
    db.refresh(quotation)
    return {"message": "Quotation submitted", "quotation": quotation}

# GET comparison — all quotes for one RFQ side by side
@router.get("/compare/{rfq_id}")
def compare_quotations(rfq_id: int, db: Session = Depends(get_db)):
    quotes = db.query(Quotation).filter(Quotation.rfq_id == rfq_id).all()
    if not quotes:
        raise HTTPException(status_code=404, detail="No quotations found for this RFQ")

    # Simple rule-based scoring (Phase 6 will add AI)
    min_price    = min(q.total_amount for q in quotes)
    max_delivery = max(q.delivery_days or 999 for q in quotes)

    results = []
    for q in quotes:
        price_score    = round((float(min_price) / float(q.total_amount)) * 40, 2)
        delivery_score = round(((max_delivery - (q.delivery_days or max_delivery)) /
                                max(max_delivery, 1)) * 30, 2)
        warranty_score = min((q.warranty_months or 0) * 2, 20)
        total_score    = round(price_score + delivery_score + warranty_score, 2)

        results.append({
            "quotation_id"    : q.id,
            "quotation_number": q.quotation_number,
            "vendor_id"       : q.vendor_id,
            "total_amount"    : float(q.total_amount),
            "delivery_days"   : q.delivery_days,
            "warranty_months" : q.warranty_months,
            "payment_terms"   : q.payment_terms,
            "price_score"     : price_score,
            "delivery_score"  : delivery_score,
            "warranty_score"  : warranty_score,
            "total_score"     : total_score,
            "recommended"     : False
        })

    # Mark highest scorer as recommended
    results.sort(key=lambda x: x["total_score"], reverse=True)
    if results:
        results[0]["recommended"] = True

    return {"rfq_id": rfq_id, "comparison": results}