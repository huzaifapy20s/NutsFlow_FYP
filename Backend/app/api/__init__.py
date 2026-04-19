from flask import Flask

from app.api.account_routes import account_bp
from app.api.auth_routes import auth_bp
from app.api.customer_routes import customer_bp
from app.api.dashboard_routes import dashboard_bp
from app.api.expense_routes import expense_bp
from app.api.item_routes import item_bp
from app.api.payment_routes import payment_bp
from app.api.purchase_routes import purchase_bp
from app.api.report_routes import report_bp
from app.api.sale_routes import sale_bp
from app.api.supplier_routes import supplier_bp


def register_blueprints(app: Flask) -> None:
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(item_bp, url_prefix="/api/items")
    app.register_blueprint(customer_bp, url_prefix="/api/customers")
    app.register_blueprint(supplier_bp, url_prefix="/api/suppliers")
    app.register_blueprint(account_bp, url_prefix="/api/accounts")
    app.register_blueprint(purchase_bp, url_prefix="/api/purchases")
    app.register_blueprint(sale_bp, url_prefix="/api/sales")
    app.register_blueprint(payment_bp, url_prefix="/api/payments")
    app.register_blueprint(expense_bp, url_prefix="/api/expenses")
    app.register_blueprint(dashboard_bp, url_prefix="/api/dashboard")
    app.register_blueprint(report_bp, url_prefix="/api/reports")