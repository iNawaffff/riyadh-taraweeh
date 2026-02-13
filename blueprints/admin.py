"""Admin API routes: /api/admin/stats, mosques, imams, users, audio"""

import os
import re
import subprocess
import tempfile
import uuid

import boto3
from flask import Blueprint, jsonify, request, send_from_directory, g

from auth_utils import admin_or_moderator_required
from extensions import limiter
from models import CommunityRequest, Imam, Mosque, PublicUser, TaraweehAttendance, UserFavorite, db
from services.cache import invalidate_caches
from utils import normalize_arabic

admin_bp = Blueprint("admin_api", __name__)


@admin_bp.route("/api/admin/stats")
@admin_or_moderator_required
def admin_stats():
    mosque_count = db.session.query(db.func.count(Mosque.id)).scalar()
    imam_count = db.session.query(db.func.count(Imam.id)).scalar()
    user_count = db.session.query(db.func.count(PublicUser.id)).scalar()
    pending_requests = db.session.query(db.func.count(CommunityRequest.id)).filter(
        CommunityRequest.status.in_(("pending", "needs_info"))
    ).scalar()
    return jsonify({
        "mosque_count": mosque_count,
        "imam_count": imam_count,
        "user_count": user_count,
        "pending_requests": pending_requests,
    })


@admin_bp.route("/api/admin/mosques")
@admin_or_moderator_required
def admin_list_mosques():
    page = max(1, request.args.get("page", 1, type=int))
    per_page = min(200, max(1, request.args.get("per_page", 50, type=int)))
    search = request.args.get("search", "").strip()
    area = request.args.get("area", "").strip()

    query = db.session.query(Mosque, Imam).outerjoin(Imam, Imam.mosque_id == Mosque.id)
    if search:
        query = query.filter(
            db.or_(
                Mosque.name.ilike(f"%{search}%"),
                Mosque.location.ilike(f"%{search}%"),
                Imam.name.ilike(f"%{search}%"),
            )
        )
    if area:
        query = query.filter(Mosque.area == area)
    query = query.order_by(Mosque.id.desc())
    total = query.count()
    pairs = query.offset((page - 1) * per_page).limit(per_page).all()
    items = []
    for mosque, imam in pairs:
        items.append({
            "id": mosque.id,
            "name": mosque.name,
            "location": mosque.location,
            "area": mosque.area,
            "map_link": mosque.map_link,
            "latitude": mosque.latitude,
            "longitude": mosque.longitude,
            "imam_id": imam.id if imam else None,
            "imam_name": imam.name if imam else None,
            "audio_sample": imam.audio_sample if imam else None,
            "youtube_link": imam.youtube_link if imam else None,
        })
    return jsonify({"items": items, "total": total, "page": page, "per_page": per_page})


@admin_bp.route("/api/admin/mosques/<int:mosque_id>")
@admin_or_moderator_required
def admin_get_mosque(mosque_id):
    mosque = Mosque.query.get(mosque_id)
    if not mosque:
        return jsonify({"error": "غير موجود"}), 404
    imam = Imam.query.filter_by(mosque_id=mosque.id).first()
    return jsonify({
        "id": mosque.id,
        "name": mosque.name,
        "location": mosque.location,
        "area": mosque.area,
        "map_link": mosque.map_link,
        "latitude": mosque.latitude,
        "longitude": mosque.longitude,
        "imam_id": imam.id if imam else None,
        "imam_name": imam.name if imam else None,
        "audio_sample": imam.audio_sample if imam else None,
        "youtube_link": imam.youtube_link if imam else None,
    })


