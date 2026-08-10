"""
ToneWear AI — Products API
GET /api/products         →  filtered product catalog
GET /api/products/{id}    →  single product by ID
"""

import json
from pathlib import Path
from fastapi import APIRouter, HTTPException, Query
from typing import Optional

router = APIRouter()

PRODUCTS_FILE = Path(__file__).parent.parent / "data" / "products.json"


def _load_products() -> list:
    with open(PRODUCTS_FILE, "r", encoding="utf-8") as f:
        return json.load(f)["products"]


# ── GET /api/products ─────────────────────────────────────────────────────────
@router.get("")
async def get_products(
    category:    Optional[str] = Query(None),
    culture:     Optional[str] = Query(None),
    occasion:    Optional[str] = Query(None),
    gender:      Optional[str] = Query(None),
    min_price:   Optional[int] = Query(None),
    max_price:   Optional[int] = Query(None),
    color_family: Optional[str] = Query(None),
    limit:       int           = Query(50)
):
    """Return filtered product catalog."""
    try:
        products = _load_products()
        filtered = []

        for p in products:
            if category    and p.get("category", "").lower()     != category.lower():    continue
            if culture     and p.get("culture", "").lower()      != culture.lower():     continue
            if gender      and p.get("gender", "").lower()       != gender.lower():      continue
            if color_family and p.get("color_family", "").lower() != color_family.lower(): continue
            if min_price   and p.get("price", 0)                 < min_price:            continue
            if max_price   and p.get("price", 0)                 > max_price:            continue
            if occasion:
                occ_list = [o.lower() for o in p.get("occasion", [])]
                if occasion.lower() not in occ_list:
                    continue

            filtered.append(p)

        return {"products": filtered[:limit], "total": len(filtered)}

    except FileNotFoundError:
        raise HTTPException(status_code=500, detail="Products catalog not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── GET /api/products/{product_id} ────────────────────────────────────────────
@router.get("/{product_id}")
async def get_product(product_id: str):
    """Return a single product by ID."""
    try:
        products = _load_products()
        product  = next((p for p in products if p["id"] == product_id), None)

        if not product:
            raise HTTPException(status_code=404, detail=f"Product '{product_id}' not found")

        return product

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
