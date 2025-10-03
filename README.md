# Scratch Game Platform for Ho Yu College

## Overview

The Scratch Game Platform is a web application designed for primary school students to play Scratch games, with management features for teachers and admins. The platform uses React, i18Next, Redux, and Material UI for the frontend, paired with AWS CDK, API Gateway, Lambda, S3, and a SQL database (potentially DynamoDB for scalability) for backend services. It supports responsive design for desktop, tablet, and mobile devices, with bilingual support (English and Chinese). Teachers and admins can upload student, teacher, and game data via Excel/CSV, while students can log in to play games and track scores. The platform ensures secure access control and includes a gameplay timer with forced logout after one hour.

## Technical Stack

### Frontend
- React (via Vite)
- i18Next (for English and Chinese support)
- Material UI
- React Router
- Redux

### Backend
- AWS CDK (infrastructure as code)
- API Gateway
- Lambda
- S3 (static site hosting)
- SQL database (with potential DynamoDB for scalability)

### Development Tools
- ESLint
- Prettier
- Jest
- GitHub Actions (CI/CD)

## Features

### Pages

The platform consists of four pages:

1. **Homepage**:
   - Displays all games with thumbnails (135x102 pixels, fetched via Scratch API), game name, subject, difficulty, and a "Play" button.
   - Includes a navbar with school badge, platform title ("學趣天地"), login/logout button, student name (name_1 + name_2), marks, and filter options (subject: Chinese Language, English Language, Mathematics, Humanities and Science; difficulty: Beginner, Intermediate, Advanced).
   - Filters games based on selected subject and difficulty.
   - Clicking a game's "Play" button navigates to the Game Page.
   - Accessible only after login; otherwise, redirects to Login Page with hidden content and a login prompt.

2. **Login Page**:
   - Allows users to log in using student_id/teacher_id and password, with a toggle to show/hide the password (one-time choice, does not persist across sessions).
   - Redirects students to Homepage and teachers/admins to Admin Page upon successful login.
   - Unauthenticated users attempting to access other pages are redirected here with a login prompt.

3. **Game Page**:
   - Embeds a single Scratch game using an iframe (e.g., `<iframe src="https://scratch.mit.edu/projects/1207260630/embed">`), dynamically resized for mobile devices.
   - Displays navbar with school badge, platform title, login/logout button, student name, and marks.
   - Accessible only after login.

4. **Admin Page** (accessible only by teachers and admins):
   - Supports bulk upload of student data (Excel/CSV) for registering, updating, or deleting student records (columns: `student_id`, `name_1`, `name_2`, `marks`, `class`, `class_no`, `last_login`, `last_update`, `teacher_id`, `password`, `action`).
   - Supports bulk upload of teacher data (Excel/CSV) for registering, updating, or deleting teacher records (columns: `teacher_id`, `password`, `responsible_class`, `last_login`, `is_admin`, `action`; visible only to admins).
   - Supports bulk upload of game lists (Excel/CSV) to update game metadata (columns: `game_id`, `game_name`, `student_id`, `subject`, `difficulty`, `teacher_id`, `last_update`, `scratch_id`, `scratch_api`, `accumulated_click`, `action`).
   - Allows downloading student activity data (marks only) in Excel/CSV format, with options to exclude specific columns (no time period filtering).
   - Admins can view and manage data for all students and teachers; teachers are restricted to their own classes.

### Timer Warning

- After login, a timer tracks gameplay duration, resetting upon each login.
- After one hour, a notification prompts the student to rest, allowing continuation after a pause, followed by a forced logout.

### Access Control

- **Unauthenticated Users**: Can only access Homepage and Login Page. Direct URL access to other pages hides content and prompts login.
- **Students**: Can access Homepage and Game Page; redirected to Homepage after login.
- **Teachers**: Can access Admin Page; redirected to Admin Page after login; can manage student data and game lists for their own classes.
- **Admins**: Can access Admin Page; redirected to Admin Page after login; can manage all student and teacher data, including teacher accounts.

### Scoring System

- Student `marks` are updated when starting a game:
  - Beginner: +10 marks
  - Intermediate: +20 marks
  - Advanced: +30 marks
- Marks are stored in the `students` table and updated via API calls.

### File Uploads

