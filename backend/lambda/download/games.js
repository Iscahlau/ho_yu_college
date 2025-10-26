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
            description: game.description || '',
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
            { wch: 50 }, // description
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2FtZXMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnYW1lcy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7OztBQUVILHdEQUFvRDtBQUVwRCw2QkFBNkI7QUFDN0IsOERBQXNFO0FBZ0IvRCxNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQzFCLEtBQTJCLEVBQ0ssRUFBRTtJQUNsQyxJQUFJLENBQUM7UUFDSCw4QkFBOEI7UUFDOUIsTUFBTSxXQUFXLEdBQUcsSUFBSSwwQkFBVyxDQUFDO1lBQ2xDLFNBQVMsRUFBRSw0QkFBVSxDQUFDLEtBQUs7U0FDNUIsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxNQUFNLEdBQUcsTUFBTSxnQ0FBYyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUN0RCxNQUFNLEtBQUssR0FBRyxNQUFNLENBQUMsS0FBcUIsQ0FBQztRQUUzQyx3QkFBd0I7UUFDeEIsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsYUFBYSxDQUFDLENBQUMsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDO1FBRXpELHlCQUF5QjtRQUN6QixNQUFNLFNBQVMsR0FBRyxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztZQUNuQyxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87WUFDckIsU0FBUyxFQUFFLElBQUksQ0FBQyxTQUFTO1lBQ3pCLFVBQVUsRUFBRSxJQUFJLENBQUMsVUFBVTtZQUMzQixPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87WUFDckIsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVO1lBQzNCLFVBQVUsRUFBRSxJQUFJLENBQUMsVUFBVTtZQUMzQixXQUFXLEVBQUUsSUFBSSxDQUFDLFdBQVc7WUFDN0IsVUFBVSxFQUFFLElBQUksQ0FBQyxVQUFVO1lBQzNCLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVztZQUM3QixpQkFBaUIsRUFBRSxJQUFJLENBQUMsaUJBQWlCO1lBQ3pDLFdBQVcsRUFBRSxJQUFJLENBQUMsV0FBVyxJQUFJLEVBQUU7U0FDcEMsQ0FBQyxDQUFDLENBQUM7UUFFSix3QkFBd0I7UUFDeEIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUM7UUFDdEQsTUFBTSxRQUFRLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsQ0FBQztRQUN2QyxJQUFJLENBQUMsS0FBSyxDQUFDLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxTQUFTLEVBQUUsT0FBTyxDQUFDLENBQUM7UUFFM0QsMkNBQTJDO1FBQzNDLFNBQVMsQ0FBQyxPQUFPLENBQUMsR0FBRztZQUNuQixFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxVQUFVO1lBQ3ZCLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLFlBQVk7WUFDekIsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsYUFBYTtZQUMxQixFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxVQUFVO1lBQ3ZCLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLGFBQWE7WUFDMUIsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsYUFBYTtZQUMxQixFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxjQUFjO1lBQzNCLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLGFBQWE7WUFDMUIsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsY0FBYztZQUMzQixFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxvQkFBb0I7WUFDakMsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsY0FBYztTQUM1QixDQUFDO1FBRUYsNkJBQTZCO1FBQzdCLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUUvRSxnQ0FBZ0M7UUFDaEMsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFO2dCQUNQLGNBQWMsRUFBRSxtRUFBbUU7Z0JBQ25GLHFCQUFxQixFQUFFLCtCQUErQixJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUTtnQkFDcEcsNkJBQTZCLEVBQUUsR0FBRzthQUNuQztZQUNELElBQUksRUFBRSxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQztZQUNwQyxlQUFlLEVBQUUsSUFBSTtTQUN0QixDQUFDO0lBQ0osQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLDBCQUEwQixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ2pELE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU8sRUFBRTtnQkFDUCxjQUFjLEVBQUUsa0JBQWtCO2dCQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2FBQ25DO1lBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7Z0JBQ25CLE9BQU8sRUFBRSxLQUFLO2dCQUNkLE9BQU8sRUFBRSwrQkFBK0I7Z0JBQ3hDLEtBQUssRUFBRSxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxlQUFlO2FBQ2hFLENBQUM7U0FDSCxDQUFDO0lBQ0osQ0FBQztBQUNILENBQUMsQ0FBQztBQTlFVyxRQUFBLE9BQU8sV0E4RWxCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBEb3dubG9hZCBHYW1lcyBMYW1iZGEgSGFuZGxlclxuICogSGFuZGxlcyBFeGNlbCBleHBvcnQgZm9yIGdhbWUgZGF0YVxuICogLSBBY2Nlc3NpYmxlIGJ5IGJvdGggdGVhY2hlcnMgYW5kIGFkbWluc1xuICogLSBSZXR1cm5zIEV4Y2VsIGZpbGUgKC54bHN4KSB3aXRoIHByb3BlciBzdHJ1Y3R1cmVcbiAqL1xuXG5pbXBvcnQgeyBTY2FuQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYic7XG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XG5pbXBvcnQgKiBhcyBYTFNYIGZyb20gJ3hsc3gnO1xuaW1wb3J0IHsgZHluYW1vREJDbGllbnQsIHRhYmxlTmFtZXMgfSBmcm9tICcuLi91dGlscy9keW5hbW9kYi1jbGllbnQnO1xuXG5pbnRlcmZhY2UgR2FtZVJlY29yZCB7XG4gIGdhbWVfaWQ6IHN0cmluZztcbiAgZ2FtZV9uYW1lOiBzdHJpbmc7XG4gIHN0dWRlbnRfaWQ6IHN0cmluZztcbiAgc3ViamVjdDogc3RyaW5nO1xuICBkaWZmaWN1bHR5OiBzdHJpbmc7XG4gIHRlYWNoZXJfaWQ6IHN0cmluZztcbiAgbGFzdF91cGRhdGU6IHN0cmluZztcbiAgc2NyYXRjaF9pZDogc3RyaW5nO1xuICBzY3JhdGNoX2FwaTogc3RyaW5nO1xuICBhY2N1bXVsYXRlZF9jbGljazogbnVtYmVyO1xuICBkZXNjcmlwdGlvbj86IHN0cmluZztcbn1cblxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoXG4gIGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudFxuKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcbiAgdHJ5IHtcbiAgICAvLyBHZXQgYWxsIGdhbWVzIGZyb20gRHluYW1vREJcbiAgICBjb25zdCBzY2FuQ29tbWFuZCA9IG5ldyBTY2FuQ29tbWFuZCh7XG4gICAgICBUYWJsZU5hbWU6IHRhYmxlTmFtZXMuZ2FtZXMsXG4gICAgfSk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZHluYW1vREJDbGllbnQuc2VuZChzY2FuQ29tbWFuZCk7XG4gICAgY29uc3QgZ2FtZXMgPSByZXN1bHQuSXRlbXMgYXMgR2FtZVJlY29yZFtdO1xuXG4gICAgLy8gU29ydCBnYW1lcyBieSBnYW1lX2lkXG4gICAgZ2FtZXMuc29ydCgoYSwgYikgPT4gYS5nYW1lX2lkLmxvY2FsZUNvbXBhcmUoYi5nYW1lX2lkKSk7XG5cbiAgICAvLyBQcmVwYXJlIGRhdGEgZm9yIEV4Y2VsXG4gICAgY29uc3QgZXhjZWxEYXRhID0gZ2FtZXMubWFwKGdhbWUgPT4gKHtcbiAgICAgIGdhbWVfaWQ6IGdhbWUuZ2FtZV9pZCxcbiAgICAgIGdhbWVfbmFtZTogZ2FtZS5nYW1lX25hbWUsXG4gICAgICBzdHVkZW50X2lkOiBnYW1lLnN0dWRlbnRfaWQsXG4gICAgICBzdWJqZWN0OiBnYW1lLnN1YmplY3QsXG4gICAgICBkaWZmaWN1bHR5OiBnYW1lLmRpZmZpY3VsdHksXG4gICAgICB0ZWFjaGVyX2lkOiBnYW1lLnRlYWNoZXJfaWQsXG4gICAgICBsYXN0X3VwZGF0ZTogZ2FtZS5sYXN0X3VwZGF0ZSxcbiAgICAgIHNjcmF0Y2hfaWQ6IGdhbWUuc2NyYXRjaF9pZCxcbiAgICAgIHNjcmF0Y2hfYXBpOiBnYW1lLnNjcmF0Y2hfYXBpLFxuICAgICAgYWNjdW11bGF0ZWRfY2xpY2s6IGdhbWUuYWNjdW11bGF0ZWRfY2xpY2ssXG4gICAgICBkZXNjcmlwdGlvbjogZ2FtZS5kZXNjcmlwdGlvbiB8fCAnJyxcbiAgICB9KSk7XG5cbiAgICAvLyBDcmVhdGUgRXhjZWwgd29ya2Jvb2tcbiAgICBjb25zdCB3b3Jrc2hlZXQgPSBYTFNYLnV0aWxzLmpzb25fdG9fc2hlZXQoZXhjZWxEYXRhKTtcbiAgICBjb25zdCB3b3JrYm9vayA9IFhMU1gudXRpbHMuYm9va19uZXcoKTtcbiAgICBYTFNYLnV0aWxzLmJvb2tfYXBwZW5kX3NoZWV0KHdvcmtib29rLCB3b3Jrc2hlZXQsICdHYW1lcycpO1xuXG4gICAgLy8gU2V0IGNvbHVtbiB3aWR0aHMgZm9yIGJldHRlciByZWFkYWJpbGl0eVxuICAgIHdvcmtzaGVldFsnIWNvbHMnXSA9IFtcbiAgICAgIHsgd2NoOiAxMiB9LCAvLyBnYW1lX2lkXG4gICAgICB7IHdjaDogMzAgfSwgLy8gZ2FtZV9uYW1lXG4gICAgICB7IHdjaDogMTIgfSwgLy8gc3R1ZGVudF9pZFxuICAgICAgeyB3Y2g6IDI1IH0sIC8vIHN1YmplY3RcbiAgICAgIHsgd2NoOiAxNSB9LCAvLyBkaWZmaWN1bHR5XG4gICAgICB7IHdjaDogMTIgfSwgLy8gdGVhY2hlcl9pZFxuICAgICAgeyB3Y2g6IDIwIH0sIC8vIGxhc3RfdXBkYXRlXG4gICAgICB7IHdjaDogMTUgfSwgLy8gc2NyYXRjaF9pZFxuICAgICAgeyB3Y2g6IDQwIH0sIC8vIHNjcmF0Y2hfYXBpXG4gICAgICB7IHdjaDogMTUgfSwgLy8gYWNjdW11bGF0ZWRfY2xpY2tcbiAgICAgIHsgd2NoOiA1MCB9LCAvLyBkZXNjcmlwdGlvblxuICAgIF07XG5cbiAgICAvLyBHZW5lcmF0ZSBFeGNlbCBmaWxlIGJ1ZmZlclxuICAgIGNvbnN0IGV4Y2VsQnVmZmVyID0gWExTWC53cml0ZSh3b3JrYm9vaywgeyB0eXBlOiAnYnVmZmVyJywgYm9va1R5cGU6ICd4bHN4JyB9KTtcblxuICAgIC8vIFJldHVybiBFeGNlbCBmaWxlIGFzIHJlc3BvbnNlXG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQuc3ByZWFkc2hlZXRtbC5zaGVldCcsXG4gICAgICAgICdDb250ZW50LURpc3Bvc2l0aW9uJzogYGF0dGFjaG1lbnQ7IGZpbGVuYW1lPVwiZ2FtZXNfJHtuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkuc3BsaXQoJ1QnKVswXX0ueGxzeFwiYCxcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgIH0sXG4gICAgICBib2R5OiBleGNlbEJ1ZmZlci50b1N0cmluZygnYmFzZTY0JyksXG4gICAgICBpc0Jhc2U2NEVuY29kZWQ6IHRydWUsXG4gICAgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBkb3dubG9hZGluZyBnYW1lczonLCBlcnJvcik7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1c0NvZGU6IDUwMCxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IFxuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgbWVzc2FnZTogJ0ZhaWxlZCB0byBkb3dubG9hZCBnYW1lcyBkYXRhJyxcbiAgICAgICAgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InXG4gICAgICB9KSxcbiAgICB9O1xuICB9XG59O1xuIl19