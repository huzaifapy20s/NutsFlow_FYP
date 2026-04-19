from __future__ import annotations

from typing import TYPE_CHECKING

from decimal import Decimal

from sqlalchemy import CheckConstraint, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import MONEY_PRECISION, QUANTITY_PRECISION, db

if TYPE_CHECKING:
    from app.models.item import Item
    from app.models.purchase import Purchase


class PurchaseItem(db.Model):
    __tablename__ = "purchase_items"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_purchase_items_quantity_positive"),
        CheckConstraint("unit_cost >= 0", name="ck_purchase_items_unit_cost_non_negative"),
        CheckConstraint("line_total >= 0", name="ck_purchase_items_line_total_non_negative"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    purchase_id: Mapped[int] = mapped_column(
        ForeignKey("purchases.id", ondelete="CASCADE"),
        nullable=False,
    )
    item_id: Mapped[int] = mapped_column(
        ForeignKey("items.id", ondelete="RESTRICT"),
        nullable=False,
    )
    quantity: Mapped[Decimal] = mapped_column(QUANTITY_PRECISION, nullable=False)
    unit_cost: Mapped[Decimal] = mapped_column(MONEY_PRECISION, nullable=False)
    line_total: Mapped[Decimal] = mapped_column(MONEY_PRECISION, nullable=False)

    purchase: Mapped["Purchase"] = relationship(back_populates="purchase_items")
    item: Mapped["Item"] = relationship(back_populates="purchase_items")