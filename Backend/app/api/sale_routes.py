from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.models import Sale
from app.services.sale_service import SaleService
from app.utils.api_response import error_response, success_response

sale_bp = Blueprint("sale_bp", __name__)


@sale_bp.post("")
@jwt_required()
def create_sale():
    try:
        result = SaleService.create_sale(request.get_json() or {}, int(get_jwt_identity()))
        return success_response(result, "Sale created successfully.", 201)
    except ValueError as exc:
        return error_response(str(exc), 400)
    except LookupError as exc:
        return error_response(str(exc), 404)
    except Exception:
        return error_response("Failed to create sale.", 500)


@sale_bp.get("")
@jwt_required()
def list_sales():
    sales = Sale.query.order_by(Sale.sale_date.desc()).all()
    return success_response(
        [
            {
                "id": sale.id,
                "invoice_number": sale.invoice_number,
                "sale_date": sale.sale_date.isoformat(),
                "customer_name": sale.customer.full_name if sale.customer else "Walk-in Customer",
                "total_amount": str(sale.total_amount),
                "paid_amount": str(sale.paid_amount),
                "balance_due": str(sale.balance_due),
                "payment_status": sale.payment_status.value,
                "sale_status": sale.sale_status.value,
            }
            for sale in sales
        ],
        "Sales fetched successfully.",
    )


@sale_bp.get("/<int:sale_id>")
@jwt_required()
def get_sale(sale_id: int):
    sale = Sale.query.get(sale_id)
    if not sale:
        return error_response("Sale not found.", 404)

    return success_response(SaleService.serialize_sale(sale), "Sale fetched successfully.", 200)


@sale_bp.delete("/<int:sale_id>")
@jwt_required()
def delete_sale(sale_id: int):
    try:
        result = SaleService.delete_sale(sale_id, int(get_jwt_identity()))
        return success_response(result, "Sale deleted successfully.")
    except ValueError as exc:
        return error_response(str(exc), 400)
    except LookupError as exc:
        return error_response(str(exc), 404)
    except Exception:
        return error_response("Failed to delete sale.", 500)


@sale_bp.put("/<int:sale_id>")
@jwt_required()
def update_sale(sale_id: int):
    try:
        result = SaleService.update_sale(sale_id, request.get_json() or {}, int(get_jwt_identity()))
        return success_response(result, "Sale updated successfully.")
    except ValueError as exc:
        return error_response(str(exc), 400)
    except LookupError as exc:
        return error_response(str(exc), 404)
    except Exception:
        return error_response("Failed to update sale.", 500)