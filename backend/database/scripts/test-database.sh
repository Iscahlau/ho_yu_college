#!/bin/bash
# Comprehensive test script for database setup
# Tests schema, data integrity, and referential constraints

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DB_DIR="$SCRIPT_DIR/.."
DB_PATH="$DB_DIR/ho_yu_college.db"

echo "============================================"
echo "Database Validation Test Suite"
echo "============================================"
echo ""

# Check if database exists
if [ ! -f "$DB_PATH" ]; then
    echo "❌ FAIL: Database not found"
    echo "Run ./init-sqlite.sh first"
    exit 1
fi

echo "✓ Database file exists"
echo ""

# Test 1: Table existence
echo "Test 1: Verifying tables exist..."
TABLES=$(sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
EXPECTED_TABLES=("games" "students" "teachers")

for table in "${EXPECTED_TABLES[@]}"; do
    if echo "$TABLES" | grep -q "^$table$"; then
        echo "  ✓ Table '$table' exists"
    else
        echo "  ❌ FAIL: Table '$table' not found"
        exit 1
    fi
done
echo ""

# Test 2: Index existence
echo "Test 2: Verifying indexes exist..."
INDEXES=$(sqlite3 "$DB_PATH" "SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'idx_%' ORDER BY name;")
EXPECTED_INDEXES=("idx_games_difficulty" "idx_games_student" "idx_games_subject" "idx_games_teacher" "idx_students_class" "idx_students_teacher")

for index in "${EXPECTED_INDEXES[@]}"; do
    if echo "$INDEXES" | grep -q "^$index$"; then
        echo "  ✓ Index '$index' exists"
    else
        echo "  ❌ FAIL: Index '$index' not found"
        exit 1
    fi
done
echo ""

# Test 3: Record counts
echo "Test 3: Verifying record counts..."
TEACHER_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM teachers;")
STUDENT_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM students;")
GAME_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM games;")

if [ "$TEACHER_COUNT" -eq 3 ]; then
    echo "  ✓ Teachers: $TEACHER_COUNT records (expected: 3)"
else
    echo "  ❌ FAIL: Teachers count is $TEACHER_COUNT (expected: 3)"
    exit 1
fi

if [ "$STUDENT_COUNT" -eq 10 ]; then
    echo "  ✓ Students: $STUDENT_COUNT records (expected: 10)"
else
    echo "  ❌ FAIL: Students count is $STUDENT_COUNT (expected: 10)"
    exit 1
fi

if [ "$GAME_COUNT" -eq 20 ]; then
    echo "  ✓ Games: $GAME_COUNT records (expected: 20)"
else
    echo "  ❌ FAIL: Games count is $GAME_COUNT (expected: 20)"
    exit 1
fi
echo ""

# Test 4: Data integrity
echo "Test 4: Verifying data integrity..."

# Check for NULL values in required fields
NULL_STUDENTS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM students WHERE student_id IS NULL OR name_1 IS NULL OR teacher_id IS NULL;")
if [ "$NULL_STUDENTS" -eq 0 ]; then
    echo "  ✓ No NULL values in students required fields"
else
    echo "  ❌ FAIL: Found $NULL_STUDENTS students with NULL values"
    exit 1
fi

NULL_TEACHERS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM teachers WHERE teacher_id IS NULL OR password IS NULL;")
if [ "$NULL_TEACHERS" -eq 0 ]; then
    echo "  ✓ No NULL values in teachers required fields"
else
    echo "  ❌ FAIL: Found $NULL_TEACHERS teachers with NULL values"
    exit 1
fi

NULL_GAMES=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM games WHERE game_id IS NULL OR student_id IS NULL OR teacher_id IS NULL;")
if [ "$NULL_GAMES" -eq 0 ]; then
    echo "  ✓ No NULL values in games required fields"
else
    echo "  ❌ FAIL: Found $NULL_GAMES games with NULL values"
    exit 1
fi
echo ""

# Test 5: Referential integrity
echo "Test 5: Verifying referential integrity..."

# Check all student teacher_ids exist in teachers table
ORPHAN_STUDENTS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM students s LEFT JOIN teachers t ON s.teacher_id = t.teacher_id WHERE t.teacher_id IS NULL;")
if [ "$ORPHAN_STUDENTS" -eq 0 ]; then
    echo "  ✓ All student teacher_ids reference valid teachers"
else
    echo "  ❌ FAIL: Found $ORPHAN_STUDENTS students with invalid teacher_id"
    exit 1
fi

# Check all game student_ids exist in students table
ORPHAN_GAMES_STUDENT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM games g LEFT JOIN students s ON g.student_id = s.student_id WHERE s.student_id IS NULL;")
if [ "$ORPHAN_GAMES_STUDENT" -eq 0 ]; then
    echo "  ✓ All game student_ids reference valid students"
else
    echo "  ❌ FAIL: Found $ORPHAN_GAMES_STUDENT games with invalid student_id"
    exit 1
fi

# Check all game teacher_ids exist in teachers table
ORPHAN_GAMES_TEACHER=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM games g LEFT JOIN teachers t ON g.teacher_id = t.teacher_id WHERE t.teacher_id IS NULL;")
if [ "$ORPHAN_GAMES_TEACHER" -eq 0 ]; then
    echo "  ✓ All game teacher_ids reference valid teachers"
else
    echo "  ❌ FAIL: Found $ORPHAN_GAMES_TEACHER games with invalid teacher_id"
    exit 1
fi
echo ""

# Test 6: Data constraints
echo "Test 6: Verifying data constraints..."

# Check marks are within valid range (0-1000)
INVALID_MARKS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM students WHERE marks < 0 OR marks > 1000;")
if [ "$INVALID_MARKS" -eq 0 ]; then
    echo "  ✓ All student marks are within valid range (0-1000)"
else
    echo "  ❌ FAIL: Found $INVALID_MARKS students with invalid marks"
    exit 1
fi

# Check accumulated_click is non-negative
INVALID_CLICKS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM games WHERE accumulated_click < 0;")
if [ "$INVALID_CLICKS" -eq 0 ]; then
    echo "  ✓ All game click counts are non-negative"
else
    echo "  ❌ FAIL: Found $INVALID_CLICKS games with negative clicks"
    exit 1
fi

# Check subject values are valid
INVALID_SUBJECTS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM games WHERE subject NOT IN ('Chinese Language', 'English Language', 'Mathematics', 'Humanities and Science');")
if [ "$INVALID_SUBJECTS" -eq 0 ]; then
    echo "  ✓ All game subjects are valid"
else
    echo "  ❌ FAIL: Found $INVALID_SUBJECTS games with invalid subject"
    exit 1
fi

# Check difficulty values are valid
INVALID_DIFFICULTY=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM games WHERE difficulty NOT IN ('Beginner', 'Intermediate', 'Advanced');")
if [ "$INVALID_DIFFICULTY" -eq 0 ]; then
    echo "  ✓ All game difficulties are valid"
else
    echo "  ❌ FAIL: Found $INVALID_DIFFICULTY games with invalid difficulty"
    exit 1
fi
echo ""

# Test 7: Password hashing
echo "Test 7: Verifying password hashing..."

# Check all passwords are 64 characters (SHA-256 hex)
SHORT_PASSWORDS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM students WHERE length(password) != 64;")
if [ "$SHORT_PASSWORDS" -eq 0 ]; then
    echo "  ✓ All student passwords are properly hashed (64 chars)"
else
    echo "  ❌ FAIL: Found $SHORT_PASSWORDS students with invalid password hash"
    exit 1
fi

SHORT_TEACHER_PASSWORDS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM teachers WHERE length(password) != 64;")
if [ "$SHORT_TEACHER_PASSWORDS" -eq 0 ]; then
    echo "  ✓ All teacher passwords are properly hashed (64 chars)"
else
    echo "  ❌ FAIL: Found $SHORT_TEACHER_PASSWORDS teachers with invalid password hash"
    exit 1
fi
echo ""

# Test 8: Unique constraints
echo "Test 8: Verifying unique constraints..."

# Check for duplicate student IDs
DUPLICATE_STUDENTS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) - COUNT(DISTINCT student_id) FROM students;")
if [ "$DUPLICATE_STUDENTS" -eq 0 ]; then
    echo "  ✓ All student_ids are unique"
