#!/bin/bash

# Mock Server Test Script
# Tests mock server endpoints in both in-memory and DynamoDB modes

set -e

MOCK_SERVER_URL="${MOCK_SERVER_URL:-http://localhost:3000}"
BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "======================================"
echo "Mock Server Test Script"
echo "======================================"
echo ""
echo "Server URL: $MOCK_SERVER_URL"
echo "Backend Dir: $BACKEND_DIR"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to test endpoint
test_endpoint() {
    local name="$1"
    local method="$2"
    local endpoint="$3"
    local data="$4"
    local expected_status="$5"
    
    echo -n "Testing: $name... "
    
    if [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "$MOCK_SERVER_URL$endpoint" \
            -H "Content-Type: application/json" \
            -d "$data")
    else
        response=$(curl -s -w "\n%{http_code}" "$MOCK_SERVER_URL$endpoint")
    fi
    
    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')
    
    if [ "$http_code" = "$expected_status" ]; then
        echo -e "${GREEN}✓ PASSED${NC} (HTTP $http_code)"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}✗ FAILED${NC} (HTTP $http_code, expected $expected_status)"
        echo "Response: $body"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

# Check if server is running
echo "Checking if mock server is running..."
if ! curl -s "$MOCK_SERVER_URL/games" > /dev/null 2>&1; then
    echo -e "${RED}Error: Mock server is not running at $MOCK_SERVER_URL${NC}"
    echo "Please start the mock server first:"
    echo "  cd backend && npm run mock-server"
    exit 1
fi
echo -e "${GREEN}✓ Mock server is running${NC}"
echo ""

# Determine which mode is active
echo "Detecting mode..."
SERVER_INFO=$(curl -s "$MOCK_SERVER_URL/games" 2>&1)
if echo "$SERVER_INFO" | grep -q "error"; then
    echo -e "${YELLOW}Warning: Could not determine mode${NC}"
    MODE="unknown"
else
    # Count games to estimate mode (DynamoDB might have different count)
    GAME_COUNT=$(echo "$SERVER_INFO" | jq '. | length' 2>/dev/null || echo "0")
    if [ "$GAME_COUNT" -gt 0 ]; then
        echo -e "${GREEN}Found $GAME_COUNT games${NC}"
        MODE="active"
    else
        MODE="unknown"
    fi
fi
echo ""

echo "======================================"
echo "Running Tests"
echo "======================================"
echo ""

# Test 1: Get all games
test_endpoint "GET /games" "GET" "/games" "" "200"

# Test 2: Get single game
test_endpoint "GET /games/:gameId" "GET" "/games/1207260630" "" "200"

# Test 3: Login with student
test_endpoint "POST /auth/login (student)" "POST" "/auth/login" \
    '{"id":"STU001","password":"123"}' "200"

# Test 4: Login with invalid credentials
test_endpoint "POST /auth/login (invalid)" "POST" "/auth/login" \
    '{"id":"INVALID","password":"wrong"}' "401"

# Test 5: Increment game click
test_endpoint "POST /games/:gameId/click" "POST" "/games/1207260630/click" "" "200"

# Test 6: Get non-existent game
test_endpoint "GET /games/:gameId (not found)" "GET" "/games/NONEXISTENT" "" "404"

# Test 7: Login with missing credentials
test_endpoint "POST /auth/login (missing data)" "POST" "/auth/login" \
    '{"id":"STU001"}' "400"

echo ""
echo "======================================"
echo "Test Results"
echo "======================================"
echo ""
echo -e "Tests Passed: ${GREEN}$TESTS_PASSED${NC}"
echo -e "Tests Failed: ${RED}$TESTS_FAILED${NC}"
echo ""

if [ "$TESTS_FAILED" -eq 0 ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed.${NC}"
    exit 1
fi
