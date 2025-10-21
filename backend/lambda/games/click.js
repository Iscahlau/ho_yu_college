"use strict";
/**
 * Game Click Lambda Handler
 * Increments the accumulated_click count for a game
 * Uses atomic DynamoDB operations to handle concurrent clicks safely
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const dynamodb_client_1 = require("../utils/dynamodb-client");
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
        // First verify the game exists
        const getCommand = new lib_dynamodb_1.GetCommand({
            TableName: dynamodb_client_1.tableNames.games,
            Key: { game_id: gameId },
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
        // Use atomic ADD operation to increment the click count
        // This ensures thread-safety even with concurrent requests
        const updateCommand = new lib_dynamodb_1.UpdateCommand({
            TableName: dynamodb_client_1.tableNames.games,
            Key: { game_id: gameId },
            UpdateExpression: 'ADD accumulated_click :increment',
            ExpressionAttributeValues: {
                ':increment': 1,
            },
            ReturnValues: 'ALL_NEW',
        });
        const updateResult = await dynamodb_client_1.dynamoDBClient.send(updateCommand);
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                success: true,
                accumulated_click: updateResult.Attributes?.accumulated_click,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGljay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7R0FJRzs7O0FBRUgsd0RBQWtFO0FBRWxFLDhEQUFzRTtBQUUvRCxNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQzFCLEtBQTJCLEVBQ0ssRUFBRTtJQUNsQyxJQUFJLENBQUM7UUFDSCxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsY0FBYyxFQUFFLE1BQU0sQ0FBQztRQUU1QyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDWixPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLE9BQU8sRUFBRTtvQkFDUCxjQUFjLEVBQUUsa0JBQWtCO29CQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2lCQUNuQztnQkFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLE9BQU8sRUFBRSwwQkFBMEIsRUFBRSxDQUFDO2FBQzlELENBQUM7UUFDSixDQUFDO1FBRUQsK0JBQStCO1FBQy9CLE1BQU0sVUFBVSxHQUFHLElBQUkseUJBQVUsQ0FBQztZQUNoQyxTQUFTLEVBQUUsNEJBQVUsQ0FBQyxLQUFLO1lBQzNCLEdBQUcsRUFBRSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUU7U0FDekIsQ0FBQyxDQUFDO1FBRUgsTUFBTSxTQUFTLEdBQUcsTUFBTSxnQ0FBYyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUV4RCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3BCLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTyxFQUFFO29CQUNQLGNBQWMsRUFBRSxrQkFBa0I7b0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7aUJBQ25DO2dCQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLENBQUM7YUFDcEQsQ0FBQztRQUNKLENBQUM7UUFFRCx3REFBd0Q7UUFDeEQsMkRBQTJEO1FBQzNELE1BQU0sYUFBYSxHQUFHLElBQUksNEJBQWEsQ0FBQztZQUN0QyxTQUFTLEVBQUUsNEJBQVUsQ0FBQyxLQUFLO1lBQzNCLEdBQUcsRUFBRSxFQUFFLE9BQU8sRUFBRSxNQUFNLEVBQUU7WUFDeEIsZ0JBQWdCLEVBQUUsa0NBQWtDO1lBQ3BELHlCQUF5QixFQUFFO2dCQUN6QixZQUFZLEVBQUUsQ0FBQzthQUNoQjtZQUNELFlBQVksRUFBRSxTQUFTO1NBQ3hCLENBQUMsQ0FBQztRQUVILE1BQU0sWUFBWSxHQUFHLE1BQU0sZ0NBQWMsQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLENBQUM7UUFFOUQsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFO2dCQUNQLGNBQWMsRUFBRSxrQkFBa0I7Z0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7YUFDbkM7WUFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztnQkFDbkIsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsaUJBQWlCLEVBQUUsWUFBWSxDQUFDLFVBQVUsRUFBRSxpQkFBaUI7YUFDOUQsQ0FBQztTQUNILENBQUM7SUFDSixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsZ0NBQWdDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdkQsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFO2dCQUNQLGNBQWMsRUFBRSxrQkFBa0I7Z0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7YUFDbkM7WUFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLE9BQU8sRUFBRSx1QkFBdUIsRUFBRSxDQUFDO1NBQzNELENBQUM7SUFDSixDQUFDO0FBQ0gsQ0FBQyxDQUFDO0FBeEVXLFFBQUEsT0FBTyxXQXdFbEIiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcbiAqIEdhbWUgQ2xpY2sgTGFtYmRhIEhhbmRsZXJcbiAqIEluY3JlbWVudHMgdGhlIGFjY3VtdWxhdGVkX2NsaWNrIGNvdW50IGZvciBhIGdhbWVcbiAqIFVzZXMgYXRvbWljIER5bmFtb0RCIG9wZXJhdGlvbnMgdG8gaGFuZGxlIGNvbmN1cnJlbnQgY2xpY2tzIHNhZmVseVxuICovXG5cbmltcG9ydCB7IFVwZGF0ZUNvbW1hbmQsIEdldENvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9saWItZHluYW1vZGInO1xuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xuaW1wb3J0IHsgZHluYW1vREJDbGllbnQsIHRhYmxlTmFtZXMgfSBmcm9tICcuLi91dGlscy9keW5hbW9kYi1jbGllbnQnO1xuXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChcbiAgZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50XG4pOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xuICB0cnkge1xuICAgIGNvbnN0IGdhbWVJZCA9IGV2ZW50LnBhdGhQYXJhbWV0ZXJzPy5nYW1lSWQ7XG5cbiAgICBpZiAoIWdhbWVJZCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgICB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IG1lc3NhZ2U6ICdNaXNzaW5nIGdhbWVJZCBwYXJhbWV0ZXInIH0pLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBGaXJzdCB2ZXJpZnkgdGhlIGdhbWUgZXhpc3RzXG4gICAgY29uc3QgZ2V0Q29tbWFuZCA9IG5ldyBHZXRDb21tYW5kKHtcbiAgICAgIFRhYmxlTmFtZTogdGFibGVOYW1lcy5nYW1lcyxcbiAgICAgIEtleTogeyBnYW1lX2lkOiBnYW1lSWQgfSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGdldFJlc3VsdCA9IGF3YWl0IGR5bmFtb0RCQ2xpZW50LnNlbmQoZ2V0Q29tbWFuZCk7XG4gICAgXG4gICAgaWYgKCFnZXRSZXN1bHQuSXRlbSkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3RhdHVzQ29kZTogNDA0LFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgICB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IG1lc3NhZ2U6ICdHYW1lIG5vdCBmb3VuZCcgfSksXG4gICAgICB9O1xuICAgIH1cblxuICAgIC8vIFVzZSBhdG9taWMgQUREIG9wZXJhdGlvbiB0byBpbmNyZW1lbnQgdGhlIGNsaWNrIGNvdW50XG4gICAgLy8gVGhpcyBlbnN1cmVzIHRocmVhZC1zYWZldHkgZXZlbiB3aXRoIGNvbmN1cnJlbnQgcmVxdWVzdHNcbiAgICBjb25zdCB1cGRhdGVDb21tYW5kID0gbmV3IFVwZGF0ZUNvbW1hbmQoe1xuICAgICAgVGFibGVOYW1lOiB0YWJsZU5hbWVzLmdhbWVzLFxuICAgICAgS2V5OiB7IGdhbWVfaWQ6IGdhbWVJZCB9LFxuICAgICAgVXBkYXRlRXhwcmVzc2lvbjogJ0FERCBhY2N1bXVsYXRlZF9jbGljayA6aW5jcmVtZW50JyxcbiAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcbiAgICAgICAgJzppbmNyZW1lbnQnOiAxLFxuICAgICAgfSxcbiAgICAgIFJldHVyblZhbHVlczogJ0FMTF9ORVcnLFxuICAgIH0pO1xuXG4gICAgY29uc3QgdXBkYXRlUmVzdWx0ID0gYXdhaXQgZHluYW1vREJDbGllbnQuc2VuZCh1cGRhdGVDb21tYW5kKTtcblxuICAgIHJldHVybiB7XG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXG4gICAgICBoZWFkZXJzOiB7XG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXG4gICAgICB9LFxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xuICAgICAgICBzdWNjZXNzOiB0cnVlLFxuICAgICAgICBhY2N1bXVsYXRlZF9jbGljazogdXBkYXRlUmVzdWx0LkF0dHJpYnV0ZXM/LmFjY3VtdWxhdGVkX2NsaWNrLFxuICAgICAgfSksXG4gICAgfTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBpbmNyZW1lbnRpbmcgZ2FtZSBjbGljazonLCBlcnJvcik7XG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1c0NvZGU6IDUwMCxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IG1lc3NhZ2U6ICdJbnRlcm5hbCBzZXJ2ZXIgZXJyb3InIH0pLFxuICAgIH07XG4gIH1cbn07XG4iXX0=