/**
 * Seed DynamoDB Local with Mock Data
 * Populates tables with test data from mock files
 */

import { DynamoDBDocumentClient, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';

// Import mock data
import { mockStudents } from '../test/mocks/students';
import { mockTeachers } from '../test/mocks/teachers';
import { mockGames } from '../test/mocks/games';

// Configuration for local DynamoDB
const client = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
  endpoint: process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'local',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'local',
  },
});

const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAMES = {
  students: process.env.STUDENTS_TABLE_NAME || 'ho-yu-students',
  teachers: process.env.TEACHERS_TABLE_NAME || 'ho-yu-teachers',
  games: process.env.GAMES_TABLE_NAME || 'ho-yu-games',
};

/**
 * Seed data in batches (DynamoDB batch write limit is 25 items)
 */
async function seedInBatches<T>(
  tableName: string,
  items: T[],
  label: string
): Promise<void> {
  const batchSize = 25;
  const batches = [];

  for (let i = 0; i < items.length; i += batchSize) {
    batches.push(items.slice(i, i + batchSize));
  }

  console.log(`Seeding ${items.length} ${label} in ${batches.length} batch(es)...`);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const putRequests = batch.map(item => ({
      PutRequest: {
        Item: item,
      },
    }));

    const command = new BatchWriteCommand({
      RequestItems: {
        [tableName]: putRequests,
      },
    });

    await docClient.send(command);
    console.log(`  ✓ Batch ${i + 1}/${batches.length} completed (${batch.length} items)`);
  }

  console.log(`✓ Seeded ${items.length} ${label}`);
}

/**
 * Main function to seed all tables
 */
async function seedTables(): Promise<void> {
  try {
    console.log('Seeding DynamoDB Local with mock data...\n');

    // Seed teachers
    await seedInBatches(TABLE_NAMES.teachers, mockTeachers, 'teachers');
    console.log('');

    // Seed students
    await seedInBatches(TABLE_NAMES.students, mockStudents, 'students');
    console.log('');

    // Seed games
    await seedInBatches(TABLE_NAMES.games, mockGames, 'games');
    console.log('');

    console.log('✓ All data seeded successfully!\n');
    console.log('Summary:');
    console.log(`  - Teachers: ${mockTeachers.length}`);
    console.log(`  - Students: ${mockStudents.length}`);
    console.log(`  - Games: ${mockGames.length}`);
    console.log('\nYou can now:');
    console.log('  1. View data in DynamoDB Admin: http://localhost:8001');
    console.log('  2. Test your Lambda functions with local data');
    console.log('  3. Run integration tests\n');
  } catch (error) {
    console.error('Error seeding tables:', error);
    throw error;
  }
}

// Run seeding
seedTables()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Failed to seed tables:', error);
    process.exit(1);
  });
