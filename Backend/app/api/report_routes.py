from flask import Blueprint, request
from flask_jwt_extended import jwt_required

from app.services.report_service import ReportService
from app.utils.api_response import error_response, success_response

report_bp = Blueprint("report_bp", __name__)


@report_bp.get("/stock")
@jwt_required()
def stock_report():
    return success_response(
        ReportService.get_stock_report(),
        "Stock report fetched successfully.",
        200,
    )


@report_bp.get("/best-selling")
@jwt_required()
def best_selling_report():
    limit = int(request.args.get("limit", 10))
    return success_response(
        ReportService.get_best_selling_products(limit=limit),
        "Best-selling products report fetched successfully.",
        200,
    )


@report_bp.get("/sales")
@jwt_required()
def sales_report():
    try:
        period = request.args.get("period", "daily")
        return success_response(
            ReportService.get_sales_period_summary(period),
            "Sales report fetched successfully.",
            200,
        )
    except ValueError as exc:
        return error_response(str(exc), 400)


@report_bp.get("/profit-loss")
@jwt_required()
def profit_loss_report():
    return success_response(
        ReportService.get_profit_loss_report(),
        "Profit/Loss report fetched successfully.",
        200,
    )


@report_bp.get("/income-statement")
@jwt_required()
def income_statement_report():
    return success_response(
        ReportService.get_profit_loss_report(),
        "Income statement fetched successfully.",
        200,
    )