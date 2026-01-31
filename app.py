# --- imports ---
import datetime
import json
import os
import re
import time
from functools import lru_cache, wraps

import firebase_admin
from firebase_admin import auth as firebase_auth, credentials as firebase_credentials
from dotenv import load_dotenv
from flask import (
    Flask,
    g,
    jsonify,
    make_response,
    redirect,
    render_template,
    request,
    send_from_directory,
    url_for,
)
from flask_admin import Admin, AdminIndexView, expose
from flask_admin.contrib.sqla import ModelView
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
from flask_login import (
    LoginManager,
    UserMixin,
    current_user,
    login_required,
    login_user,
    logout_user,
)
from flask_mail import Mail, Message
from flask_migrate import Migrate
from geopy.distance import geodesic
from werkzeug.security import check_password_hash, generate_password_hash
from wtforms_sqlalchemy.fields import QuerySelectField

from models import Imam, Mosque, PublicUser, TaraweehAttendance, UserFavorite, db
from utils import normalize_arabic

load_dotenv()

app = Flask(__name__)

# database configuration
app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
    "DATABASE_URL", "postgresql:///taraweeh_db"
)
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

# convert heroku postgres url if needed
if app.config["SQLALCHEMY_DATABASE_URI"] and app.config[
    "SQLALCHEMY_DATABASE_URI"
].startswith("postgres://"):
    app.config["SQLALCHEMY_DATABASE_URI"] = app.config[
        "SQLALCHEMY_DATABASE_URI"
    ].replace("postgres://", "postgresql://")
    print(f"database url converted to: {app.config['SQLALCHEMY_DATABASE_URI']}")

app.config["SECRET_KEY"] = os.environ.get("SECRET_KEY", "your_local_secret_key")

# --- database setup ---
db.init_app(app)
migrate = Migrate(app, db)

# --- user authentication ---
login_manager = LoginManager(app)
login_manager.login_view = "login"

# --- mail configuration settings ---
app.config["MAIL_SERVER"] = os.environ.get("MAIL_SERVER", "smtp.gmail.com")
app.config["MAIL_PORT"] = int(os.environ.get("MAIL_PORT", 587))
app.config["MAIL_USE_TLS"] = True
app.config["MAIL_USERNAME"] = os.environ.get("MAIL_USERNAME", "your-email@gmail.com")
app.config["MAIL_PASSWORD"] = os.environ.get("MAIL_PASSWORD", "your-app-password")
app.config["MAIL_DEFAULT_SENDER"] = os.environ.get(
    "MAIL_DEFAULT_SENDER", "info@taraweeh.org"
)
mail = Mail(app)

# --- rate limiter ---
limiter = Limiter(get_remote_address, app=app, default_limits=[])

# --- firebase admin setup ---
firebase_app = None
firebase_service_account = os.environ.get("FIREBASE_SERVICE_ACCOUNT")
if firebase_service_account:
    try:
        if firebase_service_account.startswith("{"):
            cred = firebase_credentials.Certificate(json.loads(firebase_service_account))
        else:
            cred = firebase_credentials.Certificate(firebase_service_account)
        firebase_app = firebase_admin.initialize_app(cred)
        print("Firebase Admin SDK initialized successfully")
    except Exception as e:
        print(f"Firebase init error: {e}")
else:
    print("FIREBASE_SERVICE_ACCOUNT not set — public auth disabled")


# --- firebase auth decorator ---
def firebase_auth_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not firebase_app:
            return jsonify({"error": "Auth not configured"}), 503
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid token"}), 401
        token = auth_header[7:]
        try:
            decoded = firebase_auth.verify_id_token(token)
        except Exception:
            return jsonify({"error": "Invalid or expired token"}), 401
        user = PublicUser.query.filter_by(firebase_uid=decoded["uid"]).first()
        g.firebase_decoded = decoded
        g.current_public_user = user  # may be None if not registered yet
        return f(*args, **kwargs)
    return decorated


