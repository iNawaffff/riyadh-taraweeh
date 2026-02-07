"""Riyadh Taraweeh — Flask app factory."""

import os

from flask import Flask, request
from werkzeug.middleware.proxy_fix import ProxyFix

from config import Config
from extensions import compress, csrf, limiter, login_manager, mail, migrate
from models import User, db


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)
    Config.init_app(app)

    # --- proxy fix for Heroku ---
    app.wsgi_app = ProxyFix(app.wsgi_app, x_for=1, x_proto=1, x_host=1)

    # --- init extensions ---
    db.init_app(app)
    migrate.init_app(app, db)
    csrf.init_app(app)
    compress.init_app(app)
    login_manager.init_app(app)
    login_manager.login_view = "legacy.login"
    mail.init_app(app)
    limiter.init_app(app)

    # --- CSRF: only enforce on admin/login form POSTs ---
    @app.before_request
    def csrf_protect_admin():
        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
            path = request.path
            if path.startswith("/admin") or path == "/login":
                csrf.protect()

    # --- Flask-Login user loader ---
    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    # --- Firebase ---
    from auth_utils import init_firebase
    init_firebase()

    # --- register blueprints ---
    from blueprints.api import api_bp
    from blueprints.auth import auth_bp
    from blueprints.requests import requests_bp
    from blueprints.transfers import transfers_bp
    from blueprints.admin import admin_bp
    from blueprints.legacy import legacy_bp, init_legacy_admin
    from blueprints.spa import spa_bp

    app.register_blueprint(api_bp)
    app.register_blueprint(auth_bp)
    app.register_blueprint(requests_bp)
    app.register_blueprint(transfers_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(legacy_bp)
    app.register_blueprint(spa_bp)

    # --- Flask-Admin (legacy) ---
    init_legacy_admin(app)

    # --- HTTP security + cache headers ---
    @app.after_request
    def add_headers(response):
        # Security headers
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "SAMEORIGIN"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(self)"
        if not app.debug:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        # Cache headers
        path = request.path
        if path.startswith("/assets/"):
            response.headers["Cache-Control"] = "public, max-age=31536000, immutable"
        elif path.startswith("/static/images/"):
            response.headers["Cache-Control"] = "public, max-age=2592000"
        elif path.startswith("/static/audio/"):
            response.headers["Cache-Control"] = "public, max-age=604800"
        elif path in ("/sw.js", "/registerSW.js"):
            response.headers["Cache-Control"] = "public, max-age=0, must-revalidate"
        elif path == "/manifest.webmanifest":
            response.headers["Cache-Control"] = "public, max-age=86400"
        return response

    # --- initialize database + admin user ---
    with app.app_context():
        try:
            print("creating database tables...")
            db.create_all()
            print("tables created successfully!")

            ADMIN_USERNAME = os.environ.get("ADMIN_USERNAME", "admin")
            ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "adminpassword")

            print(f"checking for admin user: {ADMIN_USERNAME}")
            admin_user = User.query.filter_by(username=ADMIN_USERNAME).first()

            if not admin_user:
                print(f"admin user {ADMIN_USERNAME} not found. creating new admin user...")
                default_admin = User(username=ADMIN_USERNAME)
                default_admin.set_password(ADMIN_PASSWORD)
                db.session.add(default_admin)
                db.session.commit()
                print(f"admin user {ADMIN_USERNAME} created successfully!")
            else:
                print(f"admin user {ADMIN_USERNAME} already exists.")
        except Exception as e:
            print(f"database initialization error: {e}")

    return app


app = create_app()


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5002))
    app.run(host="0.0.0.0", port=port, debug=False)
