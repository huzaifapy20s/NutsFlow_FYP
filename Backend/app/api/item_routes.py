from flask import Blueprint, request
from flask_jwt_extended import jwt_required

from app.models import Item, db
from app.utils.api_response import error_response, success_response
from app.utils.validators import parse_decimal, require_fields

item_bp = Blueprint("item_bp", __name__)


@item_bp.get("")
@jwt_required()
def list_items():
    items = Item.query.filter_by(is_active=True).order_by(Item.item_name.asc()).all()
    return success_response(
        [
            {
                "id": item.id,
                "item_name": item.item_name,
                "sku": item.sku,
                "category": item.category,
                "unit": item.unit,
                "average_cost": str(item.average_cost),
                "sale_price": str(item.sale_price),
                "stock_quantity": str(item.stock_quantity),
                "low_stock_threshold": str(item.low_stock_threshold),
                "is_active": item.is_active,
                "is_low_stock": item.is_low_stock,
            }
            for item in items
        ],
        "Items fetched successfully.",
    )


@item_bp.post("")
@jwt_required()
def create_item():
    try:
        payload = request.get_json() or {}

        require_fields(payload, [
            "item_name",
            "sku",
            "category",
            "unit",
            "average_cost",
            "sale_price",
            "stock_quantity",
            "low_stock_threshold",
        ])

        item = Item(
            item_name=payload["item_name"].strip(),
            sku=payload["sku"].strip(),
            category=payload["category"].strip(),
            unit=payload["unit"].strip(),
            average_cost=parse_decimal(payload["average_cost"], "average_cost", allow_zero=True),
            sale_price=parse_decimal(payload["sale_price"], "sale_price", allow_zero=True),
            stock_quantity=parse_decimal(payload["stock_quantity"], "stock_quantity", allow_zero=True),
            low_stock_threshold=parse_decimal(payload["low_stock_threshold"], "low_stock_threshold", allow_zero=True),
        )

        db.session.add(item)
        db.session.commit()

        return success_response({"id": item.id}, "Item created successfully.", 201)
    except KeyError as exc:
        db.session.rollback()
        return error_response(f"Missing required field: {exc.args[0]}", 400)
    except ValueError as exc:
        db.session.rollback()
        return error_response(str(exc), 400)
    except Exception:
        db.session.rollback()
        return error_response("Failed to create item.", 500)


@item_bp.get("/<int:item_id>")
@jwt_required()
def get_item(item_id: int):
    item = Item.query.get(item_id)
    if not item:
        return error_response("Item not found.", 404)

    return success_response(
        {
            "id": item.id,
            "item_name": item.item_name,
            "sku": item.sku,
            "category": item.category,
            "unit": item.unit,
            "average_cost": str(item.average_cost),
            "sale_price": str(item.sale_price),
            "stock_quantity": str(item.stock_quantity),
            "low_stock_threshold": str(item.low_stock_threshold),
            "is_active": item.is_active,
        },
        "Item fetched successfully.",
    )


@item_bp.put("/<int:item_id>")
@jwt_required()
def update_item(item_id: int):
    item = Item.query.get(item_id)
    if not item:
        return error_response("Item not found.", 404)

    try:
        payload = request.get_json() or {}

        if "item_name" in payload:
            item.item_name = payload["item_name"].strip()
        if "sku" in payload:
            item.sku = payload["sku"].strip()
        if "category" in payload:
            item.category = payload["category"]
        if "unit" in payload:
            item.unit = payload["unit"].strip()
        if "average_cost" in payload:
            item.average_cost = parse_decimal(payload["average_cost"], "average_cost")
        if "sale_price" in payload:
            item.sale_price = parse_decimal(payload["sale_price"], "sale_price")
        if "stock_quantity" in payload:
            item.stock_quantity = parse_decimal(payload["stock_quantity"], "stock_quantity")
        if "low_stock_threshold" in payload:
            item.low_stock_threshold = parse_decimal(payload["low_stock_threshold"], "low_stock_threshold")
        if "is_active" in payload:
            item.is_active = bool(payload["is_active"])

        db.session.commit()
        return success_response({"id": item.id}, "Item updated successfully.", 200)
    except ValueError as exc:
        db.session.rollback()
        return error_response(str(exc), 400)
    except Exception:
        db.session.rollback()
        return error_response("Failed to update item.", 500)


@item_bp.delete("/<int:item_id>")
@jwt_required()
def delete_item(item_id: int):
    item = Item.query.get(item_id)
    if not item:
        return error_response("Item not found.", 404)

    item.is_active = False
    db.session.commit()
    return success_response({"id": item.id}, "Item deactivated successfully.", 200)