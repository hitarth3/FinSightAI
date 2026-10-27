"""Persist report news sources and confidence methodology.

Revision ID: b7e204c9d613
Revises: f3a1c9d2e7b4
"""
from alembic import op
import sqlalchemy as sa

revision = 'b7e204c9d613'
down_revision = 'f3a1c9d2e7b4'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('stock_analysis', sa.Column('evidence', sa.JSON(), nullable=False, server_default='{}'))


def downgrade():
    op.drop_column('stock_analysis', 'evidence')
