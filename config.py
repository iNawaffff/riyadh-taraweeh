import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "your_local_secret_key")

    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", "postgresql:///taraweeh_db"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # --- Connection Pool (tune for Heroku Postgres plan) ---
    # Mini/Basic plan: 20 max connections
    # With 4 gunicorn workers: 4 × (pool_size + max_overflow) must be ≤ 18
    # (reserve 2 connections for migrations/admin)
    # 4 × (3 + 1) = 16 ≤ 18 ✓
    SQLALCHEMY_POOL_SIZE = int(os.environ.get("SQLALCHEMY_POOL_SIZE", 3))
    SQLALCHEMY_MAX_OVERFLOW = int(os.environ.get("SQLALCHEMY_MAX_OVERFLOW", 1))
    SQLALCHEMY_POOL_TIMEOUT = 20  # seconds to wait for a connection
    SQLALCHEMY_POOL_RECYCLE = 300  # recycle connections every 5 min (Heroku closes idle connections)
    SQLALCHEMY_POOL_PRE_PING = True  # test connections before use (prevents stale connection errors)
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_size": int(os.environ.get("SQLALCHEMY_POOL_SIZE", 3)),
        "max_overflow": int(os.environ.get("SQLALCHEMY_MAX_OVERFLOW", 1)),
        "pool_timeout": 20,
        "pool_recycle": 300,
        "pool_pre_ping": True,
    }

    SESSION_COOKIE_SECURE = os.environ.get("FLASK_ENV") != "development"
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = "Lax"

    COMPRESS_MIN_SIZE = 500

    WTF_CSRF_CHECK_DEFAULT = False

    MAIL_SERVER = os.environ.get("MAIL_SERVER", "smtp.gmail.com")
    MAIL_PORT = int(os.environ.get("MAIL_PORT", 587))
    MAIL_USE_TLS = True
    MAIL_USERNAME = os.environ.get("MAIL_USERNAME", "your-email@gmail.com")
    MAIL_PASSWORD = os.environ.get("MAIL_PASSWORD", "your-app-password")
    MAIL_DEFAULT_SENDER = os.environ.get("MAIL_DEFAULT_SENDER", "info@taraweeh.org")

    @staticmethod
    def init_app(app):
        """Fix Heroku postgres:// -> postgresql:// URL."""
        uri = app.config.get("SQLALCHEMY_DATABASE_URI", "")
        if uri and uri.startswith("postgres://"):
            app.config["SQLALCHEMY_DATABASE_URI"] = uri.replace(
                "postgres://", "postgresql://", 1
            )
            print("database url converted from postgres:// to postgresql://")
