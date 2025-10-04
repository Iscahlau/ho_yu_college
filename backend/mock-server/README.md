# Mock Server for Local Development

This mock server simulates the backend APIs using mock data, allowing frontend development and testing without requiring AWS deployment.

## Features

- ✅ Authentication endpoint for students and teachers
- ✅ Games CRUD operations (list, get by ID)
- ✅ Click tracking functionality
- ✅ CORS enabled for frontend integration
- ✅ Uses existing mock data from `backend/test/mocks`

## Quick Start

### Start the Mock Server

```bash
cd backend
npm run mock-server
```

The server will start on `http://localhost:3000`

### Available Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/auth/login` | Authenticate student or teacher |
| GET | `/games` | Fetch all games |
| GET | `/games/:gameId` | Fetch a single game by ID |
| POST | `/games/:gameId/click` | Increment game click count |

## API Examples

### Login (Student)

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"id":"STU001","password":"123"}'
```

Response:
```json
{
  "success": true,
  "user": {
    "student_id": "STU001",
    "name_1": "John Chan",
    "name_2": "陳大文",
    "marks": 150,
    "class": "1A",
    "class_no": "01",
    ...
  },
  "role": "student"
}
```

### Login (Teacher)

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"id":"TCH001","password":"teacher123"}'
```

Response:
```json
{
  "success": true,
  "user": {
    "teacher_id": "TCH001",
    "responsible_class": ["1A", "2A"],
    "last_login": "2024-01-15T08:00:00.000Z",
    "is_admin": false
  },
  "role": "teacher"
}
```

### Get All Games

```bash
curl http://localhost:3000/games
```

Returns an array of all games with their metadata.

### Get Single Game

```bash
curl http://localhost:3000/games/GAME001
```

Returns details for the specified game.

### Increment Game Click

```bash
curl -X POST http://localhost:3000/games/GAME001/click
```

Response:
```json
{
  "success": true,
  "accumulated_click": 16
}
```

## Mock Credentials

### Students
- IDs: `STU001` through `STU010`
- Password: `123`

### Teachers
- IDs: `TCH001`, `TCH002`
- Password: `teacher123`

### Admin
- ID: `TCH003`
- Password: `admin123`

## Using with Frontend

Configure the frontend to use the mock server by setting the environment variable:

```bash
cd frontend
echo "VITE_API_URL=http://localhost:3000" > .env.local
npm run dev
```

The frontend will now connect to the mock server instead of AWS.

## Mock Data

The mock server uses existing mock data from `backend/test/mocks/`:
- **10 students** across different classes (1A, 1B, 2A, 2B)
- **3 teachers** with different responsibilities
- **20 games** covering various subjects and difficulties

For detailed information about the mock data, see [backend/test/README.md](../test/README.md).

## Development Notes

- The server uses `ts-node-dev` for hot-reloading during development
- Click counts are stored in-memory and reset when the server restarts
- CORS is enabled for all origins to support local development
- Password hashing matches the production implementation (SHA-256)

## Troubleshooting

### Port Already in Use

If port 3000 is already in use, set a different port:

```bash
PORT=3001 npm run mock-server
```

Then update the frontend `.env.local`:
```bash
VITE_API_URL=http://localhost:3001
```

### Connection Refused

Ensure the mock server is running before starting the frontend.

### CORS Errors

The mock server has CORS enabled by default. If you still encounter issues, check that your frontend is making requests to the correct URL.
