"""Legacy Flask-Admin views, /login, /logout, /admin/upload-audio, /admin/mosque/swap-imam"""

import os

from flask import Blueprint, jsonify, redirect, render_template, request, url_for
from flask_admin import Admin, AdminIndexView, expose
from flask_admin.actions import action
from flask_admin.contrib.sqla import ModelView
from flask_login import current_user, login_required, login_user, logout_user
from markupsafe import Markup
from wtforms import StringField
from wtforms_sqlalchemy.fields import QuerySelectField

from extensions import limiter
from models import Imam, ImamTransferRequest, Mosque, PublicUser, User, db
from services.audio import upload_audio_to_s3
from services.cache import invalidate_caches

import datetime

legacy_bp = Blueprint("legacy", __name__)


# --- authentication routes ---
@legacy_bp.route("/login", methods=["GET", "POST"])
@limiter.limit("5 per minute")
def login():
    if request.method == "POST":
        username = request.form["username"]
        password = request.form["password"]
        print(f"login attempt for user: {username}")
        user = User.query.filter_by(username=username).first()
        if user and user.check_password(password):
            login_user(user)
            print(f"login successful for user: {username}")
            return redirect(url_for("admin.index"))
        else:
            print(f"login failed for user: {username}")
    return render_template("login.html")


@legacy_bp.route("/logout")
@login_required
def logout():
    logout_user()
    return redirect(url_for("spa.index"))


@legacy_bp.route("/admin/upload-audio", methods=["POST"])
@login_required
def upload_audio():
    file = request.files.get("file")
    if not file or not file.filename:
        return jsonify({"error": "لم يتم اختيار ملف"}), 400
    try:
        url = upload_audio_to_s3(file)
        return jsonify({"url": url})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@legacy_bp.route("/admin/mosque/swap-imam/<int:mosque_id>", methods=["GET", "POST"])
@login_required
def swap_imam_view(mosque_id):
    mosque = Mosque.query.get_or_404(mosque_id)
    current_imam = Imam.query.filter_by(mosque_id=mosque.id).first()
    other_imams = Imam.query.filter(Imam.mosque_id != mosque.id).order_by(Imam.name).all()
    unassigned_imams = Imam.query.filter(Imam.mosque_id.is_(None)).order_by(Imam.name).all()
    available_imams = other_imams + unassigned_imams

    if request.method == "POST":
        new_imam_source = request.form.get("new_imam_source", "new")
        if new_imam_source == "existing":
            incoming_imam_id = request.form.get("existing_imam_id", type=int)
            incoming_imam = Imam.query.get(incoming_imam_id) if incoming_imam_id else None
            if incoming_imam:
                source_mosque_id = incoming_imam.mosque_id
                incoming_imam.mosque_id = mosque.id
        else:
            incoming_imam = None
            source_mosque_id = None

        if current_imam:
            old_action = request.form.get("old_imam_action", "unassign")
            if old_action == "transfer":
                transfer_id = request.form.get("transfer_mosque_id", type=int)
                if transfer_id:
                    current_imam.mosque_id = transfer_id
            elif old_action == "swap" and source_mosque_id:
                current_imam.mosque_id = source_mosque_id
            elif old_action == "delete":
                db.session.delete(current_imam)
            else:
                current_imam.mosque_id = None

        if new_imam_source == "new":
            new_name = request.form.get("new_imam_name", "").strip()
            if new_name:
                new_imam = Imam(
                    name=new_name,
                    mosque_id=mosque.id,
                    audio_sample=request.form.get("new_imam_audio", "").strip() or None,
                    youtube_link=request.form.get("new_imam_youtube", "").strip() or None,
                )
                db.session.add(new_imam)

        db.session.commit()
        invalidate_caches()
        return redirect(url_for("mosque.index_view"))

    mosques = Mosque.query.order_by(Mosque.name).all()
    return render_template(
        "admin/swap_imam.html",
        mosque=mosque,
        current_imam=current_imam,
        mosques=mosques,
        available_imams=available_imams,
        admin_base_template="admin/base.html",
    )


# --- Flask-Admin views ---

class MyAdminIndexView(AdminIndexView):
    @expose("/")
    @login_required
    def index(self):
        return super(MyAdminIndexView, self).index()


class BaseModelView(ModelView):
    def is_accessible(self):
        return current_user.is_authenticated

    def inaccessible_callback(self, name, **kwargs):
        return redirect(url_for("legacy.login"))


def _imam_name_formatter(view, context, model, name):
    imam = Imam.query.filter_by(mosque_id=model.id).first()
    return imam.name if imam else "—"


def _map_link_formatter(view, context, model, name):
    if model.map_link:
        from markupsafe import escape
        safe_url = escape(model.map_link)
        short = model.map_link[:40] + "..." if len(model.map_link) > 40 else model.map_link
        safe_short = escape(short)
        return Markup(f'<a href="{safe_url}" target="_blank">{safe_short}</a>')
    return "—"


def _swap_imam_formatter(view, context, model, name):
    swap_url = url_for("legacy.swap_imam_view", mosque_id=model.id)
    return Markup(f'<a href="{swap_url}" class="btn btn-xs btn-warning">تبديل الإمام</a>')