- **Formats**: Excel (`.xlsx`, `.xls`) or CSV (`.csv`).
- **Maximum Size**: 10 MB.
- **Maximum Rows**: 10,000.
- **Validation**: Ensure required columns match database schema; `action` column accepts "add", "update", "delete".
- **Game Uploads**: Fetch game metadata (title, thumbnail) from Scratch API using provided `scratch_id`.

## Database Structure

### Students Table
- `student_id`: Unique identifier (string).
- `name_1`: First name (string).
- `name_2`: Last name (string).
- `marks`: Student score (integer).
- `class`: Student's class (string).
- `class_no`: Class number (string).
- `last_login`: Timestamp of last login (datetime).
- `last_update`: Timestamp of last record update (datetime).
- `teacher_id`: Foreign key linking to teacher (string).
- `password`: Hashed password (string).

### Games Table
- `game_id`: Unique identifier (string).
- `game_name`: Game title (string, fetched from Scratch API).
- `student_id`: Foreign key linking to student creator (string).
- `subject`: Subject tag (Chinese Language, English Language, Mathematics, Humanities and Science; string).
- `difficulty`: Difficulty level (Beginner, Intermediate, Advanced; string).
- `teacher_id`: Foreign key linking to teacher (string).
- `last_update`: Timestamp of last update (datetime).
- `scratch_id`: Scratch project ID (string).
- `scratch_api`: Embeddable Scratch URL (e.g., `https://scratch.mit.edu/projects/1207260630/embed`; string).
- `accumulated_click`: Number of times the game has been played (integer).

### Teachers Table
- `teacher_id`: Unique identifier (string).
- `password`: Hashed password (string).
- `responsible_class`: Array of classes managed by the teacher (JSON array, e.g., `["Class1", "Class2"]`).
- `last_login`: Timestamp of last login (datetime).
- `is_admin`: Boolean indicating admin status (boolean).

## Responsive Design

- Supports desktop, tablet, and mobile devices using Material UI's responsive components.
- Scratch game iframes dynamically resize for mobile devices to ensure usability.
- No specific breakpoints or devices prioritized (flexible design).

## Project Structure

```
├── frontend/                 # React + Vite application
│   ├── src/
│   │   ├── components/       # Reusable UI components
│   │   ├── pages/           # Page components (Homepage, Login, Game, Admin)
│   │   ├── store/           # Redux store configuration
│   │   ├── i18n/            # Internationalization configuration
│   │   ├── App.tsx          # Main app component
│   │   └── main.tsx         # Entry point
│   ├── index.html           # HTML template
│   ├── package.json         # Frontend dependencies
│   ├── tsconfig.json        # TypeScript config
│   └── vite.config.ts       # Vite configuration
├── backend/                 # AWS CDK infrastructure
│   ├── bin/
│   │   └── backend.ts       # CDK app entry point
│   ├── lib/
│   │   └── backend-stack.ts # Main stack definition
│   ├── lambda/              # Lambda function code
│   ├── cdk.json            # CDK configuration
│   ├── package.json        # Backend dependencies
│   └── tsconfig.json       # TypeScript config
├── .gitignore              # Git ignore rules
└── README.md               # This file
```

## Development Setup

### Prerequisites
- Node.js v20.19.5 or compatible
- npm v10.8.2 or compatible
- AWS CLI (for backend deployment)
- AWS credentials configured (for backend deployment)

### Frontend Setup

```bash
cd frontend
npm install
npm run dev          # Start development server at http://localhost:5173
npm run build        # Build for production
npm run lint         # Run ESLint
```

### Backend Setup

```bash
cd backend
npm install
npm run build        # Compile TypeScript
npx cdk synth        # Synthesize CloudFormation template
npx cdk deploy       # Deploy to AWS (requires credentials)
```

## Environment Variables

### Frontend
- `VITE_API_URL`: Backend API URL

### Backend
- `AWS_REGION`: AWS region for deployment
- `AWS_ACCOUNT_ID`: AWS account ID

## Testing

```bash
# Frontend tests
cd frontend
npm test

# Backend tests
cd backend
npm test
```

## CI/CD

The project uses GitHub Actions for automated builds and deployments. See `.github/workflows/` for configuration.

## License

This project is proprietary and confidential.
