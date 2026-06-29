import threading

from app.config import settings

_redis_available = None
review_queue = None
redis_conn = None


def _check_redis() -> bool:
    global _redis_available, review_queue, redis_conn
    if _redis_available is not None:
        return _redis_available
    try:
        from redis import Redis
        from rq import Queue

        redis_conn = Redis.from_url(settings.redis_url, socket_connect_timeout=2)
        redis_conn.ping()
        review_queue = Queue("reviews", connection=redis_conn)
        _redis_available = True
    except Exception:
        _redis_available = False
    return _redis_available


def enqueue_review(pull_request_id: int) -> str:
    if _check_redis():
        job = review_queue.enqueue(
            "app.worker.tasks.run_ai_review",
            pull_request_id,
            job_timeout=300,
        )
        return job.id

    from app.worker.tasks import run_ai_review

    threading.Thread(target=run_ai_review, args=(pull_request_id,), daemon=True).start()
    return "local-thread"
