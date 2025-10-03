"use strict";
/**
 * Auth Lambda Handler - Login functionality
 * Handles student and teacher authentication
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const crypto = require("crypto");
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
        // Hash password for comparison
        const hashedPassword = hashPassword(password);
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
        // Verify user exists and password matches
        if (!user || user.password !== hashedPassword) {
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
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9naW4uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJsb2dpbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztHQUdHOzs7QUFFSCw4REFBMEQ7QUFDMUQsd0RBQTJFO0FBRTNFLGlDQUFpQztBQUVqQyxNQUFNLE1BQU0sR0FBRyxJQUFJLGdDQUFjLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDdEMsTUFBTSxTQUFTLEdBQUcscUNBQXNCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBTy9DLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFDMUIsS0FBMkIsRUFDSyxFQUFFO0lBQ2xDLElBQUksQ0FBQztRQUNILE1BQU0sSUFBSSxHQUFpQixJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLElBQUksSUFBSSxDQUFDLENBQUM7UUFDMUQsTUFBTSxFQUFFLEVBQUUsRUFBRSxRQUFRLEVBQUUsR0FBRyxJQUFJLENBQUM7UUFFOUIsSUFBSSxDQUFDLEVBQUUsSUFBSSxDQUFDLFFBQVEsRUFBRSxDQUFDO1lBQ3JCLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTyxFQUFFO29CQUNQLGNBQWMsRUFBRSxrQkFBa0I7b0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7aUJBQ25DO2dCQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsT0FBTyxFQUFFLHdCQUF3QixFQUFFLENBQUM7YUFDNUQsQ0FBQztRQUNKLENBQUM7UUFFRCwrQkFBK0I7UUFDL0IsTUFBTSxjQUFjLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQyxDQUFDO1FBRTlDLDRCQUE0QjtRQUM1QixJQUFJLElBQUksR0FBRyxNQUFNLFVBQVUsQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUNoQyxJQUFJLElBQUksR0FBb0MsU0FBUyxDQUFDO1FBRXRELDRCQUE0QjtRQUM1QixJQUFJLENBQUMsSUFBSSxFQUFFLENBQUM7WUFDVixJQUFJLEdBQUcsTUFB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QyxVQUFVLENBQUMsUUFBUSxDQUFDLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQztBQUNwRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBBdXRoIExhbWJkYSBIYW5kbGVyIC0gTG9naW4gZnVuY3Rpb25hbGl0eVxuICogSGFuZGxlcyBzdHVkZW50IGFuZCB0ZWFjaGVyIGF1dGhlbnRpY2F0aW9uXG4gKi9cblxuaW1wb3J0IHsgRHluYW1vREJDbGllbnQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtZHluYW1vZGInO1xuaW1wb3J0IHsgRHluYW1vREJEb2N1bWVudENsaWVudCwgR2V0Q29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYic7XG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XG5pbXBvcnQgKiBhcyBjcnlwdG8gZnJvbSAnY3J5cHRvJztcblxuY29uc3QgY2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHt9KTtcbmNvbnN0IGRvY0NsaWVudCA9IER5bmFtb0RCRG9jdW1lbnRDbGllbnQuZnJvbShjbGllbnQpO1xuXG5pbnRlcmZhY2UgTG9naW5SZXF1ZXN0IHtcbiAgaWQ6IHN0cmluZztcbiAgcGFzc3dvcmQ6IHN0cmluZztcbn1cblxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoXG4gIGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudFxuKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBib2R5OiBMb2dpblJlcXVlc3QgPSBKU09OLnBhcnNlKGV2ZW50LmJvZHkgfHwgJ3t9Jyk7XG4gICAgY29uc3QgeyBpZCwgcGFzc3dvcmQgfSA9IGJvZHk7XG5cbiAgICBpZiAoIWlkIHx8ICFwYXNzd29yZCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgICB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IG1lc3NhZ2U6ICdNaXNzaW5nIGlkIG9yIHBhc3N3b3JkJyB9KSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gSGFzaCBwYXNzd29yZCBmb3IgY29tcGFyaXNvblxuICAgIGNvbnN0IGhhc2hlZFBhc3N3b3JkID0gaGFzaFBhc3N3b3JkKHBhc3N3b3JkKTtcblxuICAgIC8vIFRyeSB0byBmaW5kIHN0dWRlbnQgZmlyc3RcbiAgICBsZXQgdXNlciA9IGF3YWl0IGdldFN0dWRlbnQoaWQpO1xuICAgIGxldCByb2xlOiAnc3R1ZGVudCcgfCAndGVhY2hlcicgfCAnYWRtaW4nID0gJ3N0dWRlbnQnO1xuXG4gICAgLy8gSWYgbm90IGZvdW5kLCB0cnkgdGVhY2hlclxuICAgIGlmICghdXNlcikge1xuICAgICAgdXNlciA9IGF3YWl0IGdldFRlYWNoZXIoaWQpO1xuICAgICAgaWYgKHVzZXIpIHtcbiAgICAgICAgcm9sZSA9ICh1c2VyIGFzIGFueSkuaXNfYWRtaW4gPyAnYWRtaW4nIDogJ3RlYWNoZXInO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIFZlcmlmeSB1c2VyIGV4aXN0cyBhbmQgcGFzc3dvcmQgbWF0Y2hlc1xuICAgIGlmICghdXNlciB8fCB1c2VyLnBhc3N3b3JkICE9PSBoYXNoZWRQYXNzd29yZCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3RhdHVzQ29kZTogNDAxLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgICB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IG1lc3NhZ2U6ICdJbnZhbGlkIGNyZWRlbnRpYWxzJyB9KSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gVXBkYXRlIGxhc3QgbG9naW4gdGltZXN0YW1wXG4gICAgYXdhaXQgdXBkYXRlTGFzdExvZ2luKGlkLCByb2xlKTtcblxuICAgIC8vIFJlbW92ZSBwYXNzd29yZCBmcm9tIHJlc3BvbnNlXG4gICAgY29uc3QgeyBwYXNzd29yZDogXywgLi4udXNlcldpdGhvdXRQYXNzd29yZCB9ID0gdXNlcjtcblxuICAgIHJldHVybiB7XG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICAgICB9LFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICB1c2VyOiB1c2VyV2l0aG91dFBhc3N3b3JkLFxuICAgICAgICByb2xlLFxuICAgICAgfSksXG4gICAgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvcjonLCBlcnJvcik7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1c0NvZGU6IDUwMCxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IG1lc3NhZ2U6ICdJbnRlcm5hbCBzZXJ2ZXIgZXJyb3InIH0pLFxuICAgIH07XG4gIH1cbn07XG5cbmFzeW5jIGZ1bmN0aW9uIGdldFN0dWRlbnQoc3R1ZGVudElkOiBzdHJpbmcpIHtcbiAgY29uc3QgY29tbWFuZCA9IG5ldyBHZXRDb21tYW5kKHtcbiAgICBUYWJsZU5hbWU6IHByb2Nlc3MuZW52LlNUVURFTlRTX1RBQkxFX05BTUUsXG4gICAgS2V5OiB7IHN0dWRlbnRfaWQ6IHN0dWRlbnRJZCB9LFxuICB9KTtcblxuICBjb25zdCByZXN1bHQgPSBhd2FpdCBkb2NDbGllbnQuc2VuZChjb21tYW5kKTtcbiAgcmV0dXJuIHJlc3VsdC5JdGVtO1xufVxuXG5hc3luYyBmdW5jdGlvbiBnZXRUZWFjaGVyKHRlYWNoZXJJZDogc3RyaW5nKSB7XG4gIGNvbnN0IGNvbW1hbmQgPSBuZXcgR2V0Q29tbWFuZCh7XG4gICAgVGFibGVOYW1lOiBwcm9jZXNzLmVudi5URUFDSEVSU19UQUJMRV9OQU1FLFxuICAgIEtleTogeyB0ZWFjaGVyX2lkOiB0ZWFjaGVySWQgfSxcbiAgfSk7XG5cbiAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZG9jQ2xpZW50LnNlbmQoY29tbWFuZCk7XG4gIHJldHVybiByZXN1bHQuSXRlbTtcbn1cblxuYXN5bmMgZnVuY3Rpb24gdXBkYXRlTGFzdExvZ2luKGlkOiBzdHJpbmcsIHJvbGU6ICdzdHVkZW50JyB8ICd0ZWFjaGVyJyB8ICdhZG1pbicpIHtcbiAgLy8gSW1wbGVtZW50YXRpb24gd291bGQgdXBkYXRlIHRoZSBsYXN0X2xvZ2luIHRpbWVzdGFtcFxuICAvLyBUaGlzIGlzIGEgcGxhY2Vob2xkZXIgZm9yIHRoZSBhY3R1YWwgaW1wbGVtZW50YXRpb25cbiAgY29uc29sZS5sb2coYFVwZGF0aW5nIGxhc3QgbG9naW4gZm9yICR7cm9sZX0gJHtpZH1gKTtcbn1cblxuZnVuY3Rpb24gaGFzaFBhc3N3b3JkKHBhc3N3b3JkOiBzdHJpbmcpOiBzdHJpbmcge1xuICByZXR1cm4gY3J5cHRvLmNyZWF0ZUhhc2goJ3NoYTI1NicpLnVwZGF0ZShwYXNzd29yZCkuZGlnZXN0KCdoZXgnKTtcbn1cbiJdfQ==