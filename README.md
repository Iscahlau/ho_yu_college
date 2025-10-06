# Ho Yu College - Scratch Game Platform

A web-based platform designed for primary schools to facilitate Scratch game learning and management. This platform enables teachers to upload student information and Scratch game links via Excel files, while students can log in to play games and track their progress.

## 🎮 Features

- **Teacher Portal**: Upload student data and game links via Excel files
- **Student Portal**: Login to access games, play, and track records
- **Game Management**: Filter and organize Scratch games
- **Multi-language Support**: Interface available in multiple languages (i18Next)
- **Record Tracking**: Monitor student progress and game completion

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
- AWS CLI (for backend deployment)

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