def firebase_auth_optional(f):
    """Like firebase_auth_required but doesn't fail if no token provided."""
    @wraps(f)
    def decorated(*args, **kwargs):
        g.firebase_decoded = None
        g.current_public_user = None
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer ") and firebase_app:
            try:
                decoded = firebase_auth.verify_id_token(auth_header[7:])
                g.firebase_decoded = decoded
                g.current_public_user = PublicUser.query.filter_by(firebase_uid=decoded["uid"]).first()
            except Exception:
                pass
        return f(*args, **kwargs)
    return decorated


# username validation
RESERVED_USERNAMES = {"admin", "api", "static", "login", "logout", "about", "contact", "mosque", "assets", "u", "s"}
USERNAME_PATTERN = re.compile(r'^[\w\u0600-\u06FF]{3,30}$')


def validate_username(username):
    if not username or not USERNAME_PATTERN.match(username):
        return False, "اسم المستخدم يجب أن يكون ٣-٣٠ حرف (أحرف، أرقام، أو عربي)"
    if username.lower() in RESERVED_USERNAMES:
        return False, "اسم المستخدم محجوز"
    return True, None


def serialize_mosque(mosque, imam=None, distance=None):
    if imam is None:
        imam = Imam.query.filter_by(mosque_id=mosque.id).first()
    result = {
        "id": mosque.id,
        "name": mosque.name,
        "location": mosque.location,
        "area": mosque.area,
        "map_link": mosque.map_link,
        "latitude": mosque.latitude,
        "longitude": mosque.longitude,
        "imam": imam.name if imam else None,
        "audio_sample": imam.audio_sample if imam else None,
        "youtube_link": imam.youtube_link if imam else None,
    }
    if distance is not None:
        result["distance"] = distance
    return result


# user model for authentication
class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True)
    password_hash = db.Column(db.String(255))

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))


# initialize database and create admin user if needed
with app.app_context():
    try:
        print("creating database tables...")
        db.create_all()
        print("tables created successfully!")

        # set up admin user
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


# --- admin panel setup ---
class MyAdminIndexView(AdminIndexView):
    @expose("/")
    @login_required
    def index(self):
        return super(MyAdminIndexView, self).index()


class BaseModelView(ModelView):
    def is_accessible(self):
        return current_user.is_authenticated

    def inaccessible_callback(self, name, **kwargs):
        # redirect to the login page if user is not authenticated
        return redirect(url_for("login"))


class MosqueModelView(BaseModelView):
    form_columns = ["name", "location", "area", "map_link", "latitude", "longitude"]
    column_list = ["name", "location", "area", "map_link", "latitude", "longitude"]
    can_view_details = True

    form_args = {
        "name": {"label": "اسم المسجد"},
        "location": {"label": "الموقع"},
        "area": {"label": "المنطقة"},
        "map_link": {"label": "رابط الخريطة"},
        "latitude": {"label": "خط العرض"},
        "longitude": {"label": "خط الطول"},
    }


class ImamModelView(BaseModelView):
    form_columns = ["name", "mosque", "audio_sample", "youtube_link"]
    column_list = ["name", "mosque", "audio_sample", "youtube_link"]
    can_view_details = True

    form_overrides = {"mosque": QuerySelectField}

    form_args = {
        "name": {"label": "اسم الإمام"},
        "mosque": {
            "label": "المسجد",
            "query_factory": lambda: Mosque.query.all(),
            "get_label": "name",
        },
        "audio_sample": {
            "label": "رابط الملف الصوتي",
            "description": "أدخل رابط الملف الصوتي من S3 هنا",
        },
        "youtube_link": {"label": "رابط يوتيوب"},
    }


# initialize admin
admin = Admin(
    app,
    name="إدارة أئمة التراويح",
    template_mode="bootstrap3",
    index_view=MyAdminIndexView(),
)
admin.add_view(MosqueModelView(Mosque, db.session, name="المساجد"))
admin.add_view(ImamModelView(Imam, db.session, name="الأئمة"))


