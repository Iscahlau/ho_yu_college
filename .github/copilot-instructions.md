# Ho Yu College - Scratch Game Platform

This is a Scratch game platform web application designed for primary school use. The platform enables teachers to upload student information and links to Scratch games via Excel files, while students can log in to play games, track records, and filter content.

**ALWAYS reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.**

> **Note**: For a quick project overview and setup summary, see the main [README.md](../README.md). This file contains detailed development instructions, validated command timings, and comprehensive troubleshooting guidance.

## Project Architecture
- **Frontend**: React with Vite, Material UI, i18Next for internationalization
- **Backend**: AWS CDK for infrastructure as code, API Gateway, Lambda, DynamoDB, S3
- **Database**: DynamoDB for data storage, S3 for static hosting
- **Key Features**: Student/teacher login, game management, Excel upload, multi-language support

## Code Quality Standards

### TypeScript & JavaScript Standards
- **Clean Code Reference**: Follow principles from [Clean Code TypeScript](https://github.com/labs42io/clean-code-typescript)
- **Syntax Requirements**: Use ES6+ syntax (ES2015 or later), preferably latest ECMAScript features
  - Use `const` and `let` instead of `var`
  - Use arrow functions `() => {}` for callbacks and functional expressions
  - Use template literals for string interpolation
  - Use destructuring for objects and arrays
  - Use async/await instead of promise chains
  - Use optional chaining `?.` and nullish coalescing `??`
  - Use spread operator `...` for arrays and objects
  - Use modern array methods: `map()`, `filter()`, `reduce()`, `find()`, etc.
  - Use classes with proper encapsulation when appropriate
  - Use modules (import/export) instead of require/module.exports

## Working Effectively

### Environment Requirements
- **Node.js**: v20.19.5 (verified working)
- **npm**: v10.8.2 (verified working)

### Initial Setup and Dependencies

**CRITICAL**: All commands below have been tested and their timings validated. NEVER CANCEL long-running operations.

#### Frontend Development Setup
```bash
# Navigate to project root
cd /home/runner/work/ho_yu_college/ho_yu_college

# Create and setup frontend (if not already done)
mkdir frontend && cd frontend
npm init -y

# Install core React and Vite dependencies
# TIMING: ~11 seconds - NEVER CANCEL, set timeout to 30+ seconds
npm install vite @vitejs/plugin-react react react-dom typescript @types/react @types/react-dom

# Install Material UI dependencies  
# TIMING: ~14 seconds - NEVER CANCEL, set timeout to 30+ seconds
npm install @mui/material @emotion/react @emotion/styled @mui/icons-material @mui/lab

# Install i18Next for internationalization and routing
# TIMING: ~3 seconds - NEVER CANCEL, set timeout to 15+ seconds
npm install react-i18next i18next i18next-browser-languagedetector react-router-dom

# Install development dependencies for linting
# TIMING: ~3 seconds - NEVER CANCEL, set timeout to 15+ seconds
npm install --save-dev eslint @typescript-eslint/eslint-plugin @typescript-eslint/parser prettier
```

#### Backend Development Setup
```bash
# Navigate to project root
cd /home/runner/work/ho_yu_college/ho_yu_college

# Create and setup backend (if not already done)
mkdir backend && cd backend
npm init -y

# Install AWS CDK dependencies
# TIMING: ~5 seconds - NEVER CANCEL, set timeout to 15+ seconds
npm install aws-cdk-lib constructs

# Install development dependencies
# TIMING: ~2 seconds - NEVER CANCEL, set timeout to 15+ seconds
npm install --save-dev @types/node typescript aws-cdk ts-node source-map-support
```

### Build and Development Commands

**CRITICAL**: All timings below are measured and validated. Use these exact timeout values.

#### Frontend Commands
```bash
cd frontend

# Build the frontend
# TIMING: ~2.4 seconds - NEVER CANCEL, set timeout to 60+ seconds
npm run build

# Start development server
# TIMING: starts in ~196ms - NEVER CANCEL, set timeout to 60+ seconds
npm run dev
# Access at http://localhost:5173

# Run linting (when configured)
npm run lint
```

#### Backend Commands  
```bash
cd backend

# Build the backend TypeScript
# TIMING: ~6 seconds - NEVER CANCEL, set timeout to 60+ seconds
npm run build

# Synthesize CloudFormation template
# TIMING: ~9.6 seconds - NEVER CANCEL, set timeout to 60+ seconds
npx cdk synth

# Deploy to AWS (requires AWS credentials)
# TIMING: 5-15 minutes - NEVER CANCEL, set timeout to 20+ minutes
npx cdk deploy
```

### Validation Requirements

#### After Frontend Changes
1. **Build validation**: `npm run build` - must complete without errors (2.4s)
2. **Dev server validation**: `npm run dev` - must start successfully (196ms)
3. **Manual validation**: Verify the application loads at http://localhost:5173
4. **Lint validation**: `npm run lint` - should pass without warnings (when configured)

#### After Backend Changes
1. **Build validation**: `npm run build` - must compile TypeScript without errors (6s)
2. **CDK validation**: `npx cdk synth` - must generate CloudFormation without errors (9.6s)
3. **Deploy validation**: `npx cdk deploy` - should deploy successfully with AWS credentials (5-15 minutes)

### Manual Testing Scenarios

**CRITICAL**: Always perform these validation steps after making changes:

#### Frontend Validation Scenarios
1. **Basic Application Load**: Start dev server, navigate to http://localhost:5173, verify page loads
2. **Component Rendering**: Verify React components render without errors
3. **Navigation**: Test routing between pages (when implemented)
4. **Material UI Integration**: Verify Material UI components display correctly
5. **Language Switching**: Test i18Next language switching functionality (when implemented)

#### Backend Validation Scenarios
1. **Infrastructure Synthesis**: Run `npx cdk synth` and verify CloudFormation template generates
2. **Stack Validation**: Check that AWS resources are defined correctly in the synthesized template
3. **API Endpoints**: Test API Gateway endpoints (when implemented and deployed)

## Project Structure

**Current validated structure:**
```
├── frontend/                 # React + Vite application
│   ├── src/
│   │   ├── App.tsx          # Main app component
│   │   └── main.tsx         # Entry point
│   ├── index.html           # HTML template
│   ├── package.json         # Frontend dependencies
│   ├── tsconfig.json        # TypeScript config
│   ├── tsconfig.node.json   # Node TypeScript config
│   └── vite.config.ts       # Vite configuration
├── backend/                 # AWS CDK infrastructure
│   ├── bin/
│   │   └── backend.ts       # CDK app entry point
│   ├── lib/
│   │   └── backend-stack.ts # Main stack definition
│   ├── cdk.json            # CDK configuration
│   ├── package.json        # Backend dependencies
│   └── tsconfig.json       # TypeScript config
├── .gitignore              # Git ignore rules
├── README.md               # Project documentation
└── .github/
    └── copilot-instructions.md # This file
```

## Important Development Notes

### Frontend Development
- **React Components**: Use TypeScript and functional components with hooks
- **Material UI**: Use Material UI components consistently for all UI elements
- **Internationalization**: Implement i18Next for all user-facing text
- **Routing**: Use React Router for navigation between pages
- **State Management**: Consider using React Context or Redux for complex state

### Backend Development
- **Infrastructure as Code**: All AWS resources must be defined using AWS CDK
- **TypeScript**: Use TypeScript for all CDK code
- **Data Storage**: Use DynamoDB for application data (student info, game records)
- **API Design**: Implement REST APIs using API Gateway and Lambda
- **Security**: Implement proper authentication and authorization

### Performance Considerations
- Frontend builds are fast (~2.4s) - safe to build frequently
- Backend CDK synth takes ~9.6s - acceptable for validation
- CDK deployments take 5-15 minutes - only deploy when necessary
- Dev server starts quickly (~196ms) - ideal for rapid development

## Common Commands Reference

**Validated command timings (use these exact timeout values):**

| Command | Location | Time | Timeout Setting |
|---------|----------|------|----------------|
| `npm install` (core frontend) | frontend/ | ~11s | 30+ seconds |
| `npm install` (Material UI) | frontend/ | ~14s | 30+ seconds |
| `npm install` (i18n/router) | frontend/ | ~3s | 15+ seconds |
| `npm install` (backend CDK) | backend/ | ~5s | 15+ seconds |
| `npm run build` (frontend) | frontend/ | ~2.4s | 60+ seconds |
| `npm run build` (backend) | backend/ | ~6s | 60+ seconds |
| `npm run dev` | frontend/ | ~196ms | 60+ seconds |
| `npx cdk synth` | backend/ | ~9.6s | 60+ seconds |
| `npx cdk deploy` | backend/ | 5-15 min | 20+ minutes |

## Troubleshooting

### Common Issues
- **TypeScript errors in React**: Remove unused imports (React import not needed with new JSX transform)
- **Build failures**: Check all dependencies are installed correctly
- **CDK deployment failures**: Verify AWS credentials and permissions
- **Port conflicts**: Default Vite dev server runs on port 5173
- **Node.js version issues**: Ensure Node.js 18+ is installed

### When Instructions Don't Work
If any command fails or behaves differently than documented:
1. Verify Node.js version: `node --version` (should be v20.19.5 or compatible)
2. Verify npm version: `npm --version` (should be v10.8.2 or compatible)
3. Check dependencies are installed: `npm list` in respective directories
4. For AWS issues: verify credentials with `aws sts get-caller-identity`
5. Look for specific error messages in build output
6. If issues persist, search GitHub issues or documentation

### File Structure Validation
Run these commands to verify project structure:
```bash
# Verify frontend structure
ls -la frontend/src/
ls -la frontend/package.json

# Verify backend structure  
ls -la backend/lib/
ls -la backend/bin/
ls -la backend/cdk.json

# Check if builds work
cd frontend && npm run build
cd ../backend && npm run build && npx cdk synth
```

## Security and Best Practices

### Frontend Security
- Validate all user inputs before processing
- Use HTTPS for all communications
- Implement proper CORS configuration
- Sanitize data when displaying user-generated content

### Backend Security
- Use IAM roles and policies for AWS resource access
- Implement API authentication and authorization
- Validate inputs at API Gateway level
- Use AWS best practices for Lambda security
- Enable CloudTrail for audit logging

### Development Workflow
1. Always build and test locally before committing
2. Run validation commands after making changes
3. Use the exact timeout values specified in these instructions
4. Test both frontend and backend components after changes
5. Verify end-to-end functionality when possible

### Testing Strategy
Currently, the project does not have automated test infrastructure set up. When adding tests:
- **Frontend**: Consider using Vitest (built into Vite) or Jest with React Testing Library
- **Backend**: Consider using Jest or AWS CDK's built-in testing utilities
- **E2E Tests**: Consider Playwright or Cypress for end-to-end testing
- Always write tests for new features and bug fixes
- Maintain test coverage above 70% when test infrastructure is established

Always follow these instructions for consistent and reliable development workflow.