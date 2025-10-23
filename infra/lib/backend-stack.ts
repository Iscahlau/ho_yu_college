import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import { Construct } from 'constructs';

export class BackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
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
      code: lambda.Code.fromAsset('../backend/lambda/games'),
      environment: {
        GAMES_TABLE_NAME: gamesTable.tableName,
        STUDENTS_TABLE_NAME: studentsTable.tableName,
      },
      timeout: cdk.Duration.seconds(10),
    });

    // Grant Lambda permissions to read and update games and students tables
    gamesTable.grantReadWriteData(gameClickLambda);
    studentsTable.grantReadWriteData(gameClickLambda);

    // API Gateway resources and methods
    const gamesResource = api.root.addResource('games');
    const gameResource = gamesResource.addResource('{gameId}');
    const clickResource = gameResource.addResource('click');

    // POST /games/{gameId}/click - Increment click count
    clickResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(gameClickLambda)
    );

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