# --- authentication routes ---
@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]

        print(f"login attempt for user: {username}")

        user = User.query.filter_by(username=username).first()
        if user and user.check_password(password):
            login_user(user)
            print(f"login successful for user: {username}")
            return redirect(url_for("admin.index"))  # redirect to admin index page
        else:
            print(f"login failed for user: {username}")

    return render_template("login.html")


@app.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("index"))  # redirect to main index page


# --- React SPA serving ---
# Check if we're using the React frontend
REACT_BUILD_DIR = os.path.join(os.path.dirname(__file__), "frontend", "dist")
USE_REACT_FRONTEND = os.path.exists(REACT_BUILD_DIR)


def _get_react_html():
    """Read and cache the built React index.html content."""
    index_path = os.path.join(REACT_BUILD_DIR, "index.html")
    if not hasattr(_get_react_html, "_cache"):
        with open(index_path, "r", encoding="utf-8") as f:
            _get_react_html._cache = f.read()
    return _get_react_html._cache


def inject_meta_tags(html, meta):
    """Replace meta tags in the built React HTML with route-specific values."""
    if meta.get("title"):
        html = re.sub(
            r"<title>[^<]*</title>",
            f"<title>{meta['title']}</title>",
            html,
        )
        html = re.sub(
            r'<meta property="og:title" content="[^"]*"',
            f'<meta property="og:title" content="{meta["title"]}"',
            html,
        )
    if meta.get("description"):
        html = re.sub(
            r'<meta name="description" content="[^"]*"',
            f'<meta name="description" content="{meta["description"]}"',
            html,
        )
        html = re.sub(
            r'<meta property="og:description" content="[^"]*"',
            f'<meta property="og:description" content="{meta["description"]}"',
            html,
        )
    if meta.get("url"):
        html = re.sub(
            r'<meta property="og:url" content="[^"]*"',
            f'<meta property="og:url" content="{meta["url"]}"',
            html,
        )
    return html


def serve_react_app(meta_tags=None):
    """Serve the React SPA index.html for client-side routing."""
    if USE_REACT_FRONTEND:
        if meta_tags:
            html = inject_meta_tags(_get_react_html(), meta_tags)
            return make_response(html)
        return send_from_directory(REACT_BUILD_DIR, "index.html")
    # Fallback to Jinja templates if React build doesn't exist
    areas = db.session.query(Mosque.area).distinct().all()
    areas = [area[0] for area in areas]
    return render_template("index.html", areas=areas)


# --- main routes ---
@app.route("/")
def index():
    return serve_react_app()


@app.route("/about")
def about():
    if USE_REACT_FRONTEND:
        return serve_react_app(meta_tags={
            "title": "عن الموقع - أئمة التراويح",
            "description": "تعرف على موقع أئمة التراويح في الرياض - دليلك لاختيار المسجد المناسب في رمضان",
            "url": "https://taraweeh.org/about",
        })
    return render_template("about.html")


@app.route("/contact")
def contact():
    if USE_REACT_FRONTEND:
        return serve_react_app(meta_tags={
            "title": "تواصل معنا - أئمة التراويح",
            "description": "تواصل مع فريق موقع أئمة التراويح في الرياض",
            "url": "https://taraweeh.org/contact",
        })
    return render_template("contact.html")


# --- api routes ---
@app.route("/api/mosques")
def get_mosques():
    try:
        # get all mosques ordered by name
        mosques = Mosque.query.order_by(Mosque.name).all()
        result = []

        for mosque in mosques:
            # get the imam for this mosque
            imam = Imam.query.filter_by(mosque_id=mosque.id).first()

            result.append(
                {
                    "id": mosque.id,
                    "name": mosque.name,
                    "location": mosque.location,
                    "area": mosque.area,
                    "map_link": mosque.map_link,
                    "latitude": mosque.latitude,
                    "longitude": mosque.longitude,
                    "imam": imam.name if imam else None,
                    "audio_sample": imam.audio_sample if imam else None,
                    "youtube_link": imam.youtube_link if imam else None,
                }
            )
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500


