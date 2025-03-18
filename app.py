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
from utils import normalize_arabic
from geopy.distance import geodesic
from functools import lru_cache
from flask_mail import Mail, Message
import os
import json
import datetime

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

# --- mail configuration settings ---
app.config['MAIL_SERVER'] = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
app.config['MAIL_PORT'] = int(os.environ.get('MAIL_PORT', 587))
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.environ.get('MAIL_USERNAME', 'your-email@gmail.com')
app.config['MAIL_PASSWORD'] = os.environ.get('MAIL_PASSWORD', 'your-app-password')
app.config['MAIL_DEFAULT_SENDER'] = os.environ.get('MAIL_DEFAULT_SENDER', 'info@taraweeh.org')
mail = Mail(app)

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
    try:
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
    except Exception as e:
        return jsonify({"error": f"Database error: {str(e)}"}), 500


@app.route('/api/mosques/search')
def search_mosques():
    try:
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
    except Exception as e:
        return jsonify({"error": f"Search error: {str(e)}"}), 500


# --- seo routes ---
@app.route('/sitemap.xml')
def sitemap():
    # generate sitemap with all mosques
    mosques = Mosque.query.all()

    # Get current date for lastmod
    today = datetime.datetime.now().strftime('%Y-%m-%d')

    sitemap_xml = render_template(
        'sitemap.xml',
        mosques=mosques,
        current_date=today
    )
    response = make_response(sitemap_xml)
    response.headers["Content-Type"] = "application/xml"
    return response


@app.route('/mosque/<int:mosque_id>')
def mosque_detail(mosque_id):
    try:
        mosque = Mosque.query.get_or_404(mosque_id)
        imam = Imam.query.filter_by(mosque_id=mosque.id).first()


        return render_template('mosque_detail.html',
                               mosque=mosque,
                               imam=imam)
    except Exception as e:
        print(f"Error displaying mosque detail: {e}")
        return render_template('error.html', message="حدث خطأ أثناء عرض بيانات المسجد"), 500


@app.route('/robots.txt')
def robots():
    # Add proper line breaks with \n
    robots_content = """User-agent: *
Allow: /
Sitemap: https://taraweeh.org/sitemap.xml
"""
    response = make_response(robots_content)
    response.headers["Content-Type"] = "text/plain"
    return response

@app.route('/api/mosques/nearby')
def nearby_mosques():
    try:
        lat = request.args.get('lat', type=float)
        lng = request.args.get('lng', type=float)

        if not lat or not lng:
            return jsonify({"error": "Latitude and longitude are required"}), 400

        mosques = Mosque.query.filter(
            Mosque.latitude.isnot(None),
            Mosque.longitude.isnot(None)
        ).all()

        user_location = (lat, lng)

        result = []
        for mosque in mosques:
            # calculate distance using geodesic formula
            mosque_location = (mosque.latitude, mosque.longitude)
            distance = geodesic(user_location, mosque_location).kilometers

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
                'distance': round(distance, 2),  # the distance in km, rounded to 2 decimal places
                'imam': imam.name if imam else None,
                'audio_sample': imam.audio_sample if imam else None,
                'youtube_link': imam.youtube_link if imam else None
            })

        # sort by distance
        result.sort(key=lambda x: x['distance'])

        return jsonify(result)
    except Exception as e:
        return jsonify({"error": f"Error calculating nearby mosques: {str(e)}"}), 500


# --- error reporting route ---
@app.route('/report-error', methods=['POST'])
def report_error():
    try:
        # get form data
        mosque_id = request.form.get('mosque_id')
        error_types = request.form.getlist('error_type')
        error_details = request.form.get('error_details')
        reporter_email = request.form.get('reporter_email')

        # get mosque information
        mosque = Mosque.query.get(mosque_id)
        if not mosque:
            return jsonify({"error": "Mosque not found"}), 404

        # create a message with the report information
        report_content = f"""
        Error Report for Mosque: {mosque.name} (ID: {mosque_id})

        Error Types: {', '.join(error_types)}

        Additional Details:
        {error_details}

        Reporter Email: {reporter_email or 'Not provided'}

        Reported at: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}
        """

        # log the report
        print("Error Report Received:\n", report_content)

        # send email notification
        try:
            msg = Message(
                subject=f"تقرير خطأ: {mosque.name}",
                recipients=["info@taraweeh.org"],  # official email from the website
                body=report_content
            )

            # add reply-to header if reporter provided email
            if reporter_email:
                msg.reply_to = reporter_email

            mail.send(msg)
            print(f"Error report email sent successfully for mosque: {mosque.name}")
        except Exception as mail_error:
            print(f"Error sending email: {mail_error}")
            # continue processing even if email fails

        return jsonify({"success": True, "message": "Report received successfully"}), 200
    except Exception as e:
        print(f"Error processing report: {e}")
        return jsonify({"error": "Error processing report"}), 500


# --- application entry point ---
if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5003))
    app.run(host='0.0.0.0', port=port, debug=False)