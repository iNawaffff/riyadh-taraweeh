"""add role column to public_user

Revision ID: a3b7c9d1e2f4
Revises: e1f96e25b0fb
Create Date: 2026-02-06 12:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = 'a3b7c9d1e2f4'
down_revision = 'e1f96e25b0fb'
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table('public_user', schema=None) as batch_op:
        batch_op.add_column(sa.Column('role', sa.String(20), nullable=False, server_default='user'))


def downgrade():
    with op.batch_alter_table('public_user', schema=None) as batch_op:
        batch_op.drop_column('role')
