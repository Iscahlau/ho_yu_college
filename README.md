# Ho Yu College - Scratch Game Platform

A comprehensive educational platform designed for primary school students to learn through Scratch games. The platform enables teachers to manage student information and track learning progress while providing students with an engaging game-based learning experience.

## Features

### Student Features
- **Secure Login**: Student ID and password authentication
- **Game Library**: Access to educational Scratch games filtered by subject and difficulty
- **Multi-language Support**: English and Chinese interface
- **Progress Tracking**: Game scores and time tracking
- **Responsive Design**: Works on tablets and computers

### Teacher/Admin Features
- **Student Management**: Add, update, and delete student records
- **Bulk Upload**: Excel/CSV file upload for student data
- **Game Management**: Add and categorize educational games
- **Analytics**: Download activity reports and learning analytics
- **Multi-language Admin Interface**: Support for English and Chinese

### Technical Features
- **Frontend**: React with TypeScript, Material UI, and React Router
- **Backend**: AWS CDK with Lambda, DynamoDB, API Gateway, and S3
- **Internationalization**: i18Next for multi-language support
- **CI/CD**: GitHub Actions for automated testing and deployment

## Architecture

```
Frontend (React + TypeScript)
├── Pages: Login, Games, Admin
├── Components: Navigation, Game Cards, Upload Forms
├── Internationalization: English/Chinese support
└── Material UI for consistent styling

Backend (AWS CDK)
├── API Gateway: RESTful endpoints
├── Lambda Functions: Authentication, game management
├── DynamoDB: Student data, games, records
├── S3: Static hosting and file uploads
└── CloudFormation: Infrastructure as Code
```

## Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- AWS CLI (for deployment)

### Development Setup

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd ho_yu_college
   ```

2. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

3. **Backend Setup**
   ```bash
   cd backend
   npm install
   npm run build
   npx cdk synth
   ```

### Building for Production

1. **Build Frontend**
   ```bash
   cd frontend
   npm run build
   ```

2. **Deploy Backend (requires AWS credentials)**
   ```bash
   cd backend
   npx cdk deploy
   ```

## Project Structure

```
ho_yu_college/
├── frontend/                 # React application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/           # Application pages
│   │   ├── layouts/         # Layout components
│   │   ├── i18n/           # Internationalization
│   │   ├── types/          # TypeScript types
│   │   └── theme/          # Material UI theme
│   ├── public/             # Static assets
│   └── package.json
├── backend/                 # AWS CDK infrastructure
│   ├── lib/                # CDK stack definitions
│   ├── bin/                # CDK app entry point
│   └── package.json
├── .github/
│   └── workflows/          # CI/CD pipelines
└── README.md
```

## Key Technologies

### Frontend
- **React 19+**: Modern React with hooks and functional components
- **TypeScript**: Type-safe development
- **Material UI v5**: Consistent, accessible UI components
- **React Router**: Client-side routing
- **i18Next**: Internationalization framework
- **Vite**: Fast development and build tool

### Backend
- **AWS CDK**: Infrastructure as Code
- **AWS Lambda**: Serverless compute
- **Amazon DynamoDB**: NoSQL database
- **Amazon S3**: File storage and static hosting
- **Amazon API Gateway**: REST API management

## Development Scripts

### Frontend
```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run lint         # Run ESLint
npm run preview      # Preview production build
```

### Backend
```bash
npm run build        # Compile TypeScript
npm run watch        # Watch for changes
npm run test         # Run tests
npx cdk deploy       # Deploy to AWS
npx cdk diff         # Compare with deployed stack
npx cdk synth        # Synthesize CloudFormation
```

## Configuration

### Environment Variables
- `VITE_API_URL`: Backend API URL (frontend)
- `AWS_REGION`: AWS deployment region (backend)

### Deployment
The application supports automated deployment via GitHub Actions:
1. Push to `main` branch triggers production deployment
2. Pull requests trigger CI testing
3. AWS credentials configured via GitHub secrets

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For questions or issues, please contact the development team or create an issue in the repository.
