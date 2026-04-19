from app.models import (
    Customer,
    CustomerPayment,
    FinancialAccount,
    PaymentMethod,
    PaymentStatus,
    Purchase,
    Sale,
    Supplier,
    SupplierPayment,
    db,
)
from app.services.accounting_service import AccountingService
from app.utils.validators import parse_decimal, parse_int, require_fields


class PaymentService:
    @staticmethod
    def create_customer_payment(payload: dict, user_id: int) -> dict:
        require_fields(payload, ["customer_id", "account_id", "amount", "payment_method"])

        customer = Customer.query.get(parse_int(payload["customer_id"], "customer_id"))
        if not customer or not customer.is_active:
            raise LookupError("Customer not found or inactive.")

        account = FinancialAccount.query.get(parse_int(payload["account_id"], "account_id"))
        if not account or not account.is_active:
            raise LookupError("Financial account not found or inactive.")

        amount = parse_decimal(payload["amount"], "amount", allow_zero=False)
        sale = None

        if payload.get("sale_id"):
            sale = Sale.query.get(parse_int(payload["sale_id"], "sale_id"))
            if not sale:
                raise LookupError("Sale not found.")
            if sale.customer_id != customer.id:
                raise ValueError("Selected sale does not belong to the given customer.")
            if amount > sale.balance_due:
                raise ValueError("Payment amount cannot exceed the sale balance due.")

        payment = CustomerPayment(
            customer_id=customer.id,
            sale_id=sale.id if sale else None,
            account_id=account.id,
            amount=amount,
            payment_method=PaymentMethod(payload["payment_method"]),
            reference_number=payload.get("reference_number"),
            notes=payload.get("notes"),
            created_by_id=user_id,
        )

        db.session.add(payment)
        db.session.flush()

        account.current_balance += amount

        if sale:
            sale.paid_amount += amount
            sale.balance_due -= amount
            if sale.balance_due == 0:
                sale.payment_status = PaymentStatus.PAID
            else:
                sale.payment_status = PaymentStatus.PARTIAL

        # Update customer balance (increases as they pay and owe less)
        customer.opening_balance -= amount

        AccountingService.create_customer_payment_entry(payment, created_by_id=user_id)

        db.session.commit()

        return {
            "id": payment.id,
            "customer_id": payment.customer_id,
            "sale_id": payment.sale_id,
            "amount": str(payment.amount),
            "payment_method": payment.payment_method.value,
        }

    @staticmethod
    def create_supplier_payment(payload: dict, user_id: int) -> dict:
        require_fields(payload, ["supplier_id", "account_id", "amount", "payment_method"])

        supplier = Supplier.query.get(parse_int(payload["supplier_id"], "supplier_id"))
        if not supplier or not supplier.is_active:
            raise LookupError("Supplier not found or inactive.")

        account = FinancialAccount.query.get(parse_int(payload["account_id"], "account_id"))
        if not account or not account.is_active:
            raise LookupError("Financial account not found or inactive.")

        amount = parse_decimal(payload["amount"], "amount", allow_zero=False)
        if account.current_balance < amount:
            raise ValueError("Insufficient balance in the selected payment account.")

        purchase = None
        if payload.get("purchase_id"):
            purchase = Purchase.query.get(parse_int(payload["purchase_id"], "purchase_id"))
            if not purchase:
                raise LookupError("Purchase not found.")
            if purchase.supplier_id != supplier.id:
                raise ValueError("Selected purchase does not belong to the given supplier.")
            if amount > purchase.balance_due:
                raise ValueError("Payment amount cannot exceed the purchase balance due.")

        payment = SupplierPayment(
            supplier_id=supplier.id,
            purchase_id=purchase.id if purchase else None,
            account_id=account.id,
            amount=amount,
            payment_method=PaymentMethod(payload["payment_method"]),
            reference_number=payload.get("reference_number"),
            notes=payload.get("notes"),
            created_by_id=user_id,
        )

        db.session.add(payment)
        db.session.flush()

        account.current_balance -= amount

        if purchase:
            purchase.paid_amount += amount
            purchase.balance_due -= amount
            if purchase.balance_due == 0:
                purchase.payment_status = PaymentStatus.PAID
            else:
                purchase.payment_status = PaymentStatus.PARTIAL

        # Update supplier balance (increases as we pay and owe less)
        supplier.opening_balance -= amount

        AccountingService.create_supplier_payment_entry(payment, created_by_id=user_id)

        db.session.commit()

        return {
            "id": payment.id,
            "supplier_id": payment.supplier_id,
            "purchase_id": payment.purchase_id,
            "amount": str(payment.amount),
            "payment_method": payment.payment_method.value,
        }