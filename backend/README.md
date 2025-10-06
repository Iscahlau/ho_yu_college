# Backend - Ho Yu College Scratch Game Platform

This directory contains the backend infrastructure and services for the Ho Yu College Scratch Game Platform.

## Structure

```
backend/
├── bin/              # CDK app entry point
├── lib/              # CDK stack definitions
├── lambda/           # Lambda function handlers
│   └── auth/         # Authentication handlers
├── mock-server/      # Local development mock server
├── test/             # Unit tests and mock data
│   ├── lambda/       # Lambda function tests
│   └── mocks/        # Mock data for testing and local development
├── cdk.json          # CDK configuration
├── jest.config.js    # Jest test configuration
├── package.json      # Dependencies and scripts
└── tsconfig.json     # TypeScript configuration
```

## Development

### Local Development with Mock Server

For local frontend development without AWS deployment, use the mock server:

```bash
npm run mock-server
```

This starts a local Express server on port 3000 that simulates the AWS backend APIs using mock data.

**See [mock-server/README.md](mock-server/README.md) for detailed documentation.**

### AWS Deployment

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Generate CloudFormation template
npx cdk synth

# Deploy to AWS (requires AWS credentials)
npx cdk deploy
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Compile TypeScript to JavaScript |
| `npm run watch` | Watch and compile TypeScript on changes |
| `npm test` | Run Jest unit tests |
| `npm run cdk` | Run AWS CDK commands |
| `npm run mock-server` | Start local mock server for development |

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

### Future Lambda Functions

Additional Lambda functions for games management, file upload, etc. will be added to the `lambda/` directory.

## Infrastructure

The AWS infrastructure is defined using AWS CDK in the `lib/` directory:

- **API Gateway**: RESTful API endpoints
- **Lambda**: Serverless compute for business logic
- **DynamoDB**: NoSQL database for data storage
- **S3**: Static file hosting and storage

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
2. Ensure CDK is bootstrapped: `npx cdk bootstrap`
3. Check CloudFormation console for detailed error messages

### Mock Server Issues

If the mock server won't start:

1. Check that port 3000 is available
2. Ensure all dependencies are installed: `npm install`
3. Try setting a different port: `PORT=3001 npm run mock-server`

See [mock-server/README.md](mock-server/README.md) for more troubleshooting tips.
