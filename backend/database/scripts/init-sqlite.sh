#!/bin/bash
# Initialize SQLite database with schema and mock data
# Usage: ./init-sqlite.sh [database_name]

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_DIR="$SCRIPT_DIR/.."
SCHEMA_DIR="$DB_DIR/schema"
SEEDS_DIR="$DB_DIR/seeds"

# Default database name
DB_NAME="${1:-ho_yu_college.db}"
DB_PATH="$DB_DIR/$DB_NAME"

echo "============================================"
echo "Ho Yu College - SQLite Database Setup"
echo "============================================"
echo ""

# Check if sqlite3 is installed
if ! command -v sqlite3 &> /dev/null; then
    echo "❌ Error: sqlite3 is not installed"
    echo ""
    echo "Install instructions:"
    echo "  - Ubuntu/Debian: sudo apt-get install sqlite3"
    echo "  - macOS: brew install sqlite3"
    echo "  - Windows: Download from https://www.sqlite.org/download.html"
    exit 1
fi

# Remove existing database if it exists
if [ -f "$DB_PATH" ]; then
    echo "⚠️  Database already exists at: $DB_PATH"
    read -p "Do you want to remove it and create a fresh database? (y/N) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm "$DB_PATH"
        echo "✓ Removed existing database"
    else
        echo "❌ Setup cancelled"
        exit 0
    fi
fi

echo "📦 Creating database: $DB_NAME"
echo ""

# Create database and apply schema
echo "1. Creating tables..."
sqlite3 "$DB_PATH" < "$SCHEMA_DIR/01_create_tables.sql"
echo "   ✓ Tables created"

# Insert mock data
echo "2. Inserting mock data..."
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
echo "✅ Database setup complete!"
echo "============================================"
echo ""
echo "Database location: $DB_PATH"
echo "Database size: $(du -h "$DB_PATH" | cut -f1)"
echo ""
echo "To connect with sqlite3 CLI:"
echo "  sqlite3 $DB_PATH"
echo ""
echo "To connect with DataGrip:"
echo "  1. Add new Data Source -> SQLite"
echo "  2. Path: $DB_PATH"
echo "  3. Test connection and apply"
echo ""
echo "Test credentials:"
echo "  Students: STU001-STU010, password: 123"
echo "  Teachers: TCH001-TCH002, password: teacher123"
echo "  Admin: TCH003, password: admin123"
echo ""
