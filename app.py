# --- imports ---
import datetime
import json
import os
import re
import time
from functools import lru_cache, wraps

import uuid

import boto3
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
from flask_admin.actions import action
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
from flask_wtf.csrf import CSRFProtect
from geopy.distance import geodesic
from markupsafe import Markup
from werkzeug.security import check_password_hash, generate_password_hash
from wtforms_sqlalchemy.fields import QuerySelectField

from models import Imam, ImamTransferRequest, Mosque, PublicUser, TaraweehAttendance, UserFavorite, db
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
csrf = CSRFProtect(app)

# Exempt API and non-form routes from CSRF
app.config["WTF_CSRF_CHECK_DEFAULT"] = False


@app.before_request
def csrf_protect_admin():
    """Only enforce CSRF on admin and login form POSTs."""
    if request.method in ("POST", "PUT", "PATCH", "DELETE"):
        path = request.path
        if path.startswith("/admin") or path == "/login":
            csrf.protect()

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


def _imam_name_formatter(view, context, model, name):
    imam = Imam.query.filter_by(mosque_id=model.id).first()
    return imam.name if imam else "—"


def _map_link_formatter(view, context, model, name):
    if model.map_link:
        short = model.map_link[:40] + "..." if len(model.map_link) > 40 else model.map_link
        return Markup(f'<a href="{model.map_link}" target="_blank">{short}</a>')
    return "—"


def _swap_imam_formatter(view, context, model, name):
    swap_url = url_for("swap_imam_view", mosque_id=model.id)
    return Markup(f'<a href="{swap_url}" class="btn btn-xs btn-warning">تبديل الإمام</a>')


from wtforms import StringField


class MosqueModelView(BaseModelView):
    column_list = ["name", "imam", "area", "location", "map_link", "actions"]
    column_labels = {
        "name": "المسجد",
        "imam": "الإمام",
        "area": "المنطقة",
        "location": "الموقع",
        "map_link": "الخريطة",
        "actions": "",
    }
    can_view_details = True
    column_searchable_list = ["name", "location", "area"]
    column_filters = ["area"]
    column_default_sort = ("name", False)
    page_size = 50
    can_export = True

    column_formatters = {
        "imam": _imam_name_formatter,
        "map_link": _map_link_formatter,
        "actions": _swap_imam_formatter,
    }

    # Mosque + imam fields on the same form
    form_columns = ["name", "location", "area", "map_link", "latitude", "longitude"]

    form_args = {
        "name": {"label": "اسم المسجد"},
        "location": {"label": "الموقع"},
        "area": {"label": "المنطقة"},
        "map_link": {"label": "رابط الخريطة"},
        "latitude": {"label": "خط العرض"},
        "longitude": {"label": "خط الطول"},
    }

    # Extra imam fields injected into the form
    form_extra_fields = {
        "imam_name": StringField("اسم الإمام"),
        "imam_audio": StringField("رابط الملف الصوتي"),
        "imam_youtube": StringField("رابط يوتيوب"),
    }

    form_columns = ["name", "location", "area", "map_link", "latitude", "longitude",
                     "imam_name", "imam_audio", "imam_youtube"]

    def on_form_prefill(self, form, id):
        """Pre-fill imam fields when editing an existing mosque."""
        imam = Imam.query.filter_by(mosque_id=id).first()
        if imam:
            form.imam_name.data = imam.name
            form.imam_audio.data = imam.audio_sample or ""
            form.imam_youtube.data = imam.youtube_link or ""

    def after_model_change(self, form, model, is_created):
        """Create or update the imam record after saving the mosque."""
        global _imam_index_cache
        imam_name = form.imam_name.data.strip() if form.imam_name.data else ""
        imam_audio = form.imam_audio.data.strip() if form.imam_audio.data else None
        imam_youtube = form.imam_youtube.data.strip() if form.imam_youtube.data else None

        imam = Imam.query.filter_by(mosque_id=model.id).first()

        if imam_name:
            if imam:
                imam.name = imam_name
                imam.audio_sample = imam_audio
                imam.youtube_link = imam_youtube
            else:
                imam = Imam(
                    name=imam_name,
                    mosque_id=model.id,
                    audio_sample=imam_audio,
                    youtube_link=imam_youtube,
                )
                db.session.add(imam)
            db.session.commit()
            _imam_index_cache = None
        elif imam and not imam_name:
            # Clear imam name = unassign imam from this mosque
            imam.mosque_id = None
            db.session.commit()

    @action("swap_imam", "تبديل الإمام", "هل تريد تبديل إمام المسجد المحدد؟")
    def swap_imam_action(self, ids):
        if len(ids) != 1:
            return redirect(url_for(".index_view"))
        return redirect(url_for("swap_imam_view", mosque_id=ids[0]))


