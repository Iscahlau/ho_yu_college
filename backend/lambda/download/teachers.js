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
            { wch: 64 }, // password (hash)
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVhY2hlcnMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0ZWFjaGVycy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7OztBQUVILDhEQUEwRDtBQUMxRCx3REFBNEU7QUFFNUUsNkJBQTZCO0FBRTdCLE1BQU0sTUFBTSxHQUFHLElBQUksZ0NBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUN0QyxNQUFNLFNBQVMsR0FBRyxxQ0FBc0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7QUFXL0MsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUMxQixLQUEyQixFQUNLLEVBQUU7SUFDbEMsSUFBSSxDQUFDO1FBQ0gsaUNBQWlDO1FBQ2pDLE1BQU0sV0FBVyxHQUFHLElBQUksMEJBQVcsQ0FBQztZQUNsQyxTQUFTLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsSUFBSSxnQkFBZ0I7U0FDL0QsQ0FBQyxDQUFDO1FBQ0gsTUFBTSxNQUFNLEdBQUcsTUFBTSxTQUFTLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQ2pELE1BQU0sUUFBUSxHQUFHLE1BQU0sQ0FBQyxLQUF3QixDQUFDO1FBRWpELDhCQUE4QjtRQUM5QixRQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxhQUFhLENBQUMsQ0FBQyxDQUFDLFVBQVUsQ0FBQyxDQUFDLENBQUM7UUFFbEUsb0RBQW9EO1FBQ3BELE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxHQUFHLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQ3pDLFVBQVUsRUFBRSxPQUFPLENBQUMsVUFBVTtZQUM5QixJQUFJLEVBQUUsT0FBTyxDQUFDLElBQUk7WUFDbEIsaUJBQWlCLEVBQUUsT0FBTyxDQUFDLGlCQUFpQixDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsRUFBRSwwQ0FBMEM7WUFDbkcsVUFBVSxFQUFFLE9BQU8sQ0FBQyxVQUFVO1lBQzlCLFFBQVEsRUFBRSxPQUFPLENBQUMsUUFBUSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLElBQUk7WUFDekMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxRQUFRO1NBQzNCLENBQUMsQ0FBQyxDQUFDO1FBRUosd0JBQXdCO1FBQ3hCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3RELE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLENBQUM7UUFDdkMsSUFBSSxDQUFDLEtBQUssQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsU0FBUyxFQUFFLFVBQVUsQ0FBQyxDQUFDO1FBRTlELDJDQUEyQztRQUMzQyxTQUFTLENBQUMsT0FBTyxDQUFDLEdBQUc7WUFDbkIsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsYUFBYTtZQUMxQixFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxPQUFPO1lBQ3BCLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLG9CQUFvQjtZQUNqQyxFQUFFLEdBQUcsRUFBRSxFQUFFLEVBQUUsRUFBRSxhQUFhO1lBQzFCLEVBQUUsR0FBRyxFQUFFLEVBQUUsRUFBRSxFQUFFLFdBQVc7WUFDeEIsRUFBRSxHQUFHLEVBQUUsRUFBRSxFQUFFLEVBQUUsa0JBQWtCO1NBQ2hDLENBQUM7UUFFRiw2QkFBNkI7UUFDN0IsTUFBTSxXQUFXLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRSxJQUFJLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO1FBRS9FLGdDQUFnQztRQUNoQyxPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUU7Z0JBQ1AsY0FBYyxFQUFFLG1FQUFtRTtnQkFDbkYscUJBQXFCLEVBQUUsa0NBQWtDLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFLENBQUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRO2dCQUN2Ryw2QkFBNkIsRUFBRSxHQUFHO2FBQ25DO1lBQ0QsSUFBSSxFQUFFLFdBQVcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDO1lBQ3BDLGVBQWUsRUFBRSxJQUFJO1NBQ3RCLENBQUM7SUFDSixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsNkJBQTZCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDcEQsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFO2dCQUNQLGNBQWMsRUFBRSxrQkFBa0I7Z0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7YUFDbkM7WUFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztnQkFDbkIsT0FBTyxFQUFFLEtBQUs7Z0JBQ2QsT0FBTyxFQUFFLGlDQUFpQztnQkFDMUMsS0FBSyxFQUFFLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGVBQWU7YUFDaEUsQ0FBQztTQUNILENBQUM7SUFDSixDQUFDO0FBQ0gsQ0FBQyxDQUFDO0FBcEVXLFFBQUEsT0FBTyxXQW9FbEIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIERvd25sb2FkIFRlYWNoZXJzIExhbWJkYSBIYW5kbGVyXG4gKiBIYW5kbGVzIEV4Y2VsIGV4cG9ydCBmb3IgdGVhY2hlciBkYXRhXG4gKiAtIEFkbWluIG9ubHkgLSBhY2Nlc3MgY29udHJvbCBzaG91bGQgYmUgZW5mb3JjZWQgYXQgQVBJIEdhdGV3YXkgbGV2ZWxcbiAqIC0gUmV0dXJucyBFeGNlbCBmaWxlICgueGxzeCkgd2l0aCBwcm9wZXIgc3RydWN0dXJlXG4gKi9cblxuaW1wb3J0IHsgRHluYW1vREJDbGllbnQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xuaW1wb3J0IHsgRHluYW1vREJEb2N1bWVudENsaWVudCwgU2NhbkNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0ICogYXMgWExTWCBmcm9tICd4bHN4JztcblxuY29uc3QgY2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHt9KTtcbmNvbnN0IGRvY0NsaWVudCA9IER5bmFtb0RCRG9jdW1lbnRDbGllbnQuZnJvbShjbGllbnQpO1xuXG5pbnRlcmZhY2UgVGVhY2hlclJlY29yZCB7XG4gIHRlYWNoZXJfaWQ6IHN0cmluZztcbiAgbmFtZTogc3RyaW5nO1xuICBwYXNzd29yZDogc3RyaW5nO1xuICByZXNwb25zaWJsZV9jbGFzczogc3RyaW5nW107XG4gIGxhc3RfbG9naW46IHN0cmluZztcbiAgaXNfYWRtaW46IGJvb2xlYW47XG59XG5cbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKFxuICBldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnRcbik6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XG4gIHRyeSB7XG4gICAgLy8gR2V0IGFsbCB0ZWFjaGVycyBmcm9tIER5bmFtb0RCXG4gICAgY29uc3Qgc2NhbkNvbW1hbmQgPSBuZXcgU2NhbkNvbW1hbmQoe1xuICAgICAgVGFibGVOYW1lOiBwcm9jZXNzLmVudi5URUFDSEVSU19UQUJMRV9OQU1FIHx8ICdoby15dS10ZWFjaGVycycsXG4gICAgfSk7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZG9jQ2xpZW50LnNlbmQoc2NhbkNvbW1hbmQpO1xuICAgIGNvbnN0IHRlYWNoZXJzID0gcmVzdWx0Lkl0ZW1zIGFzIFRlYWNoZXJSZWNvcmRbXTtcblxuICAgIC8vIFNvcnQgdGVhY2hlcnMgYnkgdGVhY2hlcl9pZFxuICAgIHRlYWNoZXJzLnNvcnQoKGEsIGIpID0+IGEudGVhY2hlcl9pZC5sb2NhbGVDb21wYXJlKGIudGVhY2hlcl9pZCkpO1xuXG4gICAgLy8gUHJlcGFyZSBkYXRhIGZvciBFeGNlbCAoaW5jbHVkaW5nIHBhc3N3b3JkIGZpZWxkKVxuICAgIGNvbnN0IGV4Y2VsRGF0YSA9IHRlYWNoZXJzLm1hcCh0ZWFjaGVyID0+ICh7XG4gICAgICB0ZWFjaGVyX2lkOiB0ZWFjaGVyLnRlYWNoZXJfaWQsXG4gICAgICBuYW1lOiB0ZWFjaGVyLm5hbWUsXG4gICAgICByZXNwb25zaWJsZV9jbGFzczogdGVhY2hlci5yZXNwb25zaWJsZV9jbGFzcy5qb2luKCcsICcpLCAvLyBDb252ZXJ0IGFycmF5IHRvIGNvbW1hLXNlcGFyYXRlZCBzdHJpbmdcbiAgICAgIGxhc3RfbG9naW46IHRlYWNoZXIubGFzdF9sb2dpbixcbiAgICAgIGlzX2FkbWluOiB0ZWFjaGVyLmlzX2FkbWluID8gJ1llcycgOiAnTm8nLFxuICAgICAgcGFzc3dvcmQ6IHRlYWNoZXIucGFzc3dvcmQsXG4gICAgfSkpO1xuXG4gICAgLy8gQ3JlYXRlIEV4Y2VsIHdvcmtib29rXG4gICAgY29uc3Qgd29ya3NoZWV0ID0gWExTWC51dGlscy5qc29uX3RvX3NoZWV0KGV4Y2VsRGF0YSk7XG4gICAgY29uc3Qgd29ya2Jvb2sgPSBYTFNYLnV0aWxzLmJvb2tfbmV3KCk7XG4gICAgWExTWC51dGlscy5ib29rX2FwcGVuZF9zaGVldCh3b3JrYm9vaywgd29ya3NoZWV0LCAnVGVhY2hlcnMnKTtcblxuICAgIC8vIFNldCBjb2x1bW4gd2lkdGhzIGZvciBiZXR0ZXIgcmVhZGFiaWxpdHlcbiAgICB3b3Jrc2hlZXRbJyFjb2xzJ10gPSBbXG4gICAgICB7IHdjaDogMTIgfSwgLy8gdGVhY2hlcl9pZFxuICAgICAgeyB3Y2g6IDIwIH0sIC8vIG5hbWVcbiAgICAgIHsgd2NoOiAzMCB9LCAvLyByZXNwb25zaWJsZV9jbGFzc1xuICAgICAgeyB3Y2g6IDIwIH0sIC8vIGxhc3RfbG9naW5cbiAgICAgIHsgd2NoOiAxMCB9LCAvLyBpc19hZG1pblxuICAgICAgeyB3Y2g6IDY0IH0sIC8vIHBhc3N3b3JkIChoYXNoKVxuICAgIF07XG5cbiAgICAvLyBHZW5lcmF0ZSBFeGNlbCBmaWxlIGJ1ZmZlclxuICAgIGNvbnN0IGV4Y2VsQnVmZmVyID0gWExTWC53cml0ZSh3b3JrYm9vaywgeyB0eXBlOiAnYnVmZmVyJywgYm9va1R5cGU6ICd4bHN4JyB9KTtcblxuICAgIC8vIFJldHVybiBFeGNlbCBmaWxlIGFzIHJlc3BvbnNlXG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQuc3ByZWFkc2hlZXRtbC5zaGVldCcsXG4gICAgICAgICdDb250ZW50LURpc3Bvc2l0aW9uJzogYGF0dGFjaG1lbnQ7IGZpbGVuYW1lPVwidGVhY2hlcnNfJHtuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkuc3BsaXQoJ1QnKVswXX0ueGxzeFwiYCxcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgIH0sXG4gICAgICBib2R5OiBleGNlbEJ1ZmZlci50b1N0cmluZygnYmFzZTY0JyksXG4gICAgICBpc0Jhc2U2NEVuY29kZWQ6IHRydWUsXG4gICAgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBkb3dubG9hZGluZyB0ZWFjaGVyczonLCBlcnJvcik7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1c0NvZGU6IDUwMCxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IFxuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgbWVzc2FnZTogJ0ZhaWxlZCB0byBkb3dubG9hZCB0ZWFjaGVyIGRhdGEnLFxuICAgICAgICBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcidcbiAgICAgIH0pLFxuICAgIH07XG4gIH1cbn07XG4iXX0=