class MosqueModelView(BaseModelView):
    column_list = ["name", "imam", "area", "location", "map_link", "actions"]
    column_labels = {
        "name": "المسجد", "imam": "الإمام", "area": "المنطقة",
        "location": "الموقع", "map_link": "الخريطة", "actions": "",
    }
    can_view_details = True
    column_searchable_list = ["name", "location", "area"]
    column_filters = ["area"]
    column_default_sort = ("name", False)
    page_size = 50
    can_export = True
    column_formatters = {
        "imam": _imam_name_formatter,
        "map_link": _map_link_formatter,
        "actions": _swap_imam_formatter,
    }
    form_columns = ["name", "location", "area", "map_link", "latitude", "longitude",
                     "imam_name", "imam_audio", "imam_youtube"]
    form_args = {
        "name": {"label": "اسم المسجد"}, "location": {"label": "الموقع"},
        "area": {"label": "المنطقة"}, "map_link": {"label": "رابط الخريطة"},
        "latitude": {"label": "خط العرض"}, "longitude": {"label": "خط الطول"},
    }
    form_extra_fields = {
        "imam_name": StringField("اسم الإمام"),
        "imam_audio": StringField("رابط الملف الصوتي"),
        "imam_youtube": StringField("رابط يوتيوب"),
    }

    def on_form_prefill(self, form, id):
        imam = Imam.query.filter_by(mosque_id=id).first()
        if imam:
            form.imam_name.data = imam.name
            form.imam_audio.data = imam.audio_sample or ""
            form.imam_youtube.data = imam.youtube_link or ""

    def after_model_change(self, form, model, is_created):
        imam_name = form.imam_name.data.strip() if form.imam_name.data else ""
        imam_audio = form.imam_audio.data.strip() if form.imam_audio.data else None
        imam_youtube = form.imam_youtube.data.strip() if form.imam_youtube.data else None
        imam = Imam.query.filter_by(mosque_id=model.id).first()
        if imam_name:
            if imam:
                imam.name = imam_name
                imam.audio_sample = imam_audio
                imam.youtube_link = imam_youtube
            else:
                imam = Imam(
                    name=imam_name, mosque_id=model.id,
                    audio_sample=imam_audio, youtube_link=imam_youtube,
                )
                db.session.add(imam)
            db.session.commit()
        elif imam and not imam_name:
            imam.mosque_id = None
            db.session.commit()
        invalidate_caches()

    @action("swap_imam", "تبديل الإمام", "هل تريد تبديل إمام المسجد المحدد؟")
    def swap_imam_action(self, ids):
        if len(ids) != 1:
            return redirect(url_for(".index_view"))
        return redirect(url_for("legacy.swap_imam_view", mosque_id=ids[0]))


class ImamModelView(BaseModelView):
    form_columns = ["name", "mosque", "audio_sample", "youtube_link"]
    column_list = ["name", "mosque", "audio_sample", "youtube_link"]
    column_labels = {
        "name": "الإمام", "mosque": "المسجد",
        "audio_sample": "الملف الصوتي", "youtube_link": "يوتيوب",
    }
    can_view_details = True
    column_searchable_list = ["name"]
    column_filters = ["mosque"]
    form_overrides = {"mosque": QuerySelectField}
    form_args = {
        "name": {"label": "اسم الإمام"},
        "mosque": {
            "label": "المسجد",
            "query_factory": lambda: Mosque.query.all(),
            "get_label": "name",
            "allow_blank": True,
            "blank_text": "بدون مسجد",
        },
        "audio_sample": {
            "label": "رابط الملف الصوتي",
            "description": "أدخل رابط الملف الصوتي أو ارفع ملف من صفحة المسجد",
        },
        "youtube_link": {"label": "رابط يوتيوب"},
    }


class TransferRequestModelView(BaseModelView):
    column_list = ["id", "submitter", "mosque", "current_imam", "new_imam", "new_imam_name", "notes", "status", "reject_reason", "created_at", "reviewed_at"]
    column_labels = {
        "id": "#", "submitter": "المُبلّغ", "mosque": "المسجد",
        "current_imam": "الإمام الحالي", "new_imam": "الإمام الجديد",
        "new_imam_name": "اسم إمام جديد", "notes": "ملاحظات",
        "status": "الحالة", "reject_reason": "سبب الرفض",
        "created_at": "تاريخ الإنشاء", "reviewed_at": "تاريخ المراجعة",
    }
    column_filters = ["status"]
    column_default_sort = ("created_at", True)
    column_editable_list = ["reject_reason"]
    page_size = 50
    can_create = False
    can_edit = True
    can_delete = True

    @action("approve", "قبول البلاغات المحددة", "هل تريد قبول البلاغات المحددة؟")
    def action_approve(self, ids):
        for transfer_id in ids:
            tr = ImamTransferRequest.query.get(transfer_id)
            if not tr or tr.status != "pending":
                continue
            mosque = Mosque.query.get(tr.mosque_id)
            if not mosque:
                continue
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
            tr.reviewed_by = current_user.id if current_user.is_authenticated else None
        db.session.commit()
        invalidate_caches()

    @action("reject", "رفض البلاغات المحددة", "هل تريد رفض البلاغات المحددة؟")
    def action_reject(self, ids):
        for transfer_id in ids:
            tr = ImamTransferRequest.query.get(transfer_id)
            if not tr or tr.status != "pending":
                continue
            tr.status = "rejected"
            tr.reviewed_at = datetime.datetime.utcnow()
            tr.reviewed_by = current_user.id if current_user.is_authenticated else None
        db.session.commit()


def init_legacy_admin(app):
    """Initialize Flask-Admin with the app. Call from app factory."""
    admin = Admin(
        app,
        name="إدارة أئمة التراويح",
        template_mode="bootstrap3",
        index_view=MyAdminIndexView(),
    )
    admin.add_view(MosqueModelView(Mosque, db.session, name="المساجد"))
    admin.add_view(ImamModelView(Imam, db.session, name="الأئمة"))
    admin.add_view(TransferRequestModelView(ImamTransferRequest, db.session, name="بلاغات النقل"))
