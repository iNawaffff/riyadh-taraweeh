import json

from models import db, PublicUser


def test_atomic_contribution_points_increment(app):
    """Contribution points use atomic SQL column expression, not Python read-then-write."""
    with app.app_context():
        user = PublicUser.query.get(1)
        original = user.contribution_points
        user.contribution_points = PublicUser.contribution_points + 1
        db.session.commit()

        db.session.refresh(user)
        assert user.contribution_points == original + 1


def test_leaderboard_returns_ordered_results(client):
    """Leaderboard endpoint returns users ordered by points descending."""
    resp = client.get("/api/leaderboard")
    assert resp.status_code == 200
    data = json.loads(resp.data)
    assert len(data) >= 2
    assert data[0]["points"] >= data[1]["points"]
    assert data[0]["username"] == "tester_a"
    assert data[1]["username"] == "tester_b"


def test_leaderboard_excludes_zero_point_users(client):
    """Users with 0 contribution points are not shown on the leaderboard."""
    resp = client.get("/api/leaderboard")
    data = json.loads(resp.data)
    usernames = [entry["username"] for entry in data]
    assert "tester_zero" not in usernames
