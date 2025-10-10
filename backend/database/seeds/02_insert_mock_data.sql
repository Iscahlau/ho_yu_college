-- Ho Yu College - Mock Data Seeds
-- This file populates the database with test data for local development
-- Data is sourced from backend/test/mocks/ TypeScript files

-- ============================================================================
-- TEACHERS (3 records)
-- ============================================================================
-- Password hashes are pre-computed SHA-256:
-- - teacher123 -> 6f2f1c614c6c8654c190fde6028645afc86ace623488c5e96e0b2d60be38a5dd
-- - admin123 -> 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9

INSERT INTO teachers (teacher_id, name, password, responsible_class, last_login, is_admin) VALUES
('TCH001', 'Mr. Wong', '6f2f1c614c6c8654c190fde6028645afc86ace623488c5e96e0b2d60be38a5dd', '["1A", "2A"]', '2024-01-15T08:00:00.000Z', FALSE),
('TCH002', 'Ms. Chan', '6f2f1c614c6c8654c190fde6028645afc86ace623488c5e96e0b2d60be38a5dd', '["1B"]', '2024-01-16T08:30:00.000Z', FALSE),
('TCH003', 'Dr. Lee', '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9', '["2B"]', '2024-01-17T07:45:00.000Z', TRUE);

-- ============================================================================
-- STUDENTS (10 records)
-- ============================================================================
-- Password hash (all students use same password):
-- - 123 -> a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3

