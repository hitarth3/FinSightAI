"""add_income_categories_enum

Revision ID: 7bbc76150cd7
Revises: 29efb8968df5
Create Date: 2026-06-03 19:17:30.252293

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '7bbc76150cd7'
down_revision: Union[str, None] = '29efb8968df5'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == 'postgresql':
        for val in ['SALARY', 'BONUS', 'INTEREST', 'FREELANCE', 'REFUND', 'BANK_TRANSFER', 'INVESTMENT_RETURN']:
            # Check if enum value exists
            res = bind.execute(sa.text(f"SELECT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'expense_category' AND e.enumlabel = '{val}')"))
            exists = res.scalar()
            if not exists:
                op.execute("COMMIT")
                op.execute(f"ALTER TYPE expense_category ADD VALUE '{val}'")


def downgrade() -> None:
    pass

