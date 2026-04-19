from __future__ import annotations

from typing import TYPE_CHECKING

from decimal import Decimal

from sqlalchemy import Boolean, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import MONEY_PRECISION, db
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.purchase import Purchase
    from app.models.supplier_payment import SupplierPayment


class Supplier(TimestampMixin, db.Model):
    __tablename__ = "suppliers"

    id: Mapped[int] = mapped_column(primary_key=True)
    supplier_name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    contact_person: Mapped[str | None] = mapped_column(String(150), nullable=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    opening_balance: Mapped[Decimal] = mapped_column(
        MONEY_PRECISION,
        nullable=False,
        server_default=text("0.00"),
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("true"),
    )

    purchases: Mapped[list["Purchase"]] = relationship(back_populates="supplier")
    payments: Mapped[list["SupplierPayment"]] = relationship(back_populates="supplier")