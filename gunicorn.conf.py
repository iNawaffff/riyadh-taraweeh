"""Gunicorn production config for Heroku Standard-1x/2x dynos."""

import multiprocessing
import os

# --- Workers ---
# Heroku Standard-1x: 512MB RAM → 2-4 workers safe
# Heroku Standard-2x: 1GB RAM → 4-6 workers safe
# Formula: 2 * CPU cores + 1, capped by memory
# Heroku dynos have 4-8 vCPUs but limited RAM, so cap at 4
workers = int(os.environ.get("WEB_CONCURRENCY", 4))

# --- Threads ---
# gthread worker class: each worker spawns threads
# Threads share memory (lower overhead than workers) and handle I/O-bound
# Firebase token verification well (network I/O)
worker_class = "gthread"
threads = int(os.environ.get("GUNICORN_THREADS", 4))

# Effective concurrency: workers × threads = 4 × 4 = 16 simultaneous requests

# --- Timeouts ---
timeout = 30  # Kill workers that hang (Heroku router times out at 30s anyway)
graceful_timeout = 10
keepalive = 5  # Keep connections alive (Heroku router uses keepalive)

# --- Connection backlog ---
backlog = 2048  # Queue up to 2048 pending connections

# --- Memory management ---
max_requests = 1200  # Restart worker after N requests (prevents memory leaks)
max_requests_jitter = 200  # Random jitter to avoid all workers restarting at once

# --- Logging ---
accesslog = "-"  # stdout
errorlog = "-"  # stderr
loglevel = os.environ.get("GUNICORN_LOG_LEVEL", "info")

# --- Preload ---
# Preload app before forking workers = shared memory, faster startup
# BUT: each worker still gets its own DB connection pool (SQLAlchemy)
preload_app = True

# --- Server hooks ---
def on_starting(server):
    """Log the effective concurrency at startup."""
    effective = workers * threads
    server.log.info(
        f"Gunicorn starting: {workers} workers × {threads} threads = {effective} concurrent requests"
    )
