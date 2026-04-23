from decimal import Decimal

from app.models import Customer, FinancialAccount, Item, PaymentStatus, Sale, SaleItem, SaleStatus, db
from app.models.enums import PaymentMethod as PaymentMethodEnum
from app.services.accounting_service import AccountingService
from app.services.inventory_service import InventoryService
from app.utils.validators import parse_decimal, parse_int, require_fields


class SaleService:
    @staticmethod
    def _build_sale_item_instances(sale_items_data: list) -> tuple[Decimal, list]:
        """Build SaleItem ORM objects and subtotal from API rows (create / update)."""
        if not isinstance(sale_items_data, list) or not sale_items_data:
            raise ValueError("sale_items must be a non-empty list.")
        subtotal = Decimal("0.00")
        sale_item_objects: list = []

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

        return (subtotal, sale_item_objects)

    @staticmethod
    def create_sale(payload: dict, user_id: int) -> dict:
        require_fields(payload, ["sale_items"])

        customer = None
        if payload.get("customer_id"):
            customer = Customer.query.get(parse_int(payload["customer_id"], "customer_id"))
            if not customer or not customer.is_active:
                raise LookupError("Customer not found or inactive.")

        sale_items_data = payload["sale_items"]
        subtotal, sale_item_objects = SaleService._build_sale_item_instances(sale_items_data)

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
            "customer_id": sale.customer_id,
            "customer": {
                "id": sale.customer.id,
                "full_name": sale.customer.full_name,
            } if sale.customer else None,
            "receipt_account_id": sale.receipt_account_id,
            "receipt_account": {
                "id": sale.receipt_account.id,
                "account_name": sale.receipt_account.account_name,
            } if sale.receipt_account else None,
            "subtotal": str(sale.subtotal),
            "discount_amount": str(sale.discount_amount),
            "tax_amount": str(sale.tax_amount),
            "total_amount": str(sale.total_amount),
            "paid_amount": str(sale.paid_amount),
            "balance_due": str(sale.balance_due),
            "payment_status": sale.payment_status.value,
            "sale_status": sale.sale_status.value,
            "payment_method": sale.payment_method.value if sale.payment_method else None,
            "notes": sale.notes,
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
        """Update bill totals, payment, customer, and receipt account.

        Reverses the previous effect on customer balance, receipt (cash) balance,
        and accounting entries, then applies the new state and a fresh sale journal.
        """
        sale = Sale.query.get(sale_id)
        if not sale:
            raise LookupError("Sale not found.")

        old_balance_due = sale.balance_due
        old_paid = sale.paid_amount
        old_customer = sale.customer
        old_receipt = sale.receipt_account

        if old_customer is not None and old_balance_due > 0:
            old_customer.opening_balance = (old_customer.opening_balance - old_balance_due).quantize(Decimal("0.01"))

        if old_receipt is not None and old_paid > 0:
            new_rcpt_bal = (old_receipt.current_balance - old_paid).quantize(Decimal("0.01"))
            if new_rcpt_bal < 0:
                raise ValueError("Cannot update sale: receipt account balance would become invalid.")
            old_receipt.current_balance = new_rcpt_bal

        AccountingService.reverse_sale_entry(sale, user_id)

        if "sale_items" in payload and payload.get("sale_items") is not None:
            sale_items_data = payload["sale_items"]
            if not isinstance(sale_items_data, list) or not sale_items_data:
                raise ValueError("sale_items must be a non-empty list.")
            old_lines = list(sale.sale_items)
            if old_lines:
                InventoryService.reverse_sale_stock(sale, old_lines, user_id)
            for line in list(sale.sale_items):
                db.session.delete(line)
            db.session.flush()

            new_subtotal, new_item_objs = SaleService._build_sale_item_instances(sale_items_data)
            sale.subtotal = new_subtotal
            for sitem in new_item_objs:
                sitem.sale_id = sale.id
                db.session.add(sitem)
            db.session.flush()
            InventoryService.apply_sale_stock(sale, list(sale.sale_items), user_id)

        discount = sale.discount_amount
        tax = sale.tax_amount
        if "discount_amount" in payload:
            discount = parse_decimal(payload["discount_amount"], "discount_amount")
        if "tax_amount" in payload:
            tax = parse_decimal(payload["tax_amount"], "tax_amount")

        sale.discount_amount = discount
        sale.tax_amount = tax
        total_amount = (sale.subtotal - sale.discount_amount + sale.tax_amount).quantize(Decimal("0.01"))
        if total_amount < 0:
            raise ValueError("Total cannot be negative. Reduce discount or adjust tax.")
        sale.total_amount = total_amount

        if "customer_id" in payload:
            cid = payload.get("customer_id")
            if cid in (None, ""):
                sale.customer_id = None
            else:
                cust = Customer.query.get(parse_int(cid, "customer_id"))
                if not cust or not cust.is_active:
                    raise LookupError("Customer not found or inactive.")
                sale.customer_id = cust.id

        if "receipt_account_id" in payload:
            rid = payload.get("receipt_account_id")
            if rid in (None, ""):
                sale.receipt_account_id = None
            else:
                acct = FinancialAccount.query.get(parse_int(rid, "receipt_account_id"))
                if not acct or not acct.is_active:
                    raise LookupError("Receipt account not found or inactive.")
                sale.receipt_account_id = acct.id

        paid = sale.paid_amount
        if "paid_amount" in payload:
            paid = parse_decimal(payload["paid_amount"], "paid_amount")
        if paid > total_amount:
            raise ValueError("paid_amount cannot exceed total_amount.")
        sale.paid_amount = paid

        if sale.paid_amount > 0 and not sale.receipt_account_id:
            raise ValueError("receipt_account_id is required when paid_amount is greater than zero.")

        if "payment_method" in payload:
            pm = payload.get("payment_method")
            if pm in (None, ""):
                sale.payment_method = None
            else:
                try:
                    sale.payment_method = PaymentMethodEnum(str(pm))
                except ValueError as exc:
                    raise ValueError("Invalid payment_method.") from exc

        if "notes" in payload:
            sale.notes = payload.get("notes")

        sale.balance_due = (sale.total_amount - sale.paid_amount).quantize(Decimal("0.01"))
        if sale.balance_due > 0 and not sale.customer_id:
            raise ValueError("A customer is required when there is an outstanding balance.")

        if sale.balance_due <= 0:
            sale.payment_status = PaymentStatus.PAID
        elif sale.paid_amount > 0:
            sale.payment_status = PaymentStatus.PARTIAL
        else:
            sale.payment_status = PaymentStatus.UNPAID

        new_customer = sale.customer
        if new_customer is not None and sale.balance_due > 0:
            new_customer.opening_balance = (new_customer.opening_balance + sale.balance_due).quantize(Decimal("0.01"))

        new_receipt = sale.receipt_account
        if new_receipt is not None and sale.paid_amount > 0:
            new_receipt.current_balance = (new_receipt.current_balance + sale.paid_amount).quantize(Decimal("0.01"))

        db.session.flush()
        AccountingService.create_sale_entry(sale, created_by_id=user_id)

        db.session.commit()
        return SaleService.serialize_sale(sale)