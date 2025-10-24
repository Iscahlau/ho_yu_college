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
                        password: (0, conversionUtils_1.toString)(record.password),
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3R1ZGVudHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzdHVkZW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFFSCx3REFBbUc7QUFFbkcsNkJBQTZCO0FBQzdCLDhEQUFzRTtBQUN0RSw2REFBbUQ7QUFpQjVDLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFDMUIsS0FBMkIsRUFDSyxFQUFFO0lBQ2xDLElBQUksQ0FBQztRQUNILHFCQUFxQjtRQUNyQixNQUFNLElBQUksR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLENBQUM7UUFDNUMsTUFBTSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFFbEMsSUFBSSxDQUFDLFVBQVUsRUFBRSxDQUFDO1lBQ2hCLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTyxFQUFFO29CQUNQLGNBQWMsRUFBRSxrQkFBa0I7b0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7aUJBQ25DO2dCQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO29CQUNuQixPQUFPLEVBQUUsS0FBSztvQkFDZCxPQUFPLEVBQUUsa0JBQWtCO2lCQUM1QixDQUFDO2FBQ0gsQ0FBQztRQUNKLENBQUM7UUFFRCwwQkFBMEI7UUFDMUIsTUFBTSxVQUFVLEdBQUcsTUFBTSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsUUFBUSxDQUFDLENBQUM7UUFFckQsdUJBQXVCO1FBQ3ZCLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDM0QsTUFBTSxjQUFjLEdBQUcsUUFBUSxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUMsQ0FBQztRQUM5QyxNQUFNLFNBQVMsR0FBRyxRQUFRLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FB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QUNuQztZQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO2dCQUNuQixPQUFPLEVBQUUsS0FBSztnQkFDZCxPQUFPLEVBQUUsdUJBQXVCO2dCQUNoQyxLQUFLLEVBQUUsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsZUFBZTthQUNoRSxDQUFDO1NBQ0gsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDLENBQUM7QUEvU1csUUFBQSxPQUFPLFdBK1NsQjtBQUVGLEtBQUssVUFBVSxVQUFVLENBQUMsU0FBaUI7SUFDekMsSUFBSSxDQUFDO1FBQ0gsTUFBTSxPQUFPLEdBQUcsSUFBSSx5QkFBVSxDQUFDO1lBQzdCLFNBQVMsRUFBRSw0QkFBVSxDQUFDLFFBQVE7WUFDOUIsR0FBRyxFQUFFLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRTtTQUMvQixDQUFDLENBQUM7UUFDSCxNQUFNLE1BQU0sR0FBRyxNQUFNLGdDQUFjLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2xELE9BQU8sTUFBTSxDQUFDLElBQWlDLENBQUM7SUFDbEQsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLHlCQUF5QixTQUFTLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUM1RCxPQUFPLFNBQVMsQ0FBQztJQUNuQixDQUFDO0FBQ0gsQ0FBQztBQUVELEtBQUssVUFBVSxVQUFVLENBQUMsT0FBc0I7SUFDOUMsTUFBTSxPQUFPLEdBQUcsSUFBSSx5QkFBVSxDQUFDO1FBQzdCLFNBQVMsRUFBRSw0QkFBVSxDQUFDLFFBQVE7UUFDOUIsSUFBSSxFQUFFLE9BQU87S0FDZCxDQUFDLENBQUM7SUFDSCxNQUFNLGdDQUFjLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ3JDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFVwbG9hZCBTdHVkZW50cyBMYW1iZGEgSGFuZGxlclxuICogSGFuZGxlcyBFeGNlbC9DU1YgZmlsZSB1cGxvYWRzIGZvciBzdHVkZW50IGRhdGFcbiAqIC0gU2tpcHMgaGVhZGVyIHJvd1xuICogLSBVcHNlcnRzIHJlY29yZHMgYmFzZWQgb24gc3R1ZGVudF9pZFxuICogLSBObyBkZWxldGUgZnVuY3Rpb25hbGl0eVxuICovXG5cbmltcG9ydCB7IFB1dENvbW1hbmQsIEdldENvbW1hbmQsIEJhdGNoR2V0Q29tbWFuZCwgQmF0Y2hXcml0ZUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0ICogYXMgWExTWCBmcm9tICd4bHN4JztcbmltcG9ydCB7IGR5bmFtb0RCQ2xpZW50LCB0YWJsZU5hbWVzIH0gZnJvbSAnLi4vdXRpbHMvZHluYW1vZGItY2xpZW50JztcbmltcG9ydCB7IHRvU3RyaW5nIH0gZnJvbSAnLi91dGlscy9jb252ZXJzaW9uVXRpbHMnO1xuXG5pbnRlcmZhY2UgU3R1ZGVudFJlY29yZCB7XG4gIHN0dWRlbnRfaWQ6IHN0cmluZztcbiAgbmFtZV8xOiBzdHJpbmc7XG4gIG5hbWVfMjogc3RyaW5nO1xuICBtYXJrczogbnVtYmVyO1xuICBjbGFzczogc3RyaW5nO1xuICBjbGFzc19ubzogc3RyaW5nO1xuICBsYXN0X2xvZ2luOiBzdHJpbmc7XG4gIGxhc3RfdXBkYXRlOiBzdHJpbmc7XG4gIHRlYWNoZXJfaWQ6IHN0cmluZztcbiAgcGFzc3dvcmQ6IHN0cmluZztcbiAgY3JlYXRlZF9hdD86IHN0cmluZztcbiAgdXBkYXRlZF9hdD86IHN0cmluZztcbn1cblxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoXG4gIGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudFxuKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcbiAgdHJ5IHtcbiAgICAvLyBQYXJzZSByZXF1ZXN0IGJvZHlcbiAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShldmVudC5ib2R5IHx8ICd7fScpO1xuICAgIGNvbnN0IHsgZmlsZTogYmFzZTY0RmlsZSB9ID0gYm9keTtcblxuICAgIGlmICghYmFzZTY0RmlsZSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgICB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IFxuICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgIG1lc3NhZ2U6ICdObyBmaWxlIHVwbG9hZGVkJyBcbiAgICAgICAgfSksXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIERlY29kZSBiYXNlNjQgdG8gYnVmZmVyXG4gICAgY29uc3QgZmlsZUJ1ZmZlciA9IEJ1ZmZlci5mcm9tKGJhc2U2NEZpbGUsICdiYXNlNjQnKTtcblxuICAgIC8vIFBhcnNlIEV4Y2VsL0NTViBmaWxlXG4gICAgY29uc3Qgd29ya2Jvb2sgPSBYTFNYLnJlYWQoZmlsZUJ1ZmZlciwgeyB0eXBlOiAnYnVmZmVyJyB9KTtcbiAgICBjb25zdCBmaXJzdFNoZWV0TmFtZSA9IHdvcmtib29rLlNoZWV0TmFtZXNbMF07XG4gICAgY29uc3Qgd29ya3NoZWV0ID0gd29ya2Jvb2suU2hlZXRzW2ZpcnN0U2hlZXROYW1lXTtcbiAgICBcbiAgICAvLyBDb252ZXJ0IHRvIEpTT04sIHVzaW5nIGZpcnN0IHJvdyBhcyBoZWFkZXJzXG4gICAgY29uc3QganNvbkRhdGEgPSBYTFNYLnV0aWxzLnNoZWV0X3RvX2pzb24od29ya3NoZWV0LCB7IGhlYWRlcjogMSB9KSBhcyBhbnlbXVtdO1xuICAgIFxuICAgIC8vIFZhbGlkYXRlIGZpbGUgaGFzIGRhdGFcbiAgICBpZiAoanNvbkRhdGEubGVuZ3RoIDwgMikge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgICB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IFxuICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgIG1lc3NhZ2U6ICdGaWxlIGlzIGVtcHR5IG9yIGNvbnRhaW5zIG5vIGRhdGEgcm93cycgXG4gICAgICAgIH0pLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBFeHRyYWN0IGhlYWRlcnMgKGZpcnN0IHJvdykgYW5kIGRhdGEgcm93cyAoc2tpcCBmaXJzdCByb3cpXG4gICAgY29uc3QgaGVhZGVycyA9IGpzb25EYXRhWzBdO1xuICAgIGNvbnN0IGRhdGFSb3dzID0ganNvbkRhdGEuc2xpY2UoMSkuZmlsdGVyKHJvdyA9PiBcbiAgICAgIHJvdyAmJiByb3cubGVuZ3RoID4gMCAmJiByb3cuc29tZShjZWxsID0+IGNlbGwgIT09IG51bGwgJiYgY2VsbCAhPT0gdW5kZWZpbmVkICYmIGNlbGwgIT09ICcnKVxuICAgICk7XG5cbiAgICAvLyBWYWxpZGF0ZSBtYXhpbXVtIDQwMDAgcmVjb3Jkc1xuICAgIGlmIChkYXRhUm93cy5sZW5ndGggPiA0MDAwKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICAgICAgIH0sXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgXG4gICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgbWVzc2FnZTogYEZpbGUgY29udGFpbnMgJHtkYXRhUm93cy5sZW5ndGh9IHJlY29yZHMuIE1heGltdW0gYWxsb3dlZCBpcyA0LDAwMCByZWNvcmRzLmAgXG4gICAgICAgIH0pLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBQcm9jZXNzIHJlY29yZHMgaW4gYmF0Y2hlcyBmb3IgYmV0dGVyIHBlcmZvcm1hbmNlXG4gICAgY29uc3QgcmVzdWx0cyA9IHtcbiAgICAgIHByb2Nlc3NlZDogMCxcbiAgICAgIGluc2VydGVkOiAwLFxuICAgICAgdXBkYXRlZDogMCxcbiAgICAgIGVycm9yczogW10gYXMgc3RyaW5nW10sXG4gICAgfTtcblxuICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICBcbiAgICAvLyBNYXAgYWxsIHJvd3MgdG8gcmVjb3JkcyBmaXJzdCwgdmFsaWRhdGluZyByZXF1aXJlZCBmaWVsZHNcbiAgICBjb25zdCBwYXJzZWRSZWNvcmRzOiBBcnJheTx7IGluZGV4OiBudW1iZXI7IHJlY29yZDogYW55IH0+ID0gW107XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkYXRhUm93cy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3Qgcm93ID0gZGF0YVJvd3NbaV07XG4gICAgICBjb25zdCByZWNvcmQ6IGFueSA9IHt9O1xuICAgICAgaGVhZGVycy5mb3JFYWNoKChoZWFkZXIsIGluZGV4KSA9PiB7XG4gICAgICAgIHJlY29yZFtoZWFkZXJdID0gcm93W2luZGV4XTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBWYWxpZGF0ZSByZXF1aXJlZCBmaWVsZFxuICAgICAgaWYgKCFyZWNvcmQuc3R1ZGVudF9pZCkge1xuICAgICAgICByZXN1bHRzLmVycm9ycy5wdXNoKGBSb3cgJHtpICsgMn06IE1pc3Npbmcgc3R1ZGVudF9pZGApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgcGFyc2VkUmVjb3Jkcy5wdXNoKHsgaW5kZXg6IGksIHJlY29yZCB9KTtcbiAgICB9XG5cbiAgICAvLyBCYXRjaCBjaGVjayB3aGljaCByZWNvcmRzIGFscmVhZHkgZXhpc3QgKDI1IGl0ZW1zIHBlciBiYXRjaClcbiAgICBjb25zdCBCQVRDSF9TSVpFID0gMjU7XG4gICAgY29uc3QgZXhpc3RpbmdSZWNvcmRzTWFwID0gbmV3IE1hcDxzdHJpbmcsIFN0dWRlbnRSZWNvcmQ+KCk7XG4gICAgXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYXJzZWRSZWNvcmRzLmxlbmd0aDsgaSArPSBCQVRDSF9TSVpFKSB7XG4gICAgICBjb25zdCBiYXRjaCA9IHBhcnNlZFJlY29yZHMuc2xpY2UoaSwgaSArIEJBVENIX1NJWkUpO1xuICAgICAgY29uc3Qga2V5cyA9IGJhdGNoLm1hcCgoeyByZWNvcmQgfSkgPT4gKHsgc3R1ZGVudF9pZDogcmVjb3JkLnN0dWRlbnRfaWQgfSkpO1xuICAgICAgXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBiYXRjaEdldENvbW1hbmQgPSBuZXcgQmF0Y2hHZXRDb21tYW5kKHtcbiAgICAgICAgICBSZXF1ZXN0SXRlbXM6IHtcbiAgICAgICAgICAgIFt0YWJsZU5hbWVzLnN0dWRlbnRzXToge1xuICAgICAgICAgICAgICBLZXlzOiBrZXlzLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGJhdGNoUmVzdWx0ID0gYXdhaXQgZHluYW1vREJDbGllbnQuc2VuZChiYXRjaEdldENvbW1hbmQpO1xuICAgICAgICBjb25zdCBpdGVtcyA9IGJhdGNoUmVzdWx0LlJlc3BvbnNlcz8uW3RhYmxlTmFtZXMuc3R1ZGVudHNdIHx8IFtdO1xuICAgICAgICBcbiAgICAgICAgaXRlbXMuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgICAgICAgIGV4aXN0aW5nUmVjb3Jkc01hcC5zZXQoaXRlbS5zdHVkZW50X2lkLCBpdGVtIGFzIFN0dWRlbnRSZWNvcmQpO1xuICAgICAgICB9KTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGJhdGNoIGdldHRpbmcgc3R1ZGVudHM6JywgZXJyb3IpO1xuICAgICAgICAvLyBJZiBiYXRjaCBnZXQgZmFpbHMsIGZhbGwgYmFjayB0byBpbmRpdmlkdWFsIGNoZWNrcyBmb3IgdGhpcyBiYXRjaFxuICAgICAgICBmb3IgKGNvbnN0IHsgcmVjb3JkIH0gb2YgYmF0Y2gpIHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgZXhpc3RpbmcgPSBhd2FpdCBnZXRTdHVkZW50KHJlY29yZC5zdHVkZW50X2lkKTtcbiAgICAgICAgICAgIGlmIChleGlzdGluZykge1xuICAgICAgICAgICAgICBleGlzdGluZ1JlY29yZHNNYXAuc2V0KHJlY29yZC5zdHVkZW50X2lkLCBleGlzdGluZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGBFcnJvciBnZXR0aW5nIHN0dWRlbnQgJHtyZWNvcmQuc3R1ZGVudF9pZH06YCwgZXJyKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBCYXRjaCB3cml0ZSByZWNvcmRzICgyNSBpdGVtcyBwZXIgYmF0Y2gpXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYXJzZWRSZWNvcmRzLmxlbmd0aDsgaSArPSBCQVRDSF9TSVpFKSB7XG4gICAgICBjb25zdCBiYXRjaCA9IHBhcnNlZFJlY29yZHMuc2xpY2UoaSwgaSArIEJBVENIX1NJWkUpO1xuICAgICAgY29uc3QgcHV0UmVxdWVzdHM6IGFueVtdID0gW107XG4gICAgICBcbiAgICAgIGZvciAoY29uc3QgeyBpbmRleCwgcmVjb3JkIH0gb2YgYmF0Y2gpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCBleGlzdGluZ1JlY29yZCA9IGV4aXN0aW5nUmVjb3Jkc01hcC5nZXQocmVjb3JkLnN0dWRlbnRfaWQpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIFByZXBhcmUgc3R1ZGVudCByZWNvcmRcbiAgICAgICAgICBjb25zdCBzdHVkZW50UmVjb3JkOiBTdHVkZW50UmVjb3JkID0ge1xuICAgICAgICAgICAgc3R1ZGVudF9pZDogcmVjb3JkLnN0dWRlbnRfaWQsXG4gICAgICAgICAgICBuYW1lXzE6IHJlY29yZC5uYW1lXzEgfHwgJycsXG4gICAgICAgICAgICBuYW1lXzI6IHJlY29yZC5uYW1lXzIgfHwgJycsXG4gICAgICAgICAgICBtYXJrczogdHlwZW9mIHJlY29yZC5tYXJrcyA9PT0gJ251bWJlcicgPyByZWNvcmQubWFya3MgOiAwLFxuICAgICAgICAgICAgY2xhc3M6IHJlY29yZC5jbGFzcyB8fCAnJyxcbiAgICAgICAgICAgIGNsYXNzX25vOiB0b1N0cmluZyhyZWNvcmQuY2xhc3Nfbm8pLFxuICAgICAgICAgICAgbGFzdF9sb2dpbjogcmVjb3JkLmxhc3RfbG9naW4gfHwgbm93LFxuICAgICAgICAgICAgbGFzdF91cGRhdGU6IG5vdyxcbiAgICAgICAgICAgIHRlYWNoZXJfaWQ6IHJlY29yZC50ZWFjaGVyX2lkIHx8ICcnLFxuICAgICAgICAgICAgcGFzc3dvcmQ6IHRvU3RyaW5nKHJlY29yZC5wYXNzd29yZCksXG4gICAgICAgICAgICBjcmVhdGVkX2F0OiBleGlzdGluZ1JlY29yZCA/IGV4aXN0aW5nUmVjb3JkLmNyZWF0ZWRfYXQgOiBub3csXG4gICAgICAgICAgICB1cGRhdGVkX2F0OiBub3csXG4gICAgICAgICAgfTtcblxuICAgICAgICAgIC8vIENoZWNrIGlmIGRhdGEgaGFzIGFjdHVhbGx5IGNoYW5nZWRcbiAgICAgICAgICBsZXQgaGFzQ2hhbmdlcyA9ICFleGlzdGluZ1JlY29yZDtcbiAgICAgICAgICBpZiAoZXhpc3RpbmdSZWNvcmQpIHtcbiAgICAgICAgICAgIGhhc0NoYW5nZXMgPSAoXG4gICAgICAgICAgICAgIHN0dWRlbnRSZWNvcmQubmFtZV8xICE9PSBleGlzdGluZ1JlY29yZC5uYW1lXzEgfHxcbiAgICAgICAgICAgICAgc3R1ZGVudFJlY29yZC5uYW1lXzIgIT09IGV4aXN0aW5nUmVjb3JkLm5hbWVfMiB8fFxuICAgICAgICAgICAgICBzdHVkZW50UmVjb3JkLm1hcmtzICE9PSBleGlzdGluZ1JlY29yZC5tYXJrcyB8fFxuICAgICAgICAgICAgICBzdHVkZW50UmVjb3JkLmNsYXNzICE9PSBleGlzdGluZ1JlY29yZC5jbGFzcyB8fFxuICAgICAgICAgICAgICBzdHVkZW50UmVjb3JkLmNsYXNzX25vICE9PSBleGlzdGluZ1JlY29yZC5jbGFzc19ubyB8fFxuICAgICAgICAgICAgICBzdHVkZW50UmVjb3JkLnRlYWNoZXJfaWQgIT09IGV4aXN0aW5nUmVjb3JkLnRlYWNoZXJfaWQgfHxcbiAgICAgICAgICAgICAgc3R1ZGVudFJlY29yZC5wYXNzd29yZCAhPT0gZXhpc3RpbmdSZWNvcmQucGFzc3dvcmRcbiAgICAgICAgICAgICk7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgLy8gT25seSB1cGRhdGUgdGltZXN0YW1wcyBpZiB0aGVyZSBhcmUgYWN0dWFsIGNoYW5nZXNcbiAgICAgICAgICBpZiAoIWhhc0NoYW5nZXMgJiYgZXhpc3RpbmdSZWNvcmQpIHtcbiAgICAgICAgICAgIHN0dWRlbnRSZWNvcmQubGFzdF91cGRhdGUgPSBleGlzdGluZ1JlY29yZC5sYXN0X3VwZGF0ZTtcbiAgICAgICAgICAgIHN0dWRlbnRSZWNvcmQudXBkYXRlZF9hdCA9IGV4aXN0aW5nUmVjb3JkLnVwZGF0ZWRfYXQ7XG4gICAgICAgICAgfVxuXG4gICAgICAgICAgcHV0UmVxdWVzdHMucHVzaCh7XG4gICAgICAgICAgICBQdXRSZXF1ZXN0OiB7XG4gICAgICAgICAgICAgIEl0ZW06IHN0dWRlbnRSZWNvcmQsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIFxuICAgICAgICAgIGlmIChleGlzdGluZ1JlY29yZCkge1xuICAgICAgICAgICAgcmVzdWx0cy51cGRhdGVkKys7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJlc3VsdHMuaW5zZXJ0ZWQrKztcbiAgICAgICAgICB9XG4gICAgICAgICAgcmVzdWx0cy5wcm9jZXNzZWQrKztcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICByZXN1bHRzLmVycm9ycy5wdXNoKGBSb3cgJHtpbmRleCArIDJ9OiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InfWApO1xuICAgICAgICB9XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vIEV4ZWN1dGUgYmF0Y2ggd3JpdGVcbiAgICAgIGlmIChwdXRSZXF1ZXN0cy5sZW5ndGggPiAwKSB7XG4gICAgICAgIHRyeSB7XG4gICAgICAgICAgY29uc3QgYmF0Y2hXcml0ZUNvbW1hbmQgPSBuZXcgQmF0Y2hXcml0ZUNvbW1hbmQoe1xuICAgICAgICAgICAgUmVxdWVzdEl0ZW1zOiB7XG4gICAgICAgICAgICAgIFt0YWJsZU5hbWVzLnN0dWRlbnRzXTogcHV0UmVxdWVzdHMsXG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0pO1xuICAgICAgICAgIFxuICAgICAgICAgIGNvbnN0IGJhdGNoUmVzdWx0ID0gYXdhaXQgZHluYW1vREJDbGllbnQuc2VuZChiYXRjaFdyaXRlQ29tbWFuZCk7XG4gICAgICAgICAgXG4gICAgICAgICAgLy8gQ2hlY2sgZm9yIHVucHJvY2Vzc2VkIGl0ZW1zXG4gICAgICAgICAgY29uc3QgdW5wcm9jZXNzZWRJdGVtcyA9IGJhdGNoUmVzdWx0LlVucHJvY2Vzc2VkSXRlbXM/Llt0YWJsZU5hbWVzLnN0dWRlbnRzXTtcbiAgICAgICAgICBpZiAodW5wcm9jZXNzZWRJdGVtcyAmJiB1bnByb2Nlc3NlZEl0ZW1zLmxlbmd0aCA+IDApIHtcbiAgICAgICAgICAgIGNvbnNvbGUud2FybihgQmF0Y2ggd3JpdGUgaGFkICR7dW5wcm9jZXNzZWRJdGVtcy5sZW5ndGh9IHVucHJvY2Vzc2VkIGl0ZW1zIGZvciBzdHVkZW50c2ApO1xuICAgICAgICAgICAgLy8gVHJ5IGluZGl2aWR1YWwgd3JpdGVzIGZvciB1bnByb2Nlc3NlZCBpdGVtc1xuICAgICAgICAgICAgZm9yIChjb25zdCB1bnByb2Nlc3NlZEl0ZW0gb2YgdW5wcm9jZXNzZWRJdGVtcykge1xuICAgICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICAgIGF3YWl0IHB1dFN0dWRlbnQodW5wcm9jZXNzZWRJdGVtLlB1dFJlcXVlc3QhLkl0ZW0gYXMgU3R1ZGVudFJlY29yZCk7XG4gICAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICAgIGNvbnN0IHN0dWRlbnRJZCA9ICh1bnByb2Nlc3NlZEl0ZW0uUHV0UmVxdWVzdCEuSXRlbSBhcyBhbnkpLnN0dWRlbnRfaWQ7XG4gICAgICAgICAgICAgICAgY29uc3QgZXJyb3JNc2cgPSBlcnIgaW5zdGFuY2VvZiBFcnJvciA/IGVyci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InO1xuICAgICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIHdyaXRpbmcgdW5wcm9jZXNzZWQgc3R1ZGVudCAke3N0dWRlbnRJZH06YCwgZXJyKTtcbiAgICAgICAgICAgICAgICByZXN1bHRzLmVycm9ycy5wdXNoKGBTdHVkZW50ICR7c3R1ZGVudElkfTogJHtlcnJvck1zZ31gKTtcbiAgICAgICAgICAgICAgICAvLyBBZGp1c3QgY291bnRzIHNpbmNlIHRoaXMgaXRlbSBmYWlsZWRcbiAgICAgICAgICAgICAgICBpZiAoZXhpc3RpbmdSZWNvcmRzTWFwLmhhcyhzdHVkZW50SWQpKSB7XG4gICAgICAgICAgICAgICAgICByZXN1bHRzLnVwZGF0ZWQtLTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgcmVzdWx0cy5pbnNlcnRlZC0tO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgICByZXN1bHRzLnByb2Nlc3NlZC0tO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGJhdGNoIHdyaXRpbmcgc3R1ZGVudHM6JywgZXJyb3IpO1xuICAgICAgICAgIC8vIElmIGJhdGNoIHdyaXRlIGZhaWxzLCBmYWxsIGJhY2sgdG8gaW5kaXZpZHVhbCB3cml0ZXMgZm9yIHRoaXMgYmF0Y2hcbiAgICAgICAgICBmb3IgKGxldCBqID0gMDsgaiA8IHB1dFJlcXVlc3RzLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICBjb25zdCByZXF1ZXN0ID0gcHV0UmVxdWVzdHNbal07XG4gICAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgICBhd2FpdCBwdXRTdHVkZW50KHJlcXVlc3QuUHV0UmVxdWVzdC5JdGVtKTtcbiAgICAgICAgICAgIH0gY2F0Y2ggKGVycikge1xuICAgICAgICAgICAgICBjb25zdCBzdHVkZW50SWQgPSByZXF1ZXN0LlB1dFJlcXVlc3QuSXRlbS5zdHVkZW50X2lkO1xuICAgICAgICAgICAgICBjb25zdCBlcnJvck1zZyA9IGVyciBpbnN0YW5jZW9mIEVycm9yID8gZXJyLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcic7XG4gICAgICAgICAgICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIHdyaXRpbmcgc3R1ZGVudCAke3N0dWRlbnRJZH06YCwgZXJyKTtcbiAgICAgICAgICAgICAgcmVzdWx0cy5lcnJvcnMucHVzaChgU3R1ZGVudCAke3N0dWRlbnRJZH06ICR7ZXJyb3JNc2d9YCk7XG4gICAgICAgICAgICAgIC8vIEFkanVzdCBjb3VudHMgc2luY2UgdGhpcyBpdGVtIGZhaWxlZFxuICAgICAgICAgICAgICBpZiAoZXhpc3RpbmdSZWNvcmRzTWFwLmhhcyhzdHVkZW50SWQpKSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0cy51cGRhdGVkLS07XG4gICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgcmVzdWx0cy5pbnNlcnRlZC0tO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIHJlc3VsdHMucHJvY2Vzc2VkLS07XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgaWYgYW55IHJlY29yZHMgd2VyZSBzdWNjZXNzZnVsbHkgcHJvY2Vzc2VkXG4gICAgaWYgKHJlc3VsdHMucHJvY2Vzc2VkID09PSAwKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICAgICAgIH0sXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICBtZXNzYWdlOiAnRmFpbGVkIHRvIHVwbG9hZCBzdHVkZW50IGRhdGEuIE5vIHJlY29yZHMgd2VyZSBzdWNjZXNzZnVsbHkgcHJvY2Vzc2VkLicsXG4gICAgICAgICAgZXJyb3JzOiByZXN1bHRzLmVycm9ycy5sZW5ndGggPiAwID8gcmVzdWx0cy5lcnJvcnMgOiBbJ1Vua25vd24gZXJyb3Igb2NjdXJyZWQgZHVyaW5nIHVwbG9hZCddLFxuICAgICAgICB9KSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgIG1lc3NhZ2U6IGBTdWNjZXNzZnVsbHkgcHJvY2Vzc2VkICR7cmVzdWx0cy5wcm9jZXNzZWR9IHN0dWRlbnRzICgke3Jlc3VsdHMuaW5zZXJ0ZWR9IGluc2VydGVkLCAke3Jlc3VsdHMudXBkYXRlZH0gdXBkYXRlZClgLFxuICAgICAgICBwcm9jZXNzZWQ6IHJlc3VsdHMucHJvY2Vzc2VkLFxuICAgICAgICBpbnNlcnRlZDogcmVzdWx0cy5pbnNlcnRlZCxcbiAgICAgICAgdXBkYXRlZDogcmVzdWx0cy51cGRhdGVkLFxuICAgICAgICBlcnJvcnM6IHJlc3VsdHMuZXJyb3JzLmxlbmd0aCA+IDAgPyByZXN1bHRzLmVycm9ycyA6IHVuZGVmaW5lZCxcbiAgICAgIH0pLFxuICAgIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3I6JywgZXJyb3IpO1xuICAgIHJldHVybiB7XG4gICAgICBzdGF0dXNDb2RlOiA1MDAsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICAgICB9LFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgIG1lc3NhZ2U6ICdJbnRlcm5hbCBzZXJ2ZXIgZXJyb3InLFxuICAgICAgICBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcidcbiAgICAgIH0pLFxuICAgIH07XG4gIH1cbn07XG5cbmFzeW5jIGZ1bmN0aW9uIGdldFN0dWRlbnQoc3R1ZGVudElkOiBzdHJpbmcpIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBjb21tYW5kID0gbmV3IEdldENvbW1hbmQoe1xuICAgICAgVGFibGVOYW1lOiB0YWJsZU5hbWVzLnN0dWRlbnRzLFxuICAgICAgS2V5OiB7IHN0dWRlbnRfaWQ6IHN0dWRlbnRJZCB9LFxuICAgIH0pO1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGR5bmFtb0RCQ2xpZW50LnNlbmQoY29tbWFuZCk7XG4gICAgcmV0dXJuIHJlc3VsdC5JdGVtIGFzIFN0dWRlbnRSZWNvcmQgfCB1bmRlZmluZWQ7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihgRXJyb3IgZ2V0dGluZyBzdHVkZW50ICR7c3R1ZGVudElkfTpgLCBlcnJvcik7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBwdXRTdHVkZW50KHN0dWRlbnQ6IFN0dWRlbnRSZWNvcmQpIHtcbiAgY29uc3QgY29tbWFuZCA9IG5ldyBQdXRDb21tYW5kKHtcbiAgICBUYWJsZU5hbWU6IHRhYmxlTmFtZXMuc3R1ZGVudHMsXG4gICAgSXRlbTogc3R1ZGVudCxcbiAgfSk7XG4gIGF3YWl0IGR5bmFtb0RCQ2xpZW50LnNlbmQoY29tbWFuZCk7XG59XG4iXX0=