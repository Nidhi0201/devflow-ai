from rq import Worker

from app.services.queue import _check_redis, redis_conn


def main():
    if not _check_redis() or redis_conn is None:
        raise SystemExit("Redis is not available. Start Redis before running the worker.")
    worker = Worker(["reviews"], connection=redis_conn)
    worker.work(with_scheduler=False)


if __name__ == "__main__":
    main()
