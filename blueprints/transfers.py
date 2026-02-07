"""Legacy transfer routes + imam search: /api/imams/search, /api/transfers/*, /api/admin/transfers/*"""

import datetime

from flask import Blueprint, jsonify, request, g
from flask_login import current_user, login_required

from auth_utils import firebase_auth_required, admin_or_moderator_required
from extensions import limiter
from models import Imam, ImamTransferRequest, Mosque, PublicUser, db
from services.cache import invalidate_caches
from services.search import get_imam_index, score_imam
from utils import normalize_arabic

transfers_bp = Blueprint("transfers", __name__)


def _strip_prefixes(text):
    text = text.strip()
    for prefix in ['الشيخ ', 'شيخ ', 'الامام ', 'امام ']:
        if text.startswith(prefix):
            text = text[len(prefix):].strip()
            break
    words = text.split()
    stripped = []
    for w in words:
        stripped.append(w[2:] if w.startswith('ال') and len(w) > 2 else w)
    return ' '.join(stripped)


@transfers_bp.route("/api/imams/search")
@limiter.limit("30 per minute")
def search_imams():
    q = request.args.get("q", "").strip()
    if not q:
        return jsonify([])
    q_norm = normalize_arabic(q)
    q_stripped = _strip_prefixes(q_norm)
    if not q_stripped:
        return jsonify([])
    q_words = q_norm.split()
    q_stripped_words = q_stripped.split()

    index = get_imam_index()
    scored = []
    for entry in index:
        s = score_imam(q_norm, q_stripped, q_words, q_stripped_words, entry)
        if s > 0:
            scored.append((s, entry))
    scored.sort(key=lambda x: -x[0])
    return jsonify([{
        "id": e['imam'].id,
        "name": e['imam'].name,
        "mosque_name": e['mosque'].name if e['mosque'] else None,
        "mosque_id": e['imam'].mosque_id,
    } for _, e in scored[:15]])


@transfers_bp.route("/api/transfers", methods=["POST"])
@limiter.limit("10 per minute")
@firebase_auth_required
def submit_transfer():
    user = g.current_public_user
    if not user:
        return jsonify({"error": "Not registered"}), 401
    data = request.get_json() or {}
    mosque_id = data.get("mosque_id")
    if not mosque_id or not Mosque.query.get(mosque_id):
        return jsonify({"error": "مسجد غير صالح"}), 400
    existing = ImamTransferRequest.query.filter_by(
        submitter_id=user.id, mosque_id=mosque_id, status="pending"
    ).first()
    if existing:
        return jsonify({"error": "لديك بلاغ معلق لهذا المسجد"}), 409
    current_imam = Imam.query.filter_by(mosque_id=mosque_id).first()
    new_imam_id = data.get("new_imam_id")
    new_imam_name = data.get("new_imam_name", "").strip() if data.get("new_imam_name") else None
    if not new_imam_id and not new_imam_name:
        return jsonify({"error": "يجب تحديد الإمام الجديد"}), 400
    tr = ImamTransferRequest(
        submitter_id=user.id,
        mosque_id=mosque_id,
        current_imam_id=current_imam.id if current_imam else None,
        new_imam_id=new_imam_id if new_imam_id else None,
        new_imam_name=new_imam_name,
        notes=data.get("notes", "").strip() or None,
    )
    db.session.add(tr)
    db.session.commit()
    return jsonify({"id": tr.id, "status": tr.status}), 201


@transfers_bp.route("/api/transfers/<int:transfer_id>", methods=["DELETE"])
@firebase_auth_required
def cancel_transfer(transfer_id):
    user = g.current_public_user
    if not user:
        return jsonify({"error": "Not registered"}), 401
    tr = ImamTransferRequest.query.get(transfer_id)
    if not tr or tr.submitter_id != user.id:
        return jsonify({"error": "غير موجود"}), 404
    if tr.status != "pending":
        return jsonify({"error": "لا يمكن إلغاء بلاغ تمت مراجعته"}), 400
    db.session.delete(tr)
    db.session.commit()
    return jsonify({"success": True})


@transfers_bp.route("/api/user/transfers")
@firebase_auth_required
def user_transfers():
    user = g.current_public_user
    if not user:
        return jsonify({"error": "Not registered"}), 401
    transfers = ImamTransferRequest.query.filter_by(submitter_id=user.id).order_by(ImamTransferRequest.created_at.desc()).all()
    result = []
    for tr in transfers:
        mosque = Mosque.query.get(tr.mosque_id)
        result.append({
            "id": tr.id,
            "mosque_id": tr.mosque_id,
            "mosque_name": mosque.name if mosque else None,
            "current_imam_name": tr.current_imam.name if tr.current_imam else None,
            "new_imam_name": tr.new_imam.name if tr.new_imam else (tr.new_imam_name or None),
            "notes": tr.notes,
            "status": tr.status,
            "reject_reason": tr.reject_reason,
            "created_at": tr.created_at.isoformat(),
            "reviewed_at": tr.reviewed_at.isoformat() if tr.reviewed_at else None,
        })
    return jsonify(result)


