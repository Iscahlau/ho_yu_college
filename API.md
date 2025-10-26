# Ho Yu College API Documentation

## Overview

This document describes all REST API endpoints for the Ho Yu College Scratch Game Platform. All endpoints use JSON for request/response bodies unless otherwise specified.

**Base URL (Local Development):** `http://localhost:3000`  
**Base URL (Production):** `https://api.hoyucollege.edu` *(configure after deployment)*

## Authentication

All endpoints except `/auth/login` require authentication. Include credentials in the request headers or body as specified in each endpoint.

---

## Endpoints

### Authentication

#### POST `/auth/login`

Authenticate a student or teacher and retrieve user information.

**Request Body:**
```json
{
  "userId": "string",     // student_id or teacher_id
  "password": "string",   // user password
  "role": "student" | "teacher"
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "string",
      "name": "string",
      "role": "student" | "teacher" | "admin",
      "class": "string",           // for students
      "classes": ["string"],       // for teachers
      "is_admin": boolean,         // for teachers
      "last_login": "ISO8601 timestamp"
    }
  },
  "message": "Login successful"
}
```

**Error Responses:**
- `400 Bad Request`: Missing or invalid request fields
- `401 Unauthorized`: Invalid credentials
- `500 Internal Server Error`: Server error

**Example:**
```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "S001",
    "password": "student123",
    "role": "student"
  }'
```

---

### Games

#### GET `/games`

Retrieve a list of all games with optional pagination.

**Query Parameters:**
- `limit` (optional): Number of items to return (default: all)
- `lastKey` (optional): Pagination token from previous response (URL encoded)

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "items": [
      {
        "game_id": "string",
        "game_name": "string",
        "scratch_api": "string",        // Scratch project URL
        "description": "string",
        "difficulty": "easy" | "medium" | "hard",
        "class": "string",              // target class
        "clicks": number,               // total click count
        "created_at": "ISO8601 timestamp",
        "updated_at": "ISO8601 timestamp"
      }
    ],
    "count": number,
    "hasMore": boolean,
    "lastKey": "string"                 // for pagination (if hasMore is true)
  }
}
```

**Example:**
```bash
# Get all games
curl http://localhost:3000/games

# Get first 10 games
curl "http://localhost:3000/games?limit=10"

# Get next page
curl "http://localhost:3000/games?limit=10&lastKey=<encoded_key>"
```

#### POST `/games/{gameId}/click`

Record a click (play) event for a specific game. Atomically increments the click counter.

**Path Parameters:**
- `gameId`: The game identifier

**Request Body:**
```json
{
  "userId": "string",              // student_id or teacher_id
  "timestamp": "ISO8601 timestamp" // optional, defaults to server time
}
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "gameId": "string",
    "clicks": number,               // updated click count
    "message": "Click recorded successfully"
  }
}
```

**Error Responses:**
- `400 Bad Request`: Missing gameId or invalid request
- `404 Not Found`: Game not found
- `500 Internal Server Error`: Server error

**Example:**
```bash
curl -X POST http://localhost:3000/games/1168960672/click \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "S001"
  }'
```

---

### Download (Export)

All download endpoints return Excel files (`.xlsx`) containing the respective data.

#### GET `/students/download`

Download all student records as an Excel file.

**Response:**
- **Content-Type:** `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **Headers:** `Content-Disposition: attachment; filename="students-YYYY-MM-DD.xlsx"`

**Excel Columns:**
- `student_id`: Student ID
- `name`: Student name
- `class`: Class name
- `password`: Student password (hashed or plain based on configuration)
- `created_at`: Record creation timestamp
- `last_login`: Last login timestamp (if available)

**Example:**
```bash
curl http://localhost:3000/students/download -o students.xlsx
```

#### GET `/teachers/download`

Download all teacher records as an Excel file.

