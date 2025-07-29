#!/bin/bash

# Phase 4 Integration Testing Runner
# This script runs all Phase 4 end-to-end integration tests

set -e  # Exit on any error

echo "🚀 Starting Phase 4 Integration Tests"
echo "===================================="

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

# Check if docker-compose is available
if ! command -v docker-compose &> /dev/null; then
    print_error "docker-compose is not installed. Please install docker-compose and try again."
    exit 1
fi

# Set environment variables
export NODE_ENV=test
export BASE_URL=http://localhost:3000
export API_BASE_URL=http://localhost:3001

print_status "Setting up test environment..."

# Start services with docker-compose
print_status "Starting Docker services..."
docker-compose -f docker-compose.dev.yml up -d

# Wait for services to be ready
print_status "Waiting for services to be ready..."

# Function to wait for service
wait_for_service() {
    local url=$1
    local service_name=$2
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s "$url" > /dev/null 2>&1; then
            print_success "$service_name is ready"
            return 0
        fi
        
        print_status "Waiting for $service_name... (attempt $attempt/$max_attempts)"
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "$service_name failed to start within expected time"
    return 1
}

# Wait for backend
wait_for_service "http://localhost:3001/health" "Backend API"

# Wait for frontend
wait_for_service "http://localhost:3000" "Frontend"

# Check if Ollama is available (optional)
if curl -s "http://localhost:11434/api/tags" > /dev/null 2>&1; then
    print_success "Ollama service is available"
else
    print_warning "Ollama service is not available. Some tests may fail."
fi

print_status "Running Phase 4 Integration Tests..."

# Change to frontend directory for Playwright tests
cd frontend

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_status "Installing frontend dependencies..."
    npm install
fi

# Install Playwright browsers if needed
if [ ! -d "node_modules/@playwright/test" ]; then
    print_status "Installing Playwright browsers..."
    npx playwright install
fi

# Set test timeouts for slower environments
export PLAYWRIGHT_TIMEOUT=60000
export PLAYWRIGHT_EXPECT_TIMEOUT=10000

# Run different test suites
test_suites=(
    "search-workflow.e2e.ts"
    "booking-workflow.e2e.ts"
    "performance-integration.e2e.ts"
    "prd-requirements.e2e.ts"
    "quality-assurance.e2e.ts"
)

passed_tests=0
total_tests=${#test_suites[@]}

print_status "Running $total_tests test suites..."

for test_suite in "${test_suites[@]}"; do
    print_status "Running $test_suite..."
    
    if npx playwright test "playwright-tests/$test_suite" --reporter=html,json; then
        print_success "$test_suite passed"
        passed_tests=$((passed_tests + 1))
    else
        print_error "$test_suite failed"
    fi
    
    echo ""  # Add spacing between test suites
done

# Generate consolidated report
print_status "Generating test reports..."

# Copy reports to a consolidated location
mkdir -p ../test-reports/phase4
cp -r playwright-report/* ../test-reports/phase4/ 2>/dev/null || true
cp -r test-results/* ../test-reports/phase4/ 2>/dev/null || true

print_status "Running backend unit tests..."
cd ../backend

if [ ! -d "node_modules" ]; then
    print_status "Installing backend dependencies..."
    npm install
fi

# Run backend tests
if npm test; then
    print_success "Backend tests passed"
else
    print_error "Backend tests failed"
fi

# Return to project root
cd ..

# Health check after tests
print_status "Performing post-test health check..."

backend_health=$(curl -s http://localhost:3001/health | jq -r '.status' 2>/dev/null || echo "unknown")
if [ "$backend_health" = "healthy" ]; then
    print_success "Backend health check passed"
else
    print_warning "Backend health check: $backend_health"
fi

# Generate summary report
print_status "Generating Phase 4 test summary..."

cat > test-reports/phase4/summary.md << EOF
# Phase 4 Integration Test Results

**Test Date:** $(date)
**Environment:** $NODE_ENV
**Frontend URL:** $BASE_URL
**Backend URL:** $API_BASE_URL

## Test Suite Results

| Test Suite | Status |
|------------|--------|
EOF

for test_suite in "${test_suites[@]}"; do
    if grep -q "$test_suite" test-reports/phase4/summary.md 2>/dev/null; then
        echo "| $test_suite | ✅ Passed |" >> test-reports/phase4/summary.md
    else
        echo "| $test_suite | ❌ Failed |" >> test-reports/phase4/summary.md
    fi
done

cat >> test-reports/phase4/summary.md << EOF

## Overall Results

- **Passed:** $passed_tests/$total_tests test suites
- **Success Rate:** $(( passed_tests * 100 / total_tests ))%

## System Health

- **Backend Status:** $backend_health
- **Docker Services:** Running
- **Test Environment:** Configured

## Next Steps

EOF

if [ $passed_tests -eq $total_tests ]; then
    cat >> test-reports/phase4/summary.md << EOF
✅ All Phase 4 integration tests passed successfully!
The system is ready for Phase 5 (Deployment).

EOF
    print_success "🎉 All Phase 4 tests passed! ($passed_tests/$total_tests)"
else
    cat >> test-reports/phase4/summary.md << EOF
❌ Some tests failed. Please review the detailed reports and fix issues before proceeding.

### Failed Tests
EOF
    print_error "Some tests failed ($passed_tests/$total_tests passed)"
fi

# Show report location
print_status "Test reports available at:"
echo "  - HTML Report: test-reports/phase4/index.html"
echo "  - Summary: test-reports/phase4/summary.md"
echo "  - JSON Results: test-reports/phase4/results.json"

# Cleanup option
read -p "Keep Docker services running? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_status "Stopping Docker services..."
    docker-compose -f docker-compose.dev.yml down
    print_success "Docker services stopped"
fi

print_status "Phase 4 integration testing complete!"

# Exit with appropriate code
if [ $passed_tests -eq $total_tests ]; then
    exit 0
else
    exit 1
fi