@app.route("/api/mosques/<int:mosque_id>")
def get_mosque(mosque_id):
    try:
        mosque = Mosque.query.get(mosque_id)
        if not mosque:
            return jsonify({"error": "Mosque not found"}), 404
        return jsonify(serialize_mosque(mosque))
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500


@app.route("/api/mosques/search")
def search_mosques():
    try:
        query = request.args.get("q", "")
        area = request.args.get("area", "")

        # build base query with imam join
        mosque_query = db.session.query(Mosque).outerjoin(Imam)

        # filter by area if provided
        if area and area != "الكل":
            mosque_query = mosque_query.filter(Mosque.area == area)

        mosque_query = mosque_query.order_by(Mosque.name)
        mosques = mosque_query.all()

        # if there's a search query, apply the fuzzy matching in python
        if query:
            normalized_query = normalize_arabic(query)

            # filter mosques with fuzzy matching in python
            filtered_mosques = []
            for mosque in mosques:
                # check if the query matches any of these fields (original or normalized)
                if (
                    query.lower() in mosque.name.lower()
                    or query.lower() in mosque.location.lower()
                    or any(query.lower() in imam.name.lower() for imam in mosque.imams)
                    or normalized_query in normalize_arabic(mosque.name)
                    or normalized_query in normalize_arabic(mosque.location)
                    or any(
                        normalized_query in normalize_arabic(imam.name)
                        for imam in mosque.imams
                    )
                ):
                    filtered_mosques.append(mosque)

            mosques = filtered_mosques

        # format results for api response
        result = []
        for mosque in mosques:
            imam = Imam.query.filter_by(mosque_id=mosque.id).first()
            result.append(
                {
                    "id": mosque.id,
                    "name": mosque.name,
                    "location": mosque.location,
                    "area": mosque.area,
                    "map_link": mosque.map_link,
                    "latitude": mosque.latitude,
                    "longitude": mosque.longitude,
                    "imam": imam.name if imam else None,
                    "audio_sample": imam.audio_sample if imam else None,
                    "youtube_link": imam.youtube_link if imam else None,
                }
            )

        return jsonify(result)
    except Exception as e:
        return jsonify({"error": f"Search error: {str(e)}"}), 500


# --- seo routes ---
@app.route("/sitemap.xml")
def sitemap():
    # generate sitemap with all mosques
    mosques = Mosque.query.all()

    # Get current date for lastmod
    today = datetime.datetime.now().strftime("%Y-%m-%d")

    sitemap_xml = render_template("sitemap.xml", mosques=mosques, current_date=today)
    response = make_response(sitemap_xml)
    response.headers["Content-Type"] = "application/xml"
    return response


@app.route("/mosque/<int:mosque_id>")
def mosque_detail(mosque_id):
    # For React frontend, serve the SPA with injected meta tags
    if USE_REACT_FRONTEND:
        try:
            mosque = Mosque.query.get(mosque_id)
            if mosque:
                imam = Imam.query.filter_by(mosque_id=mosque.id).first()
                imam_name = imam.name if imam else "غير محدد"
                description = f"استمع لتلاوة {imam_name} في {mosque.name} - {mosque.location}"
                return serve_react_app(meta_tags={
                    "title": f"{mosque.name} - أئمة التراويح",
                    "description": description,
                    "url": f"https://taraweeh.org/mosque/{mosque_id}",
                })
        except Exception:
            pass
        return serve_react_app()

    # Fallback to Jinja template
    try:
        mosque = Mosque.query.get_or_404(mosque_id)
        imam = Imam.query.filter_by(mosque_id=mosque.id).first()

        return render_template("mosque_detail.html", mosque=mosque, imam=imam)
    except Exception as e:
        print(f"Error displaying mosque detail: {e}")
        return render_template(
            "error.html", message="حدث خطأ أثناء عرض بيانات المسجد"
        ), 500


# Serve React static assets (JS, CSS, images from React build)
@app.route("/assets/<path:path>")
def serve_react_assets(path):
    if USE_REACT_FRONTEND:
        return send_from_directory(os.path.join(REACT_BUILD_DIR, "assets"), path)
    return "Not Found", 404


