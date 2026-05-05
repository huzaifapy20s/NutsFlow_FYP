from decimal import Decimal

from app.models import FinancialAccount, Item, PaymentStatus, Purchase, PurchaseItem, Supplier, db
from app.services.accounting_service import AccountingService
from app.services.inventory_service import InventoryService
from app.services.invoice_number_service import InvoiceNumberService
from app.utils.validators import parse_decimal, parse_int, require_fields


class PurchaseService:
    @staticmethod
    def _generate_invoice_number() -> str:
        return InvoiceNumberService.generate(Purchase, "PINV")

    @staticmethod
    def create_purchase(payload: dict, user_id: int) -> dict:
        require_fields(payload, ["supplier_id", "purchase_items"])

        supplier_id = parse_int(payload["supplier_id"], "supplier_id")
        supplier = Supplier.query.get(supplier_id)
        if not supplier or not supplier.is_active:
            raise LookupError("Supplier not found or inactive.")

        purchase_items_data = payload["purchase_items"]
        if not isinstance(purchase_items_data, list) or not purchase_items_data:
            raise ValueError("purchase_items must be a non-empty list.")

        discount_amount = parse_decimal(payload.get("discount_amount", 0), "discount_amount")
        tax_amount = parse_decimal(payload.get("tax_amount", 0), "tax_amount")
        paid_amount = parse_decimal(payload.get("paid_amount", 0), "paid_amount")
        payment_method = payload.get("payment_method")
        payment_account_id = payload.get("payment_account_id")

        payment_account = None
        if paid_amount > 0:
            if not payment_account_id:
                raise ValueError("payment_account_id is required when paid_amount is greater than zero.")
            payment_account = FinancialAccount.query.get(parse_int(payment_account_id, "payment_account_id"))
            if not payment_account or not payment_account.is_active:
                raise LookupError("Payment account not found or inactive.")
            if payment_account.current_balance < paid_amount:
                raise ValueError("Insufficient balance in the selected payment account.")

        subtotal = Decimal("0.00")
        purchase_item_objects = []

        for row in purchase_items_data:
            require_fields(row, ["item_id", "quantity", "unit_cost"])
            item = Item.query.get(parse_int(row["item_id"], "item_id"))
            if not item or not item.is_active:
                raise LookupError("One or more items were not found or inactive.")

            quantity = parse_decimal(row["quantity"], "quantity", allow_zero=False)
            unit_cost = parse_decimal(row["unit_cost"], "unit_cost", allow_zero=False)
            line_total = (quantity * unit_cost).quantize(Decimal("0.01"))
            subtotal += line_total

            purchase_item_objects.append(
                PurchaseItem(
                    item=item,
                    quantity=quantity,
                    unit_cost=unit_cost,
                    line_total=line_total,
                )
            )

        total_amount = (subtotal - discount_amount + tax_amount).quantize(Decimal("0.01"))
        if paid_amount > total_amount:
            raise ValueError("paid_amount cannot exceed total_amount.")

        balance_due = (total_amount - paid_amount).quantize(Decimal("0.01"))

        payment_status = PaymentStatus.UNPAID
        if paid_amount == total_amount and total_amount > 0:
            payment_status = PaymentStatus.PAID
        elif paid_amount > 0:
            payment_status = PaymentStatus.PARTIAL

        purchase = Purchase(
            supplier_id=supplier.id,
            payment_account_id=payment_account.id if payment_account else None,
            invoice_number=PurchaseService._generate_invoice_number(),
            subtotal=subtotal,
            discount_amount=discount_amount,
            tax_amount=tax_amount,
            total_amount=total_amount,
            paid_amount=paid_amount,
            balance_due=balance_due,
            payment_status=payment_status,
            purchase_status="completed",
            payment_method=payment_method,
            notes=payload.get("notes"),
            created_by_id=user_id,
        )

        db.session.add(purchase)
        db.session.flush()

        for purchase_item in purchase_item_objects:
            purchase_item.purchase_id = purchase.id
            db.session.add(purchase_item)

        db.session.flush()

        InventoryService.apply_purchase_stock(purchase, purchase.purchase_items, user_id)

        if payment_account and paid_amount > 0:
            payment_account.current_balance -= paid_amount

        # Update supplier balance for outstanding amount
        supplier.opening_balance += balance_due

        AccountingService.create_purchase_entry(purchase, created_by_id=user_id)

        db.session.commit()

        return PurchaseService.serialize_purchase(purchase)

    @staticmethod
    def update_purchase(purchase_id: int, payload: dict, user_id: int) -> dict:
        purchase = Purchase.query.get(purchase_id)
        if not purchase:
            raise LookupError("Purchase not found.")

        if payload.get("supplier_id") is not None:
            supplier = Supplier.query.get(parse_int(payload["supplier_id"], "supplier_id"))
            if not supplier or not supplier.is_active:
                raise LookupError("Supplier not found or inactive.")
            purchase.supplier = supplier

        purchase_items_data = payload.get("purchase_items")
        if not isinstance(purchase_items_data, list) or not purchase_items_data:
            raise ValueError("purchase_items must be a non-empty list.")

        payment_account_id = payload.get("payment_account_id")
        paid_amount = parse_decimal(payload.get("paid_amount", purchase.paid_amount), "paid_amount")
        old_paid = purchase.paid_amount
        old_balance_due = purchase.balance_due
        old_account = purchase.payment_account
        new_account = None

        # Rebuild purchase item details for the updated purchase.
        subtotal = Decimal("0.00")
        purchase.purchase_items.clear()

        for row in purchase_items_data:
            require_fields(row, ["item_id", "quantity", "unit_cost"])
            item = Item.query.get(parse_int(row["item_id"], "item_id"))
            if not item or not item.is_active:
                raise LookupError("One or more items were not found or inactive.")

            quantity = parse_decimal(row["quantity"], "quantity", allow_zero=False)
            unit_cost = parse_decimal(row["unit_cost"], "unit_cost", allow_zero=False)
            line_total = (quantity * unit_cost).quantize(Decimal("0.01"))
            subtotal += line_total

            purchase_item = PurchaseItem(
                item=item,
                quantity=quantity,
                unit_cost=unit_cost,
                line_total=line_total,
            )
            purchase.purchase_items.append(purchase_item)

        purchase.subtotal = subtotal

        if paid_amount > 0 and not payment_account_id and not old_account:
            raise ValueError("payment_account_id is required when paid_amount is greater than zero.")

        if payment_account_id:
            new_account = FinancialAccount.query.get(parse_int(payment_account_id, "payment_account_id"))
            if not new_account or not new_account.is_active:
                raise LookupError("Payment account not found or inactive.")
        else:
            new_account = old_account

        if new_account and old_account and old_account.id != new_account.id:
            old_account.current_balance += old_paid
            if paid_amount > 0 and new_account.current_balance < paid_amount:
                raise ValueError("Insufficient balance in the selected payment account.")
            new_account.current_balance -= paid_amount
        elif new_account:
            const_diff = paid_amount - old_paid
            if const_diff > 0 and new_account.current_balance < const_diff:
                raise ValueError("Insufficient balance in the selected payment account.")
            new_account.current_balance -= const_diff
        elif old_account and paid_amount == 0:
            old_account.current_balance += old_paid

        purchase.payment_account = new_account
        purchase.paid_amount = paid_amount
        purchase.invoice_number = (
            payload.get("invoice_number", purchase.invoice_number)
            or purchase.invoice_number
        )
        purchase.notes = payload.get("notes")
        purchase.payment_method = payload.get("payment_method")
        purchase.discount_amount = parse_decimal(payload.get("discount_amount", purchase.discount_amount), "discount_amount")
        purchase.tax_amount = parse_decimal(payload.get("tax_amount", purchase.tax_amount), "tax_amount")
        purchase.total_amount = (purchase.subtotal - purchase.discount_amount + purchase.tax_amount).quantize(Decimal("0.01"))

        if purchase.paid_amount > purchase.total_amount:
            raise ValueError("paid_amount cannot exceed total_amount.")

        purchase.balance_due = (purchase.total_amount - purchase.paid_amount).quantize(Decimal("0.01"))
        purchase.payment_status = PurchaseService._resolve_payment_status(purchase.paid_amount, purchase.total_amount)

        # Update supplier balance based on change in balance due
        balance_due_diff = purchase.balance_due - old_balance_due
        purchase.supplier.opening_balance += balance_due_diff

        db.session.commit()
        return PurchaseService.serialize_purchase(purchase)

    @staticmethod
    def delete_purchase(purchase_id: int) -> None:
        purchase = Purchase.query.get(purchase_id)
        if not purchase:
            raise LookupError("Purchase not found.")

        # Reverse supplier balance
        purchase.supplier.opening_balance -= purchase.balance_due

        # Reverse payment account balance if payment was made
        if purchase.payment_account and purchase.paid_amount > 0:
            purchase.payment_account.current_balance += purchase.paid_amount

        db.session.delete(purchase)
        db.session.commit()

    @staticmethod
    def _resolve_payment_status(paid_amount: Decimal, total_amount: Decimal) -> PaymentStatus:
        if paid_amount == total_amount and total_amount > 0:
            return PaymentStatus.PAID
        if paid_amount > 0:
            return PaymentStatus.PARTIAL
        return PaymentStatus.UNPAID

    @staticmethod
    def serialize_purchase(purchase: Purchase) -> dict:
        return {
            "id": purchase.id,
            "invoice_number": purchase.invoice_number,
            "purchase_date": purchase.purchase_date.isoformat(),
            "supplier": {
                "id": purchase.supplier.id,
                "supplier_name": purchase.supplier.supplier_name,
            },
            "supplier_id": purchase.supplier.id,
            "payment_account_id": purchase.payment_account_id,
            "notes": purchase.notes,
            "payment_method": purchase.payment_method.value if purchase.payment_method else None,
            "subtotal": str(purchase.subtotal),
            "discount_amount": str(purchase.discount_amount),
            "tax_amount": str(purchase.tax_amount),
            "total_amount": str(purchase.total_amount),
            "paid_amount": str(purchase.paid_amount),
            "balance_due": str(purchase.balance_due),
            "payment_status": purchase.payment_status.value,
            "purchase_items": [
                {
                    "id": item.id,
                    "item_id": item.item_id,
                    "item_name": item.item.item_name,
                    "quantity": str(item.quantity),
                    "unit_cost": str(item.unit_cost),
                    "line_total": str(item.line_total),
                }
                for item in purchase.purchase_items
            ],
        }
