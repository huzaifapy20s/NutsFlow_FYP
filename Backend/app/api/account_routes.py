from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from decimal import Decimal

from app.auth.decorators import role_required
from app.models import ChartOfAccount, FinancialAccount, FinancialAccountType, db, enum_column
from app.utils.api_response import error_response, success_response
from app.utils.validators import parse_decimal

account_bp = Blueprint("account_bp", __name__)


@account_bp.get("/chart-of-accounts")
@jwt_required()
def list_chart_of_accounts():
    accounts = ChartOfAccount.query.order_by(ChartOfAccount.account_code.asc()).all()
    return success_response(
        [
            {
                "id": account.id,
                "account_code": account.account_code,
                "account_name": account.account_name,
                "account_type": account.account_type.value,
                "parent_account_id": account.parent_account_id,
                "is_active": account.is_active,
            }
            for account in accounts
        ],
        "Chart of accounts fetched successfully.",
    )


@account_bp.post("/chart-of-accounts")
@jwt_required()
@role_required("admin")
def create_chart_of_account():
    try:
        payload = request.get_json() or {}
        account = ChartOfAccount(
            account_code=payload["account_code"].strip(),
            account_name=payload["account_name"].strip(),
            account_type=payload["account_type"],
            parent_account_id=payload.get("parent_account_id"),
        )
        db.session.add(account)
        db.session.commit()
        return success_response({"id": account.id}, "Chart account created successfully.", 201)
    except KeyError as exc:
        db.session.rollback()
        return error_response(f"Missing required field: {exc.args[0]}", 400)
    except Exception:
        db.session.rollback()
        return error_response("Failed to create chart account.", 500)


@account_bp.get("/financial-accounts")
@jwt_required()
def list_financial_accounts():
    accounts = FinancialAccount.query.order_by(FinancialAccount.account_name.asc()).all()
    return success_response(
        [
            {
                "id": account.id,
                "account_name": account.account_name,
                "account_type": account.account_type.value,
                "chart_account_id": account.chart_account_id,
                "account_number": account.account_number,
                "bank_name": account.bank_name,
                "opening_balance": str(account.opening_balance),
                "current_balance": str(account.current_balance),
                "is_active": account.is_active,
            }
            for account in accounts
        ],
        "Financial accounts fetched successfully.",
    )


@account_bp.post("/financial-accounts")
@jwt_required()
@role_required("admin")
def create_financial_account():
    try:
        payload = request.get_json() or {}
        account = FinancialAccount(
            account_name=payload["account_name"].strip(),
            account_type=payload["account_type"],
            chart_account_id=payload["chart_account_id"],
            account_number=payload.get("account_number"),
            bank_name=payload.get("bank_name"),
            opening_balance=parse_decimal(payload.get("opening_balance", 0), "opening_balance"),
            current_balance=parse_decimal(payload.get("current_balance", payload.get("opening_balance", 0)), "current_balance"),
        )
        db.session.add(account)
        db.session.commit()
        return success_response({"id": account.id}, "Financial account created successfully.", 201)
    except KeyError as exc:
        db.session.rollback()
        return error_response(f"Missing required field: {exc.args[0]}", 400)
    except ValueError as exc:
        db.session.rollback()
        return error_response(str(exc), 400)
    except Exception:
        db.session.rollback()
        return error_response("Failed to create financial account.", 500)


@account_bp.get("/general-ledger/<int:account_id>")
@jwt_required()
def get_general_ledger(account_id: int):
    try:
        # Check if account exists
        account = ChartOfAccount.query.get(account_id)
        if not account:
            return error_response("Account not found.", 404)

        # Get all journal entry lines for this account, ordered by date
        from app.models import JournalEntryLine, JournalEntry

        ledger_entries = (
            db.session.query(
                JournalEntryLine,
                JournalEntry.entry_date,
                JournalEntry.description,
                JournalEntry.reference_type,
                JournalEntry.reference_id,
            )
            .join(JournalEntry, JournalEntryLine.journal_entry_id == JournalEntry.id)
            .filter(JournalEntryLine.account_id == account_id)
            .order_by(JournalEntry.entry_date, JournalEntry.id)
            .all()
        )

        # Calculate running balance
        running_balance = Decimal("0.00")
        ledger_data = []

        for line, entry_date, description, ref_type, ref_id in ledger_entries:
            debit = line.debit_amount
            credit = line.credit_amount

            # Update running balance
            running_balance += debit - credit

            ledger_data.append({
                "id": line.id,
                "date": entry_date.isoformat(),
                "description": description or f"{ref_type.value} #{ref_id}",
                "reference_type": ref_type.value,
                "reference_id": ref_id,
                "debit": str(debit),
                "credit": str(credit),
                "balance": str(running_balance),
            })

        return success_response({
            "account": {
                "id": account.id,
                "account_code": account.account_code,
                "account_name": account.account_name,
                "account_type": account.account_type.value,
            },
            "ledger_entries": ledger_data,
        }, "General ledger fetched successfully.")

    except Exception as e:
        return error_response(f"Failed to fetch general ledger: {str(e)}", 500)