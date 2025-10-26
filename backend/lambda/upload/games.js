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
// ===== CONSTANTS =====
const BATCH_SIZE = 25;
const MAX_RECORDS = 4000;
const REQUIRED_HEADERS = ['game_id'];
const EXPECTED_HEADERS = [
    'game_id', 'game_name', 'student_id', 'subject',
    'difficulty', 'teacher_id', 'scratch_id', 'scratch_api',
    'accumulated_click', 'description'
];
const RESPONSE_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
};
// ===== HELPER FUNCTIONS =====
/**
 * Validates Excel file headers
 */
const validateHeaders = (headers) => {
    const requiredHeaders = [...REQUIRED_HEADERS];
    const expectedHeaders = [...EXPECTED_HEADERS];
    const missingRequired = requiredHeaders.filter(h => !headers.includes(h));
    if (missingRequired.length > 0) {
        return {
            valid: false,
            message: `Missing required column(s): ${missingRequired.join(', ')}. Please check your Excel file headers.`,
            expectedHeaders,
        };
    }
    const unexpectedHeaders = headers.filter(h => h && !expectedHeaders.includes(h));
    if (unexpectedHeaders.length > 0) {
        console.warn('Unexpected headers found:', unexpectedHeaders);
    }
    return { valid: true };
};
/**
 * Checks if game data has changed
 */
const hasGameDataChanged = (newGame, existingGame) => newGame.game_name !== existingGame.game_name ||
    newGame.student_id !== existingGame.student_id ||
    newGame.subject !== existingGame.subject ||
    newGame.difficulty !== existingGame.difficulty ||
    newGame.teacher_id !== existingGame.teacher_id ||
    newGame.scratch_id !== existingGame.scratch_id ||
    newGame.scratch_api !== existingGame.scratch_api ||
    newGame.description !== existingGame.description;
/**
 * Creates game record from row data
 */
const createGameRecord = (record, existingRecord, now) => {
    const gameRecord = {
        game_id: String(record.game_id), // Convert to string to handle numeric IDs from Excel
        game_name: record.game_name ?? '',
        student_id: record.student_id ?? '',
        subject: record.subject ?? '',
        difficulty: record.difficulty ?? '',
        teacher_id: record.teacher_id ?? '',
        last_update: now,
        scratch_id: record.scratch_id ?? '',
        scratch_api: record.scratch_api ?? '',
        accumulated_click: existingRecord?.accumulated_click ??
            (typeof record.accumulated_click === 'number' ? record.accumulated_click : 0),
        description: record.description ?? '',
        created_at: existingRecord?.created_at ?? now,
        updated_at: now,
    };
    // Only update timestamps if there are actual changes
    if (existingRecord && !hasGameDataChanged(gameRecord, existingRecord)) {
        gameRecord.last_update = existingRecord.last_update;
        gameRecord.updated_at = existingRecord.updated_at;
    }
    return gameRecord;
};
/**
 * Creates error response
 */
const createErrorResponse = (statusCode, message, additionalData) => ({
    statusCode,
    headers: RESPONSE_HEADERS,
    body: JSON.stringify({
        success: false,
        message,
        ...additionalData,
    }),
});
/**
 * Creates success response
 */
const createSuccessResponse = (data) => ({
    statusCode: 200,
    headers: RESPONSE_HEADERS,
    body: JSON.stringify({
        success: true,
        ...data,
    }),
});
/**
 * Parses Excel file to array of rows
 */
const parseExcelFile = (fileBuffer) => {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    return XLSX.utils.sheet_to_json(worksheet, { header: 1 });
};
/**
 * Filters out empty rows
 */
const filterEmptyRows = (rows) => rows.filter(row => row?.length > 0 && row.some(cell => cell !== null && cell !== undefined && cell !== ''));
/**
 * Converts row to record object using reduce
 */
const rowToRecord = (row, headers) => headers.reduce((record, header, index) => ({
    ...record,
    [header]: row[index]
}), {});
/**
 * Parses data rows to records with validation using map and filter
 */
const parseDataRows = (dataRows, headers, results) => dataRows
    .map((row, index) => ({ index, record: rowToRecord(row, headers) }))
    .filter(({ index, record }) => {
    if (!record.game_id) {
        results.errors.push(`Row ${index + 2}: Missing game_id`);
        return false;
    }
    return true;
});
/**
 * Splits array into chunks of specified size using Array.from
 */
const chunkArray = (array, size) => Array.from({ length: Math.ceil(array.length / size) }, (_, i) => array.slice(i * size, i * size + size));
/**
 * Fetches existing records in batches using Promise.all
 */
const fetchExistingRecords = async (parsedRecords) => {
    const batches = chunkArray(parsedRecords, BATCH_SIZE);
    const results = await Promise.all(batches.map(async (batch) => {
        // Ensure game_id is converted to string for DynamoDB keys
        const keys = batch.map(({ record }) => ({ game_id: String(record.game_id) }));
        try {
            const batchGetCommand = new lib_dynamodb_1.BatchGetCommand({
                RequestItems: {
                    [dynamodb_client_1.tableNames.games]: { Keys: keys },
                },
            });
            const batchResult = await dynamodb_client_1.dynamoDBClient.send(batchGetCommand);
            return batchResult.Responses?.[dynamodb_client_1.tableNames.games] ?? [];
        }
        catch (error) {
            console.error('Error batch getting games:', error);
            // Fallback to individual gets using Promise.all
            const individualResults = await Promise.all(batch.map(async ({ record }) => {
                try {
                    return await getGame(String(record.game_id));
                }
                catch (err) {
                    console.error(`Error getting game ${record.game_id}:`, err);
                    return undefined;
                }
            }));
            return individualResults.filter(Boolean);
        }
    }));
    const existingRecordsMap = new Map();
    results.flat().forEach(item => {
        if (item) {
            existingRecordsMap.set(item.game_id, item);
        }
    });
    return existingRecordsMap;
};
/**
 * Creates put requests from batch using map and filter
 */
const createPutRequests = (batch, existingRecordsMap, now, results) => batch
    .map(({ index, record }) => {
    try {
        const existingRecord = existingRecordsMap.get(record.game_id);
        const gameRecord = createGameRecord(record, existingRecord, now);
        if (existingRecord) {
            results.updated++;
        }
        else {
            results.inserted++;
        }
        results.processed++;
        return {
            PutRequest: { Item: gameRecord },
        };
    }
    catch (error) {
        results.errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        return null;
    }
})
    .filter(Boolean);
/**
 * Handles unprocessed items using Promise.all
 */
const handleUnprocessedItems = async (unprocessedItems, existingRecordsMap, results) => {
    await Promise.all(unprocessedItems.map(async (unprocessedItem) => {
        try {
            await putGame(unprocessedItem.PutRequest.Item);
        }
        catch (err) {
            const gameId = unprocessedItem.PutRequest.Item.game_id;
            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
            console.error(`Error writing unprocessed game ${gameId}:`, err);
            results.errors.push(`Game ${gameId}: ${errorMsg}`);
            // Adjust counts
            if (existingRecordsMap.has(gameId)) {
                results.updated--;
            }
            else {
                results.inserted--;
            }
            results.processed--;
        }
    }));
};
/**
 * Executes batch write with error handling
 */
