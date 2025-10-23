"use strict";
/**
 * Upload Students Lambda Handler
 * Handles Excel/CSV file uploads for student data
 * - Skips header row
 * - Upserts records based on student_id
 * - No delete functionality
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const XLSX = require("xlsx");
const dynamodb_client_1 = require("../utils/dynamodb-client");
const conversionUtils_1 = require("./utils/conversionUtils");
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
            if (!record.student_id) {
                results.errors.push(`Row ${i + 2}: Missing student_id`);
                continue;
            }
            parsedRecords.push({ index: i, record });
        }
        // Batch check which records already exist (25 items per batch)
        const BATCH_SIZE = 25;
        const existingRecordsMap = new Map();
        for (let i = 0; i < parsedRecords.length; i += BATCH_SIZE) {
            const batch = parsedRecords.slice(i, i + BATCH_SIZE);
            const keys = batch.map(({ record }) => ({ student_id: record.student_id }));
            try {
                const batchGetCommand = new lib_dynamodb_1.BatchGetCommand({
                    RequestItems: {
                        [dynamodb_client_1.tableNames.students]: {
                            Keys: keys,
                        },
                    },
                });
                const batchResult = await dynamodb_client_1.dynamoDBClient.send(batchGetCommand);
                const items = batchResult.Responses?.[dynamodb_client_1.tableNames.students] || [];
                items.forEach((item) => {
                    existingRecordsMap.set(item.student_id, item);
                });
            }
            catch (error) {
                console.error('Error batch getting students:', error);
                // If batch get fails, fall back to individual checks for this batch
                for (const { record } of batch) {
                    try {
                        const existing = await getStudent(record.student_id);
                        if (existing) {
                            existingRecordsMap.set(record.student_id, existing);
                        }
                    }
                    catch (err) {
                        console.error(`Error getting student ${record.student_id}:`, err);
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
                    const existingRecord = existingRecordsMap.get(record.student_id);
                    // Prepare student record
                    const studentRecord = {
                        student_id: record.student_id,
                        name_1: record.name_1 || '',
                        name_2: record.name_2 || '',
                        marks: typeof record.marks === 'number' ? record.marks : 0,
                        class: record.class || '',
                        class_no: (0, conversionUtils_1.toString)(record.class_no),
                        last_login: record.last_login || now,
                        last_update: now,
                        teacher_id: record.teacher_id || '',
                        password: record.password || '',
                        created_at: existingRecord ? existingRecord.created_at : now,
                        updated_at: now,
                    };
                    // Check if data has actually changed
                    let hasChanges = !existingRecord;
                    if (existingRecord) {
                        hasChanges = (studentRecord.name_1 !== existingRecord.name_1 ||
                            studentRecord.name_2 !== existingRecord.name_2 ||
                            studentRecord.marks !== existingRecord.marks ||
                            studentRecord.class !== existingRecord.class ||
                            studentRecord.class_no !== existingRecord.class_no ||
                            studentRecord.teacher_id !== existingRecord.teacher_id ||
                            studentRecord.password !== existingRecord.password);
                    }
                    // Only update timestamps if there are actual changes
                    if (!hasChanges && existingRecord) {
                        studentRecord.last_update = existingRecord.last_update;
                        studentRecord.updated_at = existingRecord.updated_at;
                    }
                    putRequests.push({
                        PutRequest: {
                            Item: studentRecord,
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
                            [dynamodb_client_1.tableNames.students]: putRequests,
                        },
                    });
                    const batchResult = await dynamodb_client_1.dynamoDBClient.send(batchWriteCommand);
                    // Check for unprocessed items
                    const unprocessedItems = batchResult.UnprocessedItems?.[dynamodb_client_1.tableNames.students];
                    if (unprocessedItems && unprocessedItems.length > 0) {
                        console.warn(`Batch write had ${unprocessedItems.length} unprocessed items for students`);
                        // Try individual writes for unprocessed items
                        for (const unprocessedItem of unprocessedItems) {
                            try {
                                await putStudent(unprocessedItem.PutRequest.Item);
                            }
                            catch (err) {
                                const studentId = unprocessedItem.PutRequest.Item.student_id;
                                const errorMsg = err instanceof Error ? err.message : 'Unknown error';
                                console.error(`Error writing unprocessed student ${studentId}:`, err);
                                results.errors.push(`Student ${studentId}: ${errorMsg}`);
                                // Adjust counts since this item failed
                                if (existingRecordsMap.has(studentId)) {
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
                    console.error('Error batch writing students:', error);
                    // If batch write fails, fall back to individual writes for this batch
                    for (let j = 0; j < putRequests.length; j++) {
                        const request = putRequests[j];
                        try {
                            await putStudent(request.PutRequest.Item);
                        }
                        catch (err) {
                            const studentId = request.PutRequest.Item.student_id;
                            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
                            console.error(`Error writing student ${studentId}:`, err);
                            results.errors.push(`Student ${studentId}: ${errorMsg}`);
                            // Adjust counts since this item failed
                            if (existingRecordsMap.has(studentId)) {
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
                    message: 'Failed to upload student data. No records were successfully processed.',
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
                message: `Successfully processed ${results.processed} students (${results.inserted} inserted, ${results.updated} updated)`,
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
async function getStudent(studentId) {
    try {
        const command = new lib_dynamodb_1.GetCommand({
            TableName: dynamodb_client_1.tableNames.students,
            Key: { student_id: studentId },
        });
        const result = await dynamodb_client_1.dynamoDBClient.send(command);
        return result.Item;
    }
    catch (error) {
        console.error(`Error getting student ${studentId}:`, error);
        return undefined;
    }
}
async function putStudent(student) {
    const command = new lib_dynamodb_1.PutCommand({
        TableName: dynamodb_client_1.tableNames.students,
        Item: student,
    });
    await dynamodb_client_1.dynamoDBClient.send(command);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3R1ZGVudHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzdHVkZW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFFSCx3REFBbUc7QUFFbkcsNkJBQTZCO0FBQzdCLDhEQUFzRTtBQUN0RSw2REFBbUQ7QUFpQjVDLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFDMUIsS0FBMkIsRUFDSyxFQUFFO0lBQ2xDLElBQUksQ0FBQztRQUNILHFCQUFxQjtRQUNyQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLENBQUM7UUFDNUMsTUFBTSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFFbEMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2hCLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTyxFQUFFO29CQUNQLGNBQWMsRUFBRSxrQkFBa0I7b0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7aUJBQ25DO2dCQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO29CQUNuQixPQUFPLEVBQUUsS0FBSztvQkFDZCxPQUFPLEVBQUUsa0JBQWtCO2lCQUM1QixDQUFDO2FBQ0gsQ0FBQztRQUNKLENBQUM7UUFFRCwwQkFBMEI7UUFDMUIsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFFckQsdUJBQXVCO1FBQ3ZCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDM0QsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM5QyxNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FB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QUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztnQkFDbkIsT0FBTyxFQUFFLEtBQUs7Z0JBQ2QsT0FBTyxFQUFFLHVCQUF1QjtnQkFDaEMsS0FBSyxFQUFFLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGVBQWU7YUFDaEUsQ0FBQztTQUNILENBQUM7SUFDSixDQUFDO0FBQ0gsQ0FBQyxDQUFDO0FBL1NXLFFBQUEsT0FBTyxXQStTbEI7QUFFRixLQUFLLFVBQVUsVUFBVSxDQUFDLFNBQWlCO0lBQ3pDLElBQUksQ0FBQztRQUNILE1BQU0sT0FBTyxHQUFHLElBQUkseUJBQVUsQ0FBQztZQUM3QixTQUFTLEVBQUUsNEJBQVUsQ0FBQyxRQUFRO1lBQzlCLEdBQUcsRUFBRSxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUU7U0FDL0IsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxNQUFNLEdBQUcsTUFBTSxnQ0FBYyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNsRCxPQUFPLE1BQU0sQ0FBQyxJQUFpQyxDQUFDO0lBQ2xELENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsU0FBUyxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDNUQsT0FBTyxTQUFTLENBQUM7SUFDbkIsQ0FBQztBQUNILENBQUM7QUFFRCxLQUFLLFVBQVUsVUFBVSxDQUFDLE9BQXNCO0lBQzlDLE1BQU0sT0FBTyxHQUFHLElBQUkseUJBQVUsQ0FBQztRQUM3QixTQUFTLEVBQUUsNEJBQVUsQ0FBQyxRQUFRO1FBQzlCLElBQUksRUFBRSxPQUFPO0tBQ2QsQ0FBQyxDQUFDO0lBQ0gsTUFBTSxnQ0FBYyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUNyQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBVcGxvYWQgU3R1ZGVudHMgTGFtYmRhIEhhbmRsZXJcbiAqIEhhbmRsZXMgRXhjZWwvQ1NWIGZpbGUgdXBsb2FkcyBmb3Igc3R1ZGVudCBkYXRhXG4gKiAtIFNraXBzIGhlYWRlciByb3dcbiAqIC0gVXBzZXJ0cyByZWNvcmRzIGJhc2VkIG9uIHN0dWRlbnRfaWRcbiAqIC0gTm8gZGVsZXRlIGZ1bmN0aW9uYWxpdHlcbiAqL1xuXG5pbXBvcnQgeyBQdXRDb21tYW5kLCBHZXRDb21tYW5kLCBCYXRjaEdldENvbW1hbmQsIEJhdGNoV3JpdGVDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvbGliLWR5bmFtb2RiJztcbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcbmltcG9ydCAqIGFzIFhMU1ggZnJvbSAneGxzeCc7XG5pbXBvcnQgeyBkeW5hbW9EQkNsaWVudCwgdGFibGVOYW1lcyB9IGZyb20gJy4uL3V0aWxzL2R5bmFtb2RiLWNsaWVudCc7XG5pbXBvcnQgeyB0b1N0cmluZyB9IGZyb20gJy4vdXRpbHMvY29udmVyc2lvblV0aWxzJztcblxuaW50ZXJmYWNlIFN0dWRlbnRSZWNvcmQge1xuICBzdHVkZW50X2lkOiBzdHJpbmc7XG4gIG5hbWVfMTogc3RyaW5nO1xuICBuYW1lXzI6IHN0cmluZztcbiAgbWFya3M6IG51bWJlcjtcbiAgY2xhc3M6IHN0cmluZztcbiAgY2xhc3Nfbm86IHN0cmluZztcbiAgbGFzdF9sb2dpbjogc3RyaW5nO1xuICBsYXN0X3VwZGF0ZTogc3RyaW5nO1xuICB0ZWFjaGVyX2lkOiBzdHJpbmc7XG4gIHBhc3N3b3JkOiBzdHJpbmc7XG4gIGNyZWF0ZWRfYXQ/OiBzdHJpbmc7XG4gIHVwZGF0ZWRfYXQ/OiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKFxuICBldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnRcbik6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XG4gIHRyeSB7XG4gICAgLy8gUGFyc2UgcmVxdWVzdCBib2R5XG4gICAgY29uc3QgYm9keSA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSB8fCAne30nKTtcbiAgICBjb25zdCB7IGZpbGU6IGJhc2U2NEZpbGUgfSA9IGJvZHk7XG5cbiAgICBpZiAoIWJhc2U2NEZpbGUpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgICAgfSxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBcbiAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICBtZXNzYWdlOiAnTm8gZmlsZSB1cGxvYWRlZCcgXG4gICAgICAgIH0pLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBEZWNvZGUgYmFzZTY0IHRvIGJ1ZmZlclxuICAgIGNvbnN0IGZpbGVCdWZmZXIgPSBCdWZmZXIuZnJvbShiYXNlNjRGaWxlLCAnYmFzZTY0Jyk7XG5cbiAgICAvLyBQYXJzZSBFeGNlbC9DU1YgZmlsZVxuICAgIGNvbnN0IHdvcmtib29rID0gWExTWC5yZWFkKGZpbGVCdWZmZXIsIHsgdHlwZTogJ2J1ZmZlcicgfSk7XG4gICAgY29uc3QgZmlyc3RTaGVldE5hbWUgPSB3b3JrYm9vay5TaGVldE5hbWVzWzBdO1xuICAgIGNvbnN0IHdvcmtzaGVldCA9IHdvcmtib29rLlNoZWV0c1tmaXJzdFNoZWV0TmFtZV07XG4gICAgXG4gICAgLy8gQ29udmVydCB0byBKU09OLCB1c2luZyBmaXJzdCByb3cgYXMgaGVhZGVyc1xuICAgIGNvbnN0IGpzb25EYXRhID0gWExTWC51dGlscy5zaGVldF90b19qc29uKHdvcmtzaGVldCwgeyBoZWFkZXI6IDEgfSkgYXMgYW55W11bXTtcbiAgICBcbiAgICAvLyBWYWxpZGF0ZSBmaWxlIGhhcyBkYXRhXG4gICAgaWYgKGpzb25EYXRhLmxlbmd0aCA8IDIpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgICAgfSxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBcbiAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICBtZXNzYWdlOiAnRmlsZSBpcyBlbXB0eSBvciBjb250YWlucyBubyBkYXRhIHJvd3MnIFxuICAgICAgICB9KSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gRXh0cmFjdCBoZWFkZXJzIChmaXJzdCByb3cpIGFuZCBkYXRhIHJvd3MgKHNraXAgZmlyc3Qgcm93KVxuICAgIGNvbnN0IGhlYWRlcnMgPSBqc29uRGF0YVswXTtcbiAgICBjb25zdCBkYXRhUm93cyA9IGpzb25EYXRhLnNsaWNlKDEpLmZpbHRlcihyb3cgPT4gXG4gICAgICByb3cgJiYgcm93Lmxlbmd0aCA+IDAgJiYgcm93LnNvbWUoY2VsbCA9PiBjZWxsICE9PSBudWxsICYmIGNlbGwgIT09IHVuZGVmaW5lZCAmJiBjZWxsICE9PSAnJylcbiAgICApO1xuXG4gICAgLy8gVmFsaWRhdGUgbWF4aW11bSA0MDAwIHJlY29yZHNcbiAgICBpZiAoZGF0YVJvd3MubGVuZ3RoID4gNDAwMCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgICB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IFxuICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgIG1lc3NhZ2U6IGBGaWxlIGNvbnRhaW5zICR7ZGF0YVJvd3MubGVuZ3RofSByZWNvcmRzLiBNYXhpbXVtIGFsbG93ZWQgaXMgNCwwMDAgcmVjb3Jkcy5gIFxuICAgICAgICB9KSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gUHJvY2VzcyByZWNvcmRzIGluIGJhdGNoZXMgZm9yIGJldHRlciBwZXJmb3JtYW5jZVxuICAgIGNvbnN0IHJlc3VsdHMgPSB7XG4gICAgICBwcm9jZXNzZWQ6IDAsXG4gICAgICBpbnNlcnRlZDogMCxcbiAgICAgIHVwZGF0ZWQ6IDAsXG4gICAgICBlcnJvcnM6IFtdIGFzIHN0cmluZ1tdLFxuICAgIH07XG5cbiAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XG4gICAgXG4gICAgLy8gTWFwIGFsbCByb3dzIHRvIHJlY29yZHMgZmlyc3QsIHZhbGlkYXRpbmcgcmVxdWlyZWQgZmllbGRzXG4gICAgY29uc3QgcGFyc2VkUmVjb3JkczogQXJyYXk8eyBpbmRleDogbnVtYmVyOyByZWNvcmQ6IGFueSB9PiA9IFtdO1xuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZGF0YVJvd3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHJvdyA9IGRhdGFSb3dzW2ldO1xuICAgICAgY29uc3QgcmVjb3JkOiBhbnkgPSB7fTtcbiAgICAgIGhlYWRlcnMuZm9yRWFjaCgoaGVhZGVyLCBpbmRleCkgPT4ge1xuICAgICAgICByZWNvcmRbaGVhZGVyXSA9IHJvd1tpbmRleF07XG4gICAgICB9KTtcblxuICAgICAgLy8gVmFsaWRhdGUgcmVxdWlyZWQgZmllbGRcbiAgICAgIGlmICghcmVjb3JkLnN0dWRlbnRfaWQpIHtcbiAgICAgICAgcmVzdWx0cy5lcnJvcnMucHVzaChgUm93ICR7aSArIDJ9OiBNaXNzaW5nIHN0dWRlbnRfaWRgKTtcbiAgICAgICAgY29udGludWU7XG4gICAgICB9XG5cbiAgICAgIHBhcnNlZFJlY29yZHMucHVzaCh7IGluZGV4OiBpLCByZWNvcmQgfSk7XG4gICAgfVxuXG4gICAgLy8gQmF0Y2ggY2hlY2sgd2hpY2ggcmVjb3JkcyBhbHJlYWR5IGV4aXN0ICgyNSBpdGVtcyBwZXIgYmF0Y2gpXG4gICAgY29uc3QgQkFUQ0hfU0laRSA9IDI1O1xuICAgIGNvbnN0IGV4aXN0aW5nUmVjb3Jkc01hcCA9IG5ldyBNYXA8c3RyaW5nLCBTdHVkZW50UmVjb3JkPigpO1xuICAgIFxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGFyc2VkUmVjb3Jkcy5sZW5ndGg7IGkgKz0gQkFUQ0hfU0laRSkge1xuICAgICAgY29uc3QgYmF0Y2ggPSBwYXJzZWRSZWNvcmRzLnNsaWNlKGksIGkgKyBCQVRDSF9TSVpFKTtcbiAgICAgIGNvbnN0IGtleXMgPSBiYXRjaC5tYXAoKHsgcmVjb3JkIH0pID0+ICh7IHN0dWRlbnRfaWQ6IHJlY29yZC5zdHVkZW50X2lkIH0pKTtcbiAgICAgIFxuICAgICAgdHJ5IHtcbiAgICAgICAgY29uc3QgYmF0Y2hHZXRDb21tYW5kID0gbmV3IEJhdGNoR2V0Q29tbWFuZCh7XG4gICAgICAgICAgUmVxdWVzdEl0ZW1zOiB7XG4gICAgICAgICAgICBbdGFibGVOYW1lcy5zdHVkZW50c106IHtcbiAgICAgICAgICAgICAgS2V5czoga2V5cyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSk7XG4gICAgICAgIFxuICAgICAgICBjb25zdCBiYXRjaFJlc3VsdCA9IGF3YWl0IGR5bmFtb0RCQ2xpZW50LnNlbmQoYmF0Y2hHZXRDb21tYW5kKTtcbiAgICAgICAgY29uc3QgaXRlbXMgPSBiYXRjaFJlc3VsdC5SZXNwb25zZXM/Llt0YWJsZU5hbWVzLnN0dWRlbnRzXSB8fCBbXTtcbiAgICAgICAgXG4gICAgICAgIGl0ZW1zLmZvckVhY2goKGl0ZW0pID0+IHtcbiAgICAgICAgICBleGlzdGluZ1JlY29yZHNNYXAuc2V0KGl0ZW0uc3R1ZGVudF9pZCwgaXRlbSBhcyBTdHVkZW50UmVjb3JkKTtcbiAgICAgICAgfSk7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBiYXRjaCBnZXR0aW5nIHN0dWRlbnRzOicsIGVycm9yKTtcbiAgICAgICAgLy8gSWYgYmF0Y2ggZ2V0IGZhaWxzLCBmYWxsIGJhY2sgdG8gaW5kaXZpZHVhbCBjaGVja3MgZm9yIHRoaXMgYmF0Y2hcbiAgICAgICAgZm9yIChjb25zdCB7IHJlY29yZCB9IG9mIGJhdGNoKSB7XG4gICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgIGNvbnN0IGV4aXN0aW5nID0gYXdhaXQgZ2V0U3R1ZGVudChyZWNvcmQuc3R1ZGVudF9pZCk7XG4gICAgICAgICAgICBpZiAoZXhpc3RpbmcpIHtcbiAgICAgICAgICAgICAgZXhpc3RpbmdSZWNvcmRzTWFwLnNldChyZWNvcmQuc3R1ZGVudF9pZCwgZXhpc3RpbmcpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3IgZ2V0dGluZyBzdHVkZW50ICR7cmVjb3JkLnN0dWRlbnRfaWR9OmAsIGVycik7XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQmF0Y2ggd3JpdGUgcmVjb3JkcyAoMjUgaXRlbXMgcGVyIGJhdGNoKVxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgcGFyc2VkUmVjb3Jkcy5sZW5ndGg7IGkgKz0gQkFUQ0hfU0laRSkge1xuICAgICAgY29uc3QgYmF0Y2ggPSBwYXJzZWRSZWNvcmRzLnNsaWNlKGksIGkgKyBCQVRDSF9TSVpFKTtcbiAgICAgIGNvbnN0IHB1dFJlcXVlc3RzOiBhbnlbXSA9IFtdO1xuICAgICAgXG4gICAgICBmb3IgKGNvbnN0IHsgaW5kZXgsIHJlY29yZCB9IG9mIGJhdGNoKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3QgZXhpc3RpbmdSZWNvcmQgPSBleGlzdGluZ1JlY29yZHNNYXAuZ2V0KHJlY29yZC5zdHVkZW50X2lkKTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBQcmVwYXJlIHN0dWRlbnQgcmVjb3JkXG4gICAgICAgICAgY29uc3Qgc3R1ZGVudFJlY29yZDogU3R1ZGVudFJlY29yZCA9IHtcbiAgICAgICAgICAgIHN0dWRlbnRfaWQ6IHJlY29yZC5zdHVkZW50X2lkLFxuICAgICAgICAgICAgbmFtZV8xOiByZWNvcmQubmFtZV8xIHx8ICcnLFxuICAgICAgICAgICAgbmFtZV8yOiByZWNvcmQubmFtZV8yIHx8ICcnLFxuICAgICAgICAgICAgbWFya3M6IHR5cGVvZiByZWNvcmQubWFya3MgPT09ICdudW1iZXInID8gcmVjb3JkLm1hcmtzIDogMCxcbiAgICAgICAgICAgIGNsYXNzOiByZWNvcmQuY2xhc3MgfHwgJycsXG4gICAgICAgICAgICBjbGFzc19ubzogdG9TdHJpbmcocmVjb3JkLmNsYXNzX25vKSxcbiAgICAgICAgICAgIGxhc3RfbG9naW46IHJlY29yZC5sYXN0X2xvZ2luIHx8IG5vdyxcbiAgICAgICAgICAgIGxhc3RfdXBkYXRlOiBub3csXG4gICAgICAgICAgICB0ZWFjaGVyX2lkOiByZWNvcmQudGVhY2hlcl9pZCB8fCAnJyxcbiAgICAgICAgICAgIHBhc3N3b3JkOiByZWNvcmQucGFzc3dvcmQgfHwgJycsXG4gICAgICAgICAgICBjcmVhdGVkX2F0OiBleGlzdGluZ1JlY29yZCA/IGV4aXN0aW5nUmVjb3JkLmNyZWF0ZWRfYXQgOiBub3csXG4gICAgICAgICAgICB1cGRhdGVkX2F0OiBub3csXG4gICAgICAgICAgfTtcblxuICAgICAgICAgIC8vIENoZWNrIGlmIGRhdGEgaGFzIGFjdHVhbGx5IGNoYW5nZWRcbiAgICAgICAgICBsZXQgaGFzQ2hhbmdlcyA9ICFleGlzdGluZ1JlY29yZDtcbiAgICAgICAgICBpZiAoZXhpc3RpbmdSZWNvcmQpIHtcbiAgICAgICAgICAgIGhhc0NoYW5nZXMgPSAoXG4gICAgICAgICAgICAgIHN0dWRlbnRSZWNvcmQubmFtZV8xICE9PSBleGlzdGluZ1JlY29yZC5uYW1lXzEgfHxcbiAgICAgICAgICAgICAgc3R1ZGVudFJlY29yZC5uYW1lXzIgIT09IGV4aXN0aW5nUmVjb3JkLm5hbWVfMiB8fFxuICAgICAgICAgICAgICBzdHVkZW50UmVjb3JkLm1hcmtzICE9PSBleGlzdGluZ1JlY29yZC5tYXJrcyB8fFxuICAgICAgICAgICAgICBzdHVkZW50UmVjb3JkLmNsYXNzICE9PSBleGlzdGluZ1JlY29yZC5jbGFzcyB8fFxuICAgICAgICAgICAgICBzdHVkZW50UmVjb3JkLmNsYXNzX25vICE9PSBleGlzdGluZ1JlY29yZC5jbGFzc19ubyB8fFxuICAgICAgICAgICAgICBzdHVkZW50UmVjb3JkLnRlYWNoZXJfaWQgIT09IGV4aXN0aW5nUmVjb3JkLnRlYWNoZXJfaWQgfHxcbiAgICAgICAgICAgICAgc3R1ZGVudFJlY29yZC5wYXNzd29yZCAhPT0gZXhpc3RpbmdSZWNvcmQucGFzc3dvcmRcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gT25seSB1cGRhdGUgdGltZXN0YW1wcyBpZiB0aGVyZSBhcmUgYWN0dWFsIGNoYW5nZXNcbiAgICAgICAgICBpZiAoIWhhc0NoYW5nZXMgJiYgZXhpc3RpbmdSZWNvcmQpIHtcbiAgICAgICAgICAgIHN0dWRlbnRSZWNvcmQubGFzdF91cGRhdGUgPSBleGlzdGluZ1JlY29yZC5sYXN0X3VwZGF0ZTtcbiAgICAgICAgICAgIHN0dWRlbnRSZWNvcmQudXBkYXRlZF9hdCA9IGV4aXN0aW5nUmVjb3JkLnVwZGF0ZWRfYXQ7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcHV0UmVxdWVzdHMucHVzaCh7XG4gICAgICAgICAgICBQdXRSZXF1ZXN0OiB7XG4gICAgICAgICAgICAgIEl0ZW06IHN0dWRlbnRSZWNvcmQsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIFxuICAgICAgICAgIGlmIChleGlzdGluZ1JlY29yZCkge1xuICAgICAgICAgICAgcmVzdWx0cy51cGRhdGVkKys7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdHMuaW5zZXJ0ZWQrKztcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVzdWx0cy5wcm9jZXNzZWQrKztcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICByZXN1bHRzLmVycm9ycy5wdXNoKGBSb3cgJHtpbmRleCArIDJ9OiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InfWApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIEV4ZWN1dGUgYmF0Y2ggd3JpdGVcbiAgICAgIGlmIChwdXRSZXF1ZXN0cy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3QgYmF0Y2hXcml0ZUNvbW1hbmQgPSBuZXcgQmF0Y2hXcml0ZUNvbW1hbmQoe1xuICAgICAgICAgICAgUmVxdWVzdEl0ZW1zOiB7XG4gICAgICAgICAgICAgIFt0YWJsZU5hbWVzLnN0dWRlbnRzXTogcHV0UmVxdWVzdHMsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIFxuICAgICAgICAgIGNvbnN0IGJhdGNoUmVzdWx0ID0gYXdhaXQgZHluYW1vREJDbGllbnQuc2VuZChiYXRjaFdyaXRlQ29tbWFuZCk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gQ2hlY2sgZm9yIHVucHJvY2Vzc2VkIGl0ZW1zXG4gICAgICAgICAgY29uc3QgdW5wcm9jZXNzZWRJdGVtcyA9IGJhdGNoUmVzdWx0LlVucHJvY2Vzc2VkSXRlbXM/Llt0YWJsZU5hbWVzLnN0dWRlbnRzXTtcbiAgICAgICAgICBpZiAodW5wcm9jZXNzZWRJdGVtcyAmJiB1bnByb2Nlc3NlZEl0ZW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgQmF0Y2ggd3JpdGUgaGFkICR7dW5wcm9jZXNzZWRJdGVtcy5sZW5ndGh9IHVucHJvY2Vzc2VkIGl0ZW1zIGZvciBzdHVkZW50c2ApO1xuICAgICAgICAgICAgLy8gVHJ5IGluZGl2aWR1YWwgd3JpdGVzIGZvciB1bnByb2Nlc3NlZCBpdGVtc1xuICAgICAgICAgICAgZm9yIChjb25zdCB1bnByb2Nlc3NlZEl0ZW0gb2YgdW5wcm9jZXNzZWRJdGVtcykge1xuICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHB1dFN0dWRlbnQodW5wcm9jZXNzZWRJdGVtLlB1dFJlcXVlc3QhLkl0ZW0gYXMgU3R1ZGVudFJlY29yZCk7XG4gICAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0dWRlbnRJZCA9ICh1bnByb2Nlc3NlZEl0ZW0uUHV0UmVxdWVzdCEuSXRlbSBhcyBhbnkpLnN0dWRlbnRfaWQ7XG4gICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNc2cgPSBlcnIgaW5zdGFuY2VvZiBFcnJvciA/IGVyci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIHdyaXRpbmcgdW5wcm9jZXNzZWQgc3R1ZGVudCAke3N0dWRlbnRJZH06YCwgZXJyKTtcbiAgICAgICAgICAgICAgICByZXN1bHRzLmVycm9ycy5wdXNoKGBTdHVkZW50ICR7c3R1ZGVudElkfTogJHtlcnJvck1zZ31gKTtcbiAgICAgICAgICAgICAgICAvLyBBZGp1c3QgY291bnRzIHNpbmNlIHRoaXMgaXRlbSBmYWlsZWRcbiAgICAgICAgICAgICAgICBpZiAoZXhpc3RpbmdSZWNvcmRzTWFwLmhhcyhzdHVkZW50SWQpKSB7XG4gICAgICAgICAgICAgICAgICByZXN1bHRzLnVwZGF0ZWQtLTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcmVzdWx0cy5pbnNlcnRlZC0tO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXN1bHRzLnByb2Nlc3NlZC0tO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGJhdGNoIHdyaXRpbmcgc3R1ZGVudHM6JywgZXJyb3IpO1xuICAgICAgICAgIC8vIElmIGJhdGNoIHdyaXRlIGZhaWxzLCBmYWxsIGJhY2sgdG8gaW5kaXZpZHVhbCB3cml0ZXMgZm9yIHRoaXMgYmF0Y2hcbiAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHB1dFJlcXVlc3RzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICBjb25zdCByZXF1ZXN0ID0gcHV0UmVxdWVzdHNbal07XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBhd2FpdCBwdXRTdHVkZW50KHJlcXVlc3QuUHV0UmVxdWVzdC5JdGVtKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICBjb25zdCBzdHVkZW50SWQgPSByZXF1ZXN0LlB1dFJlcXVlc3QuSXRlbS5zdHVkZW50X2lkO1xuICAgICAgICAgICAgICBjb25zdCBlcnJvck1zZyA9IGVyciBpbnN0YW5jZW9mIEVycm9yID8gZXJyLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcic7XG4gICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIHdyaXRpbmcgc3R1ZGVudCAke3N0dWRlbnRJZH06YCwgZXJyKTtcbiAgICAgICAgICAgICAgcmVzdWx0cy5lcnJvcnMucHVzaChgU3R1ZGVudCAke3N0dWRlbnRJZH06ICR7ZXJyb3JNc2d9YCk7XG4gICAgICAgICAgICAgIC8vIEFkanVzdCBjb3VudHMgc2luY2UgdGhpcyBpdGVtIGZhaWxlZFxuICAgICAgICAgICAgICBpZiAoZXhpc3RpbmdSZWNvcmRzTWFwLmhhcyhzdHVkZW50SWQpKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0cy51cGRhdGVkLS07XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0cy5pbnNlcnRlZC0tO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJlc3VsdHMucHJvY2Vzc2VkLS07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgaWYgYW55IHJlY29yZHMgd2VyZSBzdWNjZXNzZnVsbHkgcHJvY2Vzc2VkXG4gICAgaWYgKHJlc3VsdHMucHJvY2Vzc2VkID09PSAwKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICAgICAgIH0sXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICBtZXNzYWdlOiAnRmFpbGVkIHRvIHVwbG9hZCBzdHVkZW50IGRhdGEuIE5vIHJlY29yZHMgd2VyZSBzdWNjZXNzZnVsbHkgcHJvY2Vzc2VkLicsXG4gICAgICAgICAgZXJyb3JzOiByZXN1bHRzLmVycm9ycy5sZW5ndGggPiAwID8gcmVzdWx0cy5lcnJvcnMgOiBbJ1Vua25vd24gZXJyb3Igb2NjdXJyZWQgZHVyaW5nIHVwbG9hZCddLFxuICAgICAgICB9KSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgIG1lc3NhZ2U6IGBTdWNjZXNzZnVsbHkgcHJvY2Vzc2VkICR7cmVzdWx0cy5wcm9jZXNzZWR9IHN0dWRlbnRzICgke3Jlc3VsdHMuaW5zZXJ0ZWR9IGluc2VydGVkLCAke3Jlc3VsdHMudXBkYXRlZH0gdXBkYXRlZClgLFxuICAgICAgICBwcm9jZXNzZWQ6IHJlc3VsdHMucHJvY2Vzc2VkLFxuICAgICAgICBpbnNlcnRlZDogcmVzdWx0cy5pbnNlcnRlZCxcbiAgICAgICAgdXBkYXRlZDogcmVzdWx0cy51cGRhdGVkLFxuICAgICAgICBlcnJvcnM6IHJlc3VsdHMuZXJyb3JzLmxlbmd0aCA+IDAgPyByZXN1bHRzLmVycm9ycyA6IHVuZGVmaW5lZCxcbiAgICAgIH0pLFxuICAgIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3I6JywgZXJyb3IpO1xuICAgIHJldHVybiB7XG4gICAgICBzdGF0dXNDb2RlOiA1MDAsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICAgICB9LFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgIG1lc3NhZ2U6ICdJbnRlcm5hbCBzZXJ2ZXIgZXJyb3InLFxuICAgICAgICBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcidcbiAgICAgIH0pLFxuICAgIH07XG4gIH1cbn07XG5cbmFzeW5jIGZ1bmN0aW9uIGdldFN0dWRlbnQoc3R1ZGVudElkOiBzdHJpbmcpIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBjb21tYW5kID0gbmV3IEdldENvbW1hbmQoe1xuICAgICAgVGFibGVOYW1lOiB0YWJsZU5hbWVzLnN0dWRlbnRzLFxuICAgICAgS2V5OiB7IHN0dWRlbnRfaWQ6IHN0dWRlbnRJZCB9LFxuICAgIH0pO1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGR5bmFtb0RCQ2xpZW50LnNlbmQoY29tbWFuZCk7XG4gICAgcmV0dXJuIHJlc3VsdC5JdGVtIGFzIFN0dWRlbnRSZWNvcmQgfCB1bmRlZmluZWQ7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihgRXJyb3IgZ2V0dGluZyBzdHVkZW50ICR7c3R1ZGVudElkfTpgLCBlcnJvcik7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBwdXRTdHVkZW50KHN0dWRlbnQ6IFN0dWRlbnRSZWNvcmQpIHtcbiAgY29uc3QgY29tbWFuZCA9IG5ldyBQdXRDb21tYW5kKHtcbiAgICBUYWJsZU5hbWU6IHRhYmxlTmFtZXMuc3R1ZGVudHMsXG4gICAgSXRlbTogc3R1ZGVudCxcbiAgfSk7XG4gIGF3YWl0IGR5bmFtb0RCQ2xpZW50LnNlbmQoY29tbWFuZCk7XG59XG4iXX0=