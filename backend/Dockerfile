FROM python:3.12-slim
WORKDIR /app
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
COPY requirements.txt ./
# Wheels are vendored (pip download -r requirements.txt -d wheels) so the image builds without PyPI.
COPY wheels/ ./wheels/
RUN pip install --no-index --find-links=wheels -r requirements.txt
COPY main.py ./
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
