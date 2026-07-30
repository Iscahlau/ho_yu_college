# Ho Yu College - Complete Documentation

> **Central documentation index for the Ho Yu College Scratch Game Platform**

## 📚 Documentation Structure

### Core Documentation (Root Level)

- **[README.md](README.md)** - Project overview, quick start, and installation
- **[API.md](API.md)** - Complete REST API reference with all endpoints
- **[CHANGELOG.md](CHANGELOG.md)** - Version history and feature updates
- **[DOCS.md](DOCS.md)** - This file - central documentation index

### User Guides (user-guides/)

- **[student-guide.md](user-guides/student-guide.md)** - Student guide for using the platform
- **[teacher-guide.md](user-guides/teacher-guide.md)** - Teacher guide for managing students and games

### Specialized Documentation (docs/)

- **[INFRASTRUCTURE.md](docs/INFRASTRUCTURE.md)** - AWS CDK, SAM Local, deployment
- **[DYNAMODB_LOCAL_GUIDE.md](docs/DYNAMODB_LOCAL_GUIDE.md)** - Complete DynamoDB Local setup
- **[FRONTEND.md](docs/FRONTEND.md)** - Frontend code structure and architecture
- **[MANUAL_TESTING_GUIDE.md](docs/MANUAL_TESTING_GUIDE.md)** - Step-by-step testing procedures
- **[KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md)** - Current limitations and known issues

### Developer Instructions

- **[.github/copilot-instructions.md](.github/copilot-instructions.md)** - Development standards and validated commands

---

## 🚀 Quick Reference

### Installation & Setup

```bash
# Install all dependencies (uses npm workspaces)
npm install

# Start local development environment
npm run dev:local
# or
./start-local.sh

# Start frontend (in separate terminal)
npm run dev:frontend
```

**Services Available:**
- Frontend: http://localhost:5173
- API Gateway: http://localhost:3000
- DynamoDB Admin: http://localhost:8001

### Common Commands

```bash
# Development
npm run dev                 # Start frontend
npm run dev:local           # Start all services

# Building
npm run build               # Build all workspaces
npm run build:frontend      # Build frontend only
npm run build:backend       # Build backend only

# Testing
npm test                    # Run backend tests

# Database
npm run dynamodb:start      # Start DynamoDB Local
npm run dynamodb:stop       # Stop DynamoDB
npm run dynamodb:setup      # Start + init + seed

# Deployment
npm run deploy              # Deploy to AWS
npm run synth               # Generate CloudFormation
```

---

## 🏗️ Architecture Overview

### Technology Stack

**Frontend:**
- React 19 + TypeScript
- Material UI v7
- Redux Toolkit (state management)
- React Router (routing)
- i18next (internationalization)
- Vite (build tool)

**Backend:**
- AWS Lambda (serverless functions)
- API Gateway (REST API)
- DynamoDB (database)
- AWS CDK (infrastructure as code)
- Pino (structured logging)

**Local Development:**
- AWS SAM Local (Lambda emulation)
- DynamoDB Local (database emulation)
- Docker + Docker Compose

### Project Structure

```
ho_yu_college/
├── frontend/              # React application
│   ├── src/
│   │   ├── components/   # Reusable UI components
│   │   ├── pages/        # Page components
│   │   ├── store/        # Redux state management
│   │   ├── services/     # API service layer
│   │   ├── i18n/         # Translations (en, zh)
│   │   └── types/        # TypeScript types
│   └── package.json
│
├── backend/              # Lambda functions & database
│   ├── lambda/          # Lambda handlers
│   │   ├── auth/        # Authentication
│   │   ├── games/       # Games management
│   │   ├── upload/      # File uploads
│   │   ├── download/    # Data export
│   │   └── utils/       # Shared utilities
│   ├── scripts/         # DynamoDB management
│   ├── test/            # Unit tests
│   └── package.json
│
├── infra/               # Infrastructure as Code
│   ├── lib/            # CDK stack definitions
│   ├── backend.ts      # CDK entry point
│   ├── template.yaml   # SAM template (local dev)
│   └── package.json
│
├── docs/                # Documentation
│   ├── INFRASTRUCTURE.md
│   ├── DYNAMODB_LOCAL_GUIDE.md
│   ├── FRONTEND.md
│   ├── MANUAL_TESTING_GUIDE.md
│   └── KNOWN_LIMITATIONS.md
│
├── API.md               # REST API reference
├── DOCS.md              # This file
├── README.md            # Project overview
├── package.json         # Root workspace config
└── start-local.sh       # One-command startup
```

---

## 🌐 API Endpoints

Complete reference in [API.md](API.md)

### Authentication
- `POST /auth/login` - Student/teacher login

### Games
- `GET /games` - List all games (with pagination)
- `POST /games/{gameId}/click` - Track game play

### Data Download (Excel Export)
- `GET /students/download` - Export all students
- `GET /teachers/download` - Export all teachers
- `GET /games/download` - Export all games

