import os

# Override DATABASE_URL before importing the app so module-level init uses SQLite
os.environ["DATABASE_URL"] = "sqlite://"

import pytest

from app import app as flask_app
from models import db, Mosque, Imam, PublicUser


@pytest.fixture()
def app():
    flask_app.config.update({
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite://",
        "WTF_CSRF_ENABLED": False,
    })

    with flask_app.app_context():
        db.drop_all()
        db.create_all()
        _seed_data()
        yield flask_app
        db.session.remove()
        db.drop_all()


@pytest.fixture()
def client(app):
    return app.test_client()


def _seed_data():
    mosque = Mosque(id=1, name="جامع الراجحي", location="الملقا", area="شمال")
    imam = Imam(id=1, name="الشيخ خالد الجليل", mosque_id=1)
    user_a = PublicUser(
        id=1,
        firebase_uid="uid_a",
        username="tester_a",
        display_name="Tester A",
        contribution_points=5,
    )
    user_b = PublicUser(
        id=2,
        firebase_uid="uid_b",
        username="tester_b",
        display_name="Tester B",
        contribution_points=3,
    )
    user_zero = PublicUser(
        id=3,
        firebase_uid="uid_zero",
        username="tester_zero",
        display_name="Zero Points",
        contribution_points=0,
    )
    db.session.add_all([mosque, imam, user_a, user_b, user_zero])
    db.session.commit()
