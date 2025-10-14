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
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const XLSX = require("xlsx");
const client = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
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
            TableName: process.env.GAMES_TABLE_NAME || 'ho-yu-games',
            Key: { game_id: gameId },
        });
        const result = await docClient.send(command);
        return result.Item;
    }
    catch (error) {
        console.error(`Error getting game ${gameId}:`, error);
        return undefined;
    }
}
async function putGame(game) {
    const command = new lib_dynamodb_1.PutCommand({
        TableName: process.env.GAMES_TABLE_NAME || 'ho-yu-games',
        Item: game,
    });
    await docClient.send(command);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2FtZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnYW1lcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFFSCw4REFBMEQ7QUFDMUQsd0RBQXVGO0FBRXZGLDZCQUE2QjtBQUU3QixNQUFNLE1BQU0sR0FBRyxJQUFJLGdDQUFjLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDdEMsTUFBTSxTQUFTLEdBQUcscUNBQXNCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBaUIvQyxNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQzFCLEtBQTJCLEVBQ0ssRUFBRTtJQUNsQyxJQUFJLENBQUM7UUFDSCxxQkFBcUI7UUFDckIsTUFBTSxJQUFJLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxJQUFJLElBQUksQ0FBQyxDQUFDO1FBQzVDLE1BQU0sRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLEdBQUcsSUFBSSxDQUFDO1FBRWxDLElBQUksQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUNoQixPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLE9BQU8sRUFBRTtvQkFDUCxjQUFjLEVBQUUsa0JBQWtCO29CQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2lCQUNuQztnQkFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztvQkFDbkIsT0FBTyxFQUFFLEtBQUs7b0JBQ2QsT0FBTyxFQUFFLGtCQUFrQjtpQkFDNUIsQ0FBQzthQUNILENBQUM7UUFDSixDQUFDO1FBRUQsMEJBQTBCO1FBQzFCLE1BQU0sVUFBVSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFDO1FBRXJELHVCQUF1QjtRQUN2QixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsSUFBSSxDQUFDLFVBQVUsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsQ0FBQyxDQUFDO1FBQzNELE1BQU0sY0FB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QUFLLEVBQUUsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsZUFBZTthQUNoRSxDQUFDO1NBQ0gsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDLENBQUM7QUEvSlcsUUFBQSxPQUFPLFdBK0psQjtBQUVGLEtBQUssVUFBVSxPQUFPLENBQUMsTUFBYztJQUNuQyxJQUFJLENBQUM7UUFDSCxNQUFNLE9BQU8sR0FBRyxJQUFJLHlCQUFVLENBQUM7WUFDN0IsU0FBUyxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLElBQUksYUFBYTtZQUN4RCxHQUFHLEVBQUUsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFO1NBQ3pCLENBQUMsQ0FBQztRQUNILE1BQU0sTUFBTSxHQUFHLE1BQU0sU0FBUyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUM3QyxPQUFPLE1BQU0sQ0FBQyxJQUE4QixDQUFDO0lBQy9DLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxzQkFBc0IsTUFBTSxHQUFHLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdEQsT0FBTyxTQUFTLENBQUM7SUFDbkIsQ0FBQztBQUNILENBQUM7QUFFRCxLQUFLLFVBQVUsT0FBTyxDQUFDLElBQWdCO0lBQ3JDLE1BQU0sT0FBTyxHQUFHLElBQUkseUJBQVUsQ0FBQztRQUM3QixTQUFTLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0IsSUFBSSxhQUFhO1FBQ3hELElBQUksRUFBRSxJQUFJO0tBQ1gsQ0FBQyxDQUFDO0lBQ0gsTUFBTSxTQUFTLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0FBQ2hDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIFVwbG9hZCBHYW1lcyBMYW1iZGEgSGFuZGxlclxuICogSGFuZGxlcyBFeGNlbC9DU1YgZmlsZSB1cGxvYWRzIGZvciBnYW1lIGRhdGFcbiAqIC0gU2tpcHMgaGVhZGVyIHJvd1xuICogLSBVcHNlcnRzIHJlY29yZHMgYmFzZWQgb24gZ2FtZV9pZFxuICogLSBObyBkZWxldGUgZnVuY3Rpb25hbGl0eVxuICovXG5cbmltcG9ydCB7IER5bmFtb0RCQ2xpZW50IH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJztcbmltcG9ydCB7IER5bmFtb0RCRG9jdW1lbnRDbGllbnQsIFB1dENvbW1hbmQsIEdldENvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0ICogYXMgWExTWCBmcm9tICd4bHN4JztcblxuY29uc3QgY2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHt9KTtcbmNvbnN0IGRvY0NsaWVudCA9IER5bmFtb0RCRG9jdW1lbnRDbGllbnQuZnJvbShjbGllbnQpO1xuXG5pbnRlcmZhY2UgR2FtZVJlY29yZCB7XG4gIGdhbWVfaWQ6IHN0cmluZztcbiAgZ2FtZV9uYW1lOiBzdHJpbmc7XG4gIHN0dWRlbnRfaWQ6IHN0cmluZztcbiAgc3ViamVjdDogc3RyaW5nO1xuICBkaWZmaWN1bHR5OiBzdHJpbmc7XG4gIHRlYWNoZXJfaWQ6IHN0cmluZztcbiAgbGFzdF91cGRhdGU6IHN0cmluZztcbiAgc2NyYXRjaF9pZDogc3RyaW5nO1xuICBzY3JhdGNoX2FwaTogc3RyaW5nO1xuICBhY2N1bXVsYXRlZF9jbGljazogbnVtYmVyO1xuICBjcmVhdGVkX2F0Pzogc3RyaW5nO1xuICB1cGRhdGVkX2F0Pzogc3RyaW5nO1xufVxuXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChcbiAgZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50XG4pOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xuICB0cnkge1xuICAgIC8vIFBhcnNlIHJlcXVlc3QgYm9keVxuICAgIGNvbnN0IGJvZHkgPSBKU09OLnBhcnNlKGV2ZW50LmJvZHkgfHwgJ3t9Jyk7XG4gICAgY29uc3QgeyBmaWxlOiBiYXNlNjRGaWxlIH0gPSBib2R5O1xuXG4gICAgaWYgKCFiYXNlNjRGaWxlKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICAgICAgIH0sXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgXG4gICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgbWVzc2FnZTogJ05vIGZpbGUgdXBsb2FkZWQnIFxuICAgICAgICB9KSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gRGVjb2RlIGJhc2U2NCB0byBidWZmZXJcbiAgICBjb25zdCBmaWxlQnVmZmVyID0gQnVmZmVyLmZyb20oYmFzZTY0RmlsZSwgJ2Jhc2U2NCcpO1xuXG4gICAgLy8gUGFyc2UgRXhjZWwvQ1NWIGZpbGVcbiAgICBjb25zdCB3b3JrYm9vayA9IFhMU1gucmVhZChmaWxlQnVmZmVyLCB7IHR5cGU6ICdidWZmZXInIH0pO1xuICAgIGNvbnN0IGZpcnN0U2hlZXROYW1lID0gd29ya2Jvb2suU2hlZXROYW1lc1swXTtcbiAgICBjb25zdCB3b3Jrc2hlZXQgPSB3b3JrYm9vay5TaGVldHNbZmlyc3RTaGVldE5hbWVdO1xuICAgIFxuICAgIC8vIENvbnZlcnQgdG8gSlNPTiwgdXNpbmcgZmlyc3Qgcm93IGFzIGhlYWRlcnNcbiAgICBjb25zdCBqc29uRGF0YSA9IFhMU1gudXRpbHMuc2hlZXRfdG9fanNvbih3b3Jrc2hlZXQsIHsgaGVhZGVyOiAxIH0pIGFzIGFueVtdW107XG4gICAgXG4gICAgLy8gVmFsaWRhdGUgZmlsZSBoYXMgZGF0YVxuICAgIGlmIChqc29uRGF0YS5sZW5ndGggPCAyKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICAgICAgIH0sXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgXG4gICAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgICAgbWVzc2FnZTogJ0ZpbGUgaXMgZW1wdHkgb3IgY29udGFpbnMgbm8gZGF0YSByb3dzJyBcbiAgICAgICAgfSksXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIEV4dHJhY3QgaGVhZGVycyAoZmlyc3Qgcm93KSBhbmQgZGF0YSByb3dzIChza2lwIGZpcnN0IHJvdylcbiAgICBjb25zdCBoZWFkZXJzID0ganNvbkRhdGFbMF07XG4gICAgY29uc3QgZGF0YVJvd3MgPSBqc29uRGF0YS5zbGljZSgxKS5maWx0ZXIocm93ID0+IFxuICAgICAgcm93ICYmIHJvdy5sZW5ndGggPiAwICYmIHJvdy5zb21lKGNlbGwgPT4gY2VsbCAhPT0gbnVsbCAmJiBjZWxsICE9PSB1bmRlZmluZWQgJiYgY2VsbCAhPT0gJycpXG4gICAgKTtcblxuICAgIC8vIFZhbGlkYXRlIG1heGltdW0gNDAwMCByZWNvcmRzXG4gICAgaWYgKGRhdGFSb3dzLmxlbmd0aCA+IDQwMDApIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgICAgfSxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBcbiAgICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgICBtZXNzYWdlOiBgRmlsZSBjb250YWlucyAke2RhdGFSb3dzLmxlbmd0aH0gcmVjb3Jkcy4gTWF4aW11bSBhbGxvd2VkIGlzIDQsMDAwIHJlY29yZHMuYCBcbiAgICAgICAgfSksXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIFByb2Nlc3MgZWFjaCByb3cgLSB1cHNlcnQgKHVwZGF0ZSBpZiBleGlzdHMsIGluc2VydCBpZiBuZXcpXG4gICAgY29uc3QgcmVzdWx0cyA9IHtcbiAgICAgIHByb2Nlc3NlZDogMCxcbiAgICAgIGluc2VydGVkOiAwLFxuICAgICAgdXBkYXRlZDogMCxcbiAgICAgIGVycm9yczogW10gYXMgc3RyaW5nW10sXG4gICAgfTtcblxuICAgIGZvciAobGV0IGkgPSAwOyBpIDwgZGF0YVJvd3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNvbnN0IHJvdyA9IGRhdGFSb3dzW2ldO1xuICAgICAgXG4gICAgICB0cnkge1xuICAgICAgICAvLyBNYXAgcm93IGRhdGEgdG8gb2JqZWN0IHVzaW5nIGhlYWRlcnNcbiAgICAgICAgY29uc3QgcmVjb3JkOiBhbnkgPSB7fTtcbiAgICAgICAgaGVhZGVycy5mb3JFYWNoKChoZWFkZXIsIGluZGV4KSA9PiB7XG4gICAgICAgICAgcmVjb3JkW2hlYWRlcl0gPSByb3dbaW5kZXhdO1xuICAgICAgICB9KTtcblxuICAgICAgICAvLyBWYWxpZGF0ZSByZXF1aXJlZCBmaWVsZFxuICAgICAgICBpZiAoIXJlY29yZC5nYW1lX2lkKSB7XG4gICAgICAgICAgcmVzdWx0cy5lcnJvcnMucHVzaChgUm93ICR7aSArIDJ9OiBNaXNzaW5nIGdhbWVfaWRgKTtcbiAgICAgICAgICBjb250aW51ZTtcbiAgICAgICAgfVxuXG4gICAgICAgIC8vIENoZWNrIGlmIHJlY29yZCBleGlzdHNcbiAgICAgICAgY29uc3QgZXhpc3RpbmdSZWNvcmQgPSBhd2FpdCBnZXRHYW1lKHJlY29yZC5nYW1lX2lkKTtcbiAgICAgICAgY29uc3Qgbm93ID0gbmV3IERhdGUoKS50b0lTT1N0cmluZygpO1xuXG4gICAgICAgIC8vIFByZXBhcmUgZ2FtZSByZWNvcmRcbiAgICAgICAgY29uc3QgZ2FtZVJlY29yZDogR2FtZVJlY29yZCA9IHtcbiAgICAgICAgICBnYW1lX2lkOiByZWNvcmQuZ2FtZV9pZCxcbiAgICAgICAgICBnYW1lX25hbWU6IHJlY29yZC5nYW1lX25hbWUgfHwgJycsXG4gICAgICAgICAgc3R1ZGVudF9pZDogcmVjb3JkLnN0dWRlbnRfaWQgfHwgJycsXG4gICAgICAgICAgc3ViamVjdDogcmVjb3JkLnN1YmplY3QgfHwgJycsXG4gICAgICAgICAgZGlmZmljdWx0eTogcmVjb3JkLmRpZmZpY3VsdHkgfHwgJycsXG4gICAgICAgICAgdGVhY2hlcl9pZDogcmVjb3JkLnRlYWNoZXJfaWQgfHwgJycsXG4gICAgICAgICAgbGFzdF91cGRhdGU6IG5vdyxcbiAgICAgICAgICBzY3JhdGNoX2lkOiByZWNvcmQuc2NyYXRjaF9pZCB8fCAnJyxcbiAgICAgICAgICBzY3JhdGNoX2FwaTogcmVjb3JkLnNjcmF0Y2hfYXBpIHx8ICcnLFxuICAgICAgICAgIGFjY3VtdWxhdGVkX2NsaWNrOiBleGlzdGluZ1JlY29yZCBcbiAgICAgICAgICAgID8gZXhpc3RpbmdSZWNvcmQuYWNjdW11bGF0ZWRfY2xpY2sgXG4gICAgICAgICAgICA6ICh0eXBlb2YgcmVjb3JkLmFjY3VtdWxhdGVkX2NsaWNrID09PSAnbnVtYmVyJyA/IHJlY29yZC5hY2N1bXVsYXRlZF9jbGljayA6IDApLFxuICAgICAgICAgIGNyZWF0ZWRfYXQ6IGV4aXN0aW5nUmVjb3JkID8gZXhpc3RpbmdSZWNvcmQuY3JlYXRlZF9hdCA6IG5vdyxcbiAgICAgICAgICB1cGRhdGVkX2F0OiBub3csXG4gICAgICAgIH07XG5cbiAgICAgICAgLy8gVXBzZXJ0IHJlY29yZFxuICAgICAgICBhd2FpdCBwdXRHYW1lKGdhbWVSZWNvcmQpO1xuICAgICAgICBcbiAgICAgICAgaWYgKGV4aXN0aW5nUmVjb3JkKSB7XG4gICAgICAgICAgcmVzdWx0cy51cGRhdGVkKys7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgcmVzdWx0cy5pbnNlcnRlZCsrO1xuICAgICAgICB9XG4gICAgICAgIHJlc3VsdHMucHJvY2Vzc2VkKys7XG4gICAgICB9IGNhdGNoIChlcnJvcikge1xuICAgICAgICByZXN1bHRzLmVycm9ycy5wdXNoKGBSb3cgJHtpICsgMn06ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcid9YCk7XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgIG1lc3NhZ2U6IGBTdWNjZXNzZnVsbHkgcHJvY2Vzc2VkICR7cmVzdWx0cy5wcm9jZXNzZWR9IGdhbWVzICgke3Jlc3VsdHMuaW5zZXJ0ZWR9IGluc2VydGVkLCAke3Jlc3VsdHMudXBkYXRlZH0gdXBkYXRlZClgLFxuICAgICAgICBwcm9jZXNzZWQ6IHJlc3VsdHMucHJvY2Vzc2VkLFxuICAgICAgICBpbnNlcnRlZDogcmVzdWx0cy5pbnNlcnRlZCxcbiAgICAgICAgdXBkYXRlZDogcmVzdWx0cy51cGRhdGVkLFxuICAgICAgICBlcnJvcnM6IHJlc3VsdHMuZXJyb3JzLmxlbmd0aCA+IDAgPyByZXN1bHRzLmVycm9ycyA6IHVuZGVmaW5lZCxcbiAgICAgIH0pLFxuICAgIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3I6JywgZXJyb3IpO1xuICAgIHJldHVybiB7XG4gICAgICBzdGF0dXNDb2RlOiA1MDAsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICAgICB9LFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgIG1lc3NhZ2U6ICdJbnRlcm5hbCBzZXJ2ZXIgZXJyb3InLFxuICAgICAgICBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcidcbiAgICAgIH0pLFxuICAgIH07XG4gIH1cbn07XG5cbmFzeW5jIGZ1bmN0aW9uIGdldEdhbWUoZ2FtZUlkOiBzdHJpbmcpIHtcbiAgdHJ5IHtcbiAgICBjb25zdCBjb21tYW5kID0gbmV3IEdldENvbW1hbmQoe1xuICAgICAgVGFibGVOYW1lOiBwcm9jZXNzLmVudi5HQU1FU19UQUJMRV9OQU1FIHx8ICdoby15dS1nYW1lcycsXG4gICAgICBLZXk6IHsgZ2FtZV9pZDogZ2FtZUlkIH0sXG4gICAgfSk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZG9jQ2xpZW50LnNlbmQoY29tbWFuZCk7XG4gICAgcmV0dXJuIHJlc3VsdC5JdGVtIGFzIEdhbWVSZWNvcmQgfCB1bmRlZmluZWQ7XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcihgRXJyb3IgZ2V0dGluZyBnYW1lICR7Z2FtZUlkfTpgLCBlcnJvcik7XG4gICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgfVxufVxuXG5hc3luYyBmdW5jdGlvbiBwdXRHYW1lKGdhbWU6IEdhbWVSZWNvcmQpIHtcbiAgY29uc3QgY29tbWFuZCA9IG5ldyBQdXRDb21tYW5kKHtcbiAgICBUYWJsZU5hbWU6IHByb2Nlc3MuZW52LkdBTUVTX1RBQkxFX05BTUUgfHwgJ2hvLXl1LWdhbWVzJyxcbiAgICBJdGVtOiBnYW1lLFxuICB9KTtcbiAgYXdhaXQgZG9jQ2xpZW50LnNlbmQoY29tbWFuZCk7XG59XG4iXX0=