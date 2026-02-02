# Stage 1: Build React frontend
FROM node:18-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Python app
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies for psycopg2
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY . .

# Copy built React frontend from stage 1
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Expose port
EXPOSE 8080

# Start with gunicorn
CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:8080", "--workers", "2", "--timeout", "120"]
