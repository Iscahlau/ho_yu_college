# Backend - Ho Yu College Scratch Game Platform

This directory contains the backend Lambda functions, DynamoDB scripts, and tests for the Ho Yu College Scratch Game Platform.

## Structure

```
backend/
├── lambda/            # Lambda function handlers (application logic)
│   ├── auth/          # Authentication handlers
│   ├── games/         # Game management handlers
│   ├── download/      # Data export handlers
│   ├── upload/        # Data import handlers
│   └── utils/         # Shared utilities (DynamoDB client)
├── scripts/           # DynamoDB Local initialization and seeding
├── test/              # Unit tests and mock data
│   ├── lambda/        # Lambda function tests
│   └── mocks/         # Mock data for testing and local development
├── docker-compose.dynamodb.yml  # DynamoDB Local container setup
├── jest.config.js     # Jest test configuration
├── package.json       # Dependencies and scripts
└── tsconfig.json      # TypeScript configuration
```

**Note**: Infrastructure code (AWS CDK) has been moved to the `../infra/` directory for better separation of concerns.

## Development

## Development

### Local Development with DynamoDB Local

The recommended way to develop locally is using AWS SAM Local with DynamoDB Local. This mirrors the production environment:

```bash
# From project root - one command to start everything
./start-local.sh
```

This will start:
- DynamoDB Local on port 8002
- DynamoDB Admin UI on port 8001
- SAM Local API Gateway on port 3000

For manual setup and troubleshooting, see [../infra/README.md](../infra/README.md).

### DynamoDB Management

Start/stop DynamoDB Local independently:

```bash
# Start DynamoDB Local
npm run dynamodb:start

# Initialize tables
npm run dynamodb:init

# Seed with mock data
npm run dynamodb:seed

# All-in-one setup
npm run dynamodb:setup

# Stop DynamoDB
npm run dynamodb:stop

# Remove all data
npm run dynamodb:down
```

### AWS Deployment

Infrastructure deployment is managed from the `../infra/` directory:

```bash
cd ../infra
npm install
npm run build
npm run deploy
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run watch` | Watch and compile TypeScript on changes |
| `npm test` | Run Jest unit tests |
| `npm run dynamodb:start` | Start DynamoDB Local container |
| `npm run dynamodb:stop` | Stop DynamoDB Local container |
| `npm run dynamodb:init` | Initialize DynamoDB tables |
| `npm run dynamodb:seed` | Seed tables with mock data |
| `npm run dynamodb:setup` | One-command DynamoDB setup |

## Testing

Run unit tests:

```bash
npm test
```

Mock data for testing is located in `test/mocks/`. See [test/README.md](test/README.md) for details.

## Lambda Functions

### Authentication

**Location**: `lambda/auth/login.ts`

Handles student and teacher authentication with password verification.

### Game Management

**Location**: `lambda/games/`

#### Game Click Tracking (`click.ts`)

Increments the accumulated click count when a student clicks to play a game.

**Features**:
- Atomic DynamoDB updates using `ADD` expression
- Thread-safe handling of concurrent clicks
- Validates game existence before updating
- Returns updated click count

**Endpoint**: `POST /games/{gameId}/click`

See [lambda/games/README.md](lambda/games/README.md) for detailed documentation.

## Infrastructure

The AWS infrastructure is defined using AWS CDK in the `../infra/` directory:

- **API Gateway**: RESTful API endpoints
- **Lambda**: Serverless compute for business logic
- **DynamoDB**: NoSQL database for data storage
- **S3**: Static file hosting and storage

See [../infra/README.md](../infra/README.md) for detailed infrastructure documentation and deployment instructions.

### Data Model Requirements

#### Games Table
The Games table has a critical data consistency requirement:

**Game ID and Scratch API Consistency:**
- The `game_id` field must exactly match the last segment (project ID) of the `scratch_api` URL
- **Example**: If `scratch_api` is `https://scratch.mit.edu/projects/1168960672`, then `game_id` must be `1168960672`
- **General Format**: For `scratch_api` as `https://scratch.mit.edu/projects/{{gameId}}`, the `game_id` must be `{{gameId}}`

This invariant is enforced in the test suite (`test/mocks.test.ts`) to ensure data integrity across all game records.

## Environment Variables

Lambda functions use the following environment variables:

- `STUDENTS_TABLE_NAME`: DynamoDB table for student records
- `TEACHERS_TABLE_NAME`: DynamoDB table for teacher records
- `GAMES_TABLE_NAME`: DynamoDB table for game records

## Mock Data

Mock data is available for local development and testing:

- **10 students** (STU001-STU010) with password `123`
- **3 teachers** (TCH001-TCH003) with passwords `teacher123` or `admin123`
- **20 games** across various subjects and difficulties

See [test/README.md](test/README.md) for comprehensive mock data documentation.

## CORS Configuration

The mock server has CORS enabled for all origins to support local development. In production, CORS should be configured appropriately in API Gateway.

## Troubleshooting

### TypeScript Compilation Errors

If you encounter TypeScript errors during build:

1. Ensure you're using Node.js v18+ and TypeScript 5.x
2. Delete `node_modules` and `package-lock.json`, then run `npm install`
3. Check that all type definitions are installed

### CDK Deployment Issues

If CDK deployment fails:

1. Verify AWS credentials: `aws sts get-caller-identity`
2. Ensure CDK is bootstrapped: `cd ../infra && npx cdk bootstrap`
3. Check CloudFormation console for detailed error messages

### Local Development Issues

If local development encounters issues:

1. Ensure Docker is running: `docker info`
2. Check DynamoDB Local is running: `docker ps | grep dynamodb`
3. Verify services are accessible:
   - DynamoDB: http://localhost:8002
   - DynamoDB Admin: http://localhost:8001
   - API Gateway: http://localhost:3000
4. Check logs: `cd backend && npm run dynamodb:logs`

See [../infra/README.md](../infra/README.md) for comprehensive troubleshooting.
