# Dockerfile (placed at the root of the repo)
FROM python:3.11-slim

# Install ffmpeg (Ubuntu/Debian base)
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the rest of the application
COPY . .

EXPOSE 5000

CMD ["python", "server.py"]
