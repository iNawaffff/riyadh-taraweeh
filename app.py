from flask import Flask, render_template, request, jsonify
from flask_admin import Admin
from flask_admin.contrib.sqla import ModelView
from models import db, Mosque, Imam
from wtforms_sqlalchemy.fields import QuerySelectField


app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///mosques.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SECRET_KEY'] = 'your_secret_key'


db.init_app(app)

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
    app.run(debug=True)
