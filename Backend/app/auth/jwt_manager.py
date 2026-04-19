from flask_jwt_extended import JWTManager

from app.models import TokenBlocklist
from app.utils.api_response import error_response


def register_jwt_callbacks(jwt: JWTManager) -> None:
    @jwt.token_in_blocklist_loader
    def check_if_token_is_revoked(_jwt_header, jwt_payload):
        jti = jwt_payload["jti"]
        blocked = TokenBlocklist.query.filter_by(jti=jti).first()
        return blocked is not None

    @jwt.revoked_token_loader
    def revoked_token_callback(_jwt_header, _jwt_payload):
        return error_response("Token has been revoked.", 401)

    @jwt.expired_token_loader
    def expired_token_callback(_jwt_header, _jwt_payload):
        return error_response("Token has expired.", 401)

    @jwt.invalid_token_loader
    def invalid_token_callback(_error):
        return error_response("Invalid token.", 401)

    @jwt.unauthorized_loader
    def missing_token_callback(_error):
        return error_response("Authorization token is missing.", 401)