"""Community request routes: /api/requests/* (public) + /api/admin/requests/* (admin review)"""

import datetime

from flask import Blueprint, jsonify, request, g

from auth_utils import firebase_auth_required, admin_or_moderator_required
from extensions import limiter
from models import CommunityRequest, Imam, Mosque, PublicUser, db
from services.cache import invalidate_caches
from services.validation import is_arabic_text, sanitize_text
from utils import normalize_arabic

requests_bp = Blueprint("requests", __name__)


# --- Public routes ---

@requests_bp.route("/api/requests", methods=["POST"])
@limiter.limit("10 per minute")
@firebase_auth_required
def submit_request():
    user = g.current_public_user
    if not user:
        return jsonify({"error": "Not registered"}), 401
    data = request.get_json() or {}
    request_type = data.get("request_type", "").strip()
    if request_type not in ("new_mosque", "new_imam", "imam_transfer"):
        return jsonify({"error": "نوع الطلب غير صالح"}), 400

    cr = CommunityRequest(submitter_id=user.id, request_type=request_type)

    if request_type == "new_mosque":
        mosque_name = sanitize_text(data.get("mosque_name", ""))
        if not mosque_name:
            return jsonify({"error": "اسم المسجد مطلوب"}), 400
        if not is_arabic_text(mosque_name):
            return jsonify({"error": "اسم المسجد يجب أن يكون بالعربية فقط"}), 400
        cr.mosque_name = mosque_name
        cr.mosque_location = sanitize_text(data.get("mosque_location", "")) or None
        cr.mosque_area = data.get("mosque_area", "").strip() or None
        if cr.mosque_area and cr.mosque_area not in ("شمال", "جنوب", "شرق", "غرب"):
            return jsonify({"error": "المنطقة غير صالحة"}), 400
        cr.mosque_map_link = data.get("mosque_map_link", "").strip() or None
        imam_source = data.get("imam_source", "").strip()
        if imam_source == "existing":
            existing_imam_id = data.get("existing_imam_id")
            if existing_imam_id and Imam.query.get(existing_imam_id):
                cr.imam_source = "existing"
                cr.existing_imam_id = existing_imam_id
        else:
            imam_name = sanitize_text(data.get("imam_name", ""))
            if imam_name:
                if not is_arabic_text(imam_name):
                    return jsonify({"error": "اسم الإمام يجب أن يكون بالعربية فقط"}), 400
                cr.imam_source = "new"
                cr.imam_name = imam_name
                cr.imam_youtube_link = data.get("imam_youtube_link", "").strip() or None
                cr.imam_audio_url = data.get("imam_audio_url", "").strip() or None

    elif request_type == "new_imam":
        target_mosque_id = data.get("target_mosque_id")
        if not target_mosque_id or not Mosque.query.get(target_mosque_id):
            return jsonify({"error": "المسجد مطلوب"}), 400
        cr.target_mosque_id = target_mosque_id
        imam_source = data.get("imam_source", "").strip()
        if imam_source not in ("existing", "new"):
            return jsonify({"error": "مصدر الإمام غير صالح"}), 400
        cr.imam_source = imam_source
        if imam_source == "existing":
            existing_imam_id = data.get("existing_imam_id")
            if not existing_imam_id or not Imam.query.get(existing_imam_id):
                return jsonify({"error": "الإمام غير موجود"}), 400
            cr.existing_imam_id = existing_imam_id
        else:
            imam_name = sanitize_text(data.get("imam_name", ""))
            if not imam_name:
                return jsonify({"error": "اسم الإمام مطلوب"}), 400
            if not is_arabic_text(imam_name):
                return jsonify({"error": "اسم الإمام يجب أن يكون بالعربية فقط"}), 400
            cr.imam_name = imam_name
            cr.imam_youtube_link = data.get("imam_youtube_link", "").strip() or None
            cr.imam_audio_url = data.get("imam_audio_url", "").strip() or None

    elif request_type == "imam_transfer":
        target_mosque_id = data.get("target_mosque_id")
        if not target_mosque_id or not Mosque.query.get(target_mosque_id):
            return jsonify({"error": "المسجد مطلوب"}), 400
        cr.target_mosque_id = target_mosque_id
        imam_source = data.get("imam_source", "").strip()
        if imam_source not in ("existing", "new"):
            return jsonify({"error": "مصدر الإمام غير صالح"}), 400
        cr.imam_source = imam_source
        if imam_source == "existing":
            existing_imam_id = data.get("existing_imam_id")
            if not existing_imam_id or not Imam.query.get(existing_imam_id):
                return jsonify({"error": "الإمام غير موجود"}), 400
            cr.existing_imam_id = existing_imam_id
        else:
            imam_name = sanitize_text(data.get("imam_name", ""))
            if not imam_name:
                return jsonify({"error": "اسم الإمام مطلوب"}), 400
            if not is_arabic_text(imam_name):
                return jsonify({"error": "اسم الإمام يجب أن يكون بالعربية فقط"}), 400
            cr.imam_name = imam_name
            cr.imam_youtube_link = data.get("imam_youtube_link", "").strip() or None
            cr.imam_audio_url = data.get("imam_audio_url", "").strip() or None

    cr.notes = sanitize_text(data.get("notes", ""))[:500] or None

    dup_query = CommunityRequest.query.filter_by(
        submitter_id=user.id, request_type=request_type, status="pending"
    )
    if request_type == "new_mosque" and cr.mosque_name:
        dup_query = dup_query.filter_by(mosque_name=cr.mosque_name)
    elif request_type in ("new_imam", "imam_transfer") and cr.target_mosque_id:
        dup_query = dup_query.filter_by(target_mosque_id=cr.target_mosque_id)
    if dup_query.first():
        return jsonify({"error": "لديك طلب معلق مشابه"}), 409

    db.session.add(cr)
    db.session.commit()
    return jsonify({"id": cr.id, "status": cr.status}), 201


