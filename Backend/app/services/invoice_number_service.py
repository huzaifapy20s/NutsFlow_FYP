from datetime import date
import re

from app.models import db


class InvoiceNumberService:
    @staticmethod
    def generate(model, prefix: str, invoice_field: str = "invoice_number") -> str:
        year = date.today().year % 100
        invoice_prefix = f"{prefix}-{year:02d}-"
        pattern = re.compile(rf"^{re.escape(invoice_prefix)}(\d{{6}})$")
        invoice_column = getattr(model, invoice_field)

        rows = (
            db.session.query(invoice_column)
            .filter(invoice_column.like(f"{invoice_prefix}%"))
            .all()
        )

        latest_number = 0
        for (invoice_number,) in rows:
            match = pattern.match(str(invoice_number or ""))
            if match:
                latest_number = max(latest_number, int(match.group(1)))

        return f"{invoice_prefix}{latest_number + 1:06d}"
