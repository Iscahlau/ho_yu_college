"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackendStack = void 0;
const cdk = require("aws-cdk-lib");
const dynamodb = require("aws-cdk-lib/aws-dynamodb");
const s3 = require("aws-cdk-lib/aws-s3");
const apigateway = require("aws-cdk-lib/aws-apigateway");
const lambda = require("aws-cdk-lib/aws-lambda");
class BackendStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // S3 bucket for frontend static hosting
        const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
            bucketName: `ho-yu-college-frontend-${this.account}`,
            websiteIndexDocument: 'index.html',
            websiteErrorDocument: 'index.html',
            publicReadAccess: true,
            blockPublicAccess: new s3.BlockPublicAccess({
                blockPublicAcls: false,
                blockPublicPolicy: false,
                ignorePublicAcls: false,
                restrictPublicBuckets: false,
            }),
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            autoDeleteObjects: true,
        });
        // DynamoDB table for students
        const studentsTable = new dynamodb.Table(this, 'StudentsTable', {
            tableName: 'ho-yu-students',
            partitionKey: { name: 'student_id', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        // Add GSI for teacher_id queries
        studentsTable.addGlobalSecondaryIndex({
            indexName: 'teacher-index',
            partitionKey: { name: 'teacher_id', type: dynamodb.AttributeType.STRING },
        });
        // DynamoDB table for teachers
        const teachersTable = new dynamodb.Table(this, 'TeachersTable', {
            tableName: 'ho-yu-teachers',
            partitionKey: { name: 'teacher_id', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        // DynamoDB table for games
        const gamesTable = new dynamodb.Table(this, 'GamesTable', {
            tableName: 'ho-yu-games',
            partitionKey: { name: 'game_id', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
        });
        // Add GSI for teacher_id and student_id queries
        gamesTable.addGlobalSecondaryIndex({
            indexName: 'teacher-index',
            partitionKey: { name: 'teacher_id', type: dynamodb.AttributeType.STRING },
        });
        gamesTable.addGlobalSecondaryIndex({
            indexName: 'student-index',
            partitionKey: { name: 'student_id', type: dynamodb.AttributeType.STRING },
        });
        // API Gateway REST API
        const api = new apigateway.RestApi(this, 'HoYuApi', {
            restApiName: 'Ho Yu College API',
            description: 'API for Ho Yu College Scratch Game Platform',
            deployOptions: {
                stageName: 'prod',
            },
            defaultCorsPreflightOptions: {
                allowOrigins: apigateway.Cors.ALL_ORIGINS,
                allowMethods: apigateway.Cors.ALL_METHODS,
                allowHeaders: ['Content-Type', 'Authorization'],
            },
        });
        // Lambda function for game click tracking
        const gameClickLambda = new lambda.Function(this, 'GameClickFunction', {
            functionName: 'ho-yu-game-click',
            runtime: lambda.Runtime.NODEJS_20_X,
            handler: 'click.handler',
            code: lambda.Code.fromAsset('lambda/games'),
            environment: {
                GAMES_TABLE_NAME: gamesTable.tableName,
            },
            timeout: cdk.Duration.seconds(10),
        });
        // Grant Lambda permissions to read and update games table
        gamesTable.grantReadWriteData(gameClickLambda);
        // API Gateway resources and methods
        const gamesResource = api.root.addResource('games');
        const gameResource = gamesResource.addResource('{gameId}');
        const clickResource = gameResource.addResource('click');
        // POST /games/{gameId}/click - Increment click count
        clickResource.addMethod('POST', new apigateway.LambdaIntegration(gameClickLambda));
        // Output the API URL
        new cdk.CfnOutput(this, 'ApiUrl', {
            value: api.url,
            description: 'API Gateway URL',
        });
        // Output the S3 bucket website URL
        new cdk.CfnOutput(this, 'FrontendUrl', {
            value: frontendBucket.bucketWebsiteUrl,
            description: 'Frontend S3 Website URL',
        });
        // Export table names for Lambda functions
        new cdk.CfnOutput(this, 'StudentsTableName', {
            value: studentsTable.tableName,
            exportName: 'StudentsTableName',
        });
        new cdk.CfnOutput(this, 'TeachersTableName', {
            value: teachersTable.tableName,
            exportName: 'TeachersTableName',
        });
        new cdk.CfnOutput(this, 'GamesTableName', {
            value: gamesTable.tableName,
            exportName: 'GamesTableName',
        });
    }
}
exports.BackendStack = BackendStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2VuZC1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImJhY2tlbmQtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBQ25DLHFEQUFxRDtBQUNyRCx5Q0FBeUM7QUFDekMseURBQXlEO0FBQ3pELGlEQUFpRDtBQUdqRCxNQUFhLFlBQWEsU0FBUSxHQUFHLENBQUMsS0FBSztJQUN6QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXNCO1FBQzlELEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBRXhCLHdDQUF3QztRQUN4QyxNQUFNLGNBQWMsR0FBRyxJQUFJLEVBQUUsQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLGdCQUFnQixFQUFFO1lBQzNELFVBQVUsRUFBRSwwQkFBMEIsSUFBSSxDQUFDLE9BQU8sRUFBRTtZQUNwRCxvQkFBb0IsRUFBRSxZQUFZO1lBQ2xDLG9CQUFvQixFQUFFLFlBQVk7WUFDbEMsZ0JBQWdCLEVBQUUsSUFBSTtZQUN0QixpQkFBaUIsRUFBRSxJQUFJLEVBQUUsQ0FBQyxpQkFBaUIsQ0FBQztnQkFDMUMsZUFBZSxFQUFFLEtBQUs7Z0JBQ3RCLGlCQUFpQixFQUFFLEtBQUs7Z0JBQ3hCLGdCQUFnQixFQUFFLEtBQUs7Z0JBQ3ZCLHFCQUFxQixFQUFFLEtBQUs7YUFDN0IsQ0FBQztZQUNGLGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU87WUFDeEMsaUJBQWlCLEVBQUUsSUFBSTtTQUN4QixDQUFDLENBQUM7UUFFSCw4QkFBOEI7UUFDOUIsTUFBTSxhQUFhLEdBQUcsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxlQUFlLEVBQUU7WUFDOUQsU0FBUyxFQUFFLGdCQUFnQjtZQUMzQixZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0s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QUksRUFBRSxnQkFBZ0IsRUFBRTtZQUN4QyxLQUFLLEVBQUUsVUFBVSxDQUFDLFNBQVM7WUFDM0IsVUFBVSxFQUFFLGdCQUFnQjtTQUM3QixDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUFqSUQsb0NBaUlDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYic7XG5pbXBvcnQgKiBhcyBzMyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xuaW1wb3J0ICogYXMgYXBpZ2F0ZXdheSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtYXBpZ2F0ZXdheSc7XG5pbXBvcnQgKiBhcyBsYW1iZGEgZnJvbSAnYXdzLWNkay1saWIvYXdzLWxhbWJkYSc7XG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcblxuZXhwb3J0IGNsYXNzIEJhY2tlbmRTdGFjayBleHRlbmRzIGNkay5TdGFjayB7XG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogY2RrLlN0YWNrUHJvcHMpIHtcbiAgICBzdXBlcihzY29wZSwgaWQsIHByb3BzKTtcblxuICAgIC8vIFMzIGJ1Y2tldCBmb3IgZnJvbnRlbmQgc3RhdGljIGhvc3RpbmdcbiAgICBjb25zdCBmcm9udGVuZEJ1Y2tldCA9IG5ldyBzMy5CdWNrZXQodGhpcywgJ0Zyb250ZW5kQnVja2V0Jywge1xuICAgICAgYnVja2V0TmFtZTogYGhvLXl1LWNvbGxlZ2UtZnJvbnRlbmQtJHt0aGlzLmFjY291bnR9YCxcbiAgICAgIHdlYnNpdGVJbmRleERvY3VtZW50OiAnaW5kZXguaHRtbCcsXG4gICAgICB3ZWJzaXRlRXJyb3JEb2N1bWVudDogJ2luZGV4Lmh0bWwnLFxuICAgICAgcHVibGljUmVhZEFjY2VzczogdHJ1ZSxcbiAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBuZXcgczMuQmxvY2tQdWJsaWNBY2Nlc3Moe1xuICAgICAgICBibG9ja1B1YmxpY0FjbHM6IGZhbHNlLFxuICAgICAgICBibG9ja1B1YmxpY1BvbGljeTogZmFsc2UsXG4gICAgICAgIGlnbm9yZVB1YmxpY0FjbHM6IGZhbHNlLFxuICAgICAgICByZXN0cmljdFB1YmxpY0J1Y2tldHM6IGZhbHNlLFxuICAgICAgfSksXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgICAgYXV0b0RlbGV0ZU9iamVjdHM6IHRydWUsXG4gICAgfSk7XG5cbiAgICAvLyBEeW5hbW9EQiB0YWJsZSBmb3Igc3R1ZGVudHNcbiAgICBjb25zdCBzdHVkZW50c1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdTdHVkZW50c1RhYmxlJywge1xuICAgICAgdGFibGVOYW1lOiAnaG8teXUtc3R1ZGVudHMnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdzdHVkZW50X2lkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgLy8gQWRkIEdTSSBmb3IgdGVhY2hlcl9pZCBxdWVyaWVzXG4gICAgc3R1ZGVudHNUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICBpbmRleE5hbWU6ICd0ZWFjaGVyLWluZGV4JyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAndGVhY2hlcl9pZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgfSk7XG5cbiAgICAvLyBEeW5hbW9EQiB0YWJsZSBmb3IgdGVhY2hlcnNcbiAgICBjb25zdCB0ZWFjaGVyc1RhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdUZWFjaGVyc1RhYmxlJywge1xuICAgICAgdGFibGVOYW1lOiAnaG8teXUtdGVhY2hlcnMnLFxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICd0ZWFjaGVyX2lkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXG4gICAgICByZW1vdmFsUG9saWN5OiBjZGsuUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxuICAgIH0pO1xuXG4gICAgLy8gRHluYW1vREIgdGFibGUgZm9yIGdhbWVzXG4gICAgY29uc3QgZ2FtZXNUYWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnR2FtZXNUYWJsZScsIHtcbiAgICAgIHRhYmxlTmFtZTogJ2hvLXl1LWdhbWVzJyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnZ2FtZV9pZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICB9KTtcblxuICAgIC8vIEFkZCBHU0kgZm9yIHRlYWNoZXJfaWQgYW5kIHN0dWRlbnRfaWQgcXVlcmllc1xuICAgIGdhbWVzVGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xuICAgICAgaW5kZXhOYW1lOiAndGVhY2hlci1pbmRleCcsXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3RlYWNoZXJfaWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgIH0pO1xuXG4gICAgZ2FtZXNUYWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XG4gICAgICBpbmRleE5hbWU6ICdzdHVkZW50LWluZGV4JyxcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnc3R1ZGVudF9pZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXG4gICAgfSk7XG5cbiAgICAvLyBBUEkgR2F0ZXdheSBSRVNUIEFQSVxuICAgIGNvbnN0IGFwaSA9IG5ldyBhcGlnYXRld2F5LlJlc3RBcGkodGhpcywgJ0hvWXVBcGknLCB7XG4gICAgICByZXN0QXBpTmFtZTogJ0hvIFl1IENvbGxlZ2UgQVBJJyxcbiAgICAgIGRlc2NyaXB0aW9uOiAnQVBJIGZvciBIbyBZdSBDb2xsZWdlIFNjcmF0Y2ggR2FtZSBQbGF0Zm9ybScsXG4gICAgICBkZXBsb3lPcHRpb25zOiB7XG4gICAgICAgIHN0YWdlTmFtZTogJ3Byb2QnLFxuICAgICAgfSxcbiAgICAgIGRlZmF1bHRDb3JzUHJlZmxpZ2h0T3B0aW9uczoge1xuICAgICAgICBhbGxvd09yaWdpbnM6IGFwaWdhdGV3YXkuQ29ycy5BTExfT1JJR0lOUyxcbiAgICAgICAgYWxsb3dNZXRob2RzOiBhcGlnYXRld2F5LkNvcnMuQUxMX01FVEhPRFMsXG4gICAgICAgIGFsbG93SGVhZGVyczogWydDb250ZW50LVR5cGUnLCAnQXV0aG9yaXphdGlvbiddLFxuICAgICAgfSxcbiAgICB9KTtcblxuICAgIC8vIExhbWJkYSBmdW5jdGlvbiBmb3IgZ2FtZSBjbGljayB0cmFja2luZ1xuICAgIGNvbnN0IGdhbWVDbGlja0xhbWJkYSA9IG5ldyBsYW1iZGEuRnVuY3Rpb24odGhpcywgJ0dhbWVDbGlja0Z1bmN0aW9uJywge1xuICAgICAgZnVuY3Rpb25OYW1lOiAnaG8teXUtZ2FtZS1jbGljaycsXG4gICAgICBydW50aW1lOiBsYW1iZGEuUnVudGltZS5OT0RFSlNfMjBfWCxcbiAgICAgIGhhbmRsZXI6ICdjbGljay5oYW5kbGVyJyxcbiAgICAgIGNvZGU6IGxhbWJkYS5Db2RlLmZyb21Bc3NldCgnbGFtYmRhL2dhbWVzJyksXG4gICAgICBlbnZpcm9ubWVudDoge1xuICAgICAgICBHQU1FU19UQUJMRV9OQU1FOiBnYW1lc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgIH0sXG4gICAgICB0aW1lb3V0OiBjZGsuRHVyYXRpb24uc2Vjb25kcygxMCksXG4gICAgfSk7XG5cbiAgICAvLyBHcmFudCBMYW1iZGEgcGVybWlzc2lvbnMgdG8gcmVhZCBhbmQgdXBkYXRlIGdhbWVzIHRhYmxlXG4gICAgZ2FtZXNUYWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZ2FtZUNsaWNrTGFtYmRhKTtcblxuICAgIC8vIEFQSSBHYXRld2F5IHJlc291cmNlcyBhbmQgbWV0aG9kc1xuICAgIGNvbnN0IGdhbWVzUmVzb3VyY2UgPSBhcGkucm9vdC5hZGRSZXNvdXJjZSgnZ2FtZXMnKTtcbiAgICBjb25zdCBnYW1lUmVzb3VyY2UgPSBnYW1lc1Jlc291cmNlLmFkZFJlc291cmNlKCd7Z2FtZUlkfScpO1xuICAgIGNvbnN0IGNsaWNrUmVzb3VyY2UgPSBnYW1lUmVzb3VyY2UuYWRkUmVzb3VyY2UoJ2NsaWNrJyk7XG5cbiAgICAvLyBQT1NUIC9nYW1lcy97Z2FtZUlkfS9jbGljayAtIEluY3JlbWVudCBjbGljayBjb3VudFxuICAgIGNsaWNrUmVzb3VyY2UuYWRkTWV0aG9kKFxuICAgICAgJ1BPU1QnLFxuICAgICAgbmV3IGFwaWdhdGV3YXkuTGFtYmRhSW50ZWdyYXRpb24oZ2FtZUNsaWNrTGFtYmRhKVxuICAgICk7XG5cbiAgICAvLyBPdXRwdXQgdGhlIEFQSSBVUkxcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnQXBpVXJsJywge1xuICAgICAgdmFsdWU6IGFwaS51cmwsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FQSSBHYXRld2F5IFVSTCcsXG4gICAgfSk7XG5cbiAgICAvLyBPdXRwdXQgdGhlIFMzIGJ1Y2tldCB3ZWJzaXRlIFVSTFxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdGcm9udGVuZFVybCcsIHtcbiAgICAgIHZhbHVlOiBmcm9udGVuZEJ1Y2tldC5idWNrZXRXZWJzaXRlVXJsLFxuICAgICAgZGVzY3JpcHRpb246ICdGcm9udGVuZCBTMyBXZWJzaXRlIFVSTCcsXG4gICAgfSk7XG5cbiAgICAvLyBFeHBvcnQgdGFibGUgbmFtZXMgZm9yIExhbWJkYSBmdW5jdGlvbnNcbiAgICBuZXcgY2RrLkNmbk91dHB1dCh0aGlzLCAnU3R1ZGVudHNUYWJsZU5hbWUnLCB7XG4gICAgICB2YWx1ZTogc3R1ZGVudHNUYWJsZS50YWJsZU5hbWUsXG4gICAgICBleHBvcnROYW1lOiAnU3R1ZGVudHNUYWJsZU5hbWUnLFxuICAgIH0pO1xuXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1RlYWNoZXJzVGFibGVOYW1lJywge1xuICAgICAgdmFsdWU6IHRlYWNoZXJzVGFibGUudGFibGVOYW1lLFxuICAgICAgZXhwb3J0TmFtZTogJ1RlYWNoZXJzVGFibGVOYW1lJyxcbiAgICB9KTtcblxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdHYW1lc1RhYmxlTmFtZScsIHtcbiAgICAgIHZhbHVlOiBnYW1lc1RhYmxlLnRhYmxlTmFtZSxcbiAgICAgIGV4cG9ydE5hbWU6ICdHYW1lc1RhYmxlTmFtZScsXG4gICAgfSk7XG4gIH1cbn0iXX0=