"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackendStack = void 0;
const cdk = require("aws-cdk-lib");
class BackendStack extends cdk.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        // Example: Add an S3 bucket for the frontend static hosting
        // const bucket = new cdk.aws_s3.Bucket(this, 'FrontendBucket', {
        //   websiteIndexDocument: 'index.html',
        //   websiteErrorDocument: 'error.html',
        //   publicReadAccess: true,
        //   removalPolicy: cdk.RemovalPolicy.DESTROY,
        // });
        // Example: Add DynamoDB table for game data
        // const gameTable = new cdk.aws_dynamodb.Table(this, 'GameTable', {
        //   tableName: 'ho-yu-games',
        //   partitionKey: { name: 'gameId', type: cdk.aws_dynamodb.AttributeType.STRING },
        //   removalPolicy: cdk.RemovalPolicy.DESTROY,
        // });
    }
}
exports.BackendStack = BackendStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFja2VuZC1zdGFjay5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImJhY2tlbmQtc3RhY2sudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsbUNBQW1DO0FBR25DLE1BQWEsWUFBYSxTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQ3pDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBc0I7UUFDOUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsNERBQTREO1FBQzVELGlFQUFpRTtRQUNqRSx3Q0FBd0M7UUFDeEMsd0NBQXdDO1FBQ3hDLDRCQUE0QjtRQUM1Qiw4Q0FBOEM7UUFDOUMsTUFBTTtRQUVOLDRDQUE0QztRQUM1QyxvRUFBb0U7UUFDcEUsOEJBQThCO1FBQzlCLG1GQUFtRjtRQUNuRiw4Q0FBOEM7UUFDOUMsTUFBTTtJQUNSLENBQUM7Q0FDRjtBQW5CRCxvQ0FtQkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XG5cbmV4cG9ydCBjbGFzcyBCYWNrZW5kU3RhY2sgZXh0ZW5kcyBjZGsuU3RhY2sge1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IGNkay5TdGFja1Byb3BzKSB7XG4gICAgc3VwZXIoc2NvcGUsIGlkLCBwcm9wcyk7XG5cbiAgICAvLyBFeGFtcGxlOiBBZGQgYW4gUzMgYnVja2V0IGZvciB0aGUgZnJvbnRlbmQgc3RhdGljIGhvc3RpbmdcbiAgICAvLyBjb25zdCBidWNrZXQgPSBuZXcgY2RrLmF3c19zMy5CdWNrZXQodGhpcywgJ0Zyb250ZW5kQnVja2V0Jywge1xuICAgIC8vICAgd2Vic2l0ZUluZGV4RG9jdW1lbnQ6ICdpbmRleC5odG1sJyxcbiAgICAvLyAgIHdlYnNpdGVFcnJvckRvY3VtZW50OiAnZXJyb3IuaHRtbCcsXG4gICAgLy8gICBwdWJsaWNSZWFkQWNjZXNzOiB0cnVlLFxuICAgIC8vICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAvLyB9KTtcblxuICAgIC8vIEV4YW1wbGU6IEFkZCBEeW5hbW9EQiB0YWJsZSBmb3IgZ2FtZSBkYXRhXG4gICAgLy8gY29uc3QgZ2FtZVRhYmxlID0gbmV3IGNkay5hd3NfZHluYW1vZGIuVGFibGUodGhpcywgJ0dhbWVUYWJsZScsIHtcbiAgICAvLyAgIHRhYmxlTmFtZTogJ2hvLXl1LWdhbWVzJyxcbiAgICAvLyAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnZ2FtZUlkJywgdHlwZTogY2RrLmF3c19keW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxuICAgIC8vICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSxcbiAgICAvLyB9KTtcbiAgfVxufSJdfQ==