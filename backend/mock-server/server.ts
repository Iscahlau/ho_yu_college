/**
 * Mock Server for Local Development
 * Simulates backend APIs using mock data or connects to DynamoDB Local
 */

import express = require('express');
import cors = require('cors');
import * as XLSX from 'xlsx';
import * as dotenv from 'dotenv';
import { mockStudents, mockTeachers, mockGames } from '../test/mocks';
import { 
  GetCommand, 
  ScanCommand, 
  PutCommand, 
  UpdateCommand,
  QueryCommand 
} from '@aws-sdk/lib-dynamodb';
import { createDynamoDBClient, getTableNames } from '../lambda/utils/dynamodb-client';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Configuration
// USE_DYNAMODB explicitly controls whether to use DynamoDB Local or in-memory data
// If not set, defaults to in-memory mode
const USE_DYNAMODB = process.env.USE_DYNAMODB === 'true';

// DynamoDB client (initialized only if needed)
let dynamoDBClient: ReturnType<typeof createDynamoDBClient> | null = null;
let tableNames: ReturnType<typeof getTableNames> | null = null;

if (USE_DYNAMODB) {
  try {
    dynamoDBClient = createDynamoDBClient();
    tableNames = getTableNames();
    console.log('[Mock Server] Using DynamoDB Local mode');
    console.log(`[Mock Server] Tables: ${JSON.stringify(tableNames)}`);
  } catch (error) {
    console.error('[Mock Server] Failed to initialize DynamoDB client:', error);
    console.log('[Mock Server] Falling back to in-memory mode');
  }
}

// In-memory storage for game clicks (simulating database updates when not using DynamoDB)
const gameClicks = new Map<string, number>();

// Initialize game clicks from mock data (for in-memory mode)
if (!USE_DYNAMODB || !dynamoDBClient) {
  mockGames.forEach(game => {
    gameClicks.set(game.game_id, game.accumulated_click);
  });
}

// ===== Authentication Endpoints =====

/**
 * POST /auth/login
 * Login endpoint for students and teachers
 */
