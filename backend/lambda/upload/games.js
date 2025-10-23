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
                    await dynamodb_client_1.dynamoDBClient.send(batchWriteCommand);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2FtZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnYW1lcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFFSCx3REFBbUc7QUFFbkcsNkJBQTZCO0FBQzdCLDhEQUFzRTtBQWlCL0QsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUMxQixLQUEyQixFQUNLLEVBQUU7SUFDbEMsSUFBSSxDQUFDO1FBQ0gscUJBQXFCO1FBQ3JCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQztRQUM1QyxNQUFNLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxHQUFHLElBQUksQ0FBQztRQUVsQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDaEIsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUU7b0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtvQkFDbEMsNkJBQTZCLEVBQUUsR0FBRztpQkFDbkM7Z0JBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7b0JBQ25CLE9BQU8sRUFBRSxLQUFLO29CQUNkLE9BQU8sRUFBRSxrQkFBa0I7aUJBQzVCLENBQUM7YUFDSCxDQUFDO1FBQ0osQ0FBQztRQUVELDBCQUEwQjtRQUMxQixNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUVyRCx1QkFBdUI7UUFDdkIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUMzRCxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlDLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUM7UUFFbEQsOENBQThD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YW5kbGVzIEV4Y2VsL0NTViBmaWxlIHVwbG9hZHMgZm9yIGdhbWUgZGF0YVxuICogLSBTa2lwcyBoZWFkZXIgcm93XG4gKiAtIFVwc2VydHMgcmVjb3JkcyBiYXNlZCBvbiBnYW1lX2lkXG4gKiAtIE5vIGRlbGV0ZSBmdW5jdGlvbmFsaXR5XG4gKi9cblxuaW1wb3J0IHsgUHV0Q29tbWFuZCwgR2V0Q29tbWFuZCwgQmF0Y2hHZXRDb21tYW5kLCBCYXRjaFdyaXRlQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYic7XG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XG5pbXBvcnQgKiBhcyBYTFNYIGZyb20gJ3hsc3gnO1xuaW1wb3J0IHsgZHluYW1vREJDbGllbnQsIHRhYmxlTmFtZXMgfSBmcm9tICcuLi91dGlscy9keW5hbW9kYi1jbGllbnQnO1xuXG5pbnRlcmZhY2UgR2FtZVJlY29yZCB7XG4gIGdhbWVfaWQ6IHN0cmluZztcbiAgZ2FtZV9uYW1lOiBzdHJpbmc7XG4gIHN0dWRlbnRfaWQ6IHN0cmluZztcbiAgc3ViamVjdDogc3RyaW5nO1xuICBkaWZmaWN1bHR5OiBzdHJpbmc7XG4gIHRlYWNoZXJfaWQ6IHN0cmluZztcbiAgbGFzdF91cGRhdGU6IHN0cmluZztcbiAgc2NyYXRjaF9pZDogc3RyaW5nO1xuICBzY3JhdGNoX2FwaTogc3RyaW5nO1xuICBhY2N1bXVsYXRlZF9jbGljazogbnVtYmVyO1xuICBjcmVhdGVkX2F0Pzogc3RyaW5nO1xuICB1cGRhdGVkX2F0Pzogc3RyaW5nO1xufVxuXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChcbiAgZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50XG4pOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xuICB0cnkge1xuICAgIC8vIFBhcnNlIHJlcXVlc3QgYm9keVxuICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKGV2ZW50LmJvZHkgfHwgJ3t9Jyk7XG4gICAgY29uc3QgeyBmaWxlOiBiYXNlNjRGaWxlIH0gPSBib2R5O1xuXG4gICAgaWYgKCFiYXNlNjRGaWxlKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICAgICAgIH0sXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgXG4gICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgbWVzc2FnZTogJ05vIGZpbGUgdXBsb2FkZWQnIFxuICAgICAgICB9KSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gRGVjb2RlIGJhc2U2NCB0byBidWZmZXJcbiAgICBjb25zdCBmaWxlQnVmZmVyID0gQnVmZmVyLmZyb20oYmFzZTY0RmlsZSwgJ2Jhc2U2NCcpO1xuXG4gICAgLy8gUGFyc2UgRXhjZWwvQ1NWIGZpbGVcbiAgICBjb25zdCB3b3JrYm9vayA9IFhMU1gucmVhZChmaWxlQnVmZmVyLCB7IHR5cGU6ICdidWZmZXInIH0pO1xuICAgIGNvbnN0IGZpcnN0U2hlZXROYW1lID0gd29ya2Jvb2suU2hlZXROYW1lc1swXTtcbiAgICBjb25zdCB3b3Jrc2hlZXQgPSB3b3JrYm9vay5TaGVldHNbZmlyc3RTaGVldE5hbWVdO1xuICAgIFxuICAgIC8vIENvbnZlcnQgdG8gSlNPTiwgdXNpbmcgZmlyc3Qgcm93IGFzIGhlYWRlcnNcbiAgICBjb25zdCBqc29uRGF0YSA9IFhMU1gudXRpbHMuc2hlZXRfdG9fanNvbih3b3Jrc2hlZXQsIHsgaGVhZGVyOiAxIH0pIGFzIGFueVtdW107XG4gICAgXG4gICAgLy8gVmFsaWRhdGUgZmlsZSBoYXMgZGF0YVxuICAgIGlmIChqc29uRGF0YS5sZW5ndGggPCAyKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICAgICAgIH0sXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgXG4gICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgbWVzc2FnZTogJ0ZpbGUgaXMgZW1wdHkgb3IgY29udGFpbnMgbm8gZGF0YSByb3dzJyBcbiAgICAgICAgfSksXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIEV4dHJhY3QgaGVhZGVycyAoZmlyc3Qgcm93KSBhbmQgZGF0YSByb3dzIChza2lwIGZpcnN0IHJvdylcbiAgICBjb25zdCBoZWFkZXJzID0ganNvbkRhdGFbMF07XG4gICAgY29uc3QgZGF0YVJvd3MgPSBqc29uRGF0YS5zbGljZSgxKS5maWx0ZXIocm93ID0+IFxuICAgICAgcm93ICYmIHJvdy5sZW5ndGggPiAwICYmIHJvdy5zb21lKGNlbGwgPT4gY2VsbCAhPT0gbnVsbCAmJiBjZWxsICE9PSB1bmRlZmluZWQgJiYgY2VsbCAhPT0gJycpXG4gICAgKTtcblxuICAgIC8vIFZhbGlkYXRlIG1heGltdW0gNDAwMCByZWNvcmRzXG4gICAgaWYgKGRhdGFSb3dzLmxlbmd0aCA+IDQwMDApIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgICAgfSxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBcbiAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICBtZXNzYWdlOiBgRmlsZSBjb250YWlucyAke2RhdGFSb3dzLmxlbmd0aH0gcmVjb3Jkcy4gTWF4aW11bSBhbGxvd2VkIGlzIDQsMDAwIHJlY29yZHMuYCBcbiAgICAgICAgfSksXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIFByb2Nlc3MgcmVjb3JkcyBpbiBiYXRjaGVzIGZvciBiZXR0ZXIgcGVyZm9ybWFuY2VcbiAgICBjb25zdCByZXN1bHRzID0ge1xuICAgICAgcHJvY2Vzc2VkOiAwLFxuICAgICAgaW5zZXJ0ZWQ6IDAsXG4gICAgICB1cGRhdGVkOiAwLFxuICAgICAgZXJyb3JzOiBbXSBhcyBzdHJpbmdbXSxcbiAgICB9O1xuXG4gICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgIFxuICAgIC8vIE1hcCBhbGwgcm93cyB0byByZWNvcmRzIGZpcnN0LCB2YWxpZGF0aW5nIHJlcXVpcmVkIGZpZWxkc1xuICAgIGNvbnN0IHBhcnNlZFJlY29yZHM6IEFycmF5PHsgaW5kZXg6IG51bWJlcjsgcmVjb3JkOiBhbnkgfT4gPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRhdGFSb3dzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCByb3cgPSBkYXRhUm93c1tpXTtcbiAgICAgIGNvbnN0IHJlY29yZDogYW55ID0ge307XG4gICAgICBoZWFkZXJzLmZvckVhY2goKGhlYWRlciwgaW5kZXgpID0+IHtcbiAgICAgICAgcmVjb3JkW2hlYWRlcl0gPSByb3dbaW5kZXhdO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIFZhbGlkYXRlIHJlcXVpcmVkIGZpZWxkXG4gICAgICBpZiAoIXJlY29yZC5nYW1lX2lkKSB7XG4gICAgICAgIHJlc3VsdHMuZXJyb3JzLnB1c2goYFJvdyAke2kgKyAyfTogTWlzc2luZyBnYW1lX2lkYCk7XG4gICAgICAgIGNvbnRpbnVlO1xuICAgICAgfVxuXG4gICAgICBwYXJzZWRSZWNvcmRzLnB1c2goeyBpbmRleDogaSwgcmVjb3JkIH0pO1xuICAgIH1cblxuICAgIC8vIEJhdGNoIGNoZWNrIHdoaWNoIHJlY29yZHMgYWxyZWFkeSBleGlzdCAoMjUgaXRlbXMgcGVyIGJhdGNoKVxuICAgIGNvbnN0IEJBVENIX1NJWkUgPSAyNTtcbiAgICBjb25zdCBleGlzdGluZ1JlY29yZHNNYXAgPSBuZXcgTWFwPHN0cmluZywgR2FtZVJlY29yZD4oKTtcbiAgICBcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBhcnNlZFJlY29yZHMubGVuZ3RoOyBpICs9IEJBVENIX1NJWkUpIHtcbiAgICAgIGNvbnN0IGJhdGNoID0gcGFyc2VkUmVjb3Jkcy5zbGljZShpLCBpICsgQkFUQ0hfU0laRSk7XG4gICAgICBjb25zdCBrZXlzID0gYmF0Y2gubWFwKCh7IHJlY29yZCB9KSA9PiAoeyBnYW1lX2lkOiByZWNvcmQuZ2FtZV9pZCB9KSk7XG4gICAgICBcbiAgICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGJhdGNoR2V0Q29tbWFuZCA9IG5ldyBCYXRjaEdldENvbW1hbmQoe1xuICAgICAgICAgIFJlcXVlc3RJdGVtczoge1xuICAgICAgICAgICAgW3RhYmxlTmFtZXMuZ2FtZXNdOiB7XG4gICAgICAgICAgICAgIEtleXM6IGtleXMsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIH0pO1xuICAgICAgICBcbiAgICAgICAgY29uc3QgYmF0Y2hSZXN1bHQgPSBhd2FpdCBkeW5hbW9EQkNsaWVudC5zZW5kKGJhdGNoR2V0Q29tbWFuZCk7XG4gICAgICAgIGNvbnN0IGl0ZW1zID0gYmF0Y2hSZXN1bHQuUmVzcG9uc2VzPy5bdGFibGVOYW1lcy5nYW1lc10gfHwgW107XG4gICAgICAgIFxuICAgICAgICBpdGVtcy5mb3JFYWNoKChpdGVtKSA9PiB7XG4gICAgICAgICAgZXhpc3RpbmdSZWNvcmRzTWFwLnNldChpdGVtLmdhbWVfaWQsIGl0ZW0gYXMgR2FtZVJlY29yZCk7XG4gICAgICAgIH0pO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgYmF0Y2ggZ2V0dGluZyBnYW1lczonLCBlcnJvcik7XG4gICAgICAgIC8vIElmIGJhdGNoIGdldCBmYWlscywgZmFsbCBiYWNrIHRvIGluZGl2aWR1YWwgY2hlY2tzIGZvciB0aGlzIGJhdGNoXG4gICAgICAgIGZvciAoY29uc3QgeyByZWNvcmQgfSBvZiBiYXRjaCkge1xuICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICBjb25zdCBleGlzdGluZyA9IGF3YWl0IGdldEdhbWUocmVjb3JkLmdhbWVfaWQpO1xuICAgICAgICAgICAgaWYgKGV4aXN0aW5nKSB7XG4gICAgICAgICAgICAgIGV4aXN0aW5nUmVjb3Jkc01hcC5zZXQocmVjb3JkLmdhbWVfaWQsIGV4aXN0aW5nKTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGdldHRpbmcgZ2FtZSAke3JlY29yZC5nYW1lX2lkfTpgLCBlcnIpO1xuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEJhdGNoIHdyaXRlIHJlY29yZHMgKDI1IGl0ZW1zIHBlciBiYXRjaClcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IHBhcnNlZFJlY29yZHMubGVuZ3RoOyBpICs9IEJBVENIX1NJWkUpIHtcbiAgICAgIGNvbnN0IGJhdGNoID0gcGFyc2VkUmVjb3Jkcy5zbGljZShpLCBpICsgQkFUQ0hfU0laRSk7XG4gICAgICBjb25zdCBwdXRSZXF1ZXN0czogYW55W10gPSBbXTtcbiAgICAgIFxuICAgICAgZm9yIChjb25zdCB7IGluZGV4LCByZWNvcmQgfSBvZiBiYXRjaCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IGV4aXN0aW5nUmVjb3JkID0gZXhpc3RpbmdSZWNvcmRzTWFwLmdldChyZWNvcmQuZ2FtZV9pZCk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gUHJlcGFyZSBnYW1lIHJlY29yZFxuICAgICAgICAgIGNvbnN0IGdhbWVSZWNvcmQ6IEdhbWVSZWNvcmQgPSB7XG4gICAgICAgICAgICBnYW1lX2lkOiByZWNvcmQuZ2FtZV9pZCxcbiAgICAgICAgICAgIGdhbWVfbmFtZTogcmVjb3JkLmdhbWVfbmFtZSB8fCAnJyxcbiAgICAgICAgICAgIHN0dWRlbnRfaWQ6IHJlY29yZC5zdHVkZW50X2lkIHx8ICcnLFxuICAgICAgICAgICAgc3ViamVjdDogcmVjb3JkLnN1YmplY3QgfHwgJycsXG4gICAgICAgICAgICBkaWZmaWN1bHR5OiByZWNvcmQuZGlmZmljdWx0eSB8fCAnJyxcbiAgICAgICAgICAgIHRlYWNoZXJfaWQ6IHJlY29yZC50ZWFjaGVyX2lkIHx8ICcnLFxuICAgICAgICAgICAgbGFzdF91cGRhdGU6IG5vdyxcbiAgICAgICAgICAgIHNjcmF0Y2hfaWQ6IHJlY29yZC5zY3JhdGNoX2lkIHx8ICcnLFxuICAgICAgICAgICAgc2NyYXRjaF9hcGk6IHJlY29yZC5zY3JhdGNoX2FwaSB8fCAnJyxcbiAgICAgICAgICAgIGFjY3VtdWxhdGVkX2NsaWNrOiBleGlzdGluZ1JlY29yZCBcbiAgICAgICAgICAgICAgPyBleGlzdGluZ1JlY29yZC5hY2N1bXVsYXRlZF9jbGljayBcbiAgICAgICAgICAgICAgOiAodHlwZW9mIHJlY29yZC5hY2N1bXVsYXRlZF9jbGljayA9PT0gJ251bWJlcicgPyByZWNvcmQuYWNjdW11bGF0ZWRfY2xpY2sgOiAwKSxcbiAgICAgICAgICAgIGNyZWF0ZWRfYXQ6IGV4aXN0aW5nUmVjb3JkID8gZXhpc3RpbmdSZWNvcmQuY3JlYXRlZF9hdCA6IG5vdyxcbiAgICAgICAgICAgIHVwZGF0ZWRfYXQ6IG5vdyxcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgLy8gQ2hlY2sgaWYgZGF0YSBoYXMgYWN0dWFsbHkgY2hhbmdlZFxuICAgICAgICAgIGxldCBoYXNDaGFuZ2VzID0gIWV4aXN0aW5nUmVjb3JkO1xuICAgICAgICAgIGlmIChleGlzdGluZ1JlY29yZCkge1xuICAgICAgICAgICAgaGFzQ2hhbmdlcyA9IChcbiAgICAgICAgICAgICAgZ2FtZVJlY29yZC5nYW1lX25hbWUgIT09IGV4aXN0aW5nUmVjb3JkLmdhbWVfbmFtZSB8fFxuICAgICAgICAgICAgICBnYW1lUmVjb3JkLnN0dWRlbnRfaWQgIT09IGV4aXN0aW5nUmVjb3JkLnN0dWRlbnRfaWQgfHxcbiAgICAgICAgICAgICAgZ2FtZVJlY29yZC5zdWJqZWN0ICE9PSBleGlzdGluZ1JlY29yZC5zdWJqZWN0IHx8XG4gICAgICAgICAgICAgIGdhbWVSZWNvcmQuZGlmZmljdWx0eSAhPT0gZXhpc3RpbmdSZWNvcmQuZGlmZmljdWx0eSB8fFxuICAgICAgICAgICAgICBnYW1lUmVjb3JkLnRlYWNoZXJfaWQgIT09IGV4aXN0aW5nUmVjb3JkLnRlYWNoZXJfaWQgfHxcbiAgICAgICAgICAgICAgZ2FtZVJlY29yZC5zY3JhdGNoX2lkICE9PSBleGlzdGluZ1JlY29yZC5zY3JhdGNoX2lkIHx8XG4gICAgICAgICAgICAgIGdhbWVSZWNvcmQuc2NyYXRjaF9hcGkgIT09IGV4aXN0aW5nUmVjb3JkLnNjcmF0Y2hfYXBpXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIE9ubHkgdXBkYXRlIHRpbWVzdGFtcHMgaWYgdGhlcmUgYXJlIGFjdHVhbCBjaGFuZ2VzXG4gICAgICAgICAgaWYgKCFoYXNDaGFuZ2VzICYmIGV4aXN0aW5nUmVjb3JkKSB7XG4gICAgICAgICAgICBnYW1lUmVjb3JkLmxhc3RfdXBkYXRlID0gZXhpc3RpbmdSZWNvcmQubGFzdF91cGRhdGU7XG4gICAgICAgICAgICBnYW1lUmVjb3JkLnVwZGF0ZWRfYXQgPSBleGlzdGluZ1JlY29yZC51cGRhdGVkX2F0O1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHB1dFJlcXVlc3RzLnB1c2goe1xuICAgICAgICAgICAgUHV0UmVxdWVzdDoge1xuICAgICAgICAgICAgICBJdGVtOiBnYW1lUmVjb3JkLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBcbiAgICAgICAgICBpZiAoZXhpc3RpbmdSZWNvcmQpIHtcbiAgICAgICAgICAgIHJlc3VsdHMudXBkYXRlZCsrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHRzLmluc2VydGVkKys7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlc3VsdHMucHJvY2Vzc2VkKys7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgcmVzdWx0cy5lcnJvcnMucHVzaChgUm93ICR7aW5kZXggKyAyfTogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJ31gKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgXG4gICAgICAvLyBFeGVjdXRlIGJhdGNoIHdyaXRlXG4gICAgICBpZiAocHV0UmVxdWVzdHMubGVuZ3RoID4gMCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IGJhdGNoV3JpdGVDb21tYW5kID0gbmV3IEJhdGNoV3JpdGVDb21tYW5kKHtcbiAgICAgICAgICAgIFJlcXVlc3RJdGVtczoge1xuICAgICAgICAgICAgICBbdGFibGVOYW1lcy5nYW1lc106IHB1dFJlcXVlc3RzLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBcbiAgICAgICAgICBhd2FpdCBkeW5hbW9EQkNsaWVudC5zZW5kKGJhdGNoV3JpdGVDb21tYW5kKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBiYXRjaCB3cml0aW5nIGdhbWVzOicsIGVycm9yKTtcbiAgICAgICAgICAvLyBJZiBiYXRjaCB3cml0ZSBmYWlscywgZmFsbCBiYWNrIHRvIGluZGl2aWR1YWwgd3JpdGVzIGZvciB0aGlzIGJhdGNoXG4gICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBwdXRSZXF1ZXN0cy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgY29uc3QgcmVxdWVzdCA9IHB1dFJlcXVlc3RzW2pdO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgYXdhaXQgcHV0R2FtZShyZXF1ZXN0LlB1dFJlcXVlc3QuSXRlbSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgY29uc3QgZ2FtZUlkID0gcmVxdWVzdC5QdXRSZXF1ZXN0Lkl0ZW0uZ2FtZV9pZDtcbiAgICAgICAgICAgICAgY29uc3QgZXJyb3JNc2cgPSBlcnIgaW5zdGFuY2VvZiBFcnJvciA/IGVyci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InO1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGBFcnJvciB3cml0aW5nIGdhbWUgJHtnYW1lSWR9OmAsIGVycik7XG4gICAgICAgICAgICAgIHJlc3VsdHMuZXJyb3JzLnB1c2goYEdhbWUgJHtnYW1lSWR9OiAke2Vycm9yTXNnfWApO1xuICAgICAgICAgICAgICAvLyBBZGp1c3QgY291bnRzIHNpbmNlIHRoaXMgaXRlbSBmYWlsZWRcbiAgICAgICAgICAgICAgaWYgKGV4aXN0aW5nUmVjb3Jkc01hcC5oYXMoZ2FtZUlkKSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdHMudXBkYXRlZC0tO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc3VsdHMuaW5zZXJ0ZWQtLTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXN1bHRzLnByb2Nlc3NlZC0tO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIENoZWNrIGlmIGFueSByZWNvcmRzIHdlcmUgc3VjY2Vzc2Z1bGx5IHByb2Nlc3NlZFxuICAgIGlmIChyZXN1bHRzLnByb2Nlc3NlZCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgICB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgbWVzc2FnZTogJ0ZhaWxlZCB0byB1cGxvYWQgZ2FtZSBkYXRhLiBObyByZWNvcmRzIHdlcmUgc3VjY2Vzc2Z1bGx5IHByb2Nlc3NlZC4nLFxuICAgICAgICAgIGVycm9yczogcmVzdWx0cy5lcnJvcnMubGVuZ3RoID4gMCA/IHJlc3VsdHMuZXJyb3JzIDogWydVbmtub3duIGVycm9yIG9jY3VycmVkIGR1cmluZyB1cGxvYWQnXSxcbiAgICAgICAgfSksXG4gICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICAgICB9LFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICBtZXNzYWdlOiBgU3VjY2Vzc2Z1bGx5IHByb2Nlc3NlZCAke3Jlc3VsdHMucHJvY2Vzc2VkfSBnYW1lcyAoJHtyZXN1bHRzLmluc2VydGVkfSBpbnNlcnRlZCwgJHtyZXN1bHRzLnVwZGF0ZWR9IHVwZGF0ZWQpYCxcbiAgICAgICAgcHJvY2Vzc2VkOiByZXN1bHRzLnByb2Nlc3NlZCxcbiAgICAgICAgaW5zZXJ0ZWQ6IHJlc3VsdHMuaW5zZXJ0ZWQsXG4gICAgICAgIHVwZGF0ZWQ6IHJlc3VsdHMudXBkYXRlZCxcbiAgICAgICAgZXJyb3JzOiByZXN1bHRzLmVycm9ycy5sZW5ndGggPiAwID8gcmVzdWx0cy5lcnJvcnMgOiB1bmRlZmluZWQsXG4gICAgICB9KSxcbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yOicsIGVycm9yKTtcbiAgICByZXR1cm4ge1xuICAgICAgc3RhdHVzQ29kZTogNTAwLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgXG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICBtZXNzYWdlOiAnSW50ZXJuYWwgc2VydmVyIGVycm9yJyxcbiAgICAgICAgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InXG4gICAgICB9KSxcbiAgICB9O1xuICB9XG59O1xuXG5hc3luYyBmdW5jdGlvbiBnZXRHYW1lKGdhbWVJZDogc3RyaW5nKSB7XG4gIHRyeSB7XG4gICAgY29uc3QgY29tbWFuZCA9IG5ldyBHZXRDb21tYW5kKHtcbiAgICAgIFRhYmxlTmFtZTogdGFibGVOYW1lcy5nYW1lcyxcbiAgICAgIEtleTogeyBnYW1lX2lkOiBnYW1lSWQgfSxcbiAgICB9KTtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBkeW5hbW9EQkNsaWVudC5zZW5kKGNvbW1hbmQpO1xuICAgIHJldHVybiByZXN1bHQuSXRlbSBhcyBHYW1lUmVjb3JkIHwgdW5kZWZpbmVkO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGdldHRpbmcgZ2FtZSAke2dhbWVJZH06YCwgZXJyb3IpO1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gcHV0R2FtZShnYW1lOiBHYW1lUmVjb3JkKSB7XG4gIGNvbnN0IGNvbW1hbmQgPSBuZXcgUHV0Q29tbWFuZCh7XG4gICAgVGFibGVOYW1lOiB0YWJsZU5hbWVzLmdhbWVzLFxuICAgIEl0ZW06IGdhbWUsXG4gIH0pO1xuICBhd2FpdCBkeW5hbW9EQkNsaWVudC5zZW5kKGNvbW1hbmQpO1xufVxuIl19