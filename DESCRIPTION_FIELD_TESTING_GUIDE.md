# Description Field Testing Guide

## Overview

This guide provides instructions for testing the newly added `description` field for the games table.

## Feature Description

The `description` field has been added to the games table to provide additional information about each game. This field:
- Is **optional** (can be empty)
- Supports plain text descriptions
- Displays below the game name on the game detail page
- Is included in Excel/CSV uploads and downloads

## Changes Made

### Backend Changes

1. **Upload Handler** (`backend/lambda/upload/games.ts`)
   - Added `description?: string` to GameRecord interface
   - Added `description` to expected headers array
   - Added description field mapping in record preparation
   - Added description to change detection logic

2. **Download Handler** (`backend/lambda/download/games.ts`)
   - Added `description?: string` to GameRecord interface
   - Added `description` field to Excel export
   - Added column width for description (40 characters)

3. **List Handler** (`backend/lambda/games/list.ts`)
   - No changes needed (DynamoDB scan returns all fields automatically)

### Frontend Changes

1. **Game Interface** (`frontend/src/store/slices/gamesSlice.ts`)
   - Added `description?: string` to Game interface

2. **Service Layer** (`frontend/src/services/gamesService.ts`)
   - Added `description: apiGame.description` to transformGameData function

3. **Game Page Component** (`frontend/src/pages/Game/Game.tsx`)
   - Added conditional rendering of description below game name
   - Only displays if description exists (no empty space for missing values)

## Excel/CSV File Format

### Updated Games Schema

| Excel/CSV Column | Type | Required | Description |
|-----------------|------|----------|-------------|
| game_id | String | ✓ | Unique game identifier |
| game_name | String | | Display name of the game |
| student_id | String | | Creator student ID |
| subject | String | | Subject category |
| difficulty | String | | Difficulty level |
| teacher_id | String | | Associated teacher ID |
| scratch_id | String | | Scratch project ID |
| scratch_api | String | | Scratch project URL |
| accumulated_click | Number | | Total click count |
| **description** | **String** | | **Game description (NEW)** |

### Example CSV Format

```csv
game_id,game_name,student_id,subject,difficulty,teacher_id,scratch_id,scratch_api,accumulated_click,description
1207260630,Character Match,STU001,Chinese Language,Beginner,TCH001,123456789,https://scratch.mit.edu/projects/123456789,15,A fun game to match Chinese characters with their meanings
1207260631,Math Challenge,STU002,Mathematics,Intermediate,TCH001,987654321,https://scratch.mit.edu/projects/987654321,8,Practice addition and subtraction with increasing difficulty
1207260632,Space Explorer,STU003,Humanities and Science,Advanced,TCH002,456789123,https://scratch.mit.edu/projects/456789123,23,Explore the solar system and learn about planets
```

### Example Excel Format

| game_id | game_name | student_id | subject | difficulty | teacher_id | scratch_id | scratch_api | accumulated_click | description |
|---------|-----------|------------|---------|------------|------------|------------|-------------|-------------------|-------------|
| 1207260630 | Character Match | STU001 | Chinese Language | Beginner | TCH001 | 123456789 | https://scratch.mit.edu/projects/123456789 | 15 | A fun game to match Chinese characters with their meanings |
| 1207260631 | Math Challenge | STU002 | Mathematics | Intermediate | TCH001 | 987654321 | https://scratch.mit.edu/projects/987654321 | 8 | Practice addition and subtraction with increasing difficulty |

## Testing Steps

### 1. Test Excel/CSV Upload with Description

1. **Prepare Test File**
   - Create an Excel or CSV file with the games schema including the new `description` column
   - Include at least 3-5 test games with different descriptions:
     - Some with descriptions
     - Some with empty descriptions
     - Some with longer descriptions (test text wrapping)

2. **Upload File**
   - Log in as an admin or teacher
   - Navigate to Admin page
   - Select the Games upload section
   - Upload your test file
   - Verify the upload succeeds with expected counts (e.g., "Successfully processed 5 games")

3. **Expected Behavior**
   - Upload should succeed even if description column is missing (backward compatible)
   - Upload should succeed with empty description values
   - Upload should handle descriptions up to reasonable length (suggest max 500 characters)

### 2. Test Game Page Display

1. **Navigate to Game Page**
   - Log in as a student or teacher
   - Browse the games on the homepage
   - Click on a game that has a description

2. **Verify Description Display**
   - Check that the description appears below the game name
   - Verify the description text is readable (proper color, size, spacing)
   - Verify proper text wrapping for longer descriptions

3. **Test Missing Description**
   - Navigate to a game without a description
   - Verify NO extra space is displayed
   - Verify game name and other information display correctly

### 3. Test Excel/CSV Download

1. **Download Games Data**
   - Log in as admin or teacher
   - Navigate to Admin page
   - Click Download for Games
   - Save the downloaded Excel file

2. **Verify Download**
   - Open the downloaded Excel file
   - Verify `description` column is present
   - Verify description values match what was uploaded
   - Verify empty descriptions show as empty cells (not "undefined" or "null")

