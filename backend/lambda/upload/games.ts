/**
 * Upload Games Lambda Handler
 * Handles Excel/CSV file uploads for game data
 * - Skips header row
 * - Upserts records based on game_id
 * - No delete functionality
 */

import { PutCommand, GetCommand, BatchGetCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import * as XLSX from 'xlsx';
import { dynamoDBClient, tableNames } from '../utils/dynamodb-client';

// ===== TYPES & INTERFACES =====

interface GameRecord {
    game_id: string;
    game_name: string;
    student_id: string;
    subject: string;
    difficulty: string;
    teacher_id: string;
    last_update: string;
    scratch_id: string;
    scratch_api: string;
    accumulated_click: number;
    description?: string;
    created_at?: string;
    updated_at?: string;
}

interface UploadResults {
    processed: number;
    inserted: number;
    updated: number;
    errors: string[];
}

interface ParsedRecord {
    index: number;
    record: Record<string, any>;
}

// ===== CONSTANTS =====

const BATCH_SIZE = 25;
const MAX_RECORDS = 4000;

const REQUIRED_HEADERS = ['game_id'] as const;
const EXPECTED_HEADERS = [
    'game_id', 'game_name', 'student_id', 'subject',
    'difficulty', 'teacher_id', 'scratch_id', 'scratch_api',
    'accumulated_click', 'description'
] as const;

const RESPONSE_HEADERS = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
} as const;

// ===== HELPER FUNCTIONS =====

/**
 * Validates Excel file headers
 */
const validateHeaders = (headers: string[]): { valid: boolean; message?: string; expectedHeaders?: string[] } => {
    const requiredHeaders = [...REQUIRED_HEADERS];
    const expectedHeaders = [...EXPECTED_HEADERS] as string[];

    const missingRequired = requiredHeaders.filter(h => !headers.includes(h));

    if (missingRequired.length > 0) {
        return {
            valid: false,
            message: `Missing required column(s): ${missingRequired.join(', ')}. Please check your Excel file headers.`,
            expectedHeaders,
        };
    }

    const unexpectedHeaders = headers.filter(h => h && !(expectedHeaders as readonly string[]).includes(h));
    if (unexpectedHeaders.length > 0) {
        console.warn('Unexpected headers found:', unexpectedHeaders);
    }

    return { valid: true };
};

/**
 * Checks if game data has changed
 */
