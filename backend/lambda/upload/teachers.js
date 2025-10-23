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
                        password: record.password || '',
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
                    await dynamodb_client_1.dynamoDBClient.send(batchWriteCommand);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVhY2hlcnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0ZWFjaGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFFSCx3REFBbUc7QUFFbkcsNkJBQTZCO0FBQzdCLDhEQUFzRTtBQUN0RSw2REFBb0Q7QUFhN0MsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUMxQixLQUEyQixFQUNLLEVBQUU7SUFDbEMsSUFBSSxDQUFDO1FBQ0gscUJBQXFCO1FBQ3JCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQztRQUM1QyxNQUFNLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxHQUFHLElBQUksQ0FBQztRQUVsQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDaEIsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUU7b0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtvQkFDbEMsNkJBQTZCLEVBQUUsR0FBRztpQkFDbkM7Z0JBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7b0JBQ25CLE9BQU8sRUFBRSxLQUFLO29CQUNkLE9BQU8sRUFBRSxrQkFBa0I7aUJBQzVCLENBQUM7YUFDSCxDQUFDO1FBQ0osQ0FBQztRQUVELDBCQUEwQjtRQUMxQixNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUVyRCx1QkFBdUI7UUFDdkIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUMzRCxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlDLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFD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QUksQ0FBQyxPQUFPLENBQUMsQ0FBQztBQUNyQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBVcGxvYWQgVGVhY2hlcnMgTGFtYmRhIEhhbmRsZXJcbiAqIEhhbmRsZXMgRXhjZWwvQ1NWIGZpbGUgdXBsb2FkcyBmb3IgdGVhY2hlciBkYXRhXG4gKiAtIFNraXBzIGhlYWRlciByb3dcbiAqIC0gVXBzZXJ0cyByZWNvcmRzIGJhc2VkIG9uIHRlYWNoZXJfaWRcbiAqIC0gTm8gZGVsZXRlIGZ1bmN0aW9uYWxpdHlcbiAqL1xuXG5pbXBvcnQgeyBQdXRDb21tYW5kLCBHZXRDb21tYW5kLCBCYXRjaEdldENvbW1hbmQsIEJhdGNoV3JpdGVDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvbGliLWR5bmFtb2RiJztcbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcbmltcG9ydCAqIGFzIFhMU1ggZnJvbSAneGxzeCc7XG5pbXBvcnQgeyBkeW5hbW9EQkNsaWVudCwgdGFibGVOYW1lcyB9IGZyb20gJy4uL3V0aWxzL2R5bmFtb2RiLWNsaWVudCc7XG5pbXBvcnQgeyB0b0Jvb2xlYW4gfSBmcm9tICcuL3V0aWxzL2NvbnZlcnNpb25VdGlscyc7XG5cbmludGVyZmFjZSBUZWFjaGVyUmVjb3JkIHtcbiAgdGVhY2hlcl9pZDogc3RyaW5nO1xuICBuYW1lOiBzdHJpbmc7XG4gIHBhc3N3b3JkOiBzdHJpbmc7XG4gIHJlc3BvbnNpYmxlX2NsYXNzOiBzdHJpbmdbXTsgLy8gSlNPTiBhcnJheSBzdG9yZWQgYXMgYXJyYXkgaW4gRHluYW1vREJcbiAgbGFzdF9sb2dpbjogc3RyaW5nO1xuICBpc19hZG1pbjogYm9vbGVhbjtcbiAgY3JlYXRlZF9hdD86IHN0cmluZztcbiAgdXBkYXRlZF9hdD86IHN0cmluZztcbn1cblxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoXG4gIGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudFxuKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcbiAgdHJ5IHtcbiAgICAvLyBQYXJzZSByZXF1ZXN0IGJvZHlcbiAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShldmVudC5ib2R5IHx8ICd7fScpO1xuICAgIGNvbnN0IHsgZmlsZTogYmFzZTY0RmlsZSB9ID0gYm9keTtcblxuICAgIGlmICghYmFzZTY0RmlsZSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgICB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IFxuICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgIG1lc3NhZ2U6ICdObyBmaWxlIHVwbG9hZGVkJyBcbiAgICAgICAgfSksXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIERlY29kZSBiYXNlNjQgdG8gYnVmZmVyXG4gICAgY29uc3QgZmlsZUJ1ZmZlciA9IEJ1ZmZlci5mcm9tKGJhc2U2NEZpbGUsICdiYXNlNjQnKTtcblxuICAgIC8vIFBhcnNlIEV4Y2VsL0NTViBmaWxlXG4gICAgY29uc3Qgd29ya2Jvb2sgPSBYTFNYLnJlYWQoZmlsZUJ1ZmZlciwgeyB0eXBlOiAnYnVmZmVyJyB9KTtcbiAgICBjb25zdCBmaXJzdFNoZWV0TmFtZSA9IHdvcmtib29rLlNoZWV0TmFtZXNbMF07XG4gICAgY29uc3Qgd29ya3NoZWV0ID0gd29ya2Jvb2suU2hlZXRzW2ZpcnN0U2hlZXROYW1lXTtcbiAgICBcbiAgICAvLyBDb252ZXJ0IHRvIEpTT04sIHVzaW5nIGZpcnN0IHJvdyBhcyBoZWFkZXJzXG4gICAgY29uc3QganNvbkRhdGEgPSBYTFNYLnV0aWxzLnNoZWV0X3RvX2pzb24od29ya3NoZWV0LCB7IGhlYWRlcjogMSB9KSBhcyBhbnlbXVtdO1xuICAgIFxuICAgIC8vIFZhbGlkYXRlIGZpbGUgaGFzIGRhdGFcbiAgICBpZiAoanNvbkRhdGEubGVuZ3RoIDwgMikge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgICB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IFxuICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgIG1lc3NhZ2U6ICdGaWxlIGlzIGVtcHR5IG9yIGNvbnRhaW5zIG5vIGRhdGEgcm93cycgXG4gICAgICAgIH0pLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBFeHRyYWN0IGhlYWRlcnMgKGZpcnN0IHJvdykgYW5kIGRhdGEgcm93cyAoc2tpcCBmaXJzdCByb3cpXG4gICAgY29uc3QgaGVhZGVycyA9IGpzb25EYXRhWzBdO1xuICAgIGNvbnN0IGRhdGFSb3dzID0ganNvbkRhdGEuc2xpY2UoMSkuZmlsdGVyKHJvdyA9PiBcbiAgICAgIHJvdyAmJiByb3cubGVuZ3RoID4gMCAmJiByb3cuc29tZShjZWxsID0+IGNlbGwgIT09IG51bGwgJiYgY2VsbCAhPT0gdW5kZWZpbmVkICYmIGNlbGwgIT09ICcnKVxuICAgICk7XG5cbiAgICAvLyBWYWxpZGF0ZSBtYXhpbXVtIDQwMDAgcmVjb3Jkc1xuICAgIGlmIChkYXRhUm93cy5sZW5ndGggPiA0MDAwKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICAgICAgIH0sXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgXG4gICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgbWVzc2FnZTogYEZpbGUgY29udGFpbnMgJHtkYXRhUm93cy5sZW5ndGh9IHJlY29yZHMuIE1heGltdW0gYWxsb3dlZCBpcyA0LDAwMCByZWNvcmRzLmAgXG4gICAgICAgIH0pLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBQcm9jZXNzIHJlY29yZHMgaW4gYmF0Y2hlcyBmb3IgYmV0dGVyIHBlcmZvcm1hbmNlXG4gICAgY29uc3QgcmVzdWx0cyA9IHtcbiAgICAgIHByb2Nlc3NlZDogMCxcbiAgICAgIGluc2VydGVkOiAwLFxuICAgICAgdXBkYXRlZDogMCxcbiAgICAgIGVycm9yczogW10gYXMgc3RyaW5nW10sXG4gICAgfTtcblxuICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcbiAgICBcbiAgICAvLyBNYXAgYWxsIHJvd3MgdG8gcmVjb3JkcyBmaXJzdCwgdmFsaWRhdGluZyByZXF1aXJlZCBmaWVsZHNcbiAgICBjb25zdCBwYXJzZWRSZWNvcmRzOiBBcnJheTx7IGluZGV4OiBudW1iZXI7IHJlY29yZDogYW55IH0+ID0gW107XG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBkYXRhUm93cy5sZW5ndGg7IGkrKykge1xuICAgICAgY29uc3Qgcm93ID0gZGF0YVJvd3NbaV07XG4gICAgICBjb25zdCByZWNvcmQ6IGFueSA9IHt9O1xuICAgICAgaGVhZGVycy5mb3JFYWNoKChoZWFkZXIsIGluZGV4KSA9PiB7XG4gICAgICAgIHJlY29yZFtoZWFkZXJdID0gcm93W2luZGV4XTtcbiAgICAgIH0pO1xuXG4gICAgICAvLyBWYWxpZGF0ZSByZXF1aXJlZCBmaWVsZFxuICAgICAgaWYgKCFyZWNvcmQudGVhY2hlcl9pZCkge1xuICAgICAgICByZXN1bHRzLmVycm9ycy5wdXNoKGBSb3cgJHtpICsgMn06IE1pc3NpbmcgdGVhY2hlcl9pZGApO1xuICAgICAgICBjb250aW51ZTtcbiAgICAgIH1cblxuICAgICAgcGFyc2VkUmVjb3Jkcy5wdXNoKHsgaW5kZXg6IGksIHJlY29yZCB9KTtcbiAgICB9XG5cbiAgICAvLyBCYXRjaCBjaGVjayB3aGljaCByZWNvcmRzIGFscmVhZHkgZXhpc3QgKDI1IGl0ZW1zIHBlciBiYXRjaClcbiAgICBjb25zdCBCQVRDSF9TSVpFID0gMjU7XG4gICAgY29uc3QgZXhpc3RpbmdSZWNvcmRzTWFwID0gbmV3IE1hcDxzdHJpbmcsIFRlYWNoZXJSZWNvcmQ+KCk7XG4gICAgXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYXJzZWRSZWNvcmRzLmxlbmd0aDsgaSArPSBCQVRDSF9TSVpFKSB7XG4gICAgICBjb25zdCBiYXRjaCA9IHBhcnNlZFJlY29yZHMuc2xpY2UoaSwgaSArIEJBVENIX1NJWkUpO1xuICAgICAgY29uc3Qga2V5cyA9IGJhdGNoLm1hcCgoeyByZWNvcmQgfSkgPT4gKHsgdGVhY2hlcl9pZDogcmVjb3JkLnRlYWNoZXJfaWQgfSkpO1xuICAgICAgXG4gICAgICB0cnkge1xuICAgICAgICBjb25zdCBiYXRjaEdldENvbW1hbmQgPSBuZXcgQmF0Y2hHZXRDb21tYW5kKHtcbiAgICAgICAgICBSZXF1ZXN0SXRlbXM6IHtcbiAgICAgICAgICAgIFt0YWJsZU5hbWVzLnRlYWNoZXJzXToge1xuICAgICAgICAgICAgICBLZXlzOiBrZXlzLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9LFxuICAgICAgICB9KTtcbiAgICAgICAgXG4gICAgICAgIGNvbnN0IGJhdGNoUmVzdWx0ID0gYXdhaXQgZHluYW1vREJDbGllbnQuc2VuZChiYXRjaEdldENvbW1hbmQpO1xuICAgICAgICBjb25zdCBpdGVtcyA9IGJhdGNoUmVzdWx0LlJlc3BvbnNlcz8uW3RhYmxlTmFtZXMudGVhY2hlcnNdIHx8IFtdO1xuICAgICAgICBcbiAgICAgICAgaXRlbXMuZm9yRWFjaCgoaXRlbSkgPT4ge1xuICAgICAgICAgIGV4aXN0aW5nUmVjb3Jkc01hcC5zZXQoaXRlbS50ZWFjaGVyX2lkLCBpdGVtIGFzIFRlYWNoZXJSZWNvcmQpO1xuICAgICAgICB9KTtcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGJhdGNoIGdldHRpbmcgdGVhY2hlcnM6JywgZXJyb3IpO1xuICAgICAgICAvLyBJZiBiYXRjaCBnZXQgZmFpbHMsIGZhbGwgYmFjayB0byBpbmRpdmlkdWFsIGNoZWNrcyBmb3IgdGhpcyBiYXRjaFxuICAgICAgICBmb3IgKGNvbnN0IHsgcmVjb3JkIH0gb2YgYmF0Y2gpIHtcbiAgICAgICAgICB0cnkge1xuICAgICAgICAgICAgY29uc3QgZXhpc3RpbmcgPSBhd2FpdCBnZXRUZWFjaGVyKHJlY29yZC50ZWFjaGVyX2lkKTtcbiAgICAgICAgICAgIGlmIChleGlzdGluZykge1xuICAgICAgICAgICAgICBleGlzdGluZ1JlY29yZHNNYXAuc2V0KHJlY29yZC50ZWFjaGVyX2lkLCBleGlzdGluZyk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGBFcnJvciBnZXR0aW5nIHRlYWNoZXIgJHtyZWNvcmQudGVhY2hlcl9pZH06YCwgZXJyKTtcbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG5cbiAgICAvLyBCYXRjaCB3cml0ZSByZWNvcmRzICgyNSBpdGVtcyBwZXIgYmF0Y2gpXG4gICAgZm9yIChsZXQgaSA9IDA7IGkgPCBwYXJzZWRSZWNvcmRzLmxlbmd0aDsgaSArPSBCQVRDSF9TSVpFKSB7XG4gICAgICBjb25zdCBiYXRjaCA9IHBhcnNlZFJlY29yZHMuc2xpY2UoaSwgaSArIEJBVENIX1NJWkUpO1xuICAgICAgY29uc3QgcHV0UmVxdWVzdHM6IGFueVtdID0gW107XG4gICAgICBcbiAgICAgIGZvciAoY29uc3QgeyBpbmRleCwgcmVjb3JkIH0gb2YgYmF0Y2gpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCBleGlzdGluZ1JlY29yZCA9IGV4aXN0aW5nUmVjb3Jkc01hcC5nZXQocmVjb3JkLnRlYWNoZXJfaWQpO1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIFBhcnNlIHJlc3BvbnNpYmxlX2NsYXNzIC0gaXQgbWF5IGJlIGEgSlNPTiBzdHJpbmdcbiAgICAgICAgICBsZXQgcmVzcG9uc2libGVDbGFzczogc3RyaW5nW10gPSBbXTtcbiAgICAgICAgICBpZiAocmVjb3JkLnJlc3BvbnNpYmxlX2NsYXNzKSB7XG4gICAgICAgICAgICBpZiAodHlwZW9mIHJlY29yZC5yZXNwb25zaWJsZV9jbGFzcyA9PT0gJ3N0cmluZycpIHtcbiAgICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgICByZXNwb25zaWJsZUNsYXNzID0gSlNPTi5wYXJzZShyZWNvcmQucmVzcG9uc2libGVfY2xhc3MpO1xuICAgICAgICAgICAgICB9IGNhdGNoIHtcbiAgICAgICAgICAgICAgICAvLyBJZiBub3QgdmFsaWQgSlNPTiwgdHJlYXQgYXMgc2luZ2xlIGNsYXNzXG4gICAgICAgICAgICAgICAgcmVzcG9uc2libGVDbGFzcyA9IFtyZWNvcmQucmVzcG9uc2libGVfY2xhc3NdO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkocmVjb3JkLnJlc3BvbnNpYmxlX2NsYXNzKSkge1xuICAgICAgICAgICAgICByZXNwb25zaWJsZUNsYXNzID0gcmVjb3JkLnJlc3BvbnNpYmxlX2NsYXNzO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIFByZXBhcmUgdGVhY2hlciByZWNvcmRcbiAgICAgICAgICBjb25zdCB0ZWFjaGVyUmVjb3JkOiBUZWFjaGVyUmVjb3JkID0ge1xuICAgICAgICAgICAgdGVhY2hlcl9pZDogcmVjb3JkLnRlYWNoZXJfaWQsXG4gICAgICAgICAgICBuYW1lOiByZWNvcmQubmFtZSB8fCAnJyxcbiAgICAgICAgICAgIHBhc3N3b3JkOiByZWNvcmQucGFzc3dvcmQgfHwgJycsXG4gICAgICAgICAgICByZXNwb25zaWJsZV9jbGFzczogcmVzcG9uc2libGVDbGFzcyxcbiAgICAgICAgICAgIGxhc3RfbG9naW46IHJlY29yZC5sYXN0X2xvZ2luIHx8IG5vdyxcbiAgICAgICAgICAgIGlzX2FkbWluOiB0b0Jvb2xlYW4ocmVjb3JkLmlzX2FkbWluLCBmYWxzZSksXG4gICAgICAgICAgICBjcmVhdGVkX2F0OiBleGlzdGluZ1JlY29yZCA/IGV4aXN0aW5nUmVjb3JkLmNyZWF0ZWRfYXQgOiBub3csXG4gICAgICAgICAgICB1cGRhdGVkX2F0OiBub3csXG4gICAgICAgICAgfTtcblxuICAgICAgICAgIC8vIENoZWNrIGlmIGRhdGEgaGFzIGFjdHVhbGx5IGNoYW5nZWRcbiAgICAgICAgICBsZXQgaGFzQ2hhbmdlcyA9ICFleGlzdGluZ1JlY29yZDtcbiAgICAgICAgICBpZiAoZXhpc3RpbmdSZWNvcmQpIHtcbiAgICAgICAgICAgIGhhc0NoYW5nZXMgPSAoXG4gICAgICAgICAgICAgIHRlYWNoZXJSZWNvcmQubmFtZSAhPT0gZXhpc3RpbmdSZWNvcmQubmFtZSB8fFxuICAgICAgICAgICAgICB0ZWFjaGVyUmVjb3JkLnBhc3N3b3JkICE9PSBleGlzdGluZ1JlY29yZC5wYXNzd29yZCB8fFxuICAgICAgICAgICAgICBKU09OLnN0cmluZ2lmeSh0ZWFjaGVyUmVjb3JkLnJlc3BvbnNpYmxlX2NsYXNzKSAhPT0gSlNPTi5zdHJpbmdpZnkoZXhpc3RpbmdSZWNvcmQucmVzcG9uc2libGVfY2xhc3MpIHx8XG4gICAgICAgICAgICAgIHRlYWNoZXJSZWNvcmQuaXNfYWRtaW4gIT09IGV4aXN0aW5nUmVjb3JkLmlzX2FkbWluXG4gICAgICAgICAgICApO1xuICAgICAgICAgIH1cblxuICAgICAgICAgIC8vIE9ubHkgdXBkYXRlIHRpbWVzdGFtcHMgaWYgdGhlcmUgYXJlIGFjdHVhbCBjaGFuZ2VzXG4gICAgICAgICAgaWYgKCFoYXNDaGFuZ2VzICYmIGV4aXN0aW5nUmVjb3JkKSB7XG4gICAgICAgICAgICB0ZWFjaGVyUmVjb3JkLnVwZGF0ZWRfYXQgPSBleGlzdGluZ1JlY29yZC51cGRhdGVkX2F0O1xuICAgICAgICAgIH1cblxuICAgICAgICAgIHB1dFJlcXVlc3RzLnB1c2goe1xuICAgICAgICAgICAgUHV0UmVxdWVzdDoge1xuICAgICAgICAgICAgICBJdGVtOiB0ZWFjaGVyUmVjb3JkLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBcbiAgICAgICAgICBpZiAoZXhpc3RpbmdSZWNvcmQpIHtcbiAgICAgICAgICAgIHJlc3VsdHMudXBkYXRlZCsrO1xuICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXN1bHRzLmluc2VydGVkKys7XG4gICAgICAgICAgfVxuICAgICAgICAgIHJlc3VsdHMucHJvY2Vzc2VkKys7XG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICAgICAgcmVzdWx0cy5lcnJvcnMucHVzaChgUm93ICR7aW5kZXggKyAyfTogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJ31gKTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgICAgXG4gICAgICAvLyBFeGVjdXRlIGJhdGNoIHdyaXRlXG4gICAgICBpZiAocHV0UmVxdWVzdHMubGVuZ3RoID4gMCkge1xuICAgICAgICB0cnkge1xuICAgICAgICAgIGNvbnN0IGJhdGNoV3JpdGVDb21tYW5kID0gbmV3IEJhdGNoV3JpdGVDb21tYW5kKHtcbiAgICAgICAgICAgIFJlcXVlc3RJdGVtczoge1xuICAgICAgICAgICAgICBbdGFibGVOYW1lcy50ZWFjaGVyc106IHB1dFJlcXVlc3RzLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICB9KTtcbiAgICAgICAgICBcbiAgICAgICAgICBhd2FpdCBkeW5hbW9EQkNsaWVudC5zZW5kKGJhdGNoV3JpdGVDb21tYW5kKTtcbiAgICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBiYXRjaCB3cml0aW5nIHRlYWNoZXJzOicsIGVycm9yKTtcbiAgICAgICAgICAvLyBJZiBiYXRjaCB3cml0ZSBmYWlscywgZmFsbCBiYWNrIHRvIGluZGl2aWR1YWwgd3JpdGVzIGZvciB0aGlzIGJhdGNoXG4gICAgICAgICAgZm9yIChsZXQgaiA9IDA7IGogPCBwdXRSZXF1ZXN0cy5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgY29uc3QgcmVxdWVzdCA9IHB1dFJlcXVlc3RzW2pdO1xuICAgICAgICAgICAgdHJ5IHtcbiAgICAgICAgICAgICAgYXdhaXQgcHV0VGVhY2hlcihyZXF1ZXN0LlB1dFJlcXVlc3QuSXRlbSk7XG4gICAgICAgICAgICB9IGNhdGNoIChlcnIpIHtcbiAgICAgICAgICAgICAgY29uc3QgdGVhY2hlcklkID0gcmVxdWVzdC5QdXRSZXF1ZXN0Lkl0ZW0udGVhY2hlcl9pZDtcbiAgICAgICAgICAgICAgY29uc3QgZXJyb3JNc2cgPSBlcnIgaW5zdGFuY2VvZiBFcnJvciA/IGVyci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InO1xuICAgICAgICAgICAgICBjb25zb2xlLmVycm9yKGBFcnJvciB3cml0aW5nIHRlYWNoZXIgJHt0ZWFjaGVySWR9OmAsIGVycik7XG4gICAgICAgICAgICAgIHJlc3VsdHMuZXJyb3JzLnB1c2goYFRlYWNoZXIgJHt0ZWFjaGVySWR9OiAke2Vycm9yTXNnfWApO1xuICAgICAgICAgICAgICAvLyBBZGp1c3QgY291bnRzIHNpbmNlIHRoaXMgaXRlbSBmYWlsZWRcbiAgICAgICAgICAgICAgaWYgKGV4aXN0aW5nUmVjb3Jkc01hcC5oYXModGVhY2hlcklkKSkge1xuICAgICAgICAgICAgICAgIHJlc3VsdHMudXBkYXRlZC0tO1xuICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJlc3VsdHMuaW5zZXJ0ZWQtLTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICByZXN1bHRzLnByb2Nlc3NlZC0tO1xuICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgICAgfVxuICAgIH1cblxuICAgIC8vIENoZWNrIGlmIGFueSByZWNvcmRzIHdlcmUgc3VjY2Vzc2Z1bGx5IHByb2Nlc3NlZFxuICAgIGlmIChyZXN1bHRzLnByb2Nlc3NlZCA9PT0gMCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgICB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgbWVzc2FnZTogJ0ZhaWxlZCB0byB1cGxvYWQgdGVhY2hlciBkYXRhLiBObyByZWNvcmRzIHdlcmUgc3VjY2Vzc2Z1bGx5IHByb2Nlc3NlZC4nLFxuICAgICAgICAgIGVycm9yczogcmVzdWx0cy5lcnJvcnMubGVuZ3RoID4gMCA/IHJlc3VsdHMuZXJyb3JzIDogWydVbmtub3duIGVycm9yIG9jY3VycmVkIGR1cmluZyB1cGxvYWQnXSxcbiAgICAgICAgfSksXG4gICAgICB9O1xuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICAgICB9LFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICBtZXNzYWdlOiBgU3VjY2Vzc2Z1bGx5IHByb2Nlc3NlZCAke3Jlc3VsdHMucHJvY2Vzc2VkfSB0ZWFjaGVycyAoJHtyZXN1bHRzLmluc2VydGVkfSBpbnNlcnRlZCwgJHtyZXN1bHRzLnVwZGF0ZWR9IHVwZGF0ZWQpYCxcbiAgICAgICAgcHJvY2Vzc2VkOiByZXN1bHRzLnByb2Nlc3NlZCxcbiAgICAgICAgaW5zZXJ0ZWQ6IHJlc3VsdHMuaW5zZXJ0ZWQsXG4gICAgICAgIHVwZGF0ZWQ6IHJlc3VsdHMudXBkYXRlZCxcbiAgICAgICAgZXJyb3JzOiByZXN1bHRzLmVycm9ycy5sZW5ndGggPiAwID8gcmVzdWx0cy5lcnJvcnMgOiB1bmRlZmluZWQsXG4gICAgICB9KSxcbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yOicsIGVycm9yKTtcbiAgICByZXR1cm4ge1xuICAgICAgc3RhdHVzQ29kZTogNTAwLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgXG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICBtZXNzYWdlOiAnSW50ZXJuYWwgc2VydmVyIGVycm9yJyxcbiAgICAgICAgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InXG4gICAgICB9KSxcbiAgICB9O1xuICB9XG59O1xuXG5hc3luYyBmdW5jdGlvbiBnZXRUZWFjaGVyKHRlYWNoZXJJZDogc3RyaW5nKSB7XG4gIHRyeSB7XG4gICAgY29uc3QgY29tbWFuZCA9IG5ldyBHZXRDb21tYW5kKHtcbiAgICAgIFRhYmxlTmFtZTogdGFibGVOYW1lcy50ZWFjaGVycyxcbiAgICAgIEtleTogeyB0ZWFjaGVyX2lkOiB0ZWFjaGVySWQgfSxcbiAgICB9KTtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBkeW5hbW9EQkNsaWVudC5zZW5kKGNvbW1hbmQpO1xuICAgIHJldHVybiByZXN1bHQuSXRlbSBhcyBUZWFjaGVyUmVjb3JkIHwgdW5kZWZpbmVkO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGdldHRpbmcgdGVhY2hlciAke3RlYWNoZXJJZH06YCwgZXJyb3IpO1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gcHV0VGVhY2hlcih0ZWFjaGVyOiBUZWFjaGVyUmVjb3JkKSB7XG4gIGNvbnN0IGNvbW1hbmQgPSBuZXcgUHV0Q29tbWFuZCh7XG4gICAgVGFibGVOYW1lOiB0YWJsZU5hbWVzLnRlYWNoZXJzLFxuICAgIEl0ZW06IHRlYWNoZXIsXG4gIH0pO1xuICBhd2FpdCBkeW5hbW9EQkNsaWVudC5zZW5kKGNvbW1hbmQpO1xufVxuIl19