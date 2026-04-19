from __future__ import annotations

from typing import TYPE_CHECKING

from datetime import date
from decimal import Decimal

from sqlalchemy import CheckConstraint, Date, ForeignKey, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import MONEY_PRECISION, db
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.chart_of_account import ChartOfAccount
    from app.models.financial_account import FinancialAccount
    from app.models.journal_entry import JournalEntry
    from app.models.user import User


class Expense(TimestampMixin, db.Model):
    __tablename__ = "expenses"
    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_expenses_amount_positive"),
        Index("ix_expenses_expense_date", "expense_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    expense_date: Mapped[date] = mapped_column(Date, nullable=False)
    expense_category_account_id: Mapped[int] = mapped_column(
        ForeignKey("chart_of_accounts.id", ondelete="RESTRICT"),
        nullable=False,
    )
    paid_from_account_id: Mapped[int] = mapped_column(
        ForeignKey("financial_accounts.id", ondelete="RESTRICT"),
        nullable=False,
    )
    amount: Mapped[Decimal] = mapped_column(MONEY_PRECISION, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    reference_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_by_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )

    expense_category_account: Mapped["ChartOfAccount"] = relationship(
        back_populates="expenses"
    )
    paid_from_account: Mapped["FinancialAccount"] = relationship(
        back_populates="expenses_paid"
    )
    created_by: Mapped["User"] = relationship(back_populates="expenses_created")
    journal_entries: Mapped[list["JournalEntry"]] = relationship(
        back_populates="expense"
    )