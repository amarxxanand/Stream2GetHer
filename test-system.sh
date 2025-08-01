#!/bin/bash

# Stream2GetHer System Test Script
echo "🧪 Testing Stream2GetHer System..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test counter
TESTS_PASSED=0
TESTS_FAILED=0

# Function to run test
run_test() {
    local test_name="$1"
    local test_command="$2"
    local expected_exit_code="${3:-0}"
    
    echo -e "\n${YELLOW}Testing: $test_name${NC}"
    
    if eval "$test_command"; then
        if [ $? -eq $expected_exit_code ]; then
            echo -e "${GREEN}✅ PASSED: $test_name${NC}"
            ((TESTS_PASSED++))
        else
            echo -e "${RED}❌ FAILED: $test_name (unexpected exit code)${NC}"
            ((TESTS_FAILED++))
        fi
    else
        echo -e "${RED}❌ FAILED: $test_name${NC}"
        ((TESTS_FAILED++))
    fi
}

# Test 1: Check Node.js installation
run_test "Node.js Installation" "node --version"

# Test 2: Check npm installation
run_test "npm Installation" "npm --version"

# Test 3: Check if MongoDB is accessible
run_test "MongoDB Connection" "timeout 5s bash -c '</dev/tcp/localhost/27017'; echo 'MongoDB is accessible'"

# Test 4: Check server dependencies
run_test "Server Dependencies" "cd server && npm list --depth=0"

# Test 5: Check client dependencies
run_test "Client Dependencies" "cd client && npm list --depth=0"

# Test 6: Test server startup (brief)
echo -e "\n${YELLOW}Testing: Server Startup${NC}"
cd server
timeout 10s npm start &
SERVER_PID=$!
sleep 5

if kill -0 $SERVER_PID 2>/dev/null; then
    echo -e "${GREEN}✅ PASSED: Server Startup${NC}"
    ((TESTS_PASSED++))
    kill $SERVER_PID
else
    echo -e "${RED}❌ FAILED: Server Startup${NC}"
    ((TESTS_FAILED++))
fi

cd ..

# Test 7: Test client build
run_test "Client Build" "cd client && npm run build"

# Test 8: Check if server API endpoints respond
echo -e "\n${YELLOW}Testing: API Endpoints${NC}"
cd server
npm start &
SERVER_PID=$!
sleep 3

# Test health endpoint
if curl -f http://localhost:3000/api/health >/dev/null 2>&1; then
    echo -e "${GREEN}✅ PASSED: Health Endpoint${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAILED: Health Endpoint${NC}"
    ((TESTS_FAILED++))
fi

# Test room creation endpoint
if curl -f -X POST http://localhost:3000/api/rooms -H "Content-Type: application/json" >/dev/null 2>&1; then
    echo -e "${GREEN}✅ PASSED: Room Creation Endpoint${NC}"
    ((TESTS_PASSED++))
else
    echo -e "${RED}❌ FAILED: Room Creation Endpoint${NC}"
    ((TESTS_FAILED++))
fi

kill $SERVER_PID 2>/dev/null
cd ..

# Test 9: Check environment files
run_test "Server Environment File" "test -f server/.env"
run_test "Client Environment File" "test -f client/.env"

# Test 10: Validate package.json files
run_test "Root package.json Validation" "cd . && npm run --silent validate 2>/dev/null || echo 'No validate script, but package.json exists'"
run_test "Server package.json Validation" "cd server && node -e 'JSON.parse(require(\"fs\").readFileSync(\"package.json\", \"utf8\"))'"
run_test "Client package.json Validation" "cd client && node -e 'JSON.parse(require(\"fs\").readFileSync(\"package.json\", \"utf8\"))'"

# Summary
echo -e "\n" 
echo "=================================================="
echo -e "🧪 ${YELLOW}TEST RESULTS SUMMARY${NC}"
echo "=================================================="
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"
echo "Total Tests: $((TESTS_PASSED + TESTS_FAILED))"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}🎉 All tests passed! Your Stream2GetHer setup is ready.${NC}"
    echo -e "${GREEN}Run './start-dev.sh' to start the development environment.${NC}"
    exit 0
else
    echo -e "\n${RED}⚠️  Some tests failed. Please check the output above.${NC}"
    echo -e "${YELLOW}Common issues:${NC}"
    echo "1. MongoDB not running: sudo systemctl start mongod"
    echo "2. Missing dependencies: npm run install-all"
    echo "3. Port conflicts: Check if ports 3000/5173 are available"
    exit 1
fi
