# Ho Yu College - Scratch Game Platform

A web-based platform designed for primary schools to facilitate Scratch game learning and management. This platform enables teachers to upload student information and Scratch game links via Excel files, while students can log in to play games and track their progress.

## 🎮 Features

- **Teacher Portal**: Upload student data and game links via Excel files
- **Student Portal**: Login to access games, play, and track records
- **Game Management**: Filter and organize Scratch games
- **Scratch Game Embedding**: Play Scratch games directly in the platform via iframe
- **Multi-language Support**: Interface available in multiple languages (i18Next)
- **Record Tracking**: Monitor student progress and game completion
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
- npm v10+
- Docker and Docker Compose (for DynamoDB Local)
- AWS CLI (for backend deployment)

### Local Development with DynamoDB Local

For local development with a real DynamoDB instance (recommended):

```bash
# Terminal 1: Start DynamoDB Local
cd backend
npm install
cp .env.example .env  # Configure environment
npm run dynamodb:setup  # Start DynamoDB, create tables, seed data

# Terminal 2: Start backend/mock server
cd backend
npm run mock-server  # Runs on http://localhost:3000

# Terminal 3: Start frontend
cd frontend
npm install
echo "VITE_API_URL=http://localhost:3000" > .env.local
npm run dev  # Runs on http://localhost:5173
```

**DynamoDB Admin UI**: Access at http://localhost:8001 to view and manage data.

See [DynamoDB Local Guide](backend/DYNAMODB_LOCAL_GUIDE.md) for comprehensive setup instructions.

### Local Development with Mock Server

For local development without AWS deployment:

```bash
# Terminal 1: Start mock server
cd backend
npm install
npm run mock-server  # Runs on http://localhost:3000

# Terminal 2: Start frontend
cd frontend
npm install
echo "VITE_API_URL=http://localhost:3000" > .env.local
npm run dev  # Runs on http://localhost:5173
```

See [Mock Server Documentation](backend/mock-server/README.md) for more details.

### Frontend Setup
```bash
cd frontend
npm install
npm run dev  # Start development server at http://localhost:5173
```

### Backend Setup
```bash
cd backend
npm install
npm run build       # Compile TypeScript
npx cdk synth      # Generate CloudFormation template
npx cdk deploy     # Deploy to AWS (requires credentials)
```

## 📖 Documentation

For detailed development instructions, build commands, troubleshooting, and best practices, see:
- **[Copilot Instructions](.github/copilot-instructions.md)** - Comprehensive development guide with validated commands and timings
- **[DynamoDB Local Setup Guide](backend/DYNAMODB_LOCAL_GUIDE.md)** - Complete guide for local DynamoDB development
- **[Local Mock Database Setup](backend/database/README.md)** - Set up local SQL database with DataGrip for development
  - **[Quick Start Guide](backend/database/QUICK_START.md)** - Fast setup reference
  - **[DataGrip Setup Guide](backend/database/DATAGRIP_GUIDE.md)** - Visual walkthrough
  - **[Documentation Index](backend/database/INDEX.md)** - Complete guide to all database docs

### Game Page Usage

The game page (`/game/:gameId`) embeds Scratch games using an iframe and automatically fetches game metadata from the Scratch API. The page is responsive and works on both desktop and mobile devices.

**Features:**
- Automatically fetches game name and thumbnail from Scratch API
- Displays game description, instructions, and author information
- Graceful fallback when API is unavailable
- Responsive design for all devices

**How to use:**
1. Navigate to `/game/{scratchId}` where `{scratchId}` is the Scratch project ID
2. Example: `/game/60917032` will display the game details and embed the Scratch project
3. The page fetches metadata from: `https://api.scratch.mit.edu/projects/{scratchId}`
4. The game is embedded using: `https://scratch.mit.edu/projects/{scratchId}/embed`

**Implementation details:**
- The gameId is extracted from the URL route parameter
- Metadata is fetched from the Scratch API on page load
- Game card displays: thumbnail, title, description, instructions, and author
- The `getScratchEmbedUrl()` helper function generates the embed URL
- The iframe uses responsive sizing with a 485:402 aspect ratio
- If API fails, shows warning but game remains playable with fallback values

**Configuration:**
- The Scratch API base URL can be configured via `VITE_SCRATCH_API_BASE` environment variable
  - Default: `https://api.scratch.mit.edu/projects`
- The Scratch embed base URL can be configured via `VITE_SCRATCH_EMBED_BASE` environment variable
  - Default: `https://scratch.mit.edu/projects`

### Scratch API Integration

The platform integrates with the official Scratch API to retrieve game metadata:

**Available Functions:**
- `fetchScratchProject(id)` - Get complete project metadata
- `fetchScratchGameName(id)` - Get only the game title
- `fetchScratchThumbnail(id)` - Get only the thumbnail URL
- `enrichGameWithScratchData(game)` - Automatically enrich game objects with Scratch data

**API Response includes:**
- `title` - Game name (e.g., "Castle Defender ⚔️")
- `image` - Thumbnail URL (e.g., `https://cdn2.scratch.mit.edu/get_image/project/{id}_480x360.png`)
- `description` - Game description
- `instructions` - How to play instructions
- `author.username` - Creator's Scratch username

**Error Handling:**
- Invalid project IDs return `null` with console logging
- Network failures are caught and logged
- UI shows warning messages but remains functional
- Fallback values ensure the game is always playable

For detailed API usage and code examples, see [Frontend Source Documentation](frontend/src/README.md).

## 🛠️ Development

### Building
- Frontend: `cd frontend && npm run build`
- Backend: `cd backend && npm run build`

### Testing
Run the development server to test changes:
```bash
cd frontend && npm run dev
```

### Deployment
Deploy the backend infrastructure to AWS:
```bash
cd backend && npx cdk deploy
```

## 📁 Project Structure

```
├── frontend/           # React application
│   ├── src/
│   │   ├── App.tsx    # Main component
│   │   └── main.tsx   # Entry point
│   └── package.json
├── backend/            # Backend services
│   ├── bin/           # CDK app entry
│   ├── aws/           # AWS infrastructure code (CDK stacks)
│   ├── lambda/        # Lambda function handlers
│   └── package.json
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
