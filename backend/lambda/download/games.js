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
        // Sort games by scratch_game_id
        games.sort((a, b) => a.scratch_game_id.localeCompare(b.scratch_game_id));
        // Prepare data for Excel
        const excelData = games.map(game => ({
            scratch_game_id: game.scratch_game_id,
            game_name: game.game_name,
            student_id: game.student_id,
            subject: game.subject,
            difficulty: game.difficulty,
            teacher_id: game.teacher_id,
            last_update: game.last_update,
            scratch_id: game.scratch_id,
            accumulated_click: game.accumulated_click,
        }));
        // Create Excel workbook
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Games');
        // Set column widths for better readability
        worksheet['!cols'] = [
            { wch: 15 }, // scratch_game_id
            { wch: 30 }, // game_name
            { wch: 12 }, // student_id
            { wch: 25 }, // subject
            { wch: 15 }, // difficulty
            { wch: 12 }, // teacher_id
            { wch: 20 }, // last_update
            { wch: 15 }, // scratch_id
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2FtZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnYW1lcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7OztBQUVILHdEQUFvRDtBQUVwRCw2QkFBNkI7QUFDN0IsOERBQXNFO0FBYy9ELE1BQU0sT0FBTyxHQUFHLEtBQUssRUFDMUIsS0FBMkIsRUFDSyxFQUFFO0lBQ2xDLElBQUksQ0FBQztRQUNILDhCQUE4QjtRQUM5QixNQUFNLFdBQVcsR0FBRyxJQUFJLDBCQUFXLENBQUM7WUFDbEMsU0FBUyxFQUFFLDRCQUFVLENBQUMsS0FBSztTQUM1QixDQUFDLENBQUM7UUFDSCxNQUFNLE1BQU0sR0FBRyxNQUFNLGdDQUFjLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sS0FBSyxHQUFHLE1BQU0sQ0FBQyxLQUFxQixDQUFDO1FBRTNDLGdDQUFnQztRQUNoQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLGVBQWUsQ0FBQyxDQUFDLENBQUM7UUFFekUseUJBQXlCO1FBQ3pCLE1BQU0sU0FBUyxHQUFHLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ25DLGVBQWUsRUFBRSxJQUFJLENBQUMsZUFBZTtZQUNyQyxTQUFTLEVBQUUsSUFBSSxDQUFDLFNBQVM7WUFDekIsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVO1lBQzNCLE9BQU8sRUFBRSxJQUFJLENBQUMsT0FBTztZQUNyQixVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVU7WUFDM0IsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVO1lBQzNCLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVztZQUM3QixVQUFVLEVBQUUsSUFBSSxDQUFDLFVBQVU7WUFDM0IsaUJBQWlCLEVBQUUsSUFBSSxDQUFDLGlCQUFpQjtTQUMxQyxDQUFDLENBQUMsQ0FBQztRQUVKLHdCQUF3QjtRQUN4QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQztRQUN0RCxNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLFFBQVEsRUFBRSxDQUFDO1FBQ3ZDLElBQUksQ0FBQyxLQUFLLENBQUMsaUJBQWlCLENBQUMsUUFBUSxFQUFFLFNBQVMsRUFBRSxPQUFPLENBQUMsQ0FBQztRQUUzRCwyQ0FBMkM7UUFDM0MsU0FBUyxDQUFDLE9BQU8sQ0FBQyxHQUFHO1lBQ25CLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLGtCQUFrQjtZQUMvQixFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxZQUFZO1lBQ3pCLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLGFBQWE7WUFDMUIsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsVUFBVTtZQUN2QixFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxhQUFhO1lBQzFCLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLGFBQWE7WUFDMUIsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsY0FBYztZQUMzQixFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxhQUFhO1lBQzFCLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLG9CQUFvQjtTQUNsQyxDQUFDO1FBRUYsNkJBQTZCO1FBQzdCLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUUvRSxnQ0FBZ0M7UUFDaEMsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFO2dCQUNQLGNBQWMsRUFBRSxtRUFBbUU7Z0JBQ25GLHFCQUFxQixFQUFFLCtCQUErQixJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUTtnQkFDcEcsNkJBQTZCLEVBQUUsR0FBRzthQUNuQztZQUNELElBQUksRUFBRSxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQztZQUNwQyxlQUFlLEVBQUUsSUFBSTtTQUN0QixDQUFDO0lBQ0osQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLDBCQUEwQixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2pELE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU8sRUFBRTtnQkFDUCxjQUFjLEVBQUUsa0JBQWtCO2dCQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2FBQ25DO1lBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7Z0JBQ25CLE9BQU8sRUFBRSxLQUFLO2dCQUNkLE9BQU8sRUFBRSwrQkFBK0I7Z0JBQ3hDLEtBQUssRUFBRSxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxlQUFlO2FBQ2hFLENBQUM7U0FDSCxDQUFDO0lBQ0osQ0FBQztBQUNILENBQUMsQ0FBQztBQTFFVyxRQUFBLE9BQU8sV0EwRWxCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBEb3dubG9hZCBHYW1lcyBMYW1iZGEgSGFuZGxlclxuICogSGFuZGxlcyBFeGNlbCBleHBvcnQgZm9yIGdhbWUgZGF0YVxuICogLSBBY2Nlc3NpYmxlIGJ5IGJvdGggdGVhY2hlcnMgYW5kIGFkbWluc1xuICogLSBSZXR1cm5zIEV4Y2VsIGZpbGUgKC54bHN4KSB3aXRoIHByb3BlciBzdHJ1Y3R1cmVcbiAqL1xuXG5pbXBvcnQgeyBTY2FuQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYic7XG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XG5pbXBvcnQgKiBhcyBYTFNYIGZyb20gJ3hsc3gnO1xuaW1wb3J0IHsgZHluYW1vREJDbGllbnQsIHRhYmxlTmFtZXMgfSBmcm9tICcuLi91dGlscy9keW5hbW9kYi1jbGllbnQnO1xuXG5pbnRlcmZhY2UgR2FtZVJlY29yZCB7XG4gIHNjcmF0Y2hfZ2FtZV9pZDogc3RyaW5nO1xuICBnYW1lX25hbWU6IHN0cmluZztcbiAgc3R1ZGVudF9pZDogc3RyaW5nO1xuICBzdWJqZWN0OiBzdHJpbmc7XG4gIGRpZmZpY3VsdHk6IHN0cmluZztcbiAgdGVhY2hlcl9pZDogc3RyaW5nO1xuICBsYXN0X3VwZGF0ZTogc3RyaW5nO1xuICBzY3JhdGNoX2lkOiBzdHJpbmc7XG4gIGFjY3VtdWxhdGVkX2NsaWNrOiBudW1iZXI7XG59XG5cbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKFxuICBldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnRcbik6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XG4gIHRyeSB7XG4gICAgLy8gR2V0IGFsbCBnYW1lcyBmcm9tIER5bmFtb0RCXG4gICAgY29uc3Qgc2NhbkNvbW1hbmQgPSBuZXcgU2NhbkNvbW1hbmQoe1xuICAgICAgVGFibGVOYW1lOiB0YWJsZU5hbWVzLmdhbWVzLFxuICAgIH0pO1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGR5bmFtb0RCQ2xpZW50LnNlbmQoc2NhbkNvbW1hbmQpO1xuICAgIGNvbnN0IGdhbWVzID0gcmVzdWx0Lkl0ZW1zIGFzIEdhbWVSZWNvcmRbXTtcblxuICAgIC8vIFNvcnQgZ2FtZXMgYnkgc2NyYXRjaF9nYW1lX2lkXG4gICAgZ2FtZXMuc29ydCgoYSwgYikgPT4gYS5zY3JhdGNoX2dhbWVfaWQubG9jYWxlQ29tcGFyZShiLnNjcmF0Y2hfZ2FtZV9pZCkpO1xuXG4gICAgLy8gUHJlcGFyZSBkYXRhIGZvciBFeGNlbFxuICAgIGNvbnN0IGV4Y2VsRGF0YSA9IGdhbWVzLm1hcChnYW1lID0+ICh7XG4gICAgICBzY3JhdGNoX2dhbWVfaWQ6IGdhbWUuc2NyYXRjaF9nYW1lX2lkLFxuICAgICAgZ2FtZV9uYW1lOiBnYW1lLmdhbWVfbmFtZSxcbiAgICAgIHN0dWRlbnRfaWQ6IGdhbWUuc3R1ZGVudF9pZCxcbiAgICAgIHN1YmplY3Q6IGdhbWUuc3ViamVjdCxcbiAgICAgIGRpZmZpY3VsdHk6IGdhbWUuZGlmZmljdWx0eSxcbiAgICAgIHRlYWNoZXJfaWQ6IGdhbWUudGVhY2hlcl9pZCxcbiAgICAgIGxhc3RfdXBkYXRlOiBnYW1lLmxhc3RfdXBkYXRlLFxuICAgICAgc2NyYXRjaF9pZDogZ2FtZS5zY3JhdGNoX2lkLFxuICAgICAgYWNjdW11bGF0ZWRfY2xpY2s6IGdhbWUuYWNjdW11bGF0ZWRfY2xpY2ssXG4gICAgfSkpO1xuXG4gICAgLy8gQ3JlYXRlIEV4Y2VsIHdvcmtib29rXG4gICAgY29uc3Qgd29ya3NoZWV0ID0gWExTWC51dGlscy5qc29uX3RvX3NoZWV0KGV4Y2VsRGF0YSk7XG4gICAgY29uc3Qgd29ya2Jvb2sgPSBYTFNYLnV0aWxzLmJvb2tfbmV3KCk7XG4gICAgWExTWC51dGlscy5ib29rX2FwcGVuZF9zaGVldCh3b3JrYm9vaywgd29ya3NoZWV0LCAnR2FtZXMnKTtcblxuICAgIC8vIFNldCBjb2x1bW4gd2lkdGhzIGZvciBiZXR0ZXIgcmVhZGFiaWxpdHlcbiAgICB3b3Jrc2hlZXRbJyFjb2xzJ10gPSBbXG4gICAgICB7IHdjaDogMTUgfSwgLy8gc2NyYXRjaF9nYW1lX2lkXG4gICAgICB7IHdjaDogMzAgfSwgLy8gZ2FtZV9uYW1lXG4gICAgICB7IHdjaDogMTIgfSwgLy8gc3R1ZGVudF9pZFxuICAgICAgeyB3Y2g6IDI1IH0sIC8vIHN1YmplY3RcbiAgICAgIHsgd2NoOiAxNSB9LCAvLyBkaWZmaWN1bHR5XG4gICAgICB7IHdjaDogMTIgfSwgLy8gdGVhY2hlcl9pZFxuICAgICAgeyB3Y2g6IDIwIH0sIC8vIGxhc3RfdXBkYXRlXG4gICAgICB7IHdjaDogMTUgfSwgLy8gc2NyYXRjaF9pZFxuICAgICAgeyB3Y2g6IDE1IH0sIC8vIGFjY3VtdWxhdGVkX2NsaWNrXG4gICAgXTtcblxuICAgIC8vIEdlbmVyYXRlIEV4Y2VsIGZpbGUgYnVmZmVyXG4gICAgY29uc3QgZXhjZWxCdWZmZXIgPSBYTFNYLndyaXRlKHdvcmtib29rLCB7IHR5cGU6ICdidWZmZXInLCBib29rVHlwZTogJ3hsc3gnIH0pO1xuXG4gICAgLy8gUmV0dXJuIEV4Y2VsIGZpbGUgYXMgcmVzcG9uc2VcbiAgICByZXR1cm4ge1xuICAgICAgc3RhdHVzQ29kZTogMjAwLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL3ZuZC5vcGVueG1sZm9ybWF0cy1vZmZpY2Vkb2N1bWVudC5zcHJlYWRzaGVldG1sLnNoZWV0JyxcbiAgICAgICAgJ0NvbnRlbnQtRGlzcG9zaXRpb24nOiBgYXR0YWNobWVudDsgZmlsZW5hbWU9XCJnYW1lc18ke25ldyBEYXRlKCkudG9JU09TdHJpbmcoKS5zcGxpdCgnVCcpWzBdfS54bHN4XCJgLFxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgfSxcbiAgICAgIGJvZHk6IGV4Y2VsQnVmZmVyLnRvU3RyaW5nKCdiYXNlNjQnKSxcbiAgICAgIGlzQmFzZTY0RW5jb2RlZDogdHJ1ZSxcbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGRvd25sb2FkaW5nIGdhbWVzOicsIGVycm9yKTtcbiAgICByZXR1cm4ge1xuICAgICAgc3RhdHVzQ29kZTogNTAwLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgXG4gICAgICAgIHN1Y2Nlc3M6IGZhbHNlLFxuICAgICAgICBtZXNzYWdlOiAnRmFpbGVkIHRvIGRvd25sb2FkIGdhbWVzIGRhdGEnLFxuICAgICAgICBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcidcbiAgICAgIH0pLFxuICAgIH07XG4gIH1cbn07XG4iXX0=