class ImamModelView(BaseModelView):
    form_columns = ["name", "mosque", "audio_sample", "youtube_link"]
    column_list = ["name", "mosque", "audio_sample", "youtube_link"]
    column_labels = {
        "name": "الإمام",
        "mosque": "المسجد",
        "audio_sample": "الملف الصوتي",
        "youtube_link": "يوتيوب",
    }
    can_view_details = True
    column_searchable_list = ["name"]
    column_filters = ["mosque"]

    form_overrides = {"mosque": QuerySelectField}

    form_args = {
        "name": {"label": "اسم الإمام"},
        "mosque": {
            "label": "المسجد",
            "query_factory": lambda: Mosque.query.all(),
            "get_label": "name",
            "allow_blank": True,
            "blank_text": "بدون مسجد",
        },
        "audio_sample": {
            "label": "رابط الملف الصوتي",
            "description": "أدخل رابط الملف الصوتي أو ارفع ملف من صفحة المسجد",
        },
        "youtube_link": {"label": "رابط يوتيوب"},
    }


# --- S3 audio upload helper ---
def upload_audio_to_s3(file):
    bucket = os.environ.get("S3_BUCKET", "imams-riyadh-audio")
    ext = os.path.splitext(file.filename)[1] or ".mp3"
    key = f"audio/{uuid.uuid4().hex}{ext}"

    s3 = boto3.client(
        "s3",
        aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
    )
    s3.upload_fileobj(
        file,
        bucket,
        key,
        ExtraArgs={"ContentType": file.content_type or "audio/mpeg", "ACL": "public-read"},
    )
    region = os.environ.get("AWS_REGION", "us-east-1")
    return f"https://{bucket}.s3.{region}.amazonaws.com/{key}"


@app.route("/admin/upload-audio", methods=["POST"])
@login_required
def upload_audio():
    file = request.files.get("file")
    if not file or not file.filename:
        return jsonify({"error": "لم يتم اختيار ملف"}), 400
    try:
        url = upload_audio_to_s3(file)
        return jsonify({"url": url})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# --- Imam swap route ---
@app.route("/admin/mosque/swap-imam/<int:mosque_id>", methods=["GET", "POST"])
@login_required
def swap_imam_view(mosque_id):
    mosque = Mosque.query.get_or_404(mosque_id)
    current_imam = Imam.query.filter_by(mosque_id=mosque.id).first()
    # All imams not assigned to this mosque (for "pick existing imam" dropdown)
    other_imams = Imam.query.filter(Imam.mosque_id != mosque.id).order_by(Imam.name).all()
    unassigned_imams = Imam.query.filter(Imam.mosque_id.is_(None)).order_by(Imam.name).all()
    available_imams = other_imams + unassigned_imams

    if request.method == "POST":
        new_imam_source = request.form.get("new_imam_source", "new")

        # --- Step 1: Figure out incoming imam ---
        if new_imam_source == "existing":
            # Moving an existing imam to this mosque
            incoming_imam_id = request.form.get("existing_imam_id", type=int)
            incoming_imam = Imam.query.get(incoming_imam_id) if incoming_imam_id else None

            if incoming_imam:
                # The mosque that incoming imam is leaving
                source_mosque_id = incoming_imam.mosque_id
                incoming_imam.mosque_id = mosque.id
        else:
            incoming_imam = None
            source_mosque_id = None
            # Will create a brand new imam below

        # --- Step 2: Handle this mosque's current imam ---
        if current_imam:
            old_action = request.form.get("old_imam_action", "unassign")
            if old_action == "transfer":
                transfer_id = request.form.get("transfer_mosque_id", type=int)
                if transfer_id:
                    current_imam.mosque_id = transfer_id
            elif old_action == "swap" and source_mosque_id:
                # Send current imam to the mosque the incoming imam came from
                current_imam.mosque_id = source_mosque_id
            elif old_action == "delete":
                db.session.delete(current_imam)
            else:  # unassign
                current_imam.mosque_id = None

        # --- Step 3: Create new imam if not using existing ---
        if new_imam_source == "new":
            new_name = request.form.get("new_imam_name", "").strip()
            if new_name:
                new_imam = Imam(
                    name=new_name,
                    mosque_id=mosque.id,
                    audio_sample=request.form.get("new_imam_audio", "").strip() or None,
                    youtube_link=request.form.get("new_imam_youtube", "").strip() or None,
                )
                db.session.add(new_imam)

        db.session.commit()
        return redirect(url_for("mosque.index_view"))

    mosques = Mosque.query.order_by(Mosque.name).all()
    return render_template(
        "admin/swap_imam.html",
        mosque=mosque,
        current_imam=current_imam,
        mosques=mosques,
        available_imams=available_imams,
        admin_base_template="admin/base.html",
    )


