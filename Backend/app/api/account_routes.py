from __future__ import annotations

from datetime import date, datetime, time
from decimal import Decimal

from flask import Blueprint, make_response, request
from flask_jwt_extended import get_jwt_identity, jwt_required, verify_jwt_in_request

from app.auth.decorators import role_required
from app.models import (
    ChartAccountType,
    ChartOfAccount,
    Customer,
    FinancialAccount,
    FinancialAccountType,
    JournalEntry,
    JournalEntryLine,
    Purchase,
    ReferenceType,
    Sale,
    Supplier,
    db,
)
from app.utils.api_response import error_response, success_response
from app.utils.validators import parse_decimal

account_bp = Blueprint("account_bp", __name__)

_MONEY_ZERO = Decimal("0.00")


def _money(value) -> Decimal:
    if value is None:
        return _MONEY_ZERO
    return Decimal(str(value)).quantize(Decimal("0.01"))


def _clean_text(value) -> str:
    return str(value or "").strip()


def _manual_line_tag(entity_type: str, entity_id: int) -> str:
    return f"manual_gje:{entity_type}:{entity_id}"


def _manual_offset_tag(entity_type: str, entity_id: int) -> str:
    return f"manual_gje_offset:{entity_type}:{entity_id}"


def _entry_description(prefix: str, user_description: str | None) -> str:
    user_description = _clean_text(user_description)
    return f"{prefix} - {user_description}" if user_description else prefix


def _as_sort_datetime(value) -> datetime:
    if isinstance(value, datetime):
        return value.replace(tzinfo=None)
    if isinstance(value, date):
        return datetime.combine(value, time.min)
    return datetime.min


def _display_date(value) -> str | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()
    return str(value)


def _ledger_sort_value(primary_value, fallback_value=None) -> datetime:
    return _as_sort_datetime(primary_value or fallback_value)


def _append_ledger_row(
    rows: list[dict],
    *,
    sort_at,
    sequence: int,
    source_id: int | None,
    date_value,
    description: str,
    reference_type: str,
    reference_id: int | None,
    debit,
    credit,
) -> None:
    rows.append(
        {
            "sort_key": (_as_sort_datetime(sort_at), int(sequence), int(source_id or 0)),
            "date": _display_date(date_value),
            "description": description,
            "reference_type": reference_type,
            "reference_id": reference_id,
            "debit": str(_money(debit)),
            "credit": str(_money(credit)),
        }
    )


