# DynamoDB Local Setup Guide

This guide provides detailed instructions for setting up and using DynamoDB Local for local development of the Ho Yu College Scratch Game Platform.

## 📋 Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Quick Start](#quick-start)
4. [Detailed Setup](#detailed-setup)
5. [Configuration](#configuration)
6. [Using DynamoDB Local](#using-dynamodb-local)
7. [Managing Data](#managing-data)
8. [Testing](#testing)
9. [DynamoDB Admin UI](#dynamodb-admin-ui)
10. [Troubleshooting](#troubleshooting)
11. [Best Practices](#best-practices)

## Overview

DynamoDB Local is an official AWS tool that allows you to develop and test DynamoDB applications locally without connecting to the AWS cloud. This setup provides:

- ✅ **Zero AWS costs** during development
- ✅ **Faster development** with instant data access
- ✅ **Offline development** - no internet required
- ✅ **Data persistence** across container restarts
- ✅ **Web UI** for easy data management (DynamoDB Admin)
- ✅ **Consistent behavior** with AWS DynamoDB

## Prerequisites

Before you begin, ensure you have:

- **Docker** (version 20.10 or higher)
- **Docker Compose** (version 2.0 or higher)
- **Node.js** v18+ (v20.19.5 recommended)
- **npm** v10+

Check your installations:
```bash
docker --version
docker-compose --version
node --version
npm --version
```

## Quick Start

The fastest way to get started with DynamoDB Local:

```bash
cd backend

# 1. Start DynamoDB Local and Admin UI
npm run dynamodb:start

# 2. Initialize tables with schema
npm run dynamodb:init

# 3. Seed tables with mock data
npm run dynamodb:seed

# 4. Verify setup in browser
open http://localhost:8001  # DynamoDB Admin UI
```

Or use the all-in-one command:
```bash
npm run dynamodb:setup
```

## Detailed Setup

### Step 1: Configure Environment Variables

Create a `.env` file in the backend directory:

```bash
cd backend
cp .env.example .env
```

Edit the `.env` file with your preferred settings:

```bash
# DynamoDB Configuration
DYNAMODB_MODE=local
DYNAMODB_ENDPOINT=http://localhost:8002
AWS_REGION=us-east-1

# Dummy credentials for local development
AWS_ACCESS_KEY_ID=local
AWS_SECRET_ACCESS_KEY=local

# Table Names (must match CDK stack definitions)
STUDENTS_TABLE_NAME=ho-yu-students
TEACHERS_TABLE_NAME=ho-yu-teachers
GAMES_TABLE_NAME=ho-yu-games
```

### Step 2: Start DynamoDB Local

Start the Docker containers:

```bash
npm run dynamodb:start
```

This command:
- Starts DynamoDB Local on **port 8002**
- Starts DynamoDB Admin UI on **port 8001**
- Creates a persistent volume for data storage
- Runs containers in detached mode (background)

Verify containers are running:
```bash
docker ps
```

You should see:
- `ho-yu-dynamodb-local` - DynamoDB Local service
- `ho-yu-dynamodb-admin` - DynamoDB Admin web interface

### Step 3: Create Tables

Initialize the database tables with proper schema and indexes:

```bash
npm run dynamodb:init
```

This creates three tables:
- **ho-yu-students** - Student information with teacher index
- **ho-yu-teachers** - Teacher information
- **ho-yu-games** - Game data with teacher and student indexes

To reset and recreate tables:
```bash
npm run dynamodb:reset
```

### Step 4: Seed Data

Populate tables with mock test data:

```bash
npm run dynamodb:seed
```

This inserts:
- **3 teachers** (TCH001-TCH003)
- **10 students** (STU001-STU010)
- **20 games** across different subjects and difficulties

## Configuration

### Table Structure

#### Students Table
- **Primary Key**: `student_id` (String)
- **GSI**: `teacher-index` on `teacher_id`
- **Attributes**: name_1, name_2, marks, class, class_no, password, etc.

#### Teachers Table
- **Primary Key**: `teacher_id` (String)
- **Attributes**: name, password, responsible_class, is_admin, etc.

#### Games Table
- **Primary Key**: `game_id` (String)
- **GSI 1**: `teacher-index` on `teacher_id`
- **GSI 2**: `student-index` on `student_id`
- **Attributes**: game_name, subject, difficulty, scratch_id, accumulated_click, etc.

### Environment Modes

The application supports two modes:

**Local Mode** (`DYNAMODB_MODE=local`):
- Connects to DynamoDB Local at `DYNAMODB_ENDPOINT`
- Uses dummy AWS credentials
- Ideal for development and testing

**AWS Mode** (`DYNAMODB_MODE=aws` or unset):
- Connects to AWS DynamoDB
- Uses real AWS credentials from environment or IAM role
- Used in production deployment

## Using DynamoDB Local

### In Lambda Functions

The Lambda functions automatically connect to the correct DynamoDB based on environment variables:

```typescript
// Lambda functions automatically use the configured client
import { dynamoDBClient, tableNames } from '../utils/dynamodb-client';

// Use in your code
const command = new GetCommand({
  TableName: tableNames.students,
  Key: { student_id: 'STU001' },
});

const result = await dynamoDBClient.send(command);
```

### In Local Scripts

When running scripts with ts-node, ensure environment variables are loaded:

```typescript
// At the top of your script
import * as dotenv from 'dotenv';
dotenv.config();

// Then use DynamoDB client as normal
```

### Testing with Mock Server

The mock server can be configured to use DynamoDB Local instead of in-memory data by updating `mock-server/server.ts` to use the DynamoDB client.

## Managing Data

### View Data

**Option 1: DynamoDB Admin UI** (Recommended)
```bash
open http://localhost:8001
```

Features:
- Browse tables and items
- Create/edit/delete items
- Run queries and scans
- Export data

**Option 2: AWS CLI**

List tables:
```bash
aws dynamodb list-tables \
  --endpoint-url http://localhost:8002 \
  --region us-east-1
```

Scan a table:
```bash
aws dynamodb scan \
  --table-name ho-yu-students \
  --endpoint-url http://localhost:8002 \
  --region us-east-1
```

Get an item:
```bash
aws dynamodb get-item \
  --table-name ho-yu-students \
  --key '{"student_id": {"S": "STU001"}}' \
  --endpoint-url http://localhost:8002 \
  --region us-east-1
```

### Reset Data

To start fresh with clean data:

```bash
# Delete all tables and recreate them
npm run dynamodb:reset

# Re-seed with mock data
npm run dynamodb:seed
```

### Backup and Restore

**Backup:**
```bash
# Export data to JSON
aws dynamodb scan \
  --table-name ho-yu-students \
  --endpoint-url http://localhost:8002 \
  --region us-east-1 > backup-students.json
```

**Restore:**
```bash
# Use batch-write-item with JSON data
# (Script creation recommended for bulk imports)
```

## Testing

### Unit Tests

Run Jest tests that use DynamoDB Local:

```bash
# Ensure DynamoDB Local is running
npm run dynamodb:start

# Run tests
npm test
```

### Integration Tests

Test Lambda functions with local DynamoDB:

```bash
# Set environment variables
export DYNAMODB_MODE=local
export DYNAMODB_ENDPOINT=http://localhost:8002

# Run your integration tests
npm test -- --testPathPattern=integration
```

### Manual Testing

Test CRUD operations:

```bash
# Create a student
aws dynamodb put-item \
  --table-name ho-yu-students \
  --item '{"student_id": {"S": "TEST001"}, "name_1": {"S": "Test User"}}' \
  --endpoint-url http://localhost:8002

# Read the student
aws dynamodb get-item \
  --table-name ho-yu-students \
  --key '{"student_id": {"S": "TEST001"}}' \
  --endpoint-url http://localhost:8002

# Update the student
aws dynamodb update-item \
  --table-name ho-yu-students \
  --key '{"student_id": {"S": "TEST001"}}' \
  --update-expression "SET marks = :marks" \
  --expression-attribute-values '{":marks": {"N": "500"}}' \
  --endpoint-url http://localhost:8002

# Delete the student
aws dynamodb delete-item \
  --table-name ho-yu-students \
  --key '{"student_id": {"S": "TEST001"}}' \
  --endpoint-url http://localhost:8002
```

## DynamoDB Admin UI

Access the web-based admin interface at **http://localhost:8001**

### Features

- **Table Browser**: View all tables and their items
- **Item Editor**: Create, update, and delete items visually
- **Query Builder**: Build and execute queries with GSI support
- **Data Export**: Export table data to JSON/CSV
- **Schema Viewer**: View table structure and indexes

### Tips

1. **Quick Search**: Use the search box to filter items
2. **Batch Operations**: Select multiple items for bulk actions
3. **JSON Mode**: Toggle between form and JSON editing
4. **Index Queries**: Use dropdown to query specific GSIs

## Troubleshooting

### Common Issues

#### Port Already in Use

**Error**: "Port 8002 is already in use"

**Solution**:
```bash
# Find process using port 8002
lsof -i :8002

# Kill the process or change port in docker-compose.dynamodb.yml
```

#### Container Won't Start

**Error**: Docker container fails to start

**Solution**:
```bash
# Check container logs
npm run dynamodb:logs

# Restart containers
npm run dynamodb:stop
npm run dynamodb:start

# If persists, remove and recreate
npm run dynamodb:down
npm run dynamodb:start
```

#### Cannot Connect to DynamoDB Local

**Error**: "NetworkingError: connect ECONNREFUSED 127.0.0.1:8002"

**Solution**:
```bash
# Verify container is running
docker ps | grep dynamodb

# Check if port is accessible
curl http://localhost:8002

# Verify environment variables
echo $DYNAMODB_ENDPOINT
echo $DYNAMODB_MODE

# Restart DynamoDB Local
npm run dynamodb:stop
npm run dynamodb:start
```

#### Table Not Found

**Error**: "ResourceNotFoundException: Cannot do operations on a non-existent table"

**Solution**:
```bash
# Initialize tables
npm run dynamodb:init

# Or reset and reinitialize
npm run dynamodb:reset
```

#### Permission Denied

**Error**: Docker permission issues

**Solution**:
```bash
# Add user to docker group (Linux)
sudo usermod -aG docker $USER
newgrp docker

# Or run with sudo (not recommended)
sudo npm run dynamodb:start
```

#### Data Not Persisting

**Error**: Data lost after container restart

**Solution**:
```bash
# Ensure volume is created
docker volume ls | grep dynamodb

# Check docker-compose.dynamodb.yml has volume mount
# Volume should be mapped: dynamodb-data:/data
```

### Debug Mode

Enable verbose logging:

```bash
# Set environment variable
export DEBUG=dynamodb:*

# Or modify docker-compose.dynamodb.yml command
command: ["-jar", "DynamoDBLocal.jar", "-sharedDb", "-dbPath", "/data", "-inMemory"]
```

### Reset Everything

If nothing works, complete reset:

```bash
# Stop and remove containers and volumes
npm run dynamodb:down

# Remove all docker volumes
docker volume prune

# Restart from scratch
npm run dynamodb:setup
```

## Best Practices

### Development Workflow

1. **Start DynamoDB Local first** before running any database operations
2. **Use environment variables** to switch between local and AWS modes
3. **Seed data regularly** to ensure consistent test data
4. **Reset tables** before major testing sessions
5. **Stop containers** when not in use to free resources

### Data Management

1. **Don't commit** `.env` files with real AWS credentials
2. **Use mock data** that's clearly distinguishable from production
3. **Document schema changes** in both CDK stack and init scripts
4. **Version control** seed data in the test/mocks directory
5. **Backup important test data** before resetting

### Performance

1. **Use batch operations** when inserting/updating multiple items
2. **Design proper GSIs** for common query patterns
3. **Monitor container resources** with `docker stats`
4. **Restart containers** periodically if experiencing slowness
5. **Use `-inMemory` flag** for faster tests (no persistence)

### Security

1. **Never use production credentials** in local development
2. **Use dummy credentials** for DynamoDB Local
3. **Don't expose DynamoDB Local** ports to the internet
4. **Keep Docker updated** for security patches
5. **Review data** before sharing database dumps

## Additional Resources

- [DynamoDB Local Documentation](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DynamoDBLocal.html)
- [AWS SDK for JavaScript v3](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
- [Docker Documentation](https://docs.docker.com/)

## NPM Scripts Reference

| Command | Description |
|---------|-------------|
| `npm run dynamodb:start` | Start DynamoDB Local and Admin UI |
| `npm run dynamodb:stop` | Stop containers (keep data) |
| `npm run dynamodb:down` | Stop and remove containers and volumes |
| `npm run dynamodb:logs` | View DynamoDB Local logs |
| `npm run dynamodb:init` | Create tables with schema |
| `npm run dynamodb:reset` | Delete and recreate tables |
| `npm run dynamodb:seed` | Populate tables with mock data |
| `npm run dynamodb:setup` | Complete setup (start + init + seed) |

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review container logs: `npm run dynamodb:logs`
3. Consult AWS DynamoDB Local documentation
4. Create an issue in the project repository
