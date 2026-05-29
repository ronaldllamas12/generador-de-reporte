FROM python:3.12-slim

WORKDIR /code

RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    libcairo2-dev \
    pkg-config \
    python3-dev \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app ./app

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}"]