import os

from flask_compress import Compress
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_login import LoginManager
from flask_mail import Mail
from flask_migrate import Migrate
from flask_wtf.csrf import CSRFProtect

from models import db

migrate = Migrate()
csrf = CSRFProtect()
compress = Compress()
login_manager = LoginManager()
mail = Mail()
limiter = Limiter(
    get_remote_address,
    default_limits=["200 per minute"],
    storage_uri=os.environ.get("REDIS_URL", "memory://"),
)
