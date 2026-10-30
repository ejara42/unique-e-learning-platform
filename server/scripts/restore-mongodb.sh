#!/bin/bash
# ==============================================================================
# EduSphere Safe MongoDB Disaster Recovery Script (Linux/Container)
# ==============================================================================

set -e

ARCHIVE_FILE="$1"
TARGET_URI="${2:-mongodb://localhost:27017/edusphere_restore_test}"
DROP_EXISTING="${3:-false}"
CONFIRM_PROD="${FORCE_PRODUCTION_RESTORE:-false}"

if [ -z "$ARCHIVE_FILE" ]; then
    echo "Usage: $0 <path-to-archive.gz> [target-mongo-uri] [drop-existing (true/false)]"
    exit 1
fi

if [ ! -f "$ARCHIVE_FILE" ]; then
    echo "❌ Error: Archive file not found: $ARCHIVE_FILE"
    exit 1
fi

echo "=========================================================="
echo "🛡️  EduSphere Safe MongoDB Restoration Pipeline"
echo "Source Archive: $ARCHIVE_FILE"
echo "Target URI: $TARGET_URI"
echo "=========================================================="

# Safety barrier: Protect production databases from accidental overwrite
if echo "$TARGET_URI" | grep -Ei 'production|prod|replicaSet' > /dev/null; then
    if [ "$CONFIRM_PROD" != "true" ]; then
        echo "❌ CRITICAL SAFETY BARRIER: Target database appears to be a production cluster."
        echo "Set FORCE_PRODUCTION_RESTORE=true to proceed."
        exit 1
    fi
fi

DROP_ARG=""
if [ "$DROP_EXISTING" = "true" ]; then
    DROP_ARG="--drop"
fi

echo "⏳ Executing mongorestore..."
mongorestore --uri="$TARGET_URI" --archive="$ARCHIVE_FILE" --gzip $DROP_ARG

echo "✅ Restoration completed successfully into $TARGET_URI"

