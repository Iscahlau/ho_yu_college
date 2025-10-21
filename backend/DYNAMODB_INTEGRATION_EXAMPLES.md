# DynamoDB Local - Integration Example

This document demonstrates how to integrate DynamoDB Local into your development workflow with practical examples.

## Complete Integration Example

### Step 1: Environment Setup

Create `.env` file in the backend directory:

```bash
cd backend
cat > .env << 'EOF'
# DynamoDB Configuration
DYNAMODB_MODE=local
DYNAMODB_ENDPOINT=http://localhost:8002
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local

# Table Names
STUDENTS_TABLE_NAME=ho-yu-students
TEACHERS_TABLE_NAME=ho-yu-teachers
GAMES_TABLE_NAME=ho-yu-games
EOF
```

### Step 2: Start DynamoDB Local

```bash
# Start containers
npm run dynamodb:start

# Verify containers are running
docker ps

# Expected output:
# CONTAINER ID   IMAGE                           PORTS
# ...            amazon/dynamodb-local:latest    0.0.0.0:8002->8000/tcp
# ...            aaronshaf/dynamodb-admin        0.0.0.0:8001->8001/tcp
```

### Step 3: Initialize and Seed Data

```bash
# Create tables
npm run dynamodb:init

# Seed with test data
npm run dynamodb:seed

# Verify setup
npm run dynamodb:test
```

### Step 4: Using in Your Code

#### Example 1: Simple Query

Create `examples/query-student.ts`:

```typescript
import * as dotenv from 'dotenv';
dotenv.config();

import { GetCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDBClient, tableNames } from '../lambda/utils/dynamodb-client';

async function getStudent(studentId: string) {
  const command = new GetCommand({
    TableName: tableNames.students,
    Key: { student_id: studentId },
  });

  const result = await dynamoDBClient.send(command);
  return result.Item;
}

// Usage
getStudent('STU001').then(student => {
  console.log('Student:', student);
});
```

Run it:
```bash
ts-node examples/query-student.ts
```

#### Example 2: Query with GSI

Create `examples/query-by-teacher.ts`:

```typescript
import * as dotenv from 'dotenv';
dotenv.config();

import { QueryCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDBClient, tableNames } from '../lambda/utils/dynamodb-client';

async function getStudentsByTeacher(teacherId: string) {
  const command = new QueryCommand({
    TableName: tableNames.students,
    IndexName: 'teacher-index',
    KeyConditionExpression: 'teacher_id = :teacherId',
    ExpressionAttributeValues: {
      ':teacherId': teacherId,
    },
  });

  const result = await dynamoDBClient.send(command);
  return result.Items;
}

// Usage
getStudentsByTeacher('TCH001').then(students => {
  console.log(`Found ${students?.length} students`);
  students?.forEach(s => console.log(`  - ${s.name_1} (${s.student_id})`));
});
```

Run it:
```bash
ts-node examples/query-by-teacher.ts
```

#### Example 3: Batch Operations

Create `examples/batch-operations.ts`:

```typescript
import * as dotenv from 'dotenv';
dotenv.config();

import { BatchWriteCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDBClient, tableNames } from '../lambda/utils/dynamodb-client';

async function addMultipleGames(games: any[]) {
  const putRequests = games.map(game => ({
    PutRequest: {
      Item: game,
    },
  }));

  const command = new BatchWriteCommand({
    RequestItems: {
      [tableNames.games]: putRequests,
    },
  });

  await dynamoDBClient.send(command);
  console.log(`Added ${games.length} games`);
}

// Usage
const newGames = [
  {
    game_id: 'EXAMPLE001',
    game_name: 'Example Game 1',
    student_id: 'STU001',
    subject: 'Math',
    difficulty: 'Beginner',
    teacher_id: 'TCH001',
    last_update: new Date().toISOString(),
    scratch_id: '123456',
    scratch_api: 'https://scratch.mit.edu/projects/123456',
    accumulated_click: 0,
  },
  // Add more games...
];

addMultipleGames(newGames);
```

### Step 5: Testing with DynamoDB Local

#### Unit Test Example

Create `examples/test-student-service.test.ts`:

```typescript
import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDBClient, tableNames } from '../lambda/utils/dynamodb-client';

describe('Student Service', () => {
  beforeAll(() => {
    // Ensure DYNAMODB_MODE=local in .env
    expect(process.env.DYNAMODB_MODE).toBe('local');
  });

  test('should create and retrieve student', async () => {
    const testStudent = {
      student_id: 'TEST001',
      name_1: 'Test Student',
      name_2: '测试学生',
      marks: 100,
      class: '1A',
      class_no: '01',
      teacher_id: 'TCH001',
      password: '123',
      last_login: new Date().toISOString(),
      last_update: new Date().toISOString(),
    };

    // Create
    await dynamoDBClient.send(new PutCommand({
      TableName: tableNames.students,
      Item: testStudent,
    }));

    // Retrieve
    const result = await dynamoDBClient.send(new GetCommand({
      TableName: tableNames.students,
      Key: { student_id: 'TEST001' },
    }));

    expect(result.Item).toBeDefined();
    expect(result.Item?.student_id).toBe('TEST001');
    expect(result.Item?.name_1).toBe('Test Student');
  });
});
```

Run tests:
```bash
npm test
```

### Step 6: Switching Between Local and AWS

