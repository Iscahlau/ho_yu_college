# Mock Data and Testing Documentation

This directory contains mock data and unit tests for the Ho Yu College Scratch Game Platform backend.

## Mock Data Overview

Mock data is provided for all three main database tables:

### Students (10 records)
- **IDs**: STU001 through STU010
- **Classes**: 1A, 1B, 2A, 2B
- **Marks Range**: 150-950 (valid range: 0-1000)
- **Password**: All students use the same password: `student123`
- **Password Hash**: SHA-256 hashed passwords stored in the database

### Teachers (3 records)
- **IDs**: TCH001, TCH002, TCH003
- **Responsible Classes**: Each teacher manages 1-2 classes
- **TCH001**: Regular teacher (classes 1A, 2A)
- **TCH002**: Regular teacher (class 1B)
- **TCH003**: Admin teacher (class 2B) - has `is_admin: true`
- **Passwords**: 
  - Regular teachers (TCH001, TCH002): `teacher123`
  - Admin teacher (TCH003): `admin123`

### Games (20 records)
- **IDs**: GAME001 through GAME020
- **Subjects**: Chinese Language, English Language, Mathematics, Humanities and Science
- **Difficulty Levels**: Beginner, Intermediate, Advanced
- **Distribution**: All subjects and difficulty levels are represented
- **Student Assignment**: Each student has at least one game assigned
- **Scratch IDs**: Mock Scratch project IDs (9-digit numbers)

## Data Relationships

The mock data maintains referential integrity:
- All `teacher_id` references in students exist in the teachers table
- All `student_id` references in games exist in the students table
- All `teacher_id` references in games exist in the teachers table
- Each student is assigned to at least one game

## Using Mock Data in Tests

### Import Mock Data

```typescript
import {
  mockStudents,
  mockTeachers,
  mockGames,
  MOCK_STUDENT_PASSWORD,
  MOCK_TEACHER_PASSWORD,
  MOCK_ADMIN_PASSWORD,
  MOCK_STUDENT_PASSWORD_HASH,
  MOCK_TEACHER_PASSWORD_HASH,
  MOCK_ADMIN_PASSWORD_HASH,
} from './mocks';
```

### Example: Test Student Authentication

```typescript
// Use plain text password for login requests
const loginRequest = {
  id: 'STU001',
  password: MOCK_STUDENT_PASSWORD, // 'student123'
};

// Use hashed password for database comparisons
const dbStudent = mockStudents[0];
expect(dbStudent.password).toBe(MOCK_STUDENT_PASSWORD_HASH);
```

### Example: Access Mock Data

```typescript
// Get first student
const student = mockStudents[0];
console.log(student.student_id); // 'STU001'
console.log(student.name_1);     // 'John Chan'
console.log(student.marks);      // 150

// Find admin teacher
const admin = mockTeachers.find(t => t.is_admin);
console.log(admin.teacher_id);   // 'TCH003'

// Filter games by difficulty
const beginnerGames = mockGames.filter(g => g.difficulty === 'Beginner');
console.log(beginnerGames.length); // Multiple games
```

## Running Tests

### Run All Tests
```bash
npm test
```

### Run Specific Test File
```bash
npm test mocks.test
npm test login.test
```

### Run Tests in Watch Mode
```bash
npm test -- --watch
```

### Generate Coverage Report
```bash
npm test -- --coverage
```

## Test Structure

### Mock Data Validation Tests (`mocks.test.ts`)
- **Students**: Validates all 10 student records conform to schema
- **Teachers**: Validates all 3 teacher records conform to schema
- **Games**: Validates all 20 game records conform to schema
- **Relationships**: Ensures referential integrity across tables

### Login Lambda Tests (`lambda/login.test.ts`)
- **Input Validation**: Tests for missing or invalid inputs
- **Student Authentication**: Tests student login success/failure cases
- **Teacher Authentication**: Tests teacher login success/failure cases
- **Admin Authentication**: Tests admin login and role assignment
- **Security**: Validates password hashing and response sanitization
- **CORS Headers**: Ensures proper headers in all responses
- **Edge Cases**: Tests error handling for malformed inputs

## Password Hashing

The application uses SHA-256 hashing for passwords:

```typescript
import * as crypto from 'crypto';

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}
```

## Test Credentials

Use these credentials for testing:

### Students
- **ID**: Any from STU001-STU010
- **Password**: `student123`

### Regular Teachers
- **ID**: TCH001 or TCH002
- **Password**: `teacher123`

### Admin
- **ID**: TCH003
- **Password**: `admin123`

## Extending Mock Data

To add more mock data:

1. Edit the appropriate file in `test/mocks/`:
   - `students.ts` - Student records
   - `teachers.ts` - Teacher records
   - `games.ts` - Game records

2. Ensure data conforms to the TypeScript interfaces in `frontend/src/types/index.ts`

3. Maintain referential integrity (valid foreign key references)

4. Run tests to validate: `npm test`

## Best Practices

1. **Always use constants** for passwords in tests (MOCK_STUDENT_PASSWORD, etc.)
2. **Never commit real passwords** to the repository
3. **Keep mock data realistic** but clearly distinguishable from production data
4. **Maintain referential integrity** when adding new mock records
5. **Update tests** when modifying mock data structure
6. **Document changes** to mock data schema

## Notes

- Mock data uses recent dates (January 2024) for timestamps
- All timestamps are in ISO 8601 format (UTC)
- Student marks range from 150 to 950 points
- Game click counts range from 15 to 110
- Each class (1A, 1B, 2A, 2B) has 2-3 students assigned
