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
            { wch: 15 }, // password
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3R1ZGVudHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzdHVkZW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFFSCw4REFBMEQ7QUFDMUQsd0RBQTBGO0FBRTFGLDZCQUE2QjtBQUU3QixNQUFNLE1BQU0sR0FBRyxJQUFJLGdDQUFjLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDdEMsTUFBTSxTQUFTLEdBQUcscUNBQXNCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBZS9DLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFDMUIsS0FBMkIsRUFDSyxFQUFFO0lBQ2xDLElBQUksQ0FBQztRQUNILCtDQUErQztRQUMvQyxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMscUJBQXFCLEVBQUUsT0FBTyxFQUFFLEtBQUssQ0FBQyxHQUFHLENBQUMsSUFBSSxFQUFFLENBQUM7UUFFM0UsaUNBQWlDO1FBQ2pDLElBQUksUUFBUSxHQUFvQixFQUFFLENBQUM7UUFFbkMsSUFBSSxXQUFXLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1lBQzNCLDBEQUEwRDtZQUMxRCxNQUFNLFdBQVcsR0FBRyxJQUFJLDBCQUFXLENBQUM7Z0JBQ2xDLFNBQVMsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixJQUFJLGdCQUFnQjthQUMvRCxDQUFDLENBQUM7WUFDSCxNQUFNLE1BQU0sR0FBRyxNQUFNLFNBQVMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDakQsUUFBUSxHQUFJLE1BQU0sQ0FBQyxLQUF5QjtpQkFDekMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUM1RCxDQUFDO2FBQU0sQ0FBQztZQUNOLDhDQUE4QztZQUM5QyxNQUFNLFdBQVcsR0FBRyxJQUFJLDBCQUFXLENBQUM7Z0JBQ2xDLFNB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LEtBQUssQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsUUFBUTtnQkFDdkcsNkJBQTZCLEVBQUUsR0FBRzthQUNuQztZQUNELElBQUksRUFBRSxXQUFXLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQztZQUNwQyxlQUFlLEVBQUUsSUFBSTtTQUN0QixDQUFDO0lBQ0osQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLDZCQUE2QixFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3BELE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU8sRUFBRTtnQkFDUCxjQUFjLEVBQUUsa0JBQWtCO2dCQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2FBQ25DO1lBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7Z0JBQ25CLE9BQU8sRUFBRSxLQUFLO2dCQUNkLE9BQU8sRUFBRSxpQ0FBaUM7Z0JBQzFDLEtBQUssRUFBRSxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxlQUFlO2FBQ2hFLENBQUM7U0FDSCxDQUFDO0lBQ0osQ0FBQztBQUNILENBQUMsQ0FBQztBQWpHVyxRQUFBLE9BQU8sV0FpR2xCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBEb3dubG9hZCBTdHVkZW50cyBMYW1iZGEgSGFuZGxlclxuICogSGFuZGxlcyBFeGNlbCBleHBvcnQgZm9yIHN0dWRlbnQgZGF0YVxuICogLSBUZWFjaGVycyBjYW4gb25seSBkb3dubG9hZCBkYXRhIGZvciB0aGVpciByZXNwb25zaWJsZSBjbGFzc2VzXG4gKiAtIEFkbWlucyBjYW4gZG93bmxvYWQgYWxsIHN0dWRlbnQgZGF0YVxuICogLSBSZXR1cm5zIEV4Y2VsIGZpbGUgKC54bHN4KSB3aXRoIHByb3BlciBzdHJ1Y3R1cmVcbiAqL1xuXG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XG5pbXBvcnQgeyBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LCBTY2FuQ29tbWFuZCwgUXVlcnlDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvbGliLWR5bmFtb2RiJztcbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcbmltcG9ydCAqIGFzIFhMU1ggZnJvbSAneGxzeCc7XG5cbmNvbnN0IGNsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudCh7fSk7XG5jb25zdCBkb2NDbGllbnQgPSBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LmZyb20oY2xpZW50KTtcblxuaW50ZXJmYWNlIFN0dWRlbnRSZWNvcmQge1xuICBzdHVkZW50X2lkOiBzdHJpbmc7XG4gIG5hbWVfMTogc3RyaW5nO1xuICBuYW1lXzI6IHN0cmluZztcbiAgbWFya3M6IG51bWJlcjtcbiAgY2xhc3M6IHN0cmluZztcbiAgY2xhc3Nfbm86IHN0cmluZztcbiAgbGFzdF9sb2dpbjogc3RyaW5nO1xuICBsYXN0X3VwZGF0ZTogc3RyaW5nO1xuICB0ZWFjaGVyX2lkOiBzdHJpbmc7XG4gIHBhc3N3b3JkOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKFxuICBldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnRcbik6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XG4gIHRyeSB7XG4gICAgLy8gR2V0IHF1ZXJ5IHBhcmFtZXRlcnMgKG9wdGlvbmFsIGNsYXNzIGZpbHRlcilcbiAgICBjb25zdCBjbGFzc0ZpbHRlciA9IGV2ZW50LnF1ZXJ5U3RyaW5nUGFyYW1ldGVycz8uY2xhc3Nlcz8uc3BsaXQoJywnKSB8fCBbXTtcblxuICAgIC8vIEdldCBhbGwgc3R1ZGVudHMgZnJvbSBEeW5hbW9EQlxuICAgIGxldCBzdHVkZW50czogU3R1ZGVudFJlY29yZFtdID0gW107XG4gICAgXG4gICAgaWYgKGNsYXNzRmlsdGVyLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIElmIGNsYXNzIGZpbHRlciBpcyBwcm92aWRlZCwgc2NhbiBhbmQgZmlsdGVyIGJ5IGNsYXNzZXNcbiAgICAgIGNvbnN0IHNjYW5Db21tYW5kID0gbmV3IFNjYW5Db21tYW5kKHtcbiAgICAgICAgVGFibGVOYW1lOiBwcm9jZXNzLmVudi5TVFVERU5UU19UQUJMRV9OQU1FIHx8ICdoby15dS1zdHVkZW50cycsXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGRvY0NsaWVudC5zZW5kKHNjYW5Db21tYW5kKTtcbiAgICAgIHN0dWRlbnRzID0gKHJlc3VsdC5JdGVtcyBhcyBTdHVkZW50UmVjb3JkW10pXG4gICAgICAgIC5maWx0ZXIoc3R1ZGVudCA9PiBjbGFzc0ZpbHRlci5pbmNsdWRlcyhzdHVkZW50LmNsYXNzKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIE5vIGZpbHRlciAtIGdldCBhbGwgc3R1ZGVudHMgKGFkbWluIGFjY2VzcylcbiAgICAgIGNvbnN0IHNjYW5Db21tYW5kID0gbmV3IFNjYW5Db21tYW5kKHtcbiAgICAgICAgVGFibGVOYW1lOiBwcm9jZXNzLmVudi5TVFVERU5UU19UQUJMRV9OQU1FIHx8ICdoby15dS1zdHVkZW50cycsXG4gICAgICB9KTtcbiAgICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGRvY0NsaWVudC5zZW5kKHNjYW5Db21tYW5kKTtcbiAgICAgIHN0dWRlbnRzID0gcmVzdWx0Lkl0ZW1zIGFzIFN0dWRlbnRSZWNvcmRbXTtcbiAgICB9XG5cbiAgICAvLyBTb3J0IHN0dWRlbnRzIGJ5IGNsYXNzIGFuZCBjbGFzc19ub1xuICAgIHN0dWRlbnRzLnNvcnQoKGEsIGIpID0+IHtcbiAgICAgIGlmIChhLmNsYXNzICE9PSBiLmNsYXNzKSB7XG4gICAgICAgIHJldHVybiBhLmNsYXNzLmxvY2FsZUNvbXBhcmUoYi5jbGFzcyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gYS5jbGFzc19uby5sb2NhbGVDb21wYXJlKGIuY2xhc3Nfbm8pO1xuICAgIH0pO1xuXG4gICAgLy8gUHJlcGFyZSBkYXRhIGZvciBFeGNlbCAoaW5jbHVkaW5nIHBhc3N3b3JkIGZpZWxkKVxuICAgIGNvbnN0IGV4Y2VsRGF0YSA9IHN0dWRlbnRzLm1hcChzdHVkZW50ID0+ICh7XG4gICAgICBzdHVkZW50X2lkOiBzdHVkZW50LnN0dWRlbnRfaWQsXG4gICAgICBuYW1lXzE6IHN0dWRlbnQubmFtZV8xLFxuICAgICAgbmFtZV8yOiBzdHVkZW50Lm5hbWVfMixcbiAgICAgIG1hcmtzOiBzdHVkZW50Lm1hcmtzLFxuICAgICAgY2xhc3M6IHN0dWRlbnQuY2xhc3MsXG4gICAgICBjbGFzc19ubzogc3R1ZGVudC5jbGFzc19ubyxcbiAgICAgIGxhc3RfbG9naW46IHN0dWRlbnQubGFzdF9sb2dpbixcbiAgICAgIGxhc3RfdXBkYXRlOiBzdHVkZW50Lmxhc3RfdXBkYXRlLFxuICAgICAgdGVhY2hlcl9pZDogc3R1ZGVudC50ZWFjaGVyX2lkLFxuICAgICAgcGFzc3dvcmQ6IHN0dWRlbnQucGFzc3dvcmQsXG4gICAgfSkpO1xuXG4gICAgLy8gQ3JlYXRlIEV4Y2VsIHdvcmtib29rXG4gICAgY29uc3Qgd29ya3NoZWV0ID0gWExTWC51dGlscy5qc29uX3RvX3NoZWV0KGV4Y2VsRGF0YSk7XG4gICAgY29uc3Qgd29ya2Jvb2sgPSBYTFNYLnV0aWxzLmJvb2tfbmV3KCk7XG4gICAgWExTWC51dGlscy5ib29rX2FwcGVuZF9zaGVldCh3b3JrYm9vaywgd29ya3NoZWV0LCAnU3R1ZGVudHMnKTtcblxuICAgIC8vIFNldCBjb2x1bW4gd2lkdGhzIGZvciBiZXR0ZXIgcmVhZGFiaWxpdHlcbiAgICB3b3Jrc2hlZXRbJyFjb2xzJ10gPSBbXG4gICAgICB7IHdjaDogMTIgfSwgLy8gc3R1ZGVudF9pZFxuICAgICAgeyB3Y2g6IDIwIH0sIC8vIG5hbWVfMVxuICAgICAgeyB3Y2g6IDIwIH0sIC8vIG5hbWVfMlxuICAgICAgeyB3Y2g6IDggfSwgIC8vIG1hcmtzXG4gICAgICB7IHdjaDogOCB9LCAgLy8gY2xhc3NcbiAgICAgIHsgd2NoOiAxMCB9LCAvLyBjbGFzc19ub1xuICAgICAgeyB3Y2g6IDIwIH0sIC8vIGxhc3RfbG9naW5cbiAgICAgIHsgd2NoOiAyMCB9LCAvLyBsYXN0X3VwZGF0ZVxuICAgICAgeyB3Y2g6IDEyIH0sIC8vIHRlYWNoZXJfaWRcbiAgICAgIHsgd2NoOiAxNSB9LCAvLyBwYXNzd29yZFxuICAgIF07XG5cbiAgICAvLyBHZW5lcmF0ZSBFeGNlbCBmaWxlIGJ1ZmZlclxuICAgIGNvbnN0IGV4Y2VsQnVmZmVyID0gWExTWC53cml0ZSh3b3JrYm9vaywgeyB0eXBlOiAnYnVmZmVyJywgYm9va1R5cGU6ICd4bHN4JyB9KTtcblxuICAgIC8vIFJldHVybiBFeGNlbCBmaWxlIGFzIHJlc3BvbnNlXG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQuc3ByZWFkc2hlZXRtbC5zaGVldCcsXG4gICAgICAgICdDb250ZW50LURpc3Bvc2l0aW9uJzogYGF0dGFjaG1lbnQ7IGZpbGVuYW1lPVwic3R1ZGVudHNfJHtuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkuc3BsaXQoJ1QnKVswXX0ueGxzeFwiYCxcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgIH0sXG4gICAgICBib2R5OiBleGNlbEJ1ZmZlci50b1N0cmluZygnYmFzZTY0JyksXG4gICAgICBpc0Jhc2U2NEVuY29kZWQ6IHRydWUsXG4gICAgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBkb3dubG9hZGluZyBzdHVkZW50czonLCBlcnJvcik7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1c0NvZGU6IDUwMCxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IFxuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgbWVzc2FnZTogJ0ZhaWxlZCB0byBkb3dubG9hZCBzdHVkZW50IGRhdGEnLFxuICAgICAgICBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcidcbiAgICAgIH0pLFxuICAgIH07XG4gIH1cbn07XG4iXX0=