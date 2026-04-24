from flask import Blueprint, request
from flask_jwt_extended import jwt_required
from decimal import Decimal

from app.auth.decorators import role_required
from app.models import ChartOfAccount, FinancialAccount, FinancialAccountType, db, enum_column
from app.utils.api_response import error_response, success_response
from app.utils.validators import parse_decimal

account_bp = Blueprint("account_bp", __name__)

_MONEY_ZERO = Decimal("0.00")


def _money(value) -> Decimal:
    if value is None:
        return _MONEY_ZERO
    return Decimal(str(value)).quantize(Decimal("0.01"))


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
    """General ledger for a Chart of Account (by chart account id)."""
    try:
        account = ChartOfAccount.query.get(account_id)
        if not account:
            return error_response("Account not found.", 404)

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

        running_balance = _MONEY_ZERO
        ledger_data = []

        for line, entry_date, description, ref_type, ref_id in ledger_entries:
            debit = _money(line.debit_amount)
            credit = _money(line.credit_amount)
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


@account_bp.get("/customer-ledger/<int:customer_id>")
@jwt_required()
def get_customer_ledger(customer_id: int):
    """
    Dedicated ledger for a customer.

    IMPORTANT:
    customer.opening_balance in this project is being used as CURRENT outstanding balance,
    not immutable initial opening. So we must reconstruct the true opening balance from:
      current_outstanding = true_opening + sales_total - initial_sale_payments - separate_payments
    """
    try:
        from app.models import Customer, Sale, CustomerPayment

        customer = Customer.query.get(customer_id)
        if not customer:
            return error_response("Customer not found.", 404)

        sales = Sale.query.filter_by(customer_id=customer_id).order_by(Sale.sale_date.asc(), Sale.id.asc()).all()
        payments = CustomerPayment.query.filter_by(customer_id=customer_id).order_by(
            CustomerPayment.payment_date.asc(), CustomerPayment.id.asc()
        ).all()

        payment_totals_by_sale: dict[int, Decimal] = {}
        total_customer_payments = _MONEY_ZERO
        for payment in payments:
            amount = _money(payment.amount)
            total_customer_payments += amount
            if payment.sale_id:
                payment_totals_by_sale[payment.sale_id] = payment_totals_by_sale.get(payment.sale_id, _MONEY_ZERO) + amount

        derived_opening_balance = _money(customer.opening_balance)

        initial_paid_at_sale_by_id: dict[int, Decimal] = {}
        for sale in sales:
            linked_payment_total = payment_totals_by_sale.get(sale.id, _MONEY_ZERO)
            initial_paid_at_sale = _money(sale.paid_amount) - linked_payment_total
            if initial_paid_at_sale < _MONEY_ZERO:
                initial_paid_at_sale = _MONEY_ZERO

            initial_paid_at_sale_by_id[sale.id] = initial_paid_at_sale
            derived_opening_balance = (
                derived_opening_balance
                - _money(sale.total_amount)
                + initial_paid_at_sale
            )

        derived_opening_balance += total_customer_payments

        ledger_entries = []

        if derived_opening_balance != _MONEY_ZERO:
            ledger_entries.append({
                "sort_key": ("0000-01-01", 0, 0),
                "date": None,
                "description": "Opening Balance",
                "reference_type": "opening_balance",
                "reference_id": None,
                "debit": str(derived_opening_balance) if derived_opening_balance > _MONEY_ZERO else "0.00",
                "credit": str(-derived_opening_balance) if derived_opening_balance < _MONEY_ZERO else "0.00",
            })

        for sale in sales:
            sale_date = sale.sale_date.date().isoformat()
            ledger_entries.append({
                "sort_key": (sale_date, sale.id, 1),
                "date": sale_date,
                "description": f"Sale Invoice #{sale.invoice_number}",
                "reference_type": "sale",
                "reference_id": sale.id,
                "debit": str(_money(sale.total_amount)),
                "credit": "0.00",
            })

            initial_paid_at_sale = initial_paid_at_sale_by_id.get(sale.id, _MONEY_ZERO)
            if initial_paid_at_sale > _MONEY_ZERO:
                ledger_entries.append({
                    "sort_key": (sale_date, sale.id, 2),
                    "date": sale_date,
                    "description": f"Payment at Sale #{sale.invoice_number}",
                    "reference_type": "sale_payment",
                    "reference_id": sale.id,
                    "debit": "0.00",
                    "credit": str(initial_paid_at_sale),
                })

        for payment in payments:
            payment_date = payment.payment_date.date().isoformat()
            notes_suffix = f" - {payment.notes}" if getattr(payment, "notes", None) else ""
            ledger_entries.append({
                "sort_key": (payment_date, payment.id, 3),
                "date": payment_date,
                "description": f"Payment Received #{payment.id}{notes_suffix}",
                "reference_type": "customer_payment",
                "reference_id": payment.id,
                "debit": "0.00",
                "credit": str(_money(payment.amount)),
            })

        ledger_entries.sort(key=lambda x: x["sort_key"])

        running_balance = _MONEY_ZERO
        result_entries = []
        for idx, entry in enumerate(ledger_entries):
            debit = _money(entry["debit"])
            credit = _money(entry["credit"])
            running_balance += debit - credit
            result_entries.append({
                "id": f"{entry['reference_type']}_{entry['reference_id']}_{idx}",
                "date": entry["date"] if entry["date"] else "Opening",
                "description": entry["description"],
                "reference_type": entry["reference_type"],
                "reference_id": entry["reference_id"],
                "debit": str(debit),
                "credit": str(credit),
                "balance": str(running_balance),
            })

        return success_response({
            "account": {
                "id": customer.id,
                "account_name": customer.full_name,
                "account_type": "asset",
                "account_code": f"CUST-{customer.id:04d}",
                "entity_type": "customer",
                "current_balance": str(_money(customer.opening_balance)),
                "derived_opening_balance": str(derived_opening_balance),
            },
            "ledger_entries": result_entries,
        }, "Customer ledger fetched successfully.")

    except Exception as e:
        return error_response(f"Failed to fetch customer ledger: {str(e)}", 500)