else
    echo "  ❌ FAIL: Found $DUPLICATE_STUDENTS duplicate student_ids"
    exit 1
fi

# Check for duplicate teacher IDs
DUPLICATE_TEACHERS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) - COUNT(DISTINCT teacher_id) FROM teachers;")
if [ "$DUPLICATE_TEACHERS" -eq 0 ]; then
    echo "  ✓ All teacher_ids are unique"
else
    echo "  ❌ FAIL: Found $DUPLICATE_TEACHERS duplicate teacher_ids"
    exit 1
fi

# Check for duplicate game IDs
DUPLICATE_GAMES=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) - COUNT(DISTINCT game_id) FROM games;")
if [ "$DUPLICATE_GAMES" -eq 0 ]; then
    echo "  ✓ All game_ids are unique"
else
    echo "  ❌ FAIL: Found $DUPLICATE_GAMES duplicate game_ids"
    exit 1
fi
echo ""

# Test 9: Game ID constraint (must match scratch_api)
echo "Test 9: Verifying game_id matches scratch_api..."
MISMATCHED_GAMES=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM games WHERE game_id != substr(scratch_api, length(scratch_api) - length(game_id) + 1);")
if [ "$MISMATCHED_GAMES" -eq 0 ]; then
    echo "  ✓ All game_ids match their scratch_api URLs"
else
    echo "  ❌ FAIL: Found $MISMATCHED_GAMES games with mismatched game_id/scratch_api"
    exit 1
fi
echo ""

# Test 10: Sample queries
echo "Test 10: Testing sample queries..."

# Query 1: Get student count by class
QUERY1=$(sqlite3 "$DB_PATH" "SELECT COUNT(DISTINCT class) FROM students;")
if [ "$QUERY1" -eq 4 ]; then
    echo "  ✓ Students distributed across 4 classes"
else
    echo "  ❌ FAIL: Expected 4 classes, found $QUERY1"
    exit 1
fi

# Query 2: Verify admin teacher exists
ADMIN_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM teachers WHERE is_admin = 1;")
if [ "$ADMIN_COUNT" -eq 1 ]; then
    echo "  ✓ One admin teacher exists"
else
    echo "  ❌ FAIL: Expected 1 admin, found $ADMIN_COUNT"
    exit 1
fi

# Query 3: Verify all subjects are represented
SUBJECT_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(DISTINCT subject) FROM games;")
if [ "$SUBJECT_COUNT" -eq 4 ]; then
    echo "  ✓ All 4 subjects represented in games"
else
    echo "  ❌ FAIL: Expected 4 subjects, found $SUBJECT_COUNT"
    exit 1
fi
echo ""

# Summary
echo "============================================"
echo "✅ All tests passed!"
echo "============================================"
echo ""
echo "Database validation complete:"
echo "  - Schema structure: ✓"
echo "  - Data integrity: ✓"
echo "  - Referential integrity: ✓"
echo "  - Constraints: ✓"
echo "  - Mock data: ✓"
echo ""
echo "Database is ready for use with DataGrip!"
echo ""
