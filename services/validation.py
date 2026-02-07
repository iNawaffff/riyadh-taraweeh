"""Input validation utilities for Arabic text and usernames."""

import re

RESERVED_USERNAMES = {"admin", "api", "static", "login", "logout", "about", "contact", "mosque", "assets", "u", "s"}
USERNAME_PATTERN = re.compile(r'^[\w\u0600-\u06FF]{3,30}$')


def validate_username(username):
    if not username or not USERNAME_PATTERN.match(username):
        return False, "اسم المستخدم يجب أن يكون ٣-٣٠ حرف (أحرف، أرقام، أو عربي)"
    if username.lower() in RESERVED_USERNAMES:
        return False, "اسم المستخدم محجوز"
    return True, None


def is_arabic_text(text):
    """Validate that text contains only Arabic letters, spaces, and common punctuation."""
    if not text:
        return True
    return bool(re.match(r'^[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF\s\d٠-٩.,،؟!؛:\-()]+$', text))


def sanitize_text(text):
    """Sanitize user text input: strip HTML tags, collapse spaces, remove control chars."""
    if not text:
        return ""
    text = str(text).strip()
    text = re.sub(r'<[^>]+>', '', text)  # Strip HTML tags
    text = re.sub(r'\s+', ' ', text)
    text = re.sub(r'[\x00-\x1f\x7f-\x9f]', '', text)
    return text
