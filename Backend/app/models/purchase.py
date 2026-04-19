from __future__ import annotations

from typing import TYPE_CHECKING

from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import MONEY_PRECISION, db, enum_column
from app.models.enums import PaymentMethod, PaymentStatus, PurchaseStatus
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.financial_account import FinancialAccount
    from app.models.journal_entry import JournalEntry
    from app.models.purchase_item import PurchaseItem
    from app.models.supplier import Supplier
    from app.models.supplier_payment import SupplierPayment
    from app.models.user import User


class Purchase(TimestampMixin, db.Model):
    __tablename__ = "purchases"
    __table_args__ = (
        CheckConstraint("subtotal >= 0", name="ck_purchases_subtotal_non_negative"),
        CheckConstraint("discount_amount >= 0", name="ck_purchases_discount_non_negative"),
        CheckConstraint("tax_amount >= 0", name="ck_purchases_tax_non_negative"),
        CheckConstraint("total_amount >= 0", name="ck_purchases_total_non_negative"),
        CheckConstraint("paid_amount >= 0", name="ck_purchases_paid_non_negative"),
        CheckConstraint("balance_due >= 0", name="ck_purchases_balance_due_non_negative"),
        Index("ix_purchases_purchase_date", "purchase_date"),
        Index("ix_purchases_invoice_number", "invoice_number"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    supplier_id: Mapped[int] = mapped_column(
        ForeignKey("suppliers.id", ondelete="RESTRICT"),
        nullable=False,
    )
    payment_account_id: Mapped[int | None] = mapped_column(
        ForeignKey("financial_accounts.id", ondelete="RESTRICT"),
        nullable=True,
    )
    purchase_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )
    invoice_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
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
    purchase_status: Mapped[PurchaseStatus] = enum_column(PurchaseStatus)
    payment_method: Mapped[PaymentMethod | None] = enum_column(PaymentMethod, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )

    supplier: Mapped["Supplier"] = relationship(back_populates="purchases")
    payment_account: Mapped["FinancialAccount"] = relationship(
        back_populates="purchase_receipts",
        foreign_keys=[payment_account_id],
    )
    created_by: Mapped["User"] = relationship(back_populates="purchases_created")
    purchase_items: Mapped[list["PurchaseItem"]] = relationship(
        back_populates="purchase",
        cascade="all, delete-orphan",
    )
    supplier_payments: Mapped[list["SupplierPayment"]] = relationship(
        back_populates="purchase"
    )
    journal_entries: Mapped[list["JournalEntry"]] = relationship(
        back_populates="purchase"
    )