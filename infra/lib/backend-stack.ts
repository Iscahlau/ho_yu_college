import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as budgets from 'aws-cdk-lib/aws-budgets';
import { Construct } from 'constructs';

export class BackendStack extends cdk.Stack {
  public readonly apiUrl: string;
  public readonly frontendBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 bucket for frontend static hosting
    const frontendBucket = new s3.Bucket(this, 'FrontendBucket', {
      bucketName: `ho-yu-college-frontend-${this.account}`,
      publicReadAccess: false, // CloudFront will access via OAC
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
    });

    this.frontendBucket = frontendBucket;

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

    // Lambda function for authentication/login
    const loginLambda = new lambda.Function(this, 'LoginFunction', {
      functionName: 'ho-yu-login',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'auth/login.handler',
      code: lambda.Code.fromAsset('../backend/build/lambda'),
      environment: {
        STUDENTS_TABLE_NAME: studentsTable.tableName,
        TEACHERS_TABLE_NAME: teachersTable.tableName,
      },
      timeout: cdk.Duration.seconds(10),
    });

    // Grant login Lambda permissions to read students and teachers tables
    studentsTable.grantReadData(loginLambda);
    teachersTable.grantReadData(loginLambda);

    // Lambda function for listing games
    const listGamesLambda = new lambda.Function(this, 'ListGamesFunction', {
      functionName: 'ho-yu-list-games',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'games/list.handler',
      code: lambda.Code.fromAsset('../backend/build/lambda'),
      environment: {
        GAMES_TABLE_NAME: gamesTable.tableName,
      },
      timeout: cdk.Duration.seconds(10),
    });

    // Grant list games Lambda permission to read games table
    gamesTable.grantReadData(listGamesLambda);

    // Lambda function for game click tracking
    const gameClickLambda = new lambda.Function(this, 'GameClickFunction', {
      functionName: 'ho-yu-game-click',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'games/click.handler',
      code: lambda.Code.fromAsset('../backend/build/lambda'),
      environment: {
        GAMES_TABLE_NAME: gamesTable.tableName,
        STUDENTS_TABLE_NAME: studentsTable.tableName,
      },
      timeout: cdk.Duration.seconds(10),
    });

    // Grant Lambda permissions to read and update games and students tables
    gamesTable.grantReadWriteData(gameClickLambda);
    studentsTable.grantReadWriteData(gameClickLambda);

