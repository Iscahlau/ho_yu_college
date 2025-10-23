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
            'difficulty', 'teacher_id', 'scratch_id', 'scratch_api', 'accumulated_click'
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
                            gameRecord.scratch_api !== existingRecord.scratch_api);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2FtZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnYW1lcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFFSCx3REFBbUc7QUFFbkcsNkJBQTZCO0FBQzdCLDhEQUFzRTtBQWlCL0QsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUMxQixLQUEyQixFQUNLLEVBQUU7SUFDbEMsSUFBSSxDQUFDO1FBQ0gscUJBQXFCO1FBQ3JCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQztRQUM1QyxNQUFNLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxHQUFHLElBQUksQ0FBQztRQUVsQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDaEIsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUU7b0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtvQkFDbEMsNkJBQTZCLEVBQUUsR0FBRztpQkFDbkM7Z0JBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7b0JBQ25CLE9BQU8sRUFBRSxLQUFLO29CQUNkLE9BQU8sRUFBRSxrQkFBa0I7aUJBQzVCLENBQUM7YUFDSCxDQUFDO1FBQ0osQ0FBQztRQUVELDBCQUEwQjtRQUMxQixNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUVyRCx1QkFBdUI7UUFDdkIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUMzRCxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlDLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUM7UUFFbEQsOENBQThD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KiBIYW5kbGVzIEV4Y2VsL0NTViBmaWxlIHVwbG9hZHMgZm9yIGdhbWUgZGF0YVxuICogLSBTa2lwcyBoZWFkZXIgcm93XG4gKiAtIFVwc2VydHMgcmVjb3JkcyBiYXNlZCBvbiBnYW1lX2lkXG4gKiAtIE5vIGRlbGV0ZSBmdW5jdGlvbmFsaXR5XG4gKi9cblxuaW1wb3J0IHsgUHV0Q29tbWFuZCwgR2V0Q29tbWFuZCwgQmF0Y2hHZXRDb21tYW5kLCBCYXRjaFdyaXRlQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYic7XG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XG5pbXBvcnQgKiBhcyBYTFNYIGZyb20gJ3hsc3gnO1xuaW1wb3J0IHsgZHluYW1vREJDbGllbnQsIHRhYmxlTmFtZXMgfSBmcm9tICcuLi91dGlscy9keW5hbW9kYi1jbGllbnQnO1xuXG5pbnRlcmZhY2UgR2FtZVJlY29yZCB7XG4gIGdhbWVfaWQ6IHN0cmluZztcbiAgZ2FtZV9uYW1lOiBzdHJpbmc7XG4gIHN0dWRlbnRfaWQ6IHN0cmluZztcbiAgc3ViamVjdDogc3RyaW5nO1xuICBkaWZmaWN1bHR5OiBzdHJpbmc7XG4gIHRlYWNoZXJfaWQ6IHN0cmluZztcbiAgbGFzdF91cGRhdGU6IHN0cmluZztcbiAgc2NyYXRjaF9pZDogc3RyaW5nO1xuICBzY3JhdGNoX2FwaTogc3RyaW5nO1xuICBhY2N1bXVsYXRlZF9jbGljazogbnVtYmVyO1xuICBjcmVhdGVkX2F0Pzogc3RyaW5nO1xuICB1cGRhdGVkX2F0Pzogc3RyaW5nO1xufVxuXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChcbiAgZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50XG4pOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xuICB0cnkge1xuICAgIC8vIFBhcnNlIHJlcXVlc3QgYm9keVxuICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKGV2ZW50LmJvZHkgfHwgJ3t9Jyk7XG4gICAgY29uc3QgeyBmaWxlOiBiYXNlNjRGaWxlIH0gPSBib2R5O1xuXG4gICAgaWYgKCFiYXNlNjRGaWxlKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICAgICAgIH0sXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgXG4gICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgbWVzc2FnZTogJ05vIGZpbGUgdXBsb2FkZWQnIFxuICAgICAgICB9KSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gRGVjb2RlIGJhc2U2NCB0byBidWZmZXJcbiAgICBjb25zdCBmaWxlQnVmZmVyID0gQnVmZmVyLmZyb20oYmFzZTY0RmlsZSwgJ2Jhc2U2NCcpO1xuXG4gICAgLy8gUGFyc2UgRXhjZWwvQ1NWIGZpbGVcbiAgICBjb25zdCB3b3JrYm9vayA9IFhMU1gucmVhZChmaWxlQnVmZmVyLCB7IHR5cGU6ICdidWZmZXInIH0pO1xuICAgIGNvbnN0IGZpcnN0U2hlZXROYW1lID0gd29ya2Jvb2suU2hlZXROYW1lc1swXTtcbiAgICBjb25zdCB3b3Jrc2hlZXQgPSB3b3JrYm9vay5TaGVldHNbZmlyc3RTaGVldE5hbWVdO1xuICAgIFxuICAgIC8vIENvbnZlcnQgdG8gSlNPTiwgdXNpbmcgZmlyc3Qgcm93IGFzIGhlYWRlcnNcbiAgICBjb25zdCBqc29uRGF0YSA9IFhMU1gudXRpbHMuc2hlZXRfdG9fanNvbih3b3Jrc2hlZXQsIHsgaGVhZGVyOiAxIH0pIGFzIGFueVtdW107XG4gICAgXG4gICAgLy8gVmFsaWRhdGUgZmlsZSBoYXMgZGF0YVxuICAgIGlmIChqc29uRGF0YS5sZW5ndGggPCAyKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICAgICAgIH0sXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgXG4gICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgbWVzc2FnZTogJ0ZpbGUgaXMgZW1wdHkgb3IgY29udGFpbnMgbm8gZGF0YSByb3dzJyBcbiAgICAgICAgfSksXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIEV4dHJhY3QgaGVhZGVycyAoZmlyc3Qgcm93KSBhbmQgZGF0YSByb3dzIChza2lwIGZpcnN0IHJvdylcbiAgICBjb25zdCBoZWFkZXJzID0ganNvbkRhdGFbMF07XG4gICAgY29uc3QgZGF0YVJvd3MgPSBqc29uRGF0YS5zbGljZSgxKS5maWx0ZXIocm93ID0+IFxuICAgICAgcm93ICYmIHJvdy5sZW5ndGggPiAwICYmIHJvdy5zb21lKGNlbGwgPT4gY2VsbCAhPT0gbnVsbCAmJiBjZWxsICE9PSB1bmRlZmluZWQgJiYgY2VsbCAhPT0gJycpXG4gICAgKTtcblxuICAgIC8vIFZhbGlkYXRlIGhlYWRlcnMgLSBjaGVjayBmb3IgcmVxdWlyZWQgYW5kIGV4cGVjdGVkIGZpZWxkc1xuICAgIGNvbnN0IHJlcXVpcmVkSGVhZGVycyA9IFsnZ2FtZV9pZCddO1xuICAgIGNvbnN0IGV4cGVjdGVkSGVhZGVycyA9IFtcbiAgICAgICdnYW1lX2lkJywgJ2dhbWVfbmFtZScsICdzdHVkZW50X2lkJywgJ3N1YmplY3QnLFxuICAgICAgJ2RpZmZpY3VsdHknLCAndGVhY2hlcl9pZCcsICdzY3JhdGNoX2lkJywgJ3NjcmF0Y2hfYXBpJywgJ2FjY3VtdWxhdGVkX2NsaWNrJ1xuICAgIF07XG5cbiAgICAvLyBDaGVjayBmb3IgbWlzc2luZyByZXF1aXJlZCBoZWFkZXJzXG4gICAgY29uc3QgbWlzc2luZ1JlcXVpcmVkID0gcmVxdWlyZWRIZWFkZXJzLmZpbHRlcihoID0+ICFoZWFkZXJzLmluY2x1ZGVzKGgpKTtcbiAgICBpZiAobWlzc2luZ1JlcXVpcmVkLmxlbmd0aCA+IDApIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgICAgfSxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgIG1lc3NhZ2U6IGBNaXNzaW5nIHJlcXVpcmVkIGNvbHVtbihzKTogJHttaXNzaW5nUmVxdWlyZWQuam9pbignLCAnKX0uIFBsZWFzZSBjaGVjayB5b3VyIEV4Y2VsIGZpbGUgaGVhZGVycy5gLFxuICAgICAgICAgIGV4cGVjdGVkSGVhZGVyczogZXhwZWN0ZWRIZWFkZXJzLFxuICAgICAgICB9KSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgZm9yIHVuZXhwZWN0ZWQgaGVhZGVycyAodHlwb3Mgb3Igd3JvbmcgY29sdW1uIG5hbWVzKVxuICAgIGNvbnN0IHVuZXhwZWN0ZWRIZWFkZXJzID0gaGVhZGVycy5maWx0ZXIoKGg6IHN0cmluZykgPT4gaCAmJiAhZXhwZWN0ZWRIZWFkZXJzLmluY2x1ZGVzKGgpKTtcbiAgICBpZiAodW5leHBlY3RlZEhlYWRlcnMubGVuZ3RoID4gMCkge1xuICAgICAgY29uc29sZS53YXJuKCdVbmV4cGVjdGVkIGhlYWRlcnMgZm91bmQ6JywgdW5leHBlY3RlZEhlYWRlcnMpO1xuICAgICAgLy8gTm90ZTogVGhpcyBpcyBhIHdhcm5pbmcsIG5vdCBhbiBlcnJvciAtIHdlJ2xsIHN0aWxsIHByb2Nlc3MgdGhlIGZpbGVcbiAgICB9XG5cbiAgICAvLyBWYWxpZGF0ZSBtYXhpbXVtIDQwMDAgcmVjb3Jkc1xuICAgIGlmIChkYXRhUm93cy5sZW5ndGggPiA0MDAwKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICAgICAgIH0sXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgXG4gICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgbWVzc2FnZTogYEZpbGUgY29udGFpbnMgJHtkYXRhUm93cy5sZW5ndGh9IHJlY29yZHMuIE1heGltdW0gYWxsb3dlZCBpcyA0LDAwMCByZWNvcmRzLmAgXG4gICAgICAgIH0pLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBQcm9jZXNzIHJlY29yZHMgaW4gYmF0Y2hlcyBmb3IgYmV0dGVyIHBlcmZvcm1hbmNlXG4gICAgY29uc3QgcmVzdWx0cyA9IHtcbiAgICAgIHByb2Nlc3NlZDogMCxcbiAgICAgIGluc2VydGVkOiAwLFxuICAgICAgdXBkYXRlZDogMCxcbiAgICAgIGVycm9yczogW10gYXMgc3RyaW5nW10sXG4gICAgfTtcblxuICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICBcbiAgICAvLyBNYXAgYWxsIHJvd3MgdG8gcmVjb3JkcyBmaXJzdCwgdmFsaWRhdGluZyByZXF1aXJlZCBmaWVsZHNcbiAgICBjb25zdCBwYXJzZWRSZWNvcmRzOiBBcnJheTx7IGluZGV4OiBudW1iZXI7IHJlY29yZDogYW55IH0+ID0gW107XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkYXRhUm93cy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3Qgcm93ID0gZGF0YVJvd3NbaV07XG4gICAgICBjb25zdCByZWNvcmQ6IGFueSA9IHt9O1xuICAgICAgaGVhZGVycy5mb3JFYWNoKChoZWFkZXIsIGluZGV4KSA9PiB7XG4gICAgICAgIHJlY29yZFtoZWFkZXJdID0gcm93W2luZGV4XTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBWYWxpZGF0ZSByZXF1aXJlZCBmaWVsZFxuICAgICAgaWYgKCFyZWNvcmQuZ2FtZV9pZCkge1xuICAgICAgICByZXN1bHRzLmVycm9ycy5wdXNoKGBSb3cgJHtpICsgMn06IE1pc3NpbmcgZ2FtZV9pZGApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgcGFyc2VkUmVjb3Jkcy5wdXNoKHsgaW5kZXg6IGksIHJlY29yZCB9KTtcbiAgICB9XG5cbiAgICAvLyBCYXRjaCBjaGVjayB3aGljaCByZWNvcmRzIGFscmVhZHkgZXhpc3QgKDI1IGl0ZW1zIHBlciBiYXRjaClcbiAgICBjb25zdCBCQVRDSF9TSVpFID0gMjU7XG4gICAgY29uc3QgZXhpc3RpbmdSZWNvcmRzTWFwID0gbmV3IE1hcDxzdHJpbmcsIEdhbWVSZWNvcmQ+KCk7XG4gICAgXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYXJzZWRSZWNvcmRzLmxlbmd0aDsgaSArPSBCQVRDSF9TSVpFKSB7XG4gICAgICBjb25zdCBiYXRjaCA9IHBhcnNlZFJlY29yZHMuc2xpY2UoaSwgaSArIEJBVENIX1NJWkUpO1xuICAgICAgY29uc3Qga2V5cyA9IGJhdGNoLm1hcCgoeyByZWNvcmQgfSkgPT4gKHsgZ2FtZV9pZDogcmVjb3JkLmdhbWVfaWQgfSkpO1xuICAgICAgXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBiYXRjaEdldENvbW1hbmQgPSBuZXcgQmF0Y2hHZXRDb21tYW5kKHtcbiAgICAgICAgICBSZXF1ZXN0SXRlbXM6IHtcbiAgICAgICAgICAgIFt0YWJsZU5hbWVzLmdhbWVzXToge1xuICAgICAgICAgICAgICBLZXlzOiBrZXlzLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGJhdGNoUmVzdWx0ID0gYXdhaXQgZHluYW1vREJDbGllbnQuc2VuZChiYXRjaEdldENvbW1hbmQpO1xuICAgICAgICBjb25zdCBpdGVtcyA9IGJhdGNoUmVzdWx0LlJlc3BvbnNlcz8uW3RhYmxlTmFtZXMuZ2FtZXNdIHx8IFtdO1xuICAgICAgICBcbiAgICAgICAgaXRlbXMuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgICAgICAgIGV4aXN0aW5nUmVjb3Jkc01hcC5zZXQoaXRlbS5nYW1lX2lkLCBpdGVtIGFzIEdhbWVSZWNvcmQpO1xuICAgICAgICB9KTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGJhdGNoIGdldHRpbmcgZ2FtZXM6JywgZXJyb3IpO1xuICAgICAgICAvLyBJZiBiYXRjaCBnZXQgZmFpbHMsIGZhbGwgYmFjayB0byBpbmRpdmlkdWFsIGNoZWNrcyBmb3IgdGhpcyBiYXRjaFxuICAgICAgICBmb3IgKGNvbnN0IHsgcmVjb3JkIH0gb2YgYmF0Y2gpIHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgZXhpc3RpbmcgPSBhd2FpdCBnZXRHYW1lKHJlY29yZC5nYW1lX2lkKTtcbiAgICAgICAgICAgIGlmIChleGlzdGluZykge1xuICAgICAgICAgICAgICBleGlzdGluZ1JlY29yZHNNYXAuc2V0KHJlY29yZC5nYW1lX2lkLCBleGlzdGluZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGBFcnJvciBnZXR0aW5nIGdhbWUgJHtyZWNvcmQuZ2FtZV9pZH06YCwgZXJyKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBCYXRjaCB3cml0ZSByZWNvcmRzICgyNSBpdGVtcyBwZXIgYmF0Y2gpXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYXJzZWRSZWNvcmRzLmxlbmd0aDsgaSArPSBCQVRDSF9TSVpFKSB7XG4gICAgICBjb25zdCBiYXRjaCA9IHBhcnNlZFJlY29yZHMuc2xpY2UoaSwgaSArIEJBVENIX1NJWkUpO1xuICAgICAgY29uc3QgcHV0UmVxdWVzdHM6IGFueVtdID0gW107XG4gICAgICBcbiAgICAgIGZvciAoY29uc3QgeyBpbmRleCwgcmVjb3JkIH0gb2YgYmF0Y2gpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCBleGlzdGluZ1JlY29yZCA9IGV4aXN0aW5nUmVjb3Jkc01hcC5nZXQocmVjb3JkLmdhbWVfaWQpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIFByZXBhcmUgZ2FtZSByZWNvcmRcbiAgICAgICAgICBjb25zdCBnYW1lUmVjb3JkOiBHYW1lUmVjb3JkID0ge1xuICAgICAgICAgICAgZ2FtZV9pZDogcmVjb3JkLmdhbWVfaWQsXG4gICAgICAgICAgICBnYW1lX25hbWU6IHJlY29yZC5nYW1lX25hbWUgfHwgJycsXG4gICAgICAgICAgICBzdHVkZW50X2lkOiByZWNvcmQuc3R1ZGVudF9pZCB8fCAnJyxcbiAgICAgICAgICAgIHN1YmplY3Q6IHJlY29yZC5zdWJqZWN0IHx8ICcnLFxuICAgICAgICAgICAgZGlmZmljdWx0eTogcmVjb3JkLmRpZmZpY3VsdHkgfHwgJycsXG4gICAgICAgICAgICB0ZWFjaGVyX2lkOiByZWNvcmQudGVhY2hlcl9pZCB8fCAnJyxcbiAgICAgICAgICAgIGxhc3RfdXBkYXRlOiBub3csXG4gICAgICAgICAgICBzY3JhdGNoX2lkOiByZWNvcmQuc2NyYXRjaF9pZCB8fCAnJyxcbiAgICAgICAgICAgIHNjcmF0Y2hfYXBpOiByZWNvcmQuc2NyYXRjaF9hcGkgfHwgJycsXG4gICAgICAgICAgICBhY2N1bXVsYXRlZF9jbGljazogZXhpc3RpbmdSZWNvcmQgXG4gICAgICAgICAgICAgID8gZXhpc3RpbmdSZWNvcmQuYWNjdW11bGF0ZWRfY2xpY2sgXG4gICAgICAgICAgICAgIDogKHR5cGVvZiByZWNvcmQuYWNjdW11bGF0ZWRfY2xpY2sgPT09ICdudW1iZXInID8gcmVjb3JkLmFjY3VtdWxhdGVkX2NsaWNrIDogMCksXG4gICAgICAgICAgICBjcmVhdGVkX2F0OiBleGlzdGluZ1JlY29yZCA/IGV4aXN0aW5nUmVjb3JkLmNyZWF0ZWRfYXQgOiBub3csXG4gICAgICAgICAgICB1cGRhdGVkX2F0OiBub3csXG4gICAgICAgICAgfTtcblxuICAgICAgICAgIC8vIENoZWNrIGlmIGRhdGEgaGFzIGFjdHVhbGx5IGNoYW5nZWRcbiAgICAgICAgICBsZXQgaGFzQ2hhbmdlcyA9ICFleGlzdGluZ1JlY29yZDtcbiAgICAgICAgICBpZiAoZXhpc3RpbmdSZWNvcmQpIHtcbiAgICAgICAgICAgIGhhc0NoYW5nZXMgPSAoXG4gICAgICAgICAgICAgIGdhbWVSZWNvcmQuZ2FtZV9uYW1lICE9PSBleGlzdGluZ1JlY29yZC5nYW1lX25hbWUgfHxcbiAgICAgICAgICAgICAgZ2FtZVJlY29yZC5zdHVkZW50X2lkICE9PSBleGlzdGluZ1JlY29yZC5zdHVkZW50X2lkIHx8XG4gICAgICAgICAgICAgIGdhbWVSZWNvcmQuc3ViamVjdCAhPT0gZXhpc3RpbmdSZWNvcmQuc3ViamVjdCB8fFxuICAgICAgICAgICAgICBnYW1lUmVjb3JkLmRpZmZpY3VsdHkgIT09IGV4aXN0aW5nUmVjb3JkLmRpZmZpY3VsdHkgfHxcbiAgICAgICAgICAgICAgZ2FtZVJlY29yZC50ZWFjaGVyX2lkICE9PSBleGlzdGluZ1JlY29yZC50ZWFjaGVyX2lkIHx8XG4gICAgICAgICAgICAgIGdhbWVSZWNvcmQuc2NyYXRjaF9pZCAhPT0gZXhpc3RpbmdSZWNvcmQuc2NyYXRjaF9pZCB8fFxuICAgICAgICAgICAgICBnYW1lUmVjb3JkLnNjcmF0Y2hfYXBpICE9PSBleGlzdGluZ1JlY29yZC5zY3JhdGNoX2FwaVxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBPbmx5IHVwZGF0ZSB0aW1lc3RhbXBzIGlmIHRoZXJlIGFyZSBhY3R1YWwgY2hhbmdlc1xuICAgICAgICAgIGlmICghaGFzQ2hhbmdlcyAmJiBleGlzdGluZ1JlY29yZCkge1xuICAgICAgICAgICAgZ2FtZVJlY29yZC5sYXN0X3VwZGF0ZSA9IGV4aXN0aW5nUmVjb3JkLmxhc3RfdXBkYXRlO1xuICAgICAgICAgICAgZ2FtZVJlY29yZC51cGRhdGVkX2F0ID0gZXhpc3RpbmdSZWNvcmQudXBkYXRlZF9hdDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBwdXRSZXF1ZXN0cy5wdXNoKHtcbiAgICAgICAgICAgIFB1dFJlcXVlc3Q6IHtcbiAgICAgICAgICAgICAgSXRlbTogZ2FtZVJlY29yZCxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgXG4gICAgICAgICAgaWYgKGV4aXN0aW5nUmVjb3JkKSB7XG4gICAgICAgICAgICByZXN1bHRzLnVwZGF0ZWQrKztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0cy5pbnNlcnRlZCsrO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXN1bHRzLnByb2Nlc3NlZCsrO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgIHJlc3VsdHMuZXJyb3JzLnB1c2goYFJvdyAke2luZGV4ICsgMn06ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcid9YCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gRXhlY3V0ZSBiYXRjaCB3cml0ZVxuICAgICAgaWYgKHB1dFJlcXVlc3RzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCBiYXRjaFdyaXRlQ29tbWFuZCA9IG5ldyBCYXRjaFdyaXRlQ29tbWFuZCh7XG4gICAgICAgICAgICBSZXF1ZXN0SXRlbXM6IHtcbiAgICAgICAgICAgICAgW3RhYmxlTmFtZXMuZ2FtZXNdOiBwdXRSZXF1ZXN0cyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgXG4gICAgICAgICAgY29uc3QgYmF0Y2hSZXN1bHQgPSBhd2FpdCBkeW5hbW9EQkNsaWVudC5zZW5kKGJhdGNoV3JpdGVDb21tYW5kKTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBDaGVjayBmb3IgdW5wcm9jZXNzZWQgaXRlbXNcbiAgICAgICAgICBjb25zdCB1bnByb2Nlc3NlZEl0ZW1zID0gYmF0Y2hSZXN1bHQuVW5wcm9jZXNzZWRJdGVtcz8uW3RhYmxlTmFtZXMuZ2FtZXNdO1xuICAgICAgICAgIGlmICh1bnByb2Nlc3NlZEl0ZW1zICYmIHVucHJvY2Vzc2VkSXRlbXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBCYXRjaCB3cml0ZSBoYWQgJHt1bnByb2Nlc3NlZEl0ZW1zLmxlbmd0aH0gdW5wcm9jZXNzZWQgaXRlbXMgZm9yIGdhbWVzYCk7XG4gICAgICAgICAgICAvLyBUcnkgaW5kaXZpZHVhbCB3cml0ZXMgZm9yIHVucHJvY2Vzc2VkIGl0ZW1zXG4gICAgICAgICAgICBmb3IgKGNvbnN0IHVucHJvY2Vzc2VkSXRlbSBvZiB1bnByb2Nlc3NlZEl0ZW1zKSB7XG4gICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgcHV0R2FtZSh1bnByb2Nlc3NlZEl0ZW0uUHV0UmVxdWVzdCEuSXRlbSBhcyBHYW1lUmVjb3JkKTtcbiAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgZ2FtZUlkID0gKHVucHJvY2Vzc2VkSXRlbS5QdXRSZXF1ZXN0IS5JdGVtIGFzIGFueSkuZ2FtZV9pZDtcbiAgICAgICAgICAgICAgICBjb25zdCBlcnJvck1zZyA9IGVyciBpbnN0YW5jZW9mIEVycm9yID8gZXJyLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcic7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3Igd3JpdGluZyB1bnByb2Nlc3NlZCBnYW1lICR7Z2FtZUlkfTpgLCBlcnIpO1xuICAgICAgICAgICAgICAgIHJlc3VsdHMuZXJyb3JzLnB1c2goYEdhbWUgJHtnYW1lSWR9OiAke2Vycm9yTXNnfWApO1xuICAgICAgICAgICAgICAgIC8vIEFkanVzdCBjb3VudHMgc2luY2UgdGhpcyBpdGVtIGZhaWxlZFxuICAgICAgICAgICAgICAgIGlmIChleGlzdGluZ1JlY29yZHNNYXAuaGFzKGdhbWVJZCkpIHtcbiAgICAgICAgICAgICAgICAgIHJlc3VsdHMudXBkYXRlZC0tO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICByZXN1bHRzLmluc2VydGVkLS07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc3VsdHMucHJvY2Vzc2VkLS07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgYmF0Y2ggd3JpdGluZyBnYW1lczonLCBlcnJvcik7XG4gICAgICAgICAgLy8gSWYgYmF0Y2ggd3JpdGUgZmFpbHMsIGZhbGwgYmFjayB0byBpbmRpdmlkdWFsIHdyaXRlcyBmb3IgdGhpcyBiYXRjaFxuICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgcHV0UmVxdWVzdHMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgIGNvbnN0IHJlcXVlc3QgPSBwdXRSZXF1ZXN0c1tqXTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIGF3YWl0IHB1dEdhbWUocmVxdWVzdC5QdXRSZXF1ZXN0Lkl0ZW0pO1xuICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgIGNvbnN0IGdhbWVJZCA9IHJlcXVlc3QuUHV0UmVxdWVzdC5JdGVtLmdhbWVfaWQ7XG4gICAgICAgICAgICAgIGNvbnN0IGVycm9yTXNnID0gZXJyIGluc3RhbmNlb2YgRXJyb3IgPyBlcnIubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJztcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3Igd3JpdGluZyBnYW1lICR7Z2FtZUlkfTpgLCBlcnIpO1xuICAgICAgICAgICAgICByZXN1bHRzLmVycm9ycy5wdXNoKGBHYW1lICR7Z2FtZUlkfTogJHtlcnJvck1zZ31gKTtcbiAgICAgICAgICAgICAgLy8gQWRqdXN0IGNvdW50cyBzaW5jZSB0aGlzIGl0ZW0gZmFpbGVkXG4gICAgICAgICAgICAgIGlmIChleGlzdGluZ1JlY29yZHNNYXAuaGFzKGdhbWVJZCkpIHtcbiAgICAgICAgICAgICAgICByZXN1bHRzLnVwZGF0ZWQtLTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN1bHRzLmluc2VydGVkLS07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmVzdWx0cy5wcm9jZXNzZWQtLTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDaGVjayBpZiBhbnkgcmVjb3JkcyB3ZXJlIHN1Y2Nlc3NmdWxseSBwcm9jZXNzZWRcbiAgICBpZiAocmVzdWx0cy5wcm9jZXNzZWQgPT09IDApIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgICAgfSxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgIG1lc3NhZ2U6ICdGYWlsZWQgdG8gdXBsb2FkIGdhbWUgZGF0YS4gTm8gcmVjb3JkcyB3ZXJlIHN1Y2Nlc3NmdWxseSBwcm9jZXNzZWQuJyxcbiAgICAgICAgICBlcnJvcnM6IHJlc3VsdHMuZXJyb3JzLmxlbmd0aCA+IDAgPyByZXN1bHRzLmVycm9ycyA6IFsnVW5rbm93biBlcnJvciBvY2N1cnJlZCBkdXJpbmcgdXBsb2FkJ10sXG4gICAgICAgIH0pLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgc3RhdHVzQ29kZTogMjAwLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgbWVzc2FnZTogYFN1Y2Nlc3NmdWxseSBwcm9jZXNzZWQgJHtyZXN1bHRzLnByb2Nlc3NlZH0gZ2FtZXMgKCR7cmVzdWx0cy5pbnNlcnRlZH0gaW5zZXJ0ZWQsICR7cmVzdWx0cy51cGRhdGVkfSB1cGRhdGVkKWAsXG4gICAgICAgIHByb2Nlc3NlZDogcmVzdWx0cy5wcm9jZXNzZWQsXG4gICAgICAgIGluc2VydGVkOiByZXN1bHRzLmluc2VydGVkLFxuICAgICAgICB1cGRhdGVkOiByZXN1bHRzLnVwZGF0ZWQsXG4gICAgICAgIGVycm9yczogcmVzdWx0cy5lcnJvcnMubGVuZ3RoID4gMCA/IHJlc3VsdHMuZXJyb3JzIDogdW5kZWZpbmVkLFxuICAgICAgfSksXG4gICAgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvcjonLCBlcnJvcik7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1c0NvZGU6IDUwMCxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IFxuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgbWVzc2FnZTogJ0ludGVybmFsIHNlcnZlciBlcnJvcicsXG4gICAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJ1xuICAgICAgfSksXG4gICAgfTtcbiAgfVxufTtcblxuYXN5bmMgZnVuY3Rpb24gZ2V0R2FtZShnYW1lSWQ6IHN0cmluZykge1xuICB0cnkge1xuICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgR2V0Q29tbWFuZCh7XG4gICAgICBUYWJsZU5hbWU6IHRhYmxlTmFtZXMuZ2FtZXMsXG4gICAgICBLZXk6IHsgZ2FtZV9pZDogZ2FtZUlkIH0sXG4gICAgfSk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZHluYW1vREJDbGllbnQuc2VuZChjb21tYW5kKTtcbiAgICByZXR1cm4gcmVzdWx0Lkl0ZW0gYXMgR2FtZVJlY29yZCB8IHVuZGVmaW5lZDtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKGBFcnJvciBnZXR0aW5nIGdhbWUgJHtnYW1lSWR9OmAsIGVycm9yKTtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHB1dEdhbWUoZ2FtZTogR2FtZVJlY29yZCkge1xuICBjb25zdCBjb21tYW5kID0gbmV3IFB1dENvbW1hbmQoe1xuICAgIFRhYmxlTmFtZTogdGFibGVOYW1lcy5nYW1lcyxcbiAgICBJdGVtOiBnYW1lLFxuICB9KTtcbiAgYXdhaXQgZHluYW1vREJDbGllbnQuc2VuZChjb21tYW5kKTtcbn1cbiJdfQ==