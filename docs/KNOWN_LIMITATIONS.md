# Known Limitations - Upload Feature

## ~~BatchWriteCommand UnprocessedItems Not Handled~~ (FIXED)

### ✅ Status: RESOLVED

This issue has been fixed. The upload handlers now properly handle UnprocessedItems returned by DynamoDB's BatchWriteCommand.

### Previous Issue
The upload handlers (games, students, teachers) were not checking for or retrying `UnprocessedItems` in the BatchWriteCommand response, which could lead to silent data loss.

### Fix Applied
All three upload handlers (games.ts, students.ts, teachers.ts) now:
1. Capture the response from `BatchWriteCommand`
2. Check for `UnprocessedItems` in the response
3. Retry unprocessed items individually
4. Adjust counters appropriately if retries fail
5. Include errors in the response for failed items

### Implementation
```typescript
const batchResult = await dynamoDBClient.send(batchWriteCommand);

// Check for unprocessed items
const unprocessedItems = batchResult.UnprocessedItems?.[tableName];
if (unprocessedItems && unprocessedItems.length > 0) {
  console.warn(`Batch write had ${unprocessedItems.length} unprocessed items`);
  // Try individual writes for unprocessed items
  for (const unprocessedItem of unprocessedItems) {
    try {
      await putRecord(unprocessedItem.PutRequest!.Item);
    } catch (err) {
      // Adjust counts and record errors
      results.processed--;
      results.errors.push(error message);
    }
  }
}
```

### Result
- No silent data loss - all unprocessed items are retried
- Accurate counters - only successfully written items are counted
- Error reporting - any failures are included in the response
- User feedback - users know exactly which records succeeded/failed
