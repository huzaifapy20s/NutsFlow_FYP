from datetime import date

from sqlalchemy import extract, func

from app.models import Expense, Item, Purchase, Sale, SaleItem, db


class ReportService:
    @staticmethod
    def get_dashboard_summary() -> dict:
        today = date.today()

        today_sales = db.session.query(func.coalesce(func.sum(Sale.total_amount), 0)).filter(
            func.date(Sale.sale_date) == today,
            Sale.sale_status == "completed",
        ).scalar()

        month_sales = db.session.query(func.coalesce(func.sum(Sale.total_amount), 0)).filter(
            extract("year", Sale.sale_date) == today.year,
            extract("month", Sale.sale_date) == today.month,
            Sale.sale_status == "completed",
        ).scalar()

        year_sales = db.session.query(func.coalesce(func.sum(Sale.total_amount), 0)).filter(
            extract("year", Sale.sale_date) == today.year,
            Sale.sale_status == "completed",
        ).scalar()

        total_receivables = db.session.query(func.coalesce(func.sum(Sale.balance_due), 0)).filter(
            Sale.sale_status == "completed"
        ).scalar()

        total_payables = db.session.query(func.coalesce(func.sum(Purchase.balance_due), 0)).filter(
            Purchase.purchase_status == "completed"
        ).scalar()

        low_stock_count = db.session.query(func.count(Item.id)).filter(
            Item.is_active.is_(True),
            Item.stock_quantity <= Item.low_stock_threshold,
        ).scalar()

        return {
            "today_sales": str(today_sales),
            "month_sales": str(month_sales),
            "year_sales": str(year_sales),
            "total_receivables": str(total_receivables),
            "total_payables": str(total_payables),
            "low_stock_count": low_stock_count,
        }

    @staticmethod
    def get_low_stock_items() -> list[dict]:
        items = Item.query.filter(
            Item.is_active.is_(True),
            Item.stock_quantity <= Item.low_stock_threshold,
        ).order_by(Item.stock_quantity.asc()).all()

        return [
            {
                "id": item.id,
                "item_name": item.item_name,
                "sku": item.sku,
                "stock_quantity": str(item.stock_quantity),
                "low_stock_threshold": str(item.low_stock_threshold),
                "unit": item.unit,
            }
            for item in items
        ]

    @staticmethod
    def get_stock_report() -> list[dict]:
        items = Item.query.order_by(Item.item_name.asc()).all()
        return [
            {
                "id": item.id,
                "item_name": item.item_name,
                "sku": item.sku,
                "category": item.category,
                "unit": item.unit,
                "stock_quantity": str(item.stock_quantity),
                "average_cost": str(item.average_cost),
                "sale_price": str(item.sale_price),
                "low_stock_threshold": str(item.low_stock_threshold),
                "is_low_stock": item.is_low_stock,
            }
            for item in items
        ]

    @staticmethod
    def get_best_selling_products(limit: int = 10) -> list[dict]:
        rows = (
            db.session.query(
                SaleItem.item_id,
                Item.item_name,
                func.sum(SaleItem.quantity).label("total_quantity_sold"),
                func.sum(SaleItem.line_total).label("total_sales_amount"),
            )
            .join(Item, Item.id == SaleItem.item_id)
            .join(Sale, Sale.id == SaleItem.sale_id)
            .filter(Sale.sale_status == "completed")
            .group_by(SaleItem.item_id, Item.item_name)
            .order_by(func.sum(SaleItem.quantity).desc())
            .limit(limit)
            .all()
        )

        return [
            {
                "item_id": row.item_id,
                "item_name": row.item_name,
                "total_quantity_sold": str(row.total_quantity_sold),
                "total_sales_amount": str(row.total_sales_amount),
            }
            for row in rows
        ]

    @staticmethod
    def get_sales_period_summary(period: str) -> list[dict]:
        if period == "daily":
            rows = (
                db.session.query(
                    func.date(Sale.sale_date).label("period"),
                    func.sum(Sale.total_amount).label("total_sales"),
                )
                .filter(Sale.sale_status == "completed")
                .group_by(func.date(Sale.sale_date))
                .order_by(func.date(Sale.sale_date).desc())
                .all()
            )
        elif period == "monthly":
            rows = (
                db.session.query(
                    extract("year", Sale.sale_date).label("year"),
                    extract("month", Sale.sale_date).label("month"),
                    func.sum(Sale.total_amount).label("total_sales"),
                )
                .filter(Sale.sale_status == "completed")
                .group_by(extract("year", Sale.sale_date), extract("month", Sale.sale_date))
                .order_by(extract("year", Sale.sale_date).desc(), extract("month", Sale.sale_date).desc())
                .all()
            )
            return [
                {
                    "period": f"{int(row.year):04d}-{int(row.month):02d}",
                    "total_sales": str(row.total_sales),
                }
                for row in rows
            ]
        elif period == "yearly":
            rows = (
                db.session.query(
                    extract("year", Sale.sale_date).label("year"),
                    func.sum(Sale.total_amount).label("total_sales"),
                )
                .filter(Sale.sale_status == "completed")
                .group_by(extract("year", Sale.sale_date))
                .order_by(extract("year", Sale.sale_date).desc())
                .all()
            )
            return [
                {
                    "period": f"{int(row.year):04d}",
                    "total_sales": str(row.total_sales),
                }
                for row in rows
            ]
        else:
            raise ValueError("period must be one of: daily, monthly, yearly.")

        return [
            {
                "period": str(row.period),
                "total_sales": str(row.total_sales),
            }
            for row in rows
        ]

    @staticmethod
    def get_profit_loss_report() -> dict:
        total_revenue = db.session.query(func.coalesce(func.sum(Sale.total_amount), 0)).filter(
            Sale.sale_status == "completed"
        ).scalar()

        total_cogs = (
            db.session.query(
                func.coalesce(func.sum(SaleItem.quantity * SaleItem.unit_cost_snapshot), 0)
            )
            .join(Sale, Sale.id == SaleItem.sale_id)
            .filter(Sale.sale_status == "completed")
            .scalar()
        )

        total_expenses = db.session.query(func.coalesce(func.sum(Expense.amount), 0)).scalar()

        gross_profit = total_revenue - total_cogs
        net_profit = gross_profit - total_expenses

        return {
            "total_revenue": str(total_revenue),
            "total_cogs": str(total_cogs),
            "gross_profit": str(gross_profit),
            "total_expenses": str(total_expenses),
            "net_profit": str(net_profit),
        }