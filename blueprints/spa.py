"""React SPA serving, SEO meta injection, /dashboard/*, static assets, error reporting."""

import datetime
import os
import re
from html import escape as html_escape

from flask import Blueprint, jsonify, make_response, redirect, render_template, request, send_from_directory
from flask_mail import Message

from extensions import limiter, mail
from models import Imam, Mosque, PublicUser, db

spa_bp = Blueprint("spa", __name__)

REACT_BUILD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend", "dist")
USE_REACT_FRONTEND = os.path.exists(REACT_BUILD_DIR)


def _get_react_html():
    """Read and cache the built React index.html content."""
    index_path = os.path.join(REACT_BUILD_DIR, "index.html")
    if not hasattr(_get_react_html, "_cache"):
        with open(index_path, "r", encoding="utf-8") as f:
            _get_react_html._cache = f.read()
    return _get_react_html._cache


def inject_meta_tags(html, meta):
    """Replace meta tags in the built React HTML with route-specific values.

    All values are HTML-escaped to prevent stored XSS via user-controlled data
    (e.g., display_name, mosque names from community requests).
    """
    if meta.get("title"):
        safe_title = html_escape(meta["title"], quote=True)
        html = re.sub(
            r"<title>[^<]*</title>",
            f"<title>{safe_title}</title>",
            html,
        )
        html = re.sub(
            r'<meta property="og:title" content="[^"]*"',
            f'<meta property="og:title" content="{safe_title}"',
            html,
        )
    if meta.get("description"):
        safe_desc = html_escape(meta["description"], quote=True)
        html = re.sub(
            r'<meta name="description" content="[^"]*"',
            f'<meta name="description" content="{safe_desc}"',
            html,
        )
        html = re.sub(
            r'<meta property="og:description" content="[^"]*"',
            f'<meta property="og:description" content="{safe_desc}"',
            html,
        )
    if meta.get("url"):
        safe_url = html_escape(meta["url"], quote=True)
        html = re.sub(
            r'<meta property="og:url" content="[^"]*"',
            f'<meta property="og:url" content="{safe_url}"',
            html,
        )
    return html


def serve_react_app(meta_tags=None):
    """Serve the React SPA index.html for client-side routing."""
    if USE_REACT_FRONTEND:
        if meta_tags:
            html = inject_meta_tags(_get_react_html(), meta_tags)
            return make_response(html)
        return send_from_directory(REACT_BUILD_DIR, "index.html")
    # Fallback to Jinja templates if React build doesn't exist
    areas = db.session.query(Mosque.area).distinct().all()
    areas = [area[0] for area in areas]
    return render_template("index.html", areas=areas)


# --- main routes ---
@spa_bp.route("/")
def index():
    return serve_react_app()


@spa_bp.route("/about")
def about():
    if USE_REACT_FRONTEND:
        return serve_react_app(meta_tags={
            "title": "عن الموقع - أئمة التراويح",
            "description": "تعرف على موقع أئمة التراويح في الرياض - دليلك لاختيار المسجد المناسب في رمضان",
            "url": "https://taraweeh.org/about",
        })
    return render_template("about.html")


@spa_bp.route("/contact")
def contact():
    if USE_REACT_FRONTEND:
        return serve_react_app(meta_tags={
            "title": "تواصل معنا - أئمة التراويح",
            "description": "تواصل مع فريق موقع أئمة التراويح في الرياض",
            "url": "https://taraweeh.org/contact",
        })
    return render_template("contact.html")


@spa_bp.route("/mosque/<int:mosque_id>")
def mosque_detail(mosque_id):
    if USE_REACT_FRONTEND:
        try:
            mosque = Mosque.query.get(mosque_id)
            if mosque:
                imam = Imam.query.filter_by(mosque_id=mosque.id).first()
                imam_name = imam.name if imam else "غير محدد"
                description = f"استمع لتلاوة {imam_name} في {mosque.name} - {mosque.location}"
                return serve_react_app(meta_tags={
                    "title": f"{mosque.name} - أئمة التراويح",
                    "description": description,
                    "url": f"https://taraweeh.org/mosque/{mosque_id}",
                })
        except Exception:
            pass
        return serve_react_app()

    # Fallback to Jinja template
    try:
        mosque = Mosque.query.get_or_404(mosque_id)
        imam = Imam.query.filter_by(mosque_id=mosque.id).first()
        return render_template("mosque_detail.html", mosque=mosque, imam=imam)
    except Exception as e:
        print(f"Error displaying mosque detail: {e}")
        return render_template(
            "error.html", message="حدث خطأ أثناء عرض بيانات المسجد"
        ), 500


@spa_bp.route("/favorites")
def favorites_page():
    return serve_react_app(meta_tags={
        "title": "المفضلة - أئمة التراويح",
        "description": "قائمة المساجد المفضلة - أئمة التراويح في الرياض",
        "url": "https://taraweeh.org/favorites",
    })


