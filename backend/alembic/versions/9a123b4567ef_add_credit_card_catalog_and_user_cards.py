"""add_credit_card_catalog_and_user_cards

Revision ID: 9a123b4567ef
Revises: 8cdd8605bde7
Create Date: 2026-06-07 16:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9a123b4567ef'
down_revision: Union[str, None] = '8cdd8605bde7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop old credit_cards table
    op.drop_table('credit_cards')

    # Create credit_card_catalog table
    op.create_table('credit_card_catalog',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('bank_name', sa.String(length=100), nullable=False),
    sa.Column('card_name', sa.String(length=100), nullable=False),
    sa.Column('card_type', sa.String(length=50), nullable=True),
    sa.Column('joining_fee', sa.Numeric(precision=10, scale=2), nullable=True),
    sa.Column('annual_fee', sa.Numeric(precision=10, scale=2), nullable=True),
    sa.Column('reward_type', sa.String(length=50), nullable=True),
    sa.Column('reward_rules_json', sa.JSON(), nullable=True),
    sa.Column('lounge_access', sa.String(length=255), nullable=True),
    sa.Column('fuel_benefits', sa.String(length=255), nullable=True),
    sa.Column('reward_conversion', sa.String(length=255), nullable=True),
    sa.Column('official_url', sa.String(length=500), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.PrimaryKeyConstraint('id')
    )

    # Create user_credit_cards table
    op.create_table('user_credit_cards',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('catalog_id', sa.Uuid(), nullable=False),
    sa.Column('credit_limit', sa.Numeric(precision=15, scale=2), nullable=False),
    sa.Column('outstanding', sa.Numeric(precision=15, scale=2), nullable=False),
    sa.Column('billing_date', sa.Integer(), nullable=False),
    sa.Column('due_date', sa.Date(), nullable=False),
    sa.Column('nickname', sa.String(length=100), nullable=True),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['catalog_id'], ['credit_card_catalog.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    op.drop_table('user_credit_cards')
    op.drop_table('credit_card_catalog')

    # Recreate old credit_cards table
    op.create_table('credit_cards',
    sa.Column('id', sa.Uuid(), nullable=False),
    sa.Column('user_id', sa.Uuid(), nullable=False),
    sa.Column('card_name', sa.String(length=100), nullable=False),
    sa.Column('credit_limit', sa.Numeric(precision=15, scale=2), nullable=False),
    sa.Column('outstanding', sa.Numeric(precision=15, scale=2), nullable=False),
    sa.Column('due_date', sa.Date(), nullable=False),
    sa.Column('minimum_due', sa.Numeric(precision=15, scale=2), nullable=False),
    sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
