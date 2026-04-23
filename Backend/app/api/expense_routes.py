from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, jwt_required

from app.models import Expense
from app.services.expense_service import ExpenseService
from app.utils.api_response import error_response, success_response

expense_bp = Blueprint("expense_bp", __name__)


@expense_bp.post("")
@jwt_required()
def create_expense():
    try:
        result = ExpenseService.create_expense(request.get_json() or {}, int(get_jwt_identity()))
        return success_response(result, "Expense recorded successfully.", 201)
    except ValueError as exc:
        return error_response(str(exc), 400)
    except LookupError as exc:
        return error_response(str(exc), 404)
    except Exception:
        return error_response("Failed to record expense.", 500)


@expense_bp.get("")
@jwt_required()
def list_expenses():
    expenses = (
        Expense.query.order_by(Expense.created_at.asc(), Expense.id.asc()).all()
    )
    return success_response(
        [
            {
                "id": expense.id,
                "expense_date": expense.expense_date.isoformat(),
                "amount": str(expense.amount),
                "description": expense.description,
                "reference_number": expense.reference_number,
            }
            for expense in expenses
        ],
        "Expenses fetched successfully.",
    )