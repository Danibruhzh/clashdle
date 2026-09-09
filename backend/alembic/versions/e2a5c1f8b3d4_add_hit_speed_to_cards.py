"""add hit_speed to cards

Revision ID: e2a5c1f8b3d4
Revises: 576be3bac815
Create Date: 2026-09-09 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'e2a5c1f8b3d4'
down_revision: Union[str, Sequence[str], None] = '576be3bac815'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('cards', sa.Column('hit_speed', sa.String(), nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('cards', 'hit_speed')
