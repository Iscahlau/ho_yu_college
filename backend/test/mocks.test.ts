/**
 * Mock Data Validation Tests
 * Ensures mock data conforms to the expected schema
 */

import {
  mockStudents,
  mockTeachers,
  mockGames,
  MOCK_STUDENT_PASSWORD,
  MOCK_TEACHER_PASSWORD,
  MOCK_ADMIN_PASSWORD,
} from './mocks';

describe('Mock Students Data', () => {
  test('should have exactly 10 student records', () => {
    expect(mockStudents).toHaveLength(10);
  });

  test('all students should have required fields', () => {
    mockStudents.forEach((student: any) => {
      expect(student).toHaveProperty('student_id');
      expect(student).toHaveProperty('name_1');
      expect(student).toHaveProperty('name_2');
      expect(student).toHaveProperty('marks');
      expect(student).toHaveProperty('class');
      expect(student).toHaveProperty('class_no');
      expect(student).toHaveProperty('last_login');
      expect(student).toHaveProperty('last_update');
      expect(student).toHaveProperty('teacher_id');
      expect(student).toHaveProperty('password');
    });
  });

  test('student IDs should follow STU### pattern', () => {
    mockStudents.forEach((student: any) => {
      expect(student.student_id).toMatch(/^STU\d{3}$/);
    });
  });

  test('student IDs should be unique', () => {
    const ids = mockStudents.map((s: any) => s.student_id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(mockStudents.length);
  });

  test('marks should be between 0 and 1000', () => {
    mockStudents.forEach((student: any) => {
      expect(student.marks).toBeGreaterThanOrEqual(0);
      expect(student.marks).toBeLessThanOrEqual(1000);
    });
  });

  test('class should be valid format (e.g., 1A, 2B)', () => {
    const validClasses = ['1A', '1B', '2A', '2B'];
    mockStudents.forEach((student: any) => {
      expect(validClasses).toContain(student.class);
    });
  });

  test('class_no should be two-digit format', () => {
    mockStudents.forEach((student: any) => {
      expect(student.class_no).toMatch(/^\d{2}$/);
    });
  });

  test('teacher_id should follow TCH### pattern', () => {
    mockStudents.forEach((student: any) => {
      expect(student.teacher_id).toMatch(/^TCH\d{3}$/);
    });
  });

  test('last_login and last_update should be valid ISO date strings', () => {
    mockStudents.forEach((student: any) => {
      expect(new Date(student.last_login).toISOString()).toBe(student.last_login);
      expect(new Date(student.last_update).toISOString()).toBe(student.last_update);
    });
  });

  test('passwords should match expected values', () => {
    mockStudents.forEach((student: any) => {
      expect(student.password).toBe(MOCK_STUDENT_PASSWORD);
    });
  });
});

describe('Mock Teachers Data', () => {
  test('should have exactly 3 teacher records', () => {
    expect(mockTeachers).toHaveLength(3);
  });

  test('all teachers should have required fields', () => {
    mockTeachers.forEach((teacher: any) => {
      expect(teacher).toHaveProperty('teacher_id');
      expect(teacher).toHaveProperty('name');
      expect(teacher).toHaveProperty('password');
      expect(teacher).toHaveProperty('responsible_class');
      expect(teacher).toHaveProperty('last_login');
      expect(teacher).toHaveProperty('is_admin');
    });
  });

  test('teacher IDs should follow TCH### pattern', () => {
    mockTeachers.forEach((teacher: any) => {
      expect(teacher.teacher_id).toMatch(/^TCH\d{3}$/);
    });
  });

  test('teacher IDs should be unique', () => {
    const ids = mockTeachers.map((t: any) => t.teacher_id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(mockTeachers.length);
  });

  test('responsible_class should be an array', () => {
    mockTeachers.forEach((teacher: any) => {
      expect(Array.isArray(teacher.responsible_class)).toBe(true);
      expect(teacher.responsible_class.length).toBeGreaterThan(0);
    });
  });

  test('is_admin should be a boolean', () => {
    mockTeachers.forEach((teacher: any) => {
      expect(typeof teacher.is_admin).toBe('boolean');
    });
  });

  test('at least one teacher should be an admin', () => {
    const adminTeachers = mockTeachers.filter((t: any) => t.is_admin);
    expect(adminTeachers.length).toBeGreaterThan(0);
  });

  test('teacher names should be non-empty strings', () => {
    mockTeachers.forEach((teacher: any) => {
      expect(typeof teacher.name).toBe('string');
      expect(teacher.name.length).toBeGreaterThan(0);
    });
  });

  test('last_login should be valid ISO date string', () => {
    mockTeachers.forEach((teacher: any) => {
      expect(new Date(teacher.last_login).toISOString()).toBe(teacher.last_login);
    });
  });

  test('passwords should match expected values', () => {
    mockTeachers.forEach((teacher: any) => {
      // Check if password is either teacher or admin password
      const validPasswords = [MOCK_TEACHER_PASSWORD, MOCK_ADMIN_PASSWORD];
      expect(validPasswords).toContain(teacher.password);
    });
  });
});

describe('Mock Games Data', () => {
  test('should have exactly 20 game records', () => {
    expect(mockGames).toHaveLength(20);
  });

  test('all games should have required fields', () => {
    mockGames.forEach((game: any) => {
      expect(game).toHaveProperty('scratch_game_id');
      expect(game).toHaveProperty('game_name');
      expect(game).toHaveProperty('student_id');
      expect(game).toHaveProperty('subject');
      expect(game).toHaveProperty('difficulty');
      expect(game).toHaveProperty('teacher_id');
      expect(game).toHaveProperty('last_update');
      expect(game).toHaveProperty('scratch_id');
      expect(game).toHaveProperty('accumulated_click');
    });
  });

  test('game IDs should be numeric strings', () => {
    mockGames.forEach((game: any) => {
      expect(game.scratch_game_id).toMatch(/^\d+$/);
    });
  });

  test('game IDs should be unique', () => {
    const ids = mockGames.map((g: any) => g.scratch_game_id);
    const uniqueIds = new Set(ids);
    expect(uniqueIds.size).toBe(mockGames.length);
  });

  test('subject should be one of the valid values', () => {
    const validSubjects = [
      'Chinese Language',
      'English Language',
      'Mathematics',
      'Humanities and Science',
    ];
    mockGames.forEach((game: any) => {
      expect(validSubjects).toContain(game.subject);
    });
  });

  test('difficulty should be one of the valid values', () => {
    const validDifficulties = ['Beginner', 'Intermediate', 'Advanced'];
    mockGames.forEach((game: any) => {
      expect(validDifficulties).toContain(game.difficulty);
    });
  });

  test('student_id should follow STU### pattern', () => {
    mockGames.forEach((game: any) => {
      expect(game.student_id).toMatch(/^STU\d{3}$/);
    });
  });

  test('teacher_id should follow TCH### pattern', () => {
    mockGames.forEach((game: any) => {
      expect(game.teacher_id).toMatch(/^TCH\d{3}$/);
    });
  });

  test('accumulated_click should be non-negative', () => {
    mockGames.forEach((game: any) => {
      expect(game.accumulated_click).toBeGreaterThanOrEqual(0);
    });
  });

  test('scratch_id should be numeric string', () => {
    mockGames.forEach((game: any) => {
      expect(game.scratch_id).toMatch(/^\d+$/);
    });
  });

  test('scratch_game_id should be numeric string representing Scratch project ID', () => {
    mockGames.forEach((game: any) => {
      expect(game.scratch_game_id).toMatch(/^\d+$/);
    });
  });

  test('last_update should be valid ISO date string', () => {
    mockGames.forEach((game: any) => {
      expect(new Date(game.last_update).toISOString()).toBe(game.last_update);
    });
  });

  test('all subjects should be represented', () => {
    const subjects = mockGames.map((g: any) => g.subject);
    expect(subjects).toContain('Chinese Language');
    expect(subjects).toContain('English Language');
    expect(subjects).toContain('Mathematics');
    expect(subjects).toContain('Humanities and Science');
  });

  test('all difficulty levels should be represented', () => {
    const difficulties = mockGames.map((g: any) => g.difficulty);
    expect(difficulties).toContain('Beginner');
    expect(difficulties).toContain('Intermediate');
    expect(difficulties).toContain('Advanced');
  });
});

describe('Mock Data Relationships', () => {
  test('all student_ids in games should exist in students', () => {
    const studentIds = mockStudents.map((s: any) => s.student_id);
    mockGames.forEach((game: any) => {
      expect(studentIds).toContain(game.student_id);
    });
  });

  test('all teacher_ids in students should exist in teachers', () => {
    const teacherIds = mockTeachers.map((t: any) => t.teacher_id);
    mockStudents.forEach((student: any) => {
      expect(teacherIds).toContain(student.teacher_id);
    });
  });

  test('all teacher_ids in games should exist in teachers', () => {
    const teacherIds = mockTeachers.map((t: any) => t.teacher_id);
    mockGames.forEach((game: any) => {
      expect(teacherIds).toContain(game.teacher_id);
    });
  });

  test('each student should have at least one game', () => {
    mockStudents.forEach((student: any) => {
      const studentGames = mockGames.filter((g: any) => g.student_id === student.student_id);
      expect(studentGames.length).toBeGreaterThan(0);
    });
  });
});
