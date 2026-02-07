"""JSON serialization helpers for API responses."""

from models import Imam


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
