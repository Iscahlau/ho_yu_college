/**
 * Mock Server for Local Development
 * Simulates backend APIs using mock data
 */

import express = require('express');
import cors = require('cors');
import crypto = require('crypto');
import * as XLSX from 'xlsx';
import { mockStudents, mockTeachers, mockGames } from '../test/mocks';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Helper function to hash passwords
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

// In-memory storage for game clicks (simulating database updates)
const gameClicks = new Map<string, number>();

// Initialize game clicks from mock data
mockGames.forEach(game => {
  gameClicks.set(game.game_id, game.accumulated_click);
});

// ===== Authentication Endpoints =====

/**
 * POST /auth/login
 * Login endpoint for students and teachers
 */
app.post('/auth/login', (req: express.Request, res: express.Response) => {
  const { id, password } = req.body;

  if (!id || !password) {
    return res.status(400).json({ message: 'Missing id or password' });
  }

  const hashedPassword = hashPassword(password);

  // Try to find student first
  let user = mockStudents.find(s => s.student_id === id);
  let role: 'student' | 'teacher' | 'admin' = 'student';

  // If not found, try teacher
  if (!user) {
    const teacher = mockTeachers.find(t => t.teacher_id === id);
    if (teacher) {
      user = teacher;
      role = teacher.is_admin ? 'admin' : 'teacher';
    }
  }

  // Verify user exists and password matches
  if (!user || user.password !== hashedPassword) {
    return res.status(401).json({ message: 'Invalid credentials' });
  }

  // Remove password from response
  const { password: _, ...userWithoutPassword } = user;

  res.json({
    success: true,
    user: userWithoutPassword,
    role,
  });
});

// ===== Games Endpoints =====

/**
 * GET /games
 * Fetch all games
 */
app.get('/games', (req: express.Request, res: express.Response) => {
  // Return games with updated click counts
  const gamesWithUpdatedClicks = mockGames.map(game => ({
    ...game,
    accumulated_click: gameClicks.get(game.game_id) || game.accumulated_click,
  }));

  res.json(gamesWithUpdatedClicks);
});

/**
 * GET /games/:gameId
 * Fetch a single game by ID
 */
app.get('/games/:gameId', (req: express.Request, res: express.Response) => {
  const { gameId } = req.params;
  const game = mockGames.find(g => g.game_id === gameId);

  if (!game) {
    return res.status(404).json({ message: 'Game not found' });
  }

  // Return game with updated click count
  res.json({
    ...game,
    accumulated_click: gameClicks.get(game.game_id) || game.accumulated_click,
  });
});

/**
 * POST /games/:gameId/click
 * Increment game click count
 */
app.post('/games/:gameId/click', (req: express.Request, res: express.Response) => {
  const { gameId } = req.params;
  const game = mockGames.find(g => g.game_id === gameId);

  if (!game) {
    return res.status(404).json({ message: 'Game not found' });
  }

  // Increment click count
  const currentClicks = gameClicks.get(gameId) || game.accumulated_click;
  gameClicks.set(gameId, currentClicks + 1);

  res.json({
    success: true,
    accumulated_click: gameClicks.get(gameId),
  });
});

// ===== Download Endpoints =====

/**
 * GET /students/download
 * Download student data as Excel
 */
app.get('/students/download', (req: express.Request, res: express.Response) => {
  try {
    const classFilter = req.query.classes ? (req.query.classes as string).split(',') : [];
    
    let students = mockStudents;
    if (classFilter.length > 0) {
      students = mockStudents.filter(s => classFilter.includes(s.class));
    }

    // Sort students by class and class_no
    students.sort((a, b) => {
      if (a.class !== b.class) {
        return a.class.localeCompare(b.class);
      }
      return a.class_no.localeCompare(b.class_no);
    });

    // Remove password field
    const excelData = students.map(student => {
      const { password, ...studentWithoutPassword } = student;
      return studentWithoutPassword;
    });

    // Create Excel workbook
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

    // Set column widths
    worksheet['!cols'] = [
      { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 8 },
      { wch: 8 }, { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 12 }
    ];

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="students_${new Date().toISOString().split('T')[0]}.xlsx"`);
    res.send(excelBuffer);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to download student data',
    });
  }
});

/**
 * GET /teachers/download
 * Download teacher data as Excel (Admin only)
 */
app.get('/teachers/download', (req: express.Request, res: express.Response) => {
  try {
    const teachers = mockTeachers.sort((a, b) => a.teacher_id.localeCompare(b.teacher_id));

    // Remove password field and format responsible_class
    const excelData = teachers.map(teacher => ({
      teacher_id: teacher.teacher_id,
      name: teacher.name,
      responsible_class: teacher.responsible_class.join(', '),
      last_login: teacher.last_login,
      is_admin: teacher.is_admin ? 'Yes' : 'No',
    }));

    // Create Excel workbook
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Teachers');

    // Set column widths
    worksheet['!cols'] = [
      { wch: 12 }, { wch: 20 }, { wch: 30 }, { wch: 20 }, { wch: 10 }
    ];

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="teachers_${new Date().toISOString().split('T')[0]}.xlsx"`);
    res.send(excelBuffer);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to download teacher data',
    });
  }
});

/**
 * GET /games/download
 * Download games data as Excel
 */
app.get('/games/download', (req: express.Request, res: express.Response) => {
  try {
    // Get games with updated click counts
    const gamesWithUpdatedClicks = mockGames.map(game => ({
      ...game,
      accumulated_click: gameClicks.get(game.game_id) || game.accumulated_click,
    }));

    // Sort games by game_id
    gamesWithUpdatedClicks.sort((a, b) => a.game_id.localeCompare(b.game_id));

    // Create Excel workbook
    const worksheet = XLSX.utils.json_to_sheet(gamesWithUpdatedClicks);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Games');

    // Set column widths
    worksheet['!cols'] = [
      { wch: 12 }, { wch: 30 }, { wch: 12 }, { wch: 25 }, { wch: 15 },
      { wch: 12 }, { wch: 20 }, { wch: 15 }, { wch: 40 }, { wch: 15 }
    ];

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="games_${new Date().toISOString().split('T')[0]}.xlsx"`);
    res.send(excelBuffer);
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to download games data',
    });
  }
});

// ===== Server Start =====

app.listen(PORT, () => {
  console.log(`🚀 Mock server running on http://localhost:${PORT}`);
  console.log(`📚 Serving mock data for local development`);
  console.log(`\nAvailable endpoints:`);
  console.log(`  POST   /auth/login`);
  console.log(`  GET    /games`);
  console.log(`  GET    /games/:gameId`);
  console.log(`  POST   /games/:gameId/click`);
  console.log(`  GET    /students/download`);
  console.log(`  GET    /teachers/download`);
  console.log(`  GET    /games/download`);
  console.log(`\nMock credentials:`);
  console.log(`  Students: STU001-STU010, password: "123"`);
  console.log(`  Teachers: TCH001-TCH002, password: "teacher123"`);
  console.log(`  Admin:    TCH003, password: "admin123"`);
});
