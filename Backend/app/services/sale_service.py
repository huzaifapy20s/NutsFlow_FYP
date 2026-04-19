from decimal import Decimal

from app.models import Customer, FinancialAccount, Item, PaymentStatus, Sale, SaleItem, SaleStatus, db
from app.services.accounting_service import AccountingService
from app.services.inventory_service import InventoryService
from app.utils.validators import parse_decimal, parse_int, require_fields


class SaleService:
    @staticmethod
    def create_sale(payload: dict, user_id: int) -> dict:
        require_fields(payload, ["sale_items"])

        customer = None
        if payload.get("customer_id"):
            customer = Customer.query.get(parse_int(payload["customer_id"], "customer_id"))
            if not customer or not customer.is_active:
                raise LookupError("Customer not found or inactive.")

        sale_items_data = payload["sale_items"]
        if not isinstance(sale_items_data, list) or not sale_items_data:
            raise ValueError("sale_items must be a non-empty list.")

        discount_amount = parse_decimal(payload.get("discount_amount", 0), "discount_amount")
        tax_amount = parse_decimal(payload.get("tax_amount", 0), "tax_amount")
        paid_amount = parse_decimal(payload.get("paid_amount", 0), "paid_amount")
        payment_method = payload.get("payment_method")
        receipt_account_id = payload.get("receipt_account_id")

        receipt_account = None
        if paid_amount > 0:
            if not receipt_account_id:
                raise ValueError("receipt_account_id is required when paid_amount is greater than zero.")
            receipt_account = FinancialAccount.query.get(parse_int(receipt_account_id, "receipt_account_id"))
            if not receipt_account or not receipt_account.is_active:
                raise LookupError("Receipt account not found or inactive.")

        subtotal = Decimal("0.00")
        sale_item_objects = []

        for row in sale_items_data:
            require_fields(row, ["item_id", "quantity"])
            item = Item.query.get(parse_int(row["item_id"], "item_id"))
            if not item or not item.is_active:
                raise LookupError("One or more items were not found or inactive.")

            quantity = parse_decimal(row["quantity"], "quantity", allow_zero=False)
            unit_price = parse_decimal(
                row.get("unit_price", item.sale_price),
                "unit_price",
                allow_zero=False,
            )
            unit_cost_snapshot = item.average_cost
            line_total = (quantity * unit_price).quantize(Decimal("0.01"))
            subtotal += line_total

            sale_item_objects.append(
                SaleItem(
                    item=item,
                    quantity=quantity,
                    unit_price=unit_price,
                    unit_cost_snapshot=unit_cost_snapshot,
                    line_total=line_total,
                )
            )

        total_amount = (subtotal - discount_amount + tax_amount).quantize(Decimal("0.01"))
        if paid_amount > total_amount:
            raise ValueError("paid_amount cannot exceed total_amount.")

        balance_due = (total_amount - paid_amount).quantize(Decimal("0.01"))
        if balance_due > 0 and not customer:
            raise ValueError("A customer is required for credit or partial sales.")

        payment_status = PaymentStatus.UNPAID
        if paid_amount == total_amount and total_amount > 0:
            payment_status = PaymentStatus.PAID
        elif paid_amount > 0:
            payment_status = PaymentStatus.PARTIAL

        sale = Sale(
            invoice_number=payload.get("invoice_number") or f"SALE-{str(user_id)}-{int(Decimal(total_amount) * 100)}",
            customer_id=customer.id if customer else None,
            receipt_account_id=receipt_account.id if receipt_account else None,
            subtotal=subtotal,
            discount_amount=discount_amount,
            tax_amount=tax_amount,
            total_amount=total_amount,
            paid_amount=paid_amount,
            balance_due=balance_due,
            payment_status=payment_status,
            sale_status=SaleStatus.COMPLETED,
            payment_method=payment_method,
            notes=payload.get("notes"),
            created_by_id=user_id,
        )

        db.session.add(sale)
        db.session.flush()

        for sale_item in sale_item_objects:
            sale_item.sale_id = sale.id
            db.session.add(sale_item)

        db.session.flush()

        InventoryService.apply_sale_stock(sale, sale.sale_items, user_id)

        if receipt_account and paid_amount > 0:
            receipt_account.current_balance += paid_amount

        # Update customer balance for outstanding amount
        if customer and balance_due > 0:
            customer.opening_balance += balance_due

        AccountingService.create_sale_entry(sale, created_by_id=user_id)

        db.session.commit()

        return SaleService.serialize_sale(sale)

    @staticmethod
    def serialize_sale(sale: Sale) -> dict:
        return {
            "id": sale.id,
            "invoice_number": sale.invoice_number,
            "sale_date": sale.sale_date.isoformat(),
            "customer": {
                "id": sale.customer.id,
                "full_name": sale.customer.full_name,
            } if sale.customer else None,
            "subtotal": str(sale.subtotal),
            "discount_amount": str(sale.discount_amount),
            "tax_amount": str(sale.tax_amount),
            "total_amount": str(sale.total_amount),
            "paid_amount": str(sale.paid_amount),
            "balance_due": str(sale.balance_due),
            "payment_status": sale.payment_status.value,
            "sale_status": sale.sale_status.value,
            "sale_items": [
                {
                    "id": item.id,
                    "item_id": item.item_id,
                    "item_name": item.item.item_name,
                    "quantity": str(item.quantity),
                    "unit_price": str(item.unit_price),
                    "unit_cost_snapshot": str(item.unit_cost_snapshot),
                    "line_total": str(item.line_total),
                }
                for item in sale.sale_items
            ],
        }

    @staticmethod
    def delete_sale(sale_id: int, user_id: int) -> dict:
        sale = Sale.query.get(sale_id)
        if not sale:
            raise LookupError("Sale not found.")

        # Reverse inventory changes
        InventoryService.reverse_sale_stock(sale, sale.sale_items, user_id)

        # Reverse accounting entries
        AccountingService.reverse_sale_entry(sale, user_id)

        # Reverse customer balance if applicable
        if sale.customer and sale.balance_due > 0:
            sale.customer.opening_balance -= sale.balance_due

        # Reverse payment account balance if applicable
        if sale.paid_amount > 0:
            # Note: In a real implementation, you'd need to track which account received the payment
            # For now, we'll assume it was handled in the accounting service
            pass

        # Delete sale items first
        for sale_item in sale.sale_items:
            db.session.delete(sale_item)

        # Delete the sale
        db.session.delete(sale)
        db.session.commit()

        return {"id": sale_id}

    @staticmethod
    def update_sale(sale_id: int, payload: dict, user_id: int) -> dict:
        sale = Sale.query.get(sale_id)
        if not sale:
            raise LookupError("Sale not found.")

        # Update discount amount
        if "discount_amount" in payload:
            sale.discount_amount = parse_decimal(payload["discount_amount"], "discount_amount")

        # Update tax amount
        if "tax_amount" in payload:
            sale.tax_amount = parse_decimal(payload["tax_amount"], "tax_amount")

        # Update paid amount (but need to verify against total)
        if "paid_amount" in payload:
            new_paid_amount = parse_decimal(payload["paid_amount"], "paid_amount")
            if new_paid_amount > sale.total_amount:
                raise ValueError("Paid amount cannot exceed total amount.")
            sale.paid_amount = new_paid_amount

        # Update payment method
        if "payment_method" in payload:
            sale.payment_method = payload.get("payment_method")

        # Recalculate totals
        sale.total_amount = sale.subtotal - sale.discount_amount + sale.tax_amount
        sale.balance_due = sale.total_amount - sale.paid_amount

        # Update payment status
        if sale.balance_due <= 0:
            sale.payment_status = PaymentStatus.PAID
        elif sale.paid_amount > 0:
            sale.payment_status = PaymentStatus.PARTIAL
        else:
            sale.payment_status = PaymentStatus.UNPAID

        db.session.commit()
        return SaleService.serialize_sale(sale)