class TransferRequestModelView(BaseModelView):
    column_list = ["id", "submitter", "mosque", "current_imam", "new_imam", "new_imam_name", "notes", "status", "reject_reason", "created_at", "reviewed_at"]
    column_labels = {
        "id": "#",
        "submitter": "المُبلّغ",
        "mosque": "المسجد",
        "current_imam": "الإمام الحالي",
        "new_imam": "الإمام الجديد",
        "new_imam_name": "اسم إمام جديد",
        "notes": "ملاحظات",
        "status": "الحالة",
        "reject_reason": "سبب الرفض",
        "created_at": "تاريخ الإنشاء",
        "reviewed_at": "تاريخ المراجعة",
    }
    column_filters = ["status"]
    column_default_sort = ("created_at", True)
    column_editable_list = ["reject_reason"]  # Inline edit rejection reason before rejecting
    page_size = 50
    can_create = False
    can_edit = True
    can_delete = True

    @action("approve", "قبول البلاغات المحددة", "هل تريد قبول البلاغات المحددة؟")
    def action_approve(self, ids):
        for transfer_id in ids:
            tr = ImamTransferRequest.query.get(transfer_id)
            if not tr or tr.status != "pending":
                continue
            mosque = Mosque.query.get(tr.mosque_id)
            if not mosque:
                continue
            # Unassign old imam
            old_imam = Imam.query.filter_by(mosque_id=mosque.id).first()
            if old_imam:
                old_imam.mosque_id = None
            # Assign or create new imam
            if tr.new_imam_id:
                new_imam = Imam.query.get(tr.new_imam_id)
                if new_imam:
                    new_imam.mosque_id = mosque.id
            elif tr.new_imam_name:
                new_imam = Imam(name=tr.new_imam_name, mosque_id=mosque.id)
                db.session.add(new_imam)
            # Award point
            submitter = PublicUser.query.get(tr.submitter_id)
            if submitter:
                submitter.contribution_points = PublicUser.contribution_points + 1
            tr.status = "approved"
            tr.reviewed_at = datetime.datetime.utcnow()
            tr.reviewed_by = current_user.id if current_user.is_authenticated else None
        db.session.commit()
        global _imam_index_cache
        _imam_index_cache = None

    @action("reject", "رفض البلاغات المحددة", "هل تريد رفض البلاغات المحددة؟")
    def action_reject(self, ids):
        for transfer_id in ids:
            tr = ImamTransferRequest.query.get(transfer_id)
            if not tr or tr.status != "pending":
                continue
            tr.status = "rejected"
            tr.reviewed_at = datetime.datetime.utcnow()
            tr.reviewed_by = current_user.id if current_user.is_authenticated else None
            # reject_reason is preserved if already filled via inline edit
        db.session.commit()


# initialize admin
admin = Admin(
    app,
    name="إدارة أئمة التراويح",
    template_mode="bootstrap3",
    index_view=MyAdminIndexView(),
)
admin.add_view(MosqueModelView(Mosque, db.session, name="المساجد"))
admin.add_view(ImamModelView(Imam, db.session, name="الأئمة"))
admin.add_view(TransferRequestModelView(ImamTransferRequest, db.session, name="بلاغات النقل"))


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
        location = request.args.get("location", "")

        # build base query with imam join
        mosque_query = db.session.query(Mosque).outerjoin(Imam)

        # filter by area if provided
        if area and area != "الكل":
            mosque_query = mosque_query.filter(Mosque.area == area)

        # filter by location (district) if provided
        if location and location != "الكل":
            mosque_query = mosque_query.filter(Mosque.location == location)

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


