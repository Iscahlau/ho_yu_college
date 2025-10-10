# DynamoDB to Local SQL - Migration Guide

This guide explains the relationship between the production DynamoDB setup and the local SQL database for development.

## Overview

- **Production**: AWS DynamoDB (NoSQL, managed by AWS CDK)
- **Development**: Local SQLite/PostgreSQL (SQL, for testing and debugging)
- **Purpose**: The local database mirrors DynamoDB structure for easier development

## Architecture Comparison

### DynamoDB (Production)

```
AWS Cloud
├── DynamoDB: ho-yu-students
│   ├── Partition Key: student_id
│   └── GSI: teacher-index (teacher_id)
│
├── DynamoDB: ho-yu-teachers
│   └── Partition Key: teacher_id
│
└── DynamoDB: ho-yu-games
    ├── Partition Key: game_id
    ├── GSI: teacher-index (teacher_id)
    └── GSI: student-index (student_id)
```

### Local SQL (Development)

```
Local Database
├── Table: students
│   ├── Primary Key: student_id
│   ├── Foreign Key: teacher_id → teachers
│   └── Index: idx_students_teacher
│
├── Table: teachers
│   └── Primary Key: teacher_id
│
└── Table: games
    ├── Primary Key: game_id
    ├── Foreign Key: student_id → students
    ├── Foreign Key: teacher_id → teachers
    ├── Index: idx_games_teacher
    └── Index: idx_games_student
```

## Schema Mapping

### DynamoDB vs SQL

| Feature | DynamoDB | Local SQL |
|---------|----------|-----------|
| **Data Model** | NoSQL (key-value) | Relational (SQL) |
| **Primary Key** | Partition Key | PRIMARY KEY constraint |
| **Secondary Index** | Global Secondary Index (GSI) | Standard INDEX |
| **Relationships** | Not enforced | FOREIGN KEY constraints |
| **Timestamps** | ISO 8601 strings | TIMESTAMP type (same format) |
| **Arrays** | Native list type | JSON text (e.g., responsible_class) |
| **Validation** | Application-level | CHECK constraints |

### Field Type Mapping

| DynamoDB Type | SQL Type | Example |
|---------------|----------|---------|
| String (S) | VARCHAR | student_id VARCHAR(20) |
| Number (N) | INTEGER | marks INTEGER |
| Boolean (BOOL) | BOOLEAN | is_admin BOOLEAN |
| List (L) | TEXT (JSON) | responsible_class TEXT |
| Timestamp | TIMESTAMP | last_login TIMESTAMP |

## Data Consistency

### What's the Same

✅ **All field names match exactly**
- `student_id`, `teacher_id`, `game_id` etc.
- Same naming conventions
- Same data formats (ISO 8601 timestamps, SHA-256 hashes)

✅ **Mock data is identical**
- Same 10 students, 3 teachers, 20 games
- Same IDs, names, marks, click counts
- Password hashes match production algorithm

✅ **Index names mirror GSI names**
- DynamoDB GSI: `teacher-index` → SQL Index: `idx_students_teacher`
- Query patterns work the same way

### What's Different

⚠️ **Referential integrity is enforced in SQL**
- DynamoDB: Application must maintain relationships
- SQL: Database enforces FOREIGN KEY constraints
- Benefit: Prevents orphaned records during development

⚠️ **responsible_class field**
- DynamoDB: Native list `["1A", "2A"]`
- SQL: JSON string `'["1A", "2A"]'`
- Need to parse in application code

⚠️ **CHECK constraints**
- DynamoDB: No database-level validation
- SQL: Enforces marks (0-1000), valid subjects, etc.
- Benefit: Catches data errors earlier

## Query Translation Examples

### Example 1: Get Student by ID

**DynamoDB (AWS SDK):**
```typescript
const result = await dynamoDb.get({
  TableName: 'ho-yu-students',
  Key: { student_id: 'STU001' }
});
```

**Local SQL:**
```sql
SELECT * FROM students WHERE student_id = 'STU001';
```

### Example 2: Query Students by Teacher (GSI)

**DynamoDB:**
```typescript
const result = await dynamoDb.query({
  TableName: 'ho-yu-students',
  IndexName: 'teacher-index',
  KeyConditionExpression: 'teacher_id = :tid',
  ExpressionAttributeValues: { ':tid': 'TCH001' }
});
```

**Local SQL:**
```sql
SELECT * FROM students WHERE teacher_id = 'TCH001';
-- Uses idx_students_teacher index automatically
```

### Example 3: Complex Join Query

**DynamoDB (requires multiple queries):**
```typescript
// Query 1: Get student
const student = await dynamoDb.get({
  TableName: 'ho-yu-students',
  Key: { student_id: 'STU001' }
});

// Query 2: Get teacher
const teacher = await dynamoDb.get({
  TableName: 'ho-yu-teachers',
  Key: { teacher_id: student.teacher_id }
});

// Query 3: Get games
const games = await dynamoDb.query({
  TableName: 'ho-yu-games',
  IndexName: 'student-index',
  KeyConditionExpression: 'student_id = :sid',
  ExpressionAttributeValues: { ':sid': 'STU001' }
});
```

**Local SQL (single query):**
```sql
SELECT 
  s.*,
  t.teacher_id,
  t.is_admin,
  g.game_name,
  g.subject,
  g.accumulated_click
FROM students s
JOIN teachers t ON s.teacher_id = t.teacher_id
LEFT JOIN games g ON s.student_id = g.student_id
WHERE s.student_id = 'STU001';
```

## Development Workflow

### Recommended Approach

