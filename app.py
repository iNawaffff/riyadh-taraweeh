from flask import Flask, render_template, request, jsonify
from flask_admin import Admin
from flask_admin.contrib.sqla import ModelView
from models import db, Mosque, Imam
from wtforms_sqlalchemy.fields import QuerySelectField
import os

app = Flask(__name__)

# Update your database configuration to work on both local and Heroku environments
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///mosques.db')
# Fix potential issue with PostgreSQL URLs on Heroku
if app.config['SQLALCHEMY_DATABASE_URI'] and app.config['SQLALCHEMY_DATABASE_URI'].startswith('postgres://'):
    app.config['SQLALCHEMY_DATABASE_URI'] = app.config['SQLALCHEMY_DATABASE_URI'].replace('postgres://', 'postgresql://')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Use environment variable for SECRET_KEY or default to a secure local value
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'your_local_secret_key')

db.init_app(app)

# Initialize database if needed
with app.app_context():
    try:
        db.create_all()
    except Exception as e:
        print(f"Database initialization error: {e}")

# manually configuring the Imam model
class ImamModelView(ModelView):
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

admin = Admin(app, name='إدارة أئمة التراويح', template_mode='bootstrap3')
admin.add_view(ModelView(Mosque, db.session, name='المساجد'))
admin.add_view(ImamModelView(Imam, db.session, name='الأئمة'))

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