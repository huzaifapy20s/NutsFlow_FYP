from decimal import Decimal

from app.models import (
    ChartOfAccount,
    FinancialAccount,
    JournalEntry,
    JournalEntryLine,
    ReferenceType,
    db,
)

SYSTEM_ACCOUNT_CODES = {
    "accounts_receivable": "1100",
    "inventory": "1200",
    "accounts_payable": "2000",
    "sales_revenue": "4000",
    "cogs": "5000",
}


class AccountingService:
    @staticmethod
    def get_chart_account_by_code(account_code: str) -> ChartOfAccount:
        account = ChartOfAccount.query.filter_by(account_code=account_code, is_active=True).first()
        if not account:
            raise LookupError(f"Chart account with code {account_code} was not found.")
        return account

    @staticmethod
    def create_journal_entry(
        *,
        entry_date,
        reference_type: ReferenceType,
        reference_id: int,
        description: str,
        created_by_id: int,
        lines: list[dict],
        sale_id: int | None = None,
        purchase_id: int | None = None,
        customer_payment_id: int | None = None,
        supplier_payment_id: int | None = None,
        expense_id: int | None = None,
    ) -> JournalEntry:
        total_debit = sum(Decimal(str(line.get("debit_amount", 0))) for line in lines)
        total_credit = sum(Decimal(str(line.get("credit_amount", 0))) for line in lines)

        if total_debit.quantize(Decimal("0.01")) != total_credit.quantize(Decimal("0.01")):
            raise ValueError("Journal entry is not balanced. Total debits must equal total credits.")

        journal_entry = JournalEntry(
            entry_date=entry_date,
            reference_type=reference_type,
            reference_id=reference_id,
            description=description,
            created_by_id=created_by_id,
            sale_id=sale_id,
            purchase_id=purchase_id,
            customer_payment_id=customer_payment_id,
            supplier_payment_id=supplier_payment_id,
            expense_id=expense_id,
        )
        db.session.add(journal_entry)
        db.session.flush()

        for line in lines:
            journal_line = JournalEntryLine(
                journal_entry_id=journal_entry.id,
                account_id=line["account_id"],
                debit_amount=line.get("debit_amount", Decimal("0.00")),
                credit_amount=line.get("credit_amount", Decimal("0.00")),
                line_description=line.get("line_description"),
            )
            db.session.add(journal_line)

        return journal_entry

    @staticmethod
    def create_purchase_entry(purchase, created_by_id: int) -> None:
        inventory_account = AccountingService.get_chart_account_by_code(SYSTEM_ACCOUNT_CODES["inventory"])
        ap_account = AccountingService.get_chart_account_by_code(SYSTEM_ACCOUNT_CODES["accounts_payable"])

        lines = [
            {
                "account_id": inventory_account.id,
                "debit_amount": purchase.total_amount,
                "credit_amount": Decimal("0.00"),
                "line_description": "Inventory purchased",
            }
        ]

        if purchase.paid_amount > 0:
            payment_account: FinancialAccount = purchase.payment_account
            lines.append(
                {
                    "account_id": payment_account.chart_account_id,
                    "debit_amount": Decimal("0.00"),
                    "credit_amount": purchase.paid_amount,
                    "line_description": "Cash/Bank payment for purchase",
                }
            )

        if purchase.balance_due > 0:
            lines.append(
                {
                    "account_id": ap_account.id,
                    "debit_amount": Decimal("0.00"),
                    "credit_amount": purchase.balance_due,
                    "line_description": "Accounts payable created",
                }
            )

        AccountingService.create_journal_entry(
            entry_date=purchase.purchase_date.date(),
            reference_type=ReferenceType.PURCHASE,
            reference_id=purchase.id,
            description=f"Purchase entry #{purchase.id}",
            created_by_id=created_by_id,
            lines=lines,
            purchase_id=purchase.id,
        )

    @staticmethod
    def create_sale_entry(sale, created_by_id: int) -> None:
        ar_account = AccountingService.get_chart_account_by_code(SYSTEM_ACCOUNT_CODES["accounts_receivable"])
        sales_revenue_account = AccountingService.get_chart_account_by_code(SYSTEM_ACCOUNT_CODES["sales_revenue"])
        cogs_account = AccountingService.get_chart_account_by_code(SYSTEM_ACCOUNT_CODES["cogs"])
        inventory_account = AccountingService.get_chart_account_by_code(SYSTEM_ACCOUNT_CODES["inventory"])

        cogs_total = sum(
            (sale_item.quantity * sale_item.unit_cost_snapshot).quantize(Decimal("0.01"))
            for sale_item in sale.sale_items
        )

        lines = []

        if sale.paid_amount > 0:
            payment_account: FinancialAccount = sale.receipt_account
            lines.append(
                {
                    "account_id": payment_account.chart_account_id,
                    "debit_amount": sale.paid_amount,
                    "credit_amount": Decimal("0.00"),
                    "line_description": "Cash/Bank received for sale",
                }
            )

        if sale.balance_due > 0:
            lines.append(
                {
                    "account_id": ar_account.id,
                    "debit_amount": sale.balance_due,
                    "credit_amount": Decimal("0.00"),
                    "line_description": "Accounts receivable created",
                }
            )

        lines.append(
            {
                "account_id": sales_revenue_account.id,
                "debit_amount": Decimal("0.00"),
                "credit_amount": sale.total_amount,
                "line_description": "Sales revenue recognized",
            }
        )

        if cogs_total > 0:
            lines.append(
                {
                    "account_id": cogs_account.id,
                    "debit_amount": cogs_total,
                    "credit_amount": Decimal("0.00"),
                    "line_description": "Cost of goods sold recognized",
                }
            )
            lines.append(
                {
                    "account_id": inventory_account.id,
                    "debit_amount": Decimal("0.00"),
                    "credit_amount": cogs_total,
                    "line_description": "Inventory reduced",
                }
            )

        AccountingService.create_journal_entry(
            entry_date=sale.sale_date.date(),
            reference_type=ReferenceType.SALE,
            reference_id=sale.id,
            description=f"Sale entry #{sale.id}",
            created_by_id=created_by_id,
            lines=lines,
            sale_id=sale.id,
        )

    @staticmethod
    def reverse_sale_entry(sale, created_by_id: int) -> None:
        # Delete all journal entries related to this sale
        journal_entries = JournalEntry.query.filter_by(
            reference_type=ReferenceType.SALE,
            reference_id=sale.id
        ).all()

        for entry in journal_entries:
            db.session.delete(entry)

    @staticmethod
    def create_customer_payment_entry(payment, created_by_id: int) -> None:
        ar_account = AccountingService.get_chart_account_by_code(SYSTEM_ACCOUNT_CODES["accounts_receivable"])

        AccountingService.create_journal_entry(
            entry_date=payment.payment_date.date(),
            reference_type=ReferenceType.CUSTOMER_PAYMENT,
            reference_id=payment.id,
            description=f"Customer payment #{payment.id}",
            created_by_id=created_by_id,
            lines=[
                {
                    "account_id": payment.account.chart_account_id,
                    "debit_amount": payment.amount,
                    "credit_amount": Decimal("0.00"),
                    "line_description": "Cash/Bank received",
                },
                {
                    "account_id": ar_account.id,
                    "debit_amount": Decimal("0.00"),
                    "credit_amount": payment.amount,
                    "line_description": "Accounts receivable reduced",
                },
            ],
            customer_payment_id=payment.id,
        )

    @staticmethod
    def create_supplier_payment_entry(payment, created_by_id: int) -> None:
        ap_account = AccountingService.get_chart_account_by_code(SYSTEM_ACCOUNT_CODES["accounts_payable"])

        AccountingService.create_journal_entry(
            entry_date=payment.payment_date.date(),
            reference_type=ReferenceType.SUPPLIER_PAYMENT,
            reference_id=payment.id,
            description=f"Supplier payment #{payment.id}",
            created_by_id=created_by_id,
            lines=[
                {
                    "account_id": ap_account.id,
                    "debit_amount": payment.amount,
                    "credit_amount": Decimal("0.00"),
                    "line_description": "Accounts payable reduced",
                },
                {
                    "account_id": payment.account.chart_account_id,
                    "debit_amount": Decimal("0.00"),
                    "credit_amount": payment.amount,
                    "line_description": "Cash/Bank paid",
                },
            ],
            supplier_payment_id=payment.id,
        )

    @staticmethod
    def create_expense_entry(expense, created_by_id: int) -> None:
        AccountingService.create_journal_entry(
            entry_date=expense.expense_date,
            reference_type=ReferenceType.EXPENSE,
            reference_id=expense.id,
            description=f"Expense entry #{expense.id}",
            created_by_id=created_by_id,
            lines=[
                {
                    "account_id": expense.expense_category_account_id,
                    "debit_amount": expense.amount,
                    "credit_amount": Decimal("0.00"),
                    "line_description": expense.description,
                },
                {
                    "account_id": expense.paid_from_account.chart_account_id,
                    "debit_amount": Decimal("0.00"),
                    "credit_amount": expense.amount,
                    "line_description": "Cash/Bank expense payment",
                },
            ],
            expense_id=expense.id,
        )