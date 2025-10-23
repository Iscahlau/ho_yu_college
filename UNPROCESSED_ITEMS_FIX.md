# UnprocessedItems Fix - Upload Handlers

## Problem

User reported that games upload was showing HTTP 200 success with processed count, but data was not appearing in DynamoDB. This issue affected the games upload specifically, while students and teachers uploads worked correctly in some cases.

## Root Cause

The BatchWriteCommand in AWS DynamoDB SDK can return `UnprocessedItems` when some items cannot be written in a batch operation. This can happen due to:
- Transient errors
- Item-level validation failures
- Throttling (though unlikely with on-demand billing)
- Individual item size limits
- Other DynamoDB-specific constraints

The previous code did not check for or handle `UnprocessedItems`:

```typescript
// Old code - missing response capture
await dynamoDBClient.send(batchWriteCommand);
// Assumed all items were written successfully
```

This meant:
1. BatchWriteCommand would succeed (no exception thrown)
2. Some items would be returned as UnprocessedItems
3. Code would increment counters as if all items were written
4. Handler would return HTTP 200 with success:true
5. Frontend would show "Successfully processed X games"
6. But only some/none of the games would actually be in DynamoDB

## Solution

Modified all three upload handlers (games.ts, students.ts, teachers.ts) to:
1. Capture the BatchWriteCommand response
2. Check for UnprocessedItems
3. Retry unprocessed items individually
4. Adjust counters if retries fail
5. Include errors in the response

### Implementation

```typescript
// New code - captures response and handles UnprocessedItems
const batchResult = await dynamoDBClient.send(batchWriteCommand);

// Check for unprocessed items
const unprocessedItems = batchResult.UnprocessedItems?.[tableNames.games];
if (unprocessedItems && unprocessedItems.length > 0) {
  console.warn(`Batch write had ${unprocessedItems.length} unprocessed items for games`);
  
  // Try individual writes for unprocessed items
  for (const unprocessedItem of unprocessedItems) {
    try {
      await putGame(unprocessedItem.PutRequest!.Item as GameRecord);
    } catch (err) {
      const gameId = (unprocessedItem.PutRequest!.Item as any).game_id;
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error(`Error writing unprocessed game ${gameId}:`, err);
      results.errors.push(`Game ${gameId}: ${errorMsg}`);
      
      // Adjust counts since this item failed
      if (existingRecordsMap.has(gameId)) {
        results.updated--;
      } else {
        results.inserted--;
      }
      results.processed--;
    }
  }
}
```

## Impact

### Before Fix
- Upload shows: "Successfully processed 10 games (10 inserted, 0 updated)"
- Reality: Only 7 games actually written to DynamoDB
- UnprocessedItems were silently ignored
- Users confused about missing data

### After Fix
- If all items succeed: "Successfully processed 10 games (10 inserted, 0 updated)"
- If some fail: "Successfully processed 7 games (7 inserted, 0 updated)" + error details for 3 failed items
- If all fail: HTTP 400 error "Failed to upload game data. No records were successfully processed."
- Accurate feedback matching database state

## Testing

Existing tests continue to pass:
- ✅ Upload validation tests (3/3 passing)
- ✅ Upload performance tests (10/10 passing)

The fix ensures:
- No silent data loss
- Accurate success/failure reporting
- Proper error messages for debugging
- Consistent behavior across all upload handlers

## Files Modified

1. `backend/lambda/upload/games.ts` - Added UnprocessedItems handling
2. `backend/lambda/upload/students.ts` - Added UnprocessedItems handling
3. `backend/lambda/upload/teachers.ts` - Added UnprocessedItems handling
4. `KNOWN_LIMITATIONS.md` - Updated to reflect fix
5. `UNPROCESSED_ITEMS_FIX.md` - This documentation

## Related Issues

This fix resolves the issue where upload shows success but data doesn't appear in DynamoDB, as reported by the user.
