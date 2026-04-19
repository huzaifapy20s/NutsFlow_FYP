from enum import Enum


class UserRole(str, Enum):
    ADMIN = "admin"
    STAFF = "staff"


class PaymentStatus(str, Enum):
    UNPAID = "unpaid"
    PARTIAL = "partial"
    PAID = "paid"


class SaleStatus(str, Enum):
    COMPLETED = "completed"
    VOIDED = "voided"


class PurchaseStatus(str, Enum):
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class MovementType(str, Enum):
    PURCHASE = "purchase"
    SALE = "sale"
    SALE_RETURN = "sale_return"
    ADJUSTMENT_IN = "adjustment_in"
    ADJUSTMENT_OUT = "adjustment_out"


class ReferenceType(str, Enum):
    PURCHASE = "purchase"
    SALE = "sale"
    CUSTOMER_PAYMENT = "customer_payment"
    SUPPLIER_PAYMENT = "supplier_payment"
    EXPENSE = "expense"
    MANUAL = "manual"


class PaymentMethod(str, Enum):
    CASH = "cash"
    BANK_TRANSFER = "bank_transfer"
    CHEQUE = "cheque"
    CARD = "card"
    OTHER = "other"


class ChartAccountType(str, Enum):
    ASSET = "asset"
    LIABILITY = "liability"
    EQUITY = "equity"
    INCOME = "income"
    EXPENSE = "expense"
    COGS = "cogs"


class FinancialAccountType(str, Enum):
    CASH = "cash"
    BANK = "bank"
    ASSET = "asset"


class SessionStatus(str, Enum):
    ACTIVE = "active"
    REVOKED = "revoked"
    EXPIRED = "expired"


class TokenType(str, Enum):
    ACCESS = "access"
    REFRESH = "refresh"