**Response:**
- **Content-Type:** `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **Headers:** `Content-Disposition: attachment; filename="teachers-YYYY-MM-DD.xlsx"`

**Excel Columns:**
- `teacher_id`: Teacher ID
- `name`: Teacher name
- `classes`: Comma-separated list of classes
- `is_admin`: Boolean (TRUE/FALSE)
- `password`: Teacher password
- `created_at`: Record creation timestamp
- `last_login`: Last login timestamp (if available)

**Example:**
```bash
curl http://localhost:3000/teachers/download -o teachers.xlsx
```

#### GET `/games/download`

Download all game records as an Excel file.

**Response:**
- **Content-Type:** `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- **Headers:** `Content-Disposition: attachment; filename="games-YYYY-MM-DD.xlsx"`

**Excel Columns:**
- `game_id`: Game ID (must match Scratch project ID)
- `game_name`: Game name
- `scratch_api`: Full Scratch project URL
- `description`: Game description
- `difficulty`: Difficulty level (easy/medium/hard)
- `class`: Target class
- `clicks`: Total click count
- `created_at`: Record creation timestamp
- `updated_at`: Last update timestamp

**Example:**
```bash
curl http://localhost:3000/games/download -o games.xlsx
```

---

### Upload (Import)

All upload endpoints accept Excel (`.xlsx`, `.xls`) or CSV (`.csv`) files with a maximum of 4000 records per file.

#### POST `/upload/students`

Upload student data from an Excel or CSV file.

**Request:**
- **Content-Type:** `multipart/form-data`
- **Body:** File field named `file`

**Required Excel/CSV Columns:**
- `student_id` (required): Unique student identifier
- `name` (required): Student name
- `class` (required): Class name
- `password` (required): Student password

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "processed": number,        // total records processed
    "inserted": number,         // new records created
    "updated": number,          // existing records updated
    "failed": number,           // records that failed
    "errors": [                 // array of error details (if any)
      {
        "row": number,
        "studentId": "string",
        "error": "string"
      }
    ]
  },
  "message": "Upload completed"
}
```

**Error Responses:**
- `400 Bad Request`: No file uploaded, invalid format, or exceeds 4000 records
- `500 Internal Server Error`: Server error

**Example:**
```bash
curl -X POST http://localhost:3000/upload/students \
  -F "file=@students.xlsx"
```

**File Format Example (Excel/CSV):**
```
student_id | name           | class | password
-----------|----------------|-------|----------
S001       | John Doe       | 1A    | pass123
S002       | Jane Smith     | 1B    | pass456
```

#### POST `/upload/teachers`

Upload teacher data from an Excel or CSV file.

**Request:**
- **Content-Type:** `multipart/form-data`
- **Body:** File field named `file`

**Required Excel/CSV Columns:**
- `teacher_id` (required): Unique teacher identifier
- `name` (required): Teacher name
- `classes` (required): Comma-separated list of classes (e.g., "1A,1B,2A")
- `password` (required): Teacher password
- `is_admin` (optional): Boolean ("true"/"false" or "TRUE"/"FALSE"), defaults to false

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "processed": number,
    "inserted": number,
    "updated": number,
    "failed": number,
    "errors": [
      {
        "row": number,
        "teacherId": "string",
        "error": "string"
      }
    ]
  },
  "message": "Upload completed"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/upload/teachers \
  -F "file=@teachers.xlsx"
```

**File Format Example (Excel/CSV):**
```
teacher_id | name              | classes    | is_admin | password
-----------|-------------------|------------|----------|----------
T001       | Mr. Anderson      | 1A,1B      | false    | teach123
T002       | Ms. Johnson       | 2A,2B,3A   | true     | admin456
```

#### POST `/upload/games`

Upload game data from an Excel or CSV file.

**Request:**
- **Content-Type:** `multipart/form-data`
- **Body:** File field named `file`

**Required Excel/CSV Columns:**
- `game_id` (required): Unique game identifier (must match Scratch project ID)
- `game_name` (required): Game name/title
- `scratch_api` (required): Full Scratch project URL (e.g., `https://scratch.mit.edu/projects/1168960672`)
- `description` (optional): Game description
- `difficulty` (optional): "easy", "medium", or "hard" (defaults to "medium")
- `class` (optional): Target class for the game