@app.route("/api/locations")
def get_locations():
    try:
        area = request.args.get("area", "")
        query = db.session.query(Mosque.location).distinct()
        if area and area != "الكل":
            query = query.filter(Mosque.area == area)
        locations = sorted([row[0] for row in query.all() if row[0]])
        return jsonify(locations)
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500


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


# Serve PWA files from React build root (registerSW.js, manifest.webmanifest, sw.js)
@app.route("/registerSW.js")
@app.route("/manifest.webmanifest")
@app.route("/sw.js")
def serve_pwa_files():
    if USE_REACT_FRONTEND:
        filename = request.path.lstrip("/")
        return send_from_directory(REACT_BUILD_DIR, filename)
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
        "created_at": user.created_at.isoformat() if user.created_at else None,
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
    nights = [{"night": r.night, "mosque_id": r.mosque_id, "rakaat": r.rakaat, "attended_at": r.attended_at.isoformat()} for r in records]
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
    rakaat = data.get("rakaat")
    app.logger.info(f"mark_night: night={night}, mosque_id={mosque_id}, rakaat={rakaat}, data={data}")
    if existing:
        existing.mosque_id = mosque_id
        existing.rakaat = rakaat
    else:
        db.session.add(TaraweehAttendance(user_id=user.id, night=night, mosque_id=mosque_id, rakaat=rakaat))
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
    nights = [{"night": r.night, "mosque_id": r.mosque_id, "rakaat": r.rakaat, "attended_at": r.attended_at.isoformat()} for r in records]
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


@app.route("/leaderboard")
def leaderboard_page():
    return serve_react_app(meta_tags={
        "title": "المتصدرون - أئمة التراويح",
        "description": "قائمة أكثر المساهمين في تحديث بيانات أئمة التراويح في الرياض",
        "url": "https://taraweeh.org/leaderboard",
    })


@app.route("/tracker")
def tracker_page():
    return serve_react_app(meta_tags={
        "title": "متابعة التراويح - أئمة التراويح",
        "description": "تابع حضورك لصلاة التراويح خلال شهر رمضان",
        "url": "https://taraweeh.org/tracker",
    })


# --- imam search + transfer routes ---
def _strip_prefixes(text):
    """Strip common Arabic prefixes for flexible matching."""
    text = text.strip()
    for prefix in ['الشيخ ', 'شيخ ', 'الامام ', 'امام ']:
        if text.startswith(prefix):
            text = text[len(prefix):].strip()
            break
    # Strip "ال" article from each word
    words = text.split()
    stripped = []
    for w in words:
        stripped.append(w[2:] if w.startswith('ال') and len(w) > 2 else w)
    return ' '.join(stripped)


def _bigrams(s):
    """Generate character bigrams for a string."""
    return {s[i:i+2] for i in range(len(s) - 1)} if len(s) >= 2 else {s}


def _bigram_similarity(a, b):
    """Bigram (Dice coefficient) similarity between two strings. 0-1."""
    if not a or not b:
        return 0.0
    bg_a = _bigrams(a)
    bg_b = _bigrams(b)
    if not bg_a or not bg_b:
        return 0.0
    return 2.0 * len(bg_a & bg_b) / (len(bg_a) + len(bg_b))


# Pre-compute imam index on first request
_imam_index_cache = None
_imam_index_count = None


def _get_imam_index():
    """Build and cache normalized imam data for search. Invalidated if imam count changes."""
    global _imam_index_cache, _imam_index_count
    current_count = db.session.query(db.func.count(Imam.id)).scalar()
    if _imam_index_cache is not None and _imam_index_count == current_count:
        return _imam_index_cache

    pairs = db.session.query(Imam, Mosque).outerjoin(Mosque, Imam.mosque_id == Mosque.id).all()
    index = []
    for imam, mosque in pairs:
        name_norm = normalize_arabic(imam.name)
        name_stripped = _strip_prefixes(name_norm)
        words = name_norm.split()
        stripped_words = name_stripped.split()
        index.append({
            'imam': imam,
            'mosque': mosque,
            'norm': name_norm,
            'stripped': name_stripped,
            'words': words,
            'stripped_words': stripped_words,
        })
    _imam_index_cache = index
    _imam_index_count = current_count
    return index


