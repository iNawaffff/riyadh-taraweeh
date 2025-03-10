# --- imports ---
from flask import Flask, render_template, request, jsonify, redirect, url_for, make_response
from flask_admin import Admin, AdminIndexView, expose
from flask_admin.contrib.sqla import ModelView
from models import db, Mosque, Imam
from wtforms_sqlalchemy.fields import QuerySelectField
from flask_login import LoginManager, UserMixin, login_required, login_user, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from flask_migrate import Migrate
from dotenv import load_dotenv
import os


load_dotenv()

app = Flask(__name__)

# database configuration
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'postgresql:///taraweeh_db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# convert heroku postgres url if needed
if app.config['SQLALCHEMY_DATABASE_URI'] and app.config['SQLALCHEMY_DATABASE_URI'].startswith('postgres://'):
    app.config['SQLALCHEMY_DATABASE_URI'] = app.config['SQLALCHEMY_DATABASE_URI'].replace('postgres://',
                                                                                          'postgresql://')
    print(f"database url converted to: {app.config['SQLALCHEMY_DATABASE_URI']}")


app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your_local_secret_key')

# --- database setup ---
db.init_app(app)
migrate = Migrate(app, db)

# --- user authentication ---
login_manager = LoginManager(app)
login_manager.login_view = 'login'


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
        ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
        ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'adminpassword')

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
    @expose('/')
    @login_required
    def index(self):
        return super(MyAdminIndexView, self).index()


class BaseModelView(ModelView):
    def is_accessible(self):
        return current_user.is_authenticated

    def inaccessible_callback(self, name, **kwargs):
        # redirect to the login page if user is not authenticated
        return redirect(url_for('login'))


class MosqueModelView(BaseModelView):
    form_columns = ['name', 'location', 'area', 'map_link', 'latitude', 'longitude']
    column_list = ['name', 'location', 'area', 'map_link', 'latitude', 'longitude']
    can_view_details = True

    form_args = {
        'name': {'label': 'اسم المسجد'},
        'location': {'label': 'الموقع'},
        'area': {'label': 'المنطقة'},
        'map_link': {'label': 'رابط الخريطة'},
        'latitude': {'label': 'خط العرض'},
        'longitude': {'label': 'خط الطول'}
    }


class ImamModelView(BaseModelView):
    form_columns = ['name', 'mosque', 'audio_sample', 'youtube_link']
    column_list = ['name', 'mosque', 'audio_sample', 'youtube_link']
    can_view_details = True

    form_overrides = {
        'mosque': QuerySelectField
    }

    form_args = {
        'name': {'label': 'اسم الإمام'},
        'mosque': {
            'label': 'المسجد',
            'query_factory': lambda: Mosque.query.all(),
            'get_label': 'name'
        },
        'audio_sample': {
            'label': 'رابط الملف الصوتي',
            'description': 'أدخل رابط الملف الصوتي من S3 هنا'
        },
        'youtube_link': {'label': 'رابط يوتيوب'}
    }


# initialize admin
admin = Admin(app, name='إدارة أئمة التراويح', template_mode='bootstrap3', index_view=MyAdminIndexView())
admin.add_view(MosqueModelView(Mosque, db.session, name='المساجد'))
admin.add_view(ImamModelView(Imam, db.session, name='الأئمة'))


# --- authentication routes ---
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        print(f"login attempt for user: {username}")

        user = User.query.filter_by(username=username).first()
        if user and user.check_password(password):
            login_user(user)
            print(f"login successful for user: {username}")
            return redirect(url_for('admin.index'))  # redirect to admin index page
        else:
            print(f"login failed for user: {username}")

    return render_template('login.html')


@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))  # redirect to main index page


# --- main routes ---
@app.route('/')
def index():
    # get unique areas for the filter dropdown
    areas = db.session.query(Mosque.area).distinct().all()
    areas = [area[0] for area in areas]  # extract area names from tuples
    return render_template('index.html', areas=areas)


@app.route('/about')
def about():
    return render_template('about.html')


@app.route('/contact')
def contact():
    return render_template('contact.html')


# --- api routes ---
@app.route('/api/mosques')
def get_mosques():
    # get all mosques ordered by name
    mosques = Mosque.query.order_by(Mosque.name).all()
    result = []

    for mosque in mosques:
        # get the imam for this mosque
        imam = Imam.query.filter_by(mosque_id=mosque.id).first()

        result.append({
            'id': mosque.id,
            'name': mosque.name,
            'location': mosque.location,
            'area': mosque.area,
            'map_link': mosque.map_link,
            'latitude': mosque.latitude,
            'longitude': mosque.longitude,
            'imam': imam.name if imam else None,
            'audio_sample': imam.audio_sample if imam else None,
            'youtube_link': imam.youtube_link if imam else None
        })
    return jsonify(result)


