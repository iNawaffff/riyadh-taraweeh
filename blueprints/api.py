"""Public API routes: /api/mosques, /api/locations, /api/areas, /api/leaderboard, /sitemap.xml, /api/mosques/nearby"""

import time

from flask import Blueprint, jsonify, make_response, render_template, request
from geopy.distance import geodesic

from extensions import limiter
from models import CommunityRequest, Imam, ImamTransferRequest, Mosque, PublicUser, db
from services.cache import cache_get, cache_set
from services.serializers import serialize_mosque
from utils import normalize_arabic

api_bp = Blueprint("api", __name__)


@api_bp.route("/api/mosques")
def get_mosques():
    try:
        cached = cache_get("mosques")
        if cached is not None:
            return jsonify(cached)
        pairs = (
            db.session.query(Mosque, Imam)
            .outerjoin(Imam, Imam.mosque_id == Mosque.id)
            .order_by(Mosque.name)
            .all()
        )
        result = [serialize_mosque(m, imam=i) for m, i in pairs]
        cache_set("mosques", result)
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": "حدث خطأ في الخادم"}), 500


@api_bp.route("/api/mosques/<int:mosque_id>")
def get_mosque(mosque_id):
    try:
        mosque = Mosque.query.get(mosque_id)
        if not mosque:
            return jsonify({"error": "Mosque not found"}), 404
        return jsonify(serialize_mosque(mosque))
    except Exception as e:
        return jsonify({"error": "حدث خطأ في الخادم"}), 500


@api_bp.route("/api/mosques/search")
@limiter.limit("30 per minute")
def search_mosques():
    try:
        query = request.args.get("q", "")
        area = request.args.get("area", "")
        location = request.args.get("location", "")

        mosque_query = (
            db.session.query(Mosque, Imam)
            .outerjoin(Imam, Imam.mosque_id == Mosque.id)
        )
        if area and area != "الكل":
            mosque_query = mosque_query.filter(Mosque.area == area)
        if location and location != "الكل":
            mosque_query = mosque_query.filter(Mosque.location == location)
        mosque_query = mosque_query.order_by(Mosque.name)
        pairs = mosque_query.all()

        if query:
            normalized_query = normalize_arabic(query)
            filtered_pairs = []
            for mosque, imam in pairs:
                imam_name = imam.name if imam else ""
                if (
                    query.lower() in mosque.name.lower()
                    or query.lower() in mosque.location.lower()
                    or query.lower() in imam_name.lower()
                    or normalized_query in normalize_arabic(mosque.name)
                    or normalized_query in normalize_arabic(mosque.location)
                    or (imam_name and normalized_query in normalize_arabic(imam_name))
                ):
                    filtered_pairs.append((mosque, imam))
            pairs = filtered_pairs

        result = [serialize_mosque(m, imam=i) for m, i in pairs]
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": "حدث خطأ في البحث"}), 500


@api_bp.route("/api/locations")
def get_locations():
    try:
        area = request.args.get("area", "")
        areas_only = request.args.get("areas_only", "")

        if areas_only == "1":
            cached = cache_get("areas")
            if cached is not None:
                return jsonify(cached)
            query = db.session.query(Mosque.area).distinct()
            areas = sorted([row[0] for row in query.all() if row[0]])
            cache_set("areas", areas)
            return jsonify(areas)

        cache_key = f"locations:{area}" if area and area != "الكل" else "locations:"
        cached = cache_get(cache_key)
        if cached is not None:
            return jsonify(cached)
        query = db.session.query(Mosque.location).distinct()
        if area and area != "الكل":
            query = query.filter(Mosque.area == area)
        locations = sorted([row[0] for row in query.all() if row[0]])
        cache_set(cache_key, locations)
        return jsonify(locations)
    except Exception as e:
        return jsonify({"error": "حدث خطأ في الخادم"}), 500


@api_bp.route("/api/areas")
def get_areas():
    try:
        query = db.session.query(Mosque.area).distinct()
        areas = sorted([row[0] for row in query.all() if row[0]])
        return jsonify(areas)
    except Exception as e:
        return jsonify({"error": "حدث خطأ في الخادم"}), 500


@api_bp.route("/api/mosques/nearby")
@limiter.limit("20 per minute")
def nearby_mosques():
    start = time.time()
    try:
        lat = request.args.get("lat", type=float)
        lng = request.args.get("lng", type=float)
        if not lat or not lng:
            return jsonify({"error": "Latitude and longitude are required"}), 400

        pairs = (
            db.session.query(Mosque, Imam)
            .outerjoin(Imam, Imam.mosque_id == Mosque.id)
            .filter(Mosque.latitude.isnot(None), Mosque.longitude.isnot(None))
            .all()
        )
        user_location = (lat, lng)
        result = []
        for mosque, imam in pairs:
            mosque_location = (mosque.latitude, mosque.longitude)
            distance = geodesic(user_location, mosque_location).kilometers
            result.append(serialize_mosque(mosque, imam=imam, distance=round(distance, 2)))
        result.sort(key=lambda x: x["distance"])
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": "حدث خطأ في حساب المسافة"}), 500


@api_bp.route("/api/leaderboard")
def leaderboard():
    users = PublicUser.query.filter(
        PublicUser.contribution_points > 0
    ).order_by(
        PublicUser.contribution_points.desc()
    ).limit(20).all()
    # Check both legacy transfers and community requests for first pioneer
    legacy_pioneer = db.session.query(
        ImamTransferRequest.submitter_id, ImamTransferRequest.reviewed_at
    ).filter(
        ImamTransferRequest.status == "approved"
    ).order_by(ImamTransferRequest.reviewed_at.asc()).first()

    community_pioneer = db.session.query(
        CommunityRequest.submitter_id, CommunityRequest.reviewed_at
    ).filter(
        CommunityRequest.status == "approved"
    ).order_by(CommunityRequest.reviewed_at.asc()).first()

    pioneer_id = None
    if legacy_pioneer and community_pioneer:
        pioneer_id = legacy_pioneer[0] if legacy_pioneer[1] <= community_pioneer[1] else community_pioneer[0]
    elif legacy_pioneer:
        pioneer_id = legacy_pioneer[0]
    elif community_pioneer:
        pioneer_id = community_pioneer[0]
    return jsonify([{
        "username": u.username,
        "display_name": u.display_name,
        "avatar_url": u.avatar_url,
        "points": u.contribution_points,
        "is_pioneer": u.id == pioneer_id,
    } for u in users])


@api_bp.route("/sitemap.xml")
def sitemap():
    mosques = Mosque.query.all()
    sitemap_xml = render_template("sitemap.xml", mosques=mosques)
    response = make_response(sitemap_xml)
    response.headers["Content-Type"] = "application/xml"
    return response
