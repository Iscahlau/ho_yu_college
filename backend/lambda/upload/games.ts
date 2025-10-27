/**
 * Upload Games Lambda Handler
 * Handles Excel/CSV file uploads for game data
 * - Skips header row
 * - Upserts records based on game_id
 * - No delete functionality
 */

import { PutCommand, GetCommand, BatchGetCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { dynamoDBClient, tableNames } from '../utils/dynamodb-client';
import {
  createBadRequestResponse,
  createSuccessResponse,
  createInternalErrorResponse,
  parseRequestBody,
  getCurrentTimestamp,
} from '../utils/response';
import { createLambdaLogger } from '../utils/logger';
import logger from '../utils/logger';
import {
  parseExcelFile,
  filterEmptyRows,
  rowToRecord,
  validateHeaders,
  extractHeadersAndRows,
  validateRecordCount,
} from '../utils/excel';
import {
  BATCH_SIZE,
  MAX_RECORDS,
  GAMES_REQUIRED_HEADERS,
  GAMES_EXPECTED_HEADERS,
} from '../constants';
import type {
  GameRecord,
  UploadResults,
  ParsedRecord,
  UploadRequest,
} from '../types';


// ===== HELPER FUNCTIONS =====

/**
 * Checks if game data has changed
 */
const hasGameChanged = (newGame: GameRecord, existingGame: GameRecord): boolean =>
    newGame.game_name !== existingGame.game_name ||
    newGame.student_id !== existingGame.student_id ||
    newGame.subject !== existingGame.subject ||
    newGame.difficulty !== existingGame.difficulty ||
    newGame.teacher_id !== existingGame.teacher_id ||
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
        scratch_api: record.scratch_api ?? '',
        accumulated_click: existingRecord?.accumulated_click ??
            (typeof record.accumulated_click === 'number' ? record.accumulated_click : 0),
        description: record.description ?? '',
        created_at: existingRecord?.created_at ?? now,
        updated_at: now,
    };

    // Only update timestamps if there are actual changes
    if (existingRecord && !hasGameChanged(gameRecord, existingRecord)) {
        gameRecord.last_update = existingRecord.last_update;
        gameRecord.updated_at = existingRecord.updated_at;
    }

    return gameRecord;
};

/**
 * Parses data rows to records with validation
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
 * Splits array into chunks of specified size
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
                logger.error({ error }, 'Error batch getting games');
                // Fallback to individual gets using Promise.all
                const individualResults = await Promise.all(
                    batch.map(async ({ record }) => {
                        try {
                            return await getGame(String(record.game_id));
                        } catch (err) {
                            logger.error({ error: err, game_id: record.game_id }, `Error getting game ${record.game_id}`);
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
                logger.error({ error: err, gameId }, `Error writing unprocessed game ${gameId}`);
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
            logger.warn({ count: unprocessedItems.length }, `Batch write had ${unprocessedItems.length} unprocessed items`);
            await handleUnprocessedItems(unprocessedItems, existingRecordsMap, results);
        }
    } catch (error) {
        logger.error({ error }, 'Error batch writing games');
        // Fallback to individual writes using Promise.all
        await Promise.all(
            putRequests.map(async (request) => {
                try {
                    await putGame(request.PutRequest.Item);
                } catch (err) {
                    const gameId = request.PutRequest.Item.game_id;
                    const errorMsg = err instanceof Error ? err.message : 'Unknown error';
                    logger.error({ error: err, gameId }, `Error writing game ${gameId}`);
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
        logger.error({ error, gameId }, `Error getting game ${gameId}`);
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
    const logger = createLambdaLogger(event);
    
    try {
        logger.info('Starting game upload');
        
        // Parse request body
        const body = parseRequestBody<UploadRequest>(event.body);
        const { file: base64File } = body;

        if (!base64File) {
            logger.warn('Upload attempt with no file');
            return createBadRequestResponse('No file uploaded');
        }

        // Decode and parse Excel file
        const fileBuffer = Buffer.from(base64File, 'base64');
        const jsonData = parseExcelFile(fileBuffer);

        // Extract headers and validate file has data
        const { headers, dataRows } = extractHeadersAndRows(jsonData);

        // Validate headers
        const headerValidation = validateHeaders(headers, GAMES_REQUIRED_HEADERS, GAMES_EXPECTED_HEADERS);
        if (!headerValidation.valid) {
            return createBadRequestResponse(headerValidation.message!, {
                expectedHeaders: headerValidation.expectedHeaders,
            });
        }

        // Validate maximum records
        try {
            validateRecordCount(dataRows.length, MAX_RECORDS);
        } catch (error) {
            return createBadRequestResponse((error as Error).message);
        }

        // Initialize results
        const results: UploadResults = {
            processed: 0,
            inserted: 0,
            updated: 0,
            errors: [],
        };

        const now = getCurrentTimestamp();

        // Parse and validate all rows
        const parsedRecords = parseDataRows(dataRows, headers, results);

        // Fetch existing records in batches
        const existingRecordsMap = await fetchExistingRecords(parsedRecords);

        // Process and write records in batches
        await processBatchWrites(parsedRecords, existingRecordsMap, now, results);

        // Check if any records were successfully processed
        if (results.processed === 0) {
            return createBadRequestResponse('No records were successfully processed', {
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
        const contextLogger = createLambdaLogger(event);
        contextLogger.error({ error }, 'Error in game upload handler');
        return createInternalErrorResponse(error as Error);
    }
};