Your code automatically switches based on environment variables:

**Local Development** (`.env`):
```bash
DYNAMODB_MODE=local
DYNAMODB_ENDPOINT=http://localhost:8002
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local
```

**Production** (environment variables or AWS IAM):
```bash
DYNAMODB_MODE=aws
AWS_REGION=us-east-1
# AWS credentials from IAM role or environment
```

No code changes needed! The `dynamoDBClient` utility handles everything.

## Common Workflows

### Daily Development Workflow

```bash
# Morning: Start DynamoDB
npm run dynamodb:start

# Work on features...
npm run mock-server  # Or your dev server

# Need fresh data?
npm run dynamodb:reset
npm run dynamodb:seed

# Evening: Stop containers
npm run dynamodb:stop
```

### Feature Development Workflow

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Start DynamoDB Local
npm run dynamodb:start

# 3. Add new table/data if needed
# Edit scripts/init-dynamodb.ts
# Edit scripts/seed-dynamodb.ts
npm run dynamodb:reset
npm run dynamodb:seed

# 4. Implement feature using DynamoDB client
# Files in lambda/ directory use dynamoDBClient

# 5. Test locally
npm run dynamodb:test
npm test

# 6. Commit and push
git add .
git commit -m "Add new feature"
git push
```

### Testing Workflow

```bash
# 1. Ensure clean state
npm run dynamodb:reset
npm run dynamodb:seed

# 2. Run tests
npm test

# 3. Check specific functionality
ts-node examples/your-test-script.ts

# 4. View data in Admin UI
open http://localhost:8001
```

## Advanced Examples

### Example: Atomic Counter Increment

```typescript
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDBClient, tableNames } from '../lambda/utils/dynamodb-client';

async function incrementGameClicks(gameId: string) {
  const command = new UpdateCommand({
    TableName: tableNames.games,
    Key: { game_id: gameId },
    UpdateExpression: 'ADD accumulated_click :increment',
    ExpressionAttributeValues: {
      ':increment': 1,
    },
    ReturnValues: 'ALL_NEW',
  });

  const result = await dynamoDBClient.send(command);
  return result.Attributes?.accumulated_click;
}
```

### Example: Conditional Updates

```typescript
import { UpdateCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDBClient, tableNames } from '../lambda/utils/dynamodb-client';

async function updateStudentMarks(studentId: string, newMarks: number) {
  const command = new UpdateCommand({
    TableName: tableNames.students,
    Key: { student_id: studentId },
    UpdateExpression: 'SET marks = :marks, last_update = :timestamp',
    ConditionExpression: 'marks < :marks', // Only update if new score is higher
    ExpressionAttributeValues: {
      ':marks': newMarks,
      ':timestamp': new Date().toISOString(),
    },
    ReturnValues: 'ALL_NEW',
  });

  try {
    const result = await dynamoDBClient.send(command);
    return result.Attributes;
  } catch (error: any) {
    if (error.name === 'ConditionalCheckFailedException') {
      console.log('Score not updated - current score is higher');
      return null;
    }
    throw error;
  }
}
```

### Example: Pagination

```typescript
import { ScanCommand } from '@aws-sdk/lib-dynamodb';
import { dynamoDBClient, tableNames } from '../lambda/utils/dynamodb-client';

async function getAllStudents() {
  const students: any[] = [];
  let lastEvaluatedKey: any = undefined;

  do {
    const command = new ScanCommand({
      TableName: tableNames.students,
      Limit: 10,
      ExclusiveStartKey: lastEvaluatedKey,
    });

    const result = await dynamoDBClient.send(command);
    if (result.Items) {
      students.push(...result.Items);
    }
    lastEvaluatedKey = result.LastEvaluatedKey;
  } while (lastEvaluatedKey);

  return students;
}
```

## Debugging Tips

### Enable Debug Logging

```typescript
// Add to your code for detailed AWS SDK logging
process.env.AWS_SDK_JS_SUPPRESS_MAINTENANCE_MODE_MESSAGE = '1';
process.env.DEBUG = 'aws-sdk:*';
```

### Inspect Data

```bash
# Use AWS CLI
aws dynamodb scan \
  --table-name ho-yu-students \
  --endpoint-url http://localhost:8002 \
  --region us-east-1 \
  --max-items 5

# Or use DynamoDB Admin UI
open http://localhost:8001
```

### Monitor Operations

```bash
# Watch DynamoDB Local logs
npm run dynamodb:logs

# Check container stats
docker stats ho-yu-dynamodb-local
```

## Production Deployment

When deploying to production:

1. **Remove local environment variables**:
   ```bash
   unset DYNAMODB_MODE
   unset DYNAMODB_ENDPOINT
   unset AWS_ACCESS_KEY_ID
   unset AWS_SECRET_ACCESS_KEY
   ```

2. **Use AWS credentials**:
   - IAM roles (recommended for Lambda/EC2)
   - Environment variables (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
   - AWS credentials file (~/.aws/credentials)

3. **Set correct region**:
   ```bash
   export AWS_REGION=us-east-1
   ```

4. **Deploy with CDK**:
   ```bash
   cd backend
   npx cdk deploy
   ```

The same Lambda code works in both environments!

## Resources

- [AWS SDK v3 Documentation](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [DynamoDB API Reference](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [Project Documentation](../DYNAMODB_LOCAL_GUIDE.md)
