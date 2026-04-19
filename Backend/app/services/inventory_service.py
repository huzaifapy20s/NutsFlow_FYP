from decimal import Decimal

from app.models import Item, MovementType, ReferenceType, StockMovement, db


class InventoryService:
    @staticmethod
    def calculate_new_average_cost(item: Item, purchased_quantity: Decimal, unit_cost: Decimal) -> Decimal:
        current_stock = item.stock_quantity
        current_cost = item.average_cost

        if current_stock <= 0:
            return unit_cost

        new_total_quantity = current_stock + purchased_quantity
        new_total_value = (current_stock * current_cost) + (purchased_quantity * unit_cost)
        return (new_total_value / new_total_quantity).quantize(Decimal("0.01"))

    @staticmethod
    def apply_purchase_stock(purchase, purchase_items: list, user_id: int) -> None:
        for purchase_item in purchase_items:
            item = purchase_item.item
            item.average_cost = InventoryService.calculate_new_average_cost(
                item=item,
                purchased_quantity=purchase_item.quantity,
                unit_cost=purchase_item.unit_cost,
            )
            item.stock_quantity += purchase_item.quantity

            movement = StockMovement(
                item_id=item.id,
                movement_type=MovementType.PURCHASE,
                reference_type=ReferenceType.PURCHASE,
                reference_id=purchase.id,
                quantity=purchase_item.quantity,
                unit_cost=purchase_item.unit_cost,
                note=f"Purchase stock in for purchase #{purchase.id}",
                created_by_id=user_id,
            )
            db.session.add(movement)

    @staticmethod
    def validate_sale_stock(sale_items: list) -> None:
        for sale_item in sale_items:
            if sale_item.item.stock_quantity < sale_item.quantity:
                raise ValueError(
                    f"Insufficient stock for item '{sale_item.item.item_name}'. "
                    f"Available: {sale_item.item.stock_quantity}, Requested: {sale_item.quantity}"
                )

    @staticmethod
    def apply_sale_stock(sale, sale_items: list, user_id: int) -> None:
        InventoryService.validate_sale_stock(sale_items)

        for sale_item in sale_items:
            item = sale_item.item
            item.stock_quantity -= sale_item.quantity

            movement = StockMovement(
                item_id=item.id,
                movement_type=MovementType.SALE,
                reference_type=ReferenceType.SALE,
                reference_id=sale.id,
                quantity=sale_item.quantity,
                unit_cost=sale_item.unit_cost_snapshot,
                note=f"Sale stock out for sale #{sale.id}",
                created_by_id=user_id,
            )
            db.session.add(movement)

    @staticmethod
    def reverse_sale_stock(sale, sale_items: list, user_id: int) -> None:
        for sale_item in sale_items:
            item = sale_item.item
            item.stock_quantity += sale_item.quantity

            movement = StockMovement(
                item_id=item.id,
                movement_type=MovementType.SALE_RETURN,
                reference_type=ReferenceType.SALE,
                reference_id=sale.id,
                quantity=sale_item.quantity,
                unit_cost=sale_item.unit_cost_snapshot,
                note=f"Sale stock reversal for deleted sale #{sale.id}",
                created_by_id=user_id,
            )
            db.session.add(movement)