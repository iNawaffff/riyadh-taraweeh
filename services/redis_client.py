"""Redis client with connection pooling and graceful fallback."""

import json
import os

_redis_client = None
_redis_available = False
_init_attempted = False


def _init_redis():
    """Initialize Redis connection pool. Called lazily on first use."""
    global _redis_client, _redis_available, _init_attempted
    _init_attempted = True
    redis_url = os.environ.get("REDIS_URL")
    if not redis_url:
        print("REDIS_URL not set — using in-memory cache fallback")
        return

    try:
        import redis
        _redis_client = redis.Redis.from_url(
            redis_url,
            decode_responses=True,
            max_connections=10,
            socket_timeout=2,
            socket_connect_timeout=2,
            health_check_interval=30,
        )
        _redis_client.ping()
        _redis_available = True
        print("Redis connected successfully")
    except Exception as e:
        print(f"Redis connection failed, falling back to in-memory: {e}")
        _redis_client = None
        _redis_available = False


def _ensure_init():
    """Ensure Redis has been initialized (lazy init on first call)."""
    if not _init_attempted:
        _init_redis()


def redis_get(key):
    """Get a value from Redis. Returns None if unavailable or missing."""
    _ensure_init()
    if not _redis_available:
        return None
    try:
        val = _redis_client.get(key)
        if val is not None:
            return json.loads(val)
        return None
    except Exception:
        return None


def redis_set(key, value, ttl=300):
    """Set a value in Redis with TTL (default 5 minutes). Fails silently."""
    _ensure_init()
    if not _redis_available:
        return
    try:
        _redis_client.set(key, json.dumps(value, ensure_ascii=False), ex=ttl)
    except Exception:
        pass


def redis_delete(*keys):
    """Delete one or more keys from Redis. Fails silently."""
    _ensure_init()
    if not _redis_available or not keys:
        return
    try:
        _redis_client.delete(*keys)
    except Exception:
        pass


def redis_delete_pattern(pattern):
    """Delete all keys matching a pattern. Fails silently."""
    _ensure_init()
    if not _redis_available:
        return
    try:
        cursor = 0
        while True:
            cursor, keys = _redis_client.scan(cursor=cursor, match=pattern, count=100)
            if keys:
                _redis_client.delete(*keys)
            if cursor == 0:
                break
    except Exception:
        pass


def redis_is_available():
    """Check if Redis is available."""
    _ensure_init()
    return _redis_available
