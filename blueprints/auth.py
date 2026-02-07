"""Auth routes: /api/auth/*, /api/user/favorites/*, /api/user/tracker/*, /api/u/*, profile pages"""

from flask import Blueprint, jsonify, request, g

from auth_utils import firebase_auth_required, firebase_auth_optional
from extensions import limiter
from models import Imam, Mosque, PublicUser, TaraweehAttendance, UserFavorite, db
from services.serializers import serialize_mosque
from services.validation import sanitize_text, validate_username

auth_bp = Blueprint("auth", __name__)


# --- public user auth routes ---
@auth_bp.route("/api/auth/register", methods=["POST"])
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
        display_name=sanitize_text(data.get("display_name") or decoded.get("name") or "")[:100] or None,
        avatar_url=decoded.get("picture"),
        email=decoded.get("email"),
        phone=decoded.get("phone_number"),
    )
    db.session.add(user)

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


@auth_bp.route("/api/auth/me")
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
        "role": user.role,
        "favorites": fav_ids,
    })


# --- user favorites routes ---
@auth_bp.route("/api/user/favorites")
@firebase_auth_required
def get_favorites():
    user = g.current_public_user
    if not user:
        return jsonify({"error": "Not registered"}), 401
    return jsonify([f.mosque_id for f in user.favorites])


@auth_bp.route("/api/user/favorites", methods=["PUT"])
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


@auth_bp.route("/api/user/favorites/<int:mosque_id>", methods=["POST"])
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


@auth_bp.route("/api/user/favorites/<int:mosque_id>", methods=["DELETE"])
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
@auth_bp.route("/api/u/<username>")
def public_profile(username):
    user = PublicUser.query.filter_by(username=username).first()
    if not user:
        return jsonify({"error": "User not found"}), 404
    fav_mosque_ids = [fav.mosque_id for fav in user.favorites]
    if fav_mosque_ids:
        pairs = (
            db.session.query(Mosque, Imam)
            .outerjoin(Imam, Imam.mosque_id == Mosque.id)
            .filter(Mosque.id.in_(fav_mosque_ids))
            .all()
        )
        mosques = [serialize_mosque(m, imam=i) for m, i in pairs]
    else:
        mosques = []
    return jsonify({
        "username": user.username,
        "display_name": user.display_name,
        "avatar_url": user.avatar_url,
        "created_at": user.created_at.isoformat() if user.created_at else None,
        "contribution_points": user.contribution_points,
        "mosques": mosques,
    })


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
    current_streak = 1
    for i in range(len(sorted_nights) - 1, 0, -1):
        if sorted_nights[i] - sorted_nights[i - 1] == 1:
            current_streak += 1
        else:
            break
    return current_streak, best


@auth_bp.route("/api/user/tracker")
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


@auth_bp.route("/api/user/tracker/<int:night>", methods=["POST"])
@firebase_auth_required
def mark_night(night):
    from flask import current_app
    user = g.current_public_user
    if not user:
        return jsonify({"error": "Not registered"}), 401
    if night < 1 or night > 30:
        return jsonify({"error": "Night must be 1-30"}), 400
    existing = TaraweehAttendance.query.filter_by(user_id=user.id, night=night).first()
    data = request.get_json() or {}
    mosque_id = data.get("mosque_id")
    rakaat = data.get("rakaat")
    current_app.logger.info(f"mark_night: night={night}, mosque_id={mosque_id}, rakaat={rakaat}, data={data}")
    if existing:
        existing.mosque_id = mosque_id
        existing.rakaat = rakaat
    else:
        db.session.add(TaraweehAttendance(user_id=user.id, night=night, mosque_id=mosque_id, rakaat=rakaat))
    db.session.commit()
    return jsonify({"success": True})


@auth_bp.route("/api/user/tracker/<int:night>", methods=["DELETE"])
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


@auth_bp.route("/api/u/<username>/tracker")
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