const hasGameDataChanged = (newGame: GameRecord, existingGame: GameRecord): boolean =>
    newGame.game_name !== existingGame.game_name ||
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
const createGameRecord = (
    record: Record<string, any>,
    existingRecord: GameRecord | undefined,
    now: string
): GameRecord => {
    const gameRecord: GameRecord = {
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
const createErrorResponse = (
    statusCode: number,
    message: string,
    additionalData?: Record<string, any>
): APIGatewayProxyResult => ({
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
const createSuccessResponse = (data: Record<string, any>): APIGatewayProxyResult => ({
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
const parseExcelFile = (fileBuffer: Buffer): any[][] => {
    const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];
    return XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
};

/**
 * Filters out empty rows
 */
const filterEmptyRows = (rows: any[][]): any[][] =>
    rows.filter(row =>
        row?.length > 0 && row.some(cell => cell !== null && cell !== undefined && cell !== '')
    );

/**
 * Converts row to record object using reduce
 */
const rowToRecord = (row: any[], headers: string[]): Record<string, any> =>
    headers.reduce((record, header, index) => ({
        ...record,
        [header]: row[index]
    }), {} as Record<string, any>);

/**
 * Parses data rows to records with validation using map and filter
 */
const parseDataRows = (dataRows: any[][], headers: string[], results: UploadResults): ParsedRecord[] =>
    dataRows
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
const chunkArray = <T>(array: T[], size: number): T[][] =>
    Array.from({ length: Math.ceil(array.length / size) }, (_, i) =>
        array.slice(i * size, i * size + size)
    );

/**
 * Fetches existing records in batches using Promise.all
 */
const fetchExistingRecords = async (
    parsedRecords: ParsedRecord[]
): Promise<Map<string, GameRecord>> => {
    const batches = chunkArray(parsedRecords, BATCH_SIZE);

    const results = await Promise.all(
        batches.map(async (batch) => {
            // Ensure game_id is converted to string for DynamoDB keys
            const keys = batch.map(({ record }) => ({ game_id: String(record.game_id) }));

            try {
                const batchGetCommand = new BatchGetCommand({
                    RequestItems: {
                        [tableNames.games]: { Keys: keys },
                    },
                });

                const batchResult = await dynamoDBClient.send(batchGetCommand);
                return batchResult.Responses?.[tableNames.games] ?? [];
            } catch (error) {
                console.error('Error batch getting games:', error);
                // Fallback to individual gets using Promise.all
                const individualResults = await Promise.all(
                    batch.map(async ({ record }) => {
                        try {
                            return await getGame(String(record.game_id));
                        } catch (err) {
                            console.error(`Error getting game ${record.game_id}:`, err);
                            return undefined;
                        }
                    })
                );
                return individualResults.filter(Boolean);
            }
        })
    );

    const existingRecordsMap = new Map<string, GameRecord>();
    results.flat().forEach(item => {
        if (item) {
            existingRecordsMap.set(item.game_id, item as GameRecord);
        }
    });

    return existingRecordsMap;
};

/**
 * Creates put requests from batch using map and filter
 */
const createPutRequests = (
    batch: ParsedRecord[],
    existingRecordsMap: Map<string, GameRecord>,
    now: string,
    results: UploadResults
): any[] =>
    batch
        .map(({ index, record }) => {
            try {
                const existingRecord = existingRecordsMap.get(record.game_id);
                const gameRecord = createGameRecord(record, existingRecord, now);

                if (existingRecord) {
                    results.updated++;
                } else {
                    results.inserted++;
                }
                results.processed++;

                return {
                    PutRequest: { Item: gameRecord },
                };
            } catch (error) {
                results.errors.push(`Row ${index + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
                return null;
            }
        })
        .filter(Boolean);

/**
 * Handles unprocessed items using Promise.all
 */
const handleUnprocessedItems = async (
    unprocessedItems: any[],
    existingRecordsMap: Map<string, GameRecord>,
    results: UploadResults
): Promise<void> => {
    await Promise.all(
        unprocessedItems.map(async (unprocessedItem) => {
            try {
                await putGame(unprocessedItem.PutRequest!.Item as GameRecord);
            } catch (err) {
                const gameId = (unprocessedItem.PutRequest!.Item as any).game_id;
                const errorMsg = err instanceof Error ? err.message : 'Unknown error';
                console.error(`Error writing unprocessed game ${gameId}:`, err);
                results.errors.push(`Game ${gameId}: ${errorMsg}`);

                // Adjust counts
                if (existingRecordsMap.has(gameId)) {
                    results.updated--;
                } else {
                    results.inserted--;
                }
                results.processed--;
            }
        })
    );
};

/**
 * Executes batch write with error handling
 */
const executeBatchWrite = async (
    putRequests: any[],
    existingRecordsMap: Map<string, GameRecord>,
    results: UploadResults
): Promise<void> => {
    try {
        const batchWriteCommand = new BatchWriteCommand({
            RequestItems: {
                [tableNames.games]: putRequests,
            },
        });

        const batchResult = await dynamoDBClient.send(batchWriteCommand);
        const unprocessedItems = batchResult.UnprocessedItems?.[tableNames.games];

        if (unprocessedItems && unprocessedItems.length > 0) {
            console.warn(`Batch write had ${unprocessedItems.length} unprocessed items`);
            await handleUnprocessedItems(unprocessedItems, existingRecordsMap, results);
        }
    } catch (error) {
        console.error('Error batch writing games:', error);
        // Fallback to individual writes using Promise.all
        await Promise.all(
            putRequests.map(async (request) => {
                try {
                    await putGame(request.PutRequest.Item);
                } catch (err) {
                    const gameId = request.PutRequest.Item.game_id;
                    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
                    console.error(`Error writing game ${gameId}:`, err);
                    results.errors.push(`Game ${gameId}: ${errorMsg}`);

                    // Adjust counts
                    if (existingRecordsMap.has(gameId)) {
                        results.updated--;
                    } else {
                        results.inserted--;
                    }
                    results.processed--;
                }
            })
        );
    }
};

/**
 * Processes all batch writes using Promise.all
 */
const processBatchWrites = async (
    parsedRecords: ParsedRecord[],
    existingRecordsMap: Map<string, GameRecord>,
    now: string,
    results: UploadResults
): Promise<void> => {
    const batches = chunkArray(parsedRecords, BATCH_SIZE);

    await Promise.all(
        batches.map(async (batch) => {
            const putRequests = createPutRequests(batch, existingRecordsMap, now, results);

            if (putRequests.length > 0) {
                await executeBatchWrite(putRequests, existingRecordsMap, results);
            }
        })
    );
};

/**
 * Gets a game record from DynamoDB
 */
const getGame = async (gameId: string): Promise<GameRecord | undefined> => {
    try {
        const command = new GetCommand({
            TableName: tableNames.games,
            Key: { game_id: gameId },
        });
        const result = await dynamoDBClient.send(command);
        return result.Item as GameRecord | undefined;
    } catch (error) {
        console.error(`Error getting game ${gameId}:`, error);
        return undefined;
    }
};

/**
 * Puts a game record to DynamoDB
 */
const putGame = async (game: GameRecord): Promise<void> => {
    const command = new PutCommand({
        TableName: tableNames.games,
        Item: game,
    });
    await dynamoDBClient.send(command);
};

// ===== MAIN HANDLER =====

/**
 * Main Lambda handler for game uploads
 */
export const handler = async (
    event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
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
            return createErrorResponse(400, headerValidation.message!, {
                expectedHeaders: headerValidation.expectedHeaders,
            });
        }

        // Validate maximum records
        if (dataRows.length > MAX_RECORDS) {
            return createErrorResponse(
                400,
                `File contains ${dataRows.length} records. Maximum allowed is ${MAX_RECORDS.toLocaleString()} records.`
            );
        }

        // Initialize results
        const results: UploadResults = {
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
    } catch (error) {
        console.error('Error in game upload handler:', error);
        return createErrorResponse(500, 'Internal server error', {
            error: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};

