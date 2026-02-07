from datetime import datetime

from flask_login import UserMixin
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import check_password_hash, generate_password_hash

db = SQLAlchemy()


class User(UserMixin, db.Model):
    """Legacy admin user for Flask-Login / Flask-Admin."""
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True)
    password_hash = db.Column(db.String(255))

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


class Mosque(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    location = db.Column(db.String(200), nullable=False)
    area = db.Column(db.String(50), nullable=False)
    map_link = db.Column(db.String(500))
    latitude = db.Column(db.Float, nullable=True)
    longitude = db.Column(db.Float, nullable=True)

    def __repr__(self):
        return self.name


class PublicUser(db.Model):
    __tablename__ = 'public_user'
    id = db.Column(db.Integer, primary_key=True)
    firebase_uid = db.Column(db.String(128), unique=True, nullable=False, index=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    display_name = db.Column(db.String(100))
    avatar_url = db.Column(db.String(500))
    email = db.Column(db.String(255))
    phone = db.Column(db.String(20))
    role = db.Column(db.String(20), nullable=False, server_default='user')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    contribution_points = db.Column(db.Integer, default=0, nullable=False)
    trust_level = db.Column(db.String(20), nullable=False, server_default='default')  # default/trusted/not_trusted

    favorites = db.relationship('UserFavorite', backref='user', lazy=True, cascade='all, delete-orphan')

    def __repr__(self):
        return self.username


class UserFavorite(db.Model):
    __tablename__ = 'user_favorite'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('public_user.id'), nullable=False)
    mosque_id = db.Column(db.Integer, db.ForeignKey('mosque.id'), nullable=False)
    added_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (db.UniqueConstraint('user_id', 'mosque_id'),)

    mosque = db.relationship('Mosque', lazy=True)


class TaraweehAttendance(db.Model):
    __tablename__ = 'taraweeh_attendance'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('public_user.id'), nullable=False)
    night = db.Column(db.Integer, nullable=False)  # 1-30
    mosque_id = db.Column(db.Integer, db.ForeignKey('mosque.id'), nullable=True)
    rakaat = db.Column(db.Integer, nullable=True)
    attended_at = db.Column(db.DateTime, default=datetime.utcnow)

    __table_args__ = (db.UniqueConstraint('user_id', 'night'),)

    user = db.relationship('PublicUser', backref=db.backref('attendance', lazy=True, cascade='all, delete-orphan'))
    mosque = db.relationship('Mosque', lazy=True)


class ImamTransferRequest(db.Model):
    __tablename__ = 'imam_transfer_request'
    id = db.Column(db.Integer, primary_key=True)
    submitter_id = db.Column(db.Integer, db.ForeignKey('public_user.id'), nullable=False)
    mosque_id = db.Column(db.Integer, db.ForeignKey('mosque.id'), nullable=False)
    current_imam_id = db.Column(db.Integer, db.ForeignKey('imam.id', use_alter=True), nullable=True)
    new_imam_id = db.Column(db.Integer, db.ForeignKey('imam.id', use_alter=True), nullable=True)
    new_imam_name = db.Column(db.String(100), nullable=True)
    notes = db.Column(db.String(500), nullable=True)
    status = db.Column(db.String(20), default='pending')
    reject_reason = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=True)

    __table_args__ = (
        db.Index('ix_transfer_submitter_mosque_status', 'submitter_id', 'mosque_id', 'status'),
    )

    submitter = db.relationship('PublicUser', backref=db.backref('transfer_requests', lazy=True))
    mosque = db.relationship('Mosque', backref=db.backref('transfer_requests', lazy=True))
    current_imam = db.relationship('Imam', foreign_keys=[current_imam_id])
    new_imam = db.relationship('Imam', foreign_keys=[new_imam_id])
    reviewer = db.relationship('User', foreign_keys=[reviewed_by])


class CommunityRequest(db.Model):
    __tablename__ = 'community_request'
    id = db.Column(db.Integer, primary_key=True)
    submitter_id = db.Column(db.Integer, db.ForeignKey('public_user.id'), nullable=False)
    request_type = db.Column(db.String(20), nullable=False)  # new_mosque, new_imam, imam_transfer

    # Mosque fields (for new_mosque)
    mosque_name = db.Column(db.String(100), nullable=True)
    mosque_location = db.Column(db.String(200), nullable=True)
    mosque_area = db.Column(db.String(50), nullable=True)
    mosque_map_link = db.Column(db.String(500), nullable=True)

    # Imam fields (for new_imam or new_mosque with imam)
    imam_name = db.Column(db.String(100), nullable=True)
    imam_audio_url = db.Column(db.String(500), nullable=True)
    imam_youtube_link = db.Column(db.String(500), nullable=True)
    imam_source = db.Column(db.String(20), nullable=True)  # existing / new
    existing_imam_id = db.Column(db.Integer, db.ForeignKey('imam.id', use_alter=True), nullable=True)

    # Transfer fields (for imam_transfer / new_imam)
    target_mosque_id = db.Column(db.Integer, db.ForeignKey('mosque.id'), nullable=True)

    # Common fields
    notes = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(20), nullable=False, server_default='pending')  # pending/approved/rejected/needs_info
    reject_reason = db.Column(db.String(500), nullable=True)
    admin_notes = db.Column(db.String(500), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    reviewed_at = db.Column(db.DateTime, nullable=True)
    reviewed_by = db.Column(db.Integer, db.ForeignKey('public_user.id'), nullable=True)

    # Duplicate detection
    duplicate_of = db.Column(db.Integer, db.ForeignKey('community_request.id'), nullable=True)

    __table_args__ = (
        db.Index('ix_community_request_status', 'status'),
        db.Index('ix_community_request_type_status', 'request_type', 'status'),
        db.Index('ix_community_request_submitter', 'submitter_id'),
    )

    submitter = db.relationship('PublicUser', foreign_keys=[submitter_id], backref=db.backref('community_requests', lazy=True))
    reviewer_user = db.relationship('PublicUser', foreign_keys=[reviewed_by])
    target_mosque = db.relationship('Mosque', foreign_keys=[target_mosque_id])
    existing_imam = db.relationship('Imam', foreign_keys=[existing_imam_id])
    duplicate_request = db.relationship('CommunityRequest', remote_side=[id])


class Imam(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    mosque_id = db.Column(db.Integer, db.ForeignKey('mosque.id'), nullable=True)
    audio_sample = db.Column(db.String(500), nullable=True)
    youtube_link = db.Column(db.String(500), nullable=True)

    # Relationship
    mosque = db.relationship('Mosque', backref=db.backref('imams', lazy=True))

    def __repr__(self):
        return self.name