**Important:** The `game_id` must match the last segment of the `scratch_api` URL. For example:
- `scratch_api`: `https://scratch.mit.edu/projects/1168960672`
- `game_id`: `1168960672`

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "processed": number,
    "inserted": number,
    "updated": number,
    "failed": number,
    "errors": [
      {
        "row": number,
        "gameId": "string",
        "error": "string"
      }
    ]
  },
  "message": "Upload completed"
}
```

**Example:**
```bash
curl -X POST http://localhost:3000/upload/games \
  -F "file=@games.xlsx"
```

**File Format Example (Excel/CSV):**
```
game_id      | game_name           | scratch_api                                      | difficulty | class | description
-------------|---------------------|--------------------------------------------------|------------|-------|------------------
1168960672   | Castle Defender     | https://scratch.mit.edu/projects/1168960672      | medium     | 1A    | Defend your castle
60917032     | Space Adventure     | https://scratch.mit.edu/projects/60917032        | easy       | 1B    | Explore space
```

---

## Error Responses

All error responses follow this format:

```json
{
  "success": false,
  "error": "Error message",
  "details": "Detailed error information (optional)"
}
```

### Common HTTP Status Codes

- `200 OK`: Request successful
- `400 Bad Request`: Invalid request parameters or body
- `401 Unauthorized`: Authentication failed
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

---

## Data Models

### Student Record
```typescript
{
  student_id: string;        // Primary key
  name: string;
  class: string;
  password: string;
  created_at: string;        // ISO8601 timestamp
  updated_at?: string;       // ISO8601 timestamp
  last_login?: string;       // ISO8601 timestamp
}
```

### Teacher Record
```typescript
{
  teacher_id: string;        // Primary key
  name: string;
  classes: string[];         // Array of class names
  password: string;
  is_admin: boolean;
  created_at: string;        // ISO8601 timestamp
  updated_at?: string;       // ISO8601 timestamp
  last_login?: string;       // ISO8601 timestamp
}
```

### Game Record
```typescript
{
  game_id: string;           // Primary key (must match Scratch project ID)
  game_name: string;
  scratch_api: string;       // Full Scratch project URL
  description?: string;
  difficulty: "easy" | "medium" | "hard";
  class?: string;            // Target class
  clicks: number;            // Default: 0
  created_at: string;        // ISO8601 timestamp
  updated_at: string;        // ISO8601 timestamp
}
```

---

## Rate Limits

Currently, no rate limits are enforced. This may change in production.

---

## CORS Configuration

The API allows cross-origin requests from all origins (`*`) in development. Configure appropriate origins for production.

**Allowed Methods:** `GET`, `POST`, `PUT`, `DELETE`, `OPTIONS`  
**Allowed Headers:** `Content-Type`, `Authorization`, `X-Requested-With`

---

## Local Development

### Prerequisites
- Node.js v18+ (v20.19.5 recommended)
- Docker and Docker Compose (for DynamoDB Local)
- AWS SAM CLI

### Starting the API

```bash
# Start all services (from project root)
./start-local.sh

# API will be available at http://localhost:3000
# DynamoDB Admin UI at http://localhost:8001
```

### Testing Endpoints

```bash
# Test login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"userId":"S001","password":"student123","role":"student"}'

# List games
curl http://localhost:3000/games

# Download students
curl http://localhost:3000/students/download -o students.xlsx
```

See [Infrastructure Documentation](infra/README.md) for more details.

---

## Production Deployment

The API is deployed using AWS CDK. See [Infrastructure Documentation](infra/README.md) for deployment instructions.

---

## Support

For issues or questions, please refer to:
- [Main README](README.md)
- [Infrastructure Documentation](infra/README.md)
- [DynamoDB Local Guide](backend/DYNAMODB_LOCAL_GUIDE.md)
