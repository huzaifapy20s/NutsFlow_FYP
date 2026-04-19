from __future__ import annotations

from typing import TYPE_CHECKING

from datetime import datetime
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Index, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import MONEY_PRECISION, QUANTITY_PRECISION, db, enum_column
from app.models.enums import MovementType, ReferenceType

if TYPE_CHECKING:
    from app.models.item import Item
    from app.models.user import User


class StockMovement(db.Model):
    __tablename__ = "stock_movements"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_stock_movements_quantity_positive"),
        CheckConstraint(
            "unit_cost >= 0 OR unit_cost IS NULL",
            name="ck_stock_movements_unit_cost_non_negative",
        ),
        Index("ix_stock_movements_item_id_created_at", "item_id", "created_at"),
        Index(
            "ix_stock_movements_reference_type_reference_id",
            "reference_type",
            "reference_id",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    item_id: Mapped[int] = mapped_column(
        ForeignKey("items.id", ondelete="RESTRICT"),
        nullable=False,
    )
    movement_type: Mapped[MovementType] = enum_column(MovementType)
    reference_type: Mapped[ReferenceType] = enum_column(ReferenceType)
    reference_id: Mapped[int] = mapped_column(nullable=False)
    quantity: Mapped[Decimal] = mapped_column(QUANTITY_PRECISION, nullable=False)
    unit_cost: Mapped[Decimal | None] = mapped_column(MONEY_PRECISION, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    item: Mapped["Item"] = relationship(back_populates="stock_movements")
    created_by: Mapped["User"] = relationship(back_populates="stock_movements_created")