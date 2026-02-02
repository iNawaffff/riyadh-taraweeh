from datetime import datetime

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

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