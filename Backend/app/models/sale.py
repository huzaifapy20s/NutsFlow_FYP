from __future__ import annotations

from typing import TYPE_CHECKING

from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, Text, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import MONEY_PRECISION, db, enum_column
from app.models.enums import PaymentMethod, PaymentStatus, SaleStatus
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.customer import Customer
    from app.models.customer_payment import CustomerPayment
    from app.models.financial_account import FinancialAccount
    from app.models.journal_entry import JournalEntry
    from app.models.sale_item import SaleItem
    from app.models.user import User


class Sale(TimestampMixin, db.Model):
    __tablename__ = "sales"
    __table_args__ = (
        UniqueConstraint("invoice_number", name="uq_sales_invoice_number"),
        CheckConstraint("subtotal >= 0", name="ck_sales_subtotal_non_negative"),
        CheckConstraint("discount_amount >= 0", name="ck_sales_discount_non_negative"),
        CheckConstraint("tax_amount >= 0", name="ck_sales_tax_non_negative"),
        CheckConstraint("total_amount >= 0", name="ck_sales_total_non_negative"),
        CheckConstraint("paid_amount >= 0", name="ck_sales_paid_non_negative"),
        CheckConstraint("balance_due >= 0", name="ck_sales_balance_due_non_negative"),
        Index("ix_sales_sale_date", "sale_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    invoice_number: Mapped[str] = mapped_column(String(100), nullable=False)
    customer_id: Mapped[int | None] = mapped_column(
        ForeignKey("customers.id", ondelete="SET NULL"),
        nullable=True,
    )
    receipt_account_id: Mapped[int | None] = mapped_column(
        ForeignKey("financial_accounts.id", ondelete="RESTRICT"),
        nullable=True,
    )
    sale_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )
    subtotal: Mapped[Decimal] = mapped_column(
        MONEY_PRECISION,
        nullable=False,
        server_default=text("0.00"),
    )
    discount_amount: Mapped[Decimal] = mapped_column(
        MONEY_PRECISION,
        nullable=False,
        server_default=text("0.00"),
    )
    tax_amount: Mapped[Decimal] = mapped_column(
        MONEY_PRECISION,
        nullable=False,
        server_default=text("0.00"),
    )
    total_amount: Mapped[Decimal] = mapped_column(
        MONEY_PRECISION,
        nullable=False,
        server_default=text("0.00"),
    )
    paid_amount: Mapped[Decimal] = mapped_column(
        MONEY_PRECISION,
        nullable=False,
        server_default=text("0.00"),
    )
    balance_due: Mapped[Decimal] = mapped_column(
        MONEY_PRECISION,
        nullable=False,
        server_default=text("0.00"),
    )
    payment_status: Mapped[PaymentStatus] = enum_column(PaymentStatus)
    sale_status: Mapped[SaleStatus] = enum_column(SaleStatus)
    payment_method: Mapped[PaymentMethod | None] = enum_column(PaymentMethod, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )

    customer: Mapped["Customer"] = relationship(back_populates="sales")
    receipt_account: Mapped["FinancialAccount"] = relationship(
        back_populates="sale_receipts",
        foreign_keys=[receipt_account_id],
    )
    created_by: Mapped["User"] = relationship(back_populates="sales_created")
    sale_items: Mapped[list["SaleItem"]] = relationship(
        back_populates="sale",
        cascade="all, delete-orphan",
    )
    customer_payments: Mapped[list["CustomerPayment"]] = relationship(
        back_populates="sale"
    )
    journal_entries: Mapped[list["JournalEntry"]] = relationship(
        back_populates="sale"
    )