INSERT INTO students (student_id, name_1, name_2, marks, class, class_no, last_login, last_update, teacher_id, password) VALUES
('STU001', 'John Chan', '陳大文', 150, '1A', '01', '2024-01-15T09:30:00.000Z', '2024-01-15T09:30:00.000Z', 'TCH001', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'),
('STU002', 'Mary Wong', '黃小明', 280, '1A', '02', '2024-01-16T10:15:00.000Z', '2024-01-16T10:15:00.000Z', 'TCH001', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'),
('STU003', 'Peter Lee', '李小龍', 450, '1A', '03', '2024-01-17T08:45:00.000Z', '2024-01-17T08:45:00.000Z', 'TCH001', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'),
('STU004', 'Sarah Lam', '林美華', 620, '1B', '01', '2024-01-18T11:20:00.000Z', '2024-01-18T11:20:00.000Z', 'TCH002', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'),
('STU005', 'David Cheng', '鄭志明', 340, '1B', '02', '2024-01-19T14:00:00.000Z', '2024-01-19T14:00:00.000Z', 'TCH002', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'),
('STU006', 'Emily Ng', '吳雅文', 780, '2A', '01', '2024-01-20T09:00:00.000Z', '2024-01-20T09:00:00.000Z', 'TCH001', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'),
('STU007', 'Michael Tsang', '曾俊傑', 520, '2A', '02', '2024-01-21T10:30:00.000Z', '2024-01-21T10:30:00.000Z', 'TCH001', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'),
('STU008', 'Jessica Liu', '劉嘉欣', 890, '2B', '01', '2024-01-22T13:45:00.000Z', '2024-01-22T13:45:00.000Z', 'TCH003', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'),
('STU009', 'Kevin Tam', '譚偉強', 410, '2B', '02', '2024-01-23T15:20:00.000Z', '2024-01-23T15:20:00.000Z', 'TCH003', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3'),
('STU010', 'Cindy Ho', '何思穎', 950, '2B', '03', '2024-01-24T08:00:00.000Z', '2024-01-24T08:00:00.000Z', 'TCH003', 'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3');

-- ============================================================================
-- GAMES (20 records)
-- ============================================================================
-- Note: game_id must match the last segment of scratch_api URL

INSERT INTO games (game_id, game_name, student_id, subject, difficulty, teacher_id, last_update, scratch_id, scratch_api, accumulated_click) VALUES
('1207260630', 'Chinese Character Match', 'STU001', 'Chinese Language', 'Beginner', 'TCH001', '2024-01-10T10:00:00.000Z', '123456789', 'https://scratch.mit.edu/projects/1207260630', 15),
('1194305031', 'Vocabulary Builder', 'STU002', 'English Language', 'Beginner', 'TCH001', '2024-01-11T09:15:00.000Z', '234567890', 'https://scratch.mit.edu/projects/1194305031', 23),
('1203222743', 'Math Quiz Adventure', 'STU003', 'Mathematics', 'Beginner', 'TCH001', '2024-01-12T11:00:00.000Z', '345678901', 'https://scratch.mit.edu/projects/1203222743', 41),
('1212234167', 'Science Explorer', 'STU004', 'Humanities and Science', 'Beginner', 'TCH002', '2024-01-13T13:30:00.000Z', '456789012', 'https://scratch.mit.edu/projects/1212234167', 28),
('1225346166', 'Reading Comprehension', 'STU005', 'English Language', 'Intermediate', 'TCH001', '2024-01-17T11:30:00.000Z', '890123456', 'https://scratch.mit.edu/projects/1225346166', 52),
('1209989820', 'Ancient Poetry Challenge', 'STU008', 'Chinese Language', 'Advanced', 'TCH003', '2024-01-18T15:00:00.000Z', '901234567', 'https://scratch.mit.edu/projects/1209989820', 89),
('1222261862', 'Essay Writing Pro', 'STU009', 'English Language', 'Advanced', 'TCH003', '2024-01-19T16:45:00.000Z', '012345678', 'https://scratch.mit.edu/projects/1222261862', 67),
('624682780', 'Multiplication Master', 'STU004', 'Mathematics', 'Intermediate', 'TCH002', '2024-01-13T14:20:00.000Z', '456789012', 'https://scratch.mit.edu/projects/624682780', 62),
('1205555130', 'Idiom Quest', 'STU001', 'Chinese Language', 'Intermediate', 'TCH001', '2024-01-14T10:45:00.000Z', '567890123', 'https://scratch.mit.edu/projects/1205555130', 34),
('1225100628', 'Grammar Master', 'STU005', 'English Language', 'Intermediate', 'TCH001', '2024-01-15T12:00:00.000Z', '678901234', 'https://scratch.mit.edu/projects/1225100628', 45),
('1168960672', 'Geometry Challenge', 'STU006', 'Mathematics', 'Intermediate', 'TCH001', '2024-01-16T14:30:00.000Z', '789012345', 'https://scratch.mit.edu/projects/1168960672', 71),
('1194325699', 'World Geography', 'STU007', 'Humanities and Science', 'Intermediate', 'TCH001', '2024-01-17T09:00:00.000Z', '890123456', 'https://scratch.mit.edu/projects/1194325699', 38),
('1207373858', 'Chinese History', 'STU002', 'Chinese Language', 'Advanced', 'TCH001', '2024-01-18T10:30:00.000Z', '901234567', 'https://scratch.mit.edu/projects/1207373858', 93),
('1222334455', 'Shakespeare Quiz', 'STU003', 'English Language', 'Advanced', 'TCH001', '2024-01-19T12:00:00.000Z', '012345678', 'https://scratch.mit.edu/projects/1222334455', 78),
('1233445566', 'Calculus Basics', 'STU006', 'Mathematics', 'Advanced', 'TCH001', '2024-01-20T13:30:00.000Z', '123456789', 'https://scratch.mit.edu/projects/1233445566', 110),
('1244556677', 'Physics Lab', 'STU007', 'Humanities and Science', 'Advanced', 'TCH001', '2024-01-21T15:00:00.000Z', '234567890', 'https://scratch.mit.edu/projects/1244556677', 84),
('1255667788', 'Spelling Bee', 'STU004', 'English Language', 'Beginner', 'TCH002', '2024-01-22T08:30:00.000Z', '345678901', 'https://scratch.mit.edu/projects/1255667788', 19),
('1266778899', 'Number Patterns', 'STU005', 'Mathematics', 'Beginner', 'TCH002', '2024-01-23T10:00:00.000Z', '456789012', 'https://scratch.mit.edu/projects/1266778899', 26),
('1277889900', 'Solar System Tour', 'STU008', 'Humanities and Science', 'Intermediate', 'TCH003', '2024-01-24T11:30:00.000Z', '567890123', 'https://scratch.mit.edu/projects/1277889900', 55),
('1288990011', 'Classical Literature', 'STU010', 'Chinese Language', 'Advanced', 'TCH003', '2024-01-25T13:00:00.000Z', '678901234', 'https://scratch.mit.edu/projects/1288990011', 97);

-- ============================================================================
-- DATA VERIFICATION QUERIES
-- ============================================================================
-- Uncomment to verify data after seeding:

-- SELECT COUNT(*) as teacher_count FROM teachers;
-- SELECT COUNT(*) as student_count FROM students;
-- SELECT COUNT(*) as game_count FROM games;

-- Verify referential integrity:
-- SELECT COUNT(DISTINCT teacher_id) as unique_teachers_in_students FROM students;
-- SELECT COUNT(DISTINCT teacher_id) as unique_teachers_in_games FROM games;
-- SELECT COUNT(DISTINCT student_id) as unique_students_in_games FROM games;

-- ============================================================================
-- TEST CREDENTIALS
-- ============================================================================
-- Students: Any ID from STU001-STU010, Password: 123
-- Regular Teachers: TCH001 or TCH002, Password: teacher123
-- Admin Teacher: TCH003, Password: admin123
