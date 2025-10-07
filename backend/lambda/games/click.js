"use strict";
/**
 * Game Click Lambda Handler
 * Increments the accumulated_click count for a game
 * Uses atomic DynamoDB operations to handle concurrent clicks safely
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const client = new client_dynamodb_1.DynamoDBClient({});
const docClient = lib_dynamodb_1.DynamoDBDocumentClient.from(client);
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
            TableName: process.env.GAMES_TABLE_NAME,
            Key: { game_id: gameId },
        });
        const getResult = await docClient.send(getCommand);
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
            TableName: process.env.GAMES_TABLE_NAME,
            Key: { game_id: gameId },
            UpdateExpression: 'ADD accumulated_click :increment',
            ExpressionAttributeValues: {
                ':increment': 1,
            },
            ReturnValues: 'ALL_NEW',
        });
        const updateResult = await docClient.send(updateCommand);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY2xpY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJjbGljay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7R0FJRzs7O0FBRUgsOERBQTBEO0FBQzFELHdEQUEwRjtBQUcxRixNQUFNLE1BQU0sR0FBRyxJQUFJLGdDQUFjLENBQUMsRUFBRSxDQUFDLENBQUM7QUFDdEMsTUFBTSxTQUFTLEdBQUcscUNBQXNCLENBQUMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDO0FBRS9DLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFDMUIsS0FBMkIsRUFDSyxFQUFFO0lBQ2xDLElBQUksQ0FBQztRQUNILE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDO1FBRTVDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNaLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTyxFQUFFO29CQUNQLGNBQWMsRUFBRSxrQkFBa0I7b0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7aUJBQ25DO2dCQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsT0FBTyxFQUFFLDBCQUEwQixFQUFFLENBQUM7YUFDOUQsQ0FBQztRQUNKLENBQUM7UUFFRCwrQkFBK0I7UUFDL0IsTUFBTSxVQUFVLEdBQUcsSUFBSSx5QkFBVSxDQUFDO1lBQ2hDLFNBQVMsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGdCQUFnQjtZQUN2QyxHQUFHLEVBQUUsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFO1NBQ3pCLENBQUMsQ0FBQztRQUVILE1BQU0sU0FBUyxHQUFHLE1BQU0sU0FBUyxDQUFDLElBQUksQ0FBQyxVQUFVLENBQUMsQ0FBQztRQUVuRCxJQUFJLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ3BCLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTyxFQUFFO29CQUNQLGNBQWMsRUFBRSxrQkFBa0I7b0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7aUJBQ25DO2dCQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsT0FBTyxFQUFFLGdCQUFnQixFQUFFLENBQUM7YUFDcEQsQ0FBQztRQUNKLENBQUM7UUFFRCx3REFBd0Q7UUFDeEQsMkRBQTJEO1FBQzNELE1BQU0sYUFBYSxHQUFHLElBQUksNEJBQWEsQ0FBQztZQUN0QyxTQUFTLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxnQkFBZ0I7WUFDdkMsR0FBRyxFQUFFLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRTtZQUN4QixnQkFBZ0IsRUFBRSxrQ0FBa0M7WUFDcEQseUJBQXlCLEVBQUU7Z0JBQ3pCLFlBQVksRUFBRSxDQUFDO2FBQ2hCO1lBQ0QsWUFBWSxFQUFFLFNBQVM7U0FDeEIsQ0FBQyxDQUFDO1FBRUgsTUFBTSxZQUFZLEdBQUcsTUFBTSxTQUFTLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBRXpELE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU8sRUFBRTtnQkFDUCxjQUFjLEVBQUUsa0JBQWtCO2dCQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2FBQ25DO1lBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7Z0JBQ25CLE9BQU8sRUFBRSxJQUFJO2dCQUNiLGlCQUFpQixFQUFFLFlBQVksQ0FBQyxVQUFVLEVBQUUsaUJBQWlCO2FBQzlELENBQUM7U0FDSCxDQUFDO0lBQ0osQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLGdDQUFnQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQ3ZELE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU8sRUFBRTtnQkFDUCxjQUFjLEVBQUUsa0JBQWtCO2dCQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2FBQ25DO1lBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxPQUFPLEVBQUUsdUJBQXVCLEVBQUUsQ0FBQztTQUMzRCxDQUFDO0lBQ0osQ0FBQztBQUNILENBQUMsQ0FBQztBQXhFVyxRQUFBLE9BQU8sV0F3RWxCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXG4gKiBHYW1lIENsaWNrIExhbWJkYSBIYW5kbGVyXG4gKiBJbmNyZW1lbnRzIHRoZSBhY2N1bXVsYXRlZF9jbGljayBjb3VudCBmb3IgYSBnYW1lXG4gKiBVc2VzIGF0b21pYyBEeW5hbW9EQiBvcGVyYXRpb25zIHRvIGhhbmRsZSBjb25jdXJyZW50IGNsaWNrcyBzYWZlbHlcbiAqL1xuXG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XG5pbXBvcnQgeyBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LCBVcGRhdGVDb21tYW5kLCBHZXRDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvbGliLWR5bmFtb2RiJztcbmltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcblxuY29uc3QgY2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHt9KTtcbmNvbnN0IGRvY0NsaWVudCA9IER5bmFtb0RCRG9jdW1lbnRDbGllbnQuZnJvbShjbGllbnQpO1xuXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChcbiAgZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50XG4pOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xuICB0cnkge1xuICAgIGNvbnN0IGdhbWVJZCA9IGV2ZW50LnBhdGhQYXJhbWV0ZXJzPy5nYW1lSWQ7XG5cbiAgICBpZiAoIWdhbWVJZCkge1xuICAgICAgcmV0dXJuIHtcbiAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxuICAgICAgICBoZWFkZXJzOiB7XG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgICB9LFxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IG1lc3NhZ2U6ICdNaXNzaW5nIGdhbWVJZCBwYXJhbWV0ZXInIH0pLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBGaXJzdCB2ZXJpZnkgdGhlIGdhbWUgZXhpc3RzXG4gICAgY29uc3QgZ2V0Q29tbWFuZCA9IG5ldyBHZXRDb21tYW5kKHtcbiAgICAgIFRhYmxlTmFtZTogcHJvY2Vzcy5lbnYuR0FNRVNfVEFCTEVfTkFNRSxcbiAgICAgIEtleTogeyBnYW1lX2lkOiBnYW1lSWQgfSxcbiAgICB9KTtcblxuICAgIGNvbnN0IGdldFJlc3VsdCA9IGF3YWl0IGRvY0NsaWVudC5zZW5kKGdldENvbW1hbmQpO1xuICAgIFxuICAgIGlmICghZ2V0UmVzdWx0Lkl0ZW0pIHtcbiAgICAgIHJldHVybiB7XG4gICAgICAgIHN0YXR1c0NvZGU6IDQwNCxcbiAgICAgICAgaGVhZGVyczoge1xuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgICAgfSxcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBtZXNzYWdlOiAnR2FtZSBub3QgZm91bmQnIH0pLFxuICAgICAgfTtcbiAgICB9XG5cbiAgICAvLyBVc2UgYXRvbWljIEFERCBvcGVyYXRpb24gdG8gaW5jcmVtZW50IHRoZSBjbGljayBjb3VudFxuICAgIC8vIFRoaXMgZW5zdXJlcyB0aHJlYWQtc2FmZXR5IGV2ZW4gd2l0aCBjb25jdXJyZW50IHJlcXVlc3RzXG4gICAgY29uc3QgdXBkYXRlQ29tbWFuZCA9IG5ldyBVcGRhdGVDb21tYW5kKHtcbiAgICAgIFRhYmxlTmFtZTogcHJvY2Vzcy5lbnYuR0FNRVNfVEFCTEVfTkFNRSxcbiAgICAgIEtleTogeyBnYW1lX2lkOiBnYW1lSWQgfSxcbiAgICAgIFVwZGF0ZUV4cHJlc3Npb246ICdBREQgYWNjdW11bGF0ZWRfY2xpY2sgOmluY3JlbWVudCcsXG4gICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiB7XG4gICAgICAgICc6aW5jcmVtZW50JzogMSxcbiAgICAgIH0sXG4gICAgICBSZXR1cm5WYWx1ZXM6ICdBTExfTkVXJyxcbiAgICB9KTtcblxuICAgIGNvbnN0IHVwZGF0ZVJlc3VsdCA9IGF3YWl0IGRvY0NsaWVudC5zZW5kKHVwZGF0ZUNvbW1hbmQpO1xuXG4gICAgcmV0dXJuIHtcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcbiAgICAgIGhlYWRlcnM6IHtcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcbiAgICAgIH0sXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XG4gICAgICAgIHN1Y2Nlc3M6IHRydWUsXG4gICAgICAgIGFjY3VtdWxhdGVkX2NsaWNrOiB1cGRhdGVSZXN1bHQuQXR0cmlidXRlcz8uYWNjdW11bGF0ZWRfY2xpY2ssXG4gICAgICB9KSxcbiAgICB9O1xuICB9IGNhdGNoIChlcnJvcikge1xuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGluY3JlbWVudGluZyBnYW1lIGNsaWNrOicsIGVycm9yKTtcbiAgICByZXR1cm4ge1xuICAgICAgc3RhdHVzQ29kZTogNTAwLFxuICAgICAgaGVhZGVyczoge1xuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxuICAgICAgfSxcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgbWVzc2FnZTogJ0ludGVybmFsIHNlcnZlciBlcnJvcicgfSksXG4gICAgfTtcbiAgfVxufTtcbiJdfQ==