@app.route("/robots.txt")
def robots():
    # Add proper line breaks with \n
    robots_content = """User-agent: *
Allow: /
Sitemap: https://taraweeh.org/sitemap.xml
"""
    response = make_response(robots_content)
    response.headers["Content-Type"] = "text/plain"
    return response


@app.route("/api/mosques/nearby")
def nearby_mosques():
    start = time.time()

    try:
        lat = request.args.get("lat", type=float)
        lng = request.args.get("lng", type=float)

        if not lat or not lng:
            return jsonify({"error": "Latitude and longitude are required"}), 400

        mosques = Mosque.query.filter(
            Mosque.latitude.isnot(None), Mosque.longitude.isnot(None)
        ).all()

        user_location = (lat, lng)

        result = []
        for mosque in mosques:
            # calculate distance using geodesic formula
            mosque_location = (mosque.latitude, mosque.longitude)
            distance = geodesic(user_location, mosque_location).kilometers

            # get the imam for this mosque
            imam = Imam.query.filter_by(mosque_id=mosque.id).first()

            result.append(
                {
                    "id": mosque.id,
                    "name": mosque.name,
                    "location": mosque.location,
                    "area": mosque.area,
                    "map_link": mosque.map_link,
                    "latitude": mosque.latitude,
                    "longitude": mosque.longitude,
                    "distance": round(
                        distance, 2
                    ),  # the distance in km, rounded to 2 decimal places
                    "imam": imam.name if imam else None,
                    "audio_sample": imam.audio_sample if imam else None,
                    "youtube_link": imam.youtube_link if imam else None,
                }
            )

        # sort by distance
        result.sort(key=lambda x: x["distance"])

        return jsonify(result)
    except Exception as e:
        return jsonify({"error": f"Error calculating nearby mosques: {str(e)}"}), 500


# --- public user auth routes ---
@app.route("/api/auth/register", methods=["POST"])
@limiter.limit("5 per minute")
@firebase_auth_required
def register_user():
    if g.current_public_user:
        return jsonify({"error": "User already registered"}), 409
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    valid, error_msg = validate_username(username)
    if not valid:
        return jsonify({"error": error_msg}), 400
    if PublicUser.query.filter_by(username=username).first():
        return jsonify({"error": "اسم المستخدم مستخدم بالفعل"}), 409

    decoded = g.firebase_decoded
    user = PublicUser(
        firebase_uid=decoded["uid"],
        username=username,
        display_name=data.get("display_name") or decoded.get("name"),
        avatar_url=decoded.get("picture"),
        email=decoded.get("email"),
        phone=decoded.get("phone_number"),
    )
    db.session.add(user)

    # Import favorites from localStorage if provided
    import_favorites = data.get("import_favorites", [])
    if import_favorites and isinstance(import_favorites, list):
        valid_ids = {m.id for m in Mosque.query.filter(Mosque.id.in_(import_favorites)).all()}
        for mosque_id in import_favorites:
            if mosque_id in valid_ids:
                db.session.add(UserFavorite(user_id=user.id, mosque_id=mosque_id))

    db.session.commit()
    return jsonify({
        "id": user.id,
        "username": user.username,
        "display_name": user.display_name,
        "avatar_url": user.avatar_url,
    }), 201


@app.route("/api/auth/me")
@firebase_auth_required
def auth_me():
    user = g.current_public_user
    if not user:
        return jsonify({"error": "Not registered"}), 404
    fav_ids = [f.mosque_id for f in user.favorites]
    return jsonify({
        "id": user.id,
        "username": user.username,
        "display_name": user.display_name,
        "avatar_url": user.avatar_url,
        "email": user.email,
        "favorites": fav_ids,
    })


# --- user favorites routes ---
@app.route("/api/user/favorites")
@firebase_auth_required
def get_favorites():
    user = g.current_public_user
    if not user:
        return jsonify({"error": "Not registered"}), 401
    return jsonify([f.mosque_id for f in user.favorites])


