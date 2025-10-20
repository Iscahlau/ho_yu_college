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
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const XLSX = require("xlsx");
const dynamodb_client_1 = require("../utils/dynamodb-client");
const handler = async (event) => {
    try {
        // Get query parameters (optional class filter)
        const classFilter = event.queryStringParameters?.classes?.split(',') || [];
        // Get all students from DynamoDB
        let students = [];
        if (classFilter.length > 0) {
            // If class filter is provided, scan and filter by classes
            const scanCommand = new lib_dynamodb_1.ScanCommand({
                TableName: dynamodb_client_1.tableNames.students,
            });
            const result = await dynamodb_client_1.dynamoDBClient.send(scanCommand);
            students = result.Items
                .filter(student => classFilter.includes(student.class));
        }
        else {
            // No filter - get all students (admin access)
            const scanCommand = new lib_dynamodb_1.ScanCommand({
                TableName: dynamodb_client_1.tableNames.students,
            });
            const result = await dynamodb_client_1.dynamoDBClient.send(scanCommand);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic3R1ZGVudHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzdHVkZW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7OztHQU1HOzs7QUFFSCx3REFBa0U7QUFFbEUsNkJBQTZCO0FBQzdCLDhEQUFzRTtBQWUvRCxNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQzFCLEtBQTJCLEVBQ0ssRUFBRTtJQUNsQyxJQUFJLENBQUM7UUFDSCwrQ0FBK0M7UUFDL0MsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLHFCQUFxQixFQUFFLE9BQU8sRUFBRSxLQUFLLENBQUMsR0FBRyxDQUFDLElBQUksRUFBRSxDQUFDO1FBRTNFLGlDQUFpQztRQUNqQyxJQUFJLFFBQVEsR0FBb0IsRUFBRSxDQUFDO1FBRW5DLElBQUksV0FBVyxDQUFDLE1BQU0sR0FBRyxDQUFDLEVBQUUsQ0FBQztZQUMzQiwwREFBMEQ7WUFDMUQsTUFBTSxXQUFXLEdBQUcsSUFBSSwwQkFBVyxDQUFDO2dCQUNsQyxTQUFTLEVBQUUsNEJBQVUsQ0FBQyxRQUFRO2FBQy9CLENBQUMsQ0FBQztZQUNILE1BQU0sTUFBTSxHQUFHLE1BQU0sZ0NBQWMsQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLENBQUM7WUFDdEQsUUFBUSxHQUFJLE1BQU0sQ0FBQyxLQUF5QjtpQkFDekMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUMsV0FBVyxDQUFDLFFBQVEsQ0FBQyxPQUFPLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUM1RCxDQUFDO2FBQU0sQ0FBQztZQUNOLDhDQUE4QztZQUM5QyxNQUFNLFdBQVcsR0FBRyxJQUFJLDBCQUFXLENBQUM7Z0JBQ2xDLFNBQVMsRUFBRSw0QkFBVSxDQUFDLFFBQVE7YUFDL0IsQ0FBQyxDQUFDO1lBQ0gsTUFBTSxNQUFNLEdBQUcsTUFBTSxnQ0FBYyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsQ0FBQztZQUN0RCxRQUFRLEdBQUcsTUFBTSxDQUFDLEtBQXdC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QUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsNkJBQTZCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDcEQsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFO2dCQUNQLGNBQWMsRUFBRSxrQkFBa0I7Z0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7YUFDbkM7WUFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztnQkFDbkIsT0FBTyxFQUFFLEtBQUs7Z0JBQ2QsT0FBTyxFQUFFLGlDQUFpQztnQkFDMUMsS0FBSyxFQUFFLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGVBQWU7YUFDaEUsQ0FBQztTQUNILENBQUM7SUFDSixDQUFDO0FBQ0gsQ0FBQyxDQUFDO0FBakdXLFFBQUEsT0FBTyxXQWlHbEIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIERvd25sb2FkIFN0dWRlbnRzIExhbWJkYSBIYW5kbGVyXG4gKiBIYW5kbGVzIEV4Y2VsIGV4cG9ydCBmb3Igc3R1ZGVudCBkYXRhXG4gKiAtIFRlYWNoZXJzIGNhbiBvbmx5IGRvd25sb2FkIGRhdGEgZm9yIHRoZWlyIHJlc3BvbnNpYmxlIGNsYXNzZXNcbiAqIC0gQWRtaW5zIGNhbiBkb3dubG9hZCBhbGwgc3R1ZGVudCBkYXRhXG4gKiAtIFJldHVybnMgRXhjZWwgZmlsZSAoLnhsc3gpIHdpdGggcHJvcGVyIHN0cnVjdHVyZVxuICovXG5cbmltcG9ydCB7IFNjYW5Db21tYW5kLCBRdWVyeUNvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0ICogYXMgWExTWCBmcm9tICd4bHN4JztcbmltcG9ydCB7IGR5bmFtb0RCQ2xpZW50LCB0YWJsZU5hbWVzIH0gZnJvbSAnLi4vdXRpbHMvZHluYW1vZGItY2xpZW50JztcblxuaW50ZXJmYWNlIFN0dWRlbnRSZWNvcmQge1xuICBzdHVkZW50X2lkOiBzdHJpbmc7XG4gIG5hbWVfMTogc3RyaW5nO1xuICBuYW1lXzI6IHN0cmluZztcbiAgbWFya3M6IG51bWJlcjtcbiAgY2xhc3M6IHN0cmluZztcbiAgY2xhc3Nfbm86IHN0cmluZztcbiAgbGFzdF9sb2dpbjogc3RyaW5nO1xuICBsYXN0X3VwZGF0ZTogc3RyaW5nO1xuICB0ZWFjaGVyX2lkOiBzdHJpbmc7XG4gIHBhc3N3b3JkOiBzdHJpbmc7XG59XG5cbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKFxuICBldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnRcbik6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XG4gIHRyeSB7XG4gICAgLy8gR2V0IHF1ZXJ5IHBhcmFtZXRlcnMgKG9wdGlvbmFsIGNsYXNzIGZpbHRlcilcbiAgICBjb25zdCBjbGFzc0ZpbHRlciA9IGV2ZW50LnF1ZXJ5U3RyaW5nUGFyYW1ldGVycz8uY2xhc3Nlcz8uc3BsaXQoJywnKSB8fCBbXTtcblxuICAgIC8vIEdldCBhbGwgc3R1ZGVudHMgZnJvbSBEeW5hbW9EQlxuICAgIGxldCBzdHVkZW50czogU3R1ZGVudFJlY29yZFtdID0gW107XG4gICAgXG4gICAgaWYgKGNsYXNzRmlsdGVyLmxlbmd0aCA+IDApIHtcbiAgICAgIC8vIElmIGNsYXNzIGZpbHRlciBpcyBwcm92aWRlZCwgc2NhbiBhbmQgZmlsdGVyIGJ5IGNsYXNzZXNcbiAgICAgIGNvbnN0IHNjYW5Db21tYW5kID0gbmV3IFNjYW5Db21tYW5kKHtcbiAgICAgICAgVGFibGVOYW1lOiB0YWJsZU5hbWVzLnN0dWRlbnRzLFxuICAgICAgfSk7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBkeW5hbW9EQkNsaWVudC5zZW5kKHNjYW5Db21tYW5kKTtcbiAgICAgIHN0dWRlbnRzID0gKHJlc3VsdC5JdGVtcyBhcyBTdHVkZW50UmVjb3JkW10pXG4gICAgICAgIC5maWx0ZXIoc3R1ZGVudCA9PiBjbGFzc0ZpbHRlci5pbmNsdWRlcyhzdHVkZW50LmNsYXNzKSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIC8vIE5vIGZpbHRlciAtIGdldCBhbGwgc3R1ZGVudHMgKGFkbWluIGFjY2VzcylcbiAgICAgIGNvbnN0IHNjYW5Db21tYW5kID0gbmV3IFNjYW5Db21tYW5kKHtcbiAgICAgICAgVGFibGVOYW1lOiB0YWJsZU5hbWVzLnN0dWRlbnRzLFxuICAgICAgfSk7XG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBkeW5hbW9EQkNsaWVudC5zZW5kKHNjYW5Db21tYW5kKTtcbiAgICAgIHN0dWRlbnRzID0gcmVzdWx0Lkl0ZW1zIGFzIFN0dWRlbnRSZWNvcmRbXTtcbiAgICB9XG5cbiAgICAvLyBTb3J0IHN0dWRlbnRzIGJ5IGNsYXNzIGFuZCBjbGFzc19ub1xuICAgIHN0dWRlbnRzLnNvcnQoKGEsIGIpID0+IHtcbiAgICAgIGlmIChhLmNsYXNzICE9PSBiLmNsYXNzKSB7XG4gICAgICAgIHJldHVybiBhLmNsYXNzLmxvY2FsZUNvbXBhcmUoYi5jbGFzcyk7XG4gICAgICB9XG4gICAgICByZXR1cm4gYS5jbGFzc19uby5sb2NhbGVDb21wYXJlKGIuY2xhc3Nfbm8pO1xuICAgIH0pO1xuXG4gICAgLy8gUHJlcGFyZSBkYXRhIGZvciBFeGNlbCAoaW5jbHVkaW5nIHBhc3N3b3JkIGZpZWxkKVxuICAgIGNvbnN0IGV4Y2VsRGF0YSA9IHN0dWRlbnRzLm1hcChzdHVkZW50ID0+ICh7XG4gICAgICBzdHVkZW50X2lkOiBzdHVkZW50LnN0dWRlbnRfaWQsXG4gICAgICBuYW1lXzE6IHN0dWRlbnQubmFtZV8xLFxuICAgICAgbmFtZV8yOiBzdHVkZW50Lm5hbWVfMixcbiAgICAgIG1hcmtzOiBzdHVkZW50Lm1hcmtzLFxuICAgICAgY2xhc3M6IHN0dWRlbnQuY2xhc3MsXG4gICAgICBjbGFzc19ubzogc3R1ZGVudC5jbGFzc19ubyxcbiAgICAgIGxhc3RfbG9naW46IHN0dWRlbnQubGFzdF9sb2dpbixcbiAgICAgIGxhc3RfdXBkYXRlOiBzdHVkZW50Lmxhc3RfdXBkYXRlLFxuICAgICAgdGVhY2hlcl9pZDogc3R1ZGVudC50ZWFjaGVyX2lkLFxuICAgICAgcGFzc3dvcmQ6IHN0dWRlbnQucGFzc3dvcmQsXG4gICAgfSkpO1xuXG4gICAgLy8gQ3JlYXRlIEV4Y2VsIHdvcmtib29rXG4gICAgY29uc3Qgd29ya3NoZWV0ID0gWExTWC51dGlscy5qc29uX3RvX3NoZWV0KGV4Y2VsRGF0YSk7XG4gICAgY29uc3Qgd29ya2Jvb2sgPSBYTFNYLnV0aWxzLmJvb2tfbmV3KCk7XG4gICAgWExTWC51dGlscy5ib29rX2FwcGVuZF9zaGVldCh3b3JrYm9vaywgd29ya3NoZWV0LCAnU3R1ZGVudHMnKTtcblxuICAgIC8vIFNldCBjb2x1bW4gd2lkdGhzIGZvciBiZXR0ZXIgcmVhZGFiaWxpdHlcbiAgICB3b3Jrc2hlZXRbJyFjb2xzJ10gPSBbXG4gICAgICB7IHdjaDogMTIgfSwgLy8gc3R1ZGVudF9pZFxuICAgICAgeyB3Y2g6IDIwIH0sIC8vIG5hbWVfMVxuICAgICAgeyB3Y2g6IDIwIH0sIC8vIG5hbWVfMlxuICAgICAgeyB3Y2g6IDggfSwgIC8vIG1hcmtzXG4gICAgICB7IHdjaDogOCB9LCAgLy8gY2xhc3NcbiAgICAgIHsgd2NoOiAxMCB9LCAvLyBjbGFzc19ub1xuICAgICAgeyB3Y2g6IDIwIH0sIC8vIGxhc3RfbG9naW5cbiAgICAgIHsgd2NoOiAyMCB9LCAvLyBsYXN0X3VwZGF0ZVxuICAgICAgeyB3Y2g6IDEyIH0sIC8vIHRlYWNoZXJfaWRcbiAgICAgIHsgd2NoOiAxNSB9LCAvLyBwYXNzd29yZFxuICAgIF07XG5cbiAgICAvLyBHZW5lcmF0ZSBFeGNlbCBmaWxlIGJ1ZmZlclxuICAgIGNvbnN0IGV4Y2VsQnVmZmVyID0gWExTWC53cml0ZSh3b3JrYm9vaywgeyB0eXBlOiAnYnVmZmVyJywgYm9va1R5cGU6ICd4bHN4JyB9KTtcblxuICAgIC8vIFJldHVybiBFeGNlbCBmaWxlIGFzIHJlc3BvbnNlXG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi92bmQub3BlbnhtbGZvcm1hdHMtb2ZmaWNlZG9jdW1lbnQuc3ByZWFkc2hlZXRtbC5zaGVldCcsXG4gICAgICAgICdDb250ZW50LURpc3Bvc2l0aW9uJzogYGF0dGFjaG1lbnQ7IGZpbGVuYW1lPVwic3R1ZGVudHNfJHtuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCkuc3BsaXQoJ1QnKVswXX0ueGxzeFwiYCxcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgIH0sXG4gICAgICBib2R5OiBleGNlbEJ1ZmZlci50b1N0cmluZygnYmFzZTY0JyksXG4gICAgICBpc0Jhc2U2NEVuY29kZWQ6IHRydWUsXG4gICAgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBkb3dubG9hZGluZyBzdHVkZW50czonLCBlcnJvcik7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1c0NvZGU6IDUwMCxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IFxuICAgICAgICBzdWNjZXNzOiBmYWxzZSxcbiAgICAgICAgbWVzc2FnZTogJ0ZhaWxlZCB0byBkb3dubG9hZCBzdHVkZW50IGRhdGEnLFxuICAgICAgICBlcnJvcjogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcidcbiAgICAgIH0pLFxuICAgIH07XG4gIH1cbn07XG4iXX0=