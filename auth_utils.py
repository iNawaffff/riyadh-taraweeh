import json
import os
from functools import wraps

import firebase_admin
from firebase_admin import auth as firebase_auth, credentials as firebase_credentials
from firebase_admin.auth import RevokedIdTokenError, CertificateFetchError
from flask import g, jsonify, request

from models import PublicUser

firebase_app = None


def init_firebase():
    """Initialize Firebase Admin SDK. Call once at app startup."""
    global firebase_app
    firebase_service_account = os.environ.get("FIREBASE_SERVICE_ACCOUNT")
    if firebase_service_account:
        try:
            if firebase_service_account.startswith("{"):
                cred = firebase_credentials.Certificate(json.loads(firebase_service_account))
            else:
                cred = firebase_credentials.Certificate(firebase_service_account)
            firebase_app = firebase_admin.initialize_app(cred)
            print("Firebase Admin SDK initialized successfully")
        except Exception as e:
            print(f"Firebase init error: {e}")
    else:
        print("FIREBASE_SERVICE_ACCOUNT not set — public auth disabled")


def firebase_auth_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        if not firebase_app:
            return jsonify({"error": "Auth not configured"}), 503
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid token"}), 401
        token = auth_header[7:]
        try:
            decoded = firebase_auth.verify_id_token(token, check_revoked=True)
        except RevokedIdTokenError:
            return jsonify({"error": "Token revoked, please re-authenticate"}), 401
        except CertificateFetchError:
            return jsonify({"error": "Auth service temporarily unavailable"}), 503
        except Exception:
            return jsonify({"error": "Invalid or expired token"}), 401
        user = PublicUser.query.filter_by(firebase_uid=decoded["uid"]).first()
        g.firebase_decoded = decoded
        g.current_public_user = user  # may be None if not registered yet
        return f(*args, **kwargs)
    return decorated


def firebase_auth_optional(f):
    """Like firebase_auth_required but doesn't fail if no token provided."""
    @wraps(f)
    def decorated(*args, **kwargs):
        g.firebase_decoded = None
        g.current_public_user = None
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer ") and firebase_app:
            try:
                decoded = firebase_auth.verify_id_token(auth_header[7:], check_revoked=True)
                g.firebase_decoded = decoded
                g.current_public_user = PublicUser.query.filter_by(firebase_uid=decoded["uid"]).first()
            except Exception:
                pass
        return f(*args, **kwargs)
    return decorated


def admin_or_moderator_required(f):
    """Firebase auth + role check (admin or moderator)."""
    @wraps(f)
    def decorated(*args, **kwargs):
        if not firebase_app:
            return jsonify({"error": "Auth not configured"}), 503
        auth_header = request.headers.get("Authorization", "")
        if not auth_header.startswith("Bearer "):
            return jsonify({"error": "Missing or invalid token"}), 401
        token = auth_header[7:]
        try:
            decoded = firebase_auth.verify_id_token(token, check_revoked=True)
        except RevokedIdTokenError:
            return jsonify({"error": "Token revoked"}), 401
        except CertificateFetchError:
            return jsonify({"error": "Auth service temporarily unavailable"}), 503
        except Exception:
            return jsonify({"error": "Invalid or expired token"}), 401
        user = PublicUser.query.filter_by(firebase_uid=decoded["uid"]).first()
        if not user or user.role not in ("admin", "moderator"):
            return jsonify({"error": "Forbidden"}), 403
        g.firebase_decoded = decoded
        g.current_public_user = user
        return f(*args, **kwargs)
    return decorated
