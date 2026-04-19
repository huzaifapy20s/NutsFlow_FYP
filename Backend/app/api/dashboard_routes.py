from flask import Blueprint
from flask_jwt_extended import jwt_required

from app.services.report_service import ReportService
from app.utils.api_response import success_response

dashboard_bp = Blueprint("dashboard_bp", __name__)


@dashboard_bp.get("/summary")
@jwt_required()
def get_dashboard_summary():
    return success_response(
        ReportService.get_dashboard_summary(),
        "Dashboard summary fetched successfully.",
        200,
    )


@dashboard_bp.get("/low-stock")
@jwt_required()
def get_low_stock_items():
    return success_response(
        ReportService.get_low_stock_items(),
        "Low stock items fetched successfully.",
        200,
    )