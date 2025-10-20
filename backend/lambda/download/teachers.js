"use strict";
/**
 * Download Teachers Lambda Handler
 * Handles Excel export for teacher data
 * - Admin only - access control should be enforced at API Gateway level
 * - Returns Excel file (.xlsx) with proper structure
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const XLSX = require("xlsx");
const dynamodb_client_1 = require("../utils/dynamodb-client");
const handler = async (event) => {
    try {
        // Get all teachers from DynamoDB
        const scanCommand = new lib_dynamodb_1.ScanCommand({
            TableName: dynamodb_client_1.tableNames.teachers,
        });
        const result = await dynamodb_client_1.dynamoDBClient.send(scanCommand);
        const teachers = result.Items;
        // Sort teachers by teacher_id
        teachers.sort((a, b) => a.teacher_id.localeCompare(b.teacher_id));
        // Prepare data for Excel (including password field)
        const excelData = teachers.map(teacher => ({
            teacher_id: teacher.teacher_id,
            name: teacher.name,
            responsible_class: teacher.responsible_class.join(', '), // Convert array to comma-separated string
            last_login: teacher.last_login,
            is_admin: teacher.is_admin ? 'Yes' : 'No',
            password: teacher.password,
        }));
        // Create Excel workbook
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Teachers');
        // Set column widths for better readability
        worksheet['!cols'] = [
            { wch: 12 }, // teacher_id
            { wch: 20 }, // name
            { wch: 30 }, // responsible_class
            { wch: 20 }, // last_login
            { wch: 10 }, // is_admin
            { wch: 15 }, // password
        ];
        // Generate Excel file buffer
        const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        // Return Excel file as response
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="teachers_${new Date().toISOString().split('T')[0]}.xlsx"`,
                'Access-Control-Allow-Origin': '*',
            },
            body: excelBuffer.toString('base64'),
            isBase64Encoded: true,
        };
    }
    catch (error) {
        console.error('Error downloading teachers:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                message: 'Failed to download teacher data',
                error: error instanceof Error ? error.message : 'Unknown error'
            }),
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVhY2hlcnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0ZWFjaGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7OztBQUVILHdEQUFvRDtBQUVwRCw2QkFBNkI7QUFDN0IsOERBQXNFO0FBVy9ELE1BQU0sT0FBTyxHQUFHLEtBQUssRUFDMUIsS0FBMkIsRUFDSyxFQUFFO0lBQ2xDLElBQUksQ0FBQztRQUNILGlDQUFpQztRQUNqQyxNQUFNLFdBQVcsR0FBRyxJQUFJLDBCQUFXLENBQUM7WUFDbEMsU0FBUyxFQUFFLDRCQUFVLENBQUMsUUFBUTtTQUMvQixDQUFDLENBQUM7UUFDSCxNQUFNLE1BQU0sR0FBRyxNQUFNLGdDQUFjLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxLQUF3QixDQUFDO1FBRWpELDhCQUE4QjtRQUM5QixRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFFbEUsb0RBQW9EO1FBQ3BELE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3pDLFVBQVUsRUFBRSxPQUFPLENBQUMsVUFBVTtZQUM5QixJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUk7WUFDbEIsaUJBQWlCLEVBQUUsT0FBTyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSwwQ0FBMEM7WUFDbkcsVUFBVSxFQUFFLE9BQU8sQ0FBQyxVQUFVO1lBQzlCLFFBQVEsRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUk7WUFDekMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxRQUFRO1NBQzNCLENBQUMsQ0FBQyxDQUFDO1FBRUosd0JBQXdCO1FBQ3hCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDdkMsSUFBSSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBRTlELDJDQUEyQztRQUMzQyxTQUFTLENBQUMsT0FBTyxDQUFDLEdBQUc7WUFDbkIsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsYUFBYTtZQUMxQixFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxPQUFPO1lBQ3BCLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLG9CQUFvQjtZQUNqQyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxhQUFhO1lBQzFCLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLFdBQVc7WUFDeEIsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsV0FBVztTQUN6QixDQUFDO1FBRUYsNkJBQTZCO1FBQzdCLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUUvRSxnQ0FBZ0M7UUFDaEMsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFO2dCQUNQLGNBQWMsRUFBRSxtRUFBbUU7Z0JBQ25GLHFCQUFxQixFQUFFLGtDQUFrQyxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUTtnQkFDdkcsNkJBQTZCLEVBQUUsR0FBRzthQUNuQztZQUNELElBQUksRUFBRSxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQztZQUNwQyxlQUFlLEVBQUUsSUFBSTtTQUN0QixDQUFDO0lBQ0osQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLDZCQUE2QixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3BELE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU8sRUFBRTtnQkFDUCxjQUFjLEVBQUUsa0JBQWtCO2dCQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2FBQ25DO1lBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7Z0JBQ25CLE9BQU8sRUFBRSxLQUFLO2dCQUNkLE9BQU8sRUFBRSxpQ0FBaUM7Z0JBQzFDLEtBQUssRUFBRSxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxlQUFlO2FBQ2hFLENBQUM7U0FDSCxDQUFDO0lBQ0osQ0FBQztBQUNILENBQUMsQ0FBQztBQXBFVyxRQUFBLE9BQU8sV0FvRWxCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBEb3dubG9hZCBUZWFjaGVycyBMYW1iZGEgSGFuZGxlclxuICogSGFuZGxlcyBFeGNlbCBleHBvcnQgZm9yIHRlYWNoZXIgZGF0YVxuICogLSBBZG1pbiBvbmx5IC0gYWNjZXNzIGNvbnRyb2wgc2hvdWxkIGJlIGVuZm9yY2VkIGF0IEFQSSBHYXRld2F5IGxldmVsXG4gKiAtIFJldHVybnMgRXhjZWwgZmlsZSAoLnhsc3gpIHdpdGggcHJvcGVyIHN0cnVjdHVyZVxuICovXG5cbmltcG9ydCB7IFNjYW5Db21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvbGliLWR5bmFtb2RiJztcbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcbmltcG9ydCAqIGFzIFhMU1ggZnJvbSAneGxzeCc7XG5pbXBvcnQgeyBkeW5hbW9EQkNsaWVudCwgdGFibGVOYW1lcyB9IGZyb20gJy4uL3V0aWxzL2R5bmFtb2RiLWNsaWVudCc7XG5cbmludGVyZmFjZSBUZWFjaGVyUmVjb3JkIHtcbiAgdGVhY2hlcl9pZDogc3RyaW5nO1xuICBuYW1lOiBzdHJpbmc7XG4gIHBhc3N3b3JkOiBzdHJpbmc7XG4gIHJlc3BvbnNpYmxlX2NsYXNzOiBzdHJpbmdbXTtcbiAgbGFzdF9sb2dpbjogc3RyaW5nO1xuICBpc19hZG1pbjogYm9vbGVhbjtcbn1cblxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoXG4gIGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudFxuKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcbiAgdHJ5IHtcbiAgICAvLyBHZXQgYWxsIHRlYWNoZXJzIGZyb20gRHluYW1vREJcbiAgICBjb25zdCBzY2FuQ29tbWFuZCA9IG5ldyBTY2FuQ29tbWFuZCh7XG4gICAgICBUYWJsZU5hbWU6IHRhYmxlTmFtZXMudGVhY2hlcnMsXG4gICAgfSk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZHluYW1vREJDbGllbnQuc2VuZChzY2FuQ29tbWFuZCk7XG4gICAgY29uc3QgdGVhY2hlcnMgPSByZXN1bHQuSXRlbXMgYXMgVGVhY2hlclJlY29yZFtdO1xuXG4gICAgLy8gU29ydCB0ZWFjaGVycyBieSB0ZWFjaGVyX2lkXG4gICAgdGVhY2hlcnMuc29ydCgoYSwgYikgPT4gYS50ZWFjaGVyX2lkLmxvY2FsZUNvbXBhcmUoYi50ZWFjaGVyX2lkKSk7XG5cbiAgICAvLyBQcmVwYXJlIGRhdGEgZm9yIEV4Y2VsIChpbmNsdWRpbmcgcGFzc3dvcmQgZmllbGQpXG4gICAgY29uc3QgZXhjZWxEYXRhID0gdGVhY2hlcnMubWFwKHRlYWNoZXIgPT4gKHtcbiAgICAgIHRlYWNoZXJfaWQ6IHRlYWNoZXIudGVhY2hlcl9pZCxcbiAgICAgIG5hbWU6IHRlYWNoZXIubmFtZSxcbiAgICAgIHJlc3BvbnNpYmxlX2NsYXNzOiB0ZWFjaGVyLnJlc3BvbnNpYmxlX2NsYXNzLmpvaW4oJywgJyksIC8vIENvbnZlcnQgYXJyYXkgdG8gY29tbWEtc2VwYXJhdGVkIHN0cmluZ1xuICAgICAgbGFzdF9sb2dpbjogdGVhY2hlci5sYXN0X2xvZ2luLFxuICAgICAgaXNfYWRtaW46IHRlYWNoZXIuaXNfYWRtaW4gPyAnWWVzJyA6ICdObycsXG4gICAgICBwYXNzd29yZDogdGVhY2hlci5wYXNzd29yZCxcbiAgICB9KSk7XG5cbiAgICAvLyBDcmVhdGUgRXhjZWwgd29ya2Jvb2tcbiAgICBjb25zdCB3b3Jrc2hlZXQgPSBYTFNYLnV0aWxzLmpzb25fdG9fc2hlZXQoZXhjZWxEYXRhKTtcbiAgICBjb25zdCB3b3JrYm9vayA9IFhMU1gudXRpbHMuYm9va19uZXcoKTtcbiAgICBYTFNYLnV0aWxzLmJvb2tfYXBwZW5kX3NoZWV0KHdvcmtib29rLCB3b3Jrc2hlZXQsICdUZWFjaGVycycpO1xuXG4gICAgLy8gU2V0IGNvbHVtbiB3aWR0aHMgZm9yIGJldHRlciByZWFkYWJpbGl0eVxuICAgIHdvcmtzaGVldFsnIWNvbHMnXSA9IFtcbiAgICAgIHsgd2NoOiAxMiB9LCAvLyB0ZWFjaGVyX2lkXG4gICAgICB7IHdjaDogMjAgfSwgLy8gbmFtZVxuICAgICAgeyB3Y2g6IDMwIH0sIC8vIHJlc3BvbnNpYmxlX2NsYXNzXG4gICAgICB7IHdjaDogMjAgfSwgLy8gbGFzdF9sb2dpblxuICAgICAgeyB3Y2g6IDEwIH0sIC8vIGlzX2FkbWluXG4gICAgICB7IHdjaDogMTUgfSwgLy8gcGFzc3dvcmRcbiAgICBdO1xuXG4gICAgLy8gR2VuZXJhdGUgRXhjZWwgZmlsZSBidWZmZXJcbiAgICBjb25zdCBleGNlbEJ1ZmZlciA9IFhMU1gud3JpdGUod29ya2Jvb2ssIHsgdHlwZTogJ2J1ZmZlcicsIGJvb2tUeXBlOiAneGxzeCcgfSk7XG5cbiAgICAvLyBSZXR1cm4gRXhjZWwgZmlsZSBhcyByZXNwb25zZVxuICAgIHJldHVybiB7XG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vdm5kLm9wZW54bWxmb3JtYXRzLW9mZmljZWRvY3VtZW50LnNwcmVhZHNoZWV0bWwuc2hlZXQnLFxuICAgICAgICAnQ29udGVudC1EaXNwb3NpdGlvbic6IGBhdHRhY2htZW50OyBmaWxlbmFtZT1cInRlYWNoZXJzXyR7bmV3IERhdGUoKS50b0lTT1N0cmluZygpLnNwbGl0KCdUJylbMF19Lnhsc3hcImAsXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICAgICB9LFxuICAgICAgYm9keTogZXhjZWxCdWZmZXIudG9TdHJpbmcoJ2Jhc2U2NCcpLFxuICAgICAgaXNCYXNlNjRFbmNvZGVkOiB0cnVlLFxuICAgIH07XG4gIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgZG93bmxvYWRpbmcgdGVhY2hlcnM6JywgZXJyb3IpO1xuICAgIHJldHVybiB7XG4gICAgICBzdGF0dXNDb2RlOiA1MDAsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICAgICB9LFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBcbiAgICAgICAgc3VjY2VzczogZmFsc2UsXG4gICAgICAgIG1lc3NhZ2U6ICdGYWlsZWQgdG8gZG93bmxvYWQgdGVhY2hlciBkYXRhJyxcbiAgICAgICAgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InXG4gICAgICB9KSxcbiAgICB9O1xuICB9XG59O1xuIl19