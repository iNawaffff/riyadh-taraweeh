"""
Locust load test for Riyadh Taraweeh API.

Usage:
    # Install: pip install locust
    # Run headless (500 users, ramp up 50/sec, 2 minutes):
    locust -f tests/locustfile.py --headless -u 500 -r 50 -t 2m --host http://localhost:5002
    # Run with web UI:
    locust -f tests/locustfile.py --host http://localhost:5002

Simulates realistic user behavior:
- 60% browse mosques (unauthenticated, cached)
- 20% search (unauthenticated, DB query)
- 10% proximity sort (unauthenticated, CPU-intensive)
- 10% authenticated actions (tracker, favorites)
"""

import random

from locust import HttpUser, between, task


# Pre-defined search queries matching real usage patterns
SEARCH_QUERIES = [
    "الراجحي",
    "الجليل",
    "خالد",
    "السديس",
    "المعيقلي",
    "عبدالرحمن",
    "الملقا",
    "حطين",
    "النخيل",
    "قرطبة",
]

AREAS = ["شمال", "شرق", "غرب", "جنوب"]


class BrowsingUser(HttpUser):
    """Simulates an unauthenticated user browsing the directory."""

    wait_time = between(1, 5)
    weight = 6  # 60% of users

    @task(5)
    def list_mosques(self):
        """GET /api/mosques — main page load, should be cached."""
        self.client.get("/api/mosques", name="/api/mosques")

    @task(3)
    def get_areas(self):
        """GET /api/areas — dropdown population."""
        self.client.get("/api/areas", name="/api/areas")

    @task(3)
    def get_locations(self):
        """GET /api/locations — district dropdown, optionally filtered."""
        area = random.choice(AREAS + [""])
        params = {"area": area} if area else {}
        self.client.get("/api/locations", params=params, name="/api/locations")

    @task(2)
    def view_mosque_detail(self):
        """GET /api/mosques/<id> — individual mosque page."""
        mosque_id = random.randint(1, 119)
        self.client.get(f"/api/mosques/{mosque_id}", name="/api/mosques/[id]")

    @task(1)
    def view_leaderboard(self):
        """GET /api/leaderboard — leaderboard page."""
        self.client.get("/api/leaderboard", name="/api/leaderboard")


class SearchUser(HttpUser):
    """Simulates users actively searching."""

    wait_time = between(2, 8)
    weight = 2  # 20% of users

    @task(4)
    def search_by_name(self):
        """GET /api/mosques/search?q=... — text search."""
        query = random.choice(SEARCH_QUERIES)
        self.client.get(
            "/api/mosques/search",
            params={"q": query},
            name="/api/mosques/search",
        )

    @task(3)
    def search_by_area(self):
        """GET /api/mosques/search?area=... — area filter."""
        area = random.choice(AREAS)
        self.client.get(
            "/api/mosques/search",
            params={"area": area},
            name="/api/mosques/search [area]",
        )

    @task(2)
    def search_combined(self):
        """GET /api/mosques/search?q=...&area=... — combined search."""
        query = random.choice(SEARCH_QUERIES)
        area = random.choice(AREAS)
        self.client.get(
            "/api/mosques/search",
            params={"q": query, "area": area},
            name="/api/mosques/search [combined]",
        )


class ProximityUser(HttpUser):
    """Simulates users using proximity sort (geolocation)."""

    wait_time = between(3, 10)
    weight = 1  # 10% of users

    # Riyadh coordinates with slight variations
    RIYADH_CENTER = (24.7136, 46.6753)

    @task
    def nearby_mosques(self):
        """GET /api/mosques/nearby — geolocation sort (CPU-intensive)."""
        lat = self.RIYADH_CENTER[0] + random.uniform(-0.1, 0.1)
        lng = self.RIYADH_CENTER[1] + random.uniform(-0.1, 0.1)
        self.client.get(
            "/api/mosques/nearby",
            params={"lat": lat, "lng": lng},
            name="/api/mosques/nearby",
        )


class AuthenticatedUser(HttpUser):
    """Simulates authenticated users (tracker, favorites, profile).

    NOTE: These requests will return 401 without a valid Firebase token.
    This is intentional — we're testing the server's ability to handle
    and reject auth requests quickly, which is the realistic load pattern.
    In production, the Firebase token verification (network I/O to Google)
    adds ~100-300ms per request.
    """

    wait_time = between(2, 10)
    weight = 1  # 10% of users

    @task(3)
    def check_auth(self):
        """GET /api/auth/me — auth check on page load."""
        self.client.get(
            "/api/auth/me",
            headers={"Authorization": "Bearer fake-token-for-load-test"},
            name="/api/auth/me [unauthed]",
        )

    @task(2)
    def get_tracker(self):
        """GET /api/user/tracker — tracker page."""
        self.client.get(
            "/api/user/tracker",
            headers={"Authorization": "Bearer fake-token-for-load-test"},
            name="/api/user/tracker [unauthed]",
        )

    @task(2)
    def get_favorites(self):
        """GET /api/user/favorites — favorites sync."""
        self.client.get(
            "/api/user/favorites",
            headers={"Authorization": "Bearer fake-token-for-load-test"},
            name="/api/user/favorites [unauthed]",
        )

    @task(1)
    def view_public_profile(self):
        """GET /api/u/<username> — public profile page (no auth needed)."""
        self.client.get("/api/u/testuser", name="/api/u/[username]")

    @task(1)
    def view_public_tracker(self):
        """GET /api/u/<username>/tracker — public tracker."""
        self.client.get("/api/u/testuser/tracker", name="/api/u/[username]/tracker")


class SPAUser(HttpUser):
    """Simulates initial page loads (SPA HTML serving)."""

    wait_time = between(5, 15)
    weight = 1  # Bonus: test SPA serving

    @task(3)
    def home_page(self):
        """GET / — React SPA index.html."""
        self.client.get("/", name="/ [SPA]")

    @task(2)
    def mosque_page(self):
        """GET /mosque/<id> — SPA with SEO meta injection."""
        mosque_id = random.randint(1, 119)
        self.client.get(f"/mosque/{mosque_id}", name="/mosque/[id] [SPA]")

    @task(1)
    def about_page(self):
        """GET /about — static SPA page."""
        self.client.get("/about", name="/about [SPA]")
