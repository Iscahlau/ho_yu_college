/**
 * Mock Server for Local Development
 * Simulates backend APIs using mock data
 */

import express = require('express');
import cors = require('cors');
import crypto = require('crypto');
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
app.post('/auth/login', (req: express.Request, res: express.Response): any => {
  const { id, password } = req.body;

  if (!id || !password) {
    return res.status(400).json({ message: 'Missing id or password' });
  }

  const hashedPassword = hashPassword(password);

  // Try to find student first
  let user: any = mockStudents.find(s => s.student_id === id);
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

  return res.json({
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
app.get('/games/:gameId', (req: express.Request, res: express.Response): any => {
  const { gameId } = req.params;
  const game = mockGames.find(g => g.game_id === gameId);

  if (!game) {
    return res.status(404).json({ message: 'Game not found' });
  }

  // Return game with updated click count
  return res.json({
    ...game,
    accumulated_click: gameClicks.get(game.game_id) || game.accumulated_click,
  });
});

/**
 * POST /games/:gameId/click
 * Increment game click count
 */
app.post('/games/:gameId/click', (req: express.Request, res: express.Response): any => {
  const { gameId } = req.params;
  const game = mockGames.find(g => g.game_id === gameId);

  if (!game) {
    return res.status(404).json({ message: 'Game not found' });
  }

  // Increment click count
  const currentClicks = gameClicks.get(gameId) || game.accumulated_click;
  gameClicks.set(gameId, currentClicks + 1);

  return res.json({
    success: true,
    accumulated_click: gameClicks.get(gameId),
  });
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
  console.log(`\nMock credentials:`);
  console.log(`  Students: STU001-STU010, password: "123"`);
  console.log(`  Teachers: TCH001-TCH002, password: "teacher123"`);
  console.log(`  Admin:    TCH003, password: "admin123"`);
});