@admin_bp.route("/api/admin/mosques", methods=["POST"])
@admin_or_moderator_required
def admin_create_mosque():
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    location = data.get("location", "").strip()
    area = data.get("area", "").strip()
    if not name or not location or not area:
        return jsonify({"error": "الاسم والموقع والمنطقة مطلوبة"}), 400
    if area not in ("شمال", "جنوب", "شرق", "غرب"):
        return jsonify({"error": "المنطقة غير صالحة"}), 400
    mosque = Mosque(
        name=name, location=location, area=area,
        map_link=data.get("map_link", "").strip() or None,
        latitude=data.get("latitude"), longitude=data.get("longitude"),
    )
    db.session.add(mosque)
    db.session.flush()
    existing_imam_id = data.get("existing_imam_id")
    imam_name = data.get("imam_name", "").strip()
    if existing_imam_id:
        imam = Imam.query.get(existing_imam_id)
        if not imam:
            db.session.rollback()
            return jsonify({"error": "الإمام غير موجود"}), 404
        imam.mosque_id = mosque.id
        if data.get("audio_sample", "").strip():
            imam.audio_sample = data["audio_sample"].strip()
        if data.get("youtube_link", "").strip():
            imam.youtube_link = data["youtube_link"].strip()
    elif imam_name:
        imam = Imam(
            name=imam_name, mosque_id=mosque.id,
            audio_sample=data.get("audio_sample", "").strip() or None,
            youtube_link=data.get("youtube_link", "").strip() or None,
        )
        db.session.add(imam)
    db.session.commit()
    invalidate_caches()
    return jsonify({"id": mosque.id}), 201


@admin_bp.route("/api/admin/mosques/<int:mosque_id>", methods=["PUT"])
@admin_or_moderator_required
def admin_update_mosque(mosque_id):
    mosque = Mosque.query.get(mosque_id)
    if not mosque:
        return jsonify({"error": "غير موجود"}), 404
    data = request.get_json() or {}
    if "name" in data:
        mosque.name = data["name"].strip()
    if "location" in data:
        mosque.location = data["location"].strip()
    if "area" in data:
        if data["area"] not in ("شمال", "جنوب", "شرق", "غرب"):
            return jsonify({"error": "المنطقة غير صالحة"}), 400
        mosque.area = data["area"]
    if "map_link" in data:
        mosque.map_link = data["map_link"].strip() or None
    if "latitude" in data:
        mosque.latitude = data["latitude"]
    if "longitude" in data:
        mosque.longitude = data["longitude"]

    current_imam = Imam.query.filter_by(mosque_id=mosque.id).first()
    existing_imam_id = data.get("existing_imam_id")
    imam_name = data.get("imam_name", "").strip() if "imam_name" in data else None

    if existing_imam_id:
        new_imam = Imam.query.get(existing_imam_id)
        if not new_imam:
            return jsonify({"error": "الإمام غير موجود"}), 404
        if current_imam and current_imam.id != existing_imam_id:
            current_imam.mosque_id = None
        new_imam.mosque_id = mosque.id
        if "audio_sample" in data:
            new_imam.audio_sample = data["audio_sample"].strip() or None
        if "youtube_link" in data:
            new_imam.youtube_link = data["youtube_link"].strip() or None
    elif imam_name is not None:
        if imam_name:
            if current_imam:
                current_imam.name = imam_name
            else:
                current_imam = Imam(name=imam_name, mosque_id=mosque.id)
                db.session.add(current_imam)
        elif current_imam:
            current_imam.mosque_id = None
        if current_imam and "audio_sample" in data:
            current_imam.audio_sample = data["audio_sample"].strip() or None
        if current_imam and "youtube_link" in data:
            current_imam.youtube_link = data["youtube_link"].strip() or None
    db.session.commit()
    invalidate_caches()
    return jsonify({"success": True})


@admin_bp.route("/api/admin/mosques/<int:mosque_id>", methods=["DELETE"])
@admin_or_moderator_required
def admin_delete_mosque(mosque_id):
    mosque = Mosque.query.get(mosque_id)
    if not mosque:
        return jsonify({"error": "غير موجود"}), 404
    Imam.query.filter_by(mosque_id=mosque.id).update({"mosque_id": None})
    UserFavorite.query.filter_by(mosque_id=mosque.id).delete()
    TaraweehAttendance.query.filter_by(mosque_id=mosque.id).update({"mosque_id": None})
    db.session.delete(mosque)
    db.session.commit()
    invalidate_caches()
    return jsonify({"success": True})


