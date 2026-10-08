FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY requirements.txt ./
# Wheels are vendored (pip download -r requirements.txt -d wheels) so the image builds without PyPI.
COPY wheels/ ./wheels/
RUN pip install --no-index --find-links=wheels -r requirements.txt
# --forwarded-allow-ips *: the container is reachable only from the compose network (the frontend) and host
# loopback, and X-Forwarded-For feeds rate limiting only; auth is the bearer token.
COPY main.py ./
RUN useradd --system --uid 10001 app
USER app
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*", "--limit-concurrency", "100", "--timeout-keep-alive", "5"]
