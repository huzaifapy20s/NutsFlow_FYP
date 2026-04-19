from flask import Flask, jsonify

from app.api import register_blueprints
from app.auth.jwt_manager import register_jwt_callbacks
from app.config import Config
from app.extensions import bcrypt, cors, db, jwt, migrate


def create_app(config_class: type[Config] = Config) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_class)

    register_extensions(app)

    from app import models  # noqa: F401

    register_jwt_callbacks(jwt)
    register_blueprints(app)

    @app.get("/health")
    def health_check():
        return (
            jsonify(
                {
                    "status": "success",
                    "data": {
                        "service": "dry_fruit_management_system_backend",
                        "healthy": True,
                    },
                    "message": "API is running successfully.",
                }
            ),
            200,
        )

    @app.route("/")
    def root():
        return (
            jsonify(
                {
                    "status": "success",
                    "data": {
                        "service": "dry_fruit_management_system_backend",
                        "version": "1.0.0",
                        "endpoints": {
                            "auth": "/api/auth",
                            "items": "/api/items",
                            "customers": "/api/customers",
                            "suppliers": "/api/suppliers",
                            "accounts": "/api/accounts",
                            "purchases": "/api/purchases",
                            "sales": "/api/sales",
                            "payments": "/api/payments",
                            "expenses": "/api/expenses",
                            "dashboard": "/api/dashboard",
                            "reports": "/api/reports",
                        },
                    },
                    "message": "Welcome to Dry Fruit Management System API",
                }
            ),
            200,
        )

    register_error_handlers(app)

    return app


def register_extensions(app: Flask) -> None:
    db.init_app(app)
    migrate.init_app(app, db)
    jwt.init_app(app)
    bcrypt.init_app(app)
    cors.init_app(
        app,
        resources={r"/api/*": {"origins": app.config["CORS_ALLOWED_ORIGINS"]}},
        supports_credentials=True,
    )


def register_error_handlers(app: Flask) -> None:
    @app.errorhandler(404)
    def not_found_error(_error):
        return (
            jsonify(
                {
                    "status": "error",
                    "data": {},
                    "message": "Requested resource was not found.",
                }
            ),
            404,
        )

    @app.errorhandler(500)
    def internal_server_error(_error):
        return (
            jsonify(
                {
                    "status": "error",
                    "data": {},
                    "message": "An internal server error occurred.",
                }
            ),
            500,
        )