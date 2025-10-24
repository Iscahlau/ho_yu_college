/**
 * Initialize DynamoDB Local with Tables
 * Creates all required tables with appropriate schemas and indexes
 */

import {
  DynamoDBClient,
  CreateTableCommand,
  ListTablesCommand,
  DeleteTableCommand,
  DescribeTableCommand,
  waitUntilTableExists,
} from '@aws-sdk/client-dynamodb';

// Configuration for local DynamoDB
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8002',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'local',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'local',
  },
  requestHandler: {
    requestTimeout: 10000, // 10 second timeout to prevent hanging
  },
});

const TABLE_NAMES = {
  students: process.env.STUDENTS_TABLE_NAME || 'ho-yu-students',
  teachers: process.env.TEACHERS_TABLE_NAME || 'ho-yu-teachers',
  games: process.env.GAMES_TABLE_NAME || 'ho-yu-games',
};

/**
 * Check if a table exists
 */
async function tableExists(tableName: string): Promise<boolean> {
  try {
    await client.send(new DescribeTableCommand({ TableName: tableName }));
    return true;
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException') {
      return false;
    }
    throw error;
  }
}

/**
 * Delete a table if it exists
 */
async function deleteTableIfExists(tableName: string): Promise<void> {
  const exists = await tableExists(tableName);
  if (exists) {
    console.log(`  Deleting existing table: ${tableName}`);
    await client.send(new DeleteTableCommand({ TableName: tableName }));
    // Wait a bit for deletion to complete
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
}

/**
 * Create Students Table
 */
async function createStudentsTable(): Promise<void> {
  const tableName = TABLE_NAMES.students;
  
  console.log(`Creating table: ${tableName}`);
  
  const command = new CreateTableCommand({
    TableName: tableName,
    KeySchema: [
      { AttributeName: 'student_id', KeyType: 'HASH' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'student_id', AttributeType: 'S' },
      { AttributeName: 'teacher_id', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'teacher-index',
        KeySchema: [
          { AttributeName: 'teacher_id', KeyType: 'HASH' },
        ],
        Projection: {
          ProjectionType: 'ALL',
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      },
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5,
    },
  });

  await client.send(command);
  console.log(`✓ Table created: ${tableName}`);
  
  // Wait for table to be active
  await waitUntilTableExists(
    { client, maxWaitTime: 60, minDelay: 1, maxDelay: 5 },
    { TableName: tableName }
  );
}

/**
 * Create Teachers Table
 */
async function createTeachersTable(): Promise<void> {
  const tableName = TABLE_NAMES.teachers;
  
  console.log(`Creating table: ${tableName}`);
  
  const command = new CreateTableCommand({
    TableName: tableName,
    KeySchema: [
      { AttributeName: 'teacher_id', KeyType: 'HASH' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'teacher_id', AttributeType: 'S' },
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5,
    },
  });

  await client.send(command);
  console.log(`✓ Table created: ${tableName}`);
  
  // Wait for table to be active
  await waitUntilTableExists(
    { client, maxWaitTime: 60, minDelay: 1, maxDelay: 5 },
    { TableName: tableName }
  );
}

/**
 * Create Games Table
 */
async function createGamesTable(): Promise<void> {
  const tableName = TABLE_NAMES.games;
  
  console.log(`Creating table: ${tableName}`);
  
  const command = new CreateTableCommand({
    TableName: tableName,
    KeySchema: [
      { AttributeName: 'scratch_game_id', KeyType: 'HASH' },
    ],
    AttributeDefinitions: [
      { AttributeName: 'scratch_game_id', AttributeType: 'S' },
      { AttributeName: 'teacher_id', AttributeType: 'S' },
      { AttributeName: 'student_id', AttributeType: 'S' },
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'teacher-index',
        KeySchema: [
          { AttributeName: 'teacher_id', KeyType: 'HASH' },
        ],
        Projection: {
          ProjectionType: 'ALL',
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      },
      {
        IndexName: 'student-index',
        KeySchema: [
          { AttributeName: 'student_id', KeyType: 'HASH' },
        ],
        Projection: {
          ProjectionType: 'ALL',
        },
        ProvisionedThroughput: {
          ReadCapacityUnits: 5,
          WriteCapacityUnits: 5,
        },
      },
    ],
    ProvisionedThroughput: {
      ReadCapacityUnits: 5,
      WriteCapacityUnits: 5,
    },
  });

  await client.send(command);
  console.log(`✓ Table created: ${tableName}`);
  
  // Wait for table to be active
  await waitUntilTableExists(
    { client, maxWaitTime: 60, minDelay: 1, maxDelay: 5 },
    { TableName: tableName }
  );
}

/**
 * Test DynamoDB connection
 */
async function testConnection(): Promise<void> {
  console.log('Testing DynamoDB Local connection...');
  try {
    const listCommand = new ListTablesCommand({});
    await client.send(listCommand);
    console.log('✓ Connected to DynamoDB Local\n');
  } catch (error: any) {
    console.error('✗ Failed to connect to DynamoDB Local');
    console.error('  Endpoint:', process.env.DYNAMODB_ENDPOINT || 'http://localhost:8002');
    console.error('  Error:', error.message);
    console.error('\nTroubleshooting:');
    console.error('  1. Make sure DynamoDB Local is running: docker ps | grep dynamodb');
    console.error('  2. Check DynamoDB logs: docker logs ho-yu-dynamodb-local');
    console.error('  3. Restart containers: npm run dynamodb:down && npm run dynamodb:start');
    console.error('  4. Wait a few more seconds for DynamoDB to be ready');
    throw new Error('Cannot connect to DynamoDB Local');
  }
}

/**
 * Main function to initialize all tables
 */
async function initializeTables(reset: boolean = false): Promise<void> {
  try {
    console.log('Initializing DynamoDB Local tables...\n');
    
    // Test connection first to fail fast
    await testConnection();

    // List existing tables
    const listCommand = new ListTablesCommand({});
    const listResult = await client.send(listCommand);
    console.log(`Existing tables: ${listResult.TableNames?.join(', ') || 'none'}\n`);

    // Delete tables if reset is requested
    if (reset) {
      console.log('Resetting tables (deleting existing tables)...');
      await deleteTableIfExists(TABLE_NAMES.students);
      await deleteTableIfExists(TABLE_NAMES.teachers);
      await deleteTableIfExists(TABLE_NAMES.games);
      console.log('');
    }

    // Create tables only if they don't exist
    if (!await tableExists(TABLE_NAMES.students)) {
      await createStudentsTable();
    } else {
      console.log(`Table ${TABLE_NAMES.students} already exists, skipping creation`);
    }

    if (!await tableExists(TABLE_NAMES.teachers)) {
      await createTeachersTable();
    } else {
      console.log(`Table ${TABLE_NAMES.teachers} already exists, skipping creation`);
    }

    if (!await tableExists(TABLE_NAMES.games)) {
      await createGamesTable();
    } else {
      console.log(`Table ${TABLE_NAMES.games} already exists, skipping creation`);
    }

    console.log('\n✓ All tables created successfully!');
    console.log('\nNext steps:');
    console.log('  1. Run seed script to populate data: npm run dynamodb:seed');
    console.log('  2. View tables in DynamoDB Admin: http://localhost:8001');
    console.log('  3. Start using the local DynamoDB in your application\n');
  } catch (error) {
    console.error('Error initializing tables:', error);
    throw error;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const reset = args.includes('--reset') || args.includes('-r');

// Run initialization
initializeTables(reset)
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to initialize tables:', error);
    process.exit(1);
  });