const executeBatchWrite = async (putRequests, existingRecordsMap, results) => {
    try {
        const batchWriteCommand = new lib_dynamodb_1.BatchWriteCommand({
            RequestItems: {
                [dynamodb_client_1.tableNames.games]: putRequests,
            },
        });
        const batchResult = await dynamodb_client_1.dynamoDBClient.send(batchWriteCommand);
        const unprocessedItems = batchResult.UnprocessedItems?.[dynamodb_client_1.tableNames.games];
        if (unprocessedItems && unprocessedItems.length > 0) {
            console.warn(`Batch write had ${unprocessedItems.length} unprocessed items`);
            await handleUnprocessedItems(unprocessedItems, existingRecordsMap, results);
        }
    }
    catch (error) {
        console.error('Error batch writing games:', error);
        // Fallback to individual writes using Promise.all
        await Promise.all(putRequests.map(async (request) => {
            try {
                await putGame(request.PutRequest.Item);
            }
            catch (err) {
                const gameId = request.PutRequest.Item.game_id;
                const errorMsg = err instanceof Error ? err.message : 'Unknown error';
                console.error(`Error writing game ${gameId}:`, err);
                results.errors.push(`Game ${gameId}: ${errorMsg}`);
                // Adjust counts
                if (existingRecordsMap.has(gameId)) {
                    results.updated--;
                }
                else {
                    results.inserted--;
                }
                results.processed--;
            }
        }));
    }
};
/**
 * Processes all batch writes using Promise.all
 */
const processBatchWrites = async (parsedRecords, existingRecordsMap, now, results) => {
    const batches = chunkArray(parsedRecords, BATCH_SIZE);
    await Promise.all(batches.map(async (batch) => {
        const putRequests = createPutRequests(batch, existingRecordsMap, now, results);
        if (putRequests.length > 0) {
            await executeBatchWrite(putRequests, existingRecordsMap, results);
        }
    }));
};
/**
 * Gets a game record from DynamoDB
 */
const getGame = async (gameId) => {
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
};
/**
 * Puts a game record to DynamoDB
 */
const putGame = async (game) => {
    const command = new lib_dynamodb_1.PutCommand({
        TableName: dynamodb_client_1.tableNames.games,
        Item: game,
    });
    await dynamodb_client_1.dynamoDBClient.send(command);
};
// ===== MAIN HANDLER =====
/**
 * Main Lambda handler for game uploads
 */
