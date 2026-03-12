FROM python:3.13-slim

WORKDIR /app

# Install system dependencies required for building Python packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    g++ \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Both api and monitor share exact same requirements
COPY apps/api/requirements.txt requirements.txt

# Install python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY apps/api ./apps/api
COPY apps/monitor ./apps/monitor

# Ensure imports work across the monorepo for python
ENV PYTHONPATH=/app/apps/monitor:/app

# Run both the web server and the background worker
CMD ["sh", "-c", "uvicorn apps.api.main:app --host 0.0.0.0 --port ${PORT:-8000} & cd apps/monitor && python monitor.py"]
