from __future__ import annotations

from decimal import Decimal
from enum import Enum

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import Enum as SqlEnum, Numeric
from sqlalchemy.orm import DeclarativeBase, mapped_column


class Base(DeclarativeBase):
    pass


db = SQLAlchemy(model_class=Base)

MONEY_PRECISION = Numeric(10, 2)
QUANTITY_PRECISION = Numeric(10, 2)
ZERO_DECIMAL = Decimal("0.00")


def enum_column(enum_class: type[Enum], nullable: bool = False):
    return mapped_column(
        SqlEnum(enum_class, native_enum=False, validate_strings=True),
        nullable=nullable,
    )