from datetime import datetime, timezone

from flask_jwt_extended import create_access_token, create_refresh_token, decode_token
from sqlalchemy import select

from app.extensions import bcrypt
from app.models import SessionStatus, TokenBlocklist, TokenType, User, UserSession, UserRole, db


class AuthService:
    @staticmethod
    def register_user(payload: dict, created_by_role: str | None = None) -> dict:
        full_name = payload.get("full_name", "").strip()
        email = payload.get("email", "").strip().lower()
        password = payload.get("password", "")
        requested_role = payload.get("role", UserRole.STAFF.value)

        if not full_name:
            raise ValueError("full_name is required.")
        if not email:
            raise ValueError("email is required.")
        if not password or len(password) < 6:
            raise ValueError("password must be at least 6 characters long.")

        if User.query.filter_by(email=email).first():
            raise ValueError("A user with this email already exists.")

        role_value = UserRole.STAFF
        if created_by_role == UserRole.ADMIN.value and requested_role in [role.value for role in UserRole]:
            role_value = UserRole(requested_role)

        user = User(
            full_name=full_name,
            email=email,
            password_hash=bcrypt.generate_password_hash(password).decode("utf-8"),
            role=role_value,
            is_active=True,
        )
        db.session.add(user)
        db.session.commit()

        return {
            "id": user.id,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role.value,
            "is_active": user.is_active,
        }

    @staticmethod
    def login_user(payload: dict) -> dict:
        email = payload.get("email", "").strip().lower()
        password = payload.get("password", "")

        user = User.query.filter_by(email=email).first()
        if not user or not bcrypt.check_password_hash(user.password_hash, password):
            raise ValueError("Invalid email or password.")

        if not user.is_active:
            raise ValueError("This user account is inactive.")

        additional_claims = {
            "role": user.role.value,
            "email": user.email,
        }

        access_token = create_access_token(identity=str(user.id), additional_claims=additional_claims)
        refresh_token = create_refresh_token(identity=str(user.id), additional_claims=additional_claims)

        decoded_refresh = decode_token(refresh_token)

        user.last_login_at = datetime.now(timezone.utc)

        user_session = UserSession(
            user_id=user.id,
            refresh_token_jti=decoded_refresh["jti"],
            status=SessionStatus.ACTIVE,
            expires_at=datetime.fromtimestamp(decoded_refresh["exp"], tz=timezone.utc),
        )
        db.session.add(user_session)
        db.session.commit()

        return {
            "user": {
                "id": user.id,
                "full_name": user.full_name,
                "email": user.email,
                "role": user.role.value,
            },
            "tokens": {
                "access_token": access_token,
                "refresh_token": refresh_token,
            },
        }

    @staticmethod
    def refresh_access_token(user: User) -> dict:
        additional_claims = {
            "role": user.role.value,
            "email": user.email,
        }
        access_token = create_access_token(identity=str(user.id), additional_claims=additional_claims)
        return {"access_token": access_token}

    @staticmethod
    def revoke_token(jti: str, token_type: str, user_id: int | None, exp_timestamp: int) -> None:
        blocked = TokenBlocklist.query.filter_by(jti=jti).first()
        if blocked:
            return

        revoked = TokenBlocklist(
            user_id=user_id,
            jti=jti,
            token_type=TokenType(token_type),
            expires_at=datetime.fromtimestamp(exp_timestamp, tz=timezone.utc),
        )
        db.session.add(revoked)

    @staticmethod
    def logout_user(access_jwt: dict, refresh_token: str | None = None) -> None:
        user_id = int(access_jwt["sub"])
        AuthService.revoke_token(
            jti=access_jwt["jti"],
            token_type=access_jwt["type"],
            user_id=user_id,
            exp_timestamp=access_jwt["exp"],
        )

        if refresh_token:
            decoded_refresh = decode_token(refresh_token)
            AuthService.revoke_token(
                jti=decoded_refresh["jti"],
                token_type=decoded_refresh["type"],
                user_id=int(decoded_refresh["sub"]),
                exp_timestamp=decoded_refresh["exp"],
            )

            session = UserSession.query.filter_by(
                refresh_token_jti=decoded_refresh["jti"],
                status=SessionStatus.ACTIVE,
            ).first()
            if session:
                session.status = SessionStatus.REVOKED
                session.revoked_at = datetime.now(timezone.utc)

        db.session.commit()

    @staticmethod
    def get_user_by_id(user_id: int) -> User:
        user = db.session.scalar(select(User).where(User.id == user_id))
        if not user:
            raise LookupError("User not found.")
        return user