# --- Imams ---
@admin_bp.route("/api/admin/imams")
@admin_or_moderator_required
def admin_list_imams():
    page = max(1, request.args.get("page", 1, type=int))
    per_page = min(200, max(1, request.args.get("per_page", 50, type=int)))
    search = request.args.get("search", "").strip()
    query = db.session.query(Imam, Mosque).outerjoin(Mosque, Imam.mosque_id == Mosque.id)
    if search:
        query = query.filter(Imam.name.ilike(f"%{search}%"))
    query = query.order_by(Imam.id.desc())
    total = query.count()
    pairs = query.offset((page - 1) * per_page).limit(per_page).all()
    items = []
    for imam, mosque in pairs:
        items.append({
            "id": imam.id, "name": imam.name,
            "mosque_id": imam.mosque_id,
            "mosque_name": mosque.name if mosque else None,
            "audio_sample": imam.audio_sample,
            "youtube_link": imam.youtube_link,
        })
    return jsonify({"items": items, "total": total, "page": page, "per_page": per_page})


@admin_bp.route("/api/admin/imams/<int:imam_id>")
@admin_or_moderator_required
def admin_get_imam(imam_id):
    imam = Imam.query.get(imam_id)
    if not imam:
        return jsonify({"error": "غير موجود"}), 404
    mosque = Mosque.query.get(imam.mosque_id) if imam.mosque_id else None
    return jsonify({
        "id": imam.id, "name": imam.name,
        "mosque_id": imam.mosque_id,
        "mosque_name": mosque.name if mosque else None,
        "audio_sample": imam.audio_sample,
        "youtube_link": imam.youtube_link,
    })


@admin_bp.route("/api/admin/imams", methods=["POST"])
@admin_or_moderator_required
def admin_create_imam():
    data = request.get_json() or {}
    name = data.get("name", "").strip()
    if not name:
        return jsonify({"error": "اسم الإمام مطلوب"}), 400
    imam = Imam(
        name=name, mosque_id=data.get("mosque_id"),
        audio_sample=data.get("audio_sample", "").strip() or None,
        youtube_link=data.get("youtube_link", "").strip() or None,
    )
    db.session.add(imam)
    db.session.commit()
    invalidate_caches()
    return jsonify({"id": imam.id}), 201


@admin_bp.route("/api/admin/imams/<int:imam_id>", methods=["PUT"])
@admin_or_moderator_required
def admin_update_imam(imam_id):
    imam = Imam.query.get(imam_id)
    if not imam:
        return jsonify({"error": "غير موجود"}), 404
    data = request.get_json() or {}
    if "name" in data:
        imam.name = data["name"].strip()
    if "mosque_id" in data:
        imam.mosque_id = data["mosque_id"]
    if "audio_sample" in data:
        imam.audio_sample = data["audio_sample"].strip() or None
    if "youtube_link" in data:
        imam.youtube_link = data["youtube_link"].strip() or None
    db.session.commit()
    invalidate_caches()
    return jsonify({"success": True})


@admin_bp.route("/api/admin/imams/<int:imam_id>", methods=["DELETE"])
@admin_or_moderator_required
def admin_delete_imam(imam_id):
    imam = Imam.query.get(imam_id)
    if not imam:
        return jsonify({"error": "غير موجود"}), 404
    db.session.delete(imam)
    db.session.commit()
    invalidate_caches()
    return jsonify({"success": True})


# --- Users ---
@admin_bp.route("/api/admin/users")
@admin_or_moderator_required
def admin_list_users():
    page = max(1, request.args.get("page", 1, type=int))
    per_page = min(200, max(1, request.args.get("per_page", 50, type=int)))
    search = request.args.get("search", "").strip()
    query = PublicUser.query
    if search:
        query = query.filter(
            db.or_(
                PublicUser.username.ilike(f"%{search}%"),
                PublicUser.display_name.ilike(f"%{search}%"),
                PublicUser.email.ilike(f"%{search}%"),
            )
        )
    query = query.order_by(PublicUser.id.desc())
    total = query.count()
    users = query.offset((page - 1) * per_page).limit(per_page).all()
    items = []
    for u in users:
        items.append({
            "id": u.id, "username": u.username,
            "display_name": u.display_name, "avatar_url": u.avatar_url,
            "email": u.email, "role": u.role,
            "contribution_points": u.contribution_points,
            "trust_level": u.trust_level,
            "created_at": u.created_at.isoformat() if u.created_at else None,
        })
    return jsonify({"items": items, "total": total, "page": page, "per_page": per_page})


