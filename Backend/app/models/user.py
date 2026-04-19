from __future__ import annotations

from typing import TYPE_CHECKING

from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import db, enum_column
from app.models.enums import UserRole
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.customer_payment import CustomerPayment
    from app.models.expense import Expense
    from app.models.journal_entry import JournalEntry
    from app.models.purchase import Purchase
    from app.models.sale import Sale
    from app.models.stock_movement import StockMovement
    from app.models.supplier_payment import SupplierPayment
    from app.models.token_blocklist import TokenBlocklist
    from app.models.user_session import UserSession


class User(TimestampMixin, db.Model):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    full_name: Mapped[str] = mapped_column(String(150), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[UserRole] = enum_column(UserRole)
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("true"),
    )
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    sessions: Mapped[list["UserSession"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )
    token_blocklist_entries: Mapped[list["TokenBlocklist"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
    )

    purchases_created: Mapped[list["Purchase"]] = relationship(back_populates="created_by")
    supplier_payments_created: Mapped[list["SupplierPayment"]] = relationship(back_populates="created_by")
    sales_created: Mapped[list["Sale"]] = relationship(back_populates="created_by")
    customer_payments_created: Mapped[list["CustomerPayment"]] = relationship(back_populates="created_by")
    stock_movements_created: Mapped[list["StockMovement"]] = relationship(back_populates="created_by")
    journal_entries_created: Mapped[list["JournalEntry"]] = relationship(back_populates="created_by")
    expenses_created: Mapped[list["Expense"]] = relationship(back_populates="created_by")