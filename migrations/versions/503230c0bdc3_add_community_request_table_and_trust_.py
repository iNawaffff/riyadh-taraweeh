"""add community_request table and trust_level

Revision ID: 503230c0bdc3
Revises: a3b7c9d1e2f4
Create Date: 2026-02-07 12:12:56.551192

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import inspect as sa_inspect


# revision identifiers, used by Alembic.
revision = '503230c0bdc3'
down_revision = 'a3b7c9d1e2f4'
branch_labels = None
depends_on = None


def _table_exists(name):
    bind = op.get_bind()
    inspector = sa_inspect(bind)
    return name in inspector.get_table_names()


def _column_exists(table, column):
    bind = op.get_bind()
    inspector = sa_inspect(bind)
    columns = [c['name'] for c in inspector.get_columns(table)]
    return column in columns


def upgrade():
    # Add trust_level to public_user (idempotent)
    if not _column_exists('public_user', 'trust_level'):
        with op.batch_alter_table('public_user', schema=None) as batch_op:
            batch_op.add_column(sa.Column('trust_level', sa.String(length=20), server_default='default', nullable=False))

    # Create community_request table (idempotent — db.create_all() may run before migration)
    if not _table_exists('community_request'):
        op.create_table('community_request',
            sa.Column('id', sa.Integer(), nullable=False),
            sa.Column('submitter_id', sa.Integer(), nullable=False),
            sa.Column('request_type', sa.String(length=20), nullable=False),
            sa.Column('mosque_name', sa.String(length=100), nullable=True),
            sa.Column('mosque_location', sa.String(length=200), nullable=True),
            sa.Column('mosque_area', sa.String(length=50), nullable=True),
            sa.Column('mosque_map_link', sa.String(length=500), nullable=True),
            sa.Column('imam_name', sa.String(length=100), nullable=True),
            sa.Column('imam_audio_url', sa.String(length=500), nullable=True),
            sa.Column('imam_youtube_link', sa.String(length=500), nullable=True),
            sa.Column('imam_source', sa.String(length=20), nullable=True),
            sa.Column('existing_imam_id', sa.Integer(), nullable=True),
            sa.Column('target_mosque_id', sa.Integer(), nullable=True),
            sa.Column('notes', sa.Text(), nullable=True),
            sa.Column('status', sa.String(length=20), server_default='pending', nullable=False),
            sa.Column('reject_reason', sa.String(length=500), nullable=True),
            sa.Column('admin_notes', sa.String(length=500), nullable=True),
            sa.Column('created_at', sa.DateTime(), nullable=True),
            sa.Column('reviewed_at', sa.DateTime(), nullable=True),
            sa.Column('reviewed_by', sa.Integer(), nullable=True),
            sa.Column('duplicate_of', sa.Integer(), nullable=True),
            sa.ForeignKeyConstraint(['submitter_id'], ['public_user.id']),
            sa.ForeignKeyConstraint(['existing_imam_id'], ['imam.id']),
            sa.ForeignKeyConstraint(['target_mosque_id'], ['mosque.id']),
            sa.ForeignKeyConstraint(['reviewed_by'], ['public_user.id']),
            sa.ForeignKeyConstraint(['duplicate_of'], ['community_request.id']),
            sa.PrimaryKeyConstraint('id'),
        )
        op.create_index('ix_community_request_status', 'community_request', ['status'])
        op.create_index('ix_community_request_type_status', 'community_request', ['request_type', 'status'])
        op.create_index('ix_community_request_submitter', 'community_request', ['submitter_id'])


def downgrade():
    op.drop_index('ix_community_request_submitter', table_name='community_request')
    op.drop_index('ix_community_request_type_status', table_name='community_request')
    op.drop_index('ix_community_request_status', table_name='community_request')
    op.drop_table('community_request')

    with op.batch_alter_table('public_user', schema=None) as batch_op:
        batch_op.drop_column('trust_level')
