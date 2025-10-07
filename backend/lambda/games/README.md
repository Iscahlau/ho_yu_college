# Games Lambda Functions

This directory contains Lambda functions for game-related operations.

## Functions

### click.ts

Handles incrementing the accumulated click count when a student clicks to play a game.

**Endpoint**: `POST /games/{gameId}/click`

**Features**:
- Atomic increment operation using DynamoDB's `ADD` expression
- Safe handling of concurrent clicks (race condition free)
- Returns updated click count
- Validates game exists before incrementing

**Request**:
```
POST /games/1207260630/click
```

**Response**:
```json
{
  "success": true,
  "accumulated_click": 16
}
```

**Error Responses**:
- `400`: Missing gameId parameter
- `404`: Game not found
- `500`: Internal server error
