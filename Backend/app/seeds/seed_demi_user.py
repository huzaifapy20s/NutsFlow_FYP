from app import create_app
from app.models import User, UserRole
from app.services.auth_service import AuthService


def main() -> None:
    app = create_app()

    with app.app_context():
        email = "demi@example.com"
        existing_user = User.query.filter_by(email=email).first()
        if existing_user:
            print(f"Demi user already exists: {existing_user.full_name} <{existing_user.email}>")
            return

        user_payload = {
            "full_name": "Demi User",
            "email": email,
            "password": "demi1234",
            "role": UserRole.STAFF.value,
        }

        created_user = AuthService.register_user(user_payload)
        print("Created demi user:")
        print(created_user)


if __name__ == "__main__":
    main()