1. **Develop and test locally with SQL database**
   - Fast iteration with DataGrip
   - Easy data inspection and debugging
   - Test queries and relationships

2. **Translate to DynamoDB operations for production**
   - Use AWS SDK in Lambda functions
   - Handle denormalization if needed
   - Consider GSI query patterns

3. **Validate with integration tests**
   - Test against actual DynamoDB in dev/staging
   - Ensure application code works with both

### Example Development Flow

```bash
# 1. Start with fresh data
cd backend/database
./scripts/reset-database.sh

# 2. Open DataGrip and explore data
# - Verify relationships
# - Test query logic
# - Export sample data if needed

# 3. Implement in application code
# - Write Lambda function using DynamoDB SDK
# - Translate SQL logic to DynamoDB queries

# 4. Test locally with mock server
cd backend
npm run mock-server

# 5. Deploy to AWS
cd backend
npx cdk deploy

# 6. Integration test against DynamoDB
# - Verify data integrity
# - Check performance
# - Validate indexes work
```

## Handling Differences

### JSON Fields (responsible_class)

**SQL Database:**
```sql
-- Stored as JSON text
SELECT responsible_class FROM teachers WHERE teacher_id = 'TCH001';
-- Result: '["1A", "2A"]'
```

**Application Code:**
```typescript
// Parse JSON string
const teacher = await queryTeacher('TCH001');
const classes = JSON.parse(teacher.responsible_class);
// Result: ["1A", "2A"]
```

**DynamoDB:**
```typescript
// Native array
const teacher = await getTeacher('TCH001');
const classes = teacher.responsible_class;
// Result: ["1A", "2A"] (no parsing needed)
```

### Atomic Increments (Click Counting)

**SQL Database:**
```sql
-- Transaction required for consistency
BEGIN TRANSACTION;
UPDATE games 
SET accumulated_click = accumulated_click + 1 
WHERE game_id = '1207260630';
COMMIT;
```

**DynamoDB:**
```typescript
// Built-in atomic increment
await dynamoDb.update({
  TableName: 'ho-yu-games',
  Key: { game_id: '1207260630' },
  UpdateExpression: 'ADD accumulated_click :inc',
  ExpressionAttributeValues: { ':inc': 1 }
});
```

## Best Practices

### For Local Development

✅ **Use SQL database for:**
- Schema design and validation
- Complex query development
- Data relationship testing
- Debugging data issues
- Generating test reports

✅ **Use DynamoDB patterns for:**
- Performance-critical queries
- Atomic operations
- Production data access
- Scalability testing

### Data Synchronization

⚠️ **Important:** Local SQL and production DynamoDB are **separate environments**

**Don't:**
- ❌ Sync production data to local database
- ❌ Copy local changes to production directly
- ❌ Use local database for production testing

**Do:**
- ✓ Keep mock data consistent across environments
- ✓ Use deployment scripts for schema changes
- ✓ Document schema evolution in both systems
- ✓ Test DynamoDB integration before deploying

## Schema Updates

When updating the schema:

### 1. Update Local SQL Schema
```bash
# Edit schema file
vim backend/database/schema/01_create_tables.sql

# Recreate database
rm backend/database/ho_yu_college.db
./backend/database/scripts/init-sqlite.sh
```

### 2. Update DynamoDB CDK Stack
```typescript
// Edit backend/aws/lib/backend-stack.ts

// Example: Add new GSI
studentsTable.addGlobalSecondaryIndex({
  indexName: 'class-index',
  partitionKey: { name: 'class', type: dynamodb.AttributeType.STRING }
});
```

### 3. Update TypeScript Interfaces
```typescript
// Edit frontend/src/types/index.ts

export interface Student {
  student_id: string;
  // ... existing fields
  new_field: string; // Add new field
}
```

### 4. Update Mock Data
```sql
-- Edit backend/database/seeds/02_insert_mock_data.sql
-- Add new column to INSERT statements

-- Edit backend/test/mocks/students.ts
-- Add new field to mock objects
```

### 5. Test and Deploy
```bash
# Test local SQL
./backend/database/scripts/test-database.sh

# Test DynamoDB
cd backend
npm run build
npx cdk synth
npx cdk deploy
```

## Troubleshooting

### Issue: Query works in SQL but not in DynamoDB

**Cause:** SQL supports joins and complex queries that DynamoDB doesn't.

**Solution:** 
- Break complex queries into multiple DynamoDB operations
- Consider denormalizing data
- Use GSIs for common query patterns

### Issue: Data relationships broken in DynamoDB

**Cause:** No foreign key enforcement in DynamoDB.

**Solution:**
- Implement validation in application code
- Use transactions for related updates
- Test referential integrity in integration tests

### Issue: Different data types

**Cause:** Type mapping differences (JSON arrays, etc.)

**Solution:**
- Add parsing/serialization in application layer
- Document type conversions
- Add unit tests for data transformations

## Migration Checklist

When moving from local development to production:

- [ ] All SQL queries translated to DynamoDB operations
- [ ] GSI usage optimized for query patterns
- [ ] Atomic operations implemented correctly
- [ ] JSON fields parsed/serialized properly
- [ ] Foreign key validation added to application code
- [ ] Integration tests pass against DynamoDB
- [ ] Performance tested with production data volume
- [ ] Backup/restore procedures documented
- [ ] Monitoring and alerts configured

## Additional Resources

- **AWS DynamoDB Best Practices**: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html
- **DynamoDB to SQL Comparison**: https://www.dynamodbguide.com/
- **AWS CDK Documentation**: https://docs.aws.amazon.com/cdk/latest/guide/

---

**Remember:** The local SQL database is a development tool. Always test against actual DynamoDB before deploying to production.
