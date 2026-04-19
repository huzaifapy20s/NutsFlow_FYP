from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.models import Purchase
from app.services.purchase_service import PurchaseService
from app.utils.api_response import error_response, success_response

purchase_bp = Blueprint("purchase_bp", __name__)


@purchase_bp.post("")
@jwt_required()
def create_purchase():
    try:
        result = PurchaseService.create_purchase(request.get_json() or {}, int(get_jwt_identity()))
        return success_response(result, "Purchase created successfully.", 201)
    except ValueError as exc:
        return error_response(str(exc), 400)
    except LookupError as exc:
        return error_response(str(exc), 404)
    except Exception:
        return error_response("Failed to create purchase.", 500)


@purchase_bp.get("")
@jwt_required()
def list_purchases():
    purchases = Purchase.query.order_by(Purchase.purchase_date.desc()).all()
    return success_response(
        [
            {
                "id": purchase.id,
                "invoice_number": purchase.invoice_number,
                "purchase_date": purchase.purchase_date.isoformat(),
                "supplier_name": purchase.supplier.supplier_name,
                "total_amount": str(purchase.total_amount),
                "paid_amount": str(purchase.paid_amount),
                "balance_due": str(purchase.balance_due),
                "payment_status": purchase.payment_status.value,
            }
            for purchase in purchases
        ],
        "Purchases fetched successfully.",
    )


@purchase_bp.get("/<int:purchase_id>")
@jwt_required()
def get_purchase(purchase_id: int):
    purchase = Purchase.query.get(purchase_id)
    if not purchase:
        return error_response("Purchase not found.", 404)

    return success_response(PurchaseService.serialize_purchase(purchase), "Purchase fetched successfully.", 200)


@purchase_bp.put("/<int:purchase_id>")
@jwt_required()
def update_purchase(purchase_id: int):
    try:
        result = PurchaseService.update_purchase(purchase_id, request.get_json() or {}, int(get_jwt_identity()))
        return success_response(result, "Purchase updated successfully.", 200)
    except ValueError as exc:
        return error_response(str(exc), 400)
    except LookupError as exc:
        return error_response(str(exc), 404)
    except Exception:
        return error_response("Failed to update purchase.", 500)


@purchase_bp.delete("/<int:purchase_id>")
@jwt_required()
def delete_purchase(purchase_id: int):
    try:
        PurchaseService.delete_purchase(purchase_id)
        return success_response(None, "Purchase deleted successfully.", 200)
    except LookupError as exc:
        return error_response(str(exc), 404)
    except Exception:
        return error_response("Failed to delete purchase.", 500)