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
        // Process each row - upsert (update if exists, insert if new)
        const results = {
            processed: 0,
            inserted: 0,
            updated: 0,
            errors: [],
        };
        for (let i = 0; i < dataRows.length; i++) {
            const row = dataRows[i];
            try {
                // Map row data to object using headers
                const record = {};
                headers.forEach((header, index) => {
                    record[header] = row[index];
                });
                // Validate required field
                if (!record.game_id) {
                    results.errors.push(`Row ${i + 2}: Missing game_id`);
                    continue;
                }
                // Check if record exists
                const existingRecord = await getGame(record.game_id);
                const now = new Date().toISOString();
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
                // Upsert record
                await putGame(gameRecord);
                if (existingRecord) {
                    results.updated++;
                }
                else {
                    results.inserted++;
                }
                results.processed++;
            }
            catch (error) {
                results.errors.push(`Row ${i + 2}: ${error instanceof Error ? error.message : 'Unknown error'}`);
            }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2FtZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnYW1lcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFFSCx3REFBK0Q7QUFFL0QsNkJBQTZCO0FBQzdCLDhEQUFzRTtBQWlCL0QsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUMxQixLQUEyQixFQUNLLEVBQUU7SUFDbEMsSUFBSSxDQUFDO1FBQ0gscUJBQXFCO1FBQ3JCLE1BQU0sSUFBSSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQztRQUM1QyxNQUFNLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxHQUFHLElBQUksQ0FBQztRQUVsQyxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDaEIsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUU7b0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtvQkFDbEMsNkJBQTZCLEVBQUUsR0FBRztpQkFDbkM7Z0JBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7b0JBQ25CLE9BQU8sRUFBRSxLQUFLO29CQUNkLE9BQU8sRUFBRSxrQkFBa0I7aUJBQzVCLENBQUM7YUFDSCxDQUFDO1FBQ0osQ0FBQztRQUVELDBCQUEwQjtRQUMxQixNQUFNLFVBQVUsR0FBRyxNQUFNLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxRQUFRLENBQUMsQ0FBQztRQUVyRCx1QkFBdUI7UUFDdkIsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLElBQUksQ0FBQyxVQUFVLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUMzRCxNQUFNLGNBQWMsR0FBRyxRQUFRLENBQUMsVUFBVSxDQUFDLENBQUMsQ0FBQyxDQUFDO1FBQzlDLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLENBQUM7UUFFbEQsOENBQThD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Q0FBQyxDQUFDO0FBL0pXLFFBQUEsT0FBTyxXQStKbEI7QUFFRixLQUFLLFVBQVUsT0FBTyxDQUFDLE1BQWM7SUFDbkMsSUFBSSxDQUFDO1FBQ0gsTUFBTSxPQUFPLEdBQUcsSUFBSSx5QkFBVSxDQUFDO1lBQzdCLFNBQVMsRUFBRSw0QkFBVSxDQUFDLEtBQUs7WUFDM0IsR0FBRyxFQUFFLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRTtTQUN6QixDQUFDLENBQUM7UUFDSCxNQUFNLE1BQU0sR0FBRyxNQUFNLGdDQUFjLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1FBQ2xELE9BQU8sTUFBTSxDQUFDLElBQThCLENBQUM7SUFDL0MsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLHNCQUFzQixNQUFNLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUN0RCxPQUFPLFNBQVMsQ0FBQztJQUNuQixDQUFDO0FBQ0gsQ0FBQztBQUVELEtBQUssVUFBVSxPQUFPLENBQUMsSUFBZ0I7SUFDckMsTUFBTSxPQUFPLEdBQUcsSUFBSSx5QkFBVSxDQUFDO1FBQzdCLFNBQVMsRUFBRSw0QkFBVSxDQUFDLEtBQUs7UUFDM0IsSUFBSSxFQUFFLElBQUk7S0FDWCxDQUFDLENBQUM7SUFDSCxNQUFNLGdDQUFjLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ3JDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFVwbG9hZCBHYW1lcyBMYW1iZGEgSGFuZGxlclxuICogSGFuZGxlcyBFeGNlbC9DU1YgZmlsZSB1cGxvYWRzIGZvciBnYW1lIGRhdGFcbiAqIC0gU2tpcHMgaGVhZGVyIHJvd1xuICogLSBVcHNlcnRzIHJlY29yZHMgYmFzZWQgb24gZ2FtZV9pZFxuICogLSBObyBkZWxldGUgZnVuY3Rpb25hbGl0eVxuICovXG5cbmltcG9ydCB7IFB1dENvbW1hbmQsIEdldENvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0ICogYXMgWExTWCBmcm9tICd4bHN4JztcbmltcG9ydCB7IGR5bmFtb0RCQ2xpZW50LCB0YWJsZU5hbWVzIH0gZnJvbSAnLi4vdXRpbHMvZHluYW1vZGItY2xpZW50JztcblxuaW50ZXJmYWNlIEdhbWVSZWNvcmQge1xuICBnYW1lX2lkOiBzdHJpbmc7XG4gIGdhbWVfbmFtZTogc3RyaW5nO1xuICBzdHVkZW50X2lkOiBzdHJpbmc7XG4gIHN1YmplY3Q6IHN0cmluZztcbiAgZGlmZmljdWx0eTogc3RyaW5nO1xuICB0ZWFjaGVyX2lkOiBzdHJpbmc7XG4gIGxhc3RfdXBkYXRlOiBzdHJpbmc7XG4gIHNjcmF0Y2hfaWQ6IHN0cmluZztcbiAgc2NyYXRjaF9hcGk6IHN0cmluZztcbiAgYWNjdW11bGF0ZWRfY2xpY2s6IG51bWJlcjtcbiAgY3JlYXRlZF9hdD86IHN0cmluZztcbiAgdXBkYXRlZF9hdD86IHN0cmluZztcbn1cblxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoXG4gIGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudFxuKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcbiAgdHJ5IHtcbiAgICAvLyBQYXJzZSByZXF1ZXN0IGJvZHlcbiAgICBjb25zdCBib2R5ID0gSlNPTi5wYXJzZShldmVudC5ib2R5IHx8ICd7fScpO1xuICAgIGNvbnN0IHsgZmlsZTogYmFzZTY0RmlsZSB9ID0gYm9keTtcblxuICAgIGlmICghYmFzZTY0RmlsZSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgICB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IFxuICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgIG1lc3NhZ2U6ICdObyBmaWxlIHVwbG9hZGVkJyBcbiAgICAgICAgfSksXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIERlY29kZSBiYXNlNjQgdG8gYnVmZmVyXG4gICAgY29uc3QgZmlsZUJ1ZmZlciA9IEJ1ZmZlci5mcm9tKGJhc2U2NEZpbGUsICdiYXNlNjQnKTtcblxuICAgIC8vIFBhcnNlIEV4Y2VsL0NTViBmaWxlXG4gICAgY29uc3Qgd29ya2Jvb2sgPSBYTFNYLnJlYWQoZmlsZUJ1ZmZlciwgeyB0eXBlOiAnYnVmZmVyJyB9KTtcbiAgICBjb25zdCBmaXJzdFNoZWV0TmFtZSA9IHdvcmtib29rLlNoZWV0TmFtZXNbMF07XG4gICAgY29uc3Qgd29ya3NoZWV0ID0gd29ya2Jvb2suU2hlZXRzW2ZpcnN0U2hlZXROYW1lXTtcbiAgICBcbiAgICAvLyBDb252ZXJ0IHRvIEpTT04sIHVzaW5nIGZpcnN0IHJvdyBhcyBoZWFkZXJzXG4gICAgY29uc3QganNvbkRhdGEgPSBYTFNYLnV0aWxzLnNoZWV0X3RvX2pzb24od29ya3NoZWV0LCB7IGhlYWRlcjogMSB9KSBhcyBhbnlbXVtdO1xuICAgIFxuICAgIC8vIFZhbGlkYXRlIGZpbGUgaGFzIGRhdGFcbiAgICBpZiAoanNvbkRhdGEubGVuZ3RoIDwgMikge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgICB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IFxuICAgICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICAgIG1lc3NhZ2U6ICdGaWxlIGlzIGVtcHR5IG9yIGNvbnRhaW5zIG5vIGRhdGEgcm93cycgXG4gICAgICAgIH0pLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBFeHRyYWN0IGhlYWRlcnMgKGZpcnN0IHJvdykgYW5kIGRhdGEgcm93cyAoc2tpcCBmaXJzdCByb3cpXG4gICAgY29uc3QgaGVhZGVycyA9IGpzb25EYXRhWzBdO1xuICAgIGNvbnN0IGRhdGFSb3dzID0ganNvbkRhdGEuc2xpY2UoMSkuZmlsdGVyKHJvdyA9PiBcbiAgICAgIHJvdyAmJiByb3cubGVuZ3RoID4gMCAmJiByb3cuc29tZShjZWxsID0+IGNlbGwgIT09IG51bGwgJiYgY2VsbCAhPT0gdW5kZWZpbmVkICYmIGNlbGwgIT09ICcnKVxuICAgICk7XG5cbiAgICAvLyBWYWxpZGF0ZSBtYXhpbXVtIDQwMDAgcmVjb3Jkc1xuICAgIGlmIChkYXRhUm93cy5sZW5ndGggPiA0MDAwKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICAgICAgIH0sXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgXG4gICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgbWVzc2FnZTogYEZpbGUgY29udGFpbnMgJHtkYXRhUm93cy5sZW5ndGh9IHJlY29yZHMuIE1heGltdW0gYWxsb3dlZCBpcyA0LDAwMCByZWNvcmRzLmAgXG4gICAgICAgIH0pLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBQcm9jZXNzIGVhY2ggcm93IC0gdXBzZXJ0ICh1cGRhdGUgaWYgZXhpc3RzLCBpbnNlcnQgaWYgbmV3KVxuICAgIGNvbnN0IHJlc3VsdHMgPSB7XG4gICAgICBwcm9jZXNzZWQ6IDAsXG4gICAgICBpbnNlcnRlZDogMCxcbiAgICAgIHVwZGF0ZWQ6IDAsXG4gICAgICBlcnJvcnM6IFtdIGFzIHN0cmluZ1tdLFxuICAgIH07XG5cbiAgICBmb3IgKGxldCBpID0gMDsgaSA8IGRhdGFSb3dzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjb25zdCByb3cgPSBkYXRhUm93c1tpXTtcbiAgICAgIFxuICAgICAgdHJ5IHtcbiAgICAgICAgLy8gTWFwIHJvdyBkYXRhIHRvIG9iamVjdCB1c2luZyBoZWFkZXJzXG4gICAgICAgIGNvbnN0IHJlY29yZDogYW55ID0ge307XG4gICAgICAgIGhlYWRlcnMuZm9yRWFjaCgoaGVhZGVyLCBpbmRleCkgPT4ge1xuICAgICAgICAgIHJlY29yZFtoZWFkZXJdID0gcm93W2luZGV4XTtcbiAgICAgICAgfSk7XG5cbiAgICAgICAgLy8gVmFsaWRhdGUgcmVxdWlyZWQgZmllbGRcbiAgICAgICAgaWYgKCFyZWNvcmQuZ2FtZV9pZCkge1xuICAgICAgICAgIHJlc3VsdHMuZXJyb3JzLnB1c2goYFJvdyAke2kgKyAyfTogTWlzc2luZyBnYW1lX2lkYCk7XG4gICAgICAgICAgY29udGludWU7XG4gICAgICAgIH1cblxuICAgICAgICAvLyBDaGVjayBpZiByZWNvcmQgZXhpc3RzXG4gICAgICAgIGNvbnN0IGV4aXN0aW5nUmVjb3JkID0gYXdhaXQgZ2V0R2FtZShyZWNvcmQuZ2FtZV9pZCk7XG4gICAgICAgIGNvbnN0IG5vdyA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcblxuICAgICAgICAvLyBQcmVwYXJlIGdhbWUgcmVjb3JkXG4gICAgICAgIGNvbnN0IGdhbWVSZWNvcmQ6IEdhbWVSZWNvcmQgPSB7XG4gICAgICAgICAgZ2FtZV9pZDogcmVjb3JkLmdhbWVfaWQsXG4gICAgICAgICAgZ2FtZV9uYW1lOiByZWNvcmQuZ2FtZV9uYW1lIHx8ICcnLFxuICAgICAgICAgIHN0dWRlbnRfaWQ6IHJlY29yZC5zdHVkZW50X2lkIHx8ICcnLFxuICAgICAgICAgIHN1YmplY3Q6IHJlY29yZC5zdWJqZWN0IHx8ICcnLFxuICAgICAgICAgIGRpZmZpY3VsdHk6IHJlY29yZC5kaWZmaWN1bHR5IHx8ICcnLFxuICAgICAgICAgIHRlYWNoZXJfaWQ6IHJlY29yZC50ZWFjaGVyX2lkIHx8ICcnLFxuICAgICAgICAgIGxhc3RfdXBkYXRlOiBub3csXG4gICAgICAgICAgc2NyYXRjaF9pZDogcmVjb3JkLnNjcmF0Y2hfaWQgfHwgJycsXG4gICAgICAgICAgc2NyYXRjaF9hcGk6IHJlY29yZC5zY3JhdGNoX2FwaSB8fCAnJyxcbiAgICAgICAgICBhY2N1bXVsYXRlZF9jbGljazogZXhpc3RpbmdSZWNvcmQgXG4gICAgICAgICAgICA/IGV4aXN0aW5nUmVjb3JkLmFjY3VtdWxhdGVkX2NsaWNrIFxuICAgICAgICAgICAgOiAodHlwZW9mIHJlY29yZC5hY2N1bXVsYXRlZF9jbGljayA9PT0gJ251bWJlcicgPyByZWNvcmQuYWNjdW11bGF0ZWRfY2xpY2sgOiAwKSxcbiAgICAgICAgICBjcmVhdGVkX2F0OiBleGlzdGluZ1JlY29yZCA/IGV4aXN0aW5nUmVjb3JkLmNyZWF0ZWRfYXQgOiBub3csXG4gICAgICAgICAgdXBkYXRlZF9hdDogbm93LFxuICAgICAgICB9O1xuXG4gICAgICAgIC8vIFVwc2VydCByZWNvcmRcbiAgICAgICAgYXdhaXQgcHV0R2FtZShnYW1lUmVjb3JkKTtcbiAgICAgICAgXG4gICAgICAgIGlmIChleGlzdGluZ1JlY29yZCkge1xuICAgICAgICAgIHJlc3VsdHMudXBkYXRlZCsrO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJlc3VsdHMuaW5zZXJ0ZWQrKztcbiAgICAgICAgfVxuICAgICAgICByZXN1bHRzLnByb2Nlc3NlZCsrO1xuICAgICAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICAgICAgcmVzdWx0cy5lcnJvcnMucHVzaChgUm93ICR7aSArIDJ9OiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InfWApO1xuICAgICAgfVxuICAgIH1cblxuICAgIHJldHVybiB7XG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICAgICB9LFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICBtZXNzYWdlOiBgU3VjY2Vzc2Z1bGx5IHByb2Nlc3NlZCAke3Jlc3VsdHMucHJvY2Vzc2VkfSBnYW1lcyAoJHtyZXN1bHRzLmluc2VydGVkfSBpbnNlcnRlZCwgJHtyZXN1bHRzLnVwZGF0ZWR9IHVwZGF0ZWQpYCxcbiAgICAgICAgcHJvY2Vzc2VkOiByZXN1bHRzLnByb2Nlc3NlZCxcbiAgICAgICAgaW5zZXJ0ZWQ6IHJlc3VsdHMuaW5zZXJ0ZWQsXG4gICAgICAgIHVwZGF0ZWQ6IHJlc3VsdHMudXBkYXRlZCxcbiAgICAgICAgZXJyb3JzOiByZXN1bHRzLmVycm9ycy5sZW5ndGggPiAwID8gcmVzdWx0cy5lcnJvcnMgOiB1bmRlZmluZWQsXG4gICAgICB9KSxcbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yOicsIGVycm9yKTtcbiAgICByZXR1cm4ge1xuICAgICAgc3RhdHVzQ29kZTogNTAwLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgXG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICBtZXNzYWdlOiAnSW50ZXJuYWwgc2VydmVyIGVycm9yJyxcbiAgICAgICAgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InXG4gICAgICB9KSxcbiAgICB9O1xuICB9XG59O1xuXG5hc3luYyBmdW5jdGlvbiBnZXRHYW1lKGdhbWVJZDogc3RyaW5nKSB7XG4gIHRyeSB7XG4gICAgY29uc3QgY29tbWFuZCA9IG5ldyBHZXRDb21tYW5kKHtcbiAgICAgIFRhYmxlTmFtZTogdGFibGVOYW1lcy5nYW1lcyxcbiAgICAgIEtleTogeyBnYW1lX2lkOiBnYW1lSWQgfSxcbiAgICB9KTtcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBkeW5hbW9EQkNsaWVudC5zZW5kKGNvbW1hbmQpO1xuICAgIHJldHVybiByZXN1bHQuSXRlbSBhcyBHYW1lUmVjb3JkIHwgdW5kZWZpbmVkO1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGdldHRpbmcgZ2FtZSAke2dhbWVJZH06YCwgZXJyb3IpO1xuICAgIHJldHVybiB1bmRlZmluZWQ7XG4gIH1cbn1cblxuYXN5bmMgZnVuY3Rpb24gcHV0R2FtZShnYW1lOiBHYW1lUmVjb3JkKSB7XG4gIGNvbnN0IGNvbW1hbmQgPSBuZXcgUHV0Q29tbWFuZCh7XG4gICAgVGFibGVOYW1lOiB0YWJsZU5hbWVzLmdhbWVzLFxuICAgIEl0ZW06IGdhbWUsXG4gIH0pO1xuICBhd2FpdCBkeW5hbW9EQkNsaWVudC5zZW5kKGNvbW1hbmQpO1xufVxuIl19