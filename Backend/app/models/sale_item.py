from __future__ import annotations

from typing import TYPE_CHECKING

from decimal import Decimal

from sqlalchemy import CheckConstraint, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import MONEY_PRECISION, QUANTITY_PRECISION, db

if TYPE_CHECKING:
    from app.models.item import Item
    from app.models.sale import Sale


class SaleItem(db.Model):
    __tablename__ = "sale_items"
    __table_args__ = (
        CheckConstraint("quantity > 0", name="ck_sale_items_quantity_positive"),
        CheckConstraint("unit_price >= 0", name="ck_sale_items_unit_price_non_negative"),
        CheckConstraint("unit_cost_snapshot >= 0", name="ck_sale_items_unit_cost_snapshot_non_negative"),
        CheckConstraint("line_total >= 0", name="ck_sale_items_line_total_non_negative"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    sale_id: Mapped[int] = mapped_column(
        ForeignKey("sales.id", ondelete="CASCADE"),
        nullable=False,
    )
    item_id: Mapped[int] = mapped_column(
        ForeignKey("items.id", ondelete="RESTRICT"),
        nullable=False,
    )
    quantity: Mapped[Decimal] = mapped_column(QUANTITY_PRECISION, nullable=False)
    unit_price: Mapped[Decimal] = mapped_column(MONEY_PRECISION, nullable=False)
    unit_cost_snapshot: Mapped[Decimal] = mapped_column(MONEY_PRECISION, nullable=False)
    line_total: Mapped[Decimal] = mapped_column(MONEY_PRECISION, nullable=False)

    sale: Mapped["Sale"] = relationship(back_populates="sale_items")
    item: Mapped["Item"] = relationship(back_populates="sale_items")