    // Lambda function for downloading students
    const downloadStudentsLambda = new lambda.Function(this, 'DownloadStudentsFunction', {
      functionName: 'ho-yu-download-students',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'download/students.handler',
      code: lambda.Code.fromAsset('../backend/build/lambda'),
      environment: {
        STUDENTS_TABLE_NAME: studentsTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Grant download students Lambda permission to read students table
    studentsTable.grantReadData(downloadStudentsLambda);

    // Lambda function for downloading teachers
    const downloadTeachersLambda = new lambda.Function(this, 'DownloadTeachersFunction', {
      functionName: 'ho-yu-download-teachers',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'download/teachers.handler',
      code: lambda.Code.fromAsset('../backend/build/lambda'),
      environment: {
        TEACHERS_TABLE_NAME: teachersTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Grant download teachers Lambda permission to read teachers table
    teachersTable.grantReadData(downloadTeachersLambda);

    // Lambda function for downloading games
    const downloadGamesLambda = new lambda.Function(this, 'DownloadGamesFunction', {
      functionName: 'ho-yu-download-games',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'download/games.handler',
      code: lambda.Code.fromAsset('../backend/build/lambda'),
      environment: {
        GAMES_TABLE_NAME: gamesTable.tableName,
      },
      timeout: cdk.Duration.seconds(30),
    });

    // Grant download games Lambda permission to read games table
    gamesTable.grantReadData(downloadGamesLambda);

    // Lambda function for uploading students
    const uploadStudentsLambda = new lambda.Function(this, 'UploadStudentsFunction', {
      functionName: 'ho-yu-upload-students',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'upload/students.handler',
      code: lambda.Code.fromAsset('../backend/build/lambda'),
      environment: {
        STUDENTS_TABLE_NAME: studentsTable.tableName,
        TEACHERS_TABLE_NAME: teachersTable.tableName,
      },
      timeout: cdk.Duration.minutes(5),
    });

    // Grant upload students Lambda permissions to read/write students and teachers tables
    studentsTable.grantReadWriteData(uploadStudentsLambda);
    teachersTable.grantReadData(uploadStudentsLambda);

    // Lambda function for uploading teachers
    const uploadTeachersLambda = new lambda.Function(this, 'UploadTeachersFunction', {
      functionName: 'ho-yu-upload-teachers',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'upload/teachers.handler',
      code: lambda.Code.fromAsset('../backend/build/lambda'),
      environment: {
        TEACHERS_TABLE_NAME: teachersTable.tableName,
      },
      timeout: cdk.Duration.minutes(5),
    });

    // Grant upload teachers Lambda permission to read/write teachers table
    teachersTable.grantReadWriteData(uploadTeachersLambda);

    // Lambda function for uploading games
    const uploadGamesLambda = new lambda.Function(this, 'UploadGamesFunction', {
      functionName: 'ho-yu-upload-games',
      runtime: lambda.Runtime.NODEJS_20_X,
      handler: 'upload/games.handler',
      code: lambda.Code.fromAsset('../backend/build/lambda'),
      environment: {
        GAMES_TABLE_NAME: gamesTable.tableName,
        STUDENTS_TABLE_NAME: studentsTable.tableName,
        TEACHERS_TABLE_NAME: teachersTable.tableName,
      },
      timeout: cdk.Duration.minutes(5),
    });

    // Grant upload games Lambda permissions to read/write games table and read students/teachers tables
    gamesTable.grantReadWriteData(uploadGamesLambda);
    studentsTable.grantReadData(uploadGamesLambda);
    teachersTable.grantReadData(uploadGamesLambda);

    // API Gateway resources and methods

    // Auth resource
    const authResource = api.root.addResource('auth');
    
    // POST /auth/login - User authentication
    authResource.addResource('login').addMethod(
      'POST',
      new apigateway.LambdaIntegration(loginLambda)
    );

    // Games resource
    const gamesResource = api.root.addResource('games');
    
    // GET /games - List all games
    gamesResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(listGamesLambda)
    );

    // Games download resource
    const gamesDownloadResource = gamesResource.addResource('download');
    
    // GET /games/download - Download games as Excel
    gamesDownloadResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(downloadGamesLambda)
    );

    // Game click tracking
    const gameResource = gamesResource.addResource('{gameId}');
    const clickResource = gameResource.addResource('click');

    // POST /games/{gameId}/click - Increment click count
    clickResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(gameClickLambda)
    );

    // Students resource
    const studentsResource = api.root.addResource('students');
    
    // Students download resource
    const studentsDownloadResource = studentsResource.addResource('download');
    
    // GET /students/download - Download students as Excel
    studentsDownloadResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(downloadStudentsLambda)
    );

    // Teachers resource
    const teachersResource = api.root.addResource('teachers');
    
    // Teachers download resource
    const teachersDownloadResource = teachersResource.addResource('download');
    
    // GET /teachers/download - Download teachers as Excel
    teachersDownloadResource.addMethod(
      'GET',
      new apigateway.LambdaIntegration(downloadTeachersLambda)
    );

    // Upload resource
    const uploadResource = api.root.addResource('upload');

    // Upload students
    const uploadStudentsResource = uploadResource.addResource('students');
    
    // POST /upload/students - Upload students Excel file
    uploadStudentsResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(uploadStudentsLambda)
    );

    // Upload teachers
    const uploadTeachersResource = uploadResource.addResource('teachers');
    
    // POST /upload/teachers - Upload teachers Excel file
    uploadTeachersResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(uploadTeachersLambda)
    );

    // Upload games
    const uploadGamesResource = uploadResource.addResource('games');
    
    // POST /upload/games - Upload games Excel file
    uploadGamesResource.addMethod(
      'POST',
      new apigateway.LambdaIntegration(uploadGamesLambda)
    );

    // Store API URL for later use
    this.apiUrl = api.url;

    // CloudFront Origin Access Control for S3
    const oac = new cloudfront.CfnOriginAccessControl(this, 'OAC', {
      originAccessControlConfig: {
        name: 'ho-yu-frontend-oac',
        originAccessControlOriginType: 's3',
        signingBehavior: 'always',
        signingProtocol: 'sigv4',
      },
    });

