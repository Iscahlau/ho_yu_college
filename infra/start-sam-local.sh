#!/bin/bash

# Start AWS SAM Local API
# This script starts SAM CLI using Python module syntax

echo "🚀 Starting AWS SAM Local API..."
echo ""

cd /Users/iscah/WebstormProjects/ho_yu_college/infra

# Start SAM local API
python3 -m samcli local start-api \
  --host 0.0.0.0 \
  --port 3000 \
  --docker-network ho-yu-network

echo ""
echo "SAM Local API stopped"

