from __future__ import annotations

from typing import TYPE_CHECKING

from decimal import Decimal

from sqlalchemy import CheckConstraint, ForeignKey, Index, String, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import MONEY_PRECISION, db, enum_column
from app.models.enums import FinancialAccountType
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.chart_of_account import ChartOfAccount
    from app.models.customer_payment import CustomerPayment
    from app.models.expense import Expense
    from app.models.purchase import Purchase
    from app.models.sale import Sale
    from app.models.supplier_payment import SupplierPayment


class FinancialAccount(TimestampMixin, db.Model):
    __tablename__ = "financial_accounts"
    __table_args__ = (
        UniqueConstraint("chart_account_id", name="uq_financial_accounts_chart_account_id"),
        CheckConstraint(
            "opening_balance >= 0",
            name="ck_financial_accounts_opening_balance_non_negative",
        ),
        CheckConstraint(
            "current_balance >= 0",
            name="ck_financial_accounts_current_balance_non_negative",
        ),
        Index("ix_financial_accounts_account_type", "account_type"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    account_name: Mapped[str] = mapped_column(String(150), nullable=False, unique=True)
    account_type: Mapped[FinancialAccountType] = enum_column(FinancialAccountType)
    chart_account_id: Mapped[int] = mapped_column(
        ForeignKey("chart_of_accounts.id", ondelete="RESTRICT"),
        nullable=False,
    )
    account_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    bank_name: Mapped[str | None] = mapped_column(String(150), nullable=True)
    opening_balance: Mapped[Decimal] = mapped_column(
        MONEY_PRECISION,
        nullable=False,
        server_default=text("0.00"),
    )
    current_balance: Mapped[Decimal] = mapped_column(
        MONEY_PRECISION,
        nullable=False,
        server_default=text("0.00"),
    )
    is_active: Mapped[bool] = mapped_column(
        nullable=False,
        server_default=text("true"),
    )

    chart_account: Mapped["ChartOfAccount"] = relationship(
        back_populates="financial_accounts"
    )

    purchase_receipts: Mapped[list["Purchase"]] = relationship(
        back_populates="payment_account",
        foreign_keys="Purchase.payment_account_id",
    )
    supplier_payments: Mapped[list["SupplierPayment"]] = relationship(
        back_populates="account"
    )
    sale_receipts: Mapped[list["Sale"]] = relationship(
        back_populates="receipt_account",
        foreign_keys="Sale.receipt_account_id",
    )
    customer_payments: Mapped[list["CustomerPayment"]] = relationship(
        back_populates="account"
    )
    expenses_paid: Mapped[list["Expense"]] = relationship(
        back_populates="paid_from_account"
    )