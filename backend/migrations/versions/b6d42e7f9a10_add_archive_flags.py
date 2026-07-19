"""add archive flags

Revision ID: b6d42e7f9a10
Revises: 43aac4d6442c
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "b6d42e7f9a10"
down_revision: Union[str, Sequence[str], None] = "43aac4d6442c"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("projects", sa.Column("is_archived", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("courses", sa.Column("is_archived", sa.Boolean(), nullable=False, server_default=sa.text("false")))
    op.add_column("assessments", sa.Column("is_archived", sa.Boolean(), nullable=False, server_default=sa.text("false")))


def downgrade() -> None:
    op.drop_column("assessments", "is_archived")
    op.drop_column("courses", "is_archived")
    op.drop_column("projects", "is_archived")
