"""merge archive and prerequisite migration heads

Revision ID: d2a64f8c1b30
Revises: 04891b25a520, c8f31d5a7e24
"""

from typing import Sequence, Union


revision: str = "d2a64f8c1b30"
down_revision: Union[str, Sequence[str], None] = ("04891b25a520", "c8f31d5a7e24")
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    pass


def downgrade() -> None:
    pass
