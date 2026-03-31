# routers/invoices.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.database import get_db
from app.models.invoice import Invoice, GRN, GRNItem
from app.models.purchase_order import PurchaseOrder, POItem
from app.models.payment import Payment
from pydantic import BaseModel
from typing import Optional, List
from datetime import date, datetime

router = APIRouter()

class InvoiceCreate(BaseModel):
    invoice_number : str
    vendor_id      : int
    po_id          : Optional[int] = None
    grn_id         : Optional[int] = None
    invoice_date   : date
    due_date       : Optional[date] = None
    subtotal       : float
    tax_amount     : Optional[float] = 0.0
    total_amount   : float

class GRNCreate(BaseModel):
    po_id         : int
    vendor_id     : int
    received_date : date
    received_by   : Optional[str] = "warehouse"
    notes         : Optional[str] = None

class PaymentCreate(BaseModel):
    invoice_id     : int
    vendor_id      : int
    amount         : float
    payment_mode   : Optional[str] = "NEFT"
    payment_date   : date
    bank_reference : Optional[str] = None
    notes          : Optional[str] = None

def generate_ref(prefix: str, db: Session, model) -> str:
    year  = datetime.now().year
    count = db.query(func.count(model.id)).scalar()
    return f"{prefix}-{year}-{str(count + 1).zfill(4)}"

# ── INVOICE ROUTES ────────────────────────────────────────────

@router.get("/")
def get_invoices(match_status: Optional[str] = None, db: Session = Depends(get_db)):
    query = db.query(Invoice)
    if match_status:
        query = query.filter(Invoice.match_status == match_status)
    return {"invoices": query.order_by(Invoice.created_at.desc()).all()}

@router.post("/")
def create_invoice(data: InvoiceCreate, db: Session = Depends(get_db)):
    # Duplicate check
    dup = db.query(Invoice).filter(
        Invoice.invoice_number == data.invoice_number,
        Invoice.vendor_id      == data.vendor_id
    ).first()

    internal_ref = generate_ref("INV", db, Invoice)
    invoice = Invoice(
        invoice_number = data.invoice_number,
        internal_ref   = internal_ref,
        vendor_id      = data.vendor_id,
        po_id          = data.po_id,
        grn_id         = data.grn_id,
        invoice_date   = data.invoice_date,
        due_date       = data.due_date,
        subtotal       = data.subtotal,
        tax_amount     = data.tax_amount,
        total_amount   = data.total_amount,
        is_duplicate   = bool(dup),
        status         = "Received",
        match_status   = "Pending"
    )
    db.add(invoice)
    db.commit()
    db.refresh(invoice)

    result = {"message": "Invoice received", "invoice": invoice}
    if dup:
        result["warning"] = "⚠️ Possible duplicate invoice detected!"
    return result

# POST 3-way match (BR-S2P-10)
@router.post("/{invoice_id}/match")
def three_way_match(invoice_id: int, db: Session = Depends(get_db)):
    invoice = db.query(Invoice).filter(Invoice.id == invoice_id).first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    issues = []

    # Check 1: PO exists
    if not invoice.po_id:
        issues.append("No PO linked to this invoice")
    else:
        po = db.query(PurchaseOrder).filter(PurchaseOrder.id == invoice.po_id).first()
        if not po:
            issues.append("Linked PO not found in system")
        else:
            # Check 2: Amount match (allow 2% tolerance)
            tolerance   = float(po.total_amount) * 0.02
            amount_diff = abs(float(invoice.total_amount) - float(po.total_amount))
            if amount_diff > tolerance:
                issues.append(
                    f"Amount mismatch: PO={po.total_amount}, "
                    f"Invoice={invoice.total_amount} (diff={amount_diff:.2f})"
                )

            # Check 3: Vendor match
            if po.vendor_id != invoice.vendor_id:
                issues.append("Vendor on invoice does not match PO vendor")

    # Check 4: GRN exists
    if not invoice.grn_id:
        issues.append("No GRN (Goods Receipt) linked — goods not confirmed received")

    # Set match result
    if not issues:
        invoice.match_status = "Matched"
        invoice.match_notes  = "✅ 3-way match passed: PO, GRN, and Invoice all verified"
        invoice.status       = "Approved"
    elif len(issues) == 1 and "GRN" in issues[0]:
        invoice.match_status = "Partial Match"
        invoice.match_notes  = f"⚠️ Partial: {'; '.join(issues)}"
    else:
        invoice.match_status = "Mismatch"
        invoice.match_notes  = f"❌ Failed: {'; '.join(issues)}"

    db.commit()
    return {
        "invoice_id"   : invoice_id,
        "match_status" : invoice.match_status,
        "issues"       : issues,
        "notes"        : invoice.match_notes
    }

