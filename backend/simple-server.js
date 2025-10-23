/**
 * Simple Mock Server for Local Development
 * Connects to DynamoDB Local and provides basic API endpoints
 */

const express = require('express');
const cors = require('cors');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const XLSX = require('xlsx');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(express.json());

// DynamoDB Client
const client = new DynamoDBClient({
  region: 'us-east-1',
  endpoint: 'http://localhost:8002',
  credentials: {
    accessKeyId: 'local',
    secretAccessKey: 'local',
  },
});

const docClient = DynamoDBDocumentClient.from(client);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Mock API Server is running',
    dynamodb: 'http://localhost:8002'
  });
});

// Get all students
app.get('/students', async (req, res) => {
  try {
    const result = await docClient.send(
      new ScanCommand({ TableName: 'ho-yu-students' })
    );
    res.json(result.Items || []);
  } catch (error) {
    console.error('Error fetching students:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all teachers
app.get('/teachers', async (req, res) => {
  try {
    const result = await docClient.send(
      new ScanCommand({ TableName: 'ho-yu-teachers' })
    );
    res.json(result.Items || []);
  } catch (error) {
    console.error('Error fetching teachers:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all games
app.get('/games', async (req, res) => {
  try {
    const result = await docClient.send(
      new ScanCommand({ TableName: 'ho-yu-games' })
    );
    res.json(result.Items || []);
  } catch (error) {
    console.error('Error fetching games:', error);
    res.status(500).json({ error: error.message });
  }
});

// Download students data as Excel
app.get('/students/download', async (req, res) => {
  try {
    // Get query parameters (optional class filter)
    const classFilter = req.query.classes?.split(',') || [];

    // Get all students from DynamoDB
    const scanResult = await docClient.send(
      new ScanCommand({ TableName: 'ho-yu-students' })
    );
    let students = scanResult.Items || [];

    // Filter by classes if specified
    if (classFilter.length > 0) {
      students = students.filter(student => classFilter.includes(student.class));
    }

    // Sort students by class and class_no
    students.sort((a, b) => {
      if (a.class !== b.class) {
        return a.class.localeCompare(b.class);
      }
      return a.class_no.localeCompare(b.class_no);
    });

    // Prepare data for Excel
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
      { wch: 8 }, { wch: 10 }, { wch: 20 }, { wch: 20 },
      { wch: 12 }, { wch: 15 }
    ];

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Send Excel file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="students_${new Date().toISOString().split('T')[0]}.xlsx"`);
    res.send(excelBuffer);
  } catch (error) {
    console.error('Error downloading students:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to download student data',
      error: error.message 
    });
  }
});

// Download teachers data as Excel
app.get('/teachers/download', async (req, res) => {
  try {
    // Get all teachers from DynamoDB
    const scanResult = await docClient.send(
      new ScanCommand({ TableName: 'ho-yu-teachers' })
    );
    const teachers = scanResult.Items || [];

    // Sort teachers by teacher_id
    teachers.sort((a, b) => a.teacher_id.localeCompare(b.teacher_id));

    // Prepare data for Excel
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
      { wch: 12 }, { wch: 20 }, { wch: 30 },
      { wch: 20 }, { wch: 10 }, { wch: 15 }
    ];

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Send Excel file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="teachers_${new Date().toISOString().split('T')[0]}.xlsx"`);
    res.send(excelBuffer);
  } catch (error) {
    console.error('Error downloading teachers:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to download teacher data',
      error: error.message 
    });
  }
});

// Download games data as Excel
app.get('/games/download', async (req, res) => {
  try {
    // Get all games from DynamoDB
    const scanResult = await docClient.send(
      new ScanCommand({ TableName: 'ho-yu-games' })
    );
    const games = scanResult.Items || [];

    // Sort games by game_id
    games.sort((a, b) => a.game_id.localeCompare(b.game_id));

    // Prepare data for Excel
    const excelData = games.map(game => ({
      game_id: game.game_id,
      game_name: game.game_name,
      student_id: game.student_id,
      subject: game.subject,
      difficulty: game.difficulty,
      teacher_id: game.teacher_id,
      last_update: game.last_update,
      scratch_id: game.scratch_id,
      scratch_api: game.scratch_api,
      accumulated_click: game.accumulated_click,
    }));

    // Create Excel workbook
    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Games');

    // Set column widths
    worksheet['!cols'] = [
      { wch: 12 }, { wch: 30 }, { wch: 12 }, { wch: 25 },
      { wch: 15 }, { wch: 12 }, { wch: 20 }, { wch: 15 },
      { wch: 40 }, { wch: 15 }
    ];

    // Generate Excel file buffer
    const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    // Send Excel file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="games_${new Date().toISOString().split('T')[0]}.xlsx"`);
    res.send(excelBuffer);
  } catch (error) {
    console.error('Error downloading games:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to download games data',
      error: error.message 
    });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Mock API Server started successfully!');
  console.log('');
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Network: http://0.0.0.0:${PORT}`);
  console.log('');
  console.log('Available endpoints:');
  console.log(`   GET  /health              - Health check`);
  console.log(`   GET  /students            - Get all students`);
  console.log(`   GET  /students/download   - Download students as Excel`);
  console.log(`   GET  /teachers            - Get all teachers`);
  console.log(`   GET  /teachers/download   - Download teachers as Excel`);
  console.log(`   GET  /games               - Get all games`);
  console.log(`   GET  /games/download      - Download games as Excel`);
  console.log('');
  console.log('Connected to DynamoDB Local at http://localhost:8002');
  console.log('Press Ctrl+C to stop the server');
});

