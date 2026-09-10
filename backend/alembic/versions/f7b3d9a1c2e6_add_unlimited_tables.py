"""add unlimited mode tables

Revision ID: f7b3d9a1c2e6
Revises: e2a5c1f8b3d4
Create Date: 2026-09-09 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f7b3d9a1c2e6'
down_revision: Union[str, Sequence[str], None] = 'e2a5c1f8b3d4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('unlimited_answers',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('card_id', sa.Integer(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['card_id'], ['cards.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_unlimited_answers_id'), 'unlimited_answers', ['id'], unique=False)
    op.create_index(op.f('ix_unlimited_answers_user_id'), 'unlimited_answers', ['user_id'], unique=True)

    op.create_table('unlimited_guesses',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('unlimited_answer_id', sa.Integer(), nullable=False),
    sa.Column('guessed_card_id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('is_correct', sa.Boolean(), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['guessed_card_id'], ['cards.id'], ),
    sa.ForeignKeyConstraint(['unlimited_answer_id'], ['unlimited_answers.id'], ),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_unlimited_guesses_id'), 'unlimited_guesses', ['id'], unique=False)
    op.create_index(op.f('ix_unlimited_guesses_unlimited_answer_id'), 'unlimited_guesses', ['unlimited_answer_id'], unique=False)
    op.create_index(op.f('ix_unlimited_guesses_user_id'), 'unlimited_guesses', ['user_id'], unique=False)

    op.create_table('unlimited_stats',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('user_id', sa.Integer(), nullable=False),
    sa.Column('games_played', sa.Integer(), nullable=False),
    sa.Column('wins', sa.Integer(), nullable=False),
    sa.Column('current_streak', sa.Integer(), nullable=False),
    sa.Column('best_streak', sa.Integer(), nullable=False),
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
    op.create_index(op.f('ix_unlimited_stats_id'), 'unlimited_stats', ['id'], unique=False)
    op.create_index(op.f('ix_unlimited_stats_user_id'), 'unlimited_stats', ['user_id'], unique=True)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_unlimited_stats_user_id'), table_name='unlimited_stats')
    op.drop_index(op.f('ix_unlimited_stats_id'), table_name='unlimited_stats')
    op.drop_table('unlimited_stats')

    op.drop_index(op.f('ix_unlimited_guesses_user_id'), table_name='unlimited_guesses')
    op.drop_index(op.f('ix_unlimited_guesses_unlimited_answer_id'), table_name='unlimited_guesses')
    op.drop_index(op.f('ix_unlimited_guesses_id'), table_name='unlimited_guesses')
    op.drop_table('unlimited_guesses')

    op.drop_index(op.f('ix_unlimited_answers_user_id'), table_name='unlimited_answers')
    op.drop_index(op.f('ix_unlimited_answers_id'), table_name='unlimited_answers')
    op.drop_table('unlimited_answers')
