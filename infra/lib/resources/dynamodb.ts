import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { buildNameAndId } from '../utils/naming';

export interface DynamoDBTablesProps {
  removalPolicy?: cdk.RemovalPolicy;
}

export interface DynamoDBTables {
  studentsTable: dynamodb.Table;
  teachersTable: dynamodb.Table;
  gamesTable: dynamodb.Table;
}

/**
 * Create DynamoDB tables for the application
 */
export function createDynamoDBTables(
  scope: Construct,
  props?: DynamoDBTablesProps
): DynamoDBTables {
  const removalPolicy = props?.removalPolicy ?? cdk.RemovalPolicy.DESTROY;

  // DynamoDB table for students
  const studentsTable = new dynamodb.Table(scope, buildNameAndId('StudentsTable'), {
    tableName: buildNameAndId('students'),
    partitionKey: { name: 'student_id', type: dynamodb.AttributeType.STRING },
    billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    removalPolicy,
  });

  // DynamoDB table for teachers
  const teachersTable = new dynamodb.Table(scope, buildNameAndId('TeachersTable'), {
    tableName: buildNameAndId('teachers'),
    partitionKey: { name: 'teacher_id', type: dynamodb.AttributeType.STRING },
    billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    removalPolicy,
  });

  // Insert sample teacher data using a custom resource
  const sampleTeacherData = {
    teacher_id: 'TCH001',
    name: 'ADMIN',
    password: 'admin',
    responsible_class: ['1A'],
    is_admin: true,
  };

  // Use AWS SDK via a custom resource to insert the item
  const awsSdk = require('aws-cdk-lib/custom-resources');
  new awsSdk.AwsCustomResource(scope, 'InsertSampleTeacher', {
    onCreate: {
      service: 'DynamoDB',
      action: 'putItem',
      parameters: {
        TableName: teachersTable.tableName,
        Item: {
          teacher_id: { S: sampleTeacherData.teacher_id },
          name: { S: sampleTeacherData.name },
          password: { S: sampleTeacherData.password },
          responsible_class: { SS: sampleTeacherData.responsible_class },
          is_admin: { BOOL: sampleTeacherData.is_admin },
        },
      },
      physicalResourceId: awsSdk.PhysicalResourceId.of('InsertSampleTeacher'),
    },
    policy: awsSdk.AwsCustomResourcePolicy.fromSdkCalls({ resources: [teachersTable.tableArn] }),
  });

  // DynamoDB table for games
  const gamesTable = new dynamodb.Table(scope, buildNameAndId('GamesTable'), {
    tableName: buildNameAndId('games'),
    partitionKey: { name: 'game_id', type: dynamodb.AttributeType.STRING },
    billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    removalPolicy,
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

  return {
    studentsTable,
    teachersTable,
    gamesTable,
  };
}
