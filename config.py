import os

from dotenv import load_dotenv

load_dotenv()


class Config:
    SECRET_KEY = os.environ.get("SECRET_KEY", "your_local_secret_key")

    SQLALCHEMY_DATABASE_URI = os.environ.get(
        "DATABASE_URL", "postgresql:///taraweeh_db"
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False

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
            print(f"database url converted to: {app.config['SQLALCHEMY_DATABASE_URI']}")