# ── GRN ROUTES ────────────────────────────────────────────────

@router.post("/grn/")
def create_grn(data: GRNCreate, db: Session = Depends(get_db)):
    grn = GRN(
        grn_number    = generate_ref("GRN", db, GRN),
        po_id         = data.po_id,
        vendor_id     = data.vendor_id,
        received_date = data.received_date,
        received_by   = data.received_by,
        notes         = data.notes
    )
    db.add(grn)
    # Update PO status
    po = db.query(PurchaseOrder).filter(PurchaseOrder.id == data.po_id).first()
    if po:
        po.status = "Received"
    db.commit()
    db.refresh(grn)
    return {"message": "GRN created", "grn_number": grn.grn_number, "grn": grn}

# ── PAYMENT ROUTES ────────────────────────────────────────────

@router.post("/payments/")
def create_payment(data: PaymentCreate, db: Session = Depends(get_db)):
    payment = Payment(
        payment_ref    = generate_ref("PAY", db, Payment),
        invoice_id     = data.invoice_id,
        vendor_id      = data.vendor_id,
        amount         = data.amount,
        payment_mode   = data.payment_mode,
        payment_date   = data.payment_date,
        bank_reference = data.bank_reference,
        notes          = data.notes,
        status         = "Processed"
    )
    db.add(payment)

    # Update invoice payment status
    invoice = db.query(Invoice).filter(Invoice.id == data.invoice_id).first()
    if invoice:
        paid = db.query(func.sum(Payment.amount)).filter(
            Payment.invoice_id == data.invoice_id
        ).scalar() or 0
        paid += data.amount
        if float(paid) >= float(invoice.total_amount):
            invoice.payment_status = "Paid"
            invoice.status         = "Paid"
        else:
            invoice.payment_status = "Partially Paid"

    db.commit()
    db.refresh(payment)
    return {"message": "Payment recorded", "payment": payment}

@router.get("/payments/")
def get_payments(db: Session = Depends(get_db)):
    return {"payments": db.query(Payment).order_by(Payment.payment_date.desc()).all()}

# ── PAYMENT ALERTS (BR-S2P-11) — add at bottom of invoices.py ──

@router.get("/alerts/overdue")
def get_overdue_payments(db: Session = Depends(get_db)):
    """Invoices past due date — BR-S2P-11"""
    from datetime import date
    today    = date.today()
    invoices = db.query(Invoice).filter(
        Invoice.payment_status.in_(["Unpaid", "Partially Paid"]),
        Invoice.due_date < today,
        Invoice.due_date.isnot(None)
    ).all()
    result = []
    for inv in invoices:
        vendor   = db.query(Vendor).filter(Vendor.id == inv.vendor_id).first() if inv.vendor_id else None
        overdue_days = (today - inv.due_date).days
        result.append({
            "internal_ref"  : inv.internal_ref,
            "invoice_number": inv.invoice_number,
            "vendor_name"   : vendor.company_name if vendor else "Unknown",
            "total_amount"  : float(inv.total_amount),
            "due_date"      : str(inv.due_date),
            "overdue_days"  : overdue_days,
            "payment_status": inv.payment_status,
            "urgency"       : "CRITICAL" if overdue_days > 30 else "HIGH" if overdue_days > 15 else "MEDIUM"
        })
    result.sort(key=lambda x: x["overdue_days"], reverse=True)
    total_overdue = sum(r["total_amount"] for r in result)
    return {
        "total_overdue_invoices": len(result),
        "total_overdue_amount"  : round(total_overdue, 2),
        "invoices"              : result
    }