app.post('/auth/login', async (req: express.Request, res: express.Response) => {
  const { id, password } = req.body;

  if (!id || !password) {
    res.status(400).json({ message: 'Missing id or password' });
    return;
  }

  try {
    let user: any = null;
    let role: 'student' | 'teacher' | 'admin' = 'student';

    if (USE_DYNAMODB && dynamoDBClient && tableNames) {
      // Try to find student in DynamoDB
      try {
        const studentResult = await dynamoDBClient.send(new GetCommand({
          TableName: tableNames.students,
          Key: { student_id: id },
        }));

        if (studentResult.Item) {
          user = studentResult.Item;
          role = 'student';
        }
      } catch (error) {
        console.error('[Auth] Error fetching student from DynamoDB:', error);
      }

      // If not found, try teacher
      if (!user) {
        try {
          const teacherResult = await dynamoDBClient.send(new GetCommand({
            TableName: tableNames.teachers,
            Key: { teacher_id: id },
          }));

          if (teacherResult.Item) {
            user = teacherResult.Item;
            role = (teacherResult.Item as any).is_admin ? 'admin' : 'teacher';
          }
        } catch (error) {
          console.error('[Auth] Error fetching teacher from DynamoDB:', error);
        }
      }
    } else {
      // Use in-memory mock data
      user = mockStudents.find(s => s.student_id === id);
      
      if (!user) {
        const teacher = mockTeachers.find(t => t.teacher_id === id);
        if (teacher) {
          user = teacher;
          role = teacher.is_admin ? 'admin' : 'teacher';
        }
      }
    }

    // Verify user exists and password matches (plain text comparison)
    if (!user || user.password !== password) {
      res.status(401).json({ message: 'Invalid credentials' });
      return;
    }

    // Remove password from response
    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      user: userWithoutPassword,
      role,
    });
  } catch (error) {
    console.error('[Auth] Login error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// ===== Games Endpoints =====

/**
 * GET /games
 * Fetch all games
 */
app.get('/games', async (req: express.Request, res: express.Response) => {
  try {
    let games: any[] = [];

    if (USE_DYNAMODB && dynamoDBClient && tableNames) {
      // Fetch from DynamoDB
      const result = await dynamoDBClient.send(new ScanCommand({
        TableName: tableNames.games,
      }));
      games = result.Items || [];
    } else {
      // Use in-memory mock data with updated click counts
      games = mockGames.map(game => ({
        ...game,
        accumulated_click: gameClicks.get(game.game_id) || game.accumulated_click,
      }));
    }

    res.json(games);
  } catch (error) {
    console.error('[Games] Error fetching games:', error);
    res.status(500).json({ message: 'Failed to fetch games' });
  }
});

/**
 * GET /games/download
 * Download games data as Excel
 * NOTE: This must be defined before /games/:gameId to avoid route conflicts
 */
app.get('/games/download', async (req: express.Request, res: express.Response) => {
  try {
    let games: any[] = [];

    if (USE_DYNAMODB && dynamoDBClient && tableNames) {
      // Fetch from DynamoDB
      const result = await dynamoDBClient.send(new ScanCommand({
        TableName: tableNames.games,
      }));
      games = result.Items || [];
    } else {
      // Get games with updated click counts
      games = mockGames.map(game => ({
        ...game,
        accumulated_click: gameClicks.get(game.game_id) || game.accumulated_click,
      }));
    }

    // Sort games by game_id
    games.sort((a, b) => a.game_id.localeCompare(b.game_id));

    // Create Excel workbook
    const worksheet = XLSX.utils.json_to_sheet(games);
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
    console.error('[Games] Error downloading games:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download games data',
    });
  }
});

/**
 * GET /games/:gameId
 * Fetch a single game by ID
 */
app.get('/games/:gameId', async (req: express.Request, res: express.Response) => {
  const { gameId } = req.params;

  try {
    let game: any = null;

    if (USE_DYNAMODB && dynamoDBClient && tableNames) {
      // Fetch from DynamoDB
      const result = await dynamoDBClient.send(new GetCommand({
        TableName: tableNames.games,
        Key: { game_id: gameId },
      }));
      game = result.Item;
    } else {
      // Use in-memory mock data
      game = mockGames.find(g => g.game_id === gameId);
      if (game) {
        game = {
          ...game,
          accumulated_click: gameClicks.get(game.game_id) || game.accumulated_click,
        };
      }
    }

    if (!game) {
      res.status(404).json({ message: 'Game not found' });
      return;
    }

    res.json(game);
  } catch (error) {
    console.error('[Games] Error fetching game:', error);
    res.status(500).json({ message: 'Failed to fetch game' });
  }
});

/**
 * POST /games/:gameId/click
 * Increment game click count
 */
app.post('/games/:gameId/click', async (req: express.Request, res: express.Response) => {
  const { gameId } = req.params;

  try {
    let accumulated_click: number;

    if (USE_DYNAMODB && dynamoDBClient && tableNames) {
      // Update in DynamoDB using atomic increment
      const result = await dynamoDBClient.send(new UpdateCommand({
        TableName: tableNames.games,
        Key: { game_id: gameId },
        UpdateExpression: 'SET accumulated_click = if_not_exists(accumulated_click, :zero) + :inc',
        ExpressionAttributeValues: {
          ':inc': 1,
          ':zero': 0,
        },
        ReturnValues: 'ALL_NEW',
      }));

      if (!result.Attributes) {
        res.status(404).json({ message: 'Game not found' });
        return;
      }

      accumulated_click = result.Attributes.accumulated_click;
    } else {
      // Use in-memory mock data
      const game = mockGames.find(g => g.game_id === gameId);

      if (!game) {
        res.status(404).json({ message: 'Game not found' });
        return;
      }

      // Increment click count
      const currentClicks = gameClicks.get(gameId) || game.accumulated_click;
      accumulated_click = currentClicks + 1;
      gameClicks.set(gameId, accumulated_click);
    }

    res.json({
      success: true,
      accumulated_click,
    });
  } catch (error) {
    console.error('[Games] Error incrementing click count:', error);
    res.status(500).json({ message: 'Failed to increment click count' });
  }
});

// ===== Download Endpoints =====

/**
 * GET /students/download
 * Download student data as Excel
 */
app.get('/students/download', async (req: express.Request, res: express.Response) => {
  try {
    const classFilter = req.query.classes ? (req.query.classes as string).split(',') : [];
    
    let students: any[] = [];

    if (USE_DYNAMODB && dynamoDBClient && tableNames) {
      // Fetch from DynamoDB
      const result = await dynamoDBClient.send(new ScanCommand({
        TableName: tableNames.students,
      }));
      students = result.Items || [];

      if (classFilter.length > 0) {
        students = students.filter(s => classFilter.includes(s.class));
      }
    } else {
      // Use in-memory mock data
      students = mockStudents;
      if (classFilter.length > 0) {
        students = mockStudents.filter(s => classFilter.includes(s.class));
      }
    }

    // Sort students by class and class_no
    students.sort((a, b) => {
      if (a.class !== b.class) {
        return a.class.localeCompare(b.class);
      }
      return a.class_no.localeCompare(b.class_no);
    });

    // Include all fields including password
    const excelData = students.map(student => ({
      student_id: student.student_id,
      name_1: student.name_1,
      name_2: student.name_2,
      marks: student.marks,
      class: student.class,
      class_no: student.class_no,
      last_login: student.last_login,
      last_update: student.last_update,
      teacher_id: student.teacher_id,
      password: student.password,
    }));

    // Create Excel workbook
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');

    // Set column widths
    worksheet['!cols'] = [
      { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 8 },
      { wch: 8 }, { wch: 10 }, { wch: 20 }, { wch: 20 }, { wch: 12 }, { wch: 15 }
    ];

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="students_${new Date().toISOString().split('T')[0]}.xlsx"`);
    res.send(excelBuffer);
  } catch (error) {
    console.error('[Students] Error downloading students:', error);
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
app.get('/teachers/download', async (req: express.Request, res: express.Response) => {
  try {
    let teachers: any[] = [];

    if (USE_DYNAMODB && dynamoDBClient && tableNames) {
      // Fetch from DynamoDB
      const result = await dynamoDBClient.send(new ScanCommand({
        TableName: tableNames.teachers,
      }));
      teachers = result.Items || [];
    } else {
      // Use in-memory mock data
      teachers = mockTeachers;
    }

    teachers.sort((a, b) => a.teacher_id.localeCompare(b.teacher_id));

    // Include all fields including password
    const excelData = teachers.map(teacher => ({
      teacher_id: teacher.teacher_id,
      name: teacher.name,
      responsible_class: Array.isArray(teacher.responsible_class) 
        ? teacher.responsible_class.join(', ') 
        : teacher.responsible_class,
      last_login: teacher.last_login,
      is_admin: teacher.is_admin ? 'Yes' : 'No',
      password: teacher.password,
    }));

    // Create Excel workbook
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Teachers');

    // Set column widths
    worksheet['!cols'] = [
      { wch: 12 }, { wch: 20 }, { wch: 30 }, { wch: 20 }, { wch: 10 }, { wch: 15 }
    ];

    // Generate Excel file
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="teachers_${new Date().toISOString().split('T')[0]}.xlsx"`);
    res.send(excelBuffer);
  } catch (error) {
    console.error('[Teachers] Error downloading teachers:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download teacher data',
    });
  }
});

