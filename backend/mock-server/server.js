"use strict";
/**
 * Mock Server for Local Development
 * Simulates backend APIs using mock data or connects to DynamoDB Local
 */
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const cors = require("cors");
const XLSX = require("xlsx");
const dotenv = require("dotenv");
const mocks_1 = require("../test/mocks");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const dynamodb_client_1 = require("../lambda/utils/dynamodb-client");
// Load environment variables
dotenv.config();
const app = express();
const PORT = process.env.PORT || 3000;
// Middleware
app.use(cors());
app.use(express.json());
// Configuration
const USE_DYNAMODB = process.env.USE_DYNAMODB === 'true' || process.env.DYNAMODB_MODE === 'local';
// DynamoDB client (initialized only if needed)
let dynamoDBClient = null;
let tableNames = null;
if (USE_DYNAMODB) {
    try {
        dynamoDBClient = (0, dynamodb_client_1.createDynamoDBClient)();
        tableNames = (0, dynamodb_client_1.getTableNames)();
        console.log('[Mock Server] Using DynamoDB Local mode');
        console.log(`[Mock Server] Tables: ${JSON.stringify(tableNames)}`);
    }
    catch (error) {
        console.error('[Mock Server] Failed to initialize DynamoDB client:', error);
        console.log('[Mock Server] Falling back to in-memory mode');
    }
}
// In-memory storage for game clicks (simulating database updates when not using DynamoDB)
const gameClicks = new Map();
// Initialize game clicks from mock data (for in-memory mode)
if (!USE_DYNAMODB || !dynamoDBClient) {
    mocks_1.mockGames.forEach(game => {
        gameClicks.set(game.game_id, game.accumulated_click);
    });
}
// ===== Authentication Endpoints =====
/**
 * POST /auth/login
 * Login endpoint for students and teachers
 */
