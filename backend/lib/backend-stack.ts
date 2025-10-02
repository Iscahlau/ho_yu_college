import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';

export class BackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
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