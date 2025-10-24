"use strict";
/**
 * Game Click Lambda Handler
 * Increments the accumulated_click count for a game
 * Updates student marks based on game difficulty when a student clicks
 * Uses atomic DynamoDB operations to handle concurrent clicks safely
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const dynamodb_client_1 = require("../utils/dynamodb-client");
// Mark values based on difficulty
const MARKS_BY_DIFFICULTY = {
    'Beginner': 5,
    'Intermediate': 10,
    'Advanced': 15,
};
const handler = async (event) => {
    try {
        const gameId = event.pathParameters?.gameId;
        if (!gameId) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ message: 'Missing gameId parameter' }),
            };
        }
        // Parse request body for user context
        let requestBody = {};
        if (event.body) {
            try {
                requestBody = JSON.parse(event.body);
            }
            catch (err) {
                // If body can't be parsed, continue without user context
                console.log('Could not parse request body, continuing without user context');
            }
        }
        // First verify the game exists and get its difficulty
        const getCommand = new lib_dynamodb_1.GetCommand({
            TableName: dynamodb_client_1.tableNames.games,
            Key: { scratch_game_id: gameId },
        });
        const getResult = await dynamodb_client_1.dynamoDBClient.send(getCommand);
        if (!getResult.Item) {
            return {
                statusCode: 404,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({ message: 'Game not found' }),
            };
        }
        const game = getResult.Item;
        // Use atomic ADD operation to increment the click count
        // This ensures thread-safety even with concurrent requests
        const updateCommand = new lib_dynamodb_1.UpdateCommand({
            TableName: dynamodb_client_1.tableNames.games,
            Key: { scratch_game_id: gameId },
            UpdateExpression: 'ADD accumulated_click :increment',
            ExpressionAttributeValues: {
                ':increment': 1,
            },
            ReturnValues: 'ALL_NEW',
        });
        const updateResult = await dynamodb_client_1.dynamoDBClient.send(updateCommand);
        // Update student marks if this is a student clicking
        let updatedMarks;
        if (requestBody.student_id && requestBody.role === 'student' && game.difficulty) {
            const marksToAdd = MARKS_BY_DIFFICULTY[game.difficulty];
            if (marksToAdd) {
                try {
                    const studentUpdateCommand = new lib_dynamodb_1.UpdateCommand({
                        TableName: dynamodb_client_1.tableNames.students,
                        Key: { student_id: requestBody.student_id },
                        UpdateExpression: 'ADD marks :marksIncrement',
                        ExpressionAttributeValues: {
                            ':marksIncrement': marksToAdd,
                        },
                        ReturnValues: 'ALL_NEW',
                    });
                    const studentUpdateResult = await dynamodb_client_1.dynamoDBClient.send(studentUpdateCommand);
                    updatedMarks = studentUpdateResult.Attributes?.marks;
                }
                catch (studentUpdateError) {
                    console.error('Failed to update student marks:', studentUpdateError);
                    // Continue even if mark update fails - don't fail the click tracking
                }
            }
        }
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: true,
                accumulated_click: updateResult.Attributes?.accumulated_click,
                marks: updatedMarks,
            }),
        };
    }
    catch (error) {
        console.error('Error incrementing game click:', error);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGljay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7OztBQUVILHdEQUFrRTtBQUVsRSw4REFBc0U7QUFPdEUsa0NBQWtDO0FBQ2xDLE1BQU0sbUJBQW1CLEdBQTJCO0lBQ2xELFVBQVUsRUFBRSxDQUFDO0lBQ2IsY0FBYyxFQUFFLEVBQUU7SUFDbEIsVUFBVSxFQUFFLEVBQUU7Q0FDZixDQUFDO0FBRUssTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUMxQixLQUEyQixFQUNLLEVBQUU7SUFDbEMsSUFBSSxDQUFDO1FBQ0gsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLGNBQWMsRUFBRSxNQUFNLENBQUM7UUFFNUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ1osT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUU7b0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtvQkFDbEMsNkJBQTZCLEVBQUUsR0FBRztpQkFDbkM7Z0JBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxPQUFPLEVBQUUsMEJBQTBCLEVBQUUsQ0FBQzthQUM5RCxDQUFDO1FBQ0osQ0FBQztRQUVELHNDQUFzQztRQUN0QyxJQUFJLFdBQVcsR0FBcUIsRUFBRSxDQUFDO1FBQ3ZDLElBQUksS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2YsSUFBSSxDQUFDO2dCQUNILFdBQVcsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsQ0FBQztZQUN2QyxDQUFDO1lBQUMsT0FBTyxHQUFHLEVBQUUsQ0FBQztnQkFDYix5REFBeUQ7Z0JBQ3pELE9BQU8sQ0FBQyxHQUFHLENBQUMsK0RBQStELENBQUMsQ0FBQztZQUMvRSxDQUFDO1FBQ0gsQ0FBQztRQUVELHNEQUFzRDtRQUN0RCxNQUFNLFVBQVUsR0FBRyxJQUFJLHlCQUFVLENBQUM7WUFD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WUFDZixPQUFPLEVBQUU7Z0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtnQkFDbEMsNkJBQTZCLEVBQUUsR0FBRzthQUNuQztZQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsT0FBTyxFQUFFLHVCQUF1QixFQUFFLENBQUM7U0FDM0QsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDLENBQUM7QUFoSFcsUUFBQSxPQUFPLFdBZ0hsQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxuICogR2FtZSBDbGljayBMYW1iZGEgSGFuZGxlclxuICogSW5jcmVtZW50cyB0aGUgYWNjdW11bGF0ZWRfY2xpY2sgY291bnQgZm9yIGEgZ2FtZVxuICogVXBkYXRlcyBzdHVkZW50IG1hcmtzIGJhc2VkIG9uIGdhbWUgZGlmZmljdWx0eSB3aGVuIGEgc3R1ZGVudCBjbGlja3NcbiAqIFVzZXMgYXRvbWljIER5bmFtb0RCIG9wZXJhdGlvbnMgdG8gaGFuZGxlIGNvbmN1cnJlbnQgY2xpY2tzIHNhZmVseVxuICovXG5cbmltcG9ydCB7IFVwZGF0ZUNvbW1hbmQsIEdldENvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0IHsgZHluYW1vREJDbGllbnQsIHRhYmxlTmFtZXMgfSBmcm9tICcuLi91dGlscy9keW5hbW9kYi1jbGllbnQnO1xuXG5pbnRlcmZhY2UgQ2xpY2tSZXF1ZXN0Qm9keSB7XG4gIHN0dWRlbnRfaWQ/OiBzdHJpbmc7XG4gIHJvbGU/OiAnc3R1ZGVudCcgfCAndGVhY2hlcicgfCAnYWRtaW4nO1xufVxuXG4vLyBNYXJrIHZhbHVlcyBiYXNlZCBvbiBkaWZmaWN1bHR5XG5jb25zdCBNQVJLU19CWV9ESUZGSUNVTFRZOiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+ID0ge1xuICAnQmVnaW5uZXInOiA1LFxuICAnSW50ZXJtZWRpYXRlJzogMTAsXG4gICdBZHZhbmNlZCc6IDE1LFxufTtcblxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoXG4gIGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudFxuKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcbiAgdHJ5IHtcbiAgICBjb25zdCBnYW1lSWQgPSBldmVudC5wYXRoUGFyYW1ldGVycz8uZ2FtZUlkO1xuXG4gICAgaWYgKCFnYW1lSWQpIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgICAgfSxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBtZXNzYWdlOiAnTWlzc2luZyBnYW1lSWQgcGFyYW1ldGVyJyB9KSxcbiAgICAgIH07XG4gICAgfVxuXG4gICAgLy8gUGFyc2UgcmVxdWVzdCBib2R5IGZvciB1c2VyIGNvbnRleHRcbiAgICBsZXQgcmVxdWVzdEJvZHk6IENsaWNrUmVxdWVzdEJvZHkgPSB7fTtcbiAgICBpZiAoZXZlbnQuYm9keSkge1xuICAgICAgdHJ5IHtcbiAgICAgICAgcmVxdWVzdEJvZHkgPSBKU09OLnBhcnNlKGV2ZW50LmJvZHkpO1xuICAgICAgfSBjYXRjaCAoZXJyKSB7XG4gICAgICAgIC8vIElmIGJvZHkgY2FuJ3QgYmUgcGFyc2VkLCBjb250aW51ZSB3aXRob3V0IHVzZXIgY29udGV4dFxuICAgICAgICBjb25zb2xlLmxvZygnQ291bGQgbm90IHBhcnNlIHJlcXVlc3QgYm9keSwgY29udGludWluZyB3aXRob3V0IHVzZXIgY29udGV4dCcpO1xuICAgICAgfVxuICAgIH1cblxuICAgIC8vIEZpcnN0IHZlcmlmeSB0aGUgZ2FtZSBleGlzdHMgYW5kIGdldCBpdHMgZGlmZmljdWx0eVxuICAgIGNvbnN0IGdldENvbW1hbmQgPSBuZXcgR2V0Q29tbWFuZCh7XG4gICAgICBUYWJsZU5hbWU6IHRhYmxlTmFtZXMuZ2FtZXMsXG4gICAgICBLZXk6IHsgc2NyYXRjaF9nYW1lX2lkOiBnYW1lSWQgfSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGdldFJlc3VsdCA9IGF3YWl0IGR5bmFtb0RCQ2xpZW50LnNlbmQoZ2V0Q29tbWFuZCk7XG4gICAgXG4gICAgaWYgKCFnZXRSZXN1bHQuSXRlbSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3RhdHVzQ29kZTogNDA0LFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgICB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IG1lc3NhZ2U6ICdHYW1lIG5vdCBmb3VuZCcgfSksXG4gICAgICB9O1xuICAgIH1cblxuICAgIGNvbnN0IGdhbWUgPSBnZXRSZXN1bHQuSXRlbTtcblxuICAgIC8vIFVzZSBhdG9taWMgQUREIG9wZXJhdGlvbiB0byBpbmNyZW1lbnQgdGhlIGNsaWNrIGNvdW50XG4gICAgLy8gVGhpcyBlbnN1cmVzIHRocmVhZC1zYWZldHkgZXZlbiB3aXRoIGNvbmN1cnJlbnQgcmVxdWVzdHNcbiAgICBjb25zdCB1cGRhdGVDb21tYW5kID0gbmV3IFVwZGF0ZUNvbW1hbmQoe1xuICAgICAgVGFibGVOYW1lOiB0YWJsZU5hbWVzLmdhbWVzLFxuICAgICAgS2V5OiB7IHNjcmF0Y2hfZ2FtZV9pZDogZ2FtZUlkIH0sXG4gICAgICBVcGRhdGVFeHByZXNzaW9uOiAnQUREIGFjY3VtdWxhdGVkX2NsaWNrIDppbmNyZW1lbnQnLFxuICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczoge1xuICAgICAgICAnOmluY3JlbWVudCc6IDEsXG4gICAgICB9LFxuICAgICAgUmV0dXJuVmFsdWVzOiAnQUxMX05FVycsXG4gICAgfSk7XG5cbiAgICBjb25zdCB1cGRhdGVSZXN1bHQgPSBhd2FpdCBkeW5hbW9EQkNsaWVudC5zZW5kKHVwZGF0ZUNvbW1hbmQpO1xuXG4gICAgLy8gVXBkYXRlIHN0dWRlbnQgbWFya3MgaWYgdGhpcyBpcyBhIHN0dWRlbnQgY2xpY2tpbmdcbiAgICBsZXQgdXBkYXRlZE1hcmtzOiBudW1iZXIgfCB1bmRlZmluZWQ7XG4gICAgaWYgKHJlcXVlc3RCb2R5LnN0dWRlbnRfaWQgJiYgcmVxdWVzdEJvZHkucm9sZSA9PT0gJ3N0dWRlbnQnICYmIGdhbWUuZGlmZmljdWx0eSkge1xuICAgICAgY29uc3QgbWFya3NUb0FkZCA9IE1BUktTX0JZX0RJRkZJQ1VMVFlbZ2FtZS5kaWZmaWN1bHR5XTtcbiAgICAgIFxuICAgICAgaWYgKG1hcmtzVG9BZGQpIHtcbiAgICAgICAgdHJ5IHtcbiAgICAgICAgICBjb25zdCBzdHVkZW50VXBkYXRlQ29tbWFuZCA9IG5ldyBVcGRhdGVDb21tYW5kKHtcbiAgICAgICAgICAgIFRhYmxlTmFtZTogdGFibGVOYW1lcy5zdHVkZW50cyxcbiAgICAgICAgICAgIEtleTogeyBzdHVkZW50X2lkOiByZXF1ZXN0Qm9keS5zdHVkZW50X2lkIH0sXG4gICAgICAgICAgICBVcGRhdGVFeHByZXNzaW9uOiAnQUREIG1hcmtzIDptYXJrc0luY3JlbWVudCcsXG4gICAgICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XG4gICAgICAgICAgICAgICc6bWFya3NJbmNyZW1lbnQnOiBtYXJrc1RvQWRkLFxuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIFJldHVyblZhbHVlczogJ0FMTF9ORVcnLFxuICAgICAgICAgIH0pO1xuXG4gICAgICAgICAgY29uc3Qgc3R1ZGVudFVwZGF0ZVJlc3VsdCA9IGF3YWl0IGR5bmFtb0RCQ2xpZW50LnNlbmQoc3R1ZGVudFVwZGF0ZUNvbW1hbmQpO1xuICAgICAgICAgIHVwZGF0ZWRNYXJrcyA9IHN0dWRlbnRVcGRhdGVSZXN1bHQuQXR0cmlidXRlcz8ubWFya3M7XG4gICAgICAgIH0gY2F0Y2ggKHN0dWRlbnRVcGRhdGVFcnJvcikge1xuICAgICAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byB1cGRhdGUgc3R1ZGVudCBtYXJrczonLCBzdHVkZW50VXBkYXRlRXJyb3IpO1xuICAgICAgICAgIC8vIENvbnRpbnVlIGV2ZW4gaWYgbWFyayB1cGRhdGUgZmFpbHMgLSBkb24ndCBmYWlsIHRoZSBjbGljayB0cmFja2luZ1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuXG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgIGFjY3VtdWxhdGVkX2NsaWNrOiB1cGRhdGVSZXN1bHQuQXR0cmlidXRlcz8uYWNjdW11bGF0ZWRfY2xpY2ssXG4gICAgICAgIG1hcmtzOiB1cGRhdGVkTWFya3MsXG4gICAgICB9KSxcbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGluY3JlbWVudGluZyBnYW1lIGNsaWNrOicsIGVycm9yKTtcbiAgICByZXR1cm4ge1xuICAgICAgc3RhdHVzQ29kZTogNTAwLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgbWVzc2FnZTogJ0ludGVybmFsIHNlcnZlciBlcnJvcicgfSksXG4gICAgfTtcbiAgfVxufTtcbiJdfQ==