def _score_imam(q_norm, q_stripped, q_words, q_stripped_words, entry):
    """Score an imam match. Higher = better. 0 = no match."""
    name = entry['norm']
    stripped = entry['stripped']
    words = entry['words']
    s_words = entry['stripped_words']

    # Tier 1: Exact or prefix match on full normalized name
    if q_norm == name:
        return 100
    if name.startswith(q_norm):
        return 95

    # Tier 2: Stripped prefix match
    if stripped.startswith(q_stripped):
        return 90

    # Tier 3: Substring containment
    if q_norm in name:
        return 80
    if q_stripped in stripped:
        return 75

    # Tier 4: Any word starts with query (single-word query)
    if len(q_words) == 1:
        for w in words + s_words:
            if w.startswith(q_norm) or w.startswith(q_stripped):
                return 70
        # Also check if any stripped word starts with stripped query
        for w in s_words:
            if w.startswith(q_stripped_words[0]) if q_stripped_words else False:
                return 65

    # Tier 5: Multi-word — all query words match some name word
    if len(q_words) > 1:
        all_name_words = words + s_words
        matched = 0
        for qw in q_words + q_stripped_words:
            for nw in all_name_words:
                if nw.startswith(qw) or qw in nw:
                    matched += 1
                    break
        unique_q = len(set(q_words + q_stripped_words))
        if unique_q > 0:
            ratio = matched / unique_q
            if ratio >= 0.8:
                return 75
            if ratio >= 0.5:
                return 55

    # Tier 6: Bigram fuzzy similarity (catches typos, reordering)
    sim = _bigram_similarity(q_stripped, stripped)
    if sim >= 0.6:
        return int(40 + sim * 20)  # 52-60

    # Per-word bigram match (for partial name matches)
    for w in s_words:
        wsim = _bigram_similarity(q_stripped, w)
        if wsim >= 0.5:
            return int(30 + wsim * 20)  # 40-50

    return 0


@app.route("/api/imams/search")
def search_imams():
    q = request.args.get("q", "").strip()
    if not q:
        return jsonify([])
    q_norm = normalize_arabic(q)
    q_stripped = _strip_prefixes(q_norm)
    if not q_stripped:
        return jsonify([])
    q_words = q_norm.split()
    q_stripped_words = q_stripped.split()

    index = _get_imam_index()
    scored = []
    for entry in index:
        score = _score_imam(q_norm, q_stripped, q_words, q_stripped_words, entry)
        if score > 0:
            scored.append((score, entry))

    scored.sort(key=lambda x: -x[0])
    return jsonify([{
        "id": e['imam'].id,
        "name": e['imam'].name,
        "mosque_name": e['mosque'].name if e['mosque'] else None,
        "mosque_id": e['imam'].mosque_id,
    } for _, e in scored[:15]])


@app.route("/api/transfers", methods=["POST"])
@firebase_auth_required
def submit_transfer():
    user = g.current_public_user
    if not user:
        return jsonify({"error": "Not registered"}), 401
    data = request.get_json() or {}
    mosque_id = data.get("mosque_id")
    if not mosque_id or not Mosque.query.get(mosque_id):
        return jsonify({"error": "مسجد غير صالح"}), 400
    # Check duplicate pending
    existing = ImamTransferRequest.query.filter_by(
        submitter_id=user.id, mosque_id=mosque_id, status="pending"
    ).first()
    if existing:
        return jsonify({"error": "لديك بلاغ معلق لهذا المسجد"}), 409
    current_imam = Imam.query.filter_by(mosque_id=mosque_id).first()
    new_imam_id = data.get("new_imam_id")
    new_imam_name = data.get("new_imam_name", "").strip() if data.get("new_imam_name") else None
    if not new_imam_id and not new_imam_name:
        return jsonify({"error": "يجب تحديد الإمام الجديد"}), 400
    tr = ImamTransferRequest(
        submitter_id=user.id,
        mosque_id=mosque_id,
        current_imam_id=current_imam.id if current_imam else None,
        new_imam_id=new_imam_id if new_imam_id else None,
        new_imam_name=new_imam_name,
        notes=data.get("notes", "").strip() or None,
    )
    db.session.add(tr)
    db.session.commit()
    return jsonify({"id": tr.id, "status": tr.status}), 201