@requests_bp.route("/api/requests/my")
@firebase_auth_required
def my_requests():
    user = g.current_public_user
    if not user:
        return jsonify({"error": "Not registered"}), 401
    requests_list = CommunityRequest.query.filter_by(
        submitter_id=user.id
    ).order_by(CommunityRequest.created_at.desc()).all()
    result = []
    for cr in requests_list:
        item = {
            "id": cr.id,
            "request_type": cr.request_type,
            "status": cr.status,
            "reject_reason": cr.reject_reason,
            "notes": cr.notes,
            "created_at": cr.created_at.isoformat() if cr.created_at else None,
            "reviewed_at": cr.reviewed_at.isoformat() if cr.reviewed_at else None,
        }
        if cr.status == "needs_info" and cr.admin_notes:
            item["admin_notes"] = cr.admin_notes
        if cr.request_type == "new_mosque":
            item["mosque_name"] = cr.mosque_name
            item["mosque_area"] = cr.mosque_area
            item["mosque_location"] = cr.mosque_location
            item["imam_name"] = cr.imam_name
        elif cr.request_type in ("new_imam", "imam_transfer"):
            mosque = Mosque.query.get(cr.target_mosque_id) if cr.target_mosque_id else None
            item["target_mosque_name"] = mosque.name if mosque else None
            item["target_mosque_id"] = cr.target_mosque_id
            if cr.imam_source == "existing" and cr.existing_imam_id:
                imam = Imam.query.get(cr.existing_imam_id)
                item["imam_name"] = imam.name if imam else None
            else:
                item["imam_name"] = cr.imam_name
            item["imam_source"] = cr.imam_source
        result.append(item)
    return jsonify(result)


@requests_bp.route("/api/requests/<int:request_id>", methods=["DELETE"])
@firebase_auth_required
def cancel_request(request_id):
    user = g.current_public_user
    if not user:
        return jsonify({"error": "Not registered"}), 401
    cr = CommunityRequest.query.get(request_id)
    if not cr or cr.submitter_id != user.id:
        return jsonify({"error": "غير موجود"}), 404
    if cr.status not in ("pending", "needs_info"):
        return jsonify({"error": "لا يمكن إلغاء طلب تمت مراجعته"}), 400
    db.session.delete(cr)
    db.session.commit()
    return jsonify({"success": True})


