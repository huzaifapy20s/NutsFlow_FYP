from __future__ import annotations

from typing import TYPE_CHECKING

from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, String, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import MONEY_PRECISION, QUANTITY_PRECISION, db
from app.models.mixins import TimestampMixin

if TYPE_CHECKING:
    from app.models.purchase_item import PurchaseItem
    from app.models.sale_item import SaleItem
    from app.models.stock_movement import StockMovement


class Item(TimestampMixin, db.Model):
    __tablename__ = "items"
    __table_args__ = (
        CheckConstraint("stock_quantity >= 0", name="ck_items_stock_quantity_non_negative"),
        CheckConstraint("low_stock_threshold >= 0", name="ck_items_low_stock_threshold_non_negative"),
        CheckConstraint("average_cost >= 0", name="ck_items_average_cost_non_negative"),
        CheckConstraint("sale_price >= 0", name="ck_items_sale_price_non_negative"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    item_name: Mapped[str] = mapped_column(String(150), nullable=False, index=True)
    sku: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    category: Mapped[str | None] = mapped_column(String(100), nullable=True, index=True)
    unit: Mapped[str] = mapped_column(String(30), nullable=False)
    average_cost: Mapped[Decimal] = mapped_column(
        MONEY_PRECISION,
        nullable=False,
        server_default=text("0.00"),
    )
    sale_price: Mapped[Decimal] = mapped_column(
        MONEY_PRECISION,
        nullable=False,
        server_default=text("0.00"),
    )
    stock_quantity: Mapped[Decimal] = mapped_column(
        QUANTITY_PRECISION,
        nullable=False,
        server_default=text("0.00"),
    )
    low_stock_threshold: Mapped[Decimal] = mapped_column(
        QUANTITY_PRECISION,
        nullable=False,
        server_default=text("0.00"),
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("true"),
    )

    purchase_items: Mapped[list["PurchaseItem"]] = relationship(back_populates="item")
    sale_items: Mapped[list["SaleItem"]] = relationship(back_populates="item")
    stock_movements: Mapped[list["StockMovement"]] = relationship(
        back_populates="item",
        cascade="all, delete-orphan",
    )

    @property
    def is_low_stock(self) -> bool:
        return self.stock_quantity <= self.low_stock_threshold