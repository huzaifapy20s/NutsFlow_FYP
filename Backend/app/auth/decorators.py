from functools import wraps

from flask_jwt_extended import get_jwt, verify_jwt_in_request

from app.utils.api_response import error_response


def role_required(*allowed_roles):
    def decorator(fn):
        @wraps(fn)
        def wrapper(*args, **kwargs):
            verify_jwt_in_request()
            token_data = get_jwt()
            current_role = token_data.get("role")

            if current_role not in allowed_roles:
                return error_response("You do not have permission to perform this action.", 403)

            return fn(*args, **kwargs)

        return wrapper

    return decorator