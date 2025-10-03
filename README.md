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

## 🚀 Quick Start

### Prerequisites
- Node.js v18+ (v20.19.5 recommended)
- npm v10+
- AWS CLI (for backend deployment)

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
├── backend/            # AWS CDK infrastructure
│   ├── bin/           # CDK app entry
│   ├── lib/           # Stack definitions
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
