from __future__ import annotations

from typing import TYPE_CHECKING

from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import MONEY_PRECISION, db, enum_column
from app.models.enums import PaymentMethod
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.customer import Customer
    from app.models.financial_account import FinancialAccount
    from app.models.journal_entry import JournalEntry
    from app.models.sale import Sale
    from app.models.user import User


class CustomerPayment(TimestampMixin, db.Model):
    __tablename__ = "customer_payments"
    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_customer_payments_amount_positive"),
        Index("ix_customer_payments_payment_date", "payment_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(
        ForeignKey("customers.id", ondelete="RESTRICT"),
        nullable=False,
    )
    sale_id: Mapped[int | None] = mapped_column(
        ForeignKey("sales.id", ondelete="SET NULL"),
        nullable=True,
    )
    account_id: Mapped[int] = mapped_column(
        ForeignKey("financial_accounts.id", ondelete="RESTRICT"),
        nullable=False,
    )
    payment_date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )
    amount: Mapped[Decimal] = mapped_column(MONEY_PRECISION, nullable=False)
    payment_method: Mapped[PaymentMethod] = enum_column(PaymentMethod)
    reference_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )

    customer: Mapped["Customer"] = relationship(back_populates="payments")
    sale: Mapped["Sale"] = relationship(back_populates="customer_payments")
    account: Mapped["FinancialAccount"] = relationship(back_populates="customer_payments")
    created_by: Mapped["User"] = relationship(back_populates="customer_payments_created")
    journal_entries: Mapped[list["JournalEntry"]] = relationship(
        back_populates="customer_payment"
    )