@app.route("/api/user/favorites", methods=["PUT"])
@firebase_auth_required
def bulk_set_favorites():
    user = g.current_public_user
    if not user:
        return jsonify({"error": "Not registered"}), 401
    data = request.get_json() or {}
    ids = data.get("mosque_ids", [])
    if not isinstance(ids, list):
        return jsonify({"error": "mosque_ids must be a list"}), 400
    valid_ids = {m.id for m in Mosque.query.filter(Mosque.id.in_(ids)).all()}
    UserFavorite.query.filter_by(user_id=user.id).delete()
    for mid in ids:
        if mid in valid_ids:
            db.session.add(UserFavorite(user_id=user.id, mosque_id=mid))
    db.session.commit()
    return jsonify(list(valid_ids))


@app.route("/api/user/favorites/<int:mosque_id>", methods=["POST"])
@firebase_auth_required
def add_favorite(mosque_id):
    user = g.current_public_user
    if not user:
        return jsonify({"error": "Not registered"}), 401
    mosque = Mosque.query.get(mosque_id)
    if not mosque:
        return jsonify({"error": "Mosque not found"}), 404
    existing = UserFavorite.query.filter_by(user_id=user.id, mosque_id=mosque_id).first()
    if not existing:
        db.session.add(UserFavorite(user_id=user.id, mosque_id=mosque_id))
        db.session.commit()
    return jsonify({"success": True})


@app.route("/api/user/favorites/<int:mosque_id>", methods=["DELETE"])
@firebase_auth_required
def remove_favorite(mosque_id):
    user = g.current_public_user
    if not user:
        return jsonify({"error": "Not registered"}), 401
    fav = UserFavorite.query.filter_by(user_id=user.id, mosque_id=mosque_id).first()
    if fav:
        db.session.delete(fav)
        db.session.commit()
    return jsonify({"success": True})


# --- public profile routes ---
@app.route("/api/u/<username>")
def public_profile(username):
    user = PublicUser.query.filter_by(username=username).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
    mosques = []
    for fav in user.favorites:
        mosque = Mosque.query.get(fav.mosque_id)
        if mosque:
            mosques.append(serialize_mosque(mosque))
    return jsonify({
        "username": user.username,
        "display_name": user.display_name,
        "avatar_url": user.avatar_url,
        "mosques": mosques,
    })


@app.route("/favorites")
def favorites_page():
    return serve_react_app(meta_tags={
        "title": "المفضلة - أئمة التراويح",
        "description": "قائمة المساجد المفضلة - أئمة التراويح في الرياض",
        "url": "https://taraweeh.org/favorites",
    })


# --- SPA routes for /u/ ---
@app.route("/u/<username>")
def user_profile_page(username):
    if USE_REACT_FRONTEND:
        user = PublicUser.query.filter_by(username=username).first()
        if user:
            return serve_react_app(meta_tags={
                "title": f"مفضلات {user.display_name or user.username} - أئمة التراويح",
                "description": f"قائمة المساجد المفضلة لـ {user.display_name or user.username}",
                "url": f"https://taraweeh.org/u/{username}",
            })
        return serve_react_app()
    return redirect("/")


# --- tracker routes ---
def _compute_streaks(nights_set):
    if not nights_set:
        return 0, 0
    sorted_nights = sorted(nights_set)
    best = current = 1
    for i in range(1, len(sorted_nights)):
        if sorted_nights[i] == sorted_nights[i - 1] + 1:
            current += 1
            best = max(best, current)
        else:
            current = 1
    best = max(best, current)
    # current_streak: consecutive ending at the latest night
    current_streak = 1
    for i in range(len(sorted_nights) - 1, 0, -1):
        if sorted_nights[i] - sorted_nights[i - 1] == 1:
            current_streak += 1
        else:
            break
    return current_streak, best


