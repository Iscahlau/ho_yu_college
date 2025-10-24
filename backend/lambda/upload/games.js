"use strict";
/**
 * Upload Games Lambda Handler
 * Handles Excel/CSV file uploads for game data
 * - Skips header row
 * - Upserts records based on scratch_game_id
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
        const requiredHeaders = ['scratch_game_id'];
        const expectedHeaders = [
            'scratch_game_id', 'game_name', 'student_id', 'subject',
            'difficulty', 'teacher_id', 'scratch_id', 'accumulated_click'
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
            if (!record.scratch_game_id) {
                results.errors.push(`Row ${i + 2}: Missing scratch_game_id`);
                continue;
            }
            parsedRecords.push({ index: i, record });
        }
        // Batch check which records already exist (25 items per batch)
        const BATCH_SIZE = 25;
        const existingRecordsMap = new Map();
        for (let i = 0; i < parsedRecords.length; i += BATCH_SIZE) {
            const batch = parsedRecords.slice(i, i + BATCH_SIZE);
            const keys = batch.map(({ record }) => ({ scratch_game_id: record.scratch_game_id }));
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
                    existingRecordsMap.set(item.scratch_game_id, item);
                });
            }
            catch (error) {
                console.error('Error batch getting games:', error);
                // If batch get fails, fall back to individual checks for this batch
                for (const { record } of batch) {
                    try {
                        const existing = await getGame(record.scratch_game_id);
                        if (existing) {
                            existingRecordsMap.set(record.scratch_game_id, existing);
                        }
                    }
                    catch (err) {
                        console.error(`Error getting game ${record.scratch_game_id}:`, err);
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
                    const existingRecord = existingRecordsMap.get(record.scratch_game_id);
                    // Prepare game record
                    const gameRecord = {
                        scratch_game_id: record.scratch_game_id,
                        game_name: record.game_name || '',
                        student_id: record.student_id || '',
                        subject: record.subject || '',
                        difficulty: record.difficulty || '',
                        teacher_id: record.teacher_id || '',
                        last_update: now,
                        scratch_id: record.scratch_id || '',
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
                            gameRecord.scratch_id !== existingRecord.scratch_id);
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
                                const gameId = unprocessedItem.PutRequest.Item.scratch_game_id;
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
                            const gameId = request.PutRequest.Item.scratch_game_id;
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
            Key: { scratch_game_id: gameId },
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2FtZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnYW1lcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFFSCx3REFBbUc7QUFFbkcsNkJBQTZCO0FBQzdCLDhEQUFzRTtBQWdCL0QsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUMxQixLQUEyQixFQUNLLEVBQUU7SUFDbEMsSUFBSSxDQUFDO1FBQ0gscUJBQXFCO1FBQ3JCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQztRQUM1QyxNQUFNLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxHQUFHLElBQUksQ0FBQztRQUVsQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDaEIsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUU7b0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtvQkFDbEMsNkJBQTZCLEVBQUUsR0FBRztpQkFDbkM7Z0JBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7b0JBQ25CLE9BQU8sRUFBRSxLQUFLO29CQUNkLE9BQU8sRUFBRSxrQkFBa0I7aUJBQzVCLENBQUM7YUFDSCxDQUFDO1FBQ0osQ0FBQztRQUVELDBCQUEwQjtRQUMxQixNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUVyRCx1QkFBdUI7UUFDdkIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUMzRCxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlDLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUM7UUFFbEQsOENBQThD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QXVCO2dCQUNoQyxLQUFLLEVBQUUsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsZUFBZTthQUNoRSxDQUFDO1NBQ0gsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDLENBQUM7QUE5VVcsUUFBQSxPQUFPLFdBOFVsQjtBQUVGLEtBQUssVUFBVSxPQUFPLENBQUMsTUFBYztJQUNuQyxJQUFJLENBQUM7UUFDSCxNQUFNLE9BQU8sR0FBRyxJQUFJLHlCQUFVLENBQUM7WUFDN0IsU0FBUyxFQUFFLDRCQUFVLENBQUMsS0FBSztZQUMzQixHQUFHLEVBQUUsRUFBRSxlQUFlLEVBQUUsTUFBTSxFQUFFO1NBQ2pDLENBQUMsQ0FBQztRQUNILE1BQU0sTUFBTSxHQUFHLE1BQU0sZ0NBQWMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbEQsT0FBTyxNQUFNLENBQUMsSUFBOEIsQ0FBQztJQUMvQyxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsc0JBQXNCLE1BQU0sR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3RELE9BQU8sU0FBUyxDQUFDO0lBQ25CLENBQUM7QUFDSCxDQUFDO0FBRUQsS0FBSyxVQUFVLE9BQU8sQ0FBQyxJQUFnQjtJQUNyQyxNQUFNLE9BQU8sR0FBRyxJQUFJLHlCQUFVLENBQUM7UUFDN0IsU0FBUyxFQUFFLDRCQUFVLENBQUMsS0FBSztRQUMzQixJQUFJLEVBQUUsSUFBSTtLQUNYLENBQUMsQ0FBQztJQUNILE1BQU0sZ0NBQWMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7QUFDckMsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogVXBsb2FkIEdhbWVzIExhbWJkYSBIYW5kbGVyXG4gKiBIYW5kbGVzIEV4Y2VsL0NTViBmaWxlIHVwbG9hZHMgZm9yIGdhbWUgZGF0YVxuICogLSBTa2lwcyBoZWFkZXIgcm93XG4gKiAtIFVwc2VydHMgcmVjb3JkcyBiYXNlZCBvbiBzY3JhdGNoX2dhbWVfaWRcbiAqIC0gTm8gZGVsZXRlIGZ1bmN0aW9uYWxpdHlcbiAqL1xuXG5pbXBvcnQgeyBQdXRDb21tYW5kLCBHZXRDb21tYW5kLCBCYXRjaEdldENvbW1hbmQsIEJhdGNoV3JpdGVDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvbGliLWR5bmFtb2RiJztcbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcbmltcG9ydCAqIGFzIFhMU1ggZnJvbSAneGxzeCc7XG5pbXBvcnQgeyBkeW5hbW9EQkNsaWVudCwgdGFibGVOYW1lcyB9IGZyb20gJy4uL3V0aWxzL2R5bmFtb2RiLWNsaWVudCc7XG5cbmludGVyZmFjZSBHYW1lUmVjb3JkIHtcbiAgc2NyYXRjaF9nYW1lX2lkOiBzdHJpbmc7XG4gIGdhbWVfbmFtZTogc3RyaW5nO1xuICBzdHVkZW50X2lkOiBzdHJpbmc7XG4gIHN1YmplY3Q6IHN0cmluZztcbiAgZGlmZmljdWx0eTogc3RyaW5nO1xuICB0ZWFjaGVyX2lkOiBzdHJpbmc7XG4gIGxhc3RfdXBkYXRlOiBzdHJpbmc7XG4gIHNjcmF0Y2hfaWQ6IHN0cmluZztcbiAgYWNjdW11bGF0ZWRfY2xpY2s6IG51bWJlcjtcbiAgY3JlYXRlZF9hdD86IHN0cmluZztcbiAgdXBkYXRlZF9hdD86IHN0cmluZztcbn1cblxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoXG4gIGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudFxuKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcbiAgdHJ5IHtcbiAgICAvLyBQYXJzZSByZXF1ZXN0IGJvZHlcbiAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShldmVudC5ib2R5IHx8ICd7fScpO1xuICAgIGNvbnN0IHsgZmlsZTogYmFzZTY0RmlsZSB9ID0gYm9keTtcblxuICAgIGlmICghYmFzZTY0RmlsZSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgICB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IFxuICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgIG1lc3NhZ2U6ICdObyBmaWxlIHVwbG9hZGVkJyBcbiAgICAgICAgfSksXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIERlY29kZSBiYXNlNjQgdG8gYnVmZmVyXG4gICAgY29uc3QgZmlsZUJ1ZmZlciA9IEJ1ZmZlci5mcm9tKGJhc2U2NEZpbGUsICdiYXNlNjQnKTtcblxuICAgIC8vIFBhcnNlIEV4Y2VsL0NTViBmaWxlXG4gICAgY29uc3Qgd29ya2Jvb2sgPSBYTFNYLnJlYWQoZmlsZUJ1ZmZlciwgeyB0eXBlOiAnYnVmZmVyJyB9KTtcbiAgICBjb25zdCBmaXJzdFNoZWV0TmFtZSA9IHdvcmtib29rLlNoZWV0TmFtZXNbMF07XG4gICAgY29uc3Qgd29ya3NoZWV0ID0gd29ya2Jvb2suU2hlZXRzW2ZpcnN0U2hlZXROYW1lXTtcbiAgICBcbiAgICAvLyBDb252ZXJ0IHRvIEpTT04sIHVzaW5nIGZpcnN0IHJvdyBhcyBoZWFkZXJzXG4gICAgY29uc3QganNvbkRhdGEgPSBYTFNYLnV0aWxzLnNoZWV0X3RvX2pzb24od29ya3NoZWV0LCB7IGhlYWRlcjogMSB9KSBhcyBhbnlbXVtdO1xuICAgIFxuICAgIC8vIFZhbGlkYXRlIGZpbGUgaGFzIGRhdGFcbiAgICBpZiAoanNvbkRhdGEubGVuZ3RoIDwgMikge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgICB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IFxuICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgIG1lc3NhZ2U6ICdGaWxlIGlzIGVtcHR5IG9yIGNvbnRhaW5zIG5vIGRhdGEgcm93cycgXG4gICAgICAgIH0pLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBFeHRyYWN0IGhlYWRlcnMgKGZpcnN0IHJvdykgYW5kIGRhdGEgcm93cyAoc2tpcCBmaXJzdCByb3cpXG4gICAgY29uc3QgaGVhZGVycyA9IGpzb25EYXRhWzBdO1xuICAgIGNvbnN0IGRhdGFSb3dzID0ganNvbkRhdGEuc2xpY2UoMSkuZmlsdGVyKHJvdyA9PiBcbiAgICAgIHJvdyAmJiByb3cubGVuZ3RoID4gMCAmJiByb3cuc29tZShjZWxsID0+IGNlbGwgIT09IG51bGwgJiYgY2VsbCAhPT0gdW5kZWZpbmVkICYmIGNlbGwgIT09ICcnKVxuICAgICk7XG5cbiAgICAvLyBWYWxpZGF0ZSBoZWFkZXJzIC0gY2hlY2sgZm9yIHJlcXVpcmVkIGFuZCBleHBlY3RlZCBmaWVsZHNcbiAgICBjb25zdCByZXF1aXJlZEhlYWRlcnMgPSBbJ3NjcmF0Y2hfZ2FtZV9pZCddO1xuICAgIGNvbnN0IGV4cGVjdGVkSGVhZGVycyA9IFtcbiAgICAgICdzY3JhdGNoX2dhbWVfaWQnLCAnZ2FtZV9uYW1lJywgJ3N0dWRlbnRfaWQnLCAnc3ViamVjdCcsXG4gICAgICAnZGlmZmljdWx0eScsICd0ZWFjaGVyX2lkJywgJ3NjcmF0Y2hfaWQnLCAnYWNjdW11bGF0ZWRfY2xpY2snXG4gICAgXTtcblxuICAgIC8vIENoZWNrIGZvciBtaXNzaW5nIHJlcXVpcmVkIGhlYWRlcnNcbiAgICBjb25zdCBtaXNzaW5nUmVxdWlyZWQgPSByZXF1aXJlZEhlYWRlcnMuZmlsdGVyKGggPT4gIWhlYWRlcnMuaW5jbHVkZXMoaCkpO1xuICAgIGlmIChtaXNzaW5nUmVxdWlyZWQubGVuZ3RoID4gMCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgICB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgbWVzc2FnZTogYE1pc3NpbmcgcmVxdWlyZWQgY29sdW1uKHMpOiAke21pc3NpbmdSZXF1aXJlZC5qb2luKCcsICcpfS4gUGxlYXNlIGNoZWNrIHlvdXIgRXhjZWwgZmlsZSBoZWFkZXJzLmAsXG4gICAgICAgICAgZXhwZWN0ZWRIZWFkZXJzOiBleHBlY3RlZEhlYWRlcnMsXG4gICAgICAgIH0pLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBDaGVjayBmb3IgdW5leHBlY3RlZCBoZWFkZXJzICh0eXBvcyBvciB3cm9uZyBjb2x1bW4gbmFtZXMpXG4gICAgY29uc3QgdW5leHBlY3RlZEhlYWRlcnMgPSBoZWFkZXJzLmZpbHRlcigoaDogc3RyaW5nKSA9PiBoICYmICFleHBlY3RlZEhlYWRlcnMuaW5jbHVkZXMoaCkpO1xuICAgIGlmICh1bmV4cGVjdGVkSGVhZGVycy5sZW5ndGggPiAwKSB7XG4gICAgICBjb25zb2xlLndhcm4oJ1VuZXhwZWN0ZWQgaGVhZGVycyBmb3VuZDonLCB1bmV4cGVjdGVkSGVhZGVycyk7XG4gICAgICAvLyBOb3RlOiBUaGlzIGlzIGEgd2FybmluZywgbm90IGFuIGVycm9yIC0gd2UnbGwgc3RpbGwgcHJvY2VzcyB0aGUgZmlsZVxuICAgIH1cblxuICAgIC8vIFZhbGlkYXRlIG1heGltdW0gNDAwMCByZWNvcmRzXG4gICAgaWYgKGRhdGFSb3dzLmxlbmd0aCA+IDQwMDApIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgICAgfSxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBcbiAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICBtZXNzYWdlOiBgRmlsZSBjb250YWlucyAke2RhdGFSb3dzLmxlbmd0aH0gcmVjb3Jkcy4gTWF4aW11bSBhbGxvd2VkIGlzIDQsMDAwIHJlY29yZHMuYCBcbiAgICAgICAgfSksXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIFByb2Nlc3MgcmVjb3JkcyBpbiBiYXRjaGVzIGZvciBiZXR0ZXIgcGVyZm9ybWFuY2VcbiAgICBjb25zdCByZXN1bHRzID0ge1xuICAgICAgcHJvY2Vzc2VkOiAwLFxuICAgICAgaW5zZXJ0ZWQ6IDAsXG4gICAgICB1cGRhdGVkOiAwLFxuICAgICAgZXJyb3JzOiBbXSBhcyBzdHJpbmdbXSxcbiAgICB9O1xuXG4gICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuICAgIFxuICAgIC8vIE1hcCBhbGwgcm93cyB0byByZWNvcmRzIGZpcnN0LCB2YWxpZGF0aW5nIHJlcXVpcmVkIGZpZWxkc1xuICAgIGNvbnN0IHBhcnNlZFJlY29yZHM6IEFycmF5PHsgaW5kZXg6IG51bWJlcjsgcmVjb3JkOiBhbnkgfT4gPSBbXTtcbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRhdGFSb3dzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCByb3cgPSBkYXRhUm93c1tpXTtcbiAgICAgIGNvbnN0IHJlY29yZDogYW55ID0ge307XG4gICAgICBoZWFkZXJzLmZvckVhY2goKGhlYWRlciwgaW5kZXgpID0+IHtcbiAgICAgICAgcmVjb3JkW2hlYWRlcl0gPSByb3dbaW5kZXhdO1xuICAgICAgfSk7XG5cbiAgICAgIC8vIFZhbGlkYXRlIHJlcXVpcmVkIGZpZWxkXG4gICAgICBpZiAoIXJlY29yZC5zY3JhdGNoX2dhbWVfaWQpIHtcbiAgICAgICAgcmVzdWx0cy5lcnJvcnMucHVzaChgUm93ICR7aSArIDJ9OiBNaXNzaW5nIHNjcmF0Y2hfZ2FtZV9pZGApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgcGFyc2VkUmVjb3Jkcy5wdXNoKHsgaW5kZXg6IGksIHJlY29yZCB9KTtcbiAgICB9XG5cbiAgICAvLyBCYXRjaCBjaGVjayB3aGljaCByZWNvcmRzIGFscmVhZHkgZXhpc3QgKDI1IGl0ZW1zIHBlciBiYXRjaClcbiAgICBjb25zdCBCQVRDSF9TSVpFID0gMjU7XG4gICAgY29uc3QgZXhpc3RpbmdSZWNvcmRzTWFwID0gbmV3IE1hcDxzdHJpbmcsIEdhbWVSZWNvcmQ+KCk7XG4gICAgXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYXJzZWRSZWNvcmRzLmxlbmd0aDsgaSArPSBCQVRDSF9TSVpFKSB7XG4gICAgICBjb25zdCBiYXRjaCA9IHBhcnNlZFJlY29yZHMuc2xpY2UoaSwgaSArIEJBVENIX1NJWkUpO1xuICAgICAgY29uc3Qga2V5cyA9IGJhdGNoLm1hcCgoeyByZWNvcmQgfSkgPT4gKHsgc2NyYXRjaF9nYW1lX2lkOiByZWNvcmQuc2NyYXRjaF9nYW1lX2lkIH0pKTtcbiAgICAgIFxuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgYmF0Y2hHZXRDb21tYW5kID0gbmV3IEJhdGNoR2V0Q29tbWFuZCh7XG4gICAgICAgICAgUmVxdWVzdEl0ZW1zOiB7XG4gICAgICAgICAgICBbdGFibGVOYW1lcy5nYW1lc106IHtcbiAgICAgICAgICAgICAgS2V5czoga2V5cyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBiYXRjaFJlc3VsdCA9IGF3YWl0IGR5bmFtb0RCQ2xpZW50LnNlbmQoYmF0Y2hHZXRDb21tYW5kKTtcbiAgICAgICAgY29uc3QgaXRlbXMgPSBiYXRjaFJlc3VsdC5SZXNwb25zZXM/Llt0YWJsZU5hbWVzLmdhbWVzXSB8fCBbXTtcbiAgICAgICAgXG4gICAgICAgIGl0ZW1zLmZvckVhY2goKGl0ZW0pID0+IHtcbiAgICAgICAgICBleGlzdGluZ1JlY29yZHNNYXAuc2V0KGl0ZW0uc2NyYXRjaF9nYW1lX2lkLCBpdGVtIGFzIEdhbWVSZWNvcmQpO1xuICAgICAgICB9KTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGJhdGNoIGdldHRpbmcgZ2FtZXM6JywgZXJyb3IpO1xuICAgICAgICAvLyBJZiBiYXRjaCBnZXQgZmFpbHMsIGZhbGwgYmFjayB0byBpbmRpdmlkdWFsIGNoZWNrcyBmb3IgdGhpcyBiYXRjaFxuICAgICAgICBmb3IgKGNvbnN0IHsgcmVjb3JkIH0gb2YgYmF0Y2gpIHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgZXhpc3RpbmcgPSBhd2FpdCBnZXRHYW1lKHJlY29yZC5zY3JhdGNoX2dhbWVfaWQpO1xuICAgICAgICAgICAgaWYgKGV4aXN0aW5nKSB7XG4gICAgICAgICAgICAgIGV4aXN0aW5nUmVjb3Jkc01hcC5zZXQocmVjb3JkLnNjcmF0Y2hfZ2FtZV9pZCwgZXhpc3RpbmcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3IgZ2V0dGluZyBnYW1lICR7cmVjb3JkLnNjcmF0Y2hfZ2FtZV9pZH06YCwgZXJyKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBCYXRjaCB3cml0ZSByZWNvcmRzICgyNSBpdGVtcyBwZXIgYmF0Y2gpXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYXJzZWRSZWNvcmRzLmxlbmd0aDsgaSArPSBCQVRDSF9TSVpFKSB7XG4gICAgICBjb25zdCBiYXRjaCA9IHBhcnNlZFJlY29yZHMuc2xpY2UoaSwgaSArIEJBVENIX1NJWkUpO1xuICAgICAgY29uc3QgcHV0UmVxdWVzdHM6IGFueVtdID0gW107XG4gICAgICBcbiAgICAgIGZvciAoY29uc3QgeyBpbmRleCwgcmVjb3JkIH0gb2YgYmF0Y2gpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCBleGlzdGluZ1JlY29yZCA9IGV4aXN0aW5nUmVjb3Jkc01hcC5nZXQocmVjb3JkLnNjcmF0Y2hfZ2FtZV9pZCk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gUHJlcGFyZSBnYW1lIHJlY29yZFxuICAgICAgICAgIGNvbnN0IGdhbWVSZWNvcmQ6IEdhbWVSZWNvcmQgPSB7XG4gICAgICAgICAgICBzY3JhdGNoX2dhbWVfaWQ6IHJlY29yZC5zY3JhdGNoX2dhbWVfaWQsXG4gICAgICAgICAgICBnYW1lX25hbWU6IHJlY29yZC5nYW1lX25hbWUgfHwgJycsXG4gICAgICAgICAgICBzdHVkZW50X2lkOiByZWNvcmQuc3R1ZGVudF9pZCB8fCAnJyxcbiAgICAgICAgICAgIHN1YmplY3Q6IHJlY29yZC5zdWJqZWN0IHx8ICcnLFxuICAgICAgICAgICAgZGlmZmljdWx0eTogcmVjb3JkLmRpZmZpY3VsdHkgfHwgJycsXG4gICAgICAgICAgICB0ZWFjaGVyX2lkOiByZWNvcmQudGVhY2hlcl9pZCB8fCAnJyxcbiAgICAgICAgICAgIGxhc3RfdXBkYXRlOiBub3csXG4gICAgICAgICAgICBzY3JhdGNoX2lkOiByZWNvcmQuc2NyYXRjaF9pZCB8fCAnJyxcbiAgICAgICAgICAgIGFjY3VtdWxhdGVkX2NsaWNrOiBleGlzdGluZ1JlY29yZCBcbiAgICAgICAgICAgICAgPyBleGlzdGluZ1JlY29yZC5hY2N1bXVsYXRlZF9jbGljayBcbiAgICAgICAgICAgICAgOiAodHlwZW9mIHJlY29yZC5hY2N1bXVsYXRlZF9jbGljayA9PT0gJ251bWJlcicgPyByZWNvcmQuYWNjdW11bGF0ZWRfY2xpY2sgOiAwKSxcbiAgICAgICAgICAgIGNyZWF0ZWRfYXQ6IGV4aXN0aW5nUmVjb3JkID8gZXhpc3RpbmdSZWNvcmQuY3JlYXRlZF9hdCA6IG5vdyxcbiAgICAgICAgICAgIHVwZGF0ZWRfYXQ6IG5vdyxcbiAgICAgICAgICB9O1xuXG4gICAgICAgICAgLy8gQ2hlY2sgaWYgZGF0YSBoYXMgYWN0dWFsbHkgY2hhbmdlZFxuICAgICAgICAgIGxldCBoYXNDaGFuZ2VzID0gIWV4aXN0aW5nUmVjb3JkO1xuICAgICAgICAgIGlmIChleGlzdGluZ1JlY29yZCkge1xuICAgICAgICAgICAgaGFzQ2hhbmdlcyA9IChcbiAgICAgICAgICAgICAgZ2FtZVJlY29yZC5nYW1lX25hbWUgIT09IGV4aXN0aW5nUmVjb3JkLmdhbWVfbmFtZSB8fFxuICAgICAgICAgICAgICBnYW1lUmVjb3JkLnN0dWRlbnRfaWQgIT09IGV4aXN0aW5nUmVjb3JkLnN0dWRlbnRfaWQgfHxcbiAgICAgICAgICAgICAgZ2FtZVJlY29yZC5zdWJqZWN0ICE9PSBleGlzdGluZ1JlY29yZC5zdWJqZWN0IHx8XG4gICAgICAgICAgICAgIGdhbWVSZWNvcmQuZGlmZmljdWx0eSAhPT0gZXhpc3RpbmdSZWNvcmQuZGlmZmljdWx0eSB8fFxuICAgICAgICAgICAgICBnYW1lUmVjb3JkLnRlYWNoZXJfaWQgIT09IGV4aXN0aW5nUmVjb3JkLnRlYWNoZXJfaWQgfHxcbiAgICAgICAgICAgICAgZ2FtZVJlY29yZC5zY3JhdGNoX2lkICE9PSBleGlzdGluZ1JlY29yZC5zY3JhdGNoX2lkXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIE9ubHkgdXBkYXRlIHRpbWVzdGFtcHMgaWYgdGhlcmUgYXJlIGFjdHVhbCBjaGFuZ2VzXG4gICAgICAgICAgaWYgKCFoYXNDaGFuZ2VzICYmIGV4aXN0aW5nUmVjb3JkKSB7XG4gICAgICAgICAgICBnYW1lUmVjb3JkLmxhc3RfdXBkYXRlID0gZXhpc3RpbmdSZWNvcmQubGFzdF91cGRhdGU7XG4gICAgICAgICAgICBnYW1lUmVjb3JkLnVwZGF0ZWRfYXQgPSBleGlzdGluZ1JlY29yZC51cGRhdGVkX2F0O1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHB1dFJlcXVlc3RzLnB1c2goe1xuICAgICAgICAgICAgUHV0UmVxdWVzdDoge1xuICAgICAgICAgICAgICBJdGVtOiBnYW1lUmVjb3JkLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBcbiAgICAgICAgICBpZiAoZXhpc3RpbmdSZWNvcmQpIHtcbiAgICAgICAgICAgIHJlc3VsdHMudXBkYXRlZCsrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHRzLmluc2VydGVkKys7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlc3VsdHMucHJvY2Vzc2VkKys7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgcmVzdWx0cy5lcnJvcnMucHVzaChgUm93ICR7aW5kZXggKyAyfTogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJ31gKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgXG4gICAgICAvLyBFeGVjdXRlIGJhdGNoIHdyaXRlXG4gICAgICBpZiAocHV0UmVxdWVzdHMubGVuZ3RoID4gMCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IGJhdGNoV3JpdGVDb21tYW5kID0gbmV3IEJhdGNoV3JpdGVDb21tYW5kKHtcbiAgICAgICAgICAgIFJlcXVlc3RJdGVtczoge1xuICAgICAgICAgICAgICBbdGFibGVOYW1lcy5nYW1lc106IHB1dFJlcXVlc3RzLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBcbiAgICAgICAgICBjb25zdCBiYXRjaFJlc3VsdCA9IGF3YWl0IGR5bmFtb0RCQ2xpZW50LnNlbmQoYmF0Y2hXcml0ZUNvbW1hbmQpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIENoZWNrIGZvciB1bnByb2Nlc3NlZCBpdGVtc1xuICAgICAgICAgIGNvbnN0IHVucHJvY2Vzc2VkSXRlbXMgPSBiYXRjaFJlc3VsdC5VbnByb2Nlc3NlZEl0ZW1zPy5bdGFibGVOYW1lcy5nYW1lc107XG4gICAgICAgICAgaWYgKHVucHJvY2Vzc2VkSXRlbXMgJiYgdW5wcm9jZXNzZWRJdGVtcy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICBjb25zb2xlLndhcm4oYEJhdGNoIHdyaXRlIGhhZCAke3VucHJvY2Vzc2VkSXRlbXMubGVuZ3RofSB1bnByb2Nlc3NlZCBpdGVtcyBmb3IgZ2FtZXNgKTtcbiAgICAgICAgICAgIC8vIFRyeSBpbmRpdmlkdWFsIHdyaXRlcyBmb3IgdW5wcm9jZXNzZWQgaXRlbXNcbiAgICAgICAgICAgIGZvciAoY29uc3QgdW5wcm9jZXNzZWRJdGVtIG9mIHVucHJvY2Vzc2VkSXRlbXMpIHtcbiAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICBhd2FpdCBwdXRHYW1lKHVucHJvY2Vzc2VkSXRlbS5QdXRSZXF1ZXN0IS5JdGVtIGFzIEdhbWVSZWNvcmQpO1xuICAgICAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBnYW1lSWQgPSAodW5wcm9jZXNzZWRJdGVtLlB1dFJlcXVlc3QhLkl0ZW0gYXMgYW55KS5zY3JhdGNoX2dhbWVfaWQ7XG4gICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNc2cgPSBlcnIgaW5zdGFuY2VvZiBFcnJvciA/IGVyci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIHdyaXRpbmcgdW5wcm9jZXNzZWQgZ2FtZSAke2dhbWVJZH06YCwgZXJyKTtcbiAgICAgICAgICAgICAgICByZXN1bHRzLmVycm9ycy5wdXNoKGBHYW1lICR7Z2FtZUlkfTogJHtlcnJvck1zZ31gKTtcbiAgICAgICAgICAgICAgICAvLyBBZGp1c3QgY291bnRzIHNpbmNlIHRoaXMgaXRlbSBmYWlsZWRcbiAgICAgICAgICAgICAgICBpZiAoZXhpc3RpbmdSZWNvcmRzTWFwLmhhcyhnYW1lSWQpKSB7XG4gICAgICAgICAgICAgICAgICByZXN1bHRzLnVwZGF0ZWQtLTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcmVzdWx0cy5pbnNlcnRlZC0tO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXN1bHRzLnByb2Nlc3NlZC0tO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGJhdGNoIHdyaXRpbmcgZ2FtZXM6JywgZXJyb3IpO1xuICAgICAgICAgIC8vIElmIGJhdGNoIHdyaXRlIGZhaWxzLCBmYWxsIGJhY2sgdG8gaW5kaXZpZHVhbCB3cml0ZXMgZm9yIHRoaXMgYmF0Y2hcbiAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHB1dFJlcXVlc3RzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICBjb25zdCByZXF1ZXN0ID0gcHV0UmVxdWVzdHNbal07XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBhd2FpdCBwdXRHYW1lKHJlcXVlc3QuUHV0UmVxdWVzdC5JdGVtKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICBjb25zdCBnYW1lSWQgPSByZXF1ZXN0LlB1dFJlcXVlc3QuSXRlbS5zY3JhdGNoX2dhbWVfaWQ7XG4gICAgICAgICAgICAgIGNvbnN0IGVycm9yTXNnID0gZXJyIGluc3RhbmNlb2YgRXJyb3IgPyBlcnIubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJztcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3Igd3JpdGluZyBnYW1lICR7Z2FtZUlkfTpgLCBlcnIpO1xuICAgICAgICAgICAgICByZXN1bHRzLmVycm9ycy5wdXNoKGBHYW1lICR7Z2FtZUlkfTogJHtlcnJvck1zZ31gKTtcbiAgICAgICAgICAgICAgLy8gQWRqdXN0IGNvdW50cyBzaW5jZSB0aGlzIGl0ZW0gZmFpbGVkXG4gICAgICAgICAgICAgIGlmIChleGlzdGluZ1JlY29yZHNNYXAuaGFzKGdhbWVJZCkpIHtcbiAgICAgICAgICAgICAgICByZXN1bHRzLnVwZGF0ZWQtLTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN1bHRzLmluc2VydGVkLS07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmVzdWx0cy5wcm9jZXNzZWQtLTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDaGVjayBpZiBhbnkgcmVjb3JkcyB3ZXJlIHN1Y2Nlc3NmdWxseSBwcm9jZXNzZWRcbiAgICBpZiAocmVzdWx0cy5wcm9jZXNzZWQgPT09IDApIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgICAgfSxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgIG1lc3NhZ2U6ICdGYWlsZWQgdG8gdXBsb2FkIGdhbWUgZGF0YS4gTm8gcmVjb3JkcyB3ZXJlIHN1Y2Nlc3NmdWxseSBwcm9jZXNzZWQuJyxcbiAgICAgICAgICBlcnJvcnM6IHJlc3VsdHMuZXJyb3JzLmxlbmd0aCA+IDAgPyByZXN1bHRzLmVycm9ycyA6IFsnVW5rbm93biBlcnJvciBvY2N1cnJlZCBkdXJpbmcgdXBsb2FkJ10sXG4gICAgICAgIH0pLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgc3RhdHVzQ29kZTogMjAwLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgbWVzc2FnZTogYFN1Y2Nlc3NmdWxseSBwcm9jZXNzZWQgJHtyZXN1bHRzLnByb2Nlc3NlZH0gZ2FtZXMgKCR7cmVzdWx0cy5pbnNlcnRlZH0gaW5zZXJ0ZWQsICR7cmVzdWx0cy51cGRhdGVkfSB1cGRhdGVkKWAsXG4gICAgICAgIHByb2Nlc3NlZDogcmVzdWx0cy5wcm9jZXNzZWQsXG4gICAgICAgIGluc2VydGVkOiByZXN1bHRzLmluc2VydGVkLFxuICAgICAgICB1cGRhdGVkOiByZXN1bHRzLnVwZGF0ZWQsXG4gICAgICAgIGVycm9yczogcmVzdWx0cy5lcnJvcnMubGVuZ3RoID4gMCA/IHJlc3VsdHMuZXJyb3JzIDogdW5kZWZpbmVkLFxuICAgICAgfSksXG4gICAgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvcjonLCBlcnJvcik7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1c0NvZGU6IDUwMCxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IFxuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgbWVzc2FnZTogJ0ludGVybmFsIHNlcnZlciBlcnJvcicsXG4gICAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJ1xuICAgICAgfSksXG4gICAgfTtcbiAgfVxufTtcblxuYXN5bmMgZnVuY3Rpb24gZ2V0R2FtZShnYW1lSWQ6IHN0cmluZykge1xuICB0cnkge1xuICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgR2V0Q29tbWFuZCh7XG4gICAgICBUYWJsZU5hbWU6IHRhYmxlTmFtZXMuZ2FtZXMsXG4gICAgICBLZXk6IHsgc2NyYXRjaF9nYW1lX2lkOiBnYW1lSWQgfSxcbiAgICB9KTtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBkeW5hbW9EQkNsaWVudC5zZW5kKGNvbW1hbmQpO1xuICAgIHJldHVybiByZXN1bHQuSXRlbSBhcyBHYW1lUmVjb3JkIHwgdW5kZWZpbmVkO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGdldHRpbmcgZ2FtZSAke2dhbWVJZH06YCwgZXJyb3IpO1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gcHV0R2FtZShnYW1lOiBHYW1lUmVjb3JkKSB7XG4gIGNvbnN0IGNvbW1hbmQgPSBuZXcgUHV0Q29tbWFuZCh7XG4gICAgVGFibGVOYW1lOiB0YWJsZU5hbWVzLmdhbWVzLFxuICAgIEl0ZW06IGdhbWUsXG4gIH0pO1xuICBhd2FpdCBkeW5hbW9EQkNsaWVudC5zZW5kKGNvbW1hbmQpO1xufVxuIl19