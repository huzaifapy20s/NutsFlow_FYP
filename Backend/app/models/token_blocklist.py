from __future__ import annotations

from typing import TYPE_CHECKING

from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import db, enum_column
from app.models.enums import TokenType

if TYPE_CHECKING:
    from app.models.user import User


class TokenBlocklist(db.Model):
    __tablename__ = "token_blocklist"
    __table_args__ = (
        UniqueConstraint("jti", name="uq_token_blocklist_jti"),
        Index("ix_token_blocklist_user_id_expires_at", "user_id", "expires_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    jti: Mapped[str] = mapped_column(String(255), nullable=False)
    token_type: Mapped[TokenType] = enum_column(TokenType)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    revoked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=func.now(),
    )

    user: Mapped["User"] = relationship(back_populates="token_blocklist_entries")