def _cors_preflight_response():
    response = make_response("", 204)
    origin = request.headers.get("Origin")
    if origin:
        response.headers["Access-Control-Allow-Origin"] = origin
        response.headers["Vary"] = "Origin"
    else:
        response.headers["Access-Control-Allow-Origin"] = "*"
    response.headers["Access-Control-Allow-Credentials"] = "true"
    response.headers["Access-Control-Allow-Headers"] = "Authorization, Content-Type"
    response.headers["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    return response


def _get_chart_account_by_code(account_code: str, label: str) -> ChartOfAccount:
    account = ChartOfAccount.query.filter_by(account_code=account_code, is_active=True).first()
    if not account:
        raise LookupError(f"{label} account is not configured in Chart of Accounts.")
    return account


def _get_manual_offset_account(excluded_account_id: int | None = None) -> ChartOfAccount:
    # Use an equity account as the balancing side for manual adjustments because
    # the modal intentionally asks only for debit/credit, amount and description.
    for account_code in ("3100", "3000"):
        account = ChartOfAccount.query.filter_by(account_code=account_code, is_active=True).first()
        if account and account.id != excluded_account_id:
            return account

    query = ChartOfAccount.query.filter(
        ChartOfAccount.account_type == ChartAccountType.EQUITY,
        ChartOfAccount.is_active.is_(True),
    )
    if excluded_account_id is not None:
        query = query.filter(ChartOfAccount.id != excluded_account_id)

    account = query.order_by(ChartOfAccount.account_code.asc()).first()
    if account:
        return account

    query = ChartOfAccount.query.filter(ChartOfAccount.is_active.is_(True))
    if excluded_account_id is not None:
        query = query.filter(ChartOfAccount.id != excluded_account_id)

    account = query.order_by(ChartOfAccount.account_code.asc()).first()
    if not account:
        raise LookupError("A balancing chart account is required before posting a manual journal entry.")
    return account


def _get_default_cash_bank_account() -> FinancialAccount | None:
    account = (
        FinancialAccount.query.filter(
            FinancialAccount.is_active.is_(True),
            FinancialAccount.account_type.in_([FinancialAccountType.CASH, FinancialAccountType.BANK]),
        )
        .order_by(FinancialAccount.id.asc())
        .first()
    )
    if account:
        return account

    return (
        FinancialAccount.query.join(ChartOfAccount, FinancialAccount.chart_account_id == ChartOfAccount.id)
        .filter(
            FinancialAccount.is_active.is_(True),
            ChartOfAccount.is_active.is_(True),
            ChartOfAccount.account_code.in_(["1000", "1010"]),
        )
        .order_by(FinancialAccount.id.asc())
        .first()
    )


def _get_default_cash_bank_chart_account(excluded_account_id: int | None = None) -> ChartOfAccount:
    financial_account = _get_default_cash_bank_account()
    if financial_account and financial_account.chart_account_id != excluded_account_id:
        return financial_account.chart_account

    for account_code in ("1000", "1010"):
        account = ChartOfAccount.query.filter_by(account_code=account_code, is_active=True).first()
        if account and account.id != excluded_account_id:
            return account

    query = ChartOfAccount.query.filter(
        ChartOfAccount.account_type == ChartAccountType.ASSET,
        ChartOfAccount.is_active.is_(True),
    )
    if excluded_account_id is not None:
        query = query.filter(ChartOfAccount.id != excluded_account_id)

    account = query.order_by(ChartOfAccount.account_code.asc()).first()
    if not account:
        raise LookupError("Cash or bank chart account is not configured.")
    return account


def _create_manual_journal_entry(
    *,
    reference_id: int,
    description: str,
    created_by_id: int,
    lines: list[dict],
) -> JournalEntry:
    total_debit = sum(_money(line.get("debit_amount")) for line in lines)
    total_credit = sum(_money(line.get("credit_amount")) for line in lines)

    if total_debit != total_credit:
        raise ValueError("Journal entry is not balanced. Total debit must equal total credit.")

    journal_entry = JournalEntry(
        entry_date=date.today(),
        reference_type=ReferenceType.MANUAL,
        reference_id=reference_id,
        description=description,
        created_by_id=created_by_id,
    )
    db.session.add(journal_entry)
    db.session.flush()

    for line in lines:
        db.session.add(
            JournalEntryLine(
                journal_entry_id=journal_entry.id,
                account_id=line["account_id"],
                debit_amount=_money(line.get("debit_amount")),
                credit_amount=_money(line.get("credit_amount")),
                line_description=line.get("line_description"),
            )
        )

    return journal_entry


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
            current_balance=parse_decimal(
                payload.get("current_balance", payload.get("opening_balance", 0)),
                "current_balance",
            ),
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


@account_bp.route("/general-journal-entry", methods=["POST", "OPTIONS"], strict_slashes=False)
def create_general_journal_entry():
    """Post a balanced manual debit/credit entry from any ledger page."""
    if request.method == "OPTIONS":
        return _cors_preflight_response()

    try:
        # OPTIONS must be open for CORS preflight, but POST still requires JWT.
        verify_jwt_in_request()

        payload = request.get_json() or {}
        ledger_type = _clean_text(payload.get("ledger_type") or payload.get("entity_type") or "chart").lower()
        side = _clean_text(payload.get("side") or payload.get("entry_type")).lower()

        if ledger_type not in {"chart", "customer", "supplier"}:
            return error_response("ledger_type must be chart, customer, or supplier.", 400)
        if side not in {"debit", "credit"}:
            return error_response("Please select debit or credit entry.", 400)

        amount = parse_decimal(payload.get("amount"), "amount", allow_zero=False)
        user_description = _clean_text(payload.get("description"))
        created_by_id = int(get_jwt_identity())
        balance_after: Decimal | None = None

        if ledger_type == "customer":
            customer_id = int(payload.get("entity_id") or payload.get("customer_id") or payload.get("account_id"))
            customer = Customer.query.get(customer_id)
            if not customer or not customer.is_active:
                return error_response("Customer not found or inactive.", 404)

            receivable_account = _get_chart_account_by_code("1100", "Accounts Receivable")
            entity_tag = _manual_line_tag("customer", customer.id)

            if side == "credit":
                # Amount received from customer: Dr Cash/Bank, Cr Accounts Receivable.
                cash_account = _get_default_cash_bank_account()
                cash_chart_account = (
                    cash_account.chart_account
                    if cash_account
                    else _get_default_cash_bank_chart_account(receivable_account.id)
                )
                description = _entry_description("Amount received", user_description)
                lines = [
                    {
                        "account_id": cash_chart_account.id,
                        "debit_amount": amount,
                        "credit_amount": _MONEY_ZERO,
                        "line_description": _manual_offset_tag("customer", customer.id),
                    },
                    {
                        "account_id": receivable_account.id,
                        "debit_amount": _MONEY_ZERO,
                        "credit_amount": amount,
                        "line_description": entity_tag,
                    },
                ]
                if cash_account:
                    cash_account.current_balance = _money(cash_account.current_balance) + amount
                customer.opening_balance = _money(customer.opening_balance) - amount
            else:
                # Extra receivable / loan given to customer: Dr Accounts Receivable, Cr Equity Adjustment.
                offset_account = _get_manual_offset_account(receivable_account.id)
                description = _entry_description("Customer debit adjustment", user_description)
                lines = [
                    {
                        "account_id": receivable_account.id,
                        "debit_amount": amount,
                        "credit_amount": _MONEY_ZERO,
                        "line_description": entity_tag,
                    },
                    {
                        "account_id": offset_account.id,
                        "debit_amount": _MONEY_ZERO,
                        "credit_amount": amount,
                        "line_description": _manual_offset_tag("customer", customer.id),
                    },
                ]
                customer.opening_balance = _money(customer.opening_balance) + amount

            balance_after = _money(customer.opening_balance)
            journal_entry = _create_manual_journal_entry(
                reference_id=customer.id,
                description=description,
                created_by_id=created_by_id,
                lines=lines,
            )

        elif ledger_type == "supplier":
            supplier_id = int(payload.get("entity_id") or payload.get("supplier_id") or payload.get("account_id"))
            supplier = Supplier.query.get(supplier_id)
            if not supplier or not supplier.is_active:
                return error_response("Supplier not found or inactive.", 404)

            payable_account = _get_chart_account_by_code("2000", "Accounts Payable")
            entity_tag = _manual_line_tag("supplier", supplier.id)

            if side == "debit":
                # Payment made to supplier: Dr Accounts Payable, Cr Cash/Bank.
                cash_account = _get_default_cash_bank_account()
                cash_chart_account = (
                    cash_account.chart_account
                    if cash_account
                    else _get_default_cash_bank_chart_account(payable_account.id)
                )
                description = _entry_description("Payment to supplier", user_description)
                lines = [
                    {
                        "account_id": payable_account.id,
                        "debit_amount": amount,
                        "credit_amount": _MONEY_ZERO,
                        "line_description": entity_tag,
                    },
                    {
                        "account_id": cash_chart_account.id,
                        "debit_amount": _MONEY_ZERO,
                        "credit_amount": amount,
                        "line_description": _manual_offset_tag("supplier", supplier.id),
                    },
                ]
                if cash_account:
                    # Financial accounts are constrained to non-negative balances in this database.
                    cash_account.current_balance = max(_MONEY_ZERO, _money(cash_account.current_balance) - amount)
                supplier.opening_balance = _money(supplier.opening_balance) - amount
            else:
                # Extra payable to supplier: Dr Equity Adjustment, Cr Accounts Payable.
                offset_account = _get_manual_offset_account(payable_account.id)
                description = _entry_description("Supplier credit adjustment", user_description)
                lines = [
                    {
                        "account_id": offset_account.id,
                        "debit_amount": amount,
                        "credit_amount": _MONEY_ZERO,
                        "line_description": _manual_offset_tag("supplier", supplier.id),
                    },
                    {
                        "account_id": payable_account.id,
                        "debit_amount": _MONEY_ZERO,
                        "credit_amount": amount,
                        "line_description": entity_tag,
                    },
                ]
                supplier.opening_balance = _money(supplier.opening_balance) + amount

            balance_after = _money(supplier.opening_balance)
            journal_entry = _create_manual_journal_entry(
                reference_id=supplier.id,
                description=description,
                created_by_id=created_by_id,
                lines=lines,
            )

        else:
            account_id = int(payload.get("account_id") or payload.get("entity_id"))
            account = ChartOfAccount.query.get(account_id)
            if not account or not account.is_active:
                return error_response("Chart account not found or inactive.", 404)

            offset_account = _get_manual_offset_account(account.id)
            description = _entry_description("General journal entry", user_description)

            if side == "debit":
                lines = [
                    {
                        "account_id": account.id,
                        "debit_amount": amount,
                        "credit_amount": _MONEY_ZERO,
                        "line_description": _manual_line_tag("chart", account.id),
                    },
                    {
                        "account_id": offset_account.id,
                        "debit_amount": _MONEY_ZERO,
                        "credit_amount": amount,
                        "line_description": _manual_offset_tag("chart", account.id),
                    },
                ]
            else:
                lines = [
                    {
                        "account_id": offset_account.id,
                        "debit_amount": amount,
                        "credit_amount": _MONEY_ZERO,
                        "line_description": _manual_offset_tag("chart", account.id),
                    },
                    {
                        "account_id": account.id,
                        "debit_amount": _MONEY_ZERO,
                        "credit_amount": amount,
                        "line_description": _manual_line_tag("chart", account.id),
                    },
                ]

            financial_account = FinancialAccount.query.filter_by(chart_account_id=account.id, is_active=True).first()
            if financial_account:
                if side == "debit":
                    financial_account.current_balance = _money(financial_account.current_balance) + amount
                else:
                    financial_account.current_balance = max(_MONEY_ZERO, _money(financial_account.current_balance) - amount)
                balance_after = _money(financial_account.current_balance)

            journal_entry = _create_manual_journal_entry(
                reference_id=account.id,
                description=description,
                created_by_id=created_by_id,
                lines=lines,
            )

        db.session.commit()

        return success_response(
            {
                "id": journal_entry.id,
                "ledger_type": ledger_type,
                "side": side,
                "amount": str(amount),
                "description": journal_entry.description,
                "balance_after": str(balance_after) if balance_after is not None else None,
                "version": "general_journal_entry_v4",
            },
            "General journal entry saved successfully.",
            201,
        )

    except (TypeError, ValueError) as exc:
        db.session.rollback()
        return error_response(str(exc), 400)
    except LookupError as exc:
        db.session.rollback()
        return error_response(str(exc), 404)
    except Exception as exc:
        db.session.rollback()
        return error_response(f"Failed to save general journal entry: {str(exc)}", 500)


@account_bp.get("/general-ledger/<int:account_id>")
@jwt_required()
def get_general_ledger(account_id: int):
    """General ledger for a Chart of Account (by chart account id)."""
    try:
        account = ChartOfAccount.query.get(account_id)
        if not account:
            return error_response("Account not found.", 404)

        ledger_entries = (
            db.session.query(
                JournalEntryLine,
                JournalEntry.entry_date,
                JournalEntry.created_at,
                JournalEntry.id,
                JournalEntry.description,
                JournalEntry.reference_type,
                JournalEntry.reference_id,
            )
            .join(JournalEntry, JournalEntryLine.journal_entry_id == JournalEntry.id)
            .filter(JournalEntryLine.account_id == account_id)
            .order_by(JournalEntry.entry_date.asc(), JournalEntry.created_at.asc(), JournalEntry.id.asc(), JournalEntryLine.id.asc())
            .all()
        )

        ledger_rows = []
        for line, entry_date, created_at, entry_id, description, ref_type, ref_id in ledger_entries:
            _append_ledger_row(
                ledger_rows,
                sort_at=_ledger_sort_value(created_at, entry_date),
                sequence=30 if ref_type == ReferenceType.MANUAL else 20,
                source_id=entry_id,
                date_value=entry_date,
                description=description or f"{ref_type.value} #{ref_id}",
                reference_type=ref_type.value,
                reference_id=ref_id,
                debit=line.debit_amount,
                credit=line.credit_amount,
            )

        ledger_rows.sort(key=lambda row: row["sort_key"])

        running_balance = _MONEY_ZERO
        ledger_data = []
        for idx, row in enumerate(ledger_rows):
            debit = _money(row["debit"])
            credit = _money(row["credit"])
            running_balance += debit - credit
            ledger_data.append(
                {
                    "id": f"{row['reference_type']}_{row['reference_id']}_{idx}",
                    "date": row["date"] if row["date"] else "Opening",
                    "description": row["description"],
                    "reference_type": row["reference_type"],
                    "reference_id": row["reference_id"],
                    "debit": str(debit),
                    "credit": str(credit),
                    "balance": str(running_balance),
                }
            )

        return success_response(
            {
                "account": {
                    "id": account.id,
                    "account_code": account.account_code,
                    "account_name": account.account_name,
                    "account_type": account.account_type.value,
                    "entity_type": "chart",
                },
                "ledger_entries": ledger_data,
            },
            "General ledger fetched successfully.",
        )

    except Exception as e:
        return error_response(f"Failed to fetch general ledger: {str(e)}", 500)


@account_bp.get("/customer-ledger/<int:customer_id>")
@jwt_required()
def get_customer_ledger(customer_id: int):
    """Dedicated ledger for a customer."""
    try:
        from app.models import CustomerPayment

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

        receivable_account = ChartOfAccount.query.filter_by(account_code="1100", is_active=True).first()
        manual_ledger_rows = []
        manual_adjustment_total = _MONEY_ZERO
        if receivable_account:
            manual_ledger_rows = (
                db.session.query(
                    JournalEntryLine,
                    JournalEntry.entry_date,
                    JournalEntry.created_at,
                    JournalEntry.description,
                    JournalEntry.id,
                )
                .join(JournalEntry, JournalEntryLine.journal_entry_id == JournalEntry.id)
                .filter(
                    JournalEntry.reference_type == ReferenceType.MANUAL,
                    JournalEntryLine.account_id == receivable_account.id,
                    JournalEntryLine.line_description == _manual_line_tag("customer", customer_id),
                )
                .order_by(JournalEntry.entry_date.asc(), JournalEntry.created_at.asc(), JournalEntry.id.asc())
                .all()
            )
            for line, _entry_date, _created_at, _description, _entry_id in manual_ledger_rows:
                manual_adjustment_total += _money(line.debit_amount) - _money(line.credit_amount)

        # opening_balance is used by this app as CURRENT outstanding balance.
        # Remove manual rows from current balance before reconstructing true opening,
        # then append manual rows in chronological order so the final running balance
        # matches the Customers page balance due.
        derived_opening_balance = _money(customer.opening_balance) - manual_adjustment_total

        initial_paid_at_sale_by_id: dict[int, Decimal] = {}
        for sale in sales:
            linked_payment_total = payment_totals_by_sale.get(sale.id, _MONEY_ZERO)
            initial_paid_at_sale = _money(sale.paid_amount) - linked_payment_total
            if initial_paid_at_sale < _MONEY_ZERO:
                initial_paid_at_sale = _MONEY_ZERO

            initial_paid_at_sale_by_id[sale.id] = initial_paid_at_sale
            derived_opening_balance = derived_opening_balance - _money(sale.total_amount) + initial_paid_at_sale

        derived_opening_balance += total_customer_payments

        ledger_entries = []
        if derived_opening_balance != _MONEY_ZERO:
            _append_ledger_row(
                ledger_entries,
                sort_at=datetime.min,
                sequence=0,
                source_id=0,
                date_value=None,
                description="Opening Balance",
                reference_type="opening_balance",
                reference_id=None,
                debit=derived_opening_balance if derived_opening_balance > _MONEY_ZERO else _MONEY_ZERO,
                credit=-derived_opening_balance if derived_opening_balance < _MONEY_ZERO else _MONEY_ZERO,
            )

        for sale in sales:
            sort_at = _ledger_sort_value(getattr(sale, "created_at", None), sale.sale_date)
            _append_ledger_row(
                ledger_entries,
                sort_at=sort_at,
                sequence=10,
                source_id=sale.id,
                date_value=sale.sale_date,
                description=f"Sale Invoice #{sale.invoice_number}",
                reference_type="sale",
                reference_id=sale.id,
                debit=_money(sale.total_amount),
                credit=_MONEY_ZERO,
            )

            initial_paid_at_sale = initial_paid_at_sale_by_id.get(sale.id, _MONEY_ZERO)
            if initial_paid_at_sale > _MONEY_ZERO:
                _append_ledger_row(
                    ledger_entries,
                    sort_at=sort_at,
                    sequence=11,
                    source_id=sale.id,
                    date_value=sale.sale_date,
                    description=f"Payment at Sale #{sale.invoice_number}",
                    reference_type="sale_payment",
                    reference_id=sale.id,
                    debit=_MONEY_ZERO,
                    credit=initial_paid_at_sale,
                )

        for payment in payments:
            notes_suffix = f" - {payment.notes}" if getattr(payment, "notes", None) else ""
            _append_ledger_row(
                ledger_entries,
                sort_at=_ledger_sort_value(getattr(payment, "created_at", None), payment.payment_date),
                sequence=20,
                source_id=payment.id,
                date_value=payment.payment_date,
                description=f"Payment Received #{payment.id}{notes_suffix}",
                reference_type="customer_payment",
                reference_id=payment.id,
                debit=_MONEY_ZERO,
                credit=_money(payment.amount),
            )

        for line, entry_date, created_at, description, entry_id in manual_ledger_rows:
            _append_ledger_row(
                ledger_entries,
                sort_at=_ledger_sort_value(created_at, entry_date),
                sequence=30,
                source_id=entry_id,
                date_value=entry_date,
                description=description or "General journal entry",
                reference_type="general_journal_entry",
                reference_id=entry_id,
                debit=_money(line.debit_amount),
                credit=_money(line.credit_amount),
            )

        ledger_entries.sort(key=lambda x: x["sort_key"])

        running_balance = _MONEY_ZERO
        result_entries = []
        for idx, entry in enumerate(ledger_entries):
            debit = _money(entry["debit"])
            credit = _money(entry["credit"])
            running_balance += debit - credit
            result_entries.append(
                {
                    "id": f"{entry['reference_type']}_{entry['reference_id']}_{idx}",
                    "date": entry["date"] if entry["date"] else "Opening",
                    "description": entry["description"],
                    "reference_type": entry["reference_type"],
                    "reference_id": entry["reference_id"],
                    "debit": str(debit),
                    "credit": str(credit),
                    "balance": str(running_balance),
                }
            )

        return success_response(
            {
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
            },
            "Customer ledger fetched successfully.",
        )

    except Exception as e:
        return error_response(f"Failed to fetch customer ledger: {str(e)}", 500)


@account_bp.get("/supplier-ledger/<int:supplier_id>")
@jwt_required()
def get_supplier_ledger(supplier_id: int):
    """Dedicated ledger for a supplier."""
    try:
        from app.models import SupplierPayment

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

        payable_account = ChartOfAccount.query.filter_by(account_code="2000", is_active=True).first()
        manual_ledger_rows = []
        manual_adjustment_total = _MONEY_ZERO
        if payable_account:
            manual_ledger_rows = (
                db.session.query(
                    JournalEntryLine,
                    JournalEntry.entry_date,
                    JournalEntry.created_at,
                    JournalEntry.description,
                    JournalEntry.id,
                )
                .join(JournalEntry, JournalEntryLine.journal_entry_id == JournalEntry.id)
                .filter(
                    JournalEntry.reference_type == ReferenceType.MANUAL,
                    JournalEntryLine.account_id == payable_account.id,
                    JournalEntryLine.line_description == _manual_line_tag("supplier", supplier_id),
                )
                .order_by(JournalEntry.entry_date.asc(), JournalEntry.created_at.asc(), JournalEntry.id.asc())
                .all()
            )
            for line, _entry_date, _created_at, _description, _entry_id in manual_ledger_rows:
                manual_adjustment_total += _money(line.credit_amount) - _money(line.debit_amount)

        # opening_balance is used by this app as CURRENT payable.
        derived_opening_balance = _money(supplier.opening_balance) - manual_adjustment_total

        initial_paid_at_purchase_by_id: dict[int, Decimal] = {}
        for purchase in purchases:
            linked_payment_total = payment_totals_by_purchase.get(purchase.id, _MONEY_ZERO)
            initial_paid_at_purchase = _money(purchase.paid_amount) - linked_payment_total
            if initial_paid_at_purchase < _MONEY_ZERO:
                initial_paid_at_purchase = _MONEY_ZERO

            initial_paid_at_purchase_by_id[purchase.id] = initial_paid_at_purchase
            derived_opening_balance = derived_opening_balance - _money(purchase.total_amount) + initial_paid_at_purchase

        derived_opening_balance += total_supplier_payments

        ledger_entries = []
        if derived_opening_balance != _MONEY_ZERO:
            _append_ledger_row(
                ledger_entries,
                sort_at=datetime.min,
                sequence=0,
                source_id=0,
                date_value=None,
                description="Opening Balance",
                reference_type="opening_balance",
                reference_id=None,
                debit=-derived_opening_balance if derived_opening_balance < _MONEY_ZERO else _MONEY_ZERO,
                credit=derived_opening_balance if derived_opening_balance > _MONEY_ZERO else _MONEY_ZERO,
            )

        for purchase in purchases:
            sort_at = _ledger_sort_value(getattr(purchase, "created_at", None), purchase.purchase_date)
            _append_ledger_row(
                ledger_entries,
                sort_at=sort_at,
                sequence=10,
                source_id=purchase.id,
                date_value=purchase.purchase_date,
                description=f"Purchase #{purchase.invoice_number or purchase.id}",
                reference_type="purchase",
                reference_id=purchase.id,
                debit=_MONEY_ZERO,
                credit=_money(purchase.total_amount),
            )

            initial_paid_at_purchase = initial_paid_at_purchase_by_id.get(purchase.id, _MONEY_ZERO)
            if initial_paid_at_purchase > _MONEY_ZERO:
                _append_ledger_row(
                    ledger_entries,
                    sort_at=sort_at,
                    sequence=11,
                    source_id=purchase.id,
                    date_value=purchase.purchase_date,
                    description=f"Payment at Purchase #{purchase.invoice_number or purchase.id}",
                    reference_type="purchase_payment",
                    reference_id=purchase.id,
                    debit=initial_paid_at_purchase,
                    credit=_MONEY_ZERO,
                )

        for payment in payments:
            notes_suffix = f" - {payment.notes}" if getattr(payment, "notes", None) else ""
            _append_ledger_row(
                ledger_entries,
                sort_at=_ledger_sort_value(getattr(payment, "created_at", None), payment.payment_date),
                sequence=20,
                source_id=payment.id,
                date_value=payment.payment_date,
                description=f"Payment to Supplier #{payment.id}{notes_suffix}",
                reference_type="supplier_payment",
                reference_id=payment.id,
                debit=_money(payment.amount),
                credit=_MONEY_ZERO,
            )

        for line, entry_date, created_at, description, entry_id in manual_ledger_rows:
            _append_ledger_row(
                ledger_entries,
                sort_at=_ledger_sort_value(created_at, entry_date),
                sequence=30,
                source_id=entry_id,
                date_value=entry_date,
                description=description or "General journal entry",
                reference_type="general_journal_entry",
                reference_id=entry_id,
                debit=_money(line.debit_amount),
                credit=_money(line.credit_amount),
            )

        ledger_entries.sort(key=lambda x: x["sort_key"])

        running_balance = _MONEY_ZERO
        result_entries = []
        for idx, entry in enumerate(ledger_entries):
            debit = _money(entry["debit"])
            credit = _money(entry["credit"])
            running_balance += credit - debit
            result_entries.append(
                {
                    "id": f"{entry['reference_type']}_{entry['reference_id']}_{idx}",
                    "date": entry["date"] if entry["date"] else "Opening",
                    "description": entry["description"],
                    "reference_type": entry["reference_type"],
                    "reference_id": entry["reference_id"],
                    "debit": str(debit),
                    "credit": str(credit),
                    "balance": str(running_balance),
                }
            )

        return success_response(
            {
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
            },
            "Supplier ledger fetched successfully.",
        )

    except Exception as e:
        return error_response(f"Failed to fetch supplier ledger: {str(e)}", 500)
