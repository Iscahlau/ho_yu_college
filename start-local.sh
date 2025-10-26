#!/bin/bash

# Ho Yu College - Local Development Startup Script
# This script sets up and starts the local development environment

set -e  # Exit on error

echo "🚀 Ho Yu College - Local Development Environment"
echo "================================================"
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    print_error "Docker is not running. Please start Docker and try again."
    exit 1
fi

print_info "Docker is running ✓"

# Check if AWS SAM CLI is installed
if ! command -v sam &> /dev/null; then
    print_warning "AWS SAM CLI is not installed."
    print_info "Installing AWS SAM CLI..."
    
    # Detect OS and install accordingly
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        # Linux installation
        wget -q https://github.com/aws/aws-sam-cli/releases/latest/download/aws-sam-cli-linux-x86_64.zip
        unzip -q aws-sam-cli-linux-x86_64.zip -d sam-installation
        sudo ./sam-installation/install
        rm -rf aws-sam-cli-linux-x86_64.zip sam-installation
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS installation
        if command -v brew &> /dev/null; then
            brew install aws-sam-cli
        else
            print_error "Homebrew not found. Please install AWS SAM CLI manually:"
            print_error "https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html"
            exit 1
        fi
    else
        print_error "Unsupported OS. Please install AWS SAM CLI manually:"
        print_error "https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html"
        exit 1
    fi
fi

print_info "AWS SAM CLI is installed ✓"

# Navigate to project root
cd "$(dirname "$0")"
PROJECT_ROOT=$(pwd)

# Step 1: Start DynamoDB Local
print_info "Step 1/5: Starting DynamoDB Local..."
cd "$PROJECT_ROOT/backend"

if docker ps | grep -q "ho-yu-dynamodb-local"; then
    print_info "DynamoDB Local is already running"
else
    npm run dynamodb:start
    print_info "Waiting for DynamoDB Local to be ready..."
    sleep 5
fi

# Step 2: Initialize DynamoDB tables
print_info "Step 2/5: Initializing DynamoDB tables..."
npm run dynamodb:init

# Step 3: Seed DynamoDB with mock data
print_info "Step 3/5: Seeding DynamoDB with mock data..."
npm run dynamodb:seed

# Step 4: Build backend Lambda functions
print_info "Step 4/5: Building backend Lambda functions..."
print_info "Compiling TypeScript and preparing dependencies..."
npm run build

# Step 5: Build and start SAM Local API
print_info "Step 5/5: Building and starting SAM Local API Gateway..."
cd "$PROJECT_ROOT/infra"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    print_info "Installing infrastructure dependencies..."
    npm install
fi

# Build TypeScript
print_info "Building TypeScript..."
npm run build

# Check if backend Lambda dependencies are installed
cd "$PROJECT_ROOT/backend"
if [ ! -d "node_modules" ]; then
    print_info "Installing backend dependencies..."
    npm install
fi

cd "$PROJECT_ROOT/infra"

print_info "Starting SAM Local API Gateway on http://localhost:3000"
echo ""
echo "================================================"
echo -e "${GREEN}✓ Local development environment is ready!${NC}"
echo ""
echo "Services running:"
echo "  📊 DynamoDB Local:    http://localhost:8002"
echo "  🔧 DynamoDB Admin UI: http://localhost:8001"
echo "  🌐 API Gateway:       http://localhost:3000"
echo ""
echo "To start the frontend, open a new terminal and run:"
echo "  cd frontend"
echo "  npm run dev"
echo ""
echo "Press Ctrl+C to stop the API Gateway (DynamoDB will keep running)"
echo "================================================"
echo ""

# Start SAM Local API Gateway
# Note: This will run in foreground and block
npm run sam:start
