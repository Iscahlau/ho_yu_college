#!/bin/bash
# Reset database to initial state with fresh mock data
# Usage: ./reset-database.sh [database_name]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_DIR="$SCRIPT_DIR/.."
SEEDS_DIR="$DB_DIR/seeds"

# Default database name
DB_NAME="${1:-ho_yu_college.db}"
DB_PATH="$DB_DIR/$DB_NAME"

echo "============================================"
echo "Ho Yu College - Database Reset"
echo "============================================"
echo ""

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo "❌ Error: Database not found at: $DB_PATH"
    echo ""
    echo "Run ./init-sqlite.sh first to create the database"
    exit 1
fi

echo "⚠️  This will DELETE all data and reset to mock data"
echo "Database: $DB_PATH"
echo ""
read -p "Are you sure you want to continue? (y/N) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Reset cancelled"
    exit 0
fi

echo ""
echo "📦 Resetting database..."
echo ""

# Clear existing data
echo "1. Clearing existing data..."
sqlite3 "$DB_PATH" <<EOF
DELETE FROM games;
DELETE FROM students;
DELETE FROM teachers;
EOF
echo "   ✓ Data cleared"

# Re-insert mock data
echo "2. Inserting fresh mock data..."
sqlite3 "$DB_PATH" < "$SEEDS_DIR/02_insert_mock_data.sql"
echo "   ✓ Mock data inserted"

# Verify data
echo ""
echo "3. Verifying data..."
TEACHER_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM teachers;")
STUDENT_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM students;")
GAME_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM games;")

echo "   - Teachers: $TEACHER_COUNT records"
echo "   - Students: $STUDENT_COUNT records"
echo "   - Games: $GAME_COUNT records"

echo ""
echo "============================================"
echo "✅ Database reset complete!"
echo "============================================"
echo ""
