from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_admin import Admin, AdminIndexView, expose
from flask_admin.contrib.sqla import ModelView
from models import db, Mosque, Imam
from wtforms_sqlalchemy.fields import QuerySelectField
import os
from flask_login import LoginManager, UserMixin, login_required, login_user, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv

# Load environment variables first
load_dotenv()

app = Flask(__name__)

# Update your database configuration to work on both local and Heroku environments
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///mosques.db')
# Fix potential issue with PostgreSQL URLs on Heroku
if app.config['SQLALCHEMY_DATABASE_URI'] and app.config['SQLALCHEMY_DATABASE_URI'].startswith('postgres://'):
    app.config['SQLALCHEMY_DATABASE_URI'] = app.config['SQLALCHEMY_DATABASE_URI'].replace('postgres://',
                                                                                          'postgresql://')
    print(f"Database URL converted to: {app.config['SQLALCHEMY_DATABASE_URI']}")
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Use environment variable for SECRET_KEY or default to a secure local value
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your_local_secret_key')

db.init_app(app)

login_manager = LoginManager(app)
login_manager.login_view = 'login'


# User model for authentication
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


# Initialize database if needed
with app.app_context():
    try:
        # Create all tables
        print("Creating database tables...")
        db.create_all()
        print("Tables created successfully!")

        # Get admin credentials from environment variables
        ADMIN_USERNAME = os.environ.get('ADMIN_USERNAME', 'admin')
        ADMIN_PASSWORD = os.environ.get('ADMIN_PASSWORD', 'adminpassword')

        print(f"Checking for admin user: {ADMIN_USERNAME}")

        # Create default admin user if not exists
        admin_user = User.query.filter_by(username=ADMIN_USERNAME).first()
        if not admin_user:
            print(f"Admin user {ADMIN_USERNAME} not found. Creating new admin user...")
            default_admin = User(username=ADMIN_USERNAME)
            default_admin.set_password(ADMIN_PASSWORD)
            db.session.add(default_admin)
            db.session.commit()
            print(f"Admin user {ADMIN_USERNAME} created successfully!")
        else:
            print(f"Admin user {ADMIN_USERNAME} already exists.")
    except Exception as e:
        print(f"Database initialization error: {e}")


# Custom Admin Index View
class MyAdminIndexView(AdminIndexView):
    @expose('/')
    @login_required
    def index(self):
        return super(MyAdminIndexView, self).index()


# Base ModelView with login required
class BaseModelView(ModelView):
    def is_accessible(self):
        return current_user.is_authenticated

    def inaccessible_callback(self, name, **kwargs):
        # Redirect to login page if user is not authenticated
        return redirect(url_for('login'))


# manually configuring the Imam model
class ImamModelView(BaseModelView):  # Inherit from BaseModelView
    form_columns = ['name', 'mosque', 'audio_sample', 'youtube_link']
    column_list = ['name', 'mosque', 'audio_sample', 'youtube_link']

    # Override the form field type for the relationship
    form_overrides = {
        'mosque': QuerySelectField
    }

    form_args = {
        'mosque': {
            'label': 'المسجد',
            'query_factory': lambda: Mosque.query.all(),
            'get_label': 'name'  # Use the name attribute of Mosque for display
        }
    }


# ModelView for Mosque, also inheriting from BaseModelView
class MosqueModelView(BaseModelView):  # Inherit from BaseModelView
    pass  # Uses default configurations


admin = Admin(app, name='إدارة أئمة التراويح', template_mode='bootstrap3', index_view=MyAdminIndexView())
admin.add_view(MosqueModelView(Mosque, db.session, name='المساجد'))
admin.add_view(ImamModelView(Imam, db.session, name='الأئمة'))


# Login route
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']

        print(f"Login attempt for user: {username}")

        user = User.query.filter_by(username=username).first()
        if user and user.check_password(password):
            login_user(user)
            print(f"Login successful for user: {username}")
            return redirect(url_for('admin.index'))  # Redirect to admin index page
        else:
            print(f"Login failed for user: {username}")

    return render_template('login.html')


# Logout route
@app.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('index'))  # Redirect to your main index page


# Main route
@app.route('/')
def index():
    # Get unique areas for the filter dropdown
    areas = db.session.query(Mosque.area).distinct().all()
    areas = [area[0] for area in areas]  # Extract area names from tuples
    return render_template('index.html', areas=areas)


# API route: Get all mosques with their imams
@app.route('/api/mosques')
def get_mosques():
    mosques = Mosque.query.all()
    result = []
    for mosque in mosques:
        # Get the imam for this mosque
        imam = Imam.query.filter_by(mosque_id=mosque.id).first()

        result.append({
            'id': mosque.id,
            'name': mosque.name,
            'location': mosque.location,
            'area': mosque.area,
            'map_link': mosque.map_link,
            'imam': imam.name if imam else None,
            'audio_sample': imam.audio_sample if imam else None,
            'youtube_link': imam.youtube_link if imam else None
        })
    return jsonify(result)


# API route: Search and filter mosques
@app.route('/api/mosques/search')
def search_mosques():
    query = request.args.get('q', '')
    area = request.args.get('area', '')

    mosque_query = db.session.query(Mosque).outerjoin(Imam)

    # Filter by search term if provided
    if query:
        mosque_query = mosque_query.filter(
            db.or_(
                Mosque.name.ilike(f'%{query}%'),
                Mosque.location.ilike(f'%{query}%'),
                Imam.name.ilike(f'%{query}%')
            )
        )

    # Filter by area if provided and not "all"
    if area and area != 'الكل':
        mosque_query = mosque_query.filter(Mosque.area == area)

    # Execute the query
    mosques = mosque_query.all()

    # Format the results
    result = []
    for mosque in mosques:
        imam = Imam.query.filter_by(mosque_id=mosque.id).first()

        result.append({
            'id': mosque.id,
            'name': mosque.name,
            'location': mosque.location,
            'area': mosque.area,
            'map_link': mosque.map_link,
            'imam': imam.name if imam else None,
            'audio_sample': imam.audio_sample if imam else None,
            'youtube_link': imam.youtube_link if imam else None
        })

    return jsonify(result)


if __name__ == '__main__':
    # Use Heroku's PORT environment variable or default to 5000
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port)