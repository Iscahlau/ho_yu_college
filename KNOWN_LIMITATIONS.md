# Known Limitations - Upload Feature

## BatchWriteCommand UnprocessedItems Not Handled

### Issue
The upload handlers (games, students, teachers) use DynamoDB's `BatchWriteCommand` to write multiple records at once. However, they don't currently check for or retry `UnprocessedItems` in the response.

### Context
DynamoDB's BatchWriteItem API may return `UnprocessedItems` when:
- Throughput is exceeded (though we use on-demand billing)
- The batch size exceeds DynamoDB's limits (we use 25 items per batch, which is the max)
- Individual item validation fails
- Other transient errors occur

According to AWS documentation, applications should:
1. Check the response for UnprocessedItems
2. Retry those items with exponential backoff
3. Continue until all items are processed or a maximum retry limit is reached

### Current Behavior
When UnprocessedItems are returned:
- The code treats the BatchWriteCommand as successful
- The counters reflect that items were processed
- But some items may not actually be written to the database

### Recommendation for Future Enhancement
Consider implementing UnprocessedItems handling:

```typescript
const batchResult = await dynamoDBClient.send(batchWriteCommand);

// Check for unprocessed items
if (batchResult.UnprocessedItems && 
    Object.keys(batchResult.UnprocessedItems).length > 0) {
  // Retry with exponential backoff
  // Update counters for any items that ultimately fail
}
```

### Mitigation
The current fix (checking if `results.processed === 0`) helps in the most common failure case where ALL records fail. However, partial failures due to UnprocessedItems could still show as "success" even though not all records were written.

### Priority
Low - This is an edge case that's unlikely to occur with:
- On-demand billing (no throughput limits)
- Small batch sizes (25 items)
- The current fallback to individual writes already provides resilience

However, for production deployments at scale, this should be addressed for completeness.
