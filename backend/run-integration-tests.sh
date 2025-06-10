#!/bin/bash

# Run integration tests for the MOP Generation application

# Set environment variables for testing
export NODE_ENV=test
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mop_gen_test?schema=public"

# Create test database if it doesn't exist
echo "Creating test database if it doesn't exist..."
psql -U postgres -c "CREATE DATABASE mop_gen_test;" || true

# Run migrations on test database
echo "Running migrations on test database..."
npx prisma migrate deploy

# Create temp directory if it doesn't exist
mkdir -p temp

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "Installing dependencies..."
  npm install
fi

# Run the integration tests
echo "Running integration tests..."
npx jest test/integration.test.js --forceExit

# Get the exit code
EXIT_CODE=$?

# Print test results
if [ $EXIT_CODE -eq 0 ]; then
  echo "✅ All integration tests passed!"
else
  echo "❌ Some integration tests failed!"
fi

# Exit with the test exit code
exit $EXIT_CODE
