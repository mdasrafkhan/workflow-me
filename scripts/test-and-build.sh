#!/bin/bash

# Test and Build Script for Workflow Application
# This script runs tests for both frontend and backend before building

set -e  # Exit on any error

echo "🚀 Starting test and build process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "package.json" ] && [ ! -d "frontend" ] && [ ! -d "backend" ]; then
    print_error "Please run this script from the project root directory"
    exit 1
fi

# Test Backend
print_status "Testing backend..."
cd backend

if [ ! -f "package.json" ]; then
    print_error "Backend package.json not found"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_status "Installing backend dependencies..."
    npm install
fi

# Run backend tests
print_status "Running backend tests..."
npm test

if [ $? -eq 0 ]; then
    print_status "✅ Backend tests passed"
else
    print_error "❌ Backend tests failed"
    exit 1
fi

# Build backend
print_status "Building backend..."
npx nest build

if [ $? -eq 0 ]; then
    print_status "✅ Backend build successful"
else
    print_error "❌ Backend build failed"
    exit 1
fi

cd ..

# Test Frontend
print_status "Testing frontend..."
cd frontend

if [ ! -f "package.json" ]; then
    print_error "Frontend package.json not found"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    print_status "Installing frontend dependencies..."
    npm install
fi

# Run frontend tests
print_status "Running frontend tests..."
npm test -- --watchAll=false --passWithNoTests

if [ $? -eq 0 ]; then
    print_status "✅ Frontend tests passed"
else
    print_error "❌ Frontend tests failed"
    exit 1
fi

# Build frontend
print_status "Building frontend..."
npm run build

if [ $? -eq 0 ]; then
    print_status "✅ Frontend build successful"
else
    print_error "❌ Frontend build failed"
    exit 1
fi

cd ..

print_status "🎉 All tests passed and builds successful!"
print_status "You can now run: docker-compose up --build"
