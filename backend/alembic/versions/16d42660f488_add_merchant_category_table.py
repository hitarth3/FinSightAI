"""add merchant_category table

Revision ID: 16d42660f488
Revises: 9a123b4567ef
Create Date: 2026-06-07 16:38:39.674945

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = '16d42660f488'
down_revision: Union[str, None] = '9a123b4567ef'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'merchant_category',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('merchant_name', sa.String(length=100), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_merchant_category_merchant_name'), 'merchant_category', ['merchant_name'], unique=True)

    # Bulk insert default merchant categories
    import uuid
    from datetime import datetime
    
    metadata = sa.MetaData()
    merchant_category_table = sa.Table(
        'merchant_category',
        metadata,
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('merchant_name', sa.String(length=100), nullable=False),
        sa.Column('category', sa.String(length=50), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
    )
    
    default_mappings = [
        {"id": uuid.uuid4(), "merchant_name": "DMart", "category": "Groceries", "created_at": datetime.utcnow()},
        {"id": uuid.uuid4(), "merchant_name": "Reliance Fresh", "category": "Groceries", "created_at": datetime.utcnow()},
        {"id": uuid.uuid4(), "merchant_name": "Amazon", "category": "Online Shopping", "created_at": datetime.utcnow()},
        {"id": uuid.uuid4(), "merchant_name": "Flipkart", "category": "Online Shopping", "created_at": datetime.utcnow()},
        {"id": uuid.uuid4(), "merchant_name": "Swiggy", "category": "Dining", "created_at": datetime.utcnow()},
        {"id": uuid.uuid4(), "merchant_name": "Zomato", "category": "Dining", "created_at": datetime.utcnow()},
        {"id": uuid.uuid4(), "merchant_name": "Uber", "category": "Travel", "created_at": datetime.utcnow()},
        {"id": uuid.uuid4(), "merchant_name": "MakeMyTrip", "category": "Travel", "created_at": datetime.utcnow()},
        {"id": uuid.uuid4(), "merchant_name": "IRCTC", "category": "Travel", "created_at": datetime.utcnow()},
    ]
    
    op.bulk_insert(merchant_category_table, default_mappings)


def downgrade() -> None:
    op.drop_index(op.f('ix_merchant_category_merchant_name'), table_name='merchant_category')
    op.drop_table('merchant_category')

