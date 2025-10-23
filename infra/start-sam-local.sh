#!/bin/bash

# Start AWS SAM Local API
# This script starts SAM CLI using Python module syntax

echo "🚀 Starting AWS SAM Local API..."
echo ""

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Start SAM local API
python3 -m samcli local start-api \
  --host 0.0.0.0 \
  --port 3000 \
  --docker-network backend_ho-yu-network

echo ""
echo "SAM Local API stopped"

