from app.models import Expense, FinancialAccount, ChartOfAccount, db
from app.services.accounting_service import AccountingService
from app.utils.validators import parse_date_value, parse_decimal, parse_int, require_fields


class ExpenseService:
    @staticmethod
    def create_expense(payload: dict, user_id: int) -> dict:
        require_fields(payload, ["expense_date", "expense_category_account_id", "paid_from_account_id", "amount", "description"])

        expense_category_account = ChartOfAccount.query.get(
            parse_int(payload["expense_category_account_id"], "expense_category_account_id")
        )
        if not expense_category_account or not expense_category_account.is_active:
            raise LookupError("Expense category account not found or inactive.")

        paid_from_account = FinancialAccount.query.get(
            parse_int(payload["paid_from_account_id"], "paid_from_account_id")
        )
        if not paid_from_account or not paid_from_account.is_active:
            raise LookupError("Paid-from account not found or inactive.")

        amount = parse_decimal(payload["amount"], "amount", allow_zero=False)
        if paid_from_account.current_balance < amount:
            raise ValueError("Insufficient balance in the selected account.")

        expense = Expense(
            expense_date=parse_date_value(payload["expense_date"], "expense_date"),
            expense_category_account_id=expense_category_account.id,
            paid_from_account_id=paid_from_account.id,
            amount=amount,
            description=payload["description"].strip(),
            reference_number=payload.get("reference_number"),
            created_by_id=user_id,
        )

        db.session.add(expense)
        db.session.flush()

        paid_from_account.current_balance -= amount

        AccountingService.create_expense_entry(expense, created_by_id=user_id)

        db.session.commit()

        return {
            "id": expense.id,
            "expense_date": expense.expense_date.isoformat(),
            "amount": str(expense.amount),
            "description": expense.description,
        }