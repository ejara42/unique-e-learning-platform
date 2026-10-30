#!/bin/bash
# ==============================================================================
# EduSphere Automated MongoDB Backup Pipeline (Linux/Container)
# ==============================================================================

set -e

MONGO_URI="${MONGODB_URI:-mongodb://localhost:27017/edusphere}"
BACKUP_DIR="${BACKUP_DIR:-./backups/mongodb}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
TARGET_DIR="${BACKUP_DIR}/backup_${TIMESTAMP}"

mkdir -p "${TARGET_DIR}"

ARCHIVE_FILE="${TARGET_DIR}/edusphere_${TIMESTAMP}.gz"

echo "=========================================================="
echo "🛡️  EduSphere MongoDB Enterprise Backup Starting..."
echo "Timestamp: ${TIMESTAMP}"
echo "Target: ${ARCHIVE_FILE}"
echo "=========================================================="

mongodump --uri="${MONGO_URI}" --archive="${ARCHIVE_FILE}" --gzip

echo "✅ Backup archive written successfully."

# Purge archives older than RETENTION_DAYS
find "${BACKUP_DIR}" -type d -name "backup_*" -mtime +"${RETENTION_DAYS}" -exec rm -rf {} +

echo "🎉 Backup routine completed successfully."