@requests_bp.route("/api/requests/check-duplicate")
@firebase_auth_required
def check_duplicate_request():
    check_type = request.args.get("type", "").strip()
    query_str = request.args.get("q", "").strip()
    if not query_str or len(query_str) < 3:
        return jsonify({"matches": []})

    normalized_query = normalize_arabic(query_str)
    matches = []
    if check_type == "mosque":
        all_mosques = Mosque.query.all()
        for m in all_mosques:
            if normalized_query in normalize_arabic(m.name):
                matches.append({"id": m.id, "name": m.name, "area": m.area, "location": m.location})
                if len(matches) >= 5:
                    break
    elif check_type == "imam":
        all_imams = Imam.query.all()
        for i in all_imams:
            if normalized_query in normalize_arabic(i.name):
                matches.append({
                    "id": i.id,
                    "name": i.name,
                    "mosque_id": i.mosque_id,
                    "mosque_name": i.mosque.name if i.mosque else None,
                })
                if len(matches) >= 5:
                    break
    return jsonify({"matches": matches})


# --- Admin routes ---

@requests_bp.route("/api/admin/requests")
@admin_or_moderator_required
def admin_list_requests():
    page = max(1, request.args.get("page", 1, type=int))
    per_page = min(200, max(1, request.args.get("per_page", 50, type=int)))
    status_filter = request.args.get("status", "").strip()
    type_filter = request.args.get("type", "").strip()

    query = CommunityRequest.query
    if status_filter:
        query = query.filter(CommunityRequest.status == status_filter)
    if type_filter:
        query = query.filter(CommunityRequest.request_type == type_filter)
    query = query.outerjoin(PublicUser, CommunityRequest.submitter_id == PublicUser.id).order_by(
        db.case(
            (PublicUser.trust_level == "trusted", 0),
            (PublicUser.trust_level == "default", 1),
            else_=2,
        ),
        CommunityRequest.created_at.desc(),
    )
    total = query.count()
    items_raw = query.offset((page - 1) * per_page).limit(per_page).all()
    items = []
    for cr in items_raw:
        submitter = PublicUser.query.get(cr.submitter_id)
        item = {
            "id": cr.id,
            "request_type": cr.request_type,
            "status": cr.status,
            "notes": cr.notes,
            "reject_reason": cr.reject_reason,
            "admin_notes": cr.admin_notes,
            "created_at": cr.created_at.isoformat() if cr.created_at else None,
            "reviewed_at": cr.reviewed_at.isoformat() if cr.reviewed_at else None,
            "submitter_name": submitter.display_name or submitter.username if submitter else None,
            "submitter_id": cr.submitter_id,
            "submitter_trust_level": submitter.trust_level if submitter else "default",
            "duplicate_of": cr.duplicate_of,
        }
        if cr.request_type == "new_mosque":
            item["mosque_name"] = cr.mosque_name
            item["mosque_area"] = cr.mosque_area
            item["mosque_location"] = cr.mosque_location
            item["mosque_map_link"] = cr.mosque_map_link
            item["imam_name"] = cr.imam_name
            item["imam_youtube_link"] = cr.imam_youtube_link
            item["imam_audio_url"] = cr.imam_audio_url
        elif cr.request_type in ("new_imam", "imam_transfer"):
            mosque = Mosque.query.get(cr.target_mosque_id) if cr.target_mosque_id else None
            item["target_mosque_id"] = cr.target_mosque_id
            item["target_mosque_name"] = mosque.name if mosque else None
            item["imam_source"] = cr.imam_source
            if cr.imam_source == "existing" and cr.existing_imam_id:
                imam = Imam.query.get(cr.existing_imam_id)
                item["imam_name"] = imam.name if imam else None
                item["existing_imam_id"] = cr.existing_imam_id
            else:
                item["imam_name"] = cr.imam_name
                item["imam_youtube_link"] = cr.imam_youtube_link
                item["imam_audio_url"] = cr.imam_audio_url
        items.append(item)
    return jsonify({"items": items, "total": total, "page": page, "per_page": per_page})


