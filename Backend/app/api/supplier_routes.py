from flask import Blueprint, request
from flask_jwt_extended import jwt_required

from app.models import Supplier, db
from app.utils.api_response import error_response, success_response
from app.utils.validators import parse_decimal

supplier_bp = Blueprint("supplier_bp", __name__)


@supplier_bp.get("")
@jwt_required()
def list_suppliers():
    suppliers = Supplier.query.filter_by(is_active=True).order_by(Supplier.supplier_name.asc()).all()
    return success_response(
        [
            {
                "id": supplier.id,
                "supplier_name": supplier.supplier_name,
                "contact_person": supplier.contact_person,
                "phone": supplier.phone,
                "email": supplier.email,
                "address": supplier.address,
                "opening_balance": str(supplier.opening_balance),
                "is_active": supplier.is_active,
            }
            for supplier in suppliers
        ],
        "Suppliers fetched successfully.",
    )


@supplier_bp.post("")
@jwt_required()
def create_supplier():
    try:
        payload = request.get_json() or {}
        supplier = Supplier(
            supplier_name=payload["supplier_name"].strip(),
            contact_person=payload.get("contact_person"),
            phone=payload.get("phone"),
            email=payload.get("email"),
            address=payload.get("address"),
            opening_balance=parse_decimal(payload.get("opening_balance", 0), "opening_balance"),
        )
        db.session.add(supplier)
        db.session.commit()
        return success_response({"id": supplier.id}, "Supplier created successfully.", 201)
    except KeyError as exc:
        db.session.rollback()
        return error_response(f"Missing required field: {exc.args[0]}", 400)
    except ValueError as exc:
        db.session.rollback()
        return error_response(str(exc), 400)
    except Exception:
        db.session.rollback()
        return error_response("Failed to create supplier.", 500)


@supplier_bp.get("/<int:supplier_id>")
@jwt_required()
def get_supplier(supplier_id: int):
    supplier = Supplier.query.get(supplier_id)
    if not supplier:
        return error_response("Supplier not found.", 404)

    return success_response(
        {
            "id": supplier.id,
            "supplier_name": supplier.supplier_name,
            "contact_person": supplier.contact_person,
            "phone": supplier.phone,
            "email": supplier.email,
            "address": supplier.address,
            "opening_balance": str(supplier.opening_balance),
            "is_active": supplier.is_active,
        },
        "Supplier fetched successfully.",
    )


@supplier_bp.put("/<int:supplier_id>")
@jwt_required()
def update_supplier(supplier_id: int):
    supplier = Supplier.query.get(supplier_id)
    if not supplier:
        return error_response("Supplier not found.", 404)

    payload = request.get_json() or {}

    if "supplier_name" in payload:
        supplier.supplier_name = payload["supplier_name"].strip()
    if "contact_person" in payload:
        supplier.contact_person = payload["contact_person"]
    if "phone" in payload:
        supplier.phone = payload["phone"]
    if "email" in payload:
        supplier.email = payload["email"]
    if "address" in payload:
        supplier.address = payload["address"]
    if "opening_balance" in payload:
        supplier.opening_balance = parse_decimal(payload["opening_balance"], "opening_balance")
    if "is_active" in payload:
        supplier.is_active = bool(payload["is_active"])

    db.session.commit()
    return success_response({"id": supplier.id}, "Supplier updated successfully.", 200)


@supplier_bp.delete("/<int:supplier_id>")
@jwt_required()
def delete_supplier(supplier_id: int):
    supplier = Supplier.query.get(supplier_id)
    if not supplier:
        return error_response("Supplier not found.", 404)

    supplier.is_active = False
    db.session.commit()
    return success_response({"id": supplier.id}, "Supplier deactivated successfully.", 200)