### 4. Test Update Scenario

1. **Upload Initial Data**
   - Upload a game with a description

2. **Update Description**
   - Modify the Excel file to change the description
   - Re-upload the file
   - Verify the game's description is updated

3. **Remove Description**
   - Upload the same game with an empty description field
   - Verify the description is cleared (becomes empty)

### 5. Test Backward Compatibility

1. **Upload Without Description Column**
   - Create an Excel file using the OLD schema (without description column)
   - Upload the file
   - Verify upload succeeds with a warning about missing optional field (or no warning)
   - Verify games are created/updated successfully
   - Verify description field is empty for these games

## Visual Testing Checklist

When viewing a game page with description:

- [ ] Description appears directly below game name
- [ ] Description has appropriate spacing (not too cramped or too spread out)
- [ ] Description text is readable (good contrast with background)
- [ ] Description uses secondary/gray text color
- [ ] Long descriptions wrap properly without breaking layout
- [ ] Subject and difficulty chips still display correctly below description

When viewing a game page without description:

- [ ] No empty space where description would be
- [ ] Game name flows directly to subject/difficulty section
- [ ] Layout looks natural and unbroken

## Expected API Response Format

When fetching games from the API, the response should include:

```json
{
  "items": [
    {
      "game_id": "1207260630",
      "game_name": "Character Match",
      "student_id": "STU001",
      "subject": "Chinese Language",
      "difficulty": "Beginner",
      "teacher_id": "TCH001",
      "scratch_id": "123456789",
      "scratch_api": "https://scratch.mit.edu/projects/123456789",
      "accumulated_click": 15,
      "description": "A fun game to match Chinese characters with their meanings",
      "last_update": "2024-01-15T10:30:00.000Z",
      "created_at": "2024-01-10T08:00:00.000Z",
      "updated_at": "2024-01-15T10:30:00.000Z"
    }
  ],
  "count": 1,
  "hasMore": false
}
```

## Troubleshooting

### Issue: Description not showing on game page

**Possible Causes:**
1. Game doesn't have a description in the database
2. Frontend conditional rendering is preventing display
3. Description value is undefined or null instead of empty string

**Solutions:**
1. Check the game data in DynamoDB or via API
2. Verify the Game component code has the conditional check: `{gameInfo.description && ...}`
3. Re-upload the game with a description value

### Issue: Upload fails with description column

**Possible Causes:**
1. Header name mismatch (e.g., "Description" instead of "description")
2. Special characters in description causing parsing issues

**Solutions:**
1. Ensure column header is exactly "description" (lowercase)
2. Escape special characters or use plain text descriptions

### Issue: Downloaded Excel missing description

**Possible Causes:**
1. Download handler not updated
2. Games in database don't have description field

**Solutions:**
1. Verify backend changes were deployed
2. Re-upload games with description field populated

## Browser DevTools Testing

### Check API Response

1. Open browser DevTools (F12)
2. Go to Network tab
3. Navigate to a game page
4. Look for the API call to `/games` or `/games/{gameId}`
5. Check the response includes the `description` field

### Check Frontend State

1. Open browser DevTools (F12)
2. Go to Console tab
3. Type: `window.__REDUX_STATE__` or inspect Redux DevTools
4. Check that games in state include `description` property

## Performance Considerations

- Description field adds minimal data size (typically < 1 KB per game)
- No impact on page load performance
- No impact on upload/download performance for typical descriptions (< 500 characters)
- For very long descriptions (> 1000 characters), consider:
  - Adding length validation in frontend
  - Adding character limit in UI (e.g., max 500 characters)

## Acceptance Criteria Verification

- [x] The `games` table contains a new `description` column (string/text type) - **DONE: Added as optional field**
- [x] Game upload (Excel/CSV) supports including a `description` column - **DONE: Added to expected headers**
- [x] Backend API supports reading and writing the `description` field for games - **DONE: Upload, download, and list handlers updated**
- [x] Frontend game page renders the description below the game name - **DONE: Conditional rendering added**
- [x] If `description` is empty or missing, no extra space is displayed - **DONE: Using conditional rendering**

## Additional Notes

- The description field is optional and backward compatible
- Existing games without descriptions will continue to work
- The field uses default value of empty string ('') in backend
- Frontend only renders description if it exists (truthy check)
- No database migration needed (DynamoDB is schemaless)

## Next Steps

After validating all test scenarios:

1. Update main documentation files:
   - Update `EXCEL_CSV_TO_DYNAMODB_CONVERSION.md` with description field
   - Update `README.md` if it documents game data structure
   - Update any API documentation with the new field

2. Consider enhancements:
   - Add character limit validation (e.g., max 500 characters)
   - Add rich text support (markdown) for descriptions
   - Add description preview on game cards in homepage (optional)
   - Add search functionality to search within descriptions

3. Deployment:
   - Deploy backend changes (Lambda functions)
   - Deploy frontend changes
   - Verify in production environment
   - Notify users about the new feature
