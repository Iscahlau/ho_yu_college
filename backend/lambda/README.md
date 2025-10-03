# Lambda Functions

This directory contains Lambda function code for the Ho Yu College Scratch Game Platform backend.

## Structure

- `auth/` - Authentication related functions
  - `login.ts` - Handles student and teacher login
- `games/` - Game management functions
  - To be implemented: Get games, update game clicks, etc.
- `upload/` - File upload and processing functions
  - To be implemented: Handle Excel/CSV uploads for students, teachers, and games
- `utils/` - Shared utility functions
  - To be implemented: Password hashing, validation, etc.

## Development

Lambda functions are written in TypeScript and will be compiled before deployment.

### Environment Variables

Each Lambda function may require the following environment variables:
- `STUDENTS_TABLE_NAME` - DynamoDB table name for students
- `TEACHERS_TABLE_NAME` - DynamoDB table name for teachers
- `GAMES_TABLE_NAME` - DynamoDB table name for games

## Deployment

Lambda functions are deployed as part of the CDK stack. See `lib/backend-stack.ts` for configuration.