### Data Upload (Excel/CSV Import)
- `POST /upload/students` - Import students (max 4000 records)
- `POST /upload/teachers` - Import teachers (max 4000 records)
- `POST /upload/games` - Import games (max 4000 records)

---

## 💾 Data Models

### Student Record
```typescript
{
  student_id: string;      // Primary key
  name: string;
  class: string;
  password: string;
  created_at: string;      // ISO8601 timestamp
  updated_at?: string;
  last_login?: string;
}
```

### Teacher Record
```typescript
{
  teacher_id: string;      // Primary key
  name: string;
  classes: string[];       // Array of class names
  password: string;
  is_admin: boolean;
  created_at: string;
  updated_at?: string;
  last_login?: string;
}
```

### Game Record
```typescript
{
  game_id: string;         // Primary key (must match Scratch project ID)
  game_name: string;
  scratch_api: string;     // Full Scratch project URL
  description?: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  class?: string;
  clicks: number;          // Total play count
  created_at: string;
  updated_at: string;
}
```

**Important:** The `game_id` must match the Scratch project ID in `scratch_api` URL.  
Example: `scratch_api: "https://scratch.mit.edu/projects/1168960672"` → `game_id: "1168960672"`

---

## 🧪 Testing

### Backend Tests

```bash
# Run all backend tests
npm test
# or
npm run test:backend

# Run specific test file
cd backend
npm test -- lambda/auth/login.test.ts
```

Test coverage includes:
- Authentication (login)
- Game operations (list, click tracking)
- Upload handlers (students, teachers, games)
- Download handlers (Excel export)
- DynamoDB operations

### Manual Testing

See [MANUAL_TESTING_GUIDE.md](docs/MANUAL_TESTING_GUIDE.md) for step-by-step testing procedures.

---

## 🌍 Internationalization

The platform supports two languages:
- **English (en)** - Default
- **Traditional Chinese (zh)**

**Implementation:**
- Framework: i18next + react-i18next
- Detection: Browser language detection
- Location: `frontend/src/i18n/locales/`

**Usage in Components:**
```typescript
import { useTranslation } from 'react-i18next';

function MyComponent() {
  const { t } = useTranslation();
  return <h1>{t('welcome')}</h1>;
}
```

---

## 🔧 Development Workflow

### 1. Setup Environment

```bash
# Clone repository
git clone https://github.com/Iscahlau/ho_yu_college.git
cd ho_yu_college

# Install dependencies (all workspaces)
npm install
```

### 2. Start Local Development

```bash
# Terminal 1: Start backend services
npm run dev:local

# Terminal 2: Start frontend
npm run dev:frontend
```

### 3. Make Changes

- Frontend: Edit files in `frontend/src/`
- Backend: Edit files in `backend/lambda/`
- Infrastructure: Edit files in `infra/lib/`

### 4. Test Changes

```bash
# Run backend tests
npm test

# Build to verify no errors
npm run build
```

### 5. Commit & Deploy

```bash
# Commit changes
git add .
git commit -m "Description of changes"
git push

# Deploy to AWS (when ready)
npm run deploy
```

---

## 📦 Workspace Management

This project uses **npm workspaces** for centralized dependency management.

### Benefits
- Single `npm install` for all packages
- Shared dependencies across workspaces
- Consistent versions
- Easier maintenance

### Workspace Commands

```bash
# Install dependencies for all workspaces
npm install

# Run command in specific workspace
npm run build --workspace=frontend

# Run command in all workspaces
npm run build --workspaces

# Add dependency to specific workspace
npm install <package> --workspace=frontend
```

### Available Workspaces
1. **frontend** - React application
2. **backend** - Lambda functions and utilities
3. **infra** - AWS CDK infrastructure

---

## 🚢 Deployment

### Local Development
Covered above - uses SAM Local and DynamoDB Local.

### Production Deployment (AWS)

**Prerequisites:**
- AWS CLI configured
- AWS credentials with appropriate permissions
- CDK bootstrap completed in target region

**Deploy Steps:**
```bash
# Build backend
npm run build:backend

# Generate CloudFormation template
npm run synth

# Deploy to AWS
npm run deploy

# Follow prompts to confirm changes
```

**Deployed Resources:**
- API Gateway
- Lambda Functions (9 functions)
- DynamoDB Tables (3 tables)
- IAM Roles & Policies
- CloudWatch Log Groups

See [INFRASTRUCTURE.md](docs/INFRASTRUCTURE.md) for detailed deployment instructions.

---

## 🐛 Troubleshooting

### Common Issues

**DynamoDB won't start:**
```bash
# Check Docker is running
docker ps

# Restart DynamoDB
npm run dynamodb:stop
npm run dynamodb:start
```

**Frontend can't connect to backend:**
```bash
# Verify API is running
curl http://localhost:3000/games

# Check .env.local file exists
cat frontend/.env.local
# Should contain: VITE_API_URL=http://localhost:3000
```

**Build errors:**
```bash
# Clean and rebuild
npm run clean
npm install
npm run build
```

