# Infrastructure - Ho Yu College

This directory contains the Infrastructure as Code (IaC) for the Ho Yu College Scratch Game Platform using AWS CDK and AWS SAM.

## Overview

The infrastructure is designed to support both:
- **Local Development**: Using AWS SAM Local with DynamoDB Local
- **Production Deployment**: Using AWS CDK to deploy to AWS cloud

## Directory Structure

```
infra/
├── backend.ts          # CDK app entry point
├── lib/
│   └── backend-stack.ts # CDK stack definition
├── template.yaml       # SAM template for local development
├── cdk.json           # CDK configuration
├── package.json       # Dependencies and scripts
├── tsconfig.json      # TypeScript configuration
└── README.md          # This file
```

## Local Development

### Prerequisites

- **Docker Desktop**: Required for DynamoDB Local and SAM Local
- **Node.js**: v18+ (v20.19.5 recommended)
- **AWS SAM CLI**: Installed automatically by start-local.sh if missing

### Quick Start

From the project root directory, run:

```bash
./start-local.sh
```

This script will:
1. Start DynamoDB Local via Docker Compose
2. Initialize DynamoDB tables
3. Seed tables with mock data
4. Start SAM Local API Gateway on http://localhost:3000

### Available Services

When running locally:

| Service | URL | Description |
|---------|-----|-------------|
| API Gateway | http://localhost:3000 | Local Lambda functions via SAM Local |
| DynamoDB Local | http://localhost:8002 | Local DynamoDB instance |
| DynamoDB Admin UI | http://localhost:8001 | Web UI for managing DynamoDB data |

### Frontend Development

After starting the local backend, start the frontend:

```bash
cd frontend
echo "VITE_API_URL=http://localhost:3000" > .env.local
npm run dev
```

The frontend will be available at http://localhost:5173

### Manual Commands

If you prefer to start services manually:

```bash
# Start DynamoDB Local
cd backend
npm run dynamodb:start

# Initialize and seed tables
npm run dynamodb:init
npm run dynamodb:seed

# Build and start SAM Local API
cd ../infra
npm install
npm run build
npm run sam:start
```

### Stopping Services

- **API Gateway**: Press `Ctrl+C` in the terminal running SAM Local
- **DynamoDB**: Run `cd backend && npm run dynamodb:stop`
- **Remove DynamoDB data**: Run `cd backend && npm run dynamodb:down`

## Production Deployment

### Prerequisites

- **AWS CLI**: Configured with appropriate credentials
- **AWS CDK**: Installed via `npm install -g aws-cdk`
- **AWS Account**: With appropriate permissions

### Deploy to AWS

```bash
# Install dependencies
cd infra
npm install

# Build TypeScript
npm run build

# Bootstrap CDK (first time only)
cdk bootstrap

# Synthesize CloudFormation template
npm run synth

# Deploy to AWS
npm run deploy
```

### CDK Commands

```bash
npm run build       # Compile TypeScript to JavaScript
npm run watch       # Watch for changes and recompile
npm run synth       # Synthesize CloudFormation template
npm run deploy      # Deploy stack to AWS
npm run diff        # Compare deployed stack with current state
npm run cdk <cmd>   # Run any CDK CLI command
```

## Environment Detection

The stack automatically detects the environment:

- **Local Development** (`env=dev` or `env=local`): Skips CDK deployment, use SAM Local
- **Production** (default): Deploys to AWS using CDK

You can specify the environment:

```bash
# Local development
cdk synth -c env=dev

# Production deployment
cdk deploy  # env defaults to 'prod'
```

## Lambda Functions

All Lambda functions are located in `../backend/lambda/`:

### Authentication
- **Login**: `POST /auth/login` - Student and teacher authentication

### Game Management
- **Game Click**: `POST /games/{gameId}/click` - Track game plays

### Data Download
- **Download Students**: `GET /students/download` - Export student data to Excel
- **Download Teachers**: `GET /teachers/download` - Export teacher data to Excel
- **Download Games**: `GET /games/download` - Export game data to Excel

### Data Upload
- **Upload Students**: `POST /students/upload` - Import student data from Excel
- **Upload Teachers**: `POST /teachers/upload` - Import teacher data from Excel
- **Upload Games**: `POST /games/upload` - Import game data from Excel

## DynamoDB Tables

### Local Development
Tables are created automatically by `backend/scripts/init-dynamodb.ts`:

- `ho-yu-students`: Student records
- `ho-yu-teachers`: Teacher records
- `ho-yu-games`: Game records with click tracking

### Production
Tables are defined in `lib/backend-stack.ts` and created during CDK deployment.

## Configuration

### Environment Variables

Lambda functions use these environment variables:

| Variable | Description | Local Value | Production Value |
|----------|-------------|-------------|------------------|
| `DYNAMODB_MODE` | DynamoDB mode | `local` | `aws` |
| `DYNAMODB_ENDPOINT` | DynamoDB endpoint | `http://dynamodb-local:8000` | (AWS default) |
| `STUDENTS_TABLE_NAME` | Students table | `ho-yu-students` | `ho-yu-students` |
| `TEACHERS_TABLE_NAME` | Teachers table | `ho-yu-teachers` | `ho-yu-teachers` |
| `GAMES_TABLE_NAME` | Games table | `ho-yu-games` | `ho-yu-games` |

### Docker Network

SAM Local and DynamoDB Local communicate via Docker network:
- **Network Name**: `ho-yu-network`
- **DynamoDB Container**: `dynamodb-local`

This is configured in:
- `backend/docker-compose.dynamodb.yml` (DynamoDB Local)
- `infra/package.json` (SAM Local --docker-network flag)

## Troubleshooting

### SAM Local Cannot Connect to DynamoDB

**Problem**: Lambda functions fail with "Cannot connect to DynamoDB"

**Solution**: Ensure both services are on the same Docker network:
```bash
# Check if DynamoDB is running
docker ps | grep dynamodb-local

# Restart with the startup script
./start-local.sh
```

### Port Already in Use

**Problem**: Port 3000 is already in use

**Solution**: Stop other services or change the port:
```bash
# Find process using port 3000
lsof -i :3000

# Or use a different port
cd infra
sam local start-api --port 3001 --docker-network ho-yu-network
```

### Lambda Build Errors

**Problem**: SAM fails to build Lambda functions

**Solution**: Ensure backend dependencies are installed:
```bash
cd backend
npm install
cd ../infra
npm run sam:build
```

### DynamoDB Tables Not Found

**Problem**: Lambda functions report "Table not found"

**Solution**: Initialize DynamoDB tables:
```bash
cd backend
npm run dynamodb:init
npm run dynamodb:seed
```

## Additional Resources

- [AWS CDK Documentation](https://docs.aws.amazon.com/cdk/)
- [AWS SAM Documentation](https://docs.aws.amazon.com/serverless-application-model/)
- [DynamoDB Local Guide](../backend/DYNAMODB_LOCAL_GUIDE.md)
- [Project README](../README.md)
