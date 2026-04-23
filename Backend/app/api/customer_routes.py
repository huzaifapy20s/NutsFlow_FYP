from flask import Blueprint, request
from flask_jwt_extended import jwt_required

from app.models import Customer, FinancialAccount, ChartOfAccount, db
from app.models.enums import FinancialAccountType
from app.utils.api_response import error_response, success_response
from app.utils.validators import parse_decimal, require_fields, validate_email, validate_phone

customer_bp = Blueprint("customer_bp", __name__)


@customer_bp.get("")
@jwt_required()
def list_customers():
    customers = (
        Customer.query.filter_by(is_active=True)
        .order_by(Customer.created_at.asc(), Customer.id.asc())
        .all()
    )
    return success_response(
        [
            {
                "id": customer.id,
                "full_name": customer.full_name,
                "phone": customer.phone,
                "email": customer.email,
                "address": customer.address,
                "opening_balance": str(customer.opening_balance),
                "is_active": customer.is_active,
            }
            for customer in customers
        ],
        "Customers fetched successfully.",
    )


@customer_bp.post("")
@jwt_required()
def create_customer():
    try:
        payload = request.get_json() or {}
        require_fields(payload, ["full_name", "phone", "email", "address", "opening_balance"])
        validate_email(payload["email"])
        validate_phone(payload["phone"])
        customer = Customer(
            full_name=payload["full_name"].strip(),
            phone=payload["phone"],
            email=payload["email"],
            address=payload["address"],
            opening_balance=parse_decimal(payload["opening_balance"], "opening_balance"),
        )
        db.session.add(customer)
        db.session.commit()

        # Create financial account for the customer
        try:
            chart_account = ChartOfAccount.query.filter_by(account_code="1100").first()
            if chart_account:
                financial_account = FinancialAccount(
                    account_name=f"Customer {customer.id}: {customer.full_name}",
                    account_type=FinancialAccountType.ASSET,
                    chart_account_id=chart_account.id,
                    opening_balance=customer.opening_balance,
                    current_balance=customer.opening_balance,
                )
                db.session.add(financial_account)
                db.session.commit()
        except Exception:
            # Ignore financial account creation errors
            db.session.rollback()

        return success_response({"id": customer.id}, "Customer created successfully.", 201)
    except ValueError as exc:
        db.session.rollback()
        return error_response(str(exc), 400)
    except Exception:
        db.session.rollback()
        return error_response("Failed to create customer.", 500)


@customer_bp.get("/<int:customer_id>")
@jwt_required()
def get_customer(customer_id: int):
    customer = Customer.query.get(customer_id)
    if not customer:
        return error_response("Customer not found.", 404)

    return success_response(
        {
            "id": customer.id,
            "full_name": customer.full_name,
            "phone": customer.phone,
            "email": customer.email,
            "address": customer.address,
            "opening_balance": str(customer.opening_balance),
            "is_active": customer.is_active,
        },
        "Customer fetched successfully.",
    )


@customer_bp.put("/<int:customer_id>")
@jwt_required()
def update_customer(customer_id: int):
    try:
        customer = Customer.query.get(customer_id)
        if not customer:
            return error_response("Customer not found.", 404)

        payload = request.get_json() or {}

        if "full_name" in payload:
            customer.full_name = payload["full_name"].strip()
        if "phone" in payload:
            customer.phone = payload["phone"]
        if "email" in payload:
            customer.email = payload["email"]
        if "address" in payload:
            customer.address = payload["address"]
        if "opening_balance" in payload:
            customer.opening_balance = parse_decimal(payload["opening_balance"], "opening_balance")
        if "is_active" in payload:
            customer.is_active = bool(payload["is_active"])

        db.session.commit()

        # Update financial account
        financial_account = FinancialAccount.query.filter(
            FinancialAccount.account_name.like(f"Customer {customer_id}:%")
        ).first()
        if financial_account:
            financial_account.account_name = f"Customer {customer.id}: {customer.full_name}"
            financial_account.current_balance = customer.opening_balance
            db.session.commit()

        return success_response({"id": customer.id}, "Customer updated successfully.", 200)
    except ValueError as exc:
        db.session.rollback()
        return error_response(str(exc), 400)
    except Exception:
        db.session.rollback()
        return error_response("Failed to update customer.", 500)


@customer_bp.delete("/<int:customer_id>")
@jwt_required()
def delete_customer(customer_id: int):
    customer = Customer.query.get(customer_id)
    if not customer:
        return error_response("Customer not found.", 404)

    customer.is_active = False
    db.session.commit()

    # Delete financial account
    financial_account = FinancialAccount.query.filter(
        FinancialAccount.account_name.like(f"Customer {customer_id}:%")
    ).first()
    if financial_account:
        db.session.delete(financial_account)
        db.session.commit()

    return success_response({"id": customer.id}, "Customer deactivated successfully.", 200)