@spa_bp.route("/u/<username>")
def user_profile_page(username):
    if USE_REACT_FRONTEND:
        user = PublicUser.query.filter_by(username=username).first()
        if user:
            return serve_react_app(meta_tags={
                "title": f"مفضلات {user.display_name or user.username} - أئمة التراويح",
                "description": f"قائمة المساجد المفضلة لـ {user.display_name or user.username}",
                "url": f"https://taraweeh.org/u/{username}",
            })
        return serve_react_app()
    return redirect("/")


@spa_bp.route("/u/<username>/favorites")
def user_favorites_page(username):
    if USE_REACT_FRONTEND:
        user = PublicUser.query.filter_by(username=username).first()
        if user:
            return serve_react_app(meta_tags={
                "title": f"مفضلات {user.display_name or user.username} - أئمة التراويح",
                "description": f"قائمة المساجد المفضلة لـ {user.display_name or user.username}",
                "url": f"https://taraweeh.org/u/{username}/favorites",
            })
        return serve_react_app()
    return redirect("/")


@spa_bp.route("/leaderboard")
def leaderboard_page():
    return serve_react_app(meta_tags={
        "title": "المتصدرون - أئمة التراويح",
        "description": "قائمة أكثر المساهمين في تحديث بيانات أئمة التراويح في الرياض",
        "url": "https://taraweeh.org/leaderboard",
    })


@spa_bp.route("/tracker")
def tracker_page():
    return serve_react_app(meta_tags={
        "title": "متابعة التراويح - أئمة التراويح",
        "description": "تابع حضورك لصلاة التراويح خلال شهر رمضان",
        "url": "https://taraweeh.org/tracker",
    })


@spa_bp.route("/makkah")
def makkah_schedule_page():
    return serve_react_app(meta_tags={
        "title": "جدول صلاة التراويح والتهجد بالمسجد الحرام - رمضان ١٤٤٧",
        "description": "جدول الأئمة في صلاة التراويح والتهجد بالمسجد الحرام لشهر رمضان ١٤٤٧ هـ / ٢٠٢٦ م",
        "url": "https://taraweeh.org/makkah",
    })


# --- Dashboard (React admin panel) ---
@spa_bp.route("/dashboard")
@spa_bp.route("/dashboard/<path:path>")
def serve_dashboard(path=None):
    return serve_react_app({"title": "لوحة التحكم - أئمة التراويح"})


# --- React static assets ---
@spa_bp.route("/assets/<path:path>")
def serve_react_assets(path):
    if USE_REACT_FRONTEND:
        return send_from_directory(os.path.join(REACT_BUILD_DIR, "assets"), path)
    return "Not Found", 404


@spa_bp.route("/registerSW.js")
@spa_bp.route("/manifest.webmanifest")
@spa_bp.route("/sw.js")
def serve_pwa_files():
    if USE_REACT_FRONTEND:
        filename = request.path.lstrip("/")
        return send_from_directory(REACT_BUILD_DIR, filename)
    return "Not Found", 404


@spa_bp.route("/robots.txt")
def robots():
    robots_content = """User-agent: *
Allow: /
Sitemap: https://taraweeh.org/sitemap.xml
"""
    response = make_response(robots_content)
    response.headers["Content-Type"] = "text/plain"
    return response


# --- error reporting route ---
@spa_bp.route("/report-error", methods=["POST"])
@limiter.limit("3 per minute")
def report_error():
    try:
        mosque_id = request.form.get("mosque_id")
        error_types = request.form.getlist("error_type")
        error_details = request.form.get("error_details")
        reporter_email = request.form.get("reporter_email")

        mosque = Mosque.query.get(mosque_id)
        if not mosque:
            return jsonify({"error": "Mosque not found"}), 404

        report_content = f"""
        Error Report for Mosque: {mosque.name} (ID: {mosque_id})

        Error Types: {", ".join(error_types)}

        Additional Details:
        {error_details}

        Reporter Email: {reporter_email or "Not provided"}

        Reported at: {datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
        """

        print("Error Report Received:\n", report_content)

        try:
            msg = Message(
                subject=f"تقرير خطأ: {mosque.name}",
                recipients=["info@taraweeh.org"],
                body=report_content,
            )
            if reporter_email:
                msg.reply_to = reporter_email
            mail.send(msg)
            print(f"Error report email sent successfully for mosque: {mosque.name}")
        except Exception as mail_error:
            print(f"Error sending email: {mail_error}")

        return jsonify({"success": True, "message": "Report received successfully"}), 200
    except Exception as e:
        print(f"Error processing report: {e}")
        return jsonify({"error": "Error processing report"}), 500
