"""API response cache — Redis-backed with in-memory fallback."""

from services.redis_client import redis_delete_pattern, redis_get, redis_set
from services.search import invalidate_imam_index

# In-memory fallback (used when Redis is unavailable)
_local_cache = {}

CACHE_PREFIX = "taraweeh:"
CACHE_TTL = 300  # 5 minutes


def cache_get(key):
    """Get a cached API response. Tries Redis first, falls back to local dict."""
    full_key = CACHE_PREFIX + key

    # Try Redis
    val = redis_get(full_key)
    if val is not None:
        return val

    # Fallback to local
    return _local_cache.get(key)


def cache_set(key, value):
    """Cache an API response. Writes to both Redis and local dict."""
    full_key = CACHE_PREFIX + key

    # Write to Redis (with TTL)
    redis_set(full_key, value, ttl=CACHE_TTL)

    # Always write to local as fallback
    _local_cache[key] = value


def invalidate_caches():
    """Invalidate all caches after admin write operations."""
    # Clear Redis keys
    redis_delete_pattern(CACHE_PREFIX + "*")

    # Clear local fallback
    _local_cache.clear()

    # Clear imam search index (process-local, cheap to rebuild)
    invalidate_imam_index()
