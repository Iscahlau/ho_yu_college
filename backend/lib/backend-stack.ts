import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deployment from 'aws-cdk-lib/aws-s3-deployment';
import * as iam from 'aws-cdk-lib/aws-iam';

export class BackendStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // DynamoDB Tables
    const studentsTable = new dynamodb.Table(this, 'StudentsTable', {
      tableName: 'ho-yu-students',
      partitionKey: { name: 'studentId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const gamesTable = new dynamodb.Table(this, 'GamesTable', {
      tableName: 'ho-yu-games',
      partitionKey: { name: 'gameId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    const gameRecordsTable = new dynamodb.Table(this, 'GameRecordsTable', {
      tableName: 'ho-yu-game-records',
      partitionKey: { name: 'studentId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // Add GSI for game records by gameId
    gameRecordsTable.addGlobalSecondaryIndex({
      indexName: 'GameIndex',
      partitionKey: { name: 'gameId', type: dynamodb.AttributeType.STRING },
      sortKey: { name: 'timestamp', type: dynamodb.AttributeType.NUMBER },
    });

    // S3 Bucket for static website hosting
    const websiteBucket = new s3.Bucket(this, 'WebsiteBucket', {
      bucketName: `ho-yu-college-website-${this.account}`,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'error.html',
      publicReadAccess: true,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ACLS,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      cors: [
        {
          allowedHeaders: ['*'],
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT],
          allowedOrigins: ['*'],
        },
      ],
    });

    // S3 Bucket for file uploads (Excel/CSV)
    const uploadsBucket = new s3.Bucket(this, 'UploadsBucket', {
      bucketName: `ho-yu-college-uploads-${this.account}`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      cors: [
        {
          allowedHeaders: ['*'],
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.POST, s3.HttpMethods.PUT],
          allowedOrigins: ['*'],
        },
      ],
    });

    // Lambda Functions
    const authFunction = new lambda.Function(this, 'AuthFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'auth.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('Auth request:', JSON.stringify(event, null, 2));
          
          const { studentId, password } = JSON.parse(event.body || '{}');
          
          // Mock authentication - replace with actual logic
          if (studentId === 'admin' && password === 'admin') {
            return {
              statusCode: 200,
              headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
              },
              body: JSON.stringify({
                success: true,
                user: { studentId, name: 'Administrator', isAdmin: true }
              }),
            };
          } else if (studentId && password) {
            return {
              statusCode: 200,
              headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
              },
              body: JSON.stringify({
                success: true,
                user: { studentId, name: 'John Doe', isAdmin: false, score: 85 }
              }),
            };
          }
          
          return {
            statusCode: 401,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'Content-Type',
              'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
            },
            body: JSON.stringify({ success: false, message: 'Invalid credentials' }),
          };
        };
      `),
      environment: {
        STUDENTS_TABLE: studentsTable.tableName,
      },
    });

    const gamesFunction = new lambda.Function(this, 'GamesFunction', {
      runtime: lambda.Runtime.NODEJS_18_X,
      handler: 'games.handler',
      code: lambda.Code.fromInline(`
        exports.handler = async (event) => {
          console.log('Games request:', JSON.stringify(event, null, 2));
          
          // Mock games data
          const games = [
            {
              id: '1',
              title: 'Math Adventure',
              description: 'Learn basic math through fun puzzles',
              scratchUrl: 'https://scratch.mit.edu/projects/123456/',
              tags: ['mathematics'],
              level: 'beginner',
            },
            {
              id: '2',
              title: 'English Word Quest',
              description: 'Improve vocabulary with this engaging game',
              scratchUrl: 'https://scratch.mit.edu/projects/234567/',
              tags: ['english'],
              level: 'intermediate',
            },
            {
              id: '3',
              title: 'Chinese Character Challenge',
              description: 'Practice Chinese characters in a fun way',
              scratchUrl: 'https://scratch.mit.edu/projects/345678/',
              tags: ['chinese'],
              level: 'beginner',
            },
          ];
          
          return {
            statusCode: 200,
            headers: {
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Headers': 'Content-Type',
              'Access-Control-Allow-Methods': 'OPTIONS,POST,GET'
            },
            body: JSON.stringify({ games }),
          };
        };
      `),
      environment: {
        GAMES_TABLE: gamesTable.tableName,
      },
    });

    // Grant permissions to Lambda functions
    studentsTable.grantReadWriteData(authFunction);
    gamesTable.grantReadWriteData(gamesFunction);
    gameRecordsTable.grantReadWriteData(authFunction);
    gameRecordsTable.grantReadWriteData(gamesFunction);

    // API Gateway
    const api = new apigateway.RestApi(this, 'HoYuApi', {
      restApiName: 'Ho Yu College API',
      description: 'API for Ho Yu College Scratch Game Platform',
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: apigateway.Cors.ALL_METHODS,
        allowHeaders: ['Content-Type', 'X-Amz-Date', 'Authorization', 'X-Api-Key'],
      },
    });

    // API Routes
    const authResource = api.root.addResource('auth');
    authResource.addMethod('POST', new apigateway.LambdaIntegration(authFunction));

    const gamesResource = api.root.addResource('games');
    gamesResource.addMethod('GET', new apigateway.LambdaIntegration(gamesFunction));

    // Outputs
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
    });

    new cdk.CfnOutput(this, 'WebsiteBucketName', {
      value: websiteBucket.bucketName,
      description: 'Website S3 bucket name',
    });

    new cdk.CfnOutput(this, 'WebsiteUrl', {
      value: websiteBucket.bucketWebsiteUrl,
      description: 'Website URL',
    });

    new cdk.CfnOutput(this, 'UploadsBucketName', {
      value: uploadsBucket.bucketName,
      description: 'Uploads S3 bucket name',
    });
  }
}
