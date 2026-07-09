"""add_login_and_otp_rate_limiting

Revision ID: f3a1c9d2e7b4
Revises: 184695679bd6
Create Date: 2026-08-27 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'f3a1c9d2e7b4'
down_revision: Union[str, None] = '184695679bd6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column('users', sa.Column('failed_login_attempts', sa.Integer(), nullable=False, server_default='0'))
    op.add_column('users', sa.Column('locked_until', sa.DateTime(timezone=True), nullable=True))
    op.add_column('otp_verifications', sa.Column('attempts', sa.Integer(), nullable=False, server_default='0'))


def downgrade() -> None:
    op.drop_column('otp_verifications', 'attempts')
    op.drop_column('users', 'locked_until')
    op.drop_column('users', 'failed_login_attempts')
