# Scratch API Field Removal Summary

## Overview
This document summarizes the changes made to remove the `scratch_api` field and rename `game_id` to `scratch_game_id` throughout the application.

## Problem Statement
The `scratch_api` field was storing the full Scratch project URL (e.g., `https://scratch.mit.edu/projects/123456789`), but this was redundant since:
1. The base URL is already known in the frontend
2. Only the project ID is needed to construct the embed URL
3. The field name `game_id` was ambiguous - it wasn't clear it represented a Scratch project ID

## Changes Made

### Backend Changes

#### 1. Database Schema (`backend/scripts/init-dynamodb.ts`)
- Changed DynamoDB primary key from `game_id` to `scratch_game_id`
- This clearly indicates the field represents a Scratch project ID

#### 2. Lambda Handlers
**Upload Handler (`backend/lambda/upload/games.ts`)**:
- Updated `GameRecord` interface to use `scratch_game_id` instead of `game_id`
- Removed `scratch_api` field from the interface
- Updated header validation to require `scratch_game_id` instead of `game_id`
- Updated all DynamoDB operations to use the new key name

**Download Handler (`backend/lambda/download/games.ts`)**:
- Updated `GameRecord` interface
- Removed `scratch_api` from Excel export
- Updated column widths array

**Game Click Handler (`backend/lambda/games/click.ts`)**:
- Updated all DynamoDB Key references to use `scratch_game_id`

#### 3. Schema Documentation (`backend/lambda/upload/utils/conversionUtils.ts`)
- Updated `GAME_SCHEMA_MAPPING` to use `scratch_game_id` with clear description: "Unique Scratch project identifier"
- Removed `scratch_api` field from schema

#### 4. Mock Data (`backend/test/mocks/games.ts`)
- Updated all mock game objects to use `scratch_game_id` instead of `game_id`
- Removed `scratch_api` field from all mock records
- Updated invariant comment to reflect new field name

#### 5. Tests
**Mock Tests (`backend/test/mocks.test.ts`)**:
- Updated field assertions to check for `scratch_game_id` instead of `game_id`
- Removed `scratch_api` validation tests
- Simplified test to just verify the field is a numeric string

**Game Click Tests (`backend/test/lambda/game-click.test.ts`)**:
- Updated mock to check for `scratch_game_id` in DynamoDB Key
- Updated all test assertions to use new field name

**Conversion Utils Tests (`backend/test/lambda/upload/conversionUtils.test.ts`)**:
- Updated schema validation tests to use `scratch_game_id`
- Removed `scratch_api` field checks

**Upload Validation Tests (`backend/test/lambda/upload-validation.test.ts`)**:
- Updated test data headers to use `scratch_game_id`
- Updated error message expectations

### Frontend Changes

#### 1. Type Definitions (`frontend/src/types/index.ts`)
- Updated `GameData` interface to use `scratch_game_id` instead of `game_id`
- Removed `scratch_api` field

#### 2. Redux Store (`frontend/src/store/slices/gamesSlice.ts`)
- Removed `scratchApi` field from `Game` interface
- The `gameId` field now represents the Scratch project ID (mapped from backend's `scratch_game_id`)

#### 3. Services (`frontend/src/services/gamesService.ts`)
- Updated `transformGameData` to map `scratch_game_id` to `gameId`
- Removed `scratchApi` mapping
- Updated `enrichGameWithScratchData` to use `scratchId` or `gameId` directly instead of extracting from URL

#### 4. Components
**Game Page (`frontend/src/pages/Game/Game.tsx`)**:
- Simplified game lookup logic - now matches by `gameId` or `scratchId` directly
- Removed URL parsing logic that was previously extracting ID from `scratch_api`

**Homepage (`frontend/src/pages/Homepage/Homepage.tsx`)**:
- Updated `handleGameClick` to use `gameId` directly instead of parsing URL
- Updated thumbnail fallback logic to use `gameId` directly

## Data Migration Considerations

### For Existing Deployments
If you have an existing deployment with data in DynamoDB:

1. **Database Migration Required**: The primary key has changed from `game_id` to `scratch_game_id`
   - You will need to create a new table with the new schema
   - Migrate existing data by reading from old table and writing to new table
   - Or manually update the table schema if using DynamoDB Local

2. **Excel File Format**: Excel files used for uploads must now use:
   - `scratch_game_id` column instead of `game_id`
   - Remove the `scratch_api` column

### Example Migration Script
```bash
# For DynamoDB Local, the simplest approach is to reset and reseed:
cd backend
npm run dynamodb:init -- --reset
npm run dynamodb:seed
```

## Benefits

1. **Clearer Field Names**: `scratch_game_id` makes it immediately obvious what the field represents
2. **Reduced Redundancy**: No longer storing the full URL when only the ID is needed
3. **Simpler Frontend Logic**: Direct use of Scratch project ID without URL parsing
4. **Better Data Efficiency**: Smaller storage footprint in DynamoDB

## Testing

All 142 backend tests pass after the changes:
- ✅ Mock data validation tests
- ✅ Game click handler tests (including student marks updates)
- ✅ Upload validation tests
- ✅ Conversion utilities tests
- ✅ Download handler configuration tests

Both frontend and backend build successfully without TypeScript errors.

## Breaking Changes

⚠️ **This is a breaking change that requires:**
1. Database schema update
2. Data migration for existing records
3. Updated Excel templates for data uploads
4. Frontend redeployment

## Files Modified

### Backend (19 files)
- `backend/lambda/upload/games.ts`
- `backend/lambda/download/games.ts`
- `backend/lambda/games/click.ts`
- `backend/lambda/upload/utils/conversionUtils.ts`
- `backend/scripts/init-dynamodb.ts`
- `backend/test/mocks/games.ts`
- `backend/test/mocks.test.ts`
- `backend/test/lambda/game-click.test.ts`
- `backend/test/lambda/upload-validation.test.ts`
- `backend/test/lambda/upload/conversionUtils.test.ts`
- And their compiled JavaScript files

### Frontend (5 files)
- `frontend/src/types/index.ts`
- `frontend/src/store/slices/gamesSlice.ts`
- `frontend/src/services/gamesService.ts`
- `frontend/src/pages/Game/Game.tsx`
- `frontend/src/pages/Homepage/Homepage.tsx`

## Conclusion

The changes successfully remove the redundant `scratch_api` field and provide clearer naming with `scratch_game_id`. The codebase is now more maintainable and the data structure is more efficient. All tests pass and both frontend and backend build successfully.
