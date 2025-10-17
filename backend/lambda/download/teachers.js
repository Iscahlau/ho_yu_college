"use strict";
/**
 * Download Teachers Lambda Handler
 * Handles Excel export for teacher data
 * - Admin only - access control should be enforced at API Gateway level
 * - Returns Excel file (.xlsx) with proper structure
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
        // Get all teachers from DynamoDB
        const scanCommand = new lib_dynamodb_1.ScanCommand({
            TableName: process.env.TEACHERS_TABLE_NAME || 'ho-yu-teachers',
        });
        const result = await docClient.send(scanCommand);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVhY2hlcnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0ZWFjaGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7OztBQUVILDhEQUEwRDtBQUMxRCx3REFBNEU7QUFFNUUsNkJBQTZCO0FBRTdCLE1BQU0sTUFBTSxHQUFHLElBQUksZ0NBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUN0QyxNQUFNLFNBQVMsR0FBRyxxQ0FBc0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7QUFXL0MsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUMxQixLQUEyQixFQUNLLEVBQUU7SUFDbEMsSUFBSSxDQUFDO1FBQ0gsaUNBQWlDO1FBQ2pDLE1BQU0sV0FBVyxHQUFHLElBQUksMEJBQVcsQ0FBQztZQUNsQyxTQUFTLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsSUFBSSxnQkFBZ0I7U0FDL0QsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxNQUFNLEdBQUcsTUFBTSxTQUFTLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ2pELE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxLQUF3QixDQUFDO1FBRWpELDhCQUE4QjtRQUM5QixRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFFbEUsb0RBQW9EO1FBQ3BELE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3pDLFVBQVUsRUFBRSxPQUFPLENBQUMsVUFBVTtZQUM5QixJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUk7WUFDbEIsaUJBQWlCLEVBQUUsT0FBTyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSwwQ0FBMEM7WUFDbkcsVUFBVSxFQUFFLE9BQU8sQ0FBQyxVQUFVO1lBQzlCLFFBQVEsRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUk7WUFDekMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxRQUFRO1NBQzNCLENBQUMsQ0FBQyxDQUFDO1FBRUosd0JBQXdCO1FBQ3hCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDdkMsSUFBSSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBRTlELDJDQUEyQztRQUMzQyxTQUFTLENBQUMsT0FBTyxDQUFDLEdBQUc7WUFDbkIsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsYUFBYTtZQUMxQixFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxPQUFPO1lBQ3BCLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLG9CQUFvQjtZQUNqQyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxhQUFhO1lBQzFCLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLFdBQVc7WUFDeEIsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsV0FBVztTQUN6QixDQUFDO1FBRUYsNkJBQTZCO1FBQzdCLE1BQU0sV0FBVyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxRQUFRLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztRQUUvRSxnQ0FBZ0M7UUFDaEMsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFO2dCQUNQLGNBQWMsRUFBRSxtRUFBbUU7Z0JBQ25GLHFCQUFxQixFQUFFLGtDQUFrQyxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRSxDQUFDLEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUTtnQkFDdkcsNkJBQTZCLEVBQUUsR0FBRzthQUNuQztZQUNELElBQUksRUFBRSxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQztZQUNwQyxlQUFlLEVBQUUsSUFBSTtTQUN0QixDQUFDO0lBQ0osQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLDZCQUE2QixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3BELE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU8sRUFBRTtnQkFDUCxjQUFjLEVBQUUsa0JBQWtCO2dCQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2FBQ25DO1lBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7Z0JBQ25CLE9BQU8sRUFBRSxLQUFLO2dCQUNkLE9BQU8sRUFBRSxpQ0FBaUM7Z0JBQzFDLEtBQUssRUFBRSxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxlQUFlO2FBQ2hFLENBQUM7U0FDSCxDQUFDO0lBQ0osQ0FBQztBQUNILENBQUMsQ0FBQztBQXBFVyxRQUFBLE9BQU8sV0FvRWxCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBEb3dubG9hZCBUZWFjaGVycyBMYW1iZGEgSGFuZGxlclxuICogSGFuZGxlcyBFeGNlbCBleHBvcnQgZm9yIHRlYWNoZXIgZGF0YVxuICogLSBBZG1pbiBvbmx5IC0gYWNjZXNzIGNvbnRyb2wgc2hvdWxkIGJlIGVuZm9yY2VkIGF0IEFQSSBHYXRld2F5IGxldmVsXG4gKiAtIFJldHVybnMgRXhjZWwgZmlsZSAoLnhsc3gpIHdpdGggcHJvcGVyIHN0cnVjdHVyZVxuICovXG5cbmltcG9ydCB7IER5bmFtb0RCQ2xpZW50IH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJztcbmltcG9ydCB7IER5bmFtb0RCRG9jdW1lbnRDbGllbnQsIFNjYW5Db21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvbGliLWR5bmFtb2RiJztcbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcbmltcG9ydCAqIGFzIFhMU1ggZnJvbSAneGxzeCc7XG5cbmNvbnN0IGNsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudCh7fSk7XG5jb25zdCBkb2NDbGllbnQgPSBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LmZyb20oY2xpZW50KTtcblxuaW50ZXJmYWNlIFRlYWNoZXJSZWNvcmQge1xuICB0ZWFjaGVyX2lkOiBzdHJpbmc7XG4gIG5hbWU6IHN0cmluZztcbiAgcGFzc3dvcmQ6IHN0cmluZztcbiAgcmVzcG9uc2libGVfY2xhc3M6IHN0cmluZ1tdO1xuICBsYXN0X2xvZ2luOiBzdHJpbmc7XG4gIGlzX2FkbWluOiBib29sZWFuO1xufVxuXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChcbiAgZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50XG4pOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xuICB0cnkge1xuICAgIC8vIEdldCBhbGwgdGVhY2hlcnMgZnJvbSBEeW5hbW9EQlxuICAgIGNvbnN0IHNjYW5Db21tYW5kID0gbmV3IFNjYW5Db21tYW5kKHtcbiAgICAgIFRhYmxlTmFtZTogcHJvY2Vzcy5lbnYuVEVBQ0hFUlNfVEFCTEVfTkFNRSB8fCAnaG8teXUtdGVhY2hlcnMnLFxuICAgIH0pO1xuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGRvY0NsaWVudC5zZW5kKHNjYW5Db21tYW5kKTtcbiAgICBjb25zdCB0ZWFjaGVycyA9IHJlc3VsdC5JdGVtcyBhcyBUZWFjaGVyUmVjb3JkW107XG5cbiAgICAvLyBTb3J0IHRlYWNoZXJzIGJ5IHRlYWNoZXJfaWRcbiAgICB0ZWFjaGVycy5zb3J0KChhLCBiKSA9PiBhLnRlYWNoZXJfaWQubG9jYWxlQ29tcGFyZShiLnRlYWNoZXJfaWQpKTtcblxuICAgIC8vIFByZXBhcmUgZGF0YSBmb3IgRXhjZWwgKGluY2x1ZGluZyBwYXNzd29yZCBmaWVsZClcbiAgICBjb25zdCBleGNlbERhdGEgPSB0ZWFjaGVycy5tYXAodGVhY2hlciA9PiAoe1xuICAgICAgdGVhY2hlcl9pZDogdGVhY2hlci50ZWFjaGVyX2lkLFxuICAgICAgbmFtZTogdGVhY2hlci5uYW1lLFxuICAgICAgcmVzcG9uc2libGVfY2xhc3M6IHRlYWNoZXIucmVzcG9uc2libGVfY2xhc3Muam9pbignLCAnKSwgLy8gQ29udmVydCBhcnJheSB0byBjb21tYS1zZXBhcmF0ZWQgc3RyaW5nXG4gICAgICBsYXN0X2xvZ2luOiB0ZWFjaGVyLmxhc3RfbG9naW4sXG4gICAgICBpc19hZG1pbjogdGVhY2hlci5pc19hZG1pbiA/ICdZZXMnIDogJ05vJyxcbiAgICAgIHBhc3N3b3JkOiB0ZWFjaGVyLnBhc3N3b3JkLFxuICAgIH0pKTtcblxuICAgIC8vIENyZWF0ZSBFeGNlbCB3b3JrYm9va1xuICAgIGNvbnN0IHdvcmtzaGVldCA9IFhMU1gudXRpbHMuanNvbl90b19zaGVldChleGNlbERhdGEpO1xuICAgIGNvbnN0IHdvcmtib29rID0gWExTWC51dGlscy5ib29rX25ldygpO1xuICAgIFhMU1gudXRpbHMuYm9va19hcHBlbmRfc2hlZXQod29ya2Jvb2ssIHdvcmtzaGVldCwgJ1RlYWNoZXJzJyk7XG5cbiAgICAvLyBTZXQgY29sdW1uIHdpZHRocyBmb3IgYmV0dGVyIHJlYWRhYmlsaXR5XG4gICAgd29ya3NoZWV0WychY29scyddID0gW1xuICAgICAgeyB3Y2g6IDEyIH0sIC8vIHRlYWNoZXJfaWRcbiAgICAgIHsgd2NoOiAyMCB9LCAvLyBuYW1lXG4gICAgICB7IHdjaDogMzAgfSwgLy8gcmVzcG9uc2libGVfY2xhc3NcbiAgICAgIHsgd2NoOiAyMCB9LCAvLyBsYXN0X2xvZ2luXG4gICAgICB7IHdjaDogMTAgfSwgLy8gaXNfYWRtaW5cbiAgICAgIHsgd2NoOiAxNSB9LCAvLyBwYXNzd29yZFxuICAgIF07XG5cbiAgICAvLyBHZW5lcmF0ZSBFeGNlbCBmaWxlIGJ1ZmZlclxuICAgIGNvbnN0IGV4Y2VsQnVmZmVyID0gWExTWC53cml0ZSh3b3JrYm9vaywgeyB0eXBlOiAnYnVmZmVyJywgYm9va1R5cGU6ICd4bHN4JyB9KTtcblxuICAgIC8vIFJldHVybiBFeGNlbCBmaWxlIGFzIHJlc3BvbnNlXG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQuc3ByZWFkc2hlZXRtbC5zaGVldCcsXG4gICAgICAgICdDb250ZW50LURpc3Bvc2l0aW9uJzogYGF0dGFjaG1lbnQ7IGZpbGVuYW1lPVwidGVhY2hlcnNfJHtuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkuc3BsaXQoJ1QnKVswXX0ueGxzeFwiYCxcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgIH0sXG4gICAgICBib2R5OiBleGNlbEJ1ZmZlci50b1N0cmluZygnYmFzZTY0JyksXG4gICAgICBpc0Jhc2U2NEVuY29kZWQ6IHRydWUsXG4gICAgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBkb3dubG9hZGluZyB0ZWFjaGVyczonLCBlcnJvcik7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1c0NvZGU6IDUwMCxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IFxuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgbWVzc2FnZTogJ0ZhaWxlZCB0byBkb3dubG9hZCB0ZWFjaGVyIGRhdGEnLFxuICAgICAgICBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcidcbiAgICAgIH0pLFxuICAgIH07XG4gIH1cbn07XG4iXX0=