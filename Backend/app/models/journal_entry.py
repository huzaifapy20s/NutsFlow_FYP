from __future__ import annotations

from typing import TYPE_CHECKING

from datetime import date

from sqlalchemy import Date, ForeignKey, Index, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import db, enum_column
from app.models.enums import ReferenceType
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.customer_payment import CustomerPayment
    from app.models.expense import Expense
    from app.models.journal_entry_line import JournalEntryLine
    from app.models.purchase import Purchase
    from app.models.sale import Sale
    from app.models.supplier_payment import SupplierPayment
    from app.models.user import User


class JournalEntry(TimestampMixin, db.Model):
    __tablename__ = "journal_entries"
    __table_args__ = (
        Index("ix_journal_entries_entry_date", "entry_date"),
        Index(
            "ix_journal_entries_reference_type_reference_id",
            "reference_type",
            "reference_id",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    entry_date: Mapped[date] = mapped_column(Date, nullable=False)
    reference_type: Mapped[ReferenceType] = enum_column(ReferenceType)
    reference_id: Mapped[int] = mapped_column(nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )

    sale_id: Mapped[int | None] = mapped_column(
        ForeignKey("sales.id", ondelete="SET NULL"),
        nullable=True,
    )
    purchase_id: Mapped[int | None] = mapped_column(
        ForeignKey("purchases.id", ondelete="SET NULL"),
        nullable=True,
    )
    customer_payment_id: Mapped[int | None] = mapped_column(
        ForeignKey("customer_payments.id", ondelete="SET NULL"),
        nullable=True,
    )
    supplier_payment_id: Mapped[int | None] = mapped_column(
        ForeignKey("supplier_payments.id", ondelete="SET NULL"),
        nullable=True,
    )
    expense_id: Mapped[int | None] = mapped_column(
        ForeignKey("expenses.id", ondelete="SET NULL"),
        nullable=True,
    )

    created_by: Mapped["User"] = relationship(back_populates="journal_entries_created")
    lines: Mapped[list["JournalEntryLine"]] = relationship(
        back_populates="journal_entry",
        cascade="all, delete-orphan",
    )

    sale: Mapped["Sale"] = relationship(back_populates="journal_entries")
    purchase: Mapped["Purchase"] = relationship(back_populates="journal_entries")
    customer_payment: Mapped["CustomerPayment"] = relationship(
        back_populates="journal_entries"
    )
    supplier_payment: Mapped["SupplierPayment"] = relationship(
        back_populates="journal_entries"
    )
    expense: Mapped["Expense"] = relationship(back_populates="journal_entries")