    // CloudFront distribution
    const distribution = new cloudfront.Distribution(this, 'FrontendDistribution', {
      defaultBehavior: {
        origin: new origins.S3Origin(frontendBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
        cachedMethods: cloudfront.CachedMethods.CACHE_GET_HEAD_OPTIONS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      },
      defaultRootObject: 'index.html',
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
        {
          httpStatus: 403,
          responseHttpStatus: 200,
          responsePagePath: '/index.html',
          ttl: cdk.Duration.minutes(5),
        },
      ],
    });

    this.distribution = distribution;

    // Update bucket policy to allow CloudFront OAC access
    frontendBucket.addToResourcePolicy(
      new cdk.aws_iam.PolicyStatement({
        actions: ['s3:GetObject'],
        resources: [frontendBucket.arnForObjects('*')],
        principals: [new cdk.aws_iam.ServicePrincipal('cloudfront.amazonaws.com')],
        conditions: {
          StringEquals: {
            'AWS:SourceArn': `arn:aws:cloudfront::${this.account}:distribution/${distribution.distributionId}`,
          },
        },
      })
    );

    // Output the API URL
    new cdk.CfnOutput(this, 'ApiUrl', {
      value: api.url,
      description: 'API Gateway URL',
      exportName: 'HoYuApiUrl',
    });

    // Output the CloudFront URL
    new cdk.CfnOutput(this, 'FrontendUrl', {
      value: `https://${distribution.distributionDomainName}`,
      description: 'CloudFront Distribution URL',
      exportName: 'HoYuFrontendUrl',
    });

    // Output CloudFront Distribution ID
    new cdk.CfnOutput(this, 'DistributionId', {
      value: distribution.distributionId,
      description: 'CloudFront Distribution ID',
      exportName: 'HoYuDistributionId',
    });

    // Output Frontend Bucket Name
    new cdk.CfnOutput(this, 'FrontendBucketName', {
      value: frontendBucket.bucketName,
      description: 'Frontend S3 Bucket Name',
      exportName: 'HoYuFrontendBucket',
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

    // Budget Alert - Monthly Cost Monitoring
    // Get email from context or environment variable
    const budgetEmailParam = new cdk.CfnParameter(this, 'BudgetAlertEmail', {
      type: 'String',
      description: 'Email address to receive budget alerts',
      default: 'your-email@example.com',
      constraintDescription: 'Must be a valid email address',
    });

    const budgetEmail = budgetEmailParam.valueAsString;

    // Create budget with $10 USD threshold
    new budgets.CfnBudget(this, 'MonthlyBudget', {
      budget: {
        budgetName: 'HoYuCollege-MonthlyBudget',
        budgetType: 'COST',
        timeUnit: 'MONTHLY',
        budgetLimit: {
          amount: 10,
          unit: 'USD',
        },
        costFilters: {
          // Optional: Filter by tags if you want to track only this project
          // TagKeyValue: ['user:Project$HoYuCollege'],
        },
        costTypes: {
          includeCredit: false,
          includeDiscount: true,
          includeOtherSubscription: true,
          includeRecurring: true,
          includeRefund: false,
          includeSubscription: true,
          includeSupport: false,
          includeTax: false,
          includeUpfront: true,
          useBlended: false,
        },
      },
      notificationsWithSubscribers: [
        {
          notification: {
            notificationType: 'ACTUAL',
            comparisonOperator: 'GREATER_THAN',
            threshold: 80,
            thresholdType: 'PERCENTAGE',
          },
          subscribers: [
            {
              subscriptionType: 'EMAIL',
              address: budgetEmail,
            },
          ],
        },
        {
          notification: {
            notificationType: 'ACTUAL',
            comparisonOperator: 'GREATER_THAN',
            threshold: 100,
            thresholdType: 'PERCENTAGE',
          },
          subscribers: [
            {
              subscriptionType: 'EMAIL',
              address: budgetEmail,
            },
          ],
        },
        {
          notification: {
            notificationType: 'FORECASTED',
            comparisonOperator: 'GREATER_THAN',
            threshold: 100,
            thresholdType: 'PERCENTAGE',
          },
          subscribers: [
            {
              subscriptionType: 'EMAIL',
              address: budgetEmail,
            },
          ],
        },
      ],
    });

    // Output budget information
    new cdk.CfnOutput(this, 'BudgetAlert', {
      value: `Monthly budget set to $10 USD. Alerts will be sent to: ${budgetEmail}`,
      description: 'Budget Alert Configuration',
    });
  }
}