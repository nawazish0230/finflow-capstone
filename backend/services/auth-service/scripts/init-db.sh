#!/bin/bash

# Database initialization script
# This script waits for PostgreSQL to be ready and runs migrations

set -e

POSTGRES_HOST="${POSTGRES_HOST:-postgres}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-postgres}"
POSTGRES_DATABASE="${POSTGRES_DATABASE:-finflow_auth}"

echo "Waiting for PostgreSQL to be ready..."
until PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DATABASE" -c '\q' 2>/dev/null; do
  echo "PostgreSQL is unavailable - sleeping"
  sleep 2
done

echo "PostgreSQL is ready!"

# Run migration if migration file exists
MIGRATION_FILE="/docker-entrypoint-initdb.d/001_create_users_table.sql"
if [ -f "$MIGRATION_FILE" ]; then
  echo "Running database migration..."
  PGPASSWORD="$POSTGRES_PASSWORD" psql -h "$POSTGRES_HOST" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DATABASE" -f "$MIGRATION_FILE"
  echo "Migration completed successfully!"
else
  echo "No migration file found at $MIGRATION_FILE"
fi

echo "Database initialization complete!"
