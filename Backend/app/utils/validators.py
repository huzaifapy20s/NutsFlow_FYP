from datetime import date, datetime
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
import re


def require_fields(payload: dict, fields: list[str]) -> None:
    missing = [field for field in fields if not payload.get(field) or str(payload.get(field)).strip() == ""]
    if missing:
        raise ValueError(f"Missing required fields: {', '.join(missing)}")


def validate_email(email: str) -> None:
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email):
        raise ValueError("Email must be in valid format (e.g., user@example.com).")


def validate_phone(phone: str) -> None:
    if len(phone) != 11 or not phone.isdigit():
        raise ValueError("Phone must be exactly 11 digits.")


def parse_decimal(value, field_name: str, allow_zero: bool = True) -> Decimal:
    try:
        decimal_value = Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    except (InvalidOperation, TypeError, ValueError):
        raise ValueError(f"{field_name} must be a valid decimal value.")

    if decimal_value < 0:
        raise ValueError(f"{field_name} cannot be negative.")

    if not allow_zero and decimal_value <= 0:
        raise ValueError(f"{field_name} must be greater than zero.")

    return decimal_value


def parse_int(value, field_name: str) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        raise ValueError(f"{field_name} must be a valid integer.")


def parse_date_value(value, field_name: str) -> date:
    if isinstance(value, date) and not isinstance(value, datetime):
        return value

    try:
        return datetime.strptime(str(value), "%Y-%m-%d").date()
    except (TypeError, ValueError):
        raise ValueError(f"{field_name} must be in YYYY-MM-DD format.")