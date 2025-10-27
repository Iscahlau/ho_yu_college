# Ho Yu College - Scratch Game Platform

A web-based platform designed for primary schools to facilitate Scratch game learning and management. This platform enables teachers to upload student information and Scratch game links via Excel files, while students can log in to play games and track their progress.

## 🎮 Features

- **Teacher Portal**: Upload student data and game links via Excel files
- **Student Portal**: Login to access games, play, and track records
- **Game Management**: Filter and organize Scratch games
- **Scratch Game Embedding**: Play Scratch games directly in the platform via iframe
- **Multi-language Support**: Interface available in multiple languages (i18Next)
- **Record Tracking**: Monitor student progress and game completion
- **Time-Based Scoring**: Students earn marks based on play time × difficulty multiplier when they leave the game page
- **Click Tracking**: Automatic tracking of game plays with atomic concurrent-safe increments

## 🏗️ Architecture

### Frontend
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite
- **UI Library**: Material-UI (MUI)
- **Internationalization**: i18Next
- **Routing**: React Router

### Backend
- **Infrastructure**: AWS CDK (Infrastructure as Code)
- **API**: AWS API Gateway
- **Compute**: AWS Lambda
- **Database**: DynamoDB
- **Storage**: S3 (static hosting)
- **Logging**: Pino logger with structured JSON logging

### Logging