const handler = async (event) => {
    try {
        // Parse request body
        const body = JSON.parse(event.body ?? '{}');
        const { file: base64File } = body;
        if (!base64File) {
            return createErrorResponse(400, 'No file uploaded');
        }
        // Decode and parse Excel file
        const fileBuffer = Buffer.from(base64File, 'base64');
        const jsonData = parseExcelFile(fileBuffer);
        // Validate file has data
        if (jsonData.length < 2) {
            return createErrorResponse(400, 'File is empty or contains no data rows');
        }
        // Extract headers and data rows using destructuring
        const [headers, ...rawDataRows] = jsonData;
        const dataRows = filterEmptyRows(rawDataRows);
        // Validate headers
        const headerValidation = validateHeaders(headers);
        if (!headerValidation.valid) {
            return createErrorResponse(400, headerValidation.message, {
                expectedHeaders: headerValidation.expectedHeaders,
            });
        }
        // Validate maximum records
        if (dataRows.length > MAX_RECORDS) {
            return createErrorResponse(400, `File contains ${dataRows.length} records. Maximum allowed is ${MAX_RECORDS.toLocaleString()} records.`);
        }
        // Initialize results
        const results = {
            processed: 0,
            inserted: 0,
            updated: 0,
            errors: [],
        };
        const now = new Date().toISOString();
        // Parse and validate all rows using map and filter
        const parsedRecords = parseDataRows(dataRows, headers, results);
        // Fetch existing records in batches using Promise.all
        const existingRecordsMap = await fetchExistingRecords(parsedRecords);
        // Process and write records in batches using Promise.all
        await processBatchWrites(parsedRecords, existingRecordsMap, now, results);
        // Check if any records were successfully processed
        if (results.processed === 0) {
            return createErrorResponse(400, 'No records were successfully processed', {
                errors: results.errors.length > 0 ? results.errors : ['Unknown error occurred during upload'],
            });
        }
        return createSuccessResponse({
            message: `Successfully processed ${results.processed} games (${results.inserted} inserted, ${results.updated} updated)`,
            processed: results.processed,
            inserted: results.inserted,
            updated: results.updated,
            errors: results.errors.length > 0 ? results.errors : undefined,
        });
    }
    catch (error) {
        console.error('Error in game upload handler:', error);
        return createErrorResponse(500, 'Internal server error', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2FtZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnYW1lcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFFSCx3REFBbUc7QUFFbkcsNkJBQTZCO0FBQzdCLDhEQUFzRTtBQWdDdEUsd0JBQXdCO0FBRXhCLE1BQU0sVUFBVSxHQUFHLEVBQUUsQ0FBQztBQUN0QixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUM7QUFFekIsTUFBTSxnQkFBZ0IsR0FBRyxDQUFDLFNBQVMsQ0FBVSxDQUFDO0FBQzlDLE1BQU0sZ0JBQWdCLEdBQUc7SUFDckIsU0FBUyxFQUFFLFdBQVcsRUFBRSxZQUFZLEVBQUUsU0FBUztJQUMvQyxZQUFZLEVBQUUsWUFBWSxFQUFFLFlBQVksRUFBRSxhQUFhO0lBQ3ZELG1CQUFtQixFQUFFLGFBQWE7Q0FDNUIsQ0FBQztBQUVYLE1BQU0sZ0JBQWdCLEdBQUc7SUFDckIsY0FBYyxFQUFFLGtCQUFrQjtJQUNsQyw2QkFBNkIsRUFBRSxHQUFHO0NBQzVCLENBQUM7QUFFWCwrQkFBK0I7QUFFL0I7O0dBRUc7QUFDSCxNQUFNLGVBQWUsR0FBRyxDQUFDLE9BQWlCLEVBQW9FLEVBQUU7SUFDNUcsTUFBTSxlQUFlLEdBQUcsQ0FBQyxHQUFHLGdCQUFnQixDQUFDLENBQUM7SUFDOUMsTUFBTSxlQUFlLEdBQUcsQ0FBQyxHQUFHLGdCQUFnQixDQUFhLENBQUM7SUFFMUQsTUFBTSxlQUFlLEdBQUcsZUFBZSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLENBQUMsT0FBTyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDO0lBRTFFLElBQUksZUFBZSxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztRQUM3QixPQUFPO1lBQ0gsS0FBSyxFQUFFLEtBQUs7WUFDWixPQUFPLEVBQUUsK0JBQStCLGVBQWUsQ0FBQyxJQUFJLENBQUMsSUFBSSxDQUFDLHlDQUF5QztZQUMzRyxlQUFl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Q0FBQyxPQUFPLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLHNDQUFzQyxDQUFDO2FBQ2hHLENBQUMsQ0FBQztRQUNQLENBQUM7UUFFRCxPQUFPLHFCQUFxQixDQUFDO1lBQ3pCLE9BQU8sRUFBRSwwQkFBMEIsT0FBTyxDQUFDLFNBQVMsV0FBVyxPQUFPLENBQUMsUUFBUSxjQUFjLE9BQU8sQ0FBQyxPQUFPLFdBQVc7WUFDdkgsU0FBUyxFQUFFLE9BQU8sQ0FBQyxTQUFTO1lBQzVCLFFBQVEsRUFBRSxPQUFPLENBQUMsUUFBUTtZQUMxQixPQUFPLEVBQUUsT0FBTyxDQUFDLE9BQU87WUFDeEIsTUFBTSxFQUFFLE9BQU8sQ0FBQyxNQUFNLENBQUMsTUFBTSxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsU0FBUztTQUNqRSxDQUFDLENBQUM7SUFDUCxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNiLE9BQU8sQ0FBQyxLQUFLLENBQUMsK0JBQStCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdEQsT0FBTyxtQkFBbUIsQ0FBQyxHQUFHLEVBQUUsdUJBQXVCLEVBQUU7WUFDckQsS0FBSyxFQUFFLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGVBQWU7U0FDbEUsQ0FBQyxDQUFDO0lBQ1AsQ0FBQztBQUNMLENBQUMsQ0FBQztBQWhGVyxRQUFBLE9BQU8sV0FnRmxCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBVcGxvYWQgR2FtZXMgTGFtYmRhIEhhbmRsZXJcbiAqIEhhbmRsZXMgRXhjZWwvQ1NWIGZpbGUgdXBsb2FkcyBmb3IgZ2FtZSBkYXRhXG4gKiAtIFNraXBzIGhlYWRlciByb3dcbiAqIC0gVXBzZXJ0cyByZWNvcmRzIGJhc2VkIG9uIGdhbWVfaWRcbiAqIC0gTm8gZGVsZXRlIGZ1bmN0aW9uYWxpdHlcbiAqL1xuXG5pbXBvcnQgeyBQdXRDb21tYW5kLCBHZXRDb21tYW5kLCBCYXRjaEdldENvbW1hbmQsIEJhdGNoV3JpdGVDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvbGliLWR5bmFtb2RiJztcbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcbmltcG9ydCAqIGFzIFhMU1ggZnJvbSAneGxzeCc7XG5pbXBvcnQgeyBkeW5hbW9EQkNsaWVudCwgdGFibGVOYW1lcyB9IGZyb20gJy4uL3V0aWxzL2R5bmFtb2RiLWNsaWVudCc7XG5cbi8vID09PT09IFRZUEVTICYgSU5URVJGQUNFUyA9PT09PVxuXG5pbnRlcmZhY2UgR2FtZVJlY29yZCB7XG4gICAgZ2FtZV9pZDogc3RyaW5nO1xuICAgIGdhbWVfbmFtZTogc3RyaW5nO1xuICAgIHN0dWRlbnRfaWQ6IHN0cmluZztcbiAgICBzdWJqZWN0OiBzdHJpbmc7XG4gICAgZGlmZmljdWx0eTogc3RyaW5nO1xuICAgIHRlYWNoZXJfaWQ6IHN0cmluZztcbiAgICBsYXN0X3VwZGF0ZTogc3RyaW5nO1xuICAgIHNjcmF0Y2hfaWQ6IHN0cmluZztcbiAgICBzY3JhdGNoX2FwaTogc3RyaW5nO1xuICAgIGFjY3VtdWxhdGVkX2NsaWNrOiBudW1iZXI7XG4gICAgZGVzY3JpcHRpb24/OiBzdHJpbmc7XG4gICAgY3JlYXRlZF9hdD86IHN0cmluZztcbiAgICB1cGRhdGVkX2F0Pzogc3RyaW5nO1xufVxuXG5pbnRlcmZhY2UgVXBsb2FkUmVzdWx0cyB7XG4gICAgcHJvY2Vzc2VkOiBudW1iZXI7XG4gICAgaW5zZXJ0ZWQ6IG51bWJlcjtcbiAgICB1cGRhdGVkOiBudW1iZXI7XG4gICAgZXJyb3JzOiBzdHJpbmdbXTtcbn1cblxuaW50ZXJmYWNlIFBhcnNlZFJlY29yZCB7XG4gICAgaW5kZXg6IG51bWJlcjtcbiAgICByZWNvcmQ6IFJlY29yZDxzdHJpbmcsIGFueT47XG59XG5cbi8vID09PT09IENPTlNUQU5UUyA9PT09PVxuXG5jb25zdCBCQVRDSF9TSVpFID0gMjU7XG5jb25zdCBNQVhfUkVDT1JEUyA9IDQwMDA7XG5cbmNvbnN0IFJFUVVJUkVEX0hFQURFUlMgPSBbJ2dhbWVfaWQnXSBhcyBjb25zdDtcbmNvbnN0IEVYUEVDVEVEX0hFQURFUlMgPSBbXG4gICAgJ2dhbWVfaWQnLCAnZ2FtZV9uYW1lJywgJ3N0dWRlbnRfaWQnLCAnc3ViamVjdCcsXG4gICAgJ2RpZmZpY3VsdHknLCAndGVhY2hlcl9pZCcsICdzY3JhdGNoX2lkJywgJ3NjcmF0Y2hfYXBpJyxcbiAgICAnYWNjdW11bGF0ZWRfY2xpY2snLCAnZGVzY3JpcHRpb24nXG5dIGFzIGNvbnN0O1xuXG5jb25zdCBSRVNQT05TRV9IRUFERVJTID0ge1xuICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbn0gYXMgY29uc3Q7XG5cbi8vID09PT09IEhFTFBFUiBGVU5DVElPTlMgPT09PT1cblxuLyoqXG4gKiBWYWxpZGF0ZXMgRXhjZWwgZmlsZSBoZWFkZXJzXG4gKi9cbmNvbnN0IHZhbGlkYXRlSGVhZGVycyA9IChoZWFkZXJzOiBzdHJpbmdbXSk6IHsgdmFsaWQ6IGJvb2xlYW47IG1lc3NhZ2U/OiBzdHJpbmc7IGV4cGVjdGVkSGVhZGVycz86IHN0cmluZ1tdIH0gPT4ge1xuICAgIGNvbnN0IHJlcXVpcmVkSGVhZGVycyA9IFsuLi5SRVFVSVJFRF9IRUFERVJTXTtcbiAgICBjb25zdCBleHBlY3RlZEhlYWRlcnMgPSBbLi4uRVhQRUNURURfSEVBREVSU10gYXMgc3RyaW5nW107XG5cbiAgICBjb25zdCBtaXNzaW5nUmVxdWlyZWQgPSByZXF1aXJlZEhlYWRlcnMuZmlsdGVyKGggPT4gIWhlYWRlcnMuaW5jbHVkZXMoaCkpO1xuXG4gICAgaWYgKG1pc3NpbmdSZXF1aXJlZC5sZW5ndGggPiAwKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB2YWxpZDogZmFsc2UsXG4gICAgICAgICAgICBtZXNzYWdlOiBgTWlzc2luZyByZXF1aXJlZCBjb2x1bW4ocyk6ICR7bWlzc2luZ1JlcXVpcmVkLmpvaW4oJywgJyl9LiBQbGVhc2UgY2hlY2sgeW91ciBFeGNlbCBmaWxlIGhlYWRlcnMuYCxcbiAgICAgICAgICAgIGV4cGVjdGVkSGVhZGVycyxcbiAgICAgICAgfTtcbiAgICB9XG5cbiAgICBjb25zdCB1bmV4cGVjdGVkSGVhZGVycyA9IGhlYWRlcnMuZmlsdGVyKGggPT4gaCAmJiAhKGV4cGVjdGVkSGVhZGVycyBhcyByZWFkb25seSBzdHJpbmdbXSkuaW5jbHVkZXMoaCkpO1xuICAgIGlmICh1bmV4cGVjdGVkSGVhZGVycy5sZW5ndGggPiAwKSB7XG4gICAgICAgIGNvbnNvbGUud2FybignVW5leHBlY3RlZCBoZWFkZXJzIGZvdW5kOicsIHVuZXhwZWN0ZWRIZWFkZXJzKTtcbiAgICB9XG5cbiAgICByZXR1cm4geyB2YWxpZDogdHJ1ZSB9O1xufTtcblxuLyoqXG4gKiBDaGVja3MgaWYgZ2FtZSBkYXRhIGhhcyBjaGFuZ2VkXG4gKi9cbmNvbnN0IGhhc0dhbWVEYXRhQ2hhbmdlZCA9IChuZXdHYW1lOiBHYW1lUmVjb3JkLCBleGlzdGluZ0dhbWU6IEdhbWVSZWNvcmQpOiBib29sZWFuID0+XG4gICAgbmV3R2FtZS5nYW1lX25hbWUgIT09IGV4aXN0aW5nR2FtZS5nYW1lX25hbWUgfHxcbiAgICBuZXdHYW1lLnN0dWRlbnRfaWQgIT09IGV4aXN0aW5nR2FtZS5zdHVkZW50X2lkIHx8XG4gICAgbmV3R2FtZS5zdWJqZWN0ICE9PSBleGlzdGluZ0dhbWUuc3ViamVjdCB8fFxuICAgIG5ld0dhbWUuZGlmZmljdWx0eSAhPT0gZXhpc3RpbmdHYW1lLmRpZmZpY3VsdHkgfHxcbiAgICBuZXdHYW1lLnRlYWNoZXJfaWQgIT09IGV4aXN0aW5nR2FtZS50ZWFjaGVyX2lkIHx8XG4gICAgbmV3R2FtZS5zY3JhdGNoX2lkICE9PSBleGlzdGluZ0dhbWUuc2NyYXRjaF9pZCB8fFxuICAgIG5ld0dhbWUuc2NyYXRjaF9hcGkgIT09IGV4aXN0aW5nR2FtZS5zY3JhdGNoX2FwaSB8fFxuICAgIG5ld0dhbWUuZGVzY3JpcHRpb24gIT09IGV4aXN0aW5nR2FtZS5kZXNjcmlwdGlvbjtcblxuLyoqXG4gKiBDcmVhdGVzIGdhbWUgcmVjb3JkIGZyb20gcm93IGRhdGFcbiAqL1xuY29uc3QgY3JlYXRlR2FtZVJlY29yZCA9IChcbiAgICByZWNvcmQ6IFJlY29yZDxzdHJpbmcsIGFueT4sXG4gICAgZXhpc3RpbmdSZWNvcmQ6IEdhbWVSZWNvcmQgfCB1bmRlZmluZWQsXG4gICAgbm93OiBzdHJpbmdcbik6IEdhbWVSZWNvcmQgPT4ge1xuICAgIGNvbnN0IGdhbWVSZWNvcmQ6IEdhbWVSZWNvcmQgPSB7XG4gICAgICAgIGdhbWVfaWQ6IFN0cmluZyhyZWNvcmQuZ2FtZV9pZCksIC8vIENvbnZlcnQgdG8gc3RyaW5nIHRvIGhhbmRsZSBudW1lcmljIElEcyBmcm9tIEV4Y2VsXG4gICAgICAgIGdhbWVfbmFtZTogcmVjb3JkLmdhbWVfbmFtZSA/PyAnJyxcbiAgICAgICAgc3R1ZGVudF9pZDogcmVjb3JkLnN0dWRlbnRfaWQgPz8gJycsXG4gICAgICAgIHN1YmplY3Q6IHJlY29yZC5zdWJqZWN0ID8/ICcnLFxuICAgICAgICBkaWZmaWN1bHR5OiByZWNvcmQuZGlmZmljdWx0eSA/PyAnJyxcbiAgICAgICAgdGVhY2hlcl9pZDogcmVjb3JkLnRlYWNoZXJfaWQgPz8gJycsXG4gICAgICAgIGxhc3RfdXBkYXRlOiBub3csXG4gICAgICAgIHNjcmF0Y2hfaWQ6IHJlY29yZC5zY3JhdGNoX2lkID8/ICcnLFxuICAgICAgICBzY3JhdGNoX2FwaTogcmVjb3JkLnNjcmF0Y2hfYXBpID8/ICcnLFxuICAgICAgICBhY2N1bXVsYXRlZF9jbGljazogZXhpc3RpbmdSZWNvcmQ/LmFjY3VtdWxhdGVkX2NsaWNrID8/XG4gICAgICAgICAgICAodHlwZW9mIHJlY29yZC5hY2N1bXVsYXRlZF9jbGljayA9PT0gJ251bWJlcicgPyByZWNvcmQuYWNjdW11bGF0ZWRfY2xpY2sgOiAwKSxcbiAgICAgICAgZGVzY3JpcHRpb246IHJlY29yZC5kZXNjcmlwdGlvbiA/PyAnJyxcbiAgICAgICAgY3JlYXRlZF9hdDogZXhpc3RpbmdSZWNvcmQ/LmNyZWF0ZWRfYXQgPz8gbm93LFxuICAgICAgICB1cGRhdGVkX2F0OiBub3csXG4gICAgfTtcblxuICAgIC8vIE9ubHkgdXBkYXRlIHRpbWVzdGFtcHMgaWYgdGhlcmUgYXJlIGFjdHVhbCBjaGFuZ2VzXG4gICAgaWYgKGV4aXN0aW5nUmVjb3JkICYmICFoYXNHYW1lRGF0YUNoYW5nZWQoZ2FtZVJlY29yZCwgZXhpc3RpbmdSZWNvcmQpKSB7XG4gICAgICAgIGdhbWVSZWNvcmQubGFzdF91cGRhdGUgPSBleGlzdGluZ1JlY29yZC5sYXN0X3VwZGF0ZTtcbiAgICAgICAgZ2FtZVJlY29yZC51cGRhdGVkX2F0ID0gZXhpc3RpbmdSZWNvcmQudXBkYXRlZF9hdDtcbiAgICB9XG5cbiAgICByZXR1cm4gZ2FtZVJlY29yZDtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBlcnJvciByZXNwb25zZVxuICovXG5jb25zdCBjcmVhdGVFcnJvclJlc3BvbnNlID0gKFxuICAgIHN0YXR1c0NvZGU6IG51bWJlcixcbiAgICBtZXNzYWdlOiBzdHJpbmcsXG4gICAgYWRkaXRpb25hbERhdGE/OiBSZWNvcmQ8c3RyaW5nLCBhbnk+XG4pOiBBUElHYXRld2F5UHJveHlSZXN1bHQgPT4gKHtcbiAgICBzdGF0dXNDb2RlLFxuICAgIGhlYWRlcnM6IFJFU1BPTlNFX0hFQURFUlMsXG4gICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgbWVzc2FnZSxcbiAgICAgICAgLi4uYWRkaXRpb25hbERhdGEsXG4gICAgfSksXG59KTtcblxuLyoqXG4gKiBDcmVhdGVzIHN1Y2Nlc3MgcmVzcG9uc2VcbiAqL1xuY29uc3QgY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlID0gKGRhdGE6IFJlY29yZDxzdHJpbmcsIGFueT4pOiBBUElHYXRld2F5UHJveHlSZXN1bHQgPT4gKHtcbiAgICBzdGF0dXNDb2RlOiAyMDAsXG4gICAgaGVhZGVyczogUkVTUE9OU0VfSEVBREVSUyxcbiAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgIC4uLmRhdGEsXG4gICAgfSksXG59KTtcblxuLyoqXG4gKiBQYXJzZXMgRXhjZWwgZmlsZSB0byBhcnJheSBvZiByb3dzXG4gKi9cbmNvbnN0IHBhcnNlRXhjZWxGaWxlID0gKGZpbGVCdWZmZXI6IEJ1ZmZlcik6IGFueVtdW10gPT4ge1xuICAgIGNvbnN0IHdvcmtib29rID0gWExTWC5yZWFkKGZpbGVCdWZmZXIsIHsgdHlwZTogJ2J1ZmZlcicgfSk7XG4gICAgY29uc3QgZmlyc3RTaGVldE5hbWUgPSB3b3JrYm9vay5TaGVldE5hbWVzWzBdO1xuICAgIGNvbnN0IHdvcmtzaGVldCA9IHdvcmtib29rLlNoZWV0c1tmaXJzdFNoZWV0TmFtZV07XG4gICAgcmV0dXJuIFhMU1gudXRpbHMuc2hlZXRfdG9fanNvbih3b3Jrc2hlZXQsIHsgaGVhZGVyOiAxIH0pIGFzIGFueVtdW107XG59O1xuXG4vKipcbiAqIEZpbHRlcnMgb3V0IGVtcHR5IHJvd3NcbiAqL1xuY29uc3QgZmlsdGVyRW1wdHlSb3dzID0gKHJvd3M6IGFueVtdW10pOiBhbnlbXVtdID0+XG4gICAgcm93cy5maWx0ZXIocm93ID0+XG4gICAgICAgIHJvdz8ubGVuZ3RoID4gMCAmJiByb3cuc29tZShjZWxsID0+IGNlbGwgIT09IG51bGwgJiYgY2VsbCAhPT0gdW5kZWZpbmVkICYmIGNlbGwgIT09ICcnKVxuICAgICk7XG5cbi8qKlxuICogQ29udmVydHMgcm93IHRvIHJlY29yZCBvYmplY3QgdXNpbmcgcmVkdWNlXG4gKi9cbmNvbnN0IHJvd1RvUmVjb3JkID0gKHJvdzogYW55W10sIGhlYWRlcnM6IHN0cmluZ1tdKTogUmVjb3JkPHN0cmluZywgYW55PiA9PlxuICAgIGhlYWRlcnMucmVkdWNlKChyZWNvcmQsIGhlYWRlciwgaW5kZXgpID0+ICh7XG4gICAgICAgIC4uLnJlY29yZCxcbiAgICAgICAgW2hlYWRlcl06IHJvd1tpbmRleF1cbiAgICB9KSwge30gYXMgUmVjb3JkPHN0cmluZywgYW55Pik7XG5cbi8qKlxuICogUGFyc2VzIGRhdGEgcm93cyB0byByZWNvcmRzIHdpdGggdmFsaWRhdGlvbiB1c2luZyBtYXAgYW5kIGZpbHRlclxuICovXG5jb25zdCBwYXJzZURhdGFSb3dzID0gKGRhdGFSb3dzOiBhbnlbXVtdLCBoZWFkZXJzOiBzdHJpbmdbXSwgcmVzdWx0czogVXBsb2FkUmVzdWx0cyk6IFBhcnNlZFJlY29yZFtdID0+XG4gICAgZGF0YVJvd3NcbiAgICAgICAgLm1hcCgocm93LCBpbmRleCkgPT4gKHsgaW5kZXgsIHJlY29yZDogcm93VG9SZWNvcmQocm93LCBoZWFkZXJzKSB9KSlcbiAgICAgICAgLmZpbHRlcigoeyBpbmRleCwgcmVjb3JkIH0pID0+IHtcbiAgICAgICAgICAgIGlmICghcmVjb3JkLmdhbWVfaWQpIHtcbiAgICAgICAgICAgICAgICByZXN1bHRzLmVycm9ycy5wdXNoKGBSb3cgJHtpbmRleCArIDJ9OiBNaXNzaW5nIGdhbWVfaWRgKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gZmFsc2U7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgICAgfSk7XG5cbi8qKlxuICogU3BsaXRzIGFycmF5IGludG8gY2h1bmtzIG9mIHNwZWNpZmllZCBzaXplIHVzaW5nIEFycmF5LmZyb21cbiAqL1xuY29uc3QgY2h1bmtBcnJheSA9IDxUPihhcnJheTogVFtdLCBzaXplOiBudW1iZXIpOiBUW11bXSA9PlxuICAgIEFycmF5LmZyb20oeyBsZW5ndGg6IE1hdGguY2VpbChhcnJheS5sZW5ndGggLyBzaXplKSB9LCAoXywgaSkgPT5cbiAgICAgICAgYXJyYXkuc2xpY2UoaSAqIHNpemUsIGkgKiBzaXplICsgc2l6ZSlcbiAgICApO1xuXG4vKipcbiAqIEZldGNoZXMgZXhpc3RpbmcgcmVjb3JkcyBpbiBiYXRjaGVzIHVzaW5nIFByb21pc2UuYWxsXG4gKi9cbmNvbnN0IGZldGNoRXhpc3RpbmdSZWNvcmRzID0gYXN5bmMgKFxuICAgIHBhcnNlZFJlY29yZHM6IFBhcnNlZFJlY29yZFtdXG4pOiBQcm9taXNlPE1hcDxzdHJpbmcsIEdhbWVSZWNvcmQ+PiA9PiB7XG4gICAgY29uc3QgYmF0Y2hlcyA9IGNodW5rQXJyYXkocGFyc2VkUmVjb3JkcywgQkFUQ0hfU0laRSk7XG5cbiAgICBjb25zdCByZXN1bHRzID0gYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgICAgIGJhdGNoZXMubWFwKGFzeW5jIChiYXRjaCkgPT4ge1xuICAgICAgICAgICAgLy8gRW5zdXJlIGdhbWVfaWQgaXMgY29udmVydGVkIHRvIHN0cmluZyBmb3IgRHluYW1vREIga2V5c1xuICAgICAgICAgICAgY29uc3Qga2V5cyA9IGJhdGNoLm1hcCgoeyByZWNvcmQgfSkgPT4gKHsgZ2FtZV9pZDogU3RyaW5nKHJlY29yZC5nYW1lX2lkKSB9KSk7XG5cbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgY29uc3QgYmF0Y2hHZXRDb21tYW5kID0gbmV3IEJhdGNoR2V0Q29tbWFuZCh7XG4gICAgICAgICAgICAgICAgICAgIFJlcXVlc3RJdGVtczoge1xuICAgICAgICAgICAgICAgICAgICAgICAgW3RhYmxlTmFtZXMuZ2FtZXNdOiB7IEtleXM6IGtleXMgfSxcbiAgICAgICAgICAgICAgICAgICAgfSxcbiAgICAgICAgICAgICAgICB9KTtcblxuICAgICAgICAgICAgICAgIGNvbnN0IGJhdGNoUmVzdWx0ID0gYXdhaXQgZHluYW1vREJDbGllbnQuc2VuZChiYXRjaEdldENvbW1hbmQpO1xuICAgICAgICAgICAgICAgIHJldHVybiBiYXRjaFJlc3VsdC5SZXNwb25zZXM/Llt0YWJsZU5hbWVzLmdhbWVzXSA/PyBbXTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgYmF0Y2ggZ2V0dGluZyBnYW1lczonLCBlcnJvcik7XG4gICAgICAgICAgICAgICAgLy8gRmFsbGJhY2sgdG8gaW5kaXZpZHVhbCBnZXRzIHVzaW5nIFByb21pc2UuYWxsXG4gICAgICAgICAgICAgICAgY29uc3QgaW5kaXZpZHVhbFJlc3VsdHMgPSBhd2FpdCBQcm9taXNlLmFsbChcbiAgICAgICAgICAgICAgICAgICAgYmF0Y2gubWFwKGFzeW5jICh7IHJlY29yZCB9KSA9PiB7XG4gICAgICAgICAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICAgICAgICAgIHJldHVybiBhd2FpdCBnZXRHYW1lKFN0cmluZyhyZWNvcmQuZ2FtZV9pZCkpO1xuICAgICAgICAgICAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3IgZ2V0dGluZyBnYW1lICR7cmVjb3JkLmdhbWVfaWR9OmAsIGVycik7XG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgfSlcbiAgICAgICAgICAgICAgICApO1xuICAgICAgICAgICAgICAgIHJldHVybiBpbmRpdmlkdWFsUmVzdWx0cy5maWx0ZXIoQm9vbGVhbik7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgKTtcblxuICAgIGNvbnN0IGV4aXN0aW5nUmVjb3Jkc01hcCA9IG5ldyBNYXA8c3RyaW5nLCBHYW1lUmVjb3JkPigpO1xuICAgIHJlc3VsdHMuZmxhdCgpLmZvckVhY2goaXRlbSA9PiB7XG4gICAgICAgIGlmIChpdGVtKSB7XG4gICAgICAgICAgICBleGlzdGluZ1JlY29yZHNNYXAuc2V0KGl0ZW0uZ2FtZV9pZCwgaXRlbSBhcyBHYW1lUmVjb3JkKTtcbiAgICAgICAgfVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIGV4aXN0aW5nUmVjb3Jkc01hcDtcbn07XG5cbi8qKlxuICogQ3JlYXRlcyBwdXQgcmVxdWVzdHMgZnJvbSBiYXRjaCB1c2luZyBtYXAgYW5kIGZpbHRlclxuICovXG5jb25zdCBjcmVhdGVQdXRSZXF1ZXN0cyA9IChcbiAgICBiYXRjaDogUGFyc2VkUmVjb3JkW10sXG4gICAgZXhpc3RpbmdSZWNvcmRzTWFwOiBNYXA8c3RyaW5nLCBHYW1lUmVjb3JkPixcbiAgICBub3c6IHN0cmluZyxcbiAgICByZXN1bHRzOiBVcGxvYWRSZXN1bHRzXG4pOiBhbnlbXSA9PlxuICAgIGJhdGNoXG4gICAgICAgIC5tYXAoKHsgaW5kZXgsIHJlY29yZCB9KSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGNvbnN0IGV4aXN0aW5nUmVjb3JkID0gZXhpc3RpbmdSZWNvcmRzTWFwLmdldChyZWNvcmQuZ2FtZV9pZCk7XG4gICAgICAgICAgICAgICAgY29uc3QgZ2FtZVJlY29yZCA9IGNyZWF0ZUdhbWVSZWNvcmQocmVjb3JkLCBleGlzdGluZ1JlY29yZCwgbm93KTtcblxuICAgICAgICAgICAgICAgIGlmIChleGlzdGluZ1JlY29yZCkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRzLnVwZGF0ZWQrKztcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRzLmluc2VydGVkKys7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc3VsdHMucHJvY2Vzc2VkKys7XG5cbiAgICAgICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgICAgICBQdXRSZXF1ZXN0OiB7IEl0ZW06IGdhbWVSZWNvcmQgfSxcbiAgICAgICAgICAgICAgICB9O1xuICAgICAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICByZXN1bHRzLmVycm9ycy5wdXNoKGBSb3cgJHtpbmRleCArIDJ9OiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InfWApO1xuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xuICAgICAgICAgICAgfVxuICAgICAgICB9KVxuICAgICAgICAuZmlsdGVyKEJvb2xlYW4pO1xuXG4vKipcbiAqIEhhbmRsZXMgdW5wcm9jZXNzZWQgaXRlbXMgdXNpbmcgUHJvbWlzZS5hbGxcbiAqL1xuY29uc3QgaGFuZGxlVW5wcm9jZXNzZWRJdGVtcyA9IGFzeW5jIChcbiAgICB1bnByb2Nlc3NlZEl0ZW1zOiBhbnlbXSxcbiAgICBleGlzdGluZ1JlY29yZHNNYXA6IE1hcDxzdHJpbmcsIEdhbWVSZWNvcmQ+LFxuICAgIHJlc3VsdHM6IFVwbG9hZFJlc3VsdHNcbik6IFByb21pc2U8dm9pZD4gPT4ge1xuICAgIGF3YWl0IFByb21pc2UuYWxsKFxuICAgICAgICB1bnByb2Nlc3NlZEl0ZW1zLm1hcChhc3luYyAodW5wcm9jZXNzZWRJdGVtKSA9PiB7XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHB1dEdhbWUodW5wcm9jZXNzZWRJdGVtLlB1dFJlcXVlc3QhLkl0ZW0gYXMgR2FtZVJlY29yZCk7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICBjb25zdCBnYW1lSWQgPSAodW5wcm9jZXNzZWRJdGVtLlB1dFJlcXVlc3QhLkl0ZW0gYXMgYW55KS5nYW1lX2lkO1xuICAgICAgICAgICAgICAgIGNvbnN0IGVycm9yTXNnID0gZXJyIGluc3RhbmNlb2YgRXJyb3IgPyBlcnIubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJztcbiAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGBFcnJvciB3cml0aW5nIHVucHJvY2Vzc2VkIGdhbWUgJHtnYW1lSWR9OmAsIGVycik7XG4gICAgICAgICAgICAgICAgcmVzdWx0cy5lcnJvcnMucHVzaChgR2FtZSAke2dhbWVJZH06ICR7ZXJyb3JNc2d9YCk7XG5cbiAgICAgICAgICAgICAgICAvLyBBZGp1c3QgY291bnRzXG4gICAgICAgICAgICAgICAgaWYgKGV4aXN0aW5nUmVjb3Jkc01hcC5oYXMoZ2FtZUlkKSkge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRzLnVwZGF0ZWQtLTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICByZXN1bHRzLmluc2VydGVkLS07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc3VsdHMucHJvY2Vzc2VkLS07XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgKTtcbn07XG5cbi8qKlxuICogRXhlY3V0ZXMgYmF0Y2ggd3JpdGUgd2l0aCBlcnJvciBoYW5kbGluZ1xuICovXG5jb25zdCBleGVjdXRlQmF0Y2hXcml0ZSA9IGFzeW5jIChcbiAgICBwdXRSZXF1ZXN0czogYW55W10sXG4gICAgZXhpc3RpbmdSZWNvcmRzTWFwOiBNYXA8c3RyaW5nLCBHYW1lUmVjb3JkPixcbiAgICByZXN1bHRzOiBVcGxvYWRSZXN1bHRzXG4pOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICB0cnkge1xuICAgICAgICBjb25zdCBiYXRjaFdyaXRlQ29tbWFuZCA9IG5ldyBCYXRjaFdyaXRlQ29tbWFuZCh7XG4gICAgICAgICAgICBSZXF1ZXN0SXRlbXM6IHtcbiAgICAgICAgICAgICAgICBbdGFibGVOYW1lcy5nYW1lc106IHB1dFJlcXVlc3RzLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgfSk7XG5cbiAgICAgICAgY29uc3QgYmF0Y2hSZXN1bHQgPSBhd2FpdCBkeW5hbW9EQkNsaWVudC5zZW5kKGJhdGNoV3JpdGVDb21tYW5kKTtcbiAgICAgICAgY29uc3QgdW5wcm9jZXNzZWRJdGVtcyA9IGJhdGNoUmVzdWx0LlVucHJvY2Vzc2VkSXRlbXM/Llt0YWJsZU5hbWVzLmdhbWVzXTtcblxuICAgICAgICBpZiAodW5wcm9jZXNzZWRJdGVtcyAmJiB1bnByb2Nlc3NlZEl0ZW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgQmF0Y2ggd3JpdGUgaGFkICR7dW5wcm9jZXNzZWRJdGVtcy5sZW5ndGh9IHVucHJvY2Vzc2VkIGl0ZW1zYCk7XG4gICAgICAgICAgICBhd2FpdCBoYW5kbGVVbnByb2Nlc3NlZEl0ZW1zKHVucHJvY2Vzc2VkSXRlbXMsIGV4aXN0aW5nUmVjb3Jkc01hcCwgcmVzdWx0cyk7XG4gICAgICAgIH1cbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBiYXRjaCB3cml0aW5nIGdhbWVzOicsIGVycm9yKTtcbiAgICAgICAgLy8gRmFsbGJhY2sgdG8gaW5kaXZpZHVhbCB3cml0ZXMgdXNpbmcgUHJvbWlzZS5hbGxcbiAgICAgICAgYXdhaXQgUHJvbWlzZS5hbGwoXG4gICAgICAgICAgICBwdXRSZXF1ZXN0cy5tYXAoYXN5bmMgKHJlcXVlc3QpID0+IHtcbiAgICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgICAgICBhd2FpdCBwdXRHYW1lKHJlcXVlc3QuUHV0UmVxdWVzdC5JdGVtKTtcbiAgICAgICAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZ2FtZUlkID0gcmVxdWVzdC5QdXRSZXF1ZXN0Lkl0ZW0uZ2FtZV9pZDtcbiAgICAgICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNc2cgPSBlcnIgaW5zdGFuY2VvZiBFcnJvciA/IGVyci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InO1xuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGBFcnJvciB3cml0aW5nIGdhbWUgJHtnYW1lSWR9OmAsIGVycik7XG4gICAgICAgICAgICAgICAgICAgIHJlc3VsdHMuZXJyb3JzLnB1c2goYEdhbWUgJHtnYW1lSWR9OiAke2Vycm9yTXNnfWApO1xuXG4gICAgICAgICAgICAgICAgICAgIC8vIEFkanVzdCBjb3VudHNcbiAgICAgICAgICAgICAgICAgICAgaWYgKGV4aXN0aW5nUmVjb3Jkc01hcC5oYXMoZ2FtZUlkKSkge1xuICAgICAgICAgICAgICAgICAgICAgICAgcmVzdWx0cy51cGRhdGVkLS07XG4gICAgICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgICAgICByZXN1bHRzLmluc2VydGVkLS07XG4gICAgICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICAgICAgcmVzdWx0cy5wcm9jZXNzZWQtLTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9KVxuICAgICAgICApO1xuICAgIH1cbn07XG5cbi8qKlxuICogUHJvY2Vzc2VzIGFsbCBiYXRjaCB3cml0ZXMgdXNpbmcgUHJvbWlzZS5hbGxcbiAqL1xuY29uc3QgcHJvY2Vzc0JhdGNoV3JpdGVzID0gYXN5bmMgKFxuICAgIHBhcnNlZFJlY29yZHM6IFBhcnNlZFJlY29yZFtdLFxuICAgIGV4aXN0aW5nUmVjb3Jkc01hcDogTWFwPHN0cmluZywgR2FtZVJlY29yZD4sXG4gICAgbm93OiBzdHJpbmcsXG4gICAgcmVzdWx0czogVXBsb2FkUmVzdWx0c1xuKTogUHJvbWlzZTx2b2lkPiA9PiB7XG4gICAgY29uc3QgYmF0Y2hlcyA9IGNodW5rQXJyYXkocGFyc2VkUmVjb3JkcywgQkFUQ0hfU0laRSk7XG5cbiAgICBhd2FpdCBQcm9taXNlLmFsbChcbiAgICAgICAgYmF0Y2hlcy5tYXAoYXN5bmMgKGJhdGNoKSA9PiB7XG4gICAgICAgICAgICBjb25zdCBwdXRSZXF1ZXN0cyA9IGNyZWF0ZVB1dFJlcXVlc3RzKGJhdGNoLCBleGlzdGluZ1JlY29yZHNNYXAsIG5vdywgcmVzdWx0cyk7XG5cbiAgICAgICAgICAgIGlmIChwdXRSZXF1ZXN0cy5sZW5ndGggPiAwKSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgZXhlY3V0ZUJhdGNoV3JpdGUocHV0UmVxdWVzdHMsIGV4aXN0aW5nUmVjb3Jkc01hcCwgcmVzdWx0cyk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pXG4gICAgKTtcbn07XG5cbi8qKlxuICogR2V0cyBhIGdhbWUgcmVjb3JkIGZyb20gRHluYW1vREJcbiAqL1xuY29uc3QgZ2V0R2FtZSA9IGFzeW5jIChnYW1lSWQ6IHN0cmluZyk6IFByb21pc2U8R2FtZVJlY29yZCB8IHVuZGVmaW5lZD4gPT4ge1xuICAgIHRyeSB7XG4gICAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgR2V0Q29tbWFuZCh7XG4gICAgICAgICAgICBUYWJsZU5hbWU6IHRhYmxlTmFtZXMuZ2FtZXMsXG4gICAgICAgICAgICBLZXk6IHsgZ2FtZV9pZDogZ2FtZUlkIH0sXG4gICAgICAgIH0pO1xuICAgICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBkeW5hbW9EQkNsaWVudC5zZW5kKGNvbW1hbmQpO1xuICAgICAgICByZXR1cm4gcmVzdWx0Lkl0ZW0gYXMgR2FtZVJlY29yZCB8IHVuZGVmaW5lZDtcbiAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKGBFcnJvciBnZXR0aW5nIGdhbWUgJHtnYW1lSWR9OmAsIGVycm9yKTtcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICB9XG59O1xuXG4vKipcbiAqIFB1dHMgYSBnYW1lIHJlY29yZCB0byBEeW5hbW9EQlxuICovXG5jb25zdCBwdXRHYW1lID0gYXN5bmMgKGdhbWU6IEdhbWVSZWNvcmQpOiBQcm9taXNlPHZvaWQ+ID0+IHtcbiAgICBjb25zdCBjb21tYW5kID0gbmV3IFB1dENvbW1hbmQoe1xuICAgICAgICBUYWJsZU5hbWU6IHRhYmxlTmFtZXMuZ2FtZXMsXG4gICAgICAgIEl0ZW06IGdhbWUsXG4gICAgfSk7XG4gICAgYXdhaXQgZHluYW1vREJDbGllbnQuc2VuZChjb21tYW5kKTtcbn07XG5cbi8vID09PT09IE1BSU4gSEFORExFUiA9PT09PVxuXG4vKipcbiAqIE1haW4gTGFtYmRhIGhhbmRsZXIgZm9yIGdhbWUgdXBsb2Fkc1xuICovXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChcbiAgICBldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnRcbik6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XG4gICAgdHJ5IHtcbiAgICAgICAgLy8gUGFyc2UgcmVxdWVzdCBib2R5XG4gICAgICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKGV2ZW50LmJvZHkgPz8gJ3t9Jyk7XG4gICAgICAgIGNvbnN0IHsgZmlsZTogYmFzZTY0RmlsZSB9ID0gYm9keTtcblxuICAgICAgICBpZiAoIWJhc2U2NEZpbGUpIHtcbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMCwgJ05vIGZpbGUgdXBsb2FkZWQnKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIERlY29kZSBhbmQgcGFyc2UgRXhjZWwgZmlsZVxuICAgICAgICBjb25zdCBmaWxlQnVmZmVyID0gQnVmZmVyLmZyb20oYmFzZTY0RmlsZSwgJ2Jhc2U2NCcpO1xuICAgICAgICBjb25zdCBqc29uRGF0YSA9IHBhcnNlRXhjZWxGaWxlKGZpbGVCdWZmZXIpO1xuXG4gICAgICAgIC8vIFZhbGlkYXRlIGZpbGUgaGFzIGRhdGFcbiAgICAgICAgaWYgKGpzb25EYXRhLmxlbmd0aCA8IDIpIHtcbiAgICAgICAgICAgIHJldHVybiBjcmVhdGVFcnJvclJlc3BvbnNlKDQwMCwgJ0ZpbGUgaXMgZW1wdHkgb3IgY29udGFpbnMgbm8gZGF0YSByb3dzJyk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBFeHRyYWN0IGhlYWRlcnMgYW5kIGRhdGEgcm93cyB1c2luZyBkZXN0cnVjdHVyaW5nXG4gICAgICAgIGNvbnN0IFtoZWFkZXJzLCAuLi5yYXdEYXRhUm93c10gPSBqc29uRGF0YTtcbiAgICAgICAgY29uc3QgZGF0YVJvd3MgPSBmaWx0ZXJFbXB0eVJvd3MocmF3RGF0YVJvd3MpO1xuXG4gICAgICAgIC8vIFZhbGlkYXRlIGhlYWRlcnNcbiAgICAgICAgY29uc3QgaGVhZGVyVmFsaWRhdGlvbiA9IHZhbGlkYXRlSGVhZGVycyhoZWFkZXJzKTtcbiAgICAgICAgaWYgKCFoZWFkZXJWYWxpZGF0aW9uLnZhbGlkKSB7XG4gICAgICAgICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg0MDAsIGhlYWRlclZhbGlkYXRpb24ubWVzc2FnZSEsIHtcbiAgICAgICAgICAgICAgICBleHBlY3RlZEhlYWRlcnM6IGhlYWRlclZhbGlkYXRpb24uZXhwZWN0ZWRIZWFkZXJzLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBWYWxpZGF0ZSBtYXhpbXVtIHJlY29yZHNcbiAgICAgICAgaWYgKGRhdGFSb3dzLmxlbmd0aCA+IE1BWF9SRUNPUkRTKSB7XG4gICAgICAgICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZShcbiAgICAgICAgICAgICAgICA0MDAsXG4gICAgICAgICAgICAgICAgYEZpbGUgY29udGFpbnMgJHtkYXRhUm93cy5sZW5ndGh9IHJlY29yZHMuIE1heGltdW0gYWxsb3dlZCBpcyAke01BWF9SRUNPUkRTLnRvTG9jYWxlU3RyaW5nKCl9IHJlY29yZHMuYFxuICAgICAgICAgICAgKTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIEluaXRpYWxpemUgcmVzdWx0c1xuICAgICAgICBjb25zdCByZXN1bHRzOiBVcGxvYWRSZXN1bHRzID0ge1xuICAgICAgICAgICAgcHJvY2Vzc2VkOiAwLFxuICAgICAgICAgICAgaW5zZXJ0ZWQ6IDAsXG4gICAgICAgICAgICB1cGRhdGVkOiAwLFxuICAgICAgICAgICAgZXJyb3JzOiBbXSxcbiAgICAgICAgfTtcblxuICAgICAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG5cbiAgICAgICAgLy8gUGFyc2UgYW5kIHZhbGlkYXRlIGFsbCByb3dzIHVzaW5nIG1hcCBhbmQgZmlsdGVyXG4gICAgICAgIGNvbnN0IHBhcnNlZFJlY29yZHMgPSBwYXJzZURhdGFSb3dzKGRhdGFSb3dzLCBoZWFkZXJzLCByZXN1bHRzKTtcblxuICAgICAgICAvLyBGZXRjaCBleGlzdGluZyByZWNvcmRzIGluIGJhdGNoZXMgdXNpbmcgUHJvbWlzZS5hbGxcbiAgICAgICAgY29uc3QgZXhpc3RpbmdSZWNvcmRzTWFwID0gYXdhaXQgZmV0Y2hFeGlzdGluZ1JlY29yZHMocGFyc2VkUmVjb3Jkcyk7XG5cbiAgICAgICAgLy8gUHJvY2VzcyBhbmQgd3JpdGUgcmVjb3JkcyBpbiBiYXRjaGVzIHVzaW5nIFByb21pc2UuYWxsXG4gICAgICAgIGF3YWl0IHByb2Nlc3NCYXRjaFdyaXRlcyhwYXJzZWRSZWNvcmRzLCBleGlzdGluZ1JlY29yZHNNYXAsIG5vdywgcmVzdWx0cyk7XG5cbiAgICAgICAgLy8gQ2hlY2sgaWYgYW55IHJlY29yZHMgd2VyZSBzdWNjZXNzZnVsbHkgcHJvY2Vzc2VkXG4gICAgICAgIGlmIChyZXN1bHRzLnByb2Nlc3NlZCA9PT0gMCkge1xuICAgICAgICAgICAgcmV0dXJuIGNyZWF0ZUVycm9yUmVzcG9uc2UoNDAwLCAnTm8gcmVjb3JkcyB3ZXJlIHN1Y2Nlc3NmdWxseSBwcm9jZXNzZWQnLCB7XG4gICAgICAgICAgICAgICAgZXJyb3JzOiByZXN1bHRzLmVycm9ycy5sZW5ndGggPiAwID8gcmVzdWx0cy5lcnJvcnMgOiBbJ1Vua25vd24gZXJyb3Igb2NjdXJyZWQgZHVyaW5nIHVwbG9hZCddLFxuICAgICAgICAgICAgfSk7XG4gICAgICAgIH1cblxuICAgICAgICByZXR1cm4gY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlKHtcbiAgICAgICAgICAgIG1lc3NhZ2U6IGBTdWNjZXNzZnVsbHkgcHJvY2Vzc2VkICR7cmVzdWx0cy5wcm9jZXNzZWR9IGdhbWVzICgke3Jlc3VsdHMuaW5zZXJ0ZWR9IGluc2VydGVkLCAke3Jlc3VsdHMudXBkYXRlZH0gdXBkYXRlZClgLFxuICAgICAgICAgICAgcHJvY2Vzc2VkOiByZXN1bHRzLnByb2Nlc3NlZCxcbiAgICAgICAgICAgIGluc2VydGVkOiByZXN1bHRzLmluc2VydGVkLFxuICAgICAgICAgICAgdXBkYXRlZDogcmVzdWx0cy51cGRhdGVkLFxuICAgICAgICAgICAgZXJyb3JzOiByZXN1bHRzLmVycm9ycy5sZW5ndGggPiAwID8gcmVzdWx0cy5lcnJvcnMgOiB1bmRlZmluZWQsXG4gICAgICAgIH0pO1xuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGluIGdhbWUgdXBsb2FkIGhhbmRsZXI6JywgZXJyb3IpO1xuICAgICAgICByZXR1cm4gY3JlYXRlRXJyb3JSZXNwb25zZSg1MDAsICdJbnRlcm5hbCBzZXJ2ZXIgZXJyb3InLCB7XG4gICAgICAgICAgICBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcidcbiAgICAgICAgfSk7XG4gICAgfVxufTtcblxuIl19