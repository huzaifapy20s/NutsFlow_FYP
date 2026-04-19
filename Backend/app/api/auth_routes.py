from flask import Blueprint, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required

from app.models import User, UserRole
from app.services.auth_service import AuthService
from app.utils.api_response import error_response, success_response

auth_bp = Blueprint("auth_bp", __name__)


@auth_bp.post("/register")
def register():
    try:
        current_role = None
        auth_header = request.headers.get("Authorization")
        if auth_header:
            try:
                # optional admin-controlled creation if already authenticated elsewhere
                pass
            except Exception:
                pass

        result = AuthService.register_user(request.get_json() or {}, created_by_role=current_role)
        return success_response(result, "User registered successfully.", 201)
    except ValueError as exc:
        return error_response(str(exc), 400)
    except Exception:
        return error_response("Failed to register user.", 500)


@auth_bp.post("/login")
def login():
    try:
        result = AuthService.login_user(request.get_json() or {})
        return success_response(result, "Login successful.", 200)
    except ValueError as exc:
        return error_response(str(exc), 401)
    except Exception:
        return error_response("Failed to login user.", 500)


@auth_bp.post("/refresh")
@jwt_required(refresh=True)
def refresh():
    try:
        user_id = int(get_jwt_identity())
        user = AuthService.get_user_by_id(user_id)
        result = AuthService.refresh_access_token(user)
        return success_response(result, "Access token refreshed successfully.", 200)
    except LookupError as exc:
        return error_response(str(exc), 404)
    except Exception:
        return error_response("Failed to refresh access token.", 500)


@auth_bp.post("/logout")
@jwt_required()
def logout():
    try:
        payload = request.get_json(silent=True) or {}
        refresh_token = payload.get("refresh_token")
        AuthService.logout_user(get_jwt(), refresh_token=refresh_token)
        return success_response({}, "Logout successful.", 200)
    except Exception:
        return error_response("Failed to logout user.", 500)


@auth_bp.get("/me")
@jwt_required()
def me():
    try:
        user = User.query.get(int(get_jwt_identity()))
        if not user:
            return error_response("User not found.", 404)

        return success_response(
            {
                "id": user.id,
                "full_name": user.full_name,
                "email": user.email,
                "role": user.role.value,
                "is_active": user.is_active,
            },
            "Current user fetched successfully.",
            200,
        )
    except Exception:
        return error_response("Failed to fetch current user.", 500)