The backend uses [Pino](https://getpino.io/) for high-performance structured logging:

- **Structured Logs**: All logs include contextual data (request IDs, user IDs, error details)
- **Environment-Aware**: Pretty-printed logs for local development, JSON format for production/CloudWatch
- **Request Context**: Automatic request tracking with Lambda-specific metadata
- **Performance**: Optimized for AWS Lambda cold starts
- **Configuration**: Log level controlled via `LOG_LEVEL` environment variable (default: `info`)

**Log Levels**: `trace`, `debug`, `info`, `warn`, `error`, `fatal`

### Data Model

#### Games Table
The Games table stores information about Scratch games assigned to students. A critical requirement is that the `game_id` field must match the last segment of the `scratch_api` URL to ensure consistency between the game identifier and its corresponding Scratch project.

**Example:**
- If `scratch_api` is `https://scratch.mit.edu/projects/1168960672`
- Then `game_id` must be `1168960672`

**General Format:**
- `scratch_api`: `https://scratch.mit.edu/projects/{{gameId}}`
- `game_id`: `{{gameId}}`

This constraint is validated in the test suite to ensure data integrity.

## 🚀 Quick Start

### Prerequisites
- Node.js v18+ (v20.19.5 recommended)
- Yarn v1.22+ (package manager)
- Docker and Docker Compose (for DynamoDB Local)
- AWS SAM CLI (installed automatically by start-local.sh if missing)
- AWS CLI (for production deployment only)

### Installation

This project uses npm workspaces for centralized dependency management:

```bash
# Install all dependencies (from project root)
yarn install

# This will install dependencies for frontend, backend, and infra
```

### Local Development (Recommended)

The project includes a complete local development environment using AWS SAM Local that mirrors production:

```bash
# One-command startup (from project root)
./start-local.sh
# or
npm run dev:local
```

This script will:
1. Start DynamoDB Local via Docker Compose
2. Initialize and seed DynamoDB tables with mock data
3. Build and start SAM Local API Gateway on http://localhost:3000
4. Provide all backend Lambda functions locally

**Services Available:**
- 📊 DynamoDB Local: http://localhost:8002
- 🔧 DynamoDB Admin UI: http://localhost:8001
- 🌐 API Gateway: http://localhost:3000

**Start the Frontend:**
```bash
# In a new terminal (from project root)
yarn dev:frontend

# This will start the frontend dev server at http://localhost:5173
```

See [Infrastructure Documentation](docs/INFRASTRUCTURE.md) for detailed setup and troubleshooting.

### Manual Local Development

If you prefer to start services individually:

```bash
# Terminal 1: Start DynamoDB Local (from project root)
yarn dynamodb:start

# Terminal 2: Start SAM Local API Gateway (from project root)
yarn sam:start  # Runs on http://localhost:3000

# Terminal 3: Start frontend (from project root)
yarn dev:frontend  # Runs on http://localhost:5173
```

**DynamoDB Admin UI**: Access at http://localhost:8001 to view and manage data.

See [DynamoDB Local Guide](docs/DYNAMODB_LOCAL_GUIDE.md) for comprehensive setup instructions.

### Available Scripts

The root `package.json` provides convenient workspace-wide commands:

```bash
# Development
yarn dev                 # Start frontend dev server
yarn dev:frontend        # Start frontend dev server
yarn dev:backend         # Start backend (DynamoDB + SAM)
yarn dev:local           # Start all services (./start-local.sh)

# Building
yarn build               # Build all workspaces
yarn build:frontend      # Build frontend only
yarn build:backend       # Build backend only
yarn build:infra         # Build infrastructure only

# Testing
yarn test                    # Run backend tests
yarn test:backend        # Run backend tests

# Deployment
yarn deploy              # Full deployment: backend + frontend (automated)
yarn synth               # Generate CloudFormation template

# Database
yarn dynamodb:start      # Start DynamoDB Local
npm run dynamodb:stop       # Stop DynamoDB Local
npm run dynamodb:setup      # Start, initialize, and seed DynamoDB

# Cleaning
yarn clean               # Clean all workspaces
yarn clean:frontend      # Clean frontend only
yarn clean:backend       # Clean backend only
yarn clean:infra         # Clean infrastructure only
```

### Production Deployment

The infrastructure is managed using AWS CDK with an automated deployment script:

```bash
# One-command deployment (from project root)
yarn deploy

# This will:
# 1. Build backend Lambda functions
# 2. Deploy CDK infrastructure (API Gateway, Lambda, DynamoDB, S3, CloudFront)
# 3. Extract API Gateway endpoint
# 4. Generate frontend .env file
# 5. Build frontend
# 6. Upload to S3
# 7. Invalidate CloudFront cache
```

**Manual deployment**:
```bash
cd infra
yarn build       # Compile TypeScript
yarn synth       # Generate CloudFormation template
yarn deploy      # Run automated deployment script
```

See [Deployment Guide](docs/DEPLOYMENT.md) for comprehensive deployment instructions and troubleshooting.

## 📖 Documentation

### Quick Links
- **[DOCS.md](DOCS.md)** - 📚 **Complete documentation index** with architecture, API reference, and guides
- **[API.md](API.md)** - 🌐 REST API reference with all endpoints and examples
- **[README.md](README.md)** - 📄 This file - project overview and quick start

### Detailed Guides
- **[docs/INFRASTRUCTURE.md](docs/INFRASTRUCTURE.md)** - AWS CDK, SAM Local, deployment
- **[docs/DYNAMODB_LOCAL_GUIDE.md](docs/DYNAMODB_LOCAL_GUIDE.md)** - DynamoDB Local setup
- **[docs/FRONTEND.md](docs/FRONTEND.md)** - Frontend architecture and code structure
- **[docs/MANUAL_TESTING_GUIDE.md](docs/MANUAL_TESTING_GUIDE.md)** - Testing procedures
- **[docs/KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md)** - Known issues

### Developer Resources
- **[.github/copilot-instructions.md](.github/copilot-instructions.md)** - Development standards and validated commands

### Game Page Usage

The game page (`/game/:gameId`) embeds Scratch games using an iframe. Navigate to `/game/{scratchId}` where `{scratchId}` is the Scratch project ID. The platform automatically fetches game metadata from the Scratch API and displays game details.

**Example:** `/game/60917032` displays the game with metadata from `https://api.scratch.mit.edu/projects/60917032`

For detailed implementation and Scratch API integration, see [docs/FRONTEND.md](docs/FRONTEND.md).

## 🛠️ Development

### Workspace Structure

This project uses npm workspaces for centralized dependency management. All dependencies are managed from the root `package.json`.

### Building
```bash
# Build all workspaces
npm run build

# Build specific workspace
npm run build:frontend
npm run build:backend
npm run build:infra
```

### Testing
Backend tests:
```bash
npm test
# or
npm run test:backend
```

### Local Development
Run the complete local development stack:
```bash
./start-local.sh
# or
npm run dev:local
```

See [Infrastructure Documentation](docs/INFRASTRUCTURE.md) for detailed local development setup.

### Deployment
Deploy the infrastructure to AWS:
```bash
npm run deploy
# This will build backend and deploy to AWS
```

## 📁 Project Structure

```
├── frontend/           # React application
│   ├── src/
│   │   ├── App.tsx    # Main component
│   │   └── main.tsx   # Entry point
│   └── package.json
├── backend/            # Lambda functions and DynamoDB setup
│   ├── lambda/        # Lambda function handlers
│   ├── scripts/       # DynamoDB initialization scripts
│   ├── test/          # Unit tests
│   └── package.json
├── infra/              # Infrastructure as Code (AWS CDK & SAM)
│   ├── lib/           # CDK stack definitions
│   ├── backend.ts     # CDK app entry point
│   ├── template.yaml  # SAM template for local development
│   └── package.json
├── docs/               # Additional documentation
│   ├── MANUAL_TESTING_GUIDE.md
│   └── KNOWN_LIMITATIONS.md
├── API.md              # REST API documentation
├── README.md           # This file
├── package.json        # Root workspace configuration
├── start-local.sh      # One-command local development startup
└── .github/
    └── copilot-instructions.md
```

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly (build and run both frontend and backend)
4. Submit a pull request

## 📄 License

This project is for educational purposes at Ho Yu College.