@requests_bp.route("/api/admin/requests/<int:request_id>")
@admin_or_moderator_required
def admin_get_request(request_id):
    cr = CommunityRequest.query.get(request_id)
    if not cr:
        return jsonify({"error": "غير موجود"}), 404
    submitter = PublicUser.query.get(cr.submitter_id)
    item = {
        "id": cr.id,
        "request_type": cr.request_type,
        "status": cr.status,
        "notes": cr.notes,
        "reject_reason": cr.reject_reason,
        "admin_notes": cr.admin_notes,
        "created_at": cr.created_at.isoformat() if cr.created_at else None,
        "reviewed_at": cr.reviewed_at.isoformat() if cr.reviewed_at else None,
        "submitter_name": submitter.display_name or submitter.username if submitter else None,
        "submitter_id": cr.submitter_id,
        "submitter_trust_level": submitter.trust_level if submitter else "default",
        "mosque_name": cr.mosque_name,
        "mosque_area": cr.mosque_area,
        "mosque_location": cr.mosque_location,
        "mosque_map_link": cr.mosque_map_link,
        "imam_name": cr.imam_name,
        "imam_youtube_link": cr.imam_youtube_link,
        "imam_audio_url": cr.imam_audio_url,
        "imam_source": cr.imam_source,
        "existing_imam_id": cr.existing_imam_id,
        "target_mosque_id": cr.target_mosque_id,
        "duplicate_of": cr.duplicate_of,
    }
    if cr.target_mosque_id:
        mosque = Mosque.query.get(cr.target_mosque_id)
        item["target_mosque_name"] = mosque.name if mosque else None
        if mosque:
            current_imam = Imam.query.filter_by(mosque_id=mosque.id).first()
            item["current_mosque_imam"] = current_imam.name if current_imam else None
    if cr.existing_imam_id:
        imam = Imam.query.get(cr.existing_imam_id)
        item["existing_imam_name"] = imam.name if imam else None
        if imam and imam.mosque_id:
            source_mosque = Mosque.query.get(imam.mosque_id)
            item["imam_current_mosque_name"] = source_mosque.name if source_mosque else None
    return jsonify(item)


