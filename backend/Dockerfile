FROM python:3.11-slim
ENV PYTHONUNBUFFERED=1 PYTHONDONTWRITEBYTECODE=1 PORT=8000
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-eng \
    && rm -rf /var/lib/apt/lists/*
COPY requirements.txt constraints.txt ./
RUN pip install --no-cache-dir -r requirements.txt && pip check
RUN groupadd --gid 10001 finsight && useradd --uid 10001 --gid finsight --create-home finsight
COPY --chown=finsight:finsight . .
RUN mkdir -p uploads/thumbnails && chown -R finsight:finsight uploads && chmod +x entrypoint.sh
USER finsight
# Database-free check in the final runtime image. Preserve this historical revision:
# existing production databases already record it in alembic_version.
RUN python -m alembic -c /app/alembic.ini show b7e204c9d613
EXPOSE 8000
ENTRYPOINT ["./entrypoint.sh"]
