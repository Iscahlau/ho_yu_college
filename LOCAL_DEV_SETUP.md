# Local Development Setup - Migration Complete

## Summary

This document describes the completed migration to a local development environment using AWS SAM Local that mirrors production deployment.

## Changes Made

### 1. Infrastructure Reorganization

**Created `infra/` directory** with complete AWS CDK and SAM Local setup:
- `backend.ts` - CDK entry point with environment detection (dev vs prod)
- `lib/backend-stack.ts` - CDK stack definition (moved from backend/aws/lib/)
- `template.yaml` - SAM template for local Lambda execution
- `package.json` - Infrastructure dependencies and scripts
- `cdk.json` - CDK configuration
- `tsconfig.json` - TypeScript configuration
- `README.md` - Comprehensive infrastructure documentation

**Removed deprecated directories:**
- `backend/aws/` - CDK code moved to `infra/`
- `backend/bin/` - Entry point moved to `infra/`
- `backend/database/` - SQL-based development replaced by DynamoDB Local
- `backend/mock-server/` - Express mock server replaced by SAM Local

### 2. Local Development Environment

**One-Command Startup:** Created `start-local.sh` script at project root that:
1. Checks for Docker and installs AWS SAM CLI if needed
2. Starts DynamoDB Local via Docker Compose
3. Initializes and seeds DynamoDB tables with mock data
4. Builds and starts SAM Local API Gateway on http://localhost:3000

**Services Available Locally:**
- DynamoDB Local: http://localhost:8002
- DynamoDB Admin UI: http://localhost:8001
- API Gateway (SAM Local): http://localhost:3000

### 3. Environment Detection

**CDK Entry Point** (`infra/backend.ts`):
- Detects environment from context (`-c env=dev`) or environment variable (`ENVIRONMENT`)
- **Local mode** (`env=dev`): Skips CDK deployment, instructs to use SAM Local
- **Production mode** (default): Deploys infrastructure to AWS

**Lambda Functions** already support both modes via `DYNAMODB_MODE` environment variable:
- `local`: Connects to DynamoDB Local at http://localhost:8002
- `aws` (default): Connects to AWS DynamoDB

### 4. Documentation Updates

**Main README.md:**
- Updated Quick Start with one-command local development
- Removed mock server references
- Added SAM Local documentation links
- Updated project structure

**backend/README.md:**
- Removed mock server and SQL database sections
- Added local development with SAM Local instructions
- Updated infrastructure references to point to `infra/`
- Updated troubleshooting section

**infra/README.md:**
- Comprehensive guide for both local development and production deployment
- SAM Local setup and usage
- Environment detection explanation
- Troubleshooting guide

### 5. SAM Template Configuration

**template.yaml** defines all Lambda functions for local execution:
- LoginFunction: `POST /auth/login`
- GameClickFunction: `POST /games/{gameId}/click`
- DownloadStudentsFunction: `GET /students/download`
- DownloadTeachersFunction: `GET /teachers/download`
- DownloadGamesFunction: `GET /games/download`
- UploadStudentsFunction: `POST /students/upload`
- UploadTeachersFunction: `POST /teachers/upload`
- UploadGamesFunction: `POST /games/upload`

All functions are configured with:
- DYNAMODB_MODE=local
- DYNAMODB_ENDPOINT=http://dynamodb-local:8000 (Docker network)
- Appropriate table name environment variables

### 6. Docker Network Configuration

SAM Local and DynamoDB Local communicate via shared Docker network:
- **Network name**: `ho-yu-network`
- **DynamoDB container**: `dynamodb-local`
- Configured in `backend/docker-compose.dynamodb.yml`
- SAM Local uses `--docker-network ho-yu-network` flag

## Usage

### Quick Start

```bash
# From project root
./start-local.sh

# In a new terminal - start frontend
cd frontend
npm run dev
```

### Manual Setup

```bash
# Start DynamoDB Local
cd backend
npm run dynamodb:setup

# Start SAM Local API
cd ../infra
npm install
npm run build
npm run sam:start

# Start frontend
cd ../frontend
npm run dev
```

### Production Deployment

```bash
cd infra
npm install
npm run build
npm run deploy
```

## Benefits

1. **True Production Mirror**: Local environment uses same Lambda functions and DynamoDB as production
2. **No Mock Code**: Eliminates separate mock server implementation and maintenance
3. **Single Command**: Developers can start entire stack with one command
4. **Better Separation**: Infrastructure code separated from application code
5. **Environment Switching**: Easy switch between local and production modes
6. **Docker Isolated**: All services run in Docker for consistency

## Testing

All existing tests continue to pass:
- Backend: 115 tests passing
- Frontend builds successfully
- Infrastructure builds and synthesizes correctly
- CDK deployment tested in both dev and prod modes

## Files Modified

**New Files:**
- `infra/` (entire directory)
- `start-local.sh`

**Modified Files:**
- `README.md`
- `backend/README.md`
- `backend/package.json`

**Removed Files:**
- `backend/aws/` (moved to infra/)
- `backend/bin/` (moved to infra/)
- `backend/cdk.json` (moved to infra/)
- `backend/database/` (deprecated)
- `backend/mock-server/` (deprecated)

## Next Steps

Developers should:
1. Pull the latest changes
2. Run `./start-local.sh` to verify local setup works
3. Test that frontend connects to local backend
4. Use DynamoDB Admin UI to inspect local data
5. Refer to `infra/README.md` for troubleshooting

## Migration Notes

- Lambda functions already supported local DynamoDB - no code changes needed
- DynamoDB Local setup already existed - reused for SAM Local
- Mock data in `backend/test/mocks/` used by both tests and local DynamoDB seeding
