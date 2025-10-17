"use strict";
/**
 * Download Students Lambda Handler
 * Handles Excel export for student data
 * - Teachers can only download data for their responsible classes
 * - Admins can download all student data
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
        // Get query parameters (optional class filter)
        const classFilter = event.queryStringParameters?.classes?.split(',') || [];
        // Get all students from DynamoDB
        let students = [];
        if (classFilter.length > 0) {
            // If class filter is provided, scan and filter by classes
            const scanCommand = new lib_dynamodb_1.ScanCommand({
                TableName: process.env.STUDENTS_TABLE_NAME || 'ho-yu-students',
            });
            const result = await docClient.send(scanCommand);
            students = result.Items
                .filter(student => classFilter.includes(student.class));
        }
        else {
            // No filter - get all students (admin access)
            const scanCommand = new lib_dynamodb_1.ScanCommand({
                TableName: process.env.STUDENTS_TABLE_NAME || 'ho-yu-students',
            });
            const result = await docClient.send(scanCommand);
            students = result.Items;
        }
        // Sort students by class and class_no
        students.sort((a, b) => {
            if (a.class !== b.class) {
                return a.class.localeCompare(b.class);
            }
            return a.class_no.localeCompare(b.class_no);
        });
        // Prepare data for Excel (including password field)
        const excelData = students.map(student => ({
            student_id: student.student_id,
            name_1: student.name_1,
            name_2: student.name_2,
            marks: student.marks,
            class: student.class,
            class_no: student.class_no,
            last_login: student.last_login,
            last_update: student.last_update,
            teacher_id: student.teacher_id,
            password: student.password,
        }));
        // Create Excel workbook
        const worksheet = XLSX.utils.json_to_sheet(excelData);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Students');
        // Set column widths for better readability
        worksheet['!cols'] = [
            { wch: 12 }, // student_id
            { wch: 20 }, // name_1
            { wch: 20 }, // name_2
            { wch: 8 }, // marks
            { wch: 8 }, // class
            { wch: 10 }, // class_no
            { wch: 20 }, // last_login
            { wch: 20 }, // last_update
            { wch: 12 }, // teacher_id
            { wch: 64 }, // password (hash)
        ];
        // Generate Excel file buffer
        const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
        // Return Excel file as response
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'Content-Disposition': `attachment; filename="students_${new Date().toISOString().split('T')[0]}.xlsx"`,
                'Access-Control-Allow-Origin': '*',
            },
            body: excelBuffer.toString('base64'),
            isBase64Encoded: true,
        };
    }
    catch (error) {
        console.error('Error downloading students:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: false,
                message: 'Failed to download student data',
                error: error instanceof Error ? error.message : 'Unknown error'
            }),
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3R1ZGVudHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzdHVkZW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFFSCw4REFBMEQ7QUFDMUQsd0RBQTBGO0FBRTFGLDZCQUE2QjtBQUU3QixNQUFNLE1BQU0sR0FBRyxJQUFJLGdDQUFjLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDdEMsTUFBTSxTQUFTLEdBQUcscUNBQXNCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBZS9DLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFDMUIsS0FBMkIsRUFDSyxFQUFFO0lBQ2xDLElBQUksQ0FBQztRQUNILCtDQUErQztRQUMvQyxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMscUJBQXFCLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUM7UUFFM0UsaUNBQWlDO1FBQ2pDLElBQUksUUFBUSxHQUFvQixFQUFFLENBQUM7UUFFbkMsSUFBSSxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzNCLDBEQUEwRDtZQUMxRCxNQUFNLFdBQVcsR0FBRyxJQUFJLDBCQUFXLENBQUM7Z0JBQ2xDLFNBQVMsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixJQUFJLGdCQUFnQjthQUMvRCxDQUFDLENBQUM7WUFDSCxNQUFNLE1BQU0sR0FBRyxNQUFNLFNBQVMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDakQsUUFBUSxHQUFJLE1BQU0sQ0FBQyxLQUF5QjtpQkFDekMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUM1RCxDQUFDO2FBQU0sQ0FBQztZQUNOLDhDQUE4QztZQUM5QyxNQUFNLFdBQVcsR0FBRyxJQUFJLDBCQUFXLENBQUM7Z0JBQ2xDLFNB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QUMsS0FBSyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxRQUFRO2dCQUN2Ryw2QkFBNkIsRUFBRSxHQUFHO2FBQ25DO1lBQ0QsSUFBSSxFQUFFLFdBQVcsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDO1lBQ3BDLGVBQWUsRUFBRSxJQUFJO1NBQ3RCLENBQUM7SUFDSixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsNkJBQTZCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDcEQsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFO2dCQUNQLGNBQWMsRUFBRSxrQkFBa0I7Z0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7YUFDbkM7WUFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztnQkFDbkIsT0FBTyxFQUFFLEtBQUs7Z0JBQ2QsT0FBTyxFQUFFLGlDQUFpQztnQkFDMUMsS0FBSyxFQUFFLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGVBQWU7YUFDaEUsQ0FBQztTQUNILENBQUM7SUFDSixDQUFDO0FBQ0gsQ0FBQyxDQUFDO0FBakdXLFFBQUEsT0FBTyxXQWlHbEIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIERvd25sb2FkIFN0dWRlbnRzIExhbWJkYSBIYW5kbGVyXG4gKiBIYW5kbGVzIEV4Y2VsIGV4cG9ydCBmb3Igc3R1ZGVudCBkYXRhXG4gKiAtIFRlYWNoZXJzIGNhbiBvbmx5IGRvd25sb2FkIGRhdGEgZm9yIHRoZWlyIHJlc3BvbnNpYmxlIGNsYXNzZXNcbiAqIC0gQWRtaW5zIGNhbiBkb3dubG9hZCBhbGwgc3R1ZGVudCBkYXRhXG4gKiAtIFJldHVybnMgRXhjZWwgZmlsZSAoLnhsc3gpIHdpdGggcHJvcGVyIHN0cnVjdHVyZVxuICovXG5cbmltcG9ydCB7IER5bmFtb0RCQ2xpZW50IH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJztcbmltcG9ydCB7IER5bmFtb0RCRG9jdW1lbnRDbGllbnQsIFNjYW5Db21tYW5kLCBRdWVyeUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0ICogYXMgWExTWCBmcm9tICd4bHN4JztcblxuY29uc3QgY2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHt9KTtcbmNvbnN0IGRvY0NsaWVudCA9IER5bmFtb0RCRG9jdW1lbnRDbGllbnQuZnJvbShjbGllbnQpO1xuXG5pbnRlcmZhY2UgU3R1ZGVudFJlY29yZCB7XG4gIHN0dWRlbnRfaWQ6IHN0cmluZztcbiAgbmFtZV8xOiBzdHJpbmc7XG4gIG5hbWVfMjogc3RyaW5nO1xuICBtYXJrczogbnVtYmVyO1xuICBjbGFzczogc3RyaW5nO1xuICBjbGFzc19ubzogc3RyaW5nO1xuICBsYXN0X2xvZ2luOiBzdHJpbmc7XG4gIGxhc3RfdXBkYXRlOiBzdHJpbmc7XG4gIHRlYWNoZXJfaWQ6IHN0cmluZztcbiAgcGFzc3dvcmQ6IHN0cmluZztcbn1cblxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoXG4gIGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudFxuKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcbiAgdHJ5IHtcbiAgICAvLyBHZXQgcXVlcnkgcGFyYW1ldGVycyAob3B0aW9uYWwgY2xhc3MgZmlsdGVyKVxuICAgIGNvbnN0IGNsYXNzRmlsdGVyID0gZXZlbnQucXVlcnlTdHJpbmdQYXJhbWV0ZXJzPy5jbGFzc2VzPy5zcGxpdCgnLCcpIHx8IFtdO1xuXG4gICAgLy8gR2V0IGFsbCBzdHVkZW50cyBmcm9tIER5bmFtb0RCXG4gICAgbGV0IHN0dWRlbnRzOiBTdHVkZW50UmVjb3JkW10gPSBbXTtcbiAgICBcbiAgICBpZiAoY2xhc3NGaWx0ZXIubGVuZ3RoID4gMCkge1xuICAgICAgLy8gSWYgY2xhc3MgZmlsdGVyIGlzIHByb3ZpZGVkLCBzY2FuIGFuZCBmaWx0ZXIgYnkgY2xhc3Nlc1xuICAgICAgY29uc3Qgc2NhbkNvbW1hbmQgPSBuZXcgU2NhbkNvbW1hbmQoe1xuICAgICAgICBUYWJsZU5hbWU6IHByb2Nlc3MuZW52LlNUVURFTlRTX1RBQkxFX05BTUUgfHwgJ2hvLXl1LXN0dWRlbnRzJyxcbiAgICAgIH0pO1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZG9jQ2xpZW50LnNlbmQoc2NhbkNvbW1hbmQpO1xuICAgICAgc3R1ZGVudHMgPSAocmVzdWx0Lkl0ZW1zIGFzIFN0dWRlbnRSZWNvcmRbXSlcbiAgICAgICAgLmZpbHRlcihzdHVkZW50ID0+IGNsYXNzRmlsdGVyLmluY2x1ZGVzKHN0dWRlbnQuY2xhc3MpKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLy8gTm8gZmlsdGVyIC0gZ2V0IGFsbCBzdHVkZW50cyAoYWRtaW4gYWNjZXNzKVxuICAgICAgY29uc3Qgc2NhbkNvbW1hbmQgPSBuZXcgU2NhbkNvbW1hbmQoe1xuICAgICAgICBUYWJsZU5hbWU6IHByb2Nlc3MuZW52LlNUVURFTlRTX1RBQkxFX05BTUUgfHwgJ2hvLXl1LXN0dWRlbnRzJyxcbiAgICAgIH0pO1xuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZG9jQ2xpZW50LnNlbmQoc2NhbkNvbW1hbmQpO1xuICAgICAgc3R1ZGVudHMgPSByZXN1bHQuSXRlbXMgYXMgU3R1ZGVudFJlY29yZFtdO1xuICAgIH1cblxuICAgIC8vIFNvcnQgc3R1ZGVudHMgYnkgY2xhc3MgYW5kIGNsYXNzX25vXG4gICAgc3R1ZGVudHMuc29ydCgoYSwgYikgPT4ge1xuICAgICAgaWYgKGEuY2xhc3MgIT09IGIuY2xhc3MpIHtcbiAgICAgICAgcmV0dXJuIGEuY2xhc3MubG9jYWxlQ29tcGFyZShiLmNsYXNzKTtcbiAgICAgIH1cbiAgICAgIHJldHVybiBhLmNsYXNzX25vLmxvY2FsZUNvbXBhcmUoYi5jbGFzc19ubyk7XG4gICAgfSk7XG5cbiAgICAvLyBQcmVwYXJlIGRhdGEgZm9yIEV4Y2VsIChpbmNsdWRpbmcgcGFzc3dvcmQgZmllbGQpXG4gICAgY29uc3QgZXhjZWxEYXRhID0gc3R1ZGVudHMubWFwKHN0dWRlbnQgPT4gKHtcbiAgICAgIHN0dWRlbnRfaWQ6IHN0dWRlbnQuc3R1ZGVudF9pZCxcbiAgICAgIG5hbWVfMTogc3R1ZGVudC5uYW1lXzEsXG4gICAgICBuYW1lXzI6IHN0dWRlbnQubmFtZV8yLFxuICAgICAgbWFya3M6IHN0dWRlbnQubWFya3MsXG4gICAgICBjbGFzczogc3R1ZGVudC5jbGFzcyxcbiAgICAgIGNsYXNzX25vOiBzdHVkZW50LmNsYXNzX25vLFxuICAgICAgbGFzdF9sb2dpbjogc3R1ZGVudC5sYXN0X2xvZ2luLFxuICAgICAgbGFzdF91cGRhdGU6IHN0dWRlbnQubGFzdF91cGRhdGUsXG4gICAgICB0ZWFjaGVyX2lkOiBzdHVkZW50LnRlYWNoZXJfaWQsXG4gICAgICBwYXNzd29yZDogc3R1ZGVudC5wYXNzd29yZCxcbiAgICB9KSk7XG5cbiAgICAvLyBDcmVhdGUgRXhjZWwgd29ya2Jvb2tcbiAgICBjb25zdCB3b3Jrc2hlZXQgPSBYTFNYLnV0aWxzLmpzb25fdG9fc2hlZXQoZXhjZWxEYXRhKTtcbiAgICBjb25zdCB3b3JrYm9vayA9IFhMU1gudXRpbHMuYm9va19uZXcoKTtcbiAgICBYTFNYLnV0aWxzLmJvb2tfYXBwZW5kX3NoZWV0KHdvcmtib29rLCB3b3Jrc2hlZXQsICdTdHVkZW50cycpO1xuXG4gICAgLy8gU2V0IGNvbHVtbiB3aWR0aHMgZm9yIGJldHRlciByZWFkYWJpbGl0eVxuICAgIHdvcmtzaGVldFsnIWNvbHMnXSA9IFtcbiAgICAgIHsgd2NoOiAxMiB9LCAvLyBzdHVkZW50X2lkXG4gICAgICB7IHdjaDogMjAgfSwgLy8gbmFtZV8xXG4gICAgICB7IHdjaDogMjAgfSwgLy8gbmFtZV8yXG4gICAgICB7IHdjaDogOCB9LCAgLy8gbWFya3NcbiAgICAgIHsgd2NoOiA4IH0sICAvLyBjbGFzc1xuICAgICAgeyB3Y2g6IDEwIH0sIC8vIGNsYXNzX25vXG4gICAgICB7IHdjaDogMjAgfSwgLy8gbGFzdF9sb2dpblxuICAgICAgeyB3Y2g6IDIwIH0sIC8vIGxhc3RfdXBkYXRlXG4gICAgICB7IHdjaDogMTIgfSwgLy8gdGVhY2hlcl9pZFxuICAgICAgeyB3Y2g6IDY0IH0sIC8vIHBhc3N3b3JkIChoYXNoKVxuICAgIF07XG5cbiAgICAvLyBHZW5lcmF0ZSBFeGNlbCBmaWxlIGJ1ZmZlclxuICAgIGNvbnN0IGV4Y2VsQnVmZmVyID0gWExTWC53cml0ZSh3b3JrYm9vaywgeyB0eXBlOiAnYnVmZmVyJywgYm9va1R5cGU6ICd4bHN4JyB9KTtcblxuICAgIC8vIFJldHVybiBFeGNlbCBmaWxlIGFzIHJlc3BvbnNlXG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQuc3ByZWFkc2hlZXRtbC5zaGVldCcsXG4gICAgICAgICdDb250ZW50LURpc3Bvc2l0aW9uJzogYGF0dGFjaG1lbnQ7IGZpbGVuYW1lPVwic3R1ZGVudHNfJHtuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkuc3BsaXQoJ1QnKVswXX0ueGxzeFwiYCxcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgIH0sXG4gICAgICBib2R5OiBleGNlbEJ1ZmZlci50b1N0cmluZygnYmFzZTY0JyksXG4gICAgICBpc0Jhc2U2NEVuY29kZWQ6IHRydWUsXG4gICAgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBkb3dubG9hZGluZyBzdHVkZW50czonLCBlcnJvcik7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1c0NvZGU6IDUwMCxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IFxuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgbWVzc2FnZTogJ0ZhaWxlZCB0byBkb3dubG9hZCBzdHVkZW50IGRhdGEnLFxuICAgICAgICBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcidcbiAgICAgIH0pLFxuICAgIH07XG4gIH1cbn07XG4iXX0=