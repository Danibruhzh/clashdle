"""add user_stats table

Revision ID: 576be3bac815
Revises: d83a8c931e3c
Create Date: 2026-09-06 15:49:59.149321

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '576be3bac815'
down_revision: Union[str, Sequence[str], None] = 'd83a8c931e3c'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('user_stats',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('games_played', sa.Integer(), nullable=False),
    sa.Column('wins', sa.Integer(), nullable=False),
    sa.Column('current_streak', sa.Integer(), nullable=False),
    sa.Column('best_streak', sa.Integer(), nullable=False),
    sa.Column('last_win_date', sa.Date(), nullable=True),
    sa.Column('guesses_1', sa.Integer(), nullable=False),
    sa.Column('guesses_2', sa.Integer(), nullable=False),
    sa.Column('guesses_3', sa.Integer(), nullable=False),
    sa.Column('guesses_4', sa.Integer(), nullable=False),
    sa.Column('guesses_5', sa.Integer(), nullable=False),
    sa.Column('guesses_6', sa.Integer(), nullable=False),
    sa.Column('guesses_7', sa.Integer(), nullable=False),
    sa.Column('guesses_8', sa.Integer(), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_user_stats_id'), 'user_stats', ['id'], unique=False)
    op.create_index(op.f('ix_user_stats_user_id'), 'user_stats', ['user_id'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_user_stats_user_id'), table_name='user_stats')
    op.drop_index(op.f('ix_user_stats_id'), table_name='user_stats')
    op.drop_table('user_stats')
