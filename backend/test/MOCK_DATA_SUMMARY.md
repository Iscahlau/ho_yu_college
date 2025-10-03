# Mock Data Summary

This document provides a quick overview of all mock data available for testing.

## Quick Reference

### Test Credentials

| Role | ID | Password |
|------|-----|----------|
| Students | STU001-STU010 | `student123` |
| Teachers | TCH001, TCH002 | `teacher123` |
| Admin | TCH003 | `admin123` |

### Password Hashes (SHA-256)

```typescript
student123 → 0a041b9462caa4a31bac3567e0b6e6fd9100787db2ab433d96f6d178cabfce90
teacher123 → 8d969eef6ecad3c29a3a629280e686cf0c3f5d5a86aff3ca12020c923adc6c92
admin123   → 240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9
```

## Students (10 records)

| ID | Name | Class | Class No | Marks | Teacher |
|----|------|-------|----------|-------|---------|
| STU001 | John Chan (陳大文) | 1A | 01 | 150 | TCH001 |
| STU002 | Mary Wong (黃小明) | 1A | 02 | 280 | TCH001 |
| STU003 | Peter Lee (李小龍) | 1A | 03 | 450 | TCH001 |
| STU004 | Sarah Lam (林美華) | 1B | 01 | 620 | TCH002 |
| STU005 | David Cheng (鄭志明) | 1B | 02 | 340 | TCH002 |
| STU006 | Emily Ng (吳雅文) | 2A | 01 | 780 | TCH001 |
| STU007 | Michael Tsang (曾俊傑) | 2A | 02 | 520 | TCH001 |
| STU008 | Jessica Liu (劉嘉欣) | 2B | 01 | 890 | TCH003 |
| STU009 | Kevin Tam (譚偉強) | 2B | 02 | 410 | TCH003 |
| STU010 | Cindy Ho (何思穎) | 2B | 03 | 950 | TCH003 |

## Teachers (3 records)

| ID | Responsible Classes | Is Admin |
|----|---------------------|----------|
| TCH001 | 1A, 2A | No |
| TCH002 | 1B | No |
| TCH003 | 2B | Yes |

## Games (20 records)

| ID | Game Name | Student | Subject | Difficulty | Clicks |
|----|-----------|---------|---------|------------|--------|
| GAME001 | Chinese Character Match | STU001 | Chinese Language | Beginner | 15 |
| GAME002 | Vocabulary Builder | STU002 | English Language | Beginner | 28 |
| GAME003 | Addition Adventure | STU003 | Mathematics | Beginner | 45 |
| GAME004 | Science Explorer | STU004 | Humanities and Science | Beginner | 62 |
| GAME005 | Idiom Quest | STU001 | Chinese Language | Intermediate | 34 |
| GAME006 | Grammar Master | STU005 | English Language | Intermediate | 19 |
| GAME007 | Multiplication Challenge | STU006 | Mathematics | Intermediate | 78 |
| GAME008 | Geography Journey | STU007 | Humanities and Science | Intermediate | 52 |
| GAME009 | Ancient Poetry Challenge | STU008 | Chinese Language | Advanced | 89 |
| GAME010 | Essay Writing Pro | STU009 | English Language | Advanced | 95 |
| GAME011 | Algebra Master | STU010 | Mathematics | Advanced | 103 |
| GAME012 | History Detective | STU002 | Humanities and Science | Advanced | 67 |
| GAME013 | Pinyin Practice | STU003 | Chinese Language | Beginner | 41 |
| GAME014 | Spelling Bee | STU004 | English Language | Intermediate | 56 |
| GAME015 | Fraction Fun | STU005 | Mathematics | Intermediate | 72 |
| GAME016 | Plant Biology | STU006 | Humanities and Science | Beginner | 38 |
| GAME017 | Classical Literature | STU007 | Chinese Language | Advanced | 84 |
| GAME018 | Reading Comprehension | STU008 | English Language | Advanced | 91 |
| GAME019 | Geometry Wizard | STU009 | Mathematics | Advanced | 76 |
| GAME020 | Space Exploration | STU010 | Humanities and Science | Intermediate | 110 |

## Subject Distribution

- **Chinese Language**: 5 games
- **English Language**: 5 games
- **Mathematics**: 5 games
- **Humanities and Science**: 5 games

## Difficulty Distribution

- **Beginner**: 7 games
- **Intermediate**: 7 games
- **Advanced**: 6 games

## Data Relationships

- Each student has 1-2 games assigned
- All students have valid teacher references
- All games have valid student and teacher references
- Teachers manage 1-2 classes each
- All classes (1A, 1B, 2A, 2B) have students assigned

## Using Mock Data in Code

### Import All Mock Data
```typescript
import {
  mockStudents,
  mockTeachers,
  mockGames,
  MOCK_STUDENT_PASSWORD,
  MOCK_TEACHER_PASSWORD,
  MOCK_ADMIN_PASSWORD,
} from './test/mocks';
```

### Example Usage
```typescript
// Get a specific student
const student = mockStudents.find(s => s.student_id === 'STU001');

// Find games by difficulty
const beginnerGames = mockGames.filter(g => g.difficulty === 'Beginner');

// Find teacher's students
const teacher1Students = mockStudents.filter(s => s.teacher_id === 'TCH001');

// Test authentication
const loginResult = await login('STU001', MOCK_STUDENT_PASSWORD);
```

## Test Statistics

- **Total Tests**: 56
- **Mock Data Validation**: 37 tests
- **Login Lambda Tests**: 19 tests
- **Test Pass Rate**: 100%

## Notes

- All timestamps use ISO 8601 format (UTC)
- Dates range from January 15-29, 2024
- Student marks range from 150-950 (max: 1000)
- Game clicks range from 15-110
- All passwords are SHA-256 hashed
- Mock data is safe for development/testing only
