"use strict";
/**
 * Download Games Lambda Handler
 * Handles Excel export for game data
 * - Accessible by both teachers and admins
 * - Returns Excel file (.xlsx) with proper structure
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const XLSX = require("xlsx");
const dynamodb_client_1 = require("../utils/dynamodb-client");
const handler = async (event) => {
    try {
        // Get all games from DynamoDB
        const scanCommand = new lib_dynamodb_1.ScanCommand({
            TableName: dynamodb_client_1.tableNames.games,
        });
        const result = await dynamodb_client_1.dynamoDBClient.send(scanCommand);
        const games = result.Items;
        // Sort games by game_id
        games.sort((a, b) => a.game_id.localeCompare(b.game_id));
        // Prepare data for Excel
        const excelData = games.map(game => ({
            game_id: game.game_id,
            game_name: game.game_name,
            student_id: game.student_id,
            subject: game.subject,
            difficulty: game.difficulty,
            teacher_id: game.teacher_id,
            last_update: game.last_update,
            scratch_id: game.scratch_id,
            scratch_api: game.scratch_api,
            accumulated_click: game.accumulated_click,
        }));
        // Create Excel workbook
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Games');
        // Set column widths for better readability
        worksheet['!cols'] = [
            { wch: 12 }, // game_id
            { wch: 30 }, // game_name
            { wch: 12 }, // student_id
            { wch: 25 }, // subject
            { wch: 15 }, // difficulty
            { wch: 12 }, // teacher_id
            { wch: 20 }, // last_update
            { wch: 15 }, // scratch_id
            { wch: 40 }, // scratch_api
            { wch: 15 }, // accumulated_click
        ];
        // Generate Excel file buffer
        const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        // Return Excel file as response
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="games_${new Date().toISOString().split('T')[0]}.xlsx"`,
                'Access-Control-Allow-Origin': '*',
            },
            body: excelBuffer.toString('base64'),
            isBase64Encoded: true,
        };
    }
    catch (error) {
        console.error('Error downloading games:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                message: 'Failed to download games data',
                error: error instanceof Error ? error.message : 'Unknown error'
            }),
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2FtZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnYW1lcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7OztBQUVILHdEQUFvRDtBQUVwRCw2QkFBNkI7QUFDN0IsOERBQXNFO0FBZS9ELE1BQU0sT0FBTyxHQUFHLEtBQUssRUFDMUIsS0FBMkIsRUFDSyxFQUFFO0lBQ2xDLElBQUksQ0FBQztRQUNILDhCQUE4QjtRQUM5QixNQUFNLFdBQVcsR0FBRyxJQUFJLDBCQUFXLENBQUM7WUFDbEMsU0FBUyxFQUFFLDRCQUFVLENBQUMsS0FBSztTQUM1QixDQUFDLENBQUM7UUFDSCxNQUFNLE1BQU0sR0FBRyxNQUFNLGdDQUFjLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxLQUFxQixDQUFDO1FBRTNDLHdCQUF3QjtRQUN4QixLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUM7UUFFekQseUJBQXlCO1FBQ3pCLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ25DLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTztZQUNyQixTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7WUFDekIsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVO1lBQzNCLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTztZQUNyQixVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVU7WUFDM0IsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVO1lBQzNCLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVztZQUM3QixVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVU7WUFDM0IsV0FBVyxFQUFFLElBQUksQ0FBQyxXQUFXO1lBQzdCLGlCQUFpQixFQUFFLElBQUksQ0FBQyxpQkFBaUI7U0FDMUMsQ0FBQyxDQUFDLENBQUM7UUFFSix3QkFBd0I7UUFDeEIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDdEQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN2QyxJQUFJLENBQUMsS0FBSyxDQUFDLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFM0QsMkNBQTJDO1FBQzNDLFNBQVMsQ0FBQyxPQUFPLENBQUMsR0FBRztZQUNuQixFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxVQUFVO1lBQ3ZCLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLFlBQVk7WUFDekIsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsYUFBYTtZQUMxQixFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxVQUFVO1lBQ3ZCLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLGFBQWE7WUFDMUIsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsYUFBYTtZQUMxQixFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxjQUFjO1lBQzNCLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLGFBQWE7WUFDMUIsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsY0FBYztZQUMzQixFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxvQkFBb0I7U0FDbEMsQ0FBQztRQUVGLDZCQUE2QjtRQUM3QixNQUFNLFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFFL0UsZ0NBQWdDO1FBQ2hDLE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU8sRUFBRTtnQkFDUCxjQUFjLEVBQUUsbUVBQW1FO2dCQUNuRixxQkFBcUIsRUFBRSwrQkFBK0IsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUUsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUMsQ0FBQyxDQUFDLFFBQVE7Z0JBQ3BHLDZCQUE2QixFQUFFLEdBQUc7YUFDbkM7WUFDRCxJQUFJLEVBQUUsV0FBVyxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUM7WUFDcEMsZUFBZSxFQUFFLElBQUk7U0FDdEIsQ0FBQztJQUNKLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQywwQkFBMEIsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUNqRCxPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUU7Z0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtnQkFDbEMsNkJBQTZCLEVBQUUsR0FBRzthQUNuQztZQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO2dCQUNuQixPQUFPLEVBQUUsS0FBSztnQkFDZCxPQUFPLEVBQUUsK0JBQStCO2dCQUN4QyxLQUFLLEVBQUUsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsZUFBZTthQUNoRSxDQUFDO1NBQ0gsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDLENBQUM7QUE1RVcsUUFBQSxPQUFPLFdBNEVsQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogRG93bmxvYWQgR2FtZXMgTGFtYmRhIEhhbmRsZXJcbiAqIEhhbmRsZXMgRXhjZWwgZXhwb3J0IGZvciBnYW1lIGRhdGFcbiAqIC0gQWNjZXNzaWJsZSBieSBib3RoIHRlYWNoZXJzIGFuZCBhZG1pbnNcbiAqIC0gUmV0dXJucyBFeGNlbCBmaWxlICgueGxzeCkgd2l0aCBwcm9wZXIgc3RydWN0dXJlXG4gKi9cblxuaW1wb3J0IHsgU2NhbkNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0ICogYXMgWExTWCBmcm9tICd4bHN4JztcbmltcG9ydCB7IGR5bmFtb0RCQ2xpZW50LCB0YWJsZU5hbWVzIH0gZnJvbSAnLi4vdXRpbHMvZHluYW1vZGItY2xpZW50JztcblxuaW50ZXJmYWNlIEdhbWVSZWNvcmQge1xuICBnYW1lX2lkOiBzdHJpbmc7XG4gIGdhbWVfbmFtZTogc3RyaW5nO1xuICBzdHVkZW50X2lkOiBzdHJpbmc7XG4gIHN1YmplY3Q6IHN0cmluZztcbiAgZGlmZmljdWx0eTogc3RyaW5nO1xuICB0ZWFjaGVyX2lkOiBzdHJpbmc7XG4gIGxhc3RfdXBkYXRlOiBzdHJpbmc7XG4gIHNjcmF0Y2hfaWQ6IHN0cmluZztcbiAgc2NyYXRjaF9hcGk6IHN0cmluZztcbiAgYWNjdW11bGF0ZWRfY2xpY2s6IG51bWJlcjtcbn1cblxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoXG4gIGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudFxuKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcbiAgdHJ5IHtcbiAgICAvLyBHZXQgYWxsIGdhbWVzIGZyb20gRHluYW1vREJcbiAgICBjb25zdCBzY2FuQ29tbWFuZCA9IG5ldyBTY2FuQ29tbWFuZCh7XG4gICAgICBUYWJsZU5hbWU6IHRhYmxlTmFtZXMuZ2FtZXMsXG4gICAgfSk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZHluYW1vREJDbGllbnQuc2VuZChzY2FuQ29tbWFuZCk7XG4gICAgY29uc3QgZ2FtZXMgPSByZXN1bHQuSXRlbXMgYXMgR2FtZVJlY29yZFtdO1xuXG4gICAgLy8gU29ydCBnYW1lcyBieSBnYW1lX2lkXG4gICAgZ2FtZXMuc29ydCgoYSwgYikgPT4gYS5nYW1lX2lkLmxvY2FsZUNvbXBhcmUoYi5nYW1lX2lkKSk7XG5cbiAgICAvLyBQcmVwYXJlIGRhdGEgZm9yIEV4Y2VsXG4gICAgY29uc3QgZXhjZWxEYXRhID0gZ2FtZXMubWFwKGdhbWUgPT4gKHtcbiAgICAgIGdhbWVfaWQ6IGdhbWUuZ2FtZV9pZCxcbiAgICAgIGdhbWVfbmFtZTogZ2FtZS5nYW1lX25hbWUsXG4gICAgICBzdHVkZW50X2lkOiBnYW1lLnN0dWRlbnRfaWQsXG4gICAgICBzdWJqZWN0OiBnYW1lLnN1YmplY3QsXG4gICAgICBkaWZmaWN1bHR5OiBnYW1lLmRpZmZpY3VsdHksXG4gICAgICB0ZWFjaGVyX2lkOiBnYW1lLnRlYWNoZXJfaWQsXG4gICAgICBsYXN0X3VwZGF0ZTogZ2FtZS5sYXN0X3VwZGF0ZSxcbiAgICAgIHNjcmF0Y2hfaWQ6IGdhbWUuc2NyYXRjaF9pZCxcbiAgICAgIHNjcmF0Y2hfYXBpOiBnYW1lLnNjcmF0Y2hfYXBpLFxuICAgICAgYWNjdW11bGF0ZWRfY2xpY2s6IGdhbWUuYWNjdW11bGF0ZWRfY2xpY2ssXG4gICAgfSkpO1xuXG4gICAgLy8gQ3JlYXRlIEV4Y2VsIHdvcmtib29rXG4gICAgY29uc3Qgd29ya3NoZWV0ID0gWExTWC51dGlscy5qc29uX3RvX3NoZWV0KGV4Y2VsRGF0YSk7XG4gICAgY29uc3Qgd29ya2Jvb2sgPSBYTFNYLnV0aWxzLmJvb2tfbmV3KCk7XG4gICAgWExTWC51dGlscy5ib29rX2FwcGVuZF9zaGVldCh3b3JrYm9vaywgd29ya3NoZWV0LCAnR2FtZXMnKTtcblxuICAgIC8vIFNldCBjb2x1bW4gd2lkdGhzIGZvciBiZXR0ZXIgcmVhZGFiaWxpdHlcbiAgICB3b3Jrc2hlZXRbJyFjb2xzJ10gPSBbXG4gICAgICB7IHdjaDogMTIgfSwgLy8gZ2FtZV9pZFxuICAgICAgeyB3Y2g6IDMwIH0sIC8vIGdhbWVfbmFtZVxuICAgICAgeyB3Y2g6IDEyIH0sIC8vIHN0dWRlbnRfaWRcbiAgICAgIHsgd2NoOiAyNSB9LCAvLyBzdWJqZWN0XG4gICAgICB7IHdjaDogMTUgfSwgLy8gZGlmZmljdWx0eVxuICAgICAgeyB3Y2g6IDEyIH0sIC8vIHRlYWNoZXJfaWRcbiAgICAgIHsgd2NoOiAyMCB9LCAvLyBsYXN0X3VwZGF0ZVxuICAgICAgeyB3Y2g6IDE1IH0sIC8vIHNjcmF0Y2hfaWRcbiAgICAgIHsgd2NoOiA0MCB9LCAvLyBzY3JhdGNoX2FwaVxuICAgICAgeyB3Y2g6IDE1IH0sIC8vIGFjY3VtdWxhdGVkX2NsaWNrXG4gICAgXTtcblxuICAgIC8vIEdlbmVyYXRlIEV4Y2VsIGZpbGUgYnVmZmVyXG4gICAgY29uc3QgZXhjZWxCdWZmZXIgPSBYTFNYLndyaXRlKHdvcmtib29rLCB7IHR5cGU6ICdidWZmZXInLCBib29rVHlwZTogJ3hsc3gnIH0pO1xuXG4gICAgLy8gUmV0dXJuIEV4Y2VsIGZpbGUgYXMgcmVzcG9uc2VcbiAgICByZXR1cm4ge1xuICAgICAgc3RhdHVzQ29kZTogMjAwLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5zcHJlYWRzaGVldG1sLnNoZWV0JyxcbiAgICAgICAgJ0NvbnRlbnQtRGlzcG9zaXRpb24nOiBgYXR0YWNobWVudDsgZmlsZW5hbWU9XCJnYW1lc18ke25ldyBEYXRlKCkudG9JU09TdHJpbmcoKS5zcGxpdCgnVCcpWzBdfS54bHN4XCJgLFxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgfSxcbiAgICAgIGJvZHk6IGV4Y2VsQnVmZmVyLnRvU3RyaW5nKCdiYXNlNjQnKSxcbiAgICAgIGlzQmFzZTY0RW5jb2RlZDogdHJ1ZSxcbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGRvd25sb2FkaW5nIGdhbWVzOicsIGVycm9yKTtcbiAgICByZXR1cm4ge1xuICAgICAgc3RhdHVzQ29kZTogNTAwLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgXG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICBtZXNzYWdlOiAnRmFpbGVkIHRvIGRvd25sb2FkIGdhbWVzIGRhdGEnLFxuICAgICAgICBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcidcbiAgICAgIH0pLFxuICAgIH07XG4gIH1cbn07XG4iXX0=