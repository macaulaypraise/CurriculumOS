"""add module prerequisite edges

Revision ID: c8f31d5a7e24
Revises: b6d42e7f9a10
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c8f31d5a7e24"
down_revision: Union[str, Sequence[str], None] = "b6d42e7f9a10"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "module_prerequisites",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("module_id", sa.Integer(), nullable=False),
        sa.Column("requires_module_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["module_id"], ["modules.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["requires_module_id"], ["modules.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("module_id", "requires_module_id", name="uq_module_prerequisite_edge"),
    )
    op.create_index(op.f("ix_module_prerequisites_module_id"), "module_prerequisites", ["module_id"], unique=False)
    op.create_index(op.f("ix_module_prerequisites_requires_module_id"), "module_prerequisites", ["requires_module_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_module_prerequisites_requires_module_id"), table_name="module_prerequisites")
    op.drop_index(op.f("ix_module_prerequisites_module_id"), table_name="module_prerequisites")
    op.drop_table("module_prerequisites")
