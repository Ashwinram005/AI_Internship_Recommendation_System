# Railway / Docker: avoids Nixpacks "pip: not found" when the Python toolchain
# does not expose `pip` on PATH. Service root directory should be `server`.
FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

WORKDIR /app

# spaCy / scientific wheels sometimes need a compiler on slim images
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY . .

# Railway sets PORT; run_server.py binds 0.0.0.0 when PORT is set
CMD ["python", "run_server.py"]