@app.route('/api/mosques/search')
def search_mosques():
    query = request.args.get('q', '')
    area = request.args.get('area', '')

    # build base query with imam join
    mosque_query = db.session.query(Mosque).outerjoin(Imam)

    # filter by area if provided
    if area and area != 'الكل':
        mosque_query = mosque_query.filter(Mosque.area == area)

    mosque_query = mosque_query.order_by(Mosque.name)
    mosques = mosque_query.all()

    # if there's a search query, apply the fuzzy matching in python
    if query:
        from utils import normalize_arabic
        normalized_query = normalize_arabic(query)

        # filter mosques with fuzzy matching in python
        filtered_mosques = []
        for mosque in mosques:
            # check if the query matches any of these fields (original or normalized)
            if (query.lower() in mosque.name.lower() or
                    query.lower() in mosque.location.lower() or
                    any(query.lower() in imam.name.lower() for imam in mosque.imams) or
                    normalized_query in normalize_arabic(mosque.name) or
                    normalized_query in normalize_arabic(mosque.location) or
                    any(normalized_query in normalize_arabic(imam.name) for imam in mosque.imams)):
                filtered_mosques.append(mosque)

        mosques = filtered_mosques

    # format results for api response
    result = []
    for mosque in mosques:
        imam = Imam.query.filter_by(mosque_id=mosque.id).first()
        result.append({
            'id': mosque.id,
            'name': mosque.name,
            'location': mosque.location,
            'area': mosque.area,
            'map_link': mosque.map_link,
            'latitude': mosque.latitude,
            'longitude': mosque.longitude,
            'imam': imam.name if imam else None,
            'audio_sample': imam.audio_sample if imam else None,
            'youtube_link': imam.youtube_link if imam else None
        })

    return jsonify(result)


# --- seo routes ---
@app.route('/sitemap.xml')
def sitemap():
    # generate sitemap with all mosques
    mosques = Mosque.query.all()
    sitemap_xml = render_template('sitemap.xml', mosques=mosques)
    response = make_response(sitemap_xml)
    response.headers["Content-Type"] = "application/xml"
    return response


@app.route('/robots.txt')
def robots():
    # serve robots.txt file for search engines
    response = make_response("""User-agent: *
Allow: /
Sitemap: https://taraweeh.org/sitemap.xml
""")
    response.headers["Content-Type"] = "text/plain"
    return response


@app.route('/api/mosques/nearby')
def nearby_mosques():
    lat = request.args.get('lat', type=float)
    lng = request.args.get('lng', type=float)

    if not lat or not lng:
        return jsonify({"error": "Latitude and longitude are required"}), 400

    # Calculate distance using the Haversine formula
    # This is a raw SQL expression that calculates distance in kilometers
    distance_formula = db.func.acos(
        db.func.sin(db.func.radians(lat)) *
        db.func.sin(db.func.radians(Mosque.latitude)) +
        db.func.cos(db.func.radians(lat)) *
        db.func.cos(db.func.radians(Mosque.latitude)) *
        db.func.cos(db.func.radians(lng) - db.func.radians(Mosque.longitude))
    ) * 6371  # Earth radius in km

    mosques = db.session.query(
        Mosque,
        distance_formula.label('distance')
    ).filter(
        Mosque.latitude.isnot(None),
        Mosque.longitude.isnot(None)
    ).order_by('distance').all()

    result = []
    for mosque, distance in mosques:
        imam = Imam.query.filter_by(mosque_id=mosque.id).first()
        result.append({
            'id': mosque.id,
            'name': mosque.name,
            'location': mosque.location,
            'area': mosque.area,
            'map_link': mosque.map_link,
            'latitude': mosque.latitude,
            'longitude': mosque.longitude,
            'distance': round(distance, 2),  # Distance in km, rounded to 2 decimal places
            'imam': imam.name if imam else None,
            'audio_sample': imam.audio_sample if imam else None,
            'youtube_link': imam.youtube_link if imam else None
        })

    return jsonify(result)

# --- application entry point ---
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5003))
    app.run(host='0.0.0.0', port=port)