# --- Legacy login-required transfer approval ---
@transfers_bp.route("/api/transfers/<int:transfer_id>/approve", methods=["POST"])
@login_required
def approve_transfer(transfer_id):
    tr = ImamTransferRequest.query.get_or_404(transfer_id)
    if tr.status != "pending":
        return jsonify({"error": "Already reviewed"}), 400
    mosque = Mosque.query.get(tr.mosque_id)
    old_imam = Imam.query.filter_by(mosque_id=mosque.id).first()
    if old_imam:
        old_imam.mosque_id = None
    if tr.new_imam_id:
        new_imam = Imam.query.get(tr.new_imam_id)
        if new_imam:
            new_imam.mosque_id = mosque.id
    elif tr.new_imam_name:
        new_imam = Imam(name=tr.new_imam_name, mosque_id=mosque.id)
        db.session.add(new_imam)
    submitter = PublicUser.query.get(tr.submitter_id)
    if submitter:
        db.session.execute(
            db.text("UPDATE public_user SET contribution_points = contribution_points + 1 WHERE id = :uid"),
            {"uid": submitter.id}
        )
    tr.status = "approved"
    tr.reviewed_at = datetime.datetime.utcnow()
    tr.reviewed_by = current_user.id
    db.session.commit()
    invalidate_caches()
    return jsonify({"success": True})


@transfers_bp.route("/api/transfers/<int:transfer_id>/reject", methods=["POST"])
@login_required
def reject_transfer(transfer_id):
    tr = ImamTransferRequest.query.get_or_404(transfer_id)
    if tr.status != "pending":
        return jsonify({"error": "Already reviewed"}), 400
    data = request.get_json() or {}
    tr.status = "rejected"
    tr.reject_reason = data.get("reason", "").strip() or None
    tr.reviewed_at = datetime.datetime.utcnow()
    tr.reviewed_by = current_user.id
    db.session.commit()
    return jsonify({"success": True})


# --- Admin API transfer routes ---
@transfers_bp.route("/api/admin/transfers")
@admin_or_moderator_required
def admin_list_transfers():
    page = max(1, request.args.get("page", 1, type=int))
    per_page = min(200, max(1, request.args.get("per_page", 50, type=int)))
    status_filter = request.args.get("status", "").strip()

    query = ImamTransferRequest.query
    if status_filter:
        query = query.filter(ImamTransferRequest.status == status_filter)
    query = query.order_by(ImamTransferRequest.created_at.desc())
    total = query.count()
    transfers = query.offset((page - 1) * per_page).limit(per_page).all()
    items = []
    for tr in transfers:
        mosque = Mosque.query.get(tr.mosque_id)
        submitter = PublicUser.query.get(tr.submitter_id)
        items.append({
            "id": tr.id,
            "submitter_name": submitter.display_name or submitter.username if submitter else None,
            "mosque_id": tr.mosque_id,
            "mosque_name": mosque.name if mosque else None,
            "current_imam_name": tr.current_imam.name if tr.current_imam else None,
            "new_imam_name": tr.new_imam.name if tr.new_imam else (tr.new_imam_name or None),
            "notes": tr.notes,
            "status": tr.status,
            "reject_reason": tr.reject_reason,
            "created_at": tr.created_at.isoformat(),
            "reviewed_at": tr.reviewed_at.isoformat() if tr.reviewed_at else None,
        })
    return jsonify({"items": items, "total": total, "page": page, "per_page": per_page})


@transfers_bp.route("/api/admin/transfers/<int:transfer_id>/approve", methods=["POST"])
@admin_or_moderator_required
def admin_approve_transfer(transfer_id):
    tr = ImamTransferRequest.query.get(transfer_id)
    if not tr:
        return jsonify({"error": "غير موجود"}), 404
    if tr.status != "pending":
        return jsonify({"error": "تمت المراجعة مسبقاً"}), 400
    mosque = Mosque.query.get(tr.mosque_id)
    if not mosque:
        return jsonify({"error": "المسجد المرتبط غير موجود"}), 400
    old_imam = Imam.query.filter_by(mosque_id=mosque.id).first()
    if old_imam:
        old_imam.mosque_id = None
    if tr.new_imam_id:
        new_imam = Imam.query.get(tr.new_imam_id)
        if new_imam:
            new_imam.mosque_id = mosque.id
    elif tr.new_imam_name:
        new_imam = Imam(name=tr.new_imam_name, mosque_id=mosque.id)
        db.session.add(new_imam)
    submitter = PublicUser.query.get(tr.submitter_id)
    if submitter:
        db.session.execute(
            db.text("UPDATE public_user SET contribution_points = contribution_points + 1 WHERE id = :uid"),
            {"uid": submitter.id}
        )
    tr.status = "approved"
    tr.reviewed_at = datetime.datetime.utcnow()
    db.session.commit()
    invalidate_caches()
    return jsonify({"success": True})


@transfers_bp.route("/api/admin/transfers/<int:transfer_id>/reject", methods=["POST"])
@admin_or_moderator_required
def admin_reject_transfer(transfer_id):
    tr = ImamTransferRequest.query.get(transfer_id)
    if not tr:
        return jsonify({"error": "غير موجود"}), 404
    if tr.status != "pending":
        return jsonify({"error": "تمت المراجعة مسبقاً"}), 400
    data = request.get_json() or {}
    tr.status = "rejected"
    tr.reject_reason = data.get("reason", "").strip() or None
    tr.reviewed_at = datetime.datetime.utcnow()
    db.session.commit()
    invalidate_caches()
    return jsonify({"success": True})
