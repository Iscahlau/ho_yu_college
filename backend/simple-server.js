/**
 * Simple Mock Server for Local Development
 * Connects to DynamoDB Local and provides basic API endpoints
 */

const express = require('express');
const cors = require('cors');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

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

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log('🚀 Mock API Server started successfully!');
  console.log('');
  console.log(`   Local:   http://localhost:${PORT}`);
  console.log(`   Network: http://0.0.0.0:${PORT}`);
  console.log('');
  console.log('Available endpoints:');
  console.log(`   GET  /health     - Health check`);
  console.log(`   GET  /students   - Get all students`);
  console.log(`   GET  /teachers   - Get all teachers`);
  console.log(`   GET  /games      - Get all games`);
  console.log('');
  console.log('Connected to DynamoDB Local at http://localhost:8002');
  console.log('Press Ctrl+C to stop the server');
});