@account_bp.get("/supplier-ledger/<int:supplier_id>")
@jwt_required()
def get_supplier_ledger(supplier_id: int):
    """
    Dedicated ledger for a supplier.

    IMPORTANT:
    supplier.opening_balance in this project is being used as CURRENT outstanding payable,
    not immutable initial opening. So we reconstruct the true opening balance from:
      current_payable = true_opening + purchases_total - initial_purchase_payments - separate_payments
    """
    try:
        from app.models import Supplier, Purchase, SupplierPayment

        supplier = Supplier.query.get(supplier_id)
        if not supplier:
            return error_response("Supplier not found.", 404)

        purchases = Purchase.query.filter_by(supplier_id=supplier_id).order_by(
            Purchase.purchase_date.asc(), Purchase.id.asc()
        ).all()
        payments = SupplierPayment.query.filter_by(supplier_id=supplier_id).order_by(
            SupplierPayment.payment_date.asc(), SupplierPayment.id.asc()
        ).all()

        payment_totals_by_purchase: dict[int, Decimal] = {}
        total_supplier_payments = _MONEY_ZERO
        for payment in payments:
            amount = _money(payment.amount)
            total_supplier_payments += amount
            if payment.purchase_id:
                payment_totals_by_purchase[payment.purchase_id] = payment_totals_by_purchase.get(payment.purchase_id, _MONEY_ZERO) + amount

        derived_opening_balance = _money(supplier.opening_balance)

        initial_paid_at_purchase_by_id: dict[int, Decimal] = {}
        for purchase in purchases:
            linked_payment_total = payment_totals_by_purchase.get(purchase.id, _MONEY_ZERO)
            initial_paid_at_purchase = _money(purchase.paid_amount) - linked_payment_total
            if initial_paid_at_purchase < _MONEY_ZERO:
                initial_paid_at_purchase = _MONEY_ZERO

            initial_paid_at_purchase_by_id[purchase.id] = initial_paid_at_purchase
            derived_opening_balance = (
                derived_opening_balance
                - _money(purchase.total_amount)
                + initial_paid_at_purchase
            )

        derived_opening_balance += total_supplier_payments

        ledger_entries = []

        if derived_opening_balance != _MONEY_ZERO:
            ledger_entries.append({
                "sort_key": ("0000-01-01", 0, 0),
                "date": None,
                "description": "Opening Balance",
                "reference_type": "opening_balance",
                "reference_id": None,
                "debit": str(-derived_opening_balance) if derived_opening_balance < _MONEY_ZERO else "0.00",
                "credit": str(derived_opening_balance) if derived_opening_balance > _MONEY_ZERO else "0.00",
            })

        for purchase in purchases:
            purchase_date = purchase.purchase_date.date().isoformat()
            ledger_entries.append({
                "sort_key": (purchase_date, purchase.id, 1),
                "date": purchase_date,
                "description": f"Purchase #{purchase.invoice_number or purchase.id}",
                "reference_type": "purchase",
                "reference_id": purchase.id,
                "debit": "0.00",
                "credit": str(_money(purchase.total_amount)),
            })

            initial_paid_at_purchase = initial_paid_at_purchase_by_id.get(purchase.id, _MONEY_ZERO)
            if initial_paid_at_purchase > _MONEY_ZERO:
                ledger_entries.append({
                    "sort_key": (purchase_date, purchase.id, 2),
                    "date": purchase_date,
                    "description": f"Payment at Purchase #{purchase.invoice_number or purchase.id}",
                    "reference_type": "purchase_payment",
                    "reference_id": purchase.id,
                    "debit": str(initial_paid_at_purchase),
                    "credit": "0.00",
                })

        for payment in payments:
            payment_date = payment.payment_date.date().isoformat()
            notes_suffix = f" - {payment.notes}" if getattr(payment, "notes", None) else ""
            ledger_entries.append({
                "sort_key": (payment_date, payment.id, 3),
                "date": payment_date,
                "description": f"Payment to Supplier #{payment.id}{notes_suffix}",
                "reference_type": "supplier_payment",
                "reference_id": payment.id,
                "debit": str(_money(payment.amount)),
                "credit": "0.00",
            })

        ledger_entries.sort(key=lambda x: x["sort_key"])

        running_balance = _MONEY_ZERO
        result_entries = []
        for idx, entry in enumerate(ledger_entries):
            debit = _money(entry["debit"])
            credit = _money(entry["credit"])
            running_balance += credit - debit
            result_entries.append({
                "id": f"{entry['reference_type']}_{entry['reference_id']}_{idx}",
                "date": entry["date"] if entry["date"] else "Opening",
                "description": entry["description"],
                "reference_type": entry["reference_type"],
                "reference_id": entry["reference_id"],
                "debit": str(debit),
                "credit": str(credit),
                "balance": str(running_balance),
            })

        return success_response({
            "account": {
                "id": supplier.id,
                "account_name": supplier.supplier_name,
                "account_type": "liability",
                "account_code": f"SUPP-{supplier.id:04d}",
                "entity_type": "supplier",
                "current_balance": str(_money(supplier.opening_balance)),
                "derived_opening_balance": str(derived_opening_balance),
            },
            "ledger_entries": result_entries,
        }, "Supplier ledger fetched successfully.")

    except Exception as e:
        return error_response(f"Failed to fetch supplier ledger: {str(e)}", 500)
