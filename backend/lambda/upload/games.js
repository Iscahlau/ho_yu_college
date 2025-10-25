"use strict";
/**
 * Upload Games Lambda Handler
 * Handles Excel/CSV file uploads for game data
 * - Skips header row
 * - Upserts records based on game_id
 * - No delete functionality
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const XLSX = require("xlsx");
const dynamodb_client_1 = require("../utils/dynamodb-client");
const handler = async (event) => {
    try {
        // Parse request body
        const body = JSON.parse(event.body || '{}');
        const { file: base64File } = body;
        if (!base64File) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    success: false,
                    message: 'No file uploaded'
                }),
            };
        }
        // Decode base64 to buffer
        const fileBuffer = Buffer.from(base64File, 'base64');
        // Parse Excel/CSV file
        const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        // Convert to JSON, using first row as headers
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        // Validate file has data
        if (jsonData.length < 2) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    success: false,
                    message: 'File is empty or contains no data rows'
                }),
            };
        }
        // Extract headers (first row) and data rows (skip first row)
        const headers = jsonData[0];
        const dataRows = jsonData.slice(1).filter(row => row && row.length > 0 && row.some(cell => cell !== null && cell !== undefined && cell !== ''));
        // Validate headers - check for required and expected fields
        const requiredHeaders = ['game_id'];
        const expectedHeaders = [
            'game_id', 'game_name', 'student_id', 'subject',
            'difficulty', 'teacher_id', 'scratch_id', 'scratch_api', 'accumulated_click', 'description'
        ];
        // Check for missing required headers
        const missingRequired = requiredHeaders.filter(h => !headers.includes(h));
        if (missingRequired.length > 0) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    success: false,
                    message: `Missing required column(s): ${missingRequired.join(', ')}. Please check your Excel file headers.`,
                    expectedHeaders: expectedHeaders,
                }),
            };
        }
        // Check for unexpected headers (typos or wrong column names)
        const unexpectedHeaders = headers.filter((h) => h && !expectedHeaders.includes(h));
        if (unexpectedHeaders.length > 0) {
            console.warn('Unexpected headers found:', unexpectedHeaders);
            // Note: This is a warning, not an error - we'll still process the file
        }
        // Validate maximum 4000 records
        if (dataRows.length > 4000) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    success: false,
                    message: `File contains ${dataRows.length} records. Maximum allowed is 4,000 records.`
                }),
            };
        }
        // Process records in batches for better performance
        const results = {
            processed: 0,
            inserted: 0,
            updated: 0,
            errors: [],
        };
        const now = new Date().toISOString();
        // Map all rows to records first, validating required fields
        const parsedRecords = [];
        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            const record = {};
            headers.forEach((header, index) => {
                record[header] = row[index];
            });
            // Validate required field
            if (!record.game_id) {
                results.errors.push(`Row ${i + 2}: Missing game_id`);
                continue;
            }
            parsedRecords.push({ index: i, record });
        }
        // Batch check which records already exist (25 items per batch)
        const BATCH_SIZE = 25;
        const existingRecordsMap = new Map();
        for (let i = 0; i < parsedRecords.length; i += BATCH_SIZE) {
            const batch = parsedRecords.slice(i, i + BATCH_SIZE);
            const keys = batch.map(({ record }) => ({ game_id: record.game_id }));
            try {
                const batchGetCommand = new lib_dynamodb_1.BatchGetCommand({
                    RequestItems: {
                        [dynamodb_client_1.tableNames.games]: {
                            Keys: keys,
                        },
                    },
                });
                const batchResult = await dynamodb_client_1.dynamoDBClient.send(batchGetCommand);
                const items = batchResult.Responses?.[dynamodb_client_1.tableNames.games] || [];
                items.forEach((item) => {
                    existingRecordsMap.set(item.game_id, item);
                });
            }
            catch (error) {
                console.error('Error batch getting games:', error);
                // If batch get fails, fall back to individual checks for this batch
                for (const { record } of batch) {
                    try {
                        const existing = await getGame(record.game_id);
                        if (existing) {
                            existingRecordsMap.set(record.game_id, existing);
                        }
                    }
                    catch (err) {
                        console.error(`Error getting game ${record.game_id}:`, err);
                    }
                }
            }
        }
        // Batch write records (25 items per batch)
        for (let i = 0; i < parsedRecords.length; i += BATCH_SIZE) {
            const batch = parsedRecords.slice(i, i + BATCH_SIZE);
            const putRequests = [];
            for (const { index, record } of batch) {
                try {
                    const existingRecord = existingRecordsMap.get(record.game_id);
                    // Prepare game record
                    const gameRecord = {
                        game_id: record.game_id,
                        game_name: record.game_name || '',
                        student_id: record.student_id || '',
                        subject: record.subject || '',
                        difficulty: record.difficulty || '',
                        teacher_id: record.teacher_id || '',
                        last_update: now,
                        scratch_id: record.scratch_id || '',
                        scratch_api: record.scratch_api || '',
                        accumulated_click: existingRecord
                            ? existingRecord.accumulated_click
                            : (typeof record.accumulated_click === 'number' ? record.accumulated_click : 0),
                        description: record.description || '',
                        created_at: existingRecord ? existingRecord.created_at : now,
                        updated_at: now,
                    };
                    // Check if data has actually changed
                    let hasChanges = !existingRecord;
                    if (existingRecord) {
                        hasChanges = (gameRecord.game_name !== existingRecord.game_name ||
                            gameRecord.student_id !== existingRecord.student_id ||
                            gameRecord.subject !== existingRecord.subject ||
                            gameRecord.difficulty !== existingRecord.difficulty ||
                            gameRecord.teacher_id !== existingRecord.teacher_id ||
                            gameRecord.scratch_id !== existingRecord.scratch_id ||
                            gameRecord.scratch_api !== existingRecord.scratch_api ||
                            gameRecord.description !== existingRecord.description);
                    }
                    // Only update timestamps if there are actual changes
                    if (!hasChanges && existingRecord) {
                        gameRecord.last_update = existingRecord.last_update;
                        gameRecord.updated_at = existingRecord.updated_at;
                    }
                    putRequests.push({
                        PutRequest: {
                            Item: gameRecord,
                        },
                    });
                    if (existingRecord) {
                        results.updated++;
                    }
                    else {
                        results.inserted++;
                    }
                    results.processed++;
                }
                catch (error) {
                    results.errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                }
            }
            // Execute batch write
            if (putRequests.length > 0) {
                try {
                    const batchWriteCommand = new lib_dynamodb_1.BatchWriteCommand({
                        RequestItems: {
                            [dynamodb_client_1.tableNames.games]: putRequests,
                        },
                    });
                    const batchResult = await dynamodb_client_1.dynamoDBClient.send(batchWriteCommand);
                    // Check for unprocessed items
                    const unprocessedItems = batchResult.UnprocessedItems?.[dynamodb_client_1.tableNames.games];
                    if (unprocessedItems && unprocessedItems.length > 0) {
                        console.warn(`Batch write had ${unprocessedItems.length} unprocessed items for games`);
                        // Try individual writes for unprocessed items
                        for (const unprocessedItem of unprocessedItems) {
                            try {
                                await putGame(unprocessedItem.PutRequest.Item);
                            }
                            catch (err) {
                                const gameId = unprocessedItem.PutRequest.Item.game_id;
                                const errorMsg = err instanceof Error ? err.message : 'Unknown error';
                                console.error(`Error writing unprocessed game ${gameId}:`, err);
                                results.errors.push(`Game ${gameId}: ${errorMsg}`);
                                // Adjust counts since this item failed
                                if (existingRecordsMap.has(gameId)) {
                                    results.updated--;
                                }
                                else {
                                    results.inserted--;
                                }
                                results.processed--;
                            }
                        }
                    }
                }
                catch (error) {
                    console.error('Error batch writing games:', error);
                    // If batch write fails, fall back to individual writes for this batch
                    for (let j = 0; j < putRequests.length; j++) {
                        const request = putRequests[j];
                        try {
                            await putGame(request.PutRequest.Item);
                        }
                        catch (err) {
                            const gameId = request.PutRequest.Item.game_id;
                            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
                            console.error(`Error writing game ${gameId}:`, err);
                            results.errors.push(`Game ${gameId}: ${errorMsg}`);
                            // Adjust counts since this item failed
                            if (existingRecordsMap.has(gameId)) {
                                results.updated--;
                            }
                            else {
                                results.inserted--;
                            }
                            results.processed--;
                        }
                    }
                }
            }
        }
        // Check if any records were successfully processed
        if (results.processed === 0) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    success: false,
                    message: 'Failed to upload game data. No records were successfully processed.',
                    errors: results.errors.length > 0 ? results.errors : ['Unknown error occurred during upload'],
                }),
            };
        }
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: true,
                message: `Successfully processed ${results.processed} games (${results.inserted} inserted, ${results.updated} updated)`,
                processed: results.processed,
                inserted: results.inserted,
                updated: results.updated,
                errors: results.errors.length > 0 ? results.errors : undefined,
            }),
        };
    }
    catch (error) {
        console.error('Error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                message: 'Internal server error',
                error: error instanceof Error ? error.message : 'Unknown error'
            }),
        };
    }
};
exports.handler = handler;
async function getGame(gameId) {
    try {
        const command = new lib_dynamodb_1.GetCommand({
            TableName: dynamodb_client_1.tableNames.games,
            Key: { game_id: gameId },
        });
        const result = await dynamodb_client_1.dynamoDBClient.send(command);
        return result.Item;
    }
    catch (error) {
        console.error(`Error getting game ${gameId}:`, error);
        return undefined;
    }
}
async function putGame(game) {
    const command = new lib_dynamodb_1.PutCommand({
        TableName: dynamodb_client_1.tableNames.games,
        Item: game,
    });
    await dynamodb_client_1.dynamoDBClient.send(command);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2FtZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnYW1lcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFFSCx3REFBbUc7QUFFbkcsNkJBQTZCO0FBQzdCLDhEQUFzRTtBQWtCL0QsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUMxQixLQUEyQixFQUNLLEVBQUU7SUFDbEMsSUFBSSxDQUFDO1FBQ0gscUJBQXFCO1FBQ3JCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQztRQUM1QyxNQUFNLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxHQUFHLElBQUksQ0FBQztRQUVsQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDaEIsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUU7b0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtvQkFDbEMsNkJBQTZCLEVBQUUsR0FBRztpQkFDbkM7Z0JBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7b0JBQ25CLE9BQU8sRUFBRSxLQUFLO29CQUNkLE9BQU8sRUFBRSxrQkFBa0I7aUJBQzVCLENBQUM7YUFDSCxDQUFDO1FBQ0osQ0FBQztRQUVELDBCQUEwQjtRQUMxQixNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUVyRCx1QkFBdUI7UUFDdkIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUMzRCxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlDLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUM7UUFFbEQsOENBQThD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SUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ3JDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFVwbG9hZCBHYW1lcyBMYW1iZGEgSGFuZGxlclxuICogSGFuZGxlcyBFeGNlbC9DU1YgZmlsZSB1cGxvYWRzIGZvciBnYW1lIGRhdGFcbiAqIC0gU2tpcHMgaGVhZGVyIHJvd1xuICogLSBVcHNlcnRzIHJlY29yZHMgYmFzZWQgb24gZ2FtZV9pZFxuICogLSBObyBkZWxldGUgZnVuY3Rpb25hbGl0eVxuICovXG5cbmltcG9ydCB7IFB1dENvbW1hbmQsIEdldENvbW1hbmQsIEJhdGNoR2V0Q29tbWFuZCwgQmF0Y2hXcml0ZUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0ICogYXMgWExTWCBmcm9tICd4bHN4JztcbmltcG9ydCB7IGR5bmFtb0RCQ2xpZW50LCB0YWJsZU5hbWVzIH0gZnJvbSAnLi4vdXRpbHMvZHluYW1vZGItY2xpZW50JztcblxuaW50ZXJmYWNlIEdhbWVSZWNvcmQge1xuICBnYW1lX2lkOiBzdHJpbmc7XG4gIGdhbWVfbmFtZTogc3RyaW5nO1xuICBzdHVkZW50X2lkOiBzdHJpbmc7XG4gIHN1YmplY3Q6IHN0cmluZztcbiAgZGlmZmljdWx0eTogc3RyaW5nO1xuICB0ZWFjaGVyX2lkOiBzdHJpbmc7XG4gIGxhc3RfdXBkYXRlOiBzdHJpbmc7XG4gIHNjcmF0Y2hfaWQ6IHN0cmluZztcbiAgc2NyYXRjaF9hcGk6IHN0cmluZztcbiAgYWNjdW11bGF0ZWRfY2xpY2s6IG51bWJlcjtcbiAgZGVzY3JpcHRpb24/OiBzdHJpbmc7XG4gIGNyZWF0ZWRfYXQ/OiBzdHJpbmc7XG4gIHVwZGF0ZWRfYXQ/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKFxuICBldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnRcbik6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XG4gIHRyeSB7XG4gICAgLy8gUGFyc2UgcmVxdWVzdCBib2R5XG4gICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSB8fCAne30nKTtcbiAgICBjb25zdCB7IGZpbGU6IGJhc2U2NEZpbGUgfSA9IGJvZHk7XG5cbiAgICBpZiAoIWJhc2U2NEZpbGUpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgICAgfSxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBcbiAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICBtZXNzYWdlOiAnTm8gZmlsZSB1cGxvYWRlZCcgXG4gICAgICAgIH0pLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBEZWNvZGUgYmFzZTY0IHRvIGJ1ZmZlclxuICAgIGNvbnN0IGZpbGVCdWZmZXIgPSBCdWZmZXIuZnJvbShiYXNlNjRGaWxlLCAnYmFzZTY0Jyk7XG5cbiAgICAvLyBQYXJzZSBFeGNlbC9DU1YgZmlsZVxuICAgIGNvbnN0IHdvcmtib29rID0gWExTWC5yZWFkKGZpbGVCdWZmZXIsIHsgdHlwZTogJ2J1ZmZlcicgfSk7XG4gICAgY29uc3QgZmlyc3RTaGVldE5hbWUgPSB3b3JrYm9vay5TaGVldE5hbWVzWzBdO1xuICAgIGNvbnN0IHdvcmtzaGVldCA9IHdvcmtib29rLlNoZWV0c1tmaXJzdFNoZWV0TmFtZV07XG4gICAgXG4gICAgLy8gQ29udmVydCB0byBKU09OLCB1c2luZyBmaXJzdCByb3cgYXMgaGVhZGVyc1xuICAgIGNvbnN0IGpzb25EYXRhID0gWExTWC51dGlscy5zaGVldF90b19qc29uKHdvcmtzaGVldCwgeyBoZWFkZXI6IDEgfSkgYXMgYW55W11bXTtcbiAgICBcbiAgICAvLyBWYWxpZGF0ZSBmaWxlIGhhcyBkYXRhXG4gICAgaWYgKGpzb25EYXRhLmxlbmd0aCA8IDIpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgICAgfSxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBcbiAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICBtZXNzYWdlOiAnRmlsZSBpcyBlbXB0eSBvciBjb250YWlucyBubyBkYXRhIHJvd3MnIFxuICAgICAgICB9KSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gRXh0cmFjdCBoZWFkZXJzIChmaXJzdCByb3cpIGFuZCBkYXRhIHJvd3MgKHNraXAgZmlyc3Qgcm93KVxuICAgIGNvbnN0IGhlYWRlcnMgPSBqc29uRGF0YVswXTtcbiAgICBjb25zdCBkYXRhUm93cyA9IGpzb25EYXRhLnNsaWNlKDEpLmZpbHRlcihyb3cgPT4gXG4gICAgICByb3cgJiYgcm93Lmxlbmd0aCA+IDAgJiYgcm93LnNvbWUoY2VsbCA9PiBjZWxsICE9PSBudWxsICYmIGNlbGwgIT09IHVuZGVmaW5lZCAmJiBjZWxsICE9PSAnJylcbiAgICApO1xuXG4gICAgLy8gVmFsaWRhdGUgaGVhZGVycyAtIGNoZWNrIGZvciByZXF1aXJlZCBhbmQgZXhwZWN0ZWQgZmllbGRzXG4gICAgY29uc3QgcmVxdWlyZWRIZWFkZXJzID0gWydnYW1lX2lkJ107XG4gICAgY29uc3QgZXhwZWN0ZWRIZWFkZXJzID0gW1xuICAgICAgJ2dhbWVfaWQnLCAnZ2FtZV9uYW1lJywgJ3N0dWRlbnRfaWQnLCAnc3ViamVjdCcsXG4gICAgICAnZGlmZmljdWx0eScsICd0ZWFjaGVyX2lkJywgJ3NjcmF0Y2hfaWQnLCAnc2NyYXRjaF9hcGknLCAnYWNjdW11bGF0ZWRfY2xpY2snLCAnZGVzY3JpcHRpb24nXG4gICAgXTtcblxuICAgIC8vIENoZWNrIGZvciBtaXNzaW5nIHJlcXVpcmVkIGhlYWRlcnNcbiAgICBjb25zdCBtaXNzaW5nUmVxdWlyZWQgPSByZXF1aXJlZEhlYWRlcnMuZmlsdGVyKGggPT4gIWhlYWRlcnMuaW5jbHVkZXMoaCkpO1xuICAgIGlmIChtaXNzaW5nUmVxdWlyZWQubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgICB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgbWVzc2FnZTogYE1pc3NpbmcgcmVxdWlyZWQgY29sdW1uKHMpOiAke21pc3NpbmdSZXF1aXJlZC5qb2luKCcsICcpfS4gUGxlYXNlIGNoZWNrIHlvdXIgRXhjZWwgZmlsZSBoZWFkZXJzLmAsXG4gICAgICAgICAgZXhwZWN0ZWRIZWFkZXJzOiBleHBlY3RlZEhlYWRlcnMsXG4gICAgICAgIH0pLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBmb3IgdW5leHBlY3RlZCBoZWFkZXJzICh0eXBvcyBvciB3cm9uZyBjb2x1bW4gbmFtZXMpXG4gICAgY29uc3QgdW5leHBlY3RlZEhlYWRlcnMgPSBoZWFkZXJzLmZpbHRlcigoaDogc3RyaW5nKSA9PiBoICYmICFleHBlY3RlZEhlYWRlcnMuaW5jbHVkZXMoaCkpO1xuICAgIGlmICh1bmV4cGVjdGVkSGVhZGVycy5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1VuZXhwZWN0ZWQgaGVhZGVycyBmb3VuZDonLCB1bmV4cGVjdGVkSGVhZGVycyk7XG4gICAgICAvLyBOb3RlOiBUaGlzIGlzIGEgd2FybmluZywgbm90IGFuIGVycm9yIC0gd2UnbGwgc3RpbGwgcHJvY2VzcyB0aGUgZmlsZVxuICAgIH1cblxuICAgIC8vIFZhbGlkYXRlIG1heGltdW0gNDAwMCByZWNvcmRzXG4gICAgaWYgKGRhdGFSb3dzLmxlbmd0aCA+IDQwMDApIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgICAgfSxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBcbiAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICBtZXNzYWdlOiBgRmlsZSBjb250YWlucyAke2RhdGFSb3dzLmxlbmd0aH0gcmVjb3Jkcy4gTWF4aW11bSBhbGxvd2VkIGlzIDQsMDAwIHJlY29yZHMuYCBcbiAgICAgICAgfSksXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIFByb2Nlc3MgcmVjb3JkcyBpbiBiYXRjaGVzIGZvciBiZXR0ZXIgcGVyZm9ybWFuY2VcbiAgICBjb25zdCByZXN1bHRzID0ge1xuICAgICAgcHJvY2Vzc2VkOiAwLFxuICAgICAgaW5zZXJ0ZWQ6IDAsXG4gICAgICB1cGRhdGVkOiAwLFxuICAgICAgZXJyb3JzOiBbXSBhcyBzdHJpbmdbXSxcbiAgICB9O1xuXG4gICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgIFxuICAgIC8vIE1hcCBhbGwgcm93cyB0byByZWNvcmRzIGZpcnN0LCB2YWxpZGF0aW5nIHJlcXVpcmVkIGZpZWxkc1xuICAgIGNvbnN0IHBhcnNlZFJlY29yZHM6IEFycmF5PHsgaW5kZXg6IG51bWJlcjsgcmVjb3JkOiBhbnkgfT4gPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRhdGFSb3dzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCByb3cgPSBkYXRhUm93c1tpXTtcbiAgICAgIGNvbnN0IHJlY29yZDogYW55ID0ge307XG4gICAgICBoZWFkZXJzLmZvckVhY2goKGhlYWRlciwgaW5kZXgpID0+IHtcbiAgICAgICAgcmVjb3JkW2hlYWRlcl0gPSByb3dbaW5kZXhdO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIFZhbGlkYXRlIHJlcXVpcmVkIGZpZWxkXG4gICAgICBpZiAoIXJlY29yZC5nYW1lX2lkKSB7XG4gICAgICAgIHJlc3VsdHMuZXJyb3JzLnB1c2goYFJvdyAke2kgKyAyfTogTWlzc2luZyBnYW1lX2lkYCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBwYXJzZWRSZWNvcmRzLnB1c2goeyBpbmRleDogaSwgcmVjb3JkIH0pO1xuICAgIH1cblxuICAgIC8vIEJhdGNoIGNoZWNrIHdoaWNoIHJlY29yZHMgYWxyZWFkeSBleGlzdCAoMjUgaXRlbXMgcGVyIGJhdGNoKVxuICAgIGNvbnN0IEJBVENIX1NJWkUgPSAyNTtcbiAgICBjb25zdCBleGlzdGluZ1JlY29yZHNNYXAgPSBuZXcgTWFwPHN0cmluZywgR2FtZVJlY29yZD4oKTtcbiAgICBcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBhcnNlZFJlY29yZHMubGVuZ3RoOyBpICs9IEJBVENIX1NJWkUpIHtcbiAgICAgIGNvbnN0IGJhdGNoID0gcGFyc2VkUmVjb3Jkcy5zbGljZShpLCBpICsgQkFUQ0hfU0laRSk7XG4gICAgICBjb25zdCBrZXlzID0gYmF0Y2gubWFwKCh7IHJlY29yZCB9KSA9PiAoeyBnYW1lX2lkOiByZWNvcmQuZ2FtZV9pZCB9KSk7XG4gICAgICBcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGJhdGNoR2V0Q29tbWFuZCA9IG5ldyBCYXRjaEdldENvbW1hbmQoe1xuICAgICAgICAgIFJlcXVlc3RJdGVtczoge1xuICAgICAgICAgICAgW3RhYmxlTmFtZXMuZ2FtZXNdOiB7XG4gICAgICAgICAgICAgIEtleXM6IGtleXMsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgYmF0Y2hSZXN1bHQgPSBhd2FpdCBkeW5hbW9EQkNsaWVudC5zZW5kKGJhdGNoR2V0Q29tbWFuZCk7XG4gICAgICAgIGNvbnN0IGl0ZW1zID0gYmF0Y2hSZXN1bHQuUmVzcG9uc2VzPy5bdGFibGVOYW1lcy5nYW1lc10gfHwgW107XG4gICAgICAgIFxuICAgICAgICBpdGVtcy5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICAgICAgZXhpc3RpbmdSZWNvcmRzTWFwLnNldChpdGVtLmdhbWVfaWQsIGl0ZW0gYXMgR2FtZVJlY29yZCk7XG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgYmF0Y2ggZ2V0dGluZyBnYW1lczonLCBlcnJvcik7XG4gICAgICAgIC8vIElmIGJhdGNoIGdldCBmYWlscywgZmFsbCBiYWNrIHRvIGluZGl2aWR1YWwgY2hlY2tzIGZvciB0aGlzIGJhdGNoXG4gICAgICAgIGZvciAoY29uc3QgeyByZWNvcmQgfSBvZiBiYXRjaCkge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBleGlzdGluZyA9IGF3YWl0IGdldEdhbWUocmVjb3JkLmdhbWVfaWQpO1xuICAgICAgICAgICAgaWYgKGV4aXN0aW5nKSB7XG4gICAgICAgICAgICAgIGV4aXN0aW5nUmVjb3Jkc01hcC5zZXQocmVjb3JkLmdhbWVfaWQsIGV4aXN0aW5nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGdldHRpbmcgZ2FtZSAke3JlY29yZC5nYW1lX2lkfTpgLCBlcnIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEJhdGNoIHdyaXRlIHJlY29yZHMgKDI1IGl0ZW1zIHBlciBiYXRjaClcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBhcnNlZFJlY29yZHMubGVuZ3RoOyBpICs9IEJBVENIX1NJWkUpIHtcbiAgICAgIGNvbnN0IGJhdGNoID0gcGFyc2VkUmVjb3Jkcy5zbGljZShpLCBpICsgQkFUQ0hfU0laRSk7XG4gICAgICBjb25zdCBwdXRSZXF1ZXN0czogYW55W10gPSBbXTtcbiAgICAgIFxuICAgICAgZm9yIChjb25zdCB7IGluZGV4LCByZWNvcmQgfSBvZiBiYXRjaCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IGV4aXN0aW5nUmVjb3JkID0gZXhpc3RpbmdSZWNvcmRzTWFwLmdldChyZWNvcmQuZ2FtZV9pZCk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gUHJlcGFyZSBnYW1lIHJlY29yZFxuICAgICAgICAgIGNvbnN0IGdhbWVSZWNvcmQ6IEdhbWVSZWNvcmQgPSB7XG4gICAgICAgICAgICBnYW1lX2lkOiByZWNvcmQuZ2FtZV9pZCxcbiAgICAgICAgICAgIGdhbWVfbmFtZTogcmVjb3JkLmdhbWVfbmFtZSB8fCAnJyxcbiAgICAgICAgICAgIHN0dWRlbnRfaWQ6IHJlY29yZC5zdHVkZW50X2lkIHx8ICcnLFxuICAgICAgICAgICAgc3ViamVjdDogcmVjb3JkLnN1YmplY3QgfHwgJycsXG4gICAgICAgICAgICBkaWZmaWN1bHR5OiByZWNvcmQuZGlmZmljdWx0eSB8fCAnJyxcbiAgICAgICAgICAgIHRlYWNoZXJfaWQ6IHJlY29yZC50ZWFjaGVyX2lkIHx8ICcnLFxuICAgICAgICAgICAgbGFzdF91cGRhdGU6IG5vdyxcbiAgICAgICAgICAgIHNjcmF0Y2hfaWQ6IHJlY29yZC5zY3JhdGNoX2lkIHx8ICcnLFxuICAgICAgICAgICAgc2NyYXRjaF9hcGk6IHJlY29yZC5zY3JhdGNoX2FwaSB8fCAnJyxcbiAgICAgICAgICAgIGFjY3VtdWxhdGVkX2NsaWNrOiBleGlzdGluZ1JlY29yZCBcbiAgICAgICAgICAgICAgPyBleGlzdGluZ1JlY29yZC5hY2N1bXVsYXRlZF9jbGljayBcbiAgICAgICAgICAgICAgOiAodHlwZW9mIHJlY29yZC5hY2N1bXVsYXRlZF9jbGljayA9PT0gJ251bWJlcicgPyByZWNvcmQuYWNjdW11bGF0ZWRfY2xpY2sgOiAwKSxcbiAgICAgICAgICAgIGRlc2NyaXB0aW9uOiByZWNvcmQuZGVzY3JpcHRpb24gfHwgJycsXG4gICAgICAgICAgICBjcmVhdGVkX2F0OiBleGlzdGluZ1JlY29yZCA/IGV4aXN0aW5nUmVjb3JkLmNyZWF0ZWRfYXQgOiBub3csXG4gICAgICAgICAgICB1cGRhdGVkX2F0OiBub3csXG4gICAgICAgICAgfTtcblxuICAgICAgICAgIC8vIENoZWNrIGlmIGRhdGEgaGFzIGFjdHVhbGx5IGNoYW5nZWRcbiAgICAgICAgICBsZXQgaGFzQ2hhbmdlcyA9ICFleGlzdGluZ1JlY29yZDtcbiAgICAgICAgICBpZiAoZXhpc3RpbmdSZWNvcmQpIHtcbiAgICAgICAgICAgIGhhc0NoYW5nZXMgPSAoXG4gICAgICAgICAgICAgIGdhbWVSZWNvcmQuZ2FtZV9uYW1lICE9PSBleGlzdGluZ1JlY29yZC5nYW1lX25hbWUgfHxcbiAgICAgICAgICAgICAgZ2FtZVJlY29yZC5zdHVkZW50X2lkICE9PSBleGlzdGluZ1JlY29yZC5zdHVkZW50X2lkIHx8XG4gICAgICAgICAgICAgIGdhbWVSZWNvcmQuc3ViamVjdCAhPT0gZXhpc3RpbmdSZWNvcmQuc3ViamVjdCB8fFxuICAgICAgICAgICAgICBnYW1lUmVjb3JkLmRpZmZpY3VsdHkgIT09IGV4aXN0aW5nUmVjb3JkLmRpZmZpY3VsdHkgfHxcbiAgICAgICAgICAgICAgZ2FtZVJlY29yZC50ZWFjaGVyX2lkICE9PSBleGlzdGluZ1JlY29yZC50ZWFjaGVyX2lkIHx8XG4gICAgICAgICAgICAgIGdhbWVSZWNvcmQuc2NyYXRjaF9pZCAhPT0gZXhpc3RpbmdSZWNvcmQuc2NyYXRjaF9pZCB8fFxuICAgICAgICAgICAgICBnYW1lUmVjb3JkLnNjcmF0Y2hfYXBpICE9PSBleGlzdGluZ1JlY29yZC5zY3JhdGNoX2FwaSB8fFxuICAgICAgICAgICAgICBnYW1lUmVjb3JkLmRlc2NyaXB0aW9uICE9PSBleGlzdGluZ1JlY29yZC5kZXNjcmlwdGlvblxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBPbmx5IHVwZGF0ZSB0aW1lc3RhbXBzIGlmIHRoZXJlIGFyZSBhY3R1YWwgY2hhbmdlc1xuICAgICAgICAgIGlmICghaGFzQ2hhbmdlcyAmJiBleGlzdGluZ1JlY29yZCkge1xuICAgICAgICAgICAgZ2FtZVJlY29yZC5sYXN0X3VwZGF0ZSA9IGV4aXN0aW5nUmVjb3JkLmxhc3RfdXBkYXRlO1xuICAgICAgICAgICAgZ2FtZVJlY29yZC51cGRhdGVkX2F0ID0gZXhpc3RpbmdSZWNvcmQudXBkYXRlZF9hdDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBwdXRSZXF1ZXN0cy5wdXNoKHtcbiAgICAgICAgICAgIFB1dFJlcXVlc3Q6IHtcbiAgICAgICAgICAgICAgSXRlbTogZ2FtZVJlY29yZCxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgXG4gICAgICAgICAgaWYgKGV4aXN0aW5nUmVjb3JkKSB7XG4gICAgICAgICAgICByZXN1bHRzLnVwZGF0ZWQrKztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0cy5pbnNlcnRlZCsrO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXN1bHRzLnByb2Nlc3NlZCsrO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgIHJlc3VsdHMuZXJyb3JzLnB1c2goYFJvdyAke2luZGV4ICsgMn06ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcid9YCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gRXhlY3V0ZSBiYXRjaCB3cml0ZVxuICAgICAgaWYgKHB1dFJlcXVlc3RzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCBiYXRjaFdyaXRlQ29tbWFuZCA9IG5ldyBCYXRjaFdyaXRlQ29tbWFuZCh7XG4gICAgICAgICAgICBSZXF1ZXN0SXRlbXM6IHtcbiAgICAgICAgICAgICAgW3RhYmxlTmFtZXMuZ2FtZXNdOiBwdXRSZXF1ZXN0cyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgXG4gICAgICAgICAgY29uc3QgYmF0Y2hSZXN1bHQgPSBhd2FpdCBkeW5hbW9EQkNsaWVudC5zZW5kKGJhdGNoV3JpdGVDb21tYW5kKTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBDaGVjayBmb3IgdW5wcm9jZXNzZWQgaXRlbXNcbiAgICAgICAgICBjb25zdCB1bnByb2Nlc3NlZEl0ZW1zID0gYmF0Y2hSZXN1bHQuVW5wcm9jZXNzZWRJdGVtcz8uW3RhYmxlTmFtZXMuZ2FtZXNdO1xuICAgICAgICAgIGlmICh1bnByb2Nlc3NlZEl0ZW1zICYmIHVucHJvY2Vzc2VkSXRlbXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBCYXRjaCB3cml0ZSBoYWQgJHt1bnByb2Nlc3NlZEl0ZW1zLmxlbmd0aH0gdW5wcm9jZXNzZWQgaXRlbXMgZm9yIGdhbWVzYCk7XG4gICAgICAgICAgICAvLyBUcnkgaW5kaXZpZHVhbCB3cml0ZXMgZm9yIHVucHJvY2Vzc2VkIGl0ZW1zXG4gICAgICAgICAgICBmb3IgKGNvbnN0IHVucHJvY2Vzc2VkSXRlbSBvZiB1bnByb2Nlc3NlZEl0ZW1zKSB7XG4gICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgcHV0R2FtZSh1bnByb2Nlc3NlZEl0ZW0uUHV0UmVxdWVzdCEuSXRlbSBhcyBHYW1lUmVjb3JkKTtcbiAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZ2FtZUlkID0gKHVucHJvY2Vzc2VkSXRlbS5QdXRSZXF1ZXN0IS5JdGVtIGFzIGFueSkuZ2FtZV9pZDtcbiAgICAgICAgICAgICAgICBjb25zdCBlcnJvck1zZyA9IGVyciBpbnN0YW5jZW9mIEVycm9yID8gZXJyLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcic7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3Igd3JpdGluZyB1bnByb2Nlc3NlZCBnYW1lICR7Z2FtZUlkfTpgLCBlcnIpO1xuICAgICAgICAgICAgICAgIHJlc3VsdHMuZXJyb3JzLnB1c2goYEdhbWUgJHtnYW1lSWR9OiAke2Vycm9yTXNnfWApO1xuICAgICAgICAgICAgICAgIC8vIEFkanVzdCBjb3VudHMgc2luY2UgdGhpcyBpdGVtIGZhaWxlZFxuICAgICAgICAgICAgICAgIGlmIChleGlzdGluZ1JlY29yZHNNYXAuaGFzKGdhbWVJZCkpIHtcbiAgICAgICAgICAgICAgICAgIHJlc3VsdHMudXBkYXRlZC0tO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICByZXN1bHRzLmluc2VydGVkLS07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc3VsdHMucHJvY2Vzc2VkLS07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgYmF0Y2ggd3JpdGluZyBnYW1lczonLCBlcnJvcik7XG4gICAgICAgICAgLy8gSWYgYmF0Y2ggd3JpdGUgZmFpbHMsIGZhbGwgYmFjayB0byBpbmRpdmlkdWFsIHdyaXRlcyBmb3IgdGhpcyBiYXRjaFxuICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgcHV0UmVxdWVzdHMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgIGNvbnN0IHJlcXVlc3QgPSBwdXRSZXF1ZXN0c1tqXTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIGF3YWl0IHB1dEdhbWUocmVxdWVzdC5QdXRSZXF1ZXN0Lkl0ZW0pO1xuICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGdhbWVJZCA9IHJlcXVlc3QuUHV0UmVxdWVzdC5JdGVtLmdhbWVfaWQ7XG4gICAgICAgICAgICAgIGNvbnN0IGVycm9yTXNnID0gZXJyIGluc3RhbmNlb2YgRXJyb3IgPyBlcnIubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJztcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3Igd3JpdGluZyBnYW1lICR7Z2FtZUlkfTpgLCBlcnIpO1xuICAgICAgICAgICAgICByZXN1bHRzLmVycm9ycy5wdXNoKGBHYW1lICR7Z2FtZUlkfTogJHtlcnJvck1zZ31gKTtcbiAgICAgICAgICAgICAgLy8gQWRqdXN0IGNvdW50cyBzaW5jZSB0aGlzIGl0ZW0gZmFpbGVkXG4gICAgICAgICAgICAgIGlmIChleGlzdGluZ1JlY29yZHNNYXAuaGFzKGdhbWVJZCkpIHtcbiAgICAgICAgICAgICAgICByZXN1bHRzLnVwZGF0ZWQtLTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN1bHRzLmluc2VydGVkLS07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmVzdWx0cy5wcm9jZXNzZWQtLTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDaGVjayBpZiBhbnkgcmVjb3JkcyB3ZXJlIHN1Y2Nlc3NmdWxseSBwcm9jZXNzZWRcbiAgICBpZiAocmVzdWx0cy5wcm9jZXNzZWQgPT09IDApIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgICAgfSxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgIG1lc3NhZ2U6ICdGYWlsZWQgdG8gdXBsb2FkIGdhbWUgZGF0YS4gTm8gcmVjb3JkcyB3ZXJlIHN1Y2Nlc3NmdWxseSBwcm9jZXNzZWQuJyxcbiAgICAgICAgICBlcnJvcnM6IHJlc3VsdHMuZXJyb3JzLmxlbmd0aCA+IDAgPyByZXN1bHRzLmVycm9ycyA6IFsnVW5rbm93biBlcnJvciBvY2N1cnJlZCBkdXJpbmcgdXBsb2FkJ10sXG4gICAgICAgIH0pLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgc3RhdHVzQ29kZTogMjAwLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgbWVzc2FnZTogYFN1Y2Nlc3NmdWxseSBwcm9jZXNzZWQgJHtyZXN1bHRzLnByb2Nlc3NlZH0gZ2FtZXMgKCR7cmVzdWx0cy5pbnNlcnRlZH0gaW5zZXJ0ZWQsICR7cmVzdWx0cy51cGRhdGVkfSB1cGRhdGVkKWAsXG4gICAgICAgIHByb2Nlc3NlZDogcmVzdWx0cy5wcm9jZXNzZWQsXG4gICAgICAgIGluc2VydGVkOiByZXN1bHRzLmluc2VydGVkLFxuICAgICAgICB1cGRhdGVkOiByZXN1bHRzLnVwZGF0ZWQsXG4gICAgICAgIGVycm9yczogcmVzdWx0cy5lcnJvcnMubGVuZ3RoID4gMCA/IHJlc3VsdHMuZXJyb3JzIDogdW5kZWZpbmVkLFxuICAgICAgfSksXG4gICAgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvcjonLCBlcnJvcik7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1c0NvZGU6IDUwMCxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IFxuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgbWVzc2FnZTogJ0ludGVybmFsIHNlcnZlciBlcnJvcicsXG4gICAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJ1xuICAgICAgfSksXG4gICAgfTtcbiAgfVxufTtcblxuYXN5bmMgZnVuY3Rpb24gZ2V0R2FtZShnYW1lSWQ6IHN0cmluZykge1xuICB0cnkge1xuICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgR2V0Q29tbWFuZCh7XG4gICAgICBUYWJsZU5hbWU6IHRhYmxlTmFtZXMuZ2FtZXMsXG4gICAgICBLZXk6IHsgZ2FtZV9pZDogZ2FtZUlkIH0sXG4gICAgfSk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZHluYW1vREJDbGllbnQuc2VuZChjb21tYW5kKTtcbiAgICByZXR1cm4gcmVzdWx0Lkl0ZW0gYXMgR2FtZVJlY29yZCB8IHVuZGVmaW5lZDtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKGBFcnJvciBnZXR0aW5nIGdhbWUgJHtnYW1lSWR9OmAsIGVycm9yKTtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHB1dEdhbWUoZ2FtZTogR2FtZVJlY29yZCkge1xuICBjb25zdCBjb21tYW5kID0gbmV3IFB1dENvbW1hbmQoe1xuICAgIFRhYmxlTmFtZTogdGFibGVOYW1lcy5nYW1lcyxcbiAgICBJdGVtOiBnYW1lLFxuICB9KTtcbiAgYXdhaXQgZHluYW1vREJDbGllbnQuc2VuZChjb21tYW5kKTtcbn1cbiJdfQ==