app.post('/auth/login', async (req, res) => {
    const { id, password } = req.body;
    if (!id || !password) {
        res.status(400).json({ message: 'Missing id or password' });
        return;
    }
    try {
        let user = null;
        let role = 'student';
        if (USE_DYNAMODB && dynamoDBClient && tableNames) {
            // Try to find student in DynamoDB
            try {
                const studentResult = await dynamoDBClient.send(new lib_dynamodb_1.GetCommand({
                    TableName: tableNames.students,
                    Key: { student_id: id },
                }));
                if (studentResult.Item) {
                    user = studentResult.Item;
                    role = 'student';
                }
            }
            catch (error) {
                console.error('[Auth] Error fetching student from DynamoDB:', error);
            }
            // If not found, try teacher
            if (!user) {
                try {
                    const teacherResult = await dynamoDBClient.send(new lib_dynamodb_1.GetCommand({
                        TableName: tableNames.teachers,
                        Key: { teacher_id: id },
                    }));
                    if (teacherResult.Item) {
                        user = teacherResult.Item;
                        role = teacherResult.Item.is_admin ? 'admin' : 'teacher';
                    }
                }
                catch (error) {
                    console.error('[Auth] Error fetching teacher from DynamoDB:', error);
                }
            }
        }
        else {
            // Use in-memory mock data
            user = mocks_1.mockStudents.find(s => s.student_id === id);
            if (!user) {
                const teacher = mocks_1.mockTeachers.find(t => t.teacher_id === id);
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
    }
    catch (error) {
        console.error('[Auth] Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});
// ===== Games Endpoints =====
/**
 * GET /games
 * Fetch all games
 */
app.get('/games', async (req, res) => {
    try {
        let games = [];
        if (USE_DYNAMODB && dynamoDBClient && tableNames) {
            // Fetch from DynamoDB
            const result = await dynamoDBClient.send(new lib_dynamodb_1.ScanCommand({
                TableName: tableNames.games,
            }));
            games = result.Items || [];
        }
        else {
            // Use in-memory mock data with updated click counts
            games = mocks_1.mockGames.map(game => ({
                ...game,
                accumulated_click: gameClicks.get(game.game_id) || game.accumulated_click,
            }));
        }
        res.json(games);
    }
    catch (error) {
        console.error('[Games] Error fetching games:', error);
        res.status(500).json({ message: 'Failed to fetch games' });
    }
});
/**
 * GET /games/download
 * Download games data as Excel
 * NOTE: This must be defined before /games/:gameId to avoid route conflicts
 */
app.get('/games/download', async (req, res) => {
    try {
        let games = [];
        if (USE_DYNAMODB && dynamoDBClient && tableNames) {
            // Fetch from DynamoDB
            const result = await dynamoDBClient.send(new lib_dynamodb_1.ScanCommand({
                TableName: tableNames.games,
            }));
            games = result.Items || [];
        }
        else {
            // Get games with updated click counts
            games = mocks_1.mockGames.map(game => ({
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
    }
    catch (error) {
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
app.get('/games/:gameId', async (req, res) => {
    const { gameId } = req.params;
    try {
        let game = null;
        if (USE_DYNAMODB && dynamoDBClient && tableNames) {
            // Fetch from DynamoDB
            const result = await dynamoDBClient.send(new lib_dynamodb_1.GetCommand({
                TableName: tableNames.games,
                Key: { game_id: gameId },
            }));
            game = result.Item;
        }
        else {
            // Use in-memory mock data
            game = mocks_1.mockGames.find(g => g.game_id === gameId);
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
    }
    catch (error) {
        console.error('[Games] Error fetching game:', error);
        res.status(500).json({ message: 'Failed to fetch game' });
    }
});
/**
 * POST /games/:gameId/click
 * Increment game click count
 */
app.post('/games/:gameId/click', async (req, res) => {
    const { gameId } = req.params;
    try {
        let accumulated_click;
        if (USE_DYNAMODB && dynamoDBClient && tableNames) {
            // Update in DynamoDB using atomic increment
            const result = await dynamoDBClient.send(new lib_dynamodb_1.UpdateCommand({
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
        }
        else {
            // Use in-memory mock data
            const game = mocks_1.mockGames.find(g => g.game_id === gameId);
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
    }
    catch (error) {
        console.error('[Games] Error incrementing click count:', error);
        res.status(500).json({ message: 'Failed to increment click count' });
    }
});
// ===== Download Endpoints =====
/**
 * GET /students/download
 * Download student data as Excel
 */
app.get('/students/download', async (req, res) => {
    try {
        const classFilter = req.query.classes ? req.query.classes.split(',') : [];
        let students = [];
        if (USE_DYNAMODB && dynamoDBClient && tableNames) {
            // Fetch from DynamoDB
            const result = await dynamoDBClient.send(new lib_dynamodb_1.ScanCommand({
                TableName: tableNames.students,
            }));
            students = result.Items || [];
            if (classFilter.length > 0) {
                students = students.filter(s => classFilter.includes(s.class));
            }
        }
        else {
            // Use in-memory mock data
            students = mocks_1.mockStudents;
            if (classFilter.length > 0) {
                students = mocks_1.mockStudents.filter(s => classFilter.includes(s.class));
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
    }
    catch (error) {
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
app.get('/teachers/download', async (req, res) => {
    try {
        let teachers = [];
        if (USE_DYNAMODB && dynamoDBClient && tableNames) {
            // Fetch from DynamoDB
            const result = await dynamoDBClient.send(new lib_dynamodb_1.ScanCommand({
                TableName: tableNames.teachers,
            }));
            teachers = result.Items || [];
        }
        else {
            // Use in-memory mock data
            teachers = mocks_1.mockTeachers;
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
    }
    catch (error) {
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
    }
    else {
        console.log(`\nUsing DynamoDB Local - credentials stored in database`);
        console.log(`To switch to in-memory mode, set USE_DYNAMODB=false in .env`);
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VydmVyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2VydmVyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7O0FBRUgsbUNBQW9DO0FBQ3BDLDZCQUE4QjtBQUM5Qiw2QkFBNkI7QUFDN0IsaUNBQWlDO0FBQ2pDLHlDQUFzRTtBQUN0RSx3REFNK0I7QUFDL0IscUVBQXNGO0FBRXRGLDZCQUE2QjtBQUM3QixNQUFNLENBQUMsTUFBTSxFQUFFLENBQUM7QUFFaEIsTUFBTSxHQUFHLEdBQUcsT0FBTyxFQUFFLENBQUM7QUFDdEIsTUFBTSxJQUFJLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDO0FBRXRDLGFBQWE7QUFDYixHQUFHLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7QUFDaEIsR0FBRyxDQUFDLEdBQUcsQ0FBQyxPQUFPLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztBQUV4QixnQkFBZ0I7QUFDaEIsTUFBTSxZQUFZLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxZQUFZLEtBQUssTUFBTSxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsYUFBYSxLQUFLLE9BQU8sQ0FBQztBQUVsRywrQ0FBK0M7QUFDL0MsSUFBSSxjQUFjLEdBQW1ELElBQUksQ0FBQztBQUMxRSxJQUFJLFVBQVUsR0FBNEMsSUFBSSxDQUFDO0FBRS9ELElBQUksWUFBWSxFQUFFLENBQUM7SUFDakIsSUFBSSxDQUFDO1FBQ0gsY0FBYyxHQUFHLElBQUEsc0NBQW9CLEdBQUUsQ0FBQztRQUN4QyxVQUFVLEdBQUcsSUFBQSwrQkFBYSxHQUFFLENBQUM7UUFDN0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5Q0FBeUMsQ0FBQyxDQUFDO1FBQ3ZELE9BQU8sQ0FBQyxHQUFHLENBQUMseUJBQXlCLElBQUksQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO0lBQ3JFLENBQUM7SUFBQyxPQUFP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LENBQUMsY0FBYyxFQUFFLENBQUM7UUFDckMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzQ0FBc0MsQ0FBQyxDQUFDO1FBQ3BELE9BQU8sQ0FBQyxHQUFHLENBQUMsNENBQTRDLENBQUMsQ0FBQztRQUMxRCxPQUFPLENBQUMsR0FBRyxDQUFDLG1EQUFtRCxDQUFDLENBQUM7UUFDakUsT0FBTyxDQUFDLEdBQUcsQ0FBQywwQ0FBMEMsQ0FBQyxDQUFDO0lBQzFELENBQUM7U0FBTSxDQUFDO1FBQ04sT0FBTyxDQUFDLEdBQUcsQ0FBQyx5REFBeUQsQ0FBQyxDQUFDO1FBQ3ZFLE9BQU8sQ0FBQyxHQUFHLENBQUMsNkRBQTZELENBQUMsQ0FBQztJQUM3RSxDQUFDO0FBQ0gsQ0FBQyxDQUFDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIE1vY2sgU2VydmVyIGZvciBMb2NhbCBEZXZlbG9wbWVudFxuICogU2ltdWxhdGVzIGJhY2tlbmQgQVBJcyB1c2luZyBtb2NrIGRhdGEgb3IgY29ubmVjdHMgdG8gRHluYW1vREIgTG9jYWxcbiAqL1xuXG5pbXBvcnQgZXhwcmVzcyA9IHJlcXVpcmUoJ2V4cHJlc3MnKTtcbmltcG9ydCBjb3JzID0gcmVxdWlyZSgnY29ycycpO1xuaW1wb3J0ICogYXMgWExTWCBmcm9tICd4bHN4JztcbmltcG9ydCAqIGFzIGRvdGVudiBmcm9tICdkb3RlbnYnO1xuaW1wb3J0IHsgbW9ja1N0dWRlbnRzLCBtb2NrVGVhY2hlcnMsIG1vY2tHYW1lcyB9IGZyb20gJy4uL3Rlc3QvbW9ja3MnO1xuaW1wb3J0IHsgXG4gIEdldENvbW1hbmQsIFxuICBTY2FuQ29tbWFuZCwgXG4gIFB1dENvbW1hbmQsIFxuICBVcGRhdGVDb21tYW5kLFxuICBRdWVyeUNvbW1hbmQgXG59IGZyb20gJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYic7XG5pbXBvcnQgeyBjcmVhdGVEeW5hbW9EQkNsaWVudCwgZ2V0VGFibGVOYW1lcyB9IGZyb20gJy4uL2xhbWJkYS91dGlscy9keW5hbW9kYi1jbGllbnQnO1xuXG4vLyBMb2FkIGVudmlyb25tZW50IHZhcmlhYmxlc1xuZG90ZW52LmNvbmZpZygpO1xuXG5jb25zdCBhcHAgPSBleHByZXNzKCk7XG5jb25zdCBQT1JUID0gcHJvY2Vzcy5lbnYuUE9SVCB8fCAzMDAwO1xuXG4vLyBNaWRkbGV3YXJlXG5hcHAudXNlKGNvcnMoKSk7XG5hcHAudXNlKGV4cHJlc3MuanNvbigpKTtcblxuLy8gQ29uZmlndXJhdGlvblxuY29uc3QgVVNFX0RZTkFNT0RCID0gcHJvY2Vzcy5lbnYuVVNFX0RZTkFNT0RCID09PSAndHJ1ZScgfHwgcHJvY2Vzcy5lbnYuRFlOQU1PREJfTU9ERSA9PT0gJ2xvY2FsJztcblxuLy8gRHluYW1vREIgY2xpZW50IChpbml0aWFsaXplZCBvbmx5IGlmIG5lZWRlZClcbmxldCBkeW5hbW9EQkNsaWVudDogUmV0dXJuVHlwZTx0eXBlb2YgY3JlYXRlRHluYW1vREJDbGllbnQ+IHwgbnVsbCA9IG51bGw7XG5sZXQgdGFibGVOYW1lczogUmV0dXJuVHlwZTx0eXBlb2YgZ2V0VGFibGVOYW1lcz4gfCBudWxsID0gbnVsbDtcblxuaWYgKFVTRV9EWU5BTU9EQikge1xuICB0cnkge1xuICAgIGR5bmFtb0RCQ2xpZW50ID0gY3JlYXRlRHluYW1vREJDbGllbnQoKTtcbiAgICB0YWJsZU5hbWVzID0gZ2V0VGFibGVOYW1lcygpO1xuICAgIGNvbnNvbGUubG9nKCdbTW9jayBTZXJ2ZXJdIFVzaW5nIER5bmFtb0RCIExvY2FsIG1vZGUnKTtcbiAgICBjb25zb2xlLmxvZyhgW01vY2sgU2VydmVyXSBUYWJsZXM6ICR7SlNPTi5zdHJpbmdpZnkodGFibGVOYW1lcyl9YCk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignW01vY2sgU2VydmVyXSBGYWlsZWQgdG8gaW5pdGlhbGl6ZSBEeW5hbW9EQiBjbGllbnQ6JywgZXJyb3IpO1xuICAgIGNvbnNvbGUubG9nKCdbTW9jayBTZXJ2ZXJdIEZhbGxpbmcgYmFjayB0byBpbi1tZW1vcnkgbW9kZScpO1xuICB9XG59XG5cbi8vIEluLW1lbW9yeSBzdG9yYWdlIGZvciBnYW1lIGNsaWNrcyAoc2ltdWxhdGluZyBkYXRhYmFzZSB1cGRhdGVzIHdoZW4gbm90IHVzaW5nIER5bmFtb0RCKVxuY29uc3QgZ2FtZUNsaWNrcyA9IG5ldyBNYXA8c3RyaW5nLCBudW1iZXI+KCk7XG5cbi8vIEluaXRpYWxpemUgZ2FtZSBjbGlja3MgZnJvbSBtb2NrIGRhdGEgKGZvciBpbi1tZW1vcnkgbW9kZSlcbmlmICghVVNFX0RZTkFNT0RCIHx8ICFkeW5hbW9EQkNsaWVudCkge1xuICBtb2NrR2FtZXMuZm9yRWFjaChnYW1lID0+IHtcbiAgICBnYW1lQ2xpY2tzLnNldChnYW1lLmdhbWVfaWQsIGdhbWUuYWNjdW11bGF0ZWRfY2xpY2spO1xuICB9KTtcbn1cblxuLy8gPT09PT0gQXV0aGVudGljYXRpb24gRW5kcG9pbnRzID09PT09XG5cbi8qKlxuICogUE9TVCAvYXV0aC9sb2dpblxuICogTG9naW4gZW5kcG9pbnQgZm9yIHN0dWRlbnRzIGFuZCB0ZWFjaGVyc1xuICovXG5hcHAucG9zdCgnL2F1dGgvbG9naW4nLCBhc3luYyAocmVxOiBleHByZXNzLlJlcXVlc3QsIHJlczogZXhwcmVzcy5SZXNwb25zZSkgPT4ge1xuICBjb25zdCB7IGlkLCBwYXNzd29yZCB9ID0gcmVxLmJvZHk7XG5cbiAgaWYgKCFpZCB8fCAhcGFzc3dvcmQpIHtcbiAgICByZXMuc3RhdHVzKDQwMCkuanNvbih7IG1lc3NhZ2U6ICdNaXNzaW5nIGlkIG9yIHBhc3N3b3JkJyB9KTtcbiAgICByZXR1cm47XG4gIH1cblxuICB0cnkge1xuICAgIGxldCB1c2VyOiBhbnkgPSBudWxsO1xuICAgIGxldCByb2xlOiAnc3R1ZGVudCcgfCAndGVhY2hlcicgfCAnYWRtaW4nID0gJ3N0dWRlbnQnO1xuXG4gICAgaWYgKFVTRV9EWU5BTU9EQiAmJiBkeW5hbW9EQkNsaWVudCAmJiB0YWJsZU5hbWVzKSB7XG4gICAgICAvLyBUcnkgdG8gZmluZCBzdHVkZW50IGluIER5bmFtb0RCXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBzdHVkZW50UmVzdWx0ID0gYXdhaXQgZHluYW1vREJDbGllbnQuc2VuZChuZXcgR2V0Q29tbWFuZCh7XG4gICAgICAgICAgVGFibGVOYW1lOiB0YWJsZU5hbWVzLnN0dWRlbnRzLFxuICAgICAgICAgIEtleTogeyBzdHVkZW50X2lkOiBpZCB9LFxuICAgICAgICB9KSk7XG5cbiAgICAgICAgaWYgKHN0dWRlbnRSZXN1bHQuSXRlbSkge1xuICAgICAgICAgIHVzZXIgPSBzdHVkZW50UmVzdWx0Lkl0ZW07XG4gICAgICAgICAgcm9sZSA9ICdzdHVkZW50JztcbiAgICAgICAgfVxuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignW0F1dGhdIEVycm9yIGZldGNoaW5nIHN0dWRlbnQgZnJvbSBEeW5hbW9EQjonLCBlcnJvcik7XG4gICAgICB9XG5cbiAgICAgIC8vIElmIG5vdCBmb3VuZCwgdHJ5IHRlYWNoZXJcbiAgICAgIGlmICghdXNlcikge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IHRlYWNoZXJSZXN1bHQgPSBhd2FpdCBkeW5hbW9EQkNsaWVudC5zZW5kKG5ldyBHZXRDb21tYW5kKHtcbiAgICAgICAgICAgIFRhYmxlTmFtZTogdGFibGVOYW1lcy50ZWFjaGVycyxcbiAgICAgICAgICAgIEtleTogeyB0ZWFjaGVyX2lkOiBpZCB9LFxuICAgICAgICAgIH0pKTtcblxuICAgICAgICAgIGlmICh0ZWFjaGVyUmVzdWx0Lkl0ZW0pIHtcbiAgICAgICAgICAgIHVzZXIgPSB0ZWFjaGVyUmVzdWx0Lkl0ZW07XG4gICAgICAgICAgICByb2xlID0gKHRlYWNoZXJSZXN1bHQuSXRlbSBhcyBhbnkpLmlzX2FkbWluID8gJ2FkbWluJyA6ICd0ZWFjaGVyJztcbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcignW0F1dGhdIEVycm9yIGZldGNoaW5nIHRlYWNoZXIgZnJvbSBEeW5hbW9EQjonLCBlcnJvcik7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVXNlIGluLW1lbW9yeSBtb2NrIGRhdGFcbiAgICAgIHVzZXIgPSBtb2NrU3R1ZGVudHMuZmluZChzID0+IHMuc3R1ZGVudF9pZCA9PT0gaWQpO1xuICAgICAgXG4gICAgICBpZiAoIXVzZXIpIHtcbiAgICAgICAgY29uc3QgdGVhY2hlciA9IG1vY2tUZWFjaGVycy5maW5kKHQgPT4gdC50ZWFjaGVyX2lkID09PSBpZCk7XG4gICAgICAgIGlmICh0ZWFjaGVyKSB7XG4gICAgICAgICAgdXNlciA9IHRlYWNoZXI7XG4gICAgICAgICAgcm9sZSA9IHRlYWNoZXIuaXNfYWRtaW4gPyAnYWRtaW4nIDogJ3RlYWNoZXInO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gVmVyaWZ5IHVzZXIgZXhpc3RzIGFuZCBwYXNzd29yZCBtYXRjaGVzIChwbGFpbiB0ZXh0IGNvbXBhcmlzb24pXG4gICAgaWYgKCF1c2VyIHx8IHVzZXIucGFzc3dvcmQgIT09IHBhc3N3b3JkKSB7XG4gICAgICByZXMuc3RhdHVzKDQwMSkuanNvbih7IG1lc3NhZ2U6ICdJbnZhbGlkIGNyZWRlbnRpYWxzJyB9KTtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICAvLyBSZW1vdmUgcGFzc3dvcmQgZnJvbSByZXNwb25zZVxuICAgIGNvbnN0IHsgcGFzc3dvcmQ6IF8sIC4uLnVzZXJXaXRob3V0UGFzc3dvcmQgfSA9IHVzZXI7XG5cbiAgICByZXMuanNvbih7XG4gICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgdXNlcjogdXNlcldpdGhvdXRQYXNzd29yZCxcbiAgICAgIHJvbGUsXG4gICAgfSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignW0F1dGhdIExvZ2luIGVycm9yOicsIGVycm9yKTtcbiAgICByZXMuc3RhdHVzKDUwMCkuanNvbih7IG1lc3NhZ2U6ICdJbnRlcm5hbCBzZXJ2ZXIgZXJyb3InIH0pO1xuICB9XG59KTtcblxuLy8gPT09PT0gR2FtZXMgRW5kcG9pbnRzID09PT09XG5cbi8qKlxuICogR0VUIC9nYW1lc1xuICogRmV0Y2ggYWxsIGdhbWVzXG4gKi9cbmFwcC5nZXQoJy9nYW1lcycsIGFzeW5jIChyZXE6IGV4cHJlc3MuUmVxdWVzdCwgcmVzOiBleHByZXNzLlJlc3BvbnNlKSA9PiB7XG4gIHRyeSB7XG4gICAgbGV0IGdhbWVzOiBhbnlbXSA9IFtdO1xuXG4gICAgaWYgKFVTRV9EWU5BTU9EQiAmJiBkeW5hbW9EQkNsaWVudCAmJiB0YWJsZU5hbWVzKSB7XG4gICAgICAvLyBGZXRjaCBmcm9tIER5bmFtb0RCXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBkeW5hbW9EQkNsaWVudC5zZW5kKG5ldyBTY2FuQ29tbWFuZCh7XG4gICAgICAgIFRhYmxlTmFtZTogdGFibGVOYW1lcy5nYW1lcyxcbiAgICAgIH0pKTtcbiAgICAgIGdhbWVzID0gcmVzdWx0Lkl0ZW1zIHx8IFtdO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBVc2UgaW4tbWVtb3J5IG1vY2sgZGF0YSB3aXRoIHVwZGF0ZWQgY2xpY2sgY291bnRzXG4gICAgICBnYW1lcyA9IG1vY2tHYW1lcy5tYXAoZ2FtZSA9PiAoe1xuICAgICAgICAuLi5nYW1lLFxuICAgICAgICBhY2N1bXVsYXRlZF9jbGljazogZ2FtZUNsaWNrcy5nZXQoZ2FtZS5nYW1lX2lkKSB8fCBnYW1lLmFjY3VtdWxhdGVkX2NsaWNrLFxuICAgICAgfSkpO1xuICAgIH1cblxuICAgIHJlcy5qc29uKGdhbWVzKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdbR2FtZXNdIEVycm9yIGZldGNoaW5nIGdhbWVzOicsIGVycm9yKTtcbiAgICByZXMuc3RhdHVzKDUwMCkuanNvbih7IG1lc3NhZ2U6ICdGYWlsZWQgdG8gZmV0Y2ggZ2FtZXMnIH0pO1xuICB9XG59KTtcblxuLyoqXG4gKiBHRVQgL2dhbWVzL2Rvd25sb2FkXG4gKiBEb3dubG9hZCBnYW1lcyBkYXRhIGFzIEV4Y2VsXG4gKiBOT1RFOiBUaGlzIG11c3QgYmUgZGVmaW5lZCBiZWZvcmUgL2dhbWVzLzpnYW1lSWQgdG8gYXZvaWQgcm91dGUgY29uZmxpY3RzXG4gKi9cbmFwcC5nZXQoJy9nYW1lcy9kb3dubG9hZCcsIGFzeW5jIChyZXE6IGV4cHJlc3MuUmVxdWVzdCwgcmVzOiBleHByZXNzLlJlc3BvbnNlKSA9PiB7XG4gIHRyeSB7XG4gICAgbGV0IGdhbWVzOiBhbnlbXSA9IFtdO1xuXG4gICAgaWYgKFVTRV9EWU5BTU9EQiAmJiBkeW5hbW9EQkNsaWVudCAmJiB0YWJsZU5hbWVzKSB7XG4gICAgICAvLyBGZXRjaCBmcm9tIER5bmFtb0RCXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBkeW5hbW9EQkNsaWVudC5zZW5kKG5ldyBTY2FuQ29tbWFuZCh7XG4gICAgICAgIFRhYmxlTmFtZTogdGFibGVOYW1lcy5nYW1lcyxcbiAgICAgIH0pKTtcbiAgICAgIGdhbWVzID0gcmVzdWx0Lkl0ZW1zIHx8IFtdO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBHZXQgZ2FtZXMgd2l0aCB1cGRhdGVkIGNsaWNrIGNvdW50c1xuICAgICAgZ2FtZXMgPSBtb2NrR2FtZXMubWFwKGdhbWUgPT4gKHtcbiAgICAgICAgLi4uZ2FtZSxcbiAgICAgICAgYWNjdW11bGF0ZWRfY2xpY2s6IGdhbWVDbGlja3MuZ2V0KGdhbWUuZ2FtZV9pZCkgfHwgZ2FtZS5hY2N1bXVsYXRlZF9jbGljayxcbiAgICAgIH0pKTtcbiAgICB9XG5cbiAgICAvLyBTb3J0IGdhbWVzIGJ5IGdhbWVfaWRcbiAgICBnYW1lcy5zb3J0KChhLCBiKSA9PiBhLmdhbWVfaWQubG9jYWxlQ29tcGFyZShiLmdhbWVfaWQpKTtcblxuICAgIC8vIENyZWF0ZSBFeGNlbCB3b3JrYm9va1xuICAgIGNvbnN0IHdvcmtzaGVldCA9IFhMU1gudXRpbHMuanNvbl90b19zaGVldChnYW1lcyk7XG4gICAgY29uc3Qgd29ya2Jvb2sgPSBYTFNYLnV0aWxzLmJvb2tfbmV3KCk7XG4gICAgWExTWC51dGlscy5ib29rX2FwcGVuZF9zaGVldCh3b3JrYm9vaywgd29ya3NoZWV0LCAnR2FtZXMnKTtcblxuICAgIC8vIFNldCBjb2x1bW4gd2lkdGhzXG4gICAgd29ya3NoZWV0WychY29scyddID0gW1xuICAgICAgeyB3Y2g6IDEyIH0sIHsgd2NoOiAzMCB9LCB7IHdjaDogMTIgfSwgeyB3Y2g6IDI1IH0sIHsgd2NoOiAxNSB9LFxuICAgICAgeyB3Y2g6IDEyIH0sIHsgd2NoOiAyMCB9LCB7IHdjaDogMTUgfSwgeyB3Y2g6IDQwIH0sIHsgd2NoOiAxNSB9XG4gICAgXTtcblxuICAgIC8vIEdlbmVyYXRlIEV4Y2VsIGZpbGVcbiAgICBjb25zdCBleGNlbEJ1ZmZlciA9IFhMU1gud3JpdGUod29ya2Jvb2ssIHsgdHlwZTogJ2J1ZmZlcicsIGJvb2tUeXBlOiAneGxzeCcgfSk7XG5cbiAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnNwcmVhZHNoZWV0bWwuc2hlZXQnKTtcbiAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LURpc3Bvc2l0aW9uJywgYGF0dGFjaG1lbnQ7IGZpbGVuYW1lPVwiZ2FtZXNfJHtuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkuc3BsaXQoJ1QnKVswXX0ueGxzeFwiYCk7XG4gICAgcmVzLnNlbmQoZXhjZWxCdWZmZXIpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1tHYW1lc10gRXJyb3IgZG93bmxvYWRpbmcgZ2FtZXM6JywgZXJyb3IpO1xuICAgIHJlcy5zdGF0dXMoNTAwKS5qc29uKHtcbiAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgbWVzc2FnZTogJ0ZhaWxlZCB0byBkb3dubG9hZCBnYW1lcyBkYXRhJyxcbiAgICB9KTtcbiAgfVxufSk7XG5cbi8qKlxuICogR0VUIC9nYW1lcy86Z2FtZUlkXG4gKiBGZXRjaCBhIHNpbmdsZSBnYW1lIGJ5IElEXG4gKi9cbmFwcC5nZXQoJy9nYW1lcy86Z2FtZUlkJywgYXN5bmMgKHJlcTogZXhwcmVzcy5SZXF1ZXN0LCByZXM6IGV4cHJlc3MuUmVzcG9uc2UpID0+IHtcbiAgY29uc3QgeyBnYW1lSWQgfSA9IHJlcS5wYXJhbXM7XG5cbiAgdHJ5IHtcbiAgICBsZXQgZ2FtZTogYW55ID0gbnVsbDtcblxuICAgIGlmIChVU0VfRFlOQU1PREIgJiYgZHluYW1vREJDbGllbnQgJiYgdGFibGVOYW1lcykge1xuICAgICAgLy8gRmV0Y2ggZnJvbSBEeW5hbW9EQlxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZHluYW1vREJDbGllbnQuc2VuZChuZXcgR2V0Q29tbWFuZCh7XG4gICAgICAgIFRhYmxlTmFtZTogdGFibGVOYW1lcy5nYW1lcyxcbiAgICAgICAgS2V5OiB7IGdhbWVfaWQ6IGdhbWVJZCB9LFxuICAgICAgfSkpO1xuICAgICAgZ2FtZSA9IHJlc3VsdC5JdGVtO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBVc2UgaW4tbWVtb3J5IG1vY2sgZGF0YVxuICAgICAgZ2FtZSA9IG1vY2tHYW1lcy5maW5kKGcgPT4gZy5nYW1lX2lkID09PSBnYW1lSWQpO1xuICAgICAgaWYgKGdhbWUpIHtcbiAgICAgICAgZ2FtZSA9IHtcbiAgICAgICAgICAuLi5nYW1lLFxuICAgICAgICAgIGFjY3VtdWxhdGVkX2NsaWNrOiBnYW1lQ2xpY2tzLmdldChnYW1lLmdhbWVfaWQpIHx8IGdhbWUuYWNjdW11bGF0ZWRfY2xpY2ssXG4gICAgICAgIH07XG4gICAgICB9XG4gICAgfVxuXG4gICAgaWYgKCFnYW1lKSB7XG4gICAgICByZXMuc3RhdHVzKDQwNCkuanNvbih7IG1lc3NhZ2U6ICdHYW1lIG5vdCBmb3VuZCcgfSk7XG4gICAgICByZXR1cm47XG4gICAgfVxuXG4gICAgcmVzLmpzb24oZ2FtZSk7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignW0dhbWVzXSBFcnJvciBmZXRjaGluZyBnYW1lOicsIGVycm9yKTtcbiAgICByZXMuc3RhdHVzKDUwMCkuanNvbih7IG1lc3NhZ2U6ICdGYWlsZWQgdG8gZmV0Y2ggZ2FtZScgfSk7XG4gIH1cbn0pO1xuXG4vKipcbiAqIFBPU1QgL2dhbWVzLzpnYW1lSWQvY2xpY2tcbiAqIEluY3JlbWVudCBnYW1lIGNsaWNrIGNvdW50XG4gKi9cbmFwcC5wb3N0KCcvZ2FtZXMvOmdhbWVJZC9jbGljaycsIGFzeW5jIChyZXE6IGV4cHJlc3MuUmVxdWVzdCwgcmVzOiBleHByZXNzLlJlc3BvbnNlKSA9PiB7XG4gIGNvbnN0IHsgZ2FtZUlkIH0gPSByZXEucGFyYW1zO1xuXG4gIHRyeSB7XG4gICAgbGV0IGFjY3VtdWxhdGVkX2NsaWNrOiBudW1iZXI7XG5cbiAgICBpZiAoVVNFX0RZTkFNT0RCICYmIGR5bmFtb0RCQ2xpZW50ICYmIHRhYmxlTmFtZXMpIHtcbiAgICAgIC8vIFVwZGF0ZSBpbiBEeW5hbW9EQiB1c2luZyBhdG9taWMgaW5jcmVtZW50XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBkeW5hbW9EQkNsaWVudC5zZW5kKG5ldyBVcGRhdGVDb21tYW5kKHtcbiAgICAgICAgVGFibGVOYW1lOiB0YWJsZU5hbWVzLmdhbWVzLFxuICAgICAgICBLZXk6IHsgZ2FtZV9pZDogZ2FtZUlkIH0sXG4gICAgICAgIFVwZGF0ZUV4cHJlc3Npb246ICdTRVQgYWNjdW11bGF0ZWRfY2xpY2sgPSBpZl9ub3RfZXhpc3RzKGFjY3VtdWxhdGVkX2NsaWNrLCA6emVybykgKyA6aW5jJyxcbiAgICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xuICAgICAgICAgICc6aW5jJzogMSxcbiAgICAgICAgICAnOnplcm8nOiAwLFxuICAgICAgICB9LFxuICAgICAgICBSZXR1cm5WYWx1ZXM6ICdBTExfTkVXJyxcbiAgICAgIH0pKTtcblxuICAgICAgaWYgKCFyZXN1bHQuQXR0cmlidXRlcykge1xuICAgICAgICByZXMuc3RhdHVzKDQwNCkuanNvbih7IG1lc3NhZ2U6ICdHYW1lIG5vdCBmb3VuZCcgfSk7XG4gICAgICAgIHJldHVybjtcbiAgICAgIH1cblxuICAgICAgYWNjdW11bGF0ZWRfY2xpY2sgPSByZXN1bHQuQXR0cmlidXRlcy5hY2N1bXVsYXRlZF9jbGljaztcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVXNlIGluLW1lbW9yeSBtb2NrIGRhdGFcbiAgICAgIGNvbnN0IGdhbWUgPSBtb2NrR2FtZXMuZmluZChnID0+IGcuZ2FtZV9pZCA9PT0gZ2FtZUlkKTtcblxuICAgICAgaWYgKCFnYW1lKSB7XG4gICAgICAgIHJlcy5zdGF0dXMoNDA0KS5qc29uKHsgbWVzc2FnZTogJ0dhbWUgbm90IGZvdW5kJyB9KTtcbiAgICAgICAgcmV0dXJuO1xuICAgICAgfVxuXG4gICAgICAvLyBJbmNyZW1lbnQgY2xpY2sgY291bnRcbiAgICAgIGNvbnN0IGN1cnJlbnRDbGlja3MgPSBnYW1lQ2xpY2tzLmdldChnYW1lSWQpIHx8IGdhbWUuYWNjdW11bGF0ZWRfY2xpY2s7XG4gICAgICBhY2N1bXVsYXRlZF9jbGljayA9IGN1cnJlbnRDbGlja3MgKyAxO1xuICAgICAgZ2FtZUNsaWNrcy5zZXQoZ2FtZUlkLCBhY2N1bXVsYXRlZF9jbGljayk7XG4gICAgfVxuXG4gICAgcmVzLmpzb24oe1xuICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgIGFjY3VtdWxhdGVkX2NsaWNrLFxuICAgIH0pO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1tHYW1lc10gRXJyb3IgaW5jcmVtZW50aW5nIGNsaWNrIGNvdW50OicsIGVycm9yKTtcbiAgICByZXMuc3RhdHVzKDUwMCkuanNvbih7IG1lc3NhZ2U6ICdGYWlsZWQgdG8gaW5jcmVtZW50IGNsaWNrIGNvdW50JyB9KTtcbiAgfVxufSk7XG5cbi8vID09PT09IERvd25sb2FkIEVuZHBvaW50cyA9PT09PVxuXG4vKipcbiAqIEdFVCAvc3R1ZGVudHMvZG93bmxvYWRcbiAqIERvd25sb2FkIHN0dWRlbnQgZGF0YSBhcyBFeGNlbFxuICovXG5hcHAuZ2V0KCcvc3R1ZGVudHMvZG93bmxvYWQnLCBhc3luYyAocmVxOiBleHByZXNzLlJlcXVlc3QsIHJlczogZXhwcmVzcy5SZXNwb25zZSkgPT4ge1xuICB0cnkge1xuICAgIGNvbnN0IGNsYXNzRmlsdGVyID0gcmVxLnF1ZXJ5LmNsYXNzZXMgPyAocmVxLnF1ZXJ5LmNsYXNzZXMgYXMgc3RyaW5nKS5zcGxpdCgnLCcpIDogW107XG4gICAgXG4gICAgbGV0IHN0dWRlbnRzOiBhbnlbXSA9IFtdO1xuXG4gICAgaWYgKFVTRV9EWU5BTU9EQiAmJiBkeW5hbW9EQkNsaWVudCAmJiB0YWJsZU5hbWVzKSB7XG4gICAgICAvLyBGZXRjaCBmcm9tIER5bmFtb0RCXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBkeW5hbW9EQkNsaWVudC5zZW5kKG5ldyBTY2FuQ29tbWFuZCh7XG4gICAgICAgIFRhYmxlTmFtZTogdGFibGVOYW1lcy5zdHVkZW50cyxcbiAgICAgIH0pKTtcbiAgICAgIHN0dWRlbnRzID0gcmVzdWx0Lkl0ZW1zIHx8IFtdO1xuXG4gICAgICBpZiAoY2xhc3NGaWx0ZXIubGVuZ3RoID4gMCkge1xuICAgICAgICBzdHVkZW50cyA9IHN0dWRlbnRzLmZpbHRlcihzID0+IGNsYXNzRmlsdGVyLmluY2x1ZGVzKHMuY2xhc3MpKTtcbiAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgLy8gVXNlIGluLW1lbW9yeSBtb2NrIGRhdGFcbiAgICAgIHN0dWRlbnRzID0gbW9ja1N0dWRlbnRzO1xuICAgICAgaWYgKGNsYXNzRmlsdGVyLmxlbmd0aCA+IDApIHtcbiAgICAgICAgc3R1ZGVudHMgPSBtb2NrU3R1ZGVudHMuZmlsdGVyKHMgPT4gY2xhc3NGaWx0ZXIuaW5jbHVkZXMocy5jbGFzcykpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFNvcnQgc3R1ZGVudHMgYnkgY2xhc3MgYW5kIGNsYXNzX25vXG4gICAgc3R1ZGVudHMuc29ydCgoYSwgYikgPT4ge1xuICAgICAgaWYgKGEuY2xhc3MgIT09IGIuY2xhc3MpIHtcbiAgICAgICAgcmV0dXJuIGEuY2xhc3MubG9jYWxlQ29tcGFyZShiLmNsYXNzKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBhLmNsYXNzX25vLmxvY2FsZUNvbXBhcmUoYi5jbGFzc19ubyk7XG4gICAgfSk7XG5cbiAgICAvLyBJbmNsdWRlIGFsbCBmaWVsZHMgaW5jbHVkaW5nIHBhc3N3b3JkXG4gICAgY29uc3QgZXhjZWxEYXRhID0gc3R1ZGVudHMubWFwKHN0dWRlbnQgPT4gKHtcbiAgICAgIHN0dWRlbnRfaWQ6IHN0dWRlbnQuc3R1ZGVudF9pZCxcbiAgICAgIG5hbWVfMTogc3R1ZGVudC5uYW1lXzEsXG4gICAgICBuYW1lXzI6IHN0dWRlbnQubmFtZV8yLFxuICAgICAgbWFya3M6IHN0dWRlbnQubWFya3MsXG4gICAgICBjbGFzczogc3R1ZGVudC5jbGFzcyxcbiAgICAgIGNsYXNzX25vOiBzdHVkZW50LmNsYXNzX25vLFxuICAgICAgbGFzdF9sb2dpbjogc3R1ZGVudC5sYXN0X2xvZ2luLFxuICAgICAgbGFzdF91cGRhdGU6IHN0dWRlbnQubGFzdF91cGRhdGUsXG4gICAgICB0ZWFjaGVyX2lkOiBzdHVkZW50LnRlYWNoZXJfaWQsXG4gICAgICBwYXNzd29yZDogc3R1ZGVudC5wYXNzd29yZCxcbiAgICB9KSk7XG5cbiAgICAvLyBDcmVhdGUgRXhjZWwgd29ya2Jvb2tcbiAgICBjb25zdCB3b3Jrc2hlZXQgPSBYTFNYLnV0aWxzLmpzb25fdG9fc2hlZXQoZXhjZWxEYXRhKTtcbiAgICBjb25zdCB3b3JrYm9vayA9IFhMU1gudXRpbHMuYm9va19uZXcoKTtcbiAgICBYTFNYLnV0aWxzLmJvb2tfYXBwZW5kX3NoZWV0KHdvcmtib29rLCB3b3Jrc2hlZXQsICdTdHVkZW50cycpO1xuXG4gICAgLy8gU2V0IGNvbHVtbiB3aWR0aHNcbiAgICB3b3Jrc2hlZXRbJyFjb2xzJ10gPSBbXG4gICAgICB7IHdjaDogMTIgfSwgeyB3Y2g6IDIwIH0sIHsgd2NoOiAyMCB9LCB7IHdjaDogOCB9LFxuICAgICAgeyB3Y2g6IDggfSwgeyB3Y2g6IDEwIH0sIHsgd2NoOiAyMCB9LCB7IHdjaDogMjAgfSwgeyB3Y2g6IDEyIH0sIHsgd2NoOiAxNSB9XG4gICAgXTtcblxuICAgIC8vIEdlbmVyYXRlIEV4Y2VsIGZpbGVcbiAgICBjb25zdCBleGNlbEJ1ZmZlciA9IFhMU1gud3JpdGUod29ya2Jvb2ssIHsgdHlwZTogJ2J1ZmZlcicsIGJvb2tUeXBlOiAneGxzeCcgfSk7XG5cbiAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnNwcmVhZHNoZWV0bWwuc2hlZXQnKTtcbiAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LURpc3Bvc2l0aW9uJywgYGF0dGFjaG1lbnQ7IGZpbGVuYW1lPVwic3R1ZGVudHNfJHtuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkuc3BsaXQoJ1QnKVswXX0ueGxzeFwiYCk7XG4gICAgcmVzLnNlbmQoZXhjZWxCdWZmZXIpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1tTdHVkZW50c10gRXJyb3IgZG93bmxvYWRpbmcgc3R1ZGVudHM6JywgZXJyb3IpO1xuICAgIHJlcy5zdGF0dXMoNTAwKS5qc29uKHtcbiAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgbWVzc2FnZTogJ0ZhaWxlZCB0byBkb3dubG9hZCBzdHVkZW50IGRhdGEnLFxuICAgIH0pO1xuICB9XG59KTtcblxuLyoqXG4gKiBHRVQgL3RlYWNoZXJzL2Rvd25sb2FkXG4gKiBEb3dubG9hZCB0ZWFjaGVyIGRhdGEgYXMgRXhjZWwgKEFkbWluIG9ubHkpXG4gKi9cbmFwcC5nZXQoJy90ZWFjaGVycy9kb3dubG9hZCcsIGFzeW5jIChyZXE6IGV4cHJlc3MuUmVxdWVzdCwgcmVzOiBleHByZXNzLlJlc3BvbnNlKSA9PiB7XG4gIHRyeSB7XG4gICAgbGV0IHRlYWNoZXJzOiBhbnlbXSA9IFtdO1xuXG4gICAgaWYgKFVTRV9EWU5BTU9EQiAmJiBkeW5hbW9EQkNsaWVudCAmJiB0YWJsZU5hbWVzKSB7XG4gICAgICAvLyBGZXRjaCBmcm9tIER5bmFtb0RCXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBkeW5hbW9EQkNsaWVudC5zZW5kKG5ldyBTY2FuQ29tbWFuZCh7XG4gICAgICAgIFRhYmxlTmFtZTogdGFibGVOYW1lcy50ZWFjaGVycyxcbiAgICAgIH0pKTtcbiAgICAgIHRlYWNoZXJzID0gcmVzdWx0Lkl0ZW1zIHx8IFtdO1xuICAgIH0gZWxzZSB7XG4gICAgICAvLyBVc2UgaW4tbWVtb3J5IG1vY2sgZGF0YVxuICAgICAgdGVhY2hlcnMgPSBtb2NrVGVhY2hlcnM7XG4gICAgfVxuXG4gICAgdGVhY2hlcnMuc29ydCgoYSwgYikgPT4gYS50ZWFjaGVyX2lkLmxvY2FsZUNvbXBhcmUoYi50ZWFjaGVyX2lkKSk7XG5cbiAgICAvLyBJbmNsdWRlIGFsbCBmaWVsZHMgaW5jbHVkaW5nIHBhc3N3b3JkXG4gICAgY29uc3QgZXhjZWxEYXRhID0gdGVhY2hlcnMubWFwKHRlYWNoZXIgPT4gKHtcbiAgICAgIHRlYWNoZXJfaWQ6IHRlYWNoZXIudGVhY2hlcl9pZCxcbiAgICAgIG5hbWU6IHRlYWNoZXIubmFtZSxcbiAgICAgIHJlc3BvbnNpYmxlX2NsYXNzOiBBcnJheS5pc0FycmF5KHRlYWNoZXIucmVzcG9uc2libGVfY2xhc3MpIFxuICAgICAgICA/IHRlYWNoZXIucmVzcG9uc2libGVfY2xhc3Muam9pbignLCAnKSBcbiAgICAgICAgOiB0ZWFjaGVyLnJlc3BvbnNpYmxlX2NsYXNzLFxuICAgICAgbGFzdF9sb2dpbjogdGVhY2hlci5sYXN0X2xvZ2luLFxuICAgICAgaXNfYWRtaW46IHRlYWNoZXIuaXNfYWRtaW4gPyAnWWVzJyA6ICdObycsXG4gICAgICBwYXNzd29yZDogdGVhY2hlci5wYXNzd29yZCxcbiAgICB9KSk7XG5cbiAgICAvLyBDcmVhdGUgRXhjZWwgd29ya2Jvb2tcbiAgICBjb25zdCB3b3Jrc2hlZXQgPSBYTFNYLnV0aWxzLmpzb25fdG9fc2hlZXQoZXhjZWxEYXRhKTtcbiAgICBjb25zdCB3b3JrYm9vayA9IFhMU1gudXRpbHMuYm9va19uZXcoKTtcbiAgICBYTFNYLnV0aWxzLmJvb2tfYXBwZW5kX3NoZWV0KHdvcmtib29rLCB3b3Jrc2hlZXQsICdUZWFjaGVycycpO1xuXG4gICAgLy8gU2V0IGNvbHVtbiB3aWR0aHNcbiAgICB3b3Jrc2hlZXRbJyFjb2xzJ10gPSBbXG4gICAgICB7IHdjaDogMTIgfSwgeyB3Y2g6IDIwIH0sIHsgd2NoOiAzMCB9LCB7IHdjaDogMjAgfSwgeyB3Y2g6IDEwIH0sIHsgd2NoOiAxNSB9XG4gICAgXTtcblxuICAgIC8vIEdlbmVyYXRlIEV4Y2VsIGZpbGVcbiAgICBjb25zdCBleGNlbEJ1ZmZlciA9IFhMU1gud3JpdGUod29ya2Jvb2ssIHsgdHlwZTogJ2J1ZmZlcicsIGJvb2tUeXBlOiAneGxzeCcgfSk7XG5cbiAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LVR5cGUnLCAnYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnNwcmVhZHNoZWV0bWwuc2hlZXQnKTtcbiAgICByZXMuc2V0SGVhZGVyKCdDb250ZW50LURpc3Bvc2l0aW9uJywgYGF0dGFjaG1lbnQ7IGZpbGVuYW1lPVwidGVhY2hlcnNfJHtuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkuc3BsaXQoJ1QnKVswXX0ueGxzeFwiYCk7XG4gICAgcmVzLnNlbmQoZXhjZWxCdWZmZXIpO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ1tUZWFjaGVyc10gRXJyb3IgZG93bmxvYWRpbmcgdGVhY2hlcnM6JywgZXJyb3IpO1xuICAgIHJlcy5zdGF0dXMoNTAwKS5qc29uKHtcbiAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgbWVzc2FnZTogJ0ZhaWxlZCB0byBkb3dubG9hZCB0ZWFjaGVyIGRhdGEnLFxuICAgIH0pO1xuICB9XG59KTtcblxuLy8gPT09PT0gU2VydmVyIFN0YXJ0ID09PT09XG5cbmFwcC5saXN0ZW4oUE9SVCwgKCkgPT4ge1xuICBjb25zb2xlLmxvZyhg8J+agCBNb2NrIHNlcnZlciBydW5uaW5nIG9uIGh0dHA6Ly9sb2NhbGhvc3Q6JHtQT1JUfWApO1xuICBjb25zb2xlLmxvZyhg8J+TmiBNb2RlOiAke1VTRV9EWU5BTU9EQiAmJiBkeW5hbW9EQkNsaWVudCA/ICdEeW5hbW9EQiBMb2NhbCcgOiAnSW4tTWVtb3J5IE1vY2sgRGF0YSd9YCk7XG4gIFxuICBpZiAoVVNFX0RZTkFNT0RCICYmIGR5bmFtb0RCQ2xpZW50ICYmIHRhYmxlTmFtZXMpIHtcbiAgICBjb25zb2xlLmxvZyhg8J+XhO+4jyAgQ29ubmVjdGVkIHRvIER5bmFtb0RCIGF0ICR7cHJvY2Vzcy5lbnYuRFlOQU1PREJfRU5EUE9JTlQgfHwgJ2h0dHA6Ly9sb2NhbGhvc3Q6ODAwMid9YCk7XG4gICAgY29uc29sZS5sb2coYPCfk4sgVGFibGVzOiAke09iamVjdC52YWx1ZXModGFibGVOYW1lcykuam9pbignLCAnKX1gKTtcbiAgfVxuICBcbiAgY29uc29sZS5sb2coYFxcbkF2YWlsYWJsZSBlbmRwb2ludHM6YCk7XG4gIGNvbnNvbGUubG9nKGAgIFBPU1QgICAvYXV0aC9sb2dpbmApO1xuICBjb25zb2xlLmxvZyhgICBHRVQgICAgL2dhbWVzYCk7XG4gIGNvbnNvbGUubG9nKGAgIEdFVCAgICAvZ2FtZXMvOmdhbWVJZGApO1xuICBjb25zb2xlLmxvZyhgICBQT1NUICAgL2dhbWVzLzpnYW1lSWQvY2xpY2tgKTtcbiAgY29uc29sZS5sb2coYCAgR0VUICAgIC9zdHVkZW50cy9kb3dubG9hZGApO1xuICBjb25zb2xlLmxvZyhgICBHRVQgICAgL3RlYWNoZXJzL2Rvd25sb2FkYCk7XG4gIGNvbnNvbGUubG9nKGAgIEdFVCAgICAvZ2FtZXMvZG93bmxvYWRgKTtcbiAgXG4gIGlmICghVVNFX0RZTkFNT0RCIHx8ICFkeW5hbW9EQkNsaWVudCkge1xuICAgIGNvbnNvbGUubG9nKGBcXG5Nb2NrIGNyZWRlbnRpYWxzIChpbi1tZW1vcnkgbW9kZSk6YCk7XG4gICAgY29uc29sZS5sb2coYCAgU3R1ZGVudHM6IFNUVTAwMS1TVFUwMTAsIHBhc3N3b3JkOiBcIjEyM1wiYCk7XG4gICAgY29uc29sZS5sb2coYCAgVGVhY2hlcnM6IFRDSDAwMS1UQ0gwMDIsIHBhc3N3b3JkOiBcInRlYWNoZXIxMjNcImApO1xuICAgIGNvbnNvbGUubG9nKGAgIEFkbWluOiAgICBUQ0gwMDMsIHBhc3N3b3JkOiBcImFkbWluMTIzXCJgKTtcbiAgfSBlbHNlIHtcbiAgICBjb25zb2xlLmxvZyhgXFxuVXNpbmcgRHluYW1vREIgTG9jYWwgLSBjcmVkZW50aWFscyBzdG9yZWQgaW4gZGF0YWJhc2VgKTtcbiAgICBjb25zb2xlLmxvZyhgVG8gc3dpdGNoIHRvIGluLW1lbW9yeSBtb2RlLCBzZXQgVVNFX0RZTkFNT0RCPWZhbHNlIGluIC5lbnZgKTtcbiAgfVxufSk7XG4iXX0=