@admin_bp.route("/api/admin/users/<int:user_id>/role", methods=["PUT"])
@admin_or_moderator_required
def admin_update_user_role(user_id):
    if g.current_public_user.role != "admin":
        return jsonify({"error": "Only admins can change roles"}), 403
    user = PublicUser.query.get(user_id)
    if not user:
        return jsonify({"error": "غير موجود"}), 404
    data = request.get_json() or {}
    new_role = data.get("role", "").strip()
    if new_role not in ("user", "moderator", "admin"):
        return jsonify({"error": "الدور غير صالح"}), 400
    user.role = new_role
    db.session.commit()
    invalidate_caches()
    return jsonify({"success": True})


@admin_bp.route("/api/admin/users/<int:user_id>/trust-level", methods=["PUT"])
@admin_or_moderator_required
def admin_update_trust_level(user_id):
    user = PublicUser.query.get(user_id)
    if not user:
        return jsonify({"error": "غير موجود"}), 404
    data = request.get_json() or {}
    new_level = data.get("trust_level", "").strip()
    if new_level not in ("default", "trusted", "not_trusted"):
        return jsonify({"error": "مستوى الثقة غير صالح"}), 400
    user.trust_level = new_level
    db.session.commit()
    return jsonify({"success": True})


# --- Audio Pipeline ---

@admin_bp.route("/api/admin/audio/extract", methods=["POST"])
@admin_or_moderator_required
@limiter.limit("10 per minute")
def admin_audio_extract():
    data = request.get_json() or {}
    url = data.get("url", "").strip()
    if not url:
        return jsonify({"error": "الرابط مطلوب"}), 400
    from urllib.parse import urlparse
    parsed = urlparse(url)
    allowed_domains = {"youtube.com", "www.youtube.com", "youtu.be", "twitter.com", "x.com", "www.x.com"}
    if parsed.hostname not in allowed_domains:
        return jsonify({"error": "الرابط غير مدعوم (يوتيوب أو تويتر فقط)"}), 400

    temp_id = uuid.uuid4().hex
    temp_dir = tempfile.gettempdir()
    output_path = os.path.join(temp_dir, f"admin_audio_{temp_id}.mp3")

    try:
        result = subprocess.run(
            ["yt-dlp", "-x", "--audio-format", "mp3", "--no-playlist",
             "--js-runtimes", "node",
             "--extractor-args", "youtube:player_client=web_creator,mediaconnect",
             "-o", output_path, url],
            capture_output=True, text=True, timeout=120,
        )
        if result.returncode != 0:
            return jsonify({"error": f"فشل استخراج الصوت: {result.stderr[:200]}"}), 400

        probe = subprocess.run(
            ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", output_path],
            capture_output=True, text=True, timeout=30,
        )
        duration_ms = int(float(probe.stdout.strip()) * 1000) if probe.stdout.strip() else 0
        return jsonify({"temp_id": temp_id, "duration_ms": duration_ms})
    except subprocess.TimeoutExpired:
        return jsonify({"error": "انتهت مهلة الاستخراج"}), 504
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route("/api/admin/audio/temp/<temp_id>")
@admin_or_moderator_required
def admin_audio_temp(temp_id):
    if not temp_id.isalnum():
        return jsonify({"error": "معرف غير صالح"}), 400
    temp_dir = tempfile.gettempdir()
    path = os.path.join(temp_dir, f"admin_audio_{temp_id}.mp3")
    if not os.path.exists(path):
        return jsonify({"error": "الملف غير موجود"}), 404
    return send_from_directory(temp_dir, f"admin_audio_{temp_id}.mp3", mimetype="audio/mpeg")


