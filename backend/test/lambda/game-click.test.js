"use strict";
/**
 * Game Click Lambda Function Tests
 * Unit tests for game click increment logic and student mark updates
 */
Object.defineProperty(exports, "__esModule", { value: true });
const click_1 = require("../../lambda/games/click");
const mocks_1 = require("../mocks");
// Store click counts and student marks in memory for testing
const clickCounts = new Map();
const studentMarks = new Map();
// Mock AWS SDK
jest.mock('@aws-sdk/client-dynamodb');
jest.mock('@aws-sdk/lib-dynamodb', () => {
    return {
        DynamoDBDocumentClient: {
            from: jest.fn(() => ({
                send: jest.fn((command) => {
                    const { mockGames, mockStudents } = require('../mocks');
                    // Handle GetCommand - check if game exists
                    if (command.input?.TableName && command.input?.Key?.scratch_game_id) {
                        const gameId = command.input.Key.scratch_game_id;
                        const game = mockGames.find((g) => g.scratch_game_id === gameId);
                        // If UpdateExpression is present, it's an UpdateCommand
                        if (command.input.UpdateExpression) {
                            if (!game) {
                                return Promise.resolve({ Attributes: undefined });
                            }
                            // Simulate atomic ADD operation for accumulated_click
                            const currentCount = clickCounts.get(gameId) || game.accumulated_click;
                            const newCount = currentCount + 1;
                            clickCounts.set(gameId, newCount);
                            return Promise.resolve({
                                Attributes: {
                                    ...game,
                                    accumulated_click: newCount,
                                },
                            });
                        }
                        // It's a GetCommand
                        return Promise.resolve({ Item: game });
                    }
                    // Handle student marks update
                    if (command.input?.TableName && command.input?.Key?.student_id) {
                        const studentId = command.input.Key.student_id;
                        const student = mockStudents.find((s) => s.student_id === studentId);
                        if (!student) {
                            return Promise.resolve({ Attributes: undefined });
                        }
                        if (command.input.UpdateExpression) {
                            // Simulate atomic ADD operation for marks
                            const currentMarks = studentMarks.get(studentId) || student.marks;
                            const marksToAdd = command.input.ExpressionAttributeValues[':marksIncrement'];
                            const newMarks = currentMarks + marksToAdd;
                            studentMarks.set(studentId, newMarks);
                            return Promise.resolve({
                                Attributes: {
                                    ...student,
                                    marks: newMarks,
                                },
                            });
                        }
                    }
                    return Promise.resolve({ Item: undefined });
                }),
            })),
        },
        GetCommand: jest.fn((input) => ({ input })),
        UpdateCommand: jest.fn((input) => ({ input })),
    };
});
// Set environment variables
process.env.GAMES_TABLE_NAME = 'ho-yu-games';
process.env.STUDENTS_TABLE_NAME = 'ho-yu-students';
describe('Game Click Lambda Handler', () => {
    // Reset click counts and student marks before each test
    beforeEach(() => {
        clickCounts.clear();
        studentMarks.clear();
        // Initialize with mock data
        mocks_1.mockGames.forEach((game) => {
            clickCounts.set(game.scratch_game_id, game.accumulated_click);
        });
        mocks_1.mockStudents.forEach((student) => {
            studentMarks.set(student.student_id, student.marks);
        });
    });
    const createEvent = (gameId, body) => ({
        body: body ? JSON.stringify(body) : null,
        headers: {},
        multiValueHeaders: {},
        httpMethod: 'POST',
        isBase64Encoded: false,
        path: `/games/${gameId}/click`,
        pathParameters: gameId ? { gameId } : null,
        queryStringParameters: null,
        multiValueQueryStringParameters: null,
        stageVariables: null,
        requestContext: {},
        resource: '',
    });
    describe('Input Validation', () => {
        test('should return 400 if gameId is missing', async () => {
            const event = createEvent(null);
            const result = await (0, click_1.handler)(event);
            expect(result.statusCode).toBe(400);
            expect(JSON.parse(result.body)).toEqual({ message: 'Missing gameId parameter' });
        });
    });
    describe('Game Existence Check', () => {
        test('should return 404 if game does not exist', async () => {
            const event = createEvent('nonexistent-game-id');
            const result = await (0, click_1.handler)(event);
            expect(result.statusCode).toBe(404);
            expect(JSON.parse(result.body)).toEqual({ message: 'Game not found' });
        });
    });
    describe('Click Increment', () => {
        test('should successfully increment click count for existing game', async () => {
            const game = mocks_1.mockGames[0];
            const event = createEvent(game.scratch_game_id);
            const result = await (0, click_1.handler)(event);
            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.success).toBe(true);
            expect(body.accumulated_click).toBe(game.accumulated_click + 1);
        });
        test('should increment click count multiple times', async () => {
            const game = mocks_1.mockGames[1];
            const initialCount = game.accumulated_click;
            // First increment
            let event = createEvent(game.scratch_game_id);
            let result = await (0, click_1.handler)(event);
            let body = JSON.parse(result.body);
            expect(body.accumulated_click).toBe(initialCount + 1);
            // Second increment
            event = createEvent(game.scratch_game_id);
            result = await (0, click_1.handler)(event);
            body = JSON.parse(result.body);
            expect(body.accumulated_click).toBe(initialCount + 2);
            // Third increment
            event = createEvent(game.scratch_game_id);
            result = await (0, click_1.handler)(event);
            body = JSON.parse(result.body);
            expect(body.accumulated_click).toBe(initialCount + 3);
        });
        test('should work for different games independently', async () => {
            const game1 = mocks_1.mockGames[0];
            const game2 = mocks_1.mockGames[1];
            const initialCount1 = game1.accumulated_click;
            const initialCount2 = game2.accumulated_click;
            // Increment game 1
            let event = createEvent(game1.scratch_game_id);
            let result = await (0, click_1.handler)(event);
            let body = JSON.parse(result.body);
            expect(body.accumulated_click).toBe(initialCount1 + 1);
            // Increment game 2
            event = createEvent(game2.scratch_game_id);
            result = await (0, click_1.handler)(event);
            body = JSON.parse(result.body);
            expect(body.accumulated_click).toBe(initialCount2 + 1);
            // Increment game 1 again - should be independent
            event = createEvent(game1.scratch_game_id);
            result = await (0, click_1.handler)(event);
            body = JSON.parse(result.body);
            expect(body.accumulated_click).toBe(initialCount1 + 2);
        });
        test('should work with all mock games', async () => {
            // Test a few random games to ensure it works across the board
            const testGames = [mocks_1.mockGames[2], mocks_1.mockGames[5], mocks_1.mockGames[10], mocks_1.mockGames[15]];
            for (const game of testGames) {
                const event = createEvent(game.scratch_game_id);
                const result = await (0, click_1.handler)(event);
                expect(result.statusCode).toBe(200);
                const body = JSON.parse(result.body);
                expect(body.success).toBe(true);
                expect(body.accumulated_click).toBeGreaterThan(game.accumulated_click);
            }
        });
    });
    describe('Response Headers', () => {
        test('should include CORS headers in successful response', async () => {
            const game = mocks_1.mockGames[0];
            const event = createEvent(game.scratch_game_id);
            const result = await (0, click_1.handler)(event);
            expect(result.headers).toBeDefined();
            expect(result.headers['Content-Type']).toBe('application/json');
            expect(result.headers['Access-Control-Allow-Origin']).toBe('*');
        });
        test('should include CORS headers in error response', async () => {
            const event = createEvent('nonexistent-game');
            const result = await (0, click_1.handler)(event);
            expect(result.headers).toBeDefined();
            expect(result.headers['Content-Type']).toBe('application/json');
            expect(result.headers['Access-Control-Allow-Origin']).toBe('*');
        });
    });
    describe('Concurrent Clicks Simulation', () => {
        test('should handle rapid sequential clicks correctly', async () => {
            const game = mocks_1.mockGames[3];
            const initialCount = game.accumulated_click;
            const numClicks = 10;
            // Simulate rapid clicks
            for (let i = 0; i < numClicks; i++) {
                const event = createEvent(game.scratch_game_id);
                const result = await (0, click_1.handler)(event);
                expect(result.statusCode).toBe(200);
            }
            // Verify final count
            const event = createEvent(game.scratch_game_id);
            const result = await (0, click_1.handler)(event);
            const body = JSON.parse(result.body);
            // Should have incremented by numClicks + 1 (for the final verification call)
            expect(body.accumulated_click).toBe(initialCount + numClicks + 1);
        });
    });
    describe('Response Format', () => {
        test('should return success flag and click count', async () => {
            const game = mocks_1.mockGames[0];
            const event = createEvent(game.scratch_game_id);
            const result = await (0, click_1.handler)(event);
            const body = JSON.parse(result.body);
            expect(body).toHaveProperty('success');
            expect(body).toHaveProperty('accumulated_click');
            expect(typeof body.success).toBe('boolean');
            expect(typeof body.accumulated_click).toBe('number');
        });
    });
    describe('Student Mark Updates', () => {
        test('should update student marks for Beginner difficulty game', async () => {
            const beginnerGame = mocks_1.mockGames.find((g) => g.difficulty === 'Beginner');
            const student = mocks_1.mockStudents[0];
            const initialMarks = student.marks;
            const event = createEvent(beginnerGame.scratch_game_id, {
                student_id: student.student_id,
                role: 'student',
            });
            const result = await (0, click_1.handler)(event);
            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.marks).toBe(initialMarks + 5);
        });
        test('should update student marks for Intermediate difficulty game', async () => {
            const intermediateGame = mocks_1.mockGames.find((g) => g.difficulty === 'Intermediate');
            const student = mocks_1.mockStudents[1];
            const initialMarks = student.marks;
            const event = createEvent(intermediateGame.scratch_game_id, {
                student_id: student.student_id,
                role: 'student',
            });
            const result = await (0, click_1.handler)(event);
            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.marks).toBe(initialMarks + 10);
        });
        test('should update student marks for Advanced difficulty game', async () => {
            const advancedGame = mocks_1.mockGames.find((g) => g.difficulty === 'Advanced');
            const student = mocks_1.mockStudents[2];
            const initialMarks = student.marks;
            const event = createEvent(advancedGame.scratch_game_id, {
                student_id: student.student_id,
                role: 'student',
            });
            const result = await (0, click_1.handler)(event);
            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.marks).toBe(initialMarks + 15);
        });
        test('should NOT update marks for teacher role', async () => {
            const game = mocks_1.mockGames[0];
            const event = createEvent(game.scratch_game_id, {
                student_id: 'TCH001',
                role: 'teacher',
            });
            const result = await (0, click_1.handler)(event);
            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.marks).toBeUndefined();
            expect(body.accumulated_click).toBeDefined();
        });
        test('should NOT update marks for admin role', async () => {
            const game = mocks_1.mockGames[0];
            const event = createEvent(game.scratch_game_id, {
                student_id: 'TCH001',
                role: 'admin',
            });
            const result = await (0, click_1.handler)(event);
            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.marks).toBeUndefined();
            expect(body.accumulated_click).toBeDefined();
        });
        test('should still track click even without user context', async () => {
            const game = mocks_1.mockGames[0];
            const event = createEvent(game.scratch_game_id);
            const result = await (0, click_1.handler)(event);
            expect(result.statusCode).toBe(200);
            const body = JSON.parse(result.body);
            expect(body.success).toBe(true);
            expect(body.accumulated_click).toBeDefined();
            expect(body.marks).toBeUndefined();
        });
        test('should accumulate marks for multiple clicks by same student', async () => {
            const game1 = mocks_1.mockGames.find((g) => g.difficulty === 'Beginner');
            const game2 = mocks_1.mockGames.find((g) => g.difficulty === 'Advanced');
            const student = mocks_1.mockStudents[0];
            const initialMarks = student.marks;
            // First click on Beginner game
            let event = createEvent(game1.scratch_game_id, {
                student_id: student.student_id,
                role: 'student',
            });
            let result = await (0, click_1.handler)(event);
            let body = JSON.parse(result.body);
            expect(body.marks).toBe(initialMarks + 5);
            // Second click on Advanced game
            event = createEvent(game2.scratch_game_id, {
                student_id: student.student_id,
                role: 'student',
            });
            result = await (0, click_1.handler)(event);
            body = JSON.parse(result.body);
            expect(body.marks).toBe(initialMarks + 5 + 15);
        });
    });
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2FtZS1jbGljay50ZXN0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2FtZS1jbGljay50ZXN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7O0FBR0gsb0RBQW1EO0FBQ25ELG9DQUFtRDtBQUVuRCw2REFBNkQ7QUFDN0QsTUFBTSxXQUFXLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7QUFDOUMsTUFBTSxZQUFZLEdBQUcsSUFBSSxHQUFHLEVBQWtCLENBQUM7QUFFL0MsZUFBZTtBQUNmLElBQUksQ0FBQyxJQUFJLENBQUMsMEJBQTBCLENBQUMsQ0FBQztBQUN0QyxJQUFJLENBQUMsSUFBSSxDQUFDLHVCQUF1QixFQUFFLEdBQUcsRUFBRTtJQUN0QyxPQUFPO1FBQ0wsc0JBQXNCLEVBQUU7WUFDdEIsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsR0FBRyxFQUFFLENBQUMsQ0FBQztnQkFDbkIsSUFBSSxFQUFFLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQyxPQUFZLEVBQUUsRUFBRTtvQkFDN0IsTUFBTSxFQUFFLFNBQVMsRUFBRSxZQUFZLEVBQUUsR0FBRyxPQUFPLENBQUMsVUFBVSxDQUFDLENBQUM7b0JBRXhELDJDQUEyQztvQkFDM0MsSUFBSSxPQUFPLENBQUMsS0FBSyxFQUFFLFNBQVMsSUFBSSxPQUFPLENBQUMsS0FBSyxFQUFFLEdBQUcsRUFBRSxlQUFlLEVBQUUsQ0FBQzt3QkFDcEUsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsZUFBZSxDQUFDO3dCQUNqRCxNQUFNLElBQUksR0FBRyxTQUFTLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBTSxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsZUFBZSxLQUFLLE1BQU0sQ0FBQyxDQUFDO3dCQUV0RSx3REFBd0Q7d0JBQ3hELElBQUksT0FBTyxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDOzRCQUNuQyxJQUFJLENB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LENBQUMsQ0FBQztBQUNMLENBQUMsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBHYW1lIENsaWNrIExhbWJkYSBGdW5jdGlvbiBUZXN0c1xuICogVW5pdCB0ZXN0cyBmb3IgZ2FtZSBjbGljayBpbmNyZW1lbnQgbG9naWMgYW5kIHN0dWRlbnQgbWFyayB1cGRhdGVzXG4gKi9cblxuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0IHsgaGFuZGxlciB9IGZyb20gJy4uLy4uL2xhbWJkYS9nYW1lcy9jbGljayc7XG5pbXBvcnQgeyBtb2NrR2FtZXMsIG1vY2tTdHVkZW50cyB9IGZyb20gJy4uL21vY2tzJztcblxuLy8gU3RvcmUgY2xpY2sgY291bnRzIGFuZCBzdHVkZW50IG1hcmtzIGluIG1lbW9yeSBmb3IgdGVzdGluZ1xuY29uc3QgY2xpY2tDb3VudHMgPSBuZXcgTWFwPHN0cmluZywgbnVtYmVyPigpO1xuY29uc3Qgc3R1ZGVudE1hcmtzID0gbmV3IE1hcDxzdHJpbmcsIG51bWJlcj4oKTtcblxuLy8gTW9jayBBV1MgU0RLXG5qZXN0Lm1vY2soJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYicpO1xuamVzdC5tb2NrKCdAYXdzLXNkay9saWItZHluYW1vZGInLCAoKSA9PiB7XG4gIHJldHVybiB7XG4gICAgRHluYW1vREJEb2N1bWVudENsaWVudDoge1xuICAgICAgZnJvbTogamVzdC5mbigoKSA9PiAoe1xuICAgICAgICBzZW5kOiBqZXN0LmZuKChjb21tYW5kOiBhbnkpID0+IHtcbiAgICAgICAgICBjb25zdCB7IG1vY2tHYW1lcywgbW9ja1N0dWRlbnRzIH0gPSByZXF1aXJlKCcuLi9tb2NrcycpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIEhhbmRsZSBHZXRDb21tYW5kIC0gY2hlY2sgaWYgZ2FtZSBleGlzdHNcbiAgICAgICAgICBpZiAoY29tbWFuZC5pbnB1dD8uVGFibGVOYW1lICYmIGNvbW1hbmQuaW5wdXQ/LktleT8uc2NyYXRjaF9nYW1lX2lkKSB7XG4gICAgICAgICAgICBjb25zdCBnYW1lSWQgPSBjb21tYW5kLmlucHV0LktleS5zY3JhdGNoX2dhbWVfaWQ7XG4gICAgICAgICAgICBjb25zdCBnYW1lID0gbW9ja0dhbWVzLmZpbmQoKGc6IGFueSkgPT4gZy5zY3JhdGNoX2dhbWVfaWQgPT09IGdhbWVJZCk7XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIElmIFVwZGF0ZUV4cHJlc3Npb24gaXMgcHJlc2VudCwgaXQncyBhbiBVcGRhdGVDb21tYW5kXG4gICAgICAgICAgICBpZiAoY29tbWFuZC5pbnB1dC5VcGRhdGVFeHByZXNzaW9uKSB7XG4gICAgICAgICAgICAgIGlmICghZ2FtZSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoeyBBdHRyaWJ1dGVzOiB1bmRlZmluZWQgfSk7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIC8vIFNpbXVsYXRlIGF0b21pYyBBREQgb3BlcmF0aW9uIGZvciBhY2N1bXVsYXRlZF9jbGlja1xuICAgICAgICAgICAgICBjb25zdCBjdXJyZW50Q291bnQgPSBjbGlja0NvdW50cy5nZXQoZ2FtZUlkKSB8fCBnYW1lLmFjY3VtdWxhdGVkX2NsaWNrO1xuICAgICAgICAgICAgICBjb25zdCBuZXdDb3VudCA9IGN1cnJlbnRDb3VudCArIDE7XG4gICAgICAgICAgICAgIGNsaWNrQ291bnRzLnNldChnYW1lSWQsIG5ld0NvdW50KTtcbiAgICAgICAgICAgICAgXG4gICAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUoe1xuICAgICAgICAgICAgICAgIEF0dHJpYnV0ZXM6IHtcbiAgICAgICAgICAgICAgICAgIC4uLmdhbWUsXG4gICAgICAgICAgICAgICAgICBhY2N1bXVsYXRlZF9jbGljazogbmV3Q291bnQsXG4gICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBcbiAgICAgICAgICAgIC8vIEl0J3MgYSBHZXRDb21tYW5kXG4gICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHsgSXRlbTogZ2FtZSB9KTtcbiAgICAgICAgICB9XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gSGFuZGxlIHN0dWRlbnQgbWFya3MgdXBkYXRlXG4gICAgICAgICAgaWYgKGNvbW1hbmQuaW5wdXQ/LlRhYmxlTmFtZSAmJiBjb21tYW5kLmlucHV0Py5LZXk/LnN0dWRlbnRfaWQpIHtcbiAgICAgICAgICAgIGNvbnN0IHN0dWRlbnRJZCA9IGNvbW1hbmQuaW5wdXQuS2V5LnN0dWRlbnRfaWQ7XG4gICAgICAgICAgICBjb25zdCBzdHVkZW50ID0gbW9ja1N0dWRlbnRzLmZpbmQoKHM6IGFueSkgPT4gcy5zdHVkZW50X2lkID09PSBzdHVkZW50SWQpO1xuICAgICAgICAgICAgXG4gICAgICAgICAgICBpZiAoIXN0dWRlbnQpIHtcbiAgICAgICAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSh7IEF0dHJpYnV0ZXM6IHVuZGVmaW5lZCB9KTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIFxuICAgICAgICAgICAgaWYgKGNvbW1hbmQuaW5wdXQuVXBkYXRlRXhwcmVzc2lvbikge1xuICAgICAgICAgICAgICAvLyBTaW11bGF0ZSBhdG9taWMgQUREIG9wZXJhdGlvbiBmb3IgbWFya3NcbiAgICAgICAgICAgICAgY29uc3QgY3VycmVudE1hcmtzID0gc3R1ZGVudE1hcmtzLmdldChzdHVkZW50SWQpIHx8IHN0dWRlbnQubWFya3M7XG4gICAgICAgICAgICAgIGNvbnN0IG1hcmtzVG9BZGQgPSBjb21tYW5kLmlucHV0LkV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzptYXJrc0luY3JlbWVudCddO1xuICAgICAgICAgICAgICBjb25zdCBuZXdNYXJrcyA9IGN1cnJlbnRNYXJrcyArIG1hcmtzVG9BZGQ7XG4gICAgICAgICAgICAgIHN0dWRlbnRNYXJrcy5zZXQoc3R1ZGVudElkLCBuZXdNYXJrcyk7XG4gICAgICAgICAgICAgIFxuICAgICAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHtcbiAgICAgICAgICAgICAgICBBdHRyaWJ1dGVzOiB7XG4gICAgICAgICAgICAgICAgICAuLi5zdHVkZW50LFxuICAgICAgICAgICAgICAgICAgbWFya3M6IG5ld01hcmtzLFxuICAgICAgICAgICAgICAgIH0sXG4gICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBcbiAgICAgICAgICByZXR1cm4gUHJvbWlzZS5yZXNvbHZlKHsgSXRlbTogdW5kZWZpbmVkIH0pO1xuICAgICAgICB9KSxcbiAgICAgIH0pKSxcbiAgICB9LFxuICAgIEdldENvbW1hbmQ6IGplc3QuZm4oKGlucHV0OiBhbnkpID0+ICh7IGlucHV0IH0pKSxcbiAgICBVcGRhdGVDb21tYW5kOiBqZXN0LmZuKChpbnB1dDogYW55KSA9PiAoeyBpbnB1dCB9KSksXG4gIH07XG59KTtcblxuLy8gU2V0IGVudmlyb25tZW50IHZhcmlhYmxlc1xucHJvY2Vzcy5lbnYuR0FNRVNfVEFCTEVfTkFNRSA9ICdoby15dS1nYW1lcyc7XG5wcm9jZXNzLmVudi5TVFVERU5UU19UQUJMRV9OQU1FID0gJ2hvLXl1LXN0dWRlbnRzJztcblxuZGVzY3JpYmUoJ0dhbWUgQ2xpY2sgTGFtYmRhIEhhbmRsZXInLCAoKSA9PiB7XG4gIC8vIFJlc2V0IGNsaWNrIGNvdW50cyBhbmQgc3R1ZGVudCBtYXJrcyBiZWZvcmUgZWFjaCB0ZXN0XG4gIGJlZm9yZUVhY2goKCkgPT4ge1xuICAgIGNsaWNrQ291bnRzLmNsZWFyKCk7XG4gICAgc3R1ZGVudE1hcmtzLmNsZWFyKCk7XG4gICAgLy8gSW5pdGlhbGl6ZSB3aXRoIG1vY2sgZGF0YVxuICAgIG1vY2tHYW1lcy5mb3JFYWNoKChnYW1lOiBhbnkpID0+IHtcbiAgICAgIGNsaWNrQ291bnRzLnNldChnYW1lLnNjcmF0Y2hfZ2FtZV9pZCwgZ2FtZS5hY2N1bXVsYXRlZF9jbGljayk7XG4gICAgfSk7XG4gICAgbW9ja1N0dWRlbnRzLmZvckVhY2goKHN0dWRlbnQ6IGFueSkgPT4ge1xuICAgICAgc3R1ZGVudE1hcmtzLnNldChzdHVkZW50LnN0dWRlbnRfaWQsIHN0dWRlbnQubWFya3MpO1xuICAgIH0pO1xuICB9KTtcblxuICBjb25zdCBjcmVhdGVFdmVudCA9IChcbiAgICBnYW1lSWQ6IHN0cmluZyB8IG51bGwsXG4gICAgYm9keT86IGFueVxuICApOiBBUElHYXRld2F5UHJveHlFdmVudCA9PiAoe1xuICAgIGJvZHk6IGJvZHkgPyBKU09OLnN0cmluZ2lmeShib2R5KSA6IG51bGwsXG4gICAgaGVhZGVyczoge30sXG4gICAgbXVsdGlWYWx1ZUhlYWRlcnM6IHt9LFxuICAgIGh0dHBNZXRob2Q6ICdQT1NUJyxcbiAgICBpc0Jhc2U2NEVuY29kZWQ6IGZhbHNlLFxuICAgIHBhdGg6IGAvZ2FtZXMvJHtnYW1lSWR9L2NsaWNrYCxcbiAgICBwYXRoUGFyYW1ldGVyczogZ2FtZUlkID8geyBnYW1lSWQgfSA6IG51bGwsXG4gICAgcXVlcnlTdHJpbmdQYXJhbWV0ZXJzOiBudWxsLFxuICAgIG11bHRpVmFsdWVRdWVyeVN0cmluZ1BhcmFtZXRlcnM6IG51bGwsXG4gICAgc3RhZ2VWYXJpYWJsZXM6IG51bGwsXG4gICAgcmVxdWVzdENvbnRleHQ6IHt9IGFzIGFueSxcbiAgICByZXNvdXJjZTogJycsXG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdJbnB1dCBWYWxpZGF0aW9uJywgKCkgPT4ge1xuICAgIHRlc3QoJ3Nob3VsZCByZXR1cm4gNDAwIGlmIGdhbWVJZCBpcyBtaXNzaW5nJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgZXZlbnQgPSBjcmVhdGVFdmVudChudWxsKTtcbiAgICAgIGNvbnN0IHJlc3VsdDogQVBJR2F0ZXdheVByb3h5UmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSg0MDApO1xuICAgICAgZXhwZWN0KEpTT04ucGFyc2UocmVzdWx0LmJvZHkpKS50b0VxdWFsKHsgbWVzc2FnZTogJ01pc3NpbmcgZ2FtZUlkIHBhcmFtZXRlcicgfSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdHYW1lIEV4aXN0ZW5jZSBDaGVjaycsICgpID0+IHtcbiAgICB0ZXN0KCdzaG91bGQgcmV0dXJuIDQwNCBpZiBnYW1lIGRvZXMgbm90IGV4aXN0JywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgZXZlbnQgPSBjcmVhdGVFdmVudCgnbm9uZXhpc3RlbnQtZ2FtZS1pZCcpO1xuICAgICAgY29uc3QgcmVzdWx0OiBBUElHYXRld2F5UHJveHlSZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDQwNCk7XG4gICAgICBleHBlY3QoSlNPTi5wYXJzZShyZXN1bHQuYm9keSkpLnRvRXF1YWwoeyBtZXNzYWdlOiAnR2FtZSBub3QgZm91bmQnIH0pO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnQ2xpY2sgSW5jcmVtZW50JywgKCkgPT4ge1xuICAgIHRlc3QoJ3Nob3VsZCBzdWNjZXNzZnVsbHkgaW5jcmVtZW50IGNsaWNrIGNvdW50IGZvciBleGlzdGluZyBnYW1lJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgZ2FtZSA9IG1vY2tHYW1lc1swXTtcbiAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlRXZlbnQoZ2FtZS5zY3JhdGNoX2dhbWVfaWQpO1xuICAgICAgY29uc3QgcmVzdWx0OiBBUElHYXRld2F5UHJveHlSZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50KTtcblxuICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDIwMCk7XG4gICAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShyZXN1bHQuYm9keSk7XG4gICAgICBleHBlY3QoYm9keS5zdWNjZXNzKS50b0JlKHRydWUpO1xuICAgICAgZXhwZWN0KGJvZHkuYWNjdW11bGF0ZWRfY2xpY2spLnRvQmUoZ2FtZS5hY2N1bXVsYXRlZF9jbGljayArIDEpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIGluY3JlbWVudCBjbGljayBjb3VudCBtdWx0aXBsZSB0aW1lcycsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGdhbWUgPSBtb2NrR2FtZXNbMV07XG4gICAgICBjb25zdCBpbml0aWFsQ291bnQgPSBnYW1lLmFjY3VtdWxhdGVkX2NsaWNrO1xuICAgICAgXG4gICAgICAvLyBGaXJzdCBpbmNyZW1lbnRcbiAgICAgIGxldCBldmVudCA9IGNyZWF0ZUV2ZW50KGdhbWUuc2NyYXRjaF9nYW1lX2lkKTtcbiAgICAgIGxldCByZXN1bHQ6IEFQSUdhdGV3YXlQcm94eVJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xuICAgICAgbGV0IGJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcbiAgICAgIGV4cGVjdChib2R5LmFjY3VtdWxhdGVkX2NsaWNrKS50b0JlKGluaXRpYWxDb3VudCArIDEpO1xuXG4gICAgICAvLyBTZWNvbmQgaW5jcmVtZW50XG4gICAgICBldmVudCA9IGNyZWF0ZUV2ZW50KGdhbWUuc2NyYXRjaF9nYW1lX2lkKTtcbiAgICAgIHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xuICAgICAgYm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xuICAgICAgZXhwZWN0KGJvZHkuYWNjdW11bGF0ZWRfY2xpY2spLnRvQmUoaW5pdGlhbENvdW50ICsgMik7XG5cbiAgICAgIC8vIFRoaXJkIGluY3JlbWVudFxuICAgICAgZXZlbnQgPSBjcmVhdGVFdmVudChnYW1lLnNjcmF0Y2hfZ2FtZV9pZCk7XG4gICAgICByZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50KTtcbiAgICAgIGJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcbiAgICAgIGV4cGVjdChib2R5LmFjY3VtdWxhdGVkX2NsaWNrKS50b0JlKGluaXRpYWxDb3VudCArIDMpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIHdvcmsgZm9yIGRpZmZlcmVudCBnYW1lcyBpbmRlcGVuZGVudGx5JywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgZ2FtZTEgPSBtb2NrR2FtZXNbMF07XG4gICAgICBjb25zdCBnYW1lMiA9IG1vY2tHYW1lc1sxXTtcbiAgICAgIGNvbnN0IGluaXRpYWxDb3VudDEgPSBnYW1lMS5hY2N1bXVsYXRlZF9jbGljaztcbiAgICAgIGNvbnN0IGluaXRpYWxDb3VudDIgPSBnYW1lMi5hY2N1bXVsYXRlZF9jbGljaztcblxuICAgICAgLy8gSW5jcmVtZW50IGdhbWUgMVxuICAgICAgbGV0IGV2ZW50ID0gY3JlYXRlRXZlbnQoZ2FtZTEuc2NyYXRjaF9nYW1lX2lkKTtcbiAgICAgIGxldCByZXN1bHQ6IEFQSUdhdGV3YXlQcm94eVJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xuICAgICAgbGV0IGJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcbiAgICAgIGV4cGVjdChib2R5LmFjY3VtdWxhdGVkX2NsaWNrKS50b0JlKGluaXRpYWxDb3VudDEgKyAxKTtcblxuICAgICAgLy8gSW5jcmVtZW50IGdhbWUgMlxuICAgICAgZXZlbnQgPSBjcmVhdGVFdmVudChnYW1lMi5zY3JhdGNoX2dhbWVfaWQpO1xuICAgICAgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCk7XG4gICAgICBib2R5ID0gSlNPTi5wYXJzZShyZXN1bHQuYm9keSk7XG4gICAgICBleHBlY3QoYm9keS5hY2N1bXVsYXRlZF9jbGljaykudG9CZShpbml0aWFsQ291bnQyICsgMSk7XG5cbiAgICAgIC8vIEluY3JlbWVudCBnYW1lIDEgYWdhaW4gLSBzaG91bGQgYmUgaW5kZXBlbmRlbnRcbiAgICAgIGV2ZW50ID0gY3JlYXRlRXZlbnQoZ2FtZTEuc2NyYXRjaF9nYW1lX2lkKTtcbiAgICAgIHJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xuICAgICAgYm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xuICAgICAgZXhwZWN0KGJvZHkuYWNjdW11bGF0ZWRfY2xpY2spLnRvQmUoaW5pdGlhbENvdW50MSArIDIpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIHdvcmsgd2l0aCBhbGwgbW9jayBnYW1lcycsIGFzeW5jICgpID0+IHtcbiAgICAgIC8vIFRlc3QgYSBmZXcgcmFuZG9tIGdhbWVzIHRvIGVuc3VyZSBpdCB3b3JrcyBhY3Jvc3MgdGhlIGJvYXJkXG4gICAgICBjb25zdCB0ZXN0R2FtZXMgPSBbbW9ja0dhbWVzWzJdLCBtb2NrR2FtZXNbNV0sIG1vY2tHYW1lc1sxMF0sIG1vY2tHYW1lc1sxNV1dO1xuICAgICAgXG4gICAgICBmb3IgKGNvbnN0IGdhbWUgb2YgdGVzdEdhbWVzKSB7XG4gICAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlRXZlbnQoZ2FtZS5zY3JhdGNoX2dhbWVfaWQpO1xuICAgICAgICBjb25zdCByZXN1bHQ6IEFQSUdhdGV3YXlQcm94eVJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xuICAgICAgICBcbiAgICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDIwMCk7XG4gICAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcbiAgICAgICAgZXhwZWN0KGJvZHkuc3VjY2VzcykudG9CZSh0cnVlKTtcbiAgICAgICAgZXhwZWN0KGJvZHkuYWNjdW11bGF0ZWRfY2xpY2spLnRvQmVHcmVhdGVyVGhhbihnYW1lLmFjY3VtdWxhdGVkX2NsaWNrKTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ1Jlc3BvbnNlIEhlYWRlcnMnLCAoKSA9PiB7XG4gICAgdGVzdCgnc2hvdWxkIGluY2x1ZGUgQ09SUyBoZWFkZXJzIGluIHN1Y2Nlc3NmdWwgcmVzcG9uc2UnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBnYW1lID0gbW9ja0dhbWVzWzBdO1xuICAgICAgY29uc3QgZXZlbnQgPSBjcmVhdGVFdmVudChnYW1lLnNjcmF0Y2hfZ2FtZV9pZCk7XG4gICAgICBjb25zdCByZXN1bHQ6IEFQSUdhdGV3YXlQcm94eVJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0LmhlYWRlcnMpLnRvQmVEZWZpbmVkKCk7XG4gICAgICBleHBlY3QocmVzdWx0LmhlYWRlcnMhWydDb250ZW50LVR5cGUnXSkudG9CZSgnYXBwbGljYXRpb24vanNvbicpO1xuICAgICAgZXhwZWN0KHJlc3VsdC5oZWFkZXJzIVsnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJ10pLnRvQmUoJyonKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCBpbmNsdWRlIENPUlMgaGVhZGVycyBpbiBlcnJvciByZXNwb25zZScsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlRXZlbnQoJ25vbmV4aXN0ZW50LWdhbWUnKTtcbiAgICAgIGNvbnN0IHJlc3VsdDogQVBJR2F0ZXdheVByb3h5UmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQuaGVhZGVycykudG9CZURlZmluZWQoKTtcbiAgICAgIGV4cGVjdChyZXN1bHQuaGVhZGVycyFbJ0NvbnRlbnQtVHlwZSddKS50b0JlKCdhcHBsaWNhdGlvbi9qc29uJyk7XG4gICAgICBleHBlY3QocmVzdWx0LmhlYWRlcnMhWydBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nXSkudG9CZSgnKicpO1xuICAgIH0pO1xuICB9KTtcblxuICBkZXNjcmliZSgnQ29uY3VycmVudCBDbGlja3MgU2ltdWxhdGlvbicsICgpID0+IHtcbiAgICB0ZXN0KCdzaG91bGQgaGFuZGxlIHJhcGlkIHNlcXVlbnRpYWwgY2xpY2tzIGNvcnJlY3RseScsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGdhbWUgPSBtb2NrR2FtZXNbM107XG4gICAgICBjb25zdCBpbml0aWFsQ291bnQgPSBnYW1lLmFjY3VtdWxhdGVkX2NsaWNrO1xuICAgICAgY29uc3QgbnVtQ2xpY2tzID0gMTA7XG5cbiAgICAgIC8vIFNpbXVsYXRlIHJhcGlkIGNsaWNrc1xuICAgICAgZm9yIChsZXQgaSA9IDA7IGkgPCBudW1DbGlja3M7IGkrKykge1xuICAgICAgICBjb25zdCBldmVudCA9IGNyZWF0ZUV2ZW50KGdhbWUuc2NyYXRjaF9nYW1lX2lkKTtcbiAgICAgICAgY29uc3QgcmVzdWx0OiBBUElHYXRld2F5UHJveHlSZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50KTtcbiAgICAgICAgZXhwZWN0KHJlc3VsdC5zdGF0dXNDb2RlKS50b0JlKDIwMCk7XG4gICAgICB9XG5cbiAgICAgIC8vIFZlcmlmeSBmaW5hbCBjb3VudFxuICAgICAgY29uc3QgZXZlbnQgPSBjcmVhdGVFdmVudChnYW1lLnNjcmF0Y2hfZ2FtZV9pZCk7XG4gICAgICBjb25zdCByZXN1bHQ6IEFQSUdhdGV3YXlQcm94eVJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xuICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xuICAgICAgXG4gICAgICAvLyBTaG91bGQgaGF2ZSBpbmNyZW1lbnRlZCBieSBudW1DbGlja3MgKyAxIChmb3IgdGhlIGZpbmFsIHZlcmlmaWNhdGlvbiBjYWxsKVxuICAgICAgZXhwZWN0KGJvZHkuYWNjdW11bGF0ZWRfY2xpY2spLnRvQmUoaW5pdGlhbENvdW50ICsgbnVtQ2xpY2tzICsgMSk7XG4gICAgfSk7XG4gIH0pO1xuXG4gIGRlc2NyaWJlKCdSZXNwb25zZSBGb3JtYXQnLCAoKSA9PiB7XG4gICAgdGVzdCgnc2hvdWxkIHJldHVybiBzdWNjZXNzIGZsYWcgYW5kIGNsaWNrIGNvdW50JywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgZ2FtZSA9IG1vY2tHYW1lc1swXTtcbiAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlRXZlbnQoZ2FtZS5zY3JhdGNoX2dhbWVfaWQpO1xuICAgICAgY29uc3QgcmVzdWx0OiBBUElHYXRld2F5UHJveHlSZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50KTtcblxuICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xuICAgICAgZXhwZWN0KGJvZHkpLnRvSGF2ZVByb3BlcnR5KCdzdWNjZXNzJyk7XG4gICAgICBleHBlY3QoYm9keSkudG9IYXZlUHJvcGVydHkoJ2FjY3VtdWxhdGVkX2NsaWNrJyk7XG4gICAgICBleHBlY3QodHlwZW9mIGJvZHkuc3VjY2VzcykudG9CZSgnYm9vbGVhbicpO1xuICAgICAgZXhwZWN0KHR5cGVvZiBib2R5LmFjY3VtdWxhdGVkX2NsaWNrKS50b0JlKCdudW1iZXInKTtcbiAgICB9KTtcbiAgfSk7XG5cbiAgZGVzY3JpYmUoJ1N0dWRlbnQgTWFyayBVcGRhdGVzJywgKCkgPT4ge1xuICAgIHRlc3QoJ3Nob3VsZCB1cGRhdGUgc3R1ZGVudCBtYXJrcyBmb3IgQmVnaW5uZXIgZGlmZmljdWx0eSBnYW1lJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgYmVnaW5uZXJHYW1lID0gbW9ja0dhbWVzLmZpbmQoKGc6IGFueSkgPT4gZy5kaWZmaWN1bHR5ID09PSAnQmVnaW5uZXInKTtcbiAgICAgIGNvbnN0IHN0dWRlbnQgPSBtb2NrU3R1ZGVudHNbMF07XG4gICAgICBjb25zdCBpbml0aWFsTWFya3MgPSBzdHVkZW50Lm1hcmtzO1xuXG4gICAgICBjb25zdCBldmVudCA9IGNyZWF0ZUV2ZW50KGJlZ2lubmVyR2FtZSEuc2NyYXRjaF9nYW1lX2lkLCB7XG4gICAgICAgIHN0dWRlbnRfaWQ6IHN0dWRlbnQuc3R1ZGVudF9pZCxcbiAgICAgICAgcm9sZTogJ3N0dWRlbnQnLFxuICAgICAgfSk7XG4gICAgICBjb25zdCByZXN1bHQ6IEFQSUdhdGV3YXlQcm94eVJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoMjAwKTtcbiAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcbiAgICAgIGV4cGVjdChib2R5Lm1hcmtzKS50b0JlKGluaXRpYWxNYXJrcyArIDUpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIHVwZGF0ZSBzdHVkZW50IG1hcmtzIGZvciBJbnRlcm1lZGlhdGUgZGlmZmljdWx0eSBnYW1lJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgaW50ZXJtZWRpYXRlR2FtZSA9IG1vY2tHYW1lcy5maW5kKChnOiBhbnkpID0+IGcuZGlmZmljdWx0eSA9PT0gJ0ludGVybWVkaWF0ZScpO1xuICAgICAgY29uc3Qgc3R1ZGVudCA9IG1vY2tTdHVkZW50c1sxXTtcbiAgICAgIGNvbnN0IGluaXRpYWxNYXJrcyA9IHN0dWRlbnQubWFya3M7XG5cbiAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlRXZlbnQoaW50ZXJtZWRpYXRlR2FtZSEuc2NyYXRjaF9nYW1lX2lkLCB7XG4gICAgICAgIHN0dWRlbnRfaWQ6IHN0dWRlbnQuc3R1ZGVudF9pZCxcbiAgICAgICAgcm9sZTogJ3N0dWRlbnQnLFxuICAgICAgfSk7XG4gICAgICBjb25zdCByZXN1bHQ6IEFQSUdhdGV3YXlQcm94eVJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoMjAwKTtcbiAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcbiAgICAgIGV4cGVjdChib2R5Lm1hcmtzKS50b0JlKGluaXRpYWxNYXJrcyArIDEwKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCB1cGRhdGUgc3R1ZGVudCBtYXJrcyBmb3IgQWR2YW5jZWQgZGlmZmljdWx0eSBnYW1lJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgYWR2YW5jZWRHYW1lID0gbW9ja0dhbWVzLmZpbmQoKGc6IGFueSkgPT4gZy5kaWZmaWN1bHR5ID09PSAnQWR2YW5jZWQnKTtcbiAgICAgIGNvbnN0IHN0dWRlbnQgPSBtb2NrU3R1ZGVudHNbMl07XG4gICAgICBjb25zdCBpbml0aWFsTWFya3MgPSBzdHVkZW50Lm1hcmtzO1xuXG4gICAgICBjb25zdCBldmVudCA9IGNyZWF0ZUV2ZW50KGFkdmFuY2VkR2FtZSEuc2NyYXRjaF9nYW1lX2lkLCB7XG4gICAgICAgIHN0dWRlbnRfaWQ6IHN0dWRlbnQuc3R1ZGVudF9pZCxcbiAgICAgICAgcm9sZTogJ3N0dWRlbnQnLFxuICAgICAgfSk7XG4gICAgICBjb25zdCByZXN1bHQ6IEFQSUdhdGV3YXlQcm94eVJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoMjAwKTtcbiAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcbiAgICAgIGV4cGVjdChib2R5Lm1hcmtzKS50b0JlKGluaXRpYWxNYXJrcyArIDE1KTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCBOT1QgdXBkYXRlIG1hcmtzIGZvciB0ZWFjaGVyIHJvbGUnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBnYW1lID0gbW9ja0dhbWVzWzBdO1xuICAgICAgY29uc3QgZXZlbnQgPSBjcmVhdGVFdmVudChnYW1lLnNjcmF0Y2hfZ2FtZV9pZCwge1xuICAgICAgICBzdHVkZW50X2lkOiAnVENIMDAxJyxcbiAgICAgICAgcm9sZTogJ3RlYWNoZXInLFxuICAgICAgfSk7XG4gICAgICBjb25zdCByZXN1bHQ6IEFQSUdhdGV3YXlQcm94eVJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoMjAwKTtcbiAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcbiAgICAgIGV4cGVjdChib2R5Lm1hcmtzKS50b0JlVW5kZWZpbmVkKCk7XG4gICAgICBleHBlY3QoYm9keS5hY2N1bXVsYXRlZF9jbGljaykudG9CZURlZmluZWQoKTtcbiAgICB9KTtcblxuICAgIHRlc3QoJ3Nob3VsZCBOT1QgdXBkYXRlIG1hcmtzIGZvciBhZG1pbiByb2xlJywgYXN5bmMgKCkgPT4ge1xuICAgICAgY29uc3QgZ2FtZSA9IG1vY2tHYW1lc1swXTtcbiAgICAgIGNvbnN0IGV2ZW50ID0gY3JlYXRlRXZlbnQoZ2FtZS5zY3JhdGNoX2dhbWVfaWQsIHtcbiAgICAgICAgc3R1ZGVudF9pZDogJ1RDSDAwMScsXG4gICAgICAgIHJvbGU6ICdhZG1pbicsXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IHJlc3VsdDogQVBJR2F0ZXdheVByb3h5UmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCk7XG5cbiAgICAgIGV4cGVjdChyZXN1bHQuc3RhdHVzQ29kZSkudG9CZSgyMDApO1xuICAgICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UocmVzdWx0LmJvZHkpO1xuICAgICAgZXhwZWN0KGJvZHkubWFya3MpLnRvQmVVbmRlZmluZWQoKTtcbiAgICAgIGV4cGVjdChib2R5LmFjY3VtdWxhdGVkX2NsaWNrKS50b0JlRGVmaW5lZCgpO1xuICAgIH0pO1xuXG4gICAgdGVzdCgnc2hvdWxkIHN0aWxsIHRyYWNrIGNsaWNrIGV2ZW4gd2l0aG91dCB1c2VyIGNvbnRleHQnLCBhc3luYyAoKSA9PiB7XG4gICAgICBjb25zdCBnYW1lID0gbW9ja0dhbWVzWzBdO1xuICAgICAgY29uc3QgZXZlbnQgPSBjcmVhdGVFdmVudChnYW1lLnNjcmF0Y2hfZ2FtZV9pZCk7XG4gICAgICBjb25zdCByZXN1bHQ6IEFQSUdhdGV3YXlQcm94eVJlc3VsdCA9IGF3YWl0IGhhbmRsZXIoZXZlbnQpO1xuXG4gICAgICBleHBlY3QocmVzdWx0LnN0YXR1c0NvZGUpLnRvQmUoMjAwKTtcbiAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKHJlc3VsdC5ib2R5KTtcbiAgICAgIGV4cGVjdChib2R5LnN1Y2Nlc3MpLnRvQmUodHJ1ZSk7XG4gICAgICBleHBlY3QoYm9keS5hY2N1bXVsYXRlZF9jbGljaykudG9CZURlZmluZWQoKTtcbiAgICAgIGV4cGVjdChib2R5Lm1hcmtzKS50b0JlVW5kZWZpbmVkKCk7XG4gICAgfSk7XG5cbiAgICB0ZXN0KCdzaG91bGQgYWNjdW11bGF0ZSBtYXJrcyBmb3IgbXVsdGlwbGUgY2xpY2tzIGJ5IHNhbWUgc3R1ZGVudCcsIGFzeW5jICgpID0+IHtcbiAgICAgIGNvbnN0IGdhbWUxID0gbW9ja0dhbWVzLmZpbmQoKGc6IGFueSkgPT4gZy5kaWZmaWN1bHR5ID09PSAnQmVnaW5uZXInKTtcbiAgICAgIGNvbnN0IGdhbWUyID0gbW9ja0dhbWVzLmZpbmQoKGc6IGFueSkgPT4gZy5kaWZmaWN1bHR5ID09PSAnQWR2YW5jZWQnKTtcbiAgICAgIGNvbnN0IHN0dWRlbnQgPSBtb2NrU3R1ZGVudHNbMF07XG4gICAgICBjb25zdCBpbml0aWFsTWFya3MgPSBzdHVkZW50Lm1hcmtzO1xuXG4gICAgICAvLyBGaXJzdCBjbGljayBvbiBCZWdpbm5lciBnYW1lXG4gICAgICBsZXQgZXZlbnQgPSBjcmVhdGVFdmVudChnYW1lMSEuc2NyYXRjaF9nYW1lX2lkLCB7XG4gICAgICAgIHN0dWRlbnRfaWQ6IHN0dWRlbnQuc3R1ZGVudF9pZCxcbiAgICAgICAgcm9sZTogJ3N0dWRlbnQnLFxuICAgICAgfSk7XG4gICAgICBsZXQgcmVzdWx0OiBBUElHYXRld2F5UHJveHlSZXN1bHQgPSBhd2FpdCBoYW5kbGVyKGV2ZW50KTtcbiAgICAgIGxldCBib2R5ID0gSlNPTi5wYXJzZShyZXN1bHQuYm9keSk7XG4gICAgICBleHBlY3QoYm9keS5tYXJrcykudG9CZShpbml0aWFsTWFya3MgKyA1KTtcblxuICAgICAgLy8gU2Vjb25kIGNsaWNrIG9uIEFkdmFuY2VkIGdhbWVcbiAgICAgIGV2ZW50ID0gY3JlYXRlRXZlbnQoZ2FtZTIhLnNjcmF0Y2hfZ2FtZV9pZCwge1xuICAgICAgICBzdHVkZW50X2lkOiBzdHVkZW50LnN0dWRlbnRfaWQsXG4gICAgICAgIHJvbGU6ICdzdHVkZW50JyxcbiAgICAgIH0pO1xuICAgICAgcmVzdWx0ID0gYXdhaXQgaGFuZGxlcihldmVudCk7XG4gICAgICBib2R5ID0gSlNPTi5wYXJzZShyZXN1bHQuYm9keSk7XG4gICAgICBleHBlY3QoYm9keS5tYXJrcykudG9CZShpbml0aWFsTWFya3MgKyA1ICsgMTUpO1xuICAgIH0pO1xuICB9KTtcbn0pO1xuIl19