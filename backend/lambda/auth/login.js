"use strict";
/**
 * Auth Lambda Handler - Login functionality
 * Handles student and teacher authentication
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const dynamodb_client_1 = require("../utils/dynamodb-client");
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
        TableName: dynamodb_client_1.tableNames.students,
        Key: { student_id: studentId },
    });
    const result = await dynamodb_client_1.dynamoDBClient.send(command);
    return result.Item;
}
async function getTeacher(teacherId) {
    const command = new lib_dynamodb_1.GetCommand({
        TableName: dynamodb_client_1.tableNames.teachers,
        Key: { teacher_id: teacherId },
    });
    const result = await dynamodb_client_1.dynamoDBClient.send(command);
    return result.Item;
}
async function updateLastLogin(id, role) {
    // Implementation would update the last_login timestamp
    // This is a placeholder for the actual implementation
    console.log(`Updating last login for ${role} ${id}`);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9naW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJsb2dpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztHQUdHOzs7QUFFSCx3REFBbUQ7QUFFbkQsOERBQXNFO0FBTy9ELE1BQU0sT0FBTyxHQUFHLEtBQUssRUFDMUIsS0FBMkIsRUFDSyxFQUFFO0lBQ2xDLElBQUksQ0FBQztRQUNILE1BQU0sSUFBSSxHQUFpQixJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLENBQUM7UUFDMUQsTUFBTSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFFOUIsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3JCLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTyxFQUFFO29CQUNQLGNBQWMsRUFBRSxrQkFBa0I7b0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7aUJBQ25DO2dCQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLENBQUM7YUFDNUQsQ0FBQztRQUNKLENBQUM7UUFFRCw0QkFBNEI7UUFDNUIsSUFBSSxJQUFJLEdBQUcsTUFBTSxVQUFVLENBQUMsRUFBRSxDQUFDLENBQUM7UUFDaEMsSUFBSSxJQUFJLEdBQW9DLFNBQVMsQ0FBQztRQUV0RCw0QkFBNEI7UUFDNUIsSUFBSSxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ1YsSUFBSSxHQUFHLE1BQU0sVUFBVSxDQUFDLEVBQUUsQ0FBQyxDQUFDO1lBQzVCLElBQUksSUFBSSxFQUFFLENBQUM7Z0JBQ1QsSUFBSSxHQUFJLElBQVksQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1lBQ3RELENBQUM7UUFDSCxDQUFDO1FBRUQsa0VBQWtFO1FBQ2xFLElBQUksQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLFFBQVEsS0FBSyxRQUFRLEVBQUUsQ0FBQztZQUN4QyxPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLE9BQU8sRUFBRTtvQkFDUCxjQUFjLEVBQUUsa0JBQWtCO29CQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2lCQUNuQztnQkFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLE9BQU8sRUFBRSxxQkFBcUIsRUFBRSxDQUFDO2FBQ3pELENBQUM7UUFDSixDQUFDO1FBRUQsOEJBQThCO1FBQzlCLE1BQU0sZUFBZSxDQUFDLEVBQUUsRUFBRSxJQUFJLENBQUMsQ0FBQztRQUVoQyxnQ0FBZ0M7UUFDaEMsTUFBTSxFQUFFLFFBQVEsRUFBRSxDQUFDLEVBQUUsR0FBRyxtQkFBbUIsRUFBRSxHQUFHLElBQUksQ0FBQztRQUVyRCxPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUU7Z0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtnQkFDbEMsNkJBQTZCLEVBQUUsR0FBRzthQUNuQztZQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO2dCQUNuQixPQUFPLEVBQUUsSUFBSTtnQkFDYixJQUFJLEVBQUUsbUJBQW1CO2dCQUN6QixJQUFJO2FBQ0wsQ0FBQztTQUNILENBQUM7SUFDSixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsUUFBUSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQy9CLE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU8sRUFBRTtnQkFDUCxjQUFjLEVBQUUsa0JBQWtCO2dCQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2FBQ25DO1lBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsQ0FBQztTQUMzRCxDQUFDO0lBQ0osQ0FBQztBQUNILENBQUMsQ0FBQztBQXZFVyxRQUFBLE9BQU8sV0F1RWxCO0FBRUYsS0FBSyxVQUFVLFVBQVUsQ0FBQyxTQUFpQjtJQUN6QyxNQUFNLE9BQU8sR0FBRyxJQUFJLHlCQUFVLENBQUM7UUFDN0IsU0FBUyxFQUFFLDRCQUFVLENBQUMsUUFBUTtRQUM5QixHQUFHLEVBQUUsRUFBRSxVQUFVLEVBQUUsU0FBUyxFQUFFO0tBQy9CLENBQUMsQ0FBQztJQUVILE1BQU0sTUFBTSxHQUFHLE1BQU0sZ0NBQWMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDbEQsT0FBTyxNQUFNLENBQUMsSUFBSSxDQUFDO0FBQ3JCLENBQUM7QUFFRCxLQUFLLFVBQVUsVUFBVSxDQUFDLFNBQWlCO0lBQ3pDLE1BQU0sT0FBTyxHQUFHLElBQUkseUJBQVUsQ0FBQztRQUM3QixTQUFTLEVBQUUsNEJBQVUsQ0FBQyxRQUFRO1FBQzlCLEdBQUcsRUFBRSxFQUFFLFVBQVUsRUFBRSxTQUFTLEVBQUU7S0FDL0IsQ0FBQyxDQUFDO0lBRUgsTUFBTSxNQUFNLEdBQUcsTUFBTSxnQ0FBYyxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUNsRCxPQUFPLE1BQU0sQ0FBQyxJQUFJLENBQUM7QUFDckIsQ0FBQztBQUVELEtBQUssVUFBVSxlQUFlLENBQUMsRUFBVSxFQUFFLElBQXFDO0lBQzlFLHVEQUF1RDtJQUN2RCxzREFBc0Q7SUFDdEQsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsSUFBSSxJQUFJLEVBQUUsRUFBRSxDQUFDLENBQUM7QUFDdkQsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogQXV0aCBMYW1iZGEgSGFuZGxlciAtIExvZ2luIGZ1bmN0aW9uYWxpdHlcbiAqIEhhbmRsZXMgc3R1ZGVudCBhbmQgdGVhY2hlciBhdXRoZW50aWNhdGlvblxuICovXG5cbmltcG9ydCB7IEdldENvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0IHsgZHluYW1vREJDbGllbnQsIHRhYmxlTmFtZXMgfSBmcm9tICcuLi91dGlscy9keW5hbW9kYi1jbGllbnQnO1xuXG5pbnRlcmZhY2UgTG9naW5SZXF1ZXN0IHtcbiAgaWQ6IHN0cmluZztcbiAgcGFzc3dvcmQ6IHN0cmluZztcbn1cblxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoXG4gIGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudFxuKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBib2R5OiBMb2dpblJlcXVlc3QgPSBKU09OLnBhcnNlKGV2ZW50LmJvZHkgfHwgJ3t9Jyk7XG4gICAgY29uc3QgeyBpZCwgcGFzc3dvcmQgfSA9IGJvZHk7XG5cbiAgICBpZiAoIWlkIHx8ICFwYXNzd29yZCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgICB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IG1lc3NhZ2U6ICdNaXNzaW5nIGlkIG9yIHBhc3N3b3JkJyB9KSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gVHJ5IHRvIGZpbmQgc3R1ZGVudCBmaXJzdFxuICAgIGxldCB1c2VyID0gYXdhaXQgZ2V0U3R1ZGVudChpZCk7XG4gICAgbGV0IHJvbGU6ICdzdHVkZW50JyB8ICd0ZWFjaGVyJyB8ICdhZG1pbicgPSAnc3R1ZGVudCc7XG5cbiAgICAvLyBJZiBub3QgZm91bmQsIHRyeSB0ZWFjaGVyXG4gICAgaWYgKCF1c2VyKSB7XG4gICAgICB1c2VyID0gYXdhaXQgZ2V0VGVhY2hlcihpZCk7XG4gICAgICBpZiAodXNlcikge1xuICAgICAgICByb2xlID0gKHVzZXIgYXMgYW55KS5pc19hZG1pbiA/ICdhZG1pbicgOiAndGVhY2hlcic7XG4gICAgICB9XG4gICAgfVxuXG4gICAgLy8gVmVyaWZ5IHVzZXIgZXhpc3RzIGFuZCBwYXNzd29yZCBtYXRjaGVzIChwbGFpbiB0ZXh0IGNvbXBhcmlzb24pXG4gICAgaWYgKCF1c2VyIHx8IHVzZXIucGFzc3dvcmQgIT09IHBhc3N3b3JkKSB7XG4gICAgICByZXR1cm4ge1xuICAgICAgICBzdGF0dXNDb2RlOiA0MDEsXG4gICAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICAgICAgIH0sXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgbWVzc2FnZTogJ0ludmFsaWQgY3JlZGVudGlhbHMnIH0pLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBVcGRhdGUgbGFzdCBsb2dpbiB0aW1lc3RhbXBcbiAgICBhd2FpdCB1cGRhdGVMYXN0TG9naW4oaWQsIHJvbGUpO1xuXG4gICAgLy8gUmVtb3ZlIHBhc3N3b3JkIGZyb20gcmVzcG9uc2VcbiAgICBjb25zdCB7IHBhc3N3b3JkOiBfLCAuLi51c2VyV2l0aG91dFBhc3N3b3JkIH0gPSB1c2VyO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgIHVzZXI6IHVzZXJXaXRob3V0UGFzc3dvcmQsXG4gICAgICAgIHJvbGUsXG4gICAgICB9KSxcbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yOicsIGVycm9yKTtcbiAgICByZXR1cm4ge1xuICAgICAgc3RhdHVzQ29kZTogNTAwLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgbWVzc2FnZTogJ0ludGVybmFsIHNlcnZlciBlcnJvcicgfSksXG4gICAgfTtcbiAgfVxufTtcblxuYXN5bmMgZnVuY3Rpb24gZ2V0U3R1ZGVudChzdHVkZW50SWQ6IHN0cmluZykge1xuICBjb25zdCBjb21tYW5kID0gbmV3IEdldENvbW1hbmQoe1xuICAgIFRhYmxlTmFtZTogdGFibGVOYW1lcy5zdHVkZW50cyxcbiAgICBLZXk6IHsgc3R1ZGVudF9pZDogc3R1ZGVudElkIH0sXG4gIH0pO1xuXG4gIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGR5bmFtb0RCQ2xpZW50LnNlbmQoY29tbWFuZCk7XG4gIHJldHVybiByZXN1bHQuSXRlbTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gZ2V0VGVhY2hlcih0ZWFjaGVySWQ6IHN0cmluZykge1xuICBjb25zdCBjb21tYW5kID0gbmV3IEdldENvbW1hbmQoe1xuICAgIFRhYmxlTmFtZTogdGFibGVOYW1lcy50ZWFjaGVycyxcbiAgICBLZXk6IHsgdGVhY2hlcl9pZDogdGVhY2hlcklkIH0sXG4gIH0pO1xuXG4gIGNvbnN0IHJlc3VsdCA9IGF3YWl0IGR5bmFtb0RCQ2xpZW50LnNlbmQoY29tbWFuZCk7XG4gIHJldHVybiByZXN1bHQuSXRlbTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gdXBkYXRlTGFzdExvZ2luKGlkOiBzdHJpbmcsIHJvbGU6ICdzdHVkZW50JyB8ICd0ZWFjaGVyJyB8ICdhZG1pbicpIHtcbiAgLy8gSW1wbGVtZW50YXRpb24gd291bGQgdXBkYXRlIHRoZSBsYXN0X2xvZ2luIHRpbWVzdGFtcFxuICAvLyBUaGlzIGlzIGEgcGxhY2Vob2xkZXIgZm9yIHRoZSBhY3R1YWwgaW1wbGVtZW50YXRpb25cbiAgY29uc29sZS5sb2coYFVwZGF0aW5nIGxhc3QgbG9naW4gZm9yICR7cm9sZX0gJHtpZH1gKTtcbn1cbiJdfQ==