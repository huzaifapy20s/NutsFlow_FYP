from __future__ import annotations

from typing import TYPE_CHECKING

from decimal import Decimal

from sqlalchemy import CheckConstraint, ForeignKey, Index, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import MONEY_PRECISION, db

if TYPE_CHECKING:
    from app.models.chart_of_account import ChartOfAccount
    from app.models.journal_entry import JournalEntry


class JournalEntryLine(db.Model):
    __tablename__ = "journal_entry_lines"
    __table_args__ = (
        CheckConstraint(
            "(debit_amount > 0 AND credit_amount = 0) OR "
            "(credit_amount > 0 AND debit_amount = 0)",
            name="ck_journal_entry_lines_single_sided_amount",
        ),
        Index("ix_journal_entry_lines_journal_entry_id", "journal_entry_id"),
        Index("ix_journal_entry_lines_account_id", "account_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    journal_entry_id: Mapped[int] = mapped_column(
        ForeignKey("journal_entries.id", ondelete="CASCADE"),
        nullable=False,
    )
    account_id: Mapped[int] = mapped_column(
        ForeignKey("chart_of_accounts.id", ondelete="RESTRICT"),
        nullable=False,
    )
    debit_amount: Mapped[Decimal] = mapped_column(
        MONEY_PRECISION,
        nullable=False,
        server_default=text("0.00"),
    )
    credit_amount: Mapped[Decimal] = mapped_column(
        MONEY_PRECISION,
        nullable=False,
        server_default=text("0.00"),
    )
    line_description: Mapped[str | None] = mapped_column(Text, nullable=True)

    journal_entry: Mapped["JournalEntry"] = relationship(back_populates="lines")
    account: Mapped["ChartOfAccount"] = relationship(back_populates="journal_entry_lines")