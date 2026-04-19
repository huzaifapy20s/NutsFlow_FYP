from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import Boolean, ForeignKey, Index, String, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import db, enum_column
from app.models.enums import ChartAccountType
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.expense import Expense
    from app.models.financial_account import FinancialAccount
    from app.models.journal_entry_line import JournalEntryLine


class ChartOfAccount(TimestampMixin, db.Model):
    __tablename__ = "chart_of_accounts"
    __table_args__ = (
        UniqueConstraint("account_code", name="uq_chart_of_accounts_account_code"),
        Index("ix_chart_of_accounts_account_type", "account_type"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    account_code: Mapped[str] = mapped_column(String(30), nullable=False)
    account_name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    account_type: Mapped[ChartAccountType] = enum_column(ChartAccountType)
    parent_account_id: Mapped[int | None] = mapped_column(
        ForeignKey("chart_of_accounts.id", ondelete="SET NULL"),
        nullable=True,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("true"),
    )

    parent_account: Mapped["ChartOfAccount"] = relationship(
        remote_side="ChartOfAccount.id",
        back_populates="child_accounts",
    )
    child_accounts: Mapped[list["ChartOfAccount"]] = relationship(
        back_populates="parent_account"
    )

    journal_entry_lines: Mapped[list["JournalEntryLine"]] = relationship(
        back_populates="account"
    )
    financial_accounts: Mapped[list["FinancialAccount"]] = relationship(
        back_populates="chart_account"
    )
    expenses: Mapped[list["Expense"]] = relationship(
        back_populates="expense_category_account"
    )