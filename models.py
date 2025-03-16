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