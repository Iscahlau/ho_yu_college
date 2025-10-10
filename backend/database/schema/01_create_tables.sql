-- Ho Yu College - Database Schema
-- This schema mirrors the DynamoDB table structure for local development

-- ============================================================================
-- TEACHERS TABLE
-- ============================================================================
-- Stores teacher information including admin status and class assignments
CREATE TABLE IF NOT EXISTS teachers (
    teacher_id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,  -- Teacher name
    password VARCHAR(64) NOT NULL,  -- SHA-256 hash
    responsible_class TEXT NOT NULL,  -- JSON array stored as text: ["1A", "2A"]
    last_login TIMESTAMP NOT NULL,
    is_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- STUDENTS TABLE
-- ============================================================================
-- Stores student information with marks, class assignments, and login history
CREATE TABLE IF NOT EXISTS students (
    student_id VARCHAR(20) PRIMARY KEY,
    name_1 VARCHAR(100) NOT NULL,  -- English name
    name_2 VARCHAR(100) NOT NULL,  -- Chinese name
    marks INTEGER NOT NULL DEFAULT 0 CHECK (marks >= 0 AND marks <= 1000),
    class VARCHAR(10) NOT NULL,
    class_no VARCHAR(10) NOT NULL,
    last_login TIMESTAMP NOT NULL,
    last_update TIMESTAMP NOT NULL,
    teacher_id VARCHAR(20) NOT NULL,
    password VARCHAR(64) NOT NULL,  -- SHA-256 hash
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraint
    FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id) ON DELETE RESTRICT
);

-- ============================================================================
-- GAMES TABLE
-- ============================================================================
-- Stores Scratch game information with student and teacher assignments
CREATE TABLE IF NOT EXISTS games (
    game_id VARCHAR(20) PRIMARY KEY,
    game_name VARCHAR(200) NOT NULL,
    student_id VARCHAR(20) NOT NULL,
    subject VARCHAR(50) NOT NULL CHECK (
        subject IN ('Chinese Language', 'English Language', 'Mathematics', 'Humanities and Science')
    ),
    difficulty VARCHAR(20) NOT NULL CHECK (
        difficulty IN ('Beginner', 'Intermediate', 'Advanced')
    ),
    teacher_id VARCHAR(20) NOT NULL,
    last_update TIMESTAMP NOT NULL,
    scratch_id VARCHAR(50) NOT NULL,
    scratch_api VARCHAR(255) NOT NULL,
    accumulated_click INTEGER NOT NULL DEFAULT 0 CHECK (accumulated_click >= 0),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Foreign key constraints
    FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    FOREIGN KEY (teacher_id) REFERENCES teachers(teacher_id) ON DELETE RESTRICT
);

-- ============================================================================
-- INDEXES
-- ============================================================================
-- These indexes mirror the Global Secondary Indexes (GSI) in DynamoDB

-- Index for querying students by teacher
CREATE INDEX IF NOT EXISTS idx_students_teacher ON students(teacher_id);

-- Index for querying games by teacher
CREATE INDEX IF NOT EXISTS idx_games_teacher ON games(teacher_id);

-- Index for querying games by student
CREATE INDEX IF NOT EXISTS idx_games_student ON games(student_id);

-- Additional useful indexes for common queries
CREATE INDEX IF NOT EXISTS idx_students_class ON students(class);
CREATE INDEX IF NOT EXISTS idx_games_subject ON games(subject);
CREATE INDEX IF NOT EXISTS idx_games_difficulty ON games(difficulty);

-- ============================================================================
-- COMMENTS
-- ============================================================================

-- Table structure notes:
-- 1. All primary keys match DynamoDB partition keys
-- 2. Indexes mirror DynamoDB GSIs for query compatibility
-- 3. Timestamps use ISO 8601 format compatible with DynamoDB
-- 4. Password fields store SHA-256 hashes (64 hex characters)
-- 5. The responsible_class field in teachers stores JSON array as TEXT
-- 6. Foreign key constraints enforce referential integrity
-- 7. CHECK constraints ensure data validity
