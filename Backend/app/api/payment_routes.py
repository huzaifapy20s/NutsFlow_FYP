from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.services.payment_service import PaymentService
from app.utils.api_response import error_response, success_response

payment_bp = Blueprint("payment_bp", __name__)


@payment_bp.post("/customer")
@jwt_required()
def create_customer_payment():
    try:
        result = PaymentService.create_customer_payment(request.get_json() or {}, int(get_jwt_identity()))
        return success_response(result, "Customer payment recorded successfully.", 201)
    except ValueError as exc:
        return error_response(str(exc), 400)
    except LookupError as exc:
        return error_response(str(exc), 404)
    except Exception:
        return error_response("Failed to record customer payment.", 500)


@payment_bp.post("/supplier")
@jwt_required()
def create_supplier_payment():
    try:
        result = PaymentService.create_supplier_payment(request.get_json() or {}, int(get_jwt_identity()))
        return success_response(result, "Supplier payment recorded successfully.", 201)
    except ValueError as exc:
        return error_response(str(exc), 400)
    except LookupError as exc:
        return error_response(str(exc), 404)
    except Exception:
        return error_response("Failed to record supplier payment.", 500)