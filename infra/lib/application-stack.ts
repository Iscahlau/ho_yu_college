import * as cdk from 'aws-cdk-lib';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as budgets from 'aws-cdk-lib/aws-budgets';
import { Construct } from 'constructs';
import { buildNameAndId, getStackName } from './utils/naming';
import { createDynamoDBTables } from './resources/dynamodb';
import { createLambdaFunctions } from './resources/lambda';
import { createS3Resources } from './resources/s3';
import { createApiGateway } from './resources/apigateway';

export class ApplicationStack extends cdk.Stack {
  public readonly apiUrl: string;
  public readonly frontendBucket: s3.Bucket;
  public readonly distribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create DynamoDB tables
    const { studentsTable, teachersTable, gamesTable } = createDynamoDBTables(this, {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Create Lambda functions
    const lambdaFunctions = createLambdaFunctions(this, {
      studentsTable,
      teachersTable,
      gamesTable,
    });

    // Create S3 bucket and CloudFront distribution
    const { frontendBucket, distribution } = createS3Resources(this, {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    this.frontendBucket = frontendBucket;
    this.distribution = distribution;

    // Create API Gateway and configure endpoints
    const { api } = createApiGateway(this, lambdaFunctions);

    // Store API URL for later use
    this.apiUrl = api.url;

    // Output the API URL
    new cdk.CfnOutput(this, buildNameAndId('ApiUrl'), {
      value: api.url,
      description: 'API Gateway URL',
      exportName: buildNameAndId('ApiUrl'),
    });

    // Output the CloudFront URL
    new cdk.CfnOutput(this, buildNameAndId('FrontendUrl'), {
      value: `https://${distribution.distributionDomainName}`,
      description: 'CloudFront Distribution URL',
      exportName: buildNameAndId('FrontendUrl'),
    });

    // Output CloudFront Distribution ID
    new cdk.CfnOutput(this, buildNameAndId('DistributionId'), {
      value: distribution.distributionId,
      description: 'CloudFront Distribution ID',
      exportName: buildNameAndId('DistributionId'),
    });

    // Output Frontend Bucket Name
    new cdk.CfnOutput(this, buildNameAndId('FrontendBucketName'), {
      value: frontendBucket.bucketName,
      description: 'Frontend S3 Bucket Name',
      exportName: buildNameAndId('FrontendBucket'),
    });

    // Export table names for Lambda functions
    new cdk.CfnOutput(this, buildNameAndId('StudentsTableName'), {
      value: studentsTable.tableName,
      exportName: buildNameAndId('StudentsTableName'),
    });

    new cdk.CfnOutput(this, buildNameAndId('TeachersTableName'), {
      value: teachersTable.tableName,
      exportName: buildNameAndId('TeachersTableName'),
    });

    new cdk.CfnOutput(this, buildNameAndId('GamesTableName'), {
      value: gamesTable.tableName,
      exportName: buildNameAndId('GamesTableName'),
    });

    // Budget Alert - Monthly Cost Monitoring
    // Get email from context or environment variable
    const budgetEmailParam = new cdk.CfnParameter(this, buildNameAndId('BudgetAlertEmail'), {
      type: 'String',
      description: 'Email address to receive budget alerts',
      default: 'your-email@example.com',
      constraintDescription: 'Must be a valid email address',
    });

    const budgetEmail = budgetEmailParam.valueAsString;

    // Create budget with $10 USD threshold
    new budgets.CfnBudget(this, buildNameAndId('MonthlyBudget'), {
      budget: {
        budgetName: buildNameAndId('MonthlyBudget'),
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
    new cdk.CfnOutput(this, buildNameAndId('BudgetAlert'), {
      value: `Monthly budget set to $10 USD. Alerts will be sent to: ${budgetEmail}`,
      description: 'Budget Alert Configuration',
    });
  }
}