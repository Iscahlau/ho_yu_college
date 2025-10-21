/**
 * Test DynamoDB Local Connection and Operations
 * Verifies that local DynamoDB is working properly with basic CRUD operations
 */

import * as dotenv from 'dotenv';
dotenv.config();

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';

// Configuration for local DynamoDB
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8002',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'local',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'local',
  },
});

const docClient = DynamoDBDocumentClient.from(client);
const STUDENTS_TABLE = process.env.STUDENTS_TABLE_NAME || 'ho-yu-students';

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL';
  message?: string;
}

const results: TestResult[] = [];

/**
 * Test: Create (PUT) Operation
 */
async function testCreate(): Promise<TestResult> {
  try {
    const testStudent = {
      student_id: 'TEST_STUDENT_001',
      name_1: 'Test Student',
      name_2: '測試學生',
      marks: 100,
      class: 'TEST',
      class_no: '01',
      teacher_id: 'TCH001',
      password: '123',
      last_login: new Date().toISOString(),
      last_update: new Date().toISOString(),
    };

    const command = new PutCommand({
      TableName: STUDENTS_TABLE,
      Item: testStudent,
    });

    await docClient.send(command);

    return {
      test: 'CREATE',
      status: 'PASS',
      message: 'Successfully created test student',
    };
  } catch (error: any) {
    return {
      test: 'CREATE',
      status: 'FAIL',
      message: error.message,
    };
  }
}

/**
 * Test: Read (GET) Operation
 */
async function testRead(): Promise<TestResult> {
  try {
    const command = new GetCommand({
      TableName: STUDENTS_TABLE,
      Key: { student_id: 'TEST_STUDENT_001' },
    });

    const result = await docClient.send(command);

    if (result.Item && result.Item.student_id === 'TEST_STUDENT_001') {
      return {
        test: 'READ',
        status: 'PASS',
        message: 'Successfully read test student',
      };
    } else {
      return {
        test: 'READ',
        status: 'FAIL',
        message: 'Student not found or data mismatch',
      };
    }
  } catch (error: any) {
    return {
      test: 'READ',
      status: 'FAIL',
      message: error.message,
    };
  }
}

/**
 * Test: Update (UPDATE) Operation
 */
async function testUpdate(): Promise<TestResult> {
  try {
    const command = new UpdateCommand({
      TableName: STUDENTS_TABLE,
      Key: { student_id: 'TEST_STUDENT_001' },
      UpdateExpression: 'SET marks = :marks',
      ExpressionAttributeValues: {
        ':marks': 200,
      },
      ReturnValues: 'ALL_NEW',
    });

    const result = await docClient.send(command);

    if (result.Attributes && result.Attributes.marks === 200) {
      return {
        test: 'UPDATE',
        status: 'PASS',
        message: 'Successfully updated test student marks',
      };
    } else {
      return {
        test: 'UPDATE',
        status: 'FAIL',
        message: 'Update did not reflect expected changes',
      };
    }
  } catch (error: any) {
    return {
      test: 'UPDATE',
      status: 'FAIL',
      message: error.message,
    };
  }
}

/**
 * Test: Delete (DELETE) Operation
 */
async function testDelete(): Promise<TestResult> {
  try {
    const command = new DeleteCommand({
      TableName: STUDENTS_TABLE,
      Key: { student_id: 'TEST_STUDENT_001' },
    });

    await docClient.send(command);

    // Verify deletion
    const getCommand = new GetCommand({
      TableName: STUDENTS_TABLE,
      Key: { student_id: 'TEST_STUDENT_001' },
    });

    const result = await docClient.send(getCommand);

    if (!result.Item) {
      return {
        test: 'DELETE',
        status: 'PASS',
        message: 'Successfully deleted test student',
      };
    } else {
      return {
        test: 'DELETE',
        status: 'FAIL',
        message: 'Student still exists after deletion',
      };
    }
  } catch (error: any) {
    return {
      test: 'DELETE',
      status: 'FAIL',
      message: error.message,
    };
  }
}

/**
 * Test: Scan Operation
 */
async function testScan(): Promise<TestResult> {
  try {
    const command = new ScanCommand({
      TableName: STUDENTS_TABLE,
      Limit: 5,
    });

    const result = await docClient.send(command);

    if (result.Items && result.Items.length > 0) {
      return {
        test: 'SCAN',
        status: 'PASS',
        message: `Successfully scanned table (${result.Items.length} items found)`,
      };
    } else {
      return {
        test: 'SCAN',
        status: 'FAIL',
        message: 'No items found in table (may need to seed data)',
      };
    }
  } catch (error: any) {
    return {
      test: 'SCAN',
      status: 'FAIL',
      message: error.message,
    };
  }
}

/**
 * Run all tests
 */
async function runTests(): Promise<void> {
  console.log('╔════════════════════════════════════════════════════════════╗');
  console.log('║       DynamoDB Local Connection Test Suite                ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  console.log('Configuration:');
  console.log(`  Endpoint: ${process.env.DYNAMODB_ENDPOINT || 'http://localhost:8002'}`);
  console.log(`  Region: ${process.env.AWS_REGION || 'us-east-1'}`);
  console.log(`  Mode: ${process.env.DYNAMODB_MODE || 'aws'}`);
  console.log(`  Table: ${STUDENTS_TABLE}\n`);

  console.log('Running tests...\n');

  // Run tests sequentially
  results.push(await testCreate());
  results.push(await testRead());
  results.push(await testUpdate());
  results.push(await testDelete());
  results.push(await testScan());

  // Print results
  console.log('Test Results:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  results.forEach((result) => {
    const statusIcon = result.status === 'PASS' ? '✓' : '✗';
    const statusColor = result.status === 'PASS' ? '✓' : '✗';
    console.log(`  ${statusColor} ${result.test.padEnd(10)} ${result.status}`);
    if (result.message) {
      console.log(`    └─ ${result.message}`);
    }
  });

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  // Summary
  const passCount = results.filter((r) => r.status === 'PASS').length;
  const failCount = results.filter((r) => r.status === 'FAIL').length;

  console.log(`\nSummary: ${passCount} passed, ${failCount} failed out of ${results.length} tests\n`);

  if (failCount === 0) {
    console.log('✓ All tests passed! DynamoDB Local is working correctly.\n');
    process.exit(0);
  } else {
    console.log('✗ Some tests failed. Check configuration and DynamoDB Local status.\n');
    console.log('Troubleshooting:');
    console.log('  1. Ensure DynamoDB Local is running: npm run dynamodb:start');
    console.log('  2. Verify tables are created: npm run dynamodb:init');
    console.log('  3. Check environment variables in .env file');
    console.log('  4. Verify Docker containers: docker ps');
    console.log('  5. Check logs: npm run dynamodb:logs\n');
    process.exit(1);
  }
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error running tests:', error);
  process.exit(1);
});