@admin_bp.route("/api/admin/audio/upload-file", methods=["POST"])
@admin_or_moderator_required
@limiter.limit("10 per minute")
def admin_audio_upload_file():
    MAX_AUDIO_SIZE = 50 * 1024 * 1024
    if request.content_length and request.content_length > MAX_AUDIO_SIZE:
        return jsonify({"error": "حجم الملف كبير جداً (الحد الأقصى 50 ميجابايت)"}), 413
    file = request.files.get("file")
    if not file or not file.filename:
        return jsonify({"error": "لم يتم اختيار ملف"}), 400
    allowed_ext = {".mp3", ".m4a", ".wav", ".ogg", ".webm", ".aac"}
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in allowed_ext:
        return jsonify({"error": f"نوع الملف غير مدعوم ({ext})"}), 400

    temp_id = uuid.uuid4().hex
    temp_dir = tempfile.gettempdir()
    output_path = os.path.join(temp_dir, f"admin_audio_{temp_id}.mp3")

    try:
        if ext == ".mp3":
            file.save(output_path)
        else:
            raw_path = os.path.join(temp_dir, f"admin_audio_{temp_id}_raw{ext}")
            file.save(raw_path)
            subprocess.run(
                ["ffmpeg", "-y", "-i", raw_path, "-vn", "-acodec", "libmp3lame",
                 "-q:a", "2", output_path],
                capture_output=True, text=True, timeout=120,
            )
            try:
                os.remove(raw_path)
            except OSError:
                pass

        probe = subprocess.run(
            ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", output_path],
            capture_output=True, text=True, timeout=30,
        )
        duration_ms = int(float(probe.stdout.strip()) * 1000) if probe.stdout.strip() else 0
        return jsonify({"temp_id": temp_id, "duration_ms": duration_ms})
    except subprocess.TimeoutExpired:
        return jsonify({"error": "انتهت مهلة التحويل"}), 504
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@admin_bp.route("/api/admin/audio/trim-upload", methods=["POST"])
@admin_or_moderator_required
def admin_audio_trim_upload():
    data = request.get_json() or {}
    temp_id = data.get("temp_id", "").strip()
    if not temp_id.isalnum():
        return jsonify({"error": "معرف غير صالح"}), 400
    start_ms = data.get("start_ms", 0)
    end_ms = data.get("end_ms")

    temp_dir = tempfile.gettempdir()
    source_path = os.path.join(temp_dir, f"admin_audio_{temp_id}.mp3")
    if not os.path.exists(source_path):
        return jsonify({"error": "الملف غير موجود"}), 404

    if end_ms is None:
        probe = subprocess.run(
            ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
             "-of", "default=noprint_wrappers=1:nokey=1", source_path],
            capture_output=True, text=True, timeout=30,
        )
        end_ms = int(float(probe.stdout.strip()) * 1000) if probe.stdout.strip() else 0

    start_sec = start_ms / 1000.0
    duration_sec = (end_ms - start_ms) / 1000.0
    if duration_sec <= 0:
        return jsonify({"error": "مدة غير صالحة"}), 400

    trimmed_path = source_path.replace(".mp3", "_trimmed.mp3")
    try:
        subprocess.run(
            ["ffmpeg", "-y", "-i", source_path,
             "-ss", str(start_sec), "-t", str(duration_sec),
             "-c", "copy", trimmed_path],
            capture_output=True, text=True, timeout=60,
        )
        bucket = os.environ.get("S3_BUCKET", "imams-riyadh-audio")
        filename = data.get("filename", "").strip()
        if filename:
            filename = re.sub(r'[^\w\-]', '', filename.replace(' ', '-').lower())
            key = f"audio/{filename}.mp3"
        else:
            key = f"audio/{uuid.uuid4().hex}.mp3"
        region = os.environ.get("AWS_REGION", "us-east-1")
        s3 = boto3.client(
            "s3",
            aws_access_key_id=os.environ.get("AWS_ACCESS_KEY_ID"),
            aws_secret_access_key=os.environ.get("AWS_SECRET_ACCESS_KEY"),
            region_name=region,
        )
        with open(trimmed_path, "rb") as f:
            s3.upload_fileobj(
                f, bucket, key,
                ExtraArgs={"ContentType": "audio/mpeg"},
            )
        s3_url = f"https://{bucket}.s3.{region}.amazonaws.com/{key}"
        return jsonify({"s3_url": s3_url})
    except subprocess.TimeoutExpired:
        return jsonify({"error": "انتهت مهلة القص"}), 504
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        for p in [source_path, trimmed_path]:
            try:
                if os.path.exists(p):
                    os.remove(p)
            except OSError:
                pass