@app.route("/api/user/tracker")
@firebase_auth_required
def get_tracker():
    user = g.current_public_user
    if not user:
        return jsonify({"error": "Not registered"}), 401
    records = TaraweehAttendance.query.filter_by(user_id=user.id).all()
    nights = [{"night": r.night, "mosque_id": r.mosque_id, "attended_at": r.attended_at.isoformat()} for r in records]
    nights_set = {r.night for r in records}
    current_streak, best_streak = _compute_streaks(nights_set)
    return jsonify({
        "nights": nights,
        "stats": {
            "attended": len(records),
            "total": 30,
            "current_streak": current_streak,
            "best_streak": best_streak,
        },
    })


@app.route("/api/user/tracker/<int:night>", methods=["POST"])
@firebase_auth_required
def mark_night(night):
    user = g.current_public_user
    if not user:
        return jsonify({"error": "Not registered"}), 401
    if night < 1 or night > 30:
        return jsonify({"error": "Night must be 1-30"}), 400
    existing = TaraweehAttendance.query.filter_by(user_id=user.id, night=night).first()
    data = request.get_json() or {}
    mosque_id = data.get("mosque_id")
    if existing:
        existing.mosque_id = mosque_id
    else:
        db.session.add(TaraweehAttendance(user_id=user.id, night=night, mosque_id=mosque_id))
    db.session.commit()
    return jsonify({"success": True})


@app.route("/api/user/tracker/<int:night>", methods=["DELETE"])
@firebase_auth_required
def unmark_night(night):
    user = g.current_public_user
    if not user:
        return jsonify({"error": "Not registered"}), 401
    record = TaraweehAttendance.query.filter_by(user_id=user.id, night=night).first()
    if record:
        db.session.delete(record)
        db.session.commit()
    return jsonify({"success": True})


@app.route("/api/u/<username>/tracker")
def public_tracker(username):
    user = PublicUser.query.filter_by(username=username).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
    records = TaraweehAttendance.query.filter_by(user_id=user.id).all()
    nights = [{"night": r.night, "mosque_id": r.mosque_id, "attended_at": r.attended_at.isoformat()} for r in records]
    nights_set = {r.night for r in records}
    current_streak, best_streak = _compute_streaks(nights_set)
    return jsonify({
        "username": user.username,
        "display_name": user.display_name,
        "nights": nights,
        "stats": {
            "attended": len(records),
            "total": 30,
            "current_streak": current_streak,
            "best_streak": best_streak,
        },
    })


@app.route("/tracker")
def tracker_page():
    return serve_react_app(meta_tags={
        "title": "متابعة التراويح - أئمة التراويح",
        "description": "تابع حضورك لصلاة التراويح خلال شهر رمضان",
        "url": "https://taraweeh.org/tracker",
    })


# --- error reporting route ---
@app.route("/report-error", methods=["POST"])
def report_error():
    try:
        # get form data
        mosque_id = request.form.get("mosque_id")
        error_types = request.form.getlist("error_type")
        error_details = request.form.get("error_details")
        reporter_email = request.form.get("reporter_email")

        # get mosque information
        mosque = Mosque.query.get(mosque_id)
        if not mosque:
            return jsonify({"error": "Mosque not found"}), 404

        # create a message with the report information
        report_content = f"""
        Error Report for Mosque: {mosque.name} (ID: {mosque_id})

        Error Types: {", ".join(error_types)}

        Additional Details:
        {error_details}

        Reporter Email: {reporter_email or "Not provided"}

        Reported at: {datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
        """

        # log the report
        print("Error Report Received:\n", report_content)

        # send email notification
        try:
            msg = Message(
                subject=f"تقرير خطأ: {mosque.name}",
                recipients=["info@taraweeh.org"],  # official email from the website
                body=report_content,
            )

            if reporter_email:
                msg.reply_to = reporter_email

            mail.send(msg)
            print(f"Error report email sent successfully for mosque: {mosque.name}")
        except Exception as mail_error:
            print(f"Error sending email: {mail_error}")
            # continue processing even if email fails

        return jsonify(
            {"success": True, "message": "Report received successfully"}
        ), 200
    except Exception as e:
        print(f"Error processing report: {e}")
        return jsonify({"error": "Error processing report"}), 500


# --- application entry point ---
if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5002))
    app.run(host="0.0.0.0", port=port, debug=False)
