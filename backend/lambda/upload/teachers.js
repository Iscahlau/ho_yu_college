"use strict";
/**
 * Upload Teachers Lambda Handler
 * Handles Excel/CSV file uploads for teacher data
 * - Skips header row
 * - Upserts records based on teacher_id
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
            if (!record.teacher_id) {
                results.errors.push(`Row ${i + 2}: Missing teacher_id`);
                continue;
            }
            parsedRecords.push({ index: i, record });
        }
        // Batch check which records already exist (25 items per batch)
        const BATCH_SIZE = 25;
        const existingRecordsMap = new Map();
        for (let i = 0; i < parsedRecords.length; i += BATCH_SIZE) {
            const batch = parsedRecords.slice(i, i + BATCH_SIZE);
            const keys = batch.map(({ record }) => ({ teacher_id: record.teacher_id }));
            try {
                const batchGetCommand = new lib_dynamodb_1.BatchGetCommand({
                    RequestItems: {
                        [dynamodb_client_1.tableNames.teachers]: {
                            Keys: keys,
                        },
                    },
                });
                const batchResult = await dynamodb_client_1.dynamoDBClient.send(batchGetCommand);
                const items = batchResult.Responses?.[dynamodb_client_1.tableNames.teachers] || [];
                items.forEach((item) => {
                    existingRecordsMap.set(item.teacher_id, item);
                });
            }
            catch (error) {
                console.error('Error batch getting teachers:', error);
                // If batch get fails, fall back to individual checks for this batch
                for (const { record } of batch) {
                    try {
                        const existing = await getTeacher(record.teacher_id);
                        if (existing) {
                            existingRecordsMap.set(record.teacher_id, existing);
                        }
                    }
                    catch (err) {
                        console.error(`Error getting teacher ${record.teacher_id}:`, err);
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
                    const existingRecord = existingRecordsMap.get(record.teacher_id);
                    // Parse responsible_class - it may be a JSON string
                    let responsibleClass = [];
                    if (record.responsible_class) {
                        if (typeof record.responsible_class === 'string') {
                            try {
                                responsibleClass = JSON.parse(record.responsible_class);
                            }
                            catch {
                                // If not valid JSON, treat as single class
                                responsibleClass = [record.responsible_class];
                            }
                        }
                        else if (Array.isArray(record.responsible_class)) {
                            responsibleClass = record.responsible_class;
                        }
                    }
                    // Prepare teacher record
                    const teacherRecord = {
                        teacher_id: record.teacher_id,
                        name: record.name || '',
                        password: (0, conversionUtils_1.toString)(record.password),
                        responsible_class: responsibleClass,
                        last_login: record.last_login || now,
                        is_admin: (0, conversionUtils_1.toBoolean)(record.is_admin, false),
                        created_at: existingRecord ? existingRecord.created_at : now,
                        updated_at: now,
                    };
                    // Check if data has actually changed
                    let hasChanges = !existingRecord;
                    if (existingRecord) {
                        hasChanges = (teacherRecord.name !== existingRecord.name ||
                            teacherRecord.password !== existingRecord.password ||
                            JSON.stringify(teacherRecord.responsible_class) !== JSON.stringify(existingRecord.responsible_class) ||
                            teacherRecord.is_admin !== existingRecord.is_admin);
                    }
                    // Only update timestamps if there are actual changes
                    if (!hasChanges && existingRecord) {
                        teacherRecord.updated_at = existingRecord.updated_at;
                    }
                    putRequests.push({
                        PutRequest: {
                            Item: teacherRecord,
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
                            [dynamodb_client_1.tableNames.teachers]: putRequests,
                        },
                    });
                    const batchResult = await dynamodb_client_1.dynamoDBClient.send(batchWriteCommand);
                    // Check for unprocessed items
                    const unprocessedItems = batchResult.UnprocessedItems?.[dynamodb_client_1.tableNames.teachers];
                    if (unprocessedItems && unprocessedItems.length > 0) {
                        console.warn(`Batch write had ${unprocessedItems.length} unprocessed items for teachers`);
                        // Try individual writes for unprocessed items
                        for (const unprocessedItem of unprocessedItems) {
                            try {
                                await putTeacher(unprocessedItem.PutRequest.Item);
                            }
                            catch (err) {
                                const teacherId = unprocessedItem.PutRequest.Item.teacher_id;
                                const errorMsg = err instanceof Error ? err.message : 'Unknown error';
                                console.error(`Error writing unprocessed teacher ${teacherId}:`, err);
                                results.errors.push(`Teacher ${teacherId}: ${errorMsg}`);
                                // Adjust counts since this item failed
                                if (existingRecordsMap.has(teacherId)) {
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
                    console.error('Error batch writing teachers:', error);
                    // If batch write fails, fall back to individual writes for this batch
                    for (let j = 0; j < putRequests.length; j++) {
                        const request = putRequests[j];
                        try {
                            await putTeacher(request.PutRequest.Item);
                        }
                        catch (err) {
                            const teacherId = request.PutRequest.Item.teacher_id;
                            const errorMsg = err instanceof Error ? err.message : 'Unknown error';
                            console.error(`Error writing teacher ${teacherId}:`, err);
                            results.errors.push(`Teacher ${teacherId}: ${errorMsg}`);
                            // Adjust counts since this item failed
                            if (existingRecordsMap.has(teacherId)) {
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
                    message: 'Failed to upload teacher data. No records were successfully processed.',
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
                message: `Successfully processed ${results.processed} teachers (${results.inserted} inserted, ${results.updated} updated)`,
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
async function getTeacher(teacherId) {
    try {
        const command = new lib_dynamodb_1.GetCommand({
            TableName: dynamodb_client_1.tableNames.teachers,
            Key: { teacher_id: teacherId },
        });
        const result = await dynamodb_client_1.dynamoDBClient.send(command);
        return result.Item;
    }
    catch (error) {
        console.error(`Error getting teacher ${teacherId}:`, error);
        return undefined;
    }
}
async function putTeacher(teacher) {
    const command = new lib_dynamodb_1.PutCommand({
        TableName: dynamodb_client_1.tableNames.teachers,
        Item: teacher,
    });
    await dynamodb_client_1.dynamoDBClient.send(command);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVhY2hlcnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0ZWFjaGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFFSCx3REFBbUc7QUFFbkcsNkJBQTZCO0FBQzdCLDhEQUFzRTtBQUN0RSw2REFBOEQ7QUFhdkQsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUMxQixLQUEyQixFQUNLLEVBQUU7SUFDbEMsSUFBSSxDQUFDO1FBQ0gscUJBQXFCO1FBQ3JCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQztRQUM1QyxNQUFNLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxHQUFHLElBQUksQ0FBQztRQUVsQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDaEIsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUU7b0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtvQkFDbEMsNkJBQTZCLEVBQUUsR0FBRztpQkFDbkM7Z0JBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7b0JBQ25CLE9BQU8sRUFBRSxLQUFLO29CQUNkLE9BQU8sRUFBRSxrQkFBa0I7aUJBQzVCLENBQUM7YUFDSCxDQUFDO1FBQ0osQ0FBQztRQUVELDBCQUEwQjtRQUMxQixNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUVyRCx1QkFBdUI7UUFDdkIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUMzRCxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlDLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFD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ZCxDQUFDLENBQUM7SUFDSCxNQUFNLGdDQUFjLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ3JDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFVwbG9hZCBUZWFjaGVycyBMYW1iZGEgSGFuZGxlclxuICogSGFuZGxlcyBFeGNlbC9DU1YgZmlsZSB1cGxvYWRzIGZvciB0ZWFjaGVyIGRhdGFcbiAqIC0gU2tpcHMgaGVhZGVyIHJvd1xuICogLSBVcHNlcnRzIHJlY29yZHMgYmFzZWQgb24gdGVhY2hlcl9pZFxuICogLSBObyBkZWxldGUgZnVuY3Rpb25hbGl0eVxuICovXG5cbmltcG9ydCB7IFB1dENvbW1hbmQsIEdldENvbW1hbmQsIEJhdGNoR2V0Q29tbWFuZCwgQmF0Y2hXcml0ZUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0ICogYXMgWExTWCBmcm9tICd4bHN4JztcbmltcG9ydCB7IGR5bmFtb0RCQ2xpZW50LCB0YWJsZU5hbWVzIH0gZnJvbSAnLi4vdXRpbHMvZHluYW1vZGItY2xpZW50JztcbmltcG9ydCB7IHRvQm9vbGVhbiwgdG9TdHJpbmcgfSBmcm9tICcuL3V0aWxzL2NvbnZlcnNpb25VdGlscyc7XG5cbmludGVyZmFjZSBUZWFjaGVyUmVjb3JkIHtcbiAgdGVhY2hlcl9pZDogc3RyaW5nO1xuICBuYW1lOiBzdHJpbmc7XG4gIHBhc3N3b3JkOiBzdHJpbmc7XG4gIHJlc3BvbnNpYmxlX2NsYXNzOiBzdHJpbmdbXTsgLy8gSlNPTiBhcnJheSBzdG9yZWQgYXMgYXJyYXkgaW4gRHluYW1vREJcbiAgbGFzdF9sb2dpbjogc3RyaW5nO1xuICBpc19hZG1pbjogYm9vbGVhbjtcbiAgY3JlYXRlZF9hdD86IHN0cmluZztcbiAgdXBkYXRlZF9hdD86IHN0cmluZztcbn1cblxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoXG4gIGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudFxuKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcbiAgdHJ5IHtcbiAgICAvLyBQYXJzZSByZXF1ZXN0IGJvZHlcbiAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShldmVudC5ib2R5IHx8ICd7fScpO1xuICAgIGNvbnN0IHsgZmlsZTogYmFzZTY0RmlsZSB9ID0gYm9keTtcblxuICAgIGlmICghYmFzZTY0RmlsZSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgICB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IFxuICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgIG1lc3NhZ2U6ICdObyBmaWxlIHVwbG9hZGVkJyBcbiAgICAgICAgfSksXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIERlY29kZSBiYXNlNjQgdG8gYnVmZmVyXG4gICAgY29uc3QgZmlsZUJ1ZmZlciA9IEJ1ZmZlci5mcm9tKGJhc2U2NEZpbGUsICdiYXNlNjQnKTtcblxuICAgIC8vIFBhcnNlIEV4Y2VsL0NTViBmaWxlXG4gICAgY29uc3Qgd29ya2Jvb2sgPSBYTFNYLnJlYWQoZmlsZUJ1ZmZlciwgeyB0eXBlOiAnYnVmZmVyJyB9KTtcbiAgICBjb25zdCBmaXJzdFNoZWV0TmFtZSA9IHdvcmtib29rLlNoZWV0TmFtZXNbMF07XG4gICAgY29uc3Qgd29ya3NoZWV0ID0gd29ya2Jvb2suU2hlZXRzW2ZpcnN0U2hlZXROYW1lXTtcbiAgICBcbiAgICAvLyBDb252ZXJ0IHRvIEpTT04sIHVzaW5nIGZpcnN0IHJvdyBhcyBoZWFkZXJzXG4gICAgY29uc3QganNvbkRhdGEgPSBYTFNYLnV0aWxzLnNoZWV0X3RvX2pzb24od29ya3NoZWV0LCB7IGhlYWRlcjogMSB9KSBhcyBhbnlbXVtdO1xuICAgIFxuICAgIC8vIFZhbGlkYXRlIGZpbGUgaGFzIGRhdGFcbiAgICBpZiAoanNvbkRhdGEubGVuZ3RoIDwgMikge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgICB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IFxuICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgIG1lc3NhZ2U6ICdGaWxlIGlzIGVtcHR5IG9yIGNvbnRhaW5zIG5vIGRhdGEgcm93cycgXG4gICAgICAgIH0pLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBFeHRyYWN0IGhlYWRlcnMgKGZpcnN0IHJvdykgYW5kIGRhdGEgcm93cyAoc2tpcCBmaXJzdCByb3cpXG4gICAgY29uc3QgaGVhZGVycyA9IGpzb25EYXRhWzBdO1xuICAgIGNvbnN0IGRhdGFSb3dzID0ganNvbkRhdGEuc2xpY2UoMSkuZmlsdGVyKHJvdyA9PiBcbiAgICAgIHJvdyAmJiByb3cubGVuZ3RoID4gMCAmJiByb3cuc29tZShjZWxsID0+IGNlbGwgIT09IG51bGwgJiYgY2VsbCAhPT0gdW5kZWZpbmVkICYmIGNlbGwgIT09ICcnKVxuICAgICk7XG5cbiAgICAvLyBWYWxpZGF0ZSBtYXhpbXVtIDQwMDAgcmVjb3Jkc1xuICAgIGlmIChkYXRhUm93cy5sZW5ndGggPiA0MDAwKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICAgICAgIH0sXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgXG4gICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgbWVzc2FnZTogYEZpbGUgY29udGFpbnMgJHtkYXRhUm93cy5sZW5ndGh9IHJlY29yZHMuIE1heGltdW0gYWxsb3dlZCBpcyA0LDAwMCByZWNvcmRzLmAgXG4gICAgICAgIH0pLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBQcm9jZXNzIHJlY29yZHMgaW4gYmF0Y2hlcyBmb3IgYmV0dGVyIHBlcmZvcm1hbmNlXG4gICAgY29uc3QgcmVzdWx0cyA9IHtcbiAgICAgIHByb2Nlc3NlZDogMCxcbiAgICAgIGluc2VydGVkOiAwLFxuICAgICAgdXBkYXRlZDogMCxcbiAgICAgIGVycm9yczogW10gYXMgc3RyaW5nW10sXG4gICAgfTtcblxuICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICBcbiAgICAvLyBNYXAgYWxsIHJvd3MgdG8gcmVjb3JkcyBmaXJzdCwgdmFsaWRhdGluZyByZXF1aXJlZCBmaWVsZHNcbiAgICBjb25zdCBwYXJzZWRSZWNvcmRzOiBBcnJheTx7IGluZGV4OiBudW1iZXI7IHJlY29yZDogYW55IH0+ID0gW107XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkYXRhUm93cy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3Qgcm93ID0gZGF0YVJvd3NbaV07XG4gICAgICBjb25zdCByZWNvcmQ6IGFueSA9IHt9O1xuICAgICAgaGVhZGVycy5mb3JFYWNoKChoZWFkZXIsIGluZGV4KSA9PiB7XG4gICAgICAgIHJlY29yZFtoZWFkZXJdID0gcm93W2luZGV4XTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBWYWxpZGF0ZSByZXF1aXJlZCBmaWVsZFxuICAgICAgaWYgKCFyZWNvcmQudGVhY2hlcl9pZCkge1xuICAgICAgICByZXN1bHRzLmVycm9ycy5wdXNoKGBSb3cgJHtpICsgMn06IE1pc3NpbmcgdGVhY2hlcl9pZGApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgcGFyc2VkUmVjb3Jkcy5wdXNoKHsgaW5kZXg6IGksIHJlY29yZCB9KTtcbiAgICB9XG5cbiAgICAvLyBCYXRjaCBjaGVjayB3aGljaCByZWNvcmRzIGFscmVhZHkgZXhpc3QgKDI1IGl0ZW1zIHBlciBiYXRjaClcbiAgICBjb25zdCBCQVRDSF9TSVpFID0gMjU7XG4gICAgY29uc3QgZXhpc3RpbmdSZWNvcmRzTWFwID0gbmV3IE1hcDxzdHJpbmcsIFRlYWNoZXJSZWNvcmQ+KCk7XG4gICAgXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYXJzZWRSZWNvcmRzLmxlbmd0aDsgaSArPSBCQVRDSF9TSVpFKSB7XG4gICAgICBjb25zdCBiYXRjaCA9IHBhcnNlZFJlY29yZHMuc2xpY2UoaSwgaSArIEJBVENIX1NJWkUpO1xuICAgICAgY29uc3Qga2V5cyA9IGJhdGNoLm1hcCgoeyByZWNvcmQgfSkgPT4gKHsgdGVhY2hlcl9pZDogcmVjb3JkLnRlYWNoZXJfaWQgfSkpO1xuICAgICAgXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBiYXRjaEdldENvbW1hbmQgPSBuZXcgQmF0Y2hHZXRDb21tYW5kKHtcbiAgICAgICAgICBSZXF1ZXN0SXRlbXM6IHtcbiAgICAgICAgICAgIFt0YWJsZU5hbWVzLnRlYWNoZXJzXToge1xuICAgICAgICAgICAgICBLZXlzOiBrZXlzLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGJhdGNoUmVzdWx0ID0gYXdhaXQgZHluYW1vREJDbGllbnQuc2VuZChiYXRjaEdldENvbW1hbmQpO1xuICAgICAgICBjb25zdCBpdGVtcyA9IGJhdGNoUmVzdWx0LlJlc3BvbnNlcz8uW3RhYmxlTmFtZXMudGVhY2hlcnNdIHx8IFtdO1xuICAgICAgICBcbiAgICAgICAgaXRlbXMuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgICAgICAgIGV4aXN0aW5nUmVjb3Jkc01hcC5zZXQoaXRlbS50ZWFjaGVyX2lkLCBpdGVtIGFzIFRlYWNoZXJSZWNvcmQpO1xuICAgICAgICB9KTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGJhdGNoIGdldHRpbmcgdGVhY2hlcnM6JywgZXJyb3IpO1xuICAgICAgICAvLyBJZiBiYXRjaCBnZXQgZmFpbHMsIGZhbGwgYmFjayB0byBpbmRpdmlkdWFsIGNoZWNrcyBmb3IgdGhpcyBiYXRjaFxuICAgICAgICBmb3IgKGNvbnN0IHsgcmVjb3JkIH0gb2YgYmF0Y2gpIHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgZXhpc3RpbmcgPSBhd2FpdCBnZXRUZWFjaGVyKHJlY29yZC50ZWFjaGVyX2lkKTtcbiAgICAgICAgICAgIGlmIChleGlzdGluZykge1xuICAgICAgICAgICAgICBleGlzdGluZ1JlY29yZHNNYXAuc2V0KHJlY29yZC50ZWFjaGVyX2lkLCBleGlzdGluZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGBFcnJvciBnZXR0aW5nIHRlYWNoZXIgJHtyZWNvcmQudGVhY2hlcl9pZH06YCwgZXJyKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBCYXRjaCB3cml0ZSByZWNvcmRzICgyNSBpdGVtcyBwZXIgYmF0Y2gpXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYXJzZWRSZWNvcmRzLmxlbmd0aDsgaSArPSBCQVRDSF9TSVpFKSB7XG4gICAgICBjb25zdCBiYXRjaCA9IHBhcnNlZFJlY29yZHMuc2xpY2UoaSwgaSArIEJBVENIX1NJWkUpO1xuICAgICAgY29uc3QgcHV0UmVxdWVzdHM6IGFueVtdID0gW107XG4gICAgICBcbiAgICAgIGZvciAoY29uc3QgeyBpbmRleCwgcmVjb3JkIH0gb2YgYmF0Y2gpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCBleGlzdGluZ1JlY29yZCA9IGV4aXN0aW5nUmVjb3Jkc01hcC5nZXQocmVjb3JkLnRlYWNoZXJfaWQpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIFBhcnNlIHJlc3BvbnNpYmxlX2NsYXNzIC0gaXQgbWF5IGJlIGEgSlNPTiBzdHJpbmdcbiAgICAgICAgICBsZXQgcmVzcG9uc2libGVDbGFzczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgICBpZiAocmVjb3JkLnJlc3BvbnNpYmxlX2NsYXNzKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHJlY29yZC5yZXNwb25zaWJsZV9jbGFzcyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICByZXNwb25zaWJsZUNsYXNzID0gSlNPTi5wYXJzZShyZWNvcmQucmVzcG9uc2libGVfY2xhc3MpO1xuICAgICAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgICAgICAvLyBJZiBub3QgdmFsaWQgSlNPTiwgdHJlYXQgYXMgc2luZ2xlIGNsYXNzXG4gICAgICAgICAgICAgICAgcmVzcG9uc2libGVDbGFzcyA9IFtyZWNvcmQucmVzcG9uc2libGVfY2xhc3NdO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkocmVjb3JkLnJlc3BvbnNpYmxlX2NsYXNzKSkge1xuICAgICAgICAgICAgICByZXNwb25zaWJsZUNsYXNzID0gcmVjb3JkLnJlc3BvbnNpYmxlX2NsYXNzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIFByZXBhcmUgdGVhY2hlciByZWNvcmRcbiAgICAgICAgICBjb25zdCB0ZWFjaGVyUmVjb3JkOiBUZWFjaGVyUmVjb3JkID0ge1xuICAgICAgICAgICAgdGVhY2hlcl9pZDogcmVjb3JkLnRlYWNoZXJfaWQsXG4gICAgICAgICAgICBuYW1lOiByZWNvcmQubmFtZSB8fCAnJyxcbiAgICAgICAgICAgIHBhc3N3b3JkOiB0b1N0cmluZyhyZWNvcmQucGFzc3dvcmQpLFxuICAgICAgICAgICAgcmVzcG9uc2libGVfY2xhc3M6IHJlc3BvbnNpYmxlQ2xhc3MsXG4gICAgICAgICAgICBsYXN0X2xvZ2luOiByZWNvcmQubGFzdF9sb2dpbiB8fCBub3csXG4gICAgICAgICAgICBpc19hZG1pbjogdG9Cb29sZWFuKHJlY29yZC5pc19hZG1pbiwgZmFsc2UpLFxuICAgICAgICAgICAgY3JlYXRlZF9hdDogZXhpc3RpbmdSZWNvcmQgPyBleGlzdGluZ1JlY29yZC5jcmVhdGVkX2F0IDogbm93LFxuICAgICAgICAgICAgdXBkYXRlZF9hdDogbm93LFxuICAgICAgICAgIH07XG5cbiAgICAgICAgICAvLyBDaGVjayBpZiBkYXRhIGhhcyBhY3R1YWxseSBjaGFuZ2VkXG4gICAgICAgICAgbGV0IGhhc0NoYW5nZXMgPSAhZXhpc3RpbmdSZWNvcmQ7XG4gICAgICAgICAgaWYgKGV4aXN0aW5nUmVjb3JkKSB7XG4gICAgICAgICAgICBoYXNDaGFuZ2VzID0gKFxuICAgICAgICAgICAgICB0ZWFjaGVyUmVjb3JkLm5hbWUgIT09IGV4aXN0aW5nUmVjb3JkLm5hbWUgfHxcbiAgICAgICAgICAgICAgdGVhY2hlclJlY29yZC5wYXNzd29yZCAhPT0gZXhpc3RpbmdSZWNvcmQucGFzc3dvcmQgfHxcbiAgICAgICAgICAgICAgSlNPTi5zdHJpbmdpZnkodGVhY2hlclJlY29yZC5yZXNwb25zaWJsZV9jbGFzcykgIT09IEpTT04uc3RyaW5naWZ5KGV4aXN0aW5nUmVjb3JkLnJlc3BvbnNpYmxlX2NsYXNzKSB8fFxuICAgICAgICAgICAgICB0ZWFjaGVyUmVjb3JkLmlzX2FkbWluICE9PSBleGlzdGluZ1JlY29yZC5pc19hZG1pblxuICAgICAgICAgICAgKTtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICAvLyBPbmx5IHVwZGF0ZSB0aW1lc3RhbXBzIGlmIHRoZXJlIGFyZSBhY3R1YWwgY2hhbmdlc1xuICAgICAgICAgIGlmICghaGFzQ2hhbmdlcyAmJiBleGlzdGluZ1JlY29yZCkge1xuICAgICAgICAgICAgdGVhY2hlclJlY29yZC51cGRhdGVkX2F0ID0gZXhpc3RpbmdSZWNvcmQudXBkYXRlZF9hdDtcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBwdXRSZXF1ZXN0cy5wdXNoKHtcbiAgICAgICAgICAgIFB1dFJlcXVlc3Q6IHtcbiAgICAgICAgICAgICAgSXRlbTogdGVhY2hlclJlY29yZCxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgXG4gICAgICAgICAgaWYgKGV4aXN0aW5nUmVjb3JkKSB7XG4gICAgICAgICAgICByZXN1bHRzLnVwZGF0ZWQrKztcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmVzdWx0cy5pbnNlcnRlZCsrO1xuICAgICAgICAgIH1cbiAgICAgICAgICByZXN1bHRzLnByb2Nlc3NlZCsrO1xuICAgICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICAgIHJlc3VsdHMuZXJyb3JzLnB1c2goYFJvdyAke2luZGV4ICsgMn06ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcid9YCk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICAgIFxuICAgICAgLy8gRXhlY3V0ZSBiYXRjaCB3cml0ZVxuICAgICAgaWYgKHB1dFJlcXVlc3RzLmxlbmd0aCA+IDApIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCBiYXRjaFdyaXRlQ29tbWFuZCA9IG5ldyBCYXRjaFdyaXRlQ29tbWFuZCh7XG4gICAgICAgICAgICBSZXF1ZXN0SXRlbXM6IHtcbiAgICAgICAgICAgICAgW3RhYmxlTmFtZXMudGVhY2hlcnNdOiBwdXRSZXF1ZXN0cyxcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgfSk7XG4gICAgICAgICAgXG4gICAgICAgICAgY29uc3QgYmF0Y2hSZXN1bHQgPSBhd2FpdCBkeW5hbW9EQkNsaWVudC5zZW5kKGJhdGNoV3JpdGVDb21tYW5kKTtcbiAgICAgICAgICBcbiAgICAgICAgICAvLyBDaGVjayBmb3IgdW5wcm9jZXNzZWQgaXRlbXNcbiAgICAgICAgICBjb25zdCB1bnByb2Nlc3NlZEl0ZW1zID0gYmF0Y2hSZXN1bHQuVW5wcm9jZXNzZWRJdGVtcz8uW3RhYmxlTmFtZXMudGVhY2hlcnNdO1xuICAgICAgICAgIGlmICh1bnByb2Nlc3NlZEl0ZW1zICYmIHVucHJvY2Vzc2VkSXRlbXMubGVuZ3RoID4gMCkge1xuICAgICAgICAgICAgY29uc29sZS53YXJuKGBCYXRjaCB3cml0ZSBoYWQgJHt1bnByb2Nlc3NlZEl0ZW1zLmxlbmd0aH0gdW5wcm9jZXNzZWQgaXRlbXMgZm9yIHRlYWNoZXJzYCk7XG4gICAgICAgICAgICAvLyBUcnkgaW5kaXZpZHVhbCB3cml0ZXMgZm9yIHVucHJvY2Vzc2VkIGl0ZW1zXG4gICAgICAgICAgICBmb3IgKGNvbnN0IHVucHJvY2Vzc2VkSXRlbSBvZiB1bnByb2Nlc3NlZEl0ZW1zKSB7XG4gICAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgICAgYXdhaXQgcHV0VGVhY2hlcih1bnByb2Nlc3NlZEl0ZW0uUHV0UmVxdWVzdCEuSXRlbSBhcyBUZWFjaGVyUmVjb3JkKTtcbiAgICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgICAgY29uc3QgdGVhY2hlcklkID0gKHVucHJvY2Vzc2VkSXRlbS5QdXRSZXF1ZXN0IS5JdGVtIGFzIGFueSkudGVhY2hlcl9pZDtcbiAgICAgICAgICAgICAgICBjb25zdCBlcnJvck1zZyA9IGVyciBpbnN0YW5jZW9mIEVycm9yID8gZXJyLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcic7XG4gICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3Igd3JpdGluZyB1bnByb2Nlc3NlZCB0ZWFjaGVyICR7dGVhY2hlcklkfTpgLCBlcnIpO1xuICAgICAgICAgICAgICAgIHJlc3VsdHMuZXJyb3JzLnB1c2goYFRlYWNoZXIgJHt0ZWFjaGVySWR9OiAke2Vycm9yTXNnfWApO1xuICAgICAgICAgICAgICAgIC8vIEFkanVzdCBjb3VudHMgc2luY2UgdGhpcyBpdGVtIGZhaWxlZFxuICAgICAgICAgICAgICAgIGlmIChleGlzdGluZ1JlY29yZHNNYXAuaGFzKHRlYWNoZXJJZCkpIHtcbiAgICAgICAgICAgICAgICAgIHJlc3VsdHMudXBkYXRlZC0tO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICByZXN1bHRzLmluc2VydGVkLS07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICAgIHJlc3VsdHMucHJvY2Vzc2VkLS07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgYmF0Y2ggd3JpdGluZyB0ZWFjaGVyczonLCBlcnJvcik7XG4gICAgICAgICAgLy8gSWYgYmF0Y2ggd3JpdGUgZmFpbHMsIGZhbGwgYmFjayB0byBpbmRpdmlkdWFsIHdyaXRlcyBmb3IgdGhpcyBiYXRjaFxuICAgICAgICAgIGZvciAobGV0IGogPSAwOyBqIDwgcHV0UmVxdWVzdHMubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgIGNvbnN0IHJlcXVlc3QgPSBwdXRSZXF1ZXN0c1tqXTtcbiAgICAgICAgICAgIHRyeSB7XG4gICAgICAgICAgICAgIGF3YWl0IHB1dFRlYWNoZXIocmVxdWVzdC5QdXRSZXF1ZXN0Lkl0ZW0pO1xuICAgICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICAgIGNvbnN0IHRlYWNoZXJJZCA9IHJlcXVlc3QuUHV0UmVxdWVzdC5JdGVtLnRlYWNoZXJfaWQ7XG4gICAgICAgICAgICAgIGNvbnN0IGVycm9yTXNnID0gZXJyIGluc3RhbmNlb2YgRXJyb3IgPyBlcnIubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJztcbiAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihgRXJyb3Igd3JpdGluZyB0ZWFjaGVyICR7dGVhY2hlcklkfTpgLCBlcnIpO1xuICAgICAgICAgICAgICByZXN1bHRzLmVycm9ycy5wdXNoKGBUZWFjaGVyICR7dGVhY2hlcklkfTogJHtlcnJvck1zZ31gKTtcbiAgICAgICAgICAgICAgLy8gQWRqdXN0IGNvdW50cyBzaW5jZSB0aGlzIGl0ZW0gZmFpbGVkXG4gICAgICAgICAgICAgIGlmIChleGlzdGluZ1JlY29yZHNNYXAuaGFzKHRlYWNoZXJJZCkpIHtcbiAgICAgICAgICAgICAgICByZXN1bHRzLnVwZGF0ZWQtLTtcbiAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXN1bHRzLmluc2VydGVkLS07XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgcmVzdWx0cy5wcm9jZXNzZWQtLTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBDaGVjayBpZiBhbnkgcmVjb3JkcyB3ZXJlIHN1Y2Nlc3NmdWxseSBwcm9jZXNzZWRcbiAgICBpZiAocmVzdWx0cy5wcm9jZXNzZWQgPT09IDApIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgICAgfSxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgIG1lc3NhZ2U6ICdGYWlsZWQgdG8gdXBsb2FkIHRlYWNoZXIgZGF0YS4gTm8gcmVjb3JkcyB3ZXJlIHN1Y2Nlc3NmdWxseSBwcm9jZXNzZWQuJyxcbiAgICAgICAgICBlcnJvcnM6IHJlc3VsdHMuZXJyb3JzLmxlbmd0aCA+IDAgPyByZXN1bHRzLmVycm9ycyA6IFsnVW5rbm93biBlcnJvciBvY2N1cnJlZCBkdXJpbmcgdXBsb2FkJ10sXG4gICAgICAgIH0pLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICByZXR1cm4ge1xuICAgICAgc3RhdHVzQ29kZTogMjAwLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcbiAgICAgICAgc3VjY2VzczogdHJ1ZSxcbiAgICAgICAgbWVzc2FnZTogYFN1Y2Nlc3NmdWxseSBwcm9jZXNzZWQgJHtyZXN1bHRzLnByb2Nlc3NlZH0gdGVhY2hlcnMgKCR7cmVzdWx0cy5pbnNlcnRlZH0gaW5zZXJ0ZWQsICR7cmVzdWx0cy51cGRhdGVkfSB1cGRhdGVkKWAsXG4gICAgICAgIHByb2Nlc3NlZDogcmVzdWx0cy5wcm9jZXNzZWQsXG4gICAgICAgIGluc2VydGVkOiByZXN1bHRzLmluc2VydGVkLFxuICAgICAgICB1cGRhdGVkOiByZXN1bHRzLnVwZGF0ZWQsXG4gICAgICAgIGVycm9yczogcmVzdWx0cy5lcnJvcnMubGVuZ3RoID4gMCA/IHJlc3VsdHMuZXJyb3JzIDogdW5kZWZpbmVkLFxuICAgICAgfSksXG4gICAgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvcjonLCBlcnJvcik7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1c0NvZGU6IDUwMCxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IFxuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgbWVzc2FnZTogJ0ludGVybmFsIHNlcnZlciBlcnJvcicsXG4gICAgICAgIGVycm9yOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJ1xuICAgICAgfSksXG4gICAgfTtcbiAgfVxufTtcblxuYXN5bmMgZnVuY3Rpb24gZ2V0VGVhY2hlcih0ZWFjaGVySWQ6IHN0cmluZykge1xuICB0cnkge1xuICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgR2V0Q29tbWFuZCh7XG4gICAgICBUYWJsZU5hbWU6IHRhYmxlTmFtZXMudGVhY2hlcnMsXG4gICAgICBLZXk6IHsgdGVhY2hlcl9pZDogdGVhY2hlcklkIH0sXG4gICAgfSk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZHluYW1vREJDbGllbnQuc2VuZChjb21tYW5kKTtcbiAgICByZXR1cm4gcmVzdWx0Lkl0ZW0gYXMgVGVhY2hlclJlY29yZCB8IHVuZGVmaW5lZDtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKGBFcnJvciBnZXR0aW5nIHRlYWNoZXIgJHt0ZWFjaGVySWR9OmAsIGVycm9yKTtcbiAgICByZXR1cm4gdW5kZWZpbmVkO1xuICB9XG59XG5cbmFzeW5jIGZ1bmN0aW9uIHB1dFRlYWNoZXIodGVhY2hlcjogVGVhY2hlclJlY29yZCkge1xuICBjb25zdCBjb21tYW5kID0gbmV3IFB1dENvbW1hbmQoe1xuICAgIFRhYmxlTmFtZTogdGFibGVOYW1lcy50ZWFjaGVycyxcbiAgICBJdGVtOiB0ZWFjaGVyLFxuICB9KTtcbiAgYXdhaXQgZHluYW1vREJDbGllbnQuc2VuZChjb21tYW5kKTtcbn1cbiJdfQ==