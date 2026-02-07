"""Imam fuzzy search index — bigram scoring with process-local cache."""

from models import Imam, Mosque, db
from utils import normalize_arabic

_imam_index_cache = None
_imam_index_count = None


def _strip_prefixes(text):
    """Strip common Arabic prefixes for flexible matching."""
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


def _bigrams(s):
    """Generate character bigrams for a string."""
    return {s[i:i+2] for i in range(len(s) - 1)} if len(s) >= 2 else {s}


def _bigram_similarity(a, b):
    """Bigram (Dice coefficient) similarity between two strings. 0-1."""
    if not a or not b:
        return 0.0
    bg_a = _bigrams(a)
    bg_b = _bigrams(b)
    if not bg_a or not bg_b:
        return 0.0
    return 2.0 * len(bg_a & bg_b) / (len(bg_a) + len(bg_b))


def get_imam_index():
    """Build and cache normalized imam data for search. Invalidated if imam count changes."""
    global _imam_index_cache, _imam_index_count
    current_count = db.session.query(db.func.count(Imam.id)).scalar()
    if _imam_index_cache is not None and _imam_index_count == current_count:
        return _imam_index_cache

    pairs = db.session.query(Imam, Mosque).outerjoin(Mosque, Imam.mosque_id == Mosque.id).all()
    index = []
    for imam, mosque in pairs:
        name_norm = normalize_arabic(imam.name)
        name_stripped = _strip_prefixes(name_norm)
        words = name_norm.split()
        stripped_words = name_stripped.split()
        index.append({
            'imam': imam,
            'mosque': mosque,
            'norm': name_norm,
            'stripped': name_stripped,
            'words': words,
            'stripped_words': stripped_words,
        })
    _imam_index_cache = index
    _imam_index_count = current_count
    return index


def invalidate_imam_index():
    """Clear the imam search index cache."""
    global _imam_index_cache, _imam_index_count
    _imam_index_cache = None
    _imam_index_count = None


def score_imam(q_norm, q_stripped, q_words, q_stripped_words, entry):
    """Score an imam match. Higher = better. 0 = no match."""
    name = entry['norm']
    stripped = entry['stripped']
    words = entry['words']
    s_words = entry['stripped_words']

    if q_norm == name:
        return 100
    if name.startswith(q_norm):
        return 95
    if stripped.startswith(q_stripped):
        return 90
    if q_norm in name:
        return 80
    if q_stripped in stripped:
        return 75

    if len(q_words) == 1:
        for w in words + s_words:
            if w.startswith(q_norm) or w.startswith(q_stripped):
                return 70
        for w in s_words:
            if w.startswith(q_stripped_words[0]) if q_stripped_words else False:
                return 65

    if len(q_words) > 1:
        all_name_words = words + s_words
        matched = 0
        for qw in q_words + q_stripped_words:
            for nw in all_name_words:
                if nw.startswith(qw) or qw in nw:
                    matched += 1
                    break
        unique_q = len(set(q_words + q_stripped_words))
        if unique_q > 0:
            ratio = matched / unique_q
            if ratio >= 0.8:
                return 75
            if ratio >= 0.5:
                return 55

    sim = _bigram_similarity(q_stripped, stripped)
    if sim >= 0.6:
        return int(40 + sim * 20)

    for w in s_words:
        wsim = _bigram_similarity(q_stripped, w)
        if wsim >= 0.5:
            return int(30 + wsim * 20)

    return 0