**Port conflicts:**
- Frontend: Default 5173 (configurable in vite.config.ts)
- API Gateway: Default 3000 (configurable in infra/template.yaml)
- DynamoDB: Default 8002 (configurable in docker-compose.dynamodb.yml)

### Getting Help

1. Check [KNOWN_LIMITATIONS.md](docs/KNOWN_LIMITATIONS.md)
2. Review specific documentation in `docs/`
3. Check GitHub issues
4. Review error logs in terminal output

---

## 📝 Code Standards

### TypeScript Best Practices

From [copilot-instructions.md](.github/copilot-instructions.md):

- ✅ Use ES6+ syntax (latest ECMAScript features)
- ✅ Use `const` and `let` (never `var`)
- ✅ Use arrow functions for callbacks
- ✅ Use template literals for strings
- ✅ Use destructuring
- ✅ Use async/await (not promise chains)
- ✅ Use optional chaining `?.` and nullish coalescing `??`
- ✅ Use spread operator `...`
- ✅ Use modern array methods (`map`, `filter`, `reduce`, `find`)

### Clean Code Reference

Follow principles from [Clean Code TypeScript](https://github.com/labs42io/clean-code-typescript)

---

## 🎯 Feature Highlights

### 1. Scratch Game Integration
- Embed Scratch games via iframe
- Fetch game metadata from Scratch API
- Display game info (title, thumbnail, description, author)
- Responsive iframe sizing (485:402 aspect ratio)

### 2. Time-Based Scoring & Click Tracking
- **Atomic increment operations** (concurrent-safe)
- **Per-game click counter** for engagement statistics
- **Time-based scoring system** for students:
  - **Formula**: `Math.ceil(timeInSeconds / 60) × difficultyMultiplier`
  - **Difficulty Multipliers**: 
    - Beginner: ×1
    - Intermediate: ×2
    - Advanced: ×3
  - **Minimum time**: 1 minute (times <60s treated as 1 minute)
  - **Scoring trigger**: When student leaves the game page
  - **Examples**: 
    - 15 minutes Intermediate = 15 × 2 = 30 marks
    - 10m 10s Beginner = 11 × 1 = 11 marks

### 3. Excel Upload/Download
- Support for .xlsx, .xls, .csv formats
- Batch operations (25 items per batch)
- Max 4000 records per upload
- Error reporting for failed records
- Excel export with date-stamped filenames

### 4. Multi-language Support
- English and Traditional Chinese
- Browser language detection
- Language switcher in navbar
- Comprehensive translations for all UI text

### 5. Role-Based Access
- **Students**: Play games, view records, track marks
- **Teachers**: Upload data, view student progress, admin features
- **Admins**: Full access including teacher management

---

## 📊 Performance Optimizations

### Backend
- Batch operations for DynamoDB (25 items/batch)
- Atomic updates for concurrent operations
- Connection pooling for DynamoDB client
- Structured logging with Pino (high performance)

### Frontend
- Code splitting with React Router
- Lazy loading of components
- Optimized re-renders with Redux selectors
- Vite for fast builds and HMR

### Database
- DynamoDB Local in-memory mode (macOS compatibility)
- Proper indexing with GSIs where needed
- Batch write operations for bulk imports

---

## 🔐 Security Considerations

### Authentication
- Password-based authentication (consider upgrading to JWT)
- Role-based access control
- Session management via Redux store

### API Security
- CORS configuration (restrict origins in production)
- Input validation on all endpoints
- File upload size limits (4000 records max)
- Lambda timeout protection (10 seconds)

### Data Security
- DynamoDB encryption at rest (in production)
- HTTPS for all communications (in production)
- Environment variables for sensitive config
- No credentials in source code

---

## 🎓 Learning Resources

### AWS Services
- [AWS Lambda Documentation](https://docs.aws.amazon.com/lambda/)
- [DynamoDB Documentation](https://docs.aws.amazon.com/dynamodb/)
- [AWS CDK Guide](https://docs.aws.amazon.com/cdk/)
- [SAM Local Documentation](https://docs.aws.amazon.com/serverless-application-model/)

### Frontend Technologies
- [React Documentation](https://react.dev/)
- [Material UI Documentation](https://mui.com/)
- [Redux Toolkit](https://redux-toolkit.js.org/)
- [i18next Documentation](https://www.i18next.com/)

### Development Tools
- [Vite Guide](https://vitejs.dev/guide/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Jest Testing Framework](https://jestjs.io/)

---

## 📄 License

This project is for educational purposes at Ho Yu College.

---

## 🤝 Contributing

1. Create a feature branch
2. Make your changes following code standards
3. Write/update tests
4. Build and test locally
5. Update documentation if needed
6. Submit a pull request

---

## 📞 Support

For issues or questions:
1. Check this documentation
2. Review specific guides in `docs/`
3. Check [API.md](API.md) for endpoint details
4. Review [copilot-instructions.md](.github/copilot-instructions.md)
5. Open a GitHub issue

---

**Last Updated:** October 26, 2025  
**Version:** 1.0.0