@requests_bp.route("/api/admin/requests/<int:request_id>/approve", methods=["POST"])
@admin_or_moderator_required
def admin_approve_request(request_id):
    cr = CommunityRequest.query.get(request_id)
    if not cr:
        return jsonify({"error": "غير موجود"}), 404
    if cr.status not in ("pending", "needs_info"):
        return jsonify({"error": "تمت المراجعة مسبقاً"}), 400
    data = request.get_json() or {}

    if cr.request_type == "new_mosque":
        mosque_name = data.get("mosque_name", cr.mosque_name or "").strip()
        mosque_area = data.get("mosque_area", cr.mosque_area or "").strip()
        mosque_location = data.get("mosque_location", cr.mosque_location or "").strip()
        mosque_map_link = data.get("mosque_map_link", cr.mosque_map_link or "").strip()
        if not mosque_name or not mosque_area or not mosque_location:
            return jsonify({"error": "اسم المسجد والمنطقة والحي مطلوبة"}), 400
        new_mosque = Mosque(
            name=mosque_name,
            area=mosque_area,
            location=mosque_location,
            map_link=mosque_map_link or None,
            latitude=data.get("latitude"),
            longitude=data.get("longitude"),
        )
        db.session.add(new_mosque)
        db.session.flush()
        if cr.imam_source == "existing" and cr.existing_imam_id:
            imam = Imam.query.get(cr.existing_imam_id)
            if imam:
                imam.mosque_id = new_mosque.id
        else:
            imam_name = data.get("imam_name", cr.imam_name or "").strip()
            if imam_name:
                new_imam = Imam(
                    name=imam_name,
                    mosque_id=new_mosque.id,
                    youtube_link=data.get("imam_youtube_link", cr.imam_youtube_link or "").strip() or None,
                    audio_sample=data.get("audio_sample", cr.imam_audio_url or "").strip() or None,
                )
                db.session.add(new_imam)

    elif cr.request_type == "new_imam":
        if not cr.target_mosque_id:
            return jsonify({"error": "المسجد المستهدف غير محدد"}), 400
        mosque = Mosque.query.get(cr.target_mosque_id)
        if not mosque:
            return jsonify({"error": "المسجد غير موجود"}), 400
        old_imam = Imam.query.filter_by(mosque_id=mosque.id).first()
        if old_imam:
            old_imam.mosque_id = None
        if cr.imam_source == "existing" and cr.existing_imam_id:
            imam = Imam.query.get(cr.existing_imam_id)
            if imam:
                imam.mosque_id = mosque.id
        else:
            imam_name = data.get("imam_name", cr.imam_name or "").strip()
            if not imam_name:
                return jsonify({"error": "اسم الإمام مطلوب"}), 400
            new_imam = Imam(
                name=imam_name,
                mosque_id=mosque.id,
                youtube_link=data.get("imam_youtube_link", cr.imam_youtube_link or "").strip() or None,
                audio_sample=data.get("audio_sample", cr.imam_audio_url or "").strip() or None,
            )
            db.session.add(new_imam)

    elif cr.request_type == "imam_transfer":
        if not cr.target_mosque_id:
            return jsonify({"error": "المسجد المستهدف غير محدد"}), 400
        mosque = Mosque.query.get(cr.target_mosque_id)
        if not mosque:
            return jsonify({"error": "المسجد غير موجود"}), 400
        old_imam = Imam.query.filter_by(mosque_id=mosque.id).first()
        if old_imam:
            old_imam.mosque_id = None
        if cr.imam_source == "existing" and cr.existing_imam_id:
            imam = Imam.query.get(cr.existing_imam_id)
            if imam:
                imam.mosque_id = mosque.id
        else:
            imam_name = data.get("imam_name", cr.imam_name or "").strip()
            if not imam_name:
                return jsonify({"error": "اسم الإمام مطلوب"}), 400
            new_imam = Imam(
                name=imam_name,
                mosque_id=mosque.id,
                youtube_link=data.get("imam_youtube_link", cr.imam_youtube_link or "").strip() or None,
                audio_sample=data.get("audio_sample", cr.imam_audio_url or "").strip() or None,
            )
            db.session.add(new_imam)

    submitter = PublicUser.query.get(cr.submitter_id)
    if submitter:
        db.session.execute(
            db.text("UPDATE public_user SET contribution_points = contribution_points + 1 WHERE id = :uid"),
            {"uid": submitter.id}
        )
        approved_count = CommunityRequest.query.filter_by(
            submitter_id=submitter.id, status="approved"
        ).count()
        if approved_count >= 2 and submitter.trust_level == "default":
            submitter.trust_level = "trusted"

    cr.status = "approved"
    cr.admin_notes = data.get("admin_notes", "").strip() or cr.admin_notes
    cr.reviewed_at = datetime.datetime.utcnow()
    cr.reviewed_by = g.current_public_user.id
    db.session.commit()
    invalidate_caches()
    return jsonify({"success": True})


@requests_bp.route("/api/admin/requests/<int:request_id>/reject", methods=["POST"])
@admin_or_moderator_required
def admin_reject_request(request_id):
    cr = CommunityRequest.query.get(request_id)
    if not cr:
        return jsonify({"error": "غير موجود"}), 404
    if cr.status not in ("pending", "needs_info"):
        return jsonify({"error": "تمت المراجعة مسبقاً"}), 400
    data = request.get_json() or {}
    cr.status = "rejected"
    cr.reject_reason = data.get("reason", "").strip() or None
    cr.admin_notes = data.get("admin_notes", "").strip() or cr.admin_notes
    cr.reviewed_at = datetime.datetime.utcnow()
    cr.reviewed_by = g.current_public_user.id
    db.session.commit()
    return jsonify({"success": True})


@requests_bp.route("/api/admin/requests/<int:request_id>/needs-info", methods=["POST"])
@admin_or_moderator_required
def admin_needs_info_request(request_id):
    cr = CommunityRequest.query.get(request_id)
    if not cr:
        return jsonify({"error": "غير موجود"}), 404
    if cr.status != "pending":
        return jsonify({"error": "لا يمكن طلب معلومات إضافية لهذا الطلب"}), 400
    data = request.get_json() or {}
    cr.status = "needs_info"
    cr.admin_notes = data.get("admin_notes", "").strip() or None
    cr.reviewed_by = g.current_public_user.id
    db.session.commit()
    return jsonify({"success": True})
