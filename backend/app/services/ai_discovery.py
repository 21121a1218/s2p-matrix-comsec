# services/ai_discovery.py
# BR-S2P-01: AI Vendor Discovery & Qualification
# Pure rule-based logic — no numpy/sklearn needed

from sqlalchemy.orm import Session
from app.models.vendor import Vendor
from app.models.payment import VendorPerformance

def discover_vendors_for_category(
    category : str,
    db       : Session,
    min_score: float = 0.0,
    oem_only : bool  = False
) -> list:
    query = db.query(Vendor).filter(
        Vendor.status.in_(["Approved"]),
        Vendor.category.in_([category, "Both"])
    )
    if oem_only:
        query = query.filter(Vendor.oem_approved == True)

    vendors = query.all()
    if not vendors:
        return []

    results = []
    for v in vendors:
        score, reasons, flags = qualify_vendor(v, db)
        if score >= min_score:
            results.append({
                "vendor_id"        : v.id,
                "vendor_code"      : v.vendor_code,
                "company_name"     : v.company_name,
                "category"         : v.category,
                "vendor_type"      : v.vendor_type,
                "city"             : v.city,
                "oem_approved"     : v.oem_approved,
                "oem_brand"        : v.oem_brand,
                "gst_number"       : v.gst_number,
                "msme_registered"  : v.msme_registered,
                "performance_score": float(v.performance_score or 0),
                "ai_match_score"   : score,
                "qualification"    : reasons,
                "risk_flags"       : flags,
                "recommendation"   : get_recommendation(score, flags)
            })

    results.sort(key=lambda x: x["ai_match_score"], reverse=True)
    return results


def qualify_vendor(vendor: Vendor, db: Session) -> tuple:
    score   = 0.0
    reasons = []
    flags   = []

    # Rule 1: OEM Approval (+25)
    if vendor.oem_approved:
        score += 25
        reasons.append(f"✅ OEM approved for {vendor.oem_brand or 'known brand'}")
    else:
        flags.append("⚠️ No OEM approval — verify product authenticity")

    # Rule 2: GST Registration (+15)
    if vendor.gst_number:
        score += 15
        reasons.append("✅ GST registered — tax compliance confirmed")
    else:
        flags.append("❌ Missing GST number — compliance risk")

    # Rule 3: Performance Score (+30 max)
    perf = float(vendor.performance_score or 0)
    if perf >= 80:
        score += 30
        reasons.append(f"✅ Excellent performance score: {perf}/100")
    elif perf >= 60:
        score += 20
        reasons.append(f"✅ Good performance score: {perf}/100")
    elif perf >= 40:
        score += 10
        reasons.append(f"⚠️ Average performance score: {perf}/100")
    elif perf == 0:
        score += 15
        reasons.append("ℹ️ No performance history — new vendor")
    else:
        flags.append(f"❌ Low performance score: {perf}/100")

    # Rule 4: MSME Bonus (+5)
    if vendor.msme_registered:
        score += 5
        reasons.append("✅ MSME registered — preferred policy")

    # Rule 5: Vendor Type (+3 to +10)
    if vendor.vendor_type == "OEM":
        score += 10
        reasons.append("✅ Direct OEM — best pricing & warranty")
    elif vendor.vendor_type == "Distributor":
        score += 7
        reasons.append("✅ Authorised distributor — reliable supply")
    elif vendor.vendor_type == "Trader":
        score += 3
        flags.append("⚠️ Trader — verify product authenticity")

    # Rule 6: Local vendor (+5)
    gujarat_cities = ["ahmedabad","surat","vadodara","rajkot",
                      "gandhinagar","anand","bharuch"]
    if vendor.city and vendor.city.lower() in gujarat_cities:
        score += 5
        reasons.append("✅ Gujarat-based — faster delivery")

    score = min(round(score, 2), 100.0)
    return score, reasons, flags


def get_recommendation(score: float, flags: list) -> str:
    critical = [f for f in flags if f.startswith("❌")]
    if score >= 80 and not critical:
        return "🟢 STRONGLY RECOMMENDED"
    elif score >= 65 and not critical:
        return "🟡 RECOMMENDED"
    elif score >= 50:
        return "🟠 CONDITIONAL — address risk flags first"
    elif score >= 35:
        return "🔴 CAUTION — additional vetting required"
    else:
        return "⛔ NOT RECOMMENDED"


def get_market_benchmark(category: str, db: Session) -> dict:
    vendors = db.query(Vendor).filter(
        Vendor.category.in_([category, "Both"]),
        Vendor.status == "Approved"
    ).all()

    if not vendors:
        return {"message": "No benchmark data available"}

    scores = [float(v.performance_score or 0) for v in vendors]

    # Pure Python stats — no numpy needed
    avg_score = round(sum(scores) / len(scores), 2) if scores else 0
    top_score = round(max(scores), 2) if scores else 0
    low_score = round(min(scores), 2) if scores else 0

    return {
        "category"    : category,
        "total_vendors": len(vendors),
        "avg_score"   : avg_score,
        "top_score"   : top_score,
        "low_score"   : low_score,
        "oem_vendors" : sum(1 for v in vendors if v.oem_approved),
        "msme_vendors": sum(1 for v in vendors if v.msme_registered),
    }