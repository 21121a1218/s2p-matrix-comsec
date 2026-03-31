# routers/purchase_orders.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.purchase_order import PurchaseOrder, POItem
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime

router = APIRouter()

class POItemIn(BaseModel):
    item_code   : Optional[str] = None
    description : str
    quantity    : float
    unit        : Optional[str] = "PCS"
    unit_price  : float
    tax_percent : Optional[float] = 18.0

class POCreate(BaseModel):
    vendor_id        : int
    quotation_id     : Optional[int] = None
    rfq_id           : Optional[int] = None
    po_date          : date
    delivery_date    : Optional[date] = None
    payment_terms    : Optional[str] = None
    delivery_address : Optional[str] = None
    created_by       : Optional[str] = "system"
    notes            : Optional[str] = None
    items            : List[POItemIn] = []

def generate_po_number(db: Session) -> str:
    year  = datetime.now().year
    count = db.query(func.count(PurchaseOrder.id)).scalar()
    return f"PO-{year}-{str(count + 1).zfill(4)}"

# GET all POs
@router.get("/")
def get_pos(status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(PurchaseOrder)
    if status:
        query = query.filter(PurchaseOrder.status == status)
    return {"purchase_orders": query.order_by(PurchaseOrder.created_at.desc()).all()}

# GET single PO
@router.get("/{po_id}")
def get_po(po_id: int, db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="Purchase Order not found")
    return po

# POST create PO
@router.post("/")
def create_po(data: POCreate, db: Session = Depends(get_db)):
    subtotal   = sum(i.quantity * i.unit_price for i in data.items)
    tax_amount = sum(i.quantity * i.unit_price * i.tax_percent / 100 for i in data.items)
    total      = subtotal + tax_amount

    po = PurchaseOrder(
        po_number        = generate_po_number(db),
        vendor_id        = data.vendor_id,
        quotation_id     = data.quotation_id,
        rfq_id           = data.rfq_id,
        po_date          = data.po_date,
        delivery_date    = data.delivery_date,
        subtotal         = subtotal,
        tax_amount       = tax_amount,
        total_amount     = total,
        payment_terms    = data.payment_terms,
        delivery_address = data.delivery_address,
        created_by       = data.created_by,
        notes            = data.notes,
        status           = "Draft"
    )
    db.add(po)
    db.flush()

    for item in data.items:
        db.add(POItem(
            po_id       = po.id,
            item_code   = item.item_code,
            description = item.description,
            quantity    = item.quantity,
            unit        = item.unit,
            unit_price  = item.unit_price,
            tax_percent = item.tax_percent,
            total_price = item.quantity * item.unit_price * (1 + item.tax_percent / 100)
        ))

    db.commit()
    db.refresh(po)
    return {"message": "Purchase Order created", "po_number": po.po_number, "po": po}

# POST submit for approval (L1)
@router.post("/{po_id}/submit")
def submit_for_approval(po_id: int, db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="PO not found")
    po.status = "Pending L1 Approval"
    db.commit()
    return {"message": f"PO {po.po_number} submitted for L1 approval"}

# POST L1 approve
@router.post("/{po_id}/approve-l1")
def approve_l1(po_id: int, approver: str, db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="PO not found")
    po.status        = "Pending L2 Approval"
    po.l1_approver   = approver
    po.l1_approved_at = datetime.utcnow()
    db.commit()
    return {"message": f"L1 approved by {approver}. Sent for L2 approval."}

# POST L2 approve — final approval
@router.post("/{po_id}/approve-l2")
def approve_l2(po_id: int, approver: str, db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="PO not found")
    po.status        = "Approved"
    po.l2_approver   = approver
    po.l2_approved_at = datetime.utcnow()
    db.commit()
    return {"message": f"PO {po.po_number} fully approved by {approver}"}

# POST reject PO
@router.post("/{po_id}/reject")
def reject_po(po_id: int, db: Session = Depends(get_db)):
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == po_id).first()
    if not po:
        raise HTTPException(status_code=404, detail="PO not found")
    po.status = "Cancelled"
    db.commit()
    return {"message": f"PO {po.po_number} rejected"}