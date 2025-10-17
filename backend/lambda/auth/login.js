"use strict";
/**
 * Auth Lambda Handler - Login functionality
 * Handles student and teacher authentication
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
const handler = async (event) => {
    try {
        const body = JSON.parse(event.body || '{}');
        const { id, password } = body;
        if (!id || !password) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ message: 'Missing id or password' }),
            };
        }
        // Try to find student first
        let user = await getStudent(id);
        let role = 'student';
        // If not found, try teacher
        if (!user) {
            user = await getTeacher(id);
            if (user) {
                role = user.is_admin ? 'admin' : 'teacher';
            }
        }
        // Verify user exists and password matches (plain text comparison)
        if (!user || user.password !== password) {
            return {
                statusCode: 401,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ message: 'Invalid credentials' }),
            };
        }
        // Update last login timestamp
        await updateLastLogin(id, role);
        // Remove password from response
        const { password: _, ...userWithoutPassword } = user;
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: true,
                user: userWithoutPassword,
                role,
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
            body: JSON.stringify({ message: 'Internal server error' }),
        };
    }
};
exports.handler = handler;
async function getStudent(studentId) {
    const command = new lib_dynamodb_1.GetCommand({
        TableName: process.env.STUDENTS_TABLE_NAME,
        Key: { student_id: studentId },
    });
    const result = await docClient.send(command);
    return result.Item;
}
async function getTeacher(teacherId) {
    const command = new lib_dynamodb_1.GetCommand({
        TableName: process.env.TEACHERS_TABLE_NAME,
        Key: { teacher_id: teacherId },
    });
    const result = await docClient.send(command);
    return result.Item;
}
async function updateLastLogin(id, role) {
    // Implementation would update the last_login timestamp
    // This is a placeholder for the actual implementation
    console.log(`Updating last login for ${role} ${id}`);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9naW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJsb2dpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztHQUdHOzs7QUFFSCw4REFBMEQ7QUFDMUQsd0RBQTJFO0FBRzNFLE1BQU0sTUFBTSxHQUFHLElBQUksZ0NBQWMsQ0FBQyxFQUFFLENBQUMsQ0FBQztBQUN0QyxNQUFNLFNBQVMsR0FBRyxxQ0FBc0IsQ0FBQyxJQUFJLENBQUMsTUFBTSxDQUFDLENBQUM7QUFPL0MsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUMxQixLQUEyQixFQUNLLEVBQUU7SUFDbEMsSUFBSSxDQUFDO1FBQ0gsTUFBTSxJQUFJLEdBQWlCLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsQ0FBQztRQUMxRCxNQUFNLEVBQUUsRUFBRSxFQUFFLFFBQVEsRUFBRSxHQUFHLElBQUksQ0FBQztRQUU5QixJQUFJLENBQUMsRUFBRSxJQUFJLENBQUMsUUFBUSxFQUFFLENBQUM7WUFDckIsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUU7b0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtvQkFDbEMsNkJBQTZCLEVBQUUsR0FBRztpQkFDbkM7Z0JBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxPQUFPLEVBQUUsd0JBQXdCLEVBQUUsQ0FBQzthQUM1RCxDQUFDO1FBQ0osQ0FBQztRQUVELDRCQUE0QjtRQUM1QixJQUFJLElBQUksR0FBRyxNQUFNLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNoQyxJQUFJLElBQUksR0FBb0MsU0FBUyxDQUFDO1FBRXRELDRCQUE0QjtRQUM1QixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDVixJQUFJLEdBQUcsTUFBTSxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7WUFDNUIsSUFBSSxJQUFJLEVBQUUsQ0FBQztnQkFDVCxJQUFJLEdBQUksSUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUM7WUFDdEQsQ0FBQztRQUNILENBQUM7UUFFRCxrRUFBa0U7UUFDbEUsSUFBSSxDQUFDLElBQUksSUFBSSxJQUFJLENBQUMsUUFBUSxLQUFLLFFBQVEsRUFBRSxDQUFDO1lBQ3hDLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTyxFQUFFO29CQUNQLGNBQWMsRUFBRSxrQkFBa0I7b0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7aUJBQ25DO2dCQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsT0FBTyxFQUFFLHFCQUFxQixFQUFFLENBQUM7YUFDekQsQ0FBQztRQUNKLENBQUM7UUFFRCw4QkFBOEI7UUFDOUIsTUFBTSxlQUFlLENBQUMsRUFBRSxFQUFFLElBQUksQ0FBQyxDQUFDO1FBRWhDLGdDQUFnQztRQUNoQyxNQUFNLEVBQUUsUUFBUSxFQUFFLENBQUMsRUFBRSxHQUFHLG1CQUFtQixFQUFFLEdBQUcsSUFBSSxDQUFDO1FBRXJELE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU8sRUFBRTtnQkFDUCxjQUFjLEVBQUUsa0JBQWtCO2dCQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2FBQ25DO1lBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7Z0JBQ25CLE9BQU8sRUFBRSxJQUFJO2dCQUNiLElBQUksRUFBRSxtQkFBbUI7Z0JBQ3pCLElBQUk7YUFDTCxDQUFDO1NBQ0gsQ0FBQztJQUNKLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxRQUFRLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDL0IsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFO2dCQUNQLGNBQWMsRUFBRSxrQkFBa0I7Z0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7YUFDbkM7WUFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxDQUFDO1NBQzNELENBQUM7SUFDSixDQUFDO0FBQ0gsQ0FBQyxDQUFDO0FBdkVXLFFBQUEsT0FBTyxXQXVFbEI7QUFFRixLQUFLLFVBQVUsVUFBVSxDQUFDLFNBQWlCO0lBQ3pDLE1BQU0sT0FBTyxHQUFHLElBQUkseUJBQVUsQ0FBQztRQUM3QixTQUFTLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUI7UUFDMUMsR0FBRyxFQUFFLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRTtLQUMvQixDQUFDLENBQUM7SUFFSCxNQUFNLE1BQU0sR0FBRyxNQUFNLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDN0MsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDO0FBQ3JCLENBQUM7QUFFRCxLQUFLLFVBQVUsVUFBVSxDQUFDLFNBQWlCO0lBQ3pDLE1BQU0sT0FBTyxHQUFHLElBQUkseUJBQVUsQ0FBQztRQUM3QixTQUFTLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUI7UUFDMUMsR0FBRyxFQUFFLEVBQUUsVUFBVSxFQUFFLFNBQVMsRUFBRTtLQUMvQixDQUFDLENBQUM7SUFFSCxNQUFNLE1BQU0sR0FBRyxNQUFNLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDN0MsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDO0FBQ3JCLENBQUM7QUFFRCxLQUFLLFVBQVUsZUFBZSxDQUFDLEVBQVUsRUFBRSxJQUFxQztJQUM5RSx1REFBdUQ7SUFDdkQsc0RBQXNEO0lBQ3RELE9BQU8sQ0FBQyxHQUFHLENBQUMsMkJBQTJCLElBQUksSUFBSSxFQUFFLEVBQUUsQ0FBQyxDQUFDO0FBQ3ZELENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEF1dGggTGFtYmRhIEhhbmRsZXIgLSBMb2dpbiBmdW5jdGlvbmFsaXR5XG4gKiBIYW5kbGVzIHN0dWRlbnQgYW5kIHRlYWNoZXIgYXV0aGVudGljYXRpb25cbiAqL1xuXG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XG5pbXBvcnQgeyBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LCBHZXRDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvbGliLWR5bmFtb2RiJztcbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcblxuY29uc3QgY2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHt9KTtcbmNvbnN0IGRvY0NsaWVudCA9IER5bmFtb0RCRG9jdW1lbnRDbGllbnQuZnJvbShjbGllbnQpO1xuXG5pbnRlcmZhY2UgTG9naW5SZXF1ZXN0IHtcbiAgaWQ6IHN0cmluZztcbiAgcGFzc3dvcmQ6IHN0cmluZztcbn1cblxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoXG4gIGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudFxuKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBib2R5OiBMb2dpblJlcXVlc3QgPSBKU09OLnBhcnNlKGV2ZW50LmJvZHkgfHwgJ3t9Jyk7XG4gICAgY29uc3QgeyBpZCwgcGFzc3dvcmQgfSA9IGJvZHk7XG5cbiAgICBpZiAoIWlkIHx8ICFwYXNzd29yZCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgICB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IG1lc3NhZ2U6ICdNaXNzaW5nIGlkIG9yIHBhc3N3b3JkJyB9KSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gVHJ5IHRvIGZpbmQgc3R1ZGVudCBmaXJzdFxuICAgIGxldCB1c2VyID0gYXdhaXQgZ2V0U3R1ZGVudChpZCk7XG4gICAgbGV0IHJvbGU6ICdzdHVkZW50JyB8ICd0ZWFjaGVyJyB8ICdhZG1pbicgPSAnc3R1ZGVudCc7XG5cbiAgICAvLyBJZiBub3QgZm91bmQsIHRyeSB0ZWFjaGVyXG4gICAgaWYgKCF1c2VyKSB7XG4gICAgICB1c2VyID0gYXdhaXQgZ2V0VGVhY2hlcihpZCk7XG4gICAgICBpZiAodXNlcikge1xuICAgICAgICByb2xlID0gKHVzZXIgYXMgYW55KS5pc19hZG1pbiA/ICdhZG1pbicgOiAndGVhY2hlcic7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gVmVyaWZ5IHVzZXIgZXhpc3RzIGFuZCBwYXNzd29yZCBtYXRjaGVzIChwbGFpbiB0ZXh0IGNvbXBhcmlzb24pXG4gICAgaWYgKCF1c2VyIHx8IHVzZXIucGFzc3dvcmQgIT09IHBhc3N3b3JkKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdGF0dXNDb2RlOiA0MDEsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICAgICAgIH0sXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgbWVzc2FnZTogJ0ludmFsaWQgY3JlZGVudGlhbHMnIH0pLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBVcGRhdGUgbGFzdCBsb2dpbiB0aW1lc3RhbXBcbiAgICBhd2FpdCB1cGRhdGVMYXN0TG9naW4oaWQsIHJvbGUpO1xuXG4gICAgLy8gUmVtb3ZlIHBhc3N3b3JkIGZyb20gcmVzcG9uc2VcbiAgICBjb25zdCB7IHBhc3N3b3JkOiBfLCAuLi51c2VyV2l0aG91dFBhc3N3b3JkIH0gPSB1c2VyO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgIHVzZXI6IHVzZXJXaXRob3V0UGFzc3dvcmQsXG4gICAgICAgIHJvbGUsXG4gICAgICB9KSxcbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yOicsIGVycm9yKTtcbiAgICByZXR1cm4ge1xuICAgICAgc3RhdHVzQ29kZTogNTAwLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgbWVzc2FnZTogJ0ludGVybmFsIHNlcnZlciBlcnJvcicgfSksXG4gICAgfTtcbiAgfVxufTtcblxuYXN5bmMgZnVuY3Rpb24gZ2V0U3R1ZGVudChzdHVkZW50SWQ6IHN0cmluZykge1xuICBjb25zdCBjb21tYW5kID0gbmV3IEdldENvbW1hbmQoe1xuICAgIFRhYmxlTmFtZTogcHJvY2Vzcy5lbnYuU1RVREVOVFNfVEFCTEVfTkFNRSxcbiAgICBLZXk6IHsgc3R1ZGVudF9pZDogc3R1ZGVudElkIH0sXG4gIH0pO1xuXG4gIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGRvY0NsaWVudC5zZW5kKGNvbW1hbmQpO1xuICByZXR1cm4gcmVzdWx0Lkl0ZW07XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGdldFRlYWNoZXIodGVhY2hlcklkOiBzdHJpbmcpIHtcbiAgY29uc3QgY29tbWFuZCA9IG5ldyBHZXRDb21tYW5kKHtcbiAgICBUYWJsZU5hbWU6IHByb2Nlc3MuZW52LlRFQUNIRVJTX1RBQkxFX05BTUUsXG4gICAgS2V5OiB7IHRlYWNoZXJfaWQ6IHRlYWNoZXJJZCB9LFxuICB9KTtcblxuICBjb25zdCByZXN1bHQgPSBhd2FpdCBkb2NDbGllbnQuc2VuZChjb21tYW5kKTtcbiAgcmV0dXJuIHJlc3VsdC5JdGVtO1xufVxuXG5hc3luYyBmdW5jdGlvbiB1cGRhdGVMYXN0TG9naW4oaWQ6IHN0cmluZywgcm9sZTogJ3N0dWRlbnQnIHwgJ3RlYWNoZXInIHwgJ2FkbWluJykge1xuICAvLyBJbXBsZW1lbnRhdGlvbiB3b3VsZCB1cGRhdGUgdGhlIGxhc3RfbG9naW4gdGltZXN0YW1wXG4gIC8vIFRoaXMgaXMgYSBwbGFjZWhvbGRlciBmb3IgdGhlIGFjdHVhbCBpbXBsZW1lbnRhdGlvblxuICBjb25zb2xlLmxvZyhgVXBkYXRpbmcgbGFzdCBsb2dpbiBmb3IgJHtyb2xlfSAke2lkfWApO1xufVxuIl19