@app.route("/api/transfers/<int:transfer_id>", methods=["DELETE"])
@firebase_auth_required
def cancel_transfer(transfer_id):
    user = g.current_public_user
    if not user:
        return jsonify({"error": "Not registered"}), 401
    tr = ImamTransferRequest.query.get(transfer_id)
    if not tr or tr.submitter_id != user.id:
        return jsonify({"error": "غير موجود"}), 404
    if tr.status != "pending":
        return jsonify({"error": "لا يمكن إلغاء بلاغ تمت مراجعته"}), 400
    db.session.delete(tr)
    db.session.commit()
    return jsonify({"success": True})


@app.route("/api/user/transfers")
@firebase_auth_required
def user_transfers():
    user = g.current_public_user
    if not user:
        return jsonify({"error": "Not registered"}), 401
    transfers = ImamTransferRequest.query.filter_by(submitter_id=user.id).order_by(ImamTransferRequest.created_at.desc()).all()
    result = []
    for tr in transfers:
        mosque = Mosque.query.get(tr.mosque_id)
        result.append({
            "id": tr.id,
            "mosque_id": tr.mosque_id,
            "mosque_name": mosque.name if mosque else None,
            "current_imam_name": tr.current_imam.name if tr.current_imam else None,
            "new_imam_name": tr.new_imam.name if tr.new_imam else (tr.new_imam_name or None),
            "notes": tr.notes,
            "status": tr.status,
            "reject_reason": tr.reject_reason,
            "created_at": tr.created_at.isoformat(),
            "reviewed_at": tr.reviewed_at.isoformat() if tr.reviewed_at else None,
        })
    return jsonify(result)


@app.route("/api/leaderboard")
def leaderboard():
    users = PublicUser.query.filter(
        PublicUser.contribution_points > 0
    ).order_by(
        PublicUser.contribution_points.desc()
    ).limit(20).all()
    # Pioneer = first ever user to get an approved transfer
    pioneer = db.session.query(ImamTransferRequest.submitter_id).filter(
        ImamTransferRequest.status == "approved"
    ).order_by(ImamTransferRequest.reviewed_at.asc()).first()
    pioneer_id = pioneer[0] if pioneer else None
    return jsonify([{
        "username": u.username,
        "display_name": u.display_name,
        "avatar_url": u.avatar_url,
        "points": u.contribution_points,
        "is_pioneer": u.id == pioneer_id,
    } for u in users])


@app.route("/api/transfers/<int:transfer_id>/approve", methods=["POST"])
@login_required
def approve_transfer(transfer_id):
    tr = ImamTransferRequest.query.get_or_404(transfer_id)
    if tr.status != "pending":
        return jsonify({"error": "Already reviewed"}), 400
    mosque = Mosque.query.get(tr.mosque_id)
    old_imam = Imam.query.filter_by(mosque_id=mosque.id).first()
    if old_imam:
        old_imam.mosque_id = None
    if tr.new_imam_id:
        new_imam = Imam.query.get(tr.new_imam_id)
        if new_imam:
            new_imam.mosque_id = mosque.id
    elif tr.new_imam_name:
        new_imam = Imam(name=tr.new_imam_name, mosque_id=mosque.id)
        db.session.add(new_imam)
    submitter = PublicUser.query.get(tr.submitter_id)
    if submitter:
        submitter.contribution_points = PublicUser.contribution_points + 1
    tr.status = "approved"
    tr.reviewed_at = datetime.datetime.utcnow()
    tr.reviewed_by = current_user.id
    db.session.commit()
    global _imam_index_cache
    _imam_index_cache = None  # invalidate search cache
    return jsonify({"success": True})


@app.route("/api/transfers/<int:transfer_id>/reject", methods=["POST"])
@login_required
def reject_transfer(transfer_id):
    tr = ImamTransferRequest.query.get_or_404(transfer_id)
    if tr.status != "pending":
        return jsonify({"error": "Already reviewed"}), 400
    data = request.get_json() or {}
    tr.status = "rejected"
    tr.reject_reason = data.get("reason", "").strip() or None
    tr.reviewed_at = datetime.datetime.utcnow()
    tr.reviewed_by = current_user.id
    db.session.commit()
    return jsonify({"success": True})


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