// ===== Server Start =====

app.listen(PORT, () => {
  console.log(`🚀 Mock server running on http://localhost:${PORT}`);
  console.log(`📚 Mode: ${USE_DYNAMODB && dynamoDBClient ? 'DynamoDB Local' : 'In-Memory Mock Data'}`);
  
  if (USE_DYNAMODB && dynamoDBClient && tableNames) {
    console.log(`🗄️  Connected to DynamoDB at ${process.env.DYNAMODB_ENDPOINT || 'http://localhost:8002'}`);
    console.log(`📋 Tables: ${Object.values(tableNames).join(', ')}`);
  }
  
  console.log(`\nAvailable endpoints:`);
  console.log(`  POST   /auth/login`);
  console.log(`  GET    /games`);
  console.log(`  GET    /games/:gameId`);
  console.log(`  POST   /games/:gameId/click`);
  console.log(`  GET    /students/download`);
  console.log(`  GET    /teachers/download`);
  console.log(`  GET    /games/download`);
  
  if (!USE_DYNAMODB || !dynamoDBClient) {
    console.log(`\nMock credentials (in-memory mode):`);
    console.log(`  Students: STU001-STU010, password: "123"`);
    console.log(`  Teachers: TCH001-TCH002, password: "teacher123"`);
    console.log(`  Admin:    TCH003, password: "admin123"`);
  } else {
    console.log(`\nUsing DynamoDB Local - credentials stored in database`);
    console.log(`To switch to in-memory mode, set